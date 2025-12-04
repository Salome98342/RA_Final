# Requerimientos del Sistema RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Sistema**: RA-Manager (Results of Learning Manager)

---

## 1. Requerimientos Funcionales

### 1.1 Autenticación y Gestión de Usuarios

#### RF-001: Login de Usuarios
**Descripción**: El sistema debe permitir el inicio de sesión de usuarios con credenciales.  
**Prioridad**: Alta  
**Actores**: Estudiante, Docente, Coordinador  
**Precondiciones**: Usuario registrado en el sistema  
**Flujo Principal**:
1. Usuario ingresa código y contraseña
2. Sistema valida credenciales contra la base de datos
3. Sistema identifica el rol del usuario (estudiante/docente/coordinador)
4. Sistema genera token JWT firmado
5. Sistema redirige al dashboard correspondiente

**Poscondiciones**: Usuario autenticado con sesión activa

---

#### RF-002: Recuperación de Contraseña con OTP
**Descripción**: El sistema debe permitir recuperar contraseña mediante código OTP enviado por email.  
**Prioridad**: Alta  
**Actores**: Todos los usuarios  
**Precondiciones**: Usuario registrado con email válido  
**Flujo Principal**:
1. Usuario solicita recuperación de contraseña
2. Sistema genera OTP de 6 dígitos
3. Sistema envía OTP por email (SMTP)
4. Usuario ingresa OTP recibido
5. Sistema valida OTP (no expirado, no usado)
6. Sistema permite establecer nueva contraseña

**Poscondiciones**: Contraseña actualizada, OTP marcado como usado

---

#### RF-003: Gestión de Perfil
**Descripción**: El sistema debe permitir visualizar y editar datos del perfil de usuario.  
**Prioridad**: Media  
**Actores**: Todos los usuarios  
**Funcionalidades**:
- Ver datos personales (nombre, código, email, documento)
- Editar nombre y email
- Cambiar avatar (formato: JPG/PNG/GIF, tamaño máx: 2MB)
- Cambiar contraseña (validando contraseña actual)

---

### 1.2 Gestión Académica del Coordinador

#### RF-004: Visualización de Dashboard
**Descripción**: El coordinador debe visualizar estadísticas globales del programa.  
**Prioridad**: Alta  
**Actor**: Coordinador  
**Métricas mostradas**:
- Total de estudiantes matriculados
- Total de asignaturas activas
- Total de docentes
- Promedio general por programa
- Distribución de calificaciones

---

#### RF-005: Gestión de Asignaturas
**Descripción**: El coordinador debe poder gestionar las asignaturas del programa.  
**Prioridad**: Alta  
**Actor**: Coordinador  
**Funcionalidades**:
- Listar asignaturas (filtrar por programa, docente, periodo)
- Ver detalle de asignatura (RAs, estudiantes, avance)
- Ver estadísticas de asignatura:
  * Promedio general
  * % de estudiantes aprobados
  * Cobertura de calificaciones
  * Estadísticas por RA

---

#### RF-006: Importación Masiva de Matriculados
**Descripción**: El coordinador debe poder importar matriculados desde archivo CSV.  
**Prioridad**: Alta  
**Actor**: Coordinador  
**Formato CSV**: `codigo_estudiante,codigo_asignatura,periodo`  
**Validaciones**:
- Estudiante existe en la base de datos
- Asignatura existe en la base de datos
- Periodo académico existe
- No duplicar matrículas existentes
- Crear registros de notas vacíos para actividades existentes

**Auditoría**: Registro en tabla `ImportAudit` con errores por fila

---

#### RF-007: Importación Masiva de Docentes
**Descripción**: El coordinador debe poder asignar docentes a asignaturas desde CSV.  
**Prioridad**: Alta  
**Actor**: Coordinador  
**Formato CSV**: `codigo_docente,codigo_asignatura`  
**Validaciones**:
- Docente existe
- Asignatura existe
- No duplicar asignaciones

**Auditoría**: Registro en tabla `ImportAudit`

---

#### RF-008: Importación de Asignaturas y RAs
**Descripción**: El coordinador debe poder crear estructura completa de asignaturas desde CSV.  
**Prioridad**: Alta  
**Actor**: Coordinador  
**Formato CSV**: `codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind`  
**Validaciones**:
- Suma de porcentajes de RAs = 100%
- No duplicar RAs en misma asignatura
- Crear jerarquía: Asignatura → RAs → Indicadores

**Auditoría**: Registro completo con rollback en errores críticos

---

