import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestPasswordReset, verifyOTP, resetPassword } from '@/services/auth'
import Alert from '@/utils/alert'

const Recuperar: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [showRequirements, setShowRequirements] = useState(false)

  // Validaciones individuales para mostrar en tiempo real
  const requirements = React.useMemo(() => ({
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password),
    passwordsMatch: password === confirmPassword && confirmPassword.length > 0
  }), [password, confirmPassword])

  const onSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await requestPasswordReset(email)
      Alert.toast.success('Código enviado al correo. Revisa tu bandeja de entrada.')
      setStep('otp')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'No se pudo enviar el código. Inténtalo de nuevo.'
      Alert.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await verifyOTP(email, otpCode)
      Alert.toast.success('Código verificado correctamente.')
      setStep('password')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'Código OTP inválido. Inténtalo de nuevo.'
      Alert.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      Alert.toast.warning('Las contraseñas no coinciden')
      return
    }
    
    // Validar fortaleza de contraseña (debe coincidir con backend)
    if (!requirements.minLength) {
      Alert.toast.warning('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!requirements.hasUpperCase) {
      Alert.toast.warning('La contraseña debe contener al menos una mayúscula')
      return
    }
    if (!requirements.hasLowerCase) {
      Alert.toast.warning('La contraseña debe contener al menos una minúscula')
      return
    }
    if (!requirements.hasNumber) {
      Alert.toast.warning('La contraseña debe contener al menos un número')
      return
    }
    if (!requirements.hasSpecial) {
      Alert.toast.warning('La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)')
      return
    }
    
    try {
      setLoading(true)
      await resetPassword(email, otpCode, password)
      Alert.success('Contraseña actualizada correctamente. Serás redirigido al login.')
      // Redirigir al login tras éxito
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'
      Alert.error(msg)
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
                  onFocus={() => setShowRequirements(true)}
                />
                {showRequirements && password.length > 0 && (
                  <div className="mb-3 p-2 border rounded bg-light">
                    <div className="small fw-bold mb-1">Requisitos de contraseña:</div>
                    <div className="d-flex flex-column gap-1 small">
                      <span className={requirements.minLength ? 'text-success' : 'text-danger'}>
                        {requirements.minLength ? '✓' : '✗'} Mínimo 8 caracteres
                      </span>
                      <span className={requirements.hasUpperCase ? 'text-success' : 'text-danger'}>
                        {requirements.hasUpperCase ? '✓' : '✗'} Una mayúscula (A-Z)
                      </span>
                      <span className={requirements.hasLowerCase ? 'text-success' : 'text-danger'}>
                        {requirements.hasLowerCase ? '✓' : '✗'} Una minúscula (a-z)
                      </span>
                      <span className={requirements.hasNumber ? 'text-success' : 'text-danger'}>
                        {requirements.hasNumber ? '✓' : '✗'} Un número (0-9)
                      </span>
                      <span className={requirements.hasSpecial ? 'text-success' : 'text-danger'}>
                        {requirements.hasSpecial ? '✓' : '✗'} Un carácter especial (!@#$%...)
                      </span>
                    </div>
                  </div>
                )}
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
                {confirmPassword.length > 0 && (
                  <small className={requirements.passwordsMatch ? 'text-success d-block mb-2' : 'text-danger d-block mb-2'}>
                    {requirements.passwordsMatch ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                  </small>
                )}
                <button className="btn btn-danger w-100" type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </form>
            </>
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
