'use client'

import { GOAL_MINUTES, secondsToDisplay } from '@/lib/utils'
import { isAutumn, isHalloween } from '@/lib/season'

// Diagonal candy-corn bands laid over the fill; the identity/milestone color shows through.
// Autumn: the fill is a pumpkin — orange skin, darker vertical ribs, a soft top highlight
const PUMPKIN: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(to bottom, rgb(255 255 255 / 0.35), transparent 45%, rgb(124 45 18 / 0.25))',
    'repeating-linear-gradient(90deg, transparent 0 11px, rgb(154 52 18 / 0.45) 11px 13px)',
    'linear-gradient(90deg, #fb923c, #ea580c)',
  ].join(', '),
}
const CANDY_CORN: React.CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(-45deg, rgb(253 224 71 / 0.55) 0 6px, rgb(251 146 60 / 0.45) 6px 12px, rgb(255 255 255 / 0.55) 12px 18px)',
}

interface Props {
  estimatedMinutes: number
  actualSeconds: number
  isSleeping?: boolean
  isRiham?: boolean
  goalMinutes?: number
  compact?: boolean
}

export default function ProgressBar({ estimatedMinutes, actualSeconds, isSleeping, isRiham = true, goalMinutes = GOAL_MINUTES, compact = false }: Props) {
  const goalSeconds = goalMinutes * 60
  const actualPct = Math.min((actualSeconds / goalSeconds) * 100, 100)
  const estimatedPct = Math.min((estimatedMinutes / goalMinutes) * 100, 100)
  const goalReached = actualSeconds >= goalSeconds

  const barColor = goalReached
    ? 'bg-emerald-500'
    : actualSeconds >= goalSeconds * 0.75
    ? 'bg-amber-400'
    : isRiham ? 'bg-rose-300' : 'bg-sky-400'

  const halloween = isHalloween()
  const autumn = isAutumn()
  // Pumpkin skin replaces the identity color in autumn; emerald still marks the goal
  const pumpkin = autumn && !goalReached
  const overlay = halloween ? CANDY_CORN : pumpkin ? PUMPKIN : null
  const marker = halloween ? '🎃' : autumn ? '🥧' : null

  return (
    <div className={compact ? '' : 'space-y-1.5'}>
      <div className="flex items-center gap-1.5">
      <div className="relative w-full">
      <div className={`relative w-full rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-3'} ${isSleeping ? 'bg-slate-700' : 'bg-stone-200'}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isSleeping ? 'bg-slate-600' : 'bg-stone-300'}`}
          style={{ width: `${estimatedPct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${actualPct}%`, ...(overlay ?? {}) }}
        />
      </div>
      {/* Pumpkin stem + leaf riding the leading edge of the fill */}
      {pumpkin && !compact && actualPct > 2 && (
        <span aria-hidden className="pointer-events-none absolute -top-[7px] transition-all duration-300" style={{ left: `calc(${actualPct}% - 9px)` }}>
          <span className="absolute left-0 top-0 h-[9px] w-[4px] -rotate-12 rounded-sm bg-green-800" />
          <span className="absolute left-[3px] top-[-1px] h-[6px] w-[9px] rotate-[-28deg] rounded-[60%_0_60%_0] bg-lime-500" />
        </span>
      )}
      </div>
      {/* Jack-o-lantern goal marker: unlit until the goal is reached */}
      {marker && !compact && (
        <span
          title={goalReached ? 'Goal reached!' : halloween ? 'Light the pumpkin: reach your goal' : 'Bake the pie: reach your goal'}
          className={`flex-shrink-0 text-base leading-none transition-all duration-500 ${goalReached ? 'animate-[pumpkin-bounce_1.6s_ease-in-out_infinite] drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]' : 'grayscale opacity-40'}`}
        >
          {marker}
        </span>
      )}
      </div>
      {!compact && (
        <div className={`flex items-center justify-between text-xs ${isSleeping ? 'text-slate-400' : 'text-stone-500'}`}>
          <span className={`font-medium tabular-nums ${isSleeping ? 'text-slate-200' : 'text-stone-700'}`}>
            {secondsToDisplay(actualSeconds)}
            <span className={`font-normal ${isSleeping ? 'text-slate-400' : 'text-stone-400'}`}> / </span>
            {secondsToDisplay(estimatedMinutes * 60)}
          </span>
          {goalReached && <span className="text-emerald-400 font-semibold">7h reached!</span>}
        </div>
      )}
    </div>
  )
}
