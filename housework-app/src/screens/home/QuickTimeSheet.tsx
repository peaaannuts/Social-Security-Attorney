import { useState } from 'react'
import { categoryChipColor, categoryEmoji } from '../../lib/categoryStyle'
import { hoursAgo, toLocalInputValue, todayAt, yesterdayAt } from '../../lib/date'
import { useIsDark } from '../../lib/theme'
import type { Chore } from '../../types'

interface Preset {
  label: string
  sublabel: string
  at: () => number
}

const PRESETS: Preset[] = [
  { label: 'さっき', sublabel: '1時間前', at: () => hoursAgo(1) },
  { label: '今朝', sublabel: '8:00', at: () => todayAt(8) },
  { label: '昨日の夜', sublabel: '昨日 20:00', at: () => yesterdayAt(20) },
]

export function QuickTimeSheet({
  chore,
  onPick,
  onClose,
}: {
  chore: Chore
  onPick: (doneAt: number) => void
  onClose: () => void
}) {
  const isDark = useIsDark()
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState(() => toLocalInputValue(Date.now()))

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-white p-4 pb-8 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />

        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
          >
            {categoryEmoji(chore.category)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-neutral-900 dark:text-white">
              {chore.name}
            </h3>
            <p className="text-xs text-neutral-400">いつやりましたか？</p>
          </div>
        </div>

        {!showCustom ? (
          <div className="flex flex-col gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onPick(preset.at())}
                className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3.5 text-left active:bg-neutral-100 dark:bg-neutral-800 dark:active:bg-neutral-700"
              >
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {preset.label}
                </span>
                <span className="text-sm text-neutral-400">{preset.sublabel}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="flex items-center justify-between rounded-2xl border border-dashed border-neutral-300 px-4 py-3.5 text-left text-neutral-500 active:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:active:bg-neutral-800"
            >
              <span className="font-medium">日時を指定…</span>
              <span>›</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
              日時
              <input
                type="datetime-local"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="flex-1 rounded-xl border border-neutral-300 py-3 font-medium text-neutral-600 active:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:active:bg-neutral-800"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => {
                  const ms = new Date(customValue).getTime()
                  if (!Number.isNaN(ms)) onPick(ms)
                }}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white active:bg-blue-700"
              >
                この時刻で記録
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
