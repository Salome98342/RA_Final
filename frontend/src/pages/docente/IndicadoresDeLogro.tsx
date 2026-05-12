import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import type { RA, Indicator } from '@/types'
import { useSession } from '@/state/SessionContext'
import { api } from '@/connections/http'
import { endpoints } from '@/connections/endpoints'
import { getApiErrorMessage } from '@/utils/alertMessages'

interface RAsResponse {
  id_ra?: string | number
  id?: string | number
  numero_ra?: number
  titulo?: string
  descripcion?: string
  porcentaje_ra?: number
}

interface IndicatorResponse {
  id_ind?: string | number
  id?: string | number
  descripcion?: string
}

const DocenteIndicadoresDeLogro: React.FC = () => {
  const { curso } = useParams<{ curso: string }>()
  const navigate = useNavigate()
  const { state } = useSession()
  
  const [ras, setRas] = useState<RA[]>([])
  const [selectedRA, setSelectedRA] = useState<RA | null>(null)
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  
  // Form modal state
  const [showModal, setShowModal] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null)
  const [formDescription, setFormDescription] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; indicator: Indicator | null }>({ visible: false, indicator: null })

  // Load RAs
  useEffect(() => {
    if (!curso) return
    const loadRAs = async () => {
      try {
        setLoading(true)
        const response = await api.get<RAsResponse[]>(endpoints.asignaturas.ras(curso))
        const rows = Array.isArray(response.data) ? response.data : []
        const mapped: RA[] = rows.map((it) => ({
          id: String(it.id_ra ?? it.id ?? ''),
          titulo: (it.titulo || it.descripcion || `RA ${it.numero_ra ?? it.id_ra}`) as string,
          info: '',
          porcentajeRA: it.porcentaje_ra,
        }))
        setRas(mapped)
        if (mapped.length > 0) {
          setSelectedRA((prev) => prev ?? mapped[0])
        }
      } catch (err) {
        setError('No se pudieron cargar los RA')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadRAs()
  }, [curso])

  // Load indicators for selected RA
  useEffect(() => {
    if (!selectedRA) {
      setIndicators([])
      return
    }
    const loadIndicators = async () => {
      try {
        setLoading(true)
        const response = await api.get<IndicatorResponse[]>(endpoints.ras.indicadores(selectedRA.id))
        const rows = Array.isArray(response.data) ? response.data : []
        const mapped: Indicator[] = rows.map((it) => ({
          id: String(it.id_ind ?? it.id ?? ''),
          descripcion: String(it.descripcion ?? ''),
          porcentaje: 0,
        }))
        setIndicators(mapped)
      } catch (err) {
        setError('Error al cargar los indicadores')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadIndicators()
  }, [selectedRA])

  const handleOpenForm = () => {
    setFormMode('create')
    setFormDescription('')
    setEditingIndicator(null)
    setShowModal(true)
  }

  const handleEditIndicator = (indicator: Indicator) => {
    setEditingIndicator(indicator)
    setFormDescription(indicator.descripcion)
    setFormMode('edit')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormDescription('')
    setFormMode('create')
    setEditingIndicator(null)
  }

  const handleSaveIndicator = async () => {
    if (!formDescription.trim()) {
      setError('La descripción es requerida')
      return
    }

    if (!selectedRA) {
      setError('Selecciona un RA primero')
      return
    }

    try {
      setFormLoading(true)
      const payload = { descripcion: formDescription.trim() }

      if (formMode === 'create') {
        await api.post(endpoints.ras.crearIndicador(selectedRA.id), payload)
        setMessage({ text: 'Indicador creado exitosamente', type: 'success' })
      } else if (editingIndicator) {
        await api.put(endpoints.ras.actualizarIndicador(selectedRA.id, editingIndicator.id), payload)
        setMessage({ text: 'Indicador actualizado exitosamente', type: 'success' })
      }

      // Reload indicators
      const response = await api.get<IndicatorResponse[]>(endpoints.ras.indicadores(selectedRA.id))
      const rows = Array.isArray(response.data) ? response.data : []
      const mapped: Indicator[] = rows.map((it) => ({
        id: String(it.id_ind ?? it.id ?? ''),
        descripcion: String(it.descripcion ?? ''),
        porcentaje: 0,
      }))
      setIndicators(mapped)
      
      handleCloseModal()
      setTimeout(() => setMessage(null), 3000)
    } catch (err: unknown) {
      const errMsg = getApiErrorMessage(err) || 'Error al guardar el indicador'
      setError(errMsg)
      setMessage({ text: errMsg, type: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteIndicator = async (indicator: Indicator) => {
    if (!selectedRA) return
    try {
      setFormLoading(true)
      await api.delete(endpoints.ras.indicador(selectedRA.id, indicator.id))
      setMessage({ text: 'Indicador eliminado exitosamente', type: 'success' })

      // Reload indicators
      const response = await api.get<IndicatorResponse[]>(endpoints.ras.indicadores(selectedRA.id))
      const rows = Array.isArray(response.data) ? response.data : []
      const mapped: Indicator[] = rows.map((it) => ({
        id: String(it.id_ind ?? it.id ?? ''),
        descripcion: String(it.descripcion ?? ''),
        porcentaje: 0,
      }))
      setIndicators(mapped)
      
      setDeleteConfirm({ visible: false, indicator: null })
      setTimeout(() => setMessage(null), 3000)
    } catch (err: unknown) {
      const errMsg = getApiErrorMessage(err) || 'Error al eliminar el indicador'
      setError(errMsg)
      setMessage({ text: errMsg, type: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar
          active="indicadores"
          onClick={(k) => {
            if (k === 'inicio') navigate('/docente/inicio')
            if (k === 'cursos') navigate('/docente/cursos')
            if (k === 'crear' && curso) navigate(`/docente/${curso}/ras`)
            if (k === 'calificar' && curso) navigate(`/docente/${curso}/calificar`)
            if (k === 'recursos' && curso) navigate(`/docente/${curso}/recursos`)
            if (k === 'volver-coordinador') navigate('/coordinador/asignaturas')
          }}
          items={[
            { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
            { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
            { key: 'crear', icon: 'bi-pencil-square', title: 'RA/Actividades' },
            { key: 'indicadores', icon: 'bi-bookmark-check', title: 'Indicadores' },
            { key: 'calificar', icon: 'bi-check2-square', title: 'Calificar' },
            { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' },
            ...(state.role === 'coordinador' ? [{ key: 'volver-coordinador', icon: 'bi-arrow-left-circle', title: 'Vista coordinador' }] : []),
          ]}
        />
        <main className="dash-content">
          <ModuleBreadcrumbs
            items={[
              { label: 'Inicio Docente', to: '/docente/inicio' },
              { label: 'Cursos', to: '/docente/cursos' },
              { label: `Indicadores - ${curso ?? ''}` },
            ]}
            onNavigate={navigate}
          />
          
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="content-title">
              <i className="bi bi-bookmark-check text-primary me-2"></i>
              Gestión de Indicadores de Logro - {curso}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger shadow-sm d-flex align-items-center mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              {error}
            </div>
          )}

          {message && (
            <div className={`alert shadow-sm d-flex align-items-center mb-3 ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
              <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
              {message.text}
            </div>
          )}

          {/* RAs Selection */}
          <div className="mb-4">
            <div className="content-title mb-3">
              <i className="bi bi-bullseye text-success me-2"></i>
              Selecciona un Resultado de Aprendizaje
            </div>
            {loading && ras.length === 0 ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : ras.length === 0 ? (
              <div className="alert alert-info shadow-sm">
                <i className="bi bi-info-circle me-2"></i>
                No hay Resultados de Aprendizaje disponibles en este curso
              </div>
            ) : (
              <CardGrid>
                {ras.map((ra, idx) => (
                  <RaCard
                    key={ra.id}
                    headTone={idx === 0 ? 'dark' : 'light'}
                    title={<><span className="text-uppercase small fw-bold d-block">Resultado de aprendizaje</span>{ra.titulo}</> as unknown as string}
                    subtitle={ra.info}
                    onClick={() => setSelectedRA(ra)}
                    ariaLabel={`Abrir indicadores del RA ${ra.titulo || ra.id}`}
                  />
                ))}
              </CardGrid>
            )}
          </div>

          {/* Indicators Management */}
          {selectedRA && (
            <div className="mt-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="content-title">
                  <i className="bi bi-list-check text-info me-2"></i>
                  Indicadores: {selectedRA.titulo}
                </div>
                <button
                  className="btn btn-success shadow-sm"
                  onClick={handleOpenForm}
                  title="Crear un nuevo indicador"
                >
                  <i className="bi bi-plus-circle-fill me-2"></i>
                  Nuevo Indicador
                </button>
              </div>

              {loading ? (
                <div className="d-flex align-items-center text-muted mb-3">
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Cargando indicadores…
                </div>
              ) : indicators.length === 0 ? (
                <div className="alert alert-info shadow-sm">
                  <i className="bi bi-info-circle me-2"></i>
                  Sin indicadores definidos. Crea uno para comenzar.
                </div>
              ) : (
                <ul className="list-group ra-list-group">
                  {indicators.map((indicator) => (
                    <li
                      key={indicator.id}
                      className="list-group-item shadow-sm d-flex justify-content-between align-items-center"
                    >
                      <div className="flex-grow-1">
                        <div>{indicator.descripcion}</div>
                      </div>
                      <div className="d-flex gap-2 align-items-center flex-shrink-0 ms-2">
                        <button
                          className="btn btn-sm btn-outline-primary shadow-sm"
                          onClick={() => handleEditIndicator(indicator)}
                          title="Editar indicador"
                          aria-label="Editar indicador"
                        >
                          <i className="bi bi-pencil-square me-1"></i>
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger shadow-sm"
                          onClick={() => setDeleteConfirm({ visible: true, indicator })}
                          title="Eliminar indicador"
                          aria-label="Eliminar indicador"
                        >
                          <i className="bi bi-trash me-1"></i>
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button className="btn btn-outline-danger shadow-sm mt-4" onClick={() => navigate(`/docente/${curso}/ras`)}>
            <i className="bi bi-arrow-left me-2"></i>
            Volver a RA/Actividades
          </button>
        </main>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal fade show d-block" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {formMode === 'create' ? 'Nuevo Indicador' : 'Editar Indicador'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  disabled={formLoading}
                  aria-label="Cerrar"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="description" className="form-label">
                    Descripción del Indicador
                  </label>
                  <textarea
                    id="description"
                    className="form-control"
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe el indicador de logro..."
                    disabled={formLoading}
                  />
                  <small className="text-muted mt-1 d-block">
                    Sé específico y claro en la descripción del indicador.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCloseModal}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveIndicator}
                  disabled={formLoading || !formDescription.trim()}
                >
                  {formLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Guardando…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2 me-1"></i>
                      {formMode === 'create' ? 'Crear' : 'Actualizar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.visible && deleteConfirm.indicator && (
        <div className="modal fade show d-block" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header border-danger">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                  Confirmar eliminación
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteConfirm({ visible: false, indicator: null })}
                  disabled={formLoading}
                  aria-label="Cerrar"
                ></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas eliminar este indicador?</p>
                <div className="alert alert-light p-2 bg-light border small">
                  <strong>"{deleteConfirm.indicator.descripcion}"</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setDeleteConfirm({ visible: false, indicator: null })}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeleteIndicator(deleteConfirm.indicator!)}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Eliminando…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      Eliminar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocenteIndicadoresDeLogro
