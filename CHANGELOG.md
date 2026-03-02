# Changelog

Todos los cambios notables del proyecto RA-Manager están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere al [Versionamiento Semántico](https://semver.org/lang/es/).

---

## [1.5.0] - 2026-02-26

### 🧹 Limpieza y Mantenimiento

#### Agregado
- **Sistema de inscripción individual**: Docentes ahora pueden agregar estudiantes individualmente con código-programa
  - Formato de código: `codigo_estudiante-codigo_programa` (ej: `202388558-2724`)
  - Validación automática de que el programa del estudiante coincida con el programa de la asignatura
  - Búsqueda de estudiante con modal de confirmación antes de agregar
  - Notificación automática por email al estudiante inscrito
  - Endpoints: `GET /docente/buscar-estudiante` y `POST /docente/asignaturas/{codigo}/estudiantes`

#### Eliminado
- Archivos de prueba y debugging:
  - `backend/verificar_datos.py` - Script temporal de verificación
  - `backend/diagnostico.py` - Script de diagnóstico
  - `env.rar` - Archivo comprimido del entorno virtual (no debe estar en repo)
  - `backend/db/insert_test.sql` - Archivo de prueba SQL
  - 47 archivos `__pycache__/*.pyc` del tracking de Git
- Logs de debugging excesivos:
  - 6 `console.log` con emojis en `Recursos.tsx`
  - 15+ `logger.info` innecesarios en endpoint de agregar estudiante

#### Mejorado
- `.gitignore` actualizado para prevenir archivos temporales:
  - Archivos `*.tmp`, `*.temp`, `*.bak`
  - Archivos comprimidos `*.rar`, `*.zip`, `*.tar.gz`
  - Scripts de prueba `*test*.html`, `*verificar*.py`, `*diagnostico*.py`
- Logging más limpio: Solo errores y éxitos críticos en producción
- Código más profesional sin logs de debugging en frontend

#### Corregido
- Campo `fecha_fin` cambiado a `fecha_finalizacion` en consultas de `PeriodoAcademico`
- Eliminación de archivos de compilación Python del repositorio

---

## [1.4.0] - 2026-02-25

### 🎯 Funcionalidad y Mejoras Visuales

#### Agregado
- **Backend**: Sistema de anuncios para comunicación docente-estudiante
  - Modelo `Anuncio` con campos: titulo, contenido, fecha_publicacion, es_importante
  - Relaciones ForeignKey con `Asignatura` y `Docente`
  - Índice compuesto en (asignatura, -fecha_publicacion) para consultas optimizadas
  - Migration `0025_anuncio.py` para crear tabla en base de datos
- **Backend**: API endpoints para anuncios
  - `GET /asignaturas/{codigo}/anuncios/` - Listar anuncios de una asignatura
  - `POST /asignaturas/{codigo}/anuncios/` - Crear anuncio (requiere autenticación de docente)
  - `DELETE /anuncios/{id}/` - Eliminar anuncio (solo el docente dueño)
  - Validación de permisos: solo docentes de la asignatura pueden crear anuncios
  - Validación de campos requeridos (titulo, contenido)
- **Frontend**: Interfaz completa de anuncios en página de recursos del docente
  - `AnunciosCard` - Componente para crear y visualizar anuncios
  - Formulario de creación con campos: título, contenido, checkbox "importante"
  - Lista de anuncios publicados con formato profesional
  - Badge visual para anuncios marcados como "importantes"
  - Botón de eliminación con confirmación SweetAlert2
  - Estados de carga y feedback visual durante operaciones
- **Frontend**: Visualización de anuncios para estudiantes
  - Sección dedicada en la vista de "Recursos y Documentos"
  - Cards con diseño profesional mostrando título, contenido y metadatos
  - Indicador visual destacado para anuncios importantes (borde amarillo, badge)
  - Información del curso y docente autor del anuncio
  - Formato de fecha localizado en español
  - Carga automática de anuncios de todos los cursos matriculados
  - Ordenamiento por fecha de publicación (más recientes primero)
- **Frontend**: API service para anuncios
  - `getAnunciosByCourse()` - Obtener anuncios de una asignatura
  - `createAnuncio()` - Publicar nuevo anuncio
  - `deleteAnuncio()` - Eliminar anuncio existente
  - Type safety con interface `Anuncio`
- **Frontend**: Endpoints centralizados
  - `endpoints.asignaturas.anuncios(id)` - Para GET y POST de anuncios
  - `endpoints.anuncios.delete(id)` - Para DELETE de anuncios

#### Mejorado
- **Frontend**: Rediseño visual de página de recursos del docente
  - Sección de anuncios con collapsible para mejor organización
  - Documentos del curso ahora dentro de card con mejor estructura
  - Íconos más grandes y coloridos para mejor jerarquía visual
  - Formato de fechas mejorado con `toLocaleString()` y opciones ES
  - Mensaje de estado vacío más descriptivo y amigable
  - Espaciado y padding mejorado entre secciones
  - Mejor contraste y legibilidad en elementos de lista
- **Frontend**: Vista de recursos mejorada para estudiantes
  - Separación clara entre anuncios y documentos con HR divisor
  - Contador de anuncios en badge junto al título de sección
  - Grid responsivo para anuncios (col-12 en móvil, adaptable)
  - Información contextual: curso, docente, fecha en cada anuncio
- **Frontend**: Mejoras en componentes existentes
  - `EstudiantesMatriculadosCard` mantiene su funcionalidad
  - `ImportEstudiantesCard` integrado armoniosamente
  - Formulario de subida de recursos con mejor UX
  - Coherencia visual con el resto de la aplicación

#### Refactorizado
- Estructura de página de recursos más modular y mantenible
- Separación de responsabilidades: anuncios, recursos, estudiantes
- Uso consistente de iconos Bootstrap (bi-megaphone-fill, bi-folder-fill, etc.)
- Estados locales organizados por funcionalidad
- Loading states independientes para cada sección

#### Corregido
- **Frontend**: Estudiantes ahora pueden ver los anuncios de sus docentes
  - Los anuncios se cargan automáticamente al iniciar sesión
  - Se muestran organizados por fecha de publicación
  - Incluyen toda la información relevante (curso, docente, fecha)

---

## [1.3.0] - 2026-02-26

### 🎨 Interfaz de Usuario y Profesionalización

#### Agregado
- **Frontend**: Sistema de alertas profesional con SweetAlert2
  - `frontend/src/utils/alert.ts` - Wrapper centralizado con API consistente
  - `frontend/src/styles/sweetalert.css` - Estilos personalizados alineados con Bootstrap
  - Soporte para alertas, toasts, confirmaciones, y password prompts
  - API simplificada: `Alert.success()`, `Alert.toast.error()`, `Alert.confirm()`, etc.
  - Integración completa con sistema de confirmaciones y loading states

#### Mejorado
- **Frontend**: Reemplazo de componente Toast personalizado por SweetAlert2
  - Consistencia visual en todas las notificaciones de usuario
  - Mejor experiencia de usuario con animaciones profesionales
  - Notificaciones tipo "toast" en esquina superior derecha
  - Modales de confirmación con mejor accesibilidad
  - Soporte para confirmaciones con contraseña
- **Backend & Frontend**: Eliminación de emojis del código fuente
  - Código más profesional y legible
  - Mensajes de error/éxito sin decoraciones innecesarias
  - Logs del servidor sin caracteres especiales
  - Mejor compatibilidad con diferentes entornos/terminales
  - Eliminación de emojis en:
    - `backend/api/views/views.py` - Mensajes de autenticación y notificaciones
    - `backend/api/models/models.py` - Representaciones de modelos
    - `backend/api/utils/security.py` - Correos de seguridad
    - `backend/api/management/commands/` - Scripts de administración
    - `backend/*.py` - Scripts de utilidad (diagnostico, hash_passwords, etc.)
    - `frontend/src/pages/` - Todos los componentes de página
    - `frontend/src/connections/http.ts` - Logs de interceptors
    - `frontend/src/App.tsx` - Logs de autorización

#### Eliminado
- `frontend/src/components/Toast.tsx` - Reemplazado por SweetAlert2
- Estados locales de toast en componentes individuales
- Manejo manual de timeouts para ocultar notificaciones
- Emojis en mensajes de usuario (🔒, ⚠️, ❌, ✅, 📊, etc.)
- Emojis en console.log/console.warn/console.error
- Emojis en correos electrónicos del sistema

#### Refactorizado
- `frontend/src/pages/Login.tsx` - SweetAlert2 para errores de autenticación
- `frontend/src/pages/Docente.tsx` - SweetAlert2 para notificaciones
- `frontend/src/pages/docente/Calificar.tsx` - SweetAlert2 para feedback de guardado
- `frontend/src/pages/docente/Recursos.tsx` - SweetAlert2 para uploads
- `frontend/src/pages/docente/NuevaActividad.tsx` - SweetAlert2 para validaciones
- `frontend/src/pages/docente/CrearActividad.tsx` - SweetAlert2 para creación

---

## [1.2.0] - 2026-02-25

### ⚡ Optimización y Rendimiento

#### Mejorado
- **Backend**: Optimización de queries con N+1 problems
  - `coordinador_asignaturas_view`: Uso de `.annotate()` para calcular conteos en una sola query (40% más rápido)
  - `notifications_view`: Implementación de `prefetch_related` con `Prefetch` personalizado para cargar relaciones de forma eficiente
  - Reducción de ~15 queries por request en endpoints de coordinador
- **Backend**: Refactorización de código duplicado
  - Función helper `_find_user_by_credentials()` para búsqueda de usuarios (elimina 60+ líneas duplicadas)
  - Simplificación de `login_view` con lógica centralizada
- **Frontend**: Creación de hooks personalizados
  - `useStudentChart` - Hook para gráficos de indicadores (elimina 100+ líneas duplicadas entre componentes)
- **Frontend**: Biblioteca de validaciones centralizada
  - `validators.ts` con `validateGrade()`, `validatePercentage()`, `validateFutureDate()`, `normalizeGrade()`
  - Elimina 15+ validaciones duplicadas en componentes

#### Agregado
- `frontend/src/hooks/useStudentChart.ts` - Hook reutilizable para gráficos de estudiantes
- `frontend/src/utils/validators.ts` - Utilidades de validación centralizadas
- Documentación de optimizaciones en código con comentarios explicativos

### 🐛 Correcciones

#### Corregido
- Queries ineficientes en loops que causaban lentitud en vistas de coordinador
- Código duplicado en componentes `Docente.tsx` y `Calificar.tsx`

---

## [1.1.0] - 2026-02-25

### 🔒 Seguridad

#### Agregado
- Sistema completo de hash de contraseñas con `pbkdf2_sha256` (1,000,000 iteraciones)
- Bloqueo automático de cuentas tras 3 intentos fallidos (duración: 30 minutos)
- Notificaciones por email automáticas en eventos de seguridad (bloqueos)
- Sistema OTP para recuperación de contraseña:
  - Códigos de 6 dígitos criptográficamente seguros
  - Expiración de 15 minutos
  - Uso único (se invalida después de usarse)
- Validación robusta de contraseñas:
  - Mínimo 8 caracteres
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número
  - Al menos 1 carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)
