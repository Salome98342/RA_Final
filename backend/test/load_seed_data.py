#!/usr/bin/env python
"""
Script para cargar datos de prueba coherentes en la base de datos.
Ejecutar con: python manage.py shell < load_seed_data.py
"""

from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from api.models import (
    TipoDocumento, Docente, Programa, PeriodoAcademico,
    Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro,
    TipoActividad, Actividad, RaActividad, Estudiante,
    Matricula, NotasActividad
)
from django.contrib.auth.hashers import make_password

print("=" * 80)
print("CARGANDO DATOS DE PRUEBA - RA MANAGER")
print("=" * 80)

# ========== LIMPIAR DATOS EXISTENTES ==========
print("\n1. Limpiando datos existentes...")
TipoDocumento.objects.filter(descripcion__in=['Cédula', 'Pasaporte']).delete()
Programa.objects.all().delete()
PeriodoAcademico.objects.all().delete()
Docente.objects.all().delete()
Estudiante.objects.all().delete()
TipoActividad.objects.all().delete()
User.objects.filter(username__startswith='docente_').delete()
print("✓ Datos limpios")

# ========== TIPOS DE DOCUMENTO ==========
print("\n2. Creando tipos de documento...")
doc_cedula, _ = TipoDocumento.objects.get_or_create(descripcion='Cédula')
doc_pasaporte, _ = TipoDocumento.objects.get_or_create(descripcion='Pasaporte')
print(f"✓ Tipos de documento creados")

# ========== PROGRAMAS ==========
print("\n3. Creando programas...")
prog_ing, _ = Programa.objects.get_or_create(
    codigo_programa="ING01",
    defaults={"nombre": "Ingeniería Informática"}
)
prog_adm, _ = Programa.objects.get_or_create(
    codigo_programa="ADM01",
    defaults={"nombre": "Administración de Empresas"}
)
print(f"✓ Programas creados")

# ========== PERÍODOS ACADÉMICOS ==========
print("\n4. Creando períodos académicos...")
periodo_2025_1, _ = PeriodoAcademico.objects.get_or_create(
    descripcion="2025-1",
    defaults={
        "fecha_inicio": date(2025, 1, 15),
        "fecha_finalizacion": date(2025, 5, 30)
    }
)
periodo_2025_2, _ = PeriodoAcademico.objects.get_or_create(
    descripcion="2025-2",
    defaults={
        "fecha_inicio": date(2025, 8, 1),
        "fecha_finalizacion": date(2025, 12, 15)
    }
)
print(f"✓ Períodos académicos creados")

# ========== DOCENTES ==========
print("\n5. Creando docentes...")
docentes_data = [
    {
        "nombre": "Cristian",
        "apellido": "Rodriguez",
        "codigo_docente": "DOC001",
        "correo": "cristian.rodriguez@univalle.edu.co",
        "num_documento": "79850123",
        "contraseña": "Docente123!"
    },
    {
        "nombre": "María",
        "apellido": "García",
        "codigo_docente": "DOC002",
        "correo": "maria.garcia@univalle.edu.co",
        "num_documento": "45123456",
        "contraseña": "Docente456!"
    },
    {
        "nombre": "Juan",
        "apellido": "López",
        "codigo_docente": "DOC003",
        "correo": "juan.lopez@univalle.edu.co",
        "num_documento": "87654321",
        "contraseña": "Docente789!"
    }
]

docentes = []
for doc_data in docentes_data:
    contraseña = doc_data.pop("contraseña")
    docente, _ = Docente.objects.get_or_create(
        codigo_docente=doc_data["codigo_docente"],
        defaults={
            **doc_data,
            "tipo_documento": doc_cedula,
            "contrasenia_docente": make_password(contraseña)
        }
    )
    docentes.append((docente, contraseña))
    # Crear usuario Django asociado
    User.objects.get_or_create(
        username=f"docente_{doc_data['codigo_docente'].lower()}",
        defaults={
            "email": doc_data["correo"],
            "first_name": doc_data["nombre"],
            "last_name": doc_data["apellido"],
            "is_staff": True
        }
    )

print(f"✓ {len(docentes)} docentes creados")

