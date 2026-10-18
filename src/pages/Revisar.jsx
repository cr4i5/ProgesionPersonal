import { Link } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import { useProgress } from '../lib/progress.jsx'
import { INDEX } from '../lib/data.js'
import { PageHead } from './Areas.jsx'
import { ReviewBox } from '../components/Item.jsx'

// Lista de todo lo que el joven marcó y aún no tiene respuesta del adulto.
export default function Revisar() {
  const { items, credits, review, reviewCredit, base, person } = useProgress()
  const list = Object.values(items).filter(r => !r.item_key.startsWith('note:') && r.status === 'completado' && r.review_status === 'pendiente')
  const cr = credits.filter(c => c.review_status === 'pendiente')
  const approveAll = async () => { for (const r of list) await review(r.item_key, { review_status: 'aprobado', review_comment: r.review_comment || '' }); for (const c of cr) await reviewCredit(c.id, { review_status: 'aprobado', review_comment: '' }) }
  return (
    <div className="page">
      <PageHead title="Por revisar" sub={`Logros que ${person?.full_name?.split(' ')[0]} marcó y esperan tu respuesta.`} />
      {list.length + cr.length === 0 && <p className="empty">No hay nada pendiente. Todo está al día.</p>}
      {list.length + cr.length > 1 && <button className="btn ghost" onClick={approveAll}><CheckCheck size={17} /> Aprobar todo ({list.length + cr.length})</button>}
      <ul className="items">
        {list.map(r => {
          const info = INDEX[r.item_key] || { section: '', label: r.item_key, text: '' }
          return (
            <li key={r.item_key} className="item done" style={{ '--c': info.color }}>
              <div className="item-main"><div className="item-body">
                <div className="item-title"><Link to={`${base}/${info.path}`}>{info.section} · {info.label}</Link></div>
                {info.text && <p>{info.text}</p>}
                {r.note && <div className="kid-note"><b>Nota del joven:</b> {r.note}</div>}
              </div></div>
              <ReviewBox row={r} onReview={x => review(r.item_key, x)} />
            </li>
          )
        })}
        {cr.map(c => (
          <li key={c.id} className="item done" style={{ '--c': '#C98A00' }}>
            <div className="item-main"><span className="credit-pill">+{c.credits}</span><div className="item-body"><div className="item-title">Créditos · {c.activity}</div><p className="muted">{c.category}</p></div></div>
            <ReviewBox row={c} onReview={x => reviewCredit(c.id, x)} />
          </li>
        ))}
      </ul>
    </div>
  )
}