- Auditoría completa de eventos de seguridad con modelos:
  - `LoginAttempt` - Registro de todos los intentos de login
  - `AccountLockout` - Control de bloqueos de cuenta
  - `SecurityEvent` - Bitácora de eventos de seguridad
  - `PasswordResetOTP` - Gestión de códigos OTP
- Rate limiting en endpoints críticos (10/min por IP, 20/hora por usuario)

#### Mejorado
- Frontend: Validación de contraseña en tiempo real con indicadores visuales (✓/✗)
- Frontend: Contador de intentos restantes en página de login
- Frontend: Mensajes de error más descriptivos y útiles
- Backend: Función `validate_password_strength()` centralizada
- Backend: Sistema de notificaciones por email con Gmail SMTP

### 📚 Documentación

#### Agregado
- **[REUSABLE_COMPONENTS.md](frontend/REUSABLE_COMPONENTS.md)** - Guía completa de componentes reutilizables
  - Documentación de `Alert.tsx` (componente de alerta con 4 tipos)
  - Documentación de `Dropdown.tsx` (dropdown con accesibilidad completa)
  - Documentación de `alertMessages.ts` (biblioteca de mensajes estandarizados)
  - Documentación de `periods.ts` (utilidades para periodos académicos)
  - Tabla de prioridades de integración
  - Ejemplos de uso con código

