import React, { useState } from 'react'
import type { Anuncio } from '@/services/api'

interface Props {
  anuncios: Anuncio[]
  loading: boolean
  nuevoAnuncio: { titulo: string; contenido: string; es_importante: boolean }
  onNuevoAnuncioChange: (field: 'titulo' | 'contenido' | 'es_importante', value: string | boolean) => void
  onCrear: () => void
  onEliminar: (id: number) => void
  creando: boolean
}

const AnunciosCard: React.FC<Props> = ({ anuncios, loading, nuevoAnuncio, onNuevoAnuncioChange, onCrear, onEliminar, creando }) => {
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

export default AnunciosCard
