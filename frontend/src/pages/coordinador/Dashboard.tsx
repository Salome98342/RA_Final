import React from 'react'
import { useNavigate } from 'react-router-dom'
import RoleHomeLayout from '@/components/RoleHomeLayout'
import { useSession } from '@/state/SessionContext'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { state } = useSession()

  const sidebarItems = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'desempenio', icon: 'bi-graph-up-arrow', title: 'Desempeño' },
    { key: 'materias', icon: 'bi-journals', title: 'Materias' },
    { key: 'docentes', icon: 'bi-person-badge', title: 'Docentes' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'matriculados', icon: 'bi-clipboard-check', title: 'Matriculados' },
    { key: 'asignaturas-ra', icon: 'bi-journal-bookmark', title: 'Asignaturas + RA' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  const moduleCards = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio', desc: 'Volver a la página principal del módulo.' },
    { key: 'desempenio', icon: 'bi-graph-up-arrow', title: 'Desempeño', desc: 'Analizar estudiantes con bajo desempeño y asignaturas críticas.' },
    { key: 'materias', icon: 'bi-journals', title: 'Materias', desc: 'Consultar materias, avance por RA e indicadores.' },
    { key: 'docentes', icon: 'bi-person-badge', title: 'Docentes', desc: 'Crear y administrar el personal docente.' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes', desc: 'Registrar y revisar estudiantes del programa.' },
    { key: 'matriculados', icon: 'bi-clipboard-check', title: 'Matriculados', desc: 'Matricular estudiantes por asignatura y periodo.' },
    { key: 'asignaturas-ra', icon: 'bi-journal-bookmark', title: 'Asignaturas + RA', desc: 'Gestionar asignaturas, RAs e indicadores de logro.' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports', desc: 'Importar datos masivos con plantillas oficiales.' },
  ].map((item) => ({ ...item, iconClassName: 'text-danger' }))

  const goTo = (key: string) => {
    if (key === 'inicio') {
      navigate('/coordinador')
      return
    }
    navigate(`/coordinador/${key}`)
  }

  return (
    <RoleHomeLayout
      roleLabel="Coordinador"
      homeTitle="Inicio del Coordinador"
      welcomeName={state.name}
      welcomeFallback="Coordinador"
      welcomeDescription="Desde este módulo puedes administrar la operación académica: materias, docentes, estudiantes, matrícula, estructura de RAs e importaciones masivas."
      sidebarItems={sidebarItems}
      moduleCards={moduleCards}
      onSidebarClick={goTo}
    />
  )
}

export default Dashboard
