import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { createActivityForRA, createActivityMulti, getTiposActividad, getIndicatorsByRA, getRAValidation, getRAsByCourse } from '@/services/api'
import Toast from '@/components/Toast'  // <- nuevo

const DocenteCrearActividad: React.FC = () => {
  const { curso, raId } = useParams<{curso: string; raId: string}>()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', tipo: '1', pctAct: '', pctRA: '', desc: '', cierre: '' })
  const [saving, setSaving] = useState(false)
  const [tipos, setTipos] = useState<{id:string; descripcion:string}[]>([])
  const [toast, setToast] = useState<{ text: string; type?: 'ok'|'error' } | null>(null)  // <- nuevo
  const [allIndicators, setAllIndicators] = useState<{ id: string; descripcion: string; porcentaje: number }[]>([])
  const [selIndicators, setSelIndicators] = useState<string[]>([])
  const [raVal, setRaVal] = useState<{ actividades: { suma: number; ok: boolean; faltante: number }; indicadores: { suma: number; ok: boolean; faltante: number } } | null>(null)
  // Multi-RA support
  const [ras, setRas] = useState<{ id: string; titulo: string }[]>([])
  const [selectedRAs, setSelectedRAs] = useState<string[]>([])
  const [raPct, setRaPct] = useState<Record<string, string>>({})

  const pctActNum = Number(form.pctAct)
  const pctRANum = Number(form.pctRA)
  const sumaActActual = raVal?.actividades?.suma ?? null
  const nuevoTotalAct = sumaActActual != null && !Number.isNaN(pctRANum) ? Number(sumaActActual) + Number(pctRANum) : null
  const excedeAct = nuevoTotalAct != null ? nuevoTotalAct > 100 : false
  const canSave = Boolean(
    form.nombre.trim() &&
    !Number.isNaN(pctActNum) && pctActNum > 0 && pctActNum <= 100 &&
    !Number.isNaN(pctRANum) && pctRANum > 0 && pctRANum <= 100 &&
    (nuevoTotalAct == null || nuevoTotalAct <= 100) &&
    tipos.length > 0
  )

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

  const submit = async () => {
    if (!raId || !canSave || saving) return
    // Validación rápida de fecha: no permitir fecha de cierre en el pasado
    if (form.cierre) {
      const todayStr = new Date().toISOString().slice(0,10)
      if (form.cierre < todayStr) {
        setToast({ text: `La fecha límite no puede ser anterior a hoy (${todayStr}).`, type: 'error' })
        return
      }
    }
    // Pre-chequeo: cada RA seleccionado no debe EXCEDER 100% de actividades con este nuevo porcentaje de actividad
    try {
      const pctActNumber = Number(form.pctAct)
      if (!Number.isNaN(pctActNumber)) {
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
        const failing = validations.find((v) => (v.suma + pctActNumber) > 100 + 1e-6)
        if (failing) {
          const nuevo = failing.suma + pctActNumber
          setToast({
            text: `El RA ${failing.rid} quedaría en ${nuevo.toFixed(2)}%. No puede exceder 100%. Ajusta el "Peso de la actividad (%)".`,
            type: 'error',
          })
          return
        }
      }
    } catch {
      // Si el pre-chequeo falla por red, continuamos y dejaremos que el backend valide
    }
    setSaving(true)
    try {
      const others = selectedRAs.filter(id => id !== String(raId))
      if (others.length === 0) {
        // Flujo existente: solo un RA
        await createActivityForRA(raId, {
          nombre_actividad: form.nombre.trim(),
          id_tipo_actividad: Number(form.tipo),
          porcentaje_actividad: Number(form.pctAct),
          porcentaje_ra_actividad: Number(raPct[raId] ?? form.pctRA),
          descripcion: form.desc || undefined,
          fecha_cierre: form.cierre || undefined,
          indicadores: selIndicators.map(id => Number(id)),
        })
      } else {
        // Nuevo flujo: crear una sola actividad en múltiples RAs
        const rasPayload = selectedRAs.map((rid) => ({
          ra_id: Number(rid),
          porcentaje_ra_actividad: Number(raPct[rid] ?? form.pctRA),
          indicadores: rid === String(raId) ? selIndicators.map(Number) : [],
        }))
        await createActivityMulti({
          nombre_actividad: form.nombre.trim(),
          id_tipo_actividad: Number(form.tipo),
          porcentaje_actividad: Number(form.pctAct),
          descripcion: form.desc || undefined,
          fecha_cierre: form.cierre || undefined,
          ras: rasPayload,
        })
      }
      setToast({ text: 'Actividad creada con éxito', type: 'ok' })
      setTimeout(() => navigate(`/docente/${curso}/ras`), 1200)
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
      setToast({ text: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active="crear" onClick={(k)=>{ if(k==='cursos') navigate('/docente') }} items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'crear',icon:'bi-pencil-square',title:'RA/Actividades'}]} />
        <main className="dash-content">
          {toast ? <Toast text={toast.text} type={toast.type} /> : null}
          <div className="content-title">Crear actividad · Curso {curso} · RA {raId}</div>
          {raVal && (
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <div className={`alert ${raVal.actividades.ok ? 'alert-success' : 'alert-warning'}`}>
                  Actividades actuales: <strong>{raVal.actividades.suma.toFixed(2)}%</strong> · {raVal.actividades.ok ? '¡Listo 100%!' : `Faltan ${raVal.actividades.faltante.toFixed(2)}%`}
                </div>
                <div className="progress">
                  <progress
                    className="w-100"
                    value={Math.min(100, Math.max(0, raVal.actividades.suma))}
                    max={100}
                    aria-label="Progreso actividades a 100%"
                    title={`Progreso actividades: ${raVal.actividades.suma.toFixed(0)}%`}
                  />
                </div>
                {nuevoTotalAct != null && !Number.isNaN(nuevoTotalAct) && (
                  <div className="progress mt-1">
                    <progress
                      className="w-100"
                      value={Math.min(100, Math.max(0, nuevoTotalAct))}
                      max={100}
                      aria-label="Nuevo total con esta actividad"
                      title={`Nuevo total: ${nuevoTotalAct.toFixed(0)}%`}
                    />
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <div className={`alert ${raVal.indicadores.ok ? 'alert-success' : 'alert-warning'}`}>
                  Indicadores actuales: <strong>{raVal.indicadores.suma.toFixed(2)}%</strong> · {raVal.indicadores.ok ? '¡Listo 100%!' : `Faltan ${raVal.indicadores.faltante.toFixed(2)}%`}
                </div>
                <div className="progress">
                  <progress
                    className="w-100"
                    value={Math.min(100, Math.max(0, raVal.indicadores.suma))}
                    max={100}
                    aria-label="Progreso indicadores a 100%"
                    title={`Progreso indicadores: ${raVal.indicadores.suma.toFixed(0)}%`}
                  />
                </div>
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

            <div className="col-md-3">
              <label className="ra-small d-block mb-1" htmlFor="pctAct">Peso de la actividad (%)</label>
              <input
                id="pctAct"
                className="form-control"
                placeholder="Ej. 30"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={form.pctAct}
                onChange={e=>setForm(f=>({...f, pctAct:e.target.value}))}
                required
                title="Porcentaje interno de la actividad (0–100)"
                aria-describedby="pctActHelp"
              />
              <div id="pctActHelp" className="form-text">Equivale al peso de la actividad en su propia rúbrica.</div>
            </div>

            <div className="col-md-3">
              <label className="ra-small d-block mb-1" htmlFor="pctRA">Aporte al RA (%)</label>
              <input
                id="pctRA"
                className="form-control"
                placeholder="Ej. 40"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={form.pctRA}
                onChange={e=>setForm(f=>({...f, pctRA:e.target.value}))}
                required
                title="Porcentaje que esta actividad aporta al resultado de aprendizaje (0–100)"
                aria-describedby="pctRAHelp"
              />
              <div id="pctRAHelp" className="form-text">
                Suma de actividades del RA debe ser 100%.
                {raVal && (
                  <>
                    <br/>
                    {nuevoTotalAct != null && !Number.isNaN(nuevoTotalAct) ? (
                      excedeAct ? (
                        <span className="text-danger">Se excede el 100%: {nuevoTotalAct.toFixed(2)}%.</span>
                      ) : (
                        <span>
                          Nuevo total con esta actividad: <strong>{nuevoTotalAct.toFixed(2)}%</strong>{' '}
                          {nuevoTotalAct === 100 ? '· ¡Listo 100%!' : `· Faltaría ${(100 - nuevoTotalAct).toFixed(2)}%`}
                        </span>
                      )
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Selección de múltiples RAs del curso (opcional) */}
            <div className="col-12">
              <div className="fw-bold mb-2">Aplicar también a otros RAs del curso</div>
              {ras.length <= 1 ? (
                <div className="text-muted">No hay más RAs en este curso.</div>
              ) : (
                <div className="row g-2">
                  {ras.map(r => (
                    <div key={r.id} className="col-md-6 d-flex align-items-center gap-2">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`ra-${r.id}`}
                          checked={selectedRAs.includes(r.id)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setSelectedRAs(curr => checked ? Array.from(new Set([...curr, r.id])) : curr.filter(x => x !== r.id))
                            if (checked && !raPct[r.id]) setRaPct(m => ({ ...m, [r.id]: form.pctRA }))
                          }}
                        />
                        <label className="form-check-label" htmlFor={`ra-${r.id}`}>{r.titulo}</label>
                      </div>
                      <input
                        className="form-control form-control-sm w-110px"
                        type="number"
                        min={0}
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

              {/* Checklist de indicadores de logro asociados al RA */}
              <div className="col-12">
                <div className="fw-bold mb-2">Indicadores de logro vinculados</div>
                {allIndicators.length === 0 ? (
                  <div className="text-muted">Este RA no tiene indicadores definidos.</div>
                ) : (
                  <div className="row">
                    {allIndicators.map((ind) => (
                      <div key={ind.id} className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`ind-${ind.id}`}
                            checked={selIndicators.includes(ind.id)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelIndicators((curr) => checked ? [...curr, ind.id] : curr.filter((x) => x !== ind.id))
                            }}
                          />
                          <label className="form-check-label" htmlFor={`ind-${ind.id}`}>
                            {ind.descripcion} <span className="badge bg-secondary ms-1">{ind.porcentaje}%</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-text">Puedes asignar esta actividad a uno o varios indicadores del RA.</div>
              </div>

            <div className="col-12 d-flex gap-2">
              <button className="btn btn-danger" disabled={!canSave || saving} onClick={submit}>{saving?'Guardando…':'Crear actividad'}</button>
              <button className="btn btn-outline-secondary" onClick={()=>navigate(-1)}>Cancelar</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
export default DocenteCrearActividad