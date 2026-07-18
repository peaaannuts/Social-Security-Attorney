import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  getDueCount,
  getStreak,
  getTodayCount,
  getQuestionCount,
  getSubjectStats,
} from '../lib/store'
import { SUBJECTS } from '../lib/types'
import type { Theme } from '../lib/theme'

interface Props {
  theme: Theme
  onToggleTheme: () => void
}

export default function Home({ theme, onToggleTheme }: Props) {
  const navigate = useNavigate()
  const [showSubjects, setShowSubjects] = useState(false)

  // useLiveQuery で復習キュー等をリアルタイム反映
  const due = useLiveQuery(() => getDueCount(), [], 0)
  const streak = useLiveQuery(() => getStreak(), [], 0)
  const today = useLiveQuery(() => getTodayCount(), [], 0)
  const total = useLiveQuery(() => getQuestionCount(), [], 0)
  const subjectStats = useLiveQuery(() => getSubjectStats(), [], [])

  // 足切りリスク: 回答数5以上かつ正答率60%未満の科目
  const [weakest, setWeakest] = useState<string | null>(null)
  useEffect(() => {
    if (!subjectStats) return
    const risky = subjectStats
      .filter((s) => s.answered >= 5 && s.accuracy < 0.6)
      .sort((a, b) => a.accuracy - b.accuracy)[0]
    setWeakest(risky ? risky.subject : null)
  }, [subjectStats])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold">社労士 一問一答</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            5分を確実に得点に変える
          </p>
        </div>
        <button
          onClick={onToggleTheme}
          aria-label="テーマ切替"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-lg dark:bg-slate-800"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </header>

      {/* 今日の復習（最上部・最重要導線） */}
      <button
        onClick={() => navigate('/drill?mode=review')}
        disabled={!due}
        className="rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-left text-white shadow-lg shadow-sky-500/20 transition active:scale-[0.98] disabled:from-slate-400 disabled:to-slate-500 disabled:opacity-70 dark:disabled:from-slate-700 dark:disabled:to-slate-800"
      >
        <div className="text-sm font-medium opacity-90">今日の復習</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums">{due ?? 0}</span>
          <span className="text-lg font-medium">問</span>
        </div>
        <div className="mt-2 text-sm opacity-90">
          {due ? 'タップして復習を開始 →' : '復習キューは空です。新しい問題を解こう'}
        </div>
      </button>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="連続日数" value={`${streak ?? 0}`} unit="日" />
        <Stat label="今日の回答" value={`${today ?? 0}`} unit="問" />
        <Stat label="登録問題" value={`${total ?? 0}`} unit="問" />
      </div>

      {weakest && (
        <button
          onClick={() => navigate(`/drill?mode=subject&subject=${encodeURIComponent(weakest)}`)}
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
        >
          ⚠️ <span className="font-semibold">{weakest}</span>{' '}
          の正答率が低下しています（足切り注意）。タップで集中演習 →
        </button>
      )}

      {/* 出題モード */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
          演習を始める
        </h2>
        <button
          onClick={() => navigate('/drill?mode=random')}
          className="flex items-center justify-between rounded-xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
        >
          <span className="font-medium">🎲 全科目ランダム（○×）</span>
          <span className="text-slate-400">→</span>
        </button>
        <button
          onClick={() => navigate('/drill?mode=random&format=select')}
          className="flex items-center justify-between rounded-xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
        >
          <span className="font-medium">✍️ 選択式（空欄補充）</span>
          <span className="text-slate-400">→</span>
        </button>
        <button
          onClick={() => navigate('/exam')}
          className="flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-4 text-left text-white shadow-sm transition active:scale-[0.99]"
        >
          <span className="font-medium">🎯 模試モード（時間制限・足切り判定）</span>
          <span className="opacity-80">→</span>
        </button>
        <button
          onClick={() => setShowSubjects((v) => !v)}
          className="flex items-center justify-between rounded-xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
        >
          <span className="font-medium">📚 科目を選んで演習</span>
          <span className="text-slate-400">{showSubjects ? '▲' : '▼'}</span>
        </button>

        {showSubjects && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {SUBJECTS.map((s) => {
              const stat = subjectStats?.find((x) => x.subject === s)
              return (
                <button
                  key={s}
                  onClick={() =>
                    navigate(`/drill?mode=subject&subject=${encodeURIComponent(s)}`)
                  }
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white px-2 py-3 text-center text-sm font-medium shadow-sm ring-1 ring-slate-200 transition active:scale-95 dark:bg-slate-900 dark:ring-slate-800"
                >
                  <span>{s}</span>
                  {stat && stat.answered > 0 && (
                    <span
                      className={`text-xs ${
                        stat.accuracy < 0.6
                          ? 'text-rose-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {Math.round(stat.accuracy * 100)}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-3 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="ml-0.5 text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  )
}
