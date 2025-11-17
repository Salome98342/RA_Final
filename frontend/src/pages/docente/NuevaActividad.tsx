import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { useSession } from '@/state/SessionContext'
import { createActivityMulti, getRAsByCourse, getRAValidation, getTiposActividad, getIndicatorsByRA } from '@/services/api'
import type { Indicator } from '@/types'

const NuevaActividadCurso: React.FC = () => {
  const { curso } = useParams<{ curso: string }>()
  const navigate = useNavigate()
  const { state } = useSession()

  const [form, setForm] = useState({ nombre: '', tipo: '', desc: '', cierre: '' })
  const [tipos, setTipos] = useState<{ id: string; descripcion: string }[]>([])
  const [ras, setRas] = useState<{ id: string; titulo: string }[]>([])
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [aporteRA, setAporteRA] = useState<Record<string, string>>({})
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; type?: 'ok' | 'error' } | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [raIndMap, setRaIndMap] = useState<Record<string, Indicator[]>>({})
  const [raIndSel, setRaIndSel] = useState<Record<string, (string | number)[]>>({})
  const [raIndFilter, setRaIndFilter] = useState<Record<string, string>>({})

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
          return [r.id, Number(v?.actividades?.suma ?? 0)] as const
        } catch {
          return [r.id, 0] as const
        }
      }))
      setTotals(Object.fromEntries(entries))
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
        setToast({ text: `La fecha límite no puede ser anterior a hoy (${today.toISOString().slice(0, 10)}).`, type: 'error' })
        return
      }
    }

    // Precheck: cada RA no puede pasar de 100% en el aporte total al RA
    try {
      const failing = selectedIds.find((rid) => (Number(totals[rid] ?? 0) + Number(aporteRA[rid] || 0)) > 100 + 1e-6)
      if (failing) {
        const nuevo = Number(totals[failing] ?? 0) + Number(aporteRA[failing] || 0)
        setToast({ text: `El RA ${failing} quedaría en ${nuevo.toFixed(2)}%. No puede exceder 100%. Ajusta el "Aporte al RA (%)".`, type: 'error' })
        return
      }
    } catch { /* ignore precheck errors */ }

    setSaving(true)
    try {
      const rasPayload = selectedIds.map((rid) => ({
        ra_id: Number(rid),
        porcentaje_ra_actividad: Number(aporteRA[rid] || 0) || 0,
        indicadores: (raIndSel[rid] || []).map(Number),
      }))
      await createActivityMulti({
        nombre_actividad: form.nombre.trim(),
        id_tipo_actividad: Number(form.tipo),
        descripcion: form.desc || undefined,
        fecha_cierre: form.cierre || undefined,
        ras: rasPayload,
      })
      setToast({ text: 'Actividad creada con éxito', type: 'ok' })
      setTimeout(() => navigate(`/docente/${curso}/ras`), 1200)
    } catch (err: unknown) {
      let msg: string = 'No se pudo crear la actividad'
      const data = (err as { response?: { data?: unknown } })?.response?.data
      if (typeof data === 'string') msg = data
      else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>
        msg = String(obj.message ?? obj.detail ?? msg)
      } else if ((err as Error)?.message) msg = String((err as Error).message)
      setToast({ text: msg, type: 'error' })
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
          onClick={(k) => { if (k === 'cursos') navigate('/docente') }}
          items={[
            { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Cursos' },
            { key: 'crear', icon: 'bi-pencil-square', title: 'RA/Actividades' }
          ]}
        />
        <main className="dash-content">
          {toast ? <Toast text={toast.text} type={toast.type} /> : null}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="content-title">Nueva actividad · Curso {curso}</div>
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

            <div className="col-12">
              <div className="fw-bold mb-2">Aplicar a estos RAs del curso</div>
              {ras.length === 0 ? (
                <div className="text-muted">Este curso no tiene RAs.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th className="w-60px"><span className="visually-hidden">Seleccionar RA</span></th>
                        <th>RA</th>
                        <th className="w-160px">Aporte al RA (%)</th>
                        <th className="w-220px">Total actividades actual</th>
                        <th className="w-220px">Quedaría en</th>
                        <th className="w-160px">Indicadores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ras.map(r => {
                        const checked = !!sel[r.id]
                        const suma = Number(totals[r.id] ?? 0)
                        const aporte = Number(aporteRA[r.id] || 0)
                        const quedariaRaw = !Number.isNaN(aporte) ? suma + aporte : suma
                        const quedaria = Math.max(0, Math.min(100, quedariaRaw))
                        const excede = quedaria > 100 + 1e-6
                        return (
                          <React.Fragment key={r.id}>
                            <tr className={excede && checked ? 'table-danger' : ''}>
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  aria-label={`Seleccionar ${r.titulo}`}
                                  checked={checked}
                                  onChange={async (e) => {
                                    const on = e.target.checked
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
                                />
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
                                                    const cid = `ind-${r.id}-${ind.id}`
                                                    return (
                                                      <span key={ind.id} className="ra-chip-item">
                                                        <input
                                                          className="btn-check"
                                                          type="checkbox"
                                                          id={cid}
                                                          autoComplete="off"
                                                          checked={selected}
                                                          onChange={(e) => {
                                                            const on = e.target.checked
                                                            setRaIndSel((s) => {
                                                              const curr = new Set(s[r.id] || [])
                                                              if (on) curr.add(ind.id)
                                                              else curr.delete(ind.id)
                                                              return { ...s, [r.id]: Array.from(curr) }
                                                            })
                                                          }}
                                                        />
                                                        <label className={`btn btn-sm ${selected ? 'btn-secondary' : 'btn-outline-secondary'}`} htmlFor={cid}>
                                                          {ind.descripcion}
                                                        </label>
                                                      </span>
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

            <div className="col-12 d-flex gap-2">
              <button
                className="btn btn-danger"
                disabled={!canSave || saving}
                onClick={submit}
              >
                {saving ? (<><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Guardando…</>) : 'Crear actividad'}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => navigate(`/docente/${curso}/ras`)}
              >
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
