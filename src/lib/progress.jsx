import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { db } from './api.js'
import { useUI } from './ui.jsx'
import { summarize } from './stats.js'

const Ctx = createContext(null)
export const useProgress = () => useContext(Ctx)

// Carga y gestiona el avance de UN joven. `mode` = 'scout' (edita su avance) o 'adult' (revisa).
export function ProgressProvider({ userId, mode, base, children }) {
  const { toast, celebrate } = useUI()
  const [items, setItems] = useState({})
  const [credits, setCredits] = useState([])
  const [person, setPerson] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let live = true
    setState('loading')
    Promise.all([db.listItems(userId), db.listCredits(userId), db.getProfile(userId)])
      .then(([i, c, p]) => { if (!live) return; setItems(i); setCredits(c); setPerson(p); setState('ready') })
      .catch(() => live && setState('error'))
    return () => { live = false }
  }, [userId])

  const fail = useCallback(() => toast('No se pudo guardar. Revisa tu conexión e inténtalo otra vez.', 'err'), [toast])

  const save = useCallback(async (key, patch) => {
    const prev = items[key]
    const next = { user_id: userId, item_key: key, status: 'pendiente', note: '', review_status: 'pendiente', review_comment: null, ...prev, ...patch }
    if (!prev || prev.status !== next.status || (prev.note || '') !== (next.note || '')) next.review_status = 'pendiente'
    setItems(m => ({ ...m, [key]: next }))
    try { await db.saveItem(userId, key, { status: next.status, note: next.note }) }
    catch { setItems(m => { const c = { ...m }; if (prev) c[key] = prev; else delete c[key]; return c }); fail() }
  }, [items, userId, fail])

  const review = useCallback(async (key, r) => {
    const prev = items[key]
    setItems(m => ({ ...m, [key]: { ...m[key], ...r } }))
    try { await db.reviewItem(userId, key, r); toast(r.review_status === 'aprobado' ? 'Aprobado' : 'Comentario enviado') }
    catch { setItems(m => ({ ...m, [key]: prev })); fail() }
  }, [items, userId, fail, toast])

  const addCredit = useCallback(async e => {
    try { const row = await db.addCredit(userId, e); setCredits(c => [row, ...c]); return true } catch { fail(); return false }
  }, [userId, fail])
  const deleteCredit = useCallback(async id => {
    const prev = credits; setCredits(c => c.filter(x => x.id !== id))
    try { await db.deleteCredit(id) } catch { setCredits(prev); fail() }
  }, [credits, fail])
  const reviewCredit = useCallback(async (id, r) => {
    const prev = credits; setCredits(c => c.map(x => x.id === id ? { ...x, ...r } : x))
    try { await db.reviewCredit(id, r); toast(r.review_status === 'aprobado' ? 'Aprobado' : 'Comentario enviado') }
    catch { setCredits(prev); fail() }
  }, [credits, fail, toast])

  const stats = useMemo(() => summarize(items, credits), [items, credits])
  const value = { userId, mode, base, adult: mode === 'adult', items, credits, person, stats, save, review, addCredit, deleteCredit, reviewCredit, celebrate, toast, state }
  if (state === 'loading') return <div className="center-screen"><div className="spinner" aria-label="Cargando" /></div>
  if (state === 'error') return <div className="center-screen"><p className="muted">No pudimos cargar los datos. Recarga la página.</p></div>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
