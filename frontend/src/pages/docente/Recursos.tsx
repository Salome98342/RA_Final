import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { getRecursosByCourse, uploadRecurso } from '@/services/api'
import { useSession } from '@/state/SessionContext'
import Toast from '@/components/Toast'
import { api } from '@/connections/http'

// Componente para mostrar estudiantes matriculados
const EstudiantesMatriculadosCard: React.FC<{ curso: string; estudiantes: Array<{ codigo: string; nombre: string; apellido: string }>; loading: boolean }> = ({ estudiantes, loading }) => {
  const [collapsed, setCollapsed] = useState(true)

  if (loading) {
    return (
      <div className="ra-card shadow-sm border-0 mb-3">
        <div className="ra-card-body">
          <div className="d-flex align-items-center">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Cargando estudiantes...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ra-card shadow-sm border-0 mb-3">
      <div className="ra-card-body">
        <div 
          className="fw-bold mb-2 d-flex align-items-center justify-content-between"
          style={{ cursor: 'pointer' }}
          onClick={() => setCollapsed(!collapsed)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(!collapsed) }}
        >
          <div className="d-flex align-items-center">
            <i className="bi bi-people-fill text-info me-2 fs-5"></i>
            Estudiantes matriculados ({estudiantes.length})
          </div>
          <i className={`bi ${collapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`}></i>
        </div>

        {!collapsed && (
          <div className="mt-3">
            {estudiantes.length === 0 ? (
              <div className="alert alert-info d-flex align-items-center mb-0">
                <i className="bi bi-info-circle me-2"></i>
                No hay estudiantes matriculados aún. Usa el importador CSV para agregar estudiantes.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((est) => (
                      <tr key={est.codigo}>
                        <td><code>{est.codigo}</code></td>
                        <td>{est.nombre}</td>
                        <td>{est.apellido}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para importar estudiantes desde CSV del SIRA
const ImportEstudiantesCard: React.FC<{ curso: string; onSuccess: () => void; onError: (msg: string) => void }> = ({ curso, onSuccess, onError }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ created: number; existing: number; errors: Array<{ row?: number; error?: string }> } | null>(null)

  const handleUpload = async () => {
    if (!csvFile || !curso) return
    setUploading(true)
    setResult(null)
    
    const formData = new FormData()
    formData.append('file', csvFile)
    
    try {
      const res = await api.post(`/docente/asignaturas/${curso}/import/estudiantes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      setCsvFile(null)
      onSuccess()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
        ? String((data as Record<string, unknown>).detail)
        : 'Error al importar estudiantes'
      onError(msg)
      setResult(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="ra-card shadow-sm border-0 mb-3">
      <div className="ra-card-body">
        <div className="fw-bold mb-3 d-flex align-items-center">
          <i className="bi bi-people-fill text-success me-2 fs-5"></i>
          Importar estudiantes desde CSV del SIRA
        </div>
        
        <div className="alert alert-info d-flex align-items-start mb-3">
          <i className="bi bi-info-circle me-2 mt-1"></i>
          <div>
            <strong>Formato esperado:</strong> Archivo CSV con columna <code>codigo_estudiante</code> (o sinónimos: <code>estudiante</code>, <code>code</code>, <code>matricula</code>).
            <br/>Opcionalmente puede incluir <code>periodo</code>. Los estudiantes deben existir en el sistema.
          </div>
        </div>

        <div className="row g-2">
          <div className="col-md-8">
            <input
              className="form-control"
              type="file"
              accept=".csv"
              onChange={e => setCsvFile(e.target.files?.[0] || null)}
              title="Selecciona el archivo CSV del SIRA"
            />
          </div>
          <div className="col-md-4 d-grid">
            <button
              className="btn btn-success shadow"
              disabled={!csvFile || uploading}
              onClick={handleUpload}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Importando...
                </>
              ) : (
                <>
                  <i className="bi bi-upload me-2"></i>
                  Importar
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-3">
            <div className="alert alert-success mb-2">
              <i className="bi bi-check-circle me-2"></i>
              <strong>Importación completada:</strong> {result.created} nuevos estudiantes matriculados. {result.existing} ya estaban matriculados.
            </div>
            {result.errors.length > 0 && (
              <div className="alert alert-warning">
                <strong>Errores ({result.errors.length}):</strong>
                <ul className="mb-0 mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      {e.row ? `Fila ${e.row}: ` : ''}{e.error || 'Error desconocido'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const DocenteRecursos: React.FC = () => {
  const { curso } = useParams<{curso: string}>()
  const navigate = useNavigate()
  const { state } = useSession()
  const [items, setItems] = useState<{ id: string; titulo: string; url: string; fecha: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [drag, setDrag] = useState(false)
  const [toast, setToast] = useState<{ text: string; type?: 'ok'|'error' } | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const [estudiantes, setEstudiantes] = useState<Array<{ codigo: string; nombre: string; apellido: string }>>([])
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false)

  const load = useCallback(async () => {
    if (!curso) return
    setItems(await getRecursosByCourse(curso))
  }, [curso])
  
  const loadEstudiantes = useCallback(async () => {
    if (!curso || state.role !== 'docente') return
    setLoadingEstudiantes(true)
    try {
      const res = await api.get(`/asignaturas/${curso}/estudiantes`)
      const data = res.data || []
      setEstudiantes(data.map((e: { codigo_estudiante: string; primer_nombre: string; primer_apellido: string }) => ({
        codigo: e.codigo_estudiante,
        nombre: e.primer_nombre,
        apellido: e.primer_apellido
      })))
    } catch {
      setEstudiantes([])
    } finally {
      setLoadingEstudiantes(false)
    }
  }, [curso, state.role])
  
  useEffect(() => { load(); loadEstudiantes() }, [load, loadEstudiantes])

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
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="content-title">Recursos · {curso}</div>
            {state.role === 'coordinador' && (
              <button 
                className="btn btn-outline-primary"
                onClick={() => navigate('/coordinador/materias')}
                title="Volver a la vista del coordinador"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Regresar a Coordinador
              </button>
            )}
          </div>

          <div ref={dropRef} className={`ra-card shadow-sm border-0 mb-3 ${drag ? 'dropzone-drag' : ''}`}><div className="ra-card-body">
            <div className="fw-bold mb-3 d-flex align-items-center">
              <i className="bi bi-cloud-upload-fill text-primary me-2 fs-5"></i>
              Subir microcurrículo
            </div>
            <div className="row g-2">
              <div className="col-md-5">
                <input className="form-control" placeholder="Título (opcional)" value={titulo} onChange={e=>setTitulo(e.target.value)} />
              </div>
              <div className="col-md-5">
                <input className="form-control" type="file" onChange={e=>setFile(e.target.files?.[0] || null)} title="Selecciona un PDF o documento" />
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
          </div></div>

          {/* Card para importar estudiantes desde CSV del SIRA */}
          {state.role === 'docente' && (
            <ImportEstudiantesCard curso={curso || ''} onSuccess={async () => {
              setToast({ text: 'Estudiantes importados correctamente', type: 'ok' })
              // Recargar lista de estudiantes después de importar
              await loadEstudiantes()
            }} onError={(msg) => {
              setToast({ text: msg, type: 'error' })
            }} />
          )}

          {/* Mostrar estudiantes matriculados */}
          {state.role === 'docente' && (
            <EstudiantesMatriculadosCard curso={curso || ''} estudiantes={estudiantes} loading={loadingEstudiantes} />
          )}

          <div className="fw-bold mb-3 d-flex align-items-center">
            <i className="bi bi-folder-fill text-warning me-2 fs-5"></i>
            Documentos del curso
          </div>
          {items.length === 0 ? (
            <div className="alert alert-secondary shadow-sm d-flex align-items-center">
              <i className="bi bi-inbox-fill me-2 fs-5"></i>
              <span>Sin recursos aún.</span>
            </div>
          ) : (
            <ul className="list-group ra-list-group">
              {items.map(r => (
                <li key={r.id} className="list-group-item shadow-sm d-flex justify-content-between align-items-center" onDoubleClick={()=>window.open(r.url, '_blank')}>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                      <span className="fw-semibold">{r.titulo}</span>
                    </div>
                    <div className="ra-small text-muted mt-1">
                      <i className="bi bi-calendar3 me-1"></i>
                      {new Date(r.fecha).toLocaleString()}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary shadow-sm" onClick={()=>copy(r.url)} title="Copiar enlace">
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

          <button className="btn btn-outline-danger shadow-sm mt-4" onClick={()=>navigate(`/docente/${curso}/ras`)}>
            <i className="bi bi-arrow-left me-2"></i>
            Volver a RAs
          </button>
        </main>
      </div>
    </div>
  )
}
export default DocenteRecursos