# ========== ASIGNATURAS ==========
print("\n6. Creando asignaturas...")
asignaturas_data = [
    {
        "nombre": "Fundamentos de Programación",
        "codigo_asignatura": "INF101",
        "docente": docentes[0][0],
        "grupo": "01",
        "sede": "San Alejo",
        "creditos": 4,
        "programa": prog_ing,
        "periodo": periodo_2025_1
    },
    {
        "nombre": "Base de Datos",
        "codigo_asignatura": "INF202",
        "docente": docentes[1][0],
        "grupo": "01",
        "sede": "San Alejo",
        "creditos": 3,
        "programa": prog_ing,
        "periodo": periodo_2025_1
    },
    {
        "nombre": "Gestión de Proyectos",
        "codigo_asignatura": "ADM101",
        "docente": docentes[2][0],
        "grupo": "01",
        "sede": "San Alejo",
        "creditos": 3,
        "programa": prog_adm,
        "periodo": periodo_2025_1
    }
]

asignaturas = []
for asig_data in asignaturas_data:
    asignatura, _ = Asignatura.objects.get_or_create(
        codigo_asignatura=asig_data["codigo_asignatura"],
        grupo=asig_data["grupo"],
        defaults=asig_data
    )
    asignaturas.append(asignatura)

print(f"✓ {len(asignaturas)} asignaturas creadas")

# ========== RESULTADOS DE APRENDIZAJE E INDICADORES ==========
print("\n7. Creando resultados de aprendizaje e indicadores...")
ra_data = [
    {
        "asignatura": asignaturas[0],
        "descripcion": "Comprender y aplicar conceptos fundamentales de programación",
        "porcentaje": Decimal("50.00")
    },
    {
        "asignatura": asignaturas[0],
        "descripcion": "Desarrollar habilidades de resolución de problemas",
        "porcentaje": Decimal("50.00")
    },
    {
        "asignatura": asignaturas[1],
        "descripcion": "Diseñar y optimizar bases de datos relacionales",
        "porcentaje": Decimal("100.00")
    }
]

ras = []
for ra_item in ra_data:
    ra, _ = ResultadoDeAprendizaje.objects.get_or_create(
        asignatura=ra_item["asignatura"],
        descripcion=ra_item["descripcion"],
        defaults={"porcentaje_ra": ra_item["porcentaje"]}
    )
    ras.append(ra)
    
    # Crear indicadores para cada RA
    IndicadoresDeLogro.objects.get_or_create(
        ra=ra,
        descripcion=f"Indicador 1 de {ra.descripcion[:40]}...",
        defaults={"porcentaje_ind": Decimal("50.00")}
    )
    IndicadoresDeLogro.objects.get_or_create(
        ra=ra,
        descripcion=f"Indicador 2 de {ra.descripcion[:40]}...",
        defaults={"porcentaje_ind": Decimal("50.00")}
    )

print(f"✓ {len(ras)} resultados de aprendizaje con indicadores creados")

# ========== TIPOS DE ACTIVIDAD ==========
print("\n8. Creando tipos de actividad...")
tipos_actividad = []
for tipo_desc in ["Quiz", "Taller", "Proyecto", "Examen", "Participación"]:
    tipo, _ = TipoActividad.objects.get_or_create(descripcion=tipo_desc)
    tipos_actividad.append(tipo)

print(f"✓ {len(tipos_actividad)} tipos de actividad creados")

# ========== ACTIVIDADES ==========
print("\n9. Creando actividades...")
actividades = []
actividad_tipos = [tipos_actividad[0], tipos_actividad[1], tipos_actividad[3]]
for i, ra in enumerate(ras[:2]):
    actividad, _ = Actividad.objects.get_or_create(
        nombre_actividad=f"Actividad {i+1} - {ra.asignatura.nombre}",
        defaults={
            "tipo_actividad": actividad_tipos[i % len(actividad_tipos)],
            "descripcion": f"Actividad de evaluación para {ra.descripcion}",
            "fecha_creacion": date(2025, 2, 1) + timedelta(days=i*7),
            "fecha_cierre": date(2025, 2, 1) + timedelta(days=i*7+7)
        }
    )
    actividades.append(actividad)
    
    # Vincular RA a actividad
    RaActividad.objects.get_or_create(
        actividad=actividad,
        ra=ra,
        defaults={"porcentaje_ra_actividad": Decimal("100.00")}
    )

print(f"✓ {len(actividades)} actividades creadas")

