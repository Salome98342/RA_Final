# Actualidad del Sistema

Fecha de corte: 2026-04-23
Proyecto: RA-Manager

## 1. Resumen Ejecutivo

RA-Manager se mantiene operativo como plataforma web académica por roles, con arquitectura desacoplada:

- Backend: Django + Django REST Framework
- Frontend: React + TypeScript + Vite
- Base de datos: PostgreSQL
- Roles funcionales: coordinador, docente, estudiante

El alcance funcional principal está implementado y en uso: autenticación, gestión de asignaturas/RAs/actividades, calificación, matrícula, importaciones y analítica. Durante el corte actual se consolidaron mejoras visibles en usabilidad de listados (paginación tipo DataTable), búsqueda de asignaturas y robustez de algunos flujos de perfil.

## 2. Novedades Confirmadas en este Corte

Cambios relevantes detectados en código al 2026-04-23:

- Se incorporó un componente reutilizable de paginación en frontend con:
  - selector de tamaño de página (100, 50, 25, 10)
  - resumen "Mostrando X a Y de Z entradas"
  - soporte para leyenda de filtrado
- Esta paginación ya se integra en múltiples vistas (coordinador y docente), incluyendo tablas y listas laterales.
- Se agregó búsqueda por texto en backend para listado de asignaturas de coordinador (filtro por código o nombre).
- Se ajustó el endpoint de perfil de estudiante del coordinador para manejar correctamente el caso de estudiante nuevo sin matrículas:
  - retorna perfil básico y estadísticas vacías en lugar de cortar el flujo.
- Se estandarizó manejo de errores en frontend con utilidad común (`getErrorMessage`) en varios módulos.
- En navegación docente, el enfoque de sidebar se simplificó en vistas de inicio/cursos para guiar primero la selección de asignatura.
- Se eliminó del repositorio un archivo de credenciales en texto plano (`CREDENCIALES.md`), reduciendo exposición de información sensible.

## 3. Estructura Actual del Código

## 3.1 Estructura general

- Raíz: documentación, scripts SQL, plantillas y artefactos de soporte.
- `backend/`: aplicación Django.
- `frontend/`: SPA React por rol.

## 3.2 Backend actual

Organización principal:

- `backend/backend/settings.py`: configuración global (DB, CORS, DRF, logging, email).
- `backend/backend/urls.py`: enrutamiento raíz (admin, api, schema, docs, redoc).
- `backend/api/models/models.py`: modelo de dominio académico y de seguridad.
- `backend/api/views/views.py`: endpoints funcionales (archivo central monolítico).
- `backend/api/urls/urls.py`: rutas API.
- `backend/api/serializers/serializers.py`: serialización/validación.
- `backend/api/middleware/`: manejo de errores, logging y rate-limit.

Modelo de dominio (alto nivel):

- Usuarios: Coordinador, Docente, Estudiante.
- Académico: Programa, PeriodoAcademico, Asignatura, Matricula.
- Evaluación: ResultadoDeAprendizaje, IndicadoresDeLogro, Actividad, RaActividad, NotasActividad, RaActividadIndicador.
- Recursos/comunicación: Recurso, Anuncio, Notificacion.
- Seguridad/auditoría: PasswordResetOTP, LoginAttempt, AccountLockout, SecurityEvent, ImportAudit.

## 3.3 Frontend actual

Organización principal:

- `frontend/src/App.tsx`: rutas y protección por rol.
- `frontend/src/connections/http.ts`: cliente Axios con interceptores.
- `frontend/src/services/`: consumo de API por dominio.
- `frontend/src/pages/`: pantallas por rol.
- `frontend/src/components/`: componentes reutilizables (incluida paginación común).
- `frontend/src/utils/errors.ts`: utilitario para homogenizar mensajes de error.

## 4. Capacidades Actuales por Rol

## 4.1 Coordinador

Puede:

- autenticarse y mantener sesión.
- gestionar docentes y estudiantes (listar, buscar, crear, ver perfil).
- gestionar asignaturas y RAs.
- gestionar matrícula (selección múltiple y desmatrícula).
- realizar importaciones masivas (docentes, estudiantes, matriculados, asignaturas + RAs).
- consultar analítica por asignatura/RA y listados de desempeño.

Estado actual de UX en listados de coordinador:

- paginación unificada con resumen de registros.
- selector de cantidad por página.
- búsqueda en frontend y/o backend según módulo.

## 4.2 Docente

Puede:

- autenticarse y mantener sesión.
- consultar cursos por periodo.
- crear y gestionar actividades por RA.
- calificar estudiantes por actividad/indicador con retroalimentación.
- gestionar recursos y anuncios.
- realizar operaciones de matrícula puntual según permisos del módulo.

Estado actual de UX docente:

- listas de indicadores/actividades y de estudiantes con paginación configurable.
- navegación más guiada desde Cursos hacia módulos académicos.

## 4.3 Estudiante

Puede:

- autenticarse y mantener sesión.
- consultar cursos actuales e históricos.
- revisar progreso por RA, actividades y métricas personales.
- consultar recursos, anuncios y notificaciones.

## 5. Capacidades Técnicas Transversales

- autenticación con token y endpoint de sesión actual.
- recuperación de contraseña con OTP y validación de fortaleza.
- rate limiting en login/OTP.
- bloqueo temporal por intentos fallidos.
- registro de eventos de seguridad.
- documentación OpenAPI/Swagger/ReDoc.

## 6. Estado de Autorización y Acceso

Estado observado al corte:

- persiste un patrón mixto de control de acceso:
  - validaciones manuales por rol dentro de vistas.
  - uso no homogéneo de `permission_classes` por endpoint.
- el frontend restringe rutas por rol, pero la protección final depende del backend.

Conclusión:

- el control por rol existe y funciona, pero aún requiere consolidación técnica en DRF para uniformidad y mantenibilidad.

## 7. Hallazgos Vigentes

- `backend/api/views/views.py` continúa siendo un archivo grande y centralizado (deuda de modularización).
- existen avances puntuales de robustez en endpoints críticos, pero la estandarización global aún no está completa.
- hay mejoras de experiencia de usuario claras en tablas/listados, especialmente en paginación y filtrado.

## 8. Qué Está Consolidado Hoy

- flujo funcional por roles en frontend.
- API operativa para gestión académica principal.
- importaciones masivas y operaciones individuales.
- analítica por curso y por RA disponible en interfaz.
- seguridad base de autenticación operativa (rate limit + lockout + OTP).
- paginación homogénea en los listados principales con selector de tamaño.

## 9. Recomendaciones Inmediatas

- modularizar `backend/api/views/views.py` por dominio (auth, coordinador, docente, estudiante, analytics).
- centralizar permisos por rol con clases DRF dedicadas.
- mantener pruebas de integración por rol enfocadas en endpoints críticos.
- completar auditoría de endpoints sensibles para eliminar `AllowAny` donde no corresponda.
- consolidar un estándar único de errores API/UI (estructura de `detail`/`message`) para simplificar consumo frontend.

---

Documento actualizado con base en el estado del código del repositorio al 2026-04-23.