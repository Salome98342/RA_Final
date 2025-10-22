import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { createActivityForRA, getTiposActividad, getIndicatorsByRA, getRAValidation } from '@/services/api'
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

  const submit = async () => {
    if (!raId || !canSave || saving) return
    setSaving(true)
    try {
      await createActivityForRA(raId, {
        nombre_actividad: form.nombre.trim(),
        id_tipo_actividad: Number(form.tipo),
        porcentaje_actividad: Number(form.pctAct),
        porcentaje_ra_actividad: Number(form.pctRA),
        descripcion: form.desc || undefined,
        fecha_cierre: form.cierre || undefined,
        indicadores: selIndicators.map(id => Number(id)),
      })
      setToast({ text: 'Actividad creada con éxito', type: 'ok' })
      setTimeout(() => navigate(`/docente/${curso}/ras`), 1200)
    } catch (err: any) {
      // Extraer mejor el mensaje de error
      let msg: string = 'No se pudo crear la actividad'
      const data = err?.response?.data
      if (typeof data === 'string') msg = data
      else if (data?.message) msg = String(data.message)
      else if (data?.detail) msg = String(data.detail)
      else if (data) msg = JSON.stringify(data)
      else if (err?.message) msg = String(err.message)
      setToast({ text: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-body" style={{minHeight:'100%'}}>
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
                <div className="progress" aria-label="Progreso actividades a 100%">
                  <div className={`progress-bar ${raVal.actividades.ok ? 'bg-success' : 'bg-warning'}`} role="progressbar" style={{ width: `${Math.min(100, Math.max(0, raVal.actividades.suma))}%` }} aria-valuenow={raVal.actividades.suma} aria-valuemin={0} aria-valuemax={100}>
                    {raVal.actividades.suma.toFixed(0)}%
                  </div>
                </div>
                {nuevoTotalAct != null && !Number.isNaN(nuevoTotalAct) && (
                  <div className="progress mt-1" aria-label="Nuevo total con esta actividad">
                    <div className={`progress-bar ${nuevoTotalAct>100?'bg-danger':(nuevoTotalAct===100?'bg-success':'bg-warning')}`} role="progressbar" style={{ width: `${Math.min(100, Math.max(0, nuevoTotalAct))}%` }} aria-valuenow={nuevoTotalAct} aria-valuemin={0} aria-valuemax={100}>
                      {nuevoTotalAct.toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <div className={`alert ${raVal.indicadores.ok ? 'alert-success' : 'alert-warning'}`}>
                  Indicadores actuales: <strong>{raVal.indicadores.suma.toFixed(2)}%</strong> · {raVal.indicadores.ok ? '¡Listo 100%!' : `Faltan ${raVal.indicadores.faltante.toFixed(2)}%`}
                </div>
                <div className="progress" aria-label="Progreso indicadores a 100%">
                  <div className={`progress-bar ${raVal.indicadores.ok ? 'bg-success' : 'bg-warning'}`} role="progressbar" style={{ width: `${Math.min(100, Math.max(0, raVal.indicadores.suma))}%` }} aria-valuenow={raVal.indicadores.suma} aria-valuemin={0} aria-valuemax={100}>
                    {raVal.indicadores.suma.toFixed(0)}%
                  </div>
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