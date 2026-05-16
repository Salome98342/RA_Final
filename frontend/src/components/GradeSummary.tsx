import React from 'react'
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
  const total = summary.total
  // Cobertura: se muestra solo como barra en filas por RA (sin porcentaje visible)
  const progPct = typeof total.progressive === 'number' ? Math.round((total.progressive / 5) * 100) : null

  return (
    <>
      <div className="ra-card mb-3">
        <div className="ra-card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-bold">Resumen del curso</div>
            <div className="text-muted">{summary.asignatura.codigo} · {summary.asignatura.nombre}</div>
          </div>

          {/* Métricas globales: se privilegia la nota progresiva porque refleja avance acumulado */}
          <div className="row g-3">
            <div className="col-12">
              <CompactBar pct={progPct} label="Tu nota acumulada" srLabel="Nota acumulada" tone="danger" />
              <div className="ra-small text-muted mt-1 text-center">
                {typeof total.progressive === 'number' ? `${total.progressive.toFixed(2)} de 5.0` : 'Sin calificaciones'}
              </div>
            </div>
          </div>

          <div className="table-responsive mt-2">
            <table className="table table-sm align-middle m-0">
              <thead>
                <tr>
                  <th className="col-ra-desc">Resultado de Aprendizaje</th>
                  <th className="text-end col-ra-strict" title="Cantidad total de actividades asociadas al RA">Actividades</th>
                  <th className="text-end col-ra-prog" title="Nota actual del RA en escala 0-5">Nota actual</th>
                </tr>
              </thead>
              <tbody>
                {summary.ras.map(ra => {
                  const nota = typeof ra.progressive === 'number' ? ra.progressive.toFixed(2) : '—'
                  const totalActs = ra.actividades.length
                  const aporte = typeof ra.progressive === 'number'
                    ? (ra.progressive * (ra.porcentaje_ra / 100)).toFixed(2)
                    : '—'
                  return (
                    <tr key={String(ra.id_ra)} className="grade-summary-ra-row">
                      <td>
                        <div className="grade-summary-ra-card">
                          <div className="grade-summary-ra-pill">RA {ra.numero_ra ?? String(ra.id_ra)}</div>
                          <div className="grade-summary-ra-desc">{ra.descripcion}</div>
                          <div className="grade-summary-ra-meta">
                            <span className="grade-summary-ra-chip">
                              <i className="bi bi-bookmark-check me-1"></i>
                              {totalActs} actividad{totalActs === 1 ? '' : 'es'}
                            </span>
                            <span className="grade-summary-ra-chip grade-summary-ra-chip--neutral">
                              <i className="bi bi-bullseye me-1"></i>
                              Peso en el total: {ra.porcentaje_ra.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-end" aria-label={`Total de actividades del RA: ${totalActs}`}>
                        {totalActs}
                      </td>
                      <td className="text-end" aria-label={`Nota actual del RA: ${nota}, aporte al curso: ${aporte}`}>
                        <div className="fw-semibold">{nota}</div>
                        <div className="ra-small text-muted">Aporta {aporte}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

export default GradeSummary
