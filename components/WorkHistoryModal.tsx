'use client'

import { useEffect, useState } from 'react'
import { History, X } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Task, WorkSession } from '@/types'
import { endOfDayMs, minutesToDisplay } from '@/lib/utils'
import { MIN_SESSION_SECONDS } from '@/lib/workSessions'

interface Props {
  task: Task
  isSleeping: boolean
  onClose: () => void
}

interface Row {
  start: number
  end: number
  seconds: number
  running: boolean
  markedDone: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
// Timeline ticks, in hours after the 6 AM day start
const TICKS = [{ h: 3, label: '9a' }, { h: 6, label: '12p' }, { h: 9, label: '3p' }, { h: 12, label: '6p' }, { h: 15, label: '9p' }, { h: 18, label: '12a' }]

const durationLabel = (seconds: number) => minutesToDisplay(Math.max(1, Math.round(seconds / 60)))

// Shows each timed session for one task: a 6 AM → 6 AM day timeline plus a list.
// Read-only; sessions are recorded by logWorkSession whenever a timer stops.
export default function WorkHistoryModal({ task, isSleeping, onClose }: Props) {
  const [sessions, setSessions] = useState<WorkSession[] | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    supabase.from('work_sessions').select('*').eq('task_id', task.id).order('started_at', { ascending: true })
      .then(({ data }) => setSessions((data as WorkSession[] | null) ?? []))
  }, [task.id])

  useEffect(() => {
    if (!task.timer_started_at) return
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [task.timer_started_at])

  const rows: Row[] = (sessions ?? []).map(s => ({
    start: new Date(s.started_at).getTime(),
    end: new Date(s.ended_at).getTime(),
    seconds: s.seconds,
    running: false,
    markedDone: s.kind === 'marked_done',
  }))
  if (task.timer_started_at) {
    const start = new Date(task.timer_started_at).getTime()
    const seconds = Math.floor((now - start) / 1000)
    if (seconds >= MIN_SESSION_SECONDS) rows.push({ start, end: now, seconds, running: true, markedDone: false })
  }
  const totalSeconds = rows.reduce((sum, r) => sum + r.seconds, 0)

  const dayEnd = endOfDayMs(task.date)
  const dayStart = dayEnd - DAY_MS
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - dayStart) / DAY_MS) * 100))

  const isRiham = task.user_id === 'riham'
  const blockColor = isRiham ? 'bg-rose-400' : 'bg-sky-500'
  const panel = isSleeping ? 'bg-slate-900 text-slate-100' : 'bg-white text-stone-800'
  const muted = isSleeping ? 'text-slate-400' : 'text-stone-500'
  const faint = isSleeping ? 'text-slate-500' : 'text-stone-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-2xl ${panel}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b ${isSleeping ? 'border-slate-700' : 'border-stone-100'}`}>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-semibold">
              <History size={16} className={faint} />
              Work History
            </h2>
            <p className={`mt-0.5 truncate text-sm ${muted}`}>{task.title}</p>
          </div>
          <button onClick={onClose} className={`${faint} hover:opacity-70 transition-opacity`}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {sessions === null ? (
            <p className={`text-sm ${muted}`}>Loading…</p>
          ) : rows.length === 0 ? (
            <div className="py-4 text-center">
              <p className={`text-sm ${muted}`}>No work sessions yet.</p>
              <p className={`mt-1 text-xs ${faint}`}>Timer runs under a minute aren&apos;t counted. History starts from when this feature was added.</p>
            </div>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-semibold">Total: {durationLabel(totalSeconds)}</span>
                <span className={muted}> across {rows.length} session{rows.length === 1 ? '' : 's'}</span>
              </p>

              {/* Day timeline, 6 AM → 6 AM */}
              <div>
                <div className={`relative h-4 rounded-full overflow-hidden ${isSleeping ? 'bg-slate-700' : 'bg-stone-100'}`}>
                  {TICKS.map(t => (
                    <span key={t.h} className={`absolute inset-y-0 w-px ${isSleeping ? 'bg-slate-600' : 'bg-stone-200'}`} style={{ left: `${(t.h / 24) * 100}%` }} />
                  ))}
                  {rows.map((r, i) => (
                    <span
                      key={i}
                      title={`${format(r.start, 'h:mm a')} – ${r.running ? 'now' : format(r.end, 'h:mm a')}`}
                      className={`absolute inset-y-0 rounded-sm ${blockColor} ${r.running ? 'animate-pulse' : ''} ${r.markedDone ? 'opacity-45' : ''}`}
                      style={{
                        left: `${pct(r.start)}%`,
                        width: `max(3px, ${pct(r.end) - pct(r.start)}%)`,
                        // Untimed (marked done) entries are striped so they read as an estimate
                        ...(r.markedDone ? { backgroundImage: 'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.6) 0 3px, transparent 3px 6px)' } : {}),
                      }}
                    />
                  ))}
                </div>
                <div className={`relative mt-1 h-3 text-[10px] ${faint}`}>
                  <span className="absolute left-0">6a</span>
                  {TICKS.map(t => (
                    <span key={t.h} className="absolute -translate-x-1/2" style={{ left: `${(t.h / 24) * 100}%` }}>{t.label}</span>
                  ))}
                </div>
              </div>

              {/* Session list */}
              <ul className={`divide-y ${isSleeping ? 'divide-slate-700' : 'divide-stone-100'}`}>
                {rows.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${blockColor} ${r.markedDone ? 'opacity-45' : ''}`} />
                      {format(r.start, 'h:mm a')} – {r.running ? 'now' : format(r.end, 'h:mm a')}
                    </span>
                    <span className={`tabular-nums ${muted}`}>
                      {durationLabel(r.seconds)}{r.running ? ' · running' : r.markedDone ? ' · marked done' : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <p className={`text-xs ${faint}`}>
                Timer runs under a minute aren&apos;t counted.
                {rows.some(r => r.markedDone) && ' Striped = marked done without a timer (its estimate, ending when it was marked done).'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
