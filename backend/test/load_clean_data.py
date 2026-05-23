"""
Script para limpiar la BD y cargar nuevos datos de prueba.
Ejecutar con: python manage.py shell < backend/test/load_clean_data.py
"""

import os
import sys
import django
from decimal import Decimal
from django.utils import timezone
from datetime import datetime, timedelta
import random

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models.models import (
    TipoDocumento, Docente, Coordinador, Programa, PeriodoAcademico,
    Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro, Actividad, 
    TipoActividad, RaActividad, Estudiante, Matricula, NotasActividad,
    RaActividadIndicador, Recurso, ImportAudit, LoginAttempt, PasswordResetOTP
)
from django.contrib.auth.hashers import make_password

print("=" * 80)
print("INICIANDO LIMPIEZA DE BASE DE DATOS")
print("=" * 80)

# Paso 1: Limpiar todos los datos excepto tipos de documento
print("\n[1/3] Limpiando datos existentes...")

tables_to_clear = [
    LoginAttempt,
    PasswordResetOTP,
    ImportAudit,
    NotasActividad,
    RaActividadIndicador,
    Recurso,
    RaActividad,
    Actividad,
    TipoActividad,
    IndicadoresDeLogro,
    ResultadoDeAprendizaje,
    Matricula,
    Asignatura,
    PeriodoAcademico,
    Estudiante,
    Docente,
    Coordinador,
    Programa,
]

for model in tables_to_clear:
    count = model.objects.count()
    if count > 0:
        model.objects.all().delete()
        print(f"   - {model.__name__}: {count} registros eliminados")

print("\n✓ Limpieza completada")

# Paso 2: Crear tipos de documento (limpiar primero si existen)
print("\n[2/5] Creando tipos de documento...")

TipoDocumento.objects.all().delete()

tipo_cc = TipoDocumento.objects.create(descripcion='Cédula de Ciudadanía')
tipo_ti = TipoDocumento.objects.create(descripcion='Tarjeta de Identidad')
print(f"   ✓ Tipos de documento: {TipoDocumento.objects.count()}")

# Paso 3: Crear programa y período académico
print("\n[3/5] Creando programa y período académico...")

programa = Programa.objects.create(
    nombre='Tecnología en Desarrollo de Software',
    codigo_programa='2724'
)
print(f"   ✓ Programa: {programa.nombre}")

periodo = PeriodoAcademico.objects.create(
    descripcion='2025-1',
    fecha_inicio=datetime(2025, 1, 15).date(),
    fecha_finalizacion=datetime(2025, 5, 30).date()
)
print(f"   ✓ Período: {periodo.descripcion}")

# Paso 4: Crear 4 docentes
print("\n[4/5] Creando 4 docentes...")

docentes_data = [
    ('DOC001', 'Cristian', 'Rodriguez', 'cristian.rodriguez@example.com', '1234567890'),
    ('DOC002', 'María', 'Garcia', 'maria.garcia@example.com', '1234567891'),
    ('DOC003', 'Juan', 'López', 'juan.lopez@example.com', '1234567892'),
    ('DOC004', 'Ana', 'Martinez', 'ana.martinez@example.com', '1234567893'),
]

docentes = []
for codigo, nombre, apellido, correo, num_doc in docentes_data:
    docente = Docente.objects.create(
        nombre=nombre,
        apellido=apellido,
        codigo_docente=codigo,
        contrasenia_docente=make_password('Docente123!'),
        correo=correo,
        tipo_documento=tipo_cc,
        num_documento=num_doc,
        num_telefono=f'+57-3{random.randint(100000000, 999999999)}'
    )
    docentes.append(docente)
    print(f"   ✓ {docente.nombre} {docente.apellido} ({correo})")

# Paso 5: Crear 4 asignaturas y contenido asociado
print("\n[5/5] Creando 4 asignaturas con RAs, indicadores y actividades...")

asignaturas_data = [
    ('INF101', 'Fundamentos de Programación', docentes[0], 4),
    ('INF202', 'Base de Datos', docentes[1], 3),
    ('INF303', 'Arquitectura de Software', docentes[2], 3),
    ('INF404', 'Desarrollo Web Avanzado', docentes[3], 4),
]

asignaturas = []
ras_por_asignatura = {}
indicadores_por_ra = {}
actividades_por_ra = {}

