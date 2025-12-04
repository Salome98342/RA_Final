# Diagramas UML - RA Manager

Este directorio contiene todos los diagramas PlantUML del sistema RA Manager.

## 📋 Diagramas Disponibles

### 1. Diagramas de Casos de Uso
**Ubicación:** `casos_de_uso/`

Los casos de uso están organizados por tipo de usuario para mejor legibilidad:

#### 1.1 Casos de Uso - Estudiante
**Archivo:** `casos_uso_estudiante.puml`

Casos de uso específicos para estudiantes:
- **Autenticación:** Login, recuperación de contraseña, cambio de contraseña
- **Gestión de Perfil:** Ver y editar perfil, subir avatar
- **Consulta de Cursos:** Ver cursos actuales y anteriores, filtrar por periodo
- **Consulta de Calificaciones:** Ver actividades agrupadas, notas por indicador, resumen de notas (progresiva, estricta, cobertura)
- **Gestión de Recursos:** Ver y descargar recursos del curso
- **Sistema de Notificaciones:** Ver notificaciones de calificaciones y actividades
- **Gestión de Tareas:** Ver cronograma de actividades pendientes

#### 1.2 Casos de Uso - Docente
**Archivo:** `casos_uso_docente.puml`

Casos de uso específicos para docentes:
- **Autenticación:** Login, recuperación de contraseña, cambio de contraseña
- **Gestión de Perfil:** Ver y editar perfil, subir avatar
- **Gestión de Cursos:** Ver cursos asignados, filtrar por periodo, gestionar RAs
- **Gestión de Actividades:** Crear actividades, asignar indicadores, establecer fechas
- **Gestión de Calificaciones:** Calificar estudiantes, registrar notas por indicador, dar retroalimentación, ver estadísticas
- **Gestión de Recursos:** Subir, ver y eliminar recursos educativos
- **Gestión de Estudiantes:** Ver lista de estudiantes, importar desde CSV, ver historial de notas

#### 1.3 Casos de Uso - Coordinador
**Archivo:** `casos_uso_coordinador.puml`

Casos de uso específicos para coordinadores:
- **Autenticación:** Login, recuperación de contraseña, cambio de contraseña
- **Gestión de Perfil:** Ver y editar perfil, subir avatar
- **Visualización de Dashboard:** Ver estadísticas globales, métricas por periodo
- **Gestión de Asignaturas:** Filtrar por programa/docente/periodo, ver detalles, RAs, estudiantes y avance
- **Importación Masiva:** Importar matriculados, docentes y asignaturas desde CSV con validaciones
- **Gestión de Programas Académicos:** Ver, crear y editar programas
- **Gestión de Periodos Académicos:** Ver, crear y editar periodos académicos
- **Auditoría y Reportes:** Ver historial de importaciones, generar reportes
- **Vista de Docente:** Acceso completo a funcionalidades de docente en cualquier asignatura

### 2. Diagrama de Clases
**Ubicación:** `clases/diagrama_clases.puml`

Representa todas las entidades del modelo de datos con sus atributos, métodos y relaciones:
- Modelos de autenticación (Docente, Estudiante, Coordinador, PasswordResetOTP)
- Estructura académica (Programa, PeriodoAcademico, Asignatura)
- Resultados de aprendizaje (RA, Indicadores, Actividades)
- Sistema de calificaciones (Matricula, NotasActividad)
- Recursos y auditoría

### 3. Diagrama de Paquetes
**Ubicación:** `paquetes/diagrama_paquetes.puml`

Muestra la arquitectura del sistema organizada en paquetes:
- **Frontend:** React components, services, state management
- **Backend:** Django views, models, serializers, middleware
- **Database:** PostgreSQL con todas las tablas
- **External Services:** Gmail SMTP, File Storage

### 4. Diagrama Entidad-Relación
**Ubicación:** `entidad_relacion/diagrama_er.puml`

Diagrama de base de datos detallado con:
- Todas las tablas con sus campos y tipos de datos
- Primary keys (PK) y Foreign keys (FK)
- Constraints (UNIQUE, CHECK)
- Relaciones entre entidades con cardinalidad

