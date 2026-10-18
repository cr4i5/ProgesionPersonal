import { Activity, Lightbulb, Shield, Heart, Users, Sparkles, Star } from 'lucide-react'
const Icons = { Activity, Lightbulb, Shield, Heart, Users, Sparkles, Star }

// Parche scout: círculo festoneado con un anillo de progreso alrededor.
function scallop(r, bumps = 14, amp = 0.045) {
  const pts = []
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2
    const rr = r * (1 + amp * Math.cos(a * bumps))
    pts.push(`${i ? 'L' : 'M'}${(50 + rr * Math.cos(a)).toFixed(2)} ${(50 + rr * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join('') + 'Z'
}
const SHAPE = scallop(37)

export default function Patch({ icon = 'Star', color = '#0E7C86', soft = '#E2F1F2', value = 0, size = 88, label }) {
  const Icon = Icons[icon] || Icons.Star
  const R = 46, C = 2 * Math.PI * R
  return (
    <div className="patch" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={R} fill="none" stroke={soft} strokeWidth="5" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${C * Math.min(1, value)} ${C}`} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray .6s ease' }} />
        <path d={SHAPE} fill={color} />
        <path d={scallop(30, 14, 0)} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" strokeDasharray="3 3" />
      </svg>
      <Icon className="patch-icon" size={size * 0.3} strokeWidth={2.2} />
    </div>
  )
}
