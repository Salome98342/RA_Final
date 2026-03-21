import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import Alert from '@/utils/alert'
import {
  createAsignaturaWithRAs,
  fetchDocentes,
  fetchProgramas,
  type CreateAsignaturaWithRAItem,
  type DocenteListItem,
  type ProgramaItem,
} from '@/services/coordinador'
import { getProfile } from '@/services/auth'

type RAFormItem = {
  key: string
  descripcion: string
  porcentaje_ra: string
  indicadores: IndicadorFormItem[]
}

type IndicadorFormItem = {
  key: string
  descripcion: string
  porcentaje_ind: string
}

const createEmptyIndicador = (): IndicadorFormItem => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  descripcion: '',
  porcentaje_ind: '',
})

const createEmptyRA = (): RAFormItem => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  descripcion: '',
  porcentaje_ra: '',
  indicadores: [createEmptyIndicador()],
})

const normalizeCode = (value: string) => value.toUpperCase().trim()

const inferProgramFromCoordinator = (
  coordinatorCode: string,
  coordinatorName: string,
  programs: ProgramaItem[]
): ProgramaItem | null => {
  if (!programs.length) return null
  const code = normalizeCode(coordinatorCode)
  const name = coordinatorName.toLowerCase().trim()

  const exact = programs.find((p) => normalizeCode(p.codigo_programa) === code)
  if (exact) return exact

  const startsWith = programs.find((p) => code && normalizeCode(p.codigo_programa).startsWith(code))
  if (startsWith) return startsWith

  if (name.includes('sistemas')) {
    const sis = programs.find((p) =>
      p.nombre.toLowerCase().includes('sistemas') || normalizeCode(p.codigo_programa).includes('SIS')
    )
    if (sis) return sis
  }

  if (programs.length === 1) return programs[0]
  return null
}

