-- Migración 8: Guías, chat grupal de Guías y fichas médicas PDF.
-- Ejecutar UNA VEZ en Supabase > SQL Editor antes de desplegar esta versión.
-- No elimina ni modifica registros existentes. El chat adult_messages queda intacto.

-- 1) Designación de Guías. La pertenencia se controla en una tabla separada;
--    no se modifica profiles.role ni se permite autoasignación.
create table if not exists public.guide_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  assigned_by uuid not null default auth.uid() references public.profiles(id),
  assigned_at timestamptz not null default now()
);
alter table public.guide_members enable row level security;
drop policy if exists guide_members_read on public.guide_members;
create policy guide_members_read on public.guide_members for select to authenticated
  using (user_id = auth.uid() or public.is_adult());
revoke all on public.guide_members from anon;
grant select on public.guide_members to authenticated;

create or replace function public.is_guide() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.guide_members gm where gm.user_id = auth.uid());
$$;
revoke all on function public.is_guide() from public;
grant execute on function public.is_guide() to authenticated;

create or replace function public.set_scout_guide(p_user_id uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_adult() then raise exception 'Solo los adultos de programa pueden asignar Guías'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'scout') then
    raise exception 'El usuario indicado no es un joven de la Tropa';
  end if;
  if p_enabled then
    insert into public.guide_members(user_id, assigned_by)
    values (p_user_id, auth.uid()) on conflict (user_id) do nothing;
  else
    delete from public.guide_members where user_id = p_user_id;
  end if;
end $$;
revoke all on function public.set_scout_guide(uuid, boolean) from public;
grant execute on function public.set_scout_guide(uuid, boolean) to authenticated;

-- 2) Chat nuevo compartido: solo Guías designados y adultos.
--    adult_messages permanece sin cambios y sigue siendo exclusivo de adultos.
create table if not exists public.guide_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists guide_messages_created on public.guide_messages(created_at desc);
alter table public.guide_messages enable row level security;
create or replace function public.guide_message_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.user_id <> auth.uid() then raise exception 'Autor no válido'; end if;
  if not (public.is_adult() or public.is_guide()) then raise exception 'No tienes acceso al chat de Guías'; end if;
  new.author_name := coalesce((select full_name from public.profiles where id = new.user_id), '');
  new.body := trim(new.body);
  new.created_at := now();
  return new;
end $$;
drop trigger if exists guide_message_guard on public.guide_messages;
create trigger guide_message_guard before insert on public.guide_messages
  for each row execute function public.guide_message_guard();
drop policy if exists guide_messages_read on public.guide_messages;
create policy guide_messages_read on public.guide_messages for select to authenticated
  using (public.is_adult() or public.is_guide());
drop policy if exists guide_messages_insert on public.guide_messages;
create policy guide_messages_insert on public.guide_messages for insert to authenticated
  with check (user_id = auth.uid() and (public.is_adult() or public.is_guide()));
drop policy if exists guide_messages_delete on public.guide_messages;
create policy guide_messages_delete on public.guide_messages for delete to authenticated
  using (user_id = auth.uid() and (public.is_adult() or public.is_guide()));
revoke all on public.guide_messages from anon;
grant select, insert, delete on public.guide_messages to authenticated;

-- 3) Fichas médicas: solo metadatos en tabla; los PDF viven en Storage privado.
create table if not exists public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references public.profiles(id),
  file_name text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists medical_documents_user_created on public.medical_documents(user_id, created_at desc);
alter table public.medical_documents enable row level security;
drop policy if exists medical_documents_read on public.medical_documents;
create policy medical_documents_read on public.medical_documents for select to authenticated
  using (user_id = auth.uid() or public.is_adult());
drop policy if exists medical_documents_insert on public.medical_documents;
create policy medical_documents_insert on public.medical_documents for insert to authenticated
  with check (uploaded_by = auth.uid() and (user_id = auth.uid() or public.is_adult()));
drop policy if exists medical_documents_delete on public.medical_documents;
create policy medical_documents_delete on public.medical_documents for delete to authenticated
  using (user_id = auth.uid() or public.is_adult());
revoke all on public.medical_documents from anon;
grant select, insert, delete on public.medical_documents to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('medical-records', 'medical-records', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists medical_storage_read on storage.objects;
create policy medical_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'medical-records' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_adult()));
drop policy if exists medical_storage_insert on storage.objects;
create policy medical_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'medical-records' and (((storage.foldername(name))[1] = auth.uid()::text) or public.is_adult()));
drop policy if exists medical_storage_delete on storage.objects;
create policy medical_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'medical-records' and (((storage.foldername(name))[1] = auth.uid()::text) or public.is_adult()));
