# timOR — CLAUDE.md

## What this app is
A private two-person couples accountability tracker for Riham and Omar. They don't talk to each other until both have completed 7 hours of focused work for the day. The app shows both people's task lists, live timers, progress toward 7 hours, and a sleep status toggle.

## Stack
- **Next.js 16 (App Router)** — TypeScript, Tailwind CSS
- **Supabase** — PostgreSQL + real-time WebSocket subscriptions
- **Vercel** — deployment
- **lucide-react** — icons
- **date-fns** — date formatting
- **@dnd-kit/sortable** — drag-and-drop task reordering

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
  HalloweenDecor.tsx # seasonal bats/ghosts/moon/cobwebs (renders nothing out of season);
                     # also exports CornerWebs
  NoteWidget.tsx     # Instagram-style note bubble: one note per user, persists until deleted,
                     # owner can add/edit/delete inline, non-owner sees read-only

lib/
  supabase.ts        # single Supabase client instance
  utils.ts           # GOAL_MINUTES=420, minutesToDisplay, secondsToDisplay,
                     # getElapsedSeconds, formatSleepTimestamp, formatDateLabel, todayString
  cardMatch.ts       # "same card" matching (normalized title + fuzzy description),
                     # topCommonCards (quick-pick ranking), findCardStyle
  season.ts          # detectSeason / applySeason / isHalloween (stamps <html data-season>)
  cardStyles.ts      # SEASON_PALETTES (seasonal card colors), resolveColor, getCardLook for TaskCard

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
| note | text (nullable) |
| note_created_at | timestamptz (nullable) |

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
| sort_order | integer | display order; default 0 |
| created_at | timestamptz | auto |

**`card_styles`** — a saved card look, unique on `(user_id, title_key, desc_key)`
| column | type | notes |
|---|---|---|
| id | uuid PK | auto |
| user_id | text FK | |
| title_key / desc_key | text | `normalizeText()` of title / description |
| color | text | `'slot-N'` into the current season's palette (`'none'` = default; legacy names map via `LEGACY_SLOT`) |
| pattern | text | retired; always `'plain'` |
| updated_at | timestamptz | |

> ⚠️ The column is `actual_seconds` (stores seconds, NOT minutes). It was renamed from `actual_minutes` early in development.

Real-time is enabled via:
```sql
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table tasks;
```

## Key design decisions

### Identity
No auth. On first visit a modal asks "Who are you?" — Riham or Omar. Choice saved to `sessionStorage` key `timor_user` (session-only, not persisted across browser restarts). Either user can view both panels but can only interact with their own side.

### Time tracking
- `actual_seconds` stores accumulated tracked time in **seconds**
- When stopping a timer: `actual_seconds += elapsed seconds` (not minutes, preserves sub-minute time)
- When marking done: `actual_seconds` is NOT inflated — the progress bar formula decides the credit for completed tasks
- Only ONE timer can run at a time per panel; starting a new timer auto-stops the previous one

### Progress bar formula (in UserPanel)
```ts
// Completed tasks: credit tracked time, or the estimate if nothing was tracked
//   (completedCreditSeconds in lib/utils.ts — also used by TaskCard + CalendarModal)
// Incomplete tasks: credit actual tracked + live elapsed
const actualSeconds = tasks.reduce((sum, t) => {
  if (t.is_complete) return sum + completedCreditSeconds(t)
  const elapsed = t.timer_started_at ? Math.floor((now - new Date(t.timer_started_at).getTime()) / 1000) : 0
  return sum + t.actual_seconds + elapsed
}, 0)
```

This means:
- Finishing faster than estimated credits only the tracked time (6h estimate, 4h tracked → 4h)
- Marking done with no tracked time at all gives full estimated-time credit
- Unmarking restores the real tracked time (no data loss)

### Notes
Instagram-style notes live in the `users` table (`note`, `note_created_at`). A note persists until the owner explicitly deletes it — there is no time-based expiry. Only the owner can write/edit/delete their note; both users can read each other's. The existing `users` real-time subscription propagates note changes with no extra wiring. Clicking the bubble opens an inline edit; the × button outside deletes it.

Max note length is 80 characters (enforced in `NoteWidget`).

### Common cards & card looks
- **Quick pick:** the New Task modal shows up to 5 "usual cards", the most frequent repeated cards from the user's last 30 days (`topCommonCards`). Two tasks are the same card when their titles normalize equal and their descriptions are near-identical (`descSimilar`: equal, every word of one appears in the other, or word Jaccard ≥ 0.6). Tapping one prefills title, latest description and latest duration.
- **Card looks:** any card can get a color from the **Edit** modal ("Card Preview"; hidden in New Task to keep it uncluttered). Patterns were retired (the `pattern` column stays, always written `'plain'`). Colors come from a **seasonal palette** (`SEASON_PALETTES` in `lib/cardStyles.ts`), chosen by the season of the **viewed** date (`paletteSeasonForDate(selectedDate)` in `lib/season.ts`, so browsing to Dec 31 shows winter): Spring Mar 21–Jun 20, Summer Jun 21–Sep 22, Fall Sep 23–Dec 20, Winter Dec 21–Mar 20. A saved look stores a slot id (`'slot-N'`), not a hex, so on the solstice every "fall #3" card becomes "winter #3" (wrapping when a palette is shorter). Old named ids (`teal`, `lavender`…) map to slots via `LEGACY_SLOT`. Cards render as a soft tint plus a solid left stripe (inline `color-mix` styles; pale colors get a stronger wash and a darker stripe). Preview another season with `?palette=winter|spring|summer|fall`. A look is stored in `card_styles` by normalized title + description, not on the task, so every past and future matching card renders the same. `findCardStyle` tries an exact key match first, then a fuzzy one. Choosing no color deletes the matched style row. UserPanel fetches the styles, subscribes to them in real time and passes `cardStyle` to `TaskCard`.

### Landing page night mode
When **both** users' `sleep_status` is true, the "Who are you?" screen (`IdentityModal` in `app/page.tsx`) switches to night mode, matching a sleeping panel: a dark rose→indigo→sky gradient, the shared `STARS_STYLE` overlay (`lib/nightSky.ts`), a dark glass card, a moon icon and a "both asleep" pill. In October it also gets the harvest moon and the night bats from `HalloweenDecor`. It's purely visual and reacts live to the sleep pills via `useSleepUsers`. Sleep status itself is never changed automatically.

### Seasonal theme (Halloween)
- **When:** all of October, automatically (`detectSeason` in `lib/season.ts`). `app/page.tsx` calls `applySeason` in its hydration effect before the first render, which stamps `<html data-season="halloween">`. Preview any time with `?season=halloween`, or force it off with `?season=off`; the choice sticks for the tab via sessionStorage.
- **Colors:** `globals.css` redefines `--color-rose-*` with purple values (Rihamie = witch purple) and `--color-sky-*` with orange values (Omarie = pumpkin orange) under `html[data-season="halloween"]`, plus a cream `--background`. Tailwind v4 utilities read these variables, so no component class names change. The asleep night turns deep purple / ember automatically.
- **Font:** Henny Penny loads in `layout.tsx` as `--font-spooky`. While the season is active it applies only to the logo: the "tim" text (`seasonal-heading`) and the "OR" badge (`logo-or`, which is serif the rest of the year). The user names stay in the normal font.
- **Extras:**
  - `HalloweenDecor`: bats and ghosts, a moon when asleep, and cobwebs in the panel corners.
  - The heart logo becomes 🎃.
  - `ProgressBar` gets candy-corn stripes and a 🎃 goal marker that lights up at 7h.
  - SPECCIALS confetti uses `CANDY_COLORS`.
  - The empty task list shows a 👻.
- **Adding another season:** extend `Season`/`detectSeason`, add an `html[data-season="..."]` block in `globals.css`, and gate decorations on a matching helper.

### Real-time strategy
UserPanel uses Supabase `postgres_changes` subscriptions for both `tasks` and `users` tables. Additionally, a `fetchKey` state increments every 8 seconds to poll as a fallback (in case real-time lags or the subscription drops). Task adds/edits also bump `fetchKey` via `onTaskAdded` callback.

### Date navigation
Both panels share a single `selectedDate` state in `page.tsx`. Navigating dates in either panel moves both. Past dates are read-only (no add/timer/complete). Logo click does `window.location.reload()`.

## Common tasks

**Add a new field to tasks:** update `types/index.ts`, update the Supabase schema, update `AddTaskModal` insert/update, update `TaskCard` display.

**Task ordering:** Tasks are fetched ordered by `is_complete asc, sort_order asc, created_at asc` so incomplete tasks always appear above completed ones. Each group (incomplete / completed) has its own `DndContext` so drag handles (GripVertical) reorder within the group only. On drop, `sort_order` is renumbered 0..n for that group and persisted. Starting a timer bumps that task to `sort_order = 0` within the incomplete group. Marking a task done moves it to the bottom of the completed group; un-marking moves it to the bottom of the incomplete group.

**Color identity:** Rihamie = rose throughout (progress bar `bg-rose-300`, ring, buttons). Omarie = sky throughout (`bg-sky-400`, ring, buttons). Both share amber (≥75% progress) and emerald (goal reached) milestone colors. Always write full literal class names (no `` `text-${color}-400` ``), since Tailwind can't detect dynamically built classes. During the Halloween season, rose/sky are remapped to purple/orange via CSS variables (see Seasonal theme).

**Change the 7-hour goal:** edit `GOAL_MINUTES` in `lib/utils.ts`.

**Add a third user:** update `UserId` type in `types/index.ts`, seed a third row in `users`, add a third `<UserPanel>` in `page.tsx`, update the identity modal.

**Deploy changes:**
```bash
npx tsc --noEmit   # check types first
git add <files> && git commit -m "description"
npx vercel         # or push to GitHub if connected
```
Then add env vars in Vercel dashboard if first deploy: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
