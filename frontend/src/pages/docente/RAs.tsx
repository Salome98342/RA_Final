import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
// import SearchPill from '@/components/SearchPill'
import StudentList from '@/components/StudentList'
import type { RA, Indicator, Activity, Student } from '@/types'
import { getRAsByCourse, getIndicatorsByRA, getActivitiesByRA, getStudentsByCourse, getPeriodosByCourse } from '@/services/api'

const DocenteRAs: React.FC = () => {
  const { curso } = useParams<{curso: string}>()
  const navigate = useNavigate()
  const [ras, setRas] = useState<RA[]>([])
  const [selectedRA, setSelectedRA] = useState<RA | null>(null)
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [periodos, setPeriodos] = useState<{id:string; descripcion:string}[]>([])
  const [periodoSel, setPeriodoSel] = useState<string>('')

  useEffect(() => {
    if (!curso) return
    setErr(null)
    getRAsByCourse(curso).then(setRas).catch(()=>setErr('No se pudieron cargar los RA'))
  }, [curso])

  useEffect(() => { if(curso){ getPeriodosByCourse(curso).then(setPeriodos).catch(()=>setPeriodos([])) } }, [curso])

  const openRADetails = async (ra: RA) => {
    setSelectedRA(ra)
    try {
      const [inds, acts] = await Promise.all([getIndicatorsByRA(ra.id), getActivitiesByRA(ra.id)])
      setIndicators(inds); setActivities(acts)
    } catch { setIndicators([]); setActivities([]) }
  }

  const loadStudents = async () => {
    if (!curso) return
    setStudents(await getStudentsByCourse(curso, periodoSel?{periodoId:periodoSel}:undefined))
  }

  return (
    <div className="dashboard-body" style={{minHeight:'100%'}}>
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active="crear" onClick={(k)=>{ if(k==='cursos') navigate('/docente'); if (k==='recursos' && curso) navigate(`/docente/${curso}/recursos`) }} items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'crear',icon:'bi-pencil-square',title:'RA/Actividades'},{key:'recursos',icon:'bi-paperclip',title:'Recursos'}]} />
        <main className="dash-content">
          <div className="content-title">RA - {curso}</div>
          {err && <div className="alert alert-danger">{err}</div>}
          <CardGrid>
            {ras.map((ra, idx) => (
              <RaCard key={ra.id} headTone={idx===0?'dark':'light'} title={<><span className="text-uppercase small fw-bold d-block">Resultado de aprendizaje</span>{ra.titulo}</> as unknown as string} subtitle={ra.info} onClick={() => openRADetails(ra)} />
            ))}
          </CardGrid>

          {selectedRA && (
            <div className="mt-3">
              <div className="content-title">Detalle de RA: {selectedRA.titulo}</div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="ra-card"><div className="ra-card-body">
                    <div className="fw-bold mb-2">Indicadores</div>
                    {indicators.length===0 ? <div className="text-muted">Sin indicadores</div> : (
                      <ul className="list-group ra-list-group">
                        {indicators.map(ind => (
                          <li key={ind.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <span>{ind.descripcion}</span>
                            <span className="badge bg-secondary">{ind.porcentaje}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div></div>
                </div>
                <div className="col-md-6">
                  <div className="ra-card"><div className="ra-card-body">
                    <div className="fw-bold mb-2">Actividades</div>
                    {activities.length===0 ? <div className="text-muted">Sin actividades</div> : (
                      <ul className="list-group ra-list-group">
                        {activities.map(act => (
                          <li key={act.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <div>{act.nombre}</div>
                              <div className="ra-small">
                                {(act.tipoActividad || (act.tipoActividadId ? `Tipo ${act.tipoActividadId}` : ''))}
                                {act.fechaCierre ? ` · Cierra: ${new Date(act.fechaCierre).toLocaleDateString()}` : ''}
                              </div>
                            </div>
                            <span className="badge bg-secondary">{act.porcentaje}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div></div>
                </div>
              </div>

              <div className="mt-3 d-flex gap-2">
                <button className="btn btn-danger" onClick={()=>navigate(`/docente/${curso}/ra/${selectedRA.id}/crear-actividad`)}><i className="bi bi-plus-circle" /> Crear actividad</button>
                <button className="btn btn-outline-danger" onClick={()=>navigate(`/docente/${curso}/ra/${selectedRA.id}/calificar`)}><i className="bi bi-check2-square" /> Calificar</button>
                <button className="btn btn-outline-secondary" onClick={loadStudents}><i className="bi bi-people" /> Ver estudiantes</button>
              </div>

              <div className="mt-3">
                <div className="content-title">Estudiantes - {curso}</div>
                <div className="d-flex gap-2 align-items-center mb-2">
                  <label className="ra-small">Periodo</label>
                  <select className="form-select" style={{maxWidth:240}} value={periodoSel} onChange={e=>setPeriodoSel(e.target.value)}>
                    <option value="">Todos</option>
                    {periodos.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                  </select>
                  <button className="btn btn-outline-secondary" onClick={async ()=>{ if(curso){ setStudents(await getStudentsByCourse(curso, periodoSel?{periodoId:periodoSel}:undefined)) } }}>
                    <i className="bi bi-people" /> Cargar estudiantes
                  </button>
                </div>
                <StudentList students={students} />
              </div>
            </div>
          )}

          <button className="btn btn-outline-danger mt-3" onClick={() => navigate('/docente')}><i className="bi bi-arrow-left" /> Volver a cursos</button>
        </main>
      </div>
    </div>
  )
}
export default DocenteRAs