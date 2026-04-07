import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/state/SessionContext'
import RoleHomeLayout from '@/components/RoleHomeLayout'
import { getAnunciosByCourse, getCourses } from '@/services/api'

const EstudianteHome: React.FC = () => {
  const navigate = useNavigate()
  const { state } = useSession()
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadAnnouncements = async () => {
      setLoadingAnnouncements(true)
      try {
        const courses = await getCourses()
        const anunciosByCourse = await Promise.all(
          courses.map(async (course) => {
            try {
              const items = await getAnunciosByCourse(course.id)
              return items.map((item) => ({
                ...item,
                curso: course.nombre,
              }))
            } catch {
              return []
            }
          })
        )

        const flattened = anunciosByCourse
          .flat()
          .sort((a, b) => {
            if (a.es_importante !== b.es_importante) return a.es_importante ? -1 : 1
            return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime()
          })

        const lines = flattened.slice(0, 6).map((a) => `${a.es_importante ? '[IMPORTANTE] ' : ''}${a.curso}: ${a.titulo}`)

        if (mounted) {
          setAnnouncements(lines)
        }
      } catch {
        if (mounted) {
          setAnnouncements([])
        }
      } finally {
        if (mounted) {
          setLoadingAnnouncements(false)
        }
      }
    }

    loadAnnouncements()
    return () => {
      mounted = false
    }
  }, [])

  const sidebarItems = [
    { key: 'inicio', icon: 'bi-house-door', title: 'Inicio' },
    { key: 'cursos', icon: 'bi-grid-3x3-gap', title: 'Mis cursos' },
    { key: 'tareas', icon: 'bi-journal-text', title: 'Tareas' },
    { key: 'recursos', icon: 'bi-paperclip', title: 'Recursos' },
  ]

  const moduleCards = [
    {
      key: 'cursos',
      icon: 'bi-grid-3x3-gap',
      title: 'Mis cursos',
      desc: 'Consulta el estado de tus asignaturas por periodo y su progreso general.',
    },
    {
      key: 'tareas',
      icon: 'bi-journal-text',
      title: 'Tareas',
      desc: 'Revisa pendientes, fechas de cierre y actividades calificadas.',
    },
    {
      key: 'recursos',
      icon: 'bi-paperclip',
      title: 'Recursos',
      desc: 'Accede a guías, archivos y anuncios que comparten tus docentes.',
    },
  ]

  const open = (key: string) => {
    if (key === 'inicio') navigate('/estudiante/inicio')
    else if (key === 'cursos') navigate('/estudiante?view=cursos')
    else if (key === 'tareas') navigate('/estudiante?view=tareas')
    else if (key === 'recursos') navigate('/estudiante?view=recursos')
  }

  const additionalSlides = useMemo(() => {
    const total = announcements.length
    const tips = loadingAnnouncements
      ? ['Cargando anuncios recientes de tus docentes...']
      : announcements.length > 0
        ? announcements
        : ['No hay anuncios recientes por mostrar en este momento.']

    return [
      {
        kind: 'text' as const,
        title: loadingAnnouncements ? 'Anuncios de tus docentes' : `Anuncios de tus docentes (${total})`,
        text: 'Consulta aquí los anuncios más recientes publicados en tus cursos.',
        tips,
        variant: 'highlight' as const,
      },
    ]
  }, [announcements, loadingAnnouncements])

  return (
    <RoleHomeLayout
      roleLabel="Estudiante"
      homeTitle="Inicio del Estudiante"
      welcomeName={state.name}
      welcomeFallback="Estudiante"
      welcomeDescription="Este es tu panel principal. Desde el menú lateral puedes entrar a tus cursos, revisar tareas y acceder a los recursos publicados por tus docentes."
      sidebarItems={sidebarItems}
      moduleCards={moduleCards}
      onSidebarClick={open}
      additionalSlides={additionalSlides}
    />
  )
}

export default EstudianteHome
