import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send, Trash2, MessagesSquare, ShieldCheck } from 'lucide-react'
import { BrandLogo } from '../components/Fleur.jsx'
import { useAuth } from '../lib/auth.jsx'
import { db } from '../lib/api.js'
import { useUI } from '../lib/ui.jsx'

const hour = d => new Date(d).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })
export default function GuideChat({ adult = false }) {
  const { profile, user, signOut } = useAuth()
  const { toast } = useUI()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [allowed, setAllowed] = useState(null)
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  async function load() {
    try { const ok = adult || await db.isGuide(); setAllowed(ok); if (ok) setMessages(await db.listGuideMessages()) }
    catch { setAllowed(false) }
  }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages.length])
  async function submit(e) {
    e.preventDefault(); const body = text.trim(); if (!body || busy) return
    setBusy(true)
    try { await db.sendGuideMessage(body); setText(''); await load() }
    catch { toast('No se pudo enviar. Verifica que ejecutaste la migración 8.', 'err') }
    finally { setBusy(false) }
  }
  async function remove(id) { try { await db.deleteGuideMessage(id); await load() } catch { toast('No se pudo borrar el mensaje.', 'err') } }
  if (allowed === null) return <div className="center-screen"><div className="spinner" /></div>
  if (!allowed) return <div className="page narrow"><div className="card"><h2>Espacio exclusivo de Guías</h2><p className="muted">Tu cuenta no tiene una designación activa de Guía. Solicita a un adulto de programa que revise tu asignación.</p><Link className="btn ghost" to="/"><ArrowLeft size={16}/> Volver</Link></div></div>
  return <div className="panel-wrap">
    <header className="panel-top"><Link to={adult ? '/panel' : '/'} className="back"><ArrowLeft size={16}/> Volver</Link><span className="brand"><BrandLogo/> Chat de Guías</span><span className="grow"/><span className="who">{profile?.full_name}</span>{adult && <button className="link-btn" onClick={signOut}>Salir</button>}</header>
    <div className="page narrow chat-page"><p className="muted chat-note"><ShieldCheck size={16}/> Sala compartida únicamente por Guías designados y adultos de programa.</p>
      <div className="card chat-box"><div className="chat-list" aria-live="polite">
        {messages.length === 0 && <p className="empty">Aún no hay mensajes. ¡Inicien la conversación!</p>}
        {messages.map(m => { const mine = m.user_id === user?.id; return <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>{!mine && <b className="msg-who">{m.author_name}</b>}<p>{m.body}</p><span className="msg-time">{hour(m.created_at)}{mine && <button className="icon-btn" aria-label="Borrar mensaje" onClick={() => remove(m.id)}><Trash2 size={13}/></button>}</span></div> })}
        <div ref={end}/></div>
        <form className="chat-form" onSubmit={submit}><textarea rows={1} maxLength={1000} value={text} placeholder="Escribe al equipo de Guías…" onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e) } }}/><button className="btn primary" disabled={!text.trim() || busy}><Send size={17}/> Enviar</button></form>
      </div>
    </div>
  </div>
}