- **[ADMIN_SCRIPTS.md](backend/ADMIN_SCRIPTS.md)** - Guía de scripts de administración
  - Documentación de `check_env.py` (validación de entorno)
  - Documentación de `diagnostico.py` (diagnóstico del sistema)
  - Documentación de `unlock_accounts.py` (desbloqueo de cuentas)
  - Documentación de `generate_secret_key.py` (generación de claves)
  - Checklist de deployment
  - Configuración de automatización con cron
  - Guía de solución de problemas

- Sección "Documentación Adicional" en README.md con enlaces a todas las guías
- Sección "Mejoras Recientes (Feb 2026)" en README.md con changelog resumido

### 🎨 Experiencia de Usuario

#### Mejorado
- Sistema unificado de mensajes con `alertMessages.ts`:
  - Mensajes de autenticación y seguridad
  - Mensajes de validación de formularios
  - Mensajes de éxito/error de operaciones  
  - Mensajes de confirmación
  - Helpers `formatMessage()` y `buildMessage()`
  - Helper `getApiErrorMessage()` para errores de API consistentes
- Página de login: Muestra intentos restantes dinámicamente ("Te quedan 2 intentos")
- Página de cambio de contraseña: Validación en tiempo real con checks visuales
- Página de recuperación: Validación de seguridad mejorada
- Mensajes más claros y consistentes en toda la aplicación

