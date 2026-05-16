import React from 'react'

type ActivityStatusBadgeProps = {
  estado: 'pendiente' | 'calificado'
  className?: string
}

const ActivityStatusBadge: React.FC<ActivityStatusBadgeProps> = ({ estado, className = '' }) => {
  if (estado === 'calificado') {
    return (
      <span className={`badge bg-success ${className}`} title="Actividad completamente calificada">
        <i className="bi bi-check-circle-fill me-1"></i>
        Calificado
      </span>
    )
  }

  return (
    <span className={`badge bg-secondary ${className}`} title="Actividad pendiente de calificar">
      <i className="bi bi-hourglass-split me-1"></i>
      Pendiente
    </span>
  )
}

export default ActivityStatusBadge
