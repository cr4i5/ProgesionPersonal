export default function Bar({ value, total, color = 'var(--lake)', approved, height = 10, label }) {
  const pct = total ? Math.min(100, (value / total) * 100) : 0
  const ap = approved != null && total ? Math.min(100, (approved / total) * 100) : null
  return (
    <div className="bar" style={{ height }} role="progressbar" aria-valuenow={value} aria-valuemax={total} aria-label={label}>
      <i style={{ width: pct + '%', background: color, opacity: ap != null ? .35 : 1 }} />
      {ap != null && <i style={{ width: ap + '%', background: color }} />}
    </div>
  )
}
