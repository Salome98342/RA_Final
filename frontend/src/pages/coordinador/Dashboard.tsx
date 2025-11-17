import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  // Redirigir automáticamente a la vista de Materias (más práctica y visual)
  useEffect(() => {
    navigate('/coordinador/materias', { replace: true })
  }, [navigate])

  return null
}

export default Dashboard
