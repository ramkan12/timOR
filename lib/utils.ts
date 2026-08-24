import { formatDistanceToNow, format } from 'date-fns'
import { Tab, Task } from '@/types'

export const GOAL_MINUTES = 420 // 7 hours

// A tab is relevant for a given date if that date falls within its lifespan —
// from creation through its end date (inclusive), or indefinitely if never ended.
export function isTabActiveOnDate(tab: Tab, dateStr: string): boolean {
  const createdDate = tab.created_at.slice(0, 10)
  const endDate = tab.ended_at ? tab.ended_at.slice(0, 10) : null
  return dateStr >= createdDate && (endDate === null || dateStr <= endDate)
}

// A task with a due date persists across every day from its creation through
// that due date (inclusive) — the same row, same tracked progress. A task
// without a due date only appears on the single day it was created for.
export function isTaskVisibleOnDate(task: Pick<Task, 'date' | 'due_date'>, dateStr: string): boolean {
  if (task.due_date) return task.date <= dateStr && dateStr <= task.due_date
  return task.date === dateStr
}

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

export function endOfDayMs(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  d.setHours(6, 0, 0, 0)
  return d.getTime()
}


export function formatSleepTimestamp(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

export function todayString(): string {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return format(now, 'yyyy-MM-dd')
}

export function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function getWeekDays(mondayStr: string): string[] {
  const days: string[] = []
  const d = new Date(mondayStr + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function formatDateLabel(dateStr: string): string {
  const today = todayString()
  const d = new Date(today + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const yesterday = format(d, 'yyyy-MM-dd')
  const t = new Date(today + 'T00:00:00')
  t.setDate(t.getDate() + 1)
  const tomorrow = format(t, 'yyyy-MM-dd')
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  if (dateStr === tomorrow) return 'Tomorrow'
  return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy')
}
