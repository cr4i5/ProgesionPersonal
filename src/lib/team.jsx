import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { db } from './api.js'
import { useAuth } from './auth.jsx'

const Ctx = createContext(null)
export const useTeam = () => useContext(Ctx)

const readKey = id => `tropa-chat-read-${id}`
const getRead = id => { try { return localStorage.getItem(readKey(id)) || '' } catch { return '' } }
const setRead = (id, v) => { try { localStorage.setItem(readKey(id), v) } catch { } }

// Solo para adultos: quién está conectado (y a quién ve) y el chat del equipo.
export function TeamProvider({ children }) {
  const { user } = useAuth()
  const me = user.id
  const { pathname } = useLocation()
  const m = pathname.match(/^\/panel\/([^/]+)/)
  const viewing = m && !['actividad', 'chat'].includes(m[1]) ? m[1] : null
  const onChat = pathname === '/panel/chat'
  const [presence, setPresence] = useState([])
  const [messages, setMessages] = useState(null) // null = chat no disponible (falta migración 6)
  const [lastRead, setLastRead] = useState(() => getRead(me))
  const viewRef = useRef(viewing); viewRef.current = viewing

  // Latido: "sigo aquí y estoy viendo a …"
  useEffect(() => {
    const beat = () => db.heartbeat(me, viewRef.current)
    beat()
    const t = setInterval(beat, 25000)
    const bye = () => db.leave(me)
    window.addEventListener('pagehide', bye)
    return () => { clearInterval(t); window.removeEventListener('pagehide', bye) }
  }, [me])
  useEffect(() => { db.heartbeat(me, viewing) }, [me, viewing])

  const loadPresence = useCallback(async () => { const r = await db.listPresence(me); if (r) setPresence(r) }, [me])
  const loadMessages = useCallback(async () => { const r = await db.listMessages(); setMessages(r) }, [])
  useEffect(() => { loadPresence(); const t = setInterval(loadPresence, 20000); return () => clearInterval(t) }, [loadPresence])
  useEffect(() => { loadMessages(); const t = setInterval(loadMessages, onChat ? 5000 : 20000); return () => clearInterval(t) }, [loadMessages, onChat])

  const unread = useMemo(() => (messages || []).filter(x => x.user_id !== me && x.created_at > lastRead).length, [messages, me, lastRead])
  const markRead = useCallback(() => {
    const last = (messages || []).at(-1)?.created_at; if (last && last > lastRead) { setRead(me, last); setLastRead(last) }
  }, [messages, me, lastRead])
  const send = useCallback(async body => { await db.sendMessage(body, me); await loadMessages() }, [me, loadMessages])
  const remove = useCallback(async id => { await db.deleteMessage(id); await loadMessages() }, [loadMessages])

  const online = presence.filter(p => p.user_id !== me)
  const value = { me, online, messages, unread, markRead, send, remove, refresh: loadMessages }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
