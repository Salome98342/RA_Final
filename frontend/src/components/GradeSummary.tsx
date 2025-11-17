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
  const strictPct = typeof total.strict === 'number' ? Math.round((total.strict / 5) * 100) : null

  return (
    <div className="ra-card mb-3">
      <div className="ra-card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="fw-bold">Resumen del curso</div>
          <div className="text-muted">{summary.asignatura.codigo} · {summary.asignatura.nombre}</div>
        </div>

        {/* Métricas globales: se privilegia la nota progresiva porque refleja avance acumulado */}
        <div className="row g-3">
          <div className="col-md-6"><CompactBar pct={progPct} label="Nota total (progresiva)" srLabel="Nota progresiva" tone="danger" /></div>
          <div className="col-md-6"><CompactBar pct={strictPct} label="Nota total (estricta)" srLabel="Nota estricta" tone="secondary" /></div>
        </div>

        <div className="alert alert-light border mt-3 ra-small" role="note">
          <strong>Cómo leer la tabla:</strong> "Nota" es el promedio del RA (0‑5). "Actividades" muestra cuántas ya tienen calificación. "Cobertura" indica el avance sobre los indicadores evaluados para ese RA.
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
  )
}

export default GradeSummary
