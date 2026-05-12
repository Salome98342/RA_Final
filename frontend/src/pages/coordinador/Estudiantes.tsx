import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  fetchEstudiantes, 
  createEstudiante, 
  deactivateEstudiante,
  activateEstudiante,
  updateEstudianteJornada,
  fetchTiposDocumento,
  type EstudianteListItem,
  type TipoDocumento
} from '@/services/coordinador'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import EstudiantePerfilModal from '@/components/EstudiantePerfilModal'
import PaginationControls from '@/components/PaginationControls'
import Alert from '@/utils/alert'
import { formatTipoDocumentoAbbr } from '@/utils/documento'
import { getErrorMessage } from '@/utils/errors'
import { useLocation, useNavigate } from 'react-router-dom'

const DEFAULT_PAGE_SIZE = 10

const Estudiantes: React.FC = () => {
  const jornadaOptions = ['', 'Diurna', 'Nocturna']
  const [estudiantes, setEstudiantes] = useState<EstudianteListItem[]>([])
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    codigo_estudiante: '',
    nombre: '',
    apellido: '',
    correo: '',
    tipo_documento: '',
    num_documento: '',
    jornada: ''
  })
  const [showPerfilModal, setShowPerfilModal] = useState(false)
  const [selectedEstudianteId, setSelectedEstudianteId] = useState<number | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null)
  const [activatingId, setActivatingId] = useState<number | null>(null)
  const [updatingJornadaId, setUpdatingJornadaId] = useState<number | null>(null)
  const [activePage, setActivePage] = useState(1)
  const [inactivePage, setInactivePage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const location = useLocation()
  const navigate = useNavigate()
  const active = location.pathname.includes('/docentes') ? 'docentes' : location.pathname.includes('/estudiantes') ? 'estudiantes' : location.pathname.includes('/matriculados') ? 'matriculados' : location.pathname.includes('/asignaturas-ra') ? 'asignaturas-ra' : location.pathname.includes('/imports') ? 'imports' : 'asignaturas'
  const items = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'desempenio', icon: 'bi-graph-up-arrow', title: 'Desempeño' },
    { key: 'asignaturas', icon: 'bi-journals', title: 'Asignaturas' },
    { key: 'docentes', icon: 'bi-person-badge', title: 'Docentes' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'matriculados', icon: 'bi-clipboard-check', title: 'Matriculados' },
    { key: 'asignaturas-ra', icon: 'bi-journal-bookmark', title: 'Asignaturas + RA' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  const loadEstudiantes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEstudiantes(searchTerm || undefined, true)
      setEstudiantes(data)
    } catch (error: unknown) {
      console.error('Error cargando estudiantes:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  const loadTiposDocumento = useCallback(async () => {
    try {
      const data = await fetchTiposDocumento()
      setTiposDocumento(data)
    } catch (error: unknown) {
      console.error('Error cargando tipos de documento:', error)
    }
  }, [])

  useEffect(() => {
    loadEstudiantes()
    loadTiposDocumento()
  }, [loadEstudiantes, loadTiposDocumento])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEstudiantes()
    }, 500)
    return () => clearTimeout(timer)
  }, [loadEstudiantes])

  useEffect(() => {
    setActivePage(1)
    setInactivePage(1)
  }, [searchTerm, estudiantes.length])

  const normalizeJornada = (value?: string | null) => {
    if (!value) return ''
    const normalized = value.trim().toLowerCase()
    if (normalized.includes('nocturna') || normalized.includes('noche')) return 'Nocturna'
    if (normalized.includes('diurna') || normalized.includes('dia') || normalized.includes('manana')) return 'Diurna'
    return ''
  }

  const confirmJornadaChange = async (nombreCompleto: string, jornada: string | null) => {
    const jornadaLabel = jornada || 'Sin asignar'
    return Alert.confirm({
      title: 'Confirmar jornada',
      text: jornada
        ? `¿Estás seguro de que la jornada de ${nombreCompleto} es ${jornadaLabel}?`
        : `¿Estás seguro de quitar la jornada de ${nombreCompleto}?`,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      type: 'question',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar campos requeridos
    if (!formData.codigo_estudiante || !formData.nombre || !formData.apellido || 
        !formData.correo || !formData.tipo_documento || !formData.num_documento) {
      Alert.toast.warning('Todos los campos son requeridos excepto Jornada')
      return
    }

    const confirmed = formData.jornada
      ? await confirmJornadaChange(`${formData.nombre} ${formData.apellido}`, formData.jornada)
      : await Alert.confirmCreate('estudiante')
    if (!confirmed) return

    setLoading(true)
    try {
      const result = await createEstudiante(formData)
      Alert.success(`Estudiante creado exitosamente. Se envió un correo de bienvenida a ${result.estudiante.correo}`)
      // Limpiar formulario
      setFormData({
        codigo_estudiante: '',
        nombre: '',
        apellido: '',
        correo: '',
        tipo_documento: '',
        num_documento: '',
        jornada: ''
      })
      setShowForm(false)
      // Recargar lista
      setTimeout(() => loadEstudiantes(), 1000)
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'Error al crear estudiante'))
    } finally {
      setLoading(false)
    }
  }

  const handleEstudianteDoubleClick = (id_estudiante: number) => {
    setSelectedEstudianteId(id_estudiante)
    setShowPerfilModal(true)
  }

  const estudiantesActivos = estudiantes.filter(est => est.activo !== false)
  const estudiantesDesactivados = estudiantes.filter(est => est.activo === false)
  const activeMaxPage = Math.max(1, Math.ceil(estudiantesActivos.length / pageSize))
  const inactiveMaxPage = Math.max(1, Math.ceil(estudiantesDesactivados.length / pageSize))
  const visibleActivos = useMemo(
    () => estudiantesActivos.slice((activePage - 1) * pageSize, activePage * pageSize),
    [estudiantesActivos, activePage, pageSize]
  )
  const visibleInactivos = useMemo(
    () => estudiantesDesactivados.slice((inactivePage - 1) * pageSize, inactivePage * pageSize),
    [estudiantesDesactivados, inactivePage, pageSize]
  )

  const handleDesactivarPerfil = async (estudiante: EstudianteListItem) => {
    const confirmed = await Alert.confirm({
      title: '¿Desactivar perfil de estudiante?',
      text: `Se desactivará el acceso de ${estudiante.nombre} ${estudiante.apellido}. Esta acción bloquea su inicio de sesión.`,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    })
    if (!confirmed) return

    setDeactivatingId(estudiante.id_estudiante)
    try {
      const result = await deactivateEstudiante(estudiante.id_estudiante)
      Alert.success(result.detail)
      await loadEstudiantes()
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'No se pudo desactivar el perfil del estudiante'))
    } finally {
      setDeactivatingId(null)
    }
  }

  const handleActivarPerfil = async (estudiante: EstudianteListItem) => {
    const confirmed = await Alert.confirm({
      title: '¿Reactivar perfil de estudiante?',
      text: `Se reactivará el acceso de ${estudiante.nombre} ${estudiante.apellido}.`,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
      type: 'question',
    })
    if (!confirmed) return

    setActivatingId(estudiante.id_estudiante)
    try {
      const result = await activateEstudiante(estudiante.id_estudiante)
      Alert.success(result.detail)
      await loadEstudiantes()
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'No se pudo reactivar el perfil del estudiante'))
    } finally {
      setActivatingId(null)
    }
  }

  const handleJornadaChange = async (estudiante: EstudianteListItem, jornada: string) => {
    const normalizedJornada = jornada || null
    const confirmed = await confirmJornadaChange(`${estudiante.nombre} ${estudiante.apellido}`, normalizedJornada)
    if (!confirmed) return

    setUpdatingJornadaId(estudiante.id_estudiante)
    try {
      const result = await updateEstudianteJornada(estudiante.id_estudiante, normalizedJornada)
      Alert.success(
        result.estudiante.jornada
          ? `Jornada de ${estudiante.nombre} ${estudiante.apellido} actualizada a ${result.estudiante.jornada}`
          : `Jornada de ${estudiante.nombre} ${estudiante.apellido} eliminada`
      )
      await loadEstudiantes()
    } catch (error: unknown) {
      Alert.error(getErrorMessage(error, 'No se pudo actualizar la jornada'))
    } finally {
      setUpdatingJornadaId(null)
    }
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Coordinador" />
      <div className="dash-wrapper">
        <Sidebar
          active={active}
          items={items}
          onClick={(key) => {
            if (key === 'inicio') navigate('/coordinador')
            else if (key === 'desempenio') navigate('/coordinador/desempenio')
            else if (key === 'asignaturas') navigate('/coordinador/asignaturas')
            else if (key === 'docentes') navigate('/coordinador/docentes')
            else if (key === 'estudiantes') navigate('/coordinador/estudiantes')
            else if (key === 'matriculados') navigate('/coordinador/matriculados')
            else if (key === 'asignaturas-ra') navigate('/coordinador/asignaturas-ra')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
          <div className="content-title d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-people me-2"></i>
              Gestión de Estudiantes
            </div>
            <button 
              className="btn btn-sm btn-outline-danger"
              onClick={() => navigate('/coordinador/imports')}
            >
              <i className="bi bi-upload me-1"></i>
              Carga masiva
            </button>
          </div>

          <ModuleBreadcrumbs
            items={[
              { label: 'Coordinador', to: '/coordinador' },
              { label: 'Estudiantes' },
            ]}
            onNavigate={(to) => navigate(to)}
          />

          <div className="alert alert-info d-flex align-items-center py-2" role="note">
            <i className="bi bi-mouse2 me-2"></i>
            Doble clic sobre una fila para abrir el perfil completo del estudiante.
          </div>

          {/* Botón para mostrar formulario */}
          <div className="mb-4">
            <button 
              className="btn btn-primary"
              onClick={() => {
                setShowForm(!showForm)
              }}
            >
              <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'} me-2`}></i>
              {showForm ? 'Cancelar' : 'Agregar Estudiante Individual'}
            </button>
          </div>

          {/* Formulario de creación individual */}
          {showForm && (
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <i className="bi bi-person-plus me-2"></i>
                Nuevo Estudiante
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  Se generará una contraseña provisional automáticamente y se enviará un correo de bienvenida al estudiante.
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Código de Estudiante <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.codigo_estudiante}
                        onChange={(e) => setFormData({...formData, codigo_estudiante: e.target.value})}
                        placeholder="Ej: 2024001"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Correo Electrónico <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.correo}
                        onChange={(e) => setFormData({...formData, correo: e.target.value})}
                        placeholder="estudiante@universidad.edu"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Nombre <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        placeholder="Juan"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Apellido <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.apellido}
                        onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                        placeholder="Pérez"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">
                        Tipo de Documento <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.tipo_documento}
                        onChange={(e) => setFormData({...formData, tipo_documento: e.target.value})}
                        aria-label="Seleccionar tipo de documento"
                      >
                        <option value="">Seleccione...</option>
                        {tiposDocumento.map(td => (
                          <option key={td.id_tipo_documento} value={td.descripcion}>
                            {formatTipoDocumentoAbbr(td.descripcion)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">
                        Número de Documento <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.num_documento}
                        onChange={(e) => setFormData({...formData, num_documento: e.target.value})}
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">
                        Jornada
                      </label>
                      <select
                        className="form-select"
                        value={formData.jornada}
                        onChange={(e) => setFormData({...formData, jornada: e.target.value})}
                        aria-label="Seleccionar jornada"
                      >
                        <option value="">Seleccione...</option>
                        <option value="Diurna">Diurna</option>
                        <option value="Nocturna">Nocturna</option>
                      </select>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowForm(false)
                      }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Creando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-2"></i>
                          Crear Estudiante
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Buscador */}
          <div className="card mb-4">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <h5 className="mb-0">
                    <i className="bi bi-search me-2"></i>
                    Buscar estudiantes
                  </h5>
                </div>
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por código, nombre, correo o documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de estudiantes activos */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Lista de Estudiantes ({estudiantesActivos.length})
              </h5>
            </div>
            <div className="card-body p-0">
              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              )}

              {!loading && estudiantesActivos.length === 0 && (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-inbox display-4 d-block mb-3"></i>
                  {searchTerm ? 'No se encontraron estudiantes activos con ese criterio' : 'No hay estudiantes activos'}
                </div>
              )}

              {!loading && estudiantesActivos.length > 0 && (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Código</th>
                          <th>Nombre Completo</th>
                          <th>Correo</th>
                          <th>Documento</th>
                          <th>Jornada</th>
                          <th>Estado</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                      {visibleActivos.map(est => (
                        <tr 
                          key={est.id_estudiante}
                          onDoubleClick={() => handleEstudianteDoubleClick(est.id_estudiante)}
                          style={{ cursor: 'pointer' }}
                          title="Doble clic para ver perfil completo"
                        >
                          <td>
                            <span className="badge bg-secondary">{est.codigo_estudiante}</span>
                          </td>
                          <td>
                            <i className="bi bi-person me-2 text-muted"></i>
                            {est.nombre} {est.apellido}
                          </td>
                          <td>
                            <i className="bi bi-envelope me-2 text-muted"></i>
                            {est.correo}
                          </td>
                          <td>
                            <span className="text-muted small">
                              {formatTipoDocumentoAbbr(est.tipo_documento)}: {est.num_documento}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                            <select
                              className="form-select form-select-sm"
                              value={normalizeJornada(est.jornada)}
                              disabled={updatingJornadaId === est.id_estudiante}
                              onChange={(e) => handleJornadaChange(est, e.target.value)}
                              aria-label={`Cambiar jornada de ${est.nombre} ${est.apellido}`}
                            >
                              {jornadaOptions.map((option) => (
                                <option key={option || 'sin-asignar'} value={option}>
                                  {option || 'Sin asignar'}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {est.activo === false ? (
                              <span className="badge bg-secondary">Inactivo</span>
                            ) : (
                              <span className="badge bg-success">Activo</span>
                            )}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={est.activo === false || deactivatingId === est.id_estudiante}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDesactivarPerfil(est)
                              }}
                              title={est.activo === false ? 'Perfil ya inactivo' : 'Desactivar perfil'}
                            >
                              {deactivatingId === est.id_estudiante ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                                  Desactivando...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-person-x me-1"></i>
                                  Desactivar
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls
                    page={activePage}
                    totalPages={activeMaxPage}
                    totalItems={estudiantesActivos.length}
                    pageSize={pageSize}
                    onPageChange={setActivePage}
                    onPageSizeChange={(size) => {
                      setActivePage(1)
                      setInactivePage(1)
                      setPageSize(size)
                    }}
                    label="estudiantes activos"
                    className="px-3 pb-3"
                  />
                </>
              )}
            </div>
          </div>

          {/* Lista de estudiantes inactivos */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-person-x me-2"></i>
                Lista de Estudiantes inactivos ({estudiantesDesactivados.length})
              </h5>
            </div>
            <div className="card-body p-0">
              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-secondary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              )}

              {!loading && estudiantesDesactivados.length === 0 && (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-check2-circle display-4 d-block mb-3"></i>
                  {searchTerm ? 'No se encontraron estudiantes inactivos con ese criterio' : 'No hay estudiantes inactivos'}
                </div>
              )}

              {!loading && estudiantesDesactivados.length > 0 && (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Código</th>
                          <th>Nombre Completo</th>
                          <th>Correo</th>
                          <th>Documento</th>
                          <th>Jornada</th>
                          <th>Estado</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                      {visibleInactivos.map(est => (
                        <tr 
                          key={est.id_estudiante}
                          onDoubleClick={() => handleEstudianteDoubleClick(est.id_estudiante)}
                          style={{ cursor: 'pointer' }}
                          title="Doble clic para ver perfil completo"
                        >
                          <td>
                            <span className="badge bg-secondary">{est.codigo_estudiante}</span>
                          </td>
                          <td>
                            <i className="bi bi-person me-2 text-muted"></i>
                            {est.nombre} {est.apellido}
                          </td>
                          <td>
                            <i className="bi bi-envelope me-2 text-muted"></i>
                            {est.correo}
                          </td>
                          <td>
                            <span className="text-muted small">
                              {formatTipoDocumentoAbbr(est.tipo_documento)}: {est.num_documento}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                            <select
                              className="form-select form-select-sm"
                              value={normalizeJornada(est.jornada)}
                              disabled={updatingJornadaId === est.id_estudiante}
                              onChange={(e) => handleJornadaChange(est, e.target.value)}
                              aria-label={`Cambiar jornada de ${est.nombre} ${est.apellido}`}
                            >
                              {jornadaOptions.map((option) => (
                                <option key={option || 'sin-asignar'} value={option}>
                                  {option || 'Sin asignar'}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className="badge bg-secondary">Inactivo</span>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={activatingId === est.id_estudiante}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleActivarPerfil(est)
                              }}
                              title="Reactivar perfil"
                            >
                              {activatingId === est.id_estudiante ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                                  Reactivando...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-person-check me-1"></i>
                                  Reactivar
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls
                    page={inactivePage}
                    totalPages={inactiveMaxPage}
                    totalItems={estudiantesDesactivados.length}
                    pageSize={pageSize}
                    onPageChange={setInactivePage}
                    onPageSizeChange={(size) => {
                      setActivePage(1)
                      setInactivePage(1)
                      setPageSize(size)
                    }}
                    label="estudiantes inactivos"
                    className="px-3 pb-3"
                  />
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Perfil del Estudiante */}
      {showPerfilModal && selectedEstudianteId && (
        <EstudiantePerfilModal
          id_estudiante={selectedEstudianteId}
          onClose={() => {
            setShowPerfilModal(false)
            setSelectedEstudianteId(null)
          }}
        />
      )}
    </div>
  )
}

export default Estudiantes
