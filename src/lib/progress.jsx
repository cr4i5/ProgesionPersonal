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
  const [admin, setAdmin] = useState(null) // null = función no disponible
  const [state, setState] = useState('loading')

  useEffect(() => {
    let live = true
    setState('loading')
    Promise.all([db.listItems(userId), db.listCredits(userId), db.getProfile(userId), db.getAdmin(userId)])
      .then(([i, c, p, a]) => { if (!live) return; setItems(i); setCredits(c); setPerson(p); setAdmin(a); setState('ready') })
      .catch(e => { console.error('Error cargando datos:', e); if (live) setState('error') })
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

  // El adulto marca (o quita la marca) por el joven. Queda aprobado y con el nombre de la actividad.
  const adultMark = useCallback(async (key, status, source) => {
    const prev = items[key]
    setItems(m => ({ ...m, [key]: { user_id: userId, item_key: key, note: '', ...prev, status, marked_by: status === 'completado' ? 'adulto' : null, source: status === 'completado' ? (source || null) : null, review_status: status === 'completado' ? 'aprobado' : 'pendiente' } }))
    try { await db.adultSetItem(userId, key, { status, source }); toast(status === 'completado' ? 'Marcado como cumplido' : 'Marca quitada') }
    catch { setItems(m => { const c = { ...m }; if (prev) c[key] = prev; else delete c[key]; return c }); fail() }
  }, [items, userId, fail, toast])

  const addCredit = useCallback(async e => {
    if (mode !== 'adult') return false // los créditos los registran los adultos
    try { await db.adultAddCredits([{ user_id: userId, ...e }]); setCredits(await db.listCredits(userId)); return true } catch { fail(); return false }
  }, [userId, mode, fail])
  const deleteCredit = useCallback(async id => {
    const prev = credits; setCredits(c => c.filter(x => x.id !== id))
    try { await db.deleteCredit(id) } catch { setCredits(prev); fail() }
  }, [credits, fail])
  const reviewCredit = useCallback(async (id, r) => {
    const prev = credits; setCredits(c => c.map(x => x.id === id ? { ...x, ...r } : x))
    try { await db.reviewCredit(id, r); toast(r.review_status === 'aprobado' ? 'Aprobado' : 'Comentario enviado') }
    catch { setCredits(prev); fail() }
  }, [credits, fail, toast])

  const saveAdmin = useCallback(async patch => {
    const prev = admin; setAdmin(a => ({ ...a, ...patch }))
    try { await db.saveAdmin(userId, patch); toast('Guardado') } catch { setAdmin(prev); fail() }
  }, [admin, userId, fail, toast])

  const stats = useMemo(() => summarize(items, credits), [items, credits])
  const value = { userId, mode, base, adult: mode === 'adult', items, credits, person, stats, admin, saveAdmin, adultMark, save, review, addCredit, deleteCredit, reviewCredit, celebrate, toast, state }
  if (state === 'loading') return <div className="center-screen"><div className="spinner" aria-label="Cargando" /></div>
  if (state === 'error') return <div className="center-screen"><p className="muted">No pudimos cargar los datos. Recarga la página.</p></div>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
