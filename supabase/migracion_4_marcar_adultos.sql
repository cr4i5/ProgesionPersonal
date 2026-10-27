-- MIGRACIÓN 4: los adultos pueden marcar logros y créditos a los jóvenes (queda registrado quién y por qué actividad).
-- Pega todo en SQL Editor > Run (una sola vez; se puede repetir sin problema).

alter table public.progress_items add column if not exists marked_by uuid references public.profiles(id) on delete set null;
alter table public.progress_items add column if not exists source text;
alter table public.credit_entries add column if not exists marked_by uuid references public.profiles(id) on delete set null;

-- Logros: el joven escribe lo suyo; un adulto puede revisar Y TAMBIÉN marcar como cumplido (queda aprobado).
create or replace function public.review_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if auth.uid() is null then return new; end if;                       -- SQL Editor
    if new.user_id <> auth.uid() then                                    -- un adulto marca por el joven
      if not public.is_adult() then raise exception 'No permitido'; end if;
      new.note := null; new.review_comment := null;
      if new.status = 'completado' then
        new.review_status := 'aprobado'; new.marked_by := auth.uid();
        new.source := left(nullif(trim(new.source),''),80);
        new.reviewed_by := auth.uid(); new.reviewed_at := now();
      else
        new.review_status := 'pendiente'; new.marked_by := null; new.source := null;
        new.reviewed_by := null; new.reviewed_at := null;
      end if;
    else                                                                 -- el propio joven
      new.review_status := 'pendiente'; new.review_comment := null;
      new.reviewed_by := null; new.reviewed_at := null; new.marked_by := null; new.source := null;
    end if;
    return new;
  end if;
  if auth.uid() is null then return new; end if;
  new.user_id := old.user_id;
  if old.user_id = auth.uid() then                                       -- el propio joven
    new.review_status := old.review_status; new.review_comment := old.review_comment;
    new.reviewed_by := old.reviewed_by;     new.reviewed_at := old.reviewed_at;
    new.marked_by := old.marked_by;         new.source := old.source;
    if new.status is distinct from old.status then
      new.review_status := 'pendiente'; new.marked_by := null; new.source := null;
    elsif new.note is distinct from old.note and old.marked_by is null then
      new.review_status := 'pendiente';
    end if;
  elsif public.is_adult() then                                           -- adulto
    new.note := old.note;
    if new.status is distinct from old.status then                       -- marca o quita la marca
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
      if new.status = 'completado' then
        new.marked_by := auth.uid(); new.source := left(nullif(trim(new.source),''),80); new.review_status := 'aprobado';
      else
        new.marked_by := null; new.source := null; new.review_status := 'pendiente';
      end if;
    else                                                                 -- solo revisa
      new.marked_by := old.marked_by; new.source := old.source;
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
    end if;
  else
    raise exception 'No permitido';
  end if;
  return new;
end $$;

-- Créditos: igual; los que registra un adulto nacen aprobados.
create or replace function public.credit_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if auth.uid() is null then return new; end if;
    if new.user_id <> auth.uid() then
      if not public.is_adult() then raise exception 'No permitido'; end if;
      new.review_status := 'aprobado'; new.review_comment := null; new.marked_by := auth.uid();
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
    else
      new.review_status := 'pendiente'; new.review_comment := null;
      new.reviewed_by := null; new.reviewed_at := null; new.marked_by := null;
    end if;
    return new;
  end if;
  if auth.uid() is null then return new; end if;
  new.user_id := old.user_id; new.marked_by := old.marked_by;
  if old.user_id = auth.uid() then
    new.review_status := old.review_status; new.review_comment := old.review_comment;
    new.reviewed_by := old.reviewed_by;     new.reviewed_at := old.reviewed_at;
    if old.marked_by is null and (new.category, new.activity, new.credits, new.done_on, new.note)
       is distinct from (old.category, old.activity, old.credits, old.done_on, old.note) then
      new.review_status := 'pendiente';
    end if;
  elsif public.is_adult() then
    new.category := old.category; new.activity := old.activity; new.credits := old.credits;
    new.done_on := old.done_on;   new.note := old.note;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  else
    raise exception 'No permitido';
  end if;
  return new;
end $$;

drop trigger if exists credits_guard on public.credit_entries;
create trigger credits_guard before insert or update on public.credit_entries
  for each row execute function public.credit_guard();

-- Políticas: los adultos pueden insertar por los jóvenes y borrar solo lo que ellos mismos registraron
drop policy if exists pi_insert on public.progress_items;
create policy pi_insert on public.progress_items for insert with check (user_id = auth.uid() or public.is_adult());
drop policy if exists ce_insert on public.credit_entries;
create policy ce_insert on public.credit_entries for insert with check (user_id = auth.uid() or public.is_adult());
drop policy if exists ce_delete on public.credit_entries;
create policy ce_delete on public.credit_entries for delete using (
  (user_id = auth.uid() and review_status <> 'aprobado') or (public.is_adult() and marked_by is not null));

-- Plantillas de actividad: qué indicadores cumple cada actividad (compartidas entre todos los adultos)
create table if not exists public.activity_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  item_keys  text[] not null default '{}',
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.activity_templates enable row level security;
drop policy if exists at_all on public.activity_templates;
create policy at_all on public.activity_templates for all using (public.is_adult()) with check (public.is_adult());
