// Seasonal theming. The active season is stamped on <html data-season="..."> once at
// startup (see app/page.tsx); globals.css remaps colors from it and components read it
// through isHalloween().

export type Season = 'halloween' | null

const OVERRIDE_KEY = 'timor_season'

// Halloween runs all of October. `?season=halloween` / `?season=off` overrides the
// calendar for previews and sticks for the rest of the tab session.
export function detectSeason(): Season {
  const param = new URLSearchParams(window.location.search).get('season')
  try {
    if (param === 'halloween' || param === 'off') sessionStorage.setItem(OVERRIDE_KEY, param)
    const override = sessionStorage.getItem(OVERRIDE_KEY)
    if (override === 'halloween') return 'halloween'
    if (override === 'off') return null
  } catch {}
  return new Date().getMonth() === 9 ? 'halloween' : null
}

export function applySeason(season: Season) {
  if (season) document.documentElement.dataset.season = season
  else delete document.documentElement.dataset.season
}

export function isHalloween(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.season === 'halloween'
}

// ── Card-color palettes follow the astronomical seasons ──────────────────────
export type PaletteSeason = 'spring' | 'summer' | 'fall' | 'winter'

const PALETTE_KEY = 'timor_palette'
const PALETTE_SEASONS: PaletteSeason[] = ['spring', 'summer', 'fall', 'winter']

// Spring Mar 21–Jun 20 · Summer Jun 21–Sep 22 · Fall Sep 23–Dec 20 · Winter Dec 21–Mar 20.
// `?palette=winter` (etc.) previews another season for the rest of the tab session.
export function getPaletteSeason(date = new Date()): PaletteSeason {
  if (typeof window !== 'undefined') {
    try {
      const param = new URLSearchParams(window.location.search).get('palette') as PaletteSeason | null
      if (param && PALETTE_SEASONS.includes(param)) sessionStorage.setItem(PALETTE_KEY, param)
      const override = sessionStorage.getItem(PALETTE_KEY) as PaletteSeason | null
      if (override && PALETTE_SEASONS.includes(override)) return override
    } catch {}
  }
  const md = (date.getMonth() + 1) * 100 + date.getDate() // e.g. Dec 21 → 1221
  if (md >= 1221 || md < 321) return 'winter'
  if (md < 621) return 'spring'
  if (md < 923) return 'summer'
  return 'fall'
}

// Season for a viewed day ('YYYY-MM-DD'), so browsing ahead to Dec 31 shows winter colors.
export function paletteSeasonForDate(dateStr: string): PaletteSeason {
  const [y, m, d] = dateStr.split('-').map(Number)
  return getPaletteSeason(new Date(y, m - 1, d))
}
