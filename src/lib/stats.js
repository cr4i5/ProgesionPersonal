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
  const vg = (lv, kind) => Object.values(items).filter(r => r.item_key.startsWith(`vg:${lv}:${kind}:`) && ok(r)).length
  const campsOk = Object.fromEntries(LEVELS.map(l => [l.id, vg(l.id, 'camp')]))
  const excsOk = Object.fromEntries(LEVELS.map(l => [l.id, vg(l.id, 'exc')]))
  const lv = levelProgress({ indOk, campsOk, excsOk, credOk: credTotal })
  return { areas, ind, indOk, av, esp: count('esp:'), campsOk, excsOk,
    camps: Object.values(campsOk).reduce((a, b) => a + b, 0), excs: Object.values(excsOk).reduce((a, b) => a + b, 0),
    credits: credTotal, credMin: CREDITS_MIN, feedback, pending, level: lv.level, next: lv.next, reached: lv.reached, levels: lv.levels }
}

// Un nivel se alcanza SOLO con lo que un adulto aprobó: indicadores, campamentos, excursiones y créditos.
// Los niveles van en orden: no se puede tener Pionero sin Explorador.
export function levelProgress({ indOk, campsOk, excsOk, credOk }) {
  let blocked = false
  const levels = LEVELS.map(l => {
    const need = [
      { id: 'ind', label: 'Indicadores aprobados', have: indOk, need: l.threshold + 1 },
      { id: 'camp', label: 'Campamentos aprobados', have: campsOk[l.id] || 0, need: l.camps },
      { id: 'exc', label: 'Excursiones aprobadas', have: excsOk[l.id] || 0, need: l.excs },
      ...(l.credits ? [{ id: 'cred', label: 'Créditos', have: credOk, need: l.credits }] : []),
    ].map(r => ({ ...r, ok: r.have >= r.need }))
    const met = need.every(r => r.ok) && !blocked
    if (!met) blocked = true
    return { ...l, req: need, reached: met }
  })
  const reached = levels.filter(l => l.reached).map(l => l.id)
  const level = [...levels].reverse().find(l => l.reached) || null
  return { levels, reached, level, next: levels.find(l => !l.reached) || null }
}

export const fmtDate = d => d ? new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
export const ago = d => {
  if (!d) return 'Sin actividad'
  const days = Math.floor((Date.now() - new Date(d)) / 864e5)
  return days <= 0 ? 'Hoy' : days === 1 ? 'Ayer' : days < 30 ? `Hace ${days} días` : fmtDate(d)
}
