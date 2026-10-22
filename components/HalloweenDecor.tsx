'use client'

import { isHalloween } from '@/lib/season'

// ── Cobweb ────────────────────────────────────────────────────────────────────
// A corner web drawn from (0,0): radial threads plus sagging rings between them.
// Threads kept off the 0°/90° edges so rounded corners stay round
const WEB_ANGLES = [8, 26.5, 45, 63.5, 82].map(a => (a * Math.PI) / 180)
const WEB_RINGS = [18, 34, 50, 66]
const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`
const WEB_PATH = [
  ...WEB_ANGLES.map(a => `M0 0 L${pt(80, a)}`),
  ...WEB_RINGS.map(r =>
    WEB_ANGLES.slice(1).map((a, i) => {
      const prev = WEB_ANGLES[i]
      return `M${pt(r, prev)} Q${pt(r * 0.82, (prev + a) / 2)} ${pt(r, a)}`
    }).join(' ')
  ),
].join(' ')

function Cobweb({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={`absolute h-20 w-20 ${className}`} fill="none" stroke="currentColor" strokeWidth={0.8}>
      <path d={WEB_PATH} />
    </svg>
  )
}

export function CornerWebs({ isSleeping = false }: { isSleeping?: boolean }) {
  if (!isHalloween()) return null
  const tone = isSleeping ? 'text-slate-300/25' : 'text-stone-400/45'
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${tone}`}>
      <Cobweb className="top-0 left-0" />
      <Cobweb className="top-0 right-0 -scale-x-100" />
    </div>
  )
}

// ── Floating critters ─────────────────────────────────────────────────────────
interface Critter {
  emoji: string
  pos: string    // Tailwind position classes
  size: string
  anim: string   // arbitrary animation value
}

const PANEL_AWAKE: Critter[] = [
  { emoji: '🦇', pos: 'top-[18%] left-[12%]', size: 'text-lg', anim: 'animate-[bat-flit_14s_ease-in-out_infinite]' },
  { emoji: '👻', pos: 'bottom-[10%] right-[8%]', size: 'text-2xl', anim: 'animate-[ghost-float_6s_ease-in-out_infinite]' },
  { emoji: '🎃', pos: 'bottom-[4%] left-[6%]', size: 'text-xl', anim: 'opacity-60' },
]

const PANEL_ASLEEP: Critter[] = [
  { emoji: '🦇', pos: 'top-[10%] left-[10%]', size: 'text-lg', anim: 'animate-[bat-flit_12s_ease-in-out_infinite]' },
  { emoji: '🦇', pos: 'top-[22%] left-[48%]', size: 'text-sm', anim: 'animate-[bat-flit_16s_ease-in-out_infinite_reverse]' },
  { emoji: '🦇', pos: 'top-[6%] right-[30%]', size: 'text-base', anim: 'animate-[bat-flit_19s_ease-in-out_infinite]' },
  { emoji: '👻', pos: 'bottom-[12%] right-[10%]', size: 'text-2xl', anim: 'animate-[ghost-float_7s_ease-in-out_infinite]' },
]

const LANDING: Critter[] = [
  { emoji: '🦇', pos: 'top-[12%] left-[14%]', size: 'text-3xl', anim: 'animate-[bat-flit_14s_ease-in-out_infinite]' },
  { emoji: '🦇', pos: 'top-[20%] right-[18%]', size: 'text-xl', anim: 'animate-[bat-flit_18s_ease-in-out_infinite_reverse]' },
  { emoji: '🦇', pos: 'top-[8%] left-[52%]', size: 'text-lg', anim: 'animate-[bat-flit_22s_ease-in-out_infinite]' },
  { emoji: '👻', pos: 'bottom-[14%] left-[12%]', size: 'text-4xl', anim: 'animate-[ghost-float_6s_ease-in-out_infinite]' },
  { emoji: '👻', pos: 'bottom-[22%] right-[12%]', size: 'text-2xl', anim: 'animate-[ghost-float_8s_ease-in-out_infinite]' },
  { emoji: '🎃', pos: 'bottom-[6%] right-[26%]', size: 'text-3xl', anim: '' },
  { emoji: '🍬', pos: 'top-[62%] left-[6%]', size: 'text-xl', anim: 'animate-[ghost-float_9s_ease-in-out_infinite]' },
]

// Background decoration layer. Renders nothing outside the Halloween season.
export default function HalloweenDecor({ variant, isSleeping = false }: { variant: 'landing' | 'panel'; isSleeping?: boolean }) {
  if (!isHalloween()) return null
  const critters = variant === 'landing' ? LANDING : isSleeping ? PANEL_ASLEEP : PANEL_AWAKE

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      {/* Harvest moon at night */}
      {isSleeping && (
        <div className={`absolute rounded-full bg-amber-100 shadow-[0_0_40px_14px_rgba(254,243,199,0.28)] ${variant === 'landing' ? 'top-[9%] right-[14%] h-16 w-16' : 'top-6 right-8 h-12 w-12'}`}>
          <div className="absolute top-2.5 left-3 h-2.5 w-2.5 rounded-full bg-amber-200/80" />
          <div className="absolute bottom-3 right-2.5 h-2 w-2 rounded-full bg-amber-200/70" />
        </div>
      )}
      {critters.map((c, i) => (
        <span key={i} className={`absolute ${c.pos} ${c.size}`}>
          <span className={`inline-block ${c.anim} ${variant === 'panel' && !isSleeping ? 'opacity-70' : 'opacity-80'}`}>{c.emoji}</span>
        </span>
      ))}
      {variant === 'panel' && <CornerWebs isSleeping={isSleeping} />}
    </div>
  )
}
