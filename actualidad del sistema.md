# Actualidad del Sistema

Fecha de corte: 2026-03-24
Proyecto: RA-Manager

## 1. Resumen Ejecutivo

El sistema RA-Manager está actualmente operativo como una plataforma web de gestión académica con arquitectura separada:

- Backend: Django + Django REST Framework (API REST bajo /api)
- Frontend: React + TypeScript + Vite
- Base de datos: PostgreSQL
- Roles funcionales: coordinador, docente, estudiante

El alcance funcional principal sí está implementado: autenticación por rol, gestión académica (RAs, actividades, calificaciones), importaciones masivas y visualización analítica. Además, existen capacidades de seguridad (rate limiting, auditoría de login, OTP) y gestión de recursos/anuncios.

## 2. Estructura Actual del Código

## 2.1 Estructura general

- Raíz del repositorio: documentación técnica, scripts SQL, CSVs de carga y artefactos de arquitectura.
- backend/: aplicación Django.
- frontend/: SPA React con páginas por rol.
- env/: entorno virtual local.

## 2.2 Backend actual

Organización principal:

- backend/backend/settings.py: configuración global (DB, CORS, logging, DRF, email).
- backend/backend/urls.py: rutas raíz (admin, api, schema, docs, redoc).
- backend/api/models/models.py: dominio de datos académico, seguridad y notificaciones.
- backend/api/views/views.py: endpoints funcionales (archivo monolítico grande).
- backend/api/urls/urls.py: mapeo de endpoints API.
- backend/api/serializers/serializers.py: serialización y validación de datos.
- backend/api/middleware/: manejo de errores, logging y rate-limit.
- backend/api/utils/security.py: utilidades de seguridad (login, OTP, validaciones de contraseña, lockout).

Modelo de dominio implementado (alto nivel):

- Usuarios: Coordinador, Docente, Estudiante
- Académico: Programa, PeriodoAcademico, Asignatura, Matricula
- Evaluación: ResultadoDeAprendizaje, IndicadoresDeLogro, Actividad, RaActividad, NotasActividad, RaActividadIndicador
- Recursos/comunicación: Recurso, Anuncio, Notificacion
- Seguridad/auditoría: PasswordResetOTP, LoginAttempt, AccountLockout, SecurityEvent, ImportAudit

## 2.3 Frontend actual

Organización principal:

- frontend/src/App.tsx: enrutamiento y protección por rol.
- frontend/src/connections/http.ts: cliente Axios con interceptores, token y manejo de errores.
- frontend/src/connections/endpoints.ts: catálogo centralizado de endpoints.
- frontend/src/services/: lógica de consumo API (auth, api general, coordinador).
- frontend/src/pages/: vistas por rol (coordinador, docente, estudiante), login, recuperación y perfil.
- frontend/src/components/: componentes reutilizables (tablas, tarjetas, modales, etc.).
- frontend/src/state/: sesión y estados globales.

## 3. Capacidades Actuales por Rol

Nota: esta sección refleja lo que el código implementa hoy (backend + UI), no una intención futura.

## 3.1 Coordinador

Puede:

- Autenticarse y mantener sesión.
- Ver perfil y cambiar contraseña/avatar.
- Gestionar estudiantes:
  - listar y buscar
  - crear estudiante individual
  - ver perfil académico completo de estudiante
- Gestionar docentes:
  - listar y buscar
  - crear docente individual
  - ver perfil completo de docente
- Gestionar asignaturas y RAs:
  - listar asignaturas con filtros/paginación
  - consultar RAs por asignatura
  - crear/actualizar asignatura y agregar RAs + indicadores en una operación
  - validar porcentajes de RAs
- Gestionar matrícula:
  - listar estudiantes de asignatura por periodo
  - sugerir estudiantes candidatos para matrícula
  - matricular estudiantes (flujo individual desde UI o carga masiva)
- Importaciones masivas (CSV/XLS/XLSX):
  - estudiantes
  - docentes
  - matriculados
  - asignaturas + RAs
- Analítica:
  - avance por asignatura y RA (promedios, cobertura, aprobación)
  - analítica de asignatura con estadísticas de curso y listado de estudiantes
- Vista observador de docente desde UI:
  - puede navegar a rutas de docente (modo lectura planeado por frontend)

## 3.2 Docente

Puede:

- Autenticarse y mantener sesión.
- Ver perfil y cambiar contraseña/avatar.
- Ver cursos asignados (agrupados por periodo).
- Gestionar RAs del curso (desde la vista de RA):
  - consultar indicadores por RA
  - consultar actividades por RA
  - exportar CSV de calificaciones
- Crear actividades:
  - actividad individual por RA
  - actividad multi-RA en una sola operación
  - asignar indicadores por actividad
  - establecer fecha de cierre
- Editar/eliminar actividad RA (con verificación de contraseña en eliminación).
- Eliminar indicadores de logro (con verificación de contraseña).
- Calificar estudiantes:
  - por actividad y por indicador
  - con retroalimentación
  - guardado individual y operaciones de apoyo desde UI
- Gestionar recursos del curso:
  - subir/listar recursos
- Gestionar anuncios del curso:
  - crear/listar/eliminar anuncios (según propiedad/permisos)
- Gestionar estudiantes del curso:
  - buscar estudiante por código
  - agregar estudiante individual
  - importar estudiantes CSV para sus cursos

## 3.3 Estudiante

Puede:

- Autenticarse y mantener sesión.
- Ver perfil y cambiar contraseña/avatar.
- Consultar cursos actuales e historial por periodo.
- Ver detalle por asignatura:
  - métricas personales
  - progreso por RA
  - cobertura de actividades
- Ver consolidado de calificaciones (strict/progressive/cobertura).
- Ver tareas pendientes y actividades agrupadas por asignatura.
- Ver recursos y anuncios de sus cursos.
- Recibir y consultar notificaciones persistentes.
- Marcar notificaciones como leídas.

## 4. Capacidades Técnicas Transversales

- Login con token firmado y rol embebido.
- Endpoint /auth/me para sesión actual.
- Recuperación de contraseña con OTP:
  - solicitud
  - verificación
  - reset con validación de fortaleza
- Rate limiting para login y flujo OTP.
- Bloqueo temporal de cuenta por intentos fallidos consecutivos.
- Registro de eventos de seguridad.
- Logging centralizado y middleware de manejo de errores.
- Documentación OpenAPI/Swagger/ReDoc disponible.

## 5. Estado de Autorización y Control de Acceso

Estado actual observado:

- La mayoría de endpoints usa token Bearer manual (lectura del token dentro de la vista).
- Muchas vistas están decoradas con AllowAny y validan rol internamente.
- El frontend sí restringe rutas por rol, pero la seguridad real depende de validaciones backend por endpoint.

Conclusión operativa:

- Hay control por rol implementado, pero no está centralizado de forma uniforme en clases de permisos DRF.

## 6. Hallazgos Relevantes del Estado Actual

Hallazgos funcionales/deuda técnica identificados en código:

- backend/api/views/views.py es un archivo monolítico muy grande (miles de líneas), con mezcla de dominios (auth, coordinador, docente, estudiante, analítica, importación).
- Existen comentarios de deprecación indicando intención de modularizar vistas, pero hoy la lógica principal sigue centralizada.
- Se detectan inconsistencias puntuales de nombres de campos en algunas consultas de periodo que pueden causar fallos en ejecución según ruta.
- Hay referencias a atributos de estudiante no homogéneos en algunas secciones (nombre vs primer_nombre), lo cual puede romper funcionalidades accesorias como mensajes/notificaciones si no están protegidas.
- Algunos ViewSets exponen permisos amplios (AllowAny) y contienen TODOs de endurecimiento.

Esto no invalida el funcionamiento general, pero sí marca riesgos de mantenimiento y seguridad para la siguiente etapa de evolución.

## 7. Qué Sí Está Consolidado Hoy

- Flujo completo por roles en frontend.
- API funcional para gestión académica principal.
- Cálculo de desempeño por RA/curso con variantes de nota.
- Importaciones masivas y creación individual de entidades académicas.
- Gestión de recursos, anuncios y notificaciones.
- Seguridad básica robusta en autenticación (rate limit + lockout + OTP + hashing).

## 8. Recomendaciones Inmediatas (a partir del estado actual)

- Modularizar backend/api/views/views.py por dominio:
  - auth
  - coordinador
  - docente
  - estudiante
  - analytics
- Estandarizar autorización en DRF con permission_classes dedicadas por rol.
- Auditar y corregir inconsistencias de nombres de campos/modelos en endpoints de periodo y notificaciones.
- Endurecer ViewSets sensibles que hoy están en AllowAny.
- Mantener pruebas de integración por rol para validar que cada endpoint crítico siga protegido y funcional.

---

Documento generado con base en lectura de código actual del repositorio (backend + frontend + configuración), no sólo en documentación histórica.