import type { CSSProperties } from 'react'
import { CardStyle } from '@/types'
import { PaletteSeason, getPaletteSeason } from '@/lib/season'

export interface PaletteColor {
  name: string
  hex: string
}

// Card colors rotate with the seasons (dates in getPaletteSeason). Saved looks store a
// slot ('slot-2'), not a hex, so on the solstice every "fall #3" card becomes "winter #3".
export const SEASON_PALETTES: Record<PaletteSeason, PaletteColor[]> = {
  fall: [
    { name: '#92780A', hex: '#92780A' },
    { name: '#BF7F04', hex: '#BF7F04' },
    { name: '#BF5B05', hex: '#BF5B05' },
    { name: '#8C1C04', hex: '#8C1C04' },
    { name: '#3F0E00', hex: '#3F0E00' },
  ],
  winter: [
    { name: 'Berry', hex: '#6B212C' },
    { name: 'Branch', hex: '#685652' },
    { name: 'Snowflake', hex: '#DCE0E8' },
    { name: 'Mist', hex: '#8EA1AE' },
    { name: 'Pine', hex: '#27363F' },
  ],
  spring: [
    { name: 'Menthol', hex: '#D0E69E' },
    { name: 'Pale Spring Bud', hex: '#E0F1BB' },
    { name: 'Light Yellow', hex: '#FEFFE2' },
    { name: 'Misty Rose', hex: '#FDE4DE' },
    { name: 'Pink', hex: '#FFC2C3' },
    { name: 'Baker-Miller Pink', hex: '#FA92B1' },
  ],
  summer: [
    { name: 'Tulip', hex: '#FC8585' },
    { name: 'Topaz', hex: '#FFC86D' },
    { name: 'Deep Champagne', hex: '#FBDBA2' },
    { name: 'Antique White', hex: '#F6EADB' },
    { name: 'Dark Sky Blue', hex: '#85CBD9' },
  ],
}

export const SEASON_LABELS: Record<PaletteSeason, { emoji: string; label: string; endsOn: string }> = {
  fall: { emoji: '🍂', label: 'Fall', endsOn: 'Dec 21' },
  winter: { emoji: '❄️', label: 'Winter', endsOn: 'Mar 21' },
  spring: { emoji: '🌸', label: 'Spring', endsOn: 'Jun 21' },
  summer: { emoji: '☀️', label: 'Summer', endsOn: 'Sep 23' },
}

// `season` defaults to today's; pass the viewed day's season (paletteSeasonForDate) when showing another date.
export function currentPalette(season: PaletteSeason = getPaletteSeason()): PaletteColor[] {
  return SEASON_PALETTES[season]
}

export const slotId = (i: number) => `slot-${i}`

// Looks saved before seasonal palettes used named colors; map them onto slots.
const LEGACY_SLOT: Record<string, number> = {
  lavender: 0, mint: 1, peach: 2, butter: 3, lilac: 4, teal: 1, coral: 3, sage: 2,
}

function slotIndex(colorId: string): number | null {
  const m = /^slot-(\d+)$/.exec(colorId)
  if (m) return Number(m[1])
  return colorId in LEGACY_SLOT ? LEGACY_SLOT[colorId] : null
}

// The palette color a saved color id shows as this season (wraps if the palette is shorter).
export function resolveColor(colorId: string, season?: PaletteSeason): PaletteColor | null {
  const i = slotIndex(colorId)
  if (i === null) return null
  const palette = currentPalette(season)
  return palette[i % palette.length]
}

// Same slot this season, so the picker highlights the right swatch for legacy ids too.
export function normalizeColorId(colorId: string, season?: PaletteSeason): string {
  const i = slotIndex(colorId)
  return i === null ? 'none' : slotId(i % currentPalette(season).length)
}

export interface CardLookChoice {
  color: string
}

export const PLAIN_LOOK: CardLookChoice = { color: 'none' }

export function isPlainLook(look: CardLookChoice | undefined): boolean {
  return !look || resolveColor(look.color) === null
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Soft tint + bold left stripe. Pale colors get a stronger wash (so they're visible) and a
// darkened stripe; text stays the card's normal dark (or light, when sleeping) color.
export function getCardLook(look: CardLookChoice | CardStyle | undefined, isSleeping: boolean, season?: PaletteSeason): { className: string; style: CSSProperties } | null {
  const color = look ? resolveColor(look.color, season) : null
  if (!color) return null
  const lum = luminance(color.hex)
  const pale = lum > 0.8
  const washPct = Math.min(80, Math.round(26 + Math.max(0, lum - 0.45) * 110)) // ~26% dark/mid → ~80% very pale
  const base = isSleeping ? 'rgb(15 23 42)' : 'white'
  const stripe = pale ? `color-mix(in srgb, ${color.hex} 75%, black)` : color.hex
  return {
    className: 'border-l-4',
    style: {
      backgroundColor: `color-mix(in srgb, ${color.hex} ${isSleeping ? Math.min(washPct + 12, 55) : washPct}%, ${base})`,
      borderColor: pale
        ? `color-mix(in srgb, ${color.hex} 55%, rgb(168 162 158))`
        : `color-mix(in srgb, ${color.hex} 40%, ${isSleeping ? 'rgb(51 65 85)' : 'white'})`,
      borderLeftColor: stripe,
    },
  }
}
