-- =====================================================================
--  Mi Progresión · Tropa Scout  —  Esquema para Supabase
--  Pega TODO este archivo en Supabase > SQL Editor > Run
-- =====================================================================

-- 1) Perfiles -----------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  age          int,
  join_troop   date,
  join_current date,
  scout_group  text,
  patrol       text,
  role         text not null default 'scout' check (role in ('scout','adult')),
  created_at   timestamptz not null default now()
);

-- Ajustes secretos (nadie puede leerlos desde la web)
create table if not exists public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security;

-- Función auxiliar: ¿el usuario actual es adulto del programa?
create or replace function public.is_adult() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'adult');
$$;

-- Al crear una cuenta se crea el perfil. Si trae código de adulto correcto => rol adulto.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
        code text := nullif(meta->>'adult_code','');
        r text := 'scout';
begin
  if code is not null then
    if exists (select 1 from public.app_settings where key = 'adult_code' and value = code) then
      r := 'adult';
    else
      raise exception 'Código de adulto incorrecto';
    end if;
  end if;
  insert into public.profiles (id, full_name, age, join_troop, join_current, scout_group, patrol, role)
  values (new.id, coalesce(meta->>'full_name',''), nullif(meta->>'age','')::int,
          nullif(meta->>'join_troop','')::date, nullif(meta->>'join_current','')::date,
          nullif(meta->>'scout_group',''), nullif(left(trim(meta->>'patrol'),60),''), r);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie puede cambiar su propio rol desde la web (solo desde el SQL Editor)
create or replace function public.profiles_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then new.role := old.role; new.id := old.id; end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_adult());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- 2) Progreso (indicadores, aventurero, especialidades, vida de grupo, cuaderno)
create table if not exists public.progress_items (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  item_key       text not null,
  status         text not null default 'pendiente' check (status in ('pendiente','en_proceso','completado')),
  note           text,
  review_status  text not null default 'pendiente' check (review_status in ('pendiente','aprobado','ajustes')),
  review_comment text,
  reviewed_by    uuid references public.profiles(id),
  reviewed_at    timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, item_key)
);

-- 3) Créditos
create table if not exists public.credit_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  category       text not null,
  activity       text not null,
  credits        int  not null default 0,
  done_on        date,
  note           text,
  review_status  text not null default 'pendiente' check (review_status in ('pendiente','aprobado','ajustes')),
  review_comment text,
  reviewed_by    uuid references public.profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Regla de oro: los jóvenes escriben su avance; los adultos SOLO escriben la revisión.
create or replace function public.review_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.review_status := 'pendiente'; new.review_comment := null;
      new.reviewed_by := null; new.reviewed_at := null;
    end if;
    return new;
  end if;
  if auth.uid() is null then return new; end if;                 -- SQL Editor
  new.user_id := old.user_id;
  if old.user_id = auth.uid() then                               -- el propio joven
    new.review_status := old.review_status; new.review_comment := old.review_comment;
    new.reviewed_by := old.reviewed_by;     new.reviewed_at := old.reviewed_at;
    if to_jsonb(new) - 'review_status' - 'updated_at' is distinct from to_jsonb(old) - 'review_status' - 'updated_at' then
      new.review_status := 'pendiente';                          -- cambió algo: vuelve a revisión
    end if;
  elsif public.is_adult() then                                   -- adulto revisando
    if tg_table_name = 'progress_items' then
      new.status := old.status; new.note := old.note;
    else
      new.category := old.category; new.activity := old.activity; new.credits := old.credits;
      new.done_on := old.done_on;   new.note := old.note;
    end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  else
    raise exception 'No permitido';
  end if;
  return new;
end $$;

drop trigger if exists progress_guard on public.progress_items;
create trigger progress_guard before insert or update on public.progress_items
  for each row execute function public.review_guard();
drop trigger if exists credits_guard on public.credit_entries;
create trigger credits_guard before insert or update on public.credit_entries
  for each row execute function public.review_guard();

alter table public.progress_items enable row level security;
alter table public.credit_entries enable row level security;
drop policy if exists pi_select on public.progress_items;
drop policy if exists pi_insert on public.progress_items;
drop policy if exists pi_update on public.progress_items;
create policy pi_select on public.progress_items for select using (user_id = auth.uid() or public.is_adult());
create policy pi_insert on public.progress_items for insert with check (user_id = auth.uid());
create policy pi_update on public.progress_items for update using (user_id = auth.uid() or public.is_adult());

drop policy if exists ce_select on public.credit_entries;
drop policy if exists ce_insert on public.credit_entries;
drop policy if exists ce_update on public.credit_entries;
drop policy if exists ce_delete on public.credit_entries;
create policy ce_select on public.credit_entries for select using (user_id = auth.uid() or public.is_adult());
create policy ce_insert on public.credit_entries for insert with check (user_id = auth.uid());
create policy ce_update on public.credit_entries for update using (user_id = auth.uid() or public.is_adult());
create policy ce_delete on public.credit_entries for delete using (user_id = auth.uid() and review_status <> 'aprobado');

