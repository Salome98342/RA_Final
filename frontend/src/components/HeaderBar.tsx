import React, { useEffect } from 'react'
import { useSession } from '@/state/SessionContext'
import { getFullProfile } from '@/services/auth'  // <-- cambiar import
import { useNavigate } from 'react-router-dom'

type Props = { roleLabel: string }
const HeaderBar: React.FC<Props> = ({ roleLabel }) => {
  const { state, setName, setRole, setCode } = useSession()
  const navigate = useNavigate()
  useEffect(() => {
    // If we don't have a name yet (direct navigation after a valid cookie), try to fetch it
    if (!state.name) {
      getFullProfile()
        .then((p) => {
          const u = (p as any).user ?? p
          const last = u?.apellido ?? u?.apellidos ?? ''  // fix
          const fullName = `${u?.nombre ?? ''} ${last}`.trim()
          setName(fullName)
          setRole(u?.rol ?? '')
          setCode(u?.code ?? u?.codigo ?? null)           // admite ambas llaves
        })
        .catch(() => { /* ignore if not logged */ })
    }
  }, [state.name, setName, setRole, setCode])
  const name = state.name ? state.name.replace(/\b\w/g, (c) => c.toUpperCase()) : `Nombre del ${roleLabel}`
  return (
    <header className="dash-header d-flex align-items-center justify-content-between px-3">
      <div className="d-flex align-items-center gap-2">
        <img className="brand-logo" src="/LogoBlanco.png" alt="Universidad del Valle" />
        <span className="brand-title">RA Manager</span>
      </div>
      <div className="d-flex align-items-center gap-2">
        <div className="text-end d-none d-sm-block small">
          <div>{name}</div>
          <div className="text-uppercase fw-semibold">{roleLabel}</div>
        </div>
        <button className="avatar" aria-label="Perfil" onClick={()=>navigate('/perfil')}>
          <i className="bi bi-person" />
        </button>
      </div>
    </header>
  )
}

export default HeaderBar
