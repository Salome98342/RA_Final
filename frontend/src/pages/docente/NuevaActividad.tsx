import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { createActivityMulti, getRAsByCourse, getRAValidation, getTiposActividad, getIndicatorsByRA } from '@/services/api'
import type { Indicator } from '@/types'

const NuevaActividadCurso: React.FC = () => {
  const { curso } = useParams<{ curso: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState({ nombre: '', tipo: '', pctAct: '', desc: '', cierre: '' })
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

  const pctActNumber = Number(form.pctAct)
  const canSave = Boolean(
    form.nombre.trim() &&
    tipos.length > 0 && form.tipo &&
    !Number.isNaN(pctActNumber) && pctActNumber > 0 && pctActNumber <= 100 &&
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

    // Precheck: cada RA no puede pasar de 100%
    try {
      const failing = selectedIds.find((rid) => (Number(totals[rid] ?? 0) + Number(form.pctAct)) > 100 + 1e-6)
      if (failing) {
        const nuevo = Number(totals[failing] ?? 0) + Number(form.pctAct)
        setToast({ text: `El RA ${failing} quedaría en ${nuevo.toFixed(2)}%. No puede exceder 100%. Ajusta el "Peso de la actividad (%)".`, type: 'error' })
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
        porcentaje_actividad: Number(form.pctAct),
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
          <div className="content-title">Nueva actividad · Curso {curso}</div>

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
            <div className="col-md-3">
              <label className="ra-small d-block mb-1" htmlFor="pctAct">Peso de la actividad (%)</label>
              <input
                id="pctAct"
                className="form-control"
                type="number"
                step="0.01"
                min={0}
                max={100}
                placeholder="Ej. 20"
                value={form.pctAct}
                onChange={e => setForm(f => ({ ...f, pctAct: e.target.value }))}
              />
            </div>
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
                        <th className="w-60px"></th>
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
                        const quedaria = !Number.isNaN(pctActNumber) ? suma + pctActNumber : suma
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
                                <div className="progress">
                                  <progress
                                    className="w-100"
                                    value={Math.min(100, Math.max(0, suma))}
                                    max={100}
                                    aria-label="Progreso actividades RA"
                                    title={`Progreso: ${suma.toFixed(0)}%`}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="progress">
                                  <progress
                                    className="w-100"
                                    value={Math.min(100, Math.max(0, quedaria))}
                                    max={100}
                                    aria-label="Progreso actividades RA con nueva actividad"
                                    title={`Quedaría en: ${quedaria.toFixed(0)}%`}
                                  />
                                </div>
                              </td>
                              <td>
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  disabled={!checked}
                                  onClick={() => toggleIndicators(r.id)}
                                >
                                  {open[r.id] ? 'Ocultar' : 'Asignar'}
                                </button>
                              </td>
                            </tr>
                            {open[r.id] && checked && (
                              <tr>
                                <td colSpan={6}>
                                  {raIndMap[r.id] && raIndMap[r.id].length > 0 ? (
                                    <div className="row g-2">
                                      {raIndMap[r.id].map((ind) => {
                                        const selected = (raIndSel[r.id] || []).includes(ind.id)
                                        return (
                                          <div key={ind.id} className="col-md-6">
                                            <div className="form-check">
                                              <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`ind-${r.id}-${ind.id}`}
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
                                              <label className="form-check-label" htmlFor={`ind-${r.id}-${ind.id}`}>
                                                {ind.descripcion}{' '}
                                                <span className="badge bg-secondary ms-1">{ind.porcentaje}%</span>
                                              </label>
                                            </div>
                                          </div>
                                        )
                                      })}
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
                {saving ? 'Guardando...' : 'Crear actividad'}
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