-- 4) Resumen de todos los jóvenes para el panel de adultos --------------------
-- 3b) Registro en la ASV y ficha médica: SOLO el estado (sí/no y fecha), nunca datos médicos.
--     Lo llenan los adultos mirando IMPEESA; el joven solo puede verlo.
create table if not exists public.member_admin (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  asv_registered    boolean not null default false,
  asv_year          int,
  medical_form      boolean not null default false,
  medical_form_date date,
  updated_by        uuid references public.profiles(id),
  updated_at        timestamptz not null default now()
);
create or replace function public.member_admin_guard() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_by := auth.uid(); new.updated_at := now(); return new; end $$;
drop trigger if exists member_admin_guard on public.member_admin;
create trigger member_admin_guard before insert or update on public.member_admin
  for each row execute function public.member_admin_guard();
alter table public.member_admin enable row level security;
drop policy if exists ma_select on public.member_admin;
drop policy if exists ma_insert on public.member_admin;
drop policy if exists ma_update on public.member_admin;
create policy ma_select on public.member_admin for select using (user_id = auth.uid() or public.is_adult());
create policy ma_insert on public.member_admin for insert with check (public.is_adult());
create policy ma_update on public.member_admin for update using (public.is_adult()) with check (public.is_adult());

drop function if exists public.scout_summary();
create or replace function public.scout_summary()
returns table (user_id uuid, full_name text, age int, scout_group text, patrol text, join_current date,
               ind_done int, ind_approved int, av_done int, esp_done int, camp_done int, exc_done int,
               credits_total int, pending int, last_activity timestamptz,
               asv_registered boolean, asv_year int, medical_form boolean, medical_form_date date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_adult() then raise exception 'Solo para adultos del programa'; end if;
  return query
  select p.id, p.full_name, p.age, p.scout_group, p.patrol, p.join_current,
    coalesce(i.ind_done,0)::int, coalesce(i.ind_approved,0)::int, coalesce(i.av_done,0)::int,
    coalesce(i.esp_done,0)::int, coalesce(i.camp_done,0)::int, coalesce(i.exc_done,0)::int,
    coalesce(c.credits_total,0)::int,
    (coalesce(i.pending,0) + coalesce(c.pending,0))::int,
    greatest(i.last_activity, c.last_activity),
    coalesce(m.asv_registered,false), m.asv_year, coalesce(m.medical_form,false), m.medical_form_date
  from profiles p
  left join (select pi.user_id,
      count(*) filter (where item_key like 'ind:%' and status='completado') ind_done,
      count(*) filter (where item_key like 'ind:%' and status='completado' and review_status='aprobado') ind_approved,
      count(*) filter (where item_key like 'av:%'  and status='completado') av_done,
      count(*) filter (where item_key like 'esp:%' and status='completado') esp_done,
      count(*) filter (where item_key like 'vg:%:camp:%' and status='completado') camp_done,
      count(*) filter (where item_key like 'vg:%:exc:%'  and status='completado') exc_done,
      count(*) filter (where item_key not like 'note:%' and status='completado' and review_status='pendiente') pending,
      max(updated_at) last_activity
    from progress_items pi group by pi.user_id) i on i.user_id = p.id
  left join (select ce.user_id, sum(credits) filter (where review_status<>'ajustes') credits_total,
      count(*) filter (where review_status='pendiente') pending, max(updated_at) last_activity
    from credit_entries ce group by ce.user_id) c on c.user_id = p.id
  left join member_admin m on m.user_id = p.id
  where p.role = 'scout'
  order by p.full_name;
end $$;
grant execute on function public.scout_summary() to authenticated;

-- 5) Código secreto para registrar adultos (CÁMBIALO por uno tuyo) -------------
insert into public.app_settings (key, value) values ('adult_code', 'CAMBIA-ESTE-CODIGO')
on conflict (key) do nothing;

-- 6) Permisos de ejecución (resuelve avisos del Security Advisor) ---------------
-- handle_new_user solo la usa el disparador de auth.users: nadie debe llamarla desde la web
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- is_adult y scout_summary solo para usuarios con sesión iniciada (scout_summary además valida que sea adulto)
revoke execute on function public.is_adult() from public, anon;
revoke execute on function public.scout_summary() from public, anon;
grant execute on function public.is_adult() to authenticated;
grant execute on function public.scout_summary() to authenticated;

-- 7) Marcado por adultos y plantillas de actividad (migración 4, se repite aquí para instalaciones nuevas)

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

-- Ejecutar UNA vez en Supabase → SQL Editor, ANTES de subir el código nuevo.

