import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send, Trash2, MessagesSquare } from 'lucide-react'
import { BrandLogo } from '../components/Fleur.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useTeam } from '../lib/team.jsx'
import { useUI } from '../lib/ui.jsx'

const short = n => (n || '').replace(/\s*\(demo\)/i, '')
const hour = d => new Date(d).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })
const dayLabel = d => {
  const x = new Date(d), t = new Date(); const diff = Math.round((new Date(t.toDateString()) - new Date(x.toDateString())) / 864e5)
  return diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : x.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function Chat() {
  const { profile, signOut } = useAuth()
  const { me, messages, online, markRead, send, remove } = useTeam()
  const { toast } = useUI()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef()
  const count = messages?.length || 0
  useEffect(() => { markRead() })
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [count])

  async function submit(e) {
    e.preventDefault()
    const t = text.trim(); if (!t || busy) return
    setBusy(true)
    try { await send(t); setText('') } catch { toast('No se pudo enviar el mensaje.', 'err') } finally { setBusy(false) }
  }

  let lastDay = ''
  return (
    <div className="panel-wrap">
      <header className="panel-top">
        <Link to="/panel" className="back"><ArrowLeft size={16} /> Panel</Link>
        <span className="brand"><BrandLogo /> Chat de adultos</span>
        <span className="grow" />
        <span className="who">{profile?.full_name}</span>
        <button className="link-btn" onClick={signOut}>Salir</button>
      </header>
      <div className="page narrow chat-page">
        <p className="muted chat-note"><MessagesSquare size={15} /> Solo lo ven los adultos del programa. Los jóvenes no pueden ver este chat. {online.length > 0 ? `Conectados: ${online.map(p => short(p.full_name)).join(', ')}.` : 'Ahora mismo no hay otros adultos conectados.'}</p>
        {messages === null && <p className="callout warn">El chat no está disponible. Falta ejecutar la migración 6 en Supabase.</p>}
        {messages && (
          <div className="card chat-box">
            <div className="chat-list" aria-live="polite">
              {messages.length === 0 && <p className="empty">Aún no hay mensajes. ¡Escribe el primero!</p>}
              {messages.map(m => {
                const d = dayLabel(m.created_at); const head = d !== lastDay; lastDay = d
                const mine = m.user_id === me
                return (
                  <div key={m.id}>
                    {head && <div className="chat-day"><span>{d}</span></div>}
                    <div className={`msg ${mine ? 'mine' : ''}`}>
                      {!mine && <b className="msg-who">{short(m.author_name)}</b>}
                      <p>{m.body}</p>
                      <span className="msg-time">{hour(m.created_at)}{mine && <button className="icon-btn" aria-label="Borrar mensaje" onClick={() => remove(m.id)}><Trash2 size={13} /></button>}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={end} />
            </div>
            <form className="chat-form" onSubmit={submit}>
              <textarea rows={1} value={text} maxLength={1000} placeholder="Escribe un mensaje para los adultos…" aria-label="Mensaje"
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e) } }} />
              <button className="btn primary" disabled={!text.trim() || busy} aria-label="Enviar"><Send size={17} /> Enviar</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
