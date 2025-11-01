import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { getRecursosByCourse, uploadRecurso } from '@/services/api'
import Toast from '@/components/Toast'

const DocenteRecursos: React.FC = () => {
  const { curso } = useParams<{curso: string}>()
  const navigate = useNavigate()
  const [items, setItems] = useState<{ id: string; titulo: string; url: string; fecha: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [drag, setDrag] = useState(false)
  const [toast, setToast] = useState<{ text: string; type?: 'ok'|'error' } | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    if (!curso) return
    setItems(await getRecursosByCourse(curso))
  }, [curso])
  useEffect(() => { load() }, [load])

  // Pegar archivo (Ctrl+V)
  useEffect(() => {
  const onPaste = async (e: ClipboardEvent) => {
      if (!curso) return
      const f = Array.from(e.clipboardData?.files || [])[0]
      if (!f) return
      try {
        await uploadRecurso(curso, f, titulo || f.name)
        setTitulo(''); await load()
        setToast({ text: 'Recurso subido (portapapeles)', type: 'ok' })
      } catch (err: unknown) {
        const data = (err as { response?: { data?: unknown } })?.response?.data
        const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
          ? String((data as Record<string, unknown>).detail)
          : 'No se pudo subir el recurso'
        setToast({ text: msg, type: 'error' })
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [curso, titulo, load])

  const onUpload = async () => {
    if (!curso || !file) return
    try {
      await uploadRecurso(curso, file, titulo || file.name)
      setFile(null); setTitulo('')
      await load()
      setToast({ text: 'Recurso subido', type: 'ok' })
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
        ? String((data as Record<string, unknown>).detail)
        : 'No se pudo subir el recurso'
      setToast({ text: msg, type: 'error' })
    }
  }

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setToast({ text: 'Enlace copiado', type: 'ok' }) }
    catch { setToast({ text: 'No se pudo copiar', type: 'error' }) }
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false)
    if (!curso) return
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    try {
      await uploadRecurso(curso, f, titulo || f.name)
      setTitulo(''); await load()
      setToast({ text: 'Recurso subido (arrastrar y soltar)', type: 'ok' })
    } catch { setToast({ text: 'Error al subir', type: 'error' }) }
  }

  return (
  <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar
          active="recursos"
          onClick={(k)=>{ if(k==='cursos') navigate('/docente') }}
          items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'recursos',icon:'bi-paperclip',title:'Recursos'}]}
        />
        <main className="dash-content" onDragOver={(e)=>{ e.preventDefault(); setDrag(true) }} onDragLeave={()=>setDrag(false)} onDrop={onDrop}>
          {toast ? <Toast text={toast.text} type={toast.type} /> : null}
          <div className="content-title">Recursos · {curso}</div>

          <div ref={dropRef} className={`ra-card mb-3 ${drag ? 'dropzone-drag' : ''}`}><div className="ra-card-body">
            <div className="fw-bold mb-2">Subir microcurrículo</div>
            <div className="row g-2">
              <div className="col-md-5">
                <input className="form-control" placeholder="Título (opcional)" value={titulo} onChange={e=>setTitulo(e.target.value)} />
              </div>
              <div className="col-md-5">
                <input className="form-control" type="file" onChange={e=>setFile(e.target.files?.[0] || null)} title="Selecciona un PDF o documento" />
              </div>
              <div className="col-md-2 d-grid">
                <button className="btn btn-danger" disabled={!file} onClick={onUpload}><i className="bi bi-upload" /> Subir</button>
              </div>
            </div>
            <div className="ra-small mt-2">También puedes arrastrar y soltar un archivo aquí o pegarlo (Ctrl+V).</div>
          </div></div>

          <div className="fw-bold mb-2">Documentos del curso</div>
          {items.length === 0 ? (
            <div className="alert alert-secondary">Sin recursos aún.</div>
          ) : (
            <ul className="list-group ra-list-group">
              {items.map(r => (
                <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center" role="button" onDoubleClick={()=>window.open(r.url, '_blank')}>
                  <div>
                    <div>{r.titulo}</div>
                    <div className="ra-small">{new Date(r.fecha).toLocaleString()}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={()=>copy(r.url)} title="Copiar enlace"><i className="bi bi-link-45deg" /></button>
                    <a className="btn btn-outline-danger" href={r.url} target="_blank" rel="noreferrer"><i className="bi bi-download" /> Descargar</a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button className="btn btn-outline-danger mt-3" onClick={()=>navigate(`/docente/${curso}/ras`)}><i className="bi bi-arrow-left" /> Volver</button>
        </main>
      </div>
    </div>
  )
}
export default DocenteRecursos