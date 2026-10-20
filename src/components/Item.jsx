import { useEffect, useRef, useState } from 'react'
import { Check, MessageSquare, Clock, ThumbsUp, RotateCcw, Send } from 'lucide-react'
import { useProgress } from '../lib/progress.jsx'

const MSGS = ['¡Muy bien!', '¡Lo lograste!', '¡Un paso más en el camino!', '¡Así se hace!', '¡Excelente!']

export function ReviewTag({ row }) {
  if (!row || row.status !== 'completado') return null
  if (row.review_status === 'aprobado') return <span className="tag ok"><ThumbsUp size={13} /> Aprobado</span>
  if (row.review_status === 'ajustes') return <span className="tag warn"><RotateCcw size={13} /> Para mejorar</span>
  return <span className="tag wait"><Clock size={13} /> En revisión</span>
}

// Caja de revisión para adultos (sirve para indicadores y para créditos)
export function ReviewBox({ row, onReview }) {
  const [comment, setComment] = useState(row.review_comment || '')
  const [open, setOpen] = useState(false)
  useEffect(() => setComment(row.review_comment || ''), [row.review_comment])
  const sent = row.review_status !== 'pendiente'
  return (
    <div className="review-box">
      <div className="review-actions">
        <button className={`btn sm ${row.review_status === 'aprobado' ? 'solid-ok' : 'ghost'}`} onClick={() => onReview({ review_status: 'aprobado', review_comment: comment })}>
          <Check size={15} /> Aprobar
        </button>
        <button className={`btn sm ${row.review_status === 'ajustes' ? 'solid-warn' : 'ghost'}`} onClick={() => setOpen(o => !o || row.review_status === 'ajustes')}>
          <RotateCcw size={15} /> Pedir ajustes
        </button>
        {sent && <ReviewTag row={{ ...row, status: 'completado' }} />}
      </div>
      {(open || row.review_status === 'ajustes' || row.review_comment) && (
        <div className="review-comment">
          <textarea rows={2} value={comment} placeholder="Escribe un comentario para el joven (qué hizo bien, qué falta)…" onChange={e => setComment(e.target.value)} />
          <button className="btn sm primary" disabled={!comment.trim()}
            onClick={() => { onReview({ review_status: row.review_status === 'aprobado' ? 'aprobado' : 'ajustes', review_comment: comment.trim() }); setOpen(false) }}>
            <Send size={14} /> {row.review_status === 'aprobado' ? 'Guardar comentario' : 'Enviar ajustes'}
          </button>
        </div>
      )}
    </div>
  )
}

export function Feedback({ row }) {
  if (!row?.review_comment || row.status === 'pendiente') return null
  return <div className={`feedback ${row.review_status}`}><b>{row.review_status === 'aprobado' ? 'Tu adulto dice:' : 'Para mejorar:'}</b> {row.review_comment}</div>
}

function NoteField({ value, onSave, label, placeholder, disabled }) {
  const [v, setV] = useState(value || '')
  const t = useRef()
  useEffect(() => setV(value || ''), [value])
  const commit = x => { clearTimeout(t.current); if ((value || '') !== x) onSave(x) }
  return (
    <label className="note">
      <span>{label}</span>
      <textarea rows={2} value={v} disabled={disabled} placeholder={placeholder}
        onChange={e => { setV(e.target.value); clearTimeout(t.current); const x = e.target.value; t.current = setTimeout(() => commit(x), 900) }}
        onBlur={() => commit(v)} />
    </label>
  )
}

const TRI = [['pendiente', 'Sin empezar'], ['en_proceso', 'En proceso'], ['completado', 'Finalizado']]

/** variant: 'check' (indicador / meta) | 'tri' (sin empezar · en proceso · finalizado) */
export default function Item({ k, tag, text, color = '#1F3F9A', variant = 'check', noteLabel = '¿Cómo lo lograste? (opcional)', notePlaceholder = 'Cuéntalo con tus palabras…', title }) {
  const { items, save, review, adult, celebrate, toast } = useProgress()
  const row = items[k]
  const status = row?.status || 'pendiente'
  const done = status === 'completado'
  const [showNote, setShowNote] = useState(false)
  const hasNote = Boolean(row?.note)

  const set = s => {
    save(k, { status: s, note: row?.note || '' })
    if (s === 'completado') { toast(MSGS[Math.floor(Math.random() * MSGS.length)]); }
  }
  return (
    <li className={`item ${done ? 'done' : ''} ${status === 'en_proceso' ? 'prog' : ''}`} style={{ '--c': color }}>
      <div className="item-main">
        {variant === 'check' ? (
          <button className="check" disabled={adult} aria-pressed={done} aria-label={done ? 'Marcado como completado. Toca para desmarcar' : 'Marcar como completado'}
            onClick={() => set(done ? 'pendiente' : 'completado')}>
            <Check size={20} strokeWidth={3} />
          </button>
        ) : (
          <div className="tri" role="group" aria-label="Estado">
            {TRI.map(([v, l]) => (
              <button key={v} className={status === v ? `on ${v}` : ''} disabled={adult} aria-pressed={status === v} onClick={() => set(v)}>{l}</button>
            ))}
          </div>
        )}
        <div className="item-body">
          {title && <div className="item-title">{title}</div>}
          {tag && <span className="letter">{tag}</span>}
          {text && <p>{text}</p>}
        </div>
        <ReviewTag row={row} />
      </div>

      {(hasNote || showNote || (!adult && status !== 'pendiente' && variant === 'tri')) && (
        adult
          ? (hasNote && <div className="kid-note"><b>Nota del joven:</b> {row.note}</div>)
          : <NoteField value={row?.note} label={noteLabel} placeholder={notePlaceholder} onSave={n => save(k, { status, note: n })} />
      )}
      {!adult && !hasNote && !showNote && variant === 'check' && done && (
        <button className="link-btn" onClick={() => setShowNote(true)}><MessageSquare size={14} /> Añadir una nota</button>
      )}
      <Feedback row={row} />
      {adult && done && <ReviewBox row={row} onReview={r => review(k, r)} />}
    </li>
  )
}
