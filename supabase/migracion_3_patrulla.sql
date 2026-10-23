-- MIGRACIÓN 3: patrulla del joven. Pega esto en SQL Editor > Run (una sola vez).
alter table public.profiles add column if not exists patrol text;

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
revoke execute on function public.scout_summary() from public, anon;
grant execute on function public.scout_summary() to authenticated;
-- handle_new_user sigue sin ser ejecutable desde la web:
revoke execute on function public.handle_new_user() from public, anon, authenticated;
