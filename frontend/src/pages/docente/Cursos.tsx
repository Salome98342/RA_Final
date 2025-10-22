import React, { useEffect, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import SearchPill from '@/components/SearchPill'
import CardGrid from '@/components/CardGrid'
import RaCard from '@/components/RaCard'
import { SkeletonCard } from '@/components/Skeleton'
import { useNavigate } from 'react-router-dom'
import { getCourses } from '@/services/api'
import type { Course } from '@/types'

const DocenteCursos: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true); setErr(null)
    getCourses().then(setCourses).catch(()=>setErr('No se pudieron cargar los cursos')).finally(()=>setLoading(false))
  }, [])

  const filtered = courses.filter(c => !filter || c.id.toUpperCase().includes(filter.toUpperCase()) || c.carrera.toUpperCase().includes(filter.toUpperCase()))

  return (
    <div className="dashboard-body" style={{minHeight:'100%'}}>
      <HeaderBar roleLabel="Docente" />
      <div className="dash-wrapper">
        <Sidebar
          active="cursos"
          onClick={(k)=>{
            if (k === 'cursos') navigate('/docente')
            else if (k === 'recursos') {
              // Si el filtro deja 1 curso, abrimos directamente sus recursos
              const list = filtered
              if (list.length === 1) {
                navigate(`/docente/${list[0].id}/recursos`)
              } else {
                alert('Selecciona un curso (filtra hasta dejar uno) o entra al curso y usa el botón Recursos.')
              }
            }
          }}
          items={[{key:'cursos',icon:'bi-grid-3x3-gap',title:'Cursos'},{key:'recursos',icon:'bi-paperclip',title:'Recursos'}]}
        />
        <main className="dash-content">
          <div className="content-title">Cursos - Filtrar por código de carrera</div>
          <SearchPill icon="bi-search" placeholder="Filtrar" value={filter} onChange={setFilter} />
          {err && <div className="alert alert-danger">{err}</div>}
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : (
            <CardGrid>
              {filtered.map((c, idx) => (
                <RaCard key={c.id} headTone={idx===0?'dark':'light'} title={c.nombre} subtitle={`${c.codigo ?? c.id} · ${c.carrera}`} onClick={()=>navigate(`/docente/${c.id}/ras`)} />
              ))}
            </CardGrid>
          )}
        </main>
      </div>
    </div>
  )
}
export default DocenteCursos