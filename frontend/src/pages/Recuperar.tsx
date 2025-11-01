import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '@/services/auth'
import './Recuperar.css'

const Recuperar: React.FC = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await requestPasswordReset(email)
      setSent(true)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'No se pudo enviar el enlace. Inténtalo de nuevo.'
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
      </header>
        <section className="login-box fadeInUp recuperar-box">
        <section className="login-box fadeInUp" style={{ maxWidth: 460 }}>
          <h2 className="h5 mb-3">Recuperar contraseña</h2>
          {!sent ? (
            <form onSubmit={onSubmit} autoComplete="off">
              <input
                className="form-control mb-2"
                type="email"
                placeholder="Correo institucional"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-danger w-100" type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar enlace'}</button>
            </form>
          ) : null}
          {sent && !error && (
            <div className="alert alert-success mt-3" role="status">
              Si el correo existe, recibirás un enlace para restablecer tu contraseña.
            </div>
          )}
          {error && (
            <div className="alert alert-danger mt-3" role="alert">{error}</div>
          )}
          <div className="text-center mt-3">
            <Link to="/login">Volver al login</Link>
          </div>
        </section>
      </section>
    </div>
  )
}

export default Recuperar
