import { Link } from 'react-router-dom'
import { ArrowRight, Rocket } from 'lucide-react'
import { AREAS, kInd } from '../lib/data.js'

// Sugiere el siguiente indicador: el primero sin marcar del área que más avance tiene.
export default function NextStep({ items, stats, base }) {
  const open = AREAS.filter(a => stats.areas[a.id].done < a.total)
  if (!open.length) return null
  const a = [...open].sort((x, y) => stats.areas[y.id].done / y.total - stats.areas[x.id].done / x.total)[0]
  for (const stage of ['3', '4']) {
    const it = a.stages[stage].find(i => items[kInd(a.id, stage, i.k)]?.status !== 'completado')
    if (it) return (
      <Link to={`${base || ''}/areas/${a.id}`} className="next-step" style={{ '--c': a.c, '--soft': a.soft }}>
        <span className="next-ico"><Rocket size={22} /></span>
        <div><small>Tu siguiente paso · {a.name}, etapa {stage}</small><b>{it.t}</b></div>
        <ArrowRight size={20} />
      </Link>
    )
  }
  return null
}
