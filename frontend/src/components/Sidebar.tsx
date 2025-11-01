import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import { logout } from '@/services/auth'

type Item = { key: string; icon: string; title: string }
type Props = { active?: string; onClick: (key: string) => void; items: Item[] }

const Sidebar: React.FC<Props> = ({ active, onClick, items }) => {
  const navigate = useNavigate()
  const { setName, setRole, setSelectedCurso, setCode } = useSession()
  const handleLogout = async () => {
    try { await logout() } catch { /* ignore logout error */ }
  setName(null); setRole(null); setSelectedCurso(null); setCode(null)
    navigate('/login')
  }
  return (
    <aside className="dash-sidebar" aria-label="Barra lateral">
      {items.map((it) => (
        <button
          key={it.key}
          className={`side-btn ${active === it.key ? 'active' : ''}`}
          aria-label={it.title}
          title={it.title}
          onClick={() => onClick(it.key)}
        >
          <i className={`bi ${it.icon}`} />
        </button>
      ))}
      <button className="side-btn" onClick={handleLogout} title="Salir" aria-label="Salir"><i className="bi bi-box-arrow-right" /></button>
    </aside>
  )
}

export default Sidebar
