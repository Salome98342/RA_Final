# API contract (Django <-> React)

Completa este documento (o comparte tu OpenAPI/Swagger/Postman) para integrar el frontend.

## Global
- Base URL (producción): https://TU_DOMINIO/api
- Base URL (desarrollo): /api (ya proxied por Vite a 127.0.0.1:8000)
- Autenticación (elige):
  - JWT (Authorization: Bearer <token>)
  - Session/Cookie (withCredentials + CSRF)
- CORS/CSRF:
  - CORS_ALLOWED_ORIGINS: [http://localhost:5173]
  - CSRF_TRUSTED_ORIGINS: [http://localhost:5173]
  - Si usas SessionAuth: enviar csrftoken en header `X-CSRFToken` y `withCredentials: true`.

## Tipos (frontend)
- Course: { id: string; nombre: string; carrera: string }
- RA: { id: string; titulo: string; info: string }
- Student: { name: string }

## Endpoints requeridos (mapea a tu Django)
1) Listar cursos (asignaturas)
- GET /api/asignaturas/
- Respuesta: Course[]
```json
[
  { "id": "MAT101", "nombre": "Matemáticas I", "carrera": "Ing. Sistemas" }
]
```

2) RAs por asignatura
- GET /api/asignaturas/{codigo}/ras/
- Respuesta: RA[]
```json
[
  { "id": "RA1", "titulo": "Límites y derivadas", "info": "Cálculo diferencial básico" }
]
```

3) Estudiantes por asignatura
- GET /api/asignaturas/{codigo}/estudiantes/
- Respuesta: string[] o Student[]
```json
["Ana Pérez", "Juan Gómez"]
```

4) Autenticación
  - POST /auth/login { code, password }  // code = codigo_docente o codigo_estudiante
  - GET /auth/me -> { id, nombre, rol, code }
  - POST /auth/logout {}
  - POST /auth/password/forgot { email }
  - POST /auth/password/reset { token, password }

5) Indicadores por RA
- GET /api/ras/{id}/indicadores/

6) Actividades por RA
GET /api/ras/{id}/actividades/
Respuesta: lista de actividades ya asociadas al RA, cada una con su porcentaje de aporte al RA (porcentaje_ra_actividad) y posibles indicadores:
```json
[
  {
    "id_actividad": 12,
    "id_ra_actividad": 34,
    "nombre_actividad": "Proyecto Final",
    "descripcion": "Backend + Frontend",
    "porcentaje_ra_actividad": 40.0,
    "fecha_cierre": "2025-06-15",
    "indicadores": [ { "id_ind": 7, "descripcion": "Funciones y modularización", "porcentaje_ind": 50.0 } ]
  }
]
```

Crear actividad para un RA específico (porcentaje opcional):
POST /api/ras/{id}/actividades/
Body mínimo (sin porcentaje_actividad y sin porcentaje_ra_actividad obligatorio):
```json
{
  "nombre_actividad": "Quiz SQL",
  "id_tipo_actividad": 2
}
```
Respuesta:
```json
{
  "id_actividad": 55,
  "id_ra_actividad": 102,
  "nombre_actividad": "Quiz SQL",
  "porcentaje_ra_actividad": 0.0
}
```

Crear una actividad asociada a múltiples RAs del mismo curso (porcentaje opcional):
POST /api/actividades/multi
```json
{
  "nombre_actividad": "Proyecto Integrador",
  "id_tipo_actividad": 4,
  "descripcion": "App full-stack",
  "fecha_cierre": "2025-06-30",
  "ras": [
    { "ra_id": 10, "indicadores": [19] },
    { "ra_id": 11, "porcentaje_ra_actividad": 20.0 }
  ]
}
```
Respuesta:
```json
{
  "id_actividad": 99,
  "nombre_actividad": "Proyecto Integrador",
  "fecha_cierre": "2025-06-30",
  "relaciones": [
    { "id_ra": 10, "id_ra_actividad": 200, "porcentaje_ra_actividad": 30.0 },
    { "id_ra": 11, "id_ra_actividad": 201, "porcentaje_ra_actividad": 20.0 }
  ]
}
```

