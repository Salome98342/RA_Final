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
- GET /api/ras/{id}/actividades/
- POST /api/auth/login
- Body: { "username": string, "password": string }
- Respuesta (JWT ejemplo): { "access": string, "refresh": string }

5) Recuperar contraseña
- POST /api/auth/password/forgot
- Body: { "email": string }
- Respuesta: { "ok": true }

6) Restablecer contraseña
- POST /api/auth/password/reset
- Body: { "token": string, "password": string }
- Respuesta: { "ok": true }

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
- src/services/api.ts
  - getCourses -> GET /api/courses
  - getRAsByCourse(courseId) -> GET /api/courses/{courseId}/ras
  - getStudentsByCourse(courseId) -> GET /api/courses/{courseId}/students
- src/services/auth.ts
  - requestPasswordReset(email) -> POST /api/auth/password/forgot
  - resetPassword(token, password) -> POST /api/auth/password/reset
- Base URL se toma de VITE_API_URL (ver .env.development)

## Ejemplos curl
```bash
# Cursos
curl http://127.0.0.1:8000/api/courses

# RAs por curso
curl http://127.0.0.1:8000/api/courses/MAT101/ras

# Estudiantes por curso
curl http://127.0.0.1:8000/api/courses/MAT101/students

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

Completa este archivo con los endpoints/formatos reales o comparte tu OpenAPI/Swagger para que lo alinee en el frontend.
