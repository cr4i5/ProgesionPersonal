import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useProgress } from '../lib/progress.jsx'
import { CREDIT_CATALOG, CREDITS_MIN } from '../lib/data.js'
import { fmtDate } from '../lib/stats.js'
import { PageHead } from './Areas.jsx'
import Bar from '../components/Bar.jsx'
import { ReviewBox, Feedback } from '../components/Item.jsx'
import { UserCheck } from 'lucide-react'

const TAGS = { aprobado: ['ok', 'Aprobado'], ajustes: ['warn', 'Para mejorar'], pendiente: ['wait', 'En revisión'] }

export default function Creditos() {
  const { credits, stats, addCredit, deleteCredit, reviewCredit, adult, toast } = useProgress()
  const cats = Object.keys(CREDIT_CATALOG)
  const [cat, setCat] = useState(cats[0])
  const [act, setAct] = useState(CREDIT_CATALOG[cats[0]][0].a)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const pick = c => { setCat(c); setAct(CREDIT_CATALOG[c][0].a) }
  const value = CREDIT_CATALOG[cat].find(x => x.a === act)?.c ?? 0
  async function add(e) {
    e.preventDefault()
    if (await addCredit({ category: cat, activity: act, credits: value, done_on: date || null, note: note.trim() || null })) { toast(`+${value} créditos`); setNote(''); setDate('') }
  }
  return (
    <div className="page" style={{ '--c': '#C98A00' }}>
      <PageHead title="Créditos" sub={adult ? `Explorador exige mínimo ${CREDITS_MIN} créditos. Solo cuentan los que registra o aprueba un adulto.` : `Para completar Explorador necesitas mínimo ${CREDITS_MIN} créditos, registrados por tus adultos.`} />
      <div className="card credit-total">
        <strong>{stats.credits}<small> / {CREDITS_MIN}</small></strong>
        <div><Bar value={stats.credits} total={CREDITS_MIN} color="#C98A00" height={12} label="Créditos" />
          <span className="muted">{stats.credits >= CREDITS_MIN ? '¡Meta de créditos cumplida!' : `Te faltan ${CREDITS_MIN - stats.credits}`}</span></div>
      </div>
      {adult ? (
        <form className="card form" onSubmit={add}>
          <h3>Registrar una actividad a este joven</h3>
          <div className="row2">
            <label>Tipo de actividad
              <select value={cat} onChange={e => pick(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Actividad
              <select value={act} onChange={e => setAct(e.target.value)}>{CREDIT_CATALOG[cat].map(x => <option key={x.a} value={x.a}>{x.a} (+{x.c})</option>)}</select></label>
          </div>
          <div className="row2">
            <label>Fecha<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
            <label>Nota (opcional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Dónde fue, con quién…" /></label>
          </div>
          <button className="btn primary"><Plus size={17} /> Registrar · +{value} {value === 1 ? 'crédito' : 'créditos'}</button>
        </form>
      ) : (
        <div className="card note-card"><UserCheck size={20} /><span>Los créditos los registran tus adultos cuando participas en una actividad. Si hiciste algo que no aparece aquí, avísales.</span></div>
      )}
      <h2 className="h-section">{adult ? 'Actividades registradas' : 'Mis actividades'}</h2>
      {credits.length === 0 && <p className="empty">Aún no hay actividades registradas.</p>}
      <ul className="items">
        {credits.map(c => (
          <li key={c.id} className="item done" style={{ '--c': '#C98A00' }}>
            <div className="item-main">
              <span className="credit-pill">+{c.credits}</span>
              <div className="item-body"><div className="item-title">{c.activity}</div><p className="muted">{c.category}{c.done_on ? ` · ${fmtDate(c.done_on)}` : ''}</p>{c.note && <p>{c.note}</p>}</div>
              {c.marked_by && <span className="tag mark"><UserCheck size={13} /> Registrado por {adult ? 'un' : 'tu'} adulto</span>}
              <span className={`tag ${TAGS[c.review_status][0]}`}>{TAGS[c.review_status][1]}</span>
              {((!adult && c.review_status !== 'aprobado') || (adult && c.marked_by)) && <button className="icon-btn" aria-label="Eliminar" onClick={() => deleteCredit(c.id)}><Trash2 size={18} /></button>}
            </div>
            <Feedback row={{ ...c, status: 'completado' }} />
            {adult && !c.marked_by && <ReviewBox row={c} onReview={r => reviewCredit(c.id, r)} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