### 5. Diagramas de Secuencia
**Ubicación:** `secuencia/`

Los diagramas de secuencia están organizados por actor y flujo de interacción:

#### 5.1 Secuencia: Login y Recuperación de Contraseña
**Archivo:** `secuencia_login_recuperacion.puml`

Flujos completos de autenticación (todos los roles):
- Proceso de login con validación de credenciales por rol
- Búsqueda de usuario en tablas correspondientes
- Generación y firma de JWT token
- Recuperación de contraseña con sistema OTP
- Envío de código por email (Gmail SMTP)
- Verificación de código OTP con validación de expiración
- Restablecimiento de contraseña con hash seguro

#### 5.2 Secuencia: Estudiante - Ver Notas y Actividades
**Archivo:** `secuencia_estudiante_notas.puml` ⭐ **[NUEVO]**

Flujo completo del estudiante consultando información académica:
- Carga del dashboard con cursos y perfil
- Obtención de matrícula del estudiante
- **Actividades agrupadas por múltiples RAs**: Vista de actividades asociadas a varios RAs con porcentajes
- Resumen de calificaciones progresivas y estrictas por RA
- Cálculo de cobertura (% actividades calificadas)
- Ver y descargar recursos educativos
- Sistema de notificaciones en memoria

#### 5.3 Secuencia: Estudiante - Consulta de Calificaciones (Detalle)
**Archivo:** `secuencia_estudiante_calificaciones.puml`

Vista detallada del sistema de calificaciones:
- Carga del dashboard con cursos y perfil
- Obtención de matrícula del estudiante
- Consulta de actividades agrupadas por curso
- Visualización de notas por actividad e indicador
- Cálculo y muestra de resumen de calificaciones:
  * Nota progresiva (avance actual)
  * Nota estricta (sobre el total)
  * Cobertura por RA
- Consulta de notificaciones en tiempo real
- Marcar notificaciones como leídas

#### 5.4 Secuencia: Docente - Crear Actividad Multi-RA
**Archivo:** `secuencia_docente_crear_actividad.puml` ⭐ **[ACTUALIZADO]**

Proceso completo de creación de actividades con múltiples RAs:
- Carga de formulario con RAs del curso e indicadores
- Obtención de tipos de actividad disponibles
- **Selección de múltiples RAs**: Checkbox para cada RA
- **Asignación de porcentajes por RA**: Input individual para cada RA seleccionado
- **Selección de indicadores por RA**: Select múltiple específico para cada RA
- Validaciones:
  * Suma de porcentajes = 100%
  * Al menos 1 RA seleccionado
  * Cada RA con al menos 1 indicador
- Creación atómica con transacción:
  * Insert en tabla `actividad`
  * Insert múltiple en `ra_actividad` (uno por cada RA con su %)
  * Insert múltiple en `ra_actividad_indicador` (indicadores por cada RA)
  * Insert en `notas_actividad` para cada estudiante matriculado (por cada RA-Actividad)
- Actualización de vista con actividad agrupada

#### 5.5 Secuencia: Docente - Gestión de Recursos Educativos
**Archivo:** `secuencia_docente_recursos.puml` ⭐ **[NUEVO]**

Gestión completa de recursos educativos:
- Ver lista de recursos del curso
- **Subir nuevo recurso**:
  * Validación local (extensión, tamaño <= 10MB)
  * Validación backend (permisos, malware básico)
  * Almacenamiento en `/media/recursos/<curso>/<timestamp>_<file>`
  * Registro en tabla `recurso`
  * Notificación a estudiantes matriculados
- **Descargar recurso**: GET directo desde filesystem
- **Eliminar recurso**:
  * Confirmación con diálogo
  * Validación de permisos docente
  * Eliminación física del archivo
  * Eliminación del registro en DB
- **Manejo de errores**: Archivo no encontrado (inconsistencia DB/filesystem)

#### 5.6 Secuencia: Docente - Calificación de Estudiantes
**Archivo:** `secuencia_calificar.puml`

Proceso completo de calificación por docente:
- Carga de cursos, RAs y estudiantes
- Selección de actividad e indicadores
- Registro de calificaciones con validaciones
- Calificación por indicador específico (opcional)
- Retroalimentación personalizada
- Cálculo automático de promedios (progresivo y estricto)
- Sistema de notificaciones al estudiante

#### 5.7 Secuencia: Coordinador - Importación Masiva CSV
**Archivo:** `secuencia_coordinador_importacion.puml` ⭐ **[ACTUALIZADO]**

Sistema completo de importación con 3 tipos:

**1. Importar Matriculados** (`codigo_estudiante,codigo_asignatura,periodo`):
- Parseo y validación de CSV
- Validaciones por fila:
  * Estudiante existe
  * Asignatura existe
  * Periodo académico existe
  * No duplicados
- Creación de `matricula`
- Creación automática de `notas_actividad` para actividades existentes
- Registro en `ImportAudit` con errores/warnings

**2. Importar Docentes** (`codigo_docente,codigo_asignatura`):
- Validaciones: docente y asignatura existen
- Asignación docente-asignatura
- Auditoría de importación

**3. Importar Asignaturas y RAs** (CSV complejo con múltiples columnas):
- Estructura: `codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind`
- Procesamiento jerárquico:
  * Nivel 1: Crear/actualizar `asignatura`
  * Nivel 2: Crear `resultado_de_aprendizaje` con porcentajes
  * Nivel 3: Crear `indicadores_de_logro`
- Validación: suma de % de RAs = 100%
- Transacciones atómicas con rollback en errores

**Características comunes**:
- Auditoría completa con `ImportAudit`
- Historial consultable con errores por fila
- Reporte detallado post-importación

#### 5.8 Secuencia: Coordinador - Consulta de Estadísticas y Avance
**Archivo:** `secuencia_coordinador_avance.puml` ⭐ **[NUEVO]**

Consulta detallada de estadísticas por curso:
- Filtrado de asignaturas por programa/docente/periodo
- Selección de curso específico
- **Estadísticas globales del curso**:
  * Total de estudiantes matriculados
  * Promedio general del curso
  * % de estudiantes aprobados (nota >= 3.0)
  * Distribución de calificaciones por rangos
- **Estadísticas por RA**:
  * Promedio del RA
  * Cobertura (% actividades calificadas)
  * % estudiantes con nivel de logro esperado
- **Estadísticas por estudiante**:
  * Nota progresiva y estricta
  * Notas por RA
  * Cobertura individual
- **Queries complejas**:
  * Agregaciones con `AVG()`, `COUNT()`, `GROUP BY`
  * Joins múltiples (matricula, notas_actividad, ra_actividad)
  * Cálculos ponderados por porcentajes

### 6. Diagramas de Flujo
**Ubicación:** `flujo/`

#### 6.1 Flujo: Calificación de Estudiantes
**Archivo:** `flujo_calificacion.puml`

Diagrama de actividades que muestra:
- Selección de RA y actividad
- Validación de permisos
- Ingreso de notas y retroalimentación
- Calificación por indicadores específicos
- Cálculo de promedios actualizados

#### 6.2 Flujo: Importación de Datos
**Archivo:** `flujo_importacion.puml`

Proceso de importación masiva (coordinador):
- Validación de archivos CSV
- Procesamiento por filas con manejo de errores
- Importación de matriculados, docentes y asignaturas
- Sistema de auditoría
- Reporte de resultados

#### 6.3 Flujo: Crear Actividad Multi-RA
**Archivo:** `flujo_crear_actividad_multi_ra.puml` ⭐ **[NUEVO]**

Flujo completo de creación de actividades con múltiples RAs:
- Formulario con selección de múltiples RAs
- Asignación de porcentajes por RA
- Selección de indicadores por cada RA
- Validaciones locales y backend:
  * Suma de porcentajes = 100%
  * Al menos 1 RA seleccionado
  * Cada RA con al menos 1 indicador
  * Porcentajes > 0
