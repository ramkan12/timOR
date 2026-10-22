'use client'

import { useEffect, useState } from 'react'
import { X, Calendar, Sparkles } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { CardStyle, Task, UserId } from '@/types'
import { todayString, formatDateLabel, minutesToDisplay } from '@/lib/utils'
import { CommonCard, findCardStyle, normalizeText, topCommonCards } from '@/lib/cardMatch'
import { CARD_COLORS, CARD_PATTERNS, CardLookChoice, PLAIN_LOOK, getCardLook, isPlainLook } from '@/lib/cardStyles'
import CalendarModal from './CalendarModal'

interface Props {
  userId: UserId
  date: string
  sortOrder?: number
  tabId?: string | null
  onClose: () => void
  onTaskAdded?: () => void
  existingTask?: Task
}

const HOUR_OPTIONS = Array.from({ length: 8 }, (_, i) => i)
const MINUTE_OPTIONS = [0, 15, 30, 45]
const COMMON_WINDOW_DAYS = 30

export default function AddTaskModal({ userId, date, sortOrder = 0, tabId = null, onClose, onTaskAdded, existingTask }: Props) {
  const isEditing = !!existingTask
  const taskTabId = existingTask ? existingTask.tab_id : tabId
  const isTabTask = taskTabId !== null

  const [title, setTitle] = useState(existingTask?.title ?? '')
  const [description, setDescription] = useState(existingTask?.description ?? '')
  const [hours, setHours] = useState(existingTask ? Math.floor(existingTask.estimated_minutes / 60) : 1)
  const [minutes, setMinutes] = useState(existingTask ? existingTask.estimated_minutes % 60 : 0)
  const [dueDate, setDueDate] = useState<string | null>(existingTask?.due_date ?? null)
  const [showDuePicker, setShowDuePicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [styles, setStyles] = useState<CardStyle[]>([])
  const [commonCards, setCommonCards] = useState<CommonCard[]>([])
  // null = follow whatever look is already saved for this title + description
  const [customLook, setCustomLook] = useState<CardLookChoice | null>(null)

  useEffect(() => {
    supabase.from('card_styles').select('*').eq('user_id', userId)
      .then(({ data }) => { if (data) setStyles(data as CardStyle[]) })
  }, [userId])

  useEffect(() => {
    if (isEditing) return
    const since = format(subDays(parseISO(todayString()), COMMON_WINDOW_DAYS), 'yyyy-MM-dd')
    supabase.from('tasks')
      .select('title, description, estimated_minutes, date, created_at')
      .eq('user_id', userId)
      .gte('date', since)
      .then(({ data }) => { if (data) setCommonCards(topCommonCards(data)) })
  }, [userId, isEditing])

  const savedStyle = findCardStyle(styles, title, description)
  const look: CardLookChoice = customLook ?? savedStyle ?? PLAIN_LOOK
  const previewLook = getCardLook(look, false)

  function applyCommonCard(card: CommonCard) {
    setTitle(card.title)
    setDescription(card.description ?? '')
    setHours(Math.min(Math.floor(card.estimated_minutes / 60), HOUR_OPTIONS[HOUR_OPTIONS.length - 1]))
    setMinutes(MINUTE_OPTIONS.includes(card.estimated_minutes % 60) ? card.estimated_minutes % 60 : 0)
    setCustomLook(null)
    setError('')
  }

  async function saveLook() {
    if (!customLook) return
    if (isPlainLook(customLook)) {
      if (savedStyle) await supabase.from('card_styles').delete().eq('id', savedStyle.id)
      return
    }
    await supabase.from('card_styles').upsert({
      user_id: userId,
      title_key: normalizeText(title),
      desc_key: normalizeText(description),
      color: customLook.color,
      pattern: customLook.pattern,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,title_key,desc_key' })
  }

  const estimatedMinutes = hours * 60 + minutes
  const taskStartDate = existingTask?.date ?? date
  const dueDateMin = taskStartDate > todayString() ? taskStartDate : todayString()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (estimatedMinutes === 0) { setError('Please set an estimated duration'); return }

    setSaving(true)

    const fields = {
      title: title.trim(),
      description: description.trim() || null,
      estimated_minutes: estimatedMinutes,
      due_date: isTabTask ? dueDate : null,
    }

    const { error: dbError } = isEditing
      ? await supabase.from('tasks').update(fields).eq('id', existingTask!.id)
      : await supabase.from('tasks').insert({
          user_id: userId,
          date,
          tab_id: tabId,
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
      await saveLook()
      onTaskAdded?.()
      onClose()
    }
  }

  const btnClass = userId === 'riham'
    ? 'bg-rose-500 hover:bg-rose-600 text-white'
    : 'bg-sky-500 hover:bg-sky-600 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isEditing && commonCards.length > 0 && (
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-stone-600 mb-1.5">
                <Sparkles size={12} className="text-amber-400" />
                Your usual cards
              </label>
              <div className="flex flex-col gap-1.5">
                {commonCards.map(card => {
                  const cardLook = getCardLook(findCardStyle(styles, card.title, card.description), false)
                  return (
                    <button
                      key={`${card.title}|${card.description ?? ''}`}
                      type="button"
                      onClick={() => applyCommonCard(card)}
                      style={cardLook?.style}
                      className={`w-full text-left rounded-lg border px-3 py-1.5 transition-all hover:shadow-md hover:-translate-y-px ${cardLook?.className ?? 'bg-white border-stone-200'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-stone-800">{card.title}</span>
                        <span className="flex-shrink-0 text-[10px] text-stone-400">{minutesToDisplay(card.estimated_minutes)}</span>
                      </div>
                      {card.description && (
                        <p className="truncate text-[11px] text-stone-500">{card.description.replace(/\s+/g, ' ')}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Studying or Working on project"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-base sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
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
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-base sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Estimated duration</label>
            <div className="flex gap-2">
              <select
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-base sm:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
              >
                {HOUR_OPTIONS.map(h => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
              <select
                value={minutes}
                onChange={e => setMinutes(Number(e.target.value))}
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-base sm:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
              >
                {MINUTE_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}m</option>
                ))}
              </select>
            </div>
          </div>

          {isTabTask && (
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                Due date <span className="text-stone-400 font-normal">(optional — stays visible every day until then)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDuePicker(true)}
                  className="flex-1 flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Calendar size={14} className="text-stone-400" />
                  {dueDate ? formatDateLabel(dueDate) : 'No due date'}
                </button>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate(null)}
                    title="Clear due date"
                    className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Card look is only adjustable when editing — keeps New Task uncluttered */}
          {isEditing && (
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                Card look <span className="text-stone-400 font-normal">(remembered for every card with this title + description)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {CARD_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setCustomLook({ ...look, color: c.id })}
                    className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${c.swatch} ${look.color === c.id ? 'ring-2 ring-offset-2 ring-stone-500' : ''}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CARD_PATTERNS.map(p => {
                  const swatch = getCardLook({ color: look.color, pattern: p.id }, false)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCustomLook({ ...look, pattern: p.id })}
                      style={swatch?.style}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium text-stone-600 ${swatch?.className ?? 'bg-white border-stone-200'} ${look.pattern === p.id ? 'ring-2 ring-stone-500' : ''}`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <div
                style={previewLook?.style}
                className={`rounded-xl border p-3 shadow-sm ${previewLook?.className ?? 'bg-white border-stone-200'}`}
              >
                <p className="text-sm font-medium text-stone-800 truncate">{title.trim() || 'Preview'}</p>
                {description.trim() && <p className="text-xs text-stone-500 truncate">{description.trim()}</p>}
              </div>
            </div>
          )}

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

      {showDuePicker && (
        <CalendarModal
          selectedDate={dueDate ?? dueDateMin}
          minDate={dueDateMin}
          panelUserId={userId}
          tabId={taskTabId}
          onSelectDate={(d) => { setDueDate(d); setShowDuePicker(false) }}
          onClose={() => setShowDuePicker(false)}
        />
      )}
    </div>
  )
}
