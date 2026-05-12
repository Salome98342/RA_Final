import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import Sidebar from '@/components/Sidebar'
import ModuleBreadcrumbs from '@/components/ModuleBreadcrumbs'
import Alert from '@/utils/alert'
import { getApiErrorMessage } from '@/utils/alertMessages'
import {
  createAsignaturaWithRAs,
  fetchAsignaturaDetalleEdicion,
  fetchDocentes,
  fetchPeriodosCoordinador,
  updateAsignaturaWithRAs,
  type CreateAsignaturaWithRAItem,
  type DocenteListItem,
  type ProgramaItem,
} from '@/services/coordinador'
import { getProfile } from '@/services/auth'
import { isPeriodoAtLeast2024I, sortPeriodosDesc } from '@/utils/periodos'

type RAFormItem = {
  key: string
  id_ra?: number
  descripcion: string
  porcentaje_ra: string
  indicadores: IndicadorFormItem[]
}

type IndicadorFormItem = {
  key: string
  id_ind?: number
  descripcion: string
  porcentaje_ind: string
}

type UpdateSnapshotRA = {
  id_ra: number
  descripcion: string
  indicadores: Array<{ id_ind: number; descripcion: string }>
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

const sedeOptions = [
  { value: '41', label: '41 - Nodo Sevilla' },
  { value: '02', label: '02 - Sede Caicedonia' },
]

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
            : 'asignaturas'

  const items = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'desempenio', icon: 'bi-graph-up-arrow', title: 'Desempeño' },
    { key: 'asignaturas', icon: 'bi-journals', title: 'Asignaturas' },
    { key: 'docentes', icon: 'bi-person-badge', title: 'Docentes' },
    { key: 'estudiantes', icon: 'bi-people', title: 'Estudiantes' },
    { key: 'matriculados', icon: 'bi-clipboard-check', title: 'Matriculados' },
    { key: 'asignaturas-ra', icon: 'bi-journal-bookmark', title: 'Asignaturas + RA' },
    { key: 'imports', icon: 'bi-upload', title: 'Imports' },
  ]

  const [loadingCatalogs, setLoadingCatalogs] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)

  const [docentes, setDocentes] = useState<DocenteListItem[]>([])
  const [periodos, setPeriodos] = useState<Array<{ id_periodo: number; descripcion: string }>>([])
  const [detectedPrograma, setDetectedPrograma] = useState<ProgramaItem | null>(null)
  const [coordinatorLabel, setCoordinatorLabel] = useState('')
  const [docenteSearch, setDocenteSearch] = useState('')

  const [formData, setFormData] = useState({
    codigo_asignatura: '',
    nombre_asignatura: '',
    codigo_docente: '',
    periodo: '',
    creditos: '',
    grupo: '',
    sede: '',
  })

  const [updateFilter, setUpdateFilter] = useState({
    codigo_asignatura: '',
    periodo: '',
    grupo: '',
    sede: '',
  })

  const [updateFormData, setUpdateFormData] = useState({
    codigo_asignatura: '',
    nombre_asignatura: '',
    codigo_docente: '',
    periodo: '',
    creditos: '',
    grupo: '',
    sede: '',
  })

  const [updateDocenteSearch, setUpdateDocenteSearch] = useState('')
  const [updateFoundId, setUpdateFoundId] = useState<number | null>(null)
  const [loadingLookup, setLoadingLookup] = useState(false)
  const [loadingUpdateSubmit, setLoadingUpdateSubmit] = useState(false)
  const [updateRaList, setUpdateRaList] = useState<RAFormItem[]>([])
  const [updateSnapshotRAs, setUpdateSnapshotRAs] = useState<UpdateSnapshotRA[]>([])
  const [activeForm, setActiveForm] = useState<'create' | 'update' | null>(null)

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

  const updateRaParsed = useMemo(() => {
    return updateRaList.map((ra) => {
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

      const validIndicadoresForSubmit = indicadoresParsed
        .filter((ind) => ind.complete && ind.pctValid)
        .map((ind) => ({
          id_ind: ind.id_ind,
          descripcion: ind.descripcion,
          porcentaje_ind: Number(ind.pct.toFixed(2)),
        }))

      const sumIndicadores = validIndicadoresForSubmit.reduce((acc, ind) => acc + ind.porcentaje_ind, 0)

      return {
        ...ra,
        descripcion,
        pct,
        pctValid,
        complete,
        hasAnyValue,
        validIndicadoresForSubmit,
        sumIndicadores,
        hasDuplicateIndicadorDescription,
      }
    })
  }, [updateRaList])

  const updateSumPct = useMemo(() => {
    return updateRaParsed.reduce((acc, ra) => (ra.complete && ra.pctValid ? acc + ra.pct : acc), 0)
  }, [updateRaParsed])

  const updateHasDuplicateDescription = useMemo(() => {
    const seen = new Set<string>()
    for (const ra of updateRaParsed) {
      if (!ra.complete) continue
      const key = ra.descripcion.toLowerCase()
      if (seen.has(key)) return true
      seen.add(key)
    }
    return false
  }, [updateRaParsed])

  const updateHasInvalidRA = useMemo(() => {
    return updateRaParsed.some((ra) => {
      if (!ra.hasAnyValue) return false
      if (!ra.complete || !ra.pctValid) return true
      if (!ra.validIndicadoresForSubmit.length) return true
      if (ra.hasDuplicateIndicadorDescription) return true
      if (ra.sumIndicadores > 100) return true
      return false
    })
  }, [updateRaParsed])

  const updateValidRAsForSubmit = useMemo(() => {
    return updateRaParsed
      .filter(
        (ra) =>
          ra.complete &&
          ra.pctValid &&
          ra.validIndicadoresForSubmit.length > 0 &&
          !ra.hasDuplicateIndicadorDescription &&
          ra.sumIndicadores <= 100
      )
      .map((ra) => ({
        id_ra: ra.id_ra,
        descripcion: ra.descripcion,
        porcentaje_ra: Number(ra.pct.toFixed(2)),
        indicadores: ra.validIndicadoresForSubmit,
      }))
  }, [updateRaParsed])

  const requiredValid = Boolean(
    formData.codigo_asignatura.trim() &&
    formData.nombre_asignatura.trim() &&
    formData.codigo_docente.trim() &&
    formData.periodo.trim() &&
    formData.creditos.trim() &&
    formData.grupo.trim() &&
    formData.sede.trim() &&
    detectedPrograma?.codigo_programa
  )

  const canSubmit = requiredValid && !hasInvalidRA && !hasDuplicateDescription && sumPct <= 100

  const progressStep = Math.round(Math.max(0, Math.min(100, sumPct)) / 10) * 10
  const isCreateOverLimit = sumPct > 100

  const isCreateDirty = useMemo(() => {
    const hasBaseData = Boolean(
      formData.codigo_asignatura.trim() ||
      formData.nombre_asignatura.trim() ||
      formData.codigo_docente.trim() ||
      formData.creditos.trim() ||
      formData.grupo.trim() ||
      formData.sede.trim()
    )
    const hasRAData = raParsed.some((ra) => ra.hasAnyValue || ra.indicadoresParsed.some((ind) => ind.hasAnyValue))
    return hasBaseData || hasRAData
  }, [formData, raParsed])

  const hasUnsavedCreateChanges = activeForm === 'create' && isCreateDirty

  const isUpdateDirty = useMemo(() => {
    const hasFilterData = Boolean(
      updateFilter.codigo_asignatura.trim() ||
      updateFilter.grupo.trim() ||
      updateFilter.sede.trim()
    )
    const hasUpdateBaseData = Boolean(
      updateFormData.codigo_asignatura.trim() ||
      updateFormData.nombre_asignatura.trim() ||
      updateFormData.codigo_docente.trim() ||
      updateFormData.creditos.trim() ||
      updateFormData.grupo.trim() ||
      updateFormData.sede.trim()
    )
    const hasRAData = updateRaParsed.some((ra) => ra.hasAnyValue)
    return hasFilterData || hasUpdateBaseData || hasRAData || Boolean(updateFoundId)
  }, [updateFilter, updateFormData, updateRaParsed, updateFoundId])

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

  const updateDocentesFiltrados = useMemo(() => {
    const q = updateDocenteSearch.trim().toLowerCase()
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
  }, [updateDocenteSearch, docentesOrdenados])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedCreateChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedCreateChanges])

  const confirmLeaveCreateForm = async () => {
    if (!hasUnsavedCreateChanges) return true

    return Alert.confirm({
      title: 'Salir sin guardar',
      text: 'Hay texto ingresado en el formulario de creación. ¿Deseas salir y perder los cambios?',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    })
  }

  const navigateWithCreateGuard = async (to: string) => {
    const confirmed = await confirmLeaveCreateForm()
    if (confirmed) navigate(to)
  }

  useEffect(() => {
    const load = async () => {
      setLoadingCatalogs(true)
      try {
        const [docentesData, periodosData, profile] = await Promise.all([
          fetchDocentes(),
          fetchPeriodosCoordinador(),
          getProfile(),
        ])
        setDocentes(docentesData || [])
        const filteredPeriodos = sortPeriodosDesc((periodosData || []).filter((p) => isPeriodoAtLeast2024I(p.descripcion)))
        setPeriodos(filteredPeriodos)
        setFormData((prev) => ({
          ...prev,
          periodo: prev.periodo || filteredPeriodos[0]?.descripcion || '',
        }))
        setUpdateFilter((prev) => ({
          ...prev,
          periodo: prev.periodo || filteredPeriodos[0]?.descripcion || '',
        }))
        const detected = profile.programaDetectado || null
        setDetectedPrograma(detected)
        setCoordinatorLabel(`${profile.nombre || 'Coordinador'}${profile.code ? ` (${profile.code})` : ''}`)
        if (!detected) {
          Alert.warning('No se pudo detectar automáticamente el programa del coordinador desde backend. Contacta al administrador para configurar este perfil.')
        }
      } catch (e: unknown) {
        Alert.error(getApiErrorMessage(e) || 'No fue posible cargar docentes, periodos o perfil del coordinador.')
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

  const addUpdateRA = () => {
    setUpdateRaList((prev) => [...prev, createEmptyRA()])
  }

  const removeUpdateRA = (key: string) => {
    setUpdateRaList((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((ra) => ra.key !== key)
    })
  }

  const updateUpdateRA = (key: string, patch: Partial<RAFormItem>) => {
    setUpdateRaList((prev) => prev.map((ra) => (ra.key === key ? { ...ra, ...patch } : ra)))
  }

  const addUpdateIndicador = (raKey: string) => {
    setUpdateRaList((prev) =>
      prev.map((ra) =>
        ra.key === raKey ? { ...ra, indicadores: [...(ra.indicadores || []), createEmptyIndicador()] } : ra
      )
    )
  }

  const removeUpdateIndicador = (raKey: string, indicadorKey: string) => {
    setUpdateRaList((prev) =>
      prev.map((ra) => {
        if (ra.key !== raKey) return ra
        const next = (ra.indicadores || []).filter((ind) => ind.key !== indicadorKey)
        return { ...ra, indicadores: next.length ? next : [createEmptyIndicador()] }
      })
    )
  }

  const updateUpdateIndicador = (raKey: string, indicadorKey: string, patch: Partial<IndicadorFormItem>) => {
    setUpdateRaList((prev) =>
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
    const defaultPeriodo = periodos[0]?.descripcion || ''
    setFormData({
      codigo_asignatura: '',
      nombre_asignatura: '',
      codigo_docente: '',
      periodo: defaultPeriodo,
      creditos: '',
      grupo: '',
      sede: '',
    })
    setDocenteSearch('')
    setRaList([createEmptyRA()])
  }

  const resetUpdateForm = () => {
    const defaultPeriodo = periodos[0]?.descripcion || ''
    setUpdateFilter({
      codigo_asignatura: '',
      periodo: defaultPeriodo,
      grupo: '',
      sede: '',
    })
    setUpdateFormData({
      codigo_asignatura: '',
      nombre_asignatura: '',
      codigo_docente: '',
      periodo: '',
      creditos: '',
      grupo: '',
      sede: '',
    })
    setUpdateDocenteSearch('')
    setUpdateFoundId(null)
    setUpdateRaList([])
    setUpdateSnapshotRAs([])
  }

  const handleToggleForm = async (target: 'create' | 'update') => {
    if (activeForm !== target) {
      setActiveForm(target)
      return
    }

    const hasData = target === 'create' ? isCreateDirty : isUpdateDirty
    if (!hasData) {
      if (target === 'create') resetForm()
      if (target === 'update') resetUpdateForm()
      setActiveForm(null)
      return
    }

    const confirmed = await Alert.confirm({
      title: 'Cerrar formulario',
      text: 'Hay datos ingresados. ¿Deseas cerrar este formulario?',
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    })

    if (confirmed) {
      if (target === 'create') resetForm()
      if (target === 'update') resetUpdateForm()
      setActiveForm(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!requiredValid) {
      Alert.toast.warning('Completa codigo_asignatura, nombre_asignatura, docente, periodo, creditos, grupo y sede. El programa se detecta automáticamente y debes validarlo antes de guardar.')
      return
    }

    const creditosNum = Number(formData.creditos)
    if (!Number.isInteger(creditosNum) || creditosNum <= 0) {
      Alert.toast.warning('Créditos debe ser un entero mayor que 0.')
      return
    }

    if (hasDuplicateDescription) {
      Alert.toast.warning('Hay RAs con descripción repetida. Ajusta las descripciones antes de guardar.')
      return
    }

    if (hasInvalidRA) {
      Alert.error('Verifica los RAs e indicadores: cada RA debe tener descripción, porcentaje válido y al menos un indicador con porcentaje válido. La suma de indicadores por RA no puede exceder 100%.')
      return
    }

    if (sumPct > 100) {
      Alert.toast.error('La suma de porcentajes RA supera 100%. Ajusta los valores para continuar.')
      return
    }

    const payloadRAs: CreateAsignaturaWithRAItem[] = validRAsForSubmit
    const totalIndicadores = payloadRAs.reduce((acc, ra) => acc + ra.indicadores.length, 0)

    const confirmText = [
      `Asignatura: ${normalizeCode(formData.codigo_asignatura)} - ${formData.nombre_asignatura.trim()}`,
      `Docente: ${normalizeCode(formData.codigo_docente)}`,
      `Periodo: ${formData.periodo.trim()}`,
      `Créditos: ${creditosNum}`,
      `Programa: ${detectedPrograma?.nombre || 'No detectado'} (${detectedPrograma?.codigo_programa || 'N/A'})`,
      `Grupo: ${formData.grupo.trim() || 'Sin grupo'}`,
      `Sede: ${formData.sede.trim() || 'Sin sede'}`,
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
        periodo: formData.periodo.trim(),
        creditos: creditosNum,
        grupo: formData.grupo.trim() || undefined,
        sede: formData.sede.trim() || undefined,
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

      Alert.success(msg)

      setRaList([createEmptyRA()])
      setFormData((prev) => ({
        ...prev,
        codigo_asignatura: '',
        nombre_asignatura: '',
        periodo: '',
        creditos: '',
        grupo: '',
        sede: '',
      }))
    } catch (e: unknown) {
      Alert.error(getApiErrorMessage(e) || 'No fue posible guardar la asignatura con sus RAs.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const handleLookupAsignatura = async () => {
    const codigo = normalizeCode(updateFilter.codigo_asignatura)
    const periodo = updateFilter.periodo.trim()
    const grupo = updateFilter.grupo.trim()
    const sede = updateFilter.sede.trim()

    if (!codigo || !periodo || !grupo || !sede) {
      Alert.toast.warning('Para buscar debes indicar código, semestre (período), grupo y sede.')
      return
    }

    setLoadingLookup(true)
    try {
      const detail = await fetchAsignaturaDetalleEdicion({
        codigo_asignatura: codigo,
        periodo,
        grupo,
        sede,
      })

      setUpdateFoundId(detail.asignatura.id_asignatura)
      setUpdateFormData({
        codigo_asignatura: detail.asignatura.codigo_asignatura,
        nombre_asignatura: detail.asignatura.nombre_asignatura || '',
        codigo_docente: detail.asignatura.codigo_docente || '',
        periodo: detail.asignatura.periodo || periodo,
        creditos: String(detail.asignatura.creditos ?? ''),
        grupo: detail.asignatura.grupo || grupo,
        sede: detail.asignatura.sede || '',
      })

      const parsedRAs: RAFormItem[] = (detail.ras || []).map((ra) => ({
        key: `existing-ra-${ra.id_ra}`,
        id_ra: ra.id_ra,
        descripcion: String(ra.descripcion || ''),
        porcentaje_ra: String(ra.porcentaje_ra ?? ''),
        indicadores: (ra.indicadores || []).map((ind) => ({
          key: `existing-ind-${ra.id_ra}-${ind.id_ind}`,
          id_ind: ind.id_ind,
          descripcion: String(ind.descripcion || ''),
          porcentaje_ind: String(ind.porcentaje_ind ?? ''),
        })),
      }))

      setUpdateRaList(parsedRAs.length ? parsedRAs : [createEmptyRA()])
      setUpdateSnapshotRAs(
        (detail.ras || []).map((ra) => ({
          id_ra: ra.id_ra,
          descripcion: String(ra.descripcion || ''),
          indicadores: (ra.indicadores || []).map((ind) => ({
            id_ind: ind.id_ind,
            descripcion: String(ind.descripcion || ''),
          })),
        }))
      )
      Alert.toast.success('Asignatura encontrada. Puedes actualizar base, RAs e indicadores.')
    } catch (e: unknown) {
      setUpdateFoundId(null)
      setUpdateRaList([])
      setUpdateSnapshotRAs([])
      Alert.error(getApiErrorMessage(e) || 'No fue posible consultar la asignatura.')
    } finally {
      setLoadingLookup(false)
    }
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!updateFoundId) {
      Alert.toast.warning('Primero busca y carga una asignatura existente para actualizar.')
      return
    }

    const codigo = normalizeCode(updateFormData.codigo_asignatura)
    const nombre = updateFormData.nombre_asignatura.trim()
    const docente = normalizeCode(updateFormData.codigo_docente)
    const periodo = updateFormData.periodo.trim()
    const grupo = updateFormData.grupo.trim()
    const sede = updateFormData.sede.trim()

    if (!codigo || !nombre || !docente || !periodo || !grupo || !sede) {
      Alert.toast.warning('Completa nombre, docente, semestre (período), grupo y sede para actualizar.')
      return
    }

    const creditosNum = Number(updateFormData.creditos)
    if (!Number.isInteger(creditosNum) || creditosNum <= 0) {
      Alert.toast.warning('Créditos debe ser un entero mayor que 0.')
      return
    }

    if (updateHasDuplicateDescription) {
      Alert.toast.warning('Hay RAs repetidos en la actualización. Corrige las descripciones.')
      return
    }

    if (updateHasInvalidRA) {
      Alert.error('Verifica RAs/indicadores: cada RA debe tener descripción, porcentaje válido y al menos un indicador válido.')
      return
    }

    if (updateSumPct > 100) {
      Alert.toast.error('La suma de porcentajes RA excede 100%.')
      return
    }

    if (!detectedPrograma?.codigo_programa) {
      Alert.error('No se detectó el programa del coordinador. No se puede actualizar.')
      return
    }

    const submittedExistingRaIds = new Set(
      updateValidRAsForSubmit
        .filter((ra) => typeof ra.id_ra === 'number')
        .map((ra) => Number(ra.id_ra))
    )

    const deletedRAs = updateSnapshotRAs.filter((ra) => !submittedExistingRaIds.has(ra.id_ra))

    const deletedIndicadores: Array<{ raId: number; indicadorId: number; descripcion: string }> = []
    for (const snapRA of updateSnapshotRAs) {
      if (!submittedExistingRaIds.has(snapRA.id_ra)) continue

      const currentRA = updateValidRAsForSubmit.find((ra) => Number(ra.id_ra) === snapRA.id_ra)
      const submittedIndIds = new Set(
        (currentRA?.indicadores || [])
          .filter((ind) => typeof ind.id_ind === 'number')
          .map((ind) => Number(ind.id_ind))
      )

      for (const snapInd of snapRA.indicadores) {
        if (!submittedIndIds.has(snapInd.id_ind)) {
          deletedIndicadores.push({
            raId: snapRA.id_ra,
            indicadorId: snapInd.id_ind,
            descripcion: snapInd.descripcion,
          })
        }
      }
    }

    const confirmLines: string[] = [
      `Se actualizará ${codigo} (${periodo}, grupo ${grupo}).`,
      '',
      `RAs enviados: ${updateValidRAsForSubmit.length}`,
      `Suma RA enviada: ${updateSumPct.toFixed(2)}%`,
    ]

    if (deletedRAs.length || deletedIndicadores.length) {
      confirmLines.push('', 'Cambios destructivos detectados:')
      if (deletedRAs.length) {
        confirmLines.push(`- RAs a eliminar: ${deletedRAs.length}`)
        deletedRAs.slice(0, 6).forEach((ra, index) => {
          const label = ra.descripcion ? `${ra.descripcion}` : `RA ${index + 1}`
          confirmLines.push(`  • RA ${index + 1}: ${label}`)
        })
        if (deletedRAs.length > 6) {
          confirmLines.push(`  • ... y ${deletedRAs.length - 6} RA(s) más`)
        }
      }
      if (deletedIndicadores.length) {
        confirmLines.push(`- Indicadores a eliminar: ${deletedIndicadores.length}`)
        deletedIndicadores.slice(0, 8).forEach((ind) => {
          const label = ind.descripcion ? ind.descripcion : `Indicador ${ind.indicadorId}`
          confirmLines.push(`  • RA ${ind.raId} / IND ${ind.indicadorId}: ${label}`)
        })
        if (deletedIndicadores.length > 8) {
          confirmLines.push(`  • ... y ${deletedIndicadores.length - 8} indicador(es) más`)
        }
      }
      confirmLines.push('', 'Esta acción no se puede deshacer.')
    }

    const confirmed = await Alert.confirm({
      title: 'Confirmar actualización de asignatura',
      text: confirmLines.join('\n'),
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar',
      type: 'warning',
    })

    if (!confirmed) return

    setLoadingUpdateSubmit(true)
    try {
      const response = await updateAsignaturaWithRAs({
        codigo_asignatura: codigo,
        nombre_asignatura: nombre,
        codigo_docente: docente,
        codigo_programa: normalizeCode(detectedPrograma.codigo_programa),
        periodo,
        creditos: creditosNum,
        grupo,
        sede,
        ras: updateValidRAsForSubmit,
      })

      Alert.success(
        `${response.detail} RAs actualizados: ${response.resumen.ras_actualizados}, creados: ${response.resumen.ras_creados}, eliminados: ${response.resumen.ras_eliminados}. ` +
        `Indicadores actualizados: ${response.resumen.indicadores_actualizados}, creados: ${response.resumen.indicadores_creados}, eliminados: ${response.resumen.indicadores_eliminados}.`
      )
    } catch (e: unknown) {
      Alert.error(getApiErrorMessage(e) || 'No fue posible actualizar la asignatura.')
    } finally {
      setLoadingUpdateSubmit(false)
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
            if (key === 'inicio') void navigateWithCreateGuard('/coordinador')
            else if (key === 'desempenio') void navigateWithCreateGuard('/coordinador/desempenio')
            else if (key === 'asignaturas') void navigateWithCreateGuard('/coordinador/asignaturas')
            else if (key === 'docentes') void navigateWithCreateGuard('/coordinador/docentes')
            else if (key === 'estudiantes') void navigateWithCreateGuard('/coordinador/estudiantes')
            else if (key === 'matriculados') void navigateWithCreateGuard('/coordinador/matriculados')
            else if (key === 'asignaturas-ra') void navigateWithCreateGuard('/coordinador/asignaturas-ra')
            else if (key === 'imports') void navigateWithCreateGuard('/coordinador/imports')
          }}
        />

        <main className="dash-content">
          <ModuleBreadcrumbs
            items={[
              { label: 'Coordinador', to: '/coordinador' },
              { label: 'Asignaturas + RA' },
            ]}
            onNavigate={(to) => {
              void navigateWithCreateGuard(to)
            }}
          />
          <div className="content-title d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <i className="bi bi-journal-bookmark me-2"></i>
              Gestión de Asignaturas + RA
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                void navigateWithCreateGuard('/coordinador/imports?modulo=asig')
              }}
              type="button"
            >
              <i className="bi bi-upload me-1"></i>
              Carga masiva
            </button>
          </div>

          <div className="alert alert-info d-flex align-items-center py-2" role="note">
            <i className="bi bi-info-circle me-2"></i>
            Haz click en uno de los cuadros para abrir el formulario correspondiente.
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6 d-grid">
              <button
                type="button"
                className={`ra-card coordinator-individual-hero text-start w-100 border-0 ${activeForm === 'create' ? 'border border-2 border-danger' : ''}`}
                onClick={() => void handleToggleForm('create')}
              >
                <div className="ra-card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="d-flex align-items-start gap-3">
                    <div className="coordinator-individual-hero-icon bg-danger-subtle text-danger">
                      <i className="bi bi-journal-bookmark"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Crear Asignatura + RAs</h5>
                      <p className="text-muted mb-0">
                        Crea una asignatura nueva y registra varios RAs en una sola operación validada.
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="col-12 col-lg-6 d-grid">
              <button
                type="button"
                className={`ra-card coordinator-individual-hero text-start w-100 border-0 ${activeForm === 'update' ? 'border border-2 border-danger' : ''}`}
                onClick={() => void handleToggleForm('update')}
              >
                <div className="ra-card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="d-flex align-items-start gap-3">
                    <div className="coordinator-individual-hero-icon bg-warning-subtle text-warning">
                      <i className="bi bi-pencil-square"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Actualizar Asignatura existente</h5>
                      <p className="text-muted mb-0">
                        Busca por código, semestre y grupo. Si existe, se cargan los datos para actualizar la asignatura.
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {activeForm === 'create' && (
          <div className="card mb-4 coordinator-form-card shadow-sm border-0">
            <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between">
              <span>
                <i className="bi bi-journal-bookmark-fill me-2"></i>
                Crear Asignatura con RAs
              </span>
            </div>

            <div className="card-body">
              <div className="alert alert-info d-flex align-items-start gap-2">
                <i className="bi bi-info-circle mt-1"></i>
                <div>
                  Usa este formulario para operación individual. La carga masiva se mantiene en el módulo de imports.
                </div>
              </div>

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
                    <strong>Programa detectado automáticamente (estimado):</strong> {detectedPrograma.nombre} ({detectedPrograma.codigo_programa})
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
                  <div className="col-md-3 mb-3">
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

                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Programa <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      title="Programa detectado"
                      value={detectedPrograma ? `${detectedPrograma.codigo_programa} - ${detectedPrograma.nombre}` : 'No detectado'}
                      readOnly
                    />
                    <div className="form-text">Se detecta automáticamente con base en el perfil actual y debe validarse antes de guardar.</div>
                  </div>

                  <div className="col-md-3 mb-3">
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

                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Período <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      title="Período"
                      value={formData.periodo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, periodo: e.target.value }))}
                    >
                      <option value="">Selecciona período</option>
                      {periodos.map((p) => (
                        <option key={p.id_periodo} value={p.descripcion}>{p.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Créditos <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      title="Créditos"
                      min={1}
                      step={1}
                      value={formData.creditos}
                      onChange={(e) => setFormData((prev) => ({ ...prev, creditos: e.target.value }))}
                      placeholder="Ej: 3"
                    />
                  </div>

                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Sede <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      title="Sede"
                      value={formData.sede}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sede: e.target.value }))}
                    >
                      <option value="">Selecciona una sede</option>
                      {sedeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="coordinator-form-section-title mb-3 mt-2 d-flex align-items-center justify-content-between">
                  <span>
                    <i className="bi bi-graph-up-arrow me-2"></i>
                    Resultados de Aprendizaje (RAs)
                  </span>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={addRA}>
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
                              className="btn btn-sm btn-outline-success"
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
                      className={`progress-bar ${isCreateOverLimit ? 'bg-danger' : 'bg-success'} w-pct-${progressStep}`}
                    ></div>
                  </div>
                  <div className={`form-text ${isCreateOverLimit ? 'text-danger' : 'text-success'}`}>
                    {isCreateOverLimit
                      ? 'La suma de porcentajes no puede superar el 100%.'
                      : 'La suma de porcentajes se encuentra dentro del rango permitido.'}
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
          )}

          {activeForm === 'update' && (
          <div className="card mb-4 coordinator-form-card shadow-sm border-0">
            <div className="card-header bg-warning text-white d-flex align-items-center justify-content-between">
              <span>
                <i className="bi bi-search me-2"></i>
                Buscar y actualizar asignatura
              </span>
            </div>

            <div className="card-body">
              <div className="coordinator-form-section-title mb-3">
                <i className="bi bi-funnel me-2"></i>
                Filtros de búsqueda
              </div>

              <div className="row g-3 align-items-end mb-3">
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Código asignatura</label>
                  <input
                    type="text"
                    className="form-control"
                    value={updateFilter.codigo_asignatura}
                    onChange={(e) => setUpdateFilter((prev) => ({ ...prev, codigo_asignatura: e.target.value.toUpperCase() }))}
                    placeholder="Ej: MAT101"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Semestre (período)</label>
                  <select
                    className="form-select"
                    value={updateFilter.periodo}
                    onChange={(e) => setUpdateFilter((prev) => ({ ...prev, periodo: e.target.value }))}
                  >
                    <option value="">Selecciona semestre</option>
                    {periodos.map((p) => (
                      <option key={p.id_periodo} value={p.descripcion}>{p.descripcion}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Grupo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={updateFilter.grupo}
                    onChange={(e) => setUpdateFilter((prev) => ({ ...prev, grupo: e.target.value }))}
                    placeholder="Ej: A"
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Sede</label>
                  <select
                    className="form-select"
                    value={updateFilter.sede}
                    onChange={(e) => setUpdateFilter((prev) => ({ ...prev, sede: e.target.value }))}
                  >
                    <option value="">Todas</option>
                    {sedeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2 d-grid">
                  <button type="button" className="btn btn-danger" onClick={handleLookupAsignatura} disabled={loadingLookup}>
                    {loadingLookup ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateSubmit}>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Código Asignatura</label>
                    <input type="text" className="form-control" value={updateFormData.codigo_asignatura} readOnly />
                  </div>
                  <div className="col-md-5 mb-3">
                    <label className="form-label fw-semibold">Nombre Asignatura</label>
                    <input
                      type="text"
                      className="form-control"
                      value={updateFormData.nombre_asignatura}
                      onChange={(e) => setUpdateFormData((prev) => ({ ...prev, nombre_asignatura: e.target.value }))}
                      placeholder="Nombre asignatura"
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Créditos</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      step={1}
                      value={updateFormData.creditos}
                      onChange={(e) => setUpdateFormData((prev) => ({ ...prev, creditos: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Semestre (período)</label>
                    <input type="text" className="form-control" value={updateFormData.periodo} readOnly />
                  </div>
                  <div className="col-md-2 mb-3">
                    <label className="form-label fw-semibold">Grupo</label>
                    <input type="text" className="form-control" value={updateFormData.grupo} readOnly />
                  </div>
                  <div className="col-md-2 mb-3">
                    <label className="form-label fw-semibold">Sede</label>
                    <select
                      className="form-select"
                      value={updateFormData.sede}
                      onChange={(e) => setUpdateFormData((prev) => ({ ...prev, sede: e.target.value }))}
                    >
                      <option value="">Selecciona una sede</option>
                      {sedeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Programa</label>
                    <input
                      type="text"
                      className="form-control"
                      value={detectedPrograma ? `${detectedPrograma.codigo_programa} - ${detectedPrograma.nombre}` : 'No detectado'}
                      readOnly
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label className="form-label fw-semibold">Docente</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="Buscar docente por nombre, código, correo o documento"
                      value={updateDocenteSearch}
                      onChange={(e) => setUpdateDocenteSearch(e.target.value)}
                    />
                    <select
                      className="form-select"
                      value={updateFormData.codigo_docente}
                      onChange={(e) => setUpdateFormData((prev) => ({ ...prev, codigo_docente: e.target.value }))}
                    >
                      <option value="">Selecciona docente</option>
                      {updateDocentesFiltrados.map((d) => (
                        <option key={d.id_docente} value={d.codigo_docente}>
                          {d.codigo_docente} - {d.nombre} {d.apellido}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {updateFoundId && (
                  <>
                    <div className="coordinator-form-section-title mb-3 mt-2 d-flex align-items-center justify-content-between">
                      <span>
                        <i className="bi bi-graph-up-arrow me-2"></i>
                        RAs e indicadores (edición)
                      </span>
                      <button type="button" className="btn btn-outline-success btn-sm" onClick={addUpdateRA}>
                        <i className="bi bi-plus-lg me-1"></i>
                        Agregar RA
                      </button>
                    </div>

                    {updateRaList.map((ra, index) => (
                      <div className="card mb-3" key={ra.key}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">
                              RA #{index + 1}
                            </h6>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeUpdateRA(ra.key)}
                              disabled={updateRaList.length === 1}
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
                                value={ra.descripcion}
                                onChange={(e) => updateUpdateRA(ra.key, { descripcion: e.target.value })}
                              />
                            </div>
                            <div className="col-md-4 mb-2">
                              <label className="form-label">Porcentaje RA</label>
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                max="100"
                                step="0.01"
                                value={ra.porcentaje_ra}
                                onChange={(e) => updateUpdateRA(ra.key, { porcentaje_ra: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="border rounded p-3 bg-light-subtle mt-2">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                              <h6 className="mb-0">Indicadores de logro</h6>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success"
                                onClick={() => addUpdateIndicador(ra.key)}
                              >
                                <i className="bi bi-plus-lg me-1"></i>
                                Agregar indicador
                              </button>
                            </div>

                            {(ra.indicadores || []).map((ind, indIdx) => (
                              <div className="row g-2 align-items-end mb-2" key={ind.key}>
                                <div className="col-md-7">
                                  <label className="form-label small mb-1">
                                    Descripción indicador #{indIdx + 1} {ind.id_ind ? `(ID ${ind.id_ind})` : '(Nuevo)'}
                                  </label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={ind.descripcion}
                                    onChange={(e) => updateUpdateIndicador(ra.key, ind.key, { descripcion: e.target.value })}
                                  />
                                </div>
                                <div className="col-md-3">
                                  <label className="form-label small mb-1">% indicador</label>
                                  <input
                                    type="number"
                                    className="form-control"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={ind.porcentaje_ind}
                                    onChange={(e) => updateUpdateIndicador(ra.key, ind.key, { porcentaje_ind: e.target.value })}
                                  />
                                </div>
                                <div className="col-md-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger w-100"
                                    onClick={() => removeUpdateIndicador(ra.key, ind.key)}
                                    disabled={(ra.indicadores || []).length === 1}
                                  >
                                    <i className="bi bi-trash me-1"></i>
                                    Quitar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center small mb-1">
                        <span className="text-muted">Suma de porcentajes RA</span>
                        <span className="fw-semibold">{updateSumPct.toFixed(2)}%</span>
                      </div>
                      <div className="progress coordinator-inline-progress">
                        <div className={`progress-bar ${updateSumPct > 100 ? 'bg-danger' : 'bg-success'} w-pct-${Math.round(Math.max(0, Math.min(100, updateSumPct)) / 10) * 10}`}></div>
                      </div>
                    </div>

                    {updateHasDuplicateDescription && (
                      <div className="alert alert-warning">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        Hay descripciones de RA repetidas en la actualización.
                      </div>
                    )}
                  </>
                )}

                <div className="d-flex justify-content-end">
                  <button type="submit" className="btn btn-warning" disabled={!updateFoundId || loadingUpdateSubmit}>
                    {loadingUpdateSubmit ? 'Actualizando...' : 'Actualizar asignatura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default AsignaturasRA
