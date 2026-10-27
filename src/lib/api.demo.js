// Modo demo: todo se guarda en el navegador (localStorage). Sirve para probar el diseño sin Supabase.
import { AREAS, AVENTURERO, kInd, kAv, kEsp, kVg, LEVELS } from './data.js'

const LS = 'tropa-demo-v4'
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647 })()
const uid = () => 'u' + Math.random().toString(36).slice(2, 10)

function seed() {
  const st = { users: [], items: {}, credits: [], session: null, admin: {} }
  const PAT = ['Águilas', 'Lobos', 'Halcones', 'Águilas', 'Lobos']
  let pi = 0
  const add = (name, email, age, group, role, level) => {
    const id = uid(); st.users.push({ id, email, profile: { id, full_name: name, age, join_troop: '2023-03-04', join_current: '2024-02-10', scout_group: group, patrol: role === 'scout' ? PAT[pi++ % PAT.length] : null, role, created_at: new Date().toISOString() } })
    st.items[id] = {}
    if (role === 'scout') {
      const keys = []
      AREAS.forEach(a => ['3', '4'].forEach(s => a.stages[s].forEach(it => keys.push(kInd(a.id, s, it.k)))))
      keys.forEach(k => { if (rnd() < level) put(st, id, k, 'completado', rnd() < .25 ? 'Lo hice con mi patrulla en el campamento.' : '') })
      AVENTURERO.forEach((_, i) => put(st, id, kAv(i + 1), 'completado'))
      put(st, id, kEsp(1, 'bronce'), rnd() < .5 ? 'completado' : 'en_proceso', 'Cocina al aire libre')
      LEVELS[0] && [1, 2, 3].forEach(n => put(st, id, kVg('explorador', 'camp', n), 'completado', 'Campamento anual'))
    }
    return id
  }
  const put = (st, id, k, status, note = '') => {
    const r = rnd(); const rs = status !== 'completado' ? 'pendiente' : r < .45 ? 'aprobado' : r < .55 ? 'ajustes' : 'pendiente'
    st.items[id][k] = { user_id: id, item_key: k, status, note, review_status: rs, review_comment: rs === 'ajustes' ? 'Cuéntame un ejemplo concreto de cuándo lo hiciste.' : rs === 'aprobado' ? '¡Muy bien!' : null, updated_at: new Date(Date.now() - rnd() * 6e8).toISOString() }
  }
  const ids = {}
  add('Profe Marcos (demo)', 'adulto@demo.com', null, 'Grupo Scout 1', 'adult', 0)
  add('Ana Pérez (demo)', 'ana@demo.com', 13, 'Grupo Scout 1', 'scout', .35)
  add('Luis Rojas', 'luis@demo.com', 11, 'Grupo Scout 1', 'scout', .12)
  add('Valentina Gómez', 'vale@demo.com', 15, 'Grupo Scout 2', 'scout', .7)
  add('Mateo Silva', 'mateo@demo.com', 12, 'Grupo Scout 2', 'scout', .22)
  add('Camila Díaz', 'camila@demo.com', 14, 'Grupo Scout 1', 'scout', .5)
  st.users.filter(u => u.profile.role === 'scout').forEach((u, i) => { st.admin[u.id] = { asv_registered: i !== 1, asv_year: i !== 1 ? 2026 : null, medical_form: i % 2 === 0, medical_form_date: i % 2 === 0 ? '2026-02-14' : null } })
  return st
}
let S
function load() { if (S) return S; try { S = JSON.parse(localStorage.getItem(LS)) } catch { } if (!S) { S = seed(); save() } return S }
function save() { try { localStorage.setItem(LS, JSON.stringify(S)) } catch { } }
const wait = v => new Promise(r => setTimeout(() => r(v), 60))
let listener = () => { }
const userOf = id => load().users.find(u => u.id === id)

export const configured = true
export const auth = {
  async init(cb) { listener = cb; const s = load(); cb(s.session ? { id: s.session, email: userOf(s.session)?.email } : null) },
  async signIn(email) {
    const u = load().users.find(u => u.email === email.trim().toLowerCase()); if (!u) throw new Error('Invalid login credentials')
    S.session = u.id; save(); listener({ id: u.id, email: u.email })
  },
  async signUp({ email, password, adult_code, ...meta }) {
    const s = load(); if (s.users.some(u => u.email === email.toLowerCase())) throw new Error('User already registered')
    if (adult_code && adult_code !== 'DEMO') throw new Error('Database error saving new user')
    const id = uid(); s.users.push({ id, email: email.toLowerCase(), profile: { id, full_name: meta.full_name, age: meta.age ? +meta.age : null, join_troop: meta.join_troop || null, join_current: meta.join_current || null, scout_group: meta.scout_group || null, patrol: meta.patrol || null, role: adult_code ? 'adult' : 'scout', created_at: new Date().toISOString() } })
    s.items[id] = {}; s.session = id; save(); listener({ id, email }); return {}
  },
  async signOut() { S.session = null; save(); listener(null) },
  async resetPassword() { }, async setPassword() { },
}

