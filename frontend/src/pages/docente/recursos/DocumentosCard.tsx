import React, { useRef, useState, useEffect, useCallback } from 'react'
import { uploadRecurso, getRecursosByCourse } from '@/services/api'
import { Alert } from '@/utils/alert'

interface RecursoItem {
  id: string
  titulo: string
  url: string
  fecha: string
}

interface Props {
  curso: string
}

const DocumentosCard: React.FC<Props> = ({ curso }) => {
  const [items, setItems] = useState<RecursoItem[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [drag, setDrag] = useState(false)
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
        Alert.toast.success('Recurso subido (portapapeles)')
      } catch (err: unknown) {
        const data = (err as { response?: { data?: unknown } })?.response?.data
        const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
          ? String((data as Record<string, unknown>).detail)
          : 'No se pudo subir el recurso'
        Alert.toast.error(msg)
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
      Alert.toast.success('Recurso subido')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
        ? String((data as Record<string, unknown>).detail)
        : 'No se pudo subir el recurso'
      Alert.toast.error(msg)
    }
  }

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); Alert.toast.success('Enlace copiado') }
    catch { Alert.toast.error('No se pudo copiar') }
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false)
    if (!curso) return
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    try {
      await uploadRecurso(curso, f, titulo || f.name)
      setTitulo(''); await load()
      Alert.toast.success('Recurso subido (arrastrar y soltar)')
    } catch { Alert.toast.error('Error al subir') }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      <div ref={dropRef} className={`ra-card shadow-sm border-0 mb-3 ${drag ? 'dropzone-drag' : ''}`}>
        <div className="ra-card-body">
          <div className="fw-bold mb-3 d-flex align-items-center">
            <i className="bi bi-cloud-upload-fill text-primary me-2 fs-5"></i>
            Subir microcurrículo
          </div>
          <div className="row g-2">
            <div className="col-md-5">
              <input className="form-control" placeholder="Título (opcional)" value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>
            <div className="col-md-5">
              <input className="form-control" type="file" onChange={e => setFile(e.target.files?.[0] || null)} title="Selecciona un PDF o documento" />
            </div>
            <div className="col-md-2 d-grid">
              <button className="btn btn-danger shadow" disabled={!file} onClick={onUpload}>
                <i className="bi bi-upload me-2"></i>
                Subir
              </button>
            </div>
          </div>
          <div className="form-text mt-2 d-flex align-items-center">
            <i className="bi bi-info-circle me-2"></i>
            También puedes arrastrar y soltar un archivo aquí o pegarlo (Ctrl+V).
          </div>
        </div>
      </div>

      <div className="ra-card shadow-sm border-0 mb-3">
        <div className="ra-card-body">
          <div className="fw-bold mb-3 d-flex align-items-center">
            <i className="bi bi-folder-fill text-warning me-2 fs-5"></i>
            Documentos del curso
          </div>
          {items.length === 0 ? (
            <div className="alert alert-info shadow-sm d-flex align-items-center mb-0">
              <i className="bi bi-inbox-fill me-2 fs-5"></i>
              <span>No hay recursos subidos aún. Usa el formulario de arriba para agregar documentos.</span>
            </div>
          ) : (
            <ul className="list-group ra-list-group">
              {items.map(r => (
                <li key={r.id} className="list-group-item shadow-sm d-flex justify-content-between align-items-center" onDoubleClick={() => window.open(r.url, '_blank')}>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
                      <span className="fw-semibold">{r.titulo}</span>
                    </div>
                    <div className="ra-small text-muted mt-1">
                      <i className="bi bi-calendar3 me-1"></i>
                      {new Date(r.fecha).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary shadow-sm" onClick={() => copy(r.url)} title="Copiar enlace">
                      <i className="bi bi-link-45deg"></i>
                    </button>
                    <a className="btn btn-sm btn-outline-danger shadow-sm" href={r.url} target="_blank" rel="noreferrer">
                      <i className="bi bi-download me-1"></i>
                      Descargar
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentosCard
