'use client'

import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User, UserId } from '@/types'
import { formatSleepTimestamp } from '@/lib/utils'

interface Props {
  currentUser: UserId | null
  users: Record<UserId, User | null>
  now: Date
  onToggle: (userId: UserId, sleeping: boolean) => void
}

const USER_IDS: UserId[] = ['riham', 'omar']

export function useSleepUsers() {
  const [users, setUsers] = useState<Record<UserId, User | null>>({ riham: null, omar: null })
  const [fetchKey, setFetchKey] = useState(0)
  const [now, setNow] = useState(new Date())
  const channelId = useRef(`sleep-users-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    supabase.from('users').select('*').in('id', USER_IDS).then(({ data }) => {
      if (!data) return
      setUsers(prev => {
        const next = { ...prev }
        for (const row of data as User[]) next[row.id] = row
        return next
      })
    })
  }, [fetchKey])

  useEffect(() => {
    const interval = setInterval(() => setFetchKey(k => k + 1), 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          const row = payload.new as User
          setUsers(prev => ({ ...prev, [row.id]: row }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [channelId])

  function handleToggle(userId: UserId, sleeping: boolean) {
    const updated = { sleep_status: sleeping, sleep_updated_at: new Date().toISOString() }
    setUsers(prev => (prev[userId] ? { ...prev, [userId]: { ...prev[userId]!, ...updated } } : prev))
    supabase.from('users').update(updated).eq('id', userId).then()
  }

  return { users, now, handleToggle }
}

export function SleepPill({ user, isOwner, now, onToggle, compact = false }: {
  user: User
  isOwner: boolean
  now: Date
  onToggle: (sleeping: boolean) => void
  compact?: boolean
}) {
  const [timeLabel, setTimeLabel] = useState('')
  const isRiham = user.id === 'riham'
  const isSleeping = user.sleep_status

  useEffect(() => {
    setTimeLabel(formatSleepTimestamp(user.sleep_updated_at))
    const interval = setInterval(() => setTimeLabel(formatSleepTimestamp(user.sleep_updated_at)), 30000)
    return () => clearInterval(interval)
  }, [user.sleep_updated_at])

  const hour = now.getHours()
  const isBedtimeWindow = hour >= 23 || hour < 6
  const isWakeWindow = hour >= 8 && hour < 12
  const needsNudge = (isBedtimeWindow && !isSleeping) || (isWakeWindow && isSleeping)

  const awakeColors = isRiham
    ? 'bg-rose-100 text-rose-600 border-rose-200'
    : 'bg-sky-100 text-sky-600 border-sky-200'
  const asleepColors = 'bg-gradient-to-r from-indigo-500 to-slate-700 text-indigo-50 border-indigo-400'

  const title = isOwner
    ? 'Toggle sleep status'
    : `${isRiham ? 'Rihamie' : 'Omarie'}'s sleep status`

  if (compact) {
    return (
      <button
        onClick={() => isOwner && onToggle(!isSleeping)}
        disabled={!isOwner}
        title={title}
        className={`relative flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-500 ${
          isSleeping ? asleepColors : awakeColors
        } ${isOwner ? 'cursor-pointer hover:brightness-95 active:scale-95' : 'cursor-default opacity-90'} ${
          needsNudge ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]' : ''
        }`}
      >
        {isSleeping ? (
          <>
            <Moon size={12} className="relative z-10" fill="currentColor" />
            <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white animate-pulse" />
          </>
        ) : (
          <Sun size={12} />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={() => isOwner && onToggle(!isSleeping)}
      disabled={!isOwner}
      title={title}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-500 ${
        isSleeping ? asleepColors : awakeColors
      } ${isOwner ? 'cursor-pointer hover:brightness-95 active:scale-95' : 'cursor-default opacity-90'} ${
        needsNudge ? 'ring-2 ring-amber-400 animate-pulse shadow-[0_0_10px_2px_rgba(251,191,36,0.6)]' : ''
      }`}
    >
      <span className="relative flex items-center justify-center w-4 h-4">
        {isSleeping ? (
          <>
            <Moon size={14} className="relative z-10" fill="currentColor" />
            <span className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="absolute top-1 -right-1.5 w-[3px] h-[3px] rounded-full bg-white animate-pulse" style={{ animationDelay: '400ms' }} />
          </>
        ) : (
          <Sun size={14} />
        )}
      </span>
      <span className="text-xs font-semibold">{isRiham ? 'Riham' : 'Omar'}</span>
      <span className="text-[10px] opacity-75 hidden sm:inline">
        {timeLabel ? `· ${timeLabel}` : ''}
      </span>
    </button>
  )
}

export default function SleepBar({ currentUser, users, now, onToggle }: Props) {
  return (
    <div className="flex items-center gap-2">
      {USER_IDS.map(id => {
        const user = users[id]
        if (!user) return null
        return (
          <SleepPill
            key={id}
            user={user}
            isOwner={currentUser === id}
            now={now}
            onToggle={(sleeping) => onToggle(id, sleeping)}
          />
        )
      })}
    </div>
  )
}
