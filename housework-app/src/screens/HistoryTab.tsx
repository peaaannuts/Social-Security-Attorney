import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useAllLogs, useRecentLogs } from '../hooks/useLogs'
import { deleteLog, updateLog } from '../lib/logService'
import { buildLogsCsv, downloadCsv } from '../lib/csvExport'
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
  onSave: (patch: { doneAt: number; minutes: number }) => void
  onDelete: () => void
}) {
  const [value, setValue] = useState(toLocalInputValue(log.doneAt))
  const [minutes, setMinutes] = useState(String(log.minutes))

  const minutesNum = Number(minutes)
  const minutesValid = minutes.trim() !== '' && Number.isFinite(minutesNum) && minutesNum > 0

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
        <label className="mb-4 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          かかった時間（分）
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!minutesValid}
            onClick={() => {
              const ms = new Date(value).getTime()
              if (!Number.isNaN(ms) && minutesValid) onSave({ doneAt: ms, minutes: minutesNum })
              onClose()
            }}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50 active:bg-blue-700"
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
  const { logs: allLogs } = useAllLogs(household?.id ?? null)
  const [editing, setEditing] = useState<ChoreLog | null>(null)

  if (!household || !user) return null

  const partnerNickname = partnerUid ? household.nicknames?.[partnerUid] : 'パートナー'

  function handleExportCsv() {
    if (!household) return
    const csv = buildLogsCsv(allLogs, household.nicknames ?? {})
    const today = new Date().toISOString().slice(0, 10)
    // Filename stays ASCII (content is Japanese) — Chromium silently drops a
    // blob: download's filename+extension entirely when it contains
    // non-ASCII characters, falling back to a bare "download" with no
    // extension.
    downloadCsv(`housework-log_${today}.csv`, csv)
  }

  return (
    <div className="min-h-full bg-neutral-50 px-4 pb-28 pt-6 dark:bg-neutral-950">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">履歴</h1>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={allLogs.length === 0}
          className="text-sm font-semibold text-blue-600 disabled:opacity-40 dark:text-blue-400"
        >
          CSVで書き出す
        </button>
      </div>

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
                    {who} ・ {formatDateTime(log.doneAt)} ・ {log.minutes}分
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
          onSave={(patch) =>
            updateLog(household.id, editing.id, { ...patch, loadFactor: editing.loadFactor })
          }
          onDelete={() => deleteLog(household.id, editing.id)}
        />
      )}
    </div>
  )
}
