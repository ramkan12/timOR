import type { CSSProperties } from 'react'

// Starry-sky overlay used for sleep mode (panels, and the landing page when both are asleep).
export const STARS_STYLE: CSSProperties = {
  backgroundImage: [
    'radial-gradient(1px 1px at 12% 8%, rgba(255,255,255,0.9) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 28% 5%, rgba(255,255,255,0.7) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 45% 12%, rgba(255,255,255,0.8) 0%, transparent 100%)',
    'radial-gradient(2px 2px at 67% 7%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 82% 15%, rgba(255,255,255,0.9) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 8% 25%, rgba(255,255,255,0.5) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 55% 20%, rgba(255,255,255,0.7) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 91% 30%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(2px 2px at 35% 35%, rgba(255,255,255,0.4) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 73% 28%, rgba(255,255,255,0.8) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 20% 45%, rgba(255,255,255,0.5) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 88% 50%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 50% 55%, rgba(255,255,255,0.4) 0%, transparent 100%)',
    'radial-gradient(2px 2px at 5% 60%, rgba(255,255,255,0.7) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 95% 18%, rgba(255,255,255,0.5) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 62% 42%, rgba(255,255,255,0.6) 0%, transparent 100%)',
    'radial-gradient(1.5px 1.5px at 15% 70%, rgba(255,255,255,0.4) 0%, transparent 100%)',
    'radial-gradient(1px 1px at 78% 65%, rgba(255,255,255,0.5) 0%, transparent 100%)',
  ].join(', '),
}
