import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BLANK_RE, SUBJECTS, type Question, type Subject } from '../lib/types'
import { buildMockExam, buildChoices, recordAnswer } from '../lib/store'

type Phase = 'setup' | 'loading' | 'running' | 'result'

interface Preset {
  id: string
  label: string
  perSubject: number
  minutes: number
  note: string
}

// 本試験は択一70問+選択40空欄で長丁場。ここでは学習用に規模別プリセットを用意。
const PRESETS: Preset[] = [
  { id: 'mini', label: 'ミニ模試', perSubject: 3, minutes: 20, note: '各科目3問・約27問 / 20分' },
  { id: 'std', label: '標準模試', perSubject: 5, minutes: 40, note: '各科目5問・約45問 / 40分' },
  { id: 'full', label: '本番級', perSubject: 8, minutes: 75, note: '各科目8問・最大72問 / 75分' },
]

// 学習用の基準点（本試験の足切りは択一約4割・選択約6割で毎年変動するため、
// ここでは科目6割・総得点6.5割を「目安」として判定する）。
const CUTOFF_SUBJECT = 0.6
const CUTOFF_TOTAL = 0.65

interface Answered {
  question: Question
  correct: boolean
  selected: string
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Exam() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('setup')
  const [config, setConfig] = useState<Preset>(PRESETS[1])
  const [queue, setQueue] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answered[]>([])
  const [remaining, setRemaining] = useState(0)
  const shownAt = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const current = queue[index]
  const choices = useMemo(
    () => (current?.format === 'select' ? buildChoices(current, queue) : []),
    [current?.id, queue],
  )

  // カウントダウン
  useEffect(() => {
    if (phase !== 'running') return
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase('result')
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  async function start(preset: Preset) {
    setConfig(preset)
    setPhase('loading')
    const qs = await buildMockExam(preset.perSubject)
    if (qs.length === 0) {
      setPhase('setup')
      alert('問題が登録されていません。データ画面から追加してください。')
      return
    }
    setQueue(qs)
    setIndex(0)
    setAnswers([])
    setRemaining(preset.minutes * 60)
    setPhase('running')
    shownAt.current = Date.now()
  }

  async function submit(value: string) {
    if (!current || phase !== 'running') return
    const correct = value === current.answer
    const responseTimeMs = Date.now() - shownAt.current
    setAnswers((a) => [...a, { question: current, correct, selected: value }])
    // 模試中でも履歴・復習キューには反映する（間違えた問題を後で復習できる）
    void recordAnswer({ question: current, correct, lowConfidence: false, responseTimeMs })
    if (index + 1 >= queue.length) {
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('result')
    } else {
      setIndex((i) => i + 1)
      shownAt.current = Date.now()
    }
  }

  function finishEarly() {
    if (confirm('ここまでの解答で採点しますか？（未解答は不正解扱い）')) {
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('result')
    }
  }

  // ---- 画面 ----

  if (phase === 'setup') {
    return (
      <div className="flex flex-col gap-4">
        <header className="pt-1">
          <h1 className="text-xl font-bold">🎯 模試モード</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            時間制限つきの通し演習。科目別基準点（足切り）を判定します。
          </p>
        </header>

        <div className="flex flex-col gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => start(p)}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
            >
              <div>
                <div className="font-semibold">{p.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{p.note}</div>
              </div>
              <span className="text-slate-400">→</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          ⚠️ 判定は学習用の目安です（科目6割・総得点6.5割）。本試験の合格基準（択一・選択の科目別基準点や総得点）は毎年変動するため、正式な基準は公式発表をご確認ください。解説は採点後にまとめて表示されます。
        </div>

        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-slate-200 py-3 font-medium active:scale-95 dark:bg-slate-800"
        >
          ホームに戻る
        </button>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-[calc(100dvh-6rem)] items-center justify-center text-slate-500 dark:text-slate-400">
        問題を準備中…
      </div>
    )
  }

  if (phase === 'result') {
    return <Result config={config} answers={answers} onRetry={() => setPhase('setup')} />
  }

  if (!current) return null

  const low = remaining <= 60

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <div className="flex items-center gap-3 py-1">
        <button
          onClick={() => {
            if (confirm('模試を中断してホームに戻りますか？（採点されません）')) navigate('/')
          }}
          aria-label="中断"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-400"
        >
          ✕
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${(index / queue.length) * 100}%` }}
          />
        </div>
        <span
          className={`w-14 text-right text-sm font-bold tabular-nums ${
            low ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          ⏱{fmtTime(remaining)}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {current.subject}
            </span>
            <span className="text-xs text-slate-400">
              {current.format === 'select' ? '選択式' : '○×'}
            </span>
          </div>
          <span className="text-xs tabular-nums text-slate-400">
            {index + 1}/{queue.length}
          </span>
        </div>

        <div className="mt-4 flex-1">
          <p className="text-lg leading-relaxed">
            {current.format === 'select' && BLANK_RE.test(current.questionText)
              ? current.questionText.split(BLANK_RE).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="mx-0.5 inline-block min-w-16 rounded bg-slate-200 px-2 text-center text-transparent dark:bg-slate-700">
                        ＿＿＿
                      </span>
                    )}
                  </span>
                ))
              : current.questionText}
          </p>
        </div>

        <div
          className="sticky bottom-0 -mx-4 bg-slate-50 px-4 pt-3 dark:bg-slate-950"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          {current.format === 'select' ? (
            <div className="flex flex-col gap-2">
              {choices.map((c) => (
                <button
                  key={c}
                  onClick={() => submit(c)}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm ring-1 ring-slate-300 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => submit('○')}
                className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-emerald-500 text-3xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                ○
              </button>
              <button
                onClick={() => submit('×')}
                className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-rose-500 text-3xl font-bold text-white shadow-lg shadow-rose-500/20 active:scale-95"
              >
                ×
              </button>
            </div>
          )}
          <button
            onClick={finishEarly}
            className="mt-2 w-full py-2 text-center text-xs text-slate-400 underline"
          >
            ここまでで採点する
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- 採点結果 ----

interface SubjectResult {
  subject: Subject
  correct: number
  total: number
}

function Result({
  config,
  answers,
  onRetry,
}: {
  config: Preset
  answers: Answered[]
  onRetry: () => void
}) {
  const navigate = useNavigate()

  const bySubject: SubjectResult[] = SUBJECTS.map((subject) => {
    const rows = answers.filter((a) => a.question.subject === subject)
    return {
      subject,
      correct: rows.filter((a) => a.correct).length,
      total: rows.length,
    }
  }).filter((r) => r.total > 0)

  const totalCorrect = answers.filter((a) => a.correct).length
  const totalCount = answers.length
  const totalRate = totalCount ? totalCorrect / totalCount : 0

  const failedSubjects = bySubject.filter(
    (r) => r.correct / r.total < CUTOFF_SUBJECT,
  )
  const passedTotal = totalRate >= CUTOFF_TOTAL
  const passed = passedTotal && failedSubjects.length === 0

  const wrong = answers.filter((a) => !a.correct)

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div
        className={`rounded-2xl p-5 text-center text-white shadow-lg ${
          passed
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
            : 'bg-gradient-to-br from-rose-500 to-orange-600'
        }`}
      >
        <div className="text-sm font-medium opacity-90">{config.label} 採点結果</div>
        <div className="mt-1 text-4xl font-bold">{passed ? '合格' : '不合格'}</div>
        <div className="mt-2 text-lg font-semibold tabular-nums">
          {totalCorrect} / {totalCount}
          <span className="ml-1 text-sm font-normal opacity-90">
            （{Math.round(totalRate * 100)}%）
          </span>
        </div>
      </div>

      {/* 判定内訳 */}
      <div className="flex flex-col gap-1.5 text-sm">
        <Judge
          ok={passedTotal}
          label={`総得点基準（${Math.round(CUTOFF_TOTAL * 100)}%以上）`}
        />
        <Judge
          ok={failedSubjects.length === 0}
          label={`科目別基準点（各科目${Math.round(CUTOFF_SUBJECT * 100)}%以上）`}
        />
      </div>

      {failedSubjects.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/20 dark:text-rose-300">
          ⚠️ 足切り: {failedSubjects.map((r) => r.subject).join('・')}{' '}
          が基準点未満です。ここが本試験なら不合格になります。
        </div>
      )}

      {/* 科目別テーブル */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          科目別スコア
        </h2>
        <div className="flex flex-col gap-1.5">
          {bySubject.map((r) => {
            const rate = r.correct / r.total
            const ok = rate >= CUTOFF_SUBJECT
            return (
              <div
                key={r.subject}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <span className="font-medium">
                  {ok ? '⭕' : '❌'} {r.subject}
                </span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {r.correct}/{r.total}
                  <span className="ml-1 text-xs text-slate-400">
                    ({Math.round(rate * 100)}%)
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 間違えた問題の復習 */}
      {wrong.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            間違えた問題（{wrong.length}問）
          </h2>
          <div className="flex flex-col gap-2">
            {wrong.map((a, i) => (
              <details
                key={i}
                className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <summary className="cursor-pointer list-none">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {a.question.subject}
                  </span>
                  <span className="ml-2">
                    {a.question.questionText.replace(BLANK_RE, '（　）')}
                  </span>
                </summary>
                <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <div className="text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      正答: {a.question.answer}
                    </span>
                    <span className="ml-2 text-rose-500">あなた: {a.selected}</span>
                  </div>
                  {a.question.explanation && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {a.question.explanation}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={onRetry}
          className="rounded-xl bg-indigo-600 py-3 font-bold text-white active:scale-95"
        >
          もう一度 模試を受ける
        </button>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-slate-200 py-3 font-medium active:scale-95 dark:bg-slate-800"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  )
}

function Judge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={ok ? 'text-emerald-500' : 'text-rose-500'}>
        {ok ? '✅' : '❌'}
      </span>
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  )
}
