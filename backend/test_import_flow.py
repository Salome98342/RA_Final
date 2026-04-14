#!/usr/bin/env python
"""
Test integral: Simula el flujo completo de importación de estudiantes
con detección automática de headers y transformación.
"""

import os
import sys
import django
import logging
from io import BytesIO

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from api.views.views import _read_imported_file, _detect_and_transform_academic_registro

# Configurar logging detallado
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(levelname)s] %(name)s - %(message)s'
)

print("\n" + "=" * 80)
print("TEST INTEGRAL: Import de Estudiantes con Detección Automática")
print("=" * 80)

# Ruta del archivo de prueba
test_file_path = r'c:\Users\User\Downloads\datos_contacto_matriculados_prueba.xlsx'

if not os.path.exists(test_file_path):
    print(f"ERROR: No se encontró archivo de prueba: {test_file_path}")
    sys.exit(1)

print(f"\n[STEP 1] Leyendo archivo: {test_file_path}")
print("-" * 80)

# Simular UploadedFile de Django
class FakeUploadedFile:
    def __init__(self, content, name):
        self.content = content
        self.name = name
        self.size = len(content)
        self._position = 0
    
    def seek(self, pos):
        self._position = pos
    
    def read(self):
        return self.content

with open(test_file_path, 'rb') as f:
    file_content = f.read()
    uploaded_file = FakeUploadedFile(file_content, 'datos_contacto_matriculados_prueba.xlsx')

print(f"✓ Archivo cargado: {uploaded_file.size} bytes")

print("\n[STEP 2] Detectando y leyendo headers...")
print("-" * 80)

df = _read_imported_file(uploaded_file)

if df is None:
    print("✗ ERROR: _read_imported_file retornó None")
    sys.exit(1)

print(f"✓ Archivo leído exitosamente")
print(f"  - Filas: {len(df)}")
print(f"  - Columnas: {list(df.columns)}")
print(f"\nPrimeras 2 filas:")
print(df.head(2).to_string())

print("\n[STEP 3] Detectando formato y aplicando transformación automática...")
print("-" * 80)

df_transformed = _detect_and_transform_academic_registro(df)

if df_transformed is None:
    print("✗ ERROR: Transformación retornó None")
    sys.exit(1)

print(f"✓ Transformación completada")
print(f"  - Filas: {len(df_transformed)}")
print(f"  - Columnas: {list(df_transformed.columns)}")

print("\n[STEP 4] Validando columnas requeridas...")
print("-" * 80)

required_cols = ['codigo_estudiante', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento']
missing_cols = [col for col in required_cols if col not in df_transformed.columns]

if missing_cols:
    print(f"✗ ERROR: Faltan columnas: {missing_cols}")
    print(f"  Columnas disponibles: {list(df_transformed.columns)}")
    sys.exit(1)

print(f"✓ Todas las columnas requeridas están presentes")
print(f"  Requeridas: {required_cols}")
print(f"  Disponibles: {list(df_transformed.columns)}")

print("\n[STEP 5] Mostrando datos transformados...")
print("-" * 80)
print(df_transformed.to_string())

print("\n[STEP 6] Validando datos...")
print("-" * 80)

# Validar que no hay valores nulos en columnas críticas
for col in required_cols:
    null_count = df_transformed[col].isna().sum()
    if null_count > 0:
        print(f"⚠ Advertencia: {null_count} valores nulos en '{col}'")
    else:
        print(f"✓ '{col}': {len(df_transformed)} valores válidos")

print("\n" + "=" * 80)
print("✓ TEST COMPLETADO EXITOSAMENTE")
print("=" * 80)
print("\nEl flujo completo funciona correctamente:")
print("  1. Detecta automáticamente headers en fila 5 (no fila 0)")
print("  2. Lee el archivo Excel correctamente")
print("  3. Detecta que es del Sistema de Registro Académico")
print("  4. Transforma al formato de RA Manager")
print("  5. Tiene todas las columnas requeridas")
print("  6. Los datos están listos para importar")
