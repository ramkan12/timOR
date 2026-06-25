'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { SpeccialsEntry, UserId } from '@/types'
import { getMondayOfWeek, getWeekDays, todayString } from '@/lib/utils'

const CATEGORIES = [
  { letter: 'S', name: 'Strength',     hint: 'Physical strength & discipline' },
  { letter: 'P', name: 'Philanthropy', hint: 'An act of kindness' },
  { letter: 'E', name: 'Experience',   hint: 'Something unique or fulfilling' },
  { letter: 'C', name: 'Creativity',   hint: 'A passion project' },
  { letter: 'C', name: 'Cleanliness',  hint: 'Clear mind from menial tasks' },
  { letter: 'I', name: 'Intelligence', hint: 'Get smarter (not schoolwork)' },
  { letter: 'A', name: 'Attachment',   hint: 'Stay in touch with loved ones' },
  { letter: 'L', name: 'Lifeforce',    hint: 'Mindfulness & next-day schedule' },
  { letter: 'S', name: 'Spirituality', hint: 'Religious practice & reflection' },
]

const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  panelUserId: UserId
  currentUser: UserId | null
  isRiham: boolean
  isSleeping: boolean
  onClose: () => void
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function SpeccialsModal({ panelUserId, currentUser, isRiham, isSleeping, onClose }: Props) {
  const today = todayString()
  const canInteract = currentUser === panelUserId

  const [selectedDate, setSelectedDate] = useState(today)
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(today))
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const savingRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const weekDays = getWeekDays(weekStart)

  // Fetch entries for selected date
  useEffect(() => {
    supabase
      .from('speccials_entries')
      .select('*')
      .eq('user_id', panelUserId)
      .eq('date', selectedDate)
      .then(({ data }) => {
        const map: Record<number, string> = {}
        if (data) (data as SpeccialsEntry[]).forEach(e => { map[e.category_index] = e.content })
        setDrafts(map)
      })
  }, [panelUserId, selectedDate])

  // Fetch week counts when weekStart changes
  useEffect(() => {
    const days = getWeekDays(weekStart)
    supabase
      .from('speccials_entries')
      .select('date, category_index')
      .eq('user_id', panelUserId)
      .gte('date', days[0])
      .lte('date', days[6])
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        if (data) {
          (data as Pick<SpeccialsEntry, 'date' | 'category_index'>[]).forEach(e => {
            counts[e.date] = (counts[e.date] ?? 0) + 1
          })
        }
        setWeekCounts(counts)
      })
  }, [panelUserId, weekStart])

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`speccials-${panelUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'speccials_entries', filter: `user_id=eq.${panelUserId}` },
        (payload) => {
          const entry = (payload.new ?? payload.old) as SpeccialsEntry
          if (entry.date === selectedDate) {
            if (payload.eventType === 'DELETE') {
              setDrafts(prev => { const n = { ...prev }; delete n[(payload.old as SpeccialsEntry).category_index]; return n })
            } else {
              setDrafts(prev => ({ ...prev, [entry.category_index]: entry.content }))
            }
          }
          setWeekCounts(prev => {
            const days = getWeekDays(weekStart)
            if (!days.includes(entry.date)) return prev
            // Re-fetch week counts on any change
            supabase
              .from('speccials_entries')
              .select('date, category_index')
              .eq('user_id', panelUserId)
              .gte('date', days[0])
              .lte('date', days[6])
              .then(({ data }) => {
                const counts: Record<string, number> = {}
                if (data) (data as Pick<SpeccialsEntry, 'date' | 'category_index'>[]).forEach(e => {
                  counts[e.date] = (counts[e.date] ?? 0) + 1
                })
                setWeekCounts(counts)
              })
            return prev
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [panelUserId, selectedDate, weekStart])

  function handleDraftChange(idx: number, value: string) {
    setDrafts(prev => ({ ...prev, [idx]: value }))
  }

  function handleBlur(idx: number) {
    if (!canInteract) return
    const content = (drafts[idx] ?? '').trim()
    if (content) {
      supabase.from('speccials_entries').upsert(
        { user_id: panelUserId, date: selectedDate, category_index: idx, content },
        { onConflict: 'user_id,date,category_index' }
      ).then(() => {
        setWeekCounts(prev => ({ ...prev, [selectedDate]: Object.values({ ...drafts, [idx]: content }).filter(Boolean).length }))
      })
    } else {
      supabase.from('speccials_entries')
        .delete()
        .eq('user_id', panelUserId)
        .eq('date', selectedDate)
        .eq('category_index', idx)
        .then(() => {
          const updated = { ...drafts }
          delete updated[idx]
          setWeekCounts(prev => ({ ...prev, [selectedDate]: Object.values(updated).filter(Boolean).length }))
        })
    }
  }

  async function handleSaveAll() {
    if (!canInteract || saving) return
    setSaving(true)
    await Promise.all(
      CATEGORIES.map(async (_, idx) => {
        const content = (drafts[idx] ?? '').trim()
        if (content) {
          await supabase.from('speccials_entries').upsert(
            { user_id: panelUserId, date: selectedDate, category_index: idx, content },
            { onConflict: 'user_id,date,category_index' }
          )
        } else {
          await supabase.from('speccials_entries')
            .delete()
            .eq('user_id', panelUserId)
            .eq('date', selectedDate)
            .eq('category_index', idx)
        }
      })
    )
    setWeekCounts(prev => ({ ...prev, [selectedDate]: Object.values(drafts).filter(v => v && v.trim()).length }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => onClose(), 1000)
  }

  function handleDaySelect(date: string) {
    setSelectedDate(date)
    const monday = getMondayOfWeek(date)
    if (monday !== weekStart) setWeekStart(monday)
  }

  const dateLabel = (() => {
    const d = new Date(selectedDate + 'T00:00:00')
    return format(d, 'EEEE, MMM d')
  })()

  const filledCount = Object.values(drafts).filter(v => v && v.trim()).length

  // Theming
  const accent = isRiham ? 'rose' : 'sky'
  const badgeBg = isSleeping ? 'bg-slate-700 text-slate-200' : isRiham ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
  const selectedPill = isSleeping ? 'bg-slate-500 text-white' : isRiham ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'
  const todayRing = isSleeping ? 'ring-1 ring-slate-400' : isRiham ? 'ring-1 ring-rose-300' : 'ring-1 ring-sky-300'
  const pillBase = isSleeping ? 'text-slate-400 hover:bg-slate-700' : 'text-stone-500 hover:bg-stone-100'
  const textareaFocus = isRiham ? 'focus:ring-rose-200' : 'focus:ring-sky-200'
  const modalBg = isSleeping ? 'bg-slate-900 text-slate-100' : 'bg-white text-stone-800'
  const headerBorder = isSleeping ? 'border-slate-700' : 'border-stone-100'
  const hintColor = isSleeping ? 'text-slate-500' : 'text-stone-400'
  const textareaBg = isSleeping ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-600' : 'bg-stone-50 border-stone-200 text-stone-800 placeholder:text-stone-300'
  const readonlyColor = isSleeping ? 'text-slate-300' : 'text-stone-700'
  const navBtnClass = isSleeping ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${modalBg}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${headerBorder}`}>
          <h2 className="font-bold text-lg tracking-wide">SPECCIALS</h2>
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${navBtnClass}`}>
            <X size={18} />
          </button>
        </div>

        {/* Week strip */}
        <div className={`px-4 py-3 border-b flex-shrink-0 ${headerBorder}`}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className={`p-1 rounded-lg transition-colors flex-shrink-0 ${navBtnClass}`}
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex-1 flex items-center justify-between gap-1">
              {weekDays.map((day, i) => {
                const isSelected = day === selectedDate
                const isToday = day === today
                const count = weekCounts[day] ?? 0
                return (
                  <button
                    key={day}
                    onClick={() => handleDaySelect(day)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors flex-1 ${
                      isSelected ? selectedPill : `${pillBase} ${isToday ? todayRing : ''}`
                    }`}
                  >
                    <span className="text-[11px] font-semibold">{DAY_ABBREVS[i]}</span>
                    <div className="flex gap-0.5 flex-wrap justify-center w-full">
                      {count > 0 ? (
                        <span className={`text-[9px] font-bold ${isSelected ? 'opacity-90' : isSleeping ? 'text-slate-400' : `text-${accent}-400`}`}>
                          {count}/9
                        </span>
                      ) : (
                        <span className="text-[9px] opacity-30">—</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              disabled={weekDays[6] >= today}
              className={`p-1 rounded-lg transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-default ${navBtnClass}`}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Date label */}
        <div className={`px-5 py-2.5 border-b flex-shrink-0 ${headerBorder}`}>
          <p className={`text-xs font-medium ${hintColor}`}>
            {dateLabel} · <span className={isRiham ? 'text-rose-500' : 'text-sky-500'}>{filledCount} of 9</span>
          </p>
        </div>

        {/* Category rows */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {CATEGORIES.map((cat, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${badgeBg}`}>
                  {cat.letter}
                </span>
                <div>
                  <span className="text-sm font-semibold">{cat.name}</span>
                  <span className={`text-xs ml-2 ${hintColor}`}>{cat.hint}</span>
                </div>
              </div>
              {canInteract ? (
                <textarea
                  rows={2}
                  value={drafts[idx] ?? ''}
                  onChange={e => handleDraftChange(idx, e.target.value)}
                  placeholder={`What did you do for ${cat.name.toLowerCase()}?`}
                  className={`w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 transition-colors ${textareaBg} ${textareaFocus}`}
                />
              ) : (
                <p className={`text-sm px-1 min-h-[2.5rem] ${drafts[idx] ? readonlyColor : hintColor + ' italic'}`}>
                  {drafts[idx] || 'Nothing logged yet'}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {canInteract && (
          <div className={`px-5 py-4 border-t flex-shrink-0 ${headerBorder}`}>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                saved
                  ? 'bg-emerald-500 text-white'
                  : isSleeping
                    ? isRiham ? 'bg-rose-800 hover:bg-rose-700 text-white' : 'bg-sky-800 hover:bg-sky-700 text-white'
                    : isRiham ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'
              }`}
            >
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
