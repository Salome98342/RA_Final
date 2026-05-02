#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from api.models.models import (
    TipoDocumento, Docente, Programa, PeriodoAcademico,
    Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro,
    TipoActividad, Actividad, RaActividad, Estudiante,
    Matricula, NotasActividad
)
from datetime import date, timedelta
from decimal import Decimal

print("=" * 80)
print("CARGANDO DATOS DE PRUEBA - RA MANAGER")
print("=" * 80)

# Tipos de documento
doc_cedula, _ = TipoDocumento.objects.get_or_create(descripcion='Cedula')

# Programas
prog_ing, _ = Programa.objects.get_or_create(
    codigo_programa="ING01",
    defaults={"nombre": "Ingenieria Informatica"}
)
prog_adm, _ = Programa.objects.get_or_create(
    codigo_programa="ADM01",
    defaults={"nombre": "Administracion de Empresas"}
)

# Periodos
periodo_2025_1, _ = PeriodoAcademico.objects.get_or_create(
    descripcion="2025-1",
    defaults={
        "fecha_inicio": date(2025, 1, 15),
        "fecha_finalizacion": date(2025, 5, 30)
    }
)

# Docentes
docentes_data = [
    ("Cristian", "Rodriguez", "DOC001", "cristian.rodriguez@univalle.edu.co", "79850123", "Docente123!"),
    ("Maria", "Garcia", "DOC002", "maria.garcia@univalle.edu.co", "45123456", "Docente456!"),
    ("Juan", "Lopez", "DOC003", "juan.lopez@univalle.edu.co", "87654321", "Docente789!")
]

docentes_list = []
for nombre, apellido, codigo, correo, doc, pwd in docentes_data:
    docente, _ = Docente.objects.get_or_create(
        codigo_docente=codigo,
        defaults={
            "nombre": nombre,
            "apellido": apellido,
            "correo": correo,
            "num_documento": doc,
            "tipo_documento": doc_cedula,
            "contrasenia_docente": make_password(pwd)
        }
    )
    docentes_list.append((docente, pwd))

# Asignaturas
asignatura_1, _ = Asignatura.objects.get_or_create(
    codigo_asignatura="INF101",
    grupo="01",
    defaults={
        "nombre": "Fundamentos de Programacion",
        "docente": docentes_list[0][0],
        "sede": "San Alejo",
        "creditos": 4,
        "programa": prog_ing,
        "periodo": periodo_2025_1
    }
)

asignatura_2, _ = Asignatura.objects.get_or_create(
    codigo_asignatura="INF202",
    grupo="01",
    defaults={
        "nombre": "Base de Datos",
        "docente": docentes_list[1][0],
        "sede": "San Alejo",
        "creditos": 3,
        "programa": prog_ing,
        "periodo": periodo_2025_1
    }
)

asignatura_3, _ = Asignatura.objects.get_or_create(
    codigo_asignatura="ADM101",
    grupo="01",
    defaults={
        "nombre": "Gestion de Proyectos",
        "docente": docentes_list[2][0],
        "sede": "San Alejo",
        "creditos": 3,
        "programa": prog_adm,
        "periodo": periodo_2025_1
    }
)

asignaturas_list = [asignatura_1, asignatura_2, asignatura_3]

# Resultados de aprendizaje
ra_1, _ = ResultadoDeAprendizaje.objects.get_or_create(
    asignatura=asignatura_1,
    descripcion="Comprender y aplicar conceptos fundamentales de programacion",
    defaults={"porcentaje_ra": Decimal("50.00")}
)

ra_2, _ = ResultadoDeAprendizaje.objects.get_or_create(
    asignatura=asignatura_1,
    descripcion="Desarrollar habilidades de resolucion de problemas",
    defaults={"porcentaje_ra": Decimal("50.00")}
)

ra_3, _ = ResultadoDeAprendizaje.objects.get_or_create(
    asignatura=asignatura_2,
    descripcion="Diseñar y optimizar bases de datos relacionales",
    defaults={"porcentaje_ra": Decimal("100.00")}
)

ras_list = [ra_1, ra_2, ra_3]

# Indicadores
for ra in ras_list:
    IndicadoresDeLogro.objects.get_or_create(
        ra=ra,
        descripcion="Indicador 1: " + ra.descripcion[:40],
        defaults={"porcentaje_ind": Decimal("50.00")}
    )
    IndicadoresDeLogro.objects.get_or_create(
        ra=ra,
        descripcion="Indicador 2: " + ra.descripcion[:40],
        defaults={"porcentaje_ind": Decimal("50.00")}
    )

# Tipos de actividad
tipos_actividad = []
for desc in ["Quiz", "Taller", "Proyecto", "Examen", "Participacion"]:
    tipo, _ = TipoActividad.objects.get_or_create(descripcion=desc)
    tipos_actividad.append(tipo)

# Actividades
actividades_list = []
for i, ra in enumerate(ras_list[:2]):
    actividad, _ = Actividad.objects.get_or_create(
        nombre_actividad="Actividad " + str(i+1) + " - " + ra.asignatura.nombre,
        defaults={
            "tipo_actividad": tipos_actividad[i % len(tipos_actividad)],
            "descripcion": "Actividad de evaluacion para " + ra.descripcion,
            "fecha_creacion": date(2025, 2, 1) + timedelta(days=i*7),
            "fecha_cierre": date(2025, 2, 1) + timedelta(days=i*7+7)
        }
    )
    actividades_list.append(actividad)
    
    RaActividad.objects.get_or_create(
        actividad=actividad,
        ra=ra,
        defaults={"porcentaje_ra_actividad": Decimal("100.00")}
    )

# Estudiantes
estudiantes_data = [
    ("David", "Escobar", "2360529", "david.escobar@correounivalle.edu.co", "2001", "Diurna", prog_ing, "Estudiante123!"),
    ("Guadalupe", "Hincapie", "2360800", "guadalupe.hincapie@correounivalle.edu.co", "2002", "Diurna", prog_ing, "Estudiante456!"),
    ("Sofia", "Martinez", "2360850", "sofia.martinez@correounivalle.edu.co", "2003", "Nocturna", prog_adm, "Estudiante789!"),
    ("Carlos", "Fernandez", "2360900", "carlos.fernandez@correounivalle.edu.co", "2004", "Diurna", prog_ing, "Estudiante321!")
]

estudiantes_list = []
for nombre, apellido, codigo, correo, doc, jornada, programa, pwd in estudiantes_data:
    estudiante, _ = Estudiante.objects.get_or_create(
        codigo_estudiante=codigo,
        defaults={
            "nombre": nombre,
            "apellido": apellido,
            "correo": correo,
            "num_documento": doc,
            "tipo_documento": doc_cedula,
            "jornada": jornada,
            "contrasena_estudiante": make_password(pwd),
            "activo": True
        }
    )
    estudiantes_list.append((estudiante, pwd))

# Matriculas
for estudiante, _ in estudiantes_list:
    if estudiante.id_estudiante % 2 == 1:
        asig_programa = [asignatura_1, asignatura_2]
    else:
        asig_programa = [asignatura_3]
    
    for asignatura in asig_programa:
        Matricula.objects.get_or_create(
            estudiante=estudiante,
            periodo=periodo_2025_1,
            asignatura=asignatura,
            defaults={"nota_final": None}
        )

# Notas de actividades
matriculas = Matricula.objects.all()
for matricula in matriculas:
    ra_actividades = RaActividad.objects.filter(actividad_id__in=[a.id_actividad for a in actividades_list])
    for ra_actividad in ra_actividades:
        NotasActividad.objects.get_or_create(
            matricula=matricula,
            ra_actividad=ra_actividad,
            defaults={
                "nota_ra_actividad": Decimal("4.5"),
                "retroalimentacion": "Excelente desempeño. Continua asi."
            }
        )

print("\n" + "=" * 80)
print("DATOS CARGADOS EXITOSAMENTE")
print("=" * 80)
print("\nResumen:")
print("  - Programas: " + str(Programa.objects.count()))
print("  - Periodos academicos: " + str(PeriodoAcademico.objects.count()))
print("  - Docentes: " + str(Docente.objects.count()))
print("  - Asignaturas: " + str(Asignatura.objects.count()))
print("  - Estudiantes: " + str(Estudiante.objects.count()))
print("  - Matriculas: " + str(Matricula.objects.count()))
print("  - Actividades: " + str(Actividad.objects.count()))
print("  - Notas: " + str(NotasActividad.objects.count()))
