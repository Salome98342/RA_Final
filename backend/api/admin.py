from django.contrib import admin
from .models.models import (
    Task, TipoDocumento, Docente, Estudiante, Programa, PeriodoAcademico,
    Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro, TipoActividad,
    Actividad, RaActividad, Matricula, NotasActividad, Recurso
)

admin.site.register([
    Task, TipoDocumento, Docente, Estudiante, Programa, PeriodoAcademico,
    Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro, TipoActividad,
    Actividad, RaActividad, Matricula, NotasActividad, Recurso
])
