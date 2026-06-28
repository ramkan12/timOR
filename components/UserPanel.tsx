'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react'
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { supabase } from '@/lib/supabase'
import { Task, User, UserId } from '@/types'
import { todayString, formatDateLabel, getElapsedSeconds, endOfDayMs } from '@/lib/utils'
import TaskCard from './TaskCard'
import ProgressBar from './ProgressBar'
import SleepToggle from './SleepToggle'
import AddTaskModal from './AddTaskModal'
import CalendarModal from './CalendarModal'
import NoteWidget from './NoteWidget'
import SpeccialsModal from './SpeccialsModal'

interface Props {
  panelUserId: UserId
  currentUser: UserId | null
  selectedDate: string
  onDateChange: (date: string) => void
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

export default function UserPanel({ panelUserId, currentUser, selectedDate, onDateChange }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showSpeccials, setShowSpeccials] = useState(false)
  const [movingTask, setMovingTask] = useState<Task | null>(null)
  const [now, setNow] = useState(Date.now())
  const [fetchKey, setFetchKey] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const isReadOnly = selectedDate < todayString()
  const isOwner = currentUser === panelUserId
  const isToday = selectedDate === todayString()
  const isSleeping = user?.sleep_status ?? false
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

  // On mount: auto-stop any timers that ran past their day boundary (6am of the following day)
  useEffect(() => {
    const today = todayString()
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', panelUserId)
      .not('timer_started_at', 'is', null)
      .lt('date', today)
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

  // Fetch tasks
  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', panelUserId)
      .eq('date', selectedDate)
      .order('is_complete', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => { if (!error && data) setTasks(data as Task[]) })
  }, [panelUserId, selectedDate, fetchKey])

  // Fetch user row (sleep status, note)
  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .eq('id', panelUserId)
      .single()
      .then(({ data }) => { if (data) setUser(data as User) })
  }, [panelUserId, fetchKey])

  // Real-time: tasks
  useEffect(() => {
    const channel = supabase
      .channel(`tasks-${panelUserId}-${selectedDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${panelUserId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as Task
            if (t.date === selectedDate) setTasks(prev => [...prev, t])
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Task) : t))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as Task).id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [panelUserId, selectedDate])

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

  async function handleNoteReact(emoji: string | null) {
    if (!currentUser || currentUser === panelUserId) return
    const updated = { note_reaction: emoji, note_reaction_by: emoji ? currentUser : null }
    setUser(u => u ? { ...u, ...updated } : u)
    await supabase.from('users').update(updated).eq('id', panelUserId)
  }

  async function handleSleepToggle(sleeping: boolean) {
    const updated = { sleep_status: sleeping, sleep_updated_at: new Date().toISOString() }
    await supabase.from('users').update(updated).eq('id', panelUserId)
    setUser(prev => prev ? { ...prev, ...updated } : prev)
  }

  async function handleNoteSave(text: string | null) {
    const isNewText = text !== user?.note
    const updated = {
      note: text,
      note_created_at: text ? new Date().toISOString() : null,
      ...(isNewText ? { note_reaction: null, note_reaction_by: null } : {}),
    }
    const prev = user
    setUser(u => u ? { ...u, ...updated } : u)
    const { error } = await supabase.from('users').update(updated).eq('id', panelUserId)
    if (error) setUser(prev)
  }

  async function handleStopStale(task: Task) {
    const cap = endOfDayMs(task.date)
    const elapsed = Math.max(0, Math.floor((Math.min(Date.now(), cap) - new Date(task.timer_started_at!).getTime()) / 1000))
    const updated: Task = { ...task, timer_started_at: null, actual_seconds: task.actual_seconds + elapsed }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    await supabase.from('tasks').update({ timer_started_at: null, actual_seconds: updated.actual_seconds }).eq('id', task.id)
  }

  async function handleMoveTaskToDate(task: Task, dateStr: string) {
    setMovingTask(null)
    const elapsed = task.timer_started_at
      ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
      : 0
    setTasks(prev => prev.filter(t => t.id !== task.id))
    await supabase.from('tasks').update({
      date: dateStr,
      sort_order: 0,
      timer_started_at: null,
      actual_seconds: task.actual_seconds + elapsed,
    }).eq('id', task.id)
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
    const runningTask = tasks.find(t => t.id !== taskToStart.id && !!t.timer_started_at)
    if (runningTask) {
      const elapsed = Math.floor((Date.now() - new Date(runningTask.timer_started_at!).getTime()) / 1000)
      const stopped: Task = { ...runningTask, actual_seconds: runningTask.actual_seconds + elapsed, timer_started_at: null }
      setTasks(prev => prev.map(t => t.id === stopped.id ? stopped : t))
      await supabase.from('tasks').update({ actual_seconds: stopped.actual_seconds, timer_started_at: null }).eq('id', runningTask.id)
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
            {user && (
              <SleepToggle user={user} currentUser={currentUser} onToggle={handleSleepToggle} />
            )}
          </div>
        </div>

        {/* Note widget */}
        {user && (
          <NoteWidget user={user} isOwner={isOwner} isSleeping={isSleeping} onSave={handleNoteSave} onReact={handleNoteReact} />
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

        <ProgressBar estimatedMinutes={estimatedMinutes} actualSeconds={actualSeconds} isSleeping={isSleeping} isRiham={isRiham} />
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
                    onMoveTask={() => setMovingTask(task)}
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
                    onMoveTask={() => setMovingTask(task)}
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
          sortOrder={tasks.filter(t => !t.is_complete).length}
          onClose={() => setShowAddModal(false)}
          onTaskAdded={() => setFetchKey(k => k + 1)}
        />
      )}

      {/* Calendar modal */}
      {showCalendar && (
        <CalendarModal
          selectedDate={selectedDate}
          onSelectDate={(date) => { onDateChange(date); setShowCalendar(false) }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Move task date picker */}
      {movingTask && (
        <CalendarModal
          selectedDate={selectedDate}
          onSelectDate={(dateStr) => handleMoveTaskToDate(movingTask, dateStr)}
          onClose={() => setMovingTask(null)}
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
    </div>
  )
}
