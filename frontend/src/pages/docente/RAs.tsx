import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
// import SearchPill from '@/components/SearchPill'
import StudentList from '@/components/StudentList'
import type { RA, Indicator, Activity, Student } from '@/types'
import { getRAsByCourse, getIndicatorsByRA, getActivitiesByRA, getStudentsByCourse, getPeriodosByCourse, getRAValidation, getAsignaturaValidation, updateRaActividad, deleteRaActividad, deleteIndicador } from '@/services/api'
import ActivityDetailsModal from '@/components/ActivityDetailsModal'
import { useSession } from '@/state/SessionContext'

const DocenteRAs: React.FC = () => {
  const { curso } = useParams<{curso: string}>()
  const location = useLocation()
  const queryRA = (() => { try { return new URLSearchParams(location.search).get('ra') } catch { return null } })()
  const { state } = useSession()
  const readOnly = state.role === 'coordinador'
  const navigate = useNavigate()
  const [ras, setRas] = useState<RA[]>([])
  const [selectedRA, setSelectedRA] = useState<RA | null>(null)
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [periodos, setPeriodos] = useState<{id:string; descripcion:string}[]>([])
  const [periodoSel, setPeriodoSel] = useState<string>('')
  const [asigVal, setAsigVal] = useState<{ ras: { suma: number; ok: boolean; faltante: number } } | null>(null)
  const [raVal, setRaVal] = useState<{ actividades: { suma: number; ok: boolean; faltante: number }; indicadores: { suma: number; ok: boolean; faltante: number } } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  const [detailsActivity, setDetailsActivity] = useState<Activity | null>(null)
  const [detailsIndicator, setDetailsIndicator] = useState<Indicator | null>(null)
  const [exportingAll, setExportingAll] = useState(false)

  const fmtPct = (n: number | undefined | null) => {
    const v = typeof n === 'number' && isFinite(n) ? n : 0
    const c = Math.max(0, Math.min(100, v))
    return c.toFixed(2)
  }

  useEffect(() => {
    if (!curso) return
    setErr(null)
    getRAsByCourse(curso)
      .then(async (rows) => {
        setRas(rows)
        // Preselección vía query param ?ra=ID
        if (queryRA) {
          const match = rows.find(r => String(r.id) === String(queryRA))
          if (match) openRADetails(match)
        }
        // Validación de la asignatura: suma de RAs debe ser 100
        try { setAsigVal(await getAsignaturaValidation(curso)) } catch { setAsigVal(null) }
      })
      .catch(()=>setErr('No se pudieron cargar los RA'))
  }, [curso, queryRA])

  useEffect(() => { if(curso){ getPeriodosByCourse(curso).then(setPeriodos).catch(()=>setPeriodos([])) } }, [curso])

  const openRADetails = async (ra: RA) => {
    setSelectedRA(ra)
    setLoadingDetail(true)
    try {
      const [inds, acts, val] = await Promise.all([getIndicatorsByRA(ra.id), getActivitiesByRA(ra.id), getRAValidation(ra.id)])
      setIndicators(inds); setActivities(acts)
      setRaVal(val)
    } catch { setIndicators([]); setActivities([]) } finally { setLoadingDetail(false) }
  }

  const loadStudents = async () => {
    if (!curso) return
    setStudents(await getStudentsByCourse(curso, periodoSel?{periodoId:periodoSel}:undefined))
  }

  // Cargar estudiantes automáticamente al cambiar curso o periodo
  useEffect(() => {
    loadStudents()
  // loadStudents es estable (no depende de props dinámicos distintos a curso/periodoSel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curso, periodoSel])

  const refreshRADetail = async () => {
    if (!selectedRA) return
    setLoadingDetail(true)
    try {
      const [inds, acts, val] = await Promise.all([getIndicatorsByRA(selectedRA.id), getActivitiesByRA(selectedRA.id), getRAValidation(selectedRA.id)])
      setIndicators(inds); setActivities(acts); setRaVal(val)
    } finally { setLoadingDetail(false) }
  }

  const openActivityModal = (act: Activity, ind?: Indicator | null) => {
    setDetailsActivity(act)
    setDetailsIndicator(ind ?? (act.indicadores && act.indicadores[0] ? act.indicadores[0] : null))
    setOpenDetails(true)
  }

  const openIndicatorModal = (ind: Indicator) => {
    // Mostrar SOLO la descripción del indicador; no abrir detalles de actividad
    setDetailsActivity(null)
    setDetailsIndicator(ind)
    setOpenDetails(true)
  }

  const handleSave = async (patch: Partial<{ nombre_actividad: string; descripcion: string | null; porcentaje_ra_actividad: number; fecha_cierre: string | null; indicadores: string[] }>) => {
    if (!selectedRA || !detailsActivity) return
    if (!detailsActivity.raActividadId) return
    const payload: {
      nombre_actividad?: string
      descripcion?: string
      porcentaje_ra_actividad?: number
      fecha_cierre?: string | null
      indicadores?: Array<number | string>
    } = {
      ...(patch.nombre_actividad !== undefined ? { nombre_actividad: patch.nombre_actividad } : {}),
      ...(patch.descripcion != null ? { descripcion: patch.descripcion } : {}),
      ...(patch.porcentaje_ra_actividad !== undefined ? { porcentaje_ra_actividad: patch.porcentaje_ra_actividad } : {}),
      ...(patch.fecha_cierre !== undefined ? { fecha_cierre: patch.fecha_cierre } : {}),
      ...(patch.indicadores !== undefined ? { indicadores: patch.indicadores } : {}),
    }
    await updateRaActividad(selectedRA.id, detailsActivity.raActividadId, payload)
    await refreshRADetail()
    setOpenDetails(false)
  }

  const handleDelete = async (password: string) => {
    if (!selectedRA || !detailsActivity) return
    if (!detailsActivity.raActividadId) return
    await deleteRaActividad(selectedRA.id, detailsActivity.raActividadId, password)
    await refreshRADetail()
    setOpenDetails(false)
  }

  const handleDeleteIndicator = async (password: string) => {
    if (!selectedRA || !detailsIndicator) return
    await deleteIndicador(selectedRA.id, detailsIndicator.id, password)
    await refreshRADetail()
    setOpenDetails(false)
  }

  const exportAllRAsCsv = async () => {
    if (!curso) return
    setExportingAll(true)
    try {
      // Ensure we have up-to-date RAs
      const raList = ras.length ? ras : await getRAsByCourse(curso)
      // Get students (respect current period filter if any)
      const studs = await getStudentsByCourse(curso, periodoSel ? { periodoId: periodoSel } : undefined)
      if (studs.length === 0) {
        setExportingAll(false)
        return
      }
      const headers = ['Curso', 'RA', 'Estudiante', 'Actividad', 'Indicador', 'Nota', 'Retroalimentacion']
      const allRows: string[][] = []
      // Iterate sequentially to avoid overwhelming the backend with too many requests
      for (const ra of raList) {
        for (const s of studs) {
          const acts = await getActivitiesByRA(ra.id, { matriculaId: s.matriculaId })
          for (const a of acts) {
            const indicadorDesc = Array.isArray(a.indicadores)
              ? (a.indicadores.find(x => String(x.id) === String(a.indicadorId))?.descripcion || '')
              : ''
            allRows.push([
              String(curso),
              ra.titulo || String(ra.id),
              s.name,
              a.nombre,
              indicadorDesc,
              a.nota != null ? String(a.nota) : '',
              a.retroalimentacion ?? ''
            ])
          }
        }
      }
      const csv = [headers, ...allRows]
        .map(r => r.map(v => {
          const s = String(v ?? '')
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }).join(';'))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeName = `${curso}_todos_RAs${periodoSel ? `_periodo_${periodoSel}` : ''}`
      a.href = url
      a.download = `calificaciones_${safeName}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Silently fail
    } finally {
      setExportingAll(false)
    }
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar
          active="crear"
          onClick={(k)=>{
            if(k==='inicio') navigate('/docente/inicio')
            if(k==='cursos') navigate('/docente/cursos')
            if(k==='recursos' && curso) navigate(`/docente/${curso}/recursos`)
            if(k==='calificar') {
              if (curso) navigate(`/docente/${curso}/calificar`)
            }
          }}
          items={[
            {key:'inicio',icon:'bi-house-door',title:'Inicio'},
            {key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},
            {key:'crear',icon:'bi-pencil-square',title:'RA/Actividades'},
            {key:'calificar',icon:'bi-check2-square',title:'Calificar'},
            {key:'recursos',icon:'bi-paperclip',title:'Recursos'},
          ]}
        />
        <main className="dash-content">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="content-title">RA - {curso}</div>
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
          {asigVal && (
            <div className={`alert shadow-sm ${asigVal.ras.ok ? 'alert-success' : 'alert-warning'} d-flex align-items-center`} role="status">
              <i className={`bi ${asigVal.ras.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
              <div className="flex-grow-1">
                <div>Suma de RAs: <strong>{fmtPct(asigVal.ras.suma)}%</strong>. {asigVal.ras.ok ? '¡Perfecto!' : `Falta ${fmtPct(asigVal.ras.faltante)}% para llegar a 100%.`}</div>
                {(() => {
                  const suma = asigVal.ras.suma
                  const variant = suma > 100 ? 'prog-danger' : (asigVal.ras.ok ? 'prog-success' : 'prog-warning')
                  return (
                    <progress
                      className={`uv-progress mt-2 ${variant}`}
                      value={Math.min(100, Math.max(0, suma))}
                      max={100}
                      aria-label="Progreso RAs a 100%"
                      title={`Progreso RAs: ${fmtPct(suma)}%`}
                    />
                  )
                })()}
                <div className="ra-small text-muted text-end mt-1">{fmtPct(asigVal.ras.suma)}%</div>
              </div>
            </div>
          )}
          <div className="d-flex gap-2 mb-4">
            {!readOnly && (
              <button className="btn btn-danger shadow" onClick={()=> navigate(`/docente/${curso}/actividades/nueva`)}>
                <i className="bi bi-plus-circle-fill me-2"></i>
                Nueva actividad (curso)
              </button>
            )}
            <button className="btn btn-outline-secondary shadow-sm" disabled={exportingAll || ras.length===0} onClick={exportAllRAsCsv} title="Exportar notas de todos los RAs del curso">
              {exportingAll ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Exportando…</>) : (<><i className="bi bi-download me-1"></i>Exportar CSV (todos los RAs)</>)}
            </button>
          </div>
          {/* El bloque de progreso general de RAs se integró dentro del alert anterior */}
          {err && <div className="alert alert-danger shadow-sm d-flex align-items-center"><i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>{err}</div>}
          <CardGrid>
            {ras.map((ra, idx) => (
              <RaCard
                key={ra.id}
                headTone={idx===0?'dark':'light'}
                title={<><span className="text-uppercase small fw-bold d-block">Resultado de aprendizaje</span>{ra.titulo}</> as unknown as string}
                subtitle={ra.info}
                onClick={() => openRADetails(ra)}
                ariaLabel={`Abrir detalle del RA ${ra.titulo || ra.id}`}
              />
            ))}
          </CardGrid>

          {selectedRA && (
            <div className="mt-4">
              <div className="content-title">
                <i className="bi bi-clipboard-data text-success me-2"></i>
                Detalle de RA: {selectedRA.titulo}
              </div>
              {loadingDetail && (
                <div className="d-flex align-items-center text-muted mb-3">
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Cargando detalle…
                </div>
              )}
              {raVal && (
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className={`alert shadow-sm ${raVal.actividades.ok ? 'alert-success' : 'alert-warning'} d-flex align-items-center`}>
                      <i className={`bi ${raVal.actividades.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
                      <div className="flex-grow-1">
                        <div>Actividades: <strong>{fmtPct(raVal.actividades.suma)}%</strong>. {raVal.actividades.ok ? '¡Listo!' : `Falta ${fmtPct(raVal.actividades.faltante)}%`}</div>
                        {(() => {
                          const suma = raVal.actividades.suma
                          const variant = suma > 100 ? 'prog-danger' : (raVal.actividades.ok ? 'prog-success' : 'prog-warning')
                          return (
                            <progress
                              className={`uv-progress mt-2 ${variant}`}
                              value={Math.min(100, Math.max(0, suma))}
                              max={100}
                              aria-label="Progreso actividades a 100%"
                              title={`Progreso actividades: ${fmtPct(suma)}%`}
                            />
                          )
                        })()}
                        <div className="ra-small text-muted text-end mt-1">{fmtPct(raVal.actividades.suma)}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    {/* Bloque de indicadores: sin texto ni barras por requerimiento */}
                  </div>
                </div>
              )}
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="ra-card shadow-sm border-0"><div className="ra-card-body">
                    <div className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-bullseye text-info me-2 fs-5"></i>
                      Indicadores
                    </div>
                    {indicators.length===0 ? (
                      <div className="text-center py-4">
                        <i className="bi bi-bullseye fs-1 text-muted d-block mb-2"></i>
                        <small className="text-muted">Sin indicadores definidos</small>
                      </div>
                    ) : (
                      <ul className="list-group ra-list-group">
                        {indicators.map(ind => (
                          <li
                            key={ind.id}
                            className="list-group-item shadow-sm d-flex justify-content-between align-items-center"
                            tabIndex={0}
                            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openIndicatorModal(ind) } }}
                          >
                            <span>{ind.descripcion}</span>
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-outline-info shadow-sm" title="Ver indicador" aria-label="Ver indicador" onClick={() => openIndicatorModal(ind)}>
                                <i className="bi bi-eye-fill me-1"></i>
                                Ver
                              </button>
                            </div>
                            {/* quitar porcentaje de indicador */}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div></div>
                </div>
                <div className="col-md-6">
                  <div className="ra-card shadow-sm border-0"><div className="ra-card-body">
                    <div className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-clipboard-check-fill text-success me-2 fs-5"></i>
                      Actividades
                    </div>
                    {activities.length===0 ? (
                      <div className="text-center py-4">
                        <i className="bi bi-clipboard-x fs-1 text-muted d-block mb-2"></i>
                        <small className="text-muted">Sin actividades creadas</small>
                      </div>
                    ) : (
                      <ul className="list-group ra-list-group">
                        {activities.map(act => (
                          <li
                            key={act.id}
                            className="list-group-item shadow-sm d-flex justify-content-between align-items-center"
                            tabIndex={0}
                            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openActivityModal(act) } }}
                          >
                            <div>
                              <div>{act.nombre}</div>
                              <div className="ra-small">
                                {(act.tipoActividad || (act.tipoActividadId ? `Tipo ${act.tipoActividadId}` : ''))}
                                {act.fechaCierre ? ` · Cierra: ${new Date(act.fechaCierre).toLocaleDateString()}` : ''}
                              </div>
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                              <button className="btn btn-sm btn-outline-success shadow-sm" title={readOnly? 'Ver actividad' : 'Ver/editar actividad'} aria-label={readOnly? 'Ver actividad' : 'Ver o editar actividad'} onClick={() => openActivityModal(act)}>
                                <i className={`bi ${readOnly? 'bi-eye-fill' : 'bi-pencil-square'} me-1`}></i>
                                {readOnly? 'Ver' : 'Editar'}
                              </button>
                            </div>
                            {/* quitar porcentaje de actividad */}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div></div>
                </div>
              </div>

              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-outline-primary shadow-sm" onClick={loadStudents}>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Recargar estudiantes
                </button>
              </div>

              <div className="mt-4">
                <div className="content-title">
                  <i className="bi bi-people-fill text-primary me-2"></i>
                  Estudiantes - {curso}
                </div>
                <div className="d-flex gap-2 align-items-center mb-2">
                  <label className="ra-small">Periodo</label>
                  <select
                    className="form-select w-240px"
                    aria-label="Filtrar por periodo"
                    title="Filtrar por periodo"
                    value={periodoSel}
                    onChange={e=>setPeriodoSel(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {periodos.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                  </select>
                  {/* Botón "Cargar estudiantes" eliminado: ahora se recarga automáticamente al cambiar el periodo */}
                </div>
                <StudentList students={students} />
              </div>
            </div>
          )}

          <button className="btn btn-outline-danger shadow-sm mt-4" onClick={() => navigate('/docente/cursos')}>
            <i className="bi bi-arrow-left me-2"></i>
            Volver a cursos
          </button>

          {/* Modal de detalles de actividad/indicador */}
          <ActivityDetailsModal
            open={openDetails}
            activity={detailsActivity}
            indicator={detailsIndicator || undefined}
            availableIndicators={detailsActivity?.indicadores || []}
            onClose={() => setOpenDetails(false)}
            onSave={!readOnly && detailsActivity ? handleSave : undefined}
            onDelete={!readOnly && detailsActivity ? handleDelete : undefined}
            onDeleteIndicator={!readOnly && !detailsActivity && detailsIndicator ? handleDeleteIndicator : undefined}
          />
        </main>
      </div>
    </div>
  )
}
export default DocenteRAs