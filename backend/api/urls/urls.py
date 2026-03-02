from django.urls import path, include
from rest_framework.routers import DefaultRouter

from ..views.views import (
    login_view, me_view, logout_view, password_forgot_view, verify_otp_view, password_reset_view,
    TipoDocumentoViewSet, TipoActividadViewSet, ProgramaViewSet,
    DocenteViewSet, EstudianteViewSet, AsignaturaViewSet,
    ra_indicadores_view, ra_indicador_detail_view, ra_actividades_view, notas_view,
    course_student_indicators_view, profile_view, password_change_view, profile_avatar_view,
    notifications_view, ra_validation_view, asignatura_validation_view,
    actividades_multi_view, ra_actividad_detail_view, course_grade_view, course_detail_view, course_analytics_view,
    coordinador_asignaturas_view, coordinador_asignatura_estudiantes_view, coordinador_import_matriculados_view, coordinador_asignatura_ras_view,
    coordinador_import_docentes_view, coordinador_import_asignaturas_ras_view, coordinador_import_estudiantes_view, coordinador_estudiantes_view,
    coordinador_asignatura_avance_view, coordinador_estudiante_perfil_view, current_period_view, course_activities_grouped_view,
    docente_import_estudiantes_view, docente_buscar_estudiante_view, docente_agregar_estudiante_view, anuncio_delete_view,
)

router = DefaultRouter()
router.register(r"tipos-documento", TipoDocumentoViewSet, basename="tipo-documento")
router.register(r"tipos-actividad", TipoActividadViewSet, basename="tipo-actividad")
router.register(r"programas", ProgramaViewSet, basename="programa")
router.register(r"docentes", DocenteViewSet, basename="docente")
router.register(r"estudiantes", EstudianteViewSet, basename="estudiante")
router.register(r"asignaturas", AsignaturaViewSet, basename="asignatura")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/login", login_view),
    path("auth/me", me_view),
    path("auth/logout", logout_view),
    path("auth/password/forgot", password_forgot_view),
    path("auth/password/verify-otp", verify_otp_view),
    path("auth/password/reset", password_reset_view),
    path("auth/profile", profile_view),  # GET, PUT/PATCH
    path("auth/password/change", password_change_view),
    path("auth/profile/avatar", profile_avatar_view),
    path("ras/<int:ra_id>/indicadores/", ra_indicadores_view, name="ra-indicadores"),
    path("ras/<int:ra_id>/indicadores/<int:ind_id>/", ra_indicador_detail_view, name="ra-indicador-detalle"),
    path("ras/<int:ra_id>/actividades/", ra_actividades_view),  # GET, POST
    path("validacion/ra/<int:ra_id>", ra_validation_view),
    path("validacion/asignatura/<str:codigo_asignatura>", asignatura_validation_view),
    path("notas", notas_view),  # POST/PUT
    path(
        "asignaturas/<str:codigo_asignatura>/estudiante/<int:id_estudiante>/indicadores",
        course_student_indicators_view,
    ),
    path("notificaciones", notifications_view),
    # Coordinador: listados administrativos
    path("coordinador/estudiantes", coordinador_estudiantes_view),  # GET: listar, POST: crear individual
    path("coordinador/estudiantes/<int:id_estudiante>/perfil", coordinador_estudiante_perfil_view),  # GET: Perfil completo del estudiante
    path("coordinador/asignaturas", coordinador_asignaturas_view),
    path("coordinador/asignaturas/estudiantes", coordinador_asignatura_estudiantes_view),
    path("coordinador/asignaturas/ras", coordinador_asignatura_ras_view),
    path("coordinador/asignaturas/avance", coordinador_asignatura_avance_view),
    path("coordinador/import/matriculados", coordinador_import_matriculados_view),
    path("coordinador/import/docentes", coordinador_import_docentes_view),
    path("coordinador/import/estudiantes", coordinador_import_estudiantes_view),
    path("coordinador/import/asignaturas-ras", coordinador_import_asignaturas_ras_view),
    # Consolidado de calificaciones por asignatura y estudiante
    path(
        "asignaturas/<str:codigo_asignatura>/calificaciones/<int:id_estudiante>/",
        course_grade_view,
    ),
    # Detalle completo de asignatura para estudiante (analítica)
    path(
        "asignaturas/<str:codigo_asignatura>/detalle/<int:id_estudiante>/",
        course_detail_view,
    ),
    # Análisis general de asignatura para coordinador
    path(
        "asignaturas/<str:codigo_asignatura>/analitica/",
        course_analytics_view,
    ),
    # Crear una actividad y asociarla a múltiples RAs en una sola operación
    path("actividades/multi", actividades_multi_view),
    # Actualizar/Eliminar una relación RA-Actividad (y actividad)
    path("ras/<int:ra_id>/actividades/<int:rel_id>/", ra_actividad_detail_view),
    # Obtener periodo académico actual
    path("periodos/actual", current_period_view),
    # Obtener actividades agrupadas por asignatura (sin duplicación por RA)
    path("asignaturas/<str:codigo_asignatura>/actividades-agrupadas/", course_activities_grouped_view),
    # Importar estudiantes CSV para docente (solo para sus cursos)
    path("docente/asignaturas/<str:codigo_asignatura>/import/estudiantes", docente_import_estudiantes_view),
    # Buscar estudiante por código (antes de agregar)
    path("docente/buscar-estudiante", docente_buscar_estudiante_view, name="docente-buscar-estudiante"),
    # Agregar estudiante individual por código
    path("docente/asignaturas/<str:codigo_asignatura>/estudiantes", docente_agregar_estudiante_view, name="docente-agregar-estudiante"),
    # Eliminar anuncio
    path("anuncios/<int:anuncio_id>/", anuncio_delete_view, name="anuncio-delete"),
]