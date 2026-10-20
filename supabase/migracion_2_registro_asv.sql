-- MIGRACIÓN 2: registro ASV + ficha médica (solo estado). Pega esto en SQL Editor > Run.
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
returns table (user_id uuid, full_name text, age int, scout_group text, join_current date,
               ind_done int, ind_approved int, av_done int, esp_done int, camp_done int, exc_done int,
               credits_total int, pending int, last_activity timestamptz,
               asv_registered boolean, asv_year int, medical_form boolean, medical_form_date date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_adult() then raise exception 'Solo para adultos del programa'; end if;
  return query
  select p.id, p.full_name, p.age, p.scout_group, p.join_current,
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
revoke execute on function public.scout_summary() from public, anon;
grant execute on function public.scout_summary() to authenticated;
