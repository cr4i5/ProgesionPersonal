-- Migración 7: lista de patrullas administrada por adultos (agregar, renombrar, eliminar) y unificación automática.
-- Ejecutar UNA vez en Supabase → SQL Editor, ANTES de subir el código nuevo.

-- 1) Clave de comparación: "Búfalo", "bufalos", "Patrulla Búfalos" → "bufalo"
create or replace function public.patrol_key(t text) returns text
language sql immutable set search_path = public as $$
  select case when length(k) > 5 and k ~ '[nldz]es$' then left(k, length(k)-2)
              when length(k) > 3 and right(k,1) = 's' then left(k, length(k)-1) else k end
  from (select regexp_replace(
          regexp_replace(lower(translate(coalesce(t,''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '^\s*patrulla\s+', ''),
          '[^a-z0-9]', '', 'g') as k) x
$$;

-- 2) Tabla de patrullas (cualquiera puede LEER la lista, incluso al registrarse; solo se escribe con las funciones de abajo)
create table if not exists public.patrols (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 40),
  key        text not null unique,
  created_at timestamptz not null default now()
);
alter table public.patrols enable row level security;
drop policy if exists patrols_read on public.patrols;
create policy patrols_read on public.patrols for select using (true);
revoke all on public.patrols from anon, authenticated;
grant select on public.patrols to anon, authenticated;

-- 3) Unificar lo que ya escribieron los jóvenes: una patrulla por cada "clave" (queda la variante más usada; si empatan, la más larga)
insert into public.patrols (name, key)
select distinct on (k) initcap(regexp_replace(trim(raw), '^patrulla\s+', '', 'i')), k
from (select trim(patrol) raw, public.patrol_key(patrol) k, count(*) over (partition by trim(patrol)) n
      from public.profiles where nullif(trim(patrol),'') is not null) t
where k <> ''
order by k, n desc, length(trim(raw)) desc, raw
on conflict (key) do nothing;

alter table public.profiles disable trigger profiles_guard;
update public.profiles p set patrol = pa.name
  from public.patrols pa where nullif(trim(p.patrol),'') is not null and pa.key = public.patrol_key(p.patrol) and p.patrol is distinct from pa.name;
alter table public.profiles enable trigger profiles_guard;

-- 4) Los jóvenes solo pueden elegir una patrulla de la lista (se guarda siempre con el nombre oficial)
create or replace function public.profiles_guard() returns trigger
language plpgsql set search_path = public as $$
declare canon text;
begin
  if auth.uid() is not null then
    new.role := old.role; new.id := old.id;
    if new.patrol is distinct from old.patrol then
      if nullif(trim(new.patrol),'') is null then new.patrol := null;
      else
        select name into canon from patrols where key = public.patrol_key(new.patrol);
        if canon is null then raise exception 'Elige una patrulla de la lista'; end if;
        new.patrol := canon;
      end if;
    end if;
  end if;
  return new;
end $$;

-- 5) Al registrarse: si la patrulla coincide con la lista se guarda con el nombre oficial
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
          nullif(meta->>'scout_group',''),
          case when r = 'scout' then (select name from public.patrols where key = public.patrol_key(meta->>'patrol')) end, r);
  return new;
end $$;

-- 6) Funciones para adultos
create or replace function public.patrol_add(p_name text) returns public.patrols
language plpgsql security definer set search_path = public as $$
declare k text := public.patrol_key(p_name); n text := left(regexp_replace(trim(p_name), '^patrulla\s+', '', 'i'),40); r public.patrols;
begin
  if not public.is_adult() then raise exception 'Solo para adultos del programa'; end if;
  if k = '' then raise exception 'Escribe un nombre'; end if;
  if exists (select 1 from patrols where key = k) then raise exception 'Ya existe una patrulla parecida: %', (select name from patrols where key = k); end if;
  insert into patrols (name, key) values (n, k) returning * into r;
  return r;
end $$;

-- Renombrar. Si el nuevo nombre equivale a otra patrulla, se unifican (los jóvenes pasan a la otra y esta se elimina).
create or replace function public.patrol_rename(p_id uuid, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare k text := public.patrol_key(p_name); n text := left(regexp_replace(trim(p_name), '^patrulla\s+', '', 'i'),40); old patrols; other patrols;
begin
  if not public.is_adult() then raise exception 'Solo para adultos del programa'; end if;
  if k = '' then raise exception 'Escribe un nombre'; end if;
  select * into old from patrols where id = p_id; if not found then raise exception 'La patrulla ya no existe'; end if;
  select * into other from patrols where key = k and id <> p_id;
  if found then
    update profiles set patrol = other.name where role = 'scout' and public.patrol_key(patrol) = old.key;
    delete from patrols where id = p_id;
    return other.name;
  end if;
  update patrols set name = n, key = k where id = p_id;
  update profiles set patrol = n where role = 'scout' and public.patrol_key(patrol) = old.key;
  return n;
end $$;

-- Eliminar: los jóvenes de esa patrulla quedan "sin patrulla" y deberán elegir otra en Mi perfil.
create or replace function public.patrol_delete(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare old patrols; n int;
begin
  if not public.is_adult() then raise exception 'Solo para adultos del programa'; end if;
  select * into old from patrols where id = p_id; if not found then return 0; end if;
  update profiles set patrol = null where role = 'scout' and public.patrol_key(patrol) = old.key;
  get diagnostics n = row_count;
  delete from patrols where id = p_id;
  return n;
end $$;

revoke execute on function public.patrol_add(text), public.patrol_rename(uuid,text), public.patrol_delete(uuid) from public, anon;
grant execute on function public.patrol_add(text), public.patrol_rename(uuid,text), public.patrol_delete(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
