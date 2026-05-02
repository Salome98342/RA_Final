import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { Alert } from '@/utils/alert'
import { useSession } from '@/state/SessionContext'
import type { Student, Activity, RA } from '@/types'
import { getStudentsByCourse, getActivitiesByRA, getRAsByCourse, upsertGrade, getIndicatorChart } from '@/services/api'
import Chart from 'chart.js/auto'
import StudentList from '@/components/StudentList'
import '@/styles/calificar.css'

const DocenteCalificar: React.FC = () => {
  const { curso, raId } = useParams<{curso: string; raId?: string}>()
  const navigate = useNavigate()
  const { state } = useSession()
  const [students, setStudents] = useState<Student[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [ras, setRAs] = useState<RA[]>([])
  const [loadingActs, setLoadingActs] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [edits, setEdits] = useState<Record<string, { nota?: string; indicadorId?: string; retro?: string; dirty?: boolean; saving?: boolean; savedAt?: number }>>({})
  const [showChart, setShowChart] = useState(false)
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [chartEmpty, setChartEmpty] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [exportingCourseCsv, setExportingCourseCsv] = useState(false)
  const [editingGraded, setEditingGraded] = useState<Set<string>>(new Set())

  const exportCsv = () => {
    const student = selectedStudent
    if (!student) {
      Alert.toast.error('Selecciona un estudiante para exportar.')
      return
    }
    const headers = ['Curso', 'RA', 'Estudiante', 'Actividad', 'Indicador', 'Nota', 'Retroalimentacion']
    const rows = activities.map((a) => {
      const eff = getEff(a)
      const indicadorDesc = Array.isArray(a.indicadores)
        ? (a.indicadores.find((x) => String(x.id) === String(eff.indicadorId))?.descripcion || '')
        : ''
      return [
        String(curso ?? ''),
        String(raId ?? ''),
        student.name,
        a.nombre,
        indicadorDesc,
        eff.nota ?? (a.nota != null ? String(a.nota) : ''),
        eff.retro ?? (a.retroalimentacion ?? '')
      ]
    })
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => {
        const s = String(v ?? '')
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = `${curso ?? 'curso'}_${raId ?? 'ra'}_${student.name.replace(/\s+/g, '_')}`
    a.href = url
    a.download = `calificaciones_${safeName}.csv`
    a.click()
    URL.revokeObjectURL(url)
    Alert.toast.success('CSV generado.')
  }

  const exportCsvCurso = async () => {
    if (!curso || !raId) {
      Alert.toast.error('Falta información del curso o RA.')
      return
    }
    if (students.length === 0) {
      Alert.toast.error('No hay estudiantes para exportar.')
      return
    }
    setExportingCourseCsv(true)
    try {
      const headers = ['Curso', 'RA', 'Estudiante', 'Actividad', 'Indicador', 'Nota', 'Retroalimentacion']
      const allRows: string[][] = []
      for (const s of students) {
        const acts = await getActivitiesByRA(raId, { matriculaId: s.matriculaId })
        for (const a of acts) {
          const indicadorDesc = Array.isArray(a.indicadores)
            ? (a.indicadores.find((x) => String(x.id) === String(a.indicadorId))?.descripcion || '')
            : ''
          allRows.push([
            String(curso ?? ''),
            String(raId ?? ''),
            s.name,
            a.nombre,
            indicadorDesc,
            a.nota != null ? String(a.nota) : '',
            a.retroalimentacion ?? ''
          ])
        }
      }
      const csv = [headers, ...allRows]
        .map((r) => r.map((v) => {
          const s = String(v ?? '')
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }).join(';'))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeName = `${curso ?? 'curso'}_${raId ?? 'ra'}_todos`
      a.href = url
      a.download = `calificaciones_${safeName}.csv`
      a.click()
      URL.revokeObjectURL(url)
      Alert.toast.success('CSV del curso generado.')
    } catch {
      Alert.toast.error('No se pudo generar el CSV del curso.')
    } finally {
      setExportingCourseCsv(false)
    }
  }

  useEffect(() => {
    if (!curso) return
    getStudentsByCourse(curso).then(setStudents)
    const loadActs = async () => {
      setLoadingActs(true)
      try {
        if (raId) {
          const acts = await getActivitiesByRA(raId)
          setActivities(acts.map(a => ({ ...a, _raId: raId })) as Activity[])
        } else {
          const raList = await getRAsByCourse(curso)
          setRAs(raList)
          const all: Activity[] = []
          for (const ra of raList) {
            const acts = await getActivitiesByRA(ra.id)
            all.push(...acts.map(a => ({ ...a, _raId: ra.id, _raTitulo: ra.titulo })) as Activity[])
          }
          setActivities(all)
        }
      } finally { setLoadingActs(false) }
    }
    loadActs()
  }, [curso, raId])

  useEffect(() => {
    if (selectedStudent) {
      setEdits({})
      setEditingGraded(new Set())
    }
  }, [selectedStudent])

  useEffect(() => {
    if (!selectedStudent || !curso) return
    const loadForStudent = async () => {
      setLoadingActs(true)
      try {
        if (raId) {
          const acts = await getActivitiesByRA(raId, { matriculaId: selectedStudent.matriculaId })
          setActivities(acts.map(a => ({ ...a, _raId: raId })) as Activity[])
        } else {
          const raList = ras.length ? ras : await getRAsByCourse(curso)
          if (!ras.length) setRAs(raList)
          const all: Activity[] = []
          for (const ra of raList) {
            const acts = await getActivitiesByRA(ra.id, { matriculaId: selectedStudent.matriculaId })
            all.push(...acts.map(a => ({ ...a, _raId: ra.id, _raTitulo: ra.titulo })) as Activity[])
          }
          setActivities(all)
        }
      } finally { setLoadingActs(false) }
    }
    loadForStudent()
  }, [selectedStudent, curso, raId, ras])

  const renderChart = useCallback(async (student: Student) => {
    if (!curso) return
    const data = await getIndicatorChart(curso, student.id)
    const filtered = raId ? data.filter(d => String(d.ra_id) === String(raId)) : data
    const noData = filtered.length === 0 || filtered.every(d => d.avg_pct == null)
    setChartEmpty(noData)
    if (noData) {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null }
      return
    }
    const labels = filtered.map(d => d.descripcion)
    const values = filtered.map(d => (d.avg_pct ?? 0))
    const ctx = chartRef.current?.getContext('2d')
    if (!ctx) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avance indicador (%)', data: values, backgroundColor: '#dc3545' }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    })
  }, [curso, raId])

  useEffect(() => {
    if (showChart && selectedStudent) {
      const id = window.setTimeout(() => { renderChart(selectedStudent) }, 0)
      return () => window.clearTimeout(id)
    }
  }, [showChart, selectedStudent, renderChart])

  const getEff = (a: Activity) => {
    const e = edits[a.raActividadId || ''] || {}
    const effectiveIndicadorId = e.indicadorId ?? (a.indicadorId ?? '')
    const firstNoteByRA = (a.notasPorIndicador || []).find(n => n.nota != null)
    const backendNota = a.nota ?? firstNoteByRA?.nota ?? null
    const backendRetro = a.retroalimentacion ?? firstNoteByRA?.retroalimentacion ?? null
    return {
      indicadorId: effectiveIndicadorId,
      nota: e.nota ?? (backendNota != null ? String(backendNota) : ''),
      retro: e.retro ?? (backendRetro ?? ''),
      dirty: !!e.dirty,
      saving: !!e.saving,
      savedAt: e.savedAt,
    }
  }

  const isActivityGraded = (a: Activity): boolean => {
    const legacy = a.nota != null && a.nota >= 0 && a.nota <= 5
    const byIndicator = Array.isArray(a.notasPorIndicador)
      ? a.notasPorIndicador.some(n => n.nota != null && n.nota >= 0 && n.nota <= 5)
      : false
    return legacy || byIndicator
  }

  const getActivityFinal = (rows: Activity[]): number | null => {
    let weighted = 0
    let totalWeight = 0
    for (const row of rows) {
      const eff = getEff(row)
      const nota = Number(eff.nota)
      if (Number.isNaN(nota) || nota < 0 || nota > 5) continue
      const weight = typeof row.porcentajeRA === 'number' && row.porcentajeRA > 0 ? row.porcentajeRA : 1
      weighted += nota * weight
      totalWeight += weight
    }
    if (totalWeight <= 0) return null
    return weighted / totalWeight
  }

  const groupedByActivityAndState = useMemo(() => {
    const grouped: Record<string, {
      actividad: Activity
      ras: {
        pendientes: Activity[]
        calificadas: Activity[]
      }
    }> = {}

    activities.forEach(act => {
      const actId = act.id || ''
      if (!grouped[actId]) {
        grouped[actId] = {
          actividad: act,
          ras: { pendientes: [], calificadas: [] }
        }
      }
      
      if (isActivityGraded(act)) {
        grouped[actId].ras.calificadas.push(act)
      } else {
        grouped[actId].ras.pendientes.push(act)
      }
    })

    return grouped
  }, [activities])

  const setEdit = (id: string, patch: Partial<{ nota: string; indicadorId: string; retro: string }>) => {
    setEdits(prev => {
      const current = prev[id] || {}
      return {
        ...prev,
        [id]: { ...current, ...patch, dirty: true },
      }
    })
  }

  const saveRow = async (a: Activity) => {
    if (!selectedStudent) {
      Alert.toast.error('Selecciona un estudiante primero.')
      return
    }
    const key = a.raActividadId || ''
    const eff = getEff(a)
    if (!key) return
    if (eff.nota === '' || eff.nota == null) {
      Alert.toast.error('Debes ingresar una nota.')
      return
    }
    const notaNum = Number(eff.nota)
    if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > 5) {
      Alert.toast.error('La nota debe estar entre 0 y 5.')
      return
    }

    if (!selectedStudent.matriculaId) {
      Alert.toast.error('Error: Estudiante sin matrícula válida.')
      return
    }
    
    setEdits(prev => {
      return {
        ...prev,
        [key]: { ...(prev[key] || {}), saving: true },
      }
    })

    try {
      const normalizedIndicadorId = eff.indicadorId && 
        eff.indicadorId !== '' && 
        eff.indicadorId !== 'null' && 
        eff.indicadorId !== 'undefined' 
        ? eff.indicadorId 
        : undefined
      
      await upsertGrade({
        matriculaId: selectedStudent.matriculaId,
        raActividadId: key,
        nota: notaNum,
        retroalimentacion: eff.retro || undefined,
        indicadorId: normalizedIndicadorId,
      })

      setEdits(prev => {
        return {
          ...prev,
          [key]: { ...(prev[key] || {}), saving: false, dirty: false, savedAt: Date.now() },
        }
      })
      
      setActivities(prev => prev.map(x => {
        if ((x.raActividadId || '') !== key) return x
        
        const updated = { 
          ...x, 
          nota: notaNum, 
          retroalimentacion: eff.retro || null, 
          indicadorId: normalizedIndicadorId || null 
        }
        
        if (updated.notasPorIndicador) {
          const existingIdx = updated.notasPorIndicador.findIndex(
            n => String(n.id_ind ?? '') === String(normalizedIndicadorId ?? '')
          )
          
          if (existingIdx >= 0) {
            updated.notasPorIndicador = [...updated.notasPorIndicador]
            updated.notasPorIndicador[existingIdx] = {
              nota: notaNum,
              retroalimentacion: eff.retro || null,
              id_ind: normalizedIndicadorId || null,
            }
          } else {
            updated.notasPorIndicador = [
              ...updated.notasPorIndicador,
              {
                nota: notaNum,
                retroalimentacion: eff.retro || null,
                id_ind: normalizedIndicadorId || null,
              }
            ]
          }
        } else {
          updated.notasPorIndicador = [{
            nota: notaNum,
            retroalimentacion: eff.retro || null,
            id_ind: normalizedIndicadorId || null,
          }]
        }
        
        return updated
      }))
      
      Alert.toast.success('Guardado correctamente.')
      
      setEditingGraded(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      
      const raForAct = (a as unknown as { _raId?: string })._raId
      if (selectedStudent && raForAct) {
        try {
          const freshActs = await getActivitiesByRA(raForAct, { matriculaId: selectedStudent.matriculaId })
          const refreshed = freshActs.find(f => String(f.raActividadId) === String(key))
          if (refreshed) {
            setActivities(prev => prev.map(x =>
              (x.raActividadId || '') === key
                ? {
                    ...x,
                    nota: refreshed.nota ?? notaNum,
                    retroalimentacion: refreshed.retroalimentacion ?? (eff.retro || null),
                    indicadorId: refreshed.indicadorId ?? (normalizedIndicadorId || null),
                    notasPorIndicador: refreshed.notasPorIndicador ?? x.notasPorIndicador,
                  }
                : x
            ))
          }
        } catch {/* ignore */}
      }
      if (showChart && selectedStudent) await renderChart(selectedStudent)
    } catch (err: unknown) {
      setEdits(prev => {
        return {
          ...prev,
          [key]: { ...(prev[key] || {}), saving: false },
        }
      })
      const resData = (err as { response?: { data?: unknown } })?.response?.data
      let msg = 'No se pudo guardar la nota.'
      let reason = ''
      
      if (typeof resData === 'string') {
        msg = resData
      } else if (resData && typeof resData === 'object') {
        const rec = resData as Record<string, unknown>
        if (typeof rec.message === 'string') msg = rec.message
        else if (typeof rec.detail === 'string') msg = rec.detail
        
        if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('no autorizado')) {
          reason = ' (Sesión expirada o sin permisos)'
        } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no existe')) {
          reason = ' (Actividad o estudiante no encontrado)'
        } else if (msg.toLowerCase().includes('constraint') || msg.toLowerCase().includes('restricción')) {
          reason = ' (Violación de restricción de BD)'
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('timeout')) {
          reason = ' (Error de conexión)'
        }
      } else if (err && typeof err === 'object' && 'message' in (err as Record<string, unknown>)) {
        const eMsg = (err as Record<string, unknown>).message
        if (typeof eMsg === 'string') msg = eMsg
      }
      
      Alert.toast.error(`${msg}${reason}`)
    }
  }

  const saveAll = async () => {
    if (!selectedStudent) return
    setBulkSaving(true)
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
    if (saved === 0 && failed === 0) Alert.toast.info('No hay cambios por guardar.')
    else if (failed === 0) Alert.toast.success(`Se guardaron ${saved} fila(s).`)
    else Alert.toast.error(`Guardado parcial: ${saved} ok, ${failed} con error.`)
    setBulkSaving(false)
  }

  const autoSaveRow = async (a: Activity) => {
    const key = a.raActividadId || ''
    if (!selectedStudent || !key) return
    const eff = getEff(a)
    if (eff.saving || !eff.dirty) return
    if (eff.nota === '' || isNotaInvalid(eff.nota)) return
    await saveRow(a)
  }

  const saveAllAndNext = async () => {
    if (!selectedStudent) return
    setBulkSaving(true)
    await saveAll()
    const idx = students.findIndex(s => s.id === selectedStudent.id)
    if (idx >= 0 && idx + 1 < students.length) {
      const next = students[idx + 1]
      setSelectedStudent(next)
      if (showChart) await renderChart(next)
    }
    setBulkSaving(false)
  }

  const anyDirty = useMemo(() => activities.some(a => Boolean(edits[a.raActividadId || '']?.dirty)), [activities, edits])

  const isNotaInvalid = (v: string | undefined) => {
    if (v == null || v === '') return false
    const n = Number(v)
    return Number.isNaN(n) || n < 0 || n > 5
  }

  const sidebarItems = useMemo(() => ([
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
    { key: 'crear', icon: 'bi-pencil-square', title: 'RA/Actividades' },
    { key: 'calificar', icon: 'bi-check2-square', title: 'Calificar' },
    { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' },
    ...(state.role === 'coordinador' ? [{ key: 'volver-coordinador', icon: 'bi-arrow-left-circle', title: 'Vista coordinador' }] : []),
  ]), [state.role])

  const onSidebarClick = async (key: string) => {
    if (key === 'inicio') { navigate('/docente/inicio'); return }
    if (key === 'cursos') { navigate('/docente/cursos'); return }
    if (key === 'volver-coordinador') { navigate('/coordinador/asignaturas'); return }
    if (key === 'crear') { if (curso) navigate(`/docente/${curso}/actividades/nueva`); return }
    if (key === 'recursos') { if (curso) navigate(`/docente/${curso}/recursos`); return }
    if (key === 'calificar') {
      const el = document.getElementById('student-list-panel') as HTMLDivElement | null
      el?.focus()
    }
  }

  const activeKey = 'calificar'

  const onSelectStudent = useCallback(async (stu: Student) => {
    setSelectedStudent(stu)
    if (showChart) await renderChart(stu)
  }, [showChart, renderChart])

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active={activeKey} onClick={onSidebarClick} items={sidebarItems} />
        <main className="dash-content">
          <ModuleBreadcrumbs
            items={[
              { label: 'Inicio Docente', to: '/docente/inicio' },
              { label: 'Cursos', to: '/docente/cursos' },
              { label: raId ? `Calificar RA ${raId}` : 'Calificar' },
            ]}
            onNavigate={navigate}
          />
          
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="content-title">
              <i className="bi bi-pencil-square text-primary me-2"></i>
              Calificar actividades
            </div>
            {state.role === 'coordinador' && (
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => navigate('/coordinador/asignaturas')}
                title="Volver a la vista del coordinador"
              >
                <i className="bi bi-arrow-left me-1"></i>
                Coordinador
              </button>
            )}
          </div>

          <div className="alert alert-light border mb-4" style={{ borderColor: 'var(--uv-red)', borderLeft: '4px solid var(--uv-red)' }}>
            <i className="bi bi-info-circle-fill text-primary me-2"></i>
            <strong>Curso:</strong> {curso} 
            {raId && <><strong className="ms-3">RA:</strong> {raId}</>}
            <span className="float-end small text-muted">
              {activities.length} actividades · {students.length} estudiantes
            </span>
          </div>

          <div className="row g-4">
            <div className="col-lg-3" id="student-list-panel" tabIndex={-1}>
              <div className="card shadow-sm border-0" style={{ borderTop: '4px solid var(--uv-red)' }}>
                <div className="card-body">
                  <h6 className="card-title mb-3">
                    <i className="bi bi-people-fill text-primary me-2"></i>
                    Estudiantes
                    <span className="float-end badge bg-primary">{students.length}</span>
                  </h6>
                  
                  {students.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                      <small className="text-muted">Sin estudiantes registrados</small>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                      <StudentList 
                        students={students} 
                        onSelect={onSelectStudent} 
                        selectedId={selectedStudent?.id}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={showChart ? 'col-lg-5' : 'col-lg-9'}>
              <div className="card shadow-sm border-0" style={{ borderTop: '4px solid var(--uv-red)' }}>
                <div className="card-header border-bottom" style={{ backgroundColor: 'rgba(227, 6, 19, 0.05)' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="mb-0">
                        <i className="bi bi-clipboard-check text-primary me-2"></i>
                        Calificación de Actividades
                      </h6>
                      <small className="text-muted mt-1 d-block">
                        {selectedStudent ? (
                          <><i className="bi bi-person-check me-1"></i>{selectedStudent.name}</>
                        ) : (
                          <span className="text-warning"><i className="bi bi-exclamation-circle me-1"></i>Selecciona un estudiante</span>
                        )}
                      </small>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="d-flex flex-wrap gap-2 mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(227, 6, 19, 0.02)' }}>
                    <div className="d-flex gap-2 flex-wrap">
                      <button 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={exportCsvCurso} 
                        disabled={students.length===0 || activities.length===0 || exportingCourseCsv}
                        title="Descargar calificaciones de todos los estudiantes"
                      >
                        {exportingCourseCsv ? (
                          <><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Exportando…</>
                        ) : (
                          <><i className="bi bi-download me-1"></i>CSV Curso</>
                        )}
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={exportCsv} 
                        disabled={!selectedStudent || activities.length===0}
                        title="Descargar calificaciones del estudiante"
                      >
                        <i className="bi bi-download me-1"></i>CSV Est.
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-secondary" 
                        disabled={!selectedStudent} 
                        onClick={()=> setShowChart(v=>!v)}
                        title={showChart ? 'Ocultar gráfico de indicadores' : 'Mostrar gráfico de indicadores'}
                      >
                        <i className={`bi ${showChart ? 'bi-eye-slash' : 'bi-bar-chart-fill'} me-1`}></i>
                        {showChart ? 'Ocultar' : 'Gráfico'}
                      </button>
                    </div>
                    <div className="ms-auto d-flex gap-2 flex-wrap">
                      <button 
                        className="btn btn-sm btn-outline-primary" 
                        disabled={!selectedStudent || !anyDirty || bulkSaving} 
                        onClick={saveAll}
                        title="Guardar todos los cambios"
                      >
                        {bulkSaving ? (
                          <><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>
                        ) : (
                          <><i className="bi bi-save me-1"></i>Guardar todo</>
                        )}
                      </button>
                      <button 
                        className="btn btn-sm btn-primary" 
                        disabled={!selectedStudent || !anyDirty || bulkSaving} 
                        onClick={saveAllAndNext}
                        title="Guardar y pasar al siguiente estudiante"
                      >
                        {bulkSaving ? (
                          <><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>
                        ) : (
                          <><i className="bi bi-arrow-right-circle me-1"></i>Siguiente</>
                        )}
                      </button>
                    </div>
                  </div>

                  {loadingActs ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                      <p className="text-muted mt-2">Cargando actividades...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      Sin actividades en este RA
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light" style={{ borderBottom: '2px solid var(--uv-red)' }}>
                          <tr>
                            <th className="fw-600" style={{ color: 'var(--uv-red)' }}>
                              <i className="bi bi-bookmark me-1"></i>Actividad
                            </th>
                            <th className="fw-600 text-center" style={{ color: 'var(--uv-red)' }}>
                              <i className="bi bi-pencil me-1"></i>Nota
                            </th>
                            <th className="fw-600 text-end" style={{ color: 'var(--uv-red)' }}>
                              <i className="bi bi-sliders me-1"></i>Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(groupedByActivityAndState).map(([actId, { actividad, ras }]) => {
                            const expandKey = `act-${actId}`
                            const isExpanded = expanded[expandKey]
                            const raRows = [...ras.pendientes, ...ras.calificadas]
                            const finalGrade = getActivityFinal(raRows)
                            
                            return (
                              <React.Fragment key={actId}>
                                <tr className="fw-semibold" style={{ backgroundColor: 'rgba(227, 6, 19, 0.04)', borderLeft: '3px solid var(--uv-red)' }}>
                                  <td colSpan={3}>
                                    <div className="d-flex align-items-center gap-2">
                                      <button
                                        className="btn btn-sm btn-link p-0"
                                        aria-label={isExpanded ? 'Ocultar RAs' : 'Ver RAs'}
                                        onClick={() => setExpanded(prev => ({ ...prev, [expandKey]: !prev[expandKey] }))}
                                      >
                                        <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} style={{ color: 'var(--uv-red)' }} />
                                      </button>
                                      <div>
                                        <div className="fw-semibold">{actividad.nombre}</div>
                                        {actividad.fechaCierre && <div className="small text-muted mt-1"><i className="bi bi-calendar-event me-1"></i>Cierra: {new Date(actividad.fechaCierre).toLocaleDateString()}</div>}
                                      </div>
                                      {(ras.pendientes.length > 0 || ras.calificadas.length > 0) && (
                                        <div className="ms-auto d-flex gap-2 flex-wrap align-items-center">
                                          {finalGrade != null && (
                                            <span className={`badge px-3 py-2 ${finalGrade >= 3 ? 'bg-success' : 'bg-danger'}`}>
                                              Nota final: {finalGrade.toFixed(2)}
                                            </span>
                                          )}
                                          <span className="badge px-3 py-2" style={{ backgroundColor: '#FFF3F3', color: 'var(--uv-red)', border: '1px solid var(--uv-red-l)' }}><i className="bi bi-clock me-1"></i>{ras.pendientes.length} pendientes</span>
                                          <span className="badge px-3 py-2 bg-success"><i className="bi bi-check-circle me-1"></i>{ras.calificadas.length} calificadas</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={3}>
                                      <div className="p-3" style={{ backgroundColor: 'rgba(227, 6, 19, 0.02)' }}>
                                        <table className="table table-sm mb-0">
                                          <thead style={{ backgroundColor: 'rgba(227, 6, 19, 0.08)' }}>
                                            <tr>
                                              <th style={{ color: 'var(--uv-red)', fontWeight: '600' }}>Resultado de Aprendizaje</th>
                                              <th style={{ color: 'var(--uv-red)', fontWeight: '600' }}>Nota (0-5)</th>
                                              <th className="text-end" style={{ color: 'var(--uv-red)', fontWeight: '600' }}>Acciones</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {ras.pendientes.map(ra => {
                                              const eff = getEff(ra)
                                              const key = ra.raActividadId || ''
                                              
                                              return (
                                                <tr key={ra.raActividadId} style={{ backgroundColor: eff.dirty ? 'rgba(255, 193, 7, 0.1)' : 'transparent', borderLeft: eff.dirty ? '3px solid #FFC107' : 'none' }}>
                                                  <td>
                                                    <div>
                                                      <div className="fw-semibold">{(ra as unknown as { _raTitulo?: string })._raTitulo || 'RA sin título'}</div>
                                                      {typeof ra.porcentajeRA === 'number' && (
                                                        <div className="small text-muted mt-1"><i className="bi bi-percent me-1"></i>Peso: {ra.porcentajeRA}%</div>
                                                      )}
                                                      {ra.descripcion && (
                                                        <div className="small text-muted mt-2 ps-3 border-start">{ra.descripcion}</div>
                                                      )}
                                                    </div>
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
                                                      onChange={e=> setEdit(key, { nota: e.target.value })}
                                                      onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveRow(ra) } }}
                                                      onBlur={()=> { void autoSaveRow(ra) }}
                                                      disabled={!key}
                                                    />
                                                    <textarea
                                                      className="form-control form-control-sm mt-2"
                                                      rows={2}
                                                      placeholder="Retroalimentación"
                                                      value={eff.retro || ''}
                                                      onChange={e=> setEdit(key, { retro: e.target.value })}
                                                      onBlur={()=> { void autoSaveRow(ra) }}
                                                      disabled={!key}
                                                    />
                                                  </td>
                                                  <td className="text-end">
                                                    <button className="btn btn-sm btn-outline-secondary" disabled={!key || !selectedStudent || eff.saving || eff.nota === '' || isNotaInvalid(eff.nota)} onClick={()=>saveRow(ra)}>
                                                      {eff.saving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span></>) : (<><i className="bi bi-check-circle me-1"></i>Guardar</>)}
                                                    </button>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                            
                                            {ras.calificadas.length > 0 && (
                                              <>
                                                {ras.pendientes.length > 0 && (
                                                  <tr style={{ backgroundColor: 'rgba(227, 6, 19, 0.05)' }}>
                                                    <td colSpan={3} className="text-center fw-semibold py-3" style={{ color: 'var(--uv-red)' }}>
                                                      ✓ Calificadas
                                                    </td>
                                                  </tr>
                                                )}
                                                {ras.calificadas.map(ra => {
                                                  const eff = getEff(ra)
                                                  const key = ra.raActividadId || ''
                                                  const isInEditMode = editingGraded.has(key)
                                                  
                                                  return (
                                                    <tr key={ra.raActividadId} style={{ backgroundColor: isInEditMode ? 'rgba(255, 193, 7, 0.1)' : 'rgba(25, 154, 117, 0.05)', borderLeft: isInEditMode ? '3px solid #FFC107' : '3px solid #199A75' }}>
                                                      <td>
                                                        <div>
                                                          <div className="fw-semibold">
                                                            <i className="bi bi-check-circle-fill me-2" style={{ color: '#199A75' }}></i>
                                                            {(ra as unknown as { _raTitulo?: string })._raTitulo || 'RA sin título'}
                                                          </div>
                                                          {typeof ra.porcentajeRA === 'number' && (
                                                            <div className="small text-muted mt-1"><i className="bi bi-percent me-1"></i>Peso: {ra.porcentajeRA}%</div>
                                                          )}
                                                          {ra.descripcion && (
                                                            <div className="small text-muted mt-2 ps-3 border-start">{ra.descripcion}</div>
                                                          )}
                                                        </div>
                                                      </td>
                                                      <td>
                                                        {!isInEditMode ? (
                                                          <>
                                                            <span className="badge px-3 py-2 bg-success-subtle text-success border border-success">{eff.nota || '—'}</span>
                                                            {eff.retro && <div className="small text-muted mt-2">{eff.retro}</div>}
                                                          </>
                                                        ) : (
                                                          <>
                                                            <input
                                                              className={`form-control form-control-sm ${isNotaInvalid(eff.nota) ? 'is-invalid' : ''}`}
                                                              type="number"
                                                              step="0.1"
                                                              min={0}
                                                              max={5}
                                                              value={eff.nota}
                                                              placeholder="0–5"
                                                              onChange={e=> setEdit(key, { nota: e.target.value })}
                                                              onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveRow(ra) } }}
                                                              onBlur={()=> { void autoSaveRow(ra) }}
                                                              disabled={!key}
                                                            />
                                                            <textarea
                                                              className="form-control form-control-sm mt-2"
                                                              rows={2}
                                                              placeholder="Retroalimentación"
                                                              value={eff.retro || ''}
                                                              onChange={e=> setEdit(key, { retro: e.target.value })}
                                                              onBlur={()=> { void autoSaveRow(ra) }}
                                                              disabled={!key}
                                                            />
                                                          </>
                                                        )}
                                                      </td>
                                                      <td className="text-end">
                                                        {!isInEditMode ? (
                                                          <button 
                                                            className="btn btn-sm btn-outline-primary" 
                                                            disabled={!key || !selectedStudent}
                                                            onClick={() => setEditingGraded(prev => new Set(prev).add(key))}
                                                            style={{ borderColor: 'var(--uv-red)', color: 'var(--uv-red)' }}
                                                          >
                                                            <i className="bi bi-pencil me-1"></i>Editar
                                                          </button>
                                                        ) : (
                                                          <div className="btn-group btn-group-sm" role="group">
                                                            <button 
                                                              className="btn btn-sm btn-success"
                                                              disabled={!key || !selectedStudent || eff.saving || eff.nota === '' || isNotaInvalid(eff.nota)} 
                                                              onClick={()=>saveRow(ra)}
                                                            >
                                                              <i className="bi bi-check me-1"></i>Ok
                                                            </button>
                                                            <button 
                                                              className="btn btn-sm btn-outline-secondary" 
                                                              disabled={eff.saving}
                                                              onClick={() => {
                                                                setEditingGraded(prev => {
                                                                  const next = new Set(prev)
                                                                  next.delete(key)
                                                                  return next
                                                                })
                                                                setEdits(prev => {
                                                                  const next = { ...prev }
                                                                  delete next[key]
                                                                  return next
                                                                })
                                                              }}
                                                            >
                                                              <i className="bi bi-x-circle me-1"></i>Cancelar
                                                            </button>
                                                          </div>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  )
                                                })}
                                              </>
                                            )}
                                          </tbody>
                                        </table>
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
                  )}
                </div>
              </div>
            </div>

            {showChart && (
              <div className="col-lg-4">
                <div className="card shadow-sm border-0" style={{ borderTop: '4px solid #199A75' }}>
                  <div className="card-header border-bottom" style={{ backgroundColor: 'rgba(25, 154, 117, 0.05)' }}>
                    <h6 className="mb-0">
                      <i className="bi bi-bar-chart-fill text-success me-2"></i>
                      Desempeño por Indicador
                    </h6>
                  </div>
                  <div className="card-body">
                    {chartEmpty ? (
                      <div className="text-center py-5">
                        <i className="bi bi-graph-up fs-1 text-muted d-block mb-2"></i>
                        <small className="text-muted">Sin datos para mostrar</small>
                      </div>
                    ) : (
                      <div className="border rounded p-2" style={{ backgroundColor: '#fafafa' }}>
                        <canvas ref={chartRef} height={220} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 d-flex gap-2">
            <button 
              className="btn btn-outline-secondary" 
              onClick={()=>navigate(`/docente/${curso}/ras`)}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Volver a RAs
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
export default DocenteCalificar