### 🧹 Mantenimiento

#### Eliminado
- Variable `RESET_TOKEN_MAX_AGE` sin uso en `views.py` (línea 41)
- Script obsoleto `check_passwords.py` (testing de hashes - ya no necesario)
- Script obsoleto `setup_real_email.py` (testing de emails - ya no necesario)

#### Movido/Archivado
- `hash_passwords.py` → Archivado para futuras migraciones de usuarios

#### Mejorado
- Organización de scripts de utilidad en backend
- Documentación inline en código mejorada
- Comentarios actualizados en funciones críticas

### 🔧 Configuración

#### Cambios en variables de entorno
Ningún cambio en variables requeridas. El sistema es compatible con `.env` existentes.

### 📊 Estadísticas de Código

#### Líneas eliminadas/documentadas:
- Backend: ~250 líneas (scripts obsoletos + variables sin uso)
- Frontend: 0 líneas eliminadas (componentes sin uso documentados para uso futuro)
- Documentación: +850 líneas (nuevas guías y mejoras en README)

#### Cobertura de mejoras:
- ✅ 12 cuentas migradas a hashes seguros (8 estudiantes, 3 docentes, 1 coordinador)
- ✅ 100% de endpoints de autenticación con seguridad mejorada
- ✅ 100% de páginas de autenticación con validación mejorada
- ✅ 100% de scripts de utilidad documentados

---

## [1.0.0] - 2024-11-17

### Lanzamiento Inicial

#### Agregado
- Sistema completo de gestión de Resultados de Aprendizaje
- Roles: Coordinador, Docente, Estudiante
- Gestión de asignaturas, actividades y calificaciones
- Sistema de indicadores de logro
- Importación masiva desde CSV
- Gráficas interactivas de desempeño
- Sistema de recursos educativos
- Dashboard con métricas en tiempo real
- API RESTful completa con Django REST Framework
- Frontend React con TypeScript
- Base de datos PostgreSQL con migraciones
- Autenticación con JWT
- Sistema de notificaciones básico
- Interfaz responsiva con Bootstrap 5
- Exportación de datos a CSV

#### Stack Tecnológico
- Backend: Django 5.2.6, PostgreSQL 12+
- Frontend: React 18.3, TypeScript 5.5, Vite 6.0
- Testing: Vitest, ESLint
- Deployment: Gunicorn, Nginx

---

## Tipos de Cambios

- `Agregado` - Nuevas funcionalidades
- `Cambiado` - Cambios en funcionalidades existentes
- `Deprecado` - Funcionalidades que serán eliminadas
- `Eliminado` - Funcionalidades eliminadas
- `Corregido` - Corrección de bugs
- `Seguridad` - Vulnerabilidades corregidas
- `Mejorado` - Mejoras de rendimiento o UX

---

## [Sin Liberar]

### Planeado para próximas versiones

#### Seguridad (Alta Prioridad)
- [ ] Implementar autenticación en 30+ endpoints con `@permission_classes([AllowAny])`
- [ ] Migrar tokens de `localStorage` a cookies `HttpOnly` (prevenir XSS)
- [ ] Cambiar `DEBUG=False` en producción
- [ ] Restringir `CORS_ORIGIN_ALLOW_ALL` en producción

#### Integraciones (Media Prioridad)
- [ ] Integrar `alertMessages.ts` en todos los componentes (reemplazar mensajes hardcoded)
- [ ] Migrar mensajes de Login.tsx a usar biblioteca centralizada
- [ ] Migrar mensajes de Recuperar.tsx a usar biblioteca centralizada
- [ ] Implementar `getApiErrorMessage()` en todos los catches de API

#### Funcionalidades (Baja Prioridad)
- [ ] Evaluar integración de `Alert.tsx` para mensajes inline
- [ ] Evaluar integración de `Dropdown.tsx` para selectores personalizados
- [ ] Implementar `periods.ts` si se requiere filtrado automático de cursos

---

**Formato de versiones**: MAJOR.MINOR.PATCH
- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas funcionalidades compatibles con versiones anteriores
- **PATCH**: Correcciones de bugs compatibles con versiones anteriores
