import { useEffect, useState } from 'react'
import { Search, ShieldCheck, ShieldOff, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../lib/api.js'
import { useUI } from '../lib/ui.jsx'

export default function Guias() {
  const [rows, setRows] = useState([]); const [guides, setGuides] = useState(new Set()); const [q, setQ] = useState(''); const [busy, setBusy] = useState(''); const { toast } = useUI()
  async function load() { try { const [people, assigned] = await Promise.all([db.listGuideCandidates(), db.listGuideMembers()]); setRows(people); setGuides(new Set(assigned.map(x => x.user_id))) } catch { toast('No se pudo cargar la lista. Ejecuta la migración 8.', 'err') } }
  useEffect(() => { load() }, [])
  async function toggle(id, enabled) { setBusy(id); try { await db.setScoutGuide(id, enabled); setGuides(s => { const n = new Set(s); enabled ? n.add(id) : n.delete(id); return n }); toast(enabled ? 'Guía asignado correctamente.' : 'Designación de Guía retirada.') } catch { toast('No se pudo actualizar la designación.', 'err') } finally { setBusy('') } }
  const list = rows.filter(p => p.full_name.toLowerCase().includes(q.toLowerCase()))
  return <div className="page"><div className="page-head"><h1>Equipo de Guías</h1><p className="lead">Designa a los jóvenes que tendrán acceso al chat exclusivo de Guías y adultos.</p></div>
    <div className="tiles small"><div className="tile static"><Users/><strong>{rows.length}</strong><span>Jóvenes</span></div><div className="tile static"><ShieldCheck/><strong>{guides.size}</strong><span>Guías designados</span></div><Link to="/panel/guias-chat" className="tile"><Users/><strong>Chat</strong><span>Ir al espacio de Guías</span></Link></div>
    <label className="search"><Search size={17}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar joven por nombre"/></label>
    <div className="guide-grid">{list.map(p => { const active = guides.has(p.id); return <article className="card guide-row" key={p.id}><div className="guide-avatar">{p.full_name.split(' ').slice(0,2).map(x => x[0]).join('').toUpperCase()}</div><div className="guide-info"><b>{p.full_name}</b><small>{p.patrol || 'Sin patrulla'} · {p.scout_group || 'Sin grupo'}</small><span className={active ? 'guide-status active' : 'guide-status'}>{active ? 'Guía designado' : 'Integrante de patrulla'}</span></div><button className={`btn sm ${active ? 'ghost' : 'primary'}`} disabled={busy === p.id} onClick={() => toggle(p.id, !active)}>{active ? <><ShieldOff size={15}/> Retirar</> : <><ShieldCheck size={15}/> Asignar Guía</>}</button></article> })}</div>
  </div>
}