-- 1) Los jóvenes ya no pueden crear créditos (solo adultos)
drop policy if exists ce_insert on public.credit_entries;
create policy ce_insert on public.credit_entries for insert with check (public.is_adult());

-- 2) Resumen del panel: créditos solo aprobados, y nivel calculado con lo aprobado
--    (indicadores > 80/110/135, campamentos y excursiones de cada nivel, y 16 créditos para Explorador)
drop function if exists public.scout_summary();
create or replace function public.scout_summary()
returns table (user_id uuid, full_name text, age int, scout_group text, patrol text, join_current date,
               ind_done int, ind_approved int, av_done int, esp_done int, camp_done int, exc_done int,
               credits_total int, pending int, last_activity timestamptz,
               asv_registered boolean, asv_year int, medical_form boolean, medical_form_date date, level_id text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_adult() then raise exception 'Solo para adultos del programa'; end if;
  return query
  select t.id, t.full_name, t.age, t.scout_group, t.patrol, t.join_current, t.ind_done, t.ind_approved, t.av_done, t.esp_done,
      t.camp_done, t.exc_done, t.credits_total, t.pending, t.last_activity, t.asv_registered, t.asv_year, t.medical_form,
      t.medical_form_date, (case
      when e_ok and p_ok and b_ok then 'bolivar'
      when e_ok and p_ok then 'pionero'
      when e_ok then 'explorador' else null end)::text
  from (
    select p.id, p.full_name, p.age, p.scout_group, p.patrol, p.join_current,
      coalesce(i.ind_done,0)::int as ind_done, coalesce(i.ind_approved,0)::int as ind_approved, coalesce(i.av_done,0)::int as av_done,
      coalesce(i.esp_done,0)::int as esp_done, coalesce(i.camp_done,0)::int as camp_done, coalesce(i.exc_done,0)::int as exc_done,
      coalesce(c.credits_total,0)::int as credits_total,
      (coalesce(i.pending,0) + coalesce(c.pending,0))::int as pending,
      greatest(i.last_activity, c.last_activity) as last_activity,
      coalesce(m.asv_registered,false) as asv_registered, m.asv_year, coalesce(m.medical_form,false) as medical_form, m.medical_form_date,
      (coalesce(i.ind_approved,0) > 80  and coalesce(i.camp_e,0) >= 6 and coalesce(i.exc_e,0) >= 12 and coalesce(c.credits_total,0) >= 16) as e_ok,
      (coalesce(i.ind_approved,0) > 110 and coalesce(i.camp_p,0) >= 3 and coalesce(i.exc_p,0) >= 6)  as p_ok,
      (coalesce(i.ind_approved,0) > 135 and coalesce(i.camp_b,0) >= 4 and coalesce(i.exc_b,0) >= 8)  as b_ok
    from profiles p
    left join (select pi.user_id,
        count(*) filter (where item_key like 'ind:%' and status='completado') ind_done,
        count(*) filter (where item_key like 'ind:%' and status='completado' and review_status='aprobado') ind_approved,
        count(*) filter (where item_key like 'av:%'  and status='completado') av_done,
        count(*) filter (where item_key like 'esp:%' and status='completado') esp_done,
        count(*) filter (where item_key like 'vg:%:camp:%' and status='completado') camp_done,
        count(*) filter (where item_key like 'vg:%:exc:%'  and status='completado') exc_done,
        count(*) filter (where item_key like 'vg:explorador:camp:%' and status='completado' and review_status='aprobado') camp_e,
        count(*) filter (where item_key like 'vg:explorador:exc:%'  and status='completado' and review_status='aprobado') exc_e,
        count(*) filter (where item_key like 'vg:pionero:camp:%'    and status='completado' and review_status='aprobado') camp_p,
        count(*) filter (where item_key like 'vg:pionero:exc:%'     and status='completado' and review_status='aprobado') exc_p,
        count(*) filter (where item_key like 'vg:bolivar:camp:%'    and status='completado' and review_status='aprobado') camp_b,
        count(*) filter (where item_key like 'vg:bolivar:exc:%'     and status='completado' and review_status='aprobado') exc_b,
        count(*) filter (where item_key not like 'note:%' and status='completado' and review_status='pendiente') pending,
        max(updated_at) last_activity
      from progress_items pi group by pi.user_id) i on i.user_id = p.id
    left join (select ce.user_id, sum(credits) filter (where review_status='aprobado') credits_total,
        count(*) filter (where review_status='pendiente') pending, max(updated_at) last_activity
      from credit_entries ce group by ce.user_id) c on c.user_id = p.id
    left join member_admin m on m.user_id = p.id
    where p.role = 'scout'
  ) t
  order by t.full_name;
end $$;
revoke execute on function public.scout_summary() from public, anon;
grant execute on function public.scout_summary() to authenticated;