export const db = {
  async getProfile(id) { return wait(userOf(id)?.profile ?? null) },
  async updateProfile(id, patch) { Object.assign(userOf(id).profile, patch, { role: userOf(id).profile.role }); save() },
  async listItems(id) { return wait(structuredClone(load().items[id] || {})) },
  async saveItem(id, k, { status, note }) {
    const items = load().items[id]; const old = items[k]
    if (!old) items[k] = { user_id: id, item_key: k, status, note, review_status: 'pendiente', review_comment: null, updated_at: new Date().toISOString() }
    else { const ch = old.status !== status || (old.note || '') !== (note || ''); Object.assign(old, { status, note, updated_at: new Date().toISOString() }); if (ch) old.review_status = 'pendiente' }
    save()
  },
  async reviewItem(id, k, { review_status, review_comment }) { Object.assign(load().items[id][k], { review_status, review_comment: review_comment || null }); save() },
  async listCredits(id) { return wait(structuredClone(load().credits.filter(c => c.user_id === id))) },
  async addCredit(id, e) { const row = { id: uid(), user_id: id, review_status: 'pendiente', review_comment: null, created_at: new Date().toISOString(), ...e }; load().credits.unshift(row); save(); return row },
  async deleteCredit(id) { S.credits = S.credits.filter(c => c.id !== id); save() },
  async reviewCredit(id, { review_status, review_comment }) { Object.assign(S.credits.find(c => c.id === id), { review_status, review_comment: review_comment || null }); save() },
  async getAdmin(id) { return wait(load().admin?.[id] || {}) },
  async saveAdmin(id, patch) { const s = load(); s.admin = s.admin || {}; s.admin[id] = { ...(s.admin[id] || {}), ...patch }; save() },
  async adultSetItem(id, k, { status, source }) {
    const items = load().items[id]; const now = new Date().toISOString()
    if (status === 'completado') items[k] = { ...(items[k] || {}), user_id: id, item_key: k, status, note: items[k]?.note || '', marked_by: 'adulto', source: source || null, review_status: 'aprobado', updated_at: now }
    else if (items[k]) Object.assign(items[k], { status, marked_by: null, source: null, review_status: 'pendiente', updated_at: now })
    save()
  },
  async adultMarkMany(rows) {
    const s = load(); const now = new Date().toISOString()
    rows.forEach(r => {
      const items = s.items[r.user_id]; const old = items[r.item_key]
      if (old?.status === 'completado') old.review_status = 'aprobado'
      else items[r.item_key] = { ...(old || {}), user_id: r.user_id, item_key: r.item_key, status: 'completado', note: old?.note || '', marked_by: 'adulto', source: r.source || null, review_status: 'aprobado', updated_at: now }
    }); save()
  },
  async adultAddCredits(rows) { const s = load(); rows.forEach(r => s.credits.unshift({ id: uid(), review_status: 'aprobado', review_comment: null, marked_by: 'adulto', created_at: new Date().toISOString(), ...r })); save() },
  async listTemplates() { const s = load(); s.templates = s.templates || {}; return Object.entries(s.templates).map(([name, item_keys]) => ({ name, item_keys })) },
  async saveTemplate(name, keys) { const s = load(); s.templates = s.templates || {}; s.templates[name] = keys; save() },
  async summary() {
    const s = load()
    return wait(s.users.filter(u => u.profile.role === 'scout').map(u => {
      const it = Object.values(s.items[u.id] || {}); const done = f => it.filter(r => r.status === 'completado' && f(r)).length
      const cr = s.credits.filter(c => c.user_id === u.id)
      return { user_id: u.id, full_name: u.profile.full_name, age: u.profile.age, scout_group: u.profile.scout_group, patrol: u.profile.patrol, join_current: u.profile.join_current,
        ind_done: done(r => r.item_key.startsWith('ind:')), ind_approved: done(r => r.item_key.startsWith('ind:') && r.review_status === 'aprobado'),
        av_done: done(r => r.item_key.startsWith('av:')), esp_done: done(r => r.item_key.startsWith('esp:')),
        camp_done: done(r => r.item_key.includes(':camp:')), exc_done: done(r => r.item_key.includes(':exc:')),
        credits_total: cr.filter(c => c.review_status !== 'ajustes').reduce((a, c) => a + c.credits, 0),
        pending: done(r => !r.item_key.startsWith('note:') && r.review_status === 'pendiente') + cr.filter(c => c.review_status === 'pendiente').length,
        last_activity: it.map(r => r.updated_at).sort().pop() || null,
        asv_registered: !!s.admin?.[u.id]?.asv_registered, asv_year: s.admin?.[u.id]?.asv_year ?? null, medical_form: !!s.admin?.[u.id]?.medical_form, medical_form_date: s.admin?.[u.id]?.medical_form_date ?? null }
    }))
  },
}
