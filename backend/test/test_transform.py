import os
import sys
import django
import pandas as pd
from io import BytesIO

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Importar funciones del views
from api.views.views import _detect_and_transform_academic_registro, _read_imported_file

# Leer el archivo Excel de prueba
excel_file = r'c:\Users\User\Downloads\datos_contacto_matriculados_prueba.xlsx'

print(f"📖 Leyendo archivo: {excel_file}")

# Leer con pandas directamente
df = pd.read_excel(excel_file, header=5)
print(f"\n✓ Columnas originales: {df.columns.tolist()}")
print(f"  Registros: {len(df)}")

# Aplicar transformación automática
print(f"\n🔄 Aplicando _detect_and_transform_academic_registro()...")
df_transformed = _detect_and_transform_academic_registro(df)

print(f"\n✓ Columnas transformadas: {df_transformed.columns.tolist()}")
print(f"  Registros: {len(df_transformed)}")

print(f"\n📋 Vista previa de datos transformados:")
print(df_transformed.to_string(index=False))

print("\n✅ ¡Transformación automática funcionando correctamente!")
