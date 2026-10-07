-- KNAK orders: the menu with its prices, and the orders guests place.
-- An order is written only when the guest confirms payment, through place_order(), which prices every line
-- from menu_items on the server, so nobody can change a price from their browser.

create table if not exists public.menu_items (
  id text primary key,
  category text not null,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  veg boolean not null default true,
  available boolean not null default true,
  sort integer not null default 0
);
alter table public.menu_items enable row level security;
create policy "Anyone can read the menu" on public.menu_items for select using (true);

insert into public.menu_items (id, category, name, description, price, veg, available, sort) values
  ('s1','Starters','French Onion Soup','Slow-cooked onions · gruyère crouton',345,true,true,0),
  ('s2','Starters','Truffle Fries','Parmesan · truffle oil · aioli',295,true,true,1),
  ('s3','Starters','Chicken Liver Pâté','Brioche toast · cornichons',425,false,true,2),
  ('m1','Mains','Coq au Vin','Chicken braised in red wine · mash',795,false,true,3),
  ('m2','Mains','Wild Mushroom Risotto','Porcini · parmesan · thyme',645,true,true,4),
  ('m3','Mains','Croque Monsieur','Ham · béchamel · gruyère · sourdough',525,false,true,5),
  ('m4','Mains','Ratatouille Gratin','Provençal vegetables · herb crust',575,true,true,6),
  ('d1','Desserts','Crème Brûlée','Madagascar vanilla · burnt sugar',365,true,true,7),
  ('d2','Desserts','Chocolate Fondant','Molten centre · vanilla ice cream',395,true,true,8),
  ('d3','Desserts','Macaron Box','Six assorted macarons',450,true,false,9),
  ('b1','Drinks','Café au Lait','Double shot · steamed milk',225,true,true,10),
  ('b2','Drinks','Fresh Citron Pressé','Lemon · sugar syrup · soda',195,true,true,11)
on conflict (id) do update set category = excluded.category, name = excluded.name, description = excluded.description,
  price = excluded.price, veg = excluded.veg, available = excluded.available, sort = excluded.sort;

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('public.order_number_seq'),
  user_id uuid not null references auth.users (id) on delete cascade,
  items jsonb not null,
  total integer not null,
  name text not null,
  phone text not null,
  address text not null,
  pincode text not null,
  -- placed -> preparing -> prepared -> out_for_delivery -> delivered (or cancelled)
  status text not null default 'placed' check (status in ('placed','preparing','prepared','out_for_delivery','delivered','cancelled')),
  -- the guest says they paid; the owner checks the UPI app and marks it confirmed
  payment text not null default 'claimed' check (payment in ('claimed','confirmed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Guests read their own orders" on public.orders for select using ((select auth.uid()) = user_id);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Guests never insert directly; they call this, which checks the lines and prices them from menu_items.
create or replace function public.place_order(p_items jsonb, p_name text, p_phone text, p_address text, p_pincode text)
returns table (order_id uuid, order_number integer, order_total integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  line jsonb;
  item public.menu_items;
  qty integer;
  priced jsonb := '[]'::jsonb;
  sum_total integer := 0;
  new_id uuid;
  new_number integer;
begin
  if uid is null then raise exception 'Please sign in to order.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    raise exception 'Your table is empty.';
  end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(trim(coalesce(p_address,''))) < 6 or coalesce(p_pincode,'') !~ '^\d{6}$' or length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) < 9 then
    raise exception 'Please add your name, phone, address and pincode.';
  end if;
  for line in select * from jsonb_array_elements(p_items) loop
    qty := (line->>'qty')::integer;
    if qty is null or qty < 1 or qty > 20 then raise exception 'Please check the quantities.'; end if;
    select * into item from public.menu_items m where m.id = line->>'id';
    if not found or not item.available then raise exception 'One of the dishes is no longer available.'; end if;
    priced := priced || jsonb_build_object('id', item.id, 'name', item.name, 'price', item.price, 'qty', qty);
    sum_total := sum_total + item.price * qty;
  end loop;
  insert into public.orders (user_id, items, total, name, phone, address, pincode)
  values (uid, priced, sum_total, trim(p_name), trim(p_phone), trim(p_address), trim(p_pincode))
  returning id, number into new_id, new_number;
  return query select new_id, new_number, sum_total;
end;
$$;
revoke all on function public.place_order(jsonb, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text) to authenticated;
