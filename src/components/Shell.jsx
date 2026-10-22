import { useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { Home, Compass, Backpack, Medal, Tent, Award, NotebookPen, User, LogOut, Menu, X, ArrowLeft, ClipboardCheck } from 'lucide-react'
import Fleur, { BrandLogo } from './Fleur.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useProgress } from '../lib/progress.jsx'

export default function Shell() {
  const { signOut, profile } = useAuth()
  const { adult, base, person, stats } = useProgress()
  const [open, setOpen] = useState(false)
  const p = base || ''
  const nav = [
    [`${p}/`, 'Inicio', Home, true],
    [`${p}/areas`, 'Mis áreas', Compass],
    [`${p}/aventurero`, 'Aventurero', Backpack],
    [`${p}/especialidades`, 'Especialidades', Medal],
    [`${p}/vida-de-grupo`, 'Vida de grupo', Tent],
    [`${p}/creditos`, 'Créditos', Award],
    [`${p}/cuaderno`, 'Cuaderno', NotebookPen],
  ]
  if (adult) nav.splice(1, 0, [`${p}/revisar`, 'Por revisar', ClipboardCheck])
  else nav.push(['/perfil', 'Mi perfil', User])
  const close = () => setOpen(false)
  return (
    <div className={`shell ${adult ? 'adult-view' : ''}`}>
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(o => !o)} aria-label="Menú">{open ? <X /> : <Menu />}</button>
        <Link to={adult ? '/panel' : '/'} className="brand sm"><BrandLogo size={26} /> Mi Progresión</Link>
      </header>
      <aside className={`side ${open ? 'open' : ''}`}>
        <Link to={adult ? '/panel' : '/'} className="brand" onClick={close}><BrandLogo /> Mi Progresión</Link>
        {adult && (
          <div className="viewing">
            <Link to="/panel" className="back" onClick={close}><ArrowLeft size={15} /> Todos los jóvenes</Link>
            <b>{person?.full_name}</b>
            <span>{person?.age ? `${person.age} años · ` : ''}{person?.scout_group || 'Sin grupo'}</span>
          </div>
        )}
        <nav>
          {nav.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end || false} onClick={close} className={({ isActive }) => (isActive ? 'on' : '')}>
              <Icon size={19} /> {label}
              {adult && label === 'Por revisar' && stats.pending > 0 && <em className="count">{stats.pending}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          {!adult && <span className="who">{profile?.full_name}</span>}
          {adult && <Link to="/panel" className="who" onClick={close}>Panel de adultos</Link>}
          <button className="link-btn" onClick={signOut}><LogOut size={15} /> Salir</button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={close} />}
      <main className="main"><Outlet /></main>
    </div>
  )
}
