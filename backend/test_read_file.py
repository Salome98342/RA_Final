#!/usr/bin/env python
"""
Test para validar que _read_imported_file detecta correctamente los headers en archivos Excel
con metadata en las primeras filas.
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

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(name)s - %(message)s'
)

print("=" * 80)
print("TEST: Detección automática de headers en archivos Excel")
print("=" * 80)

# Ruta del archivo de prueba
test_file_path = r'c:\Users\User\Downloads\datos_contacto_matriculados_prueba.xlsx'

if not os.path.exists(test_file_path):
    print(f"ERROR: No se encontró archivo de prueba: {test_file_path}")
    sys.exit(1)

print(f"\n[1] Abriendo archivo: {test_file_path}")
with open(test_file_path, 'rb') as f:
    # Crear un objeto similar a UploadedFile para testing
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
    
    file_content = f.read()
    uploaded_file = FakeUploadedFile(file_content, 'datos_contacto_matriculados_prueba.xlsx')

print(f"    Tamaño del archivo: {uploaded_file.size} bytes")

print("\n[2] Leyendo archivo con _read_imported_file()...")
df = _read_imported_file(uploaded_file)

if df is None:
    print("ERROR: _read_imported_file retornó None")
    sys.exit(1)

print(f"    Filas leidas: {len(df)}")
print(f"    Columnas detectadas: {list(df.columns)}")

print("\n[3] Primeras 2 filas del DataFrame leido:")
print(df.head(2).to_string())

print("\n[4] Detectando marcadores (codigo, nombre, apellido, email, documento)...")
markers = ['codigo', 'nombre', 'apellido', 'email', 'documento']
found_markers = []
for marker in markers:
    for col in df.columns:
        if marker in col.lower():
            found_markers.append(marker)
            print(f"    ✓ '{marker}' encontrado en columna '{col}'")
            break

if len(found_markers) == len(markers):
    print(f"\n✓ Todos los marcadores fueron detectados ({len(found_markers)}/{len(markers)})")
else:
    print(f"\nERROR: No se detectaron todos los marcadores ({len(found_markers)}/{len(markers)})")
    print(f"        Marcadores encontrados: {found_markers}")
    sys.exit(1)

print("\n[5] Aplicando transformación automática...")
df_transformed = _detect_and_transform_academic_registro(df)

if df_transformed is None:
    print("ERROR: La transformación retornó None")
    sys.exit(1)

print(f"    Registros transformados: {len(df_transformed)}")
print(f"    Columnas finales: {list(df_transformed.columns)}")

print("\n[6] Resultado de la transformación:")
print(df_transformed.to_string())

print("\n" + "=" * 80)
print("✓ TEST COMPLETADO EXITOSAMENTE")
print("=" * 80)
print("\nLa función _read_imported_file ahora detecta correctamente los headers")
print("incluso cuando están en filas que no sean la primera.")
