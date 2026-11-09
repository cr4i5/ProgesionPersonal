import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Flag } from 'lucide-react'
import { BrandLogo } from '../components/Fleur.jsx'
import { db } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { useUI } from '../lib/ui.jsx'
import { patrolKey } from '../lib/patrols.js'

const msgOf = e => /Ya existe una patrulla parecida: (.*)/.exec(e?.message || '')?.[0] || (/Escribe un nombre/.test(e?.message || '') ? 'Escribe un nombre.' : 'No se pudo guardar. Inténtalo otra vez.')

export default function Patrullas() {
  const { profile, signOut } = useAuth()
  const { toast } = useUI()
  const [patrols, setPatrols] = useState(undefined) // undefined = cargando, null = falta migración 7
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const [edit, setEdit] = useState(null) // { id, name }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([db.listPatrols(), db.summary().catch(() => [])])
    setPatrols(p); setRows(r || [])
  }, [])
  useEffect(() => { load() }, [load])

  const count = useMemo(() => {
    const m = {}; rows.forEach(r => { const k = patrolKey(r.patrol); if (k) m[k] = (m[k] || 0) + 1 }); return m
  }, [rows])
  const without = rows.filter(r => !patrolKey(r.patrol)).length

  const run = async (fn, ok) => {
    setBusy(true)
    try { const r = await fn(); await load(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); return true }
    catch (e) { toast(msgOf(e), 'err'); return false } finally { setBusy(false) }
  }
  const add = async e => { e.preventDefault(); if (!name.trim()) return; if (await run(() => db.addPatrol(name), 'Patrulla agregada')) setName('') }
  const rename = async e => {
    e.preventDefault(); if (!edit.name.trim()) return
    const same = patrols.find(p => p.id !== edit.id && patrolKey(p.name) === patrolKey(edit.name))
    if (same && !confirm(`«${edit.name.trim()}» equivale a «${same.name}». Se unificarán: los jóvenes pasarán a «${same.name}» y esta patrulla se eliminará. ¿Continuar?`)) return
    if (await run(() => db.renamePatrol(edit.id, edit.name), to => same ? `Unificadas en «${to}»` : 'Nombre cambiado')) setEdit(null)
  }
  const del = p => {
    const n = count[patrolKey(p.name)] || 0
    if (!confirm(n ? `Vas a eliminar «${p.name}». ${n} ${n === 1 ? 'joven quedará' : 'jóvenes quedarán'} sin patrulla y tendrán que elegir otra en Mi perfil. ¿Eliminar?` : `¿Eliminar la patrulla «${p.name}»?`)) return
    run(() => db.deletePatrol(p.id), 'Patrulla eliminada')
  }

  return (
    <div className="panel-wrap">
      <header className="panel-top">
        <Link to="/panel" className="back"><ArrowLeft size={16} /> Panel</Link>
        <span className="brand"><BrandLogo /> Patrullas</span>
        <span className="grow" />
        <span className="who">{profile?.full_name}</span>
        <button className="link-btn" onClick={signOut}>Salir</button>
      </header>
      <div className="page narrow">
        <h1>Patrullas de la Tropa</h1>
        <p className="lead">Los jóvenes eligen su patrulla de esta lista. Si dos nombres se parecen (Orca / Orcas) se unifican solos.</p>
        {patrols === null && <p className="callout warn">Esta función no está disponible. Falta ejecutar la migración 7 en Supabase.</p>}
        {patrols && (
          <>
            <form className="card form patrol-add" onSubmit={add}>
              <label>Nueva patrulla<input maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Águilas" autoComplete="off" /></label>
              <button className="btn primary" disabled={busy || !name.trim()}><Plus size={17} /> Agregar</button>
            </form>
            {patrols.length === 0 && <p className="empty">Aún no hay patrullas. Agrega la primera.</p>}
            <ul className="patrol-list">
              {patrols.map(p => (
                <li key={p.id} className="card">
                  {edit?.id === p.id ? (
                    <form className="patrol-edit" onSubmit={rename}>
                      <input autoFocus maxLength={40} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} aria-label="Nombre de la patrulla" />
                      <button className="icon-btn ok" aria-label="Guardar" disabled={busy}><Check size={18} /></button>
                      <button type="button" className="icon-btn" aria-label="Cancelar" onClick={() => setEdit(null)}><X size={18} /></button>
                    </form>
                  ) : (
                    <>
                      <span className="patrol-ico"><Flag size={18} /></span>
                      <div className="patrol-name"><b>{p.name}</b><small>{count[patrolKey(p.name)] || 0} {(count[patrolKey(p.name)] || 0) === 1 ? 'joven' : 'jóvenes'}</small></div>
                      <button className="icon-btn" aria-label={`Editar ${p.name}`} onClick={() => setEdit({ id: p.id, name: p.name })}><Pencil size={17} /></button>
                      <button className="icon-btn" aria-label={`Eliminar ${p.name}`} onClick={() => del(p)}><Trash2 size={17} /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {without > 0 && <p className="muted">{without} {without === 1 ? 'joven' : 'jóvenes'} sin patrulla: verán un aviso para elegirla en Mi perfil.</p>}
          </>
        )}
      </div>
    </div>
  )
}
