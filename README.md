# timOR

A private two-person productivity tracker built for two people who refuse to distract each other until the work is done.

The rule: no talking until both have logged 7 hours of focused work for the day.

---

## What it does

- **Split-screen view** — each person sees their own task list and the other's side by side
- **Live timers** — start/stop a timer on any task; elapsed time ticks in real time
- **Progress bar** — tracks hours toward the 7-hour goal, updating as timers run
- **Task management** — add, edit, delete tasks with a title, description, and estimated duration
- **Sleep toggle** — mark yourself as sleeping with a "last updated X mins ago" label
- **Date history** — browse past days to review what was worked on (read-only)
- **Real-time sync** — one person's updates appear on the other's screen within seconds

---

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — PostgreSQL + real-time WebSocket subscriptions
- **Tailwind CSS**
- **Vercel** — deployment

No authentication. Identity is stored in `localStorage` — first visit asks "Who are you?"

---

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the SQL in `supabase-schema.sql` in your Supabase SQL editor to set up the database.
