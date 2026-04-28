import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import { Alert } from '@/utils/alert'
import { useSession } from '@/state/SessionContext'
import { createActivityMulti, getRAsByCourse, getRAValidation, getTiposActividad, getIndicatorsByRA, uploadRecurso } from '@/services/api'
import type { Indicator } from '@/types'

const GUIDE_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx', '.pptx'])

const isAllowedGuideFile = (file: File) => {
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
  return GUIDE_EXTENSIONS.has(ext)
}

const NuevaActividadCurso: React.FC = () => {
  const { curso } = useParams<{ curso: string }>()
  const navigate = useNavigate()
  const { state } = useSession()

  const [form, setForm] = useState({ nombre: '', tipo: '', desc: '', cierre: '' })
  const [tipos, setTipos] = useState<{ id: string; descripcion: string }[]>([])
  const [ras, setRas] = useState<{ id: string; titulo: string }[]>([])
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [aporteRA, setAporteRA] = useState<Record<string, string>>({})
  const [totals, setTotals] = useState<Record<string, number>>({}) // Almacena el conteo de actividades
  const [actPercentages, setActPercentages] = useState<Record<string, number>>({}) // Almacena el porcentaje sumado
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [raIndMap, setRaIndMap] = useState<Record<string, Indicator[]>>({})
  const [raIndSel, setRaIndSel] = useState<Record<string, (string | number)[]>>({})
  const [raIndFilter, setRaIndFilter] = useState<Record<string, string>>({})
  const [guideFile, setGuideFile] = useState<File | null>(null)

  const fmtPct = (n: number | undefined | null) => {
    const v = typeof n === 'number' && isFinite(n) ? n : 0
    const c = Math.max(0, Math.min(100, v))
    return c.toFixed(2)
  }

  const canSave = Boolean(
    form.nombre.trim() &&
    tipos.length > 0 && form.tipo &&
    Object.keys(sel).some((k) => sel[k])
  )

  useEffect(() => {
    getTiposActividad().then((rows) => {
      setTipos(rows)
      const first = rows[0]?.id ? String(rows[0].id) : ''
      setForm((f) => ({ ...f, tipo: f.tipo || first }))
    }).catch(() => setTipos([]))
  }, [])

  useEffect(() => {
    if (!curso) return
    getRAsByCourse(curso).then((rows) => {
      const mapped = rows.map((r) => ({ id: String(r.id), titulo: r.titulo || `RA ${r.id}` }))
      setRas(mapped)
      // default: select none
      const nextSel: Record<string, boolean> = {}
      const nextAporte: Record<string, string> = {}
      const nextOpen: Record<string, boolean> = {}
      mapped.forEach((r) => { nextSel[r.id] = false; nextAporte[r.id] = '' })
      setSel(nextSel)
      setAporteRA(nextAporte)
      setOpen(nextOpen)
    }).catch(() => setRas([]))
  }, [curso])

  // Load current actividad totals per RA to pre-validate <= 100
  useEffect(() => {
    const run = async () => {
      const entries = await Promise.all(ras.map(async (r) => {
        try {
          const v = await getRAValidation(r.id)
          return [r.id, Number(v?.actividades?.count ?? 0), Number(v?.actividades?.suma ?? 0)] as const
        } catch {
          return [r.id, 0, 0] as const
        }
      }))
      setTotals(Object.fromEntries(entries.map(([rid, count]) => [rid, count])))
      setActPercentages(Object.fromEntries(entries.map(([rid, , suma]) => [rid, suma])))
    }
    if (ras.length) run()
  }, [ras])

  const selectedIds = useMemo(() => ras.filter((r) => sel[r.id]).map((r) => r.id), [ras, sel])

  // Toggle indicators panel and lazy-load indicators for an RA when needed
  const toggleIndicators = async (rid: string) => {
    setOpen((o) => ({ ...o, [rid]: !o[rid] }))
    if (!raIndMap[rid]) {
      try {
        const inds = await getIndicatorsByRA(rid)
        setRaIndMap((m) => ({ ...m, [rid]: inds }))
        if (!raIndSel[rid]) setRaIndSel((s) => ({ ...s, [rid]: [] }))
      } catch {
        setRaIndMap((m) => ({ ...m, [rid]: [] }))
      }
    }
  }

  const submit = async () => {
    if (!canSave || saving || !curso) return

    // Validar fecha
    if (form.cierre) {
      const today = new Date()
      const cierreDate = new Date(form.cierre)
      if (cierreDate < today) {
        Alert.toast.error(`La fecha límite no puede ser anterior a hoy (${today.toISOString().slice(0, 10)}).`)
        return
      }
    }

    // Precheck: cada RA no puede pasar de 100% en el aporte total al RA
    try {
      const failing = selectedIds.find((rid) => (Number(actPercentages[rid] ?? 0) + Number(aporteRA[rid] || 0)) > 100 + 1e-6)
      if (failing) {
        const nuevo = Number(actPercentages[failing] ?? 0) + Number(aporteRA[failing] || 0)
        Alert.toast.error(`El RA ${failing} quedaría en ${nuevo.toFixed(2)}%. No puede exceder 100%. Ajusta el "Aporte al RA (%)".`)
        return
      }
    } catch { /* ignore precheck errors */ }

    // Precheck: cada RA seleccionado debe tener al menos un indicador válido.
    for (const rid of selectedIds) {
      let available = raIndMap[rid]
      if (!available) {
        try {
          available = await getIndicatorsByRA(rid)
          setRaIndMap((m) => ({ ...m, [rid]: available || [] }))
        } catch {
          available = []
          setRaIndMap((m) => ({ ...m, [rid]: [] }))
        }
      }

      if (!available || available.length === 0) {
        const raTitle = ras.find((r) => r.id === rid)?.titulo || `RA ${rid}`
        Alert.toast.error(`${raTitle} no tiene indicadores definidos. No se puede crear la actividad sin indicadores.`)
        return
      }

      const allowed = new Set((available || []).map((ind) => String(ind.id)))
      const selected = (raIndSel[rid] || []).map((id) => String(id)).filter((id) => allowed.has(id))
      if (selected.length === 0) {
        const raTitle = ras.find((r) => r.id === rid)?.titulo || `RA ${rid}`
        Alert.toast.error(`Debes asignar al menos un indicador para ${raTitle}.`)
        return
      }
    }

    const confirmed = await Alert.confirmCreate('actividad')
    if (!confirmed) return

    setSaving(true)
    try {
      const rasPayload = selectedIds.map((rid) => {
        const allowed = new Set((raIndMap[rid] || []).map((ind) => String(ind.id)))
        const indicadores = (raIndSel[rid] || [])
          .map((id) => String(id))
          .filter((id) => allowed.has(id))
          .map((id) => Number(id))

        return {
          ra_id: Number(rid),
          porcentaje_ra_actividad: Number(aporteRA[rid] || 0) || 0,
          indicadores,
        }
      })
      await createActivityMulti({
        nombre_actividad: form.nombre.trim(),
        id_tipo_actividad: Number(form.tipo),
        descripcion: form.desc || undefined,
        fecha_cierre: form.cierre || undefined,
        ras: rasPayload,
      })
      if (guideFile) {
        try {
          await uploadRecurso(curso, guideFile, `Guia - ${form.nombre.trim()}`)
          await Alert.success('Actividad creada con éxito y guía adjunta.')
        } catch {
          await Alert.warning('La actividad se creó, pero no se pudo adjuntar la guía. Puedes subirla luego en Recursos.')
        }
      } else {
        await Alert.success('Actividad creada con éxito')
      }
      navigate(`/docente/${curso}/ras`)
    } catch (err: unknown) {
      let msg: string = 'No se pudo crear la actividad'
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (typeof data === 'string') msg = data
      else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>
        msg = String(obj.message ?? obj.detail ?? msg)
      } else if ((err as Error)?.message) msg = String((err as Error).message)
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
          onClick={(k) => {
            if (k === 'inicio') navigate('/docente/inicio')
            if (k === 'cursos') navigate('/docente/cursos')
            if (k === 'crear' && curso) navigate(`/docente/${curso}/actividades/nueva`)
            if (k === 'calificar' && curso) navigate(`/docente/${curso}/calificar`)
            if (k === 'recursos' && curso) navigate(`/docente/${curso}/recursos`)
            if (k === 'volver-coordinador') navigate('/coordinador/asignaturas')
          }}
          items={[
            { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
            { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
            { key: 'crear', icon: 'bi-pencil-square', title: 'RA/Actividades' },
            { key: 'calificar', icon: 'bi-check2-square', title: 'Calificar' },
            { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' },
            ...(state.role === 'coordinador' ? [{ key: 'volver-coordinador', icon: 'bi-arrow-left-circle', title: 'Vista coordinador' }] : []),
          ]}
        />
        <main className="dash-content">
          <ModuleBreadcrumbs
            items={[
              { label: 'Inicio Docente', to: '/docente/inicio' },
              { label: 'Cursos', to: '/docente/cursos' },
              { label: 'RA/Actividades', to: `/docente/${curso}/ras` },
              { label: 'Nueva actividad' },
            ]}
            onNavigate={navigate}
          />
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="content-title">
              <i className="bi bi-file-earmark-plus-fill text-success me-2"></i>
              Nueva actividad · Curso {curso}
            </div>
            {state.role === 'coordinador' && (
              <button 
                className="btn btn-outline-primary shadow-sm"
                onClick={() => navigate('/coordinador/asignaturas')}
                title="Volver a la vista del coordinador"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Regresar a Coordinador
              </button>
            )}
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="ra-small d-block mb-1" htmlFor="nombreAct">Nombre de la actividad</label>
              <input
                id="nombreAct"
                className="form-control"
                placeholder="Ej. Taller 1"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            {/* Campo de peso interno de la actividad eliminado */}
            <div className="col-md-3">
              <label className="ra-small d-block mb-1" htmlFor="tipoAct">Tipo de actividad</label>
              <select
                id="tipoAct"
                className="form-select"
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              >
                {tipos.length === 0 ? (
                  <option value="">Selecciona…</option>
                ) : (
                  tipos.map(t => <option key={t.id} value={t.id}>{t.descripcion}</option>)
                )}
              </select>
            </div>

            <div className="col-md-4">
              <label className="ra-small d-block mb-1" htmlFor="fechaCierre">Fecha límite</label>
              <input
                id="fechaCierre"
                className="form-control"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.cierre}
                onChange={e => setForm(f => ({ ...f, cierre: e.target.value }))}
              />
            </div>
            <div className="col-12">
              <label className="ra-small d-block mb-1" htmlFor="descAct">Descripción (opcional)</label>
              <textarea
                id="descAct"
                className="form-control"
                placeholder="Instrucciones, criterios, etc."
                value={form.desc}
                onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
              ></textarea>
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

            <div className="col-12">
              <div className="fw-bold mb-3 d-flex align-items-center">
                <i className="bi bi-diagram-3-fill text-primary me-2 fs-5"></i>
                Aplicar a estos RAs del curso
              </div>
              {ras.length === 0 ? (
                <div className="alert alert-info shadow-sm d-flex align-items-center">
                  <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                  Este curso no tiene RAs.
                </div>
              ) : (
                <div className="table-responsive shadow-sm border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="w-120px"><span className="visually-hidden">Seleccionar RA</span>Acción</th>
                        <th className="fw-bold"><i className="bi bi-bullseye me-1"></i>RA</th>
                        <th className="w-160px fw-bold"><i className="bi bi-percent me-1"></i>Aporte al RA (%)</th>
                        <th className="w-220px fw-bold"><i className="bi bi-graph-up me-1"></i>Total actividades actual</th>
                        <th className="w-220px fw-bold"><i className="bi bi-calculator me-1"></i>Quedaría en</th>
                        <th className="w-160px fw-bold"><i className="bi bi-check2-square me-1"></i>Indicadores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ras.map(r => {
                        const checked = !!sel[r.id]
                        const actCount = Number(totals[r.id] ?? 0)
                        const suma = Number(actPercentages[r.id] ?? 0)
                        const aporte = Number(aporteRA[r.id] || 0)
                        const availableIndicators = raIndMap[r.id] || []
                        const allowedIndicators = new Set(availableIndicators.map((ind) => String(ind.id)))
                        const selectedIndicatorCount = (raIndSel[r.id] || []).map((id) => String(id)).filter((id) => allowedIndicators.has(id)).length
                        const missingIndicator = checked && availableIndicators.length > 0 && selectedIndicatorCount === 0
                        const noIndicatorsDefined = checked && availableIndicators.length === 0
                        const quedariaRaw = !Number.isNaN(aporte) ? suma + aporte : suma
                        const quedaria = Math.max(0, Math.min(100, quedariaRaw))
                        const excede = quedaria > 100 + 1e-6
                        return (
                          <React.Fragment key={r.id}>
                            <tr className={excede && checked ? 'table-danger' : ''}>
                              <td>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${checked ? 'btn-danger' : 'btn-outline-success'}`}
                                  aria-label={`${checked ? 'Quitar' : 'Añadir'} ${r.titulo}`}
                                  onClick={async () => {
                                    const on = !checked
                                    if (on && suma >= 100 - 1e-6) {
                                      Alert.toast.warning(`No puedes añadir ${r.titulo}: este RA ya alcanzó 100% en actividades.`)
                                      return
                                    }
                                    setSel(s => ({ ...s, [r.id]: on }))
                                    if (on && !raIndMap[r.id]) {
                                      try {
                                        const inds = await getIndicatorsByRA(r.id)
                                        setRaIndMap((m) => ({ ...m, [r.id]: inds }))
                                        if (!raIndSel[r.id]) setRaIndSel((s) => ({ ...s, [r.id]: [] }))
                                      } catch {
                                        setRaIndMap((m) => ({ ...m, [r.id]: [] }))
                                      }
                                    }
                                  }}
                                >
                                  {checked ? 'Quitar' : 'Añadir'}
                                </button>
                              </td>
                              <td>{r.titulo}</td>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  max={100}
                                  placeholder="% RA"
                                  value={aporteRA[r.id] ?? ''}
                                  onChange={(e) => setAporteRA(m => ({ ...m, [r.id]: e.target.value }))}
                                  disabled={!checked}
                                />
                              </td>
                              <td>
                                <div className="ra-small text-dark fw-bold">{actCount} actividades</div>
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
                              <td>
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  disabled={!checked}
                                  title="Asignar indicadores de logro para este RA"
                                  onClick={() => toggleIndicators(r.id)}
                                >
                                  {open[r.id] ? 'Ocultar' : 'Indicadores'}
                                </button>
                                {missingIndicator && (
                                  <div className="small text-danger mt-1 fw-semibold">Falta añadir un indicador</div>
                                )}
                                {noIndicatorsDefined && (
                                  <div className="small text-danger mt-1 fw-semibold">RA sin indicadores definidos</div>
                                )}
                                {checked && !missingIndicator && !noIndicatorsDefined && (
                                  <div className="small text-success mt-1 fw-semibold">Indicadores: {selectedIndicatorCount}</div>
                                )}
                              </td>
                            </tr>
                            {open[r.id] && (
                              <tr>
                                <td colSpan={6}>
                                  {(raIndMap[r.id] && raIndMap[r.id].length > 0) ? (
                                    <div className="p-2 border rounded bg-light-subtle">
                                      <div className="fw-semibold mb-2">Indicadores de logro · {r.titulo}</div>
                                      <div className="row g-3 align-items-start">
                                        <div className="col-lg-8">
                                          <div className="input-group input-group-sm mb-2">
                                            <span className="input-group-text"><i className="bi bi-search" aria-hidden="true"></i></span>
                                            <input
                                              type="text"
                                              className="form-control"
                                              placeholder="Filtrar indicadores..."
                                              value={raIndFilter[r.id] ?? ''}
                                              onChange={(e) => setRaIndFilter(f => ({ ...f, [r.id]: e.target.value }))}
                                              aria-label="Filtrar indicadores"
                                            />
                                          </div>
                                          <div className="border rounded ra-scroll-260">
                                            {(() => {
                                              const term = (raIndFilter[r.id] || '').toLowerCase()
                                              const items = term
                                                ? raIndMap[r.id].filter(ind => ind.descripcion.toLowerCase().includes(term))
                                                : raIndMap[r.id]
                                              if (items.length === 0) return <div className="p-2 text-muted">Sin resultados.</div>
                                              return (
                                                <div className="p-2 d-flex flex-wrap gap-2">
                                                  {items.map((ind) => {
                                                    const selected = (raIndSel[r.id] || []).includes(ind.id)
                                                    return (
                                                      <div key={ind.id} className="d-flex align-items-center gap-2 border rounded p-2 bg-white">
                                                        <button
                                                          type="button"
                                                          className={`btn btn-sm ${selected ? 'btn-danger' : 'btn-outline-success'}`}
                                                          onClick={() => {
                                                            setRaIndSel((s) => {
                                                              const curr = new Set(s[r.id] || [])
                                                              if (selected) curr.delete(ind.id)
                                                              else curr.add(ind.id)
                                                              return { ...s, [r.id]: Array.from(curr) }
                                                            })
                                                          }}
                                                        >
                                                          {selected ? 'Quitar' : 'Añadir'}
                                                        </button>
                                                        <span className="small">{ind.descripcion}</span>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              )
                                            })()}
                                          </div>
                                        </div>
                                        <div className="col-lg-4">
                                          <div className="p-2 border rounded bg-white">
                                            {(() => {
                                              const total = raIndMap[r.id].length
                                              const curr = new Set(raIndSel[r.id] || [])
                                              const selectedCount = curr.size
                                              const allIds = raIndMap[r.id].map(ind => ind.id)
                                              return (
                                                <>
                                                  <div className="mb-2"><span className="fw-semibold">Seleccionados:</span> {selectedCount} de {total}</div>
                                                  <div className="d-flex flex-wrap gap-2">
                                                    <button
                                                      type="button"
                                                      className="btn btn-sm btn-outline-primary"
                                                      onClick={() => setRaIndSel(s => ({ ...s, [r.id]: allIds }))}
                                                    >Todos</button>
                                                    <button
                                                      type="button"
                                                      className="btn btn-sm btn-outline-secondary"
                                                      onClick={() => setRaIndSel(s => ({ ...s, [r.id]: [] }))}
                                                    >Ninguno</button>
                                                    <button
                                                      type="button"
                                                      className="btn btn-sm btn-outline-dark"
                                                      onClick={() => setRaIndSel(s => {
                                                        const curr2 = new Set(s[r.id] || [])
                                                        allIds.forEach(id => {
                                                          if (curr2.has(id)) curr2.delete(id); else curr2.add(id)
                                                        })
                                                        return { ...s, [r.id]: Array.from(curr2) }
                                                      })}
                                                    >Invertir</button>
                                                  </div>
                                                </>
                                              )
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-muted">Este RA no tiene indicadores.</div>
                                  )}
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
              <div className="form-text">
                Regla: las actividades por RA no deben exceder 100% (pueden quedar por debajo mientras completas el curso).
              </div>
            </div>

            <div className="col-12 d-flex gap-2 mt-3">
              <button
                className="btn btn-danger shadow"
                disabled={!canSave || saving}
                onClick={submit}
              >
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
              <button
                className="btn btn-outline-secondary shadow-sm"
                onClick={() => navigate(`/docente/${curso}/ras`)}
              >
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

export default NuevaActividadCurso
