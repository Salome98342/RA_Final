import React, { useState } from 'react'
import { Alert } from '@/utils/alert'
import { formatTipoDocumentoAbbr } from '@/utils/documento'

interface Props {
  curso: string
  onSuccess: () => void
}

const AgregarEstudianteCard: React.FC<Props> = ({ curso, onSuccess }) => {
  const [codigoEstudiante, setCodigoEstudiante] = useState('')
  const [buscando, setBuscando] = useState(false)

  const handleBuscar = async () => {
    if (!codigoEstudiante.trim()) {
      Alert.error('Por favor ingresa un código de estudiante')
      return
    }
    
    setBuscando(true)
    try {
      const { buscarEstudiantePorCodigo } = await import('@/services/api')
      const result = await buscarEstudiantePorCodigo(codigoEstudiante.trim())
      
      if (result.ok && result.estudiante) {
        const Swal = (await import('sweetalert2')).default
        const confirmResult = await Swal.fire({
          title: 'Estudiante encontrado',
          html: `
            <div class="text-start">
              <p class="mb-2"><strong>Nombre:</strong> ${result.estudiante.nombre} ${result.estudiante.apellido}</p>
              <p class="mb-2"><strong>Código:</strong> ${result.estudiante.codigo}</p>
              ${result.estudiante.codigo_programa ? `<p class="mb-2"><strong>Programa:</strong> ${result.estudiante.codigo_programa}</p>` : ''}
              <p class="mb-2"><strong>Correo:</strong> ${result.estudiante.correo}</p>
              <p class="mb-2"><strong>Documento:</strong> ${result.estudiante.documento}</p>
              <p class="mb-0"><strong>Tipo Documento:</strong> ${formatTipoDocumentoAbbr(result.estudiante.tipo_documento, 'N/A')}</p>
            </div>
            <hr>
            <p class="mb-0">¿Deseas agregar este estudiante al curso?</p>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, agregar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#199A75',
          cancelButtonColor: '#575756'
        })
        
        if (confirmResult.isConfirmed) {
          Swal.fire({
            title: 'Agregando estudiante',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading()
            }
          })
          
          try {
            const { agregarEstudiantePorCodigo } = await import('@/services/api')
            const addResult = await agregarEstudiantePorCodigo(curso, codigoEstudiante.trim())
            
            Swal.close()
            Alert.success(addResult.message || 'Estudiante agregado exitosamente')
            setCodigoEstudiante('')
            await onSuccess()
          } catch (addError) {
            console.error('Error al agregar estudiante:', addError)
            Swal.close()
            const data = (addError as { response?: { data?: unknown } })?.response?.data
            const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
              ? String((data as Record<string, unknown>).detail)
              : 'Error al agregar estudiante'
            Alert.error(msg)
          }
        }
      }
    } catch (err: unknown) {
      console.error('Error al buscar estudiante:', err)
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const msg = (data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).detail === 'string')
        ? String((data as Record<string, unknown>).detail)
        : 'Error al buscar estudiante'
      Alert.error(msg)
    } finally {
      setBuscando(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && codigoEstudiante.trim()) {
      handleBuscar()
    }
  }

  return (
    <div className="ra-card shadow-sm border-0 mb-3">
      <div className="ra-card-body">
        <div className="fw-bold mb-3 d-flex align-items-center">
          <i className="bi bi-person-plus-fill text-primary me-2 fs-5"></i>
          Agregar estudiante individual
        </div>
        
        <div className="alert alert-info d-flex align-items-start mb-3">
          <i className="bi bi-info-circle me-2 mt-1"></i>
          <div>
            Esta función está pensada para casos excepcionales: cuando un estudiante
            <strong> no puede ser matriculado oficialmente</strong> pero asiste a la clase,
            para que el docente pueda agregarlo y calificarle en el curso.
            <br />
            Ingresa el <strong>código del estudiante</strong> para buscarlo.
            Puedes usar el formato <code className="text-danger">codigo-programa</code> (ej: <code className="text-danger">202388558-2724</code>)
            y verificar sus datos antes de agregarlo.
          </div>
        </div>

        <div className="row g-2">
          <div className="col-md-8">
            <input
              className="form-control"
              type="text"
              placeholder="Ej: 2360800 o 202388558-2724"
              value={codigoEstudiante}
              onChange={e => setCodigoEstudiante(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={buscando}
            />
          </div>
          <div className="col-md-4 d-grid">
            <button
              className="btn btn-primary shadow"
              disabled={!codigoEstudiante.trim() || buscando}
              onClick={handleBuscar}
            >
              {buscando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Buscando...
                </>
              ) : (
                <>
                  <i className="bi bi-search me-2"></i>
                  Buscar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgregarEstudianteCard
