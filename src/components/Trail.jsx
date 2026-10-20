import { useLayoutEffect, useRef, useState } from 'react'
import { LEVELS } from '../lib/data.js'

const D = 'M62 372 C 62 336, 282 346, 282 296 S 58 268, 68 218 S 282 196, 272 148 S 64 118, 112 78 S 226 58, 262 40'
const MAX = LEVELS[2].goal

// El camino: avanzas por la montaña según tus indicadores completados.
export default function Trail({ count, level }) {
  const path = useRef()
  const [len, setLen] = useState(0)
  const [pts, setPts] = useState([])
  useLayoutEffect(() => {
    const p = path.current; const L = p.getTotalLength(); setLen(L)
    const at = f => { const q = p.getPointAtLength(L * f); return { x: q.x, y: q.y } }
    setPts([{ name: 'Aventurero', f: 0, ...at(0) }, ...LEVELS.map(l => ({ name: l.name, goal: l.goal, f: l.goal / MAX, ...at(l.goal / MAX) }))])
  }, [])
  const frac = Math.min(1, count / MAX)
  const me = len && path.current ? path.current.getPointAtLength(len * frac) : { x: 62, y: 372 }
  return (
    <svg className="trail" viewBox="0 0 340 400" role="img" aria-label={`Llevas ${count} indicadores de ${MAX}`}>
      <defs>
        <pattern id="topo" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M0 30 Q15 10 30 30 T60 30" fill="none" stroke="#1F3F9A" strokeOpacity=".08" strokeWidth="1.5" /></pattern>
      </defs>
      <rect width="340" height="400" rx="26" fill="url(#topo)" />
      <path d="M-10 400 L110 250 L170 310 L250 160 L350 330 L350 400Z" fill="#1F3F9A" opacity=".07" />
      <path ref={path} d={D} fill="none" stroke="#C9D9D7" strokeWidth="9" strokeLinecap="round" strokeDasharray="1 14" />
      {len > 0 && <path d={D} fill="none" stroke="var(--trail)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${len * frac} ${len}`} style={{ transition: 'stroke-dasharray .9s ease' }} />}
      {pts.map((p, i) => {
        const reached = count > (LEVELS[i - 1]?.threshold ?? -1) && i > 0
        const right = p.x < 170
        return (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r="12" fill={i === 0 || reached ? 'var(--trail)' : '#fff'} stroke={i === 0 || reached ? 'var(--trail)' : '#9DB3B1'} strokeWidth="3" />
            {(i === 0 || reached) && <path d={`M${p.x - 5} ${p.y} l3.5 3.5 l6.5 -7`} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
            <text x={p.x + (right ? 20 : -20)} y={p.y - 2} textAnchor={right ? 'start' : 'end'} className="trail-name">{p.name}</text>
            <text x={p.x + (right ? 20 : -20)} y={p.y + 15} textAnchor={right ? 'start' : 'end'} className="trail-sub">{p.goal ? `${p.goal} indicadores` : 'Punto de partida'}</text>
          </g>
        )
      })}
      {pts.length > 0 && count > 0 && count < MAX && (
        <g transform={`translate(${me.x} ${me.y})`}>
          <circle r="17" fill="#FFC20E" opacity=".5"><animate attributeName="r" values="14;22;14" dur="2.4s" repeatCount="indefinite" /></circle>
          <circle r="10" fill="#7B1E3A" stroke="#fff" strokeWidth="3" />
        </g>
      )}
      <g transform="translate(247 1) scale(.3)" fill={level?.id === 'bolivar' ? '#FFC20E' : '#7B1E3A'} opacity={level?.id === 'bolivar' ? 1 : .85}><path d="M50 4C61 18 64 36 50 58 36 36 39 18 50 4ZM43 56C30 60 12 52 12 32c0-8 6-12 11-10-3 6-1 12 7 16 4 2 10 6 16 14ZM57 56c13 4 31-4 31-24 0-8-6-12-11-10 3 6 1 12-7 16-4 2-10 6-16 14ZM31 60h38v8H31ZM41 69c3 11 6 19 9 27 3-8 6-16 9-27Z" stroke={level?.id === 'bolivar' ? '#7B1E3A' : 'none'} strokeWidth="4" paintOrder="stroke" /></g>
    </svg>
  )
}
