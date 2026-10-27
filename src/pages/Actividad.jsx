import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, CheckCheck, Save, Users, ListChecks, CalendarCheck, ChevronDown } from 'lucide-react'
import { db } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { useUI } from '../lib/ui.jsx'
import { AREAS, CREDIT_CATALOG, kInd } from '../lib/data.js'
import { fmtDate } from '../lib/stats.js'
import { BrandLogo } from '../components/Fleur.jsx'

const CUSTOM = '__otra__'

// Un adulto registra una actividad (ciclo institucional, programa mundial…): marca los indicadores
// que cumplió cada joven participante y, si quiere, les suma los créditos. Todo queda aprobado.
export default function Actividad() {
  const { profile } = useAuth()
  const { toast } = useUI()
  const [params] = useSearchParams()
  const [youths, setYouths] = useState(null)
  const [templates, setTemplates] = useState(undefined) // undefined=cargando, null=sin migración
  const [actKey, setActKey] = useState('')              // "Categoría||Actividad" o CUSTOM
  const [custom, setCustom] = useState('')
  const [date, setDate] = useState('')
  const [withCredits, setWithCredits] = useState(true)
  const [sel, setSel] = useState(() => new Set(params.get('joven') ? [params.get('joven')] : []))
  const [keys, setKeys] = useState(() => new Set())
  const [q, setQ] = useState('')
  const [patrol, setPatrol] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => { db.summary().then(setYouths).catch(() => setYouths([])); db.listTemplates().then(setTemplates).catch(() => setTemplates(null)) }, [])

  const [cat, act] = actKey && actKey !== CUSTOM ? actKey.split('||') : ['', '']
  const catalogItem = cat ? CREDIT_CATALOG[cat]?.find(x => x.a === act) : null
  const actName = actKey === CUSTOM ? custom.trim() : act
  const source = actName ? (date ? `${actName} · ${fmtDate(date)}` : actName) : ''
  const tpl = useMemo(() => (templates || []).find(t => t.name === actName), [templates, actName])
  const credits = actKey === CUSTOM ? 0 : (catalogItem?.c || 0)

  useEffect(() => { setWithCredits(Boolean(catalogItem)) }, [actKey]) // eslint-disable-line
  useEffect(() => { if (tpl && keys.size === 0) setKeys(new Set(tpl.item_keys)) }, [tpl]) // eslint-disable-line

  const patrols = useMemo(() => [...new Set((youths || []).map(y => (y.patrol || '').trim()).filter(Boolean))].sort(), [youths])
  const shown = useMemo(() => (youths || []).filter(y => y.full_name.toLowerCase().includes(q.toLowerCase()) && (!patrol || (y.patrol || '').trim() === patrol)), [youths, q, patrol])

  const toggle = (set, setter, v) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n) }
  const setMany = (list, on) => { const n = new Set(keys); list.forEach(k => on ? n.add(k) : n.delete(k)); setKeys(n) }
  const total = sel.size * keys.size
  const ready = actName && sel.size > 0 && (keys.size > 0 || (withCredits && credits > 0))

  async function saveTemplate() {
    try { await db.saveTemplate(actName, [...keys]); setTemplates(await db.listTemplates()); toast(`Plantilla guardada: ${keys.size} indicadores`) } catch { toast('No se pudo guardar la plantilla', 'err') }
  }
  async function submit() {
    const who = sel.size === 1 ? '1 joven' : `${sel.size} jóvenes`
    const msg = `Vas a registrar «${source}» para ${who}:\n• ${keys.size} indicadores marcados como cumplidos y aprobados${withCredits && credits ? `\n• +${credits} ${credits === 1 ? 'crédito' : 'créditos'} a cada uno` : ''}\n\n¿Confirmas?`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      const rows = [...sel].flatMap(uid => [...keys].map(k => ({ user_id: uid, item_key: k, status: 'completado', source, review_status: 'aprobado' })))
      if (rows.length) await db.adultMarkMany(rows)
      if (withCredits && credits) await db.adultAddCredits([...sel].map(uid => ({ user_id: uid, category: cat, activity: act, credits, done_on: date || null, note: source })))
      setDone({ n: rows.length, who: sel.size, credits: withCredits ? credits * sel.size : 0, source })
      try { localStorage.setItem('tropa-last-source', source) } catch { }
    } catch (e) { toast('No se pudo registrar. Revisa que corriste la migración 4 en Supabase.', 'err') }
    finally { setBusy(false) }
  }

  if (done) return (
    <div className="panel-wrap">
      <Top name={profile?.full_name} />
      <div className="page narrow">
        <div className="card done-card">
          <CalendarCheck size={40} />
          <h1>¡Actividad registrada!</h1>
          <p className="lead">«{done.source}» quedó anotada para {done.who} {done.who === 1 ? 'joven' : 'jóvenes'}: {done.n} indicadores marcados{done.credits ? ` y ${done.credits} créditos sumados` : ''}. Ellos lo verán en su inicio.</p>
          <div className="review-actions"><button className="btn primary" onClick={() => { setDone(null); setKeys(new Set()); setSel(new Set()) }}>Registrar otra actividad</button><Link to="/panel" className="btn ghost">Volver al panel</Link></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="panel-wrap">
      <Top name={profile?.full_name} />
      <div className="page">
        <h1>Registrar actividad</h1>
        <p className="lead">Úsalo cuando los jóvenes participaron en un ciclo institucional o un programa mundial y quieres marcarles de una vez los indicadores que cumplieron. Queda aprobado y con el nombre de la actividad.</p>

        <section className="card step">
          <h2><span className="step-n">1</span> ¿Qué actividad fue?</h2>
          <div className="row2">
            <label>Actividad
              <select value={actKey} onChange={e => setActKey(e.target.value)}>
                <option value="">Elige una actividad…</option>
                {Object.entries(CREDIT_CATALOG).map(([c, list]) => (
                  <optgroup key={c} label={c}>{list.map(x => <option key={c + x.a} value={`${c}||${x.a}`}>{x.a} (+{x.c})</option>)}</optgroup>
                ))}
                <option value={CUSTOM}>Otra actividad (escribir nombre)…</option>
              </select></label>
            <label>Fecha (opcional)<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          </div>
          {actKey === CUSTOM && <label>Nombre de la actividad<input maxLength={70} value={custom} onChange={e => setCustom(e.target.value)} placeholder="Ej: Encuentro regional de tropas" /></label>}
          {catalogItem && <label className="check-inline"><input type="checkbox" checked={withCredits} onChange={e => setWithCredits(e.target.checked)} /> También sumar {credits} {credits === 1 ? 'crédito' : 'créditos'} a cada participante</label>}
        </section>

        <section className="card step">
          <h2><span className="step-n">2</span> ¿Quiénes participaron? <small>{sel.size} elegidos</small></h2>
          {!youths ? <div className="spinner" /> : youths.length === 0 ? <p className="empty">Todavía no hay jóvenes registrados.</p> : (
            <>
              <div className="filters">
                <label className="search"><Search size={17} /><input placeholder="Buscar por nombre" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" /></label>
                {patrols.length > 0 && <select value={patrol} onChange={e => setPatrol(e.target.value)} aria-label="Patrulla"><option value="">Todas las patrullas</option>{patrols.map(p => <option key={p}>{p}</option>)}</select>}
                <button className="btn sm ghost" onClick={() => { const n = new Set(sel); shown.forEach(y => n.add(y.user_id)); setSel(n) }}><Users size={15} /> Elegir los que se ven</button>
                <button className="btn sm ghost" onClick={() => setSel(new Set())}>Ninguno</button>
              </div>
              <ul className="pick-list">
                {shown.map(y => (
                  <li key={y.user_id}><label className="check-inline"><input type="checkbox" checked={sel.has(y.user_id)} onChange={() => toggle(sel, setSel, y.user_id)} />
                    <span><b>{y.full_name}</b> <small className="muted">{y.patrol ? `Patrulla ${y.patrol}` : 'Sin patrulla'}{y.scout_group ? ` · ${y.scout_group}` : ''}</small></span></label></li>
                ))}
                {shown.length === 0 && <p className="muted">Nadie coincide con el filtro.</p>}
              </ul>
            </>
          )}
        </section>

        <section className="card step">
          <h2><span className="step-n">3</span> ¿Qué indicadores cumplieron? <small>{keys.size} elegidos</small></h2>
          {tpl && keys.size === 0 && <p className="tip">Esta actividad tiene una plantilla guardada con {tpl.item_keys.length} indicadores.</p>}
          {tpl && keys.size > 0 && <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setKeys(new Set(tpl.item_keys))}>Cargar la plantilla ({tpl.item_keys.length})</button>}
          <div className="area-pick">
            {AREAS.map(a => {
              const all = ['3', '4'].flatMap(s => a.stages[s].map(i => kInd(a.id, s, i.k)))
              const n = all.filter(k => keys.has(k)).length
              return (
                <details key={a.id} style={{ '--c': a.c, '--soft': a.soft }} open={n > 0}>
                  <summary><i className="dot" /><b>{a.name}</b><span className="tag neutral">{n} de {all.length}</span><ChevronDown size={18} className="chev" /></summary>
                  {['3', '4'].map(s => {
                    const list = a.stages[s].map(i => kInd(a.id, s, i.k))
                    return (
                      <div key={s} className="stage-pick">
                        <div className="stage-head"><b>Etapa {s}</b>
                          <button className="link-btn" onClick={() => setMany(list, !list.every(k => keys.has(k)))}>{list.every(k => keys.has(k)) ? 'Quitar todos' : 'Marcar todos'}</button></div>
                        <ul>{a.stages[s].map(i => { const k = kInd(a.id, s, i.k); return (
                          <li key={k}><label className="check-inline"><input type="checkbox" checked={keys.has(k)} onChange={() => toggle(keys, setKeys, k)} />
                            <span><b className="letter">{i.k.toUpperCase()}</b> {i.t}</span></label></li>) })}</ul>
                      </div>
                    )
                  })}
                </details>
              )
            })}
          </div>
          {templates !== null && actName && keys.size > 0 && <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={saveTemplate}><Save size={15} /> Guardar esta selección como plantilla de «{actName}»</button>}
          {templates === null && <p className="muted small">Para guardar plantillas, corre la migración 4 en Supabase.</p>}
        </section>
      </div>

      <div className="action-bar">
        <div><ListChecks size={18} /> <b>{sel.size}</b> {sel.size === 1 ? 'joven' : 'jóvenes'} × <b>{keys.size}</b> indicadores = <b>{total}</b> marcas{withCredits && credits ? ` · +${credits} créditos c/u` : ''}</div>
        <button className="btn primary" disabled={!ready || busy} onClick={submit}><CheckCheck size={17} /> {busy ? 'Registrando…' : 'Registrar actividad'}</button>
      </div>
    </div>
  )
}

function Top({ name }) {
  return (
    <header className="panel-top">
      <Link to="/panel" className="brand"><BrandLogo /> Mi Progresión · Adultos</Link>
      <span className="grow" />
      <Link to="/panel" className="link-btn"><ArrowLeft size={15} /> Volver al panel</Link>
      <span className="who">{name}</span>
    </header>
  )
}
