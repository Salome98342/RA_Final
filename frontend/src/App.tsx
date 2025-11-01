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
import Profile from '@/pages/Profile'
import DocenteRecursos from '@/pages/docente/Recursos'

const App: React.FC = () => {
  return (
    // Quitar BrowserRouter aquí, ya está en main.tsx
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<Recuperar />} />
  <Route path="/reset" element={<Reset />} />
      <Route path="/docente" element={<DocenteCursos />} />
      <Route path="/docente/:curso/ras" element={<DocenteRAs />} />
  <Route path="/docente/:curso/actividades/nueva" element={<NuevaActividadCurso />} />
      <Route path="/docente/:curso/ra/:raId/calificar" element={<DocenteCalificar />} />
      <Route path="/docente/:curso/recursos" element={<DocenteRecursos />} />
      <Route path="/estudiante" element={<Estudiante />} />
      <Route path="/perfil" element={<Profile />} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
