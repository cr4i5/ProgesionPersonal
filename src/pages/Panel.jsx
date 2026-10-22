import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Download, Clock, ChevronRight, LogOut } from 'lucide-react'
import Fleur, { BrandLogo } from '../components/Fleur.jsx'
import { db } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { LEVELS, TOTAL_INDICATORS } from '../lib/data.js'
import { levelOfIndicators, ago } from '../lib/stats.js'
import Bar from '../components/Bar.jsx'

export default function Panel() {
  const { signOut, profile } = useAuth()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(false)
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [onlyPending, setOnlyPending] = useState(false)
  const [noAsv, setNoAsv] = useState(false)
  const [noMed, setNoMed] = useState(false)
  useEffect(() => { db.summary().then(setRows).catch(() => setErr(true)) }, [])

  const groups = useMemo(() => [...new Set((rows || []).map(r => r.scout_group).filter(Boolean))].sort(), [rows])
  const list = useMemo(() => (rows || []).filter(r =>
    r.full_name.toLowerCase().includes(q.toLowerCase()) && (!group || r.scout_group === group) && (!onlyPending || r.pending > 0) && (!noAsv || r.asv_registered === false) && (!noMed || r.medical_form === false)
  ).sort((a, b) => (b.pending - a.pending) || a.full_name.localeCompare(b.full_name)), [rows, q, group, onlyPending, noAsv, noMed])

  function exportCsv() {
    const head = ['Nombre', 'Edad', 'Grupo', 'Indicadores marcados', 'Indicadores aprobados', 'Nivel', 'Aventurero (de 9)', 'Especialidades', 'Campamentos', 'Excursiones', 'Créditos', 'Pendientes de revisión', 'Última actividad', 'Inscrito ASV', 'Año inscripción', 'Ficha médica entregada']
    const lines = (rows || []).map(r => [r.full_name, r.age ?? '', r.scout_group ?? '', r.ind_done, r.ind_approved, levelOfIndicators(r.ind_done)?.name || 'En camino', r.av_done, r.esp_done, r.camp_done, r.exc_done, r.credits_total, r.pending, r.last_activity?.slice(0, 10) ?? '', r.asv_registered ? 'Sí' : 'No', r.asv_year ?? '', r.medical_form ? 'Sí' : 'No'])
    const csv = [head, ...lines].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'progresion-tropa.csv'; a.click()
  }
  const totalPending = (rows || []).reduce((s, r) => s + r.pending, 0)

  return (
    <div className="panel-wrap">
      <header className="panel-top">
        <span className="brand"><BrandLogo /> Mi Progresión · Adultos</span>
        <span className="grow" />
        <span className="who">{profile?.full_name}</span>
        <button className="link-btn" onClick={signOut}><LogOut size={15} /> Salir</button>
      </header>
      <div className="page">
        <h1>Panel de adultos de programa</h1>
        <p className="lead">Revisa lo que los jóvenes marcaron, apruébalo o pide ajustes con un comentario.</p>
        {err && <p className="callout warn">No se pudo cargar el resumen. Verifica que ejecutaste el archivo schema.sql y que tu cuenta es de adulto.</p>}
        {!rows && !err && <div className="center-screen short"><div className="spinner" /></div>}
        {rows && (
          <>
            <div className="tiles small">
              <div className="tile static"><strong>{rows.length}</strong><span>Jóvenes registrados</span></div>
              <div className="tile static"><strong>{totalPending}</strong><span>Logros por revisar</span></div>
              <div className="tile static"><strong>{rows.filter(r => levelOfIndicators(r.ind_done)).length}</strong><span>Con un nivel completado</span></div>
            </div>
            <div className="filters">
              <label className="search"><Search size={17} /><input placeholder="Buscar por nombre" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar por nombre" /></label>
              <select value={group} onChange={e => setGroup(e.target.value)} aria-label="Grupo"><option value="">Todos los grupos</option>{groups.map(g => <option key={g}>{g}</option>)}</select>
              <label className="check-inline"><input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} /> Solo con pendientes</label>
              {rows.some(r => r.asv_registered !== undefined) && <>
                <label className="check-inline"><input type="checkbox" checked={noAsv} onChange={e => setNoAsv(e.target.checked)} /> Sin inscripción ASV</label>
                <label className="check-inline"><input type="checkbox" checked={noMed} onChange={e => setNoMed(e.target.checked)} /> Sin ficha médica</label></>}
              <button className="btn ghost sm" onClick={exportCsv}><Download size={15} /> Descargar Excel (CSV)</button>
            </div>
            {rows.length === 0 && <p className="empty">Todavía no se ha registrado ningún joven. Comparte el enlace de esta página con ellos.</p>}
            <ul className="scouts">
              {list.map(r => {
                const lvl = levelOfIndicators(r.ind_done)
                return (
                  <li key={r.user_id}>
                    <Link to={`/panel/${r.user_id}`} className="scout-row">
                      <div className="avatar" aria-hidden="true">{r.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</div>
                      <div className="sr-name"><b>{r.full_name}</b><span>{r.age ? `${r.age} años · ` : ''}{r.scout_group || 'Sin grupo'} · {ago(r.last_activity)}</span>
                        {r.asv_registered !== undefined && <span className="sr-flags"><em className={`tag ${r.asv_registered ? 'ok' : 'wait'}`}>{r.asv_registered ? 'ASV ✓' : 'Sin ASV'}</em><em className={`tag ${r.medical_form ? 'ok' : 'wait'}`}>{r.medical_form ? 'Ficha ✓' : 'Sin ficha'}</em></span>}</div>
                      <div className="sr-prog">
                        <div className="sr-top"><span>{r.ind_done}<small>/{TOTAL_INDICATORS}</small></span><em className={`lvl ${lvl ? lvl.id : ''}`}>{lvl && <span className="lvl-fleur"><Fleur size={13} /></span>}{lvl ? lvl.name : 'En camino'}</em></div>
                        <Bar value={r.ind_done} total={LEVELS[2].goal} approved={r.ind_approved} color="var(--lake)" height={7} label="Indicadores" />
                      </div>
                      <div className="sr-pend">{r.pending > 0 ? <span className="tag wait"><Clock size={13} /> {r.pending}</span> : <span className="muted">Al día</span>}</div>
                      <ChevronRight size={19} className="chev" />
                    </Link>
                  </li>
                )
              })}
              {rows.length > 0 && list.length === 0 && <p className="empty">Ningún joven coincide con el filtro.</p>}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
