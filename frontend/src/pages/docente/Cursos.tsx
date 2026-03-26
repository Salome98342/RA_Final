import React, { useEffect, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import { SkeletonCard } from '@/components/Skeleton'
import { useNavigate } from 'react-router-dom'
import { getCourses } from '@/services/api'
import { getFullProfile } from '@/services/auth'
import { useSession } from '@/state/SessionContext'
import type { Course, ProfilePeriodo, ProfileDetails } from '@/types'

const DocenteCursos: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [groups, setGroups] = useState<ProfilePeriodo[] | null>(null)
  const [currentPeriodId, setCurrentPeriodId] = useState<number | null>(null)
  const [view, setView] = useState<'cursos' | 'recursos'>('cursos')
  const navigate = useNavigate()
  const { state } = useSession()

  useEffect(() => {
    // Cargar cursos y perfil (para agrupar por periodo) en paralelo
    setLoading(true); setErr(null)
    Promise.allSettled([getCourses(), getFullProfile()])
      .then((results) => {
        const coursesRes = results[0]
        const profileRes = results[1]
        if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value)
        else setErr('No se pudieron cargar los cursos')

        if (profileRes.status === 'fulfilled') {
          const p: ProfileDetails = profileRes.value
          const gps = Array.isArray(p.cursosPorPeriodo) ? p.cursosPorPeriodo : []
          setGroups(gps)
          const pid = p.periodoActual?.id ?? (gps.length > 0 ? Math.max(...gps.map(g => Number(g.periodo.id))) : null)
          setCurrentPeriodId(typeof pid === 'number' && !Number.isNaN(pid) ? pid : null)
        } else {
          setGroups(null)
          setCurrentPeriodId(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = courses.filter(c => !filter || c.id.toUpperCase().includes(filter.toUpperCase()) || c.carrera.toUpperCase().includes(filter.toUpperCase()))

  // Construir conjuntos de códigos por periodo (si hay datos de perfil)
  const currentCodes = new Set<string>()
  const previousCodes = new Set<string>()
  
  // Si hay grupos, clasificar cursos por periodo
  const hasGroups = groups && groups.length > 0
  if (hasGroups) {
    groups.forEach(g => {
      const codes = g.cursos.map(c => c.codigo)
      if (currentPeriodId != null && Number(g.periodo.id) === Number(currentPeriodId)) {
        codes.forEach(c => currentCodes.add(c))
      } else {
        codes.forEach(c => previousCodes.add(c))
      }
    })
  }

  // Si hay grupos, filtrar por periodo; sino, todos son "actuales"
  const filteredCurrent = hasGroups ? filtered.filter(c => currentCodes.has(c.id)) : filtered
  
  // Mapa auxiliar para intersectar por periodo manteniendo info y filtro aplicado
  const filteredMap = new Map(filtered.map(c => [c.id, c]))
  const previousGroups = hasGroups ? groups.filter(g => currentPeriodId == null || Number(g.periodo.id) !== Number(currentPeriodId)) : []

  return (
  <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar
          active={view}
          onClick={(k)=>{
            if (k === 'inicio') navigate('/docente/inicio')
            else if (k === 'cursos') setView('cursos')
            else if (k === 'recursos') {
              // Si el filtro deja 1 curso, abrimos directamente sus recursos
              const list = filtered
              if (list.length === 1) {
                navigate(`/docente/${list[0].id}/recursos`)
              } else {
                setView('recursos')
              }
            }
          }}
          items={[{key:'inicio',icon:'bi-house-door',title:'Inicio'},{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'recursos',icon:'bi-paperclip',title:'Recursos'}]}
        />
        <main className="dash-content">
          {view === 'cursos' && (
            <>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="content-title">
                  <i className="bi bi-mortarboard text-primary me-2"></i>
                  Cursos - Filtrar por código de carrera
                </div>
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
              <section className="card shadow-sm border-0 mb-3">
                <div className="card-body">
                  <h5 className="mb-2">Bienvenido, {state.name || 'Docente'}! 👋</h5>
                  <p className="text-muted mb-3">En tu módulo puedes gestionar tus cursos y publicar material para tus estudiantes.</p>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="badge text-bg-light border"><i className="bi bi-grid-3x3-gap me-1"></i>Ver cursos y entrar a RA/Actividades</span>
                    <span className="badge text-bg-light border"><i className="bi bi-paperclip me-1"></i>Administrar recursos del curso</span>
                  </div>
                </div>
              </section>
              <SearchPill icon="bi-search" placeholder="Filtrar" value={filter} onChange={setFilter} />
              {err && <div className="alert alert-danger shadow-sm d-flex align-items-center"><i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>{err}</div>}
              {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : (
            <>
              {hasGroups ? (
                <>
                  <div className="d-flex align-items-center gap-2 mb-3" aria-label="Cursos del periodo actual">
                    <i className="bi bi-calendar-check text-success"></i>
                    <span className="fw-bold">Periodo actual</span>
                    {filteredCurrent.length > 0 && (
                      <span className="badge bg-success rounded-pill">{filteredCurrent.length}</span>
                    )}
                  </div>
                  <CardGrid>
                    {filteredCurrent.length === 0 ? (
                      <div className="alert alert-info d-flex align-items-center">
                        <i className="bi bi-info-circle me-2"></i>
                        Sin cursos en el periodo actual{filter ? ' (filtro aplicado)' : ''}.
                      </div>
                    ) : (
                      filteredCurrent.map((c, idx) => (
                        <RaCard key={c.id} headTone={idx===0?'dark':'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={()=>navigate(`/docente/${c.id}/ras`)} />
                      ))
                    )}
                  </CardGrid>
                  <div className="d-flex align-items-center gap-2 mb-3 mt-4" aria-label="Cursos de periodos anteriores">
                    <i className="bi bi-clock-history text-muted"></i>
                    <span className="fw-bold">Periodos anteriores</span>
                  </div>
                  {previousGroups.length === 0 ? (
                    <div className="alert alert-secondary d-flex align-items-center">
                      <i className="bi bi-inbox me-2"></i>
                      Sin cursos en periodos anteriores{filter ? ' (filtro aplicado)' : ''}.
                    </div>
                  ) : (
                    previousGroups.map(pg => {
                      const periodCourses = pg.cursos
                        .map(c => filteredMap.get(c.codigo))
                        .filter((x): x is Course => Boolean(x))
                      return (
                        <section key={pg.periodo.id} className="mb-3" aria-label={`Periodo ${pg.periodo.descripcion}`}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-calendar2 text-muted ra-small"></i>
                            <span className="ra-small text-muted fw-semibold">{pg.periodo.descripcion}</span>
                            {periodCourses.length > 0 && (
                              <span className="badge bg-secondary rounded-pill ra-small">{periodCourses.length}</span>
                            )}
                          </div>
                          <CardGrid>
                            {periodCourses.length === 0 ? (
                              <div className="alert alert-secondary d-flex align-items-center">
                                <i className="bi bi-inbox me-2"></i>
                                Sin cursos en este periodo{filter ? ' (filtro aplicado)' : ''}.
                              </div>
                            ) : (
                              periodCourses.map(c => (
                                <RaCard key={c.id} headTone={'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={()=>navigate(`/docente/${c.id}/ras`)} />
                              ))
                            )}
                          </CardGrid>
                        </section>
                      )
                    })
                  )}
                </>
              ) : (
                <>
                  {filtered.length === 0 ? (
                    <div className="alert alert-info d-flex align-items-center">
                      <i className="bi bi-info-circle me-2"></i>
                      No se encontraron cursos{filter ? ' con ese filtro' : ''}.
                    </div>
                  ) : (
                    <CardGrid>
                      {filtered.map((c, idx) => (
                        <RaCard key={c.id} headTone={idx===0?'dark':'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={()=>navigate(`/docente/${c.id}/ras`)} />
                      ))}
                    </CardGrid>
                  )}
                </>
              )}
            </>
          )}
          </>
          )}
          
          {view === 'recursos' && (
            <div className="alert alert-info d-flex align-items-center">
              <i className="bi bi-info-circle me-2"></i>
              Filtra por un curso específico o navega al curso para ver sus recursos.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
export default DocenteCursos