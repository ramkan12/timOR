'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Task, UserId } from '@/types'

interface Props {
  userId: UserId
  date: string
  sortOrder?: number
  onClose: () => void
  onTaskAdded?: () => void
  existingTask?: Task
}

const HOUR_OPTIONS = Array.from({ length: 8 }, (_, i) => i)
const MINUTE_OPTIONS = [0, 15, 30, 45]

export default function AddTaskModal({ userId, date, sortOrder = 0, onClose, onTaskAdded, existingTask }: Props) {
  const isEditing = !!existingTask

  const [title, setTitle] = useState(existingTask?.title ?? '')
  const [description, setDescription] = useState(existingTask?.description ?? '')
  const [hours, setHours] = useState(existingTask ? Math.floor(existingTask.estimated_minutes / 60) : 1)
  const [minutes, setMinutes] = useState(existingTask ? existingTask.estimated_minutes % 60 : 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const estimatedMinutes = hours * 60 + minutes

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (estimatedMinutes === 0) { setError('Please set an estimated duration'); return }

    setSaving(true)

    const fields = {
      title: title.trim(),
      description: description.trim() || null,
      estimated_minutes: estimatedMinutes,
    }

    const { error: dbError } = isEditing
      ? await supabase.from('tasks').update(fields).eq('id', existingTask!.id)
      : await supabase.from('tasks').insert({
          user_id: userId,
          date,
          ...fields,
          actual_seconds: 0,
          timer_started_at: null,
          is_complete: false,
          sort_order: sortOrder,
        })

    if (dbError) {
      setError('Failed to save. Please try again.')
      setSaving(false)
    } else {
      onTaskAdded?.()
      onClose()
    }
  }

  const btnClass = userId === 'riham'
    ? 'bg-rose-500 hover:bg-rose-600 text-white'
    : 'bg-sky-500 hover:bg-sky-600 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Studying or Working on project"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Description <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add any details..."
              rows={2}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Estimated duration</label>
            <div className="flex gap-2">
              <select
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
              >
                {HOUR_OPTIONS.map(h => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
              <select
                value={minutes}
                onChange={e => setMinutes(Number(e.target.value))}
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
              >
                {MINUTE_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}m</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${btnClass} disabled:opacity-60`}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
