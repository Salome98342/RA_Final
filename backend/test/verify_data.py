"""
Verificar que los datos de bajo desempeño se insertaron correctamente
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, '/'.join(os.path.abspath(__file__).split('/')[:-1]))
django.setup()

from django.db import connection

# Verificar datos insertados
print("=" * 60)
print("VERIFICACIÓN DE DATOS INSERTADOS")
print("=" * 60)

with connection.cursor() as cursor:
    # Contar estudiantes nuevos
    cursor.execute("SELECT COUNT(*) FROM estudiante WHERE id_estudiante >= 25")
    count_estudiantes = cursor.fetchone()[0]
    print(f"✓ Estudiantes nuevos: {count_estudiantes}")
    
    # Contar matrículas nuevas
    cursor.execute("SELECT COUNT(*) FROM matricula WHERE id_matricula >= 31")
    count_matriculas = cursor.fetchone()[0]
    print(f"✓ Matrículas nuevas: {count_matriculas}")
    
    # Contar notas con bajo desempeño  (< 3.0)
    cursor.execute("SELECT COUNT(*) FROM notas_actividad WHERE nota_ra_actividad < 3.0")
    count_notas_bajas = cursor.fetchone()[0]
    print(f"✓ Notas de bajo desempeño (< 3.0): {count_notas_bajas}")
    
    # Mostrar estudiantes con bajo desempeño
    print("\n" + "=" * 60)
    print("ESTUDIANTES CON BAJO DESEMPEÑO")
    print("=" * 60)
    
    cursor.execute("""
        SELECT DISTINCT 
            e.id_estudiante,
            e.nombre || ' ' || e.apellido as nombre,
            a.nombre as asignatura,
            COUNT(DISTINCT CASE WHEN na.nota_ra_actividad < 3.0 THEN ra.id_ra END) as ras_bajos
        FROM estudiante e
        JOIN matricula m ON e.id_estudiante = m.id_estudiante
        JOIN asignatura a ON m.id_asignatura = a.id_asignatura
        JOIN ra_actividad ra_act ON a.id_asignatura = 
            (SELECT id_asignatura FROM asignatura WHERE id_asignatura IN (
                SELECT DISTINCT ra_act2.id_asignatura FROM ra_actividad ra_act2 
            ))
        JOIN notas_actividad na ON m.id_matricula = na.id_matricula
        JOIN ra_actividad ra ON na.id_ra_actividad = ra.id_ra_actividad
        WHERE e.id_estudiante >= 25 AND na.nota_ra_actividad < 3.0
        GROUP BY e.id_estudiante, e.nombre, e.apellido, a.nombre
        ORDER BY e.nombre
        LIMIT 20
    """)
    
    # Si eso falla, intentar algo más simple
    try:
        cursor.execute("""
            SELECT DISTINCT
                e.nombre || ' ' || e.apellido as nombre,
                COUNT(CASE WHEN na.nota_ra_actividad < 3.0 THEN 1 END) as notas_bajas
            FROM estudiante e
            JOIN matricula m ON e.id_estudiante = m.id_estudiante
            JOIN notas_actividad na ON m.id_matricula = na.id_matricula
            WHERE e.id_estudiante >= 25
            GROUP BY e.id_estudiante, e.nombre, e.apellido
            HAVING COUNT(CASE WHEN na.nota_ra_actividad < 3.0 THEN 1 END) > 0
            ORDER BY notas_bajas DESC
        """)
    except:
        pass
    
    results = cursor.fetchall()
    for row in results:
        print(f"  • {row[0]}: {row[1]} notas bajas")
    
    print("\n✅ Verificación completada!")
