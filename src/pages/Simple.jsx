import { useState } from 'react'
import { useProgress } from '../lib/progress.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useUI } from '../lib/ui.jsx'
import { AVENTURERO, METALS, SPECIALTY_NUMBERS, LEVELS, NOTE_KEYS, kAv, kEsp, kVg } from '../lib/data.js'
import { PageHead } from './Areas.jsx'
import Item from '../components/Item.jsx'
import Bar from '../components/Bar.jsx'

export function Aventurero() {
  const { stats, adult } = useProgress()
  return (
    <div className="page" style={{ '--c': '#0E7C86' }}>
      <PageHead title="Aventurero" sub="Las 9 metas para empezar tu camino en la Tropa. Marca cada una cuando la completes." />
      <Bar value={stats.av} total={AVENTURERO.length} color="#0E7C86" height={10} label="Aventurero" />
      <p className="bar-caption">{stats.av} de {AVENTURERO.length} metas{stats.av === AVENTURERO.length ? ' · ¡Aventurero completado!' : ''}</p>
      <ul className="items">
        {AVENTURERO.map((t, i) => <Item key={i} k={kAv(i + 1)} tag={String(i + 1)} text={t} color="#0E7C86" />)}
      </ul>
    </div>
  )
}

function SpecCard({ n, title }) {
  return (
    <section className="card spec">
      <h3>{title}</h3>
      <ul className="items flat">
        {METALS.map(m => (
          <Item key={m.id} k={kEsp(n, m.id)} title={m.name} color={m.c} variant="tri"
            noteLabel={n === 'pf' ? 'Detalles' : '¿Cuál especialidad es? ¿En qué etapa vas?'} notePlaceholder="Escríbelo aquí…" />
        ))}
      </ul>
    </section>
  )
}
export function Especialidades() {
  const { stats } = useProgress()
  return (
    <div className="page">
      <PageHead title="Especialidades y cursos" sub={`Cada especialidad se puede lograr en bronce, plata y oro. Llevas ${stats.esp} finalizadas.`} />
      <div className="spec-grid">
        {SPECIALTY_NUMBERS.map(n => <SpecCard key={n} n={n} title={`Especialidad ${n}`} />)}
        <SpecCard n="pf" title="Punta de flecha" />
      </div>
    </div>
  )
}

export function VidaGrupo() {
  const { items } = useProgress()
  const [lv, setLv] = useState('explorador')
  const L = LEVELS.find(l => l.id === lv)
  const count = kind => Object.values(items).filter(r => r.item_key.startsWith(`vg:${lv}:${kind}:`) && r.status === 'completado').length
  const group = (kind, label, total) => (
    <section className="card">
      <h3>{label} <small>{count(kind)}/{total}</small></h3>
      <ul className="items flat">
        {Array.from({ length: total }, (_, i) => (
          <Item key={i} k={kVg(lv, kind, i + 1)} title={`${label.slice(0, -1)} ${i + 1}`} color="#1E9566" variant="tri"
            noteLabel="¿Dónde y cuándo fue?" notePlaceholder="Ej: Campamento de otoño, 12 de octubre" />
        ))}
      </ul>
    </section>
  )
  return (
    <div className="page">
      <PageHead title="Vida de grupo" sub="Registra los campamentos y excursiones de cada nivel." />
      <div className="seg">
        {LEVELS.map(l => <button key={l.id} className={lv === l.id ? 'on' : ''} onClick={() => setLv(l.id)}>{l.name}</button>)}
      </div>
      <div className="two-col">
        {group('camp', 'Campamentos', L.camps)}
        {group('exc', 'Excursiones', L.excs)}
      </div>
    </div>
  )
}

function Notebook({ k, title, hint }) {
  const { items, save, adult } = useProgress()
  const row = items[k]
  const [v, setV] = useState(row?.note || '')
  const [dirty, setDirty] = useState(false)
  return (
    <section className="card">
      <h3>{title}</h3>
      <p className="muted">{hint}</p>
      <textarea className="big-note" rows={7} disabled={adult} value={v} placeholder={adult ? 'Sin notas' : 'Escribe aquí…'}
        onChange={e => { setV(e.target.value); setDirty(true) }}
        onBlur={() => { if (dirty) { save(k, { status: 'pendiente', note: v }); setDirty(false) } }} />
    </section>
  )
}
export function Cuaderno() {
  return (
    <div className="page">
      <PageHead title="Cuaderno" sub="Un espacio tuyo para anotar ideas y recordatorios. Se guarda solo cuando sales del cuadro." />
      <div className="three-col">{NOTE_KEYS.map(n => <Notebook key={n.key} k={n.key} title={n.title} hint={n.hint} />)}</div>
    </div>
  )
}

export function Perfil() {
  const { profile, updateProfile, user } = useAuth()
  const { toast } = useUI()
  const [f, setF] = useState({ full_name: profile.full_name || '', age: profile.age ?? '', join_troop: profile.join_troop || '', join_current: profile.join_current || '', scout_group: profile.scout_group || '' })
  const [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault(); setBusy(true)
    try { await updateProfile({ full_name: f.full_name.trim(), age: f.age === '' ? null : +f.age, join_troop: f.join_troop || null, join_current: f.join_current || null, scout_group: f.scout_group.trim() || null }); toast('Perfil guardado') }
    catch { toast('No se pudo guardar el perfil', 'err') } finally { setBusy(false) }
  }
  return (
    <div className="page narrow">
      <PageHead title="Mi perfil" sub={user?.email} />
      <form className="card form" onSubmit={submit}>
        <label>Nombre completo<input required value={f.full_name} onChange={set('full_name')} /></label>
        <div className="row2">
          <label>Edad<input type="number" min="5" max="99" value={f.age} onChange={set('age')} /></label>
          <label>Grupo scout<input value={f.scout_group} onChange={set('scout_group')} /></label>
        </div>
        <div className="row2">
          <label>Fecha de ingreso (Tropa)<input type="date" value={f.join_troop} onChange={set('join_troop')} /></label>
          <label>Fecha de ingreso (Tropa actual)<input type="date" value={f.join_current} onChange={set('join_current')} /></label>
        </div>
        <button className="btn primary" disabled={busy}>Guardar cambios</button>
      </form>
    </div>
  )
}
