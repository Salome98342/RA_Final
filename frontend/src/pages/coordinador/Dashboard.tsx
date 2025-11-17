import React, { useEffect, useState } from 'react'
import { fetchAsignaturas, type AsignaturaRow } from '@/services/coordinador'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AsignaturaRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [programa, setPrograma] = useState('')
  const [docente, setDocente] = useState('')
  const [periodo, setPeriodo] = useState('')

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchAsignaturas({ page, page_size: pageSize, programa: programa || undefined, docente: docente || undefined, periodo: periodo || undefined })
      setRows(data.results); setTotal(data.total)
    } catch (e: any) {
      setError(String(e?.response?.data?.detail || e.message || 'Error cargando asignaturas'))
    } finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page])

  const maxPage = Math.max(1, Math.ceil(total / pageSize))

  // layout activo y navegación sidebar
  const location = useLocation()
  const navigate = useNavigate()
  const active = location.pathname.includes('/imports') ? 'imports' : (location.pathname.includes('/materias') ? 'materias' : 'asignaturas')
  const items = [
    { key: 'asignaturas', icon: 'bi-grid-3x3-gap', title: 'Asignaturas' },
    { key: 'materias', icon: 'bi-layout-sidebar', title: 'Materias' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Coordinador" />
      <div className="dash-wrapper">
        <Sidebar
          active={active}
          items={items}
          onClick={(key) => {
            if (key === 'asignaturas') navigate('/coordinador')
            else if (key === 'materias') navigate('/coordinador/materias')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
          <div className="content-title">Asignaturas</div>
          <section className="panel shown">
            <div className="row g-2 mb-3">
              <div className="col-md-3"><input className="form-control" placeholder="Programa" value={programa} onChange={e=>setPrograma(e.target.value)} /></div>
              <div className="col-md-3"><input className="form-control" placeholder="Docente" value={docente} onChange={e=>setDocente(e.target.value)} /></div>
              <div className="col-md-3"><input className="form-control" placeholder="Periodo" value={periodo} onChange={e=>setPeriodo(e.target.value)} /></div>
              <div className="col-md-3 d-grid"><button className="btn btn-danger btn-sm" disabled={loading} onClick={()=>{setPage(1); load()}}>Filtrar</button></div>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="ra-card">
              <div className="ra-card-body">
                <div className="table-responsive">
                  <table className="table table-sm table-striped align-middle">
                    <thead><tr><th>Código</th><th>Nombre</th><th>Programa</th><th>Docente</th><th>Estudiantes</th><th>RAs</th><th>Acciones</th></tr></thead>
                    <tbody>
                    {rows.map(r => (
                      <tr key={r.codigo}>
                        <td>{r.codigo}</td>
                        <td>{r.nombre}</td>
                        <td>{r.programa} ({r.programa_codigo})</td>
                        <td>{r.docente} ({r.docente_codigo})</td>
                        <td>{r.total_estudiantes}</td>
                        <td>{r.total_ras}</td>
                        <td><Link to={`/coordinador/asignatura/${r.codigo}`} className="btn btn-outline-danger btn-sm">Ver</Link></td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small>Total: {total}</small>
                  <div className="btn-group">
                    <button className="btn btn-sm btn-outline-secondary" disabled={page<=1 || loading} onClick={()=>setPage(p=>p-1)}>Prev</button>
                    <button className="btn btn-sm btn-outline-secondary" disabled>{page}/{maxPage}</button>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page>=maxPage || loading} onClick={()=>setPage(p=>p+1)}>Next</button>
                  </div>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>navigate('/coordinador/imports')}>Imports</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
