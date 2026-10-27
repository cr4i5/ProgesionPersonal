import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
const sb = configured ? createClient(url, key) : null

const must = ({ data, error }) => { if (error) throw error; return data }

export const auth = {
  async init(cb) {
    const { data } = await sb.auth.getSession()
    cb(data.session?.user ?? null)
    sb.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null))
  },
  async signIn(email, password) { must(await sb.auth.signInWithPassword({ email, password })) },
  async signUp({ email, password, ...meta }) {
    const res = await sb.auth.signUp({ email, password, options: { data: meta } })
    if (res.error) throw res.error
    if (!res.data.session) return { needsConfirm: true }
    return {}
  },
  async signOut() { await sb.auth.signOut() },
  async resetPassword(email) { must(await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/nueva-clave' })) },
  async setPassword(password) { must(await sb.auth.updateUser({ password })) },
}

export const db = {
  async getProfile(id) { return must(await sb.from('profiles').select('*').eq('id', id).maybeSingle()) },
  async updateProfile(id, patch) { must(await sb.from('profiles').update(patch).eq('id', id)) },
  async listItems(uid) {
    const rows = must(await sb.from('progress_items').select('*').eq('user_id', uid).limit(5000))
    return Object.fromEntries(rows.map(r => [r.item_key, r]))
  },
  async saveItem(uid, k, { status, note }) {
    must(await sb.from('progress_items').upsert({ user_id: uid, item_key: k, status, note: note ?? null }, { onConflict: 'user_id,item_key' }))
  },
  async reviewItem(uid, k, { review_status, review_comment }) {
    must(await sb.from('progress_items').update({ review_status, review_comment: review_comment || null }).eq('user_id', uid).eq('item_key', k))
  },
  async listCredits(uid) { return must(await sb.from('credit_entries').select('*').eq('user_id', uid).order('created_at', { ascending: false })) },
  async addCredit(uid, e) { return must(await sb.from('credit_entries').insert({ user_id: uid, ...e }).select().single()) },
  async deleteCredit(id) { must(await sb.from('credit_entries').delete().eq('id', id)) },
  async reviewCredit(id, { review_status, review_comment }) {
    must(await sb.from('credit_entries').update({ review_status, review_comment: review_comment || null }).eq('id', id))
  },
  async getAdmin(uid) {
    const { data, error } = await sb.from('member_admin').select('*').eq('user_id', uid).maybeSingle()
    if (error) return null // la tabla aún no existe: la función queda oculta
    return data || {}
  },
  async saveAdmin(uid, patch) { must(await sb.from('member_admin').upsert({ user_id: uid, ...patch }, { onConflict: 'user_id' })) },
  // --- el adulto marca por el joven ---
  async adultSetItem(uid, k, { status, source }) {
    if (status === 'completado') must(await sb.from('progress_items').upsert({ user_id: uid, item_key: k, status, source: source || null, review_status: 'aprobado' }, { onConflict: 'user_id,item_key' }))
    else must(await sb.from('progress_items').update({ status }).eq('user_id', uid).eq('item_key', k))
  },
  async adultMarkMany(rows) {
    for (let i = 0; i < rows.length; i += 300) must(await sb.from('progress_items').upsert(rows.slice(i, i + 300), { onConflict: 'user_id,item_key' }))
  },
  async adultAddCredits(rows) {
    for (let i = 0; i < rows.length; i += 300) must(await sb.from('credit_entries').insert(rows.slice(i, i + 300)))
  },
  async listTemplates() {
    const { data, error } = await sb.from('activity_templates').select('name,item_keys').order('name')
    if (error) return null // aún no se corrió la migración 4
    return data
  },
  async saveTemplate(name, item_keys) { must(await sb.from('activity_templates').upsert({ name, item_keys, updated_at: new Date().toISOString() }, { onConflict: 'name' })) },
  async summary() { return must(await sb.rpc('scout_summary')) },
}
