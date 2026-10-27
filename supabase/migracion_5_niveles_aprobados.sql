-- Migración 5: el nivel solo cuenta lo aprobado por adultos; los créditos los registran solo los adultos.
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
    select p.id as id, p.full_name, p.age, p.scout_group, p.patrol, p.join_current,
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
