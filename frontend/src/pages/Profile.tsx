import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ProfileDetails } from '@/types'
import HeaderBar from '@/components/HeaderBar'
import { changePassword, getFullProfile, uploadAvatar } from '@/services/auth'

// Perfil reimplementado desde cero: dos pestañas (Información y Seguridad)
const Profile: React.FC = () => {
  const [data, setData] = useState<ProfileDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'cursos' | 'detalles' | 'seguridad'>('cursos')
  // Info read-only (correo, teléfono/jornada no editables por requerimiento)

  // Password
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdAlert, setPwdAlert] = useState<string | null>(null)
  const [showRequirements, setShowRequirements] = useState(false)

  // Avatar
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarAlert, setAvatarAlert] = useState<string | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    getFullProfile()
      .then((p) => {
        setData(p)
        // Para coordinador, la pestaña de cursos no aplica: ir a Detalles por defecto
        if (p?.rol === 'coordinador') setTab('detalles')
      })
      .catch(() => setError('No se pudo cargar el perfil'))
  }, [])

  const goBack = () => {
    if (data?.rol === 'docente') return navigate('/docente')
    if (data?.rol === 'coordinador') return navigate('/coordinador')
    return navigate('/estudiante')
  }

  // Sin edición de datos personales; sólo visualización y cambio de avatar

  // Validaciones individuales para mostrar en tiempo real
  const requirements = useMemo(() => ({
    minLength: pwd.next.length >= 8,
    hasUpperCase: /[A-Z]/.test(pwd.next),
    hasLowerCase: /[a-z]/.test(pwd.next),
    hasNumber: /[0-9]/.test(pwd.next),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd.next),
    passwordsMatch: pwd.next === pwd.confirm && pwd.confirm.length > 0,
    isDifferent: pwd.next !== pwd.current && pwd.next.length > 0
  }), [pwd])

  const pwdValid = useMemo(() => {
    if (!pwd.current || !pwd.next || !pwd.confirm) return false
    return Object.values(requirements).every(Boolean)
  }, [pwd, requirements])

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdAlert(null)
    
    // Validar fortaleza de contraseña (debe coincidir con backend)
    if (pwd.next.length < 8) {
      setPwdAlert('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!/[A-Z]/.test(pwd.next)) {
      setPwdAlert('La contraseña debe contener al menos una mayúscula')
      return
    }
    if (!/[a-z]/.test(pwd.next)) {
      setPwdAlert('La contraseña debe contener al menos una minúscula')
      return
    }
    if (!/[0-9]/.test(pwd.next)) {
      setPwdAlert('La contraseña debe contener al menos un número')
      return
    }
    if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd.next)) {
      setPwdAlert('La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)')
      return
    }
    if (pwd.next !== pwd.confirm) {
      setPwdAlert('Las contraseñas no coinciden')
      return
    }
    if (pwd.current === pwd.next) {
      setPwdAlert('La nueva contraseña debe ser diferente a la actual')
      return
    }
    
    try {
      setPwdBusy(true)
      await changePassword(pwd.current, pwd.next)
      setPwd({ current: '', next: '', confirm: '' })
      setPwdAlert('Contraseña actualizada correctamente')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).message === 'string')
        ? String((data as Record<string, unknown>).message)
        : 'No se pudo cambiar la contraseña'
      setPwdAlert(msg)
    } finally { setPwdBusy(false) }
  }

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null
    setAvatarAlert(null)
    setFile(f)
    if (f) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  const onSaveAvatar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    try {
      setAvatarBusy(true)
      const url = await uploadAvatar(file)
      if (!url) throw new Error('no-url')
      const refreshed = await getFullProfile()
      setData(refreshed)
      window.dispatchEvent(new Event('profile:updated'))
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null); setFile(null)
      setAvatarAlert('Avatar actualizado')
    } catch {
      setAvatarAlert('Error al subir el avatar (PNG/JPG hasta 2 MB)')
    } finally { setAvatarBusy(false) }
  }

  return (
    <div className="dashboard-body min-vh-100">
      {/* Barra superior sólo para coordinador */}
      {data?.rol === 'coordinador' && (
        <HeaderBar title="Universidad del Valle" subtitle="Perfil" avatarUrl={data.avatarUrl || null} />
      )}
      <div className="dash-wrapper">
        {/* Placeholder sidebar to honor the 2-column grid layout */}
        <aside className="dash-sidebar" aria-hidden="true" />
        <main className="dash-content w-100">
          <div className="content-title">Perfil</div>
          {error && <div className="alert alert-danger">{error}</div>}
          {!data ? (
            <div className="text-muted">Cargando…</div>
          ) : (
            <>
              <div className="mb-3 d-flex gap-2">
                {/* La pestaña "Cursos" es solo para estudiante o docente */}
                {(data.rol === 'docente' || data.rol === 'estudiante') && (
                  <button className={`btn ${tab==='cursos' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setTab('cursos')}>Cursos</button>
                )}
                <button className={`btn ${tab==='detalles' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setTab('detalles')}>Detalles</button>
                <button className={`btn ${tab==='seguridad' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setTab('seguridad')}>Seguridad</button>
                <span className="ms-auto" />
                {/* Acciones rápidas consistentes para coordinador */}
                {data.rol === 'coordinador' ? (
                  <div className="btn-group">
                    <button className="btn btn-outline-secondary" onClick={() => navigate('/coordinador')}>
                      <i className="bi bi-grid-1x2" /> Dashboard
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => navigate('/coordinador/imports')}>
                      <i className="bi bi-upload" /> Imports
                    </button>
                    <button className="btn btn-outline-secondary" onClick={goBack}>
                      <i className="bi bi-arrow-left" /> Volver
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-outline-secondary" onClick={goBack}><i className="bi bi-arrow-left" /> Volver</button>
                )}
              </div>

              {tab === 'cursos' ? (
                <div className="row g-3">
                  <div className="col-12">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">{data.rol === 'docente' ? 'Cursos actuales' : 'Semestre actual'}</div>
                      {!data.cursos || data.cursos.length === 0 ? (
                        <div className="text-muted">Sin cursos activos</div>
                      ) : (
                        <ul className="list-group ra-list-group">
                          {data.cursos.map((c, i) => (
                            <li key={`${c.codigo}-${i}`} className="list-group-item d-flex justify-content-between align-items-center">
                              <div>
                                <div>{c.nombre}</div>
                                <div className="ra-small">{c.codigo}{c.grupo ? ` · Grupo ${c.grupo}` : ''}{c.programa ? ` · ${c.programa}` : ''}</div>
                              </div>
                              <span className="badge bg-secondary">Curso</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div></div>
                  </div>
                  <div className="col-12">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">Historial por periodo</div>
                      {!data.cursosPorPeriodo || data.cursosPorPeriodo.length === 0 ? (
                        <div className="text-muted">Sin historial</div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {data.cursosPorPeriodo.map((g, idx) => (
                            <div key={idx} className="border rounded p-2">
                              <div className="fw-semibold mb-1">{g.periodo.descripcion}</div>
                              <ul className="list-group ra-list-group">
                                {g.cursos.map((c, j) => (
                                  <li key={`${idx}-${j}`} className="list-group-item d-flex justify-content-between align-items-center">
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
              ) : tab === 'detalles' ? (
                <div className="row g-3">
                  {/* Avatar primero */}
                  <div className="col-md-5 col-lg-4">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">Foto de perfil</div>
                      {avatarAlert && <div className={`alert ${avatarAlert.includes('actualizado') ? 'alert-success' : 'alert-danger'}`}>{avatarAlert}</div>}
                      <div className="d-flex align-items-center gap-3 mb-2">
                        <div className="avatar-preview border">
                          <img src={preview || data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((data.nombre||'')+' '+(data.apellido||''))}&background=DC3545&color=fff&size=64`} alt="Avatar" className="avatar-preview-img" />
                        </div>
                        <div className="flex-grow-1">
                          <label htmlFor="f-avatar" className="ra-small d-block mb-1">Seleccionar imagen</label>
                          <input id="f-avatar" className="form-control" type="file" accept="image/png,image/jpeg" onChange={onPick} />
                          <div className="form-text">PNG o JPG hasta 2 MB.</div>
                        </div>
                      </div>
                      <form onSubmit={onSaveAvatar}>
                        <button className="btn btn-danger" disabled={!file || avatarBusy}>{avatarBusy ? 'Subiendo…' : 'Actualizar avatar'}</button>
                      </form>
                    </div></div>
                  </div>

                  {/* Datos personales (solo lectura) */}
                  <div className="col-md-7 col-lg-8">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">{data.nombre} {data.apellido}</div>
                      <div className="ra-small mb-2 text-uppercase">{data.rol}</div>
                      <div className="d-flex flex-column gap-2">
                        <div><span className="ra-small">Código</span><div className="text-body ms-2 d-inline-block">{data.code}</div></div>
                        <div><span className="ra-small">Documento</span><div className="text-body ms-2 d-inline-block">{data.documento?.tipo ?? '-'} {data.documento?.numero ?? ''}</div></div>
                        {/* Mostrar Teléfono si está disponible (docente/coordinador), Jornada solo para estudiante */}
                        {typeof data.telefono !== 'undefined' && data.telefono !== null && data.telefono !== '' && (
                          <div><span className="ra-small">Teléfono</span><div className="text-body ms-2 d-inline-block">{data.telefono}</div></div>
                        )}
                        {data.rol === 'estudiante' && (
                          <div><span className="ra-small">Jornada</span><div className="text-body ms-2 d-inline-block">{data.jornada || '-'}</div></div>
                        )}
                        <div><span className="ra-small">Correo</span><div className="text-body ms-2 d-inline-block">{data.correo}</div></div>
                        <div><span className="ra-small">Zona horaria</span><div className="text-body ms-2 d-inline-block">{data.zona_horaria}</div></div>
                        {/* Extras */}
                        {data.programas && data.programas.length > 0 && (
                          <div>
                            <span className="ra-small">Programas</span>
                            <div className="text-body ms-2 d-inline-block">
                              {data.programas.map(p => p?.nombre || p?.codigo).filter(Boolean).join(', ')}
                            </div>
                          </div>
                        )}
                        {data.rol === 'docente' && typeof data.totalCursos === 'number' && (
                          <div><span className="ra-small">Total cursos</span><div className="text-body ms-2 d-inline-block">{data.totalCursos}</div></div>
                        )}
                        {data.rol === 'estudiante' && data.periodoActual && (
                          <div><span className="ra-small">Periodo actual</span><div className="text-body ms-2 d-inline-block">{data.periodoActual.descripcion}</div></div>
                        )}
                        {data.rol === 'estudiante' && typeof data.totalCursosPeriodoActual === 'number' && (
                          <div><span className="ra-small">Cursos en periodo</span><div className="text-body ms-2 d-inline-block">{data.totalCursosPeriodoActual}</div></div>
                        )}
                      </div>
                    </div></div>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="ra-card"><div className="ra-card-body">
                      <div className="fw-bold mb-2">Cambiar contraseña</div>
                      {pwdAlert && <div className={`alert ${pwdAlert.includes('correctamente') ? 'alert-success' : 'alert-danger'}`}>{pwdAlert}</div>}
                      <form onSubmit={onChangePassword} className="d-flex flex-column gap-2">
                        <div>
                          <label className="ra-small d-block mb-1" htmlFor="pwd-1">Contraseña actual</label>
                          <input id="pwd-1" className="form-control" type="password" value={pwd.current} onChange={(e)=>setPwd({...pwd, current: e.target.value})} required />
                        </div>
                        <div>
                          <label className="ra-small d-block mb-1" htmlFor="pwd-2">Nueva contraseña</label>
                          <input 
                            id="pwd-2" 
                            className="form-control" 
                            type="password" 
                            value={pwd.next} 
                            onChange={(e)=>setPwd({...pwd, next: e.target.value})}
                            onFocus={() => setShowRequirements(true)}
                            required 
                          />
                          {showRequirements && pwd.next.length > 0 && (
                            <div className="mt-2 p-2 border rounded bg-light">
                              <div className="ra-small fw-bold mb-1">Requisitos de contraseña:</div>
                              <div className="d-flex flex-column gap-1">
                                <span className={requirements.minLength ? 'text-success' : 'text-danger'}>
                                  {requirements.minLength ? '✓' : '✗'} Mínimo 8 caracteres
                                </span>
                                <span className={requirements.hasUpperCase ? 'text-success' : 'text-danger'}>
                                  {requirements.hasUpperCase ? '✓' : '✗'} Una mayúscula (A-Z)
                                </span>
                                <span className={requirements.hasLowerCase ? 'text-success' : 'text-danger'}>
                                  {requirements.hasLowerCase ? '✓' : '✗'} Una minúscula (a-z)
                                </span>
                                <span className={requirements.hasNumber ? 'text-success' : 'text-danger'}>
                                  {requirements.hasNumber ? '✓' : '✗'} Un número (0-9)
                                </span>
                                <span className={requirements.hasSpecial ? 'text-success' : 'text-danger'}>
                                  {requirements.hasSpecial ? '✓' : '✗'} Un carácter especial (!@#$%...)
                                </span>
                                <span className={requirements.isDifferent ? 'text-success' : 'text-danger'}>
                                  {requirements.isDifferent ? '✓' : '✗'} Diferente a la actual
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="ra-small d-block mb-1" htmlFor="pwd-3">Confirmar nueva contraseña</label>
                          <input id="pwd-3" className="form-control" type="password" value={pwd.confirm} onChange={(e)=>setPwd({...pwd, confirm: e.target.value})} required />
                          {pwd.confirm.length > 0 && (
                            <small className={requirements.passwordsMatch ? 'text-success' : 'text-danger'}>
                              {requirements.passwordsMatch ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                            </small>
                          )}
                        </div>
                        <button className="btn btn-danger mt-2" disabled={!pwdValid || pwdBusy}>{pwdBusy ? 'Actualizando…' : 'Actualizar contraseña'}</button>
                      </form>
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