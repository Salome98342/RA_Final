import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import RoleHomeLayout from '@/components/RoleHomeLayout'

const EstudianteHome: React.FC = () => {
  const navigate = useNavigate()
  const { state } = useSession()

  const sidebarItems = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Mis cursos' },
    { key: 'tareas', icon: 'bi-journal-text', title: 'Tareas' },
    { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' },
  ]

  const moduleCards = [
    {
      key: 'cursos',
      icon: 'bi-grid-3x3-gap',
      title: 'Mis cursos',
      desc: 'Consulta el estado de tus asignaturas por periodo y su progreso general.',
    },
    {
      key: 'tareas',
      icon: 'bi-journal-text',
      title: 'Tareas',
      desc: 'Revisa pendientes, fechas de cierre y actividades calificadas.',
    },
    {
      key: 'recursos',
      icon: 'bi-paperclip',
      title: 'Recursos',
      desc: 'Accede a guías, archivos y anuncios que comparten tus docentes.',
    },
  ]

  const open = (key: string) => {
    if (key === 'inicio') navigate('/estudiante/inicio')
    else if (key === 'cursos') navigate('/estudiante?view=cursos')
    else if (key === 'tareas') navigate('/estudiante?view=tareas')
    else if (key === 'recursos') navigate('/estudiante?view=recursos')
  }

  return (
    <RoleHomeLayout
      roleLabel="Estudiante"
      homeTitle="Inicio del Estudiante"
      welcomeName={state.name}
      welcomeFallback="Estudiante"
      welcomeDescription="Este es tu panel principal. Desde el menú lateral puedes entrar a tus cursos, revisar tareas y acceder a los recursos publicados por tus docentes."
      sidebarItems={sidebarItems}
      moduleCards={moduleCards}
      onSidebarClick={open}
    />
  )
}

export default EstudianteHome
