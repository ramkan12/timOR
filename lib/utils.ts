import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export const GOAL_MINUTES = 420 // 7 hours

export function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function secondsToDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function getElapsedSeconds(timerStartedAt: string | null): number {
  if (!timerStartedAt) return 0
  return Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000)
}

export function getActualMinutes(task: { actual_minutes: number; timer_started_at: string | null }, now: number): number {
  const elapsed = task.timer_started_at
    ? Math.floor((now - new Date(task.timer_started_at).getTime()) / 60000)
    : 0
  return task.actual_minutes + elapsed
}

export function formatSleepTimestamp(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
