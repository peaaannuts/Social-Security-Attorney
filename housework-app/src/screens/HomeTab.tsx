import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { useChores } from '../hooks/useChores'
import { useLogsInRange } from '../hooks/useLogs'
import { useLongPress } from '../hooks/useLongPress'
import { categoryChipColor, categoryEmoji } from '../lib/categoryStyle'
import { memberColor } from '../lib/chartColors'
import { formatDayHeading, formatFullDate, formatTime } from '../lib/date'
import { addLog, deleteLog } from '../lib/logService'
import { useIsDark } from '../lib/theme'
import type { Chore, ChoreLog } from '../types'
import { QuickTimeSheet } from './home/QuickTimeSheet'

function ChoreRow({
  chore,
  todayLog,
  isSelf,
  who,
  isDark,
  onTap,
  onLongPress,
}: {
  chore: Chore
  todayLog: ChoreLog | null
  isSelf: boolean | null
  who: string | null
  isDark: boolean
  onTap: (chore: Chore) => void
  onLongPress: (chore: Chore) => void
}) {
  const press = useLongPress(
    () => onTap(chore),
    () => onLongPress(chore),
  )
  const done = !!todayLog
  const doneColor = isSelf ? memberColor(true, isDark) : memberColor(false, isDark)

  return (
    <button
      type="button"
      {...press}
      className="flex w-full items-center gap-3 rounded-2xl bg-[#fffdf8] px-3.5 py-3 text-left shadow-[0_1px_6px_rgba(120,88,52,0.05)] ring-1 ring-[#78583414] transition active:scale-[0.985] dark:bg-neutral-900 dark:ring-white/10"
    >
      {done ? (
        <span
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: doneColor }}
        >
          ✓
        </span>
      ) : (
        <span className="h-[26px] w-[26px] shrink-0 rounded-full border-2 border-dashed border-[#78583452] dark:border-neutral-600" />
      )}
      <span
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
      >
        {categoryEmoji(chore.category)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[#43382e] dark:text-white">
          {chore.name}
        </span>
        {done && todayLog ? (
          <span className="mt-0.5 block text-xs text-[#a4907c] dark:text-neutral-400">
            {who}が {formatTime(todayLog.doneAt)}
          </span>
        ) : (
          <span className="mt-0.5 block text-xs text-[#bfab95] dark:text-neutral-500">
            めやす {chore.minutes}分
          </span>
        )}
      </span>
      {done && <span className="shrink-0 text-base">🌿</span>}
    </button>
  )
}

function TodaySummaryCard({
  meCount,
  youCount,
  total,
  selfName,
  partnerName,
  isDark,
  praise,
}: {
  meCount: number
  youCount: number
  total: number
  selfName: string
  partnerName: string
  isDark: boolean
  praise: string | null
}) {
  const remain = total - meCount - youCount
  const meColor = memberColor(true, isDark)
  const youColor = memberColor(false, isDark)
  const meW = total > 0 ? Math.round((meCount / total) * 100) : 0
  const youW = total > 0 ? Math.round((youCount / total) * 100) : 0

  return (
    <div className="mt-4 rounded-[22px] border border-[#78583414] bg-[#fffdf8] p-[18px] pb-4 shadow-[0_2px_14px_rgba(120,88,52,0.08)] dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-[#6b5a49] dark:text-neutral-200">今日のふたり</span>
        <span className="text-xs font-medium text-[#a4907c] dark:text-neutral-400">
          のこり {remain} 件
        </span>
      </div>
      <div className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-[#f1e8db] dark:bg-neutral-800">
        <div
          className="transition-[width] duration-300 ease-out"
          style={{ width: `${meW}%`, backgroundColor: meColor }}
        />
        <div
          className="transition-[width] duration-300 ease-out"
          style={{ width: `${youW}%`, backgroundColor: youColor }}
        />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b5a49] dark:text-neutral-300">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meColor }} />
          {selfName} {meCount}件
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b5a49] dark:text-neutral-300">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: youColor }} />
          {partnerName} {youCount}件
        </span>
      </div>
      {praise && (
        <p className="mt-3.5 border-t border-dashed border-[#78583428] pt-3 text-xs leading-relaxed text-[#8a7a68] dark:border-white/10 dark:text-neutral-400">
          {praise}
        </p>
      )}
    </div>
  )
}

function AllChoresRow({
  chore,
  isDark,
  onTap,
  onLongPress,
}: {
  chore: Chore
  isDark: boolean
  onTap: (chore: Chore) => void
  onLongPress: (chore: Chore) => void
}) {
  const press = useLongPress(
    () => onTap(chore),
    () => onLongPress(chore),
  )
  return (
    <button
      type="button"
      {...press}
      className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-3 text-left active:bg-neutral-100 dark:bg-neutral-800 dark:active:bg-neutral-700"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl"
        style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
      >
        {categoryEmoji(chore.category)}
      </span>
      <span className="min-w-0 flex-1 break-words font-medium text-neutral-900 dark:text-white">
        {chore.name}
      </span>
      <span className="shrink-0 text-xs text-neutral-400">{chore.minutes}分</span>
    </button>
  )
}

