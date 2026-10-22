'use client'

import { GOAL_MINUTES, secondsToDisplay } from '@/lib/utils'
import { isHalloween } from '@/lib/season'

// Diagonal candy-corn bands laid over the fill; the identity/milestone color shows through.
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

  return (
    <div className={compact ? '' : 'space-y-1.5'}>
      <div className="flex items-center gap-1.5">
      <div className={`relative w-full rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-3'} ${isSleeping ? 'bg-slate-700' : 'bg-stone-200'}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isSleeping ? 'bg-slate-600' : 'bg-stone-300'}`}
          style={{ width: `${estimatedPct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${actualPct}%`, ...(halloween ? CANDY_CORN : {}) }}
        />
      </div>
      {/* Jack-o-lantern goal marker: unlit until the goal is reached */}
      {halloween && !compact && (
        <span
          title={goalReached ? 'Goal reached!' : 'Light the pumpkin: reach your goal'}
          className={`flex-shrink-0 text-base leading-none transition-all duration-500 ${goalReached ? 'animate-[pumpkin-bounce_1.6s_ease-in-out_infinite] drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]' : 'grayscale opacity-40'}`}
        >
          🎃
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
