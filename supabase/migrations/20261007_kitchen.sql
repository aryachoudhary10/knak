-- The kitchen screen (/kitchen): KNAK's own team sees every order live, confirms UPI payments and moves orders
-- through the kitchen. Guests still see only their own orders.

create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  added_at timestamptz not null default now()
);
alter table public.staff enable row level security;

-- Checked inside policies; security definer so the check itself isn't blocked by the staff table's own policy.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;
grant execute on function public.is_staff() to authenticated;

create policy "Staff see the team" on public.staff for select to authenticated using (public.is_staff());
create policy "Staff read every order" on public.orders for select to authenticated using (public.is_staff());

-- Move an order along, or record whether its payment arrived. Only the team can.
create or replace function public.update_order(p_id uuid, p_status text default null, p_payment text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'only KNAK staff can update orders'; end if;
  update public.orders
    set status = coalesce(p_status, status), payment = coalesce(p_payment, payment), updated_at = now()
    where id = p_id;
end $$;
revoke all on function public.update_order(uuid, text, text) from public, anon;
grant execute on function public.update_order(uuid, text, text) to authenticated;

-- The team list with emails (auth.users is not readable from the browser), and adding a teammate by email.
create or replace function public.team()
returns table (user_id uuid, email text, role text) language sql stable security definer set search_path = '' as $$
  select s.user_id, u.email::text, s.role from public.staff s join auth.users u on u.id = s.user_id
  where public.is_staff() order by s.role, s.added_at;
$$;
revoke all on function public.team() from public, anon;
grant execute on function public.team() to authenticated;

create or replace function public.add_staff(p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  if not exists (select 1 from public.staff where user_id = auth.uid() and role = 'owner') then
    raise exception 'only the owner can add staff';
  end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then return false; end if;
  insert into public.staff (user_id) values (uid) on conflict (user_id) do nothing;
  return true;
end $$;
revoke all on function public.add_staff(text) from public, anon;
grant execute on function public.add_staff(text) to authenticated;

-- New orders and status changes reach open screens live (Realtime applies the policies above per viewer).
alter publication supabase_realtime add table public.orders;

-- KNAK's owner.
insert into public.staff (user_id, role)
  select id, 'owner' from auth.users where email = 'aryachoudhary100@gmail.com'
  on conflict (user_id) do nothing;
