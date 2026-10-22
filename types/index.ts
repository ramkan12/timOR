export type UserId = 'riham' | 'omar'

export interface User {
  id: UserId
  sleep_status: boolean
  sleep_updated_at: string
  note: string | null
  note_created_at: string | null
  note_reaction: string | null
  note_reaction_by: string | null
}

export interface UserNote {
  id: string
  user_id: UserId
  date: string
  content: string
  created_at: string
  note_reaction: string | null
  note_reaction_by: string | null
}

export interface SpeccialsEntry {
  id: string
  user_id: UserId
  date: string
  category_index: number
  content: string
  created_at: string
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
  tab_id: string | null
  due_date: string | null // tab tasks only: last day this task appears; null = single-day task
}

// A saved look for a card, remembered by normalized title + description so every
// matching card (past and future) renders the same way.
export interface CardStyle {
  id: string
  user_id: UserId
  title_key: string
  desc_key: string
  color: string
  pattern: string
  updated_at: string
}

export interface Tab {
  id: string
  user_id: UserId
  name: string
  created_at: string
  ended_at: string | null // null = active indefinitely; otherwise the last day this tab is/was active
}
