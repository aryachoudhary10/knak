-- KNAK guest profiles: one row per signed-in guest, holding who to greet and where to deliver.
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  pincode text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each guest can read and write only their own row.
drop policy if exists "Guests read their own profile" on public.profiles;
create policy "Guests read their own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Guests create their own profile" on public.profiles;
create policy "Guests create their own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Guests update their own profile" on public.profiles;
create policy "Guests update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
