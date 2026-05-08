import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from '@/pages/Login'
import Estudiante from '@/pages/Estudiante'
import Recuperar from './pages/Recuperar'
import Reset from './pages/Reset'
import DocenteHome from '@/pages/docente/Home'
import DocenteCursos from '@/pages/docente/Cursos'
import DocenteRAs from '@/pages/docente/RAs'
import DocenteIndicadoresDeLogro from '@/pages/docente/IndicadoresDeLogro'
import NuevaActividadCurso from '@/pages/docente/NuevaActividad'
import DocenteCalificar from '@/pages/docente/Calificar'
import DocenteRecursos from '@/pages/docente/Recursos'
import Profile from '@/pages/Profile'
import CoordinadorDashboard from '@/pages/coordinador/Dashboard'
import CoordinadorAsignatura from '@/pages/coordinador/Asignatura'
import CoordinadorImports from '@/pages/coordinador/Imports'
import CoordinadorAsignaturas from '@/pages/coordinador/Asignaturas'
import CoordinadorEstudiantes from '@/pages/coordinador/Estudiantes'
import CoordinadorDocentes from '@/pages/coordinador/Docentes'
import CoordinadorMatriculados from '@/pages/coordinador/Matriculados'
import CoordinadorAsignaturasRA from '@/pages/coordinador/AsignaturasRA'
import CoordinadorAsignaturaAnalisis from '@/pages/coordinador/AsignaturaAnalisis'
import CoordinadorDesempenio from '@/pages/coordinador/DesempenioEstudiantes'
import EstudianteMateriaDetalle from '@/pages/estudiante/MateriaDetalle'
import EstudianteHome from '@/pages/estudiante/Home'
import { useSession } from '@/state/SessionContext'
import { getAuthToken } from '@/connections/http'
import ContextualHelp from '@/components/help/ContextualHelp'

// ==================== RUTAS PROTEGIDAS ====================

/**
 * Componente para rutas que requieren autenticación y rol específico
 */
const ProtectedRoute: React.FC<React.PropsWithChildren<{ allowedRoles: Array<'docente' | 'estudiante' | 'coordinador'> }>> = ({ children, allowedRoles }) => {
  const { state } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Verificar si hay token
    const token = getAuthToken()
    if (!token) {
      console.warn('No hay token de autenticación, redirigiendo a login')
      navigate('/login', { replace: true, state: { from: location.pathname } })
      return
    }

    // Verificar si el rol actual está permitido
    if (state.role && !allowedRoles.includes(state.role)) {
      console.warn(`Rol "${state.role}" no autorizado para acceder a esta ruta. Roles permitidos: ${allowedRoles.join(', ')}`)
      // Redirigir al dashboard correcto según el rol
      const redirectPath = state.role === 'docente' ? '/docente/inicio' : state.role === 'coordinador' ? '/coordinador' : '/estudiante/inicio'
      navigate(redirectPath, { replace: true })
    }
  }, [state.role, allowedRoles, navigate, location.pathname])

  // Si no hay rol, mostrar loading o redirigir
  if (!state.role) {
    return <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="spinner-border text-danger" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
    </div>
  }

  // Si el rol no está autorizado, no renderizar nada (el useEffect ya redirigió)
  if (!allowedRoles.includes(state.role)) {
    return null
  }

  return <>{children}</>
}

/**
 * Ruta específica para coordinador (backward compatibility)
 */
const CoordinatorRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <ProtectedRoute allowedRoles={['coordinador']}>{children}</ProtectedRoute>
}

const App: React.FC = () => {
  return (
    // Quitar BrowserRouter aquí, ya está en main.tsx
    <>
    <ContextualHelp />
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<Recuperar />} />
  <Route path="/reset" element={<Reset />} />
      {/* Rutas de Docente - Protegidas */}
      <Route path="/docente" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><Navigate to="/docente/inicio" replace /></ProtectedRoute>} />
      <Route path="/docente/inicio" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><DocenteHome /></ProtectedRoute>} />
      <Route path="/docente/cursos" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><DocenteCursos /></ProtectedRoute>} />
      <Route path="/docente/:curso/ras" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><DocenteRAs /></ProtectedRoute>} />
      <Route path="/docente/:curso/indicadores" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><DocenteIndicadoresDeLogro /></ProtectedRoute>} />
      <Route path="/docente/:curso/actividades/nueva" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><NuevaActividadCurso /></ProtectedRoute>} />
      <Route path="/docente/:curso/calificar" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><DocenteCalificar /></ProtectedRoute>} />
      <Route path="/docente/:curso/recursos" element={<ProtectedRoute allowedRoles={['docente', 'coordinador']}><DocenteRecursos /></ProtectedRoute>} />
      
      {/* Ruta de Estudiante - Protegida y basada en token (no en ID) */}
      <Route path="/estudiante/inicio" element={<ProtectedRoute allowedRoles={['estudiante']}><EstudianteHome /></ProtectedRoute>} />
      <Route path="/estudiante" element={<ProtectedRoute allowedRoles={['estudiante']}><Estudiante /></ProtectedRoute>} />
      <Route path="/estudiante/asignaturas/:codigo/detalle" element={<ProtectedRoute allowedRoles={['estudiante']}><EstudianteMateriaDetalle /></ProtectedRoute>} />
      
      {/* Perfil - Accesible para todos los roles autenticados */}
      <Route path="/perfil" element={<ProtectedRoute allowedRoles={['docente', 'estudiante', 'coordinador']}><Profile /></ProtectedRoute>} />
  {/* Coordinador */}
  <Route path="/coordinador" element={<CoordinatorRoute><CoordinadorDashboard /></CoordinatorRoute>} />
  <Route path="/coordinador/desempenio" element={<CoordinatorRoute><CoordinadorDesempenio /></CoordinatorRoute>} />
  <Route path="/coordinador/asignaturas" element={<CoordinatorRoute><CoordinadorAsignaturas /></CoordinatorRoute>} />
  <Route path="/coordinador/asignaturas/:codigo/analitica" element={<CoordinatorRoute><CoordinadorAsignaturaAnalisis /></CoordinatorRoute>} />
  <Route path="/coordinador/docentes" element={<CoordinatorRoute><CoordinadorDocentes /></CoordinatorRoute>} />
  <Route path="/coordinador/estudiantes" element={<CoordinatorRoute><CoordinadorEstudiantes /></CoordinatorRoute>} />
  <Route path="/coordinador/matriculados" element={<CoordinatorRoute><CoordinadorMatriculados /></CoordinatorRoute>} />
  <Route path="/coordinador/asignaturas-ra" element={<CoordinatorRoute><CoordinadorAsignaturasRA /></CoordinatorRoute>} />
  <Route path="/coordinador/asignatura/:codigo" element={<CoordinatorRoute><CoordinadorAsignatura /></CoordinatorRoute>} />
  <Route path="/coordinador/imports" element={<CoordinatorRoute><CoordinadorImports /></CoordinatorRoute>} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  )
}

export default App
