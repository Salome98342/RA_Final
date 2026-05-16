import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { getCourseDetail } from '@/services/api'
import type { CourseDetailResponse } from '@/types'

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

const getTone = (value: number | null) => {
  if (value == null) return 'secondary'
  if (value >= 3.5) return 'success'
  if (value >= 3.0) return 'warning'
  return 'danger'
}

const getCoverageTone = (coverage: number) => {
  if (coverage >= 80) return 'success'
  if (coverage >= 50) return 'warning'
  return 'danger'
}

const MateriaDetalle = () => {
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CourseDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [activeRaId, setActiveRaId] = useState<string | number | null>(null)

  useEffect(() => {
    const storedStudentId = sessionStorage.getItem('studentId') || localStorage.getItem('studentId')
    if (storedStudentId) {
      setStudentId(storedStudentId)
    } else {
      setError('No se encontró ID de estudiante')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!codigo || !studentId) return

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getCourseDetail(codigo, studentId)
        if (result) {
          setData(result)
        } else {
          setError('No se pudo cargar la información de la asignatura')
        }
      } catch {
        setError('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [codigo, studentId])

  const breadcrumbItems = useMemo(() => {
    const courseName = data?.asignatura.nombre ?? 'Detalle de materia'
    return [
      { label: 'Inicio Estudiante', to: '/estudiante/inicio' },
      { label: 'Mis cursos', to: '/estudiante?view=cursos' },
      { label: courseName },
    ]
  }, [data?.asignatura.nombre])

  if (loading) {
    return (
      <div className="dashboard-body min-vh-100">
        <HeaderBar roleLabel="Estudiante" />
        <div className="dash-wrapper">
          <main className="dash-content">
            <ModuleBreadcrumbs items={breadcrumbItems} onNavigate={navigate} />
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-muted">Cargando detalle de la asignatura...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="dashboard-body min-vh-100">
        <HeaderBar roleLabel="Estudiante" />
        <div className="dash-wrapper">
          <main className="dash-content">
            <ModuleBreadcrumbs items={breadcrumbItems} onNavigate={navigate} />
            <div className="content-title">Error</div>
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error || 'No se encontró información'}
            </div>
            <Link className="btn btn-outline-danger" to="/estudiante?view=cursos">
              <i className="bi bi-arrow-left me-2"></i>
              Volver a cursos
            </Link>
          </main>
        </div>
      </div>
    )
  }

  const { asignatura, docente, estudiantes_matriculados, mi_estadistica, resultados_aprendizaje } = data
  const coverage = clampPercent(mi_estadistica.coverage)
  const notaAsignada = coverage >= 50 ? mi_estadistica.nota_progressive : mi_estadistica.nota_strict
  const coverageTone = getCoverageTone(coverage)
  const finalTone = getTone(notaAsignada)
  const activeRa = resultados_aprendizaje.find((ra) => String(ra.id_ra) === String(activeRaId)) ?? resultados_aprendizaje[0] ?? null

  const quickFacts = [
    { label: 'Código', value: asignatura.codigo },
    { label: 'Programa', value: asignatura.programa.nombre || 'N/A' },
    { label: 'Periodo', value: asignatura.periodo.descripcion || 'N/A' },
    { label: 'Grupo', value: asignatura.grupo || 'N/A' },
    { label: 'Sede', value: asignatura.sede || 'N/A' },
    { label: 'Matriculados', value: String(estudiantes_matriculados) },
  ]

  const summaryBlocks = [
    {
      title: 'Mi nota final',
      value: `${notaAsignada.toFixed(2)} / 5.00`,
      hint: coverage >= 50 ? 'Usa nota progresiva' : 'Usa nota estricta',
      tone: finalTone,
      icon: 'bi-award-fill',
    },
    {
      title: 'Cobertura',
      value: `${coverage}%`,
      hint: `${mi_estadistica.actividades_calificadas} de ${mi_estadistica.actividades_totales} actividades`,
      tone: coverageTone,
      icon: 'bi-pie-chart-fill',
    },
    {
      title: 'Docente',
      value: docente?.nombre || 'N/A',
      hint: docente?.correo || 'Sin correo registrado',
      tone: 'primary',
      icon: 'bi-person-badge-fill',
    },
  ] as const

  const jumpToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Estudiante" />
      <div className="dash-wrapper">
        <main className="dash-content">
          <ModuleBreadcrumbs items={breadcrumbItems} onNavigate={navigate} />

          <section className="panel shown md-detail-page">
            <div className="md-detail-shell">
              <aside className="md-detail-sidebar">
                <div className="md-side-card md-side-card--hero">
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <span className="badge rounded-pill bg-white text-dark border">{asignatura.codigo}</span>
                    {asignatura.periodo.descripcion && <span className="badge rounded-pill bg-white text-dark border">{asignatura.periodo.descripcion}</span>}
                  </div>
                  <h1 className="md-detail-title mb-2">{asignatura.nombre}</h1>
                  <p className="md-detail-subtitle mb-3">
                    Una vista más clara para revisar tu avance, la cobertura y el detalle de cada resultado de aprendizaje.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <Link className="btn btn-light md-detail-action" to="/estudiante?view=cursos">
                      <i className="bi bi-arrow-left me-2"></i>
                      Volver a cursos
                    </Link>
                  </div>
                </div>

                <div className="md-side-card">
                  <div className="text-uppercase text-muted small fw-semibold mb-2">Atajos</div>
                  <div className="d-grid gap-2">
                    <button className="btn btn-outline-danger text-start" onClick={() => jumpToSection('resumen-curso')}>
                      <i className="bi bi-speedometer2 me-2"></i>Resumen
                    </button>
                    <button className="btn btn-outline-danger text-start" onClick={() => jumpToSection('mi-desempeno')}>
                      <i className="bi bi-person-badge me-2"></i>Mi desempeño
                    </button>
                    <button className="btn btn-outline-danger text-start" onClick={() => jumpToSection('ra-section')}>
                      <i className="bi bi-trophy me-2"></i>Resultados de aprendizaje
                    </button>
                  </div>
                </div>

                {docente && (
                  <div className="md-side-card">
                    <div className="text-uppercase text-muted small fw-semibold mb-2">Docente</div>
                    <div className="d-flex align-items-start gap-2">
                      <i className="bi bi-person-circle fs-4 text-primary"></i>
                      <div>
                        <div className="fw-semibold">{docente.nombre}</div>
                        <small className="text-muted d-block">{docente.correo}</small>
                      </div>
                    </div>
                  </div>
                )}
              </aside>

              <div className="md-detail-main">
                <div className="md-hero-card mb-3" id="resumen-curso">
                  <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {asignatura.grupo && <span className="badge rounded-pill bg-white text-dark border">Grupo {asignatura.grupo}</span>}
                        {asignatura.creditos != null && <span className="badge rounded-pill bg-white text-dark border">{asignatura.creditos} créditos</span>}
                        <span className={`badge rounded-pill bg-${coverageTone} text-white`}>{coverage >= 50 ? 'Cobertura suficiente' : 'Cobertura insuficiente'}</span>
                      </div>
                      <div className="d-flex align-items-center gap-3 flex-wrap">
                        <div className="md-big-score">
                          <div className="text-uppercase text-muted small fw-semibold">Nota asignada</div>
                          <div className={`display-5 fw-bold text-${finalTone} mb-0`}>{notaAsignada.toFixed(2)}</div>
                        </div>
                        <div className="md-score-divider d-none d-md-block"></div>
                        <div>
                          <div className="text-uppercase text-muted small fw-semibold">Cobertura del curso</div>
                          <div className="display-6 fw-bold mb-0">{coverage}%</div>
                        </div>
                      </div>
                    </div>
                    <div className="md-hero-panel">
                      <div className="small text-muted text-uppercase fw-semibold mb-2">Actividades calificadas</div>
                      <div className="display-6 fw-bold mb-0">{mi_estadistica.actividades_calificadas} / {mi_estadistica.actividades_totales}</div>
                    </div>
                  </div>
                  <div className="progress md-detail-progress mt-4">
                    <div className={`progress-bar bg-${coverageTone}`} style={{ width: `${coverage}%` }} />
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
                    <span>Progreso general</span>
                    <span>{coverage >= 50 ? 'Se usa nota progresiva' : 'Se usa nota estricta'}</span>
                  </div>
                </div>

                <div className="row g-3 mb-3" id="mi-desempeno">
                  {summaryBlocks.map((block) => (
                    <div className="col-12 col-md-4" key={block.title}>
                      <div className={`md-metric-card md-metric-card--${block.tone}`}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <div className="text-uppercase text-muted small fw-semibold">{block.title}</div>
                            <div className="md-metric-value">{block.value}</div>
                          </div>
                          <i className={`bi ${block.icon} md-metric-icon`}></i>
                        </div>
                        <div className="small text-muted">{block.hint}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="md-info-card mb-3">
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-collection text-primary"></i>
                      <h6 className="mb-0">Información rápida</h6>
                    </div>
                    <span className="badge bg-light text-dark border rounded-pill">Resumen</span>
                  </div>
                  <div className="row g-3">
                    {quickFacts.map((fact) => (
                      <div className="col-6 col-lg-4" key={fact.label}>
                        <div className="md-info-item">
                          <span>{fact.label}</span>
                          <strong>{fact.value}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="alert alert-light border mt-3 mb-0">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <div className="fw-semibold">Tu nota visible ahora</div>
                        <small className="text-muted">Se ajusta según la cobertura alcanzada.</small>
                      </div>
                      <div className={`fs-4 fw-bold text-${finalTone}`}>{notaAsignada.toFixed(2)} / 5.00</div>
                    </div>
                  </div>
                </div>

                <div className="md-section-header mb-3" id="ra-section">
                  <div>
                    <div className="text-uppercase text-muted small fw-semibold">Resultados de aprendizaje</div>
                    <h5 className="mb-0">Avance por cada RA</h5>
                  </div>
                  <span className="badge bg-light text-dark border rounded-pill">{resultados_aprendizaje.length} RA</span>
                </div>

                <div className="md-ra-list">
                  {resultados_aprendizaje.map((ra) => {
                    const noteTone = getTone(ra.nota)
                    const coverageToneRa = getCoverageTone(ra.coverage)
                    const isOpen = String(activeRa?.id_ra) === String(ra.id_ra)
                    return (
                      <article className={`md-ra-compact ${isOpen ? 'is-open' : ''}`} key={ra.id_ra}>
                        <button
                          type="button"
                          className="md-ra-compact__header"
                          onClick={() => setActiveRaId(isOpen ? null : ra.id_ra)}
                        >
                          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 w-100">
                            <div>
                              <div className="d-flex flex-wrap gap-2 mb-2">
                                <span className="badge bg-secondary rounded-pill">RA {ra.numero_ra ?? ra.id_ra}</span>
                                <span className={`badge bg-${noteTone}`}>{ra.nota !== null ? ra.nota.toFixed(2) : 'N/A'}</span>
                                <span className="badge bg-light text-dark border rounded-pill">Peso {ra.porcentaje_ra}%</span>
                              </div>
                              <div className="md-ra-compact__title">{ra.descripcion}</div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <div className="text-end d-none d-md-block">
                                <div className="small text-muted">Cobertura</div>
                                <div className="fw-semibold">{ra.coverage}%</div>
                              </div>
                              <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} md-ra-chevron`}></i>
                            </div>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="md-ra-compact__body">
                            <div className="row g-3 align-items-center">
                              <div className="col-12 col-lg-4">
                                <div className="md-progress-card md-progress-card--coverage h-100">
                                  <div className="text-muted small text-uppercase fw-semibold mb-1">Cobertura del RA</div>
                                  <div className="md-progress-card__value">{ra.coverage}%</div>
                                  <div className="progress md-detail-progress md-detail-progress--ra mt-2">
                                    <div className={`progress-bar bg-${coverageToneRa}`} style={{ width: `${ra.coverage}%` }} />
                                  </div>
                                  <div className="small text-muted mt-2">{ra.actividades_calificadas} de {ra.actividades_total} actividades</div>
                                </div>
                              </div>
                              <div className="col-12 col-lg-8">
                                <div className="md-ra-card h-100">
                                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                    <div>
                                      <div className="text-uppercase text-muted small fw-semibold">Mi nota en este RA</div>
                                      <div className={`display-6 fw-bold text-${noteTone}`}>{ra.nota !== null ? ra.nota.toFixed(2) : 'N/A'}</div>
                                    </div>
                                    <div className="text-end">
                                      <div className="small text-muted">Peso del RA</div>
                                      <div className="fw-semibold">{ra.porcentaje_ra}%</div>
                                    </div>
                                  </div>
                                  <div className="d-flex gap-2 flex-wrap">
                                    <span className="badge bg-light text-dark border rounded-pill">{ra.actividades_calificadas}/{ra.actividades_total} actividades</span>
                                    <span className={`badge bg-${coverageToneRa}-subtle text-${coverageToneRa} border border-${coverageToneRa}-subtle rounded-pill`}>
                                      {ra.coverage >= 70 ? 'Muy cubierto' : ra.coverage >= 40 ? 'Cobertura media' : 'Cobertura baja'}
                                    </span>
                                  </div>
                                  <div className="mt-3 small text-muted">
                                    {ra.nota !== null
                                      ? `Tu nota en este RA es ${ra.nota.toFixed(2)} y aporta al curso según su peso.`
                                      : 'Aún no hay una nota disponible para este RA.'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
                  <div className="md-footnote flex-grow-1 m-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Si alcanzas 50% de cobertura, el sistema prioriza la nota progresiva; si no, usa la nota estricta.
                  </div>
                  <Link className="btn btn-outline-danger md-detail-action" to="/estudiante?view=cursos">
                    <i className="bi bi-arrow-left me-2"></i>
                    Regresar al listado
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default MateriaDetalle
