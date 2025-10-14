from django.urls import path, include
from rest_framework.routers import DefaultRouter

from ..views.views import (
    login_view, me_view, logout_view, password_forgot_view, password_reset_view,
    TaskViewSet, TipoDocumentoViewSet, TipoActividadViewSet, ProgramaViewSet,
    DocenteViewSet, EstudianteViewSet, AsignaturaViewSet,
    ra_indicadores_view, ra_actividades_view, notas_view,
    course_student_indicators_view, profile_view,
    notifications_view, ra_validation_view, asignatura_validation_view,
)

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")
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
    path("auth/password/reset", password_reset_view),
    path("auth/profile", profile_view),  # GET, PUT/PATCH
    path("ras/<int:ra_id>/indicadores/", ra_indicadores_view),
    path("ras/<int:ra_id>/actividades/", ra_actividades_view),  # GET, POST
    path("validacion/ra/<int:ra_id>", ra_validation_view),
    path("validacion/asignatura/<str:codigo_asignatura>", asignatura_validation_view),
    path("notas", notas_view),  # POST/PUT
    path(
        "asignaturas/<str:codigo_asignatura>/estudiante/<int:id_estudiante>/indicadores",
        course_student_indicators_view,
    ),
    path("notificaciones", notifications_view),
]