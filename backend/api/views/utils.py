"""
Funciones auxiliares compartidas entre las vistas de la API.
"""
from django.core.mail import send_mail
from django.conf import settings
from django.core import signing
import logging
import pandas as pd
import unicodedata
import io

from ..models.models import Docente, Estudiante, Coordinador, Notificacion

TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 días
logger = logging.getLogger("api")


def _normalize_text(text):
    """
    Normaliza texto para búsquedas:
    - Minúsculas
    - Sin espacios extremos
    - Sin tildes/diacríticos
    """
    if not text:
        return ""
    text = str(text).lower().strip()
    # Eliminar diacríticos (á -> a, ñ -> n, etc)
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')


def _add_notification(id_estudiante: int, kind: str, text: str, link: str = None):
    """Crear notificación persistente en BD para un estudiante"""
    try:
        estudiante = Estudiante.objects.get(id_estudiante=id_estudiante)
        Notificacion.objects.create(
            estudiante=estudiante,
            tipo=kind,
            texto=text,
            enlace=link
        )
        logger.debug(f"Notificación creada para estudiante {id_estudiante}: {text}")
    except Estudiante.DoesNotExist:
        logger.error(f"No se pudo crear notificación: Estudiante {id_estudiante} no existe")
    except Exception as e:
        logger.error(f"Error al crear notificación: {e}")


def _normalize_login_payload(data: dict):
    """Normaliza los datos de login desde diferentes formatos de payload"""
    email = data.get("email") or data.get("correo")
    codigo = data.get("code") or data.get("codigo") or data.get("codigo_docente") or data.get("codigo_estudiante")
    password = data.get("password") or data.get("contrasena") or data.get("contrasenia")
    rol = (data.get("rol") or data.get("role") or "").lower()
    return email, codigo, password, rol


def _serialize_user(u, rol: str):
    """Serializa un usuario (docente/estudiante/coordinador) a diccionario"""
    return {
        "id": u.pk,
        "rol": rol,
        "nombre": getattr(u, "nombre", None),
        "apellido": getattr(u, "apellido", None),
        "correo": getattr(u, "correo", None),
        "code": getattr(u, "codigo_docente", None) or getattr(u, "codigo_estudiante", None) or getattr(u, "codigo_coordinador", None),
    }


def _bearer_token(request):
    """Extrae el token Bearer del header Authorization"""
    auth = request.headers.get("Authorization", "")
    return auth.split(" ", 1)[1] if auth.startswith("Bearer ") and " " in auth else None


def _send_welcome_email(estudiante, password_provisional):
    """
    Envía correo de bienvenida a un estudiante recién creado.
    
    Args:
        estudiante: Objeto Estudiante
        password_provisional: Contraseña en texto plano (sin hashear)
    """
    try:
        subject = "Bienvenido a RA Manager"
        message = f"""
¡Bienvenido/a a RA Manager!

Hola {estudiante.nombre} {estudiante.apellido},

Tu cuenta ha sido creada exitosamente en el sistema RA Manager.

Tus credenciales de acceso son:
- Código de estudiante: {estudiante.codigo_estudiante}
- Correo: {estudiante.correo}
- Contraseña provisional: {password_provisional}

IMPORTANTE: Por tu seguridad, debes cambiar tu contraseña provisional en el primer inicio de sesión.

Para acceder al sistema:
1. Ingresa a la plataforma RA Manager
2. Usa tus credenciales para iniciar sesión
3. Cambia tu contraseña en tu perfil

Si tienes alguna duda, contacta al coordinador del programa.

Saludos,
Equipo RA Manager
        """.strip()
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[estudiante.correo],
            fail_silently=True,
        )
        logger.info(f"Correo de bienvenida enviado a {estudiante.correo}")
    except Exception as e:
        logger.error(f"Error enviando correo de bienvenida a {estudiante.correo}: {str(e)}")


