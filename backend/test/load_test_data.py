#!/usr/bin/env python
"""Script para cargar datos de prueba en la base de datos"""

import os
import django
from django.contrib.auth.hashers import make_password

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models.models import (
    TipoDocumento, TipoActividad, Programa, PeriodoAcademico,
    Docente, Estudiante, Coordinador, Asignatura
)

def load_test_data():
    """Carga datos de prueba mínimos para poder navegar la aplicación"""
    
    print("🔄 Limpiando datos previos...")
    Docente.objects.all().delete()
    Estudiante.objects.all().delete()
    Coordinador.objects.all().delete()
    Asignatura.objects.all().delete()
    
    print("📝 Creando catálogos...")
    
    # Tipos de documento
    td1, _ = TipoDocumento.objects.get_or_create(
        id_tipo_documento=1,
        defaults={'descripcion': 'Cédula de Ciudadanía'}
    )
    
    # Tipo de actividad
    ta1, _ = TipoActividad.objects.get_or_create(
        id_tipo_actividad=1,
        defaults={'descripcion': 'Examen'}
    )
    
    # Programa
    prog1, _ = Programa.objects.get_or_create(
        id_programa=2724,
        defaults={'nombre': 'Programa 2724', 'codigo_programa': '2724'}
    )
    
    # Período
    periodo, _ = PeriodoAcademico.objects.get_or_create(
        id_periodo=1,
        defaults={
            'descripcion': '2025-1',
            'fecha_inicio': '2025-01-15',
            'fecha_finalizacion': '2025-06-15'
        }
    )
    
    print("👨‍🏫 Creando docentes...")
    
    # Docente con credenciales conocidas
    doc1, _ = Docente.objects.get_or_create(
        codigo_docente='DOC-003',
        defaults={
            'nombre': 'Cristian',
            'apellido': 'Rodriguez',
            'contrasenia_docente': make_password('12345'),  # Hasheada
            'correo': 'cristian.rodriguez@univalle.edu.co',
            'tipo_documento': td1,
            'num_documento': '1003',
            'num_telefono': '3001234567'
        }
    )
    
    print("👨‍🎓 Creando estudiantes...")
    
    # Estudiantes con credenciales conocidas
    est1, _ = Estudiante.objects.get_or_create(
        codigo_estudiante='2360529',
        defaults={
            'nombre': 'David',
            'apellido': 'Escobar',
            'contrasena_estudiante': make_password('Escobar1234'),  # Hasheada
            'tipo_documento': td1,
            'programa': prog1,
            'num_documento': '2001',
            'correo': 'david.escobar@correounivalle.edu.co',
            'jornada': 'Diurna',
            'activo': True
        }
    )
    
    est2, _ = Estudiante.objects.get_or_create(
        codigo_estudiante='2360800',
        defaults={
            'nombre': 'Guadalupe',
            'apellido': 'Hincapie',
            'contrasena_estudiante': make_password('Guadalupe2024'),  # Hasheada
            'tipo_documento': td1,
            'programa': prog1,
            'num_documento': '2002',
            'correo': 'guadalupe.hincapie@correounivalle.edu.co',
            'jornada': 'Diurna',
            'activo': True
        }
    )
    
    print("👔 Creando coordinador...")
    
    # Coordinador
    coord, _ = Coordinador.objects.get_or_create(
        codigo_coordinador='02-2724-Caice',
        defaults={
            'nombre': 'Coordinador Caicedonia',
            'contrasenia_coord': make_password('Tedesoft1234'),  # Hasheada
            'correo': 'tecnologia.software.caicedonia@correounivalle.edu.co',
        }
    )
    
    print("📚 Creando asignatura...")
    
    # Asignatura
    asig, _ = Asignatura.objects.get_or_create(
        codigo_asignatura='BD101',
        grupo='A',
        sede='Sede Principal',
        periodo=periodo,
        defaults={
            'nombre': 'Bases de Datos',
            'docente': doc1,
            'programa': prog1,
            'creditos': 3
        }
    )
    
    print("✅ ¡Datos de prueba cargados exitosamente!")
    print("\n📋 Credenciales disponibles:")
    print("   Coordinador: 02-2724-Caice / Tedesoft1234")
    print("   Docente: DOC-003 / 12345")
    print("   Estudiante: 2360529 / Escobar1234")

if __name__ == '__main__':
    load_test_data()
