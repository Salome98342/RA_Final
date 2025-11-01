import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import StudentList from '@/components/StudentList'
import Toast from '@/components/Toast'
import type { Student, Activity } from '@/types'
import { getStudentsByCourse, getActivitiesByRA, upsertGrade, getIndicatorChart } from '@/services/api'
import Chart from 'chart.js/auto'

const DocenteCalificar: React.FC = () => {
  const { curso, raId } = useParams<{curso: string; raId: string}>()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [edits, setEdits] = useState<Record<string, { nota?: string; indicadorId?: string; retro?: string; dirty?: boolean; saving?: boolean; savedAt?: number }>>({})
  const [showChart, setShowChart] = useState(false)
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ text: string; type?: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    if (!curso || !raId) return
    getStudentsByCourse(curso).then(setStudents)
    // Cargar actividades inicialmente sin matrícula; si se selecciona estudiante, recargamos con su matrícula
    getActivitiesByRA(raId).then(setActivities)
  }, [curso, raId])

  // Re-cargar actividades con la matrícula seleccionada para mostrar notas previas y indicador usado
  useEffect(() => {
    if (!raId || !selectedStudent) return
    getActivitiesByRA(raId, { matriculaId: selectedStudent.matriculaId }).then(setActivities)
  }, [raId, selectedStudent])

  const renderChart = async (student: Student) => {
    if (!curso) return
    const data = await getIndicatorChart(curso, student.id)
    // Filtrar por RA actual si está presente
    const filtered = raId ? data.filter(d => String(d.ra_id) === String(raId)) : data
    const labels = filtered.map(d => d.descripcion)
    const values = filtered.map(d => d.avg_pct ?? 0)
    const ctx = chartRef.current?.getContext('2d')
    if (!ctx) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avance indicador (%)', data: values, backgroundColor: '#dc3545' }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    })
  }

  // Helpers por fila
  const getEff = (a: Activity) => {
    const e = edits[a.raActividadId || ''] || {}
    return {
      indicadorId: e.indicadorId ?? (a.indicadorId ?? ''),
      nota: e.nota ?? (a.nota != null ? String(a.nota) : ''),
      retro: e.retro ?? (a.retroalimentacion ?? ''),
      dirty: !!e.dirty,
      saving: !!e.saving,
      savedAt: e.savedAt,
    }
  }

  const isIndicatorRequired = (a: Activity) => Array.isArray(a.indicadores) && a.indicadores.length > 0

  const setEdit = (id: string, patch: Partial<{ nota: string; indicadorId: string; retro: string }>) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch, dirty: true },
    }))
  }

  // Auto-seleccionar indicador si la actividad tiene exactamente uno y no hay uno escogido aún
  useEffect(() => {
    setEdits(prev => {
      const next = { ...prev }
      for (const a of activities) {
        const key = a.raActividadId || ''
        if (!key) continue
        const e = next[key]
        const effIndic = (e?.indicadorId ?? a.indicadorId ?? '').toString()
        if ((!effIndic || effIndic === 'null' || effIndic === 'undefined') && Array.isArray(a.indicadores) && a.indicadores.length === 1) {
          next[key] = { ...(e || {}), indicadorId: String(a.indicadores[0].id), dirty: true }
        }
      }
      return next
    })
  }, [activities])

  const saveRow = async (a: Activity) => {
    if (!selectedStudent) return
    const key = a.raActividadId || ''
    const eff = getEff(a)
    if (!key) return
    if (eff.nota === '' || eff.nota == null) {
      setToast({ text: 'Debes ingresar una nota.', type: 'error' })
      return
    }
    const notaNum = Number(eff.nota)
    if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > 5) {
      setToast({ text: 'La nota debe estar entre 0 y 5.', type: 'error' })
      return
    }
    if (isIndicatorRequired(a) && !eff.indicadorId) {
      setToast({ text: 'Selecciona un indicador para esta actividad.', type: 'error' })
      return
    }
    setEdits(prev => ({ ...prev, [key]: { ...(prev[key] || {}), saving: true } }))
    try {
      await upsertGrade({
        matriculaId: selectedStudent.matriculaId,
        raActividadId: key,
        nota: notaNum,
        retroalimentacion: eff.retro || undefined,
        indicadorId: eff.indicadorId || undefined,
      })
      setEdits(prev => ({
        ...prev,
        [key]: { ...(prev[key] || {}), saving: false, dirty: false, savedAt: Date.now() },
      }))
      setActivities(prev => prev.map(x => x.raActividadId === key ? { ...x, nota: notaNum, retroalimentacion: eff.retro || null, indicadorId: eff.indicadorId || null } : x))
      setToast({ text: 'Guardado correctamente.' })
      if (showChart && selectedStudent) await renderChart(selectedStudent)
    } catch (err: unknown) {
      setEdits(prev => ({ ...prev, [key]: { ...(prev[key] || {}), saving: false } }))
      // Extraer mensaje de error de manera segura
      const resData = (err as { response?: { data?: unknown } })?.response?.data
      let msg = 'No se pudo guardar. Inténtalo de nuevo.'
      if (typeof resData === 'string') msg = resData
      else if (resData && typeof resData === 'object') {
        const rec = resData as Record<string, unknown>
        if (typeof rec.message === 'string') msg = rec.message
        else if (typeof rec.detail === 'string') msg = rec.detail
      } else if (err && typeof err === 'object' && 'message' in (err as Record<string, unknown>)) {
        const eMsg = (err as Record<string, unknown>).message
        if (typeof eMsg === 'string') msg = eMsg
      }
      setToast({ text: msg, type: 'error' })
    }
  }

  const saveAll = async () => {
    if (!selectedStudent) return
    let saved = 0
    let failed = 0
    for (const a of activities) {
      const eff = getEff(a)
      if (eff.dirty) {
        try {
          await saveRow(a)
          saved += 1
        } catch {
          failed += 1
        }
      }
    }
    if (saved === 0 && failed === 0) setToast({ text: 'No hay cambios por guardar.' })
    else if (failed === 0) setToast({ text: `Se guardaron ${saved} fila(s).` })
    else setToast({ text: `Guardado parcial: ${saved} ok, ${failed} con error.`, type: 'error' })
  }

  const saveAllAndNext = async () => {
    if (!selectedStudent) return
    await saveAll()
    const idx = students.findIndex(s => s.id === selectedStudent.id)
    if (idx >= 0 && idx + 1 < students.length) {
      const next = students[idx + 1]
      setSelectedStudent(next)
      if (showChart) await renderChart(next)
    }
  }

  const anyDirty = useMemo(() => activities.some(a => Boolean(edits[a.raActividadId || '']?.dirty)), [activities, edits])

  const isNotaInvalid = (v: string | undefined) => {
    if (v == null || v === '') return false
    const n = Number(v)
    return Number.isNaN(n) || n < 0 || n > 5
  }

  return (
  <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active="listar" onClick={(k)=>{ if(k==='cursos') navigate('/docente') }} items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'listar',icon:'bi-list-ul',title:'Calificar'}]} />
        <main className="dash-content">
          <div className="content-title">Calificar · Curso {curso} · RA {raId}</div>
          {!!toast && (
            <div className="mb-2" role="status" aria-live="polite">
              <Toast text={toast.text} type={toast.type} />
            </div>
          )}
          <div className="row g-3">
            <div className="col-md-4">
              <div className="ra-card"><div className="ra-card-body">
                <div className="fw-bold mb-2">Estudiantes</div>
                <StudentList students={students} onSelect={async (s)=>{ setSelectedStudent(s); if (showChart) await renderChart(s) }} />
              </div></div>
            </div>
            <div className="col-md-5">
              <div className="ra-card"><div className="ra-card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-bold">Notas {selectedStudent ? `— ${selectedStudent.name}` : ''}</div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>{ setShowChart(v=>!v); if (!showChart && selectedStudent) renderChart(selectedStudent) }}>
                      {showChart ? 'Ocultar progreso' : 'Ver progreso'}
                    </button>
                    <button className="btn btn-sm btn-outline-danger" disabled={!selectedStudent || !anyDirty} onClick={saveAll}>Guardar todo</button>
                    <button className="btn btn-sm btn-danger" disabled={!selectedStudent || !anyDirty} onClick={saveAllAndNext}>Guardar y siguiente</button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th className="table-col-40">Actividad</th>
                        <th className="table-col-25">Indicador</th>
                        <th className="table-col-20">Nota (0-5)</th>
                        <th className="table-col-15 text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.length === 0 && (
                        <tr><td colSpan={4} className="text-muted">Sin actividades en este RA</td></tr>
                      )}
                      {activities.map(a => {
                        const eff = getEff(a)
                        const req = isIndicatorRequired(a)
                        const options = Array.isArray(a.indicadores) ? a.indicadores : []
                        return (
                          <React.Fragment key={a.raActividadId || a.id}>
                            <tr className={eff.dirty ? 'table-warning' : ''}>
                              <td>
                                <div className="d-flex align-items-start gap-2">
                                  <button
                                    className="btn btn-sm btn-link p-0"
                                    aria-label={expanded[a.raActividadId || ''] ? 'Ocultar detalles' : 'Ver detalles'}
                                    title={expanded[a.raActividadId || ''] ? 'Ocultar detalles' : 'Ver detalles'}
                                    onClick={() => setExpanded(prev => ({ ...prev, [a.raActividadId || '']: !prev[a.raActividadId || ''] }))}
                                  >
                                    <i className={`bi ${expanded[a.raActividadId || ''] ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                                  </button>
                                  <div>
                                    <div className="fw-semibold">{a.nombre}</div>
                                    {a.fechaCierre && <div className="ra-small text-muted">Cierra: {new Date(a.fechaCierre).toLocaleDateString()}</div>}
                                  </div>
                                </div>
                              </td>
                              <td>
                                {req ? (
                                  <select
                                    className={`form-select form-select-sm ${req && !eff.indicadorId ? 'is-invalid' : ''}`}
                                    value={eff.indicadorId}
                                    onChange={e=> setEdit(a.raActividadId || '', { indicadorId: e.target.value })}
                                    aria-label="Seleccionar indicador"
                                  >
                                    <option value="">Seleccione…</option>
                                    {options.map(ind => <option key={ind.id} value={ind.id}>{ind.descripcion}</option>)}
                                  </select>
                                ) : (
                                  <div className="text-muted ra-small">—</div>
                                )}
                              </td>
                              <td>
                                <input
                                  className={`form-control form-control-sm ${isNotaInvalid(eff.nota) ? 'is-invalid' : ''}`}
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  max={5}
                                  value={eff.nota}
                                  placeholder="0–5"
                                  onChange={e=> setEdit(a.raActividadId || '', { nota: e.target.value })}
                                  onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveRow(a) } }}
                                />
                              </td>
                              <td className="text-end">
                                <button className="btn btn-sm btn-outline-secondary" disabled={eff.saving || !eff.dirty || (req && !eff.indicadorId) || !eff.nota || isNotaInvalid(eff.nota)} onClick={()=>saveRow(a)}>
                                  {eff.saving ? 'Guardando…' : 'Guardar'}
                                </button>
                              </td>
                            </tr>
                            {expanded[a.raActividadId || ''] && (
                              <tr className="bg-light">
                                <td colSpan={4}>
                                  <div className="p-3">
                                    <div className="row g-3">
                                      <div className="col-12 col-lg-6">
                                        <div className="mb-2 fw-semibold">Descripción de la actividad</div>
                                        <div className="text-muted">
                                          {(() => {
                                            const obj = a as unknown as Record<string, unknown>
                                            const d1 = obj['descripcion']
                                            const d2 = obj['desc']
                                            if (typeof d1 === 'string') return d1
                                            if (typeof d2 === 'string') return d2
                                            return 'Sin descripción'
                                          })()}
                                        </div>
                                        {options.length > 0 && (
                                          <div className="mt-3">
                                            <div className="fw-semibold">Indicadores</div>
                                            <ul className="mb-0 ra-small text-muted">
                                              {options.map(ind => (
                                                <li key={ind.id}>{ind.descripcion} ({ind.porcentaje}%)</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                      <div className="col-12 col-lg-6">
                                        <label className="form-label fw-semibold">Retroalimentación</label>
                                        <textarea
                                          className="form-control"
                                          rows={4}
                                          placeholder="Escribe comentarios o explicación de la nota (opcional)"
                                          value={eff.retro}
                                          onChange={e=> setEdit(a.raActividadId || '', { retro: e.target.value })}
                                        />
                                        <div className="text-end mt-2">
                                          <button className="btn btn-sm btn-danger" disabled={eff.saving || !eff.dirty || (req && !eff.indicadorId) || !eff.nota || isNotaInvalid(eff.nota)} onClick={()=>saveRow(a)}>
                                            {eff.saving ? 'Guardando…' : 'Guardar cambios'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div></div>
            </div>
            {showChart && (
              <div className="col-md-3">
                <div className="ra-card"><div className="ra-card-body">
                  <div className="fw-bold mb-2">Indicadores (gráfico)</div>
                  <canvas ref={chartRef} height={220} />
                </div></div>
              </div>
            )}
          </div>
          <button className="btn btn-outline-danger mt-3" onClick={()=>navigate(`/docente/${curso}/ras`)}><i className="bi bi-arrow-left" /> Volver a RA</button>
        </main>
      </div>
    </div>
  )
}
export default DocenteCalificar