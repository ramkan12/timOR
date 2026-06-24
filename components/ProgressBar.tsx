'use client'

import { GOAL_MINUTES, secondsToDisplay } from '@/lib/utils'

interface Props {
  estimatedMinutes: number
  actualSeconds: number
  isSleeping?: boolean
  isRiham?: boolean
}

const GOAL_SECONDS = GOAL_MINUTES * 60

export default function ProgressBar({ estimatedMinutes, actualSeconds, isSleeping, isRiham = true }: Props) {
  const actualPct = Math.min((actualSeconds / GOAL_SECONDS) * 100, 100)
  const estimatedPct = Math.min((estimatedMinutes / GOAL_MINUTES) * 100, 100)
  const goalReached = actualSeconds >= GOAL_SECONDS

  const barColor = goalReached
    ? 'bg-emerald-500'
    : actualSeconds >= GOAL_SECONDS * 0.75
    ? 'bg-amber-400'
    : isRiham ? 'bg-rose-300' : 'bg-sky-400'

  return (
    <div className="space-y-1.5">
      <div className={`relative h-3 w-full rounded-full overflow-hidden ${isSleeping ? 'bg-slate-700' : 'bg-stone-200'}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isSleeping ? 'bg-slate-600' : 'bg-stone-300'}`}
          style={{ width: `${estimatedPct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${actualPct}%` }}
        />
      </div>
      <div className={`flex items-center justify-between text-xs ${isSleeping ? 'text-slate-400' : 'text-stone-500'}`}>
        <span className={`font-medium tabular-nums ${isSleeping ? 'text-slate-200' : 'text-stone-700'}`}>
          {secondsToDisplay(actualSeconds)}
          <span className={`font-normal ${isSleeping ? 'text-slate-400' : 'text-stone-400'}`}> / </span>
          {secondsToDisplay(estimatedMinutes * 60)}
        </span>
        {goalReached && <span className="text-emerald-400 font-semibold">7h reached!</span>}
      </div>
    </div>
  )
}
