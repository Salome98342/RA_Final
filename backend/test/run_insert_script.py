"""
Script para ejecutar SQL de bajo desempeño
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, '/'.join(os.path.abspath(__file__).split('/')[:-1]))
django.setup()

from django.db import connection

# Leer el archivo SQL
sql_file = 'db/inserts_bajo_desempenio.sql'
with open(sql_file, 'r', encoding='utf-8') as f:
    sql_content = f.read()

# Ejecutar el SQL
print("Ejecutando script de bajo desempeño...")
try:
    with connection.cursor() as cursor:
        cursor.execute(sql_content)
    print("✅ Script ejecutado exitosamente!")
    print(f"Archivo: {sql_file}")
except Exception as e:
    print(f"❌ Error ejecutando script: {e}")
    sys.exit(1)
