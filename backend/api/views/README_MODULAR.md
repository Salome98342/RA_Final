# Modularización de Views - RA Manager

## Estado Actual

El archivo `views.py` tiene **4182 líneas** de código, lo cual dificulta el mantenimiento, debugging y colaboración.

## Estructura Modular Implementada

### ✅ 1. `utils.py` (COMPLETADO)
**Contenido**: Funciones auxiliares compartidas
- `_add_notification()` - Crear notificaciones en BD
- `_normalize_login_payload()` - Normalizar datos de login
- `_serialize_user()` - Serializar usuarios
- `_bearer_token()` - Extraer token del header
- `_send_welcome_email()` - Enviar correo de bienvenida
- `_read_imported_file()` - Leer archivos CSV/Excel
- `_find_user_by_credentials()` - Buscar usuario por email/código
- `_require_coordinador()` - Validar rol coordinador

### 📋 2. `auth.py` (PENDIENTE - 40 líneas aprox)
**Contenido**: Autenticación y recuperación de contraseña
- `login_view()` - POST /api/login/
- `logout_view()` - POST /api/logout/
- `me_view()` - GET /api/me/
- `password_forgot_view()` - POST /api/password/forgot/
- `verify_otp_view()` - POST /api/password/verify-otp/
- `password_reset_view()` - POST /api/password/reset/

### 📋 3. `coordinador.py` (PENDIENTE - ~950 líneas)
**Contenido**: Todas las vistas de coordinador
- `coordinador_estudiantes_view()` - GET/POST /api/coordinador/estudiantes/
- `coordinador_import_estudiantes_view()` - POST /api/coordinador/import-estudiantes/
- `coordinador_asignaturas_view()` - GET /api/coordinador/asignaturas/
- `coordinador_asignatura_ras_view()` - GET /api/coordinador/asignatura/ras/
- `coordinador_asignatura_estudiantes_view()` - GET /api/coordinador/asignatura/estudiantes/
- `coordinador_asignatura_avance_view()` - GET /api/coordinador/asignatura/avance/
- `coordinador_import_matriculados_view()` - POST /api/coordinador/import-matriculados/
- `coordinador_import_docentes_view()` - POST /api/coordinador/import-docentes/
- `coordinador_import_asignaturas_ras_view()` - POST /api/coordinador/import-asignaturas-ras/

### 📋 4. `docente.py` (PENDIENTE - ~350 líneas)
**Contenido**: Vistas de docente
- `docente_import_estudiantes_view()` - POST /api/docente/import-estudiantes/{codigo}/
- `docente_buscar_estudiante_view()` - GET /api/docente/buscar-estudiante/
- `docente_agregar_estudiante_view()` - POST /api/docente/agregar-estudiante/{codigo}/

### 📋 5. `estudiante.py` (PENDIENTE - ~650 líneas)
**Contenido**: Vistas de estudiante y análisis de cursos
- `course_student_indicators_view()` - GET /api/course/{codigo}/student/{id}/indicators/
- `course_grade_view()` - GET /api/course/{codigo}/student/{id}/grade/
- `course_detail_view()` - GET /api/course/{codigo}/student/{id}/
- `course_analytics_view()` - GET /api/course/{codigo}/analytics/
- `course_activities_grouped_view()` - GET /api/course/{codigo}/activities/grouped/
- `current_period_view()` - GET /api/current-period/

### 📋 6. `catalogs.py` (PENDIENTE - ~200 líneas)
**Contenido**: ViewSets de catálogos (tipos, programas, etc.)
- `TipoDocumentoViewSet` - CRUD tipos de documento
- `TipoActividadViewSet` - CRUD tipos de actividad
- `ProgramaViewSet` - CRUD programas académicos
- `DocenteViewSet` - CRUD docentes
- `EstudianteViewSet` - CRUD estudiantes
- `AsignaturaViewSet` - CRUD asignaturas

### 📋 7. `resultados_aprendizaje.py` (PENDIENTE - ~450 líneas)
**Contenido**: Gestión de RAs e indicadores
- `ra_indicadores_view()` - GET /api/ra/{id}/indicadores/
- `ra_indicador_detail_view()` - DELETE /api/ra/{id}/indicador/{id}/
- `ra_actividades_view()` - GET/POST /api/ra/{id}/actividades/
- `ra_actividad_detail_view()` - PATCH/DELETE /api/ra/{id}/actividad/{id}/
- `ra_validation_view()` - GET /api/ra/{id}/validation/
- `asignatura_validation_view()` - GET /api/asignatura/{codigo}/validation/

