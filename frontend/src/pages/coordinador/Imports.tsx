import React, { useState } from 'react'
import { importMatriculados, importDocentes, importAsignaturasRAs } from '@/services/coordinador'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import { useLocation, useNavigate } from 'react-router-dom'

interface ImportResult { summary: string; errors: Array<{ row?: number; error?: string; more?: string }> }

const Imports: React.FC = () => {
  const [matResult, setMatResult] = useState<ImportResult | null>(null)
  const [docResult, setDocResult] = useState<ImportResult | null>(null)
  const [asigResult, setAsigResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handle = async (kind: 'mat' | 'doc' | 'asig', file?: File | null) => {
    if (!file) return
    setLoading(true)
    try {
      if (kind === 'mat') {
        const data = await importMatriculados(file)
        setMatResult({ summary: `Matriculados: creados ${data.created}, existentes ${data.existing}`, errors: data.errors || [] })
      } else if (kind === 'doc') {
        const data = await importDocentes(file)
        setDocResult({ summary: `Docentes: creados ${data.created}, existentes ${data.existing}`, errors: data.errors || [] })
      } else {
        const data = await importAsignaturasRAs(file)
        setAsigResult({ summary: `Asignaturas: creadas ${data.created_asignaturas}, existentes ${data.existing_asignaturas}; RAs creados ${data.created_ras}`, errors: data.errors || [] })
      }
    } catch (e: any) {
      const msg = String(e?.response?.data?.detail || e.message || 'Error')
      const errObj = { summary: msg, errors: [] as any[] }
      if (kind === 'mat') setMatResult(errObj)
      else if (kind === 'doc') setDocResult(errObj)
      else setAsigResult(errObj)
    } finally { setLoading(false) }
  }

  const renderErrors = (res: ImportResult | null) => {
    if (!res || !res.errors.length) return null
    return (
      <details className="mt-1">
        <summary>Errores ({res.errors.length})</summary>
        <ul className="small mb-0">
          {res.errors.map((e,i)=>(<li key={i}>{e.more ? e.more : `Fila ${e.row}: ${e.error}`}</li>))}
        </ul>
      </details>
    )
  }

  const location = useLocation()
  const navigate = useNavigate()
  const active = location.pathname.includes('/imports') ? 'imports' : 'asignaturas'
  const items = [
    { key: 'asignaturas', icon: 'bi-grid-3x3-gap', title: 'Asignaturas' },
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
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />
        <main className="dash-content">
          <div className="content-title">Imports CSV</div>
          <section className="panel shown">
            <p className="text-muted">Cada archivo debe tener cabecera. Máx 5MB. Se limita la lista de errores a 100.</p>
            <div className="row g-4">
              <div className="col-md-4">
                <div className="ra-card h-100"><div className="ra-card-body">
                  <h5 className="mb-2">Matriculados</h5>
                  <label className="form-label" htmlFor="csvMatriculados">Archivo CSV</label>
                  <input id="csvMatriculados" aria-label="Archivo CSV de matriculados" type="file" accept=".csv,text/csv" className="form-control" onChange={e=>handle('mat', e.target.files?.[0])} disabled={loading} />
                  {matResult && <div className="mt-2"><strong>{matResult.summary}</strong>{renderErrors(matResult)}</div>}
                </div></div>
              </div>
              <div className="col-md-4">
                <div className="ra-card h-100"><div className="ra-card-body">
                  <h5 className="mb-2">Docentes</h5>
                  <label className="form-label" htmlFor="csvDocentes">Archivo CSV</label>
                  <input id="csvDocentes" aria-label="Archivo CSV de docentes" type="file" accept=".csv,text/csv" className="form-control" onChange={e=>handle('doc', e.target.files?.[0])} disabled={loading} />
                  {docResult && <div className="mt-2"><strong>{docResult.summary}</strong>{renderErrors(docResult)}</div>}
                </div></div>
              </div>
              <div className="col-md-4">
                <div className="ra-card h-100"><div className="ra-card-body">
                  <h5 className="mb-2">Asignaturas + RAs</h5>
                  <label className="form-label" htmlFor="csvAsignaturasRAs">Archivo CSV</label>
                  <input id="csvAsignaturasRAs" aria-label="Archivo CSV de asignaturas y RAs" type="file" accept=".csv,text/csv" className="form-control" onChange={e=>handle('asig', e.target.files?.[0])} disabled={loading} />
                  {asigResult && <div className="mt-2"><strong>{asigResult.summary}</strong>{renderErrors(asigResult)}</div>}
                </div></div>
              </div>
            </div>
            {loading && <div className="alert alert-info mt-3 py-2">Procesando...</div>}
          </section>
        </main>
      </div>
    </div>
  )
}

export default Imports
