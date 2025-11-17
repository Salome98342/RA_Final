import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import type { Student, Activity, RA } from '@/types'
import { getStudentsByCourse, getActivitiesByRA, getRAsByCourse, upsertGrade, getIndicatorChart } from '@/services/api'
import Chart from 'chart.js/auto'

const DocenteCalificar: React.FC = () => {
  const { curso, raId } = useParams<{curso: string; raId?: string}>()
  const navigate = useNavigate()
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
  const [toast, setToast] = useState<{ text: string; type?: 'ok' | 'error' } | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [exportingCourseCsv, setExportingCourseCsv] = useState(false)

  // Exportar calificaciones a CSV (para el estudiante seleccionado)
  const exportCsv = () => {
    const student = selectedStudent
    if (!student) {
      setToast({ text: 'Selecciona un estudiante para exportar.', type: 'error' })
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
    setToast({ text: 'CSV generado.' })
  }

  // Exportar calificaciones de todos los estudiantes del curso para este RA
  const exportCsvCurso = async () => {
    if (!curso || !raId) {
      setToast({ text: 'Falta información del curso o RA.', type: 'error' })
      return
    }
    if (students.length === 0) {
      setToast({ text: 'No hay estudiantes para exportar.', type: 'error' })
      return
    }
    setExportingCourseCsv(true)
    try {
      const headers = ['Curso', 'RA', 'Estudiante', 'Actividad', 'Indicador', 'Nota', 'Retroalimentacion']
      const allRows: string[][] = []
      for (const s of students) {
        // Cargar actividades con notas específicas para el estudiante
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
      setToast({ text: 'CSV del curso generado.' })
    } catch {
      setToast({ text: 'No se pudo generar el CSV del curso.', type: 'error' })
    } finally {
      setExportingCourseCsv(false)
    }
  }

  // Cargar estudiantes y actividades (todas las de todos los RAs si no hay raId)
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

  // Re-cargar actividades del estudiante (todas las de sus RAs) cuando se selecciona estudiante
  useEffect(() => {
    if (!selectedStudent || !curso) return
    const loadForStudent = async () => {
      setLoadingActs(true)
      try {
        if (raId) {
          const acts = await getActivitiesByRA(raId, { matriculaId: selectedStudent.matriculaId })
          setActivities(acts.map(a => ({ ...a, _raId: raId })) as Activity[])
        } else {
          // Multi-RA
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
    // Multi-RA: usamos todos los indicadores, RA específico: filtramos
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

  // Asegurar que el gráfico se renderice cuando se abre el panel o cambia el estudiante
  useEffect(() => {
    if (showChart && selectedStudent) {
      // Esperar a que el canvas esté montado
      const id = window.setTimeout(() => { renderChart(selectedStudent) }, 0)
      return () => window.clearTimeout(id)
    }
  }, [showChart, selectedStudent, renderChart])

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

  // Eliminado bloque de cálculo combinado por RA (el usuario indicó que no tiene sentido para calificar).

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
    if (!selectedStudent) {
      setToast({ text: 'Selecciona un estudiante primero.', type: 'error' })
      return
    }
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
      const resp = await upsertGrade({
        matriculaId: selectedStudent.matriculaId,
        raActividadId: key,
        nota: notaNum,
        retroalimentacion: eff.retro || undefined,
        indicadorId: eff.indicadorId || undefined,
      })
      if (import.meta.env.DEV) {
        // Log de ayuda en desarrollo
        console.debug('upsertGrade OK', resp)
      }
      setEdits(prev => ({
        ...prev,
        [key]: { ...(prev[key] || {}), saving: false, dirty: false, savedAt: Date.now() },
      }))
      setActivities(prev => prev.map(x => x.raActividadId === key ? { ...x, nota: notaNum, retroalimentacion: eff.retro || null, indicadorId: eff.indicadorId || null } : x))
      setToast({ text: 'Guardado correctamente.' })
    // Revalidar desde backend solo ese RA para sincronizar (por si backend ajusta indicador/nota)
    const raForAct = (a as unknown as { _raId?: string })._raId
      if (selectedStudent && raForAct) {
        try {
          const freshActs = await getActivitiesByRA(raForAct, { matriculaId: selectedStudent.matriculaId })
          const updated = freshActs.find(f => String(f.raActividadId) === String(key))
          if (updated) {
            setActivities(prev => prev.map(x => x.raActividadId === key ? { ...x, nota: updated.nota ?? notaNum, retroalimentacion: updated.retroalimentacion ?? (eff.retro || null), indicadorId: updated.indicadorId ?? (eff.indicadorId || null) } : x))
          }
        } catch {/* ignore */}
      }
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
    if (saved === 0 && failed === 0) setToast({ text: 'No hay cambios por guardar.' })
    else if (failed === 0) setToast({ text: `Se guardaron ${saved} fila(s).` })
    else setToast({ text: `Guardado parcial: ${saved} ok, ${failed} con error.`, type: 'error' })
    setBulkSaving(false)
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

  // Se eliminan helpers de aplicación masiva basados en nota RA.

  // Sidebar con lista de estudiantes incluida directamente
  const sidebarItems = useMemo(() => ([
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
    { key: 'calificar', icon: 'bi-check2-square', title: 'Calificar' },
  ]), [])

  const onSidebarClick = async (key: string) => {
    if (key === 'cursos') { navigate('/docente'); return }
    if (key === 'calificar') {
      // Foco a lista estudiantes
      const el = document.getElementById('student-list-panel') as HTMLDivElement | null
      el?.focus()
    }
  }

  const activeKey = 'calificar'

  const onSelectStudent = useCallback(async (stu: Student) => {
    setSelectedStudent(stu)
    // actividades recargan por efecto secundario (useEffect)
    if (showChart) await renderChart(stu)
  }, [showChart, renderChart])

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active={activeKey} onClick={onSidebarClick} items={sidebarItems} />
        <main className="dash-content">
          <div className="content-title">Calificar · Curso {curso} {raId ? `· RA ${raId}` : '· Todos los RAs'}</div>
          {!!toast && (
            <div className="mb-2" role="status" aria-live="polite">
              <Toast text={toast.text} type={toast.type} />
            </div>
          )}
          <div className="row g-3">
            <div id="student-list-panel" className="col-md-3" tabIndex={-1}>
              <div className="ra-card"><div className="ra-card-body">
                <div className="fw-bold mb-2">Estudiantes</div>
                {students.length === 0 ? <div className="text-muted ra-small">Sin estudiantes.</div> : (
                  <ul className="list-group ra-list-group" aria-label="Lista de estudiantes">
                    {students.map(s => (
                      <li
                        key={s.id}
                        className={`list-group-item d-flex justify-content-between align-items-center ${selectedStudent?.id===s.id?'active':''}`}
                        tabIndex={0}
                        onClick={()=>onSelectStudent(s)}
                        onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onSelectStudent(s) } }}
                      >
                        <span>{s.name}</span>
                        {selectedStudent?.id===s.id && <i className="bi bi-arrow-right-circle" />}
                      </li>
                    ))}
                  </ul>
                )}
              </div></div>
            </div>
            <div className={showChart ? 'col-md-5' : 'col-md-9'}>
              <div className="ra-card"><div className="ra-card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-bold">Actividades {selectedStudent ? `— ${selectedStudent.name}` : '(selecciona un estudiante)'} {loadingActs && <span className="spinner-border spinner-border-sm ms-2" aria-hidden="true"></span>}</div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={exportCsvCurso} disabled={students.length===0 || activities.length===0 || exportingCourseCsv} title="Exportar CSV del curso">
                      {exportingCourseCsv ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Exportando…</>) : (<><i className="bi bi-download" aria-hidden /> Exportar CSV (curso)</>)}
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={exportCsv} disabled={!selectedStudent || activities.length===0} title="Exportar CSV del estudiante">
                      <i className="bi bi-download" aria-hidden /> Exportar CSV (estudiante)
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" disabled={!selectedStudent} onClick={()=> setShowChart(v=>!v)}>
                      {showChart ? 'Ocultar progreso' : 'Ver progreso'}
                    </button>
                    <button className="btn btn-sm btn-outline-danger" disabled={!selectedStudent || !anyDirty || bulkSaving} onClick={saveAll}>
                      {bulkSaving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : 'Guardar todo'}
                    </button>
                    <button className="btn btn-sm btn-danger" disabled={!selectedStudent || !anyDirty || bulkSaving} onClick={saveAllAndNext}>
                      {bulkSaving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : 'Guardar y siguiente'}
                    </button>
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
                        const key = a.raActividadId || ''
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
                                    <div className="fw-semibold" title={`RA-Act: ${key || '—'}${(a as unknown as { _raId?: string })._raId ? ` · RA: ${(a as unknown as { _raId?: string })._raId}` : ''}`}>{a.nombre}{!raId && (a as unknown as { _raTitulo?: string })._raTitulo ? <span className="ra-small text-muted"> · RA: {(a as unknown as { _raTitulo?: string })._raTitulo}</span> : null}{!key && <span className="badge bg-secondary ms-2" title="Esta actividad no tiene relación RA válida">Sin relación RA</span>}</div>
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
                                    disabled={!key}
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
                                  disabled={!key}
                                />
                              </td>
                              <td className="text-end">
                                <button className="btn btn-sm btn-outline-secondary" disabled={!key || !selectedStudent || eff.saving || !eff.dirty || (req && !eff.indicadorId) || !eff.nota || isNotaInvalid(eff.nota)} onClick={()=>saveRow(a)}>
                                  {eff.saving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : 'Guardar'}
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
                                                <li key={ind.id}>{ind.descripcion}</li>
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
                                          disabled={!key}
                                        />
                                        <div className="text-end mt-2">
                                          <button className="btn btn-sm btn-danger" disabled={!key || !selectedStudent || eff.saving || !eff.dirty || (req && !eff.indicadorId) || !eff.nota || isNotaInvalid(eff.nota)} onClick={()=>saveRow(a)}>
                                            {eff.saving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : 'Guardar cambios'}
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
              <div className="col-md-4">
                <div className="ra-card"><div className="ra-card-body">
                  <div className="fw-bold mb-2">Indicadores (gráfico)</div>
                  {chartEmpty ? (
                    <div className="text-muted ra-small">Sin datos para graficar.</div>
                  ) : (
                    <canvas ref={chartRef} height={220} />
                  )}
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