import { db } from './db'
import {
  SUBJECTS,
  type Question,
  type QuestionFormat,
  type QuestionImportRow,
  type StudyLog,
  type ReviewState,
  type Subject,
} from './types'
import { computeNextReview, gradeFrom, startOfDay, DAY_MS } from './srs'

// ---- 出題モード -----------------------------------------------------------

// format を指定すると、その形式（○× / 選択式）の問題のみを出題する。
export type SessionMode =
  | { kind: 'subject'; subject: Subject; format?: QuestionFormat }
  | { kind: 'random'; format?: QuestionFormat }
  | { kind: 'review'; format?: QuestionFormat }

const DEFAULT_SESSION_SIZE = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 選択式の表示用選択肢を組み立てる。データに choices があればそれを使い、
// 無い場合は pool（同一セッションの他問）の正答を誤答肢に流用する。
export function buildChoices(current: Question, pool: Question[]): string[] {
  const set = new Set<string>(current.choices ?? [])
  set.add(current.answer)
  if (set.size < 2) {
    for (const q of shuffle(pool)) {
      if (q.id === current.id || q.format !== 'select') continue
      set.add(q.answer)
      if (set.size >= 4) break
    }
  }
  return shuffle([...set])
}

// 模試用の出題を組み立てる。全科目から均等に perSubject 問ずつ集める
// （科目別基準点＝足切り判定のため、各科目を必ず含める）。
export async function buildMockExam(perSubject: number): Promise<Question[]> {
  const all = await db.questions.toArray()
  const bySubject = new Map<Subject, Question[]>()
  for (const s of SUBJECTS) bySubject.set(s, [])
  for (const q of all) bySubject.get(q.subject)?.push(q)
  const picked: Question[] = []
  for (const s of SUBJECTS) {
    picked.push(...shuffle(bySubject.get(s) ?? []).slice(0, perSubject))
  }
  return shuffle(picked)
}

// 復習キュー: 次回出題日を過ぎた問題（新規＝未学習も含める）
export async function getDueQuestions(now = Date.now()): Promise<Question[]> {
  const dueStates = await db.reviewStates
    .where('nextReviewAt')
    .belowOrEqual(now)
    .toArray()
  const dueIds = new Set(dueStates.map((s) => s.questionId))
  if (dueIds.size === 0) return []
  const questions = await db.questions.where('id').anyOf([...dueIds]).toArray()
  // 期限が古い順（溜まっているものから）
  const stateById = new Map(dueStates.map((s) => [s.questionId, s]))
  return questions.sort(
    (a, b) =>
      (stateById.get(a.id!)?.nextReviewAt ?? 0) -
      (stateById.get(b.id!)?.nextReviewAt ?? 0),
  )
}

export async function getDueCount(now = Date.now()): Promise<number> {
  return db.reviewStates.where('nextReviewAt').belowOrEqual(now).count()
}

// 未学習（ReviewState を持たない）問題
async function getNewQuestions(
  subject?: Subject,
  format?: QuestionFormat,
): Promise<Question[]> {
  const all = subject
    ? await db.questions.where('subject').equals(subject).toArray()
    : await db.questions.toArray()
  const states = await db.reviewStates.toArray()
  const seen = new Set(states.map((s) => s.questionId))
  return all.filter((q) => !seen.has(q.id!) && (!format || q.format === format))
}

// セッション用の出題リストを組み立てる
export async function buildSession(
  mode: SessionMode,
  size = DEFAULT_SESSION_SIZE,
): Promise<Question[]> {
  const now = Date.now()
  const format = mode.format
  const matchFmt = (q: Question) => !format || q.format === format

  if (mode.kind === 'review') {
    return (await getDueQuestions(now)).filter(matchFmt).slice(0, size)
  }

  const subject = mode.kind === 'subject' ? mode.subject : undefined

  // 「復習期限が来ているもの」を優先し、足りなければ未学習で埋める
  const due = (await getDueQuestions(now)).filter(
    (q) => matchFmt(q) && (!subject || q.subject === subject),
  )
  const fresh = shuffle(await getNewQuestions(subject, format))

  const picked: Question[] = []
  const usedIds = new Set<number>()
  for (const q of [...due, ...fresh]) {
    if (picked.length >= size) break
    if (usedIds.has(q.id!)) continue
    usedIds.add(q.id!)
    picked.push(q)
  }

  // それでも足りなければ、既習から古い順で補充（＝復習）
  if (picked.length < size) {
    const all = (
      subject
        ? await db.questions.where('subject').equals(subject).toArray()
        : await db.questions.toArray()
    ).filter(matchFmt)
    for (const q of shuffle(all)) {
      if (picked.length >= size) break
      if (usedIds.has(q.id!)) continue
      usedIds.add(q.id!)
      picked.push(q)
    }
  }

  return picked
}

// ---- 解答の記録 -----------------------------------------------------------

export async function recordAnswer(params: {
  question: Question
  correct: boolean
  lowConfidence: boolean
  responseTimeMs: number
  now?: number
}): Promise<void> {
  const { question, correct, lowConfidence, responseTimeMs } = params
  const now = params.now ?? Date.now()
  const questionId = question.id!

  const log: StudyLog = {
    questionId,
    subject: question.subject,
    answeredAt: now,
    correct,
    lowConfidence,
    responseTimeMs,
  }

  const prev = await db.reviewStates.get(questionId)
  const grade = gradeFrom(correct, lowConfidence)
  const next = computeNextReview({ prev, grade, now })

  const state: ReviewState = {
    questionId,
    subject: question.subject,
    nextReviewAt: next.nextReviewAt,
    intervalDays: next.intervalDays,
    repetitions: next.repetitions,
    easeFactor: next.easeFactor,
    lastReviewedAt: now,
  }

  await db.transaction('rw', db.studyLogs, db.reviewStates, async () => {
    await db.studyLogs.add(log)
    await db.reviewStates.put(state)
  })
}

// ---- 統計・弱点可視化 -----------------------------------------------------

export interface SubjectStat {
  subject: Subject
  answered: number
  correct: number
  accuracy: number // 0-1
  questionCount: number // 登録問題数
}

export async function getSubjectStats(): Promise<SubjectStat[]> {
  const logs = await db.studyLogs.toArray()
  const questions = await db.questions.toArray()

  const bySubject = new Map<Subject, { answered: number; correct: number }>()
  for (const s of SUBJECTS) bySubject.set(s, { answered: 0, correct: 0 })
  for (const l of logs) {
    const acc = bySubject.get(l.subject)
    if (!acc) continue
    acc.answered++
    if (l.correct) acc.correct++
  }

  const qCount = new Map<Subject, number>()
  for (const q of questions) qCount.set(q.subject, (qCount.get(q.subject) ?? 0) + 1)

  return SUBJECTS.map((subject) => {
    const acc = bySubject.get(subject)!
    return {
      subject,
      answered: acc.answered,
      correct: acc.correct,
      accuracy: acc.answered ? acc.correct / acc.answered : 0,
      questionCount: qCount.get(subject) ?? 0,
    }
  })
}

export interface TagStat {
  tag: string
  answered: number
  correct: number
  accuracy: number
}

export async function getTagStats(): Promise<TagStat[]> {
  const logs = await db.studyLogs.toArray()
  const questions = await db.questions.toArray()
  const tagsByQuestion = new Map<number, string[]>()
  for (const q of questions) tagsByQuestion.set(q.id!, q.tags ?? [])

  const map = new Map<string, { answered: number; correct: number }>()
  for (const l of logs) {
    const tags = tagsByQuestion.get(l.questionId) ?? []
    for (const tag of tags) {
      const acc = map.get(tag) ?? { answered: 0, correct: 0 }
      acc.answered++
      if (l.correct) acc.correct++
      map.set(tag, acc)
    }
  }

  return [...map.entries()]
    .map(([tag, acc]) => ({
      tag,
      answered: acc.answered,
      correct: acc.correct,
      accuracy: acc.answered ? acc.correct / acc.answered : 0,
    }))
    .sort((a, b) => b.answered - a.answered)
}

export interface DailyStat {
  date: string // YYYY-MM-DD
  count: number
  correct: number
}

export async function getDailyStats(days = 14): Promise<DailyStat[]> {
  const logs = await db.studyLogs.toArray()
  const map = new Map<string, { count: number; correct: number }>()
  for (const l of logs) {
    const key = fmtDate(l.answeredAt)
    const acc = map.get(key) ?? { count: 0, correct: 0 }
    acc.count++
    if (l.correct) acc.correct++
    map.set(key, acc)
  }
  const out: DailyStat[] = []
  const today = startOfDay(Date.now())
  for (let i = days - 1; i >= 0; i--) {
    const key = fmtDate(today - i * DAY_MS)
    const acc = map.get(key) ?? { count: 0, correct: 0 }
    out.push({ date: key, count: acc.count, correct: acc.correct })
  }
  return out
}

// 連続学習日数（今日または昨日から遡って連続している日数）
export async function getStreak(): Promise<number> {
  const logs = await db.studyLogs.toArray()
  if (logs.length === 0) return 0
  const daySet = new Set(logs.map((l) => fmtDate(l.answeredAt)))
  const today = startOfDay(Date.now())
  // 今日未学習でも、昨日までの連続はカウント対象にする
  let cursor = daySet.has(fmtDate(today)) ? today : today - DAY_MS
  if (!daySet.has(fmtDate(cursor))) return 0
  let streak = 0
  while (daySet.has(fmtDate(cursor))) {
    streak++
    cursor -= DAY_MS
  }
  return streak
}

export async function getTodayCount(): Promise<number> {
  const today = startOfDay(Date.now())
  return db.studyLogs.where('answeredAt').aboveOrEqual(today).count()
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---- インポート / エクスポート -------------------------------------------

function normalizeAnswer(raw: string, format: string): string {
  const t = raw.trim()
  if (format === 'ox') {
    if (['○', 'O', 'o', '◯', '正', 'true', '1', '○（正）'].includes(t)) return '○'
    if (['×', 'X', 'x', '✕', '誤', 'false', '0'].includes(t)) return '×'
  }
  return t
}

function isSubject(s: string): s is Subject {
  return (SUBJECTS as readonly string[]).includes(s)
}

export interface ImportResult {
  added: number
  skipped: number
  errors: string[]
}

// JSON配列 or CSV文字列からの取り込み。既存と完全一致する問題文はスキップ。
export async function importQuestions(rows: QuestionImportRow[]): Promise<ImportResult> {
  const now = Date.now()
  const existing = await db.questions.toArray()
  const existingKeys = new Set(existing.map((q) => `${q.subject}::${q.questionText}`))

  const toAdd: Question[] = []
  const errors: string[] = []
  let skipped = 0

  rows.forEach((row, i) => {
    const subject = (row.subject ?? '').trim()
    if (!isSubject(subject)) {
      errors.push(`${i + 1}行目: 科目「${row.subject}」が不正です`)
      return
    }
    if (!row.questionText || !row.questionText.trim()) {
      errors.push(`${i + 1}行目: 問題文が空です`)
      return
    }
    const format = (row.format ?? 'ox').trim() === 'select' ? 'select' : 'ox'
    const answer = normalizeAnswer(row.answer ?? '', format)
    if (!answer) {
      errors.push(`${i + 1}行目: 正答が空です`)
      return
    }
    const key = `${subject}::${row.questionText.trim()}`
    if (existingKeys.has(key)) {
      skipped++
      return
    }
    existingKeys.add(key)

    const tags = Array.isArray(row.tags)
      ? row.tags
      : (row.tags ?? '')
          .split(/[,、|]/)
          .map((t) => t.trim())
          .filter(Boolean)

    const choices = Array.isArray(row.choices)
      ? row.choices.map((c) => String(c).trim()).filter(Boolean)
      : (row.choices ?? '')
          .split(/[,、|｜\/]/)
          .map((c) => c.trim())
          .filter(Boolean)

    toAdd.push({
      subject,
      format,
      questionText: row.questionText.trim(),
      answer,
      choices: format === 'select' && choices.length ? choices : undefined,
      explanation: (row.explanation ?? '').trim(),
      source: (row.source ?? '').trim() || undefined,
      tags,
      createdAt: now,
      updatedAt: now,
    })
  })

  if (toAdd.length) await db.questions.bulkAdd(toAdd)
  return { added: toAdd.length, skipped, errors }
}

// 簡易CSVパーサ（ダブルクォート対応）。ヘッダ必須。
export function parseCSV(text: string): QuestionImportRow[] {
  const rows: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      record.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      record.push(field)
      rows.push(record)
      record = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field)
    rows.push(record)
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmpty.length < 2) return []

  const header = nonEmpty[0].map((h) => h.trim())
  return nonEmpty.slice(1).map((cols) => {
    const obj: Record<string, string> = {}
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? ''
    })
    return {
      subject: obj.subject ?? obj['科目'] ?? '',
      format: obj.format ?? obj['形式'] ?? 'ox',
      questionText: obj.questionText ?? obj['問題文'] ?? '',
      answer: obj.answer ?? obj['正答'] ?? '',
      choices: obj.choices ?? obj['選択肢'] ?? '',
      explanation: obj.explanation ?? obj['解説'] ?? '',
      source: obj.source ?? obj['出典'] ?? '',
      tags: obj.tags ?? obj['タグ'] ?? '',
    }
  })
}

export interface BackupData {
  version: number
  exportedAt: number
  questions: Question[]
  studyLogs: StudyLog[]
  reviewStates: ReviewState[]
}

// 学習履歴を含む全データのバックアップ（端末故障・データ消去対策）
export async function exportBackup(): Promise<BackupData> {
  const [questions, studyLogs, reviewStates] = await Promise.all([
    db.questions.toArray(),
    db.studyLogs.toArray(),
    db.reviewStates.toArray(),
  ])
  return {
    version: 1,
    exportedAt: Date.now(),
    questions,
    studyLogs,
    reviewStates,
  }
}

// バックアップから完全復元（既存データは置き換える）
export async function restoreBackup(data: BackupData): Promise<void> {
  await db.transaction('rw', db.questions, db.studyLogs, db.reviewStates, async () => {
    await Promise.all([db.questions.clear(), db.studyLogs.clear(), db.reviewStates.clear()])
    if (data.questions?.length) await db.questions.bulkAdd(data.questions)
    if (data.studyLogs?.length) await db.studyLogs.bulkAdd(data.studyLogs)
    if (data.reviewStates?.length) await db.reviewStates.bulkAdd(data.reviewStates)
  })
}

export async function updateQuestion(id: number, patch: Partial<Question>): Promise<void> {
  await db.questions.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteQuestion(id: number): Promise<void> {
  await db.transaction('rw', db.questions, db.studyLogs, db.reviewStates, async () => {
    await db.questions.delete(id)
    await db.studyLogs.where('questionId').equals(id).delete()
    await db.reviewStates.delete(id)
  })
}

export async function getQuestionCount(): Promise<number> {
  return db.questions.count()
}
