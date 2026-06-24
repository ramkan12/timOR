'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { GOAL_MINUTES, todayString } from '@/lib/utils'

interface Props {
  selectedDate: string
  onSelectDate: (date: string) => void
  onClose: () => void
}

type DayProgress = { riham: number; omar: number }

const GOAL_SECONDS = GOAL_MINUTES * 60
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function dotColor(seconds: number): string {
  if (seconds >= GOAL_SECONDS) return 'bg-emerald-400'
  if (seconds > 0) return 'bg-amber-400'
  return 'bg-stone-200'
}

export default function CalendarModal({ selectedDate, onSelectDate, onClose }: Props) {
  const today = todayString()
  const initialYear = parseInt(selectedDate.slice(0, 4))
  const initialMonth = parseInt(selectedDate.slice(5, 7)) - 1

  const [viewYear, setViewYear] = useState(initialYear)
  const [viewMonth, setViewMonth] = useState(initialMonth)
  const [progressData, setProgressData] = useState<Record<string, DayProgress>>({})
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const monthStart = `${viewYear}-${mm}-01`
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
    const monthEnd = `${viewYear}-${mm}-${String(lastDay).padStart(2, '0')}`

    supabase
      .from('tasks')
      .select('date, user_id, is_complete, actual_seconds, estimated_minutes')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .then(({ data }) => {
        if (!data) return
        const result: Record<string, DayProgress> = {}
        for (const t of data) {
          if (!result[t.date]) result[t.date] = { riham: 0, omar: 0 }
          const contribution = t.is_complete
            ? Math.max(t.actual_seconds, t.estimated_minutes * 60)
            : t.actual_seconds
          if (t.user_id === 'riham') result[t.date].riham += contribution
          else result[t.date].omar += contribution
        }
        setProgressData(result)
      })
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    const todayYear = parseInt(today.slice(0, 4))
    const todayMonth = parseInt(today.slice(5, 7)) - 1
    if (viewYear === todayYear && viewMonth === todayMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const todayYear = parseInt(today.slice(0, 4))
  const todayMonth = parseInt(today.slice(5, 7)) - 1
  const canGoNext = !(viewYear === todayYear && viewMonth === todayMonth)

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const mm = String(viewMonth + 1).padStart(2, '0')

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-stone-800 text-sm">
            {format(new Date(viewYear, viewMonth, 1), 'MMMM yyyy')}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={nextMonth}
              disabled={!canGoNext}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-3">
          {/* Legend */}
          <div className="flex items-center justify-end gap-3 mb-2 px-1">
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Rihamie
            </span>
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Omarie
            </span>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />

              const dateStr = `${viewYear}-${mm}-${String(day).padStart(2, '0')}`
              const isFuture = dateStr > today
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === today
              const progress = progressData[dateStr]

              return (
                <button
                  key={dateStr}
                  disabled={isFuture}
                  onClick={() => { onSelectDate(dateStr); onClose() }}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                    isFuture
                      ? 'opacity-25 cursor-default'
                      : isSelected
                      ? 'bg-stone-800 text-white'
                      : 'hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <span className={`text-xs font-medium leading-none mb-1.5 ${
                    isToday && !isSelected ? 'underline underline-offset-2' : ''
                  }`}>
                    {day}
                  </span>
                  <div className="flex gap-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'opacity-80 ' : ''
                    }${progress ? dotColor(progress.riham) : 'bg-stone-200'}`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'opacity-80 ' : ''
                    }${progress ? dotColor(progress.omar) : 'bg-stone-200'}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Color legend */}
        <div className="flex items-center justify-center gap-4 px-4 py-2.5 border-t border-stone-100 bg-stone-50">
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> 7h goal met
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> partial
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            <span className="w-2 h-2 rounded-full bg-stone-200 inline-block" /> none
          </span>
        </div>
      </div>
    </div>
  )
}