# ========== ESTUDIANTES ==========
print("\n10. Creando estudiantes...")
estudiantes_data = [
    {
        "nombre": "David",
        "apellido": "Escobar",
        "codigo_estudiante": "2360529",
        "correo": "david.escobar@correounivalle.edu.co",
        "num_documento": "2001",
        "jornada": "Diurna",
        "programa": prog_ing,
        "contraseña": "Estudiante123!"
    },
    {
        "nombre": "Guadalupe",
        "apellido": "Hincapie",
        "codigo_estudiante": "2360800",
        "correo": "guadalupe.hincapie@correounivalle.edu.co",
        "num_documento": "2002",
        "jornada": "Diurna",
        "programa": prog_ing,
        "contraseña": "Estudiante456!"
    },
    {
        "nombre": "Sofia",
        "apellido": "Martinez",
        "codigo_estudiante": "2360850",
        "correo": "sofia.martinez@correounivalle.edu.co",
        "num_documento": "2003",
        "jornada": "Nocturna",
        "programa": prog_adm,
        "contraseña": "Estudiante789!"
    },
    {
        "nombre": "Carlos",
        "apellido": "Fernandez",
        "codigo_estudiante": "2360900",
        "correo": "carlos.fernandez@correounivalle.edu.co",
        "num_documento": "2004",
        "jornada": "Diurna",
        "programa": prog_ing,
        "contraseña": "Estudiante321!"
    }
]

estudiantes = []
for est_data in estudiantes_data:
    programa = est_data.pop("programa")
    contraseña = est_data.pop("contraseña")
    
    estudiante, _ = Estudiante.objects.get_or_create(
        codigo_estudiante=est_data["codigo_estudiante"],
        defaults={
            **est_data,
            "tipo_documento": doc_cedula,
            "contrasena_estudiante": make_password(contraseña),
            "activo": True
        }
    )
    estudiantes.append((estudiante, contraseña))

print(f"✓ {len(estudiantes)} estudiantes creados")

# ========== MATRÍCULAS ==========
print("\n11. Creando matrículas...")
matriculas = []
# Vincular estudiantes a asignaturas según su programa
for estudiante, _ in estudiantes:
    asignaturas_programa = Asignatura.objects.filter(programa=estudiante.programa if hasattr(estudiante, 'programa') else estudiante.programa_id)
    
    # Uso de atributos reales del modelo
    for asignatura in asignaturas_programa:
        matricula, _ = Matricula.objects.get_or_create(
            estudiante=estudiante,
            periodo=periodo_2025_1,
            asignatura=asignatura,
            defaults={"nota_final": None}
        )
        matriculas.append(matricula)

print(f"✓ {len(matriculas)} matrículas creadas")

# ========== NOTAS DE ACTIVIDADES ==========
print("\n12. Creando notas de actividades...")
notas_count = 0
for matricula in matriculas:
    ra_actividades = RaActividad.objects.filter(actividad__id__in=[a.id for a in actividades])
    for ra_actividad in ra_actividades:
        nota, _ = NotasActividad.objects.get_or_create(
            matricula=matricula,
            ra_actividad=ra_actividad,
            defaults={
                "nota_ra_actividad": Decimal("4.5"),
                "retroalimentacion": "Excelente desempeño. Continúa así."
            }
        )
        notas_count += 1

print(f"✓ {notas_count} notas de actividades creadas")

# ========== RESUMEN ==========
print("\n" + "=" * 80)
print("DATOS CARGADOS EXITOSAMENTE")
print("=" * 80)
print(f"\nResumen:")
print(f"  - Programas: {Programa.objects.count()}")
print(f"  - Períodos académicos: {PeriodoAcademico.objects.count()}")
print(f"  - Docentes: {Docente.objects.count()}")
print(f"  - Asignaturas: {Asignatura.objects.count()}")
print(f"  - Estudiantes: {Estudiante.objects.count()}")
print(f"  - Matrículas: {Matricula.objects.count()}")
print(f"  - Actividades: {Actividad.objects.count()}")
print(f"  - Notas: {NotasActividad.objects.count()}")

# ========== MOSTRAR CREDENCIALES ==========
print("\n" + "=" * 80)
print("CREDENCIALES DE ACCESO")
print("=" * 80)

print("\n🔐 DOCENTES:")
for docente, contraseña in docentes:
    print(f"\n  Usuario: {docente.correo}")
    print(f"  Código: {docente.codigo_docente}")
    print(f"  Contraseña: {contraseña}")

print("\n\n👨‍🎓 ESTUDIANTES:")
for estudiante, contraseña in estudiantes:
    print(f"\n  Usuario: {estudiante.correo}")
    print(f"  Código: {estudiante.codigo_estudiante}")
    print(f"  Contraseña: {contraseña}")

print("\n" + "=" * 80)