def _read_imported_file(file_obj):
    """
    Lee un archivo CSV o Excel y retorna un DataFrame de pandas.
    Soporta múltiples formatos: .csv, .xlsx, .xls
    
    Args:
        file_obj: Archivo subido (Django UploadedFile)
    
    Returns:
        pandas.DataFrame o None si falla
    """
    filename = getattr(file_obj, 'name', '').lower()
    logger.info(f"Intentando leer archivo: {filename}, tamaño: {getattr(file_obj, 'size', 'desconocido')} bytes")
    
    # Leer el contenido a memoria para evitar problemas con seek en FileWrapper
    try:
        file_obj.seek(0)
        file_bytes = file_obj.read()
    except Exception as e:
        logger.error(f"Error leyendo bytes del archivo: {e}")
        return None
    
    try:
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            # Usar BytesIO para Excel
            with io.BytesIO(file_bytes) as bio:
                df = pd.read_excel(bio, engine='openpyxl' if filename.endswith('.xlsx') else 'xlrd')
                df.columns = df.columns.str.strip().str.lower()
                logger.info(f"Archivo Excel leido exitosamente: {len(df)} filas")
                logger.info(f"Columnas detectadas (normalizadas): {list(df.columns)}")
                return df
        else:
            encodings_to_try = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            delimiters_to_try = [',', ';', '\t', '|']
            
            for encoding in encodings_to_try:
                for delimiter in delimiters_to_try:
                    try:
                        # Usar BytesIO para cada intento para asegurar stream limpio
                        with io.BytesIO(file_bytes) as bio:
                            # Leer CSV con configuración tolerante a errores
                            # engine='python' es más flexible pero más lento.
                            # on_bad_lines='skip' ignora líneas con diferente número de campos
                            df = pd.read_csv(
                                bio, 
                                encoding=encoding,
                                sep=delimiter,
                                on_bad_lines='skip',
                                engine='python',
                                skipinitialspace=True,
                                quotechar='"'
                            )
                            
                            # Limpieza básica de columnas vacías
                            df = df.dropna(how='all', axis=1) # Eliminar columnas totalmente vacías
                            df = df.dropna(how='all', axis=0) # Eliminar filas totalmente vacías
                            
                            cols_count = len(df.columns)
                            if cols_count >= 1 and len(df) > 0:
                                # Normalizar nombres de columnas: minúsculas y sin espacios
                                df.columns = df.columns.str.strip().str.lower()
                                
                                # Si solo detecta 1 columna y usamos un delimitador común, probablemente falló
                                if cols_count == 1 and delimiter in [',', ';', '\t']:
                                    logger.warning(f"[CSV WARNING] Lectura con {encoding}|'{delimiter}' -> 1 columna. Probablemente incorrecto.")
                                    # No retornamos, seguimos probando
                                    continue
                                
                                logger.info(f"Archivo CSV leido exitosamente con encoding={encoding}, delimitador='{delimiter}': {len(df)} filas")
                                logger.info(f"Columnas detectadas (normalizadas): {list(df.columns)}")
                                return df
                    except (UnicodeDecodeError, Exception) as e:
                        # logger.warning(f"[CSV DEBUG] Falló lectura con {encoding}|{delimiter}: {e}")
                        continue
            
            logger.error("No se pudo leer el archivo CSV con ninguna codificación/delimitador soportado")
            return None
            
    except Exception as e:
        logger.error(f"Error leyendo archivo: {type(e).__name__} - {str(e)}")
        return None


def _find_user_by_credentials(email=None, codigo=None, rol=None):
    """
    Helper para buscar usuario por email/código en uno o varios roles.
    
    Returns: (user, user_rol, user_email) o (None, None, None)
    """
    roles_a_intentar = [rol] if rol else ["docente", "estudiante", "coordinador"]
    
    for r in roles_a_intentar:
        if r == "docente":
            u = (Docente.objects.filter(codigo_docente=codigo).first()
                 or Docente.objects.filter(correo=email).first()) if (codigo or email) else None
            if u:
                return u, "docente", u.correo
        elif r == "estudiante":
            u = (Estudiante.objects.filter(codigo_estudiante=codigo).first()
                 or Estudiante.objects.filter(correo=email).first()) if (codigo or email) else None
            if u:
                return u, "estudiante", u.correo
        elif r == "coordinador":
            u = (Coordinador.objects.filter(codigo_coordinador=codigo).first()
                 or Coordinador.objects.filter(correo=email).first()) if (codigo or email) else None
            if u:
                return u, "coordinador", u.correo
    return None, None, None


def _require_coordinador(request):
    """
    Valida que el request tenga un token válido de coordinador.
    
    Returns: (coordinador, error_response)
    Si es válido: (coordinador_obj, None)
    Si no: (None, Response con error)
    """
    from rest_framework.response import Response
    from rest_framework import status
    from django.core import signing
    
    token = _bearer_token(request)
    if not token:
        return None, Response({"detail": "Token requerido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        data = signing.loads(token, max_age=TOKEN_MAX_AGE)
        if data.get("rol") != "coordinador":
            return None, Response({"detail": "Requiere rol coordinador"}, status=status.HTTP_403_FORBIDDEN)
        
        coord_id = data.get("id")
        coord = Coordinador.objects.filter(id_coordinador=coord_id).first()
        if not coord:
            return None, Response({"detail": "Coordinador no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
        return coord, None
    except signing.SignatureExpired:
        return None, Response({"detail": "Token expirado"}, status=status.HTTP_401_UNAUTHORIZED)
    except signing.BadSignature:
        return None, Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        logger.error(f"Error validando token coordinador: {e}")
        return None, Response({"detail": "Error de autenticación"}, status=status.HTTP_401_UNAUTHORIZED)
