import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { createActivityForRA, getTiposActividad, getIndicatorsByRA, getRAValidation, getRAsByCourse, uploadRecurso } from '@/services/api'
import { useSession } from '@/state/SessionContext'
import { Alert } from '@/utils/alert'

const GUIDE_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx', '.pptx'])

const isAllowedGuideFile = (file: File) => {
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
  return GUIDE_EXTENSIONS.has(ext)
}

const DocenteCrearActividad: React.FC = () => {
  const { curso, raId } = useParams<{curso: string; raId: string}>()
  const navigate = useNavigate()
  const { state } = useSession()
  const [form, setForm] = useState({ nombre: '', tipo: '1', pctRA: '', desc: '', cierre: '' })
  const [saving, setSaving] = useState(false)
  const [tipos, setTipos] = useState<{id:string; descripcion:string}[]>([])
  const [allIndicators, setAllIndicators] = useState<{ id: string; descripcion: string; porcentaje: number }[]>([])
  const [selIndicators, setSelIndicators] = useState<string[]>([])
  const [raVal, setRaVal] = useState<{ actividades: { suma: number; ok: boolean; faltante: number }; indicadores: { suma: number; ok: boolean; faltante: number } } | null>(null)
  // Multi-RA support
  const [ras, setRas] = useState<{ id: string; titulo: string }[]>([])
  const [selectedRAs, setSelectedRAs] = useState<string[]>([])
  const [raPct, setRaPct] = useState<Record<string, string>>({})
  const [raTotals, setRaTotals] = useState<Record<string, number>>({})
  const [guideFile, setGuideFile] = useState<File | null>(null)

  const pctRANum = Number(form.pctRA)
  const sumaActActual = raVal?.actividades?.suma ?? null
  const nuevoTotalAct = sumaActActual != null && !Number.isNaN(pctRANum) ? Number(sumaActActual) + Number(pctRANum) : null
  const excedeAct = nuevoTotalAct != null ? nuevoTotalAct > 100 : false
  // Reglas: fecha requerida, aporte > 0 para cada RA seleccionado, y al menos un indicador
  const aporteFor = (rid: string | undefined) => Number(rid ? (raPct[rid] ?? form.pctRA) : form.pctRA)
  const hasName = Boolean(form.nombre.trim())
  const hasDate = Boolean(form.cierre && String(form.cierre).trim())
  const hasIndicators = selIndicators.length > 0
  const allAportesPositive = selectedRAs.length > 0 ? selectedRAs.every((rid) => {
    const v = aporteFor(rid)
    return Number.isFinite(v) && v > 0
  }) : false

  // Mantener una referencia al valor actual de pctRA para inicializaciones sin añadir a deps
  const pctRARef = useRef(form.pctRA)
  useEffect(() => { pctRARef.current = form.pctRA }, [form.pctRA])

  // Cargar tipos e información dependiente del RA
  useEffect(() => {
    // Cargar tipos de actividad y fijar uno válido por defecto
    getTiposActividad()
      .then((rows) => {
        setTipos(rows)
        if (rows.length > 0) {
          const firstId = String(rows[0].id)
          setForm((f) => ({ ...f, tipo: rows.some(t => String(t.id) === f.tipo) ? f.tipo : firstId }))
        }
      })
      .catch(() => setTipos([]))

    if (raId) {
      getIndicatorsByRA(raId).then(setAllIndicators).catch(()=>setAllIndicators([]))
      getRAValidation(raId).then(setRaVal).catch(()=>setRaVal(null))
    }
  }, [raId])

  // Cargar RAs del curso para permitir selección múltiple
  useEffect(() => {
    if (!curso) return
    getRAsByCourse(curso)
      .then((rows) => {
        const mapped = rows.map(r => ({ id: String(r.id), titulo: r.titulo || `RA ${r.id}` }))
        setRas(mapped)
        // Inicializar selección con el RA actual o el primero
        const initial = raId ? [String(raId)] : (mapped.length ? [mapped[0].id] : [])
        setSelectedRAs(initial)
        if (initial[0]) setRaPct((m) => ({ ...m, [initial[0]]: pctRARef.current }))
      })
      .catch(() => setRas([]))
  }, [curso, raId])

  // Cargar totales actuales de actividades por cada RA seleccionado
  useEffect(() => {
    const run = async () => {
      const entries = await Promise.all(selectedRAs.map(async (rid) => {
        try {
          const v = await getRAValidation(rid)
          return [rid, Number(v?.actividades?.suma ?? 0)] as const
        } catch {
          return [rid, 0] as const
        }
      }))
      setRaTotals(Object.fromEntries(entries))
    }
    if (selectedRAs.length) run()
  }, [selectedRAs])

  const fmtPct = (n: number | undefined | null) => {
    const v = typeof n === 'number' && isFinite(n) ? n : 0
    const c = Math.max(0, Math.min(100, v))
    return c.toFixed(2)
  }

  const submit = async () => {
    if (!raId || saving) return
    // Validaciones hard antes de chequear acumulados
  if (!hasName) { Alert.toast.error('Debes ingresar el nombre de la actividad.'); return }
  if (!hasDate) { Alert.toast.error('Debes definir la fecha límite de entrega.'); return }
  if (allIndicators.length === 0) { Alert.toast.error('Este RA no tiene indicadores definidos. No puedes crear la actividad sin indicadores.'); return }
  if (!hasIndicators) { Alert.toast.error('Debes seleccionar al menos un indicador del RA.'); return }
    if (!allAportesPositive) { Alert.toast.error('El aporte al RA (%) debe ser mayor que 0 para cada RA seleccionado.'); return }
    // Esta vista maneja indicadores del RA actual; para multi-RA usar la vista por curso.
    if (selectedRAs.some((rid) => rid !== String(raId))) {
      Alert.toast.error('Para crear actividades en múltiples RA usa "Nueva actividad" desde el curso (permite asignar indicadores por cada RA).')
      return
    }
    // Validación rápida de fecha: no permitir fecha de cierre en el pasado
    const todayStr = new Date().toISOString().slice(0,10)
    if (form.cierre < todayStr) {
      Alert.toast.error(`La fecha límite no puede ser anterior a hoy (${todayStr}).`)
      return
    }
    // Pre-chequeo: cada RA seleccionado no debe EXCEDER 100% en el aporte total al RA (usa porcentaje_ra_actividad)
    try {
      const validations = await Promise.all(
        selectedRAs.map(async (rid) => {
          try {
            const v = await getRAValidation(rid)
            return { rid, suma: Number(v?.actividades?.suma ?? 0) }
          } catch {
            return { rid, suma: 0 }
          }
        })
      )
      const failing = validations.find((v) => {
        const aporte = Number(raPct[v.rid] ?? form.pctRA)
        return !Number.isNaN(aporte) && (v.suma + aporte) > 100 + 1e-6
      })
      if (failing) {
        const aporte = Number(raPct[failing.rid] ?? form.pctRA) || 0
        const nuevo = failing.suma + aporte
        Alert.toast.error(`El RA ${failing.rid} quedaría en ${nuevo.toFixed(2)}%. No puede exceder 100%. Ajusta el "Aporte al RA (%)".`)
        return
      }
    } catch {
      // Si el pre-chequeo falla por red, continuamos y dejaremos que el backend valide
    }

    const confirmed = await Alert.confirmCreate('actividad')
    if (!confirmed) return

    setSaving(true)
    try {
      await createActivityForRA(raId, {
        nombre_actividad: form.nombre.trim(),
        id_tipo_actividad: Number(form.tipo),
        porcentaje_ra_actividad: Number(raPct[raId] ?? form.pctRA),
        descripcion: form.desc || undefined,
        fecha_cierre: form.cierre || undefined,
        indicadores: selIndicators.map(id => Number(id)),
      })

      if (guideFile && curso) {
        try {
          await uploadRecurso(curso, guideFile, `Guia - ${form.nombre.trim()}`)
          await Alert.success('Actividad creada con éxito y guía adjunta.')
        } catch {
          await Alert.warning('La actividad se creó, pero no se pudo adjuntar la guía. Puedes subirla luego en Recursos.')
        }
      } else {
        await Alert.success('Actividad creada (indicadores asignados)')
      }
      navigate(`/docente/${curso}/ras`)
    } catch (err: unknown) {
      // Extraer mejor el mensaje de error de forma segura
      let msg: string = 'No se pudo crear la actividad'
      const res = (err as { response?: { data?: unknown } })?.response?.data
      if (typeof res === 'string') msg = res
      else if (res && typeof res === 'object') {
        const rec = res as Record<string, unknown>
        if (typeof rec.message === 'string') msg = rec.message
        else if (typeof rec.detail === 'string') msg = rec.detail
        else msg = JSON.stringify(rec)
      } else if (err && typeof err === 'object' && 'message' in (err as Record<string, unknown>)) {
        const eMsg = (err as Record<string, unknown>).message
        if (typeof eMsg === 'string') msg = eMsg
      }
      Alert.toast.error(msg)
    } finally {
      setSaving(false)
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
            if(k==='crear' && curso) navigate(`/docente/${curso}/actividades/nueva`)
            if(k==='calificar' && curso) navigate(`/docente/${curso}/calificar`)
            if(k==='recursos' && curso) navigate(`/docente/${curso}/recursos`)
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
          <ModuleBreadcrumbs
            items={[
              { label: 'Inicio Docente', to: '/docente/inicio' },
              { label: 'Cursos', to: '/docente/cursos' },
              { label: 'RA/Actividades', to: `/docente/${curso}/ras` },
              { label: `RA ${raId ?? ''}` },
            ]}
            onNavigate={navigate}
          />
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="content-title">
              <i className="bi bi-plus-circle-fill text-success me-2"></i>
              Crear actividad · Curso {curso} · RA {raId}
            </div>
            {state.role === 'coordinador' && (
              <button 
                className="btn btn-outline-primary shadow-sm"
                onClick={() => navigate('/coordinador/materias')}
                title="Volver a la vista del coordinador"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Regresar a Coordinador
              </button>
            )}
          </div>
          {raVal && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className={`alert shadow-sm ${raVal.actividades.ok ? 'alert-success' : 'alert-warning'} d-flex align-items-center`}>
                  <i className={`bi ${raVal.actividades.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
                  <div className="flex-grow-1">
                    <div>Actividades actuales: <strong>{raVal.actividades.suma.toFixed(2)}%</strong> · {raVal.actividades.ok ? '¡Listo 100%!' : `Faltan ${raVal.actividades.faltante.toFixed(2)}%`}</div>
                    {(() => {
                      const suma = raVal.actividades.suma
                      const variant = suma > 100 ? 'prog-danger' : (raVal.actividades.ok ? 'prog-success' : 'prog-warning')
                      return (
                        <progress
                          className={`uv-progress mt-2 ${variant}`}
                          value={Math.min(100, Math.max(0, suma))}
                          max={100}
                          aria-label="Progreso actividades a 100%"
                          title={`Progreso actividades: ${suma.toFixed(0)}%`}
                        />
                      )
                    })()}
                    {nuevoTotalAct != null && !Number.isNaN(nuevoTotalAct) && (
                      (() => {
                        const variant = excedeAct ? 'prog-danger' : (Math.abs(nuevoTotalAct - 100) < 1e-9 ? 'prog-success' : 'prog-warning')
                        return (
                          <progress
                            className={`uv-progress mt-1 ${variant}`}
                            value={Math.min(100, Math.max(0, nuevoTotalAct))}
                            max={100}
                            aria-label="Nuevo total con esta actividad"
                            title={`Nuevo total: ${nuevoTotalAct.toFixed(0)}%`}
                          />
                        )
                      })()
                    )}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                {/* Bloque de indicadores eliminado: sin texto ni barras por requerimiento */}
              </div>
            </div>
          )}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="ra-small d-block mb-1" htmlFor="nombreAct">Nombre de la actividad</label>
              <input
                id="nombreAct"
                className="form-control"
                placeholder="Ej. Proyecto Final"
                value={form.nombre}
                onChange={e=>setForm(f=>({...f, nombre:e.target.value}))}
                required
                title="Nombre visible para los estudiantes"
                aria-describedby="nombreHelp"
              />
              <div id="nombreHelp" className="form-text">Cómo se mostrará la actividad en el curso.</div>
            </div>

            {/* Campo 'Peso de la actividad (%)' eliminado */}

            <div className="col-md-3">
              <label className="ra-small d-block mb-1" htmlFor="pctRA">Aporte al RA (%)</label>
              <input
                id="pctRA"
                className="form-control"
                placeholder="Ej. 40"
                type="number"
                step="0.01"
                min={0.01}
                max={100}
                value={form.pctRA}
                onChange={e=>setForm(f=>({...f, pctRA:e.target.value}))}
                title="Porcentaje que esta actividad aporta al resultado de aprendizaje (0–100). Debe ser mayor que 0."
                aria-describedby="pctRAHelp"
              />
              <div id="pctRAHelp" className="form-text">
                Obligatorio. Debe ser mayor que 0. La suma de actividades del RA no debe exceder 100%.
                {raVal && (
                  <>
                    <br/>
                    {nuevoTotalAct != null && !Number.isNaN(nuevoTotalAct) ? (
                      excedeAct ? (
                        <span className="text-danger">Se excede el 100%: {nuevoTotalAct.toFixed(2)}%.</span>
                      ) : (
                        <span>
                          Nuevo total con esta actividad: <strong>{nuevoTotalAct.toFixed(2)}%</strong>{' '}
                          {Math.abs(nuevoTotalAct - 100) < 1e-9 ? '· ¡Listo 100%!' : `· Faltaría ${(100 - nuevoTotalAct).toFixed(2)}%`}
                        </span>
                      )
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Selección de múltiples RAs del curso (opcional) */}
            <div className="col-12">
              <div className="fw-bold mb-3 d-flex align-items-center">
                <i className="bi bi-diagram-3-fill text-primary me-2 fs-5"></i>
                Aplicar también a otros RAs del curso
              </div>
              {ras.length <= 1 ? (
                <div className="alert alert-info shadow-sm d-flex align-items-center">
                  <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                  No hay más RAs en este curso.
                </div>
              ) : (
                <div className="row g-2">
                  {ras.map(r => (
                    <div key={r.id} className="col-md-6 d-flex align-items-center gap-2">
                      {(() => {
                        const selected = selectedRAs.includes(r.id)
                        return (
                          <button
                            type="button"
                            className={`btn btn-sm ${selected ? 'btn-danger' : 'btn-outline-success'}`}
                            onClick={async () => {
                              if (!selected) {
                                let suma = Number(raTotals[r.id] ?? NaN)
                                if (!Number.isFinite(suma)) {
                                  try {
                                    const v = await getRAValidation(r.id)
                                    suma = Number(v?.actividades?.suma ?? 0)
                                    setRaTotals((m) => ({ ...m, [r.id]: suma }))
                                  } catch {
                                    suma = 0
                                  }
                                }
                                if (suma >= 100 - 1e-6) {
                                  Alert.toast.warning(`No puedes añadir ${r.titulo}: este RA ya alcanzó 100% en actividades.`)
                                  return
                                }
                              }
                              setSelectedRAs(curr => selected ? curr.filter(x => x !== r.id) : Array.from(new Set([...curr, r.id])))
                              if (!selected && !raPct[r.id]) setRaPct(m => ({ ...m, [r.id]: form.pctRA }))
                            }}
                          >
                            {selected ? 'Quitar' : 'Añadir'}
                          </button>
                        )
                      })()}
                      <span className="small">{r.titulo}</span>
                      <input
                        className="form-control form-control-sm w-110px"
                        type="number"
                        min={0.01}
                        max={100}
                        step="0.01"
                        aria-label={`Aporte al ${r.titulo} (%)`}
                        value={raPct[r.id] ?? ''}
                        onChange={(e)=> setRaPct(m => ({ ...m, [r.id]: e.target.value }))}
                        disabled={!selectedRAs.includes(r.id)}
                        placeholder="% RA"
                        title="Porcentaje que esta actividad aporta al RA"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="form-text">Selecciona otros RAs y define el porcentaje de aporte para cada uno.</div>
              <div className="form-text text-warning">Regla: las actividades de cada RA no deben exceder 100% (se pueden ir sumando en varias actividades).</div>

              {/* Vista previa de porcentajes por RA seleccionado */}
              {selectedRAs.length > 0 && (
                <div className="table-responsive mt-3 shadow-sm border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-bold"><i className="bi bi-bullseye me-1"></i>RA</th>
                        <th className="w-220px fw-bold"><i className="bi bi-graph-up me-1"></i>Total actual</th>
                        <th className="w-160px fw-bold"><i className="bi bi-percent me-1"></i>Aporte (%)</th>
                        <th className="w-220px fw-bold"><i className="bi bi-calculator me-1"></i>Quedaría en</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRAs.map((rid) => {
                        const ra = ras.find(x => x.id === rid)
                        const suma = Number(raTotals[rid] ?? 0)
                        const aporte = Number(raPct[rid] ?? form.pctRA) || 0
                        const quedariaRaw = suma + (isNaN(aporte) ? 0 : aporte)
                        const quedaria = Math.max(0, Math.min(100, quedariaRaw))
                        const excede = quedaria > 100 + 1e-6
                        return (
                          <tr key={rid} className={excede ? 'table-danger' : ''}>
                            <td>{ra?.titulo ?? `RA ${rid}`}</td>
                            <td>
                              <progress
                                className="uv-progress"
                                value={Math.min(100, Math.max(0, suma))}
                                max={100}
                                aria-label="Progreso actividades RA"
                                title={`Progreso: ${fmtPct(suma)}%`}
                              />
                              <div className="ra-small text-muted text-end">{fmtPct(suma)}%</div>
                            </td>
                            <td>
                              <div className="ra-small">{fmtPct(aporte)}%</div>
                            </td>
                            <td>
                              {(() => {
                                const variant = excede ? 'prog-danger' : (Math.abs(quedaria - 100) < 1e-9 ? 'prog-success' : 'prog-warning')
                                return (
                                  <progress
                                    className={`uv-progress ${variant}`}
                                    value={Math.min(100, Math.max(0, quedaria))}
                                    max={100}
                                    aria-label="Progreso actividades RA con nueva actividad"
                                    title={`Quedaría en: ${fmtPct(quedaria)}%`}
                                  />
                                )
                              })()}
                              <div className="ra-small text-muted text-end">{fmtPct(quedaria)}%</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="col-md-4">
              <label className="ra-small d-block mb-1" htmlFor="tipoAct">Tipo de actividad</label>
              <select
                id="tipoAct"
                className="form-select"
                value={form.tipo}
                onChange={e=>setForm(f=>({...f, tipo:e.target.value}))}
                title="Clasificación de la actividad (examen, taller, proyecto, etc.)"
                aria-describedby="tipoHelp"
              >
                {tipos.length===0
                  ? <option value="1">Tipo 1</option>
                  : tipos.map(t => (
                      <option key={t.id} value={t.id}>{t.descripcion}</option>
                    ))
                }
              </select>
              <div id="tipoHelp" className="form-text">Selecciona la categoría que mejor describa la actividad.</div>
            </div>

            <div className="col-md-4">
              <label className="ra-small d-block mb-1" htmlFor="fechaCierre" title="Fecha a partir de la cual no se aceptan entregas">Fecha límite de entrega</label>
              <input
                id="fechaCierre"
                className="form-control"
                type="date"
                placeholder="AAAA-MM-DD"
                min={new Date().toISOString().slice(0,10)}
                value={form.cierre}
                onChange={e=>setForm(f=>({...f, cierre:e.target.value}))}
                title="Fecha a partir de la cual no se aceptan entregas"
                aria-describedby="fechaHelp"
              />
              <div id="fechaHelp" className="form-text">Después de esta fecha no se reciben entregas.</div>
            </div>

            <div className="col-12">
              <label className="ra-small d-block mb-1" htmlFor="descAct">Descripción (opcional)</label>
              <textarea
                id="descAct"
                className="form-control"
                placeholder="Instrucciones, criterios de evaluación, recursos, etc."
                value={form.desc}
                onChange={e=>setForm(f=>({...f, desc:e.target.value}))}
                title="Información adicional visible para los estudiantes"
                aria-describedby="descHelp"
              />
              <div id="descHelp" className="form-text">Añade instrucciones y criterios que ayuden al estudiante.</div>
            </div>

            <div className="col-md-8">
              <label className="ra-small d-block mb-1" htmlFor="guiaActividad">Guía de la actividad (opcional)</label>
              <input
                id="guiaActividad"
                className="form-control"
                type="file"
                accept=".pdf,.docx,.xlsx,.pptx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (!file) {
                    setGuideFile(null)
                    return
                  }
                  if (!isAllowedGuideFile(file)) {
                    Alert.toast.warning('Formato no permitido. Solo se aceptan: PDF, DOCX, XLSX, PPTX.')
                    e.currentTarget.value = ''
                    setGuideFile(null)
                    return
                  }
                  setGuideFile(file)
                }}
              />
              <div className="form-text">Formatos permitidos: PDF, DOCX, XLSX, PPTX.</div>
            </div>

              {/* Checklist de indicadores de logro asociados al RA */}
              <div className="col-12">
                <div className="fw-bold mb-3 d-flex align-items-center">
                  <i className="bi bi-check2-square text-success me-2 fs-5"></i>
                  Indicadores de logro vinculados
                </div>
                {allIndicators.length === 0 ? (
                  <div className="alert alert-info shadow-sm d-flex align-items-center">
                    <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                    No hay indicadores definidos para este RA.
                  </div>
                ) : (
                  <div className="row">
                    {allIndicators.map((ind) => (
                      <div key={ind.id} className="col-md-6">
                        {(() => {
                          const selected = selIndicators.includes(ind.id)
                          return (
                            <div className="d-flex align-items-center gap-2 border rounded p-2 bg-white">
                              <button
                                type="button"
                                className={`btn btn-sm ${selected ? 'btn-danger' : 'btn-outline-success'}`}
                                onClick={() => {
                                  setSelIndicators((curr) => selected ? curr.filter((x) => x !== ind.id) : [...curr, ind.id])
                                }}
                              >
                                {selected ? 'Quitar' : 'Añadir'}
                              </button>
                              <span>{ind.descripcion}</span>
                            </div>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                )}
                {allIndicators.length > 0 && selIndicators.length === 0 && (
                  <div className="small text-danger mt-2 fw-semibold">
                    Falta añadir al menos un indicador para poder crear la actividad.
                  </div>
                )}
                <div className="form-text">Puedes asignar esta actividad a uno o varios indicadores del RA.</div>
              </div>

            <div className="col-12 d-flex gap-2 mt-3">
              <button className="btn btn-danger shadow" disabled={saving} onClick={submit}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    Guardando…
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Crear actividad
                  </>
                )}
              </button>
              <button className="btn btn-outline-secondary shadow-sm" onClick={()=>navigate(-1)}>
                <i className="bi bi-x-circle me-2"></i>
                Cancelar
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
export default DocenteCrearActividad