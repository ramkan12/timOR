-- Run this in your Supabase SQL editor to set up timOR

-- Users table (just two rows: riham and omar)
create table if not exists users (
  id text primary key,
  sleep_status boolean not null default false,
  sleep_updated_at timestamptz not null default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  date date not null,
  title text not null,
  description text,
  estimated_minutes integer not null default 0,
  actual_seconds integer not null default 0,
  timer_started_at timestamptz,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Seed the two users
insert into users (id, sleep_status, sleep_updated_at)
values
  ('riham', false, now()),
  ('omar',  false, now())
on conflict (id) do nothing;

-- Enable Row Level Security (but allow all since no auth)
alter table users enable row level security;
alter table tasks enable row level security;

-- Allow all operations (public access — the URL is the secret)
create policy "allow all on users" on users for all using (true) with check (true);
create policy "allow all on tasks" on tasks for all using (true) with check (true);

-- Enable real-time for both tables
-- Go to: Supabase Dashboard > Database > Replication > Tables
-- and toggle on "users" and "tasks"
