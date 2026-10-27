import { Check, ShieldCheck } from 'lucide-react'
import Bar from './Bar.jsx'

// Qué le falta para el siguiente nivel. Solo cuenta lo que un adulto aprobó.
export default function LevelReqs({ stats, adult }) {
  const n = stats.next
  if (!n) return null
  return (
    <section className="card level-reqs">
      <h2><ShieldCheck size={19} /> Para ser {n.name}</h2>
      <p className="muted">Cuenta solo lo que {adult ? 'ya aprobó un adulto' : 'tus adultos ya aprobaron'}: lo que {adult ? 'el joven marca' : 'marcas tú'} espera revisión.</p>
      <ul>
        {n.req.map(r => (
          <li key={r.id} className={r.ok ? 'ok' : ''}>
            <span className="rq-ico">{r.ok ? <Check size={14} /> : null}</span>
            <div><b>{r.label}</b><span>{Math.min(r.have, r.need)} de {r.need}</span>
              <Bar value={Math.min(r.have, r.need)} total={r.need} color={r.ok ? '#237A4B' : 'var(--lake)'} height={6} label={r.label} /></div>
          </li>
        ))}
      </ul>
    </section>
  )
}
