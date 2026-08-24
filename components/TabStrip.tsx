'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, MoreHorizontal, Pencil, Archive, RotateCcw, CalendarClock, Trash2 } from 'lucide-react'
import { Tab, UserId } from '@/types'
import { isTabActiveOnDate, todayString } from '@/lib/utils'

interface Props {
  userId: UserId
  currentUser: UserId | null
  isSleeping: boolean
  tabs: Tab[]
  selectedDate: string
  activeTabId: string | null
  onSelectTab: (id: string | null) => void
  onCreateTab: () => void
  onRenameTab: (tab: Tab) => void
  onEndTermNow: (tab: Tab) => void
  onScheduleEnd: (tab: Tab) => void
  onRevive: (tab: Tab) => void
  onRequestDelete: (tab: Tab) => void
}

const MAX_ONGOING_TABS = 5

export default function TabStrip({ userId, currentUser, isSleeping, tabs, selectedDate, activeTabId, onSelectTab, onCreateTab, onRenameTab, onEndTermNow, onScheduleEnd, onRevive, onRequestDelete }: Props) {
  const isOwner = currentUser === userId
  const today = todayString()
  const ongoingCount = tabs.filter(t => !t.ended_at || t.ended_at.slice(0, 10) >= today).length
  const visibleTabs = tabs.filter(t => isTabActiveOnDate(t, selectedDate))

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenuId) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openMenuId])

  const chipBase = 'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap'
  const chipActive = isSleeping ? 'bg-slate-700 text-slate-100' : 'bg-stone-800 text-white'
  const chipInactive = isSleeping
    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onSelectTab(null)}
        className={`${chipBase} ${activeTabId === null ? chipActive : chipInactive}`}
      >
        Main
      </button>

      {visibleTabs.map(tab => {
        const hasEnded = !!tab.ended_at
        return (
          <div key={tab.id} className="relative flex-shrink-0" ref={activeTabId === tab.id ? menuRef : undefined}>
            <button
              onClick={() => onSelectTab(tab.id)}
              className={`${chipBase} ${activeTabId === tab.id ? chipActive : chipInactive} flex items-center gap-1`}
            >
              {tab.name}
              {activeTabId === tab.id && isOwner && (
                <span
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(v => v === tab.id ? null : tab.id) }}
                  className="opacity-70 hover:opacity-100"
                >
                  <MoreHorizontal size={13} />
                </span>
              )}
            </button>

            {openMenuId === tab.id && (
              <div className={`absolute left-0 top-full mt-1 z-50 w-48 rounded-xl shadow-xl border py-1 overflow-hidden ${isSleeping ? 'bg-slate-800 border-slate-700' : 'bg-white border-stone-100'}`}>
                <button
                  onClick={() => { onRenameTab(tab); setOpenMenuId(null) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  <Pencil size={13} className={isSleeping ? 'text-slate-500' : 'text-stone-400'} />
                  Rename
                </button>
                {hasEnded ? (
                  <button
                    onClick={() => { onRevive(tab); setOpenMenuId(null) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700' : 'text-stone-700 hover:bg-stone-100'}`}
                  >
                    <RotateCcw size={13} className={isSleeping ? 'text-slate-500' : 'text-stone-400'} />
                    Revive
                  </button>
                ) : (
                  <button
                    onClick={() => { onEndTermNow(tab); setOpenMenuId(null) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700' : 'text-stone-700 hover:bg-stone-100'}`}
                  >
                    <Archive size={13} className={isSleeping ? 'text-slate-500' : 'text-stone-400'} />
                    End term
                  </button>
                )}
                <button
                  onClick={() => { onScheduleEnd(tab); setOpenMenuId(null) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isSleeping ? 'text-slate-200 hover:bg-slate-700' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  <CalendarClock size={13} className={isSleeping ? 'text-slate-500' : 'text-stone-400'} />
                  {hasEnded ? 'Change end date…' : 'Schedule end date…'}
                </button>
                <div className={`my-1 border-t ${isSleeping ? 'border-slate-700' : 'border-stone-100'}`} />
                <button
                  onClick={() => { onRequestDelete(tab); setOpenMenuId(null) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-950/50 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete tab
                </button>
              </div>
            )}
          </div>
        )
      })}

      {isOwner && ongoingCount < MAX_ONGOING_TABS && (
        <button
          onClick={onCreateTab}
          title="Add tab"
          className={`flex-shrink-0 rounded-full p-1 transition-colors ${isSleeping ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}
