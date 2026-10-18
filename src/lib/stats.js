import { AREAS, LEVELS, kInd, kAv, AVENTURERO, CREDITS_MIN } from './data.js'

const done = r => r?.status === 'completado'
const ok = r => done(r) && r.review_status === 'aprobado'

export function areaStats(items, area) {
  const out = { total: area.total, done: 0, approved: 0, stages: {} }
  for (const s of ['3', '4']) {
    const list = area.stages[s]; let d = 0, a = 0
    list.forEach(it => { const r = items[kInd(area.id, s, it.k)]; if (done(r)) d++; if (ok(r)) a++ })
    out.stages[s] = { total: list.length, done: d, approved: a }
    out.done += d; out.approved += a
  }
  return out
}

export function summarize(items, credits) {
  const areas = Object.fromEntries(AREAS.map(a => [a.id, areaStats(items, a)]))
  const ind = AREAS.reduce((s, a) => s + areas[a.id].done, 0)
  const indOk = AREAS.reduce((s, a) => s + areas[a.id].approved, 0)
  const av = AVENTURERO.filter((_, i) => done(items[kAv(i + 1)])).length
  const count = pre => Object.values(items).filter(r => r.item_key.startsWith(pre) && done(r)).length
  const credTotal = credits.filter(c => c.review_status !== 'ajustes').reduce((s, c) => s + c.credits, 0)
  const feedback = [
    ...Object.values(items).filter(r => r.review_status === 'ajustes' && r.status !== 'pendiente'),
    ...credits.filter(c => c.review_status === 'ajustes'),
  ]
  const pending = Object.values(items).filter(r => !r.item_key.startsWith('note:') && done(r) && r.review_status === 'pendiente').length
    + credits.filter(c => c.review_status === 'pendiente').length
  const level = [...LEVELS].reverse().find(l => ind > l.threshold)
  return { areas, ind, indOk, av, esp: count('esp:'), camps: count2(items, ':camp:'), excs: count2(items, ':exc:'),
    credits: credTotal, credMin: CREDITS_MIN, feedback, pending, level }
}
function count2(items, mid) { return Object.values(items).filter(r => r.item_key.startsWith('vg:') && r.item_key.includes(mid) && done(r)).length }

export const levelOfIndicators = n => [...LEVELS].reverse().find(l => n > l.threshold) || null
export const fmtDate = d => d ? new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
export const ago = d => {
  if (!d) return 'Sin actividad'
  const days = Math.floor((Date.now() - new Date(d)) / 864e5)
  return days <= 0 ? 'Hoy' : days === 1 ? 'Ayer' : days < 30 ? `Hace ${days} días` : fmtDate(d)
}
