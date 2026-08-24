'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react'
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { supabase } from '@/lib/supabase'
import { Tab, Task, User, UserId, UserNote } from '@/types'
import { todayString, formatDateLabel, getElapsedSeconds, endOfDayMs, secondsToDisplay, minutesToDisplay, isTabActiveOnDate, isTaskVisibleOnDate } from '@/lib/utils'
import TaskCard from './TaskCard'
import ProgressBar from './ProgressBar'
import AddTaskModal from './AddTaskModal'
import CalendarModal from './CalendarModal'
import NoteWidget from './NoteWidget'
import SpeccialsModal from './SpeccialsModal'
import TabStrip from './TabStrip'
import TabModal from './TabModal'

interface Props {
  panelUserId: UserId
  currentUser: UserId | null
  selectedDate: string
  onDateChange: (date: string) => void
  sleepUser: User | null
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const STARS_STYLE: React.CSSProperties = {
  backgroundImage: [
    'radial-gradient(1px 1px at 12% 8%, rgba(255,255,255,0.9) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 28% 5%, rgba(255,255,255,0.7) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 45% 12%, rgba(255,255,255,0.8) 0%, transparent 100%)',
    'radial-gradient(2px 2px at 67% 7%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 82% 15%, rgba(255,255,255,0.9) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 8% 25%, rgba(255,255,255,0.5) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 55% 20%, rgba(255,255,255,0.7) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 91% 30%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(2px 2px at 35% 35%, rgba(255,255,255,0.4) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 73% 28%, rgba(255,255,255,0.8) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 20% 45%, rgba(255,255,255,0.5) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 88% 50%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 50% 55%, rgba(255,255,255,0.4) 0%, transparent 100%)',
    'radial-gradient(2px 2px at 5% 60%, rgba(255,255,255,0.7) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 95% 18%, rgba(255,255,255,0.5) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 62% 42%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 15% 70%, rgba(255,255,255,0.4) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 78% 65%, rgba(255,255,255,0.5) 0%, transparent 100%)',
  ].join(', '),
}

export default function UserPanel({ panelUserId, currentUser, selectedDate, onDateChange, sleepUser }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [dayNote, setDayNote] = useState<UserNote | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showSpeccials, setShowSpeccials] = useState(false)
  const [copyingTask, setCopyingTask] = useState<Task | null>(null)
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [fetchKey, setFetchKey] = useState(0)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [showCreateTab, setShowCreateTab] = useState(false)
  const [editingTab, setEditingTab] = useState<Tab | null>(null)
  const [confirmingDeleteTab, setConfirmingDeleteTab] = useState<Tab | null>(null)
  const [schedulingEndTab, setSchedulingEndTab] = useState<Tab | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const isReadOnly = selectedDate < todayString()
  const isOwner = currentUser === panelUserId
  const isToday = selectedDate === todayString()
  const isSleeping = sleepUser?.sleep_status ?? user?.sleep_status ?? false
  const isRiham = panelUserId === 'riham'

  const displayName = isRiham ? 'Rihamie' : 'Omarie'

  const panelBg = isSleeping
    ? isRiham
      ? 'from-slate-950 via-indigo-950 to-rose-950'
      : 'from-slate-950 via-indigo-950 to-sky-950'
    : isRiham
      ? 'from-rose-50 to-white'
      : 'from-sky-50 to-white'

  const addBtnClass = isSleeping
    ? isRiham
      ? 'bg-rose-800 hover:bg-rose-700 text-white'
      : 'bg-sky-800 hover:bg-sky-700 text-white'
    : isRiham
      ? 'bg-rose-500 hover:bg-rose-600 text-white'
      : 'bg-sky-500 hover:bg-sky-600 text-white'

  // Tick every second for live progress bar + task timers
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Poll every 3 seconds as a fallback in case real-time subscription misses an update
  useEffect(() => {
    const t = setInterval(() => setFetchKey(k => k + 1), 3000)
    return () => clearInterval(t)
  }, [])

