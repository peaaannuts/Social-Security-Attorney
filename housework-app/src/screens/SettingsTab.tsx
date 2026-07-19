import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useChores } from '../hooks/useChores'
import { addChore, deleteChore, updateChore } from '../lib/choreService'
import { AccountCard } from './settings/AccountCard'
import { ChoreEditForm, type ChoreFormValues } from './settings/ChoreEditForm'
import { HouseholdCard } from './settings/HouseholdCard'
import type { Chore } from '../types'

export function SettingsTab() {
  const { user } = useAuth()
  const { household } = useHousehold()
  const { chores } = useChores(household?.id ?? null)
  const [editingChore, setEditingChore] = useState<Chore | 'new' | null>(null)

  if (!household || !user) return null

  function handleSave(values: ChoreFormValues) {
    if (!household) return
    if (editingChore === 'new') {
      addChore(household.id, { ...values, order: chores.length })
    } else if (editingChore) {
      updateChore(household.id, editingChore.id, values)
    }
  }

  return (
    <div className="min-h-full bg-neutral-50 px-4 pb-28 pt-6 dark:bg-neutral-950">
      <h1 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">設定</h1>

      <HouseholdCard household={household} myUid={user.uid} />
      <AccountCard user={user} />

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            家事マスタ
          </h3>
          <button
            type="button"
            onClick={() => setEditingChore('new')}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400"
          >
            + 追加
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {chores.map((chore) => (
            <button
              key={chore.id}
              type="button"
              onClick={() => setEditingChore(chore)}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-left active:bg-neutral-50 dark:active:bg-neutral-800"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {chore.isFavorite ? '★ ' : ''}
                  {chore.name}
                </p>
                <p className="text-xs text-neutral-400">
                  {chore.category} ・ {chore.minutes}分 ・ 負荷{chore.loadFactor}
                </p>
              </div>
              <span className="text-neutral-300">›</span>
            </button>
          ))}
          {chores.length === 0 && (
            <p className="py-4 text-center text-sm text-neutral-400">家事が登録されていません</p>
          )}
        </div>
      </div>

      {editingChore && (
        <ChoreEditForm
          initial={editingChore === 'new' ? undefined : editingChore}
          onSave={handleSave}
          onDelete={
            editingChore !== 'new'
              ? () => deleteChore(household.id, (editingChore as Chore).id)
              : undefined
          }
          onClose={() => setEditingChore(null)}
        />
      )}
    </div>
  )
}
