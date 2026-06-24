'use client'

import { useEffect, useState } from 'react'
import { Moon } from 'lucide-react'
import { formatSleepTimestamp } from '@/lib/utils'
import { User, UserId } from '@/types'

interface Props {
  user: User
  currentUser: UserId | null
  onToggle: (sleeping: boolean) => void
}

export default function SleepToggle({ user, currentUser, onToggle }: Props) {
  const [timeLabel, setTimeLabel] = useState('')
  const isOwner = currentUser === user.id

  useEffect(() => {
    const update = () => setTimeLabel(formatSleepTimestamp(user.sleep_updated_at))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [user.sleep_updated_at])

  return (
    <div className="flex items-center gap-2">
      <Moon size={14} className={user.sleep_status ? 'text-indigo-500' : 'text-stone-400'} />
      <button
        onClick={() => isOwner && onToggle(!user.sleep_status)}
        disabled={!isOwner}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          user.sleep_status ? 'bg-indigo-400' : 'bg-stone-300'
        } ${!isOwner ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
        title={isOwner ? 'Toggle sleep status' : `${user.id === 'riham' ? 'Rihamie' : 'Omarie'}'s sleep status`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            user.sleep_status ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-xs text-stone-400 hidden sm:inline">
        {user.sleep_status ? 'Sleeping' : 'Awoke'}
        {timeLabel ? ` · ${timeLabel}` : ''}
      </span>
    </div>
  )
}
