import { Link } from 'react-router-dom'
import { Backpack, Medal, Tent, Mountain, Award, MessageSquareWarning, ChevronRight } from 'lucide-react'
import { useProgress } from '../lib/progress.jsx'
import { AREAS, LEVELS, AVENTURERO, TOTAL_INDICATORS } from '../lib/data.js'
import Patch from '../components/Patch.jsx'
import Trail from '../components/Trail.jsx'
import Bar from '../components/Bar.jsx'
import Fleur from '../components/Fleur.jsx'
import AdminCard from '../components/AdminCard.jsx'
import Badges from '../components/Badges.jsx'
import NextStep from '../components/NextStep.jsx'
import { useAuth } from '../lib/auth.jsx'
import { Flag } from 'lucide-react'
import { INDEX } from '../lib/data.js'

export default function Home() {
  const { stats, person, base, adult, items } = useProgress()
  const { profile } = useAuth()
  const b = base || ''
  const first = (person?.full_name || '').split(' ')[0]
  const next = LEVELS.find(l => stats.ind <= l.threshold)
  const lvl = stats.level
  return (
    <div className="page">
      <section className="hero">
        <Fleur className="hero-fleur" size={190} />
        <div className="hero-text">
          <h1>{adult ? `Progresión de ${first}` : `¡Hola, ${first}!`}</h1>
          <p className="lead">
            {lvl ? <>{adult ? 'Completó' : 'Ya completaste'} el nivel <b>{lvl.name}</b>.</> : <>{adult ? 'Lleva' : 'Llevas'} <b>{stats.ind}</b> indicadores marcados.</>}{' '}
            {next ? <>Para <b>{next.name}</b> {adult ? 'le' : 'te'} faltan <b>{next.threshold + 1 - stats.ind}</b>.</> : <>{adult ? 'Llegó a la cima.' : '¡Llegaste a la cima!'}</>}
          </p>
          <div className="hero-count">
            <div><strong>{stats.ind}</strong><span>de {TOTAL_INDICATORS} indicadores</span></div>
            <div><strong>{stats.indOk}</strong><span>aprobados por adultos</span></div>
          </div>
          {stats.pending > 0 && <p className="note-line">{stats.pending} {stats.pending === 1 ? 'logro espera' : 'logros esperan'} revisión.</p>}
        </div>
        <Trail count={stats.ind} level={lvl} />
      </section>

      {!adult && profile && !profile.patrol && (
        <Link to="/perfil" className="callout notice">
          <Flag size={22} /><div><b>Cuéntanos a qué patrulla perteneces</b><span>Agrégalo en Mi perfil. Solo toma un momento.</span></div><ChevronRight size={20} />
        </Link>
      )}

      <AdminCard />

      {stats.feedback.length > 0 && (
        <section className="callout warn">
          <h2><MessageSquareWarning size={20} /> {adult ? 'Pidió ajustes en' : 'Tus adultos te dejaron comentarios'}</h2>
          <ul>
            {stats.feedback.slice(0, 4).map(f => {
              const info = f.item_key ? INDEX[f.item_key] : { section: 'Créditos', label: f.activity, path: 'creditos' }
              return (
                <li key={f.item_key || f.id}>
                  <Link to={`${b}/${info?.path || ''}`}>
                    <b>{info?.section} · {info?.label}</b>
                    <span>{f.review_comment}</span>
                    <ChevronRight size={18} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!adult && <NextStep items={items} stats={stats} base={b} />}

      <h2 className="h-section">Las seis áreas</h2>
      <div className="area-grid">
        {AREAS.map(a => {
          const s = stats.areas[a.id]
          return (
            <Link key={a.id} to={`${b}/areas/${a.id}`} className="area-card" style={{ '--c': a.c, '--soft': a.soft, '--ink': a.ink }}>
              <Patch icon={a.icon} color={a.c} soft={a.soft} value={s.done / a.total} size={76} label={a.name} />
              <div>
                <h3>{a.name}</h3>
                <p>{s.done} de {a.total}</p>
                <Bar value={s.done} total={a.total} approved={s.approved} color={a.c} height={6} label={a.name} />
              </div>
            </Link>
          )
        })}
      </div>

      <h2 className="h-section">Tu aventura</h2>
      <div className="tiles">
        <Link to={`${b}/aventurero`} className="tile"><Backpack /><strong>{stats.av}<small>/{AVENTURERO.length}</small></strong><span>Metas de Aventurero</span></Link>
        <Link to={`${b}/especialidades`} className="tile"><Medal /><strong>{stats.esp}</strong><span>Especialidades finalizadas</span></Link>
        <Link to={`${b}/vida-de-grupo`} className="tile"><Tent /><strong>{stats.camps}</strong><span>Campamentos</span></Link>
        <Link to={`${b}/vida-de-grupo`} className="tile"><Mountain /><strong>{stats.excs}</strong><span>Excursiones</span></Link>
        <Link to={`${b}/creditos`} className="tile"><Award /><strong>{stats.credits}<small>/{stats.credMin}</small></strong><span>Créditos (mínimo {stats.credMin})</span></Link>
      </div>

      <Badges stats={stats} />
    </div>
  )
}
