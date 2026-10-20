import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react'
import { useProgress } from '../lib/progress.jsx'
import { fmtDate } from '../lib/stats.js'

// Estado de inscripción en la ASV y de la ficha médica. SOLO el estado: nunca datos médicos.
export default function AdminCard() {
  const { admin, saveAdmin, adult } = useProgress()
  if (admin === null) return null // aún no se corrió la migración 2
  const yr = new Date().getFullYear()
  if (!adult) {
    return (
      <section className="card">
        <h3><ShieldCheck size={19} /> Tu inscripción</h3>
        <div className="status-chips">
          {admin.asv_registered
            ? <span className="tag ok"><CheckCircle2 size={14} /> Inscrito en Scouts de Venezuela{admin.asv_year ? ` · ${admin.asv_year}` : ''}</span>
            : <span className="tag wait"><Clock size={14} /> Inscripción por confirmar</span>}
          {admin.medical_form
            ? <span className="tag ok"><CheckCircle2 size={14} /> Ficha médica entregada{admin.medical_form_date ? ` · ${fmtDate(admin.medical_form_date)}` : ''}</span>
            : <span className="tag wait"><Clock size={14} /> Ficha médica pendiente: entrégala a tus adultos</span>}
        </div>
      </section>
    )
  }
  return (
    <section className="card admin-card">
      <h3><ShieldCheck size={19} /> Inscripción y ficha médica <span className="tag neutral">Solo adultos editan</span></h3>
      <p className="muted small">Llena esto mirando IMPEESA o la ficha en papel. Esta web no se conecta con IMPEESA y aquí <b>no se guarda información médica</b>, solo si la ficha fue entregada.</p>
      <div className="admin-grid">
        <div>
          <label className="check-inline"><input type="checkbox" checked={!!admin.asv_registered} onChange={e => saveAdmin({ asv_registered: e.target.checked, asv_year: e.target.checked ? (admin.asv_year || yr) : null })} /> Inscrito en la ASV (IMPEESA)</label>
          {admin.asv_registered && <label className="form" style={{ fontSize: '.9rem', fontWeight: 800 }}>Año de inscripción
            <input type="number" min="2000" max="2100" defaultValue={admin.asv_year || yr} onBlur={e => saveAdmin({ asv_year: +e.target.value || null })} /></label>}
        </div>
        <div>
          <label className="check-inline"><input type="checkbox" checked={!!admin.medical_form} onChange={e => saveAdmin({ medical_form: e.target.checked, medical_form_date: e.target.checked ? (admin.medical_form_date || new Date().toISOString().slice(0, 10)) : null })} /> Ficha médica entregada</label>
          {admin.medical_form && <label className="form" style={{ fontSize: '.9rem', fontWeight: 800 }}>Fecha de entrega
            <input type="date" defaultValue={admin.medical_form_date || ''} onBlur={e => saveAdmin({ medical_form_date: e.target.value || null })} /></label>}
        </div>
      </div>
    </section>
  )
}
