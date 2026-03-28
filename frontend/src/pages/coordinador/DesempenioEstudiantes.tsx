import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardDesempenioResponse, HU10Estudiante, HU11Asignatura, AsignaturaRow } from '@/services/coordinador'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { fetchAsignaturas, fetchDashboardDesempenio, fetchPeriodosCoordinador } from '@/services/coordinador'
import { isPeriodoAtLeast2024I, latestPeriodoDescripcion, sortPeriodosDesc } from '@/utils/periodos'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import Chart from 'chart.js/auto'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

/**
 * Página: Dashboard de Desempeño de Estudiantes (HU-10 + HU-11)
 * - HU-10: Estudiantes con bajo desempeño por cohorte (≥1 RA con nota < 3.0)
 * - HU-11: Asignaturas con más estudiantes perdiendo RAs
 */
const DesempenioEstudiantes: React.FC = () => {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'estudiantes' | 'asignaturas'>('estudiantes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [periodos, setPeriodos] = useState<Array<{ id_periodo: number; descripcion: string }>>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('')
  const [asignaturasFiltro, setAsignaturasFiltro] = useState<AsignaturaRow[]>([])
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<string>('')
  
  // Datos
  const [datosDesempenio, setDatosDesempenio] = useState<DashboardDesempenioResponse | null>(null)

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

  // Cargar períodos al montar
  useEffect(() => {
    const cargarPeriodos = async () => {
      try {
        const periodo = await fetchPeriodosCoordinador()
        const filtered = sortPeriodosDesc(
          (periodo || []).filter((p) => isPeriodoAtLeast2024I(p.descripcion))
        )
        setPeriodos(filtered)
        const latest = latestPeriodoDescripcion(filtered)
        setPeriodoSeleccionado((prev) => {
          if (prev && filtered.some((p) => p.descripcion === prev)) return prev
          return latest || ''
        })
      } catch (err) {
        console.error('Error cargando periodos:', err)
      }
    }
    cargarPeriodos()
  }, [])

  // Cargar asignaturas disponibles para filtro (según alcance del coordinador)
  useEffect(() => {
    setAsignaturaSeleccionada('')
    const cargarAsignaturas = async () => {
      try {
        const data = await fetchAsignaturas({
          page: 1,
          page_size: 300,
          periodo: periodoSeleccionado || undefined,
        })
        setAsignaturasFiltro(data.results || [])
      } catch (err) {
        console.error('Error cargando asignaturas para filtro:', err)
        setAsignaturasFiltro([])
      }
    }
    cargarAsignaturas()
  }, [periodoSeleccionado])

  // Cargar datos del dashboard
    useEffect(() => {
      const cargarDatos = async () => {
    setLoading(true)
    setError(null)
    try {
      const datos = await fetchDashboardDesempenio({
        periodo: periodoSeleccionado || undefined,
        asignatura: asignaturaSeleccionada || undefined,
      })
      setDatosDesempenio(datos)
    } catch (err) {
      setError('Error cargando datos de desempeño: ' + (err instanceof Error ? err.message : 'Error desconocido'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
    cargarDatos()
  }, [periodoSeleccionado, asignaturaSeleccionada])

  // Refs para gráficos
  const chartEstudiantesRef = useRef<HTMLCanvasElement>(null)
  const chartsAsignaturasRef = useRef<{ [key: number]: Chart | null }>({})
  const chartInstanceEstudiantesRef = useRef<Chart | null>(null)
  const chartRankingRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRankingRef = useRef<Chart | null>(null)

  // Crear gráfico de estudiantes cuando cambian los datos
  useEffect(() => {
    if (!datosDesempenio || !chartEstudiantesRef.current) return

    const totalBajo = datosDesempenio.resumen.total_estudiantes_bajo_desempenio
    let totalEstudiantesEstimado = 0
    datosDesempenio.hu11_asignaturas_ranking.forEach(asig => {
      totalEstudiantesEstimado = Math.max(totalEstudiantesEstimado, asig.total_matriculados)
    })

    if (totalEstudiantesEstimado === 0) {
      totalEstudiantesEstimado = Math.max(totalBajo * 2, 10) // Fallback
    }

    const normalDesempenio = Math.max(totalEstudiantesEstimado - totalBajo, 0)

    const ctx = chartEstudiantesRef.current.getContext('2d')
    if (!ctx) return

    // Destruir chart anterior si existe
    if (chartInstanceEstudiantesRef.current) {
      chartInstanceEstudiantesRef.current.destroy()
    }

    chartInstanceEstudiantesRef.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Bajo Desempeño', 'Desempeño Normal'],
        datasets: [
          {
            data: [totalBajo, normalDesempenio],
            backgroundColor: ['#dc3545', '#28a745'],
            borderColor: ['#c82333', '#1e7e34'],
            borderWidth: 2,
            label: 'Estudiantes',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 13 },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number
                const percentage = ((context.parsed as number) / total * 100).toFixed(1)
                return `${context.label}: ${context.parsed} (${percentage}%)`
              },
            },
          },
        },
      },
    })

    return () => {
      if (chartInstanceEstudiantesRef.current) {
        chartInstanceEstudiantesRef.current.destroy()
      }
    }
  }, [datosDesempenio])

  // Crear gráficos de asignaturas cuando cambian los datos
  useEffect(() => {
    if (!datosDesempenio || activeTab !== 'asignaturas') return

    const rafId = window.requestAnimationFrame(() => {
      datosDesempenio.hu11_asignaturas_ranking.forEach((asig, idx) => {
        const canvasId = `chart-asignatura-${idx}`
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Destruir chart anterior si existe
        if (chartsAsignaturasRef.current[idx]) {
          chartsAsignaturasRef.current[idx]?.destroy()
        }

        const bajoDesempenio = asig.estudiantes_bajo_desempenio
        const normalDesempenio = asig.total_matriculados - asig.estudiantes_bajo_desempenio

        chartsAsignaturasRef.current[idx] = new ChartJS(ctx, {
          type: 'pie',
          data: {
            labels: ['Con Bajo Desempeño', 'Desempeño Normal'],
            datasets: [
              {
                data: [bajoDesempenio, normalDesempenio],
                backgroundColor: ['#ff6b6b', '#51cf66'],
                borderColor: ['#ffffff'],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 10,
                  font: { size: 11 },
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const total = bajoDesempenio + normalDesempenio
                    const percentage = ((context.parsed as number) / total * 100).toFixed(1)
                    return `${context.label}: ${context.parsed} (${percentage}%)`
                  },
                },
              },
            },
          },
        })
      })
    })

    return () => {
      window.cancelAnimationFrame(rafId)
      Object.values(chartsAsignaturasRef.current).forEach(chart => {
        if (chart) chart.destroy()
      })
      chartsAsignaturasRef.current = {}
    }
  }, [datosDesempenio, activeTab])

  // Crear gráfico de ranking de asignaturas (Bar chart)
  useEffect(() => {
    if (!datosDesempenio || activeTab !== 'asignaturas') return

    const rafId = window.requestAnimationFrame(() => {
      const canvas = chartRankingRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Destruir chart anterior si existe
      if (chartInstanceRankingRef.current) {
        chartInstanceRankingRef.current.destroy()
      }

      const asignaturas = datosDesempenio.hu11_asignaturas_ranking
      const labels = asignaturas.map(a => `${a.codigo}`)
      const porcentajes = asignaturas.map(a => a.porcentaje_bajo_desempenio)
      
      // Definir colores basado en el porcentaje
      const colors = porcentajes.map(pct => {
        if (pct >= 50) return '#dc3545' // Rojo - crítico
        if (pct >= 30) return '#ffc107' // Amarillo - alerta
        return '#28a745' // Verde - bajo riesgo
      })

      const barChart = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Porcentaje de Bajo Desempeño (%)',
              data: porcentajes,
              backgroundColor: colors,
              borderColor: colors.map(c => c.replace(')', ', 0.8)').replace('rgb', 'rgba')),
              borderWidth: 1,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => value + '%',
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.parsed.x.toFixed(1)}%`
                },
              },
            },
          },
        },
      })

      chartInstanceRankingRef.current = barChart
    })

    return () => {
      window.cancelAnimationFrame(rafId)
      if (chartInstanceRankingRef.current) {
        chartInstanceRankingRef.current.destroy()
        chartInstanceRankingRef.current = null
      }
    }
  }, [datosDesempenio, activeTab])

  const goTo = (key: string) => {
    if (key === 'inicio') {
      navigate('/coordinador')
      return
    }
    navigate(`/coordinador/${key}`)
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Coordinador" />
      <div className="dash-wrapper">
        <Sidebar active="desempenio" onClick={goTo} items={sidebarItems} />
        <main className="dash-content">
          <ModuleBreadcrumbs
            items={[
              { label: 'Coordinador', to: '/coordinador' },
              { label: 'Desempeño' },
            ]}
            onNavigate={navigate}
          />
          <div className="content-title mb-3">
            <i className="bi bi-graph-up-arrow text-danger me-2"></i>
            Dashboard de Desempeño
          </div>

          {/* Resumen General */}
          {datosDesempenio && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card text-center border-0 shadow-sm">
                  <div className="card-body">
                    <h3 className="text-danger">{datosDesempenio.resumen.total_estudiantes_bajo_desempenio}</h3>
                    <p className="text-muted mb-0">Estudiantes con Bajo Desempeño</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center border-0 shadow-sm">
                  <div className="card-body">
                    <h3 className="text-warning">{datosDesempenio.resumen.total_asignaturas}</h3>
                    <p className="text-muted mb-0">Asignaturas Críticas</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="text-info">{datosDesempenio.resumen.asignatura_con_mas_bajo_desempenio || 'N/A'}</h5>
                    <p className="text-muted mb-0 small">Asignatura Más Crítica</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center border-0 shadow-sm">
                  <div className="card-body">
                    <i className="bi bi-shield-check text-success" style={{fontSize: '1.5rem'}}></i>
                    <p className="text-muted mb-0 small mt-2">Sistema Monitoreando</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'estudiantes' ? 'active' : ''}`}
                onClick={() => setActiveTab('estudiantes')}
                type="button"
              >
                <i className="bi bi-people me-2"></i>Estudiantes con Bajo Desempeño
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'asignaturas' ? 'active' : ''}`}
                onClick={() => setActiveTab('asignaturas')}
                type="button"
              >
                <i className="bi bi-journal me-2"></i>Asignaturas Críticas
              </button>
            </li>
          </ul>

          {/* Panel: Estudiantes con Bajo Desempeño */}
          {activeTab === 'estudiantes' && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light border-bottom">
                <h5 className="mb-0">Estudiantes con Bajo Desempeño (≥1 RA con nota &lt; 3.0)</h5>
              </div>
              <div className="card-body">
                {/* Filtros */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Período</label>
                    <select 
                      className="form-select" 
                      value={periodoSeleccionado}
                      onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                    >
                      {!periodos.length && <option value="">Sin periodos desde 2024-I</option>}
                      {periodos.map(p => (
                        <option key={p.id_periodo} value={p.descripcion}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Asignatura</label>
                    <select 
                      className="form-select" 
                      value={asignaturaSeleccionada}
                      onChange={(e) => setAsignaturaSeleccionada(e.target.value)}
                    >
                      <option value="">General (todas las asignaturas)</option>
                      {asignaturasFiltro.map((a) => (
                        <option key={a.id_asignatura} value={a.codigo}>
                          {a.codigo} - {a.nombre} - Grupo {a.grupo} - Sede {a.sede || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mensajes de estado */}
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-2 text-muted">Cargando datos...</p>
                  </div>
                ) : datosDesempenio && datosDesempenio.hu10_estudiantes_bajo_desempenio.length > 0 ? (
                  <>
                    {/* Gráfico de Proporción */}
                    <div className="row mb-4">
                      <div className="col-md-4">
                        <div className="card border-0 bg-light">
                          <div className="card-body" style={{minHeight: '300px', display: 'flex', alignItems: 'center'}}>
                            <canvas ref={chartEstudiantesRef}></canvas>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-8">
                        <h6 className="mb-3">
                          <i className="bi bi-info-circle text-info me-2"></i>
                          Análisis de Desempeño
                        </h6>
                        <div className="list-group">
                          {datosDesempenio.hu10_estudiantes_bajo_desempenio.slice(0, 5).map((est: HU10Estudiante) => (
                            <div key={est.id_estudiante} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <h6 className="mb-1">
                                    {est.nombre} {est.apellido}
                                    <span className="badge bg-secondary ms-2">{est.codigo}</span>
                                  </h6>
                                  <p className="mb-0 small text-muted">
                                    {est.total_ras_perdidos} RA{est.total_ras_perdidos !== 1 ? 's' : ''} perdido{est.total_ras_perdidos !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <span className="badge bg-danger">{est.ras_perdidos.map(r => r.nota_promedio).reduce((a, b) => a + b, 0) / est.ras_perdidos.length | 0}</span>
                              </div>
                            </div>
                          ))}
                          {datosDesempenio.hu10_estudiantes_bajo_desempenio.length > 5 && (
                            <div className="list-group-item text-center text-muted small">
                              + {datosDesempenio.hu10_estudiantes_bajo_desempenio.length - 5} estudiantes más
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tabla Completa */}
                    <div className="mt-4">
                      <h6 className="mb-3">
                        <i className="bi bi-table me-2"></i>
                        Listado Completo
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Código</th>
                              <th>Nombre</th>
                              <th>RAs Perdidos</th>
                              <th>Asignaturas Afectadas</th>
                              <th>Promedio Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {datosDesempenio.hu10_estudiantes_bajo_desempenio.map((est: HU10Estudiante) => (
                              <tr key={est.id_estudiante}>
                                <td>
                                  <span className="badge bg-secondary">{est.codigo}</span>
                                </td>
                                <td>
                                  <strong>{est.nombre} {est.apellido}</strong>
                                </td>
                                <td>
                                  <span className="badge bg-danger">{est.total_ras_perdidos}</span>
                                </td>
                                <td>
                                  <div className="small">
                                    {est.asignaturas_perdidas.slice(0, 2).map((a, i) => (
                                      <span key={i} className="badge bg-warning text-dark me-1">{a.codigo}</span>
                                    ))}
                                    {est.asignaturas_perdidas.length > 2 && (
                                      <span className="text-muted">+{est.asignaturas_perdidas.length - 2}</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <strong className="text-danger">
                                    {(est.ras_perdidos.map(r => r.nota_promedio).reduce((a, b) => a + b, 0) / est.ras_perdidos.length).toFixed(1)}
                                  </strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="alert alert-info" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Sin estudiantes con bajo desempeño en esta cohorte.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel: Asignaturas Críticas */}
          {activeTab === 'asignaturas' && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light border-bottom">
                <h5 className="mb-0">Ranking: Asignaturas con Más Estudiantes Perdiendo RAs</h5>
              </div>
              <div className="card-body">
                {/* Filtros */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Período</label>
                    <select 
                      className="form-select" 
                      value={periodoSeleccionado}
                      onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                    >
                      {!periodos.length && <option value="">Sin periodos desde 2024-I</option>}
                      {periodos.map(p => (
                        <option key={p.id_periodo} value={p.descripcion}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mensajes de estado */}
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-2 text-muted">Cargando datos...</p>
                  </div>
                ) : datosDesempenio && datosDesempenio.hu11_asignaturas_ranking.length > 0 ? (
                  <>
                    {/* Gráfico de Ranking (Barra Horizontal) */}
                    <div className="mb-5">
                      <h6 className="mb-3">
                        <i className="bi bi-bar-chart me-2"></i>
                        Ranking por Porcentaje de Bajo Desempeño
                      </h6>
                      <div className="card border-0 bg-light p-3" style={{minHeight: '400px'}}>
                        <canvas ref={chartRankingRef}></canvas>
                      </div>
                    </div>

                    {/* Tabla Detallada */}
                    <div className="mt-5">
                      <h6 className="mb-3">
                        <i className="bi bi-table me-2"></i>
                        Detalle Completo
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Código</th>
                              <th>Nombre</th>
                              <th>Grupo</th>
                              <th>Matriculados</th>
                              <th>Bajo Desempeño</th>
                              <th>Porcentaje</th>
                              <th>RAs Afectados</th>
                            </tr>
                          </thead>
                          <tbody>
                            {datosDesempenio.hu11_asignaturas_ranking.map((asig: HU11Asignatura, idx: number) => {
                              const porcentajeNum = asig.porcentaje_bajo_desempenio
                              let badgeClass = 'bg-success'
                              if (porcentajeNum >= 50) badgeClass = 'bg-danger'
                              else if (porcentajeNum >= 30) badgeClass = 'bg-warning text-dark'
                              else if (porcentajeNum >= 15) badgeClass = 'bg-info'
                              
                              return (
                                <tr key={`${asig.codigo}-${idx}`}>
                                  <td>
                                    <strong className="badge bg-secondary">{asig.codigo}</strong>
                                  </td>
                                  <td>{asig.nombre}</td>
                                  <td>{asig.grupo}</td>
                                  <td>
                                    <span className="badge bg-light text-dark">{asig.total_matriculados}</span>
                                  </td>
                                  <td>
                                    <span className="badge bg-danger">{asig.estudiantes_bajo_desempenio}</span>
                                  </td>
                                  <td>
                                    <span className={`badge ${badgeClass}`}>
                                      {asig.porcentaje_bajo_desempenio}%
                                    </span>
                                  </td>
                                  <td>
                                    <div className="small">
                                      {asig.ras_afectados.slice(0, 2).map((ra, i) => (
                                        <span key={i} className="badge bg-light text-dark me-1">
                                            {ra.nombre}
                                        </span>
                                      ))}
                                      {asig.ras_afectados.length > 2 && (
                                        <span className="text-muted">+{asig.ras_afectados.length - 2}</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Gráficos Individuales por Asignatura */}
                    <div className="mt-5">
                      <h6 className="mb-3">
                        <i className="bi bi-pie-chart me-2"></i>
                        Distribución de Desempeño por Asignatura
                      </h6>
                      <div className="row">
                        {datosDesempenio.hu11_asignaturas_ranking.slice(0, 6).map((asig: HU11Asignatura, idx: number) => (
                          <div key={`${asig.codigo}-chart-${idx}`} className="col-md-4 mb-4">
                            <div className="card border-0 shadow-sm">
                              <div className="card-body p-3">
                                <h6 className="card-title text-center mb-3 small fw-bold">
                                  {asig.codigo} - {asig.nombre} - Grupo {asig.grupo} - Sede {asig.sede || 'N/A'}
                                  <br />
                                  <span className="text-muted" style={{fontSize: '0.75rem'}}>
                                    Grupo {asig.grupo} | Sede {asig.sede || 'N/A'}
                                  </span>
                                </h6>
                                <div style={{position: 'relative', height: '180px'}}>
                                  <canvas id={`chart-asignatura-${idx}`}></canvas>
                                </div>
                                <div className="mt-3 text-center small border-top pt-2">
                                  <div className="d-flex justify-content-around mb-1">
                                    <div>
                                      <div className="badge bg-danger">
                                        {asig.estudiantes_bajo_desempenio}
                                      </div>
                                      <div className="text-muted" style={{fontSize: '0.75rem'}}>Bajo</div>
                                    </div>
                                    <div>
                                      <div className="badge bg-success">
                                        {asig.total_matriculados - asig.estudiantes_bajo_desempenio}
                                      </div>
                                      <div className="text-muted" style={{fontSize: '0.75rem'}}>Normal</div>
                                    </div>
                                  </div>
                                  <div className="fw-bold text-danger mt-2">
                                    {asig.porcentaje_bajo_desempenio}% crítico
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="alert alert-info" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    No hay asignaturas críticas en los filtros seleccionados.
                  </div>
                  )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default DesempenioEstudiantes