function AllChoresSheet({
  chores,
  isDark,
  onSelect,
  onLongPress,
  onClose,
}: {
  chores: Chore[]
  isDark: boolean
  onSelect: (chore: Chore) => void
  onLongPress: (chore: Chore) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[75vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">すべての家事</h3>
          <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-400">
            閉じる
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {chores.map((chore) => (
            <AllChoresRow
              key={chore.id}
              chore={chore}
              isDark={isDark}
              onTap={(c) => {
                onSelect(c)
                onClose()
              }}
              onLongPress={(c) => {
                onLongPress(c)
                onClose()
              }}
            />
          ))}
          {chores.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-400">
              登録されている家事がありません
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function HomeTab() {
  const { user } = useAuth()
  const { household, myNickname, partnerUid } = useHousehold()
  const { chores } = useChores(household?.id ?? null)
  const { show } = useToast()
  const isDark = useIsDark()
  const [showAll, setShowAll] = useState(false)
  const [pickingTimeFor, setPickingTimeFor] = useState<Chore | null>(null)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const { logs: todayLogs } = useLogsInRange(household?.id ?? null, todayStart, todayEnd)

  const favorites = chores.filter((c) => c.isFavorite)
  const selfName = myNickname || 'あなた'
  const partnerName = (partnerUid ? household?.nicknames?.[partnerUid] : undefined) || 'パートナー'

  // Most recent log today per chore (doneAt-desc order from useLogsInRange
  // means the first log seen per choreId is the latest).
  const latestTodayByChore = new Map<string, ChoreLog>()
  for (const log of todayLogs) {
    if (!latestTodayByChore.has(log.choreId)) latestTodayByChore.set(log.choreId, log)
  }

  let meCount = 0
  let youCount = 0
  for (const chore of favorites) {
    const log = latestTodayByChore.get(chore.id)
    if (!log) continue
    if (log.userId === user?.uid) meCount++
    else youCount++
  }
  const total = favorites.length
  const remain = total - meCount - youCount
  const gap = Math.abs(meCount - youCount)
  const praise =
    total === 0
      ? null
      : remain === 0
        ? 'きょうの家事はぜんぶ終わりました。おつかれさま。'
        : gap <= 1
          ? 'いいバランスです。のこりは夜のうちにふたりで。'
          : `${meCount > youCount ? partnerName : selfName}さんの手が空いたら、のこりをおねがいしてみましょう。`

  function recordAt(chore: Chore, doneAt: number) {
    if (!household || !user) return
    const logId = addLog(household.id, chore, user.uid, doneAt)
    const isNow = Math.abs(Date.now() - doneAt) < 5000
    const whenLabel = isNow ? '' : `（${formatDayHeading(doneAt)} ${formatTime(doneAt)}）`
    show(`「${chore.name}」${whenLabel}を記録しました`, () => {
      deleteLog(household.id, logId)
    })
  }

  function handleTap(chore: Chore) {
    recordAt(chore, Date.now())
  }

  function handleLongPress(chore: Chore) {
    setPickingTimeFor(chore)
  }

  return (
    <div className="min-h-full px-4 pb-28 pt-6">
      <p className="text-[13px] font-medium tracking-wide text-[#a4907c] dark:text-neutral-500">
        {formatFullDate(Date.now())}
      </p>
      <h1 className="mt-1.5 font-['Shippori_Mincho'] text-[27px] font-semibold leading-tight text-[#43382e] dark:text-white">
        おかえり、{selfName}さん
      </h1>

      <TodaySummaryCard
        meCount={meCount}
        youCount={youCount}
        total={total}
        selfName={selfName}
        partnerName={partnerName}
        isDark={isDark}
        praise={praise}
      />

      <p className="mb-1 mt-5 text-xs text-[#bfab95] dark:text-neutral-500">
        🕐 長押しすると、さっき・今朝・昨日など過去の時刻でも記録できます
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {favorites.map((chore) => {
          const log = latestTodayByChore.get(chore.id) ?? null
          const isSelf = log ? log.userId === user?.uid : null
          const who = log ? (isSelf ? selfName : partnerName) : null
          return (
            <ChoreRow
              key={chore.id}
              chore={chore}
              todayLog={log}
              isSelf={isSelf}
              who={who}
              isDark={isDark}
              onTap={handleTap}
              onLongPress={handleLongPress}
            />
          )
        })}
      </div>

      {favorites.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white/70 p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900/70 dark:ring-white/10">
          <p className="text-3xl">⭐️</p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            お気に入りの家事がまだありません。
            <br />
            設定から追加すると、ここにワンタップ記録ボタンが並びます。
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="mt-4 w-full rounded-2xl border border-dashed border-[#b4825a59] bg-[#fffdf880] py-3.5 text-sm font-medium text-[#a67a56] active:bg-white dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400"
      >
        ＋ その他の家事から選ぶ
      </button>

      {showAll && (
        <AllChoresSheet
          chores={chores}
          isDark={isDark}
          onSelect={handleTap}
          onLongPress={handleLongPress}
          onClose={() => setShowAll(false)}
        />
      )}

      {pickingTimeFor && (
        <QuickTimeSheet
          chore={pickingTimeFor}
          onPick={(doneAt) => {
            recordAt(pickingTimeFor, doneAt)
            setPickingTimeFor(null)
          }}
          onClose={() => setPickingTimeFor(null)}
        />
      )}
    </div>
  )
}
