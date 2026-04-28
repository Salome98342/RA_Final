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

  // Exportar calificaciones a CSV (para el estudiante seleccionado)
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

  // Exportar calificaciones de todos los estudiantes del curso para este RA
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
      Alert.toast.success('CSV del curso generado.')
    } catch {
      Alert.toast.error('No se pudo generar el CSV del curso.')
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

  // Limpiar estado de ediciones cuando cambia el estudiante seleccionado
  useEffect(() => {
    if (selectedStudent) {
      setEdits({}) // Limpiar todas las ediciones pendientes
    }
  }, [selectedStudent])

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
    
    // 🆕 Determinar el indicador efectivo (seleccionado en el dropdown o el del backend)
    const effectiveIndicadorId = e.indicadorId ?? (a.indicadorId ?? '')
    
    // 🆕 Si hay notas por indicador, buscar la nota correspondiente al indicador seleccionado
    let backendNota: number | null = null
    let backendRetro: string | null = null
    
    if (a.notasPorIndicador && a.notasPorIndicador.length > 0) {
      // Buscar la nota del indicador seleccionado
      const notaParaIndicador = a.notasPorIndicador.find(
        n => String(n.id_ind ?? '') === String(effectiveIndicadorId)
      )
      
      if (notaParaIndicador) {
        backendNota = notaParaIndicador.nota
        backendRetro = notaParaIndicador.retroalimentacion
      }
    } else {
      // Fallback: usar los campos legacy si no hay notas por indicador
      backendNota = a.nota ?? null
      backendRetro = a.retroalimentacion ?? null
    }
    
    return {
      indicadorId: effectiveIndicadorId,
      nota: e.nota ?? (backendNota != null ? String(backendNota) : ''),
      retro: e.retro ?? (backendRetro ?? ''),
      dirty: !!e.dirty,
      saving: !!e.saving,
      savedAt: e.savedAt,
    }
  }

  // Eliminado bloque de cálculo combinado por RA (el usuario indicó que no tiene sentido para calificar).

  const isIndicatorRequired = (a: Activity) => Array.isArray(a.indicadores) && a.indicadores.length > 0

  const setEdit = (id: string, patch: Partial<{ nota: string; indicadorId: string; retro: string }>) => {
    setEdits(prev => {
      const current = prev[id] || {}
      
      // 🆕 Si se está cambiando el indicador, cargar la nota correspondiente del backend
      if (patch.indicadorId !== undefined && patch.indicadorId !== current.indicadorId) {
        const activity = activities.find(a => a.raActividadId === id)
        if (activity?.notasPorIndicador) {
          const notaParaIndicador = activity.notasPorIndicador.find(
            n => String(n.id_ind ?? '') === String(patch.indicadorId)
          )
          
          if (notaParaIndicador) {
            // Cargar nota y retroalimentación del backend, sin marcar como dirty
            return {
              ...prev,
              [id]: {
                indicadorId: patch.indicadorId,
                nota: notaParaIndicador.nota != null ? String(notaParaIndicador.nota) : '',
                retro: notaParaIndicador.retroalimentacion ?? '',
                dirty: false, // No está modificado, solo se cambió de indicador
              },
            }
          } else {
            // No hay nota para este indicador, limpiar campos
            return {
              ...prev,
              [id]: {
                indicadorId: patch.indicadorId,
                nota: '',
                retro: '',
                dirty: false,
              },
            }
          }
        }
      }
      
      // Comportamiento normal para otros cambios
      return {
        ...prev,
        [id]: { ...current, ...patch, dirty: true },
      }
    })
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
          const indicadorId = String(a.indicadores[0].id)
          
          // 🆕 Buscar la nota correspondiente al indicador auto-seleccionado
          let nota = ''
          let retro = ''
          if (a.notasPorIndicador) {
            const notaParaIndicador = a.notasPorIndicador.find(n => String(n.id_ind ?? '') === indicadorId)
            if (notaParaIndicador) {
              nota = notaParaIndicador.nota != null ? String(notaParaIndicador.nota) : ''
              retro = notaParaIndicador.retroalimentacion ?? ''
            }
          }
          
          next[key] = { 
            indicadorId, 
            nota, 
            retro, 
            dirty: false // No marcar como dirty porque viene del backend
          }
        }
      }
      return next
    })
  }, [activities])

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
    if (isIndicatorRequired(a) && !eff.indicadorId) {
      Alert.toast.error('Selecciona un indicador para esta actividad.')
      return
    }

    // 🔴 MULTI-RA: Detectar si esta actividad está en múltiples RAs
    // Buscar todas las actividades con el mismo id_actividad (diferentes ra_actividad_id)
    const relatedActivities = activities.filter(act => act.id === a.id && act.raActividadId)
    const keysToUpdate = relatedActivities.map(act => act.raActividadId!)
    
    // Validación adicional: verificar que hay relaciones válidas
    if (keysToUpdate.length === 0) {
      Alert.toast.error('Error: No se encontraron relaciones RA-Actividad válidas.')
      return
    }
    
    // Validación: verificar que la matrícula existe
    if (!selectedStudent.matriculaId) {
      Alert.toast.error('Error: Estudiante sin matrícula válida.')
      return
    }
    
    // Marcar todas como "guardando"
    setEdits(prev => {
      const updated = { ...prev }
      keysToUpdate.forEach(k => {
        updated[k] = { ...(prev[k] || {}), saving: true }
      })
      return updated
    })

    try {
      // Normalizar indicadorId: solo enviar si es válido
      const normalizedIndicadorId = eff.indicadorId && 
        eff.indicadorId !== '' && 
        eff.indicadorId !== 'null' && 
        eff.indicadorId !== 'undefined' 
        ? eff.indicadorId 
        : undefined
      
      // Guardar la nota en TODAS las relaciones ra_actividad de esta actividad
      const savePromises = keysToUpdate.map(async (raActId) => {
        try {
          return await upsertGrade({
            matriculaId: selectedStudent.matriculaId,
            raActividadId: raActId,
            nota: notaNum,
            retroalimentacion: eff.retro || undefined,
            indicadorId: normalizedIndicadorId,
          })
        } catch (error) {
          // Capturar error específico de esta relación
          throw { raActId, error }
        }
      })
      
      const results = await Promise.allSettled(savePromises)
      
      // Verificar si alguna falló
      const failed = results.filter(r => r.status === 'rejected')
      
      if (failed.length > 0) {
        // Al menos una operación falló
        const firstError = (failed[0] as PromiseRejectedResult).reason
        const errorMsg = firstError?.error?.response?.data?.detail 
          || firstError?.error?.response?.data?.message
          || firstError?.error?.message
          || 'Error desconocido'
        
        setEdits(prev => {
          const updated = { ...prev }
          keysToUpdate.forEach(k => {
            updated[k] = { ...(prev[k] || {}), saving: false }
          })
          return updated
        })
        
        Alert.toast.error(`Error al guardar: ${errorMsg}. ${failed.length > 1 ? `Fallaron ${failed.length} de ${keysToUpdate.length} operaciones.` : ''}`)
        return
      }
      
      if (import.meta.env.DEV) {
        console.debug(`Nota replicada en ${keysToUpdate.length} relación(es) ra_actividad para actividad "${a.nombre}"`)
      }
      
      // Marcar todas como guardadas
      setEdits(prev => {
        const updated = { ...prev }
        keysToUpdate.forEach(k => {
          updated[k] = { ...(prev[k] || {}), saving: false, dirty: false, savedAt: Date.now() }
        })
        return updated
      })
      
      // Actualizar TODAS las actividades relacionadas con la nueva nota
      setActivities(prev => prev.map(x => {
        if (!keysToUpdate.includes(x.raActividadId || '')) return x
        
        // Actualizar campos legacy
        const updated = { 
          ...x, 
          nota: notaNum, 
          retroalimentacion: eff.retro || null, 
          indicadorId: normalizedIndicadorId || null 
        }
        
        // 🆕 Actualizar también notasPorIndicador
        if (updated.notasPorIndicador) {
          // Buscar si ya existe una nota para este indicador
          const existingIdx = updated.notasPorIndicador.findIndex(
            n => String(n.id_ind ?? '') === String(normalizedIndicadorId ?? '')
          )
          
          if (existingIdx >= 0) {
            // Actualizar nota existente
            updated.notasPorIndicador = [...updated.notasPorIndicador]
            updated.notasPorIndicador[existingIdx] = {
              nota: notaNum,
              retroalimentacion: eff.retro || null,
              id_ind: normalizedIndicadorId || null,
            }
          } else {
            // Agregar nueva nota
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
          // Crear array de notas por indicador
          updated.notasPorIndicador = [{
            nota: notaNum,
            retroalimentacion: eff.retro || null,
            id_ind: normalizedIndicadorId || null,
          }]
        }
        
        return updated
      }))
      
      const multiMsg = keysToUpdate.length > 1 ? ` (replicada en ${keysToUpdate.length} RAs)` : ''
      Alert.toast.success(`Guardado correctamente${multiMsg}.`)
      
      // Revalidar desde backend solo ese RA para sincronizar (por si backend ajusta indicador/nota)
      const raForAct = (a as unknown as { _raId?: string })._raId
      if (selectedStudent && raForAct) {
        try {
          const freshActs = await getActivitiesByRA(raForAct, { matriculaId: selectedStudent.matriculaId })
          // Actualizar todas las relaciones con datos frescos del backend
          keysToUpdate.forEach(k => {
            const updated = freshActs.find(f => String(f.raActividadId) === String(k))
            if (updated) {
              setActivities(prev => prev.map(x => 
                x.raActividadId === k 
                  ? { 
                      ...x, 
                      nota: updated.nota ?? notaNum, 
                      retroalimentacion: updated.retroalimentacion ?? (eff.retro || null), 
                      indicadorId: updated.indicadorId ?? (normalizedIndicadorId || null),
                      // 🆕 Sincronizar notas por indicador desde el backend
                      notasPorIndicador: updated.notasPorIndicador ?? x.notasPorIndicador
                    } 
                  : x
              ))
            }
          })
        } catch {/* ignore */}
      }
      if (showChart && selectedStudent) await renderChart(selectedStudent)
    } catch (err: unknown) {
      // Marcar todas como error
      setEdits(prev => {
        const updated = { ...prev }
        keysToUpdate.forEach(k => {
          updated[k] = { ...(prev[k] || {}), saving: false }
        })
        return updated
      })
      // Extraer mensaje de error de manera segura
      const resData = (err as { response?: { data?: unknown } })?.response?.data
      let msg = 'No se pudo guardar la nota.'
      let reason = ''
      
      if (typeof resData === 'string') {
        msg = resData
      } else if (resData && typeof resData === 'object') {
        const rec = resData as Record<string, unknown>
        if (typeof rec.message === 'string') msg = rec.message
        else if (typeof rec.detail === 'string') msg = rec.detail
        
        // Razones comunes
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
          <ModuleBreadcrumbs
            items={[
              { label: 'Inicio Docente', to: '/docente/inicio' },
              { label: 'Cursos', to: '/docente/cursos' },
              { label: raId ? `Calificar RA ${raId}` : 'Calificar' },
            ]}
            onNavigate={navigate}
          />
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="content-title">
              <i className="bi bi-check2-square text-success me-2"></i>
              Calificar · Curso {curso} {raId ? `· RA ${raId}` : '· Todos los RAs'}
            </div>
            {state.role === 'coordinador' && (
              <button 
                className="btn btn-outline-primary"
                onClick={() => navigate('/coordinador/asignaturas')}
                title="Volver a la vista del coordinador"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Regresar a Coordinador
              </button>
            )}
          </div>
          <div className="row g-3">
            <div id="student-list-panel" className="col-md-3" tabIndex={-1}>
              <div className="ra-card shadow-sm border-0"><div className="ra-card-body">
                <div className="fw-bold mb-3 d-flex align-items-center">
                  <i className="bi bi-people-fill text-primary me-2 fs-5"></i>
                  Estudiantes
                </div>
                {students.length === 0 ? <div className="text-muted ra-small">Sin estudiantes.</div> : (
                  <StudentList students={students} onSelect={onSelectStudent} selectedId={selectedStudent?.id} />
                )}
              </div></div>
            </div>
            <div className={showChart ? 'col-md-5' : 'col-md-9'}>
              <div className="ra-card shadow-sm border-0"><div className="ra-card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="fw-bold d-flex align-items-center">
                    <i className="bi bi-clipboard-check-fill text-success me-2 fs-5"></i>
                    Actividades {selectedStudent ? `— ${selectedStudent.name}` : '(selecciona un estudiante)'} 
                    {loadingActs && <span className="spinner-border spinner-border-sm ms-2" aria-hidden="true"></span>}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary shadow-sm" onClick={exportCsvCurso} disabled={students.length===0 || activities.length===0 || exportingCourseCsv} title="Exportar CSV del curso">
                      {exportingCourseCsv ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Exportando…</>) : (<><i className="bi bi-download me-1" aria-hidden /> CSV (curso)</>)}
                    </button>
                    <button className="btn btn-sm btn-outline-secondary shadow-sm" onClick={exportCsv} disabled={!selectedStudent || activities.length===0} title="Exportar CSV del estudiante">
                      <i className="bi bi-download me-1" aria-hidden /> CSV (est.)
                    </button>
                    <button className="btn btn-sm btn-outline-danger shadow-sm" disabled={!selectedStudent} onClick={()=> setShowChart(v=>!v)}>
                      <i className={`bi ${showChart ? 'bi-eye-slash' : 'bi-bar-chart-fill'} me-1`}></i>
                      {showChart ? 'Ocultar' : 'Progreso'}
                    </button>
                    <button className="btn btn-sm btn-outline-danger shadow-sm" disabled={!selectedStudent || !anyDirty || bulkSaving} onClick={saveAll}>
                      {bulkSaving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : (<><i className="bi bi-save me-1"></i>Guardar todo</>)}
                    </button>
                    <button className="btn btn-sm btn-danger shadow" disabled={!selectedStudent || !anyDirty || bulkSaving} onClick={saveAllAndNext}>
                      {bulkSaving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : (<><i className="bi bi-arrow-right-circle me-1"></i>Guardar y siguiente</>)}
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
                <div className="ra-card shadow-sm border-0"><div className="ra-card-body">
                  <div className="fw-bold mb-3 d-flex align-items-center">
                    <i className="bi bi-bar-chart-fill text-info me-2 fs-5"></i>
                    Indicadores (gráfico)
                  </div>
                  {chartEmpty ? (
                    <div className="text-center py-4">
                      <i className="bi bi-graph-up fs-1 text-muted d-block mb-2"></i>
                      <small className="text-muted">Sin datos para graficar</small>
                    </div>
                  ) : (
                    <div className="border rounded p-3 bg-white shadow-sm">
                      <canvas ref={chartRef} height={220} />
                    </div>
                  )}
                </div></div>
              </div>
            )}
          </div>
          <button className="btn btn-outline-danger shadow-sm mt-4" onClick={()=>navigate(`/docente/${curso}/ras`)}>
            <i className="bi bi-arrow-left me-2"></i>
            Volver a RAs
          </button>
        </main>
      </div>
    </div>
  )
}
export default DocenteCalificar