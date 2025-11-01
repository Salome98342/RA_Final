import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resetPassword } from '@/services/auth'
import './Reset.css'

const Reset: React.FC = () => {
  const loc = useLocation()
  const navigate = useNavigate()
  const token = useMemo(() => new URLSearchParams(loc.search).get('token') || '', [loc.search])
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) { setError('Token inválido'); return }
    if (!p1 || p1.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (p1 !== p2) { setError('Las contraseñas no coinciden'); return }
    try {
      setError(null); setLoading(true)
      await resetPassword(token, p1)
      setDone(true)
      // Opcional: redirigir al login tras unos segundos
      window.setTimeout(() => navigate('/login'), 2500)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'No se pudo restablecer la contraseña. Intenta de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <header className="login-header d-flex align-items-center justify-content-center gap-2">
        <i className="bi bi-mortarboard-fill fs-3" aria-hidden="true" />
        <h1 className="m-0 h4 text-white">Universidad del Valle</h1>
      <main className="login-container d-flex align-items-center justify-content-center">
        <section className="login-box fadeInUp max-width-460">
          <h2 className="h5 mb-3">Restablecer contraseña</h2>
          <h2 className="h5 mb-3">Restablecer contraseña</h2>
          {!done ? (
            <form onSubmit={onSubmit} autoComplete="off">
              <input
                className="form-control mb-2"
                type="password"
                placeholder="Nueva contraseña"
                required
                value={p1}
                onChange={(e) => setP1(e.target.value)}
              />
              <input
                className="form-control mb-2"
                type="password"
                placeholder="Confirmar contraseña"
                required
                value={p2}
                onChange={(e) => setP2(e.target.value)}
              />
              <button className="btn btn-danger w-100" type="submit" disabled={loading || !token}>
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          ) : null}
          {done && (
            <div className="alert alert-success mt-3" role="status">
              Tu contraseña fue actualizada. Redirigiendo al login...
            </div>
          )}
          {error && (
            <div className="alert alert-danger mt-3" role="alert">{error}</div>
          )}
          <div className="text-center mt-3">
            <Link to="/login">Volver al login</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Reset