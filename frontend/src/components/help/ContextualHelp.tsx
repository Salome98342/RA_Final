import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSession, type Role } from '@/state/SessionContext'

type FAQ = {
  question: string
  answer: string
}

type HelpContent = {
  module: string
  description: string
  actions: string[]
  faqs: FAQ[]
}

type HelpMatcher = {
  match: (pathname: string) => boolean
  content: HelpContent
}

const HELP_MATCHERS: HelpMatcher[] = [
  {
    match: (pathname) => pathname === '/login',
    content: {
      module: 'Acceso al sistema',
      description: 'Esta es la entrada al sistema. Aquí validas tus credenciales y el sistema te envía al módulo según tu rol.',
      actions: [
        'Iniciar sesión con código institucional y contraseña.',
        'Ir a recuperación si no recuerdas tu clave.',
        'Revisar el mensaje de error antes de reintentar.',
      ],
      faqs: [
        {
          question: 'No puedo ingresar, ¿qué reviso primero?',
          answer: 'Verifica código y contraseña, revisa mayúsculas y evita espacios al copiar.',
        },
        {
          question: '¿Qué pasa si olvidé la contraseña?',
          answer: 'Usa recuperación. El sistema enviará un enlace o código temporal para restablecerla.',
        },
        {
          question: '¿Por qué me envía a otra pantalla al entrar?',
          answer: 'Porque cada rol tiene su propio módulo: coordinador, docente o estudiante.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/recuperar' || pathname === '/reset',
    content: {
      module: 'Recuperación de acceso',
      description: 'Este módulo te ayuda a recuperar la cuenta cuando olvidaste la contraseña.',
      actions: [
        'Solicitar código o enlace de recuperación.',
        'Validar el token y crear una contraseña nueva.',
        'Volver a login e iniciar sesión.',
      ],
      faqs: [
        {
          question: '¿Cuánto tarda en llegar el correo?',
          answer: 'Normalmente llega en pocos minutos. Revisa también spam.',
        },
        {
          question: 'El enlace no funciona, ¿qué hago?',
          answer: 'Solicita uno nuevo; los enlaces expiran por seguridad.',
        },
        {
          question: '¿Qué contraseña debo crear?',
          answer: 'Usa una clave segura con letras, números y símbolos.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/perfil',
    content: {
      module: 'Perfil de usuario',
      description: 'Aquí administras tus datos personales de cuenta.',
      actions: [
        'Revisar información personal.',
        'Actualizar avatar o foto de perfil.',
        'Cambiar contraseña.',
      ],
      faqs: [
        {
          question: '¿Puedo cambiar mi foto de perfil?',
          answer: 'Si. En esta pantalla puedes cargar o actualizar la imagen del avatar.',
        },
        {
          question: '¿Por qué algunos datos no se pueden editar?',
          answer: 'Porque los datos académicos principales los gestiona el sistema administrativo.',
        },
        {
          question: '¿Esta pantalla cambia según mi rol?',
          answer: 'El perfil existe para todos los roles, pero mantiene tus permisos actuales.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/docente/inicio',
    content: {
      module: 'Inicio docente',
      description: 'Panel principal del docente. Muestra cursos y accesos rápidos de trabajo.',
      actions: [
        'Ver tus asignaturas activas.',
        'Entrar al listado de cursos.',
        'Ir a evaluación y recursos.',
      ],
      faqs: [
        {
          question: '¿Qué puedo hacer desde esta vista?',
          answer: 'Orientarte y navegar. La gestión detallada se hace dentro de cada curso.',
        },
        {
          question: '¿Cómo entro a un curso específico?',
          answer: 'Abre el módulo de cursos y selecciona la materia.',
        },
        {
          question: '¿Puedo crear asignaturas desde aquí?',
          answer: 'No. Esa función es del coordinador.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/docente/cursos',
    content: {
      module: 'Cursos del docente',
      description: 'Aquí ves los cursos que tienes asignados y entras a su gestión.',
      actions: [
        'Ubicar cursos por período o código.',
        'Entrar al curso para gestionar RAs, actividades, calificaciones y recursos.',
        'Validar si el curso está activo.',
      ],
      faqs: [
        {
          question: 'No veo una materia asignada, ¿qué hago?',
          answer: 'Actualiza la sesión. Si no aparece, pide revisión de asignación a coordinación.',
        },
        {
          question: '¿Qué sigue al abrir un curso?',
          answer: 'Gestionar RAs, crear actividades, calificar y publicar recursos/anuncios.',
        },
        {
          question: '¿Puedo editar datos maestros del curso?',
          answer: 'No. Los cambios estructurales los realiza coordinación.',
        },
      ],
    },
  },
  {
    match: (pathname) => /^\/docente\/[^/]+\/ras$/.test(pathname),
    content: {
      module: 'Resultados de aprendizaje (RA)',
      description: 'Aquí organizas la evaluación por resultados de aprendizaje del curso.',
      actions: [
        'Consultar RAs e indicadores del curso.',
        'Revisar actividades vinculadas a cada RA.',
        'Exportar seguimiento y calificaciones.',
      ],
      faqs: [
        {
          question: '¿Para qué sirven los RAs en este módulo?',
          answer: 'Permiten medir si las actividades aportan al aprendizaje esperado.',
        },
        {
          question: '¿Qué hago si un RA no aparece?',
          answer: 'Repórtalo a coordinación; la configuración curricular de RAs la gestiona ese rol.',
        },
        {
          question: '¿Puedo crear un RA nuevo como docente?',
          answer: 'No. El docente gestiona actividades e indicadores, no la estructura curricular.',
        },
      ],
    },
  },
  {
    match: (pathname) => /^\/docente\/[^/]+\/actividades\/nueva$/.test(pathname),
    content: {
      module: 'Creación de actividad',
      description: 'Aquí registras una actividad evaluativa del curso y la vinculas con RA/indicadores.',
      actions: [
        'Crear actividad por RA o multi-RA.',
        'Asociar indicadores de logro.',
        'Definir fecha de cierre.',
      ],
      faqs: [
        {
          question: '¿Qué datos son obligatorios al crear una actividad?',
          answer: 'Nombre, fecha de cierre y asociación con RA/indicadores.',
        },
        {
          question: '¿Puedo editar una actividad creada?',
          answer: 'Sí, si está habilitada para edición en el período activo.',
        },
        {
          question: '¿Esta pantalla sirve para crear asignaturas nuevas?',
          answer: 'No. Solo crea actividades dentro de un curso existente.',
        },
      ],
    },
  },
  {
    match: (pathname) => /^\/docente\/[^/]+\/calificar$/.test(pathname),
    content: {
      module: 'Calificación',
      description: 'Aquí registras y actualizas notas por actividad e indicador.',
      actions: [
        'Seleccionar la actividad a calificar.',
        'Registrar notas y retroalimentación.',
        'Guardar y verificar resultados.',
      ],
      faqs: [
        {
          question: '¿Cómo guardo notas de varios estudiantes?',
          answer: 'Completa la tabla y usa la acción Guardar para enviar los cambios.',
        },
        {
          question: '¿Qué pasa si una nota no se refleja?',
          answer: 'Revisa conexión, filtros activos y actividad seleccionada.',
        },
        {
          question: '¿Puedo calificar cursos que no son míos?',
          answer: 'No. Solo puedes calificar cursos donde estás asignado como docente.',
        },
      ],
    },
  },
  {
    match: (pathname) => /^\/docente\/[^/]+\/recursos$/.test(pathname),
    content: {
      module: 'Recursos del curso',
      description: 'Este módulo reúne materiales, anuncios y gestión de estudiantes del curso.',
      actions: [
        'Subir y administrar recursos académicos.',
        'Publicar anuncios para estudiantes.',
        'Buscar/agregar estudiantes o importar CSV del curso.',
      ],
      faqs: [
        {
          question: '¿Qué tipo de archivos puedo subir?',
          answer: 'Depende de la configuración del sistema; normalmente PDF y documentos.',
        },
        {
          question: '¿Cómo elimino un recurso incorrecto?',
          answer: 'Busca el recurso en la lista y usa Eliminar si tienes permiso.',
        },
        {
          question: '¿Puedo matricular estudiantes de cualquier asignatura?',
          answer: 'No. Solo puedes gestionar estudiantes en tus cursos asignados.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/estudiante/inicio' || pathname === '/estudiante',
    content: {
      module: 'Inicio estudiante',
      description: 'Es tu panel principal. Resume asignaturas, pendientes y avance.',
      actions: [
        'Ver asignaturas del período activo.',
        'Identificar actividades próximas o pendientes.',
        'Entrar al detalle para revisar notas y cobertura.',
      ],
      faqs: [
        {
          question: '¿Dónde veo mis asignaturas activas?',
          answer: 'En el panel principal de esta vista, con acceso directo al detalle por materia.',
        },
        {
          question: '¿Cómo reviso mi avance?',
          answer: 'Usa los indicadores de progreso y entra al detalle de cada materia.',
        },
        {
          question: '¿Puedo editar notas desde este módulo?',
          answer: 'No. Como estudiante solo puedes consultar; el docente registra notas.',
        },
      ],
    },
  },
  {
    match: (pathname) => /^\/estudiante\/asignaturas\/[^/]+\/detalle$/.test(pathname),
    content: {
      module: 'Detalle de materia',
      description: 'Muestra notas, cobertura por RA, recursos y anuncios de la materia.',
      actions: [
        'Revisar calificaciones por actividad e indicador.',
        'Consultar avance y cobertura de aprendizaje.',
        'Leer anuncios y descargar materiales.',
      ],
      faqs: [
        {
          question: '¿Cómo interpreto mi rendimiento?',
          answer: 'Compara tus notas por actividad con el avance por RA para detectar fortalezas y brechas.',
        },
        {
          question: '¿Puedo descargar recursos desde aquí?',
          answer: 'Sí, cuando el docente haya publicado materiales en el curso.',
        },
        {
          question: '¿Puedo subir tareas o crear actividades aquí?',
          answer: 'No. Esta vista es de consulta para el estudiante.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador',
    content: {
      module: 'Dashboard coordinador',
      description: 'Tablero general del programa para monitoreo académico y operativo.',
      actions: [
        'Ver indicadores globales de asignaturas, docentes y estudiantes.',
        'Identificar módulos que requieren acción.',
        'Navegar a gestión detallada.',
      ],
      faqs: [
        {
          question: '¿Qué indicadores debo vigilar aquí?',
          answer: 'Cobertura de RAs, asignaturas activas, docentes asignados e importaciones pendientes.',
        },
        {
          question: '¿Desde dónde navego a gestión detallada?',
          answer: 'Desde el menú: asignaturas, docentes, estudiantes, matrícula e importaciones.',
        },
        {
          question: '¿Este panel está disponible para docentes?',
          answer: 'No. Es una vista exclusiva del rol coordinador.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador/asignaturas',
    content: {
      module: 'Asignaturas',
      description: 'Aquí el coordinador administra asignaturas y su estructura académica.',
      actions: [
        'Listar asignaturas con filtros y búsqueda.',
        'Crear o actualizar asignaturas.',
        'Entrar a analítica por materia.',
      ],
      faqs: [
        {
          question: '¿Cómo consulto la analítica de una materia?',
          answer: 'Selecciona la materia y abre su analítica desde las acciones disponibles.',
        },
        {
          question: '¿Qué hago si falta una materia?',
          answer: 'Verifica importación o regístrala manualmente.',
        },
        {
          question: '¿Puede un docente crear asignaturas desde su módulo?',
          answer: 'No. La gestión de asignaturas es responsabilidad de coordinación.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador/desempenio',
    content: {
      module: 'Dashboard de desempeño',
      description: 'Este tablero identifica estudiantes con bajo desempeño y asignaturas con estudiantes en bajo desempeño según filtros de período y asignatura.',
      actions: [
        'Filtrar por período y asignatura para enfocar el análisis.',
        'Revisar estudiantes con RA(s) por debajo del umbral.',
        'Consultar ranking de asignaturas con mayor porcentaje de riesgo.',
      ],
      faqs: [
        {
          question: '¿Por qué una gráfica aparece vacía?',
          answer: 'Puede no haber datos con bajo desempeño en los filtros actuales. Cambia período o usa vista general.',
        },
        {
          question: '¿Qué son las asignaturas con estudiantes con bajo desempeño?',
          answer: 'Son las asignaturas que tienen uno o más estudiantes con al menos un RA con nota inferior a 3.0.',
        },
        {
          question: '¿Este tablero altera notas o matrículas?',
          answer: 'No. Es solo de consulta y apoyo para decisiones académicas.',
        },
      ],
    },
  },
  {
    match: (pathname) => /^\/coordinador\/asignaturas\/[^/]+\/analitica$/.test(pathname),
    content: {
      module: 'Analítica de asignatura',
      description: 'Vista consolidada del curso para tomar decisiones académicas con datos.',
      actions: [
        'Revisar cobertura por RA y tendencia de logro.',
        'Analizar aprobación y promedio del curso.',
        'Detectar asignaturas con riesgo académico.',
      ],
      faqs: [
        {
          question: '¿Cómo uso esta analítica para mejoras?',
          answer: 'Identifica RAs con bajo logro y define acciones con el equipo docente.',
        },
        {
          question: '¿Los datos son en tiempo real?',
          answer: 'Se actualizan con los registros de docentes y las importaciones.',
        },
        {
          question: '¿Esta vista permite editar notas?',
          answer: 'No. Es una vista de seguimiento para coordinación.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador/docentes',
    content: {
      module: 'Docentes',
      description: 'Módulo para gestionar docentes y su información básica.',
      actions: [
        'Listar y buscar docentes.',
        'Crear docentes de forma individual.',
        'Apoyar vinculación por importación o gestión manual.',
      ],
      faqs: [
        {
          question: '¿Puedo crear docentes desde esta vista?',
          answer: 'Sí, según permisos, mediante registro manual o importación.',
        },
        {
          question: '¿Cómo reviso su carga académica?',
          answer: 'Consulta el detalle de asignación de cada docente.',
        },
        {
          question: '¿Un docente puede gestionar otros docentes?',
          answer: 'No. Esta función es administrativa y corresponde al coordinador.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador/estudiantes',
    content: {
      module: 'Estudiantes',
      description: 'Aquí gestionas estudiantes del programa: consulta, registro y seguimiento.',
      actions: [
        'Listar y buscar estudiantes.',
        'Crear estudiante individual.',
        'Consultar perfil académico para seguimiento.',
      ],
      faqs: [
        {
          question: '¿Cómo actualizo datos de un estudiante?',
          answer: 'Abre su registro y aplica los cambios permitidos.',
        },
        {
          question: '¿Por qué un estudiante no aparece?',
          answer: 'Puede faltar importación o no estar matriculado en el período filtrado.',
        },
        {
          question: '¿Puede un estudiante crear su propio registro?',
          answer: 'No. El alta administrativa de estudiantes la gestiona coordinación.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador/matriculados',
    content: {
      module: 'Matriculados',
      description: 'Este módulo controla la matrícula por asignatura y período.',
      actions: [
        'Consultar estudiantes matriculados por materia y período.',
        'Agregar o ajustar matrículas de forma puntual.',
        'Validar consistencia después de importaciones.',
      ],
      faqs: [
        {
          question: '¿Cómo corrijo una matrícula incorrecta?',
          answer: 'Usa la gestión individual o vuelve a importar datos corregidos.',
        },
        {
          question: '¿Puedo filtrar por período o materia?',
          answer: 'Sí, utiliza los filtros de la pantalla para acotar la consulta.',
        },
        {
          question: '¿Puede un docente administrar matrículas globales?',
          answer: 'No. Esa administración corresponde al coordinador.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador/asignaturas-ra',
    content: {
      module: 'Asignaturas - RA',
      description: 'Esta pantalla relaciona asignaturas con resultados de aprendizaje (RA).',
      actions: [
        'Vincular asignaturas con sus RAs.',
        'Revisar consistencia de porcentajes y cobertura.',
        'Ajustar relación curricular cuando sea necesario.',
      ],
      faqs: [
        {
          question: '¿Para qué sirve esta relación?',
          answer: 'Garantiza que cada asignatura aporte a los RAs esperados del programa.',
        },
        {
          question: '¿Qué impacto tiene cambiar una relación?',
          answer: 'Afecta reportes de cobertura y análisis de logro.',
        },
        {
          question: '¿Puede el docente redefinir estas relaciones?',
          answer: 'No. Esta configuración la administra coordinación curricular.',
        },
      ],
    },
  },
  {
    match: (pathname) => /^\/coordinador\/asignatura\/[^/]+$/.test(pathname),
    content: {
      module: 'Detalle de asignatura',
      description: 'Permite revisar una asignatura en detalle: configuración y estado académico.',
      actions: [
        'Consultar información estructural de la asignatura.',
        'Revisar vinculación de RAs e indicadores.',
        'Tomar decisiones de ajuste con los datos disponibles.',
      ],
      faqs: [
        {
          question: '¿Qué puedo revisar en este detalle?',
          answer: 'Información general, RAs asociados y comportamiento académico del curso.',
        },
        {
          question: '¿Cómo regreso al listado general?',
          answer: 'Usa la navegación de la pantalla o vuelve al módulo de asignaturas.',
        },
        {
          question: '¿Esta vista permite calificar estudiantes?',
          answer: 'No. La calificación se realiza en el módulo docente.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/coordinador/imports',
    content: {
      module: 'Importaciones',
      description: 'Centraliza cargas masivas de estudiantes, docentes, matrículas y estructura académica.',
      actions: [
        'Importar estudiantes, docentes y matriculados.',
        'Importar asignaturas con RAs e indicadores.',
        'Revisar errores y volver a cargar.',
      ],
      faqs: [
        {
          question: '¿Qué formato deben tener los archivos?',
          answer: 'Usa las plantillas oficiales para evitar errores de estructura.',
        },
        {
          question: '¿Cómo reviso errores de importación?',
          answer: 'Consulta el resumen de errores al finalizar cada proceso.',
        },
        {
          question: '¿Puede un docente hacer esta importación global?',
          answer: 'No. Este módulo es administrativo y corresponde al coordinador.',
        },
      ],
    },
  },
]

const DEFAULT_HELP: HelpContent = {
  module: 'Ayuda contextual',
  description: 'Esta pantalla hace parte del flujo académico de RA Manager. Aquí verás su objetivo y uso básico.',
  actions: [
    'Leer la descripción del módulo.',
    'Revisar funciones disponibles según tu rol.',
    'Consultar preguntas frecuentes.',
  ],
  faqs: [
    {
      question: '¿Cómo se actualiza esta ayuda?',
      answer: 'El contenido cambia automáticamente según la ruta donde estés.',
    },
    {
      question: '¿A quién reporto un problema funcional?',
      answer: 'Repórtalo a soporte o a coordinación técnica del sistema.',
    },
  ],
}

function getHelpForPath(pathname: string): HelpContent {
  const found = HELP_MATCHERS.find((entry) => entry.match(pathname))
  return found?.content ?? DEFAULT_HELP
}

function getRoleLabel(role: Role): string {
  if (role === 'coordinador') return 'Coordinador'
  if (role === 'docente') return 'Docente'
  if (role === 'estudiante') return 'Estudiante'
  return 'Invitado'
}

function getRoleGuidance(pathname: string, role: Role): string {
  if (pathname.startsWith('/coordinador')) {
    if (role === 'coordinador') {
      return 'Estás en un módulo administrativo. Aquí puedes gestionar datos maestros, importaciones y analítica institucional.'
    }
    return 'Este módulo es exclusivo de coordinación.'
  }

  if (pathname.startsWith('/docente')) {
    if (role === 'docente') {
      return 'Estás en un módulo operativo docente. Aquí gestionas tu curso: actividades, calificación, recursos y comunicación.'
    }
    if (role === 'coordinador') {
      return 'Ingresaste a una vista docente con rol coordinador. Úsala para seguimiento, no para cambios curriculares.'
    }
    return 'Este módulo corresponde al rol docente.'
  }

  if (pathname.startsWith('/estudiante')) {
    if (role === 'estudiante') {
      return 'Estás en un módulo de consulta estudiantil. Puedes revisar avance, notas, recursos y anuncios.'
    }
    return 'Esta vista es de seguimiento del estudiante.'
  }

  if (pathname === '/perfil') {
    return 'El perfil está disponible para todos los roles autenticados. Solo permite gestión personal de cuenta.'
  }

  if (pathname === '/login' || pathname === '/recuperar' || pathname === '/reset') {
    return 'Módulo de acceso público. No requiere rol autenticado.'
  }

  return 'Revisa tus permisos antes de ejecutar acciones.'
}

const ContextualHelp = () => {
  const location = useLocation()
  const { state } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const isPublicRoute = location.pathname === '/login' || location.pathname === '/recuperar' || location.pathname === '/reset'
  const effectiveRole: Role = isPublicRoute ? null : state.role

  const content = useMemo(() => getHelpForPath(location.pathname), [location.pathname])
  const roleGuidance = useMemo(() => getRoleGuidance(location.pathname, effectiveRole), [location.pathname, effectiveRole])

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  return (
    <>
      <button
        type="button"
        className="context-help-trigger"
        aria-label="Abrir ayuda contextual"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        ?
      </button>

      {isOpen ? (
        <section className="context-help-panel" aria-label="Ayuda contextual del módulo actual">
          <div className="context-help-header">
            <h6 className="context-help-title mb-1">{content.module}</h6>
            <button
              type="button"
              className="context-help-close"
              aria-label="Cerrar ayuda contextual"
              onClick={() => setIsOpen(false)}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>

          <p className="context-help-description">{content.description}</p>

          <div className="context-help-role-note" role="note">
            <p className="context-help-role-note-title">Rol actual: {getRoleLabel(effectiveRole)}</p>
            <p className="context-help-role-note-text">{roleGuidance}</p>
          </div>

          <div className="context-help-actions">
            <p className="context-help-section-title">Qué puedes hacer en esta pantalla</p>
            <ul className="context-help-list mb-0">
              {content.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="context-help-faqs" role="list">
            <p className="context-help-section-title mb-0">Preguntas frecuentes</p>
            {content.faqs.map((item) => (
              <article className="context-help-faq" key={item.question} role="listitem">
                <p className="context-help-question">{item.question}</p>
                <p className="context-help-answer">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

export default ContextualHelp
