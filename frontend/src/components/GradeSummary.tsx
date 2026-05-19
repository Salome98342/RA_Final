import React from 'react'
import type { GradeSummaryResponse } from '@/types'

export type GradeSummaryProps = { summary: GradeSummaryResponse }

// Barra compacta reutilizable
const CompactBar: React.FC<{ pct: number | null; label: string; tone?: 'danger'|'secondary'|'warning'|'success'; srLabel?: string }> = ({ pct, label, tone = 'danger', srLabel }) => {
  if (pct == null) return <div className="text-muted">Sin datos</div>
  const step = Math.round(pct / 10) * 10
  const widthClass = `w-pct-${step}`
  const toneClass =
    tone === 'danger' ? 'bg-danger' : tone === 'warning' ? 'bg-warning text-dark' : tone === 'success' ? 'bg-success' : 'bg-secondary'
  return (
    <div>
      <div className="progress progress-compact" aria-hidden="true">
        <div className={`progress-bar ${toneClass} ${widthClass}`} />
      </div>
      <div className="ra-small text-muted d-flex justify-content-between mt-1">
        <span>{label}</span>
        <span />
      </div>
      {srLabel && <span className="visually-hidden" aria-live="polite">{srLabel}: {pct}%</span>}
    </div>
  )
}

const GradeSummary: React.FC<GradeSummaryProps> = ({ summary }) => {
  const total = summary.total

  // Cobertura: se muestra como barra y porcentaje en filas por RA
  // Calcular nota final a partir de los RAs (ponderación por porcentaje_ra) como fuente primaria
  const computeFromRAs = () => {
    if (!Array.isArray(summary.ras) || summary.ras.length === 0) {
      return { strict: null as number | null, progressive: null as number | null }
    }

    let courseSum = 0
    let courseWeight = 0

    for (const ra of summary.ras) {
      const raWeight = typeof ra.porcentaje_ra === 'number' ? ra.porcentaje_ra : 0

      // Calcular nota del RA a partir de sus actividades si existen
      let raNote: number | null = null

      if (Array.isArray(ra.actividades) && ra.actividades.length > 0) {
        let actSum = 0
        let actWeight = 0

        for (const act of ra.actividades) {
          const aPct =
            typeof act.porcentaje_ra_actividad === 'number'
              ? act.porcentaje_ra_actividad
              : 0

          if (typeof act.nota === 'number') {
            actSum += act.nota * aPct / 100
          }

          actWeight += aPct
        }

        if (actWeight > 0) {
          // Normalizar si suma de porcentajes de actividades no es 100
          raNote = actSum * (100 / actWeight)
        }
      }

      // Si no se pudo calcular desde actividades, usar progressive/strict del RA como fallback
      if (raNote == null) {
        if (typeof ra.progressive === 'number') raNote = ra.progressive
        else if (typeof ra.strict === 'number') raNote = ra.strict
      }

      if (typeof raNote === 'number') {
        courseSum += (raNote * raWeight) / 100
        courseWeight += raWeight
      }
    }

    if (courseWeight === 0) {
      return { strict: null as number | null, progressive: null as number | null }
    }

    // Normalizar si weights no suman 100
    if (courseWeight !== 100) {
      courseSum = courseSum * (100 / courseWeight)
    }

    return {
      strict: Number.isFinite(courseSum) ? courseSum : null,
      progressive: Number.isFinite(courseSum) ? courseSum : null,
    }
  }

  const raTotals = computeFromRAs()

  // Preferir valores calculados desde RAs; si no existen, usar los totales del backend
  const finalStrict =
    raTotals.strict ?? (typeof total.strict === 'number' ? total.strict : null)

  const finalProgressive =
    raTotals.progressive ??
    (typeof total.progressive === 'number' ? total.progressive : null)

  // Normalizar cobertura: puede venir en escala 0..1 o 0..100
  const coveragePct =
    typeof total.coverage === 'number'
      ? (total.coverage <= 1 ? total.coverage * 100 : total.coverage)
      : 0

  const finalNote =
    coveragePct >= 50
      ? (typeof finalProgressive === 'number' ? finalProgressive : null)
      : (typeof finalStrict === 'number' ? finalStrict : null)

  const progPct =
    typeof finalNote === 'number'
      ? Math.round((finalNote / 5) * 100)
      : null

  // Determinar color según nota final:
  // rojo <3, amarillo [3,3.5), verde >=3.5
  const tone =
    typeof finalNote === 'number'
      ? finalNote < 3
        ? 'danger'
        : finalNote < 3.5
          ? 'warning'
          : 'success'
      : 'secondary'

  // DEV debug logs: imprimir cálculos internos para verificar valores en runtime
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('GradeSummary calc:', {
      raTotals,
      finalStrict,
      finalProgressive,
      coveragePct,
      finalNote,
      progPct,
      tone,
    })
  }

  return (
    <>
      <div className="ra-card mb-3">
        <div className="ra-card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-bold">Resumen del curso</div>
            <div className="text-muted">
              {summary.asignatura.codigo} · {summary.asignatura.nombre}
            </div>
          </div>

          {/* Métricas globales: se privilegia la nota progresiva porque refleja avance acumulado */}
          <div className="row g-3">
            <div className="col-12">
              <CompactBar
                pct={progPct}
                label="Tu nota acumulada"
                srLabel="Nota acumulada"
                tone={tone as any}
              />

              <div className="ra-small text-muted mt-1 text-center">
                {typeof finalNote === 'number'
                  ? `${finalNote.toFixed(2)} de 5.0`
                  : 'Sin calificaciones'}
              </div>
            </div>
          </div>

          <div className="table-responsive mt-2">
            <table className="table table-sm align-middle m-0">
              <thead>
                <tr>
                  <th className="col-ra-desc">Resultado de Aprendizaje</th>

                  <th
                    className="text-end col-ra-strict"
                    title="Cantidad total de actividades asociadas al RA"
                  >
                    Actividades
                  </th>

                  <th
                    className="text-end col-ra-prog"
                    title="Nota actual del RA en escala 0-5"
                  >
                    Nota actual
                  </th>

                  <th
                    className="text-end col-ra-cov"
                    title="Cobertura actual del RA"
                  >
                    Cobertura
                  </th>
                </tr>
              </thead>

              <tbody>
                {summary.ras.map(ra => {
                  const nota =
                    typeof ra.progressive === 'number'
                      ? ra.progressive.toFixed(2)
                      : '—'

                  const totalActs = ra.actividades.length

                  const coveragePct =
                    typeof ra.coverage === 'number'
                      ? (ra.coverage <= 1 ? ra.coverage * 100 : ra.coverage)
                      : 0
                  const coverageLabel = `${Math.round(coveragePct)}%`
                  const coverageStep = Math.round(Math.max(0, Math.min(100, coveragePct)) / 10) * 10
                  const coverageWidthClass = `w-pct-${coverageStep}`

                  const aporte =
                    typeof ra.progressive === 'number'
                      ? (
                          ra.progressive *
                          (ra.porcentaje_ra / 100)
                        ).toFixed(2)
                      : '—'

                  return (
                    <tr
                      key={String(ra.id_ra)}
                      className="grade-summary-ra-row"
                    >
                      <td>
                        <div className="grade-summary-ra-card">
                          <div className="grade-summary-ra-pill">
                            RA {ra.numero_ra ?? String(ra.id_ra)}
                          </div>

                          <div className="grade-summary-ra-desc">
                            {ra.descripcion}
                          </div>

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

                      <td
                        className="text-end"
                        aria-label={`Total de actividades del RA: ${totalActs}`}
                      >
                        {totalActs}
                      </td>

                      <td
                        className="text-end"
                        aria-label={`Nota actual del RA: ${nota}, aporte al curso: ${aporte}`}
                      >
                        <div className="fw-semibold">{nota}</div>
                        <div className="ra-small text-muted">
                          Aporta {aporte}
                        </div>
                      </td>

                      <td className="text-end" aria-label={`Cobertura actual del RA: ${coverageLabel}`}>
                        <div className="progress progress-compact">
                          <div
                            className={`progress-bar bg-success ${coverageWidthClass}`}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="ra-small text-muted mt-1">{coverageLabel}</div>
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