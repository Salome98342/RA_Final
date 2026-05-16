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
  const [asignaturaSeleccionadaId, setAsignaturaSeleccionadaId] = useState<string>('')
  const [gruposComparacion, setGruposComparacion] = useState<string[]>([])
  
  // Datos
  const [datosDesempenio, setDatosDesempenio] = useState<DashboardDesempenioResponse | null>(null)
  const [expandedAsignatura, setExpandedAsignatura] = useState<string | null>(null)
  const [expandedRA, setExpandedRA] = useState<string | null>(null)

  const sidebarItems = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'desempenio', icon: 'bi-graph-up-arrow', title: 'Desempeño' },
    { key: 'asignaturas', icon: 'bi-journals', title: 'Asignaturas' },
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
    setAsignaturaSeleccionadaId('')
    setGruposComparacion([])
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

  useEffect(() => {
    setGruposComparacion([])
  }, [asignaturaSeleccionada])

  // Cargar datos del dashboard
    useEffect(() => {
      const cargarDatos = async () => {
    setLoading(true)
    setError(null)
    try {
      const datos = await fetchDashboardDesempenio({
        periodo: periodoSeleccionado || undefined,
        asignatura: asignaturaSeleccionada || undefined,
        // Enviar id_asignatura siempre que esté seleccionada para mantener coherencia
        id_asignatura: asignaturaSeleccionadaId ? Number(asignaturaSeleccionadaId) : undefined,
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
  }, [periodoSeleccionado, asignaturaSeleccionada, asignaturaSeleccionadaId, activeTab])

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
    const totalEstudiantes =
      datosDesempenio.resumen.total_estudiantes_considerados ??
      datosDesempenio.hu11_asignaturas_ranking.reduce((max, asig) => Math.max(max, asig.total_matriculados), 0)

    const normalDesempenio = Math.max(totalEstudiantes - totalBajo, 0)

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
            backgroundColor: ['#E73431', '#199A75'],
            borderColor: ['#9A1915', '#0F6B50'],
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
      const rankingFiltrado = gruposComparacion.length
        ? datosDesempenio.hu11_asignaturas_ranking.filter((a) => gruposComparacion.includes(a.grupo || 'N/A'))
        : datosDesempenio.hu11_asignaturas_ranking

      rankingFiltrado.forEach((asig, idx) => {
        const canvasId = `chart-asignatura-${idx}`
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Destruir chart anterior si existe
        if (chartsAsignaturasRef.current[idx]) {
          chartsAsignaturasRef.current[idx]?.destroy()
        }

        // Usar el conteo de estudiantes con RA < 3.0 para coherencia con HU-10
        const bajoDesempenio = asig.estudiantes_bajo_desempenio ?? asig.estudiantes_promedio_bajo_3
        const normalDesempenio = Math.max(asig.total_matriculados - (bajoDesempenio || 0), 0)

        chartsAsignaturasRef.current[idx] = new ChartJS(ctx, {
          type: 'pie',
          data: {
            labels: ['RA < 3.0', 'RA >= 3.0'],
            datasets: [
              {
                data: [bajoDesempenio, normalDesempenio],
                backgroundColor: ['#E73431', '#199A75'],
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
  }, [datosDesempenio, activeTab, gruposComparacion])

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

      const dataBase = datosDesempenio.hu11_asignaturas_ranking
      const asignaturas = gruposComparacion.length
        ? dataBase.filter((a) => gruposComparacion.includes(a.grupo || 'N/A'))
        : dataBase

      const labels = asignaturas.map(a => `${a.codigo} • Grupo ${a.grupo || 'N/A'}`)
      const conteosBajo3 = asignaturas.map((a) => a.estudiantes_bajo_desempenio ?? a.estudiantes_promedio_bajo_3 ?? 0)
      const conteosSobre3 = asignaturas.map((a) => {
        const bajo = a.estudiantes_bajo_desempenio ?? a.estudiantes_promedio_bajo_3 ?? 0
        return Math.max(a.total_matriculados - bajo, 0)
      })

      const barChart = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'RA >= 3.0',
              data: conteosSobre3,
              backgroundColor: '#199A75',
              borderColor: '#0F6B50',
              borderWidth: 1,
            },
            {
              label: 'RA < 3.0',
              data: conteosBajo3,
              backgroundColor: '#E73431',
              borderColor: '#9A1915',
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
              stacked: true,
              ticks: {
                precision: 0,
              },
            },
            y: {
              stacked: true,
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
                  const dataIndex = context.dataIndex
                  const total = (conteosSobre3[dataIndex] || 0) + (conteosBajo3[dataIndex] || 0)
                  const value = context.parsed.x as number
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                  return `${context.dataset.label}: ${value} estudiantes (${percentage}%)`
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
  }, [datosDesempenio, activeTab, gruposComparacion])

  const gruposDisponibles = Array.from(
    new Set((datosDesempenio?.hu11_asignaturas_ranking || []).map((a) => a.grupo || 'N/A'))
  )

  const rankingFiltrado = gruposComparacion.length
    ? (datosDesempenio?.hu11_asignaturas_ranking || []).filter((a) => gruposComparacion.includes(a.grupo || 'N/A'))
    : (datosDesempenio?.hu11_asignaturas_ranking || [])

  const toggleGrupoComparacion = (grupo: string) => {
    setGruposComparacion((prev) => {
      if (prev.includes(grupo)) {
        return prev.filter((g) => g !== grupo)
      }
      if (prev.length >= 2) {
        return prev
      }
      return [...prev, grupo]
    })
  }

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
                    <p className="text-muted mb-0">Asignaturas con Estudiantes con Bajo Desempeño</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="text-info">
                      {datosDesempenio.resumen.asignatura_con_mas_bajo_desempenio ? (
                        <>
                          <strong>{datosDesempenio.resumen.asignatura_con_mas_bajo_desempenio.codigo}</strong>
                          <br />
                          <span style={{fontSize: '0.9rem'}}>{datosDesempenio.resumen.asignatura_con_mas_bajo_desempenio.nombre}</span>
                        </>
                      ) : (
                        'N/A'
                      )}
                    </h5>
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
                <i className="bi bi-journal me-2"></i>Rendimiento de Asignaturas
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
                      value={asignaturaSeleccionadaId}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        setAsignaturaSeleccionadaId(selectedId)
                        if (!selectedId) {
                          setAsignaturaSeleccionada('')
                          return
                        }
                        const asignatura = asignaturasFiltro.find((a) => String(a.id_asignatura) === selectedId)
                        setAsignaturaSeleccionada(asignatura?.codigo || '')
                      }}
                    >
                      <option value="">General (todas las asignaturas)</option>
                      {asignaturasFiltro.map((a) => (
                        <option key={a.id_asignatura} value={String(a.id_asignatura)}>
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
                                    {est.asignaturas_perdidas.map((a, i) => (
                                      <span key={i} className="badge bg-warning text-dark me-1">{a.codigo}</span>
                                    ))}
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

          {/* Panel: Asignaturas con Estudiantes con Bajo Desempeño */}
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

                {asignaturaSeleccionada && gruposDisponibles.length > 0 && (
                  <div className="mb-4">
                    <label className="form-label">Comparar cohortes por grupo (máximo 2)</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {gruposDisponibles.map((grupo) => {
                        const selected = gruposComparacion.includes(grupo)
                        return (
                          <button
                            key={grupo}
                            type="button"
                            className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => toggleGrupoComparacion(grupo)}
                          >
                            Grupo {grupo}
                          </button>
                        )
                      })}
                    </div>
                    {gruposComparacion.length === 2 && (
                      <div className="form-text">
                        Comparación activa entre grupos {gruposComparacion[0]} y {gruposComparacion[1]}.
                      </div>
                    )}
                  </div>
                )}

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
                ) : datosDesempenio && rankingFiltrado.length > 0 ? (
                  <>
                    {/* Gráfico de Ranking (Barra Horizontal) */}
                    <div className="mb-5">
                      <h6 className="mb-3">
                        <i className="bi bi-bar-chart me-2"></i>
                        Comparativo de estudiantes por RA (RA &gt;=3.0 y RA &lt;3.0)
                      </h6>
                      <div className="card border-0 bg-light p-3" style={{minHeight: '400px'}}>
                        <canvas ref={chartRankingRef}></canvas>
                      </div>
                    </div>

                    {/* Tabla Detallada */}
                    <div className="mt-5">
                      <h6 className="mb-3">
                        <i className="bi bi-table me-2"></i>
                        Detalle Completo (Haz clic para expandir RAs)
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th style={{width: '30px'}}></th>
                              <th>Código</th>
                              <th>Nombre</th>
                              <th>Grupo</th>
                              <th>Matriculados</th>
                              <th>RA &lt; 3.0</th>
                              <th>RA &gt;= 3.0</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rankingFiltrado.map((asig: HU11Asignatura, idx: number) => {
                              const isExpanded = expandedAsignatura === `${asig.codigo}-${idx}`
                              const porcentajeNum = asig.porcentaje_bajo_desempenio ?? asig.porcentaje_promedio_bajo_3
                              let badgeClass = 'bg-success'
                              if (porcentajeNum > 0) badgeClass = 'bg-danger'
                              const bajo3 = asig.estudiantes_bajo_desempenio ?? asig.estudiantes_promedio_bajo_3
                              const sobre3 = Math.max(asig.total_matriculados - (bajo3 || 0), 0)
                              const pctBajo3 = asig.porcentaje_bajo_desempenio ?? ((bajo3 / (asig.total_matriculados || 1)) * 100)
                              const pctSobre3 = asig.porcentaje_promedio_sobre_3 ?? ((sobre3 / (asig.total_matriculados || 1)) * 100)
                              
                              return (
                                <React.Fragment key={`${asig.codigo}-${idx}`}>
                                  <tr 
                                    onClick={() => setExpandedAsignatura(isExpanded ? null : `${asig.codigo}-${idx}`)}
                                    style={{cursor: 'pointer', backgroundColor: isExpanded ? '#f8f9fa' : 'transparent'}}
                                  >
                                    <td style={{textAlign: 'center'}}>
                                      <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                                    </td>
                                    <td>
                                      <strong className="badge bg-secondary">{asig.codigo}</strong>
                                    </td>
                                    <td>{asig.nombre}</td>
                                    <td>{asig.grupo}</td>
                                    <td>
                                      <span className="badge bg-light text-dark">{asig.total_matriculados}</span>
                                    </td>
                                    <td>
                                      <span className={`badge ${badgeClass}`}>
                                        {bajo3} ({pctBajo3.toFixed(1)}%)
                                      </span>
                                    </td>
                                    <td>
                                      <span className="badge bg-success">
                                        {sobre3} ({pctSobre3.toFixed(1)}%)
                                      </span>
                                    </td>
                                  </tr>
                                  
                                  {/* Filas expandidas: RAs detallados */}
                                  {isExpanded && asig.ras_afectados.map((ra, raIdx) => {
                                    const raKey = `${asig.codigo}-${ra.id_ra}`
                                    const raExpanded = expandedRA === raKey
                                    return (
                                      <React.Fragment key={`ra-${raIdx}`}>
                                        <tr
                                          onClick={() => setExpandedRA(raExpanded ? null : raKey)}
                                          style={{backgroundColor: '#f8f9fa', cursor: 'pointer'}}
                                        >
                                          <td colSpan={2} style={{paddingLeft: '40px', borderLeft: '3px solid #007bff'}}>
                                            <i className={`bi ${raExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                                          </td>
                                          <td colSpan={2}>
                                            <strong>{ra.nombre}</strong>
                                          </td>
                                          <td style={{textAlign: 'center'}}>
                                            {ra.total_estudiantes}
                                          </td>
                                          <td>
                                            <div>
                                              <span className="badge bg-danger" style={{marginRight: '5px'}}>
                                                {ra.estudiantes_bajo_desempenio} ({ra.porcentaje_bajo_desempenio.toFixed(1)}%)
                                              </span>
                                              <div style={{fontSize: '0.75rem', color: '#666', marginTop: '3px'}}>
                                                con RA &lt; 3.0
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div>
                                              <span className="badge bg-success" style={{marginRight: '5px'}}>
                                                {ra.estudiantes_sin_bajo_desempenio} ({ra.porcentaje_sin_bajo_desempenio.toFixed(1)}%)
                                              </span>
                                              <div style={{fontSize: '0.75rem', color: '#666', marginTop: '3px'}}>
                                                con RA ≥ 3.0
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        {raExpanded && ra.students && ra.students.length > 0 && (
                                          <tr style={{backgroundColor: '#fff'}}>
                                            <td colSpan={7} style={{paddingLeft: '60px'}}>
                                              <div className="table-responsive">
                                                <table className="table table-sm mb-0">
                                                  <thead>
                                                    <tr>
                                                      <th style={{width: '80px'}}>Código</th>
                                                      <th>Nombre</th>
                                                      <th style={{width: '120px'}}>Nota RA</th>
                                                      <th style={{width: '140px'}}>Pct. Aprobación</th>
                                                      <th style={{width: '100px'}}>Estado</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {ra.students.map((s) => (
                                                      <tr key={`s-${s.id}`}>
                                                        <td><strong className="badge bg-light text-dark">{s.codigo}</strong></td>
                                                        <td>{s.nombre}</td>
                                                        <td>{s.nota_ra !== null ? s.nota_ra.toFixed(2) : '—'}</td>
                                                        <td>{s.pct_aprobacion !== null ? `${s.pct_aprobacion.toFixed(1)}%` : '—'}</td>
                                                        <td>
                                                          {s.aprobado ? (
                                                            <span className="badge bg-success">Aprobado</span>
                                                          ) : (
                                                            <span className="badge bg-danger">Bajo</span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </td>
                                          </tr>
                                        )}

                                        {raExpanded && (!ra.students || ra.students.length === 0) && (
                                          <tr style={{backgroundColor: '#fff'}}>
                                            <td colSpan={7} style={{paddingLeft: '60px', color: '#999'}}>
                                              No hay notas registradas para este RA
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    )
                                  })}
                                  
                                  {/* Fila sin RAs si está vacía */}
                                  {isExpanded && asig.ras_afectados.length === 0 && (
                                    <tr style={{backgroundColor: '#f8f9fa'}}>
                                      <td colSpan={7} style={{textAlign: 'center', color: '#999', paddingLeft: '40px'}}>
                                        No hay RAs con estudiantes en bajo desempeño
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
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
                        {rankingFiltrado.slice(0, 6).map((asig: HU11Asignatura, idx: number) => (
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
                                  {(() => {
                                    const bajo3 = asig.estudiantes_bajo_desempenio ?? asig.estudiantes_promedio_bajo_3
                                    const sobre3 = Math.max(asig.total_matriculados - (bajo3 || 0), 0)
                                    const pctBajo3 = asig.porcentaje_bajo_desempenio ?? ((bajo3 / (asig.total_matriculados || 1)) * 100)
                                    const pctSobre3 = asig.porcentaje_promedio_sobre_3 ?? ((sobre3 / (asig.total_matriculados || 1)) * 100)
                                    return (
                                      <>
                                        <div className="d-flex justify-content-around mb-1">
                                          <div>
                                            <div className="badge bg-danger">
                                              {bajo3} ({pctBajo3.toFixed(1)}%)
                                            </div>
                                            <div className="text-muted" style={{fontSize: '0.75rem'}}>RA &lt; 3.0</div>
                                          </div>
                                          <div>
                                            <div className="badge bg-success">
                                              {sobre3} ({pctSobre3.toFixed(1)}%)
                                            </div>
                                            <div className="text-muted" style={{fontSize: '0.75rem'}}>RA &gt;= 3.0</div>
                                          </div>
                                        </div>
                                        <div className="fw-bold text-danger mt-2">
                                          {pctBajo3.toFixed(1)}% con RA &lt; 3.0
                                        </div>
                                      </>
                                    )
                                  })()}
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
                    No hay datos de rendimiento de asignaturas en los filtros seleccionados.
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

