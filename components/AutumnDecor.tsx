'use client'

import { isAutumn } from '@/lib/season'

// ── Falling leaves ────────────────────────────────────────────────────────────
interface Leaf {
  emoji: string
  left: string
  size: string
  duration: number // seconds for one fall
  delay: number    // negative = already mid-fall on first paint
}

const PANEL_LEAVES: Leaf[] = [
  { emoji: '🍁', left: '14%', size: 'text-lg', duration: 16, delay: -3 },
  { emoji: '🍂', left: '46%', size: 'text-base', duration: 21, delay: -11 },
  { emoji: '🍁', left: '78%', size: 'text-sm', duration: 18, delay: -7 },
  { emoji: '🍂', left: '62%', size: 'text-lg', duration: 24, delay: -17 },
]

const LANDING_LEAVES: Leaf[] = [
  { emoji: '🍁', left: '6%', size: 'text-3xl', duration: 17, delay: -2 },
  { emoji: '🍂', left: '18%', size: 'text-2xl', duration: 22, delay: -12 },
  { emoji: '🍁', left: '31%', size: 'text-xl', duration: 19, delay: -6 },
  { emoji: '🍂', left: '68%', size: 'text-2xl', duration: 20, delay: -15 },
  { emoji: '🍁', left: '82%', size: 'text-3xl', duration: 25, delay: -4 },
  { emoji: '🍂', left: '93%', size: 'text-xl', duration: 18, delay: -9 },
  { emoji: '🌰', left: '50%', size: 'text-lg', duration: 23, delay: -19 },
]

function FallingLeaves({ leaves }: { leaves: Leaf[] }) {
  return (
    <>
      {leaves.map((l, i) => (
        <span
          key={i}
          className={`absolute top-0 ${l.size}`}
          style={{ left: l.left, animation: `leaf-fall ${l.duration}s linear ${l.delay}s infinite` }}
        >
          {l.emoji}
        </span>
      ))}
    </>
  )
}

// ── Leaf wreath (landing logo) ────────────────────────────────────────────────
// Emoji leaves placed around an ellipse, with little berry dots between them.
const WREATH_EMOJI = ['🍁', '🍂', '🌰', '🍁', '🍂', '🍁', '🌰', '🍂']
const WREATH_COUNT = 16

export function LeafWreath() {
  if (!isAutumn()) return null
  const items = Array.from({ length: WREATH_COUNT }, (_, i) => {
    const a = (i / WREATH_COUNT) * Math.PI * 2
    return { x: 50 + Math.cos(a) * 46, y: 50 + Math.sin(a) * 44, rot: (a * 180) / Math.PI + 90, i, a }
  }).filter(({ a }) => Math.sin(a) < 0.55) // open at the bottom so it never covers the tagline
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[8.5rem] w-[18rem] -translate-x-1/2 -translate-y-[58%] select-none">
      {items.map(({ x, y, rot, i }) => (
        <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
          {i % 2 === 0
            ? <span className="inline-block text-lg opacity-90" style={{ transform: `rotate(${rot}deg)` }}>{WREATH_EMOJI[(i / 2) % WREATH_EMOJI.length]}</span>
            : <span className="block h-1.5 w-1.5 rounded-full bg-red-400/80 shadow-[4px_3px_0_0_rgba(248,113,113,0.6)]" />}
        </span>
      ))}
    </div>
  )
}

// Background decoration layer. Renders nothing outside the autumn season.
export default function AutumnDecor({ variant, isSleeping = false }: { variant: 'landing' | 'panel'; isSleeping?: boolean }) {
  if (!isAutumn()) return null
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${isSleeping ? 'opacity-70' : ''}`}>
      <FallingLeaves leaves={variant === 'landing' ? LANDING_LEAVES : PANEL_LEAVES} />
    </div>
  )
}
