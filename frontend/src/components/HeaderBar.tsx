import React from 'react'
import { useSession } from '@/state/SessionContext'
import { useNavigate } from 'react-router-dom'
import NotificationsBell from './NotificationsBell'
// (logout removido de la barra – se mantiene lógica mínima)

type Props = {
  title?: string
  subtitle?: string
  avatarUrl?: string | null
  // Backward-compat: allow older usages like <HeaderBar roleLabel="Docente" />
  roleLabel?: string
}

// Barra superior visible para cualquier rol autenticado (docente / estudiante / coordinador).
// Se oculta solo si no hay sesión (role === null)
const HeaderBar: React.FC<Props> = ({ title = 'RA Manager', subtitle, avatarUrl, roleLabel }) => {
  const { state } = useSession()
  const navigate = useNavigate()
  const name = state.name ?? ''
  const role = state.role
  if (!role) return null

  // Mostrar etiqueta de rol: si se pasó roleLabel (uso legacy) úsalo, si no el rol real.
  const roleText = (roleLabel || role || 'usuario').toString().toUpperCase()

  return (
    <header className="dash-header px-3" data-role={role}>
      <div className="container-fluid d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <a
            className="brand-icon"
            aria-label="Inicio"
            href="#"
            onClick={(e) => {
              e.preventDefault()
              // Navegación rápida según rol
              if (role === 'coordinador') navigate('/coordinador')
              else if (role === 'docente') navigate('/docente')
              else if (role === 'estudiante') navigate('/estudiante')
            }}
          >
            <img src="/LogoBlanco.png" alt="Logo Universidad del Valle" className="brand-logo" />
          </a>
          <div className="brand-title">
            {title}
            {subtitle ? <span className="ms-2 fw-normal">· {subtitle}</span> : null}
          </div>
        </div>

        <div className="text-end d-flex align-items-center gap-2">
          {/* Notificaciones solo para estudiantes */}
          {role === 'estudiante' && <NotificationsBell intervalMs={30000} />}
          
          <div className="me-2 d-none d-sm-block" aria-label={`Usuario: ${name}`}> 
            <div className="fw-semibold small text-uppercase">{roleText}</div>
            <div className="fw-bold dash-username">{name}</div>
          </div>
          {/* Solo mostrar avatar clickeable para docente y estudiante */}
          {role !== 'coordinador' && (
            <div
              className="avatar"
              role="button"
              tabIndex={0}
              aria-label="Abrir perfil"
              onClick={() => navigate('/perfil')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/perfil') } }}
            >
              {avatarUrl ? <img src={avatarUrl} alt="avatar" className="avatar-img" /> : <i className="bi bi-person" />}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default HeaderBar
