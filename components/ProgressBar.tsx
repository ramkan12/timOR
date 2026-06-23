'use client'

import { GOAL_MINUTES, minutesToDisplay, secondsToDisplay } from '@/lib/utils'

interface Props {
  estimatedMinutes: number
  actualSeconds: number
}

const GOAL_SECONDS = GOAL_MINUTES * 60

export default function ProgressBar({ estimatedMinutes, actualSeconds }: Props) {
  const actualPct = Math.min((actualSeconds / GOAL_SECONDS) * 100, 100)
  const estimatedPct = Math.min((estimatedMinutes / GOAL_MINUTES) * 100, 100)
  const goalReached = actualSeconds >= GOAL_SECONDS

  const barColor = goalReached
    ? 'bg-emerald-500'
    : actualSeconds >= GOAL_SECONDS * 0.75
    ? 'bg-amber-400'
    : 'bg-rose-300'

  return (
    <div className="space-y-1.5">
      <div className="relative h-3 w-full rounded-full bg-stone-200 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-stone-300 transition-all duration-500"
          style={{ width: `${estimatedPct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${actualPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>
          <span className="font-medium text-stone-700 tabular-nums">{secondsToDisplay(actualSeconds)}</span>
          {' actual · '}
          <span>{minutesToDisplay(estimatedMinutes)}</span> est
        </span>
        <span className={goalReached ? 'text-emerald-600 font-semibold' : ''}>
          {goalReached ? '7h reached!' : `${minutesToDisplay(GOAL_MINUTES)} goal`}
        </span>
      </div>
    </div>
  )
}