#### RF-009: Consulta de Estadísticas y Avance
**Descripción**: El coordinador debe visualizar estadísticas detalladas de una asignatura.  
**Prioridad**: Alta  
**Actor**: Coordinador  
**Estadísticas**:
- **Globales**: Total estudiantes, promedio, % aprobados
- **Por RA**: Promedio, cobertura, % nivel esperado
- **Por estudiante**: Nota progresiva, estricta, cobertura
- **Distribución**: Rangos de calificaciones

---

### 1.3 Gestión Académica del Docente

#### RF-010: Visualización de Cursos
**Descripción**: El docente debe visualizar los cursos que imparte.  
**Prioridad**: Alta  
**Actor**: Docente  
**Información mostrada**:
- Código y nombre de asignatura
- Periodo académico
- Total de estudiantes matriculados
- Total de RAs
- Total de actividades creadas

---

#### RF-011: Gestión de Actividades Multi-RA
**Descripción**: El docente debe poder crear actividades asociadas a múltiples RAs.  
**Prioridad**: Alta  
**Actor**: Docente  
**Características**:
- Seleccionar múltiples RAs (checkboxes)
- Asignar porcentaje a cada RA (suma = 100%)
- Seleccionar indicadores específicos por cada RA
- Establecer tipo de actividad (Quiz, Taller, Parcial, etc.)
- Definir fecha de cierre
- Descripción de la actividad

**Validaciones**:
- Suma de porcentajes = 100%
- Al menos 1 RA seleccionado
- Cada RA con al menos 1 indicador
- Fecha de cierre >= hoy

**Resultado**: Creación transaccional de:
- Actividad (tabla `actividad`)
- Relaciones RA-Actividad (tabla `ra_actividad`)
- Relaciones indicadores (tabla `ra_actividad_indicador`)
- Registros de notas vacíos (tabla `notas_actividad`)

---

#### RF-012: Calificación de Estudiantes
**Descripción**: El docente debe poder calificar actividades de estudiantes.  
**Prioridad**: Alta  
**Actor**: Docente  
**Funcionalidades**:
- Ver lista de estudiantes matriculados
- Seleccionar actividad a calificar
- Ingresar nota (0.0 - 5.0)
- Agregar retroalimentación personalizada
- Calificar por indicador (opcional)
- Ver resumen de calificaciones actuales

**Validaciones**:
- Nota en rango válido
- Actividad pertenece al curso del docente
- Estudiante matriculado en el curso

**Notificaciones**: Automáticas al estudiante cuando se registra calificación

---

#### RF-013: Gestión de Recursos Educativos
**Descripción**: El docente debe poder subir y gestionar recursos del curso.  
**Prioridad**: Media  
**Actor**: Docente  
**Funcionalidades**:
- **Subir recurso**: PDF, DOCX, PPTX, XLSX, ZIP, imágenes
- **Listar recursos**: Ordenados por fecha de subida
- **Eliminar recurso**: Con confirmación
- **Descargar recurso**: Directo desde filesystem

**Validaciones**:
- Tamaño máximo: 10MB
- Extensión permitida
- Docente imparte el curso

**Almacenamiento**: `/media/recursos/<codigo_asignatura>/<timestamp>_<filename>`

**Notificaciones**: Automáticas a estudiantes cuando se sube nuevo recurso

---

#### RF-014: Importación de Estudiantes (Docente)
**Descripción**: El docente debe poder importar estudiantes a su curso desde CSV.  
**Prioridad**: Baja  
**Actor**: Docente  
**Formato CSV**: Similar a importación de coordinador  
**Restricciones**: Solo para cursos que imparte

---

### 1.4 Funcionalidades del Estudiante

#### RF-015: Visualización de Cursos
**Descripción**: El estudiante debe visualizar los cursos en los que está matriculado.  
**Prioridad**: Alta  
**Actor**: Estudiante  
**Información mostrada**:
- Código y nombre de asignatura
- Periodo académico
- Docente asignado
- Total de RAs
- Total de actividades

---

#### RF-016: Consulta de Actividades Agrupadas
**Descripción**: El estudiante debe ver actividades sin duplicación (agrupadas por actividad).  
**Prioridad**: Alta  
**Actor**: Estudiante  
**Información por actividad**:
- Nombre y descripción
- Tipo de actividad
- Fecha de creación y cierre
- **RAs asociados** (múltiples):
  * Nombre del RA
  * Porcentaje de la actividad en ese RA
  * Indicadores asignados
- Porcentaje total (suma de todos los RAs)
- Nota obtenida (única para toda la actividad)
- Retroalimentación del docente
- Estado: Calificada / Pendiente

---

