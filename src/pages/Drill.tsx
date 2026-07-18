import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Question, Subject } from '../lib/types'
import { buildSession, recordAnswer, type SessionMode } from '../lib/store'

type Phase = 'loading' | 'question' | 'revealed' | 'done' | 'empty'

interface AnswerRecord {
  correct: boolean
}

export default function Drill() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const mode: SessionMode = useMemo(() => {
    const m = params.get('mode')
    if (m === 'review') return { kind: 'review' }
    if (m === 'subject') {
      const subject = params.get('subject') as Subject | null
      if (subject) return { kind: 'subject', subject }
    }
    return { kind: 'random' }
  }, [params])

  const [phase, setPhase] = useState<Phase>('loading')
  const [queue, setQueue] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [lowConfidence, setLowConfidence] = useState(false)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [results, setResults] = useState<AnswerRecord[]>([])
  const shownAt = useRef<number>(Date.now())

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    buildSession(mode, 10).then((qs) => {
      if (cancelled) return
      if (qs.length === 0) {
        setPhase('empty')
      } else {
        setQueue(qs)
        setIndex(0)
        setResults([])
        setPhase('question')
        shownAt.current = Date.now()
      }
    })
    return () => {
      cancelled = true
    }
  }, [mode])

  const current = queue[index]

  async function handleAnswer(choice: '○' | '×') {
    if (!current || phase !== 'question') return
    const correct = choice === current.answer
    const responseTimeMs = Date.now() - shownAt.current
    setLastCorrect(correct)
    setPhase('revealed')
    setResults((r) => [...r, { correct }])
    await recordAnswer({ question: current, correct, lowConfidence, responseTimeMs })
  }

  function next() {
    setLowConfidence(false)
    setLastCorrect(null)
    if (index + 1 >= queue.length) {
      setPhase('done')
    } else {
      setIndex((i) => i + 1)
      setPhase('question')
      shownAt.current = Date.now()
    }
  }

  const modeLabel =
    mode.kind === 'review'
      ? '復習'
      : mode.kind === 'subject'
        ? mode.subject
        : '全科目ランダム'

  if (phase === 'loading') {
    return <Centered>読み込み中…</Centered>
  }

  if (phase === 'empty') {
    return (
      <Centered>
        <div className="text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <p className="mb-1 font-semibold">出題できる問題がありません</p>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            {mode.kind === 'review'
              ? '復習キューは空です。お疲れさまでした。'
              : 'この条件の問題が未登録です。データ画面から追加してください。'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-sky-600 px-6 py-3 font-medium text-white active:scale-95"
          >
            ホームに戻る
          </button>
        </div>
      </Centered>
    )
  }

  if (phase === 'done') {
    const correctCount = results.filter((r) => r.correct).length
    const rate = results.length ? Math.round((correctCount / results.length) * 100) : 0
    return (
      <Centered>
        <div className="w-full text-center">
          <div className="mb-2 text-4xl">{rate >= 80 ? '💯' : rate >= 60 ? '👍' : '📖'}</div>
          <p className="mb-1 text-lg font-bold">セッション完了</p>
          <p className="mb-6 text-slate-500 dark:text-slate-400">
            {results.length}問中 <span className="font-semibold text-sky-500">{correctCount}</span>
            問正解（{rate}%）
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                // 同じモードでもう1セット
                setPhase('loading')
                buildSession(mode, 10).then((qs) => {
                  if (qs.length === 0) return setPhase('empty')
                  setQueue(qs)
                  setIndex(0)
                  setResults([])
                  setPhase('question')
                  shownAt.current = Date.now()
                })
              }}
              className="rounded-xl bg-sky-600 px-6 py-3 font-medium text-white active:scale-95"
            >
              もう10問つづける
            </button>
            <button
              onClick={() => navigate('/')}
              className="rounded-xl bg-slate-200 px-6 py-3 font-medium active:scale-95 dark:bg-slate-800"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </Centered>
    )
  }

  if (!current) return null

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      {/* ヘッダー: 中断してもすぐ戻れる */}
      <div className="flex items-center gap-3 py-1">
        <button
          onClick={() => navigate('/')}
          aria-label="閉じる"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-400"
        >
          ✕
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${((index + (phase === 'revealed' ? 1 : 0)) / queue.length) * 100}%` }}
          />
        </div>
        <span className="w-12 text-right text-sm tabular-nums text-slate-500 dark:text-slate-400">
          {index + 1}/{queue.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {current.subject}
          </span>
          <span className="text-xs text-slate-400">{modeLabel}</span>
        </div>

        {/* 問題文 */}
        <div className="mt-4 flex-1">
          <p className="text-lg leading-relaxed">{current.questionText}</p>

          {phase === 'revealed' && (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                lastCorrect
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20'
                  : 'border-rose-300 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <span>{lastCorrect ? '✅ 正解' : '❌ 不正解'}</span>
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  正答: {current.answer}
                </span>
              </div>
              {current.explanation && (
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {current.explanation}
                </p>
              )}
              {(current.source || current.tags.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  {current.source && <span>{current.source}</span>}
                  {current.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-slate-200 px-1.5 py-0.5 dark:bg-slate-800"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作エリア（親指が届く下部固定） */}
        <div
          className="sticky bottom-0 -mx-4 bg-slate-50 px-4 pt-3 dark:bg-slate-950"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          {phase === 'question' ? (
            <>
              <label className="mb-2 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={lowConfidence}
                  onChange={(e) => setLowConfidence(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                自信なし（正解でも短い間隔で再出題）
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAnswer('○')}
                  className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-emerald-500 text-3xl font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  ○
                </button>
                <button
                  onClick={() => handleAnswer('×')}
                  className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-rose-500 text-3xl font-bold text-white shadow-lg shadow-rose-500/20 active:scale-95"
                >
                  ×
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={next}
              autoFocus
              className="h-16 w-full rounded-2xl bg-sky-600 text-lg font-bold text-white shadow-lg shadow-sky-500/20 active:scale-95"
            >
              {index + 1 >= queue.length ? '結果を見る' : '次の問題へ →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-6rem)] items-center justify-center text-slate-500 dark:text-slate-400">
      {children}
    </div>
  )
}
