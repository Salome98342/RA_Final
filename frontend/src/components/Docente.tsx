/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import {
  getCourses,
  getRAsByCourse,
  createActivityForRA,
} from '@/services/api'
import type { Course, RA } from '@/types'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import './Docente.css'

type View = 'cursos' | 'ra' | 'estudiantes'

const Docente: React.FC = () => {
  const [view, setView] = useState<View>('cursos')
  const [filter, setFilter] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [ras, setRas] = useState<RA[]>([])
  const [selectedRA, setSelectedRA] = useState<RA | null>(null)
  const [newAct, setNewAct] = useState({ nombre: '', tipo: '1', pctRA: '' })
  const [newActError, setNewActError] = useState<string | null>(null)
  const [savingNewAct, setSavingNewAct] = useState(false)
  // Estado de validaciones movido a la vista dedicada
  const { state, setSelectedCurso } = useSession()
  const [params, setParams] = useSearchParams()

  const selectedCurso = useMemo(() => params.get('curso') || state.selectedCurso, [params, state.selectedCurso])


  useEffect(() => {
    let mounted = true
    setLoadingCourses(true)
    setErrorMsg(null)
    getCourses()
      .then((list) => { if (mounted) setCourses(list) })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Error loading courses', err)
        if (mounted) setErrorMsg('No se pudieron cargar los cursos. Verifica la conexión con el servidor.')
      })
      .finally(() => { if (mounted) setLoadingCourses(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (selectedCurso) {
      setSelectedRA(null)
      getRAsByCourse(selectedCurso).then(setRas)
    }
  }, [selectedCurso])

  const openCurso = (c: Course) => {
    setSelectedCurso(c.id)
    setParams({ curso: c.id })
    setView('ra')
  }

  const openEstudiantes = async () => { /* vista de estudiantes manejada en otra pantalla */ }

  const openRADetails = async (ra: RA) => {
    setSelectedRA(ra)
    setView('ra')
  }

  // Vista de gráfico de indicadores movida a módulo específico

  const submitNewActivity = async () => {
    if (!selectedRA) return
    setNewActError(null)
    const nombre_actividad = newAct.nombre.trim()
    const pctRA = Number(newAct.pctRA)

    if (!nombre_actividad) return setNewActError('Ingresa un nombre para la actividad.')
    if (Number.isNaN(pctRA) || pctRA <= 0 || pctRA > 100) return setNewActError('"% en RA" debe estar entre 0 y 100.')

    try {
      setSavingNewAct(true)
      await createActivityForRA(selectedRA.id, {
        nombre_actividad,
        id_tipo_actividad: Number(newAct.tipo),
        porcentaje_ra_actividad: pctRA
      })
      setNewAct({ nombre: '', tipo: '1', pctRA: '' })
  // Recarga de actividades se realiza en la vista RAs
    } catch (err: any) {
      let msg = 'No se pudo crear la actividad.'
      const maybeResp = err?.response?.data
      if (typeof maybeResp === 'string') msg = maybeResp
      else if (maybeResp && typeof maybeResp === 'object') {
        const obj = maybeResp as Record<string, unknown>
        msg = String(obj.message ?? obj.detail ?? msg)
      } else if (err?.message) msg = err.message
      setNewActError(msg)
    } finally {
      setSavingNewAct(false)
    }
  }

  // submitGrade logic migrado a otro módulo de calificación; función placeholder eliminada.

  const title =
    view === 'cursos'
      ? 'Cursos - Filtrar por código de carrera'
      : view === 'ra'
        ? `RA - ${selectedCurso}`
        : `Estudiantes - ${selectedCurso}`

  const items = [
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
    { key: 'crear', icon: 'bi-pencil-square', title: 'Crear' },
    { key: 'listar', icon: 'bi-list-ul', title: 'Listado' },
    { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' }
  ]

  const onSidebarClick = async (key: string) => {
    if (key === 'cursos') setView('cursos')
    else if (key === 'listar' && selectedCurso) await openEstudiantes()
  }

  const filtered = courses.filter(
    (c) =>
      !filter ||
      c.id.toUpperCase().includes(filter.toUpperCase()) ||
      c.carrera.toUpperCase().includes(filter.toUpperCase())
  )

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active={view === 'cursos' ? 'cursos' : view === 'ra' ? 'crear' : 'listar'} onClick={onSidebarClick} items={items} />
        <main className="dash-content">
          <div className="content-title">{title}</div>

          {errorMsg && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{errorMsg}</span>
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => {
                  setErrorMsg(null)
                  setLoadingCourses(true)
                  getCourses()
                    .then(setCourses)
                    .catch(() => setErrorMsg('No se pudieron cargar los cursos.'))
                    .finally(() => setLoadingCourses(false))
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Panel principal */}
          {view === 'cursos' && (
            <section className="panel shown">
              <SearchPill icon="bi-search" placeholder="Cursos — Filtrar por código de carrera" value={filter} onChange={setFilter} />
              {loadingCourses ? (
                <div className="text-muted">Cargando cursos…</div>
              ) : (
                <CardGrid>
                  {filtered.map((c, idx) => (
                    <RaCard
                      key={c.id}
                      headTone={idx === 0 ? 'dark' : 'light'}
                      title={c.nombre}
                      subtitle={`${c.codigo ?? c.id} · ${c.carrera}`}
                      onClick={() => openCurso(c)}
                    />
                  ))}
                </CardGrid>
              )}
            </section>
          )}

          {/* Panel RA */}
          {view === 'ra' && (
            <section className="panel shown">
              <SearchPill icon="bi-journal-text" label={`RA - ${selectedCurso}`} />
              {/* Lista de RAs */}
              <CardGrid>
                {ras.map((ra, idx) => (
                  <RaCard
                    key={ra.id}
                    headTone={idx === 0 ? 'dark' : 'light'}
                    title={<><span className="text-uppercase small fw-bold d-block">Resultado de aprendizaje</span>{ra.titulo}</>}
                    subtitle={ra.info}
                    onClick={() => openRADetails(ra)}
                  />
                ))}
              </CardGrid>

              {/* Crear actividad */}
              {selectedRA && (
                <div className="mt-3">
                  <div className="content-title">Crear actividad para: {selectedRA.titulo}</div>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <input
                        className="form-control"
                        placeholder="Nombre actividad"
                        value={newAct.nombre}
                        onChange={e => setNewAct(a => ({ ...a, nombre: e.target.value }))}
                      />
                    </div>
                    {/* Campo de peso interno de la actividad eliminado */}
                    <div className="col-md-2">
                      <input
                        className="form-control"
                        placeholder="% en RA"
                        title="Aporte al RA"
                        type="number"
                        step="0.01"
                        value={newAct.pctRA}
                        onChange={e => setNewAct(a => ({ ...a, pctRA: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        className="form-control"
                        placeholder="Tipo (id)"
                        value={newAct.tipo}
                        onChange={e => setNewAct(a => ({ ...a, tipo: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-2">
                      <button
                        className="btn btn-danger w-100"
                        disabled={savingNewAct}
                        onClick={submitNewActivity}
                      >
                        {savingNewAct ? 'Creando…' : 'Crear'}
                      </button>
                    </div>
                  </div>
                  {newActError && <div className="alert alert-danger mt-2">{newActError}</div>}
                </div>
              )}

              {/* Calificación */}
              {/* ... resto del bloque idéntico al tuyo ... */}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default Docente
