-- Creator invite links: knak.vercel.app/?ref=priya. Visits are counted per code per day, and each order remembers
-- the code that brought the guest, so the kitchen can see which creator sends real orders.
alter table public.orders add column if not exists ref text check (ref ~ '^[a-z0-9_-]{2,32}$');
create index if not exists orders_ref_idx on public.orders (ref) where ref is not null;

create table if not exists public.ref_visits (
  ref text not null check (ref ~ '^[a-z0-9_-]{2,32}$'),
  day date not null default (now() at time zone 'Asia/Kolkata')::date,
  visits integer not null default 0,
  primary key (ref, day)
);
alter table public.ref_visits enable row level security;
create policy "Staff read creator visits" on public.ref_visits for select using (public.is_staff());

create or replace function public.count_visit(p_ref text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ref_visits (ref, visits) values (lower(p_ref), 1)
  on conflict (ref, day) do update set visits = public.ref_visits.visits + 1
$$;
revoke all on function public.count_visit(text) from public;
grant execute on function public.count_visit(text) to anon, authenticated;

-- The same as place_order, plus the creator code. p_ref has no default, so five-argument calls still reach the
-- original function unambiguously.
create or replace function public.place_order(p_items jsonb, p_name text, p_phone text, p_address text, p_pincode text, p_ref text)
returns table (order_id uuid, order_number integer, order_total integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  code text := nullif(lower(trim(coalesce(p_ref, ''))), '');
begin
  select * into r from public.place_order(p_items, p_name, p_phone, p_address, p_pincode);
  if code is not null and code ~ '^[a-z0-9_-]{2,32}$' then
    update public.orders set ref = code where id = r.order_id;
  end if;
  return query select r.order_id, r.order_number, r.order_total;
end;
$$;
revoke all on function public.place_order(jsonb, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text) to authenticated;

-- Per creator: visits, orders and takings (cancelled orders left out). Staff only.
create or replace function public.creator_stats()
returns table (ref text, visits bigint, orders bigint, revenue bigint, last_order timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Staff only.'; end if;
  return query
  with v as (select rv.ref, sum(rv.visits)::bigint as visits from public.ref_visits rv group by rv.ref),
       o as (select od.ref, count(*)::bigint as orders, sum(od.total)::bigint as revenue, max(od.created_at) as last_order
             from public.orders od where od.ref is not null and od.status <> 'cancelled' group by od.ref)
  select coalesce(v.ref, o.ref), coalesce(v.visits, 0), coalesce(o.orders, 0), coalesce(o.revenue, 0), o.last_order
  from v full join o on o.ref = v.ref
  order by 3 desc, 2 desc;
end;
$$;
revoke all on function public.creator_stats() from public, anon;
grant execute on function public.creator_stats() to authenticated;
