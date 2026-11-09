import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { db } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { useProgress } from '../lib/progress.jsx'
import { useTeam } from '../lib/team.jsx'

const names = l => l.length <= 1 ? l[0] : l.slice(0, -1).join(', ') + ' y ' + l.at(-1)
const short = n => (n || '').replace(/\s*\(demo\)/i, '')

// Aviso "hay adultos viendo esto ahora". El joven solo ve a quienes están viendo SU progreso.
export default function LiveBar() {
  const { user } = useAuth()
  const { adult, userId } = useProgress()
  const team = useTeam()
  const [mine, setMine] = useState([])
  useEffect(() => {
    if (adult) return
    let live = true
    const load = async () => { const r = await db.listPresence(user.id); if (live && r) setMine(r) }
    load(); const t = setInterval(load, 25000)
    return () => { live = false; clearInterval(t) }
  }, [adult, user.id])
  const list = adult ? (team?.online || []).filter(p => p.viewing_user === userId) : mine
  if (!list.length) return null
  const who = names(list.map(p => short(p.full_name)))
  return (
    <div className="live-bar" role="status">
      <span className="live-dot" />
      <Eye size={17} />
      <span>{adult
        ? <><b>{who}</b> {list.length === 1 ? 'también está viendo' : 'también están viendo'} este avance ahora.</>
        : <><b>{who}</b> {list.length === 1 ? 'está revisando' : 'están revisando'} tu progreso ahora mismo.</>}</span>
    </div>
  )
}

export function OnlineAdults() {
  const team = useTeam()
  if (!team) return null
  const { online } = team
  return (
    <section className="card online-card">
      <h2><span className="live-dot" /> Adultos conectados <small>{online.length + 1}</small></h2>
      <ul>
        <li><span className="av me">Tú</span><div><b>Tú</b><span>en el panel</span></div></li>
        {online.map(p => (
          <li key={p.user_id}><span className="av">{short(p.full_name).slice(0, 1)}</span>
            <div><b>{short(p.full_name)}</b><span>{p.viewing_name ? `viendo a ${p.viewing_name}` : 'en el panel'}</span></div></li>
        ))}
      </ul>
    </section>
  )
}
