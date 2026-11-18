import { supabase } from '@/lib/supabase'
import { Task } from '@/types'

// Timer runs shorter than this are treated as accidental taps and not recorded.
export const MIN_SESSION_SECONDS = 60

// Record one finished timer run for Work History. Call this wherever a running timer is
// stopped, with the same end time used for actual_seconds. Always awaited (lazy query gotcha).
export async function logWorkSession(task: Pick<Task, 'id' | 'user_id' | 'timer_started_at'>, endedAtMs: number = Date.now()) {
  if (!task.timer_started_at) return
  const startedAtMs = new Date(task.timer_started_at).getTime()
  const seconds = Math.floor((endedAtMs - startedAtMs) / 1000)
  if (seconds < MIN_SESSION_SECONDS) return
  await supabase.from('work_sessions').insert({
    task_id: task.id,
    user_id: task.user_id,
    started_at: new Date(startedAtMs).toISOString(),
    ended_at: new Date(endedAtMs).toISOString(),
    seconds,
  })
}

// Marked done with no tracked time: progress credits the full estimate (completedCreditSeconds),
// so Work History shows that estimate as a block ending at the moment it was marked done.
export async function logMarkedDone(task: Pick<Task, 'id' | 'user_id' | 'estimated_minutes'>, markedAtMs: number = Date.now()) {
  const seconds = task.estimated_minutes * 60
  if (seconds <= 0) return
  await supabase.from('work_sessions').insert({
    task_id: task.id,
    user_id: task.user_id,
    started_at: new Date(markedAtMs - seconds * 1000).toISOString(),
    ended_at: new Date(markedAtMs).toISOString(),
    seconds,
    kind: 'marked_done',
  })
}

// Un-marking a task drops its marked-done entry (credit goes back to the real tracked time).
export async function clearMarkedDone(taskId: string) {
  await supabase.from('work_sessions').delete().eq('task_id', taskId).eq('kind', 'marked_done')
}
