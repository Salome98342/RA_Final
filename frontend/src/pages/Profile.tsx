import React, { useEffect, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import { useNavigate } from 'react-router-dom'
import type { ProfileDetails } from '@/types'
import { getFullProfile, updateProfile } from '@/services/auth'

const Profile: React.FC = () => {
  const [p, setP] = useState<ProfileDetails | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'cursos'|'detalles'>('cursos')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ correo?: string; telefono?: string; jornada?: string }>({})
  const navigate = useNavigate()

  useEffect(() => {
    getFullProfile()
      .then((data) => { setP(data); setForm({ correo: data.correo, telefono: data.telefono ?? '', jornada: data.jornada ?? '' }) })
      .catch(()=>setErr('No se pudo cargar el perfil'))
  }, [])

  const back = () => navigate(p?.rol === 'docente' ? '/docente' : '/estudiante')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true); setErr(null)
      const patch: Partial<{ correo: string; telefono?: string; jornada?: string }> = { correo: form.correo ?? '' }
      if (p?.rol === 'docente') patch.telefono = form.telefono
      else patch.jornada = form.jornada
      const updated = await updateProfile(patch)
      setP(updated)
    } catch {
      setErr('No se pudo guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-body" style={{minHeight:'100%'}}>
      <HeaderBar roleLabel="Perfil" />
      <div className="dash-wrapper">
        <main className="dash-content" style={{width:'100%'}}>
          <div className="content-title">Perfil</div>
          {err && <div className="alert alert-danger">{err}</div>}
          {!p ? <div className="text-muted">Cargando…</div> : (
            <>
              <div className="mb-3 d-flex gap-2">
                <button className={`btn ${tab==='cursos'?'btn-danger':'btn-outline-danger'}`} onClick={()=>setTab('cursos')}>Cursos</button>
                <button className={`btn ${tab==='detalles'?'btn-danger':'btn-outline-danger'}`} onClick={()=>setTab('detalles')}>Detalles</button>
                <span className="ms-auto" />
                <button className="btn btn-outline-secondary" onClick={back}><i className="bi bi-arrow-left" /> Volver</button>
              </div>

              {tab === 'detalles' ? (
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">{p.nombre} {p.apellido}</div>
                      <div className="ra-small mb-2 text-uppercase">{p.rol}</div>
                      <div className="d-flex flex-column gap-2">
                        <div><span className="ra-small">Código</span><div className="text-body ms-2 d-inline-block">{p.code}</div></div>
                        <div><span className="ra-small">Documento</span><div className="text-body ms-2 d-inline-block">{p.documento?.tipo ?? '-'} {p.documento?.numero ?? ''}</div></div>
                        {p.rol === 'docente'
                          ? <div><span className="ra-small">Teléfono</span><div className="text-body ms-2 d-inline-block">{p.telefono || '-'}</div></div>
                          : <div><span className="ra-small">Jornada</span><div className="text-body ms-2 d-inline-block">{p.jornada || '-'}</div></div>}
                        <div><span className="ra-small">Correo</span><div className="text-body ms-2 d-inline-block">{p.correo}</div></div>
                        <div><span className="ra-small">Zona horaria</span><div className="text-body ms-2 d-inline-block">{p.zona_horaria}</div></div>
                      </div>
                    </div></div>
                  </div>
                  <div className="col-md-6">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-3">Editar datos</div>
                      <form onSubmit={onSubmit} className="d-flex flex-column gap-2">
                        <div>
                          <label htmlFor="correo-input" className="ra-small d-block mb-1">Correo</label>
                          <input id="correo-input" className="form-control" placeholder="Ej: correo@ejemplo.com" title="Correo electrónico" value={form.correo ?? ''} onChange={e=>setForm(f=>({...f, correo:e.target.value}))} type="email" required />
                        </div>
                        {p.rol === 'docente' ? (
                          <div>
                            <label htmlFor="telefono-input" className="ra-small d-block mb-1">Teléfono</label>
                            <input id="telefono-input" className="form-control" placeholder="Ej: +57 300 1234567" title="Teléfono" value={form.telefono ?? ''} onChange={e=>setForm(f=>({...f, telefono:e.target.value}))} />
                          </div>
                        ) : (
                          <div>
                            <label htmlFor="jornada-input" className="ra-small d-block mb-1">Jornada</label>
                            <input id="jornada-input" className="form-control" placeholder="Ej: Diurna" title="Jornada" value={form.jornada ?? ''} onChange={e=>setForm(f=>({...f, jornada:e.target.value}))} />
                          </div>
                        )}
                        <button className="btn btn-danger mt-2" disabled={saving}>
                          {saving ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                      </form>
                    </div></div>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">Cursos actuales</div>
                      {!p.cursos || p.cursos.length === 0 ? (
                        <div className="text-muted">Sin cursos activos</div>
                      ) : (
                        <ul className="list-group ra-list-group">
                          {p.cursos.map((c, i) => (
                            <li key={`${c.codigo}-${i}`} className="list-group-item d-flex justify-content-between align-items-center">
                              <div>
                                <div>{c.nombre}</div>
                                <div className="ra-small">
                                  {c.codigo}{c.grupo ? ` · Grupo ${c.grupo}` : ''}{c.programa ? ` · ${c.programa}` : ''}
                                </div>
                              </div>
                              <span className="badge bg-secondary">Curso</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div></div>
                  </div>

                  <div className="col-md-6">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">Cursos por periodo</div>
                      {(!p.cursosPorPeriodo || p.cursosPorPeriodo.length===0) ? (
                        <div className="text-muted">Sin historial</div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {p.cursosPorPeriodo.map((g, i) => (
                            <div key={i} className="border rounded p-2">
                              <div className="fw-semibold mb-1">{g.periodo.descripcion}</div>
                              <ul className="list-group ra-list-group">
                                {g.cursos.map((c, j) => (
                                  <li key={j} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                      <div>{c.nombre}</div>
                                      <div className="ra-small">{c.codigo}{c.grupo ? ` · Grupo ${c.grupo}` : ''}{c.programa ? ` · ${c.programa}` : ''}</div>
                                    </div>
                                    <span className="badge bg-secondary">Curso</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div></div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
export default Profile