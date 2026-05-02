#!/usr/bin/env python
"""
Script para transformar archivo de datos de registro académico al formato de importación de RA Manager.
Toma un Excel/CSV y lo convierte al formato requerido por coordinador_import_estudiantes_view.
"""

import pandas as pd
import sys
import os
from pathlib import Path


def normalize_jornada_value(value):
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    normalized = text.lower()
    if "nocturna" in normalized or "noche" in normalized:
        return "Nocturna"
    if "diurna" in normalized or "dia" in normalized or "mañana" in normalized or "manana" in normalized:
        return "Diurna"
    return None

def transform_estudiantes_data(input_file, output_file=None):
    """
    Transforma datos del sistema de registro académico al formato de RA Manager.
    
    Args:
        input_file: Ruta del archivo Excel o CSV de entrada
        output_file: Ruta del archivo CSV de salida (opcional, genera automático si no se proporciona)
    
    Returns:
        DataFrame transformado, ruta del archivo generado
    """
    
    # Detectar automáticamente el header (por si fila del header varía)
    print(f"📖 Leyendo archivo: {input_file}")
    
    # Intentar leer con distintos headers
    df = None
    for header_row in [4, 5, 0]:
        try:
            if input_file.lower().endswith(('.xlsx', '.xls')):
                df = pd.read_excel(input_file, header=header_row)
            else:
                df = pd.read_csv(input_file, header=header_row)
            
            # Validar que tenga las columnas esperadas
            required_cols = ['Codigo', 'Nombres', 'Apellidos', 'Email', 'Documento Identidad']
            if all(col in df.columns for col in required_cols):
                print(f"✓ Headers detectados correctamente (fila {header_row})")
                break
            df = None
        except Exception as e:
            continue
    
    if df is None:
        print("❌ No se pudieron detectar los headers correctamente")
        print("Columnas esperadas: Codigo, Nombres, Apellidos, Email, Documento Identidad")
        return None, None
    
    print(f"📊 Datos cargados: {len(df)} registros")
    print(f"📋 Columnas disponibles: {df.columns.tolist()}")
    
    # Normalizar nombres de columnas (por si hay espacios extra)
    df.columns = df.columns.str.strip()
    
    # Crear DataFrame transformado
    transformed = pd.DataFrame()
    
    # Mapeo directo
    transformed['codigo_estudiante'] = df['Codigo'].astype(str).str.strip()
    transformed['nombre'] = df['Nombres'].astype(str).str.strip()
    transformed['apellido'] = df['Apellidos'].astype(str).str.strip()
    transformed['correo'] = df['Email'].astype(str).str.strip().str.lower()
    
    # Separar "Documento Identidad" (formato: "CC 1061234567")
    doc_separado = df['Documento Identidad'].astype(str).str.split(r'\s+', n=1, expand=True)
    transformed['tipo_documento'] = doc_separado[0].str.strip() if 0 in doc_separado.columns else ""
    transformed['num_documento'] = doc_separado[1].str.strip() if 1 in doc_separado.columns else ""
    
    if 'Jornada' in df.columns:
        transformed['jornada'] = df['Jornada'].apply(normalize_jornada_value)
    
    # Validaciones
    print("\n🔍 Validando datos...")
    errors = []
    
    for idx, row in transformed.iterrows():
        row_num = idx + 2
        if pd.isna(row['codigo_estudiante']) or row['codigo_estudiante'] == '':
            errors.append(f"Fila {row_num}: Código de estudiante vacío")
        if pd.isna(row['nombre']) or row['nombre'] == '':
            errors.append(f"Fila {row_num}: Nombre vacío")
        if pd.isna(row['apellido']) or row['apellido'] == '':
            errors.append(f"Fila {row_num}: Apellido vacío")
        if pd.isna(row['correo']) or row['correo'] == '':
            errors.append(f"Fila {row_num}: Email vacío")
        if pd.isna(row['tipo_documento']) or row['tipo_documento'] == '':
            errors.append(f"Fila {row_num}: Tipo de documento vacío")
        if pd.isna(row['num_documento']) or row['num_documento'] == '':
            errors.append(f"Fila {row_num}: Número de documento vacío")
    
    if errors:
        print(f"\n⚠️  Se encontraron {len(errors)} errores de validación:")
        for error in errors[:10]:  # Mostrar primeros 10
            print(f"  • {error}")
        if len(errors) > 10:
            print(f"  ... y {len(errors) - 10} más")
    else:
        print("✓ Todos los datos son válidos")
    
    # Generar archivo de salida
    if output_file is None:
        base_name = Path(input_file).stem
        output_file = f"{base_name}_para_importar.csv"
    
    # Exportar a CSV con encoding UTF-8 (sin BOM)
    transformed.to_csv(output_file, index=False, encoding='utf-8')
    print(f"\n✅ Archivo generado: {output_file}")
    print(f"   Registros listos para importar: {len(transformed)}")
    
    # Mostrar preview
    print("\n📋 Preview de los datos transformados:")
    print(transformed.head(3).to_string(index=False))
    
    return transformed, output_file

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python transform_estudiantes.py <archivo_entrada> [archivo_salida]")
        print("\nEjemplo:")
        print("  python transform_estudiantes.py datos.xlsx")
        print("  python transform_estudiantes.py datos.xlsx estudiantes_importar.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(input_file):
        print(f"❌ El archivo no existe: {input_file}")
        sys.exit(1)
    
    df_result, output_path = transform_estudiantes_data(input_file, output_file)
    
    if df_result is not None:
        print(f"\n✨ Ya puedes importar '{output_path}' desde el panel del coordinador en RA Manager")
    else:
        sys.exit(1)