  // On mount: auto-stop any timers that ran past their day boundary (6am of the following day) —
  // but leave alone a task whose due_date still keeps it valid today or later.
  useEffect(() => {
    const today = todayString()
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', panelUserId)
      .not('timer_started_at', 'is', null)
      .lt('date', today)
      .or(`due_date.is.null,due_date.lt.${today}`)
      .then(async ({ data }) => {
        if (!data || data.length === 0) return
        await Promise.all((data as Task[]).map(t => {
          const cap = endOfDayMs(t.date)
          const elapsed = Math.max(0, Math.floor((Math.min(Date.now(), cap) - new Date(t.timer_started_at!).getTime()) / 1000))
          return supabase.from('tasks').update({
            timer_started_at: null,
            actual_seconds: t.actual_seconds + elapsed,
          }).eq('id', t.id)
        }))
        setFetchKey(k => k + 1)
      })
  }, [panelUserId])

  // Fetch tasks — includes tasks whose due_date keeps them visible on this
  // date even though they started on an earlier day (tab tasks only; Main
  // tasks never have a due_date, so this collapses to an exact date match).
  useEffect(() => {
    let query = supabase.from('tasks').select('*').eq('user_id', panelUserId)
    query = activeTabId === null ? query.is('tab_id', null) : query.eq('tab_id', activeTabId)
    query = query
      .lte('date', selectedDate)
      .or(`due_date.gte.${selectedDate},and(due_date.is.null,date.eq.${selectedDate})`)
    query
      .order('is_complete', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => { if (!error && data) setTasks(data as Task[]) })
  }, [panelUserId, selectedDate, activeTabId, fetchKey])

  // Fetch tabs
  useEffect(() => {
    supabase.from('tabs').select('*').eq('user_id', panelUserId).order('created_at', { ascending: true })
      .then(({ data, error }) => { if (!error && data) setTabs(data as Tab[]) })
  }, [panelUserId, fetchKey])

