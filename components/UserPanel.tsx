'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Task, User, UserId } from '@/types'
import { todayString, formatDateLabel } from '@/lib/utils'
import TaskCard from './TaskCard'
import ProgressBar from './ProgressBar'
import SleepToggle from './SleepToggle'
import AddTaskModal from './AddTaskModal'

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

export default function UserPanel({ panelUserId, currentUser, selectedDate, onDateChange }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [now, setNow] = useState(Date.now())
  const [fetchKey, setFetchKey] = useState(0)

  const isReadOnly = selectedDate < todayString()
  const isOwner = currentUser === panelUserId
  const isToday = selectedDate === todayString()

  const displayName = panelUserId === 'riham' ? 'Riham' : 'Omar'
  const accentBg = panelUserId === 'riham' ? 'from-rose-50' : 'from-sky-50'
  const addBtnClass = panelUserId === 'riham'
    ? 'bg-rose-500 hover:bg-rose-600 text-white'
    : 'bg-sky-500 hover:bg-sky-600 text-white'

  // Tick every second for live progress bar + task timers
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch tasks
  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', panelUserId)
      .eq('date', selectedDate)
      .order('created_at', { ascending: true })
      .then(({ data }) => setTasks((data as Task[]) ?? []))
  }, [panelUserId, selectedDate, fetchKey])

  // Fetch user row (sleep status)
  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .eq('id', panelUserId)
      .single()
      .then(({ data }) => { if (data) setUser(data as User) })
  }, [panelUserId])

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

  async function handleSleepToggle(sleeping: boolean) {
    const updated = { sleep_status: sleeping, sleep_updated_at: new Date().toISOString() }
    await supabase.from('users').update(updated).eq('id', panelUserId)
    setUser(prev => prev ? { ...prev, ...updated } : prev)
  }

  async function handleDeleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('tasks').delete().eq('id', taskId)
  }

  const estimatedMinutes = tasks.reduce((sum, t) => sum + t.estimated_minutes, 0)

  // Compute actual seconds for the progress bar:
  // - Completed tasks: credit whichever is larger, tracked time or estimated time
  // - Incomplete tasks: just actual tracked + any live elapsed from a running timer
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
    <div className={`flex flex-col h-full bg-gradient-to-b ${accentBg} to-white`}>
      {/* Panel header */}
      <div className="px-5 pt-5 pb-4 border-b border-stone-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-stone-800">{displayName}</h2>
            {isOwner && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">you</span>
            )}
          </div>
          {user && (
            <SleepToggle user={user} currentUser={currentUser} onToggle={handleSleepToggle} />
          )}
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onDateChange(addDays(selectedDate, -1))}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-stone-600">{formatDateLabel(selectedDate)}</span>
          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            disabled={isToday}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <ProgressBar estimatedMinutes={estimatedMinutes} actualSeconds={actualSeconds} />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-stone-400 text-sm">
              {isReadOnly ? 'No tasks recorded for this day.' : 'No tasks yet — add one to get started!'}
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              currentUser={currentUser}
              isReadOnly={isReadOnly}
              onUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
              onDelete={() => handleDeleteTask(task.id)}
              onEdit={() => setEditingTask(task)}
            />
          ))
        )}
      </div>

      {/* Add task button */}
      {isOwner && !isReadOnly && (
        <div className="px-5 pb-5 pt-2">
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
          onClose={() => setShowAddModal(false)}
          onTaskAdded={() => setFetchKey(k => k + 1)}
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
