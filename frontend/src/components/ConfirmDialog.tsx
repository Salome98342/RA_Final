import React, { useState } from 'react'

type Props = {
  open: boolean
  title?: string
  message?: string
  requirePassword?: boolean
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (password?: string) => void | Promise<void>
  onCancel: () => void
}

const ConfirmDialog: React.FC<Props> = ({ open, title = 'Confirmar', message = '¿Estás seguro?', requirePassword = true, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', onConfirm, onCancel }) => {
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!open) return null

  const handleConfirm = async () => {
    try {
      setBusy(true)
      setErr(null)
      await onConfirm(requirePassword ? pwd : undefined)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Operación fallida')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal d-block" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCancel} />
          </div>
          <div className="modal-body">
            <p>{message}</p>
            {requirePassword && (
              <input
                className="form-control"
                type="password"
                placeholder="Contraseña del docente"
                aria-label="Contraseña del docente"
                value={pwd}
                onChange={(e)=> setPwd(e.target.value)}
              />
            )}
            {err && <div className="alert alert-danger mt-2">{err}</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
            <button className="btn btn-danger" onClick={handleConfirm} disabled={busy || (requirePassword && !pwd)}>{busy ? 'Procesando…' : confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
