export type UserId = 'riham' | 'omar'

export interface User {
  id: UserId
  sleep_status: boolean
  sleep_updated_at: string
  note: string | null
  note_created_at: string | null
}

export interface Task {
  id: string
  user_id: UserId
  date: string // YYYY-MM-DD
  title: string
  description: string | null
  estimated_minutes: number
  actual_seconds: number
  timer_started_at: string | null
  is_complete: boolean
  sort_order: number
  created_at: string
}
