#!/usr/bin/env python
"""Script para arreglar la secuencia de tipo_documento.id_tipo_documento"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

def fix_tipo_documento_sequence():
    """Resetea la secuencia de tipo_documento"""
    try:
        with connection.cursor() as cursor:
            # Resetear la secuencia
            cursor.execute("""
                SELECT setval('tipo_documento_id_tipo_documento_seq', 
                    (SELECT MAX(id_tipo_documento) FROM tipo_documento) + 1)
            """)
        print("✓ Secuencia de tipo_documento reseteada correctamente")
        return True
    except Exception as e:
        print(f"✗ Error al resetear la secuencia: {e}")
        return False

if __name__ == "__main__":
    fix_tipo_documento_sequence()
