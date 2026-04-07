import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import RoleHomeLayout from '@/components/RoleHomeLayout'

const DocenteHome: React.FC = () => {
  const navigate = useNavigate()
  const { state } = useSession()

  const sidebarItems = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
    { key: 'crear', icon: 'bi-pencil-square', title: 'RA/Actividades' },
    { key: 'calificar', icon: 'bi-check2-square', title: 'Calificar' },
    { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' },
    ...(state.role === 'coordinador' ? [{ key: 'volver-coordinador', icon: 'bi-arrow-left-circle', title: 'Vista coordinador' }] : []),
  ]

  const moduleCards = [
    {
      key: 'cursos',
      icon: 'bi-grid-3x3-gap',
      title: 'Cursos',
      desc: 'Consulta tus cursos actuales y anteriores, y entra al detalle de cada uno.',
    },
    {
      key: 'crear',
      icon: 'bi-pencil-square',
      title: 'RA/Actividades',
      desc: 'Crea actividades por RA, asigna indicadores y define fechas de entrega.',
    },
    {
      key: 'calificar',
      icon: 'bi-check2-square',
      title: 'Calificar',
      desc: 'Registra notas y retroalimentación por actividad e indicador.',
    },
    {
      key: 'recursos',
      icon: 'bi-paperclip',
      title: 'Recursos',
      desc: 'Publica guías, documentos y anuncios para tus estudiantes.',
    },
  ]

  const open = (key: string) => {
    if (key === 'inicio') navigate('/docente/inicio')
    else if (key === 'cursos') navigate('/docente/cursos')
    else if (key === 'crear') navigate('/docente/cursos')
    else if (key === 'calificar') navigate('/docente/cursos')
    else if (key === 'recursos') navigate('/docente/cursos')
    else if (key === 'volver-coordinador') navigate('/coordinador/asignaturas')
  }

  return (
    <RoleHomeLayout
      roleLabel="Docente"
      homeTitle="Inicio del Docente"
      welcomeName={state.name}
      welcomeFallback="Docente"
      welcomeDescription="Este es tu panel principal. Desde el menú lateral puedes acceder rápidamente a tus cursos, la gestión de actividades, calificaciones y recursos compartidos."
      sidebarItems={sidebarItems}
      moduleCards={moduleCards}
      onSidebarClick={open}
    />
  )
}

export default DocenteHome
