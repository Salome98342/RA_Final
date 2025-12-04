import React, { useState } from 'react'
import type { GradeSummaryResponse } from '@/types'

export type GradeSummaryProps = { summary: GradeSummaryResponse }

// Barra compacta reutilizable
const CompactBar: React.FC<{ pct: number | null; label: string; tone?: 'danger'|'secondary'|'warning'; srLabel?: string }> = ({ pct, label, tone = 'danger', srLabel }) => {
  if (pct == null) return <div className="text-muted">Sin datos</div>
  const step = Math.round(pct / 10) * 10
  const widthClass = `w-pct-${step}`
  const toneClass = tone === 'danger' ? 'bg-danger' : tone === 'warning' ? 'bg-warning text-dark' : 'bg-secondary'
  return (
    <div>
      <div className="progress progress-compact" aria-hidden="true">
        <div className={`progress-bar ${toneClass} ${widthClass}`} />
      </div>
      <div className="ra-small text-muted d-flex justify-content-between mt-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      {srLabel && <span className="visually-hidden" aria-live="polite">{srLabel}: {pct}%</span>}
    </div>
  )
}

const GradeSummary: React.FC<GradeSummaryProps> = ({ summary }) => {
  const [showInfo, setShowInfo] = useState(false)
  const total = summary.total
  // Cobertura: se muestra solo como barra en filas por RA (sin porcentaje visible)
  const progPct = typeof total.progressive === 'number' ? Math.round((total.progressive / 5) * 100) : null
  const strictPct = typeof total.strict === 'number' ? Math.round((total.strict / 5) * 100) : null

  return (
    <>
      <div className="ra-card mb-3">
        <div className="ra-card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              <div className="fw-bold">Resumen del curso</div>
              <button 
                className="btn btn-link btn-sm p-0 text-muted" 
                onClick={() => setShowInfo(!showInfo)}
                title="Información sobre las calificaciones"
                aria-label="Información sobre las calificaciones"
                style={{ lineHeight: 1 }}
              >
                <i className={`bi bi-info-circle${showInfo ? '-fill text-primary' : ''} fs-5`}></i>
              </button>
            </div>
            <div className="text-muted">{summary.asignatura.codigo} · {summary.asignatura.nombre}</div>
          </div>
          
          <style>{`
            @keyframes fadeInBackdrop {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUpModal {
              from {
                opacity: 0;
                transform: translateY(30px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            @keyframes slideInItem {
              from {
                opacity: 0;
                transform: translateX(-20px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>

          {/* Métricas globales: se privilegia la nota progresiva porque refleja avance acumulado */}
          <div className="row g-3">
            <div className="col-md-6">
              <CompactBar pct={progPct} label="Tu nota acumulada" srLabel="Nota acumulada" tone="danger" />
              <div className="ra-small text-muted mt-1 text-center">
                {typeof total.progressive === 'number' ? `${total.progressive.toFixed(2)} de 5.0` : 'Sin calificaciones'}
              </div>
            </div>
            <div className="col-md-6">
              <CompactBar pct={strictPct} label="Nota sobre el total del curso" srLabel="Nota sobre total" tone="secondary" />
              <div className="ra-small text-muted mt-1 text-center">
                {typeof total.strict === 'number' ? `${total.strict.toFixed(2)} de 5.0` : 'Sin calificaciones'}
              </div>
            </div>
          </div>

          <div className="table-responsive mt-2">
            <table className="table table-sm align-middle m-0">
              <thead>
                <tr>
                  <th className="col-ra-desc">Resultado de Aprendizaje</th>
                  <th className="text-end col-ra-prog" title="Promedio del RA en escala 0-5">Nota</th>
                  <th className="text-end col-ra-strict" title="Actividades calificadas / total">Actividades</th>
                  <th className="text-end col-ra-cov" title="Indicadores evaluados sobre el total">Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {summary.ras.map(ra => {
                  const nota = typeof ra.progressive === 'number' ? ra.progressive.toFixed(2) : '—'
                  const totalActs = ra.actividades.length
                  const gradedActs = ra.actividades.filter(a => typeof (a as any).nota === 'number').length
                  const cov = Math.round(ra.coverage * 100)
                  const covStep = Math.round(cov / 10) * 10
                  const covWidth = `w-pct-${covStep}`
                  return (
                    <tr key={String(ra.id_ra)}>
                      <td>
                        <div className="fw-semibold">{ra.descripcion}</div>
                        <div className="ra-small text-muted">{totalActs} actividades</div>
                      </td>
                      <td className="text-end" aria-label={`Nota del RA: ${nota}`}>{nota}</td>
                      <td className="text-end" aria-label={`Actividades calificadas: ${gradedActs} de ${totalActs}`}>{gradedActs} / {totalActs}</td>
                      <td className="text-end" aria-label={`Cobertura de indicadores`}>
                        <div className="progress progress-compact" aria-hidden="true" title={`Cobertura de indicadores`}>
                          <div className={`progress-bar bg-warning text-dark ${covWidth}`} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal acorde a la estética del sistema */}
      {showInfo && (
        <>
          {/* Backdrop con animación suave */}
          <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ 
              zIndex: 1040,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(3px)',
              padding: '1.5rem',
              animation: 'fadeInBackdrop 0.3s ease-out'
            }}
            onClick={() => setShowInfo(false)}
          >
            {/* Modal compacto centrado */}
            <div 
              className="bg-white rounded-3 shadow d-flex flex-column"
              style={{ 
                width: '100%',
                maxWidth: '480px',
                maxHeight: '75vh',
                animation: 'slideUpModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header simple y limpio */}
              <div className="border-bottom p-3 bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-info-circle-fill text-primary fs-5"></i>
                    <strong className="text-dark">Cómo leer tu resumen</strong>
                  </div>
                  <button 
                    className="btn btn-sm btn-light rounded-circle p-0 d-flex align-items-center justify-content-center"
                    onClick={() => setShowInfo(false)}
                    aria-label="Cerrar"
                    style={{ 
                      width: '30px', 
                      height: '30px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e9ecef'
                      e.currentTarget.style.transform = 'rotate(90deg)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = ''
                      e.currentTarget.style.transform = 'rotate(0deg)'
                    }}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
              
              {/* Contenido compacto con scroll */}
              <div 
                className="p-3"
                style={{ 
                  overflowY: 'auto',
                  flexGrow: 1,
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e0 #f8f9fa'
                }}
              >
                <div className="d-flex flex-column gap-2">
                  {/* Item 1 */}
                  <div 
                    className="p-3 rounded-3 border"
                    style={{
                      backgroundColor: '#fff',
                      animation: 'slideInItem 0.4s ease-out 0.1s both',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                      e.currentTarget.style.transform = 'translateX(3px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center bg-danger bg-opacity-10"
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: 0
                        }}
                      >
                        <i className="bi bi-graph-up text-danger"></i>
                      </div>
                      <div className="flex-grow-1">
                        <strong className="text-dark d-block mb-1 ra-small">Tu nota acumulada</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                          Promedio de actividades calificadas.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item 2 */}
                  <div 
                    className="p-3 rounded-3 border"
                    style={{
                      backgroundColor: '#fff',
                      animation: 'slideInItem 0.4s ease-out 0.2s both',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                      e.currentTarget.style.transform = 'translateX(3px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center bg-secondary bg-opacity-10"
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: 0
                        }}
                      >
                        <i className="bi bi-clipboard-check text-secondary"></i>
                      </div>
                      <div className="flex-grow-1">
                        <strong className="text-dark d-block mb-1 ra-small">Nota sobre el total</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                          Si el curso terminara hoy.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item 3 */}
                  <div 
                    className="p-3 rounded-3 border"
                    style={{
                      backgroundColor: '#fff',
                      animation: 'slideInItem 0.4s ease-out 0.3s both',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                      e.currentTarget.style.transform = 'translateX(3px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center bg-warning bg-opacity-10"
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: 0
                        }}
                      >
                        <i className="bi bi-star-fill text-warning"></i>
                      </div>
                      <div className="flex-grow-1">
                        <strong className="text-dark d-block mb-1 ra-small">Nota del RA</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                          Promedio por resultado de aprendizaje.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item 4 */}
                  <div 
                    className="p-3 rounded-3 border"
                    style={{
                      backgroundColor: '#fff',
                      animation: 'slideInItem 0.4s ease-out 0.4s both',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                      e.currentTarget.style.transform = 'translateX(3px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center bg-success bg-opacity-10"
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: 0
                        }}
                      >
                        <i className="bi bi-list-check text-success"></i>
                      </div>
                      <div className="flex-grow-1">
                        <strong className="text-dark d-block mb-1 ra-small">Actividades</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                          Calificadas / Total programadas.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item 5 */}
                  <div 
                    className="p-3 rounded-3 border"
                    style={{
                      backgroundColor: '#fff',
                      animation: 'slideInItem 0.4s ease-out 0.5s both',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                      e.currentTarget.style.transform = 'translateX(3px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center bg-info bg-opacity-10"
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: 0
                        }}
                      >
                        <i className="bi bi-pie-chart-fill text-info"></i>
                      </div>
                      <div className="flex-grow-1">
                        <strong className="text-dark d-block mb-1 ra-small">Cobertura</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                          Porcentaje de indicadores completados.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer simple */}
              <div 
                className="border-top p-2 bg-light text-center"
                style={{
                  flexShrink: 0,
                  animation: 'slideInItem 0.4s ease-out 0.6s both'
                }}
              >
                <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                  <i className="bi bi-lightbulb text-warning"></i>
                  <span>Revisa regularmente tu progreso</span>
                </small>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default GradeSummary
