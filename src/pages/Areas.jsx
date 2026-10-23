import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useProgress } from '../lib/progress.jsx'
import { AREAS, AREA, kInd } from '../lib/data.js'
import Patch from '../components/Patch.jsx'
import Bar from '../components/Bar.jsx'
import Item from '../components/Item.jsx'
import Fleur from '../components/Fleur.jsx'

export function AreasIndex() {
  const { stats, base } = useProgress()
  return (
    <div className="page">
      <PageHead title="Mis áreas" sub="Cada área tiene indicadores de logro en dos etapas. Entra a una y marca los que ya cumpliste." />
      <div className="area-grid big">
        {AREAS.map(a => {
          const s = stats.areas[a.id]
          return (
            <Link key={a.id} to={`${base || ''}/areas/${a.id}`} className="area-card" style={{ '--c': a.c, '--soft': a.soft, '--ink': a.ink }}>
              <Patch icon={a.icon} color={a.c} soft={a.soft} value={s.done / a.total} size={84} label={a.name} />
              <div>
                <h3>{a.n}. {a.name}</h3>
                <p><span>Etapa 3: {s.stages['3'].done}/{s.stages['3'].total}</span><span>Etapa 4: {s.stages['4'].done}/{s.stages['4'].total}</span></p>
                <Bar value={s.done} total={a.total} approved={s.approved} color={a.c} height={6} label={a.name} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function PageHead({ title, sub, color, icon }) {
  return (
    <header className="page-head">
      <i className="stripe" aria-hidden="true" />
      <h1>{title}</h1>
      {sub && <p className="lead">{sub}</p>}
    </header>
  )
}

export function AreaPage() {
  const { id } = useParams()
  const a = AREA[id]
  const { stats, base, adult, items } = useProgress()
  const [stage, setStage] = useState('3')
  const [onlyOpen, setOnlyOpen] = useState(false)
  if (!a) return <Navigate to={`${base || ''}/areas`} replace />
  const s = stats.areas[a.id]
  const st = s.stages[stage]
  return (
    <div className="page" style={{ '--c': a.c, '--soft': a.soft, '--ink': a.ink }}>
      <Link to={`${base || ''}/areas`} className="back-link"><ChevronLeft size={16} /> Mis áreas</Link>
      <header className="area-head">
        <Patch icon={a.icon} color={a.c} soft={a.soft} value={s.done / a.total} size={96} label={a.name} />
        <div>
          <h1>{a.name}</h1>
          <p className="lead">{s.done} de {a.total} indicadores marcados{s.approved ? ` · ${s.approved} aprobados` : ''}</p>
          <Bar value={s.done} total={a.total} approved={s.approved} color={a.c} height={10} label="Progreso del área" />
        </div>
      </header>
      <div className="seg" role="tablist">
        {['3', '4'].map(x => (
          <button key={x} role="tab" aria-selected={stage === x} className={stage === x ? 'on' : ''} onClick={() => setStage(x)}>
            Etapa {x} <small>{s.stages[x].done}/{s.stages[x].total}</small>
          </button>
        ))}
      </div>
      {!adult && <p className="tip">Cuando cumplas un indicador, tócalo para marcarlo. Tus adultos lo revisarán.</p>}
      <label className="check-inline"><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} /> Mostrar solo los que me faltan</label>
      <ul className="items">
        {a.stages[stage].filter(it => !onlyOpen || items[kInd(a.id, stage, it.k)]?.status !== 'completado').map(it => <Item key={it.k} k={kInd(a.id, stage, it.k)} tag={it.k.toUpperCase()} text={it.t} color={a.c} />)}
      </ul>
      {st.done === st.total && <p className="done-banner"><Fleur size={22} color="var(--ok)" /> ¡Completaste la etapa {stage} de {a.name}!</p>}
    </div>
  )
}
