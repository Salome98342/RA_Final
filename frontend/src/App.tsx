import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom' // <- quita BrowserRouter
import Login from '@/pages/Login'
import Estudiante from '@/pages/Estudiante'
import Recuperar from './pages/Recuperar'
import Reset from './pages/Reset'
import DocenteCursos from '@/pages/docente/Cursos'
import DocenteRAs from '@/pages/docente/RAs'
import NuevaActividadCurso from '@/pages/docente/NuevaActividad'
import DocenteCalificar from '@/pages/docente/Calificar'
import DocenteRecursos from '@/pages/docente/Recursos'
import Profile from '@/pages/Profile'
import CoordinadorDashboard from '@/pages/coordinador/Dashboard'
import CoordinadorAsignatura from '@/pages/coordinador/Asignatura'
import CoordinadorImports from '@/pages/coordinador/Imports'
import CoordinadorMaterias from '@/pages/coordinador/Materias'
import { useSession } from '@/state/SessionContext'

const CoordinatorRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { state } = useSession()
  if (state.role !== 'coordinador') return <Navigate to="/login" replace />
  return <>{children}</>
}

const App: React.FC = () => {
  return (
    // Quitar BrowserRouter aquí, ya está en main.tsx
    <>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<Recuperar />} />
  <Route path="/reset" element={<Reset />} />
      <Route path="/docente" element={<DocenteCursos />} />
      <Route path="/docente/:curso/ras" element={<DocenteRAs />} />
  <Route path="/docente/:curso/actividades/nueva" element={<NuevaActividadCurso />} />
        {/* Calificar a nivel de curso (sin seleccionar RA) */}
        <Route path="/docente/:curso/calificar" element={<DocenteCalificar />} />
      <Route path="/docente/:curso/recursos" element={<DocenteRecursos />} />
      <Route path="/estudiante" element={<Estudiante />} />
  <Route path="/perfil" element={<Profile />} />
  {/* Coordinador */}
  <Route path="/coordinador" element={<CoordinatorRoute><CoordinadorDashboard /></CoordinatorRoute>} />
  <Route path="/coordinador/materias" element={<CoordinatorRoute><CoordinadorMaterias /></CoordinatorRoute>} />
  <Route path="/coordinador/asignatura/:codigo" element={<CoordinatorRoute><CoordinadorAsignatura /></CoordinatorRoute>} />
  <Route path="/coordinador/imports" element={<CoordinatorRoute><CoordinadorImports /></CoordinatorRoute>} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  )
}

export default App
