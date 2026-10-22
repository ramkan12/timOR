import type { CSSProperties } from 'react'
import { CardStyle } from '@/types'

interface ColorDef {
  id: string
  label: string
  swatch: string   // solid dot used in the picker
  light: string    // card bg + border in normal mode
  dark: string     // card bg + border in sleep mode
  accent: string   // left stripe color
  ink: string      // rgb triplet used to draw patterns
}

// Full literal class strings so Tailwind's scanner keeps them.
export const CARD_COLORS: ColorDef[] = [
  { id: 'none',     label: 'None',     swatch: 'bg-white border border-stone-300', light: '', dark: '', accent: '', ink: '120 113 108' },
  { id: 'lavender', label: 'Lavender', swatch: 'bg-violet-300',  light: 'bg-violet-50 border-violet-200',   dark: 'bg-violet-950/60 border-violet-800',   accent: 'border-l-violet-400',  ink: '139 92 246' },
  { id: 'mint',     label: 'Mint',     swatch: 'bg-emerald-300', light: 'bg-emerald-50 border-emerald-200', dark: 'bg-emerald-950/60 border-emerald-800', accent: 'border-l-emerald-400', ink: '16 185 129' },
  { id: 'peach',    label: 'Peach',    swatch: 'bg-orange-300',  light: 'bg-orange-50 border-orange-200',   dark: 'bg-orange-950/60 border-orange-800',   accent: 'border-l-orange-400',  ink: '249 115 22' },
  { id: 'butter',   label: 'Butter',   swatch: 'bg-amber-200',   light: 'bg-amber-50 border-amber-200',     dark: 'bg-amber-950/60 border-amber-800',     accent: 'border-l-amber-300',   ink: '245 158 11' },
  { id: 'lilac',    label: 'Lilac',    swatch: 'bg-fuchsia-300', light: 'bg-fuchsia-50 border-fuchsia-200', dark: 'bg-fuchsia-950/60 border-fuchsia-800', accent: 'border-l-fuchsia-400', ink: '217 70 239' },
  { id: 'teal',     label: 'Teal',     swatch: 'bg-teal-300',    light: 'bg-teal-50 border-teal-200',       dark: 'bg-teal-950/60 border-teal-800',       accent: 'border-l-teal-400',    ink: '20 184 166' },
  { id: 'coral',    label: 'Coral',    swatch: 'bg-red-300',     light: 'bg-red-50 border-red-200',         dark: 'bg-red-950/60 border-red-800',         accent: 'border-l-red-400',     ink: '239 68 68' },
  { id: 'sage',     label: 'Sage',     swatch: 'bg-lime-300',    light: 'bg-lime-50 border-lime-200',       dark: 'bg-lime-950/60 border-lime-800',       accent: 'border-l-lime-400',    ink: '132 204 22' },
]

export const CARD_PATTERNS = [
  { id: 'plain',    label: 'Plain' },
  { id: 'dots',     label: 'Dots' },
  { id: 'stripes',  label: 'Stripes' },
  { id: 'grid',     label: 'Grid' },
  { id: 'gradient', label: 'Glow' },
] as const

export interface CardLookChoice {
  color: string
  pattern: string
}

export const PLAIN_LOOK: CardLookChoice = { color: 'none', pattern: 'plain' }

export function isPlainLook(look: CardLookChoice | undefined): boolean {
  return !look || (look.color === 'none' && look.pattern === 'plain')
}

function patternStyle(pattern: string, ink: string, isSleeping: boolean): CSSProperties {
  const a = isSleeping ? 0.22 : 0.16
  const c = `rgb(${ink} / ${a})`
  switch (pattern) {
    case 'dots':
      return { backgroundImage: `radial-gradient(${c} 1.2px, transparent 1.4px)`, backgroundSize: '12px 12px' }
    case 'stripes':
      return { backgroundImage: `repeating-linear-gradient(135deg, ${c} 0 2px, transparent 2px 10px)` }
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
        backgroundSize: '14px 14px',
      }
    case 'gradient':
      return { backgroundImage: `linear-gradient(120deg, rgb(${ink} / ${a * 2}), transparent 70%)` }
    default:
      return {}
  }
}

// Classes + inline style for a card with a saved look. Returns null for plain cards
// so TaskCard keeps its default styling.
export function getCardLook(look: CardLookChoice | CardStyle | undefined, isSleeping: boolean): { className: string; style: CSSProperties } | null {
  if (!look || isPlainLook(look)) return null
  const color = CARD_COLORS.find(c => c.id === look.color) ?? CARD_COLORS[0]
  const hasColor = color.id !== 'none'
  const className = hasColor
    ? `${isSleeping ? color.dark : color.light} border-l-4 ${color.accent}`
    : isSleeping ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-stone-200'
  return { className, style: patternStyle(look.pattern, color.ink, isSleeping) }
}
