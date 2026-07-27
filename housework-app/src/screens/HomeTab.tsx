import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { useChores } from '../hooks/useChores'
import { useLogsInRange } from '../hooks/useLogs'
import { useLongPress } from '../hooks/useLongPress'
import { categoryChipColor, categoryEmoji } from '../lib/categoryStyle'
import { memberColor } from '../lib/chartColors'
import { formatDayHeading, formatTime, formatVillageDate } from '../lib/date'
import { addLog, deleteLog } from '../lib/logService'
import { useIsDark } from '../lib/theme'
import type { Chore, ChoreLog } from '../types'
import { QuickTimeSheet } from './home/QuickTimeSheet'

const REWARD_TARGET = 300

function iemoriLines(remain: number, thanksToday: number): string[] {
  return [
    remain === 0
      ? 'きょうの家事はぜんぶ片づきましたなぁ。お茶でも飲みましょう。'
      : `のこりは ${remain}こ。急がずまいりましょう。`,
    'ふたりで分けると、家はずいぶん軽くなるものですねぇ。',
    `きょうは 🍀 が ${thanksToday.toLocaleString('ja-JP')} たまりましたよ。えらい。`,
    '無理はしなくてよろしい。あしたの分は、あしたの家が持ちます。',
  ]
}

function IemoriCard({ remain, thanksToday }: { remain: number; thanksToday: number }) {
  const [lineIndex, setLineIndex] = useState(0)
  const lines = iemoriLines(remain, thanksToday)

  return (
    <div className="mt-4 flex items-end gap-3">
      <div className="relative h-[72px] w-[72px] shrink-0">
        <img
          src="/iemori.png"
          alt="いえもり"
          className="h-full w-full rounded-full border-[3px] border-white bg-[#eaf3d8] object-cover shadow-[0_3px_0_rgba(120,140,90,0.25)] dark:border-neutral-700"
        />
        <span className="absolute -bottom-1 -left-1 rounded-full border-2 border-white bg-[#fffdf5] px-2 py-0.5 text-[10.5px] font-bold text-[#6f7a4e] shadow-[0_2px_0_rgba(120,140,90,0.25)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-[#a3d17a]">
          いえもり
        </span>
      </div>
      <button
        type="button"
        onClick={() => setLineIndex((i) => (i + 1) % lines.length)}
        className="min-w-0 flex-1 rounded-[22px_22px_22px_6px] border-4 border-white bg-[#fffdf5] px-4 py-3.5 text-left shadow-[0_5px_0_rgba(120,140,90,0.26)] transition active:translate-y-0.5 active:shadow-[0_3px_0_rgba(120,140,90,0.26)] dark:border-neutral-700 dark:bg-neutral-900"
      >
        <p className="text-[13.5px] font-bold leading-relaxed text-[#4e5c35] dark:text-neutral-200">
          {lines[lineIndex]}
        </p>
        <p className="mt-2 text-[10.5px] font-medium text-[#adb493] dark:text-neutral-500">
          タップでもうひとこと
        </p>
      </button>
    </div>
  )
}

function TodayBoardCard({
  doneCount,
  total,
  dots,
}: {
  doneCount: number
  total: number
  dots: { done: boolean; color?: string }[]
}) {
  const progressW = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="mt-4 rounded-[28px] border-4 border-white bg-[#fffdf5] px-[18px] pb-4 pt-4 shadow-[0_6px_0_rgba(120,140,90,0.28)] dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <span className="text-[14.5px] font-bold text-[#4e5c35] dark:text-neutral-200">
          きょうのおてつだいボード
        </span>
        <span className="text-xs font-bold text-[#8a9470] dark:text-neutral-400">
          {doneCount} / {total}
        </span>
      </div>
      <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-[#e2ebd0] bg-[#eef2e2] dark:border-neutral-700 dark:bg-neutral-800">
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{ width: `${progressW}%`, background: 'linear-gradient(180deg,#a8ce6e,#7fa84c)' }}
        />
      </div>
      {dots.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {dots.map((d, i) => (
            <span
              key={i}
              className="h-3 flex-1 overflow-hidden rounded-full bg-[#eef2e2] dark:bg-neutral-800"
            >
              {d.done && <span className="block h-full" style={{ backgroundColor: d.color }} />}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RewardTeaserCard({ remaining }: { remaining: number }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-[26px] border-4 border-white bg-[#fffdf5]/90 px-[18px] py-4 shadow-[0_5px_0_rgba(120,140,90,0.2)] dark:border-neutral-700 dark:bg-neutral-900/90">
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-2 border-[#f7dcc0] bg-[#fdeede] text-xl dark:border-neutral-700 dark:bg-neutral-800">
        🎁
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold leading-snug text-[#4e4133] dark:text-white">
          たまった 🍀 でごほうび交換
        </p>
        <p className="mt-0.5 text-[11.5px] text-[#9a9781] dark:text-neutral-400">
          「今日は皿洗い代わって券」まであと 🍀{remaining}
        </p>
      </div>
    </div>
  )
}

function ChoreVillageRow({
  chore,
  todayLog,
  isSelf,
  who,
  isDark,
  onTap,
  onUndo,
  onLongPress,
}: {
  chore: Chore
  todayLog: ChoreLog | null
  isSelf: boolean | null
  who: string | null
  isDark: boolean
  onTap: (chore: Chore) => void
  onUndo: (log: ChoreLog) => void
  onLongPress: (chore: Chore) => void
}) {
  const press = useLongPress(
    () => {},
    () => onLongPress(chore),
  )
  const done = !!todayLog
  const doneColor = isSelf ? memberColor(true, isDark) : memberColor(false, isDark)

  return (
    <div
      onPointerDown={press.onPointerDown}
      onPointerMove={press.onPointerMove}
      onPointerUp={press.onPointerUp}
      onPointerLeave={press.onPointerLeave}
      className="flex items-center gap-3 rounded-[24px] border-4 border-white bg-[#fffdf5] px-3 py-3 shadow-[0_5px_0_rgba(120,140,90,0.22)] dark:border-neutral-700 dark:bg-neutral-900"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-white/90 text-xl dark:border-neutral-800"
        style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
      >
        {categoryEmoji(chore.category)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-[#4e4133] dark:text-white">
          {chore.name}
        </span>
        {done && todayLog ? (
          <span className="mt-0.5 block text-[11.5px] font-bold" style={{ color: doneColor }}>
            {who}がやってくれた ・ {formatTime(todayLog.doneAt)}
          </span>
        ) : (
          <span className="mt-0.5 block text-[11.5px] text-[#a8ad92] dark:text-neutral-500">
            めやす {chore.minutes}分 ・ 🍀{chore.minutes * 10}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (todayLog) onUndo(todayLog)
          else onTap(chore)
        }}
        className="shrink-0 rounded-full border-[3px] border-white px-4 py-2.5 text-[12.5px] font-bold text-[#6b4a17] shadow-[0_4px_0_rgba(180,130,40,0.45)] transition active:translate-y-[3px] active:shadow-[0_1px_0_rgba(180,130,40,0.45)] dark:border-neutral-800"
        style={{ background: 'linear-gradient(180deg,#ffd166,#f3b23f)' }}
      >
        {done ? 'とりけす' : 'やった！'}
      </button>
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
  const dots: { done: boolean; color?: string }[] = []
  for (const chore of favorites) {
    const log = latestTodayByChore.get(chore.id)
    if (!log) {
      dots.push({ done: false })
      continue
    }
    const isSelf = log.userId === user?.uid
    if (isSelf) meCount++
    else youCount++
    dots.push({ done: true, color: memberColor(isSelf, isDark) })
  }
  const total = favorites.length
  const remain = total - meCount - youCount
  // Reward points: sum over EVERY log recorded today (not just favorites),
  // so any chore worked on today contributes — this is a total-effort
  // reward metric, distinct from the favorites-only board tally above.
  const thanksToday = todayLogs.reduce((sum, log) => sum + log.minutes * 10, 0)
  const rewardRemaining = Math.max(0, REWARD_TARGET - thanksToday)

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

  function handleUndo(log: ChoreLog) {
    if (!household) return
    deleteLog(household.id, log.id)
  }

  function handleLongPress(chore: Chore) {
    setPickingTimeFor(chore)
  }

  return (
    <div
      className="min-h-full px-4 pb-28 pt-6 font-['Zen_Maru_Gothic']"
      style={{
        background: isDark
          ? 'linear-gradient(180deg,#10202a 0%,#142a20 34%,#16241a 100%)'
          : 'linear-gradient(180deg,#bfe4f0 0%,#dff0dc 34%,#cfe6b8 100%)',
      }}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div
          className="rounded-[20px] border-[3px] border-[#fffdf5] px-4 py-2.5 shadow-[0_4px_0_rgba(120,84,44,0.35)]"
          style={{ background: 'linear-gradient(180deg,#d9a86c,#c08d55)' }}
        >
          <p
            className="text-[15px] font-bold leading-tight text-[#fffdf5]"
            style={{ textShadow: '0 1px 0 rgba(120,84,44,0.4)' }}
          >
            ふたりのおうち
          </p>
          <p className="mt-0.5 text-[10.5px] font-medium leading-none text-[#fdf1dc]">
            {formatVillageDate(Date.now())}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border-[3px] border-[#f5e2b8] bg-[#fffdf5] px-3.5 py-2 shadow-[0_3px_0_rgba(160,120,60,0.25)] dark:border-neutral-700 dark:bg-neutral-900">
          <span className="text-sm">🍀</span>
          <span className="text-sm font-bold text-[#5d7a3a] dark:text-[#a3d17a]">
            {thanksToday.toLocaleString('ja-JP')}
          </span>
        </div>
      </div>

      <IemoriCard remain={remain} thanksToday={thanksToday} />

      <TodayBoardCard doneCount={meCount + youCount} total={total} dots={dots} />

      <p className="mb-1 mt-4 text-[11px] text-[#7a8a63] dark:text-neutral-500">
        🕐 長押しすると、さっき・今朝・昨日など過去の時刻でも記録できます
      </p>

      <div className="mt-2 flex flex-col gap-2.5">
        {favorites.map((chore) => {
          const log = latestTodayByChore.get(chore.id) ?? null
          const isSelf = log ? log.userId === user?.uid : null
          const who = log ? (isSelf ? selfName : partnerName) : null
          return (
            <ChoreVillageRow
              key={chore.id}
              chore={chore}
              todayLog={log}
              isSelf={isSelf}
              who={who}
              isDark={isDark}
              onTap={handleTap}
              onUndo={handleUndo}
              onLongPress={handleLongPress}
            />
          )
        })}
      </div>

      {favorites.length === 0 && (
        <div className="mt-4 rounded-[26px] border-4 border-white bg-[#fffdf5]/80 p-8 text-center shadow-[0_5px_0_rgba(120,140,90,0.2)] dark:border-neutral-700 dark:bg-neutral-900/70">
          <p className="text-3xl">⭐️</p>
          <p className="mt-2 text-sm text-[#6b5a49] dark:text-neutral-400">
            お気に入りの家事がまだありません。
            <br />
            設定から追加すると、ここにボードが並びます。
          </p>
        </div>
      )}

      <RewardTeaserCard remaining={rewardRemaining} />

      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="mt-4 w-full rounded-[22px] border-[3px] border-dashed border-[#b4825a80] bg-[#fffdf580] py-3.5 text-sm font-bold text-[#a67a56] active:bg-white dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400"
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
