import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import StudentList from '@/components/StudentList'
import type { Student, Indicator, Activity } from '@/types'
import { getStudentsByCourse, getIndicatorsByRA, getActivitiesByRA, upsertGrade, getIndicatorChart } from '@/services/api'
import Chart from 'chart.js/auto'

const DocenteCalificar: React.FC = () => {
  const { curso, raId } = useParams<{curso: string; raId: string}>()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<string>('')
  const [grade, setGrade] = useState({ nota: '', retro: '', indicadorId: '' })
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!curso || !raId) return
    getStudentsByCourse(curso).then(setStudents)
    getIndicatorsByRA(raId).then(setIndicators)
    getActivitiesByRA(raId).then(setActivities)
  }, [curso, raId])

  const renderChart = async (student: Student) => {
    if (!curso) return
    const data = await getIndicatorChart(curso, student.id)
    const labels = data.map(d => d.descripcion)
    const values = data.map(d => d.avg_pct ?? 0)
    const ctx = chartRef.current?.getContext('2d')
    if (!ctx) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avance indicador (%)', data: values, backgroundColor: '#dc3545' }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    })
  }

  const submit = async () => {
    if (!selectedStudent || !selectedActivity || !grade.nota) return
    await upsertGrade({
      matriculaId: selectedStudent.matriculaId,
      raActividadId: selectedActivity,
      nota: Number(grade.nota),
      retroalimentacion: grade.retro || undefined,
      indicadorId: grade.indicadorId || undefined,
    })
    setGrade({ nota: '', retro: '', indicadorId: '' })
    await renderChart(selectedStudent)
  }

  const submitAndNext = async () => {
    if (!selectedStudent) return
    await submit()
    const idx = students.findIndex(s => s.id === selectedStudent.id)
    if (idx >= 0 && idx + 1 < students.length) {
      const next = students[idx + 1]
      setSelectedStudent(next)
      await renderChart(next)
    }
  }

  return (
    <div className="dashboard-body" style={{minHeight:'100%'}}>
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar active="listar" onClick={(k)=>{ if(k==='cursos') navigate('/docente') }} items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'listar',icon:'bi-list-ul',title:'Calificar'}]} />
        <main className="dash-content">
          <div className="content-title">Calificar · Curso {curso} · RA {raId}</div>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="ra-card"><div className="ra-card-body">
                <div className="fw-bold mb-2">Estudiantes</div>
                <StudentList students={students} onSelect={async (s)=>{ setSelectedStudent(s); await renderChart(s) }} />
              </div></div>
            </div>
            <div className="col-md-4">
              <div className="ra-card"><div className="ra-card-body">
                <div className="fw-bold mb-2">Ingresar nota {selectedStudent ? `a ${selectedStudent.name}` : ''}</div>
                <div className="mb-2">
                  <select className="form-select" value={grade.indicadorId} onChange={e=>setGrade(g=>({...g, indicadorId:e.target.value}))}>
                    <option value="">Seleccionar indicador (opcional)</option>
                    {indicators.map(ind => <option key={ind.id} value={ind.id}>{ind.descripcion}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <select className="form-select" value={selectedActivity} onChange={e=>setSelectedActivity(e.target.value)}>
                    <option value="">Seleccione una actividad</option>
                    {activities.map(act => (
                      <option key={act.id} value={act.raActividadId}>{act.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <input className="form-control" type="number" step="0.1" min={0} max={5}
                         placeholder="Nota (0-5)" value={grade.nota}
                         onChange={e=>setGrade(g=>({...g, nota:e.target.value}))}
                         onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); submit() }}} />
                </div>
                <div className="mb-2">
                  <textarea className="form-control" placeholder="Retroalimentación (opcional)" value={grade.retro} onChange={e=>setGrade(g=>({...g, retro:e.target.value}))} />
                </div>
                <div className="d-grid gap-2">
                  <button className="btn btn-danger" disabled={!selectedStudent || !grade.nota || !selectedActivity} onClick={submit}>Guardar nota</button>
                  <button className="btn btn-outline-danger" disabled={!selectedStudent || !grade.nota || !selectedActivity} onClick={submitAndNext}>Guardar y siguiente</button>
                </div>
              </div></div>
            </div>
            <div className="col-md-4">
              <div className="ra-card"><div className="ra-card-body">
                <div className="fw-bold mb-2">Indicadores (gráfico)</div>
                <canvas ref={chartRef} height={220} />
              </div></div>
            </div>
          </div>
          <button className="btn btn-outline-danger mt-3" onClick={()=>navigate(`/docente/${curso}/ras`)}><i className="bi bi-arrow-left" /> Volver a RA</button>
        </main>
      </div>
    </div>
  )
}
export default DocenteCalificar