  // If the currently-active tab isn't relevant for the date now being viewed
  // (navigated outside its lifespan), fall back to Main rather than showing a
  // stale/invisible selection.
  useEffect(() => {
    if (activeTabId === null) return
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || !isTabActiveOnDate(tab, selectedDate)) setActiveTabId(null)
  }, [selectedDate, tabs, activeTabId])

  // Fetch user row (sleep status)
  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .eq('id', panelUserId)
      .single()
      .then(({ data }) => { if (data) setUser(data as User) })
  }, [panelUserId, fetchKey])

  // Fetch note for selected date
  useEffect(() => {
    supabase.from('user_notes').select('*')
      .eq('user_id', panelUserId).eq('date', selectedDate).maybeSingle()
      .then(({ data }) => setDayNote(data as UserNote | null))
  }, [panelUserId, selectedDate, fetchKey])

  // Real-time: tasks
  useEffect(() => {
    const channel = supabase
      .channel(`tasks-${panelUserId}-${selectedDate}-${activeTabId ?? 'main'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${panelUserId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as Task
            if (t.tab_id === activeTabId && isTaskVisibleOnDate(t, selectedDate)) setTasks(prev => [...prev, t])
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Task) : t))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as Task).id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [panelUserId, selectedDate, activeTabId])

  // Real-time: tabs
  useEffect(() => {
    const channel = supabase
      .channel(`tabs-${panelUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tabs', filter: `user_id=eq.${panelUserId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTabs(prev => [...prev, payload.new as Tab])
          } else if (payload.eventType === 'UPDATE') {
            setTabs(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Tab) : t))
          } else if (payload.eventType === 'DELETE') {
            setTabs(prev => prev.filter(t => t.id !== (payload.old as Tab).id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [panelUserId])

  // Real-time: user (sleep status)
  useEffect(() => {
    const channel = supabase
      .channel(`user-${panelUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${panelUserId}` },
        (payload) => setUser(payload.new as User)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [panelUserId])

  // Real-time: user_notes
  useEffect(() => {
    const channel = supabase
      .channel(`notes-${panelUserId}-${selectedDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notes', filter: `user_id=eq.${panelUserId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            if ((payload.old as UserNote).date === selectedDate) setDayNote(null)
          } else {
            const n = payload.new as UserNote
            if (n.date === selectedDate) setDayNote(n)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [panelUserId, selectedDate])

  async function handleNoteReact(emoji: string | null) {
    if (!currentUser || currentUser === panelUserId || !dayNote) return
    const updated = { note_reaction: emoji, note_reaction_by: emoji ? currentUser : null }
    setDayNote(n => n ? { ...n, ...updated } : n)
    await supabase.from('user_notes').update(updated).eq('id', dayNote.id)
  }

  async function handleNoteSave(text: string | null) {
    if (!text) {
      setDayNote(null)
      if (dayNote) await supabase.from('user_notes').delete().eq('id', dayNote.id)
      return
    }
    const isNewText = text !== dayNote?.content
    const now = new Date().toISOString()
    setDayNote(prev => ({
      id: prev?.id ?? '',
      user_id: panelUserId,
      date: selectedDate,
      content: text,
      created_at: now,
      note_reaction: isNewText ? null : (prev?.note_reaction ?? null),
      note_reaction_by: isNewText ? null : (prev?.note_reaction_by ?? null),
    }))
    const { data } = await supabase.from('user_notes')
      .upsert(
        { user_id: panelUserId, date: selectedDate, content: text, created_at: now, ...(isNewText ? { note_reaction: null, note_reaction_by: null } : {}) },
        { onConflict: 'user_id,date' }
      )
      .select().single()
    if (data) setDayNote(data as UserNote)
  }

  async function handleStopStale(task: Task) {
    const cap = endOfDayMs(task.date)
    const elapsed = Math.max(0, Math.floor((Math.min(Date.now(), cap) - new Date(task.timer_started_at!).getTime()) / 1000))
    const updated: Task = { ...task, timer_started_at: null, actual_seconds: task.actual_seconds + elapsed }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    await supabase.from('tasks').update({ timer_started_at: null, actual_seconds: updated.actual_seconds }).eq('id', task.id)
  }

  async function handleCopyTaskToDate(task: Task, dateStr: string) {
    setCopyingTask(null)
    await supabase.from('tasks').insert({
      user_id: panelUserId,
      date: dateStr,
      tab_id: task.tab_id,
      due_date: null,
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimated_minutes,
      actual_seconds: 0,
      timer_started_at: null,
      is_complete: false,
      sort_order: 0,
    })
    setCopyToast(`Copied to ${formatDateLabel(dateStr)}`)
    setTimeout(() => setCopyToast(null), 2500)
  }

  async function handleEndTerm(tab: Tab, dateStr: string) {
    // Only finalize running timers when the term is ending now or in the past —
    // a future scheduled end date leaves the tab fully active until then.
    if (dateStr <= todayString()) {
      const { data: running } = await supabase.from('tasks').select('*').eq('tab_id', tab.id).not('timer_started_at', 'is', null)
      if (running && running.length > 0) {
        await Promise.all((running as Task[]).map(t => {
          const elapsed = Math.floor((Date.now() - new Date(t.timer_started_at!).getTime()) / 1000)
          return supabase.from('tasks').update({ timer_started_at: null, actual_seconds: t.actual_seconds + elapsed }).eq('id', t.id)
        }))
      }
    }
    await supabase.from('tabs').update({ ended_at: dateStr }).eq('id', tab.id)
  }

  async function handleRevive(tab: Tab) {
    await supabase.from('tabs').update({ ended_at: null }).eq('id', tab.id)
  }

  async function handleDeleteTab(tab: Tab) {
    if (activeTabId === tab.id) setActiveTabId(null)
    setTabs(prev => prev.filter(t => t.id !== tab.id))
    await supabase.from('tabs').delete().eq('id', tab.id)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const incomplete = tasks.filter(t => !t.is_complete)
    const oldIndex = incomplete.findIndex(t => t.id === active.id)
    const newIndex = incomplete.findIndex(t => t.id === over.id)
    const reordered = arrayMove(incomplete, oldIndex, newIndex).map((t, i) => ({ ...t, sort_order: i }))
    setTasks(prev => [...reordered, ...prev.filter(t => t.is_complete)])
    await Promise.all(reordered.map((t, i) =>
      supabase.from('tasks').update({ sort_order: i }).eq('id', t.id)
    ))
  }

  async function handleCompletedDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const completed = tasks.filter(t => t.is_complete)
    const oldIndex = completed.findIndex(t => t.id === active.id)
    const newIndex = completed.findIndex(t => t.id === over.id)
    const reordered = arrayMove(completed, oldIndex, newIndex).map((t, i) => ({ ...t, sort_order: i }))
    setTasks(prev => [...prev.filter(t => !t.is_complete), ...reordered])
    await Promise.all(reordered.map((t, i) =>
      supabase.from('tasks').update({ sort_order: i }).eq('id', t.id)
    ))
  }

  async function handleMarkDone(task: Task) {
    const wasComplete = task.is_complete
    const extraSeconds = !wasComplete && task.timer_started_at ? getElapsedSeconds(task.timer_started_at) : 0

    if (!wasComplete) {
      const completedCount = tasks.filter(t => t.is_complete && t.id !== task.id).length
      const updated: Task = { ...task, is_complete: true, timer_started_at: null, actual_seconds: task.actual_seconds + extraSeconds, sort_order: completedCount }
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
      await supabase.from('tasks').update({ is_complete: true, timer_started_at: null, actual_seconds: updated.actual_seconds, sort_order: completedCount }).eq('id', task.id)
    } else {
      const incompleteCount = tasks.filter(t => !t.is_complete && t.id !== task.id).length
      const updated: Task = { ...task, is_complete: false, timer_started_at: null, sort_order: incompleteCount }
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
      await supabase.from('tasks').update({ is_complete: false, timer_started_at: null, sort_order: incompleteCount }).eq('id', task.id)
    }
  }

  async function handleDeleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('tasks').delete().eq('id', taskId)
  }

  async function handleStartTimer(taskToStart: Task) {
    // Stop any other running timer for this person, regardless of which tab/date it's in —
    // only one timer runs at a time app-wide, not just within the currently-loaded context.
    const { data: runningRows } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', panelUserId)
      .not('timer_started_at', 'is', null)
    const otherRunning = ((runningRows as Task[] | null) ?? []).filter(t => t.id !== taskToStart.id)
    if (otherRunning.length > 0) {
      const stoppedOthers = otherRunning.map(t => {
        const elapsed = Math.floor((Date.now() - new Date(t.timer_started_at!).getTime()) / 1000)
        return { ...t, timer_started_at: null, actual_seconds: t.actual_seconds + elapsed }
      })
      await Promise.all(stoppedOthers.map(t =>
        supabase.from('tasks').update({ actual_seconds: t.actual_seconds, timer_started_at: null }).eq('id', t.id)
      ))
      const stoppedById = new Map(stoppedOthers.map(t => [t.id, t]))
      setTasks(prev => prev.map(t => stoppedById.get(t.id) ?? t))
    }
    const started: Task = { ...taskToStart, timer_started_at: new Date().toISOString() }
    // Bump started task to top of incomplete group
    const incompleteOthers = tasks.filter(t => !t.is_complete && t.id !== taskToStart.id)
    const reorderedIncomplete = [started, ...incompleteOthers].map((t, i) => ({ ...t, sort_order: i }))
    setTasks(prev => [...reorderedIncomplete, ...prev.filter(t => t.is_complete)])
    await supabase.from('tasks').update({ timer_started_at: started.timer_started_at, sort_order: 0 }).eq('id', taskToStart.id)
    await Promise.all(
      incompleteOthers.map((t, i) =>
        supabase.from('tasks').update({ sort_order: i + 1 }).eq('id', t.id)
      )
    )
  }

  const estimatedMinutes = tasks.reduce((sum, t) => sum + t.estimated_minutes, 0)

  const actualSeconds = tasks.reduce((sum, t) => {
    if (t.is_complete) {
      return sum + Math.max(t.actual_seconds, t.estimated_minutes * 60)
    }
    const elapsed = t.timer_started_at
      ? Math.floor((now - new Date(t.timer_started_at).getTime()) / 1000)
      : 0
    return sum + t.actual_seconds + elapsed
  }, 0)

  return (
    <div className={`relative flex flex-col md:flex-1 md:min-h-0 bg-gradient-to-b ${panelBg} transition-colors duration-700`}>

      {/* Stars overlay (sleep mode only) */}
      {isSleeping && (
        <div className="absolute inset-0 pointer-events-none z-0" style={STARS_STYLE} />
      )}

      {/* Panel header */}
      <div className={`relative z-10 px-5 pt-5 pb-4 border-b space-y-3 ${isSleeping ? 'border-slate-700/50' : 'border-stone-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className={`text-lg font-bold ${isSleeping ? 'text-slate-100' : 'text-stone-800'}`}>{displayName}</h2>
            {isOwner && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSleeping ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-500'}`}>you</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSpeccials(true)}
              title="SPECCIALS"
              className={`p-1.5 rounded-lg transition-colors ${isSleeping ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
            >
              <Sparkles size={15} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <TabStrip
          userId={panelUserId}
          currentUser={currentUser}
          isSleeping={isSleeping}
          tabs={tabs}
          selectedDate={selectedDate}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
          onCreateTab={() => setShowCreateTab(true)}
          onRenameTab={(tab) => setEditingTab(tab)}
          onEndTermNow={(tab) => handleEndTerm(tab, todayString())}
          onScheduleEnd={(tab) => setSchedulingEndTab(tab)}
          onRevive={handleRevive}
          onRequestDelete={(tab) => setConfirmingDeleteTab(tab)}
        />

        {/* Note widget */}
        {user && (
          <NoteWidget user={user} dayNote={dayNote} isOwner={isOwner} isSleeping={isSleeping} onSave={handleNoteSave} onReact={handleNoteReact} />
        )}

        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onDateChange(addDays(selectedDate, -1))}
            className={`p-1.5 rounded-lg transition-colors ${isSleeping ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700 active:bg-slate-600' : 'text-stone-400 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-medium ${isSleeping ? 'text-slate-300' : 'text-stone-600'}`}>{formatDateLabel(selectedDate)}</span>
            <button
              onClick={() => setShowCalendar(true)}
              className={`p-1 rounded-md transition-colors ${isSleeping ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200'}`}
              title="Open calendar"
            >
              <Calendar size={13} />
            </button>
          </div>
          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            disabled={false}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-default ${isSleeping ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700 active:bg-slate-600' : 'text-stone-400 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {activeTabId === null ? (
          <ProgressBar estimatedMinutes={estimatedMinutes} actualSeconds={actualSeconds} isSleeping={isSleeping} isRiham={isRiham} />
        ) : (
          <p className={`text-xs ${isSleeping ? 'text-slate-400' : 'text-stone-500'}`}>
            {secondsToDisplay(actualSeconds)} tracked · {minutesToDisplay(estimatedMinutes)} estimated
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className={`text-sm ${isSleeping ? 'text-slate-400' : 'text-stone-400'}`}>
              {isReadOnly ? 'No tasks recorded for this day.' : 'No tasks yet — add one to get started!'}
            </p>
          </div>
        ) : (
          <>
            {/* Incomplete tasks */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.filter(t => !t.is_complete).map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.filter(t => !t.is_complete).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    isReadOnly={isReadOnly}
                    isSleeping={isSleeping}
                    onUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                    onDelete={() => handleDeleteTask(task.id)}
                    onEdit={() => setEditingTask(task)}
                    onStartTimer={() => handleStartTimer(task)}
                    onMarkDone={() => handleMarkDone(task)}
                    onStopStale={() => handleStopStale(task)}
                    onCopyTask={() => setCopyingTask(task)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Completed tasks */}
            {tasks.some(t => t.is_complete) && (
              <>
                <div className={`flex items-center gap-2 pt-1 ${isSleeping ? 'text-slate-600' : 'text-stone-300'}`}>
                  <div className="flex-1 h-px bg-current" />
                  <span className={`text-xs font-medium ${isSleeping ? 'text-slate-500' : 'text-stone-400'}`}>Completed</span>
                  <div className="flex-1 h-px bg-current" />
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCompletedDragEnd}>
                  <SortableContext items={tasks.filter(t => t.is_complete).map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.filter(t => t.is_complete).map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        currentUser={currentUser}
                        isReadOnly={isReadOnly}
                        isSleeping={isSleeping}
                        onUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                        onDelete={() => handleDeleteTask(task.id)}
                        onEdit={() => setEditingTask(task)}
                        onStartTimer={() => handleStartTimer(task)}
                        onMarkDone={() => handleMarkDone(task)}
                        onStopStale={() => handleStopStale(task)}
                    onCopyTask={() => setCopyingTask(task)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </>
            )}
          </>
        )}
      </div>

      {/* Add task button */}
      {isOwner && !isReadOnly && (
        <div className="relative z-10 px-5 pb-5 pt-2">
          <button
            onClick={() => setShowAddModal(true)}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${addBtnClass}`}
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      )}

      {/* Add task modal */}
      {showAddModal && (
        <AddTaskModal
          userId={panelUserId}
          date={selectedDate}
          tabId={activeTabId}
          sortOrder={tasks.filter(t => !t.is_complete).length}
          onClose={() => setShowAddModal(false)}
          onTaskAdded={() => setFetchKey(k => k + 1)}
        />
      )}

      {/* Calendar modal */}
      {showCalendar && (
        <CalendarModal
          selectedDate={selectedDate}
          panelUserId={panelUserId}
          tabId={activeTabId}
          onSelectDate={(date) => { onDateChange(date); setShowCalendar(false) }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Copy task date picker */}
      {copyingTask && (
        <CalendarModal
          selectedDate={selectedDate}
          panelUserId={panelUserId}
          tabId={copyingTask.tab_id}
          onSelectDate={(dateStr) => handleCopyTaskToDate(copyingTask, dateStr)}
          onClose={() => setCopyingTask(null)}
        />
      )}

      {/* Schedule / change tab end date */}
      {schedulingEndTab && (
        <CalendarModal
          selectedDate={schedulingEndTab.ended_at ? schedulingEndTab.ended_at.slice(0, 10) : todayString()}
          panelUserId={panelUserId}
          tabId={schedulingEndTab.id}
          onSelectDate={(dateStr) => { handleEndTerm(schedulingEndTab, dateStr); setSchedulingEndTab(null) }}
          onClose={() => setSchedulingEndTab(null)}
        />
      )}

      {/* SPECCIALS modal */}
      {showSpeccials && (
        <SpeccialsModal
          panelUserId={panelUserId}
          currentUser={currentUser}
          isRiham={isRiham}
          isSleeping={isSleeping}
          onClose={() => setShowSpeccials(false)}
        />
      )}

      {/* Edit task modal */}
      {editingTask && (
        <AddTaskModal
          userId={panelUserId}
          date={selectedDate}
          existingTask={editingTask}
          onClose={() => setEditingTask(null)}
          onTaskAdded={() => { setEditingTask(null); setFetchKey(k => k + 1) }}
        />
      )}

      {/* Copy confirmation toast */}
      {copyToast && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-opacity ${isSleeping ? 'bg-slate-700 text-slate-100' : 'bg-stone-800 text-white'}`}>
          {copyToast}
        </div>
      )}

      {/* Create tab modal */}
      {showCreateTab && (
        <TabModal userId={panelUserId} onClose={() => setShowCreateTab(false)} />
      )}

      {/* Rename tab modal */}
      {editingTab && (
        <TabModal userId={panelUserId} existingTab={editingTab} onClose={() => setEditingTab(null)} />
      )}

      {/* Delete tab confirmation */}
      {confirmingDeleteTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-4">
            <h2 className="font-semibold text-stone-800">Delete "{confirmingDeleteTab.name}"?</h2>
            <p className="text-sm text-stone-500">This permanently deletes the tab and all of its tasks. This can't be undone.</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmingDeleteTab(null)}
                className="flex-1 rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleDeleteTab(confirmingDeleteTab); setConfirmingDeleteTab(null) }}
                className="flex-1 rounded-lg py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
