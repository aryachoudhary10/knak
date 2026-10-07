-- Wipe chat messages a minute after Realtime has delivered them, so no conversation is kept.
-- Applied separately because Supabase asks the owner to approve any statement that deletes rows.
create or replace function public.chat_guard(p_body text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  who text;
begin
  if me is null then raise exception 'sign in to chat'; end if;
  if p_body is null or length(btrim(p_body)) = 0 or length(p_body) > 280 then raise exception 'message must be 1 to 280 characters'; end if;
  delete from realtime.messages where (topic like 'whisper:%' or topic like 'table:%') and inserted_at < now() - interval '1 minute';
  if (select count(*) from realtime.messages where (topic like 'whisper:%' or topic like 'table:%') and payload->>'from' = me::text and inserted_at > now() - interval '10 seconds') >= 6 then
    raise exception 'slow down a little';
  end if;
  select split_part(btrim(name), ' ', 1) into who from public.profiles where id = me;
  return coalesce(nullif(who, ''), 'Guest');
end $$;
revoke all on function public.chat_guard(text) from public, anon, authenticated;
