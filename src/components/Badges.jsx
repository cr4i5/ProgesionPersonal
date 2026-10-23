import { Footprints, Flame, Backpack, Medal, Tent, Mountain, Star, Award, ThumbsUp, Trophy, Lock, Compass } from 'lucide-react'
import { AREAS, LEVELS } from '../lib/data.js'

// Insignias que se ganan solas según el avance. No se guardan: se calculan con lo que ya hay.
export function computeBadges(stats) {
  const lvl = id => { const l = LEVELS.find(x => x.id === id); return stats.ind > l.threshold }
  const areaDone = AREAS.some(a => stats.areas[a.id].done === a.total)
  return [
    { id: 'p1', name: 'Primer paso', hint: 'Marca tu primer indicador', Icon: Footprints, c: '#1E9566', ok: stats.ind >= 1 },
    { id: 'p25', name: 'En marcha', hint: '25 indicadores marcados', Icon: Flame, c: '#E4572E', ok: stats.ind >= 25 },
    { id: 'p100', name: 'Imparable', hint: '100 indicadores marcados', Icon: Star, c: '#C98A00', ok: stats.ind >= 100 },
    { id: 'ok1', name: 'Aprobado', hint: 'Un adulto aprueba un logro tuyo', Icon: ThumbsUp, c: '#237A4B', ok: stats.indOk >= 1 },
    { id: 'av', name: 'Aventurero', hint: 'Completa las 9 metas de Aventurero', Icon: Backpack, c: '#1F3F9A', ok: stats.av >= 9 },
    { id: 'esp', name: 'Con especialidad', hint: 'Finaliza una especialidad', Icon: Medal, c: '#8A5CD6', ok: stats.esp >= 1 },
    { id: 'camp', name: 'Campista', hint: 'Finaliza un campamento', Icon: Tent, c: '#1E9566', ok: stats.camps >= 1 },
    { id: 'exc', name: 'Caminante', hint: 'Finaliza una excursión', Icon: Mountain, c: '#2F6FD6', ok: stats.excs >= 1 },
    { id: 'area', name: 'Área completa', hint: 'Completa todos los indicadores de un área', Icon: Compass, c: '#D83F7B', ok: areaDone },
    { id: 'cred', name: 'Créditos al día', hint: `Llega a ${stats.credMin} créditos`, Icon: Award, c: '#C98A00', ok: stats.credits >= stats.credMin },
    { id: 'lv1', name: 'Explorador', hint: 'Supera 80 indicadores', Icon: Trophy, c: '#7B1E3A', ok: lvl('explorador') },
    { id: 'lv2', name: 'Pionero', hint: 'Supera 110 indicadores', Icon: Trophy, c: '#7B1E3A', ok: lvl('pionero') },
    { id: 'lv3', name: 'Scout de Bolívar', hint: 'Supera 135 indicadores', Icon: Trophy, c: '#7B1E3A', ok: lvl('bolivar') },
  ]
}

export default function Badges({ stats }) {
  const list = computeBadges(stats)
  const n = list.filter(b => b.ok).length
  return (
    <section>
      <h2 className="h-section">Insignias <small className="muted">{n} de {list.length}</small></h2>
      <ul className="badges">
        {list.map(({ id, name, hint, Icon, c, ok }) => (
          <li key={id} className={ok ? 'on' : ''} style={{ '--c': c }} title={ok ? name : hint}>
            <span className="badge-ico">{ok ? <Icon size={26} strokeWidth={2.2} /> : <Lock size={20} />}</span>
            <b>{name}</b>
            <small>{ok ? '¡Ganada!' : hint}</small>
          </li>
        ))}
      </ul>
    </section>
  )
}
