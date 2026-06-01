import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { Alert } from '@/utils/alert'
import { useSession } from '@/state/SessionContext'
import type { Student, Activity, RA } from '@/types'
import { getStudentsByCourse, getActivitiesByRA, getRAsByCourse, upsertGrade } from '@/services/api'
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
  const [studentQuery, setStudentQuery] = useState('')
  const [edits, setEdits] = useState<Record<string, { nota?: string; indicadorId?: string; retro?: string; dirty?: boolean; saving?: boolean; savedAt?: number }>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [bulkSaving, setBulkSaving] = useState(false)

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
      } finally {
        setLoadingActs(false)
      }
    }
    loadForStudent()
  }, [selectedStudent, curso, raId, ras])

  useEffect(() => {
    if (selectedStudent) {
      setEdits({})
    }
  }, [selectedStudent])

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
    }
    setBulkSaving(false)
  }

  const anyDirty = useMemo(() => activities.some(a => Boolean(edits[a.raActividadId || '']?.dirty)), [activities, edits])

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()
    if (!query) return students
    return students.filter((student) => {
      const text = `${student.name} ${student.matriculaId}`.toLowerCase()
      return text.includes(query)
    })
  }, [studentQuery, students])

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
    if (key === 'crear') { if (curso) navigate(`/docente/${curso}/ras`); return }
    if (key === 'recursos') { if (curso) navigate(`/docente/${curso}/recursos`); return }
    if (key === 'calificar') {
      const el = document.getElementById('student-list-panel') as HTMLDivElement | null
      el?.focus()
    }
  }

  const activeKey = 'calificar'

  const onSelectStudent = async (stu: Student) => {
    setSelectedStudent(stu)
  }

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

          <div className="row g-4">
            <div className="col-lg-3 col-xl-3" id="student-list-panel" tabIndex={-1}>
              <div className="card shadow-sm border-0 calificar-sidebar-card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="card-title mb-0">
                      <i className="bi bi-people-fill text-primary me-2"></i>
                      Estudiantes
                    </h6>
                    <span className="badge text-bg-light border">{filteredStudents.length}/{students.length}</span>
                  </div>
                  <div className="mb-3">
                    <input
                      type="search"
                      className="form-control form-control-sm calificar-search"
                      placeholder="Buscar estudiante"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                    />
                  </div>
                  
                  {students.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                      <small className="text-muted">Sin estudiantes registrados</small>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                      <StudentList 
                        students={filteredStudents} 
                        onSelect={onSelectStudent} 
                        selectedId={selectedStudent?.id}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-9 col-xl-9">
              <div className="card shadow-sm border-0 calificar-workspace-card">
                <div className="card-header border-bottom calificar-workspace-header">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <div className="text-uppercase text-muted small fw-semibold mb-1">Área de calificación</div>
                      <h6 className="mb-0">
                        <i className="bi bi-clipboard-check text-primary me-2"></i>
                        {selectedStudent ? selectedStudent.name : 'Selecciona un estudiante'}
                      </h6>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
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
                </div>

                <div className="card-body">
                  {loadingActs ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                      <p className="text-muted mt-2">Cargando actividades...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="alert alert-info mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      Sin actividades en este RA
                    </div>
                  ) : (
                    <div className="calificar-activity-list">
                      {Object.entries(groupedByActivityAndState).map(([actId, { actividad, ras }]) => {
                        const expandKey = `act-${actId}`
                        const isExpanded = expanded[expandKey] ?? true
                        const raRows = [...ras.pendientes, ...ras.calificadas]
                        const finalGrade = getActivityFinal(raRows)
                        const indicatorCount = new Set(
                          raRows.flatMap((row) => Array.isArray(row.indicadores) ? row.indicadores.map((ind) => String(ind.id)) : [])
                        ).size

                        return (
                          <div key={actId} className="calificar-activity-card">
                            <button
                              type="button"
                              className="calificar-activity-summary-toggle"
                              onClick={() => setExpanded((prev) => ({ ...prev, [expandKey]: !isExpanded }))}
                            >
                              <div className="d-flex align-items-start gap-3 w-100">
                                <div className="calificar-activity-bullet">
                                  <i className={`bi ${isExpanded ? 'bi-dash-lg' : 'bi-plus-lg'}`}></i>
                                </div>
                                <div className="flex-grow-1 text-start">
                                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                    <h6 className="mb-0">{actividad.nombre}</h6>
                                    <span className={`badge ${raRows.some(isActivityGraded) ? 'bg-success' : 'bg-warning text-dark'}`}>
                                      {raRows.some(isActivityGraded) ? 'Con calificación' : 'Pendiente'}
                                    </span>
                                  </div>
                                  <div className="d-flex flex-wrap gap-2 align-items-center text-muted small">
                                    {actividad.fechaCierre && <span><i className="bi bi-calendar-event me-1"></i>{new Date(actividad.fechaCierre).toLocaleDateString()}</span>}
                                    <span><i className="bi bi-diagram-3 me-1"></i>{raRows.length} RAs</span>
                                    <span><i className="bi bi-tags me-1"></i>{indicatorCount} indicadores</span>
                                  </div>
                                </div>
                                <div className="ms-auto text-end">
                                  {finalGrade != null && <div className={`badge px-3 py-2 ${finalGrade >= 3 ? 'bg-success' : 'bg-danger'}`}>Nota final {finalGrade.toFixed(2)}</div>}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="calificar-activity-body">
                                <div className="d-grid gap-3">
                                  {raRows.map((ra) => {
                                    const eff = getEff(ra)
                                    const key = ra.raActividadId || ''
                                    const statusLabel = isActivityGraded(ra) ? 'Calificada' : 'Pendiente'

                                    return (
                                      <article key={ra.raActividadId} className={`calificar-ra-card ${isActivityGraded(ra) ? 'calificar-ra-card--graded' : 'calificar-ra-card--pending'}`}>
                                        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
                                          <div>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                              <span className={`badge ${isActivityGraded(ra) ? 'bg-success' : 'bg-warning text-dark'}`}>{statusLabel}</span>
                                              <strong>{(ra as unknown as { _raTitulo?: string })._raTitulo || 'RA sin título'}</strong>
                                            </div>
                                            {typeof ra.porcentajeRA === 'number' && <div className="small text-muted"><i className="bi bi-percent me-1"></i>Peso: {ra.porcentajeRA}%</div>}
                                            {ra.descripcion && <div className="small text-muted mt-2 calificar-ra-description">{ra.descripcion}</div>}
                                          </div>
                                        </div>

                                        <div className="d-flex flex-wrap gap-1 mb-3">
                                          {Array.isArray(ra.indicadores) && ra.indicadores.length > 0 ? (
                                            ra.indicadores.map((ind) => (
                                              <span key={ind.id} className="calificar-indicator-chip calificar-indicator-chip--compact">
                                                {ind.descripcion}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-muted small">Sin indicadores asociados</span>
                                          )}
                                        </div>

                                        <div className="row g-3 align-items-end">
                                          <div className="col-lg-2 col-md-3">
                                            <label className="form-label small fw-semibold mb-1">Nota</label>
                                            <input
                                              className={`form-control form-control-sm ${isNotaInvalid(eff.nota) ? 'is-invalid' : ''}`}
                                              type="number"
                                              step="0.1"
                                              min={0}
                                              max={5}
                                              value={eff.nota}
                                              placeholder="0–5"
                                              onChange={e => setEdit(key, { nota: e.target.value })}
                                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveRow(ra) } }}
                                              onBlur={() => { void autoSaveRow(ra) }}
                                              disabled={!key}
                                            />
                                          </div>
                                          <div className="col-lg-8 col-md-9">
                                            <label className="form-label small fw-semibold mb-1">Retroalimentación</label>
                                            <textarea
                                              className="form-control form-control-sm"
                                              rows={3}
                                              placeholder="Comentarios para el estudiante"
                                              value={eff.retro || ''}
                                              onChange={e => setEdit(key, { retro: e.target.value })}
                                              onBlur={() => { void autoSaveRow(ra) }}
                                              disabled={!key}
                                            />
                                          </div>
                                          <div className="col-lg-2 d-flex justify-content-end">
                                            <button className="btn btn-sm btn-primary w-100" disabled={!key || !selectedStudent || eff.saving || eff.nota === '' || isNotaInvalid(eff.nota)} onClick={() => saveRow(ra)}>
                                              {eff.saving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : (<><i className="bi bi-check-circle me-1"></i>Guardar</>)}
                                            </button>
                                          </div>
                                        </div>
                                      </article>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
