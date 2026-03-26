import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Alert from '@/utils/alert'

const Reset: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    Alert.info('El sistema de recuperación fue actualizado. Te redirigiremos a la nueva página en unos segundos.')
    // Redirigir a la página de recuperación con el nuevo flujo OTP
    const timer = setTimeout(() => navigate('/recuperar'), 3000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="login-page">
      <header className="login-header d-flex align-items-center justify-content-center gap-2">
        <i className="bi bi-mortarboard-fill fs-3" aria-hidden="true" />
        <h1 className="m-0 h4 text-white">Universidad del Valle</h1>
      </header>
      <main className="login-container d-flex align-items-center justify-content-center">
        <section className="login-box fadeInUp" style={{ maxWidth: 460 }}>
          <h2 className="h5 mb-3">Restablecer contraseña</h2>
          <p className="text-muted mt-3 mb-3">
            Serás redirigido automáticamente a la nueva página de recuperación.
          </p>
          <div className="text-center mt-3">
            <Link to="/recuperar">Ir ahora</Link>
            {' o '}
            <Link to="/login">Volver al login</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Reset