#### RF-017: Resumen de Calificaciones
**Descripción**: El estudiante debe visualizar resumen de sus calificaciones.  
**Prioridad**: Alta  
**Actor**: Estudiante  
**Métricas mostradas**:
- **Nota acumulada (progresiva)**: Promedio sobre actividades calificadas
- **Nota sobre el total (estricta)**: Incluyendo actividades sin calificar
- **Por cada RA**:
  * Nombre y porcentaje en el curso
  * Nota progresiva del RA
  * Nota estricta del RA
  * Cobertura (% actividades calificadas)
  * Barra visual de progreso

**Cálculos**:
```
Nota Progresiva (RA) = AVG(notas_calificadas) ponderado
Nota Estricta (RA) = Nota_obtenida / Total_RA
Nota Progresiva (Curso) = Σ(nota_RA × %_RA)
Cobertura = (Actividades_calificadas / Total) × 100
```

---

#### RF-018: Visualización de Recursos
**Descripción**: El estudiante debe poder ver y descargar recursos del curso.  
**Prioridad**: Media  
**Actor**: Estudiante  
**Funcionalidades**:
- Listar recursos disponibles
- Ver información: título, fecha, tamaño
- Descargar recurso

---

#### RF-019: Sistema de Notificaciones
**Descripción**: El estudiante debe recibir notificaciones sobre eventos del curso.  
**Prioridad**: Media  
**Actor**: Estudiante (principalmente), todos los usuarios  
**Tipos de notificaciones**:
1. Nueva calificación disponible
2. Nueva actividad creada
3. Actividad próxima a vencer (24-48h)
4. Nuevo recurso subido
5. Actividad vencida sin calificar
6. Comentario/retroalimentación actualizado

**Características**:
- Badge con contador de no leídas
- Dropdown con lista de notificaciones
- Marcar como leída
- Polling cada 30 segundos

---

### 1.5 Requerimientos de Reportes

#### RF-020: Exportación de Datos
**Descripción**: El sistema debe permitir exportar datos a formatos estándar.  
**Prioridad**: Media  
**Formatos**: CSV, PDF  
**Datos exportables**:
- Listado de estudiantes con calificaciones
- Estadísticas por RA
- Historial de importaciones
- Reportes de auditoría

---

## 2. Requerimientos No Funcionales

### 2.1 Rendimiento

#### RNF-001: Tiempo de Respuesta
**Descripción**: Las operaciones del sistema deben tener tiempos de respuesta aceptables.  
**Criterios**:
- Carga de dashboard: < 2 segundos
- Consulta de calificaciones: < 1 segundo
- Login: < 1 segundo
- Importación CSV (100 filas): < 5 segundos
- Carga de actividades agrupadas: < 2 segundos

---

#### RNF-002: Capacidad
**Descripción**: El sistema debe soportar carga concurrente de usuarios.  
**Criterios**:
- Mínimo 100 usuarios concurrentes
- Hasta 10,000 estudiantes registrados
- Hasta 500 asignaturas activas
- Hasta 50 importaciones simultáneas

---

#### RNF-003: Escalabilidad
**Descripción**: El sistema debe ser escalable horizontalmente.  
**Criterios**:
- Arquitectura stateless (sin sesiones en servidor)
- Base de datos con índices optimizados
- Cache de consultas frecuentes
- Posibilidad de balanceo de carga

---

### 2.2 Seguridad

#### RNF-004: Autenticación Segura
**Descripción**: El sistema debe implementar autenticación robusta.  
**Criterios**:
- Contraseñas hasheadas con PBKDF2-SHA256
- Tokens JWT firmados
- Expiración de tokens: 24 horas
- OTP de recuperación válido por 15 minutos
- Envío de OTP por canal seguro (email SMTP)

---

#### RNF-005: Autorización por Roles
**Descripción**: El sistema debe validar permisos por rol.  
**Criterios**:
- Estudiante: Solo sus datos académicos
- Docente: Solo cursos que imparte
- Coordinador: Todos los datos del programa

**Validaciones**:
- Token JWT con campo `rol`
- Middleware de autorización en cada endpoint
- Respuesta 403 Forbidden si no autorizado

---

#### RNF-006: Protección de Datos
**Descripción**: El sistema debe proteger datos sensibles.  
**Criterios**:
- HTTPS en producción
- Validación de inputs (sanitización)
- Protección contra SQL Injection (ORM)
- Protección contra XSS (escaping en frontend)
- CORS configurado correctamente

---

#### RNF-007: Auditoría
**Descripción**: El sistema debe registrar operaciones críticas.  
**Criterios**:
- Tabla `ImportAudit` para importaciones
- Logs de autenticación
- Logs de cambios en calificaciones
- Registro de errores con stack trace

---

### 2.3 Usabilidad

#### RNF-008: Interfaz Intuitiva
**Descripción**: El sistema debe tener una interfaz fácil de usar.  
**Criterios**:
- Diseño responsivo (móvil, tablet, desktop)
- Mensajes de error claros en español
- Feedback visual en operaciones (spinners, toasts)
- Confirmaciones para acciones destructivas
- Breadcrumbs y navegación clara

---

#### RNF-009: Accesibilidad
**Descripción**: El sistema debe ser accesible para usuarios con discapacidades.  
**Criterios**:
- Cumplimiento WCAG 2.1 nivel AA
- Soporte para lectores de pantalla
- Contraste de colores adecuado
- Navegación por teclado
- Etiquetas ARIA en componentes

---

#### RNF-010: Mensajes Estandarizados
**Descripción**: El sistema debe mostrar mensajes claros y consistentes.  
**Criterios**:
- Mensajes en español
- 4 tipos de alertas: success, error, warning, info
- Toasts con auto-cierre (3-5 segundos)
- Confirmaciones antes de eliminar

---

### 2.4 Mantenibilidad

#### RNF-011: Código Modular
**Descripción**: El código debe ser mantenible y extensible.  
**Criterios**:
- Backend: Separación en models, views, serializers, middleware
- Frontend: Componentes React reutilizables
- Convenciones de nomenclatura consistentes
- Comentarios en código complejo
- Documentación de APIs

---

#### RNF-012: Control de Versiones
**Descripción**: El sistema debe usar control de versiones.  
**Criterios**:
- Repositorio Git
- Commits descriptivos
- Branching strategy (main, develop)
- Pull requests con revisión de código

---

### 2.5 Disponibilidad

#### RNF-013: Disponibilidad del Sistema
**Descripción**: El sistema debe estar disponible la mayor parte del tiempo.  
**Criterios**:
- Disponibilidad: 99% (uptime)
- Mantenimiento programado: máximo 4 horas/mes
- Backup automático diario de base de datos
- Plan de recuperación ante desastres

---

#### RNF-014: Tolerancia a Fallos
**Descripción**: El sistema debe manejar errores gracefully.  
**Criterios**:
- Middleware de manejo de errores
- Mensajes de error amigables (sin stack traces al usuario)
- Rollback de transacciones en errores
- Logs de errores para debugging

---

### 2.6 Portabilidad

#### RNF-015: Independencia de Plataforma
**Descripción**: El sistema debe ser portable entre plataformas.  
**Criterios**:
- Backend: Python 3.11+ (multi-plataforma)
- Frontend: Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Base de datos: PostgreSQL 12+ (Windows, Linux, macOS)
- Docker para despliegue containerizado

---

### 2.7 Compatibilidad

#### RNF-016: Navegadores Soportados
**Descripción**: El sistema debe funcionar en navegadores modernos.  
**Criterios**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Responsive design para móviles

---

#### RNF-017: Resoluciones de Pantalla
**Descripción**: El sistema debe adaptarse a diferentes resoluciones.  
**Criterios**:
- Móvil: 360px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+
- Breakpoints de Bootstrap 5

---

### 2.8 Internacionalización

#### RNF-018: Idioma
**Descripción**: El sistema debe estar en español (con posibilidad de expansión).  
**Criterios**:
- Mensajes en español
- Formato de fechas: DD/MM/AAAA
- Formato de números: coma decimal (4,5)
- Preparado para i18n con archivos de traducción

---

## 3. Restricciones Técnicas

### 3.1 Tecnologías Obligatorias
- **Backend**: Django 5.2.6, Django REST Framework
- **Frontend**: React 18.3, TypeScript 5.6+
- **Base de Datos**: PostgreSQL 14+
- **Bundler**: Vite 6.0
- **Estilos**: Bootstrap 5.3

### 3.2 Restricciones de Despliegue
- Python 3.11+ requerido
- Node.js 18+ para build de frontend
- 2GB RAM mínimo
- 10GB espacio en disco

---

## 4. Priorización de Requerimientos

### Críticos (Deben estar en MVP)
- RF-001, RF-002, RF-003: Autenticación
- RF-010, RF-011, RF-012: Gestión docente
- RF-015, RF-016, RF-017: Consultas estudiante
- RNF-004, RNF-005, RNF-006: Seguridad

### Altos (Primera iteración post-MVP)
- RF-004, RF-005, RF-009: Dashboard coordinador
- RF-006, RF-007, RF-008: Importaciones
- RF-013, RF-018: Recursos y notificaciones

### Medios (Iteraciones posteriores)
- RF-020: Exportaciones
- RNF-008, RNF-009: Mejoras de usabilidad
- RNF-018: Internacionalización

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del documento**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager
