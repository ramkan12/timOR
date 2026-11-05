# timOR

A private two-person productivity tracker built for two people who refuse to distract each other until the work is done.

The rule: no talking until both have logged 7 hours of focused work for the day.

> ### 🔒 The URL is the secret
> timOR has **no accounts and no login**, so the two of us can just open it and go. That means **anyone who has the link can use the app** and see or change our tasks.
>
> - **Never share the deployed URL.** Don't post it, paste it in group chats, or screenshot the address bar.
> - **Never commit `.env.local`.** The Supabase URL and anon key are the only other protection.
> - **If the link ever leaks:** rotate the Supabase anon key, update it in Vercel, and redeploy to a new Vercel URL.

---

## What it does

- **Split-screen view:** each person sees their own task list and the other's side by side
- **Live timers:** start or stop a timer on any task; elapsed time ticks in real time, and only one timer runs at a time
- **Progress bar:** tracks hours toward the 7-hour goal as timers run
- **Tasks:** add, edit, delete and drag to reorder; copy a task to another day; mark it done
- **Usual cards:** New Task suggests your 5 most repeated tasks from the last 30 days so you can add them in one tap
- **Card colors:** color any card from Edit Task. The color is remembered for every card with the same title and description
- **Notes:** a little Instagram-style note bubble per person, with reactions
- **SPECCIALS:** a weekly reflection board (with confetti when you fill it in)
- **Sleep toggle:** mark yourself as asleep. Your side turns into a night sky, and the landing page goes to night mode when you're both asleep
- **Date history:** browse past days (read-only) or plan future ones
- **Real-time sync:** one person's updates appear on the other's screen within seconds

---

## Seasonal themes 🎃🍂❄️🌸☀️

The app dresses itself up automatically. There's nothing to turn on.

| When | Theme |
|---|---|
| **September & November** | 🍂 **Harvest**: warm cream, berry red (#8D2830) & slate blue (#335C67), a Gilmore Girls–style engraved logo (Cinzel), falling leaves, a leaf wreath around the logo, and a pumpkin progress bar (ribbed orange with a little stem) with a 🥧 that "bakes" at 7 hours |
| **Dec 1 – Mar 20** | ❄️ **Winter**: the dashboard and landing page sit on a Pine (#27363F) frame with cool parchment panels |
| **October** | 🎃 **Halloween**: witch purple & pumpkin orange, a spooky logo, bats, ghosts, cobwebs, a harvest moon at night, candy-corn progress bars with a jack-o-lantern that lights up at 7 hours, and candy confetti |

**Card colors also change with the seasons.** The color choices in Edit Task are a palette for the season of the day you're viewing. A colored card keeps its spot in the palette ("color #2"), so it switches to the new season's color #2 automatically.

| Season | Dates | Palette |
|---|---|---|
| 🍂 Fall | Sep 23 – Dec 20 | Autumn browns, ambers and rusts |
| ❄️ Winter | Dec 21 – Mar 20 | Berry, Branch, Snowflake, Mist, Pine |
| 🌸 Spring | Mar 21 – Jun 20 | Menthol, Pale Spring Bud, Light Yellow, Misty Rose, Pink, Baker-Miller Pink |
| ☀️ Summer | Jun 21 – Sep 22 | Tulip, Topaz, Deep Champagne, Antique White, Dark Sky Blue |

**Previewing:** add these to the URL. Each choice sticks for that browser tab.

- `?season=autumn`, `?season=halloween` or `?season=off` to preview a theme or turn it off
- `?palette=winter` (or `spring`, `summer`, `fall`) to preview card colors

---

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**
- **Supabase**: PostgreSQL + real-time WebSocket subscriptions
- **Vercel**: deployment
- lucide-react, date-fns, @dnd-kit

No authentication. The first visit asks "Who are you?", and the answer is kept in `sessionStorage` for that tab.

---

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env.local` file (never commit it):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the SQL in `supabase-schema.sql` in your Supabase SQL editor to set up the database, including the `card_styles` table that stores card colors.

See [CLAUDE.md](CLAUDE.md) for architecture and design notes.
