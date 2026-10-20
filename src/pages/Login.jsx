import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Fleur from '../components/Fleur.jsx'
import { useAuth } from '../lib/auth.jsx'
import { DEMO } from '../lib/api.js'

const ERR = (m = '', adultTry) => {
  if (/Invalid login/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/already registered/i.test(m)) return 'Ese correo ya tiene una cuenta. Prueba entrar o usa otro correo.'
  if (/Database error|adulto/i.test(m)) return adultTry ? 'El código de adulto no es correcto.' : 'No se pudo crear la cuenta. Inténtalo de nuevo.'
  if (/at least 6|weak|short/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/valid email|invalid/i.test(m)) return 'Revisa que el correo esté bien escrito.'
  if (/not confirmed/i.test(m)) return 'Primero confirma tu correo con el enlace que te enviamos.'
  if (/rate|too many/i.test(m)) return 'Demasiados intentos. Espera un minuto y vuelve a probar.'
  return 'Algo salió mal. Inténtalo otra vez.'
}

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [tab, setTab] = useState('in')
  const [f, setF] = useState({ email: '', password: '', full_name: '', age: '', scout_group: '', join_troop: '', join_current: '', adult_code: '' })
  const [adult, setAdult] = useState(false)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      if (tab === 'in') await signIn(f.email.trim().toLowerCase(), f.password)
      else if (tab === 'up') {
        const r = await signUp({ email: f.email.trim().toLowerCase(), password: f.password, full_name: f.full_name.trim(), age: adult ? '' : f.age,
          scout_group: f.scout_group.trim(), join_troop: adult ? '' : f.join_troop, join_current: adult ? '' : f.join_current, adult_code: adult ? f.adult_code.trim() : '' })
        if (r?.needsConfirm) setMsg({ ok: true, t: 'Cuenta creada. Revisa tu correo y toca el enlace de confirmación para entrar.' })
      } else { await resetPassword(f.email.trim().toLowerCase()); setMsg({ ok: true, t: 'Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva.' }) }
    } catch (err) { setMsg({ t: ERR(err.message, adult) }) }
    finally { setBusy(false) }
  }

  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand light"><span className="brand-mark"><Fleur size={24} /></span> Mi Progresión</div>
        <Fleur className="login-fleur" size={300} outline={false} />
        <h1>Tu camino scout, paso a paso.</h1>
        <p>Marca lo que ya lograste, cuenta cómo lo hiciste y mira cuánto falta para tu próximo nivel.</p>
        <ul className="hero-points">
          <li>Seis áreas, dos etapas, un solo lugar</li>
          <li>Tus adultos de programa revisan y te dejan comentarios</li>
          <li>Funciona en el celular</li>
        </ul>
        <p className="motto">¡Siempre listo!</p>
        <svg className="topo" viewBox="0 0 400 400" aria-hidden="true">
          {[40, 80, 120, 160, 200, 240].map((r, i) => <ellipse key={r} cx="260" cy="250" rx={r * 1.15} ry={r * .8} transform={`rotate(${-18 + i * 3} 260 250)`} fill="none" stroke="#fff" strokeOpacity={.2 - i * .02} strokeWidth="1.6" />)}
        </svg>
      </section>
      <section className="login-card">
        <div className="seg">
          <button className={tab === 'in' ? 'on' : ''} onClick={() => { setTab('in'); setMsg(null) }}>Entrar</button>
          <button className={tab === 'up' ? 'on' : ''} onClick={() => { setTab('up'); setMsg(null) }}>Crear cuenta</button>
        </div>
        {DEMO && <p className="demo-note">Modo demo: entra con <b>ana@demo.com</b> (joven) o <b>adulto@demo.com</b> (adulto), con cualquier contraseña.</p>}
        <form onSubmit={submit} className="form">
          {tab === 'up' && <>
            <div className="adult-toggle">
              <label className="check-inline"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} /> Soy adulto del programa</label>
            </div>
            <label>Nombre completo<input required value={f.full_name} onChange={set('full_name')} autoComplete="name" /></label>
            {!adult && <div className="row2">
              <label>Edad<input required type="number" min="8" max="18" value={f.age} onChange={set('age')} /></label>
              <label>Grupo scout<input value={f.scout_group} onChange={set('scout_group')} /></label>
            </div>}
            {adult && <><label>Grupo scout<input value={f.scout_group} onChange={set('scout_group')} /></label>
              <label>Código de adulto<input required value={f.adult_code} onChange={set('adult_code')} autoComplete="off" /></label></>}
            {!adult && <div className="row2">
              <label>Ingreso a la Tropa<input type="date" value={f.join_troop} onChange={set('join_troop')} /></label>
              <label>Ingreso a la Tropa actual<input type="date" value={f.join_current} onChange={set('join_current')} /></label>
            </div>}
          </>}
          <label>Correo electrónico<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
          {tab === 'up' && !adult && <p className="hint">¿No tienes correo? Usa el de tu mamá o papá. Si comparten correo con tus hermanos, pueden usar <b>nombre+tuNombre@gmail.com</b>.</p>}
          {tab !== 'reset' && <label>Contraseña
            <span className="pw"><input required type={show ? 'text' : 'password'} minLength={6} value={f.password} onChange={set('password')} autoComplete={tab === 'in' ? 'current-password' : 'new-password'} />
              <button type="button" className="icon-btn" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          </label>}
          {msg && <p className={msg.ok ? 'msg ok' : 'msg err'} role="alert">{msg.t}</p>}
          <button className="btn primary lg" disabled={busy}>{busy ? 'Un momento…' : tab === 'in' ? 'Entrar' : tab === 'up' ? 'Crear mi cuenta' : 'Enviar enlace'}</button>
          {tab === 'in' && <button type="button" className="link-btn center" onClick={() => { setTab('reset'); setMsg(null) }}>Olvidé mi contraseña</button>}
          {tab === 'reset' && <button type="button" className="link-btn center" onClick={() => { setTab('in'); setMsg(null) }}>Volver a entrar</button>}
        </form>
      </section>
    </div>
  )
}

export function NewPassword() {
  const { setPassword } = useAuth()
  const [p, setP] = useState(''); const [m, setM] = useState(null)
  return (
    <div className="center-screen"><form className="card form narrow-card" onSubmit={async e => { e.preventDefault(); try { await setPassword(p); setM({ ok: true, t: 'Listo, ya cambiaste tu contraseña.' }); setTimeout(() => (window.location.href = '/'), 1200) } catch { setM({ t: 'No se pudo cambiar. Abre de nuevo el enlace del correo.' }) } }}>
      <h2>Crea una contraseña nueva</h2>
      <label>Contraseña nueva<input type="password" minLength={6} required value={p} onChange={e => setP(e.target.value)} /></label>
      {m && <p className={m.ok ? 'msg ok' : 'msg err'}>{m.t}</p>}
      <button className="btn primary">Guardar contraseña</button>
    </form></div>
  )
}
