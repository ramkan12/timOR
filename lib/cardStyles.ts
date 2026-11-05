import type { CSSProperties } from 'react'
import { CardStyle } from '@/types'
import { PaletteSeason, getPaletteSeason } from '@/lib/season'

export interface PaletteColor {
  name: string
  hex: string
}

// Card colors rotate with the seasons (dates in getPaletteSeason). Saved looks store a
// slot ('slot-2'), not a hex. The same index is the same color family in every season,
// so on the solstice a fall Rust card becomes winter Berry, Amber becomes Frosted Gold, etc.
// Seasons without a color in a family use their light neutral in that slot.
//
//   #  family            fall              winter         spring              summer
//   0  red               Rust              Berry          Pastel Watermelon   Raspberry
//   1  orange / brown    Burnt Orange      Branch         Misty Rose          Topaz
//   2  gold / yellow     Amber             Frosted Gold   Soft Muted Yellow   Deep Champagne
//   3  green / olive     Olive Gold        Muddy Olive    Spring Bud          Medium Sea Green
//   4  teal              Deep Teal         Pine           Pale Turquoise      Dark Sky Blue
//   5  blue              Midnight Indigo   Mist           Periwinkle Mist     Antique White (neutral)
//   6  accent            Plum              Snowflake (n)  Light Yellow (n)    Tulip
export const SEASON_PALETTES: Record<PaletteSeason, PaletteColor[]> = {
  fall: [
    { name: 'Rust', hex: '#8C1C04' },            // 0 red
    { name: 'Burnt Orange', hex: '#BF5B05' },    // 1 orange
    { name: 'Amber', hex: '#BF7F04' },           // 2 gold
    { name: 'Olive Gold', hex: '#92780A' },      // 3 green
    { name: 'Deep Teal', hex: '#0D5C68' },       // 4 teal
    { name: 'Midnight Indigo', hex: '#283D5E' }, // 5 blue
    { name: 'Plum', hex: '#46204C' },            // 6 accent
  ],
  winter: [
    { name: 'Berry', hex: '#6B212C' },           // 0 red
    { name: 'Branch', hex: '#685652' },          // 1 brown
    { name: 'Frosted Gold', hex: '#C5A059' },    // 2 gold
    { name: 'Muddy Olive', hex: '#404923' },     // 3 green
    { name: 'Pine', hex: '#27363F' },            // 4 teal
    { name: 'Mist', hex: '#8EA1AE' },            // 5 blue
    { name: 'Snowflake', hex: '#DCE0E8' },       // 6 accent (neutral)
  ],
  spring: [
    { name: 'Pastel Watermelon', hex: '#FF8C8C' }, // 0 red
    { name: 'Misty Rose', hex: '#FDE4DE' },        // 1 orange (peach)
    { name: 'Soft Muted Yellow', hex: '#F0EDAA' }, // 2 yellow
    { name: 'Spring Bud', hex: '#D1DD93' },        // 3 green
    { name: 'Pale Turquoise', hex: '#BDEEED' },    // 4 teal
    { name: 'Periwinkle Mist', hex: '#C2D5F4' },   // 5 blue
    { name: 'Light Yellow', hex: '#FEFFE2' },      // 6 accent (neutral)
  ],
  summer: [
    { name: 'Raspberry', hex: '#C2457A' },         // 0 red
    { name: 'Topaz', hex: '#FFC86D' },             // 1 orange
    { name: 'Deep Champagne', hex: '#FBDBA2' },    // 2 gold
    { name: 'Medium Sea Green', hex: '#52B788' },  // 3 green
    { name: 'Dark Sky Blue', hex: '#85CBD9' },     // 4 teal
    { name: 'Antique White', hex: '#F6EADB' },     // 5 blue (neutral)
    { name: 'Tulip', hex: '#FC8585' },             // 6 accent
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
  lavender: 3, mint: 2, peach: 1, butter: 0, lilac: 6, teal: 2, coral: 0, sage: 1,
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