- Creación transaccional:
  * Actividad → ra_actividad (múltiples) → ra_actividad_indicador
  * Registros de notas_actividad para estudiantes
- Vista de actividades agrupadas post-creación

### 7. Diagramas Transversales (Todos los Roles)

#### 7.1 Sistema de Notificaciones
**Archivo:** `secuencia/secuencia_notificaciones.puml` ⭐ **[NUEVO]**

Sistema de notificaciones en memoria (_NOTIFICATIONS_CACHE):
- **Registro de notificaciones**: Eventos del sistema disparan notificaciones
- **Polling**: Frontend consulta cada 30 segundos
- **Tipos de notificaciones**:
  * Nueva calificación
  * Nueva actividad creada
  * Actividad próxima a vencer (24-48h)
  * Nuevo recurso subido
  * Actividad vencida sin nota
  * Comentario/retroalimentación
- **Marcar como leída**: Actualización en cache
- **Badge con contador**: Notificaciones no leídas
- **Limitaciones actuales**: Cache in-memory (se pierde al reiniciar)
- **Mejoras sugeridas**: Persistir en DB, Redis, WebSockets

#### 7.2 Gestión de Perfil
**Archivo:** `secuencia/secuencia_perfil.puml` ⭐ **[NUEVO]**

Funcionalidades de perfil para todos los roles:
- **Ver perfil**: Datos personales + información académica por rol
  * Estudiante: periodos académicos matriculados
  * Docente: asignaturas que imparte
  * Coordinador: programas que coordina
- **Editar perfil**: Actualizar nombre, email, teléfono
- **Cambiar avatar**: 
  * Upload de imágenes (JPG, PNG, GIF)
  * Validaciones: formato, tamaño <= 2MB, dimensiones
  * Almacenamiento en `/media/avatars/<rol>_<id>_<timestamp>`
  * Eliminación de avatar anterior
- **Cambiar contraseña**:
  * Validar contraseña actual
  * Nueva contraseña (mínimo 8 caracteres)
  * Hash con PBKDF2-SHA256

### 8. Diagrama de Componentes
**Ubicación:** `componentes/diagrama_componentes.puml`

Arquitectura de componentes del sistema:
- **Capa de Presentación:** React components, state management
- **Capa de Aplicación:** Django views, business logic
- **Capa de Datos:** ORM models, PostgreSQL
- **Servicios Externos:** Email, File storage
- Interfaces y dependencias entre componentes

### 9. Diagrama de Despliegue
**Ubicación:** `despliegue/diagrama_despliegue.puml`

Arquitectura de infraestructura:
- Nodos de cliente (Web Browser)
- Servidores frontend (Nginx/Apache)
- Servidores backend (Django + Gunicorn)
- Base de datos (PostgreSQL)
- Reverse proxy / Load balancer
- Servicios externos (Gmail SMTP)
- Opciones de escalabilidad horizontal
- Configuraciones de producción

## 📊 Resumen de Cobertura del Sistema

### Endpoints API Documentados: 30+
✅ Login y autenticación (JWT)  
✅ Recuperación de contraseña con OTP  
✅ Gestión de perfil (ver, editar, avatar, contraseña)  
✅ Coordinador: asignaturas, estadísticas, importaciones (3 tipos)  
✅ Docente: crear actividades multi-RA, calificar, recursos  
✅ Estudiante: ver notas, actividades agrupadas, recursos  
✅ Notificaciones en tiempo real  

### Modelos del Dominio: 18+
✅ Todos documentados en diagrama de clases y ER

### Páginas Frontend: 15+
✅ Todas las rutas documentadas en diagramas de secuencia

### Componentes React: 15+
✅ Componentes principales documentados

### Funcionalidades Clave:
✅ **Sistema Multi-RA**: Actividades asociadas a múltiples RAs  
✅ **Calificación Progresiva**: Notas sobre lo calificado vs total  
✅ **Importación CSV**: 3 tipos con auditoría completa  
✅ **Recursos Educativos**: Upload/download con validaciones  
✅ **Notificaciones**: Sistema en memoria con 6 tipos  
✅ **Gestión de Perfil**: Ver, editar, avatar, contraseña  
✅ **Sistema OTP**: Recuperación segura de contraseña  

---

## 🚀 Cómo Visualizar los Diagramas

### Opción 1: Visual Studio Code
1. Instala la extensión **PlantUML** (jebbs.plantuml)
2. Abre cualquier archivo `.puml`
3. Presiona `Alt+D` para ver la vista previa

### Opción 2: PlantUML Online
1. Ve a [plantuml.com/es/](http://www.plantuml.com/plantuml/)
2. Copia y pega el contenido de cualquier archivo `.puml`
3. Visualiza el diagrama generado

### Opción 3: PlantUML CLI
```bash
# Instalar PlantUML
npm install -g node-plantuml

# Generar PNG de un diagrama
puml generate casos_de_uso/casos_de_uso.puml -o output.png

# Generar todos los diagramas
find . -name "*.puml" -exec puml generate {} \;
```

### Opción 4: IntelliJ IDEA / PyCharm
1. Instala el plugin **PlantUML integration**
2. Abre cualquier archivo `.puml`
3. El diagrama se renderiza automáticamente

## 📊 Resumen de Características

### Características Clave Documentadas:

✅ **Sistema de Autenticación Multi-rol**
- Login con JWT tokens
- Recuperación de contraseña con OTP
- Roles: Estudiante, Docente, Coordinador

✅ **Gestión de Resultados de Aprendizaje**
- RAs con porcentajes configurables
- Indicadores de logro por RA
- Actividades con múltiples indicadores

✅ **Sistema de Calificación Avanzado**
- Calificación por actividad
- Calificación por indicador específico
- Cálculo de nota progresiva y estricta
- Cálculo de cobertura
- Retroalimentación personalizada

✅ **Importación Masiva de Datos**
- CSV para matriculados, docentes y asignaturas
- Validaciones y sanitización
- Sistema de auditoría
- Manejo robusto de errores

✅ **Gestión de Recursos**
- Subida de archivos educativos
- Avatares de usuario
- Almacenamiento organizado

✅ **Sistema de Notificaciones**
- Notificaciones en tiempo real
- Alertas de calificaciones nuevas
- Avisos de actividades próximas a vencer

## 🎨 Convenciones de Color

- **Azul claro:** Componentes frontend, entidades principales
- **Amarillo:** Casos de uso, decisiones en flujos
- **Verde:** Base de datos, operaciones exitosas
- **Rojo:** Errores, puntos de terminación
- **Morado:** Backend, servicios
- **Naranja:** Servicios externos

## 📝 Notas Técnicas

### Tecnologías Representadas:
- **Frontend:** React 18, TypeScript, Vite, React Router, Axios
- **Backend:** Django 5.2.6, Django REST Framework, Python 3.11+
- **Database:** PostgreSQL 14+
- **External:** Gmail SMTP, File Storage

### Patrones de Diseño:
- MVC (Model-View-Controller)
- Repository Pattern (Django ORM)
- Service Layer Pattern
- Middleware Pattern
- Context API Pattern (React)

### Seguridad:
- JWT Authentication
- Password hashing (PBKDF2)
- CORS configuration
- CSRF protection
- SQL injection prevention (ORM)
- Input sanitization

## 🔄 Actualización de Diagramas

Si necesitas actualizar algún diagrama:
1. Edita el archivo `.puml` correspondiente
2. Guarda los cambios
3. Regenera la vista previa
4. Exporta en el formato deseado (PNG, SVG, PDF)

## 📚 Referencias

- [PlantUML Official Documentation](https://plantuml.com/)
- [PlantUML Cheat Sheet](https://plantuml.com/guide)
- [Django Models Documentation](https://docs.djangoproject.com/en/5.2/topics/db/models/)
- [React Architecture Patterns](https://react.dev/learn)

---

**Última actualización:** Diciembre 2025
**Autor:** Sistema RA Manager
**Versión:** 1.0
