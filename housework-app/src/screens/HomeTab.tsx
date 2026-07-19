import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { useChores } from '../hooks/useChores'
import { addLog, deleteLog } from '../lib/logService'
import type { Chore } from '../types'

function ChoreButton({ chore, onTap }: { chore: Chore; onTap: (chore: Chore) => void }) {
  return (
    <button
      type="button"
      onClick={() => onTap(chore)}
      className="flex flex-col items-start gap-1 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-neutral-200 active:scale-[0.97] active:bg-blue-50 dark:bg-neutral-900 dark:ring-neutral-800 dark:active:bg-neutral-800"
    >
      <span className="text-base font-semibold text-neutral-900 dark:text-white">
        {chore.name}
      </span>
      <span className="text-xs text-neutral-400">{chore.minutes}分</span>
    </button>
  )
}

function AllChoresSheet({
  chores,
  onSelect,
  onClose,
}: {
  chores: Chore[]
  onSelect: (chore: Chore) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[75vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">すべての家事</h3>
          <button type="button" onClick={onClose} className="text-neutral-400">
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
              className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-left active:bg-blue-50 dark:bg-neutral-800 dark:active:bg-neutral-700"
            >
              <span className="font-medium text-neutral-900 dark:text-white">{chore.name}</span>
              <span className="text-xs text-neutral-400">{chore.minutes}分</span>
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
    <div className="min-h-full bg-neutral-50 px-4 pb-28 pt-6 dark:bg-neutral-950">
      <h1 className="mb-1 text-xl font-bold text-neutral-900 dark:text-white">
        {myNickname ? `こんにちは、${myNickname}さん` : 'ホーム'}
      </h1>
      <p className="mb-5 text-sm text-neutral-400">やった家事をタップして記録しよう</p>

      <div className="grid grid-cols-2 gap-3">
        {favorites.map((chore) => (
          <ChoreButton key={chore.id} chore={chore} onTap={handleTap} />
        ))}
      </div>

      {favorites.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-400">
          お気に入りの家事がありません。設定から追加してください。
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="mt-5 w-full rounded-2xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 active:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:active:bg-neutral-900"
      >
        その他の家事から選ぶ
      </button>

      {showAll && (
        <AllChoresSheet chores={chores} onSelect={handleTap} onClose={() => setShowAll(false)} />
      )}
    </div>
  )
}
