'use client'

import { useEffect, useState } from 'react'

import { Bot, CodeXml, Heart, LogOut, Moon, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { User, UserId } from '@/types'
import { todayString } from '@/lib/utils'
import { applySeason, detectSeason, isHalloween } from '@/lib/season'
import HalloweenDecor, { CornerWebs } from '@/components/HalloweenDecor'
import { STARS_STYLE } from '@/lib/nightSky'
import UserPanel from '@/components/UserPanel'
import SleepBar, { SleepPill, useSleepUsers } from '@/components/SleepBar'

interface IdentityModalProps {
  onSelect: (user: UserId) => void
  users: Record<UserId, User | null>
  now: Date
  onToggle: (userId: UserId, sleeping: boolean) => void
}

function IdentityModal({ onSelect, users, now, onToggle }: IdentityModalProps) {
  // When both are asleep the whole landing page goes to night mode, like a sleeping panel
  const asleep = !!users.riham?.sleep_status && !!users.omar?.sleep_status

  const people: { id: UserId; name: string; role: string; icon: LucideIcon; tilt: string; card: string; avatar: string; nameText: string; roleText: string; glow: string }[] = [
    {
      id: 'riham', name: 'Rihamie', role: 'Software Engineer', icon: CodeXml, tilt: '-rotate-6',
      card: asleep ? 'from-rose-950/70 to-slate-900/70 border-rose-900/60 hover:border-rose-700/70' : 'from-rose-50 to-rose-100/70 border-rose-200/80 hover:border-rose-300',
      avatar: 'from-rose-400 to-rose-600 shadow-rose-400/40',
      nameText: asleep ? 'text-rose-200' : 'text-rose-700', roleText: 'text-rose-400', glow: asleep ? 'hover:shadow-rose-950/60' : 'hover:shadow-rose-200/70',
    },
    {
      id: 'omar', name: 'Omarie', role: 'Robotics Engineer', icon: Bot, tilt: 'rotate-6',
      card: asleep ? 'from-sky-950/70 to-slate-900/70 border-sky-900/60 hover:border-sky-700/70' : 'from-sky-50 to-sky-100/70 border-sky-200/80 hover:border-sky-300',
      avatar: 'from-sky-400 to-sky-600 shadow-sky-400/40',
      nameText: asleep ? 'text-sky-200' : 'text-sky-700', roleText: 'text-sky-400', glow: asleep ? 'hover:shadow-sky-950/60' : 'hover:shadow-sky-200/70',
    },
  ]

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br ${asleep ? 'from-rose-950 via-indigo-950 to-sky-950' : 'from-rose-50 via-stone-50 to-sky-50'}`}>
      {/* Drifting color blobs + faint dot texture (+ stars at night) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl animate-[blob-float_18s_ease-in-out_infinite] ${asleep ? 'bg-rose-500/15' : 'bg-rose-200/50'}`} />
        <div className={`absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl animate-[blob-float_22s_ease-in-out_infinite_reverse] ${asleep ? 'bg-sky-500/15' : 'bg-sky-200/50'}`} />
        <div className={`absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl ${asleep ? 'bg-indigo-400/10' : 'bg-amber-100/40'}`} />
        {asleep
          ? <div className="absolute inset-0" style={STARS_STYLE} />
          : <div className="absolute inset-0 bg-[radial-gradient(rgb(120_113_108/0.12)_1px,transparent_1px)] [background-size:22px_22px]" />}
      </div>
      <HalloweenDecor variant="landing" isSleeping={asleep} />

      <div className="relative flex min-h-full items-center justify-center px-4 py-10">
        <div className={`relative w-full max-w-md rounded-3xl px-6 py-10 sm:px-10 text-center shadow-2xl ring-1 backdrop-blur-xl transition-colors duration-700 animate-[rise-in_0.6s_ease-out] ${asleep ? 'bg-slate-900/55 shadow-black/40 ring-white/10' : 'bg-white/70 shadow-stone-300/40 ring-white/80'}`}>
          <CornerWebs isSleeping={asleep} />
          {/* Logo */}
          <div className="relative space-y-3">
            <div className="flex items-center justify-center text-rose-400">
              {isHalloween()
                ? <span className="text-3xl leading-none animate-[heartbeat_2.4s_ease-in-out_infinite] drop-shadow-[0_4px_10px_rgba(249,115,22,0.45)]">🎃</span>
                : asleep
                ? <Moon size={28} fill="currentColor" className="text-indigo-200 drop-shadow-[0_0_12px_rgba(199,210,254,0.6)]" />
                : <Heart size={28} fill="currentColor" className="animate-[heartbeat_2.4s_ease-in-out_infinite] drop-shadow-[0_4px_10px_rgba(251,113,133,0.45)]" />}
            </div>
            <h1 className={`flex items-center justify-center gap-1.5 text-5xl font-bold tracking-tight ${asleep ? 'text-slate-100' : 'text-stone-800'}`}>
              <span className="seasonal-heading">tim</span>
              <span className={`flex h-14 w-[4.25rem] items-center justify-center rounded-xl bg-stone-900 shadow-lg shadow-stone-900/20 -rotate-3 ${asleep ? 'ring-1 ring-white/20' : ''}`}>
                <span className="logo-or text-rose-300 text-4xl font-extrabold">OR</span>
              </span>
            </h1>
            <p className={`text-sm ${asleep ? 'text-slate-400' : 'text-stone-500'}`}>Let&apos;s lock in together, loser :)</p>
            <p className={`text-[11px] font-medium uppercase tracking-[0.2em] ${asleep ? 'text-slate-500' : 'text-stone-400'}`}>{format(now, 'EEEE · MMMM d')}</p>
            {asleep && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-indigo-400/20">
                💤 You&apos;re both asleep · sweet dreams
              </p>
            )}
          </div>

          {/* Divider label */}
          <div className={`relative mt-8 mb-4 flex items-center gap-3 ${asleep ? 'text-slate-700' : 'text-stone-300'}`}>
            <div className="h-px flex-1 bg-current" />
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${asleep ? 'text-slate-500' : 'text-stone-400'}`}>Who are you?</p>
            <div className="h-px flex-1 bg-current" />
          </div>

          {/* Person cards */}
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
            {people.map(p => (
              <div
                key={p.id}
                className={`group relative rounded-2xl border bg-gradient-to-br shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${p.card} ${p.glow}`}
              >
                {users[p.id] && (
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <SleepPill user={users[p.id]!} isOwner now={now} onToggle={(s) => onToggle(p.id, s)} compact />
                  </div>
                )}
                <button onClick={() => onSelect(p.id)} className="flex w-full flex-col items-center gap-2 px-4 pt-6 pb-6">
                  {/* Glossy role tile: tilted at rest, straightens on hover */}
                  <span className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg ring-1 ring-inset ring-white/30 transition-transform duration-300 group-hover:rotate-0 group-hover:scale-110 ${p.tilt} ${p.avatar}`}>
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
                    <p.icon size={26} strokeWidth={2.25} className="relative drop-shadow-sm" />
                  </span>
                  <span className={`text-lg font-bold ${p.nameText}`}>{p.name}</span>
                  <span className={`-mt-1.5 text-[11px] ${p.roleText}`}>{p.role}</span>
                </button>
              </div>
            ))}
          </div>

          <p className={`relative mt-8 text-xs ${asleep ? 'text-slate-500' : 'text-stone-400'}`}>Your choice is saved in this browser.</p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserId | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayString())
  const { users: sleepUsers, now: sleepNow, handleToggle: handleSleepToggle } = useSleepUsers()

  useEffect(() => {
    const saved = sessionStorage.getItem('timor_user') as UserId | null
    if (saved === 'riham' || saved === 'omar') setCurrentUser(saved)
    applySeason(detectSeason()) // before first render, so the theme never flashes
    setHydrated(true)
  }, [])

  function handleIdentitySelect(user: UserId) {
    sessionStorage.setItem('timor_user', user)
    setCurrentUser(user)
  }

  if (!hydrated) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-stone-200 bg-white">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors flex-1"
          title="Refresh"
        >
          {isHalloween()
            ? <span className="text-xl leading-none">🎃</span>
            : <Heart size={22} className="text-rose-400" fill="currentColor" />}
          <div className="flex items-center gap-0.5">
            <span className="seasonal-heading text-xl font-bold text-stone-700 tracking-tight">tim</span>
            <div className="w-8 h-6 rounded-md bg-stone-900 flex items-center justify-center flex-shrink-0">
              <span className="logo-or text-rose-300 text-base font-extrabold">OR</span>
            </div>
          </div>
        </button>

        <SleepBar currentUser={currentUser} users={sleepUsers} now={sleepNow} onToggle={handleSleepToggle} />

        <div className="flex-1 flex items-center justify-end gap-2">
          {currentUser && (
            <>
              <span className={`text-xs font-semibold hidden sm:inline ${currentUser === 'riham' ? 'text-rose-600' : 'text-sky-600'}`}>
                {currentUser === 'riham' ? 'Rihamie' : 'Omarie'}
              </span>
              <button
                onClick={() => { sessionStorage.removeItem('timor_user'); setCurrentUser(null) }}
                title="Exit to main menu"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Split panels */}
      <main className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-stone-200">
        <UserPanel
          panelUserId="riham"
          currentUser={currentUser}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          sleepUser={sleepUsers.riham}
        />
        <UserPanel
          panelUserId="omar"
          currentUser={currentUser}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          sleepUser={sleepUsers.omar}
        />
      </main>

      {!currentUser && (
        <IdentityModal onSelect={handleIdentitySelect} users={sleepUsers} now={sleepNow} onToggle={handleSleepToggle} />
      )}
    </div>
  )
}
