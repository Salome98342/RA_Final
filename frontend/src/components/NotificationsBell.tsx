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
      <button className="btn btn-link position-relative" aria-label="Notificaciones" onClick={onToggle}>
        <i className="bi bi-bell" />
        {unread > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unread}</span>}
      </button>
      {open && (
        <div className="dropdown-menu dropdown-menu-end show shadow" style={{ minWidth: 320, maxWidth: 360, right: 0 }}>
          <div className="dropdown-header d-flex justify-content-between align-items-center">
            <span>Notificaciones</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={load} title="Actualizar"><i className="bi bi-arrow-clockwise" /></button>
          </div>
          <div className="list-group list-group-flush" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 && <div className="text-center text-muted small p-3">Sin notificaciones</div>}
            {items.map((it) => (
              <button key={it.id} className={`list-group-item list-group-item-action d-flex gap-2 ${(!it.read && !seen[it.id]) ? 'fw-semibold' : ''}`} onClick={() => onItemClick(it)}>
                <i className={`bi ${it.kind==='grade'?'bi-check2-circle':it.kind==='resource'?'bi-paperclip':it.kind==='deadline'?'bi-hourglass-split':'bi-bell'}`} aria-hidden="true" />
                <div className="text-start">
                  <div className="small">{it.text}</div>
                  {it.date && <div className="ra-small text-muted">{fmt(it.date)}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
