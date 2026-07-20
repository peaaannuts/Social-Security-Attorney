export type Period = 'week' | 'month'

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

/** Monday-start week range containing `date`. */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = startOfDay(date)
  const day = start.getDay() // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7
  start.setDate(start.getDate() - diffToMonday)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { start, end }
}

export function getPeriodRange(period: Period, date: Date = new Date()) {
  return period === 'week' ? getWeekRange(date) : getMonthRange(date)
}

/** Last `count` Monday-start week ranges, oldest first, including the current week. */
export function getRecentWeeks(count: number, date: Date = new Date()) {
  const weeks: { start: Date; end: Date }[] = []
  const { start: currentStart } = getWeekRange(date)
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(currentStart)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    weeks.push({ start, end })
  }
  return weeks
}

export function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday}) ${hh}:${mm}`
}

export function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Local-day key like "2026-07-20", for grouping logs by calendar day. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Header label for a day: 今日 / 昨日 / M/D(曜). */
export function formatDayHeading(ms: number): string {
  const d = startOfDay(new Date(ms))
  const today = startOfDay(new Date())
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`
}