const AsignaturasRA: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const active = location.pathname.includes('/docentes')
    ? 'docentes'
    : location.pathname.includes('/estudiantes')
      ? 'estudiantes'
      : location.pathname.includes('/matriculados')
        ? 'matriculados'
        : location.pathname.includes('/asignaturas-ra')
          ? 'asignaturas-ra'
          : location.pathname.includes('/imports')
            ? 'imports'
            : 'materias'

  const items = [
    { key: 'materias', icon: 'bi-journals', title: 'Materias' },
    { key: 'docentes', icon: 'bi-person-badge', title: 'Docentes' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'matriculados', icon: 'bi-clipboard-check', title: 'Matriculados' },
    { key: 'asignaturas-ra', icon: 'bi-journal-bookmark', title: 'Asignaturas + RA' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  const [loadingCatalogs, setLoadingCatalogs] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [docentes, setDocentes] = useState<DocenteListItem[]>([])
  const [detectedPrograma, setDetectedPrograma] = useState<ProgramaItem | null>(null)
  const [coordinatorLabel, setCoordinatorLabel] = useState('')
  const [docenteSearch, setDocenteSearch] = useState('')

  const [formData, setFormData] = useState({
    codigo_asignatura: '',
    nombre_asignatura: '',
    codigo_docente: '',
    grupo: '',
  })

  const [raList, setRaList] = useState<RAFormItem[]>([createEmptyRA()])

  const raParsed = useMemo(() => {
    return raList.map((ra) => {
      const descripcion = ra.descripcion.trim()
      const pctRaw = ra.porcentaje_ra.trim()
      const hasAnyValue = Boolean(descripcion || pctRaw)
      const pct = pctRaw ? Number(pctRaw) : Number.NaN
      const hasPct = pctRaw.length > 0
      const pctValid = hasPct && !Number.isNaN(pct) && pct > 0 && pct <= 100
      const complete = Boolean(descripcion && hasPct)

      const indicadoresParsed = (ra.indicadores || []).map((ind) => {
        const indDescripcion = ind.descripcion.trim()
        const indPctRaw = ind.porcentaje_ind.trim()
        const indHasAnyValue = Boolean(indDescripcion || indPctRaw)
        const indPct = indPctRaw ? Number(indPctRaw) : Number.NaN
        const indHasPct = indPctRaw.length > 0
        const indPctValid = indHasPct && !Number.isNaN(indPct) && indPct > 0 && indPct <= 100
        const indComplete = Boolean(indDescripcion && indHasPct)
        return {
          ...ind,
          descripcion: indDescripcion,
          pctRaw: indPctRaw,
          pct: indPct,
          hasPct: indHasPct,
          pctValid: indPctValid,
          complete: indComplete,
          hasAnyValue: indHasAnyValue,
        }
      })

      const indDescriptions = new Set<string>()
      let hasDuplicateIndicadorDescription = false
      for (const ind of indicadoresParsed) {
        if (!ind.complete) continue
        const key = ind.descripcion.toLowerCase()
        if (indDescriptions.has(key)) {
          hasDuplicateIndicadorDescription = true
          break
        }
        indDescriptions.add(key)
      }

      const hasInvalidIndicador = indicadoresParsed.some((ind) => {
        if (!ind.hasAnyValue) return false
        if (!ind.complete) return true
        if (!ind.pctValid) return true
        return false
      })

      const validIndicadoresForSubmit = indicadoresParsed
        .filter((ind) => ind.complete && ind.pctValid)
        .map((ind) => ({
          descripcion: ind.descripcion,
          porcentaje_ind: Number(ind.pct.toFixed(2)),
        }))

      const sumIndicadores = validIndicadoresForSubmit.reduce((acc, ind) => acc + ind.porcentaje_ind, 0)
      const hasAtLeastOneIndicador = validIndicadoresForSubmit.length > 0

      return {
        ...ra,
        descripcion,
        pctRaw,
        pct,
        hasPct,
        pctValid,
        complete,
        hasAnyValue,
        indicadoresParsed,
        validIndicadoresForSubmit,
        sumIndicadores,
        hasAtLeastOneIndicador,
        hasInvalidIndicador,
        hasDuplicateIndicadorDescription,
      }
    })
  }, [raList])

  const sumPct = useMemo(() => {
    return raParsed.reduce((acc, ra) => (ra.complete && ra.pctValid ? acc + ra.pct : acc), 0)
  }, [raParsed])

  const hasInvalidRA = useMemo(() => {
    return raParsed.some((ra) => {
      if (!ra.hasAnyValue) return false
      if (!ra.complete) return true
      if (!ra.pctValid) return true
      if (!ra.hasAtLeastOneIndicador) return true
      if (ra.hasInvalidIndicador) return true
      if (ra.hasDuplicateIndicadorDescription) return true
      if (ra.sumIndicadores > 100) return true
      return false
    })
  }, [raParsed])

  const hasDuplicateDescription = useMemo(() => {
    const seen = new Set<string>()
    for (const ra of raParsed) {
      if (!ra.complete) continue
      const key = ra.descripcion.toLowerCase()
      if (seen.has(key)) return true
      seen.add(key)
    }
    return false
  }, [raParsed])

  const validRAsForSubmit = useMemo(() => {
    return raParsed
      .filter(
        (ra) =>
          ra.complete &&
          ra.pctValid &&
          ra.hasAtLeastOneIndicador &&
          !ra.hasInvalidIndicador &&
          !ra.hasDuplicateIndicadorDescription &&
          ra.sumIndicadores <= 100
      )
      .map((ra) => ({
        descripcion: ra.descripcion,
        porcentaje_ra: Number(ra.pct.toFixed(2)),
        indicadores: ra.validIndicadoresForSubmit,
      }))
  }, [raParsed])

  const requiredValid = Boolean(
    formData.codigo_asignatura.trim() &&
    formData.nombre_asignatura.trim() &&
    formData.codigo_docente.trim() &&
    formData.grupo.trim() &&
    detectedPrograma?.codigo_programa
  )

  const canSubmit = requiredValid && !hasInvalidRA && !hasDuplicateDescription && sumPct <= 100

  const progressStep = Math.round(Math.max(0, Math.min(100, sumPct)) / 10) * 10

  const docentesOrdenados = useMemo(() => {
    return [...docentes].sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))
  }, [docentes])

  const docentesFiltrados = useMemo(() => {
    const q = docenteSearch.trim().toLowerCase()
    if (!q) return docentesOrdenados
    return docentesOrdenados.filter((d) => {
      const full = `${d.nombre} ${d.apellido}`.toLowerCase()
      return (
        full.includes(q) ||
        d.codigo_docente.toLowerCase().includes(q) ||
        d.correo.toLowerCase().includes(q) ||
        d.num_documento.toLowerCase().includes(q)
      )
    })
  }, [docenteSearch, docentesOrdenados])

  useEffect(() => {
    const load = async () => {
      setLoadingCatalogs(true)
      setError('')
      try {
        const [docentesData, programasData, profile] = await Promise.all([
          fetchDocentes(),
          fetchProgramas(),
          getProfile(),
        ])
        setDocentes(docentesData || [])
        const detected = inferProgramFromCoordinator(profile.code || '', profile.nombre || '', programasData || [])
        setDetectedPrograma(detected)
        setCoordinatorLabel(`${profile.nombre || 'Coordinador'}${profile.code ? ` (${profile.code})` : ''}`)
        if (!detected) {
          setError('No se pudo detectar automáticamente el programa del coordinador. Contacta al administrador para configurar este perfil.')
        }
      } catch (e: any) {
        setError(e?.response?.data?.detail || e.message || 'No fue posible cargar docentes, programas o perfil.')
      } finally {
        setLoadingCatalogs(false)
      }
    }
    load()
  }, [])

  const addRA = () => {
    setRaList((prev) => [...prev, createEmptyRA()])
  }

  const removeRA = (key: string) => {
    setRaList((prev) => {
      if (prev.length <= 1) {
        return [createEmptyRA()]
      }
      return prev.filter((ra) => ra.key !== key)
    })
  }

  const updateRA = (key: string, patch: Partial<RAFormItem>) => {
    setRaList((prev) => prev.map((ra) => (ra.key === key ? { ...ra, ...patch } : ra)))
  }

  const addIndicador = (raKey: string) => {
    setRaList((prev) =>
      prev.map((ra) =>
        ra.key === raKey
          ? { ...ra, indicadores: [...(ra.indicadores || []), createEmptyIndicador()] }
          : ra
      )
    )
  }

  const removeIndicador = (raKey: string, indicadorKey: string) => {
    setRaList((prev) =>
      prev.map((ra) => {
        if (ra.key !== raKey) return ra
        const next = (ra.indicadores || []).filter((ind) => ind.key !== indicadorKey)
        return {
          ...ra,
          indicadores: next.length ? next : [createEmptyIndicador()],
        }
      })
    )
  }

  const updateIndicador = (raKey: string, indicadorKey: string, patch: Partial<IndicadorFormItem>) => {
    setRaList((prev) =>
      prev.map((ra) => {
        if (ra.key !== raKey) return ra
        return {
          ...ra,
          indicadores: (ra.indicadores || []).map((ind) => (ind.key === indicadorKey ? { ...ind, ...patch } : ind)),
        }
      })
    )
  }

  const resetForm = () => {
    setFormData({
      codigo_asignatura: '',
      nombre_asignatura: '',
      codigo_docente: '',
      grupo: '',
    })
    setRaList([createEmptyRA()])
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!requiredValid) {
      setError('Completa codigo_asignatura, nombre_asignatura, docente y grupo. El programa se asigna desde el perfil del coordinador.')
      return
    }

    if (hasDuplicateDescription) {
      setError('Hay RAs con descripción repetida. Ajusta las descripciones antes de guardar.')
      return
    }

    if (hasInvalidRA) {
      setError('Verifica los RAs e indicadores: cada RA debe tener descripción, porcentaje válido y al menos un indicador con porcentaje válido. La suma de indicadores por RA no puede exceder 100%.')
      return
    }

    if (sumPct > 100) {
      setError('La suma de porcentajes RA supera 100%. Ajusta los valores para continuar.')
      return
    }

    const payloadRAs: CreateAsignaturaWithRAItem[] = validRAsForSubmit
    const totalIndicadores = payloadRAs.reduce((acc, ra) => acc + ra.indicadores.length, 0)

    const confirmText = [
      `Asignatura: ${normalizeCode(formData.codigo_asignatura)} - ${formData.nombre_asignatura.trim()}`,
      `Docente: ${normalizeCode(formData.codigo_docente)}`,
      `Programa: ${detectedPrograma?.nombre || 'No detectado'} (${detectedPrograma?.codigo_programa || 'N/A'})`,
      `Grupo: ${formData.grupo.trim() || 'Sin grupo'}`,
      `RAs a crear: ${payloadRAs.length}`,
      `Indicadores a crear: ${totalIndicadores}`,
      `Suma RA nueva: ${sumPct.toFixed(2)}%`,
      '',
      '¿Deseas procesar este registro?'
    ].join('\n')

    const confirmed = await Alert.confirm({
      title: 'Confirmar creación de Asignatura + RA',
      text: confirmText,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    })

    if (!confirmed) return

    setLoadingSubmit(true)
    try {
      const response = await createAsignaturaWithRAs({
        codigo_asignatura: normalizeCode(formData.codigo_asignatura),
        nombre_asignatura: formData.nombre_asignatura.trim(),
        codigo_docente: normalizeCode(formData.codigo_docente),
        codigo_programa: normalizeCode(detectedPrograma?.codigo_programa || ''),
        grupo: formData.grupo.trim() || undefined,
        ras: payloadRAs,
      })

      const msg = [
        response.asignatura_creada ? 'Asignatura creada.' : 'Asignatura actualizada.',
        `RAs creados: ${response.ras_creados.length}.`,
        `Indicadores creados: ${response.ras_creados.reduce((acc, ra) => acc + (ra.indicadores?.length || 0), 0)}.`,
        response.ras_omitidos.length ? `RAs omitidos: ${response.ras_omitidos.length}.` : '',
        `Total RA en asignatura: ${response.total_ra_asignatura.toFixed(2)}%.`,
      ]
        .filter(Boolean)
        .join(' ')

      setSuccess(msg)
      setError('')

      setRaList([createEmptyRA()])
      setFormData((prev) => ({
        ...prev,
        codigo_asignatura: '',
        nombre_asignatura: '',
        grupo: '',
      }))
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || 'No fue posible guardar la asignatura con sus RAs.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  return (
    <div className="dashboard-body min-vh-100">
      <HeaderBar roleLabel="Coordinador" />
      <div className="dash-wrapper">
        <Sidebar
          active={active}
          items={items}
          onClick={(key) => {
            if (key === 'materias') navigate('/coordinador/materias')
            else if (key === 'docentes') navigate('/coordinador/docentes')
            else if (key === 'estudiantes') navigate('/coordinador/estudiantes')
            else if (key === 'matriculados') navigate('/coordinador/matriculados')
            else if (key === 'asignaturas-ra') navigate('/coordinador/asignaturas-ra')
            else if (key === 'imports') navigate('/coordinador/imports')
          }}
        />

        <main className="dash-content">
          <div className="content-title d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <i className="bi bi-journal-bookmark me-2"></i>
              Gestión de Asignaturas + RA
            </div>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => navigate('/coordinador/imports?modulo=asig')}
              type="button"
            >
              <i className="bi bi-upload me-1"></i>
              Carga masiva (CSV/Excel)
            </button>
          </div>

          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <i className="bi bi-check-circle me-2"></i>
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')} aria-label="Cerrar"></button>
            </div>
          )}

          <section className="ra-card mb-3 coordinator-individual-hero">
            <div className="ra-card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-start gap-3">
                <div className="coordinator-individual-hero-icon bg-danger-subtle text-danger">
                  <i className="bi bi-journal-plus"></i>
                </div>
                <div>
                  <h5 className="mb-1">Formulario principal de Asignatura + RAs</h5>
                  <p className="text-muted mb-0">
                    Crea o actualiza una asignatura y registra varios RAs en una sola operación validada.
                  </p>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2 coordinator-individual-chips">
                <span className="badge text-bg-light border">Transaccional</span>
                <span className="badge text-bg-light border">Suma RA &lt;= 100%</span>
                <span className="badge text-bg-light border">Confirmación previa</span>
              </div>
            </div>
          </section>

          <div className="card mb-4 coordinator-form-card shadow-sm border-0">
            <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between">
              <span>
                <i className="bi bi-journal-bookmark-fill me-2"></i>
                Crear / actualizar Asignatura con RAs
              </span>
              <span className="badge text-bg-light">Formulario grande</span>
            </div>

            <div className="card-body">
              <div className="alert alert-info d-flex align-items-start gap-2">
                <i className="bi bi-info-circle mt-1"></i>
                <div>
                  Usa este formulario para operación individual. La carga masiva se mantiene en el módulo de imports.
                </div>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {loadingCatalogs && (
                <div className="alert alert-secondary d-flex align-items-center" role="status" aria-live="polite">
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Cargando catálogos de docentes y programas...
                </div>
              )}

              {detectedPrograma && (
                <div className="alert alert-secondary d-flex align-items-start gap-2">
                  <i className="bi bi-person-badge mt-1"></i>
                  <div>
                    <strong>Perfil activo:</strong> {coordinatorLabel || 'Coordinador'}<br />
                    <strong>Programa fijado automáticamente:</strong> {detectedPrograma.nombre} ({detectedPrograma.codigo_programa})
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="coordinator-form-section-title mb-3">
                  <i className="bi bi-journal-text me-2"></i>
                  Información base de la asignatura
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Código Asignatura <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      title="Código de asignatura"
                      value={formData.codigo_asignatura}
                      onChange={(e) => setFormData((prev) => ({ ...prev, codigo_asignatura: e.target.value.toUpperCase() }))}
                      placeholder="Ej: MAT101"
                      autoComplete="off"
                    />
                  </div>

                  <div className="col-md-8 mb-3">
                    <label className="form-label fw-semibold">Nombre Asignatura <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      title="Nombre de asignatura"
                      value={formData.nombre_asignatura}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nombre_asignatura: e.target.value }))}
                      placeholder="Ej: Calculo I"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Docente <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      title="Buscar docente"
                      aria-label="Buscar docente"
                      placeholder="Buscar docente por nombre, código, correo o documento"
                      value={docenteSearch}
                      onChange={(e) => setDocenteSearch(e.target.value)}
                    />
                    <select
                      className="form-select"
                      title="Seleccionar docente"
                      aria-label="Seleccionar docente"
                      value={formData.codigo_docente}
                      onChange={(e) => setFormData((prev) => ({ ...prev, codigo_docente: e.target.value }))}
                    >
                      <option value="">Selecciona docente</option>
                      {docentesFiltrados.map((d) => (
                        <option key={d.id_docente} value={d.codigo_docente}>
                          {d.codigo_docente} - {d.nombre} {d.apellido}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      Mostrando {docentesFiltrados.length} de {docentesOrdenados.length} docentes registrados.
                    </div>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Programa <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      title="Programa detectado"
                      value={detectedPrograma ? `${detectedPrograma.codigo_programa} - ${detectedPrograma.nombre}` : 'No detectado'}
                      readOnly
                    />
                    <div className="form-text">Se asigna automáticamente según el perfil del coordinador.</div>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Grupo <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      title="Grupo"
                      value={formData.grupo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, grupo: e.target.value }))}
                      placeholder="Ej: A"
                    />
                  </div>
                </div>

                <div className="coordinator-form-section-title mb-3 mt-2 d-flex align-items-center justify-content-between">
                  <span>
                    <i className="bi bi-graph-up-arrow me-2"></i>
                    Resultados de Aprendizaje (RAs)
                  </span>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addRA}>
                    <i className="bi bi-plus-lg me-1"></i>
                    Agregar RA
                  </button>
                </div>

                {raList.map((ra, index) => {
                  const parsed = raParsed.find((item) => item.key === ra.key)
                  return (
                    <div className="card mb-3" key={ra.key}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">RA #{index + 1}</h6>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeRA(ra.key)}
                            disabled={raList.length === 1}
                          >
                            <i className="bi bi-trash me-1"></i>
                            Quitar
                          </button>
                        </div>

                        <div className="row">
                          <div className="col-md-8 mb-2">
                            <label className="form-label">Descripción RA</label>
                            <input
                              type="text"
                              className="form-control"
                              title={`Descripción RA ${index + 1}`}
                              value={ra.descripcion}
                              onChange={(e) => updateRA(ra.key, { descripcion: e.target.value })}
                              placeholder="Ej: Aplica conceptos para resolver problemas"
                            />
                          </div>

                          <div className="col-md-4 mb-2">
                            <label className="form-label">Porcentaje RA</label>
                            <input
                              type="number"
                              className="form-control"
                              title={`Porcentaje RA ${index + 1}`}
                              min="0"
                              max="100"
                              step="0.01"
                              value={ra.porcentaje_ra}
                              onChange={(e) => updateRA(ra.key, { porcentaje_ra: e.target.value })}
                              placeholder="Ej: 25"
                            />
                          </div>
                        </div>

                        <div className="border rounded p-3 bg-light-subtle mt-2">
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <h6 className="mb-0">Indicadores de logro del RA #{index + 1}</h6>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => addIndicador(ra.key)}
                            >
                              <i className="bi bi-plus-lg me-1"></i>
                              Agregar indicador
                            </button>
                          </div>

                          {(ra.indicadores || []).map((indicador, indIndex) => {
                            const parsedIndicador = parsed?.indicadoresParsed.find((item) => item.key === indicador.key)
                            return (
                              <div className="row g-2 align-items-end mb-2" key={indicador.key}>
                                <div className="col-md-7">
                                  <label className="form-label small mb-1">Descripción indicador #{indIndex + 1}</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    title={`Descripción indicador ${indIndex + 1} de RA ${index + 1}`}
                                    value={indicador.descripcion}
                                    onChange={(e) => updateIndicador(ra.key, indicador.key, { descripcion: e.target.value })}
                                    placeholder="Ej: Resuelve ejercicios aplicando el método correcto"
                                  />
                                </div>

                                <div className="col-md-3">
                                  <label className="form-label small mb-1">% indicador</label>
                                  <input
                                    type="number"
                                    className="form-control"
                                    title={`Porcentaje indicador ${indIndex + 1} de RA ${index + 1}`}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={indicador.porcentaje_ind}
                                    onChange={(e) => updateIndicador(ra.key, indicador.key, { porcentaje_ind: e.target.value })}
                                    placeholder="Ej: 50"
                                  />
                                </div>

                                <div className="col-md-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger w-100"
                                    onClick={() => removeIndicador(ra.key, indicador.key)}
                                    disabled={(ra.indicadores || []).length === 1}
                                  >
                                    <i className="bi bi-trash me-1"></i>
                                    Quitar
                                  </button>
                                </div>

                                {parsedIndicador && parsedIndicador.hasAnyValue && (!parsedIndicador.complete || !parsedIndicador.pctValid) && (
                                  <div className="col-12 small text-danger">
                                    Indicador incompleto o inválido. Debe tener descripción y porcentaje en (0, 100].
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          <div className="small text-muted mt-1">
                            Suma de indicadores en este RA: {parsed?.sumIndicadores.toFixed(2) || '0.00'}%
                          </div>

                          {parsed && parsed.sumIndicadores > 100 && (
                            <div className="small text-danger">La suma de indicadores de este RA supera 100%.</div>
                          )}

                          {parsed && parsed.hasDuplicateIndicadorDescription && (
                            <div className="small text-danger">Hay indicadores repetidos dentro de este RA.</div>
                          )}

                          {parsed && parsed.hasAnyValue && !parsed.hasAtLeastOneIndicador && (
                            <div className="small text-danger">Este RA debe tener al menos un indicador válido.</div>
                          )}
                        </div>

                        {parsed && parsed.hasAnyValue && (!parsed.complete || !parsed.pctValid) && (
                          <div className="small text-danger">
                            Este RA está incompleto o su porcentaje es inválido. Debe tener descripción y porcentaje en (0, 100].
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center small mb-1">
                    <span className="text-muted">Suma de porcentajes RA nuevos</span>
                    <span className="fw-semibold">{sumPct.toFixed(2)}%</span>
                  </div>
                  <div className="progress coordinator-inline-progress">
                    <div
                      className={`progress-bar ${sumPct > 100 ? 'bg-danger' : 'bg-success'} w-pct-${progressStep}`}
                    ></div>
                  </div>
                  <div className="form-text">
                    El backend valida contra el total existente de la asignatura y no permite superar 100%.
                  </div>
                </div>

                {hasDuplicateDescription && (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-circle me-2"></i>
                    Detectamos descripciones repetidas en los RAs del formulario.
                  </div>
                )}

                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <small className="text-muted">
                    <i className="bi bi-shield-check me-1"></i>
                    Operación transaccional: se valida todo antes de guardar.
                  </small>

                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={resetForm} disabled={loadingSubmit}>
                      Limpiar formulario
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loadingSubmit || !canSubmit}>
                      {loadingSubmit ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-2"></i>
                          Guardar Asignatura + RAs
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AsignaturasRA
