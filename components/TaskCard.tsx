'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Square, CheckCircle2, Circle, Clock, Pencil, Trash2, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, UserId } from '@/types'
import { minutesToDisplay, secondsToDisplay, getElapsedSeconds } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Props {
  task: Task
  currentUser: UserId | null
  isReadOnly: boolean
  isSleeping: boolean
  onUpdate: (updated: Task) => void
  onDelete: () => void
  onEdit: () => void
  onStartTimer: () => void
}

export default function TaskCard({ task, currentUser, isReadOnly, isSleeping, onUpdate, onDelete, onEdit, onStartTimer }: Props) {
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

  async function markDone() {
    if (!canInteract) return
    const wasComplete = task.is_complete
    const extraSeconds = isRunning && !wasComplete ? getElapsedSeconds(task.timer_started_at) : 0
    const updated: Task = {
      ...task,
      is_complete: !wasComplete,
      timer_started_at: null,
      actual_seconds: task.actual_seconds + extraSeconds,
    }
    onUpdate(updated)
    await supabase.from('tasks').update({
      is_complete: updated.is_complete,
      timer_started_at: null,
      actual_seconds: updated.actual_seconds,
    }).eq('id', task.id)
  }

  const cardClass = task.is_complete
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
    <div ref={setNodeRef} style={dragStyle} className={`rounded-xl border p-4 transition-all duration-150 ${cardClass}`}>
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

        {/* Circle / action menu */}
        <div className="relative mt-0.5 flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => {
              if (!canInteract) return
              if (task.is_complete) {
                markDone()
              } else {
                setShowMenu(v => !v)
              }
            }}
            disabled={!canInteract}
            className={`transition-colors ${canInteract ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {task.is_complete
              ? <CheckCircle2 size={18} className="text-emerald-500 hover:text-emerald-400" />
              : <Circle size={18} className={isSleeping
                  ? `text-slate-600 ${canInteract ? 'hover:text-slate-400' : ''}`
                  : `text-stone-300 ${canInteract ? 'hover:text-stone-500' : ''}`}
                />
            }
          </button>

          {showMenu && canInteract && (
            <div className={`absolute left-0 top-6 z-20 w-44 rounded-xl shadow-xl border py-1 overflow-hidden ${isSleeping ? 'bg-slate-800 border-slate-700' : 'bg-white border-stone-100'}`}>
              <button
                onClick={() => { markDone(); setShowMenu(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700 active:bg-slate-600' : 'text-stone-700 hover:bg-stone-100 active:bg-stone-200'}`}
              >
                <CheckCircle2 size={14} className="text-emerald-500" />
                Mark as done
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
          </div>
        </div>

        {/* Timer button */}
        {canInteract && !task.is_complete && (
          <button
            onClick={() => isRunning ? stopTimer() : onStartTimer()}
            className={`flex-shrink-0 rounded-lg p-1.5 transition-colors ${
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
      </div>
    </div>
  )
}
