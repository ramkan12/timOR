'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Square, CheckCircle2, Circle, Clock, Pencil, Trash2 } from 'lucide-react'
import { Task, UserId } from '@/types'
import { minutesToDisplay, secondsToDisplay, getElapsedSeconds } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Props {
  task: Task
  currentUser: UserId | null
  isReadOnly: boolean
  onUpdate: (updated: Task) => void
  onDelete: () => void
  onEdit: () => void
  onStartTimer: () => void  // parent stops other timers first, then starts this one
}

export default function TaskCard({ task, currentUser, isReadOnly, onUpdate, onDelete, onEdit, onStartTimer }: Props) {
  const isOwner = currentUser === task.user_id
  const canInteract = isOwner && !isReadOnly

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

  return (
    <div className={`rounded-xl border p-4 transition-all duration-150 ${
      task.is_complete
        ? 'border-stone-200 bg-stone-50 opacity-60 hover:opacity-90 hover:bg-white hover:shadow-sm cursor-pointer'
        : isRunning
        ? `border-stone-200 bg-white shadow-md ring-1 ${isRiham ? 'ring-rose-300' : 'ring-sky-300'}`
        : 'border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-400 hover:bg-stone-50 hover:-translate-y-0.5 cursor-pointer'
    }`}>
      <div className="flex items-start gap-3">

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
              : <Circle size={18} className={`text-stone-300 ${canInteract ? 'hover:text-stone-500' : ''}`} />
            }
          </button>

          {showMenu && canInteract && (
            <div className="absolute left-0 top-6 z-20 w-44 rounded-xl bg-white shadow-xl border border-stone-100 py-1 overflow-hidden">
              <button
                onClick={() => { markDone(); setShowMenu(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors"
              >
                <CheckCircle2 size={14} className="text-emerald-500" />
                Mark as done
              </button>
              <button
                onClick={() => { onEdit(); setShowMenu(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors"
              >
                <Pencil size={14} className="text-stone-400" />
                Edit task
              </button>
              <div className="my-1 border-t border-stone-100" />
              <button
                onClick={() => { onDelete(); setShowMenu(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <Trash2 size={14} />
                Delete task
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-snug ${task.is_complete ? 'line-through text-stone-400' : 'text-stone-800'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 text-xs text-stone-500 leading-relaxed">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {minutesToDisplay(task.estimated_minutes)}
            </span>
            {totalActualSeconds > 0 && (
              <span className={`font-medium ${isRunning ? (isRiham ? 'text-rose-500' : 'text-sky-500') : 'text-stone-500'}`}>
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
                  ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 active:bg-rose-300'
                  : 'bg-sky-100 text-sky-600 hover:bg-sky-200 active:bg-sky-300'
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
