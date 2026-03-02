import React, { useState, useEffect } from 'react'
import { importEstudiantes, importMatriculados, importDocentes, importAsignaturasRAs } from '@/services/coordinador'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ProgressModal from '@/components/ProgressModal'
import { useLocation, useNavigate } from 'react-router-dom'

interface ImportResult { summary: string; errors: Array<{ row?: number; error?: string; more?: string }> }

const Imports: React.FC = () => {
  const [estResult, setEstResult] = useState<ImportResult | null>(null)
  const [matResult, setMatResult] = useState<ImportResult | null>(null)
  const [docResult, setDocResult] = useState<ImportResult | null>(null)
  const [asigResult, setAsigResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStatus, setProgressStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [progressMessage, setProgressMessage] = useState('')

  // Simular progreso mientras se procesa
  useEffect(() => {
    if (!loading) return
    
    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15
      if (currentProgress >= 90) {
        currentProgress = 90 // Mantener en 90% hasta que termine la petición
        clearInterval(interval)
      }
      setProgress(currentProgress)
    }, 300)

    return () => clearInterval(interval)
  }, [loading])

  const handle = async (kind: 'est' | 'mat' | 'doc' | 'asig', file?: File | null) => {
    if (!file) return
    
    setLoading(true)
    setProgress(0)
    setProgressStatus('loading')
    setProgressMessage('Procesando archivo...')
    
    let finalStatus: 'success' | 'error' = 'success'
    
    try {
      if (kind === 'est') {
        const data = await importEstudiantes(file)
        setProgress(100)
        setEstResult({ summary: `Estudiantes: creados ${data.created}, existentes ${data.existing}`, errors: data.errors || [] })
        if (data.errors && data.errors.length > 0) {
          finalStatus = 'error'
          setProgressStatus('error')
          setProgressMessage(`Creados: ${data.created}, Existentes: ${data.existing}, Errores: ${data.errors.length}`)
        } else {
          setProgressStatus('success')
          setProgressMessage(`Se crearon ${data.created} estudiantes. ${data.existing} ya existían.`)
        }
      } else if (kind === 'mat') {
        const data = await importMatriculados(file)
        setProgress(100)
        setMatResult({ summary: `Matriculados: creados ${data.created}, existentes ${data.existing}`, errors: data.errors || [] })
        if (data.errors && data.errors.length > 0) {
          finalStatus = 'error'
          setProgressStatus('error')
          setProgressMessage(`Creados: ${data.created}, Existentes: ${data.existing}, Errores: ${data.errors.length}`)
        } else {
          setProgressStatus('success')
          setProgressMessage(`Se crearon ${data.created} matrículas. ${data.existing} ya existían.`)
        }
      } else if (kind === 'doc') {
        const data = await importDocentes(file)
        setProgress(100)
        setDocResult({ summary: `Docentes: creados ${data.created}, existentes ${data.existing}`, errors: data.errors || [] })
        if (data.errors && data.errors.length > 0) {
          finalStatus = 'error'
          setProgressStatus('error')
          setProgressMessage(`Creados: ${data.created}, Existentes: ${data.existing}, Errores: ${data.errors.length}`)
        } else {
          setProgressStatus('success')
          setProgressMessage(`Se crearon ${data.created} docentes. ${data.existing} ya existían.`)
        }
      } else {
        const data = await importAsignaturasRAs(file)
        setProgress(100)
        setAsigResult({ summary: `Asignaturas: creadas ${data.created_asignaturas}, existentes ${data.existing_asignaturas}; RAs creados ${data.created_ras}`, errors: data.errors || [] })
        if (data.errors && data.errors.length > 0) {
          finalStatus = 'error'
          setProgressStatus('error')
          setProgressMessage(`Asignaturas creadas: ${data.created_asignaturas}, RAs creados: ${data.created_ras}, Errores: ${data.errors.length}`)
        } else {
          setProgressStatus('success')
          setProgressMessage(`Se crearon ${data.created_asignaturas} asignaturas y ${data.created_ras} RAs.`)
        }
      }
      
      // Cerrar el modal después de 2 segundos si es exitoso, 3 si hay error
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, finalStatus === 'success' ? 2000 : 3000)
    } catch (e: any) {
      const msg = String(e?.response?.data?.detail || e.message || 'Error desconocido')
      const errObj = { summary: msg, errors: [] as any[] }
      if (kind === 'est') setEstResult(errObj)
      else if (kind === 'mat') setMatResult(errObj)
      else if (kind === 'doc') setDocResult(errObj)
      else setAsigResult(errObj)
      
      setProgress(100)
      setProgressStatus('error')
      setProgressMessage(msg)
      
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 3000)
    }
  }

  const renderErrors = (res: ImportResult | null) => {
    if (!res || !res.errors.length) return null
    return (
      <details className="mt-1">
        <summary className="text-danger" style={{cursor: 'pointer'}}>
          <i className="bi bi-exclamation-triangle me-1"></i>
          Errores ({res.errors.length})
        </summary>
        <ul className="small mb-0 mt-2" style={{maxHeight: '200px', overflowY: 'auto'}}>
          {res.errors.map((e,i)=>(<li key={i} className="text-muted">{e.more ? e.more : `Fila ${e.row}: ${e.error}`}</li>))}
        </ul>
      </details>
    )
  }

  const location = useLocation()
  const navigate = useNavigate()
  const active = location.pathname.includes('/estudiantes') ? 'estudiantes' : location.pathname.includes('/imports') ? 'imports' : 'materias'
  const items = [
    { key: 'materias', icon: 'bi-journals', title: 'Materias' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  return (
    <>
      <ProgressModal 
        show={loading} 
        progress={progress} 
        status={progressStatus}
        message={progressMessage}
        title="Importando Datos"
      />
      <div className="dashboard-body min-vh-100">
        <HeaderBar roleLabel="Coordinador" />
        <div className="dash-wrapper">
        <Sidebar
          active={active}
          items={items}
          onClick={(key) => {
            if (key === 'materias') navigate('/coordinador/materias')
            else if (key === 'estudiantes') navigate('/coordinador/estudiantes')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
          <div className="content-title">
            <i className="bi bi-upload me-2"></i>
            Importaciones Masivas CSV
          </div>
          
          <div className="alert alert-info mb-4">
            <div className="d-flex align-items-start">
              <i className="bi bi-info-circle me-2 mt-1"></i>
              <div className="flex-grow-1">
                <strong>Instrucciones:</strong>
                <ul className="mb-0 mt-2 ps-3">
                  <li>Cada archivo debe ser <strong>CSV UTF-8</strong> con cabecera (primera fila)</li>
                  <li>Tamaño máximo: <strong>5 MB</strong></li>
                  <li>Límite: <strong>5,000 filas</strong> por archivo</li>
                  <li>Descarga las plantillas de ejemplo haciendo clic aquí: 
                    <a href={`${API_BASE.replace('/api', '')}/plantillas/README.md`} target="_blank" rel="noopener noreferrer" className="ms-2 text-decoration-underline">
                      <i className="bi bi-file-text me-1"></i>
                      Documentación completa
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <section className="panel shown">
            <div className="row g-4">
              {/* Estudiantes */}
              <div className="col-md-6 col-lg-3">
                <div className="ra-card h-100">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-people-fill text-primary me-2" style={{fontSize: '1.5rem'}}></i>
                      <h5 className="mb-0">Estudiantes</h5>
                    </div>
                    <label className="form-label fw-bold" htmlFor="csvEstudiantes">
                      <i className="bi bi-file-earmark-arrow-up me-1"></i>Archivo (CSV o Excel)
                    </label>
                    <input 
                      id="csvEstudiantes" 
                      aria-label="Archivo CSV o Excel de estudiantes" 
                      type="file" 
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                      className="form-control mb-2" 
                      onChange={e=>handle('est', e.target.files?.[0])} 
                      disabled={loading} 
                    />
                    <a 
                      href={`${API_BASE.replace('/api', '')}/plantillas/plantilla_estudiantes.xlsx`} 
                      download 
                      className="btn btn-sm btn-outline-secondary w-100 mb-2"
                    >
                      <i className="bi bi-download me-1"></i>Descargar plantilla Excel
                    </a>
                    {estResult && (
                      <div className="mt-3 p-2 rounded" style={{backgroundColor: '#f8f9fa'}}>
                        <strong className="d-block mb-1">{estResult.summary}</strong>
                        {renderErrors(estResult)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Matriculados */}
              <div className="col-md-6 col-lg-3">
                <div className="ra-card h-100">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-clipboard-check-fill text-success me-2" style={{fontSize: '1.5rem'}}></i>
                      <h5 className="mb-0">Matriculados</h5>
                    </div>
                    <label className="form-label fw-bold" htmlFor="csvMatriculados">
                      <i className="bi bi-file-earmark-arrow-up me-1"></i>Archivo (CSV o Excel)
                    </label>
                    <input 
                      id="csvMatriculados" 
                      aria-label="Archivo CSV o Excel de matriculados" 
                      type="file" 
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                      className="form-control mb-2" 
                      onChange={e=>handle('mat', e.target.files?.[0])} 
                      disabled={loading} 
                    />
                    <a 
                      href={`${API_BASE.replace('/api', '')}/plantillas/plantilla_matriculados.xlsx`} 
                      download 
                      className="btn btn-sm btn-outline-secondary w-100 mb-2"
                    >
                      <i className="bi bi-download me-1"></i>Descargar plantilla Excel
                    </a>
                    {matResult && (
                      <div className="mt-3 p-2 rounded" style={{backgroundColor: '#f8f9fa'}}>
                        <strong className="d-block mb-1">{matResult.summary}</strong>
                        {renderErrors(matResult)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Docentes */}
              <div className="col-md-6 col-lg-3">
                <div className="ra-card h-100">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-person-badge-fill text-warning me-2" style={{fontSize: '1.5rem'}}></i>
                      <h5 className="mb-0">Docentes</h5>
                    </div>
                    <label className="form-label fw-bold" htmlFor="csvDocentes">
                      <i className="bi bi-file-earmark-arrow-up me-1"></i>Archivo (CSV o Excel)
                    </label>
                    <input 
                      id="csvDocentes" 
                      aria-label="Archivo CSV o Excel de docentes" 
                      type="file" 
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                      className="form-control mb-2" 
                      onChange={e=>handle('doc', e.target.files?.[0])} 
                      disabled={loading} 
                    />
                    <a 
                      href={`${API_BASE.replace('/api', '')}/plantillas/plantilla_docentes.xlsx`} 
                      download 
                      className="btn btn-sm btn-outline-secondary w-100 mb-2"
                    >
                      <i className="bi bi-download me-1"></i>Descargar plantilla Excel
                    </a>
                    {docResult && (
                      <div className="mt-3 p-2 rounded" style={{backgroundColor: '#f8f9fa'}}>
                        <strong className="d-block mb-1">{docResult.summary}</strong>
                        {renderErrors(docResult)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Asignaturas + RAs */}
              <div className="col-md-6 col-lg-3">
                <div className="ra-card h-100">
                  <div className="ra-card-body">
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-journal-bookmark-fill text-danger me-2" style={{fontSize: '1.5rem'}}></i>
                      <h5 className="mb-0">Asignaturas + RAs</h5>
                    </div>
                    <label className="form-label fw-bold" htmlFor="csvAsignaturasRAs">
                      <i className="bi bi-file-earmark-arrow-up me-1"></i>Archivo (CSV o Excel)
                    </label>
                    <input 
                      id="csvAsigRa" 
                      aria-label="Archivo CSV o Excel de asignaturas y RAs" 
                      type="file" 
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                      className="form-control mb-2" 
                      onChange={e=>handle('asig', e.target.files?.[0])} 
                      disabled={loading} 
                    />
                    <a 
                      href={`${API_BASE.replace('/api', '')}/plantillas/plantilla_asignaturas_ras.xlsx`} 
                      download 
                      className="btn btn-sm btn-outline-secondary w-100 mb-2"
                    >
                      <i className="bi bi-download me-1"></i>Descargar plantilla Excel
                    </a>
                    {asigResult && (
                      <div className="mt-3 p-2 rounded" style={{backgroundColor: '#f8f9fa'}}>
                        <strong className="d-block mb-1">{asigResult.summary}</strong>
                        {renderErrors(asigResult)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {loading && (
              <div className="alert alert-warning mt-4 py-2 d-flex align-items-center">
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                <span>Procesando importación masiva...</span>
              </div>
            )}
          </section>

          <section className="mt-4">
            <div className="ra-card">
              <div className="ra-card-body">
                <h5 className="mb-3">
                  <i className="bi bi-graph-up me-2"></i>
                  Rendimiento Optimizado
                </h5>
                <p className="text-muted mb-2">
                  El sistema utiliza <strong>inserción masiva (bulk insert)</strong> para procesar grandes volúmenes de datos de manera eficiente:
                </p>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="text-center p-3 rounded" style={{backgroundColor: '#e7f3ff'}}>
                      <div className="fw-bold text-primary">Hasta 500 registros</div>
                      <div className="small text-muted">&lt;30 segundos</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center p-3 rounded" style={{backgroundColor: '#fff3cd'}}>
                      <div className="fw-bold text-warning">500-2,000 registros</div>
                      <div className="small text-muted">1-3 minutos</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center p-3 rounded" style={{backgroundColor: '#f8d7da'}}>
                      <div className="fw-bold text-danger">2,000-5,000 registros</div>
                      <div className="small text-muted">3-10 minutos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
    </>
  )
}

export default Imports
