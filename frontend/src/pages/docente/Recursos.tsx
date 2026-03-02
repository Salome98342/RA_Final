import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { getRecursosByCourse, uploadRecurso, getAnunciosByCourse, createAnuncio, deleteAnuncio, type Anuncio } from '@/services/api'
import { useSession } from '@/state/SessionContext'
import { Alert } from '@/utils/alert'
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

// Componente para agregar estudiante individual por código
const AgregarEstudianteCard: React.FC<{ curso: string; onSuccess: () => void }> = ({ curso, onSuccess }) => {
  const [codigoEstudiante, setCodigoEstudiante] = useState('')
  const [buscando, setBuscando] = useState(false)

  const handleBuscar = async () => {
    if (!codigoEstudiante.trim()) {
      Alert.error('Por favor ingresa un código de estudiante')
      return
    }
    
    setBuscando(true)
    try {
      const { buscarEstudiantePorCodigo } = await import('@/services/api')
      const result = await buscarEstudiantePorCodigo(codigoEstudiante.trim())
      
      if (result.ok && result.estudiante) {
        // Mostrar modal de confirmación con SweetAlert
        const Swal = (await import('sweetalert2')).default
        const confirmResult = await Swal.fire({
          title: 'Estudiante encontrado',
          html: `
            <div class="text-start">
              <p class="mb-2"><strong>Nombre:</strong> ${result.estudiante.nombre} ${result.estudiante.apellido}</p>
              <p class="mb-2"><strong>Código:</strong> ${result.estudiante.codigo}</p>
              ${result.estudiante.codigo_programa ? `<p class="mb-2"><strong>Programa:</strong> ${result.estudiante.codigo_programa}</p>` : ''}
              <p class="mb-2"><strong>Correo:</strong> ${result.estudiante.correo}</p>
              <p class="mb-2"><strong>Documento:</strong> ${result.estudiante.documento}</p>
              <p class="mb-0"><strong>Tipo Documento:</strong> ${result.estudiante.tipo_documento}</p>
            </div>
            <hr>
            <p class="mb-0">¿Deseas agregar este estudiante al curso?</p>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, agregar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#0d6efd',
          cancelButtonColor: '#6c757d'
        })
        
        if (confirmResult.isConfirmed) {
          // Mostrar loading mientras se agrega
          Swal.fire({
            title: 'Agregando estudiante',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading()
            }
          })
          
          try {
            const { agregarEstudiantePorCodigo } = await import('@/services/api')
            const addResult = await agregarEstudiantePorCodigo(curso, codigoEstudiante.trim())
            
            Swal.close()
            Alert.success(addResult.message || 'Estudiante agregado exitosamente')
            setCodigoEstudiante('')
            await onSuccess()
          } catch (addError) {
            console.error('Error al agregar estudiante:', addError)
            Swal.close()
            const data = (addError as { response?: { data?: unknown } })?.response?.data
            const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
              ? String((data as Record<string, unknown>).detail)
              : 'Error al agregar estudiante'
            Alert.error(msg)
          }
        }
      }
    } catch (err: unknown) {
      console.error('Error al buscar estudiante:', err)
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
        ? String((data as Record<string, unknown>).detail)
        : 'Error al buscar estudiante'
      Alert.error(msg)
    } finally {
      setBuscando(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && codigoEstudiante.trim()) {
      handleBuscar()
    }
  }

  return (
    <div className="ra-card shadow-sm border-0 mb-3">
      <div className="ra-card-body">
        <div className="fw-bold mb-3 d-flex align-items-center">
          <i className="bi bi-person-plus-fill text-primary me-2 fs-5"></i>
          Agregar estudiante individual
        </div>
        
        <div className="alert alert-info d-flex align-items-start mb-3">
          <i className="bi bi-info-circle me-2 mt-1"></i>
          <div>
            Ingresa el <strong>código del estudiante</strong> para buscarlo. 
            Puedes usar el formato <code>codigo-programa</code> (ej: <code>202388558-2724</code>).
            Podrás verificar sus datos antes de agregarlo al curso.
          </div>
        </div>

        <div className="row g-2">
          <div className="col-md-8">
            <input
              className="form-control"
              type="text"
              placeholder="Ej: 2360800 o 202388558-2724"
              value={codigoEstudiante}
              onChange={e => setCodigoEstudiante(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={buscando}
            />
          </div>
          <div className="col-md-4 d-grid">
            <button
              className="btn btn-primary shadow"
              disabled={!codigoEstudiante.trim() || buscando}
              onClick={handleBuscar}
            >
              {buscando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Buscando...
                </>
              ) : (
                <>
                  <i className="bi bi-search me-2"></i>
                  Buscar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente para anuncios
const AnunciosCard: React.FC<{
  anuncios: Anuncio[]
  loading: boolean
  nuevoAnuncio: { titulo: string; contenido: string; es_importante: boolean }
  onNuevoAnuncioChange: (field: 'titulo' | 'contenido' | 'es_importante', value: string | boolean) => void
  onCrear: () => void
  onEliminar: (id: number) => void
  creando: boolean
}> = ({ anuncios, loading, nuevoAnuncio, onNuevoAnuncioChange, onCrear, onEliminar, creando }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="ra-card shadow-sm border-0 mb-3">
      <div className="ra-card-body">
        <div 
          className="fw-bold mb-3 d-flex align-items-center justify-content-between"
          style={{ cursor: 'pointer' }}
          onClick={() => setCollapsed(!collapsed)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(!collapsed) }}
        >
          <div className="d-flex align-items-center">
            <i className="bi bi-megaphone-fill text-primary me-2 fs-5"></i>
            Anuncios para estudiantes
          </div>
          <i className={`bi ${collapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`}></i>
        </div>

        {!collapsed && (
          <>
            {/* Formulario para crear anuncio */}
            <div className="border rounded p-3 mb-3 bg-light">
              <div className="mb-2">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-card-heading me-2"></i>
                  Título del anuncio
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej: Cambio de horario, Entrega de trabajo, etc."
                  value={nuevoAnuncio.titulo}
                  onChange={(e) => onNuevoAnuncioChange('titulo', e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="mb-2">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-text-paragraph me-2"></i>
                  Contenido
                </label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  placeholder="Escribe el mensaje que deseas comunicar a tus estudiantes..."
                  value={nuevoAnuncio.contenido}
                  onChange={(e) => onNuevoAnuncioChange('contenido', e.target.value)}
                />
              </div>
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="esImportante"
                  checked={nuevoAnuncio.es_importante}
                  onChange={(e) => onNuevoAnuncioChange('es_importante', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="esImportante">
                  <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                  Marcar como importante
                </label>
              </div>
              <button 
                className="btn btn-primary shadow-sm w-100"
                onClick={onCrear}
                disabled={creando || !nuevoAnuncio.titulo.trim() || !nuevoAnuncio.contenido.trim()}
              >
                {creando ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Publicando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-2"></i>
                    Publicar anuncio
                  </>
                )}
              </button>
            </div>

            {/* Lista de anuncios */}
            <div className="mt-3">
              <div className="fw-semibold mb-2 d-flex align-items-center">
                <i className="bi bi-list-ul me-2"></i>
                Anuncios publicados ({anuncios.length})
              </div>
              {loading ? (
                <div className="text-center py-3">
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Cargando anuncios...
                </div>
              ) : anuncios.length === 0 ? (
                <div className="alert alert-info d-flex align-items-center mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  No hay anuncios publicados aún. Crea el primero para comunicarte con tus estudiantes.
                </div>
              ) : (
                <div className="list-group">
                  {anuncios.map((anuncio) => (
                    <div 
                      key={anuncio.id} 
                      className={`list-group-item ${anuncio.es_importante ? 'border-warning border-2' : ''}`}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            {anuncio.es_importante && (
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                Importante
                              </span>
                            )}
                            <h6 className="mb-0 fw-bold">{anuncio.titulo}</h6>
                          </div>
                          <p className="mb-2 text-break">{anuncio.contenido}</p>
                          <small className="text-muted d-flex align-items-center">
                            <i className="bi bi-calendar3 me-1"></i>
                            {new Date(anuncio.fecha_publicacion).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                        </div>
                        <button 
                          className="btn btn-sm btn-outline-danger ms-2"
                          onClick={() => onEliminar(anuncio.id)}
                          title="Eliminar anuncio"
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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
  const dropRef = useRef<HTMLDivElement | null>(null)
  const [estudiantes, setEstudiantes] = useState<Array<{ codigo: string; nombre: string; apellido: string }>>([])
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false)

  // Estados para anuncios
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loadingAnuncios, setLoadingAnuncios] = useState(false)
  const [nuevoAnuncio, setNuevoAnuncio] = useState({ titulo: '', contenido: '', es_importante: false })
  const [creandoAnuncio, setCreandoAnuncio] = useState(false)

  const loadAnuncios = useCallback(async () => {
    if (!curso) return
    setLoadingAnuncios(true)
    try {
      const data = await getAnunciosByCourse(curso)
      setAnuncios(data)
    } catch {
      setAnuncios([])
    } finally {
      setLoadingAnuncios(false)
    }
  }, [curso])

  const handleCreateAnuncio = async () => {
    if (!curso || !nuevoAnuncio.titulo.trim() || !nuevoAnuncio.contenido.trim()) {
      Alert.warning('Por favor completa el título y contenido del anuncio')
      return
    }
    setCreandoAnuncio(true)
    try {
      await createAnuncio(curso, nuevoAnuncio)
      setNuevoAnuncio({ titulo: '', contenido: '', es_importante: false })
      await loadAnuncios()
      Alert.success('Anuncio publicado correctamente')
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data
      Alert.error(data?.detail || 'No se pudo publicar el anuncio')
    } finally {
      setCreandoAnuncio(false)
    }
  }

  const handleDeleteAnuncio = async (id: number) => {
    const confirmed = await Alert.confirm({
      title: '¿Eliminar anuncio?',
      text: 'Esta acción no se puede deshacer'
    })
    if (!confirmed) return
    try {
      await deleteAnuncio(id)
      await loadAnuncios()
      Alert.toast.success('Anuncio eliminado')
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data
      Alert.toast.error(data?.detail || 'No se pudo eliminar el anuncio')
    }
  }

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
  
  useEffect(() => { load(); loadEstudiantes(); loadAnuncios() }, [load, loadEstudiantes, loadAnuncios])

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
  <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar
          active="recursos"
          onClick={(k)=>{ if(k==='cursos') navigate('/docente') }}
          items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'recursos',icon:'bi-paperclip',title:'Recursos'}]}
        />
        <main className="dash-content" onDragOver={(e)=>{ e.preventDefault(); setDrag(true) }} onDragLeave={()=>setDrag(false)} onDrop={onDrop}>
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

          {/* Anuncios - Solo para docentes */}
          {state.role === 'docente' && (
            <AnunciosCard 
              anuncios={anuncios}
              loading={loadingAnuncios}
              nuevoAnuncio={nuevoAnuncio}
              onNuevoAnuncioChange={(field, value) => setNuevoAnuncio(prev => ({ ...prev, [field]: value }))}
              onCrear={handleCreateAnuncio}
              onEliminar={handleDeleteAnuncio}
              creando={creandoAnuncio}
            />
          )}

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

          {/* Card para agregar estudiante individual por código */}
          {state.role === 'docente' && (
            <AgregarEstudianteCard 
              curso={curso || ''} 
              onSuccess={async () => {
                await loadEstudiantes()
              }} 
            />
          )}

          {/* Card para importar estudiantes desde CSV del SIRA */}
          {state.role === 'docente' && (
            <ImportEstudiantesCard curso={curso || ''} onSuccess={async () => {
              Alert.toast.success('Estudiantes importados correctamente')
              // Recargar lista de estudiantes después de importar
              await loadEstudiantes()
            }} onError={(msg) => {
              Alert.toast.error(msg)
            }} />
          )}

          {/* Mostrar estudiantes matriculados */}
          {state.role === 'docente' && (
            <EstudiantesMatriculadosCard curso={curso || ''} estudiantes={estudiantes} loading={loadingEstudiantes} />
          )}

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
                    <li key={r.id} className="list-group-item shadow-sm d-flex justify-content-between align-items-center" onDoubleClick={()=>window.open(r.url, '_blank')}>
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
            </div>
          </div>

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