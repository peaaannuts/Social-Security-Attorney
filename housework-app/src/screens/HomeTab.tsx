import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { useChores } from '../hooks/useChores'
import { categoryChipColor, categoryEmoji } from '../lib/categoryStyle'
import { addLog, deleteLog } from '../lib/logService'
import { useIsDark } from '../lib/theme'
import type { Chore } from '../types'

function ChoreButton({
  chore,
  isDark,
  onTap,
}: {
  chore: Chore
  isDark: boolean
  onTap: (chore: Chore) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onTap(chore)}
      className="flex flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition active:scale-[0.97] dark:bg-neutral-900 dark:ring-white/10"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl"
        style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
      >
        {categoryEmoji(chore.category)}
      </span>
      <span className="w-full break-words text-[15px] font-semibold leading-snug text-neutral-900 dark:text-white">
        {chore.name}
      </span>
      <span className="text-xs text-neutral-400">{chore.minutes}分</span>
    </button>
  )
}

function AllChoresSheet({
  chores,
  isDark,
  onSelect,
  onClose,
}: {
  chores: Chore[]
  isDark: boolean
  onSelect: (chore: Chore) => void
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
            <button
              key={chore.id}
              type="button"
              onClick={() => {
                onSelect(chore)
                onClose()
              }}
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
  const { household, myNickname } = useHousehold()
  const { chores } = useChores(household?.id ?? null)
  const { show } = useToast()
  const isDark = useIsDark()
  const [showAll, setShowAll] = useState(false)

  const favorites = chores.filter((c) => c.isFavorite)

  function handleTap(chore: Chore) {
    if (!household || !user) return
    const logId = addLog(household.id, chore, user.uid)
    show(`「${chore.name}」を記録しました`, () => {
      deleteLog(household.id, logId)
    })
  }

  return (
    <div className="min-h-full px-4 pb-28 pt-6">
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 p-5 text-white shadow-md shadow-blue-500/20">
        <p className="text-sm text-white/80">こんにちは 👋</p>
        <h1 className="mt-0.5 text-2xl font-bold">
          {myNickname ? `${myNickname}さん` : 'ホーム'}
        </h1>
        <p className="mt-2 text-sm text-white/85">やった家事をタップして記録しよう</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {favorites.map((chore) => (
          <ChoreButton key={chore.id} chore={chore} isDark={isDark} onTap={handleTap} />
        ))}
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
        className="mt-5 w-full rounded-2xl border border-dashed border-neutral-300 bg-white/50 py-3.5 text-sm font-medium text-neutral-500 active:bg-white dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400"
      >
        ＋ その他の家事から選ぶ
      </button>

      {showAll && (
        <AllChoresSheet
          chores={chores}
          isDark={isDark}
          onSelect={handleTap}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  )
}
