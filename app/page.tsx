'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { UserId } from '@/types'
import { todayString } from '@/lib/utils'
import UserPanel from '@/components/UserPanel'

function IdentityModal({ onSelect }: { onSelect: (user: UserId) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50">
      <div className="text-center space-y-8 px-6">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-rose-400">
            <Heart size={20} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold text-stone-800">timOR</h1>
          <p className="text-stone-500 text-sm max-w-xs mx-auto">
            Let's lock in together, loser :)
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Who are you?</p>
          <div className="flex gap-3">
            <button
              onClick={() => onSelect('riham')}
              className="flex-1 rounded-2xl bg-rose-50 border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-100 transition-all py-5 px-6"
            >
              <p className="font-bold text-rose-700 text-lg">Rihamie</p>
              <p className="text-xs text-rose-400 mt-0.5">Software Engineer</p>
            </button>
            <button
              onClick={() => onSelect('omar')}
              className="flex-1 rounded-2xl bg-sky-50 border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-100 transition-all py-5 px-6"
            >
              <p className="font-bold text-sky-700 text-lg">Omarie</p>
              <p className="text-xs text-sky-400 mt-0.5">Robotics Engineer</p>
            </button>
          </div>
        </div>

        <p className="text-xs text-stone-400">Your choice is saved in this browser.</p>
      </div>
    </div>
  )
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserId | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayString())

  useEffect(() => {
    const saved = sessionStorage.getItem('timor_user') as UserId | null
    if (saved === 'riham' || saved === 'omar') setCurrentUser(saved)
    setHydrated(true)
  }, [])

  function handleIdentitySelect(user: UserId) {
    sessionStorage.setItem('timor_user', user)
    setCurrentUser(user)
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-50">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-white">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors"
          title="Refresh"
        >
          <Heart size={16} className="text-rose-400" fill="currentColor" />
          <span className="font-bold text-stone-700 tracking-tight">timOR</span>
        </button>
        {currentUser && (
          <span className="text-xs text-stone-500">
            Logged in as{' '}
            <span className={`font-semibold ${currentUser === 'riham' ? 'text-rose-600' : 'text-sky-600'}`}>
              {currentUser === 'riham' ? 'Rihamie' : 'Omarie'}
            </span>
            {' · '}
            <button
              onClick={() => { sessionStorage.removeItem('timor_user'); setCurrentUser(null) }}
              className="text-stone-400 hover:text-stone-600 underline transition-colors"
            >
              switch
            </button>
          </span>
        )}
      </header>

      {/* Split panels */}
      <main className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-stone-200">
        <UserPanel
          panelUserId="riham"
          currentUser={currentUser}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
        <UserPanel
          panelUserId="omar"
          currentUser={currentUser}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </main>

      {!currentUser && <IdentityModal onSelect={handleIdentitySelect} />}
    </div>
  )
}
