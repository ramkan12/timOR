# timOR — CLAUDE.md

## What this app is
A private two-person couples accountability tracker for Riham and Omar. They don't talk to each other until both have completed 7 hours of focused work for the day. The app shows both people's task lists, live timers, progress toward 7 hours, and a sleep status toggle.

## Stack
- **Next.js 14 (App Router)** — TypeScript, Tailwind CSS
- **Supabase** — PostgreSQL + real-time WebSocket subscriptions
- **Vercel** — deployment
- **lucide-react** — icons
- **date-fns** — date formatting

## Running locally
```bash
npm run dev        # starts at localhost:3000
npx tsc --noEmit   # type check (run before committing)
```

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Project structure
```
app/
  page.tsx           # root page: split-screen layout + identity modal + logo refresh
  layout.tsx         # sets title "timOR", full-height body
  globals.css        # warm stone background, no dark mode

components/
  UserPanel.tsx      # one side of the split screen per user
                     # owns: task fetching, real-time subscriptions, 8s polling fallback,
                     #       sleep toggle, date navigation, actualSeconds calculation
  TaskCard.tsx       # individual task card with play/stop timer, action menu (done/edit/delete)
  AddTaskModal.tsx   # create + edit modal (pass existingTask prop for edit mode)
  ProgressBar.tsx    # dual bar: estimated (lighter) vs actual (solid), ticks every second
  SleepToggle.tsx    # sleep switch + "last updated X ago" label

lib/
  supabase.ts        # single Supabase client instance
  utils.ts           # GOAL_MINUTES=420, minutesToDisplay, secondsToDisplay,
                     # getElapsedSeconds, formatSleepTimestamp, formatDateLabel, todayString

types/
  index.ts           # UserId, User, Task interfaces
```

## Database schema (Supabase)
Two tables. RLS enabled with allow-all policies (URL is the secret).

**`users`** — 2 rows only, never created/deleted
| column | type |
|---|---|
| id | text PK (`'riham'` or `'omar'`) |
| sleep_status | boolean |
| sleep_updated_at | timestamptz |

**`tasks`**
| column | type | notes |
|---|---|---|
| id | uuid PK | auto |
| user_id | text FK | `'riham'` or `'omar'` |
| date | date | `YYYY-MM-DD` |
| title | text | |
| description | text | nullable |
| estimated_minutes | integer | user's estimate |
| actual_seconds | integer | tracked time in **seconds** (not minutes!) |
| timer_started_at | timestamptz | null when stopped |
| is_complete | boolean | |
| created_at | timestamptz | auto |

> ⚠️ The column is `actual_seconds` (stores seconds, NOT minutes). It was renamed from `actual_minutes` early in development.

Real-time is enabled via:
```sql
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table tasks;
```

## Key design decisions

### Identity
No auth. On first visit a modal asks "Who are you?" — Riham or Omar. Choice saved to `localStorage` key `timor_user`. Either user can view both panels but can only interact with their own side.

### Time tracking
- `actual_seconds` stores accumulated tracked time in **seconds**
- When stopping a timer: `actual_seconds += elapsed seconds` (not minutes, preserves sub-minute time)
- When marking done: `actual_seconds` is NOT inflated — the progress bar formula handles crediting estimated time for completed tasks
- Only ONE timer can run at a time per panel; starting a new timer auto-stops the previous one

### Progress bar formula (in UserPanel)
```ts
// Completed tasks: credit max(tracked, estimated)
// Incomplete tasks: credit actual tracked + live elapsed
const actualSeconds = tasks.reduce((sum, t) => {
  if (t.is_complete) return sum + Math.max(t.actual_seconds, t.estimated_minutes * 60)
  const elapsed = t.timer_started_at ? Math.floor((now - new Date(t.timer_started_at).getTime()) / 1000) : 0
  return sum + t.actual_seconds + elapsed
}, 0)
```

This means:
- Marking done gives full estimated-time credit even with no timer
- Unmarking restores the real tracked time (no data loss)

### Real-time strategy
UserPanel uses Supabase `postgres_changes` subscriptions for both `tasks` and `users` tables. Additionally, a `fetchKey` state increments every 8 seconds to poll as a fallback (in case real-time lags or the subscription drops). Task adds/edits also bump `fetchKey` via `onTaskAdded` callback.

### Date navigation
Both panels share a single `selectedDate` state in `page.tsx`. Navigating dates in either panel moves both. Past dates are read-only (no add/timer/complete). Logo click does `window.location.reload()`.

## Common tasks

**Add a new field to tasks:** update `types/index.ts`, update the Supabase schema, update `AddTaskModal` insert/update, update `TaskCard` display.

**Change the 7-hour goal:** edit `GOAL_MINUTES` in `lib/utils.ts`.

**Add a third user:** update `UserId` type in `types/index.ts`, seed a third row in `users`, add a third `<UserPanel>` in `page.tsx`, update the identity modal.

**Deploy changes:**
```bash
npx tsc --noEmit   # check types first
git add <files> && git commit -m "description"
npx vercel         # or push to GitHub if connected
```
Then add env vars in Vercel dashboard if first deploy: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
