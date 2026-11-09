-- Migración 6: adultos conectados (presencia) y chat entre adultos.
-- Ejecutar UNA vez en Supabase → SQL Editor, ANTES de subir el código nuevo.

-- 1) Presencia: cada adulto "avisa" cada ~25 s que está conectado y a quién está viendo.
create table if not exists public.adult_presence (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  full_name    text not null default '',
  viewing_user uuid references public.profiles(id) on delete set null,
  viewing_name text,
  last_seen    timestamptz not null default now()
);
alter table public.adult_presence enable row level security;

create or replace function public.presence_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.full_name := coalesce((select p.full_name from profiles p where p.id = new.user_id), '');
  new.viewing_name := case when new.viewing_user is null then null
                           else (select p.full_name from profiles p where p.id = new.viewing_user) end;
  new.last_seen := now();
  return new;
end $$;
drop trigger if exists presence_guard on public.adult_presence;
create trigger presence_guard before insert or update on public.adult_presence
  for each row execute function public.presence_guard();

-- Los adultos ven a todos los adultos conectados (visto hace menos de 90 s).
-- Un joven solo ve a los adultos que están viendo SU progreso.
drop policy if exists ap_select on public.adult_presence;
create policy ap_select on public.adult_presence for select using (
  user_id = auth.uid() or (last_seen > now() - interval '90 seconds' and (public.is_adult() or viewing_user = auth.uid())));
drop policy if exists ap_insert on public.adult_presence;
create policy ap_insert on public.adult_presence for insert with check (user_id = auth.uid() and public.is_adult());
drop policy if exists ap_update on public.adult_presence;
create policy ap_update on public.adult_presence for update using (user_id = auth.uid() and public.is_adult())
  with check (user_id = auth.uid() and public.is_adult());
drop policy if exists ap_delete on public.adult_presence;
create policy ap_delete on public.adult_presence for delete using (user_id = auth.uid());

-- 2) Chat solo para adultos
create table if not exists public.adult_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists adult_messages_created on public.adult_messages (created_at desc);
alter table public.adult_messages enable row level security;

create or replace function public.message_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.author_name := coalesce((select p.full_name from profiles p where p.id = new.user_id), '');
  new.body := trim(new.body);
  new.created_at := now();
  return new;
end $$;
drop trigger if exists message_guard on public.adult_messages;
create trigger message_guard before insert on public.adult_messages
  for each row execute function public.message_guard();

drop policy if exists am_select on public.adult_messages;
create policy am_select on public.adult_messages for select using (public.is_adult());
drop policy if exists am_insert on public.adult_messages;
create policy am_insert on public.adult_messages for insert with check (user_id = auth.uid() and public.is_adult());
drop policy if exists am_delete on public.adult_messages;
create policy am_delete on public.adult_messages for delete using (user_id = auth.uid() and public.is_adult());

grant select, insert, update, delete on public.adult_presence, public.adult_messages to authenticated;
revoke all on public.adult_presence, public.adult_messages from anon;
