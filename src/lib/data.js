import { RAW } from './raw.js'

// Color por área (c = color principal, soft = fondo suave, ink = texto sobre fondo suave)
const THEME = {
  corporalidad:  { c: '#E4572E', soft: '#FDEBE4', ink: '#8C2B12', icon: 'Activity' },
  creatividad:   { c: '#8A5CD6', soft: '#F0E8FB', ink: '#51299A', icon: 'Lightbulb' },
  caracter:      { c: '#2F6FD6', soft: '#E4EDFB', ink: '#173F8A', icon: 'Shield' },
  afectividad:   { c: '#D83F7B', soft: '#FBE5EE', ink: '#8A1C4B', icon: 'Heart' },
  sociabilidad:  { c: '#1E9566', soft: '#DFF3EA', ink: '#0E5A3D', icon: 'Users' },
  espiritualidad:{ c: '#C98A00', soft: '#FBF0D2', ink: '#6E4B00', icon: 'Sparkles' },
}

export const AREAS = RAW.areas.map((a, i) => ({
  ...a, n: i + 1, ...THEME[a.id],
  total: a.stages['3'].length + a.stages['4'].length,
}))
export const AREA = Object.fromEntries(AREAS.map(a => [a.id, a]))
export const TOTAL_INDICATORS = AREAS.reduce((s, a) => s + a.total, 0)

export const AVENTURERO = RAW.aventurero
export const CREDIT_CATALOG = RAW.creditos
export const CREDITS_MIN = 16

// Metas por nivel (igual que en el Excel: "Completado" cuando supera el umbral)
export const LEVELS = [
  { id: 'explorador', name: 'Explorador', goal: 90,  threshold: 80,  camps: 6, excs: 12, credits: 16 },
  { id: 'pionero',    name: 'Pionero',    goal: 140, threshold: 110, camps: 3, excs: 6 },
  { id: 'bolivar',    name: 'Scout de Bolívar', goal: 177, threshold: 135, camps: 4, excs: 8 },
]

export const SPECIALTY_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8]
export const METALS = [
  { id: 'bronce', name: 'Bronce', c: '#B26A2E' },
  { id: 'plata',  name: 'Plata',  c: '#7C8794' },
  { id: 'oro',    name: 'Oro',    c: '#C9970A' },
]

// ---- Claves de progreso ------------------------------------------------------
export const kInd = (area, stage, letter) => `ind:${area}:${stage}:${letter}`
export const kAv = n => `av:${n}`
export const kEsp = (n, metal) => `esp:${n}:${metal}`
export const kVg = (level, kind, n) => `vg:${level}:${kind}:${n}`
export const NOTE_KEYS = [
  { key: 'note:metas', title: 'Metas e indicadores de logro', hint: 'Ideas, pendientes y recordatorios sobre tus indicadores.' },
  { key: 'note:esp', title: 'Especialidades', hint: 'Qué especialidades quieres hacer, con quién y cuándo.' },
  { key: 'note:cursos', title: 'Cursos y actividades', hint: 'Cursos que hiciste o que quieres hacer.' },
]

// Índice para describir cualquier clave (lo usa la pantalla "Por revisar")
export const INDEX = {}
AREAS.forEach(a => ['3', '4'].forEach(s => a.stages[s].forEach(it => {
  INDEX[kInd(a.id, s, it.k)] = { section: a.name, label: `Etapa ${s} · ${it.k.toUpperCase()}`, text: it.t, path: `areas/${a.id}`, color: a.c }
})))
AVENTURERO.forEach((t, i) => { INDEX[kAv(i + 1)] = { section: 'Aventurero', label: `Meta ${i + 1}`, text: t, path: 'aventurero', color: '#1F3F9A' } })
SPECIALTY_NUMBERS.forEach(n => METALS.forEach(m => {
  INDEX[kEsp(n, m.id)] = { section: 'Especialidades', label: `Especialidad ${n} · ${m.name}`, text: '', path: 'especialidades', color: m.c }
}))
METALS.forEach(m => { INDEX[kEsp('pf', m.id)] = { section: 'Especialidades', label: `Punta de flecha · ${m.name}`, text: '', path: 'especialidades', color: m.c } })
LEVELS.forEach(l => {
  for (let n = 1; n <= l.camps; n++) INDEX[kVg(l.id, 'camp', n)] = { section: 'Vida de grupo', label: `${l.name} · Campamento ${n}`, text: '', path: 'vida-de-grupo', color: '#1E9566' }
  for (let n = 1; n <= l.excs; n++) INDEX[kVg(l.id, 'exc', n)] = { section: 'Vida de grupo', label: `${l.name} · Excursión ${n}`, text: '', path: 'vida-de-grupo', color: '#1E9566' }
})
