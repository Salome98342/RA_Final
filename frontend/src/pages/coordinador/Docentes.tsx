import React, { useEffect, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { useLocation, useNavigate } from 'react-router-dom'
import DocentePerfilModal from '@/components/DocentePerfilModal'
import Alert from '@/utils/alert'
import {
  fetchDocentes,
  createDocente,
  type CreateDocentePayload,
  type DocenteListItem,
} from '@/services/coordinador'

const Docentes: React.FC = () => {
  const [docentes, setDocentes] = useState<DocenteListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPerfilModal, setShowPerfilModal] = useState(false)
  const [selectedDocenteId, setSelectedDocenteId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CreateDocentePayload>({
    codigo_docente: '',
    nombre: '',
    apellido: '',
    correo: '',
    tipo_documento: '',
    num_documento: '',
  })

  const location = useLocation()
  const navigate = useNavigate()
  const active = location.pathname.includes('/docentes')
    ? 'docentes'
    : location.pathname.includes('/estudiantes')
      ? 'estudiantes'
      : location.pathname.includes('/matriculados')
        ? 'matriculados'
        : location.pathname.includes('/asignaturas-ra')
          ? 'asignaturas-ra'
      : location.pathname.includes('/imports')
        ? 'imports'
        : 'materias'

  const items = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'materias', icon: 'bi-journals', title: 'Materias' },
    { key: 'docentes', icon: 'bi-person-badge', title: 'Docentes' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'matriculados', icon: 'bi-clipboard-check', title: 'Matriculados' },
    { key: 'asignaturas-ra', icon: 'bi-journal-bookmark', title: 'Asignaturas + RA' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  useEffect(() => {
    loadDocentes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDocentes(searchTerm)
    }, 350)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const loadDocentes = async (search?: string) => {
    setLoading(true)
    try {
      const data = await fetchDocentes(search || undefined)
      setDocentes(data)
    } catch (e: any) {
      console.error('Error cargando docentes:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.codigo_docente || !formData.nombre || !formData.apellido || !formData.correo || !formData.tipo_documento || !formData.num_documento) {
      Alert.toast.warning('Todos los campos son requeridos.')
      return
    }

    const confirmed = await Alert.confirmCreate('docente')
    if (!confirmed) return

    setLoading(true)
    try {
      const result = await createDocente(formData)
      Alert.success(result.detail || `Docente creado exitosamente: ${result.docente.nombre} ${result.docente.apellido}`)
      setFormData({
        codigo_docente: '',
        nombre: '',
        apellido: '',
        correo: '',
        tipo_documento: '',
        num_documento: '',
      })
      setShowForm(false)
      await loadDocentes(searchTerm)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || 'Error al crear docente'
      Alert.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDocenteClick = (id_docente: number) => {
    setSelectedDocenteId(id_docente)
    setShowPerfilModal(true)
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
            else if (key === 'materias') navigate('/coordinador/materias')
            else if (key === 'docentes') navigate('/coordinador/docentes')
            else if (key === 'estudiantes') navigate('/coordinador/estudiantes')
            else if (key === 'matriculados') navigate('/coordinador/matriculados')
            else if (key === 'asignaturas-ra') navigate('/coordinador/asignaturas-ra')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />

        <main className="dash-content">
          <div className="content-title d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <i className="bi bi-person-badge me-2"></i>
              Gestión de Docentes
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowForm((prev) => !prev)
                }}
              >
                <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'} me-2`}></i>
                + Agregar Docente Individual
              </button>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => navigate('/coordinador/imports')}
              >
                <i className="bi bi-upload me-1"></i>
                Carga masiva (CSV)
              </button>
            </div>
          </div>

          {showForm && (
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <i className="bi bi-person-plus me-2"></i>
                Nuevo Docente
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Código de Docente</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.codigo_docente}
                        onChange={(e) => setFormData({ ...formData, codigo_docente: e.target.value })}
                        placeholder="Ej: DOC001"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Correo</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.correo}
                        onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                        placeholder="docente@universidad.edu"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Nombre</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Nombre"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Apellido</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.apellido}
                        onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                        placeholder="Apellido"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Tipo de Documento</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.tipo_documento}
                        onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                        placeholder="Cedula de Ciudadania"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Numero de Documento</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.num_documento}
                        onChange={(e) => setFormData({ ...formData, num_documento: e.target.value })}
                        placeholder="1234567890"
                      />
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
                    <button type="submit" className="btn btn-primary">
                      <i className="bi bi-check-lg me-2"></i>
                      Crear Docente
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <h5 className="mb-0">
                    <i className="bi bi-list-ul me-2"></i>
                    Lista de Docentes ({docentes.length})
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

            <div className="card-body p-0">
              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              )}

              {!loading && docentes.length === 0 && (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-inbox display-4 d-block mb-3"></i>
                  {searchTerm ? 'No se encontraron docentes con ese criterio' : 'No hay docentes registrados'}
                </div>
              )}

              {!loading && docentes.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Código</th>
                        <th>Nombre Completo</th>
                        <th>Correo</th>
                        <th>Documento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docentes.map((docente) => (
                        <tr
                          key={docente.id_docente}
                          onClick={() => handleDocenteClick(docente.id_docente)}
                          className="table-row-clickable"
                          title="Clic para ver perfil completo"
                        >
                          <td>
                            <span className="badge bg-secondary">{docente.codigo_docente}</span>
                          </td>
                          <td>
                            <i className="bi bi-person me-2 text-muted"></i>
                            {docente.nombre} {docente.apellido}
                          </td>
                          <td>
                            <i className="bi bi-envelope me-2 text-muted"></i>
                            {docente.correo}
                          </td>
                          <td>
                            <span className="text-muted small">
                              {docente.tipo_documento || 'Documento'}: {docente.num_documento}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {showPerfilModal && selectedDocenteId && (
            <DocentePerfilModal
              id_docente={selectedDocenteId}
              onClose={() => {
                setShowPerfilModal(false)
                setSelectedDocenteId(null)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default Docentes
