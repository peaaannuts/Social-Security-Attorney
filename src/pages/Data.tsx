import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import {
  importQuestions,
  parseCSV,
  exportBackup,
  restoreBackup,
  updateQuestion,
  deleteQuestion,
  type ImportResult,
  type BackupData,
} from '../lib/store'
import {
  SUBJECTS,
  BLANK_TOKEN,
  type Question,
  type QuestionFormat,
  type Subject,
} from '../lib/types'
import { downloadText, todayStamp } from '../lib/download'
import { importSeedPack } from '../lib/seedInit'

const CSV_TEMPLATE = `subject,format,questionText,answer,choices,explanation,source,tags
労基・安衛,ox,使用者は原則として毎週少なくとも1回の休日を与えなければならない。,○,,労基法35条1項。週休制が原則。,労基法35条,数字要件|休日
国年,ox,老齢基礎年金の受給資格期間は原則25年以上必要である。,×,,平成29年8月から10年に短縮された。,国年法26条,法改正|数字要件
労基・安衛,select,法定労働時間は原則として1週間について＿＿＿時間である。,40,36|40|44|48,労基法32条。1週40時間・1日8時間が原則。,労基法32条,選択式|数字要件`

export default function Data() {
  const questions = useLiveQuery(() => db.questions.orderBy('createdAt').reverse().toArray(), [], [])
  const [filter, setFilter] = useState<Subject | 'all'>('all')
  const [keyword, setKeyword] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState<Question | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleFile(file: File) {
    setImportResult(null)
    setMessage(null)
    const text = await file.text()
    try {
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text)
        // バックアップ形式なら復元、配列なら問題インポート
        if (data && !Array.isArray(data) && data.questions) {
          if (
            confirm(
              'バックアップ形式を検出しました。現在の全データを置き換えて復元しますか？（元に戻せません）',
            )
          ) {
            await restoreBackup(data as BackupData)
            setMessage('バックアップから復元しました。')
          }
          return
        }
        const rows = Array.isArray(data) ? data : [data]
        setImportResult(await importQuestions(rows))
      } else {
        setImportResult(await importQuestions(parseCSV(text)))
      }
    } catch (e) {
      setMessage(`読み込みエラー: ${(e as Error).message}`)
    }
  }

  async function handleBackup() {
    const data = await exportBackup()
    downloadText(
      `sharoushi-backup-${todayStamp()}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    )
    setMessage('バックアップ(JSON)を書き出しました。週1回の実行を推奨。')
  }

  function handleTemplate() {
    downloadText('sharoushi-template.csv', CSV_TEMPLATE, 'text/csv')
  }

  const filtered = (questions ?? []).filter((q) => {
    if (filter !== 'all' && q.subject !== filter) return false
    if (keyword && !q.questionText.includes(keyword) && !q.tags.some((t) => t.includes(keyword)))
      return false
    return true
  })

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="pt-1">
        <h1 className="text-xl font-bold">データ管理</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          登録 {questions?.length ?? 0} 問 / インポート・バックアップ
        </p>
      </header>

      {message && (
        <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:bg-sky-900/20 dark:text-sky-300">
          {message}
        </div>
      )}

      {importResult && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <p className="font-medium">
            追加 {importResult.added} 問 / 重複スキップ {importResult.skipped} 問
          </p>
          {importResult.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-rose-600 dark:text-rose-400">
              {importResult.errors.slice(0, 8).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {importResult.errors.length > 8 && <li>ほか {importResult.errors.length - 8} 件</li>}
            </ul>
          )}
        </div>
      )}

      {/* インポート */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          問題をインポート（CSV / JSON）
        </h2>
        <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <input
            type="file"
            accept=".csv,.json,application/json,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          📥 ファイルを選択してインポート
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleTemplate}
            className="flex-1 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium active:scale-95 dark:bg-slate-800"
          >
            CSVテンプレDL
          </button>
          <button
            onClick={() => setAdding(true)}
            className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white active:scale-95"
          >
            ＋1問追加
          </button>
        </div>
        <button
          onClick={async () => {
            setMessage(null)
            setImportResult(await importSeedPack())
          }}
          className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 text-sm font-medium text-sky-700 active:scale-[0.99] dark:border-sky-800/60 dark:bg-sky-900/20 dark:text-sky-300"
        >
          📚 収録サンプル問題を取り込む（重複は自動スキップ）
        </button>
        <p className="text-xs text-slate-400">
          アプリ更新で問題が追加された際に押すと、新規分だけが取り込まれます。
          金額など制度改定で変わる論点には「#要確認」タグを付けています。
        </p>
      </section>

      {/* バックアップ */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          バックアップ・復元
        </h2>
        <p className="text-xs text-slate-400">
          学習履歴を含む全データをJSONで保存/復元。端末故障・ブラウザデータ消去に備え、週1回の書き出しを推奨。
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleBackup}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white active:scale-95"
          >
            ⬇️ バックアップ書き出し
          </button>
          <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-slate-200 px-3 py-2.5 text-sm font-medium active:scale-95 dark:bg-slate-800">
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
            ⬆️ 復元(JSON)
          </label>
        </div>
      </section>

      {/* 問題一覧 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          登録済みの問題
        </h2>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="キーワード検索（問題文・タグ）"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            全{questions?.length ?? 0}
          </Chip>
          {SUBJECTS.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {s}
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {q.subject}
                </span>
                {q.format === 'select' && (
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    選択式
                  </span>
                )}
                <span className="text-xs font-bold text-slate-500">正答: {q.answer}</span>
              </div>
              <p className="line-clamp-3 text-sm">{q.questionText}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex flex-wrap gap-1 text-xs text-slate-400">
                  {q.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => setEditing(q)}
                    className="rounded px-2 py-1 text-sky-600 dark:text-sky-400"
                  >
                    編集
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('この問題を削除しますか？（学習履歴も削除されます）')) {
                        await deleteQuestion(q.id!)
                      }
                    }}
                    className="rounded px-2 py-1 text-rose-500"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">該当する問題がありません</p>
          )}
        </div>
      </section>

      {(editing || adding) && (
        <QuestionEditor
          question={editing}
          onClose={() => {
            setEditing(null)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
        active
          ? 'bg-sky-600 text-white'
          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

// 追加・編集フォーム（簡易編集: 誤字修正〜新規追加）
function QuestionEditor({
  question,
  onClose,
}: {
  question: Question | null
  onClose: () => void
}) {
  const [subject, setSubject] = useState<Subject>(question?.subject ?? SUBJECTS[0])
  const [format, setFormat] = useState<QuestionFormat>(question?.format ?? 'ox')
  const [questionText, setQuestionText] = useState(question?.questionText ?? '')
  const [answer, setAnswer] = useState<string>(question?.answer ?? '○')
  const [choices, setChoices] = useState((question?.choices ?? []).join('\n'))
  const [explanation, setExplanation] = useState(question?.explanation ?? '')
  const [source, setSource] = useState(question?.source ?? '')
  const [tags, setTags] = useState((question?.tags ?? []).join('、'))
  const [saving, setSaving] = useState(false)

  // 形式を選択式に切り替えたとき、○×の名残(answer)をクリアして入力しやすくする
  function changeFormat(f: QuestionFormat) {
    setFormat(f)
    if (f === 'select' && (answer === '○' || answer === '×')) setAnswer('')
    if (f === 'ox' && answer !== '○' && answer !== '×') setAnswer('○')
  }

  async function save() {
    if (!questionText.trim()) {
      alert('問題文を入力してください')
      return
    }
    const choiceArr = choices
      .split(/[\n,、|｜]/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (format === 'select') {
      if (!answer.trim()) {
        alert('正答（空欄に入る語句）を入力してください')
        return
      }
      if (!choiceArr.includes(answer.trim())) choiceArr.push(answer.trim())
      if (choiceArr.length < 2) {
        alert('選択肢を2つ以上入力してください（1行に1つ）')
        return
      }
    }
    setSaving(true)
    const tagArr = tags.split(/[,、|]/).map((t) => t.trim()).filter(Boolean)
    const common = {
      subject,
      format,
      questionText: questionText.trim(),
      answer: answer.trim(),
      choices: format === 'select' ? choiceArr : undefined,
      explanation: explanation.trim(),
      source: source.trim() || undefined,
      tags: tagArr,
    }
    if (question?.id) {
      await updateQuestion(question.id, common)
    } else {
      const now = Date.now()
      await db.questions.add({ ...common, createdAt: now, updatedAt: now })
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-slate-900 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{question ? '問題を編集' : '問題を追加'}</h3>
          <button onClick={onClose} className="text-2xl text-slate-400">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="科目">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="形式">
            <div className="flex gap-2">
              {(
                [
                  ['ox', '○×'],
                  ['select', '選択式（空欄補充）'],
                ] as [QuestionFormat, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => changeFormat(v)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                    format === v ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label={format === 'select' ? `問題文（空欄は ${BLANK_TOKEN} で表す）` : '問題文'}
          >
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder={
                format === 'select'
                  ? `例）法定労働時間は原則1週${BLANK_TOKEN}時間である。`
                  : ''
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </Field>

          {format === 'ox' ? (
            <Field label="正答">
              <div className="flex gap-2">
                {['○', '×'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAnswer(v)}
                    className={`flex-1 rounded-lg py-2.5 text-xl font-bold ${
                      answer === v
                        ? v === '○'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <>
              <Field label="正答（空欄に入る語句）">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="例）40"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </Field>
              <Field label="選択肢（1行に1つ。正答が無ければ自動で追加）">
                <textarea
                  value={choices}
                  onChange={(e) => setChoices(e.target.value)}
                  rows={4}
                  placeholder={'36\n40\n44\n48'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </Field>
            </>
          )}

          <Field label="解説">
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </Field>

          <Field label="出典（任意）">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </Field>

          <Field label="タグ（、区切り）">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="数字要件、法改正"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </Field>

          <button
            onClick={save}
            disabled={saving}
            className="mt-2 rounded-xl bg-sky-600 py-3 font-bold text-white active:scale-95 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}
