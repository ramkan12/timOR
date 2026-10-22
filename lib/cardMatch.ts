import { CardStyle } from '@/types'

// Lowercase, strip punctuation, collapse whitespace — the stored title_key / desc_key form.
export function normalizeText(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Descriptions count as "the same card" if they're equal, one contains the other
// ("FINISH neural networks ch 1" vs "neural networks ch 1"), or they share most words.
export function descSimilar(a: string, b: string): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const ta = new Set(a.split(' '))
  const tb = new Set(b.split(' '))
  let shared = 0
  for (const w of ta) if (tb.has(w)) shared++
  if (shared === Math.min(ta.size, tb.size)) return true // every word of one appears in the other
  return shared / (ta.size + tb.size - shared) >= 0.6
}

export function sameCard(titleA: string, descA: string | null, titleB: string, descB: string | null): boolean {
  return normalizeText(titleA) === normalizeText(titleB) && descSimilar(normalizeText(descA), normalizeText(descB))
}

export interface CommonCard {
  title: string
  description: string | null
  estimated_minutes: number
  count: number
  lastSeen: string
}

interface CardSource {
  title: string
  description: string | null
  estimated_minutes: number
  date: string
  created_at: string
}

// Group tasks into "same card" clusters and return the n most frequent.
// Each cluster keeps the newest title/description/estimate as its prefill.
export function topCommonCards(tasks: CardSource[], n = 5): CommonCard[] {
  const sorted = [...tasks].sort((a, b) =>
    b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  )
  const groups: CommonCard[] = []
  for (const t of sorted) {
    const g = groups.find(g => sameCard(g.title, g.description, t.title, t.description))
    if (g) g.count++
    else groups.push({
      title: t.title,
      description: t.description,
      estimated_minutes: t.estimated_minutes,
      count: 1,
      lastSeen: t.date,
    })
  }
  return groups
    .filter(g => g.count > 1)
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, n)
}

// Exact key match first, then a fuzzy "same card" match.
export function findCardStyle(styles: CardStyle[], title: string, description: string | null): CardStyle | undefined {
  const titleKey = normalizeText(title)
  const descKey = normalizeText(description)
  const sameTitle = styles.filter(s => s.title_key === titleKey)
  return sameTitle.find(s => s.desc_key === descKey) ?? sameTitle.find(s => descSimilar(s.desc_key, descKey))
}
