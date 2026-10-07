-- Which guest character a signed-in guest chose (an index into GUEST_AVATARS), so others see them as that person.
alter table public.profiles add column if not exists look smallint check (look between 0 and 15);