Notas:
- El peso interno de la actividad (porcentaje_actividad) fue eliminado del modelo. Sólo se distribuye el aporte de cada actividad dentro de cada RA mediante `porcentaje_ra_actividad`.
- `porcentaje_ra_actividad` es opcional en creación; si se omite, se registra como 0 y se puede ajustar luego con PATCH.
- Las sumas por RA no deben exceder 100%; el backend rechaza excedentes (>100%).

7) Recuperar contraseña
POST /api/auth/password/forgot
Body: { "email": string }
Respuesta: { "ok": true }

8) Restablecer contraseña
POST /api/auth/password/reset
Body: { "token": string, "password": string }
Respuesta: { "ok": true }

## Errores
- Formato sugerido:
```json
{ "message": "Detalle del error", "code": "error_code", "fields": { "email": "no válido" } }
```
- Códigos: 400 (validación), 401 (auth), 403 (permiso), 404 (no existe), 500 (server)

## Paginación/filtrado (si aplica)
- Query params: ?page=1&page_size=20&search=...&ordering=...
- Respuesta paginada (DRF):
```json
{ "count": 123, "next": "...", "previous": null, "results": [ ... ] }
```

## Mapeo con el frontend
- `getCourses()` -> GET /api/asignaturas/
- `getRAsByCourse(courseId)` -> GET /api/asignaturas/{codigo}/ras/
- `getActivitiesByRA(raId)` -> GET /api/ras/{id}/actividades/
- `createActivityForRA(raId)` -> POST /api/ras/{id}/actividades/ (usa porcentaje_ra_actividad)
- `createActivityMulti()` -> POST /api/actividades/multi (usa ras[].porcentaje_ra_actividad)
- `getStudentsByCourse(courseId)` -> GET /api/asignaturas/{codigo}/estudiantes/
- `gradeActivity()` -> POST/PUT /api/notas/ (envía nota, retroalimentacion, id_ind)
- Base URL se toma de VITE_API_URL (ver .env.*)

## Ejemplos curl
```bash
```bash
# Cursos
curl http://127.0.0.1:8000/api/asignaturas/

# RAs por curso
curl http://127.0.0.1:8000/api/asignaturas/MAT101/ras/

# Estudiantes por curso
curl http://127.0.0.1:8000/api/asignaturas/MAT101/estudiantes/

# Actividades de un RA
# Actividades de un RA
curl http://127.0.0.1:8000/api/ras/10/actividades/

# Crear actividad para RA
curl -X POST http://127.0.0.1:8000/api/ras/10/actividades/ \
  -H "Content-Type: application/json" \
  -d '{"nombre_actividad":"Quiz SQL","id_tipo_actividad":2,"porcentaje_ra_actividad":15.0}'

# Crear actividad multi-RA
curl -X POST http://127.0.0.1:8000/api/actividades/multi \
  -H "Content-Type: application/json" \
  -d '{"nombre_actividad":"Proyecto Integrador","id_tipo_actividad":4,"ras":[{"ra_id":10,"porcentaje_ra_actividad":30.0},{"ra_id":11,"porcentaje_ra_actividad":20.0}]}'

# Consolidado de calificaciones de un estudiante en una asignatura
curl http://127.0.0.1:8000/api/asignaturas/CS101/calificaciones/123/
```

# Recuperar contraseña
curl -X POST http://127.0.0.1:8000/api/auth/password/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"alguien@univalle.edu"}'
```

## Notas Django (DRF)
- Recomendado: django-rest-framework + django-cors-headers
- urls.py:
```py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

urlpatterns = [
  path('api/', include('tu_app.api_urls')),
]
```
- views.py: usar ViewSets o APIView que entreguen JSON con los esquemas arriba.
- serializers.py: ajustar campos a Course/RA/Student.

Actualizado eliminando `porcentaje_actividad`. Completa este archivo con detalles adicionales (auth final, paginación real, filtros) o comparte OpenAPI para sincronizar automáticamente.
