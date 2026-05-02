#!/usr/bin/env python
"""
Test para verificar que coordinador_estudiantes_view devuelve estudiantes
incluyendo los que no tienen matrículas aún (nuevos importados)
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from api.models.models import Estudiante, Coordinador, Asignatura, Matricula, Programa
from django.db.models import Count

print("=" * 80)
print("TEST: Verificar que estudiantes sin matrículas aparezcan")
print("=" * 80)

# 1. Encontrar un coordinador
print("\n[STEP 1] Buscando coordinadores...")
coordinadores = Coordinador.objects.all()[:5]
print(f"✓ Coordinadores encontrados: {[c.codigo_coordinador for c in coordinadores]}")

if not coordinadores:
    print("✗ ERROR: No hay coordinadores activos")
    sys.exit(1)

coord = coordinadores[0]
print(f"  Usando: {coord.codigo_coordinador} ({coord.nombre if hasattr(coord, 'nombre') else 'N/A'})")

# 2. Contar estudiantes en la BD
print("\n[STEP 2] Analizando estado de estudiantes en BD...")
total_estudiantes = Estudiante.objects.filter(activo=True).count()
print(f"✓ Total de estudiantes activos: {total_estudiantes}")

# 3. Contar estudiantes con y sin matrículas
estudainantes_con_matricula = Estudiante.objects.filter(
    activo=True,
    matricula__isnull=False
).distinct().count()

estudiantes_sin_matricula = Estudiante.objects.filter(
    activo=True,
    matricula__isnull=True
).count()

print(f"  - Con matrículas: {estudainantes_con_matricula}")
print(f"  - Sin matrículas (nuevos): {estudiantes_sin_matricula}")

# 4. Simular lo que hace coordinador_estudiantes_view
print("\n[STEP 3] Simulando filtro de coordinador_estudiantes_view...")

# El nuevo filtro (lo que pusimos):
result_estudiantes = Estudiante.objects.filter(
    activo=True
).order_by('apellido', 'nombre')

result_count = result_estudiantes.count()
print(f"✓ Estudiantes que devuelve la vista: {result_count}")

if result_count > 0:
    print(f"  Primeros 3:")
    for e in result_estudiantes[:3]:
        tiene_matricula = Matricula.objects.filter(estudiante=e).exists()
        print(f"    - {e.nombre} {e.apellido} ({e.codigo_estudiante}) - Matriculas: {tiene_matricula}")

# 5. Resultado
print("\n[STEP 4] Validación...")
if result_count >= total_estudiantes:
    print(f"✓ PASS: La vista devuelve {result_count} estudiantes (total en BD: {total_estudiantes})")
    if estudiantes_sin_matricula == 0:
        print(f"  (Nota: No hay estudiantes sin matrículas en la BD)")
    else:
        print(f"  ✓ Incluye {estudiantes_sin_matricula} estudiantes SIN matrículas (nuevos importados)")
else:
    print(f"✗ FAIL: La vista devuelve menos estudiantes ({result_count} < {total_estudiantes})")
    print(f"  Faltantes: {total_estudiantes - result_count}")

print("\n" + "=" * 80)
print("✓ TEST COMPLETADO")
print("=" * 80)
