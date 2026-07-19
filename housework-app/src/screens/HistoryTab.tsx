import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useRecentLogs } from '../hooks/useLogs'
import { deleteLog, updateLogTime } from '../lib/logService'
import { formatDateTime } from '../lib/date'
import { memberColor } from '../lib/chartColors'
import { useIsDark } from '../lib/theme'
import type { ChoreLog } from '../types'

function toLocalInputValue(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EditSheet({
  log,
  onClose,
  onSave,
  onDelete,
}: {
  log: ChoreLog
  onClose: () => void
  onSave: (doneAt: number) => void
  onDelete: () => void
}) {
  const [value, setValue] = useState(toLocalInputValue(log.doneAt))

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white p-5 pb-8 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
          {log.choreName}
        </h3>
        <label className="mb-4 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          記録日時
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const ms = new Date(value).getTime()
              if (!Number.isNaN(ms)) onSave(ms)
              onClose()
            }}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white active:bg-blue-700"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="flex-1 rounded-xl bg-red-50 py-3 font-semibold text-red-600 active:bg-red-100 dark:bg-red-950 dark:text-red-400"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}

export function HistoryTab() {
  const { user } = useAuth()
  const { household, myNickname, partnerUid } = useHousehold()
  const isDark = useIsDark()
  const { logs, loading } = useRecentLogs(household?.id ?? null)
  const [editing, setEditing] = useState<ChoreLog | null>(null)

  if (!household || !user) return null

  const partnerNickname = partnerUid ? household.nicknames?.[partnerUid] : 'パートナー'

  return (
    <div className="min-h-full bg-neutral-50 px-4 pb-28 pt-6 dark:bg-neutral-950">
      <h1 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">履歴</h1>

      {loading && <p className="text-sm text-neutral-400">読み込み中...</p>}
      {!loading && logs.length === 0 && (
        <p className="text-sm text-neutral-400">まだ記録がありません</p>
      )}

      <div className="flex flex-col gap-2">
        {logs.map((log) => {
          const isSelf = log.userId === user.uid
          const who = isSelf ? myNickname || 'あなた' : partnerNickname || 'パートナー'
          return (
            <button
              key={log.id}
              type="button"
              onClick={() => setEditing(log)}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-neutral-200 active:bg-neutral-50 dark:bg-neutral-900 dark:ring-neutral-800 dark:active:bg-neutral-800"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: memberColor(isSelf, isDark) }}
                />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{log.choreName}</p>
                  <p className="text-xs text-neutral-400">
                    {who} ・ {formatDateTime(log.doneAt)}
                  </p>
                </div>
              </div>
              <span className="text-neutral-300">⋯</span>
            </button>
          )
        })}
      </div>

      {editing && (
        <EditSheet
          log={editing}
          onClose={() => setEditing(null)}
          onSave={(doneAt) => updateLogTime(household.id, editing.id, doneAt)}
          onDelete={() => deleteLog(household.id, editing.id)}
        />
      )}
    </div>
  )
}
