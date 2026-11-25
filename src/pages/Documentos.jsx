import { useEffect, useState } from 'react'
import { FileText, Upload, ExternalLink, Trash2, ShieldCheck } from 'lucide-react'
import { useProgress } from '../lib/progress.jsx'
import { db } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { useUI } from '../lib/ui.jsx'

const pretty = d => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
export default function Documentos() {
  const { user } = useAuth(); const { userId, person, adult } = useProgress(); const { toast } = useUI()
  const [docs, setDocs] = useState([]); const [file, setFile] = useState(null); const [busy, setBusy] = useState(false)
  async function load() { try { setDocs(await db.listMedicalDocuments(userId)) } catch { toast('No se pudieron consultar los documentos. Ejecuta la migración 8.', 'err') } }
  useEffect(() => { load() }, [userId])
  async function upload(e) {
    e.preventDefault(); if (!file || busy) return
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) { toast('Solo se permiten archivos PDF.', 'err'); return }
    if (file.size > 10 * 1024 * 1024) { toast('El PDF supera el límite de 10 MB.', 'err'); return }
    setBusy(true)
    try { await db.uploadMedicalDocument(userId, file); setFile(null); e.target.reset(); await load(); toast('Ficha médica cargada de forma privada.') }
    catch (err) { toast(err?.message || 'No se pudo cargar el PDF. Verifica la migración 8 y los permisos.', 'err') }
    finally { setBusy(false) }
  }
  async function remove(doc) { if (!confirm('¿Eliminar esta ficha médica?')) return; try { await db.deleteMedicalDocument(doc); await load(); toast('Documento eliminado.') } catch { toast('No se pudo eliminar el documento.', 'err') } }
  return <div className="page narrow">
    <div className="page-head"><h1>{adult ? 'Ficha médica' : 'Mis documentos'}</h1><p className="lead">{adult ? `Documentación médica de ${person?.full_name || 'este joven'}.` : 'Adjunta el PDF descargado desde IMPEESA y mantén tu documentación al día.'}</p></div>
    <div className="callout medical-private"><ShieldCheck size={20}/><span>Documentos privados. Solo el titular y los adultos de programa pueden consultarlos. Los Guías no obtienen acceso a fichas de otros jóvenes.</span></div>
    <form className="card form" onSubmit={upload}>
      <label>Seleccionar ficha médica (PDF)<input type="file" accept="application/pdf,.pdf" required onChange={e => setFile(e.target.files?.[0] || null)}/><span className="hint">Máximo 10 MB. Puedes adjuntar una ficha propia o, si eres adulto, la del joven que estás administrando.</span></label>
      <button className="btn primary" disabled={!file || busy}><Upload size={17}/>{busy ? 'Subiendo…' : 'Adjuntar ficha médica'}</button>
    </form>
    <section className="card document-list"><h2>Documentos cargados</h2>{docs.length === 0 ? <p className="muted">Todavía no hay fichas médicas adjuntas.</p> : docs.map(doc => <div className="document-row" key={doc.id}><FileText size={22}/><div className="document-meta"><b>{doc.file_name}</b><small>Subida el {pretty(doc.created_at)}</small></div><a className="btn sm ghost" href={doc.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Ver PDF</a><button className="icon-btn" aria-label="Eliminar documento" onClick={() => remove(doc)}><Trash2 size={16}/></button></div>)}</section>
  </div>
}
