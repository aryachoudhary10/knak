-- KNAK guest chat: whispers (one guest to another) and table talk (everyone seated at one table).
--
-- Messages are never kept. They travel over private Realtime channels, and Postgres decides who may listen:
--   whisper:<uid>   only that guest receives it (their inbox)
--   table:<id>      only guests currently seated at that table
-- Guests cannot broadcast on these channels themselves; they send through send_whisper / send_table below, so the
-- sender's name is always genuine, blocks are honoured and spam is limited. Realtime's delivery copy is wiped a
-- minute later by 20261007_chat_sweep.sql (Supabase also drops it on its own after a few days).

-- Where each signed-in guest is seated; the client sets it on sitting down and clears it on standing up.
create table if not exists public.seats (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  table_id text not null check (table_id ~ '^[a-z0-9_-]{1,24}$'),
  at timestamptz not null default now()
);
alter table public.seats enable row level security;
create policy "Guests manage their own seat" on public.seats
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Who each guest has blocked. A blocked guest cannot whisper to them; table talk from them is hidden on the client.
create table if not exists public.blocks (
  blocker uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  primary key (blocker, blocked)
);
alter table public.blocks enable row level security;
create policy "Guests manage their own blocks" on public.blocks
  for all to authenticated using (blocker = auth.uid()) with check (blocker = auth.uid());

-- Who may listen on a chat channel.
create policy "KNAK chat listeners" on realtime.messages
  for select to authenticated using (
    realtime.messages.extension = 'broadcast' and (
      realtime.topic() = 'whisper:' || (select auth.uid())::text
      or exists (
        select 1 from public.seats s
        where s.user_id = (select auth.uid()) and realtime.topic() = 'table:' || s.table_id and s.at > now() - interval '6 hours'
      )
    )
  );

-- Shared checks for both kinds of message; returns the sender's display name.
create or replace function public.chat_guard(p_body text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  who text;
begin
  if me is null then raise exception 'sign in to chat'; end if;
  if p_body is null or length(btrim(p_body)) = 0 or length(p_body) > 280 then raise exception 'message must be 1 to 280 characters'; end if;
  if (select count(*) from realtime.messages where (topic like 'whisper:%' or topic like 'table:%') and payload->>'from' = me::text and inserted_at > now() - interval '10 seconds') >= 6 then
    raise exception 'slow down a little';
  end if;
  select split_part(btrim(name), ' ', 1) into who from public.profiles where id = me;
  return coalesce(nullif(who, ''), 'Guest');
end $$;

create or replace function public.send_whisper(p_to uuid, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  who text := public.chat_guard(p_body);
begin
  if p_to = auth.uid() then raise exception 'cannot whisper to yourself'; end if;
  -- Blocked: the message quietly goes nowhere, so the sender can't tell.
  if exists (select 1 from public.blocks where blocker = p_to and blocked = auth.uid()) then return; end if;
  perform realtime.send(
    jsonb_build_object('from', auth.uid(), 'name', who, 'body', btrim(p_body), 'to', p_to, 'at', extract(epoch from now()) * 1000),
    'w', 'whisper:' || p_to::text, true);
end $$;

create or replace function public.send_table(p_body text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  who text := public.chat_guard(p_body);
  t text;
begin
  select table_id into t from public.seats where user_id = auth.uid() and at > now() - interval '6 hours';
  if t is null then raise exception 'take a seat to talk at a table'; end if;
  perform realtime.send(
    jsonb_build_object('from', auth.uid(), 'name', who, 'body', btrim(p_body), 'table', t, 'at', extract(epoch from now()) * 1000),
    't', 'table:' || t, true);
end $$;

revoke all on function public.chat_guard(text) from public, anon, authenticated;
revoke all on function public.send_whisper(uuid, text) from public, anon;
revoke all on function public.send_table(text) from public, anon;
grant execute on function public.send_whisper(uuid, text) to authenticated;
grant execute on function public.send_table(text) to authenticated;
