import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { Printer, Home, Compass, Backpack, Medal, Tent, Award, NotebookPen, User, LogOut, Menu, X, ArrowLeft, ClipboardCheck, CalendarCheck, MessagesSquare, FileText, ShieldCheck } from 'lucide-react'
import Fleur, { BrandLogo } from './Fleur.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useProgress } from '../lib/progress.jsx'
import { useTeam } from '../lib/team.jsx'
import LiveBar from './LiveBar.jsx'
import { db } from '../lib/api.js'

export default function Shell() {
  const { signOut, profile } = useAuth()
  const { adult, base, person, stats, userId } = useProgress()
  const team = useTeam()
  const [open, setOpen] = useState(false)
  const [isGuide, setIsGuide] = useState(false)
  useEffect(() => { if (adult) setIsGuide(true); else db.isGuide().then(setIsGuide).catch(() => setIsGuide(false)) }, [adult, profile?.id])
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
  if (adult) nav.push([`${p}/documentos`, 'Ficha médica', FileText], [`/panel/actividad?joven=${userId}`, 'Registrar actividad', CalendarCheck], ['/panel/chat', 'Chat de adultos', MessagesSquare], ['/panel/guias-chat', 'Chat de Guías', ShieldCheck])
  else nav.push([`${p}/documentos`, 'Mis documentos', FileText], ...(isGuide ? [['/guias/chat', 'Espacio de Guías', ShieldCheck]] : []), ['/perfil', 'Mi perfil', User])
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
            <span>Patrulla: {person?.patrol || 'sin indicar'}</span>
          </div>
        )}
        <nav>
          {nav.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end || false} onClick={close} className={({ isActive }) => (isActive ? 'on' : '')}>
              <Icon size={19} /> {label}
              {adult && label === 'Por revisar' && stats.pending > 0 && <em className="count">{stats.pending}</em>}
              {adult && label === 'Chat de adultos' && team?.unread > 0 && <em className="count">{team.unread}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          {!adult && <span className="who">{profile?.full_name}{isGuide && <em className="guide-badge">Guía</em>}</span>}
          {adult && <Link to="/panel" className="who" onClick={close}>Panel de adultos</Link>}
          <button className="link-btn" onClick={() => window.print()}><Printer size={15} /> Imprimir esta página</button>
          <button className="link-btn" onClick={signOut}><LogOut size={15} /> Salir</button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={close} />}
      <main className="main"><LiveBar /><Outlet /></main>
    </div>
  )
}
