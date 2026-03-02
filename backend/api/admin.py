from django.contrib import admin
from .models.models import (
    TipoDocumento, Docente, Estudiante, Programa, PeriodoAcademico,
    Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro, TipoActividad,
    Actividad, RaActividad, Matricula, NotasActividad, Recurso, RaActividadIndicador,
    Coordinador, ImportAudit, Notificacion
)

admin.site.register([
    TipoDocumento, Docente, Estudiante, Programa, PeriodoAcademico,
    Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro, TipoActividad,
    Actividad, RaActividad, Matricula, NotasActividad, Recurso, RaActividadIndicador,
    Coordinador, ImportAudit, Notificacion
])
