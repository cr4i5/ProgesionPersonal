// Misma regla que patrol_key() en la base de datos: "Búfalo", "bufalos", "Patrulla Búfalos" → "bufalo"
export function patrolKey(t = '') {
  let k = String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n')
  k = k.replace(/^\s*patrulla\s+/, '').replace(/[^a-z0-9]/g, '')
  if (k.length > 5 && /[nldz]es$/.test(k)) return k.slice(0, -2)
  if (k.length > 3 && k.endsWith('s')) return k.slice(0, -1)
  return k
}
export const cleanPatrolName = n => String(n).trim().replace(/^patrulla\s+/i, '').slice(0, 40)