for cod_asig, nombre_asig, docente, creditos in asignaturas_data:
    asignatura = Asignatura.objects.create(
        nombre=nombre_asig,
        codigo_asignatura=cod_asig,
        docente=docente,
        periodo=periodo,
        grupo='01',
        sede='Campus Principal',
        creditos=creditos,
        programa=programa
    )
    asignaturas.append(asignatura)
    print(f"\n   Asignatura: {nombre_asig} ({cod_asig})")
    
    # Crear 3 RAs por asignatura
    ras_por_asignatura[asignatura.id_asignatura] = []
    
    for num_ra in range(1, 4):
        ra = ResultadoDeAprendizaje.objects.create(
            asignatura=asignatura,
            porcentaje_ra=Decimal('33.33'),
            descripcion=f'Resultado de Aprendizaje {num_ra}: {nombre_asig}'
        )
        ras_por_asignatura[asignatura.id_asignatura].append(ra)
        indicadores_por_ra[ra.id_ra] = []
        actividades_por_ra[ra.id_ra] = []
        
        # Crear 2 indicadores de logro por RA
        for num_ind in range(1, 3):
            indicador = IndicadoresDeLogro.objects.create(
                ra=ra,
                descripcion=f'Indicador {num_ind}: {nombre_asig} - RA {num_ra}'
            )
            indicadores_por_ra[ra.id_ra].append(indicador)
        
        # Crear 2 actividades por RA (con TipoActividad)
        tipos_actividad = ['Quiz', 'Taller']
        tipo_act_objs = {}
        
        for tipo_act_nombre in tipos_actividad:
            tipo_act, _ = TipoActividad.objects.get_or_create(
                descripcion=tipo_act_nombre
            )
            tipo_act_objs[tipo_act_nombre] = tipo_act
        
        for num_act, tipo_act_nombre in enumerate(tipos_actividad, 1):
            fecha_creacion = datetime(2025, 2, 1).date()
            fecha_cierre = fecha_creacion + timedelta(days=7 * num_act)
            
            actividad = Actividad.objects.create(
                tipo_actividad=tipo_act_objs[tipo_act_nombre],
                nombre_actividad=f'Actividad {num_act}: {tipo_act_nombre} - {nombre_asig} RA{num_ra}',
                descripcion=f'Descripción de {tipo_act_nombre} para {nombre_asig}',
                fecha_creacion=fecha_creacion,
                fecha_cierre=fecha_cierre
            )
            actividades_por_ra[ra.id_ra].append(actividad)
            
            # Crear relación RA-Actividad
            ra_actividad = RaActividad.objects.create(
                actividad=actividad,
                ra=ra,
                porcentaje_ra_actividad=Decimal('50.00')
            )
            
            # Crear relaciones entre RA-Actividad e Indicadores
            for indicador in indicadores_por_ra[ra.id_ra]:
                RaActividadIndicador.objects.create(
                    ra_actividad=ra_actividad,
                    indicador=indicador
                )

print(f"\n   ✓ Total de asignaturas: {Asignatura.objects.count()}")
print(f"   ✓ Total de RAs: {ResultadoDeAprendizaje.objects.count()}")
print(f"   ✓ Total de Indicadores: {IndicadoresDeLogro.objects.count()}")
print(f"   ✓ Total de Actividades: {Actividad.objects.count()}")

# Paso 6: Crear 20 estudiantes y matricularlos
print("\n[6/7] Creando 20 estudiantes...")

estudiantes = []
for num_est in range(1, 21):
    estudiante = Estudiante.objects.create(
        nombre=f'Estudiante{num_est}',
        apellido='DeTest',
        codigo_estudiante=f'EST{num_est:04d}',
        contrasena_estudiante=make_password('Estudiante123!'),
        tipo_documento=tipo_cc,
        programa=programa,
        num_documento=f'1234567{num_est:03d}',
        correo=f'estudiante{num_est}@example.com',
        jornada='Diurna' if num_est % 2 == 0 else 'Nocturna',
        activo=True
    )
    estudiantes.append(estudiante)

print(f"   ✓ Estudiantes creados: {len(estudiantes)}")

# Matricular estudiantes (5 por asignatura)
print("\n[7/7] Matriculando estudiantes y creando calificaciones...")

matriculas_count = 0
notas_count = 0

for idx, asignatura in enumerate(asignaturas):
    # Asignar 5 estudiantes por asignatura
    estudiantes_asignatura = estudiantes[idx*5:(idx+1)*5]
    
    for estudiante in estudiantes_asignatura:
        matricula = Matricula.objects.create(
            estudiante=estudiante,
            periodo=periodo,
            asignatura=asignatura,
            nota_final=Decimal(f'{random.uniform(3.0, 5.0):.2f}')
        )
        matriculas_count += 1
        
        # Crear notas por actividad para cada RA
        for ra in ras_por_asignatura[asignatura.id_asignatura]:
            for actividad in actividades_por_ra[ra.id_ra]:
                ra_actividad = RaActividad.objects.get(actividad=actividad, ra=ra)
                
                # Crear nota para cada indicador del RA
                for indicador in indicadores_por_ra[ra.id_ra]:
                    nota = Decimal(f'{random.uniform(3.0, 5.0):.2f}')
                    
                    NotasActividad.objects.create(
                        matricula=matricula,
                        ra_actividad=ra_actividad,
                        nota_ra_actividad=nota,
                        retroalimentacion=f'Buen trabajo en {actividad.nombre_actividad}',
                        indicador=indicador
                    )
                    notas_count += 1

print(f"   ✓ Matrículas creadas: {matriculas_count}")
print(f"   ✓ Notas de actividad creadas: {notas_count}")

# Resumen final
print("\n" + "=" * 80)
print("RESUMEN DE DATOS CARGADOS")
print("=" * 80)
print(f"\n✓ Programa: {Programa.objects.count()}")
print(f"✓ Períodos Académicos: {PeriodoAcademico.objects.count()}")
print(f"✓ Docentes: {Docente.objects.count()}")
print(f"✓ Asignaturas: {Asignatura.objects.count()}")
print(f"✓ Estudiantes: {Estudiante.objects.count()}")
print(f"✓ Matrículas: {Matricula.objects.count()}")
print(f"✓ RAs: {ResultadoDeAprendizaje.objects.count()}")
print(f"✓ Indicadores de Logro: {IndicadoresDeLogro.objects.count()}")
print(f"✓ Actividades: {Actividad.objects.count()}")
print(f"✓ RA-Actividades: {RaActividad.objects.count()}")
print(f"✓ Notas de Actividad: {NotasActividad.objects.count()}")

print("\n✓ CARGA DE DATOS COMPLETADA EXITOSAMENTE\n")
