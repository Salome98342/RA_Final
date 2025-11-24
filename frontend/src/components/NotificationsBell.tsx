import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getNotifications, type NotificationItem } from '@/services/api'
import { useNavigate } from 'react-router-dom'

const fmt = (iso?: string) => {
  if (!iso) return ''
  try { const d = new Date(iso); return d.toLocaleString() } catch { return '' }
}

type Props = { intervalMs?: number }

const NotificationsBell: React.FC<Props> = ({ intervalMs = 60000 }) => {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [seen, setSeen] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement | null>(null)

  const unread = useMemo(() => items.filter(it => !it.read && !seen[it.id]).length, [items, seen])

  const load = async () => {
    try { setItems(await getNotifications()) } catch { /* ignore */ }
  }

  useEffect(() => {
    load()
    const id = window.setInterval(load, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  // close on click outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const onToggle = () => {
    setOpen(o => !o)
    if (!open) {
      // mark all as seen locally (UI only)
      const next: Record<string, boolean> = {}
      items.forEach(it => { next[it.id] = true })
      setSeen(s => ({ ...s, ...next }))
    }
  }

  const onItemClick = (it: NotificationItem) => {
    setSeen(s => ({ ...s, [it.id]: true }))
    if (it.link) navigate(it.link)
  }

  return (
    <div className="position-relative" ref={ref}>
      <button 
        className="btn btn-link position-relative text-decoration-none p-2" 
        aria-label="Notificaciones" 
        onClick={onToggle}
        style={{ fontSize: '1.25rem' }}
      >
        <i className="bi bi-bell" style={{ color: unread > 0 ? '#dc3545' : 'inherit' }} />
        {unread > 0 && (
          <span 
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" 
            style={{ fontSize: '0.65rem', padding: '0.25em 0.5em' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div 
          className="dropdown-menu dropdown-menu-end show shadow-lg" 
          style={{ 
            minWidth: 340, 
            maxWidth: 400, 
            right: 0, 
            top: '100%',
            marginTop: '0.5rem',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: '0.5rem'
          }}
        >
          <div className="dropdown-header d-flex justify-content-between align-items-center border-bottom pb-2 mb-0">
            <span className="fw-bold">Notificaciones</span>
            <button 
              className="btn btn-sm btn-light border" 
              onClick={load} 
              title="Actualizar"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
          </div>
          <div className="list-group list-group-flush" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {items.length === 0 && (
              <div className="text-center text-muted p-4">
                <i className="bi bi-bell-slash d-block mb-2" style={{ fontSize: '2rem', opacity: 0.5 }} />
                <div>No tienes notificaciones</div>
              </div>
            )}
            {items.map((it) => {
              const isUnread = !it.read && !seen[it.id]
              const iconClass = it.kind === 'grade' 
                ? 'bi-check2-circle text-success' 
                : it.kind === 'resource' 
                ? 'bi-paperclip text-primary' 
                : it.kind === 'deadline' 
                ? 'bi-hourglass-split text-warning' 
                : 'bi-bell text-secondary'
              
              return (
                <button 
                  key={it.id} 
                  className={`list-group-item list-group-item-action d-flex gap-3 align-items-start py-3 ${isUnread ? 'bg-light' : ''}`}
                  onClick={() => onItemClick(it)}
                  style={{ 
                    borderLeft: isUnread ? '3px solid #dc3545' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className={`bi ${iconClass}`} style={{ fontSize: '1.25rem', marginTop: '0.125rem' }} aria-hidden="true" />
                  <div className="flex-grow-1 text-start">
                    <div className={`${isUnread ? 'fw-semibold' : ''}`} style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                      {it.text}
                    </div>
                    {it.date && (
                      <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-clock me-1" />
                        {fmt(it.date)}
                      </div>
                    )}
                  </div>
                  {isUnread && (
                    <span className="badge bg-danger rounded-circle" style={{ width: '8px', height: '8px', padding: 0, marginTop: '0.5rem' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
