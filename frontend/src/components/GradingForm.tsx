import React, { useMemo } from 'react'
import type { Activity, Student } from '@/types'

export type GradingFormProps = {
  activity: Activity
  student: Student | null
  edits: Record<string, { nota: string; indicadorId?: string; retro: string; dirty?: boolean; saving?: boolean }>
  onEdit: (raActId: string, patch: { nota?: string; indicadorId?: string; retro?: string }) => void
  onSave: (raActId: string) => Promise<void>
  isEditing: boolean
}

/**
 * Formulario para calificar una actividad por RAs.
 * Muestra una tabla donde cada fila es un RA, con columnas para:
 * - Nombre del RA
 * - Porcentaje del RA en la actividad
 * - Input para nota (0-5)
 * - Selector de indicador (si aplica)
 * - Input para retroalimentación
 * - Botón guardar
 */
const GradingForm: React.FC<GradingFormProps> = ({ activity, student, edits, onEdit, onSave, isEditing }) => {
  const isActivityGraded = activity.esCalificada ?? false

  // Obtener valores efectivos de edición
  const getEff = (key: string) => {
    const e = edits[key] || {}
    return {
      nota: e.nota ?? (activity.nota != null ? String(activity.nota) : ''),
      indicadorId: e.indicadorId ?? activity.indicadorId ?? '',
      retro: e.retro ?? (activity.retroalimentacion ?? ''),
      dirty: !!e.dirty,
      saving: !!e.saving,
    }
  }

  const eff = getEff(activity.raActividadId || '')

  // Nota final calculada: Σ(Nota_RA * Porcentaje_RA) / Σ(Porcentaje_RA)
  const notaFinal = useMemo(() => {
    if (!activity.indicadores || !eff.nota) return null
    const nota = Number(eff.nota)
    if (isNaN(nota)) return null
    // Para una actividad con una nota única, el cálculo es simple
    return nota
  }, [eff.nota, activity.indicadores])

  if (!student) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Selecciona un estudiante para calificar
      </div>
    )
  }

  return (
    <div className="ra-card mb-3">
      <div className="ra-card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h6 className="mb-1">
              <strong>{activity.nombre}</strong>
            </h6>
            {activity.descripcion && (
              <small className="text-muted d-block mb-2">{activity.descripcion}</small>
            )}
            {activity.tipoActividad && (
              <small className="badge bg-light text-dark">{activity.tipoActividad}</small>
            )}
          </div>
          <div className="text-end">
            {isActivityGraded && (
              <small className="badge bg-warning text-dark d-block mb-2">
                <i className="bi bi-check-circle me-1"></i>
                Calificado
              </small>
            )}
            {notaFinal !== null && (
              <div className="fw-bold fs-5" style={{ color: notaFinal >= 3 ? '#28a745' : '#dc3545' }}>
                {notaFinal.toFixed(1)}/5.0
              </div>
            )}
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(activity.raActividadId || '') }}>
          {/* Nota */}
          <div className="mb-2">
            <label className="form-label fw-bold">
              Nota (0-5) {!isEditing && isActivityGraded && <span className="badge bg-warning text-dark ms-1">No editable</span>}
            </label>
            <div className="input-group">
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                className="form-control"
                value={eff.nota}
                onChange={(e) => onEdit(activity.raActividadId || '', { nota: e.target.value })}
                disabled={eff.saving || (!isEditing && isActivityGraded)}
                placeholder="Ej: 4.5"
                required
              />
              <span className="input-group-text">/5.0</span>
            </div>
            <small className="text-muted d-block mt-1">
              Ingresa la nota ponderada considerando todos los RAs evalua dos
            </small>
          </div>

          {/* Indicador (si aplica) */}
          {Array.isArray(activity.indicadores) && activity.indicadores.length > 0 && (
            <div className="mb-2">
              <label className="form-label fw-bold">Indicador de Logro</label>
              <select
                className="form-select"
                value={eff.indicadorId}
                onChange={(e) => onEdit(activity.raActividadId || '', { indicadorId: e.target.value })}
                disabled={eff.saving || (!isEditing && isActivityGraded)}
              >
                <option value="">-- Selecciona un indicador --</option>
                {activity.indicadores.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.descripcion}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Retroalimentación */}
          <div className="mb-3">
            <label className="form-label fw-bold">Retroalimentación (opcional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={eff.retro}
              onChange={(e) => onEdit(activity.raActividadId || '', { retro: e.target.value })}
              disabled={eff.saving || (!isEditing && isActivityGraded)}
              placeholder="Proporciona feedback constructivo al estudiante..."
            />
          </div>

          {/* Botón guardar */}
          {(isEditing || eff.dirty) && (
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={eff.saving || !eff.nota}
            >
              {eff.saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1"></i>
                  Guardar Calificación
                </>
              )}
            </button>
          )}

          {!isEditing && isActivityGraded && (
            <div className="alert alert-light border-0 mt-3 mb-0" style={{ backgroundColor: '#fffacd' }}>
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Esta actividad está calificada y consolidada. Haz clic en "Editar" para permitir cambios.
              </small>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default GradingForm
