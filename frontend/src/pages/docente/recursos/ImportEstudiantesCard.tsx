import React, { useState } from 'react'
import { api } from '@/connections/http'

interface Props {
  curso: string
  onSuccess: () => void
  onError: (msg: string) => void
}

const ImportEstudiantesCard: React.FC<Props> = ({ curso, onSuccess, onError }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ created: number; existing: number; errors: Array<{ row?: number; error?: string }> } | null>(null)

  const handleUpload = async () => {
    if (!csvFile || !curso) return
    setUploading(true)
    setResult(null)
    
    const formData = new FormData()
    formData.append('file', csvFile)
    
    try {
      const res = await api.post(`/docente/asignaturas/${curso}/import/estudiantes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      setCsvFile(null)
      onSuccess()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
        ? String((data as Record<string, unknown>).detail)
        : 'Error al importar estudiantes'
      onError(msg)
      setResult(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="ra-card shadow-sm border-0 mb-3">
      <div className="ra-card-body">
        <div className="fw-bold mb-3 d-flex align-items-center">
          <i className="bi bi-people-fill text-success me-2 fs-5"></i>
          Importar estudiantes desde CSV del SIRA
        </div>
        
        <div className="alert alert-info d-flex align-items-start mb-3">
          <i className="bi bi-info-circle me-2 mt-1"></i>
          <div>
            <strong>Formato esperado:</strong> Archivo CSV con columna <code className="text-danger">codigo_estudiante</code> (o sinónimos: <code className="text-danger">estudiante</code>, <code className="text-danger">code</code>, <code className="text-danger">matricula</code>).
            <br/>Opcionalmente puede incluir <code className="text-danger">periodo</code>. Los estudiantes deben existir en el sistema.
          </div>
        </div>

        <div className="row g-2">
          <div className="col-md-8">
            <input
              className="form-control"
              type="file"
              accept=".csv"
              onChange={e => setCsvFile(e.target.files?.[0] || null)}
              title="Selecciona el archivo CSV del SIRA"
            />
          </div>
          <div className="col-md-4 d-grid">
            <button
              className="btn btn-success shadow"
              disabled={!csvFile || uploading}
              onClick={handleUpload}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Importando...
                </>
              ) : (
                <>
                  <i className="bi bi-upload me-2"></i>
                  Importar
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-3">
            <div className="alert alert-success mb-2">
              <i className="bi bi-check-circle me-2"></i>
              <strong>Importación completada:</strong> {result.created} nuevos estudiantes matriculados. {result.existing} ya estaban matriculados.
            </div>
            {result.errors.length > 0 && (
              <div className="alert alert-warning">
                <strong>Errores ({result.errors.length}):</strong>
                <ul className="mb-0 mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      {e.row ? `Fila ${e.row}: ` : ''}{e.error || 'Error desconocido'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportEstudiantesCard
