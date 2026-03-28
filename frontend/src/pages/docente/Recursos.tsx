import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { getAnunciosByCourse, createAnuncio, deleteAnuncio, type Anuncio } from '@/services/api'
import { useSession } from '@/state/SessionContext'
import { Alert } from '@/utils/alert'
import { api } from '@/connections/http'

import AnunciosCard from './recursos/AnunciosCard'
import DocumentosCard from './recursos/DocumentosCard'
import AgregarEstudianteCard from './recursos/AgregarEstudianteCard'
import ImportEstudiantesCard from './recursos/ImportEstudiantesCard'
import EstudiantesMatriculadosCard from './recursos/EstudiantesMatriculadosCard'

type Tab = 'documentos' | 'estudiantes' | 'anuncios'

const TABS: { key: Tab; icon: string; label: string; docenteOnly?: boolean }[] = [
  { key: 'documentos', icon: 'bi-folder-fill', label: 'Documentos' },
  { key: 'estudiantes', icon: 'bi-people-fill', label: 'Estudiantes', docenteOnly: true },
  { key: 'anuncios', icon: 'bi-megaphone-fill', label: 'Anuncios', docenteOnly: true },
]

const DocenteRecursos: React.FC = () => {
  const { curso } = useParams<{ curso: string }>()
  const navigate = useNavigate()
  const { state } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('documentos')

  // --- Estudiantes ---
  const [estudiantes, setEstudiantes] = useState<Array<{ codigo: string; nombre: string; apellido: string }>>([])
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false)

  const loadEstudiantes = useCallback(async () => {
    if (!curso || state.role !== 'docente') return
    setLoadingEstudiantes(true)
    try {
      const res = await api.get(`/asignaturas/${curso}/estudiantes`)
      const data = res.data || []
      setEstudiantes(data.map((e: { codigo_estudiante: string; primer_nombre: string; primer_apellido: string }) => ({
        codigo: e.codigo_estudiante,
        nombre: e.primer_nombre,
        apellido: e.primer_apellido
      })))
    } catch {
      setEstudiantes([])
    } finally {
      setLoadingEstudiantes(false)
    }
  }, [curso, state.role])

  // --- Anuncios ---
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loadingAnuncios, setLoadingAnuncios] = useState(false)
  const [nuevoAnuncio, setNuevoAnuncio] = useState({ titulo: '', contenido: '', es_importante: false })
  const [creandoAnuncio, setCreandoAnuncio] = useState(false)

  const loadAnuncios = useCallback(async () => {
    if (!curso) return
    setLoadingAnuncios(true)
    try {
      const data = await getAnunciosByCourse(curso)
      setAnuncios(data)
    } catch {
      setAnuncios([])
    } finally {
      setLoadingAnuncios(false)
    }
  }, [curso])

  const handleCreateAnuncio = async () => {
    if (!curso || !nuevoAnuncio.titulo.trim() || !nuevoAnuncio.contenido.trim()) {
      Alert.warning('Por favor completa el título y contenido del anuncio')
      return
    }

    const confirmedCreate = await Alert.confirmCreate('anuncio')
    if (!confirmedCreate) return

    setCreandoAnuncio(true)
    try {
      await createAnuncio(curso, nuevoAnuncio)
      setNuevoAnuncio({ titulo: '', contenido: '', es_importante: false })
      await loadAnuncios()
      Alert.success('Anuncio publicado correctamente')
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data
      Alert.error(data?.detail || 'No se pudo publicar el anuncio')
    } finally {
      setCreandoAnuncio(false)
    }
  }

  const handleDeleteAnuncio = async (id: number) => {
    const confirmed = await Alert.confirmDelete('anuncio')
    if (!confirmed) return
    try {
      await deleteAnuncio(id)
      await loadAnuncios()
      Alert.success('Anuncio eliminado')
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data
      Alert.error(data?.detail || 'No se pudo eliminar el anuncio')
    }
  }

  useEffect(() => {
    loadEstudiantes()
    loadAnuncios()
  }, [loadEstudiantes, loadAnuncios])

  const visibleTabs = TABS.filter(t => !t.docenteOnly || state.role === 'docente')

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar
          active="recursos"
          onClick={(k) => {
            if (k === 'inicio') navigate('/docente/inicio')
            if (k === 'cursos') navigate('/docente/cursos')
            if (k === 'crear' && curso) navigate(`/docente/${curso}/actividades/nueva`)
            if (k === 'calificar' && curso) navigate(`/docente/${curso}/calificar`)
            if (k === 'recursos' && curso) navigate(`/docente/${curso}/recursos`)
          }}
          items={[
            { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
            { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
            { key: 'crear', icon: 'bi-pencil-square', title: 'RA/Actividades' },
            { key: 'calificar', icon: 'bi-check2-square', title: 'Calificar' },
            { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' },
          ]}
        />
        <main className="dash-content">
          <ModuleBreadcrumbs
            items={[
              { label: 'Inicio Docente', to: '/docente/inicio' },
              { label: 'Cursos', to: '/docente/cursos' },
              { label: 'Recursos' },
            ]}
            onNavigate={navigate}
          />
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="content-title">Recursos · {curso}</div>
            {state.role === 'coordinador' && (
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate('/coordinador/materias')}
                title="Volver a la vista del coordinador"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Regresar a Coordinador
              </button>
            )}
          </div>

          {/* Tabs de navegación */}
          <ul className="nav nav-pills mb-4 gap-2 flex-wrap">
            {visibleTabs.map(t => (
              <li className="nav-item" key={t.key}>
                <button
                  className={`nav-link d-flex align-items-center gap-2 ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                  type="button"
                >
                  <i className={`bi ${t.icon}`}></i>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Contenido según tab activa */}
          {activeTab === 'documentos' && (
            <DocumentosCard curso={curso || ''} />
          )}

          {activeTab === 'estudiantes' && state.role === 'docente' && (
            <>
              <AgregarEstudianteCard
                curso={curso || ''}
                onSuccess={async () => { await loadEstudiantes() }}
              />
              <ImportEstudiantesCard
                curso={curso || ''}
                onSuccess={async () => {
                  Alert.toast.success('Estudiantes importados correctamente')
                  await loadEstudiantes()
                }}
                onError={(msg) => { Alert.toast.error(msg) }}
              />
              <EstudiantesMatriculadosCard
                curso={curso || ''}
                estudiantes={estudiantes}
                loading={loadingEstudiantes}
              />
            </>
          )}

          {activeTab === 'anuncios' && state.role === 'docente' && (
            <AnunciosCard
              anuncios={anuncios}
              loading={loadingAnuncios}
              nuevoAnuncio={nuevoAnuncio}
              onNuevoAnuncioChange={(field, value) => setNuevoAnuncio(prev => ({ ...prev, [field]: value }))}
              onCrear={handleCreateAnuncio}
              onEliminar={handleDeleteAnuncio}
              creando={creandoAnuncio}
            />
          )}

          <button className="btn btn-outline-danger shadow-sm mt-4" onClick={() => navigate(`/docente/${curso}/ras`)}>
            <i className="bi bi-arrow-left me-2"></i>
            Volver a RAs
          </button>
        </main>
      </div>
    </div>
  )
}

export default DocenteRecursos