### 📋 8. `actividades.py` (PENDIENTE - ~500 líneas)
**Contenido**: Actividades, notas y calificaciones
- `notas_view()` - POST/PUT /api/notas/
- `actividades_multi_view()` - POST /api/actividades/multi/
- `anuncio_delete_view()` - DELETE /api/anuncio/{id}/

### 📋 9. `profile.py` (PENDIENTE - ~300 líneas)
**Contenido**: Perfil y configuración de usuario
- `profile_view()` - GET/PUT/PATCH /api/profile/
- `password_change_view()` - POST /api/profile/password/
- `profile_avatar_view()` - POST /api/profile/avatar/
- `notifications_view()` - GET/POST /api/notifications/

## Beneficios de la Modularización

### 🎯 Mantenibilidad
- Archivos de 200-950 líneas vs 4182 líneas
- Más fácil localizar y corregir bugs
- Cambios aislados por funcionalidad

### 🚀 Performance de Desarrollo
- Carga más rápida en el editor
- Búsqueda y navegación más eficiente
- Menos conflictos en Git

### 👥 Colaboración
- Equipos pueden trabajar en diferentes módulos simultáneamente
- Menos merge conflicts
- Código review más efectivo

### 🧪 Testing
- Tests unitarios más enfocados
- Mocking más sencillo
- Cobertura por módulo

### 📚 Documentación
- Cada módulo documenta su propósito
- Imports más explícitos
- Mejor organización mental

## Plan de Migración

### Fase 1: Estructura Base ✅
- [x] Crear `utils.py` con funciones auxiliares
- [x] Crear `__init__.py` para mantener compatibilidad
- [x] Actualizar `views.py` con imports desde utils

### Fase 2: Dividir por Dominio (TODO)
1. Extraer vistas de autenticación a `auth.py`
2. Extraer vistas de coordinador a `coordinador.py`
3. Extraer vistas de docente a `docente.py`
4. Extraer vistas de estudiante a `estudiante.py`
5. Extraer ViewSets de catálogos a `catalogs.py`
6. Extraer vistas de perfil a `profile.py`
7. Extraer vistas de RAs a `resultados_aprendizaje.py`
8. Extraer vistas de actividades a `actividades.py`

### Fase 3: Validación (TODO)
- Ejecutar tests
- Verificar que todos los endpoints funcionan
- Verificar imports en urls.py
- Verificar imports en otros módulos

### Fase 4: Limpieza (TODO)
- Eliminar `views.py` legacy
- Actualizar imports en toda la aplicación
- Actualizar documentación

## Uso Actual

Por ahora, todas las vistas están en `views.py` (legacy).

Los imports siguen funcionando igual:
```python
from api.views import login_view, coordinador_estudiantes_view
```

## Uso Futuro (Después de Migración)

Imports explícitos por dominio:
```python
from api.views.auth import login_view, logout_view
from api.views.coordinador import coordinador_estudiantes_view
from api.views.docente import docente_import_estudiantes_view
from api.views.catalogs import TipoDocumentoViewSet
from api.views.profile import profile_view
```

O usando el __init__.py:
```python
from api.views import login_view  # Funciona igual
```

## Compatibilidad

La estructura modular mantiene **100% de compatibilidad** con el código existente mediante re-exports en `__init__.py`.

## Siguiente Paso

1. Crear `auth.py` con vistas de autenticación
2. Actualizar imports en `views.py` y `__init__.py`
3. Verificar que funcione
4. Continuar con siguiente módulo

## Estimación de Esfuerzo

- **utils.py**: ✅ Completado
- **auth.py**: 30 minutos
- **coordinador.py**: 2 horas
- **docente.py**: 1 hora
- **estudiante.py**: 1.5 horas
- **catalogs.py**: 45 minutos
- **profile.py**: 1 hora
- **resultados_aprendizaje.py**: 1.5 horas
- **actividades.py**: 1.5 horas
- **Testing y validación**: 2 horas

**Total estimado**: ~12 horas de trabajo

## Estado: 🔄 EN PROGRESO

Fase 1 completada - `utils.py` creado con funciones auxiliares extraídas.
