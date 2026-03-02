"""
API Views - RA Manager

Estructura modular de vistas:
- utils.py: Funciones auxiliares compartidas
- auth.py: Autenticación y recuperación de contraseña (TODO)
- coordinador.py: Vistas de coordinador (TODO)
- docente.py: Vistas de docente (TODO)
- estudiante.py: Vistas de estudiante (TODO)
- catalogs.py: ViewSets de catálogos (TODO)
- profile.py: Perfil y configuración de usuario (TODO)
- resultados_aprendizaje.py: Gestión de RAs (TODO)
- actividades.py: Actividades y notas (TODO)

Por ahora, todas las vistas siguen en views.py (legacy).
"""

# Importar funciones auxiliares para uso externo
from .utils import (
    _add_notification,
    _normalize_login_payload,
    _serialize_user,
    _bearer_token,
    _send_welcome_email,
    _read_imported_file,
    _find_user_by_credentials,
    _require_coordinador,
    TOKEN_MAX_AGE
)

# Mantener compatibilidad con imports existentes
from .views import *

__all__ = [
    # Utilidades
    '_add_notification',
    '_normalize_login_payload',
    '_serialize_user',
    '_bearer_token',
    '_send_welcome_email',
    '_read_imported_file',
    '_find_user_by_credentials',
    '_require_coordinador',
    'TOKEN_MAX_AGE',
]
