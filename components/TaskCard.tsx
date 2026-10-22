'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Square, CheckCircle2, Clock, Pencil, Copy, Trash2, GripVertical, CalendarClock } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CardStyle, Task, UserId } from '@/types'
import { minutesToDisplay, secondsToDisplay, getElapsedSeconds, formatDateLabel, completedCreditSeconds } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getCardLook } from '@/lib/cardStyles'
import ProgressBar from './ProgressBar'

interface Props {
  task: Task
  currentUser: UserId | null
  isReadOnly: boolean
  isSleeping: boolean
  onUpdate: (updated: Task) => void
  onDelete: () => void
  onEdit: () => void
  onStartTimer: () => void
  onMarkDone: () => void
  onStopStale: () => void
  onCopyTask: () => void
  cardStyle?: CardStyle
}

export default function TaskCard({ task, currentUser, isReadOnly, isSleeping, onUpdate, onDelete, onEdit, onStartTimer, onMarkDone, onStopStale, onCopyTask, cardStyle }: Props) {
  const isOwner = currentUser === task.user_id
  const canInteract = isOwner && !isReadOnly

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [elapsedSeconds, setElapsedSeconds] = useState(() => getElapsedSeconds(task.timer_started_at))
  const [showMenu, setShowMenu] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setElapsedSeconds(getElapsedSeconds(task.timer_started_at))
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (task.timer_started_at) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(getElapsedSeconds(task.timer_started_at))
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [task.timer_started_at])

  useEffect(() => {
    if (!showMenu) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showMenu])

  const totalActualSeconds = task.actual_seconds + elapsedSeconds
  const isRunning = !!task.timer_started_at
  const isRiham = task.user_id === 'riham'
  const barActualSeconds = task.is_complete
    ? completedCreditSeconds(task)
    : totalActualSeconds

  async function stopTimer() {
    const elapsed = getElapsedSeconds(task.timer_started_at)
    const updated: Task = {
      ...task,
      actual_seconds: task.actual_seconds + elapsed,
      timer_started_at: null,
    }
    onUpdate(updated)
    await supabase.from('tasks').update({
      actual_seconds: updated.actual_seconds,
      timer_started_at: null,
    }).eq('id', task.id)
  }

  function markDone() {
    if (!canInteract) return
    onMarkDone()
  }

  const look = getCardLook(cardStyle, isSleeping)

  // Styled cards supply their own background/border; only the state effects are added here.
  const styledStateClass = task.is_complete
    ? isSleeping
      ? 'opacity-50 hover:opacity-70 cursor-pointer'
      : 'opacity-60 hover:opacity-90 hover:shadow-sm cursor-pointer'
    : isRunning
    ? `shadow-md ring-1 ${isRiham ? (isSleeping ? 'ring-rose-400' : 'ring-rose-300') : (isSleeping ? 'ring-sky-400' : 'ring-sky-300')}`
    : 'shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'

  const cardClass = look
    ? `${look.className} ${styledStateClass}`
    : task.is_complete
    ? isSleeping
      ? 'border-slate-700 bg-slate-800/40 opacity-50 hover:opacity-70 cursor-pointer'
      : 'border-stone-200 bg-stone-50 opacity-60 hover:opacity-90 hover:bg-white hover:shadow-sm cursor-pointer'
    : isRunning
    ? isSleeping
      ? `border-slate-600 bg-slate-800 shadow-md ring-1 ${isRiham ? 'ring-rose-400' : 'ring-sky-400'}`
      : `border-stone-200 bg-white shadow-md ring-1 ${isRiham ? 'ring-rose-300' : 'ring-sky-300'}`
    : isSleeping
      ? 'border-slate-700 bg-slate-800/80 shadow-sm hover:bg-slate-700/80 hover:border-slate-600 hover:-translate-y-0.5 cursor-pointer'
      : 'border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-400 hover:bg-stone-50 hover:-translate-y-0.5 cursor-pointer'

  return (
    <div ref={setNodeRef} style={{ ...look?.style, ...dragStyle, ...(showMenu ? { zIndex: 50, position: 'relative' } : {}) }} className={`rounded-xl border p-4 transition-all duration-150 ${cardClass}`}>
      <div className="flex items-start gap-3">
        {/* Drag handle — only for owner on current date */}
        {canInteract && (
          <button
            {...listeners}
            {...attributes}
            className={`flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none ${isSleeping ? 'text-slate-600 hover:text-slate-400' : 'text-stone-300 hover:text-stone-400'}`}
            tabIndex={-1}
          >
            <GripVertical size={14} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-snug ${
            task.is_complete
              ? isSleeping ? 'line-through text-slate-500' : 'line-through text-stone-400'
              : isSleeping ? 'text-slate-100' : 'text-stone-800'
          }`}>
            {task.title}
          </p>
          {task.description && (
            <p className={`mt-0.5 text-xs leading-relaxed ${isSleeping ? 'text-slate-400' : 'text-stone-500'}`}>{task.description}</p>
          )}
          {task.tab_id !== null && (
            <div className="mt-2">
              <ProgressBar
                estimatedMinutes={task.estimated_minutes}
                actualSeconds={barActualSeconds}
                isSleeping={isSleeping}
                isRiham={isRiham}
                goalMinutes={task.estimated_minutes}
                compact
              />
            </div>
          )}
          <div className={`mt-2 flex items-center gap-3 text-xs ${isSleeping ? 'text-slate-500' : 'text-stone-400'}`}>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {minutesToDisplay(task.estimated_minutes)}
            </span>
            {totalActualSeconds > 0 && (
              <span className={`font-medium ${isRunning ? (isRiham ? 'text-rose-400' : 'text-sky-400') : isSleeping ? 'text-slate-400' : 'text-stone-500'}`}>
                {isRunning
                  ? `${secondsToDisplay(totalActualSeconds)} running`
                  : `${secondsToDisplay(totalActualSeconds)} tracked`}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1">
                <CalendarClock size={11} />
                Due {formatDateLabel(task.due_date)}
              </span>
            )}
          </div>
        </div>

        {/* Emergency stop for a timer that ran past midnight into a read-only day */}
        {isOwner && isReadOnly && isRunning && (
          <button
            onClick={onStopStale}
            className="flex-shrink-0 rounded-lg p-1.5 bg-red-100 text-red-500 hover:bg-red-200 active:bg-red-300 transition-colors"
            title="Stop stale timer"
          >
            <Square size={14} />
          </button>
        )}

        {/* Right column: timer on top, action icon below */}
        {isOwner && (
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {/* Timer button */}
            {canInteract && !task.is_complete && (
              <button
                onClick={() => isRunning ? stopTimer() : onStartTimer()}
                className={`rounded-lg p-1.5 transition-colors ${
                  isRunning
                    ? isRiham
                      ? isSleeping ? 'bg-rose-900/60 text-rose-400 hover:bg-rose-900 active:bg-rose-800' : 'bg-rose-100 text-rose-600 hover:bg-rose-200 active:bg-rose-300'
                      : isSleeping ? 'bg-sky-900/60 text-sky-400 hover:bg-sky-900 active:bg-sky-800' : 'bg-sky-100 text-sky-600 hover:bg-sky-200 active:bg-sky-300'
                    : isSleeping
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-slate-500'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200 active:bg-stone-300'
                }`}
                title={isRunning ? 'Stop timer' : 'Start timer'}
              >
                {isRunning ? <Square size={14} /> : <Play size={14} />}
              </button>
            )}

            {canInteract ? (
              /* Action icon / menu */
              <div className="relative mt-2.5" ref={menuRef}>
                <button
                  onClick={() => {
                    if (task.is_complete) {
                      markDone()
                    } else {
                      setShowMenu(v => !v)
                    }
                  }}
                  className="transition-colors"
                >
                  {task.is_complete
                    ? <CheckCircle2 size={16} className="text-emerald-500 hover:text-emerald-400" />
                    : <Pencil size={13} className={isSleeping ? 'text-slate-600 hover:text-slate-400' : 'text-stone-300 hover:text-stone-500'} />
                  }
                </button>

                {showMenu && (
                  <div className={`absolute right-0 top-full mt-1 z-50 w-44 rounded-xl shadow-xl border py-1 overflow-hidden ${isSleeping ? 'bg-slate-800 border-slate-700' : 'bg-white border-stone-100'}`}>
                    <button
                      onClick={() => { markDone(); setShowMenu(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700 active:bg-slate-600' : 'text-stone-700 hover:bg-stone-100 active:bg-stone-200'}`}
                    >
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      Mark as done
                    </button>
                    <button
                      onClick={() => { onCopyTask(); setShowMenu(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700 active:bg-slate-600' : 'text-stone-700 hover:bg-stone-100 active:bg-stone-200'}`}
                    >
                      <Copy size={14} className={isSleeping ? 'text-slate-500' : 'text-stone-400'} />
                      Copy to day…
                    </button>
                    <button
                      onClick={() => { onEdit(); setShowMenu(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700 active:bg-slate-600' : 'text-stone-700 hover:bg-stone-100 active:bg-stone-200'}`}
                    >
                      <Pencil size={14} className={isSleeping ? 'text-slate-500' : 'text-stone-400'} />
                      Edit task
                    </button>
                    <div className={`my-1 border-t ${isSleeping ? 'border-slate-700' : 'border-stone-100'}`} />
                    <button
                      onClick={() => { onDelete(); setShowMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-950/50 active:bg-red-950 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete task
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Read-only day: only action available is copying this task elsewhere */
              <button
                onClick={onCopyTask}
                title="Copy to another day"
                className={`rounded-lg p-1.5 transition-colors ${isSleeping ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
              >
                <Copy size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
