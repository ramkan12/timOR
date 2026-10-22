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
