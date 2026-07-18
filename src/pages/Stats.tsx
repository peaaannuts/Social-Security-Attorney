import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  getSubjectStats,
  getTagStats,
  getDailyStats,
  getStreak,
} from '../lib/store'

export default function Stats() {
  const navigate = useNavigate()
  const subjects = useLiveQuery(() => getSubjectStats(), [], [])
  const tags = useLiveQuery(() => getTagStats(), [], [])
  const daily = useLiveQuery(() => getDailyStats(14), [], [])
  const streak = useLiveQuery(() => getStreak(), [], 0)

  const maxDaily = Math.max(1, ...(daily?.map((d) => d.count) ?? [1]))

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="pt-1">
        <h1 className="text-xl font-bold">成績・弱点</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          連続 {streak ?? 0} 日 / 科目別の足切りリスクを早期発見
        </p>
      </header>

      {/* 科目別正答率（足切り対策の主役） */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          科目別 正答率
        </h2>
        <div className="flex flex-col gap-2">
          {subjects?.map((s) => {
            const pct = Math.round(s.accuracy * 100)
            const risky = s.answered >= 5 && s.accuracy < 0.6
            return (
              <button
                key={s.subject}
                onClick={() =>
                  navigate(`/drill?mode=subject&subject=${encodeURIComponent(s.subject)}`)
                }
                className="rounded-xl bg-white px-3 py-2.5 text-left shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {s.subject}
                    {risky && <span className="ml-1 text-rose-500">⚠️</span>}
                  </span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {s.answered > 0 ? `${pct}%` : '未学習'}
                    <span className="ml-1 text-xs text-slate-400">
                      ({s.correct}/{s.answered})
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      s.answered === 0
                        ? 'bg-slate-300 dark:bg-slate-700'
                        : risky
                          ? 'bg-rose-500'
                          : s.accuracy < 0.8
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                    }`}
                    style={{ width: `${s.answered ? pct : 0}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  登録 {s.questionCount} 問
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 日次学習量（直近14日） */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          学習量（直近14日）
        </h2>
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex h-28 items-end gap-1">
            {daily?.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-sky-500/80"
                    style={{ height: `${(d.count / maxDaily) * 100}%` }}
                    title={`${d.date}: ${d.count}問`}
                  />
                </div>
                <span className="text-[9px] text-slate-400">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* タグ別正答率 */}
      {tags && tags.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            タグ別 正答率
          </h2>
          <div className="flex flex-col gap-1.5">
            {tags.map((t) => {
              const pct = Math.round(t.accuracy * 100)
              return (
                <div
                  key={t.tag}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
                >
                  <span className="font-medium">#{t.tag}</span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {pct}%{' '}
                    <span className="text-xs text-slate-400">
                      ({t.correct}/{t.answered})
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
