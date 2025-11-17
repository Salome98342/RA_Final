import React, { useMemo, useState } from 'react'
import type { Activity, Indicator } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'

// Lightweight modal to display indicator and activity details and offer edit/delete hooks
// Parent provides onSave and onDelete; this component only collects inputs and confirmations

type Props = {
  open: boolean
  activity: Activity | null
  indicator?: Indicator | null
  availableIndicators?: Indicator[]
  onClose: () => void
  onSave?: (patch: Partial<{
    nombre_actividad: string
    descripcion: string | null
    porcentaje_ra_actividad: number
    fecha_cierre: string | null
    indicadores: string[]
  }>) => Promise<void> | void
  onDelete?: (password: string) => Promise<void> | void
  onDeleteIndicator?: (password: string) => Promise<void> | void
}

const ActivityDetailsModal: React.FC<Props> = ({ open, activity, indicator, availableIndicators, onClose, onSave, onDelete, onDeleteIndicator }) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [form, setForm] = useState<{ nombre?: string; desc?: string; pctRA?: string; fecha?: string | null}>({})
  const [indSel, setIndSel] = useState<string | null>(indicator?.id ?? null)

  const reset = () => { setEditing(false); setErr(null); setConfirmOpen(false) }

  const title = useMemo(() => activity ? (activity.nombre ?? 'Actividad') : 'Indicador de logro', [activity])

  if (!open) return null

  const trySave = async () => {
    if (!onSave) return
    setSaving(true); setErr(null)
    try {
      await onSave({
        nombre_actividad: form.nombre?.trim() ?? activity?.nombre ?? '',
        descripcion: (form.desc ?? activity?.descripcion ?? '') || null,
        porcentaje_ra_actividad: form.pctRA != null ? Number(form.pctRA) : (activity?.porcentajeRA ?? 0),
        fecha_cierre: form.fecha !== undefined ? (form.fecha || null) : (activity?.fechaCierre ?? null),
      })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async (password?: string) => {
    setSaving(true); setErr(null)
    try {
      if (activity && onDelete) {
        await onDelete(password || '')
      } else if (!activity && onDeleteIndicator) {
        await onDeleteIndicator(password || '')
      }
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo eliminar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Detalles de actividad e indicador">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => { reset(); onClose() }} />
          </div>
          <div className="modal-body">
            {err && <div className="alert alert-danger">{err}</div>}

            <div className="mb-3">
              <div className="fw-bold">Indicador de logro</div>
              {availableIndicators && availableIndicators.length > 0 ? (
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select w-240px"
                    value={indSel ?? ''}
                    onChange={(e)=> setIndSel(e.target.value || null)}
                    title="Selecciona un indicador de logro"
                    aria-label="Selecciona un indicador de logro"
                  >
                    {availableIndicators.map(ind => (
                      <option key={ind.id} value={ind.id}>{ind.descripcion}</option>
                    ))}
                  </select>
                  <div className="text-muted">
                    {(availableIndicators.find(i => i.id === (indSel ?? ''))?.descripcion) || indicator?.descripcion || '—'}
                  </div>
                </div>
              ) : (
                <div className="text-muted">{indicator?.descripcion ?? '—'}</div>
              )}
            </div>

            {activity && (
              <div className="mb-3">
                <div className="fw-bold">Descripción de la actividad</div>
                {!editing ? (
                  <div className="text-muted">{activity?.descripcion || '—'}</div>
                ) : (
                  <textarea
                    className="form-control"
                    defaultValue={activity?.descripcion ?? ''}
                    onChange={(e)=> setForm(f=>({...f, desc: e.target.value}))}
                    placeholder="Describe la actividad"
                    title="Descripción de la actividad"
                    aria-label="Descripción de la actividad"
                  />
                )}
              </div>
            )}

            {activity && (
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-control"
                    defaultValue={activity?.nombre ?? ''}
                    disabled={!editing}
                    onChange={(e)=> setForm(f=>({...f, nombre: e.target.value}))}
                    placeholder="Nombre de la actividad"
                    title="Nombre de la actividad"
                    aria-label="Nombre de la actividad"
                  />
                </div>
                {/* Aporte al RA input kept only while editing (hide when viewing) */}
                {editing && (
                  <div className="col-md-3">
                    <label className="form-label">Aporte al RA (%)</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      defaultValue={activity?.porcentajeRA ?? 0}
                      onChange={(e)=> setForm(f=>({...f, pctRA: e.target.value}))}
                      placeholder="0-100"
                      title="Aporte al RA (0–100)"
                      aria-label="Aporte al RA en porcentaje"
                    />
                  </div>
                )}
                <div className="col-md-4">
                  <label className="form-label">Fecha límite</label>
                  <input
                    className="form-control"
                    type="date"
                    defaultValue={activity?.fechaCierre ?? ''}
                    disabled={!editing}
                    onChange={(e)=> setForm(f=>({...f, fecha: e.target.value}))}
                    title="Fecha límite de entrega"
                    aria-label="Fecha límite de entrega"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer d-flex justify-content-between">
            <div className="d-flex align-items-center gap-3">
              {(activity ? !!onDelete : !!onDeleteIndicator) && (
                <button className="btn btn-outline-danger" disabled={saving} onClick={() => setConfirmOpen(true)}>
                  Eliminar
                </button>
              )}
            </div>
            {activity && (
              <div className="d-flex gap-2">
                {!editing ? (
                  <button className="btn btn-secondary" onClick={()=> setEditing(true)}>Editar</button>
                ) : (
                  <>
                    <button className="btn btn-outline-secondary" onClick={()=> { setEditing(false); setForm({}) }}>Cancelar</button>
                    <button className="btn btn-primary" disabled={saving || !onSave} onClick={trySave}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
                  </>
                )}
              </div>
            )}
          </div>
          <ConfirmDialog
            open={confirmOpen}
            title={`Confirmar eliminación de ${activity ? 'actividad' : 'indicador'}`}
            message={`Esta acción no se puede deshacer. ¿Deseas eliminar permanentemente este ${activity ? 'registro de actividad para el RA' : 'indicador de logro'}?`}
            requirePassword
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            onConfirm={(pwd) => handleConfirmDelete(pwd)}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}

export default ActivityDetailsModal
