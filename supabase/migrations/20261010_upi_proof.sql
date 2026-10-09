-- Proof of payment: after paying by UPI, the guest types the 12-digit UPI reference (UTR) their app shows. The kitchen
-- matches it against the payment in its own UPI app. One reference can back only one order, so the same payment
-- can't be claimed twice.
alter table public.orders add column if not exists pay_ref text check (pay_ref ~ '^[0-9]{12}$');
create unique index if not exists orders_pay_ref_key on public.orders (pay_ref) where pay_ref is not null;

create or replace function public.place_paid_order(p_items jsonb, p_name text, p_phone text, p_address text, p_pincode text, p_ref text, p_utr text)
returns table (order_id uuid, order_number integer, order_total integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  utr text := regexp_replace(coalesce(p_utr, ''), '\s', '', 'g');
begin
  if utr !~ '^[0-9]{12}$' then
    raise exception 'Please enter the 12-digit UPI reference number from your payment app.';
  end if;
  if exists (select 1 from public.orders o where o.pay_ref = utr) then
    raise exception 'This UPI reference has already been used for another order.';
  end if;
  select * into r from public.place_order(p_items, p_name, p_phone, p_address, p_pincode, p_ref);
  update public.orders set pay_ref = utr where id = r.order_id;
  return query select r.order_id, r.order_number, r.order_total;
end;
$$;
revoke all on function public.place_paid_order(jsonb, text, text, text, text, text, text) from public, anon;
grant execute on function public.place_paid_order(jsonb, text, text, text, text, text, text) to authenticated;
