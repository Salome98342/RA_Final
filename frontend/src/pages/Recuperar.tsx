import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestPasswordReset, verifyOTP, resetPassword } from '@/services/auth'

const Recuperar: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await requestPasswordReset(email)
      setStep('otp')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'No se pudo enviar el código. Inténtalo de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await verifyOTP(email, otpCode)
      setStep('password')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'Código OTP inválido. Inténtalo de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    try {
      setLoading(true)
      setError(null)
      await resetPassword(email, otpCode, password)
      // Redirigir al login tras éxito
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'
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
      <main className="login-container d-flex align-items-center justify-content-center">
        <section className="login-box fadeInUp" style={{ maxWidth: 460 }}>
          <h2 className="h5 mb-3">Recuperar contraseña</h2>
          
          {step === 'email' && (
            <form onSubmit={onSubmitEmail} autoComplete="off">
              <label htmlFor="rec-email" className="visually-hidden">Correo institucional</label>
              <input
                id="rec-email"
                className="form-control mb-2"
                type="email"
                placeholder="Correo institucional"
                aria-label="Correo institucional"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-danger w-100" type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <>
              <div className="alert alert-info mb-3" role="status">
                Hemos enviado un código de 6 dígitos a tu correo. Ingrésalo a continuación.
              </div>
              <form onSubmit={onSubmitOTP} autoComplete="off">
                <label htmlFor="otp-code" className="visually-hidden">Código OTP</label>
                <input
                  id="otp-code"
                  className="form-control mb-2"
                  type="text"
                  placeholder="Código de 6 dígitos"
                  aria-label="Código OTP"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
                <button className="btn btn-danger w-100" type="submit" disabled={loading}>
                  {loading ? 'Verificando...' : 'Verificar código'}
                </button>
              </form>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="alert alert-success mb-3" role="status">
                Código verificado. Ahora ingresa tu nueva contraseña.
              </div>
              <form onSubmit={onSubmitPassword} autoComplete="off">
                <label htmlFor="new-password" className="visually-hidden">Nueva contraseña</label>
                <input
                  id="new-password"
                  className="form-control mb-2"
                  type="password"
                  placeholder="Nueva contraseña"
                  aria-label="Nueva contraseña"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <label htmlFor="confirm-password" className="visually-hidden">Confirmar contraseña</label>
                <input
                  id="confirm-password"
                  className="form-control mb-2"
                  type="password"
                  placeholder="Confirmar contraseña"
                  aria-label="Confirmar contraseña"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button className="btn btn-danger w-100" type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </form>
            </>
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

export default Recuperar
