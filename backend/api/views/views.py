"""
DEPRECADO: Este archivo será dividido en módulos.
Por ahora se mantiene para compatibilidad, pero se recomienda importar desde:
- api.views.auth
- api.views.coordinador
- api.views.docente
- api.views.estudiante
- api.views.catalogs
- api.views.profile
etc.

TODO: Eliminar este archivo una vez migradas todas las importaciones.
"""

# Mantener imports actuales por compatibilidad
from .utils import (
    _add_notification, _normalize_login_payload, _serialize_user, 
    _bearer_token, _send_welcome_email, _read_imported_file,
    _find_user_by_credentials, _require_coordinador, _normalize_text, TOKEN_MAX_AGE
)

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotFound
from django.core import signing
from django.contrib.auth.hashers import check_password, make_password
from django.conf import settings
from django_ratelimit.decorators import ratelimit
import uuid
from datetime import datetime as dt_module
import os
import io
import csv
import re
import secrets
import threading
import pandas as pd
from django.core.files.storage import default_storage
import logging
from django.utils.text import get_valid_filename
from django.utils import timezone
from django.db.models import Avg, Sum, Q
from django.db import transaction, DatabaseError, IntegrityError
from django.http import FileResponse
import datetime

from ..models.models import (
    TipoDocumento, TipoActividad, Programa, Docente, Estudiante, Asignatura,
    ResultadoDeAprendizaje, Matricula, IndicadoresDeLogro, Actividad, RaActividad, NotasActividad, PeriodoAcademico, Recurso, RaActividadIndicador,
    Coordinador, ImportAudit, Anuncio, Notificacion,
)
from ..serializers.serializers import (
    TipoDocumentoSerializer, TipoActividadSerializer, ProgramaSerializer,
    DocenteSerializer, EstudianteSerializer, AsignaturaSerializer,
    ResultadoDeAprendizajeSerializer, RecursoSerializer,
    PasswordForgotSerializer, VerifyOTPSerializer, PasswordResetSerializer
)
from ..utils.security import (
    get_client_ip, get_user_agent, check_user_password, generate_secure_otp,
    check_account_lockout, registrar_intento_login, manejar_intento_fallido,
    limpiar_intentos_exitosos, registrar_evento_seguridad, validate_password_strength
)
from ..utils.mailer import send_email_with_logging

TOKEN_MAX_AGE = 60 * 60 * 24 * 7
logger = logging.getLogger("ra_manager.coordinador")

ALLOWED_IMPORT_TEMPLATES = {
    "plantilla_estudiantes.csv",
    "plantilla_matriculados.csv",
    "plantilla_docentes.csv",
    "plantilla_asignaturas_ras.csv",
    "plantilla_asignaturas_ras_il.csv",
    "plantilla_estudiantes.xlsx",
    "plantilla_matriculados.xlsx",
    "plantilla_docentes.xlsx",
    "plantilla_asignaturas_ras.xlsx",
    "plantilla_asignaturas_ras_il.xlsx",
}


def _get_bulk_student_password() -> str:
    """
    Retorna la contraseña provisional para altas masivas de estudiantes.
    Se puede configurar con DEFAULT_BULK_STUDENT_PASSWORD en settings/.env.
    """
    configured = getattr(settings, "DEFAULT_BULK_STUDENT_PASSWORD", "")
    password = str(configured or "").strip()
    if not password:
        # Default generic password for students (legacy: Estudiante123*)
        # User requirement: use 'estudiante123' as generic student password
        password = "estudiante123"
    return password


def _validate_jornada_value(value):
    """Normaliza y valida jornada. Solo admite Diurna o Nocturna."""
    if value is None:
        return None, None

    text = str(value).strip()
    if not text:
        return None, None

    normalized = _normalize_text(text)
    if not normalized:
        return None, None

    if "nocturna" in normalized or "noche" in normalized:
        return "Nocturna", None
    if "diurna" in normalized or "dia" in normalized or "manana" in normalized:
        return "Diurna", None

    return None, "Jornada invalida. Solo se permite Diurna o Nocturna."


def _normalize_jornada_value(value):
    """Compatibilidad: devuelve la jornada canónica o None sin error."""
    jornada, _ = _validate_jornada_value(value)
    return jornada


def _extract_codigo_asignatura_from_filename(filename: str) -> str | None:
    """Extrae codigo_asignatura cuando el archivo termina en patron tipo 801126C."""
    base = os.path.splitext(os.path.basename(str(filename or "").strip()))[0]
    if not base:
        return None

    match = re.search(r"(\d+c)$", base, re.IGNORECASE)
    if not match:
        return None

    return match.group(1).upper()


def _normalize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza nombres de columnas quitando espacios y tildes."""
    df = df.copy()
    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.normalize("NFKD")
        .str.encode("ascii", errors="ignore")
        .str.decode("ascii")
    )
    return df


def _periodo_lookup_keys(value) -> list[str]:
    """Genera claves equivalentes para descripciones de periodo como 2026-I / 2026-1."""
    if value is None:
        return []

    text = str(value).strip().upper()
    if not text:
        return []

    compact = re.sub(r"\s+", "", text)
    compact = compact.replace("_", "-").replace("/", "-")

    keys = {compact}

    roman_to_num = {
        "I": "1",
        "II": "2",
        "III": "3",
        "IV": "4",
    }
    num_to_roman = {v: k for k, v in roman_to_num.items()}

    m = re.match(r"^(\d{4})-?(I{1,3}|IV|[1-4])$", compact)
    if m:
        year, term = m.groups()
        term_num = roman_to_num.get(term, term)
        term_roman = num_to_roman.get(term_num, term)
        keys.update({
            f"{year}-{term_num}",
            f"{year}-{term_roman}",
            f"{year}{term_num}",
            f"{year}{term_roman}",
        })

    return list(keys)


def _build_periodos_lookup(periodos):
    lookup = {}
    for p in periodos:
        for key in _periodo_lookup_keys(getattr(p, "descripcion", "")):
            lookup.setdefault(key, p)
    return lookup


def _is_valid_periodo_description(value) -> bool:
    if value is None:
        return False

    text = str(value).strip().upper()
    if not text:
        return False

    compact = re.sub(r"\s+", "", text)
    compact = compact.replace("_", "-").replace("/", "-")
    return bool(re.match(r"^\d{4}-?(I|II|1|2)$", compact))


def _find_periodo_by_desc(periodos_lookup, periodo_desc):
    for key in _periodo_lookup_keys(periodo_desc):
        if key in periodos_lookup:
            return periodos_lookup[key]
    return None


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
    email = data.get("email") or data.get("correo")
    codigo = data.get("code") or data.get("codigo") or data.get("codigo_docente") or data.get("codigo_estudiante")
    password = data.get("password") or data.get("contrasena") or data.get("contrasenia")
    rol = (data.get("rol") or data.get("role") or "").lower()
    return email, codigo, password, rol

def _serialize_user(u, rol: str):
    return {
        "id": u.pk, "rol": rol,
        "nombre": getattr(u, "nombre", None),
        "apellido": getattr(u, "apellido", None),
        "correo": getattr(u, "correo", None),
        "code": getattr(u, "codigo_docente", None) or getattr(u, "codigo_estudiante", None) or getattr(u, "codigo_coordinador", None),
    }

def _bearer_token(request):
    auth = request.headers.get("Authorization", "")
    return auth.split(" ", 1)[1] if auth.startswith("Bearer ") and " " in auth else None


def _norm_code(value: str) -> str:
    return (value or "").strip().upper()


def _student_program_from_code(estudiante_codigo: str):
    """
    Intenta resolver el programa desde un código de estudiante con sufijo:
    <codigo>-<codigo_programa>.
    """
    code = (estudiante_codigo or "").strip()
    if "-" not in code:
        return None
    suffix = code.rsplit("-", 1)[-1].strip()
    if not suffix:
        return None
    return Programa.objects.filter(codigo_programa=suffix).first()


def _infer_program_for_coordinador(coord: Coordinador):
    """Intenta resolver el programa del coordinador usando varias heurísticas:
    - coincidencia exacta con `codigo_coordinador`
    - tokenización del `codigo_coordinador` (separadores - _ /)
    - búsqueda en la parte local del correo (antes de @)
    - comparación con tokens del nombre/apellido
    - coincidencia parcial con `codigo_programa` o nombre del programa
    """
    import re

    programas = list(Programa.objects.all())
    if not programas:
        return None

    coord_code = _norm_code(getattr(coord, "codigo_coordinador", ""))
    coord_email_local = (getattr(coord, "correo", "") or "").split("@")[0].upper()
    name_tokens = set()
    if getattr(coord, "nombre", None):
        name_tokens.update([t.upper() for t in re.split(r"\s+", coord.nombre.strip()) if t])
    if getattr(coord, "apellido", None):
        name_tokens.update([t.upper() for t in re.split(r"\s+", coord.apellido.strip()) if t])

    # Precompute token set from code and email
    tokens = set(re.split(r"[-_/\s]+", coord_code)) if coord_code else set()
    if coord_email_local:
        tokens.update(re.split(r"[._\-\s]+", coord_email_local))

    # 1) Exact match by program code
    for p in programas:
        if _norm_code(p.codigo_programa) == coord_code and coord_code:
            return p

    # 2) Token match against program code
    if tokens:
        for p in programas:
            p_code = _norm_code(p.codigo_programa)
            if p_code in tokens:
                return p

    # 3) Partial match against program name or code in any token or name parts
    for p in programas:
        p_code = _norm_code(p.codigo_programa)
        p_name = (getattr(p, "nombre", "") or "").upper()
        # If program code appears inside coordinator code/email
        if coord_code and p_code and p_code in coord_code:
            return p
        # If program name token appears in coordinator name/email/tokens
        for nt in re.split(r"\s+", p_name):
            if not nt:
                continue
            if nt in tokens or nt in name_tokens or nt in coord_email_local.upper():
                return p

    # 4) If only one program exists, assume it
    if len(programas) == 1:
        return programas[0]

    return None

def _send_welcome_email(estudiante, password_provisional):
    """
    Envía correo de bienvenida a un estudiante recién creado.
    Args:
        estudiante: Objeto Estudiante
        password_provisional: Contraseña en texto plano (sin hashear)
    """
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

    return send_email_with_logging(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[estudiante.correo],
        logger=logger,
        context="bienvenida_estudiante",
    )


def _send_welcome_email_docente(docente, password_provisional):
    """
    Envía correo de bienvenida a un docente recién creado.
    Args:
        docente: Objeto Docente
        password_provisional: Contraseña en texto plano (sin hashear)
    """
    subject = "Bienvenido/a a RA Manager"
    message = f"""
¡Bienvenido/a a RA Manager!

Hola {docente.nombre} {docente.apellido},

Tu cuenta ha sido creada exitosamente en el sistema RA Manager.

Tus credenciales de acceso son:
- Código de docente: {docente.codigo_docente}
- Correo: {docente.correo}
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

    return send_email_with_logging(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[docente.correo],
        logger=logger,
        context="bienvenida_docente",
    )


def _send_account_deactivated_email(estudiante, coordinador=None, programa=None):
    """
    Notifica al estudiante que su cuenta fue desactivada por coordinación.
    """
    subject = "Cuenta desactivada en RA Manager"
    coord_ref = getattr(coordinador, "codigo_coordinador", "coordinador del programa") if coordinador else "coordinador del programa"
    programa_ref = getattr(programa, "nombre", None) or "tu programa"
    message = f"""
Hola {estudiante.nombre} {estudiante.apellido},

Te informamos que tu cuenta de estudiante en RA Manager ha sido desactivada temporalmente.

Código de estudiante: {estudiante.codigo_estudiante}
Programa: {programa_ref}

Si tienes dudas o consideras que esto es un error, por favor contacta al coordinador del programa ({coord_ref}).

Saludos,
Equipo RA Manager
    """.strip()

    return send_email_with_logging(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[estudiante.correo],
        logger=logger,
        context="desactivacion_cuenta",
    )


def _send_account_reactivated_email(estudiante, coordinador=None, programa=None):
    """
    Notifica al estudiante que su cuenta fue reactivada por coordinación.
    """
    subject = "Cuenta reactivada en RA Manager"
    coord_ref = getattr(coordinador, "codigo_coordinador", "coordinador del programa") if coordinador else "coordinador del programa"
    programa_ref = getattr(programa, "nombre", None) or "tu programa"
    message = f"""
Hola {estudiante.nombre} {estudiante.apellido},

Te informamos que tu cuenta de estudiante en RA Manager ha sido reactivada.

Código de estudiante: {estudiante.codigo_estudiante}
Programa: {programa_ref}

Ya puedes iniciar sesión nuevamente en la plataforma.
Si tienes alguna duda, por favor contacta al coordinador del programa ({coord_ref}).

Saludos,
Equipo RA Manager
    """.strip()

    return send_email_with_logging(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[estudiante.correo],
        logger=logger,
        context="reactivacion_cuenta",
    )


def _send_bulk_welcome_emails_async(passwords_for_emails, max_emails=10):
    """
    Envia correos en segundo plano para no bloquear la respuesta HTTP del import masivo.
    Se controla por setting SEND_WELCOME_EMAILS_ON_IMPORT (default: True).
    """
    if not passwords_for_emails:
        return 0

    if not getattr(settings, "SEND_WELCOME_EMAILS_ON_IMPORT", True):
        logger.info("Envio de correos en import deshabilitado por configuracion (SEND_WELCOME_EMAILS_ON_IMPORT=False)")
        return 0

    total_to_send = min(max_emails, len(passwords_for_emails))

    def _worker():
        sent = 0
        for email_data in passwords_for_emails[:total_to_send]:
            try:
                estudiante = Estudiante.objects.filter(codigo_estudiante=email_data['codigo']).first()
                if not estudiante:
                    logger.warning(f"Estudiante {email_data['codigo']} no encontrado para envio de correo")
                    continue
                if _send_welcome_email(estudiante, email_data['password']):
                    sent += 1
            except Exception as e:
                logger.error(f"Error enviando correo a {email_data.get('correo')}: {str(e)}")

        logger.info(f"Correos de bienvenida enviados en background: {sent}/{total_to_send}")

    threading.Thread(target=_worker, daemon=True, name="import-welcome-emails").start()
    logger.info(f"Envio de correos programado en background: {total_to_send}/{len(passwords_for_emails)}")
    return total_to_send


def _send_bulk_welcome_emails_docente_async(passwords_for_emails, max_emails=10):
    """
    Envia correos de bienvenida a docentes en segundo plano para no bloquear la respuesta HTTP.
    """
    if not passwords_for_emails:
        return 0

    if not getattr(settings, "SEND_WELCOME_EMAILS_ON_IMPORT", True):
        logger.info("Envio de correos en import docentes deshabilitado por configuracion (SEND_WELCOME_EMAILS_ON_IMPORT=False)")
        return 0

    total_to_send = min(max_emails, len(passwords_for_emails))

    def _worker():
        sent = 0
        for email_data in passwords_for_emails[:total_to_send]:
            try:
                docente = Docente.objects.filter(codigo_docente=email_data['codigo']).first()
                if not docente:
                    logger.warning(f"Docente {email_data['codigo']} no encontrado para envio de correo")
                    continue
                if _send_welcome_email_docente(docente, email_data['password']):
                    sent += 1
            except Exception as e:
                logger.error(f"Error enviando correo a {email_data.get('correo')}: {str(e)}")

        logger.info(f"Correos de bienvenida docentes enviados en background: {sent}/{total_to_send}")

    threading.Thread(target=_worker, daemon=True, name="import-welcome-emails-docentes").start()
    logger.info(f"Envio de correos docentes programado en background: {total_to_send}/{len(passwords_for_emails)}")
    return total_to_send


def _send_bulk_enrollment_emails_async(enrollments_for_emails):
    """Envia correos de matricula en segundo plano para no bloquear la respuesta HTTP."""
    if not enrollments_for_emails:
        return 0
    if not getattr(settings, "SEND_WELCOME_EMAILS_ON_IMPORT", True):
        logger.info("Envio de correos de matricula deshabilitado por configuracion (SEND_WELCOME_EMAILS_ON_IMPORT=False)")
        return 0

    def _worker():
        sent = 0
        for item in enrollments_for_emails:
            try:
                estudiante_nombre = item.get("estudiante_nombre") or "Estudiante"
                estudiante_correo = item.get("estudiante_correo")
                if not estudiante_correo:
                    continue

                asignatura_nombre = item.get("asignatura_nombre") or "Asignatura"
                asignatura_codigo = item.get("asignatura_codigo") or "N/A"
                grupo = item.get("grupo") or "N/A"
                periodo = item.get("periodo") or "N/A"
                programa = item.get("programa") or "N/A"
                docente = item.get("docente") or "N/A"

                subject = f"Matrícula confirmada en {asignatura_nombre}"
                message = (
                    f"Hola {estudiante_nombre},\n\n"
                    f"Has sido matriculado en la asignatura {asignatura_nombre}.\n\n"
                    f"Código: {asignatura_codigo}\n"
                    f"Grupo: {grupo}\n"
                    f"Periodo académico: {periodo}\n"
                    f"Programa: {programa}\n"
                    f"Docente: {docente}\n\n"
                    f"Puedes consultar esta asignatura en tu perfil del sistema.\n\n"
                    f"Saludos,\n"
                    f"Sistema de Gestión Académica"
                )

                if send_email_with_logging(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[estudiante_correo],
                    logger=logger,
                    context="matricula_masiva",
                ):
                    sent += 1
            except Exception as e:
                logger.error(f"Error enviando correo de matricula a {item.get('estudiante_correo')}: {str(e)}")

        logger.info(f"Correos de matricula enviados en background: {sent}/{len(enrollments_for_emails)}")

    threading.Thread(target=_worker, daemon=True, name="import-enrollment-emails").start()
    logger.info(f"Envio de correos de matricula programado en background: {len(enrollments_for_emails)}")
    return len(enrollments_for_emails)

def _read_imported_file(file_obj):
    """
    Lee un archivo CSV o Excel y retorna un DataFrame de pandas.
    Soporta múltiples formatos: .csv, .xlsx, .xls
    Para Excel, detecta automáticamente la fila de headers.
    
    Args:
        file_obj: Archivo subido (Django UploadedFile)
    
    Returns:
        pandas.DataFrame o None si falla
    """
    filename = getattr(file_obj, 'name', '').lower()
    logger.info(f"[READ_FILE] Intentando leer archivo: {filename}, tamaño: {getattr(file_obj, 'size', 'desconocido')} bytes")
    
    # Leer bytes una vez y reutilizar BytesIO evita problemas de stream con UploadedFile.
    try:
        file_obj.seek(0)
        file_bytes = file_obj.read()
    except Exception as e:
        logger.error(f"[READ_FILE] Error leyendo bytes del archivo: {e}")
        return None

    try:
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            with io.BytesIO(file_bytes) as bio:
                # Primero leer sin especificar header para detectar estructura
                df_raw = pd.read_excel(bio, engine='openpyxl' if filename.endswith('.xlsx') else 'xlrd', header=None)
                logger.info(f"[READ_FILE] Excel leido raw (sin header): {len(df_raw)} filas, {len(df_raw.columns)} columnas")
                logger.debug(f"[READ_FILE] Primeras 3 filas raw:\n{df_raw.head(3)}")
                
                # Detectar en qué fila están los headers reales
                # Buscar si en alguna fila hay palabras clave como "codigo", "nombre", "email", etc.
                header_row = None
                keywords = ['codigo', 'nombre', 'apellido', 'email', 'correo', 'documento', 'programa', 'calif', 'matricula', 'periodo', 'jornada']
                
                for idx, row in df_raw.iterrows():
                    row_str = _normalize_text(' '.join([str(v) for v in row]))
                    matches = sum(1 for kw in keywords if kw in row_str)
                    if matches >= 3:  # Si encuentra al menos 3 palabras clave
                        header_row = idx
                        logger.info(f"[READ_FILE] Headers detectados en fila {idx} (contiene {matches} palabras clave)")
                        logger.debug(f"[READ_FILE] Contenido fila {idx}: {row.tolist()}")
                        break
                
                # Si no encontró headers con palabras clave, asumir fila 0
                if header_row is None:
                    header_row = 0
                    logger.warning(f"[READ_FILE] No se detectó row de headers, usando fila 0 por defecto")
                
                # Releer el Excel con el header correctamente identificado
                with io.BytesIO(file_bytes) as bio:
                    df = pd.read_excel(bio, 
                                      engine='openpyxl' if filename.endswith('.xlsx') else 'xlrd',
                                      header=header_row,
                                      dtype=str)  # Leer todo como string para ser flexible
                    
                    # Quitar filas/columnas completamente vacías (igual que en CSV)
                    df = df.dropna(how='all', axis=1)
                    df = df.dropna(how='all', axis=0)
                    
                    # Quitar filas donde todos los valores sean vacíos o solo espacios
                    # Esto elimina las filas formateadas pero sin contenido en Excel
                    mask = df.fillna('').astype(str).apply(lambda row: any(cell.strip() for cell in row), axis=1)
                    df = df[mask]
                    
                    df = _normalize_dataframe_columns(df)
                    logger.info(f"[READ_FILE] Excel leido exitosamente: {len(df)} filas de datos")
                    logger.info(f"[READ_FILE] Columnas detectadas (normalizadas): {list(df.columns)}")
                    logger.debug(f"[READ_FILE] Primeras 2 filas:\n{df.head(2)}")
                    return df
        else:
            # CSV
            encodings_to_try = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            delimiters_to_try = [',', ';', '\t', '|']

            for encoding in encodings_to_try:
                for delimiter in delimiters_to_try:
                    try:
                        with io.BytesIO(file_bytes) as bio:
                            df = pd.read_csv(
                                bio,
                                encoding=encoding,
                                sep=delimiter,
                                on_bad_lines='skip',
                                engine='python',
                                skipinitialspace=True,
                                quotechar='"',
                                dtype=str
                            )

                            # Quitar filas/columnas completamente vacías para validar estructura real.
                            df = df.dropna(how='all', axis=1)
                            df = df.dropna(how='all', axis=0)
                            
                            # Quitar filas donde todos los valores sean vacíos o solo espacios
                            mask = df.fillna('').astype(str).apply(lambda row: any(cell.strip() for cell in row), axis=1)
                            df = df[mask]

                            cols_count = len(df.columns)
                            if cols_count >= 1 and len(df) > 0:
                                df = _normalize_dataframe_columns(df)

                                if cols_count == 1 and delimiter in [',', ';', '\t']:
                                    logger.warning(f"[READ_FILE] [CSV WARNING] Lectura con {encoding}|'{delimiter}' -> 1 columna. Probablemente incorrecto.")
                                    continue

                                logger.info(f"[READ_FILE] CSV leido exitosamente con encoding={encoding}, delimitador='{delimiter}': {len(df)} filas")
                                logger.info(f"[READ_FILE] Columnas detectadas (normalizadas): {list(df.columns)}")
                                logger.debug(f"[READ_FILE] Primeras 2 filas:\n{df.head(2)}")
                                return df
                    except (UnicodeDecodeError, Exception):
                        continue

            logger.error("[READ_FILE] No se pudo leer el archivo CSV con ninguna codificación/delimitador soportado")
            return None

    except Exception as e:
        logger.error(f"[READ_FILE] Error leyendo archivo: {type(e).__name__} - {str(e)}", exc_info=True)
        return None

def _detect_and_transform_academic_registro(df):
    """
    Detecta automáticamente si un DataFrame viene del Sistema de Registro Académico
    y lo transforma al formato requerido por RA Manager.
    
    Formato ENTRADA (Sistema Registro Académico):
    - Codigo, Nombres, Apellidos, Email, Documento Identidad, Programa Academico
    
    Formato SALIDA (RA Manager):
    - codigo_estudiante, nombre, apellido, correo, tipo_documento, num_documento, jornada
    
    Si no detecta el formato de origen, devuelve el DataFrame sin cambios.
    
    Args:
        df: DataFrame a transformar
    
    Returns:
        DataFrame transformado o sin cambios si no es del registro académico
    """
    try:
        # Obtener columnas normalizadas para búsqueda
        cols_normalized = df.columns.str.lower().str.strip().tolist()
        cols_original = df.columns.tolist()
        
        logger.info(f"[TRANSFORM] Columnas recibidas (originales): {cols_original}")
        logger.info(f"[TRANSFORM] Columnas normalizadas: {cols_normalized}")

        manager_required_cols = {'codigo_estudiante', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento'}
        if manager_required_cols.issubset(set(cols_normalized)):
            logger.info("[TRANSFORM] El archivo ya viene en formato RA Manager; no se aplica transformación")
            return df
        
        # Detectar si es archivo del Sistema de Registro Académico
        # Buscar si TODAS estas palabras claves están en alguna columna
        academic_markers = ['codigo', 'nombre', 'apellido', 'email', 'documento']
        
        found_markers = {}
        for marker in academic_markers:
            for idx, col_norm in enumerate(cols_normalized):
                if marker in col_norm:
                    found_markers[marker] = cols_original[idx]
                    logger.info(f"[TRANSFORM] Marker '{marker}' encontrado en columna '{cols_original[idx]}'")
                    break
        
        logger.info(f"[TRANSFORM] Marcadores encontrados: {list(found_markers.keys())} / {academic_markers}")
        
        # Ser menos estricto: si encuentra al menos 4 de 5 marcadores, es probable que sea del Registro Académico
        if len(found_markers) < 4:
            logger.warning(f"[TRANSFORM] Archivo NO parece ser del Sistema de Registro Académico. Solo encontró {len(found_markers)} de {len(academic_markers)} marcadores")
            logger.info(f"[TRANSFORM] Marcadores encontrados: {list(found_markers.keys())}")
            logger.info(f"[TRANSFORM] Marcadores FALTANTES: {[m for m in academic_markers if m not in found_markers]}")
            logger.info("[TRANSFORM] Procesando como CSV/Excel estándar de RA Manager")
            return df
        
        logger.info(f"[TRANSFORM] Detectado formato Sistema de Registro Académico. Transformando...")
        
        # Mapeo inteligente: encontrar columnas por patrón y guardar nombre ORIGINAL
        def find_col_original(cols_orig, cols_norm, *patterns):
            """Busca columna por patrón en versión normalizada, devuelve nombre ORIGINAL"""
            for idx, col_norm in enumerate(cols_norm):
                for pattern in patterns:
                    if pattern.lower() in col_norm.lower():
                        logger.debug(f"[TRANSFORM] Patrón '{pattern}' encontrado en columna #{idx}: '{cols_orig[idx]}'")
                        return cols_orig[idx]
            logger.warning(f"[TRANSFORM] No se encontró columna con patrones: {patterns}")
            return None
        
        # Buscar columnas
        codigo_col = find_col_original(cols_original, cols_normalized, 'codigo')
        full_name_col = find_col_original(
            cols_original,
            cols_normalized,
            'apellidos y nombres',
            'apellido y nombre',
            'apellidos y nombre',
            'apellidos nombres',
        )
        nombres_col = find_col_original(cols_original, cols_normalized, 'nombres', 'nombre')
        apellidos_col = find_col_original(cols_original, cols_normalized, 'apellidos', 'apellido')
        email_col = find_col_original(cols_original, cols_normalized, 'email', 'correo')
        docidentidad_col = find_col_original(cols_original, cols_normalized, 'documento identidad', 'documento')
        programa_col = find_col_original(cols_original, cols_normalized, 'programa academico', 'programa')
        jornada_col = find_col_original(cols_original, cols_normalized, 'jornada', 'turno', 'shift')

        # Si existe columna combinada de nombres, priorizarla SIEMPRE.
        if full_name_col:
            nombres_col = full_name_col
            apellidos_col = full_name_col

        # Evitar columnas de programa como fuente de nombre/apellido de estudiante.
        if nombres_col and 'programa' in _normalize_text(nombres_col):
            fallback_nombres = find_col_original(cols_original, cols_normalized, 'nombres')
            nombres_col = full_name_col or fallback_nombres or nombres_col
        if apellidos_col and 'programa' in _normalize_text(apellidos_col):
            fallback_apellidos = find_col_original(cols_original, cols_normalized, 'apellidos')
            apellidos_col = full_name_col or fallback_apellidos or apellidos_col
        
        logger.info(f"[TRANSFORM] Columnas mapeadas:")
        logger.info(f"  - codigo_col: {codigo_col}")
        logger.info(f"  - full_name_col: {full_name_col}")
        logger.info(f"  - nombres_col: {nombres_col}")
        logger.info(f"  - apellidos_col: {apellidos_col}")
        logger.info(f"  - email_col: {email_col}")
        logger.info(f"  - docidentidad_col: {docidentidad_col}")
        logger.info(f"  - programa_col: {programa_col}")
        logger.info(f"  - jornada_col: {jornada_col}")
        
        # Validar que se encontraron las columnas CRÍTICAS
        critical_cols = [codigo_col, nombres_col, apellidos_col, email_col, docidentidad_col]
        if not all(critical_cols):
            missing = []
            if not codigo_col: missing.append("codigo")
            if not nombres_col: missing.append("nombre")
            if not apellidos_col: missing.append("apellido")
            if not email_col: missing.append("email")
            if not docidentidad_col: missing.append("documento")
            error_msg = f"[TRANSFORM] Error: Faltan columnas críticas para transformación: {', '.join(missing)}"
            logger.error(error_msg)
            logger.warning("[TRANSFORM] Retornando DF sin transformar (intentará procesar como estándar)")
            return df
        
        # Crear copia para no modificar el original
        transformed = pd.DataFrame()

        def _split_apellidos_nombres_cell(value):
            raw = str(value or "").strip()
            if not raw or raw.lower() in {"nan", "none"}:
                return "", ""

            cleaned = re.sub(r"\s+", " ", raw)
            if "," in cleaned:
                left, right = cleaned.split(",", 1)
                return left.strip(), right.strip()

            parts = cleaned.split(" ")
            if len(parts) >= 4:
                return " ".join(parts[:2]), " ".join(parts[2:])
            if len(parts) == 3:
                return " ".join(parts[:2]), parts[2]
            if len(parts) == 2:
                return parts[0], parts[1]
            return "", parts[0]
        
        logger.info(f"[TRANSFORM] Iniciando transformación de {len(df)} registros...")
        
        try:
            # Transformar usando nombres ORIGINALES
            transformed['codigo_estudiante'] = df[codigo_col].astype(str).str.strip()
            logger.debug(f"[TRANSFORM] OK codigo_estudiante creado")
            
            # Caso común en Registro Académico: una sola columna "Apellidos y Nombres".
            if nombres_col == apellidos_col:
                split_series = df[nombres_col].apply(_split_apellidos_nombres_cell)
                split_df = pd.DataFrame(
                    split_series.tolist(),
                    columns=['_apellido', '_nombre'],
                    index=df.index,
                )
                transformed['apellido'] = split_df['_apellido'].astype(str).str.strip()
                transformed['nombre'] = split_df['_nombre'].astype(str).str.strip()
                logger.info(f"[TRANSFORM] Columna combinada detectada ('{nombres_col}'): se separó en apellido/nombre")
            else:
                transformed['nombre'] = df[nombres_col].astype(str).str.strip()
                transformed['apellido'] = df[apellidos_col].astype(str).str.strip()
            logger.debug(f"[TRANSFORM] OK nombre y apellido creados")
            
            transformed['correo'] = df[email_col].astype(str).str.strip().str.lower()
            logger.debug(f"[TRANSFORM] OK correo creado")
            
            # Separar "Documento Identidad" (formato: "CC 1061234567")
            logger.debug(f"[TRANSFORM] Procesando documento desde columna: {docidentidad_col}")
            doc_parts = df[docidentidad_col].astype(str).str.split(r'\s+', n=1, expand=True)
            logger.debug(f"[TRANSFORM] Partes del documento: {doc_parts.columns.tolist()}")
            
            transformed['tipo_documento'] = doc_parts[0].str.strip() if 0 in doc_parts.columns else ""
            transformed['num_documento'] = doc_parts[1].str.strip() if 1 in doc_parts.columns else ""
            logger.debug(f"[TRANSFORM] OK tipo_documento y num_documento creados")
            
            if jornada_col:
                logger.debug(f"[TRANSFORM] Extrayendo jornada desde: {jornada_col}")
                transformed['jornada'] = df[jornada_col].apply(_normalize_jornada_value)
                logger.debug("[TRANSFORM] OK jornada preservada desde el archivo")
            else:
                logger.info("[TRANSFORM] No se encontró columna de jornada; se importará sin asignarla")
            
            logger.info(f"[TRANSFORM] **EXITOSA**: {len(transformed)} registros convertidos")
            logger.info(f"[TRANSFORM] Columnas finales: {transformed.columns.tolist()}")
            logger.info(f"[TRANSFORM] Vista previa de transformación:")
            logger.info(f"{transformed.head(2).to_string()}")
            
            return transformed
            
        except Exception as e:
            logger.error(f"[TRANSFORM] **ERROR** durante transformación de columnas: {type(e).__name__}: {str(e)}", exc_info=True)
            logger.warning("[TRANSFORM] Retornando DF sin transformar (error durante conversión)")
            return df
        
    except Exception as e:
        logger.error(f"[TRANSFORM] **ERROR GENERAL**: {type(e).__name__}: {str(e)}", exc_info=True)
        logger.warning("[TRANSFORM] Retornando DF original sin cambios")
        return df

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

@ratelimit(key='ip', rate='10/m', method='POST', block=True)
@ratelimit(key='user_or_ip', rate='20/h', method='POST', block=True)
@api_view(["POST", "GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def login_view(request):
    """
    Endpoint de login seguro con protección contra fuerza bruta.
    Rate limiting: 10 intentos/minuto por IP, 20 intentos/hora por usuario/IP
    
    - Registra todos los intentos (exitosos y fallidos)
    - Bloquea cuenta tras 3 intentos fallidos
    - Envía alerta por email al bloquear
    - Registra IP, user-agent y timestamp
    """
    data = request.data if request.method == "POST" else request.query_params
    email, codigo, password, rol = _normalize_login_payload(data or {})
    
    # Obtener datos de auditoría
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Validar que se proporcionaron credenciales
    if not (email or codigo):
        return Response({"detail": "Faltan credenciales"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not password:
        return Response({"detail": "La contraseña es requerida"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Identificador del usuario para auditoría
    usuario_identificador = codigo or email
    
    # 1. VERIFICAR SI LA CUENTA ESTÁ BLOQUEADA
    is_locked, reason, remaining_minutes = check_account_lockout(usuario_identificador)
    if is_locked:
        mensaje = f"Cuenta bloqueada. {reason}."
        if remaining_minutes is not None:
            mensaje += f" Intenta nuevamente en {remaining_minutes} minutos."
        
        # Registrar intento en cuenta bloqueada
        registrar_intento_login(
            usuario_codigo=usuario_identificador,
            exito=False,
            ip_address=ip_address,
            user_agent=user_agent,
            usuario_email=email,
            rol_intentado=rol,
            motivo_fallo="Cuenta bloqueada"
        )
        
        return Response({"detail": mensaje}, status=status.HTTP_423_LOCKED)
    
    # 2. BUSCAR USUARIO Y VALIDAR CONTRASEÑA
    user, user_rol, user_email = _find_user_by_credentials(email=email, codigo=codigo, rol=rol)
    
    # Verificar contraseña solo si se encontró el usuario
    if user:
        password_field = {
            "docente": "contrasenia_docente",
            "estudiante": "contrasena_estudiante",
            "coordinador": "contrasenia_coord"
        }.get(user_rol)
        
        if not password_field or not check_user_password(getattr(user, password_field), password):
            user = None  # Contraseña incorrecta

    if user and user_rol == "estudiante" and not getattr(user, "activo", True):
        registrar_intento_login(
            usuario_codigo=usuario_identificador,
            exito=False,
            ip_address=ip_address,
            user_agent=user_agent,
            usuario_email=user_email,
            rol_intentado=user_rol,
            motivo_fallo="Cuenta desactivada por coordinador"
        )
        return Response(
            {"detail": "Tu perfil de estudiante está inactivo. Contacta al coordinador."},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    # 3. MANEJAR RESULTADO
    if not user:
        # LOGIN FALLIDO
        registrar_intento_login(
            usuario_codigo=usuario_identificador,
            exito=False,
            ip_address=ip_address,
            user_agent=user_agent,
            usuario_email=email,
            rol_intentado=rol,
            motivo_fallo="Credenciales inválidas"
        )
        
        # Incrementar contador y posiblemente bloquear
        cuenta_bloqueada, intentos_restantes = manejar_intento_fallido(
            usuario_identificador, 
            ip_address,
            email=user_email or email
        )
        
        if cuenta_bloqueada:
            return Response({
                "detail": "Cuenta bloqueada por seguridad. Hemos enviado un email con instrucciones. Se desbloqueará automáticamente en 30 minutos."
            }, status=status.HTTP_423_LOCKED)
        else:
            mensaje = "Credenciales inválidas"
            if intentos_restantes > 0:
                mensaje += f". Te quedan {intentos_restantes} intentos."
            return Response({"detail": mensaje}, status=status.HTTP_401_UNAUTHORIZED)
    
    # 4. LOGIN EXITOSO
    registrar_intento_login(
        usuario_codigo=usuario_identificador,
        exito=True,
        ip_address=ip_address,
        user_agent=user_agent,
        usuario_email=user_email,
        rol_intentado=user_rol,
        motivo_fallo=None
    )
    
    # Limpiar contadores de intentos fallidos
    limpiar_intentos_exitosos(usuario_identificador)
    
    # Generar token de sesión
    token = signing.dumps({"rol": user_rol, "id": user.pk})
    
    return Response({"token": token, "user": _serialize_user(user, user_rol)})

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def me_view(request):
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        data = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = data.get("rol"), data.get("id")
    if rol == "docente":
        u = Docente.objects.filter(pk=uid).first()
    elif rol == "estudiante":
        u = Estudiante.objects.filter(pk=uid).first()
    elif rol == "coordinador":
        u = Coordinador.objects.filter(pk=uid).first()
    else:
        u = None
    if not u:
        return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)

    if rol == "estudiante" and not getattr(u, "activo", True):
        return Response(
            {"detail": "Tu perfil de estudiante está inactivo. Contacta al coordinador."},
            status=status.HTTP_403_FORBIDDEN,
        )

    user_payload = _serialize_user(u, rol or "estudiante")

    if rol == "coordinador":
        detected = _infer_program_for_coordinador(u)
        user_payload["programa_detectado"] = (
            {
                "id_programa": detected.id_programa,
                "codigo_programa": detected.codigo_programa,
                "nombre": detected.nombre,
            }
            if detected
            else None
        )

    return Response({"user": user_payload})


def _require_coordinador(request):
    """Valida token y rol coordinador; retorna (coord, None) si ok, o (None, Response) si error."""
    token = _bearer_token(request)
    if not token:
        return None, Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        data = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return None, Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    if data.get("rol") != "coordinador":
        return None, Response({"detail": "Requiere rol coordinador"}, status=status.HTTP_403_FORBIDDEN)
    coord = Coordinador.objects.filter(pk=data.get("id")).first()
    if not coord:
        return None, Response({"detail": "Coordinador no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)
    return coord, None


def _require_asignatura_access(request, asig, id_estudiante=None):
    """Valida acceso por rol a una asignatura concreta."""
    token = _bearer_token(request)
    if not token:
        return None, Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return None, Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)

    rol = tok.get("rol")
    uid = tok.get("id")

    if rol == "docente":
        if asig.docente_id != uid:
            return None, Response({"detail": "Acceso denegado a esta asignatura"}, status=status.HTTP_403_FORBIDDEN)
        return {"rol": rol, "id": uid}, None

    if rol == "estudiante":
        if id_estudiante is not None and int(uid) != int(id_estudiante):
            return None, Response({"detail": "No puedes consultar datos de otro estudiante"}, status=status.HTTP_403_FORBIDDEN)
        if not Matricula.objects.filter(asignatura=asig, estudiante_id=uid).exists():
            return None, Response({"detail": "No estás matriculado en esta asignatura"}, status=status.HTTP_403_FORBIDDEN)
        return {"rol": rol, "id": uid}, None

    if rol == "coordinador":
        coord = Coordinador.objects.filter(pk=uid).first()
        if not coord:
            return None, Response({"detail": "Coordinador no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)
        detected_program = _infer_program_for_coordinador(coord)
        if not detected_program:
            return None, Response({"detail": "No se pudo determinar el programa del coordinador"}, status=status.HTTP_403_FORBIDDEN)
        if asig.programa_id != detected_program.id_programa:
            return None, Response({"detail": "Acceso denegado a asignatura fuera de tu programa"}, status=status.HTTP_403_FORBIDDEN)
        return {"rol": rol, "id": uid}, None

    return None, Response({"detail": "Rol no autorizado"}, status=status.HTTP_403_FORBIDDEN)


def _require_docente_for_ra(request, ra_id: int):
    """Valida que el token pertenezca al docente dueño del RA."""
    token = _bearer_token(request)
    if not token:
        return None, None, Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return None, None, Response({"detail": "Token invÃ¡lido"}, status=status.HTTP_401_UNAUTHORIZED)

    if tok.get("rol") != "docente":
        return None, None, Response({"detail": "Requiere rol docente"}, status=status.HTTP_403_FORBIDDEN)

    ra = ResultadoDeAprendizaje.objects.select_related("asignatura").filter(pk=ra_id).first()
    if not ra:
        return None, None, Response({"detail": "RA no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if ra.asignatura.docente_id != tok.get("id"):
        return None, None, Response({"detail": "No tienes permiso sobre este RA"}, status=status.HTTP_403_FORBIDDEN)

    return tok, ra, None


def _require_docente_for_grade(request, id_matricula, id_ra_actividad):
    """Valida que un docente pueda calificar una matrÃ­cula/actividad concreta."""
    token = _bearer_token(request)
    if not token:
        return None, None, None, Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return None, None, None, Response({"detail": "Token invÃ¡lido"}, status=status.HTTP_401_UNAUTHORIZED)

    if tok.get("rol") != "docente":
        return None, None, None, Response({"detail": "Solo docentes pueden registrar calificaciones"}, status=status.HTTP_403_FORBIDDEN)

    matricula = Matricula.objects.select_related("asignatura").filter(pk=id_matricula).first()
    if not matricula:
        return None, None, None, Response({"detail": "MatrÃ­cula no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    rel = RaActividad.objects.select_related("ra__asignatura").filter(pk=id_ra_actividad).first()
    if not rel:
        return None, None, None, Response({"detail": "Actividad de RA no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    if rel.ra.asignatura_id != matricula.asignatura_id:
        return None, None, None, Response({"detail": "La actividad no pertenece a la asignatura de la matrÃ­cula"}, status=status.HTTP_400_BAD_REQUEST)

    if matricula.asignatura.docente_id != tok.get("id"):
        return None, None, None, Response({"detail": "No tienes permiso para calificar esta asignatura"}, status=status.HTTP_403_FORBIDDEN)

    return tok, matricula, rel, None

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_estudiantes_view(request):
    """
    GET: Lista todos los estudiantes (con filtros opcionales por código, nombre, correo)
    POST: Crea un nuevo estudiante individual y envía correo de bienvenida.
    Solo coordinador.
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    
    if request.method == "GET":
        detected_program = _infer_program_for_coordinador(coord)
        if not detected_program:
            return Response({"detail": "No se pudo determinar el programa del coordinador"}, status=status.HTTP_403_FORBIDDEN)

        include_inactive = str(request.query_params.get("include_inactive", "")).strip().lower() in {"1", "true", "yes", "si"}

        # Lista todos los estudiantes activos (sin filtro por programa porque Estudiante no tiene relación directa a Programa)
        # La relación es indirecta a través de Matricula -> Asignatura -> Programa
        # NOTA: Se muestran todos los estudiantes porque:
        # - Los estudiantes nuevos importados aun no tienen matriculas
        # - Cuando se matriculan, se valida que sean del programa del coordinador
        # - La seguridad está asegurada porque solo coordinadores acceden aquí
        logger.info(f"[COORDINADOR] GET estudiantes para coordinador: {coord.codigo_coordinador}, programa deducido: {detected_program.nombre if detected_program else 'N/A'}")
        
        estudiantes = (
            Estudiante.objects
            .select_related('tipo_documento')
            .order_by('apellido', 'nombre')
        )

        if not include_inactive:
            estudiantes = estudiantes.filter(activo=True)
        
        # Filtros opcionales
        search = request.query_params.get('search', '').strip()
        if search:
            estudiantes = estudiantes.filter(
                Q(codigo_estudiante__icontains=search) |
                Q(nombre__icontains=search) |
                Q(apellido__icontains=search) |
                Q(correo__icontains=search) |
                Q(num_documento__icontains=search)
            )
        
        # Serializar
        data = []
        for est in estudiantes:
            data.append({
                "id_estudiante": est.id_estudiante,
                "nombre": est.nombre,
                "apellido": est.apellido,
                "codigo_estudiante": est.codigo_estudiante,
                "correo": est.correo,
                "tipo_documento": est.tipo_documento.descripcion if est.tipo_documento else None,
                "num_documento": est.num_documento,
                "jornada": est.jornada,
                "activo": est.activo,
            })
        
        return Response(data, status=status.HTTP_200_OK)
    
    elif request.method == "POST":
        # Crear estudiante individual
        data = request.data
        
        # Validar campos requeridos
        required = ['codigo_estudiante', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response(
                {"detail": f"Faltan campos requeridos: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        codigo = data['codigo_estudiante'].strip()
        nombre = data['nombre'].strip()
        apellido = data['apellido'].strip()
        correo = data['correo'].strip().lower()
        tipo_doc_desc = data['tipo_documento'].strip()
        num_documento = data['num_documento'].strip()
        jornada, jornada_error = _validate_jornada_value(data.get('jornada'))
        if jornada_error:
            return Response({"detail": jornada_error}, status=status.HTTP_400_BAD_REQUEST)

        # Mantener código de estudiante tal como lo ingresa el coordinador
        # (sin forzar sufijo de programa en el código).
        detected_program = _infer_program_for_coordinador(coord)
        
        # Validar unicidad
        if Estudiante.objects.filter(codigo_estudiante=codigo).exists():
            return Response(
                {"detail": f"Ya existe un estudiante con código {codigo}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if Estudiante.objects.filter(correo=correo).exists():
            return Response(
                {"detail": f"Ya existe un estudiante con correo {correo}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if Estudiante.objects.filter(num_documento=num_documento).exists():
            return Response(
                {"detail": f"Ya existe un estudiante con documento {num_documento}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar tipo de documento (tolerante a tildes y alias como CC/TI)
        tipo_doc = None
        tipos_documento_map_desc_norm = {}
        for td in TipoDocumento.objects.all():
            tipos_documento_map_desc_norm[_normalize_text(td.descripcion)] = td

        aliases_norm = {
            "cc": "cedula de ciudadania",
            "c.c": "cedula de ciudadania",
            "c.c.": "cedula de ciudadania",
            "ce": "cedula de extranjeria",
            "c.e": "cedula de extranjeria",
            "c.e.": "cedula de extranjeria",
            "ti": "tarjeta de identidad",
            "t.i": "tarjeta de identidad",
            "t.i.": "tarjeta de identidad",
            "pas": "pasaporte",
            "pasaporte": "pasaporte",
            "rc": "registro civil",
            "nuip": "nuip",
        }

        input_norm = _normalize_text(tipo_doc_desc)
        mapped_norm = aliases_norm.get(input_norm, input_norm)
        tipo_doc = tipos_documento_map_desc_norm.get(mapped_norm)

        if not tipo_doc:
            # Fallback por coincidencia parcial para textos equivalentes
            for key_norm, td in tipos_documento_map_desc_norm.items():
                if mapped_norm in key_norm or key_norm in mapped_norm:
                    tipo_doc = td
                    break

        if not tipo_doc:
            return Response(
                {"detail": f"Tipo de documento no válido: {tipo_doc_desc}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Usar la misma contraseña genérica configurada para importación masiva
        password_provisional = _get_bulk_student_password()
        hashed_password = make_password(password_provisional)
        
        # Crear estudiante
        try:
            estudiante = Estudiante.objects.create(
                nombre=nombre,
                apellido=apellido,
                codigo_estudiante=codigo,
                contrasena_estudiante=hashed_password,
                correo=correo,
                tipo_documento=tipo_doc,
                num_documento=num_documento,
                jornada=jornada,
                activo=True,
            )
            
            # Enviar correo de bienvenida (respetar setting para no saturar el servicio)
            if getattr(settings, "SEND_WELCOME_EMAILS_ON_IMPORT", True):
                email_sent = _send_welcome_email(estudiante, password_provisional)
            else:
                logger.info("Envio de correo de bienvenida deshabilitado por configuracion (SEND_WELCOME_EMAILS_ON_IMPORT=False)")
                email_sent = False
            
            # Registrar auditoría
            try:
                ImportAudit.objects.create(
                    coordinador=coord,
                    kind="estudiantes",
                    filename=f"individual_{codigo}",
                    created_count=1,
                    existing_count=0,
                    errors_count=0,
                )
            except Exception:
                pass
            
            logger.info(f"Estudiante creado: {codigo} por coordinador {coord.codigo_coordinador}")
            
            return Response({
                "detail": "Estudiante creado exitosamente",
                "email_sent": email_sent,
                "estudiante": {
                    "id_estudiante": estudiante.id_estudiante,
                    "codigo_estudiante": estudiante.codigo_estudiante,
                    "nombre": estudiante.nombre,
                    "apellido": estudiante.apellido,
                    "correo": estudiante.correo,
                    "activo": estudiante.activo,
                    "programa_codigo": getattr(detected_program, "codigo_programa", None),
                    "programa": getattr(detected_program, "nombre", None),
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creando estudiante: {str(e)}")
            return Response(
                {"detail": f"Error al crear estudiante: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(["PATCH"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_estudiante_desactivar_view(request, id_estudiante: int):
    """Desactiva el perfil de un estudiante. Solo coordinador."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    detected_program = _infer_program_for_coordinador(coord)
    if not detected_program:
        return Response({"detail": "No se pudo determinar el programa del coordinador"}, status=status.HTTP_403_FORBIDDEN)

    estudiante = Estudiante.objects.filter(id_estudiante=id_estudiante).first()
    if not estudiante:
        return Response({"detail": "Estudiante no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    # Restringir desactivación a estudiantes de asignaturas del programa del coordinador.
    in_program = Matricula.objects.filter(
        estudiante=estudiante,
        asignatura__programa=detected_program,
    ).exists()
    if not in_program:
        return Response(
            {"detail": "No tienes permisos para desactivar este estudiante"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not estudiante.activo:
        return Response(
            {
                "detail": "El perfil del estudiante ya estaba inactivo",
                "estudiante": {
                    "id_estudiante": estudiante.id_estudiante,
                    "codigo_estudiante": estudiante.codigo_estudiante,
                    "activo": estudiante.activo,
                },
            },
            status=status.HTTP_200_OK,
        )

    estudiante.activo = False
    estudiante.save(update_fields=["activo"])

    _send_account_deactivated_email(estudiante, coordinador=coord, programa=detected_program)

    logger.info(
        "Perfil de estudiante inactivado",
        extra={
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "id_estudiante": estudiante.id_estudiante,
            "codigo_estudiante": estudiante.codigo_estudiante,
        },
    )

    return Response(
        {
            "detail": "Perfil de estudiante inactivado exitosamente",
            "estudiante": {
                "id_estudiante": estudiante.id_estudiante,
                "codigo_estudiante": estudiante.codigo_estudiante,
                "activo": estudiante.activo,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_estudiante_activar_view(request, id_estudiante: int):
    """Reactiva el perfil de un estudiante. Solo coordinador."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    detected_program = _infer_program_for_coordinador(coord)
    if not detected_program:
        return Response({"detail": "No se pudo determinar el programa del coordinador"}, status=status.HTTP_403_FORBIDDEN)

    estudiante = Estudiante.objects.filter(id_estudiante=id_estudiante).first()
    if not estudiante:
        return Response({"detail": "Estudiante no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    in_program = Matricula.objects.filter(
        estudiante=estudiante,
        asignatura__programa=detected_program,
    ).exists()
    if not in_program:
        return Response(
            {"detail": "No tienes permisos para activar este estudiante"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if estudiante.activo:
        return Response(
            {
                "detail": "El perfil del estudiante ya estaba activo",
                "estudiante": {
                    "id_estudiante": estudiante.id_estudiante,
                    "codigo_estudiante": estudiante.codigo_estudiante,
                    "activo": estudiante.activo,
                },
            },
            status=status.HTTP_200_OK,
        )

    estudiante.activo = True
    estudiante.save(update_fields=["activo"])

    _send_account_reactivated_email(estudiante, coordinador=coord, programa=detected_program)

    logger.info(
        "Perfil de estudiante activado",
        extra={
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "id_estudiante": estudiante.id_estudiante,
            "codigo_estudiante": estudiante.codigo_estudiante,
        },
    )

    return Response(
        {
            "detail": "Perfil de estudiante activado exitosamente",
            "estudiante": {
                "id_estudiante": estudiante.id_estudiante,
                "codigo_estudiante": estudiante.codigo_estudiante,
                "activo": estudiante.activo,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH", "PUT"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_estudiante_jornada_view(request, id_estudiante: int):
    """Actualiza la jornada de un estudiante de forma individual."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    estudiante = Estudiante.objects.filter(id_estudiante=id_estudiante).first()
    if not estudiante:
        return Response({"detail": "Estudiante no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    jornada, jornada_error = _validate_jornada_value(request.data.get("jornada"))
    if jornada_error:
        return Response({"detail": jornada_error}, status=status.HTTP_400_BAD_REQUEST)
    estudiante.jornada = jornada
    estudiante.save(update_fields=["jornada"])

    logger.info(
        "Jornada de estudiante actualizada",
        extra={
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "id_estudiante": estudiante.id_estudiante,
            "codigo_estudiante": estudiante.codigo_estudiante,
            "jornada": estudiante.jornada,
        },
    )

    return Response(
        {
            "detail": "Jornada actualizada correctamente",
            "estudiante": {
                "id_estudiante": estudiante.id_estudiante,
                "codigo_estudiante": estudiante.codigo_estudiante,
                "jornada": estudiante.jornada,
            },
        },
        status=status.HTTP_200_OK,
    )



@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_estudiantes_para_matricula_view(request):
    """
    Lista candidatos de estudiantes para matrícula, priorizando quienes ya están
    matriculados en asignaturas del mismo programa que la asignatura objetivo.

    Query params:
      - codigo_asignatura (requerido)
            - grupo (opcional)
            - id_asignatura (opcional)
      - search (opcional)
      - include_all_when_empty (opcional, default=1)
    """
    coord, err = _require_coordinador(request)
    if err:
        return err

    codigo_asignatura = (request.query_params.get("codigo_asignatura") or "").strip()
    grupo = (request.query_params.get("grupo") or "").strip()
    id_asignatura = request.query_params.get("id_asignatura")
    search = (request.query_params.get("search") or "").strip()
    if not codigo_asignatura:
        return Response({"detail": "codigo_asignatura requerido"}, status=status.HTTP_400_BAD_REQUEST)

    asig_qs = Asignatura.objects.select_related("programa").filter(codigo_asignatura=codigo_asignatura)
    if grupo:
        asig_qs = asig_qs.filter(grupo=grupo)
    if id_asignatura:
        asig_qs = asig_qs.filter(id_asignatura=id_asignatura)
    asig = asig_qs.order_by("id_asignatura").first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    programa = getattr(asig, "programa", None)

    # Estudiantes candidatos del programa:
    # - Ya matriculados alguna vez en asignaturas del mismo programa
    # - O con formato legacy sin guion (manuales sin programa en el código)
    candidatos_qs = Estudiante.objects.none()
    if programa:
        candidatos_qs = Estudiante.objects.filter(
            Q(matricula__asignatura__programa=programa)
            | ~Q(codigo_estudiante__contains='-')
        ).select_related("tipo_documento").distinct()

    used_fallback_all = False

    if search:
        candidatos_qs = candidatos_qs.filter(
            Q(codigo_estudiante__icontains=search) |
            Q(nombre__icontains=search) |
            Q(apellido__icontains=search) |
            Q(correo__icontains=search) |
            Q(num_documento__icontains=search)
        )

    candidatos_qs = candidatos_qs.order_by("apellido", "nombre")

    data = []
    for est in candidatos_qs:
        data.append({
            "id_estudiante": est.id_estudiante,
            "codigo_estudiante": est.codigo_estudiante,
            "nombre": est.nombre,
            "apellido": est.apellido,
            "correo": est.correo,
            "tipo_documento": est.tipo_documento.descripcion if est.tipo_documento else None,
            "num_documento": est.num_documento,
            "jornada": est.jornada,
        })

    return Response({
        "id_asignatura": asig.id_asignatura,
        "codigo_asignatura": codigo_asignatura,
        "grupo": asig.grupo,
        "programa_codigo": getattr(programa, "codigo_programa", None),
        "programa_nombre": getattr(programa, "nombre", None),
        "used_fallback_all": used_fallback_all,
        "total": len(data),
        "results": data,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_periodos_view(request):
    """Lista todos los periodos académicos para uso administrativo del coordinador."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    qs = PeriodoAcademico.objects.order_by("-fecha_inicio", "-id_periodo")
    return Response([
        {
            "id_periodo": p.id_periodo,
            "descripcion": p.descripcion,
            "fecha_inicio": p.fecha_inicio,
            "fecha_finalizacion": p.fecha_finalizacion,
        }
        for p in qs if _is_valid_periodo_description(p.descripcion)
    ], status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_docentes_view(request):
    """
    GET: Lista docentes (filtro opcional por código, nombre, correo o documento)
    POST: Crea un docente individual.
    Solo coordinador.
    """
    coord, err = _require_coordinador(request)
    if err:
        return err

    if request.method == "GET":
        detected_program = _infer_program_for_coordinador(coord)
        if not detected_program:
            return Response({"detail": "No se pudo determinar el programa del coordinador"}, status=status.HTTP_403_FORBIDDEN)

        docentes = (
            Docente.objects
            .select_related('tipo_documento', 'programa')
            .filter(Q(programa=detected_program) | Q(asignatura__programa=detected_program))
            .distinct()
        )

        search = request.query_params.get('search', '').strip()
        if search:
            docentes = docentes.filter(
                Q(codigo_docente__icontains=search) |
                Q(nombre__icontains=search) |
                Q(apellido__icontains=search) |
                Q(correo__icontains=search) |
                Q(num_documento__icontains=search)
            )

        docentes = docentes.order_by('apellido', 'nombre')

        data = []
        for doc in docentes:
            data.append({
                "id_docente": doc.id_docente,
                "codigo_docente": doc.codigo_docente,
                "nombre": doc.nombre,
                "apellido": doc.apellido,
                "correo": doc.correo,
                "programa_codigo": doc.programa.codigo_programa if doc.programa else None,
                "tipo_documento": doc.tipo_documento.descripcion if doc.tipo_documento else None,
                "num_documento": doc.num_documento,
            })

        return Response(data, status=status.HTTP_200_OK)

    data = request.data
    required = ['codigo_docente', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return Response(
            {"detail": f"Faltan campos requeridos: {', '.join(missing)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    codigo = str(data['codigo_docente']).strip()
    nombre = str(data['nombre']).strip()
    apellido = str(data['apellido']).strip()
    correo = str(data['correo']).strip().lower()
    tipo_doc_desc = str(data['tipo_documento']).strip()
    num_documento = str(data['num_documento']).strip()

    if Docente.objects.filter(codigo_docente=codigo).exists():
        return Response(
            {"detail": f"Ya existe un docente con código {codigo}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if Docente.objects.filter(correo=correo).exists():
        return Response(
            {"detail": f"Ya existe un docente con correo {correo}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if Docente.objects.filter(num_documento=num_documento).exists():
        return Response(
            {"detail": f"Ya existe un docente con documento {num_documento}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    tipo_doc = None
    tipos_documento_map_desc_norm = {}
    for td in TipoDocumento.objects.all():
        tipos_documento_map_desc_norm[_normalize_text(td.descripcion)] = td

    aliases_norm = {
        "cc": "cedula de ciudadania",
        "c.c": "cedula de ciudadania",
        "c.c.": "cedula de ciudadania",
        "ce": "cedula de extranjeria",
        "c.e": "cedula de extranjeria",
        "c.e.": "cedula de extranjeria",
        "ti": "tarjeta de identidad",
        "t.i": "tarjeta de identidad",
        "t.i.": "tarjeta de identidad",
        "pas": "pasaporte",
        "pasaporte": "pasaporte",
        "rc": "registro civil",
        "cr": "registro civil",
        "c.r": "registro civil",
        "c.r.": "registro civil",
        "ppt": "permiso por proteccion temporal",
        "p.p.t": "permiso por proteccion temporal",
        "p.p.t.": "permiso por proteccion temporal",
        "nuip": "nuip",
    }

    input_norm = _normalize_text(tipo_doc_desc)
    mapped_norm = aliases_norm.get(input_norm, input_norm)
    tipo_doc = tipos_documento_map_desc_norm.get(mapped_norm)

    if not tipo_doc:
        for key_norm, td in tipos_documento_map_desc_norm.items():
            if mapped_norm in key_norm or key_norm in mapped_norm:
                tipo_doc = td
                break

    if not tipo_doc:
        return Response(
            {"detail": f"Tipo de documento no válido: {tipo_doc_desc}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    detected_program = _infer_program_for_coordinador(coord)
    if not detected_program:
        return Response(
            {"detail": "No se pudo determinar el programa del coordinador para asignar el docente"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Use fixed generic docente password per user requirement
    password_provisional = "docente123"
    hashed_password = make_password(password_provisional)

    try:
        docente = Docente.objects.create(
            nombre=nombre,
            apellido=apellido,
            codigo_docente=codigo,
            contrasenia_docente=hashed_password,
            correo=correo,
            programa=detected_program,
            tipo_documento=tipo_doc,
            num_documento=num_documento,
        )

        # Enviar correo de bienvenida (respetar setting para no saturar el servicio)
        if getattr(settings, "SEND_WELCOME_EMAILS_ON_IMPORT", True):
            email_sent = _send_welcome_email_docente(docente, password_provisional)
        else:
            logger.info("Envio de correo de bienvenida docente deshabilitado por configuracion (SEND_WELCOME_EMAILS_ON_IMPORT=False)")
            email_sent = False

        try:
            ImportAudit.objects.create(
                coordinador=coord,
                kind="docentes",
                filename=f"individual_{codigo}",
                created_count=1,
                existing_count=0,
                errors_count=0,
            )
        except Exception:
            pass

        logger.info(f"Docente creado: {codigo} por coordinador {coord.codigo_coordinador}")

        return Response({
            "detail": "Docente creado exitosamente",
            "email_sent": email_sent,
            "docente": {
                "id_docente": docente.id_docente,
                "codigo_docente": docente.codigo_docente,
                "nombre": docente.nombre,
                "apellido": docente.apellido,
                "correo": docente.correo,
                "tipo_documento": docente.tipo_documento.descripcion if docente.tipo_documento else None,
                "num_documento": docente.num_documento,
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error creando docente: {str(e)}")
        return Response(
            {"detail": f"Error al crear docente: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_docente_perfil_view(request, id_docente: int):
    """
    Vista detallada del docente para el coordinador.
    Devuelve información personal, estadísticas y asignaturas asociadas.
    """
    coord, err = _require_coordinador(request)
    if err:
        return err

    try:
        docente = Docente.objects.select_related('tipo_documento', 'programa').get(id_docente=id_docente)
    except Docente.DoesNotExist:
        return Response({"detail": "Docente no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    detected_program = _infer_program_for_coordinador(coord)
    if not detected_program:
        return Response({"detail": "No se pudo determinar el programa del coordinador"}, status=status.HTTP_403_FORBIDDEN)

    if docente.programa_id != detected_program.id_programa and not Asignatura.objects.filter(docente=docente, programa=detected_program).exists():
        return Response({"detail": "Docente fuera del alcance de tu programa"}, status=status.HTTP_404_NOT_FOUND)

    asignaturas = Asignatura.objects.filter(docente=docente, programa=detected_program).select_related('programa', 'periodo').order_by('codigo_asignatura')

    asignaturas_data = []
    total_estudiantes = 0
    total_ras = 0

    for asig in asignaturas:
        count_est = Matricula.objects.filter(asignatura=asig).values('estudiante_id').distinct().count()
        count_ras = ResultadoDeAprendizaje.objects.filter(asignatura=asig).count()
        total_estudiantes += count_est
        total_ras += count_ras

        asignaturas_data.append({
            "id_asignatura": asig.id_asignatura,
            "codigo_asignatura": asig.codigo_asignatura,
            "nombre": asig.nombre,
            "grupo": asig.grupo,
            "id_periodo": asig.periodo.id_periodo if asig.periodo else None,
            "periodo": asig.periodo.descripcion if asig.periodo else None,
            "programa": asig.programa.nombre if asig.programa else None,
            "total_estudiantes": count_est,
            "total_ras": count_ras,
        })

    return Response({
        "docente": {
            "id_docente": docente.id_docente,
            "codigo_docente": docente.codigo_docente,
            "nombre": docente.nombre,
            "apellido": docente.apellido,
            "nombre_completo": f"{docente.nombre} {docente.apellido}",
            "correo": docente.correo,
            "programa": docente.programa.nombre if docente.programa else None,
            "tipo_documento": docente.tipo_documento.descripcion if docente.tipo_documento else None,
            "num_documento": docente.num_documento,
            "num_telefono": docente.num_telefono,
        },
        "estadisticas": {
            "total_asignaturas": len(asignaturas_data),
            "total_estudiantes": total_estudiantes,
            "total_ras": total_ras,
        },
        "asignaturas": asignaturas_data,
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_import_estudiantes_view(request):
    """Importa estudiantes desde CSV o Excel con BULK INSERT optimizado. Solo coordinador.
    
    ✨ TRANSFORMACIÓN AUTOMÁTICA: Si carga un Excel del Sistema de Registro Académico
    con columnas (Codigo, Nombres, Apellidos, Email, Documento Identidad, Programa Academico),
    se transforma automáticamente al formato requerido.
    
    Columnas mínimas requeridas (RA Manager): codigo_estudiante, nombre, apellido, correo, tipo_documento, num_documento
    Opcionales: jornada.
    
    Soporta: .csv, .xlsx, .xls
    
    Sinónimos aceptados:
      - codigo_estudiante | estudiante | codigo
      - nombre | first_name
      - apellido | last_name
      - correo | email
      - tipo_documento | tipo_doc | doc_type
      - num_documento | documento | doc_number
      - jornada | turno
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    
    # Debug logging
    logger.info(f"[DEBUG] request.FILES keys: {list(request.FILES.keys())}")
    logger.info(f"[DEBUG] request.POST keys: {list(request.POST.keys())}")
    
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        error_msg = f"Archivo requerido (CSV o Excel). FILES recibidos: {str(list(request.FILES.keys()))}"
        logger.error(f"[ERROR] {error_msg}")
        return Response({"detail": error_msg}, status=status.HTTP_400_BAD_REQUEST)
    
    fname = getattr(f, 'name', '').lower()
    logger.info(f"[DEBUG] Archivo recibido: nombre='{fname}', size={getattr(f, 'size', 'unknown')}, type={type(f)}")
    
    # Validar extensión del archivo
    if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
        return Response({"detail": f"Se requiere archivo .csv, .xlsx o .xls (recibido: '{fname}')"}, status=status.HTTP_400_BAD_REQUEST)
    
    size = int(getattr(f, "size", 0) or 0)
    if size > 10 * 1024 * 1024:  # Aumentado a 10MB para Excel
        return Response({"detail": "El archivo supera 10MB"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Leer archivo con pandas (soporta CSV y Excel)
    df = _read_imported_file(f)
    if df is None or df.empty:
        return Response(
            {"detail": "No se pudo leer el archivo o está vacío. Intente con formato .xlsx o .csv UTF-8."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # TRANSFORMACIÓN AUTOMÁTICA: Detectar y transformar formato de Registro Académico
    df = _detect_and_transform_academic_registro(df)
    
    # Normalizar nombres de columnas
    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.lower()
        .str.normalize("NFKD")
        .str.encode("ascii", errors="ignore")
        .str.decode("ascii")
    )

    # Si existe una columna combinada "Apellidos y Nombres", priorizarla
    # para construir nombre/apellido y evitar tomar datos de columnas no personales.
    def _split_apellidos_nombres(value):
        raw = str(value or "").strip()
        if not raw or raw.lower() in {"nan", "none"}:
            return "", ""

        cleaned = re.sub(r"\s+", " ", raw)

        # Formato frecuente: "APELLIDOS, NOMBRES"
        if "," in cleaned:
            left, right = cleaned.split(",", 1)
            return left.strip(), right.strip()

        # Formato frecuente: "APELLIDOS NOMBRES"
        parts = cleaned.split(" ")
        if len(parts) >= 4:
            return " ".join(parts[:2]), " ".join(parts[2:])
        if len(parts) == 3:
            return " ".join(parts[:2]), parts[2]
        if len(parts) == 2:
            return parts[0], parts[1]
        return "", parts[0]

    full_name_col = next(
        (
            c for c in (
                "apellidos_y_nombres",
                "apellido_y_nombre",
                "apellidos_nombres",
                "apellidos_y_nombre",
            )
            if c in df.columns
        ),
        None,
    )

    if full_name_col:
        split_series = df[full_name_col].apply(_split_apellidos_nombres)
        split_df = pd.DataFrame(
            split_series.tolist(),
            columns=["_apellido_from_fullname", "_nombre_from_fullname"],
            index=df.index,
        )

        existing_apellido = df["apellido"] if "apellido" in df.columns else pd.Series("", index=df.index)
        existing_nombre = df["nombre"] if "nombre" in df.columns else pd.Series("", index=df.index)

        df["apellido"] = split_df["_apellido_from_fullname"].where(
            split_df["_apellido_from_fullname"].fillna("").astype(str).str.strip() != "",
            existing_apellido,
        )
        df["nombre"] = split_df["_nombre_from_fullname"].where(
            split_df["_nombre_from_fullname"].fillna("").astype(str).str.strip() != "",
            existing_nombre,
        )

        logger.info(f"[IMPORT_TRANSFORM] Se priorizo columna '{full_name_col}' para nombre/apellido")
    
    # Validar que tienen las columnas mínimas requeridas
    required_cols = ['codigo_estudiante', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento']
    cols_normalized = set(df.columns)
    missing_cols = [col for col in required_cols if col not in cols_normalized]
    
    if missing_cols:
        error_detail = f"Faltan columnas requeridas: {', '.join(missing_cols)}. Disponibles: {', '.join(df.columns.tolist())}"
        logger.error(f"[IMPORT_VALIDATION] {error_detail}")
        return Response(
            {"detail": error_detail},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # OPTIMIZACIÓN: Pre-cargar datos existentes
    tipos_documento_map_id = {td.id_tipo_documento: td for td in TipoDocumento.objects.all()}
    
    # Mapeo por descripción normalizada (sin tildes, minúsculas) para búsqueda flexible
    tipos_documento_map_desc_norm = {}
    for td in TipoDocumento.objects.all():
        # Normaliza: "Cédula de Ciudadanía" -> "cedula de ciudadania"
        norm = _normalize_text(td.descripcion)
        tipos_documento_map_desc_norm[norm] = td
        # También guardar tal cual minúsculas por si acaso
        tipos_documento_map_desc_norm[td.descripcion.lower().strip()] = td

    # REGLA NEGOCIO: para importación masiva de estudiantes solo se aceptan
    # C.C., C.R., T.I. y PPT (con o sin puntos/espacios).
    allowed_tipo_doc_aliases = {
        "cc": "cedula de ciudadania",
        "c.c": "cedula de ciudadania",
        "c.c.": "cedula de ciudadania",
        "cr": "registro civil",
        "c.r": "registro civil",
        "c.r.": "registro civil",
        "ti": "tarjeta de identidad",
        "t.i": "tarjeta de identidad",
        "t.i.": "tarjeta de identidad",
        "ppt": "permiso por proteccion temporal",
        "p.p.t": "permiso por proteccion temporal",
        "p.p.t.": "permiso por proteccion temporal",
    }
    # Garantizar que exista el tipo de documento para PPT.
    ppt_norm = _normalize_text("permiso por proteccion temporal")
    if ppt_norm not in tipos_documento_map_desc_norm:
        tipo_ppt = TipoDocumento.objects.create(descripcion="Permiso por Protección Temporal")
        tipos_documento_map_id[tipo_ppt.id_tipo_documento] = tipo_ppt
        tipos_documento_map_desc_norm[_normalize_text(tipo_ppt.descripcion)] = tipo_ppt
        tipos_documento_map_desc_norm[tipo_ppt.descripcion.lower().strip()] = tipo_ppt

    allowed_tipo_doc_norm_values = {
        _normalize_text("cedula de ciudadania"),
        _normalize_text("registro civil"),
        _normalize_text("tarjeta de identidad"),
        _normalize_text("permiso por proteccion temporal"),
    }

    logger.info(f"[DEBUG] Tipos de documento disponibles (normalizados): {list(tipos_documento_map_desc_norm.keys())}")
    existing_students = list(Estudiante.objects.all())
    existing_students_by_code = {s.codigo_estudiante: s for s in existing_students}
    existing_students_by_doc = {
        s.num_documento: s
        for s in existing_students
        if getattr(s, 'num_documento', None)
    }
    existing_students_by_email = {
        s.correo: s
        for s in existing_students
        if getattr(s, 'correo', None)
    }
    existing_estudiantes_codigos = set(existing_students_by_code.keys())
    correo_owner_by_code = {
        s.correo: s.codigo_estudiante
        for s in existing_students
        if getattr(s, 'correo', None)
    }
    doc_owner_by_code = {
        s.num_documento: s.codigo_estudiante
        for s in existing_students
        if getattr(s, 'num_documento', None)
    }
    
    created = 0
    updated = 0
    existing = 0
    errors = []
    imported_students = []
    max_rows = 5000
    to_create = []
    to_update = []
    seen_codes_in_file = set()
    bulk_password = _get_bulk_student_password()
    passwords_for_emails = []  # Lista paralela: (correo, nombre, apellido, codigo, password)
    
    # Helper function para acceder a columnas de pandas de forma segura
    def get_col(row, *col_names):
        """Intenta obtener el valor de la primera columna que existe y no es None/NaN"""
        for col in col_names:
            if col in row.index:
                val = row[col]
                if pd.notna(val):
                    return val
        return None
    
    for idx, row in df.iterrows():
        row_num = idx + 2  # +2 porque índice empieza en 0 y hay header
        if idx >= max_rows:
            errors.append({"row": row_num, "error": f"Se excede límite de {max_rows} filas"})
            break
        
        # Log de debug para primera fila
        if idx == 0:
            logger.info(f"[DEBUG] Primera fila (dict): {row.to_dict()}")
        
        # Extraer campos con sinónimos utilizando la función helper y variantes comunes (espacios vs guiones bajos)
        codigo = get_col(row, "codigo_estudiante", "estudiante", "codigo", "code", "id", "codigo estudiante", "student_code")
        nombre = get_col(row, "nombre", "first_name", "nombres", "name", "nombre estudiante")
        apellido = get_col(row, "apellido", "last_name", "apellidos", "surname", "apellido estudiante")
        correo = get_col(row, "correo", "email", "mail", "correo electronico", "e-mail", "correo institucional")
        tipo_doc_desc = get_col(row, "tipo_documento", "tipo_doc", "doc_type", "tipo documento", "t.doc", "tdoc", "identificacion tipo")
        tipo_doc_id = get_col(row, "tipo_documento_id", "tipo_doc_id", "id tipo documento")
        num_documento = get_col(row, "num_documento", "documento", "doc_number", "numero documento", "nro documento", "cedula", "identificacion", "id number", "no. documento")
        jornada = get_col(row, "jornada", "turno", "shift")
        
        # Log de debug para primera fila - valores extraídos
        if idx == 0:
            logger.info(f"[DEBUG] Valores extraídos (fila 1):")
            logger.info(f"  - codigo: {codigo}")
            logger.info(f"  - nombre: {nombre}")
            logger.info(f"  - apellido: {apellido}")
            logger.info(f"  - correo: {correo}")
            logger.info(f"  - tipo_doc_desc: {tipo_doc_desc}")
            logger.info(f"  - tipo_doc_id: {tipo_doc_id}")
            logger.info(f"  - num_documento: {num_documento}")
            logger.info(f"  - jornada: {jornada}")
        

        # Helper limpieza Excel
        def clean_val(v, max_len=None):
            if v is None: return None
            s = str(v).strip()
            if s.endswith(".0"): s = s[:-2]
            return s[:max_len] if max_len else s

        # Limpiar strings
        codigo = clean_val(codigo, 50)
        nombre = clean_val(nombre, 50)
        apellido = clean_val(apellido, 50)
        correo = clean_val(correo, 100)
        tipo_doc_desc = clean_val(tipo_doc_desc)
        num_documento = clean_val(num_documento, 20)
        jornada, jornada_error = _validate_jornada_value(clean_val(jornada, 50))
        
        # Log de debug para primera fila después de limpieza
        if idx == 0:
            logger.info(f"[DEBUG] Valores limpios (fila 1):")
            logger.info(f"  - codigo: '{codigo}'")
            logger.info(f"  - nombre: '{nombre}'")
            logger.info(f"  - apellido: '{apellido}'")
            logger.info(f"  - correo: '{correo}'")
            logger.info(f"  - tipo_doc_desc: '{tipo_doc_desc}'")
            logger.info(f"  - num_documento: '{num_documento}'")
            logger.info(f"  - jornada: '{jornada}'")
        
        # Validar campos requeridos
        if not (codigo and nombre and apellido and correo and (tipo_doc_desc or tipo_doc_id) and num_documento):
            missing_fields = []
            if not codigo: missing_fields.append("codigo_estudiante")
            if not nombre: missing_fields.append("nombre")
            if not apellido: missing_fields.append("apellido")
            if not correo: missing_fields.append("correo")
            if not (tipo_doc_desc or tipo_doc_id): missing_fields.append("tipo_documento")
            if not num_documento: missing_fields.append("num_documento")
            
            error_msg = f"Faltan campos requeridos: {', '.join(missing_fields)}"
            logger.error(f"[IMPORT ERROR] Fila {row_num}: {error_msg}")
            errors.append({"row": row_num, "error": error_msg})
            continue

        if codigo in seen_codes_in_file:
            errors.append({"row": row_num, "error": f"codigo_estudiante duplicado en archivo: {codigo}"})
            continue
        seen_codes_in_file.add(codigo)

        if jornada_error:
            error_msg = f"Jornada invalida: {jornada}"
            logger.error(f"[IMPORT ERROR] Fila {row_num}: {error_msg}")
            errors.append({"row": row_num, "error": error_msg})
            continue
        
        # Tipo documento: por política de importación solo C.C., C.R., T.I. y PPT.
        tipo_doc = None
        if tipo_doc_id:
            try:
                tipo_doc = tipos_documento_map_id.get(int(tipo_doc_id))
                if tipo_doc:
                    td_norm = _normalize_text(getattr(tipo_doc, "descripcion", ""))
                    if td_norm not in allowed_tipo_doc_norm_values:
                        tipo_doc = None
            except (ValueError, TypeError):
                pass
        
        if not tipo_doc and tipo_doc_desc:
            desc_str = str(tipo_doc_desc).strip()
            # 1. Validar código permitido de entrada (C.C., C.R., T.I., PPT)
            norm_input = _normalize_text(desc_str)
            mapped_full = allowed_tipo_doc_aliases.get(norm_input)
            if not mapped_full:
                errors.append({
                    "row": row_num,
                    "error": "tipo_documento invalido. Solo se acepta: C.C., C.R., T.I., PPT."
                })
                continue

            # 2. Resolver abreviatura a tipo_documento existente en BD
            mapped_norm = _normalize_text(mapped_full)
            tipo_doc = tipos_documento_map_desc_norm.get(mapped_norm)
            if not tipo_doc:
                for k, v in tipos_documento_map_desc_norm.items():
                    if mapped_norm in k:
                        tipo_doc = v
                        break

            if idx == 0:
                logger.info(f"[DEBUG] Tipo documento:")
                logger.info(f"  - Input: '{tipo_doc_desc}'")
                logger.info(f"  - Normalizado: '{norm_input}'")
                logger.info(f"  - Encontrado: {tipo_doc}")
                if not tipo_doc:
                    logger.warning(f"[DEBUG] Tipos disponibles en BD: {list(tipos_documento_map_desc_norm.keys())}")

        
        if not tipo_doc:
            error_msg = (
                f"TipoDocumento no encontrado para '{tipo_doc_id or tipo_doc_desc}'. "
                "Solo se admite C.C., C.R., T.I. o PPT."
            )
            logger.error(f"[IMPORT ERROR] Fila {row_num}: {error_msg}")
            errors.append({
                "row": row_num,
                "error": f"TipoDocumento no encontrado o no permitido: '{tipo_doc_desc}'"
            }); continue
        
        # UPSERT: si el estudiante ya existe por código, documento o correo, actualizar su información.
        existing_student = existing_students_by_code.get(codigo)
        match_by = "codigo"
        if not existing_student and num_documento:
            existing_student = existing_students_by_doc.get(num_documento)
            match_by = "num_documento" if existing_student else match_by
        if not existing_student and correo:
            existing_student = existing_students_by_email.get(correo)
            match_by = "correo" if existing_student else match_by

        if existing_student:
            correo_owner = existing_students_by_email.get(correo)
            if correo_owner and correo_owner != existing_student:
                errors.append({"row": row_num, "error": f"Correo ya existe en otro estudiante: {correo}"})
                continue

            doc_owner = existing_students_by_doc.get(num_documento)
            if doc_owner and doc_owner != existing_student:
                errors.append({"row": row_num, "error": f"Documento ya existe en otro estudiante: {num_documento}"})
                continue

            code_owner = existing_students_by_code.get(codigo)
            if code_owner and code_owner != existing_student:
                errors.append({"row": row_num, "error": f"codigo_estudiante ya existe en otro estudiante: {codigo}"})
                continue

            old_correo = existing_student.correo
            old_doc = existing_student.num_documento
            old_code = existing_student.codigo_estudiante

            changed = False
            if existing_student.codigo_estudiante != codigo:
                existing_student.codigo_estudiante = codigo
                changed = True
            if existing_student.nombre != nombre:
                existing_student.nombre = nombre
                changed = True
            if existing_student.apellido != apellido:
                existing_student.apellido = apellido
                changed = True
            if existing_student.correo != correo:
                existing_student.correo = correo
                changed = True
            if existing_student.num_documento != num_documento:
                existing_student.num_documento = num_documento
                changed = True
            if getattr(existing_student, 'tipo_documento_id', None) != getattr(tipo_doc, 'id_tipo_documento', None):
                existing_student.tipo_documento = tipo_doc
                changed = True

            jornada_value = jornada or None
            if existing_student.jornada != jornada_value:
                existing_student.jornada = jornada_value
                changed = True

            if changed:
                to_update.append(existing_student)
                updated += 1
                imported_students.append({
                    "nombre": nombre,
                    "apellido": apellido,
                    "codigo_estudiante": codigo,
                    "num_documento": num_documento,
                    "correo": correo,
                })
            else:
                existing += 1

            if old_correo and old_correo in existing_students_by_email:
                existing_students_by_email.pop(old_correo, None)
            existing_students_by_email[correo] = existing_student

            if old_doc and old_doc in existing_students_by_doc:
                existing_students_by_doc.pop(old_doc, None)
            existing_students_by_doc[num_documento] = existing_student

            if old_code and old_code in existing_students_by_code:
                existing_students_by_code.pop(old_code, None)
            existing_students_by_code[codigo] = existing_student
            existing_estudiantes_codigos.discard(old_code)
            existing_estudiantes_codigos.add(codigo)

            continue

        # Crear nuevo estudiante si no existe por código.
        if correo in existing_students_by_email:
            errors.append({"row": row_num, "error": f"Correo ya existe: {correo}"}); continue
        if num_documento in existing_students_by_doc:
            errors.append({"row": row_num, "error": f"Documento ya existe: {num_documento}"}); continue
        
        # Import masivo: usar contraseña genérica única para todos los estudiantes.
        hashed = make_password(bulk_password)
        
        # Agregar a lista de creación
        to_create.append(Estudiante(
            nombre=nombre,
            apellido=apellido,
            codigo_estudiante=codigo,
            contrasena_estudiante=hashed,
            correo=correo,
            tipo_documento=tipo_doc,
            num_documento=num_documento,
            jornada=jornada or None
        ))

        imported_students.append({
            "nombre": nombre,
            "apellido": apellido,
            "codigo_estudiante": codigo,
            "num_documento": num_documento,
            "correo": correo,
        })
        
        # Guardar información para envío de correos
        passwords_for_emails.append({
            'correo': correo,
            'nombre': nombre,
            'apellido': apellido,
            'codigo': codigo,
            'password': bulk_password
        })
        
        # Marcar como existente para evitar duplicados en el mismo archivo
        existing_estudiantes_codigos.add(codigo)
        existing_students_by_email[correo] = to_create[-1]
        existing_students_by_doc[num_documento] = to_create[-1]
        existing_students_by_code[codigo] = to_create[-1]
        created += 1
    
    logger.info(f"[DEBUG] Preparando bulk_create de {len(to_create)} estudiantes...")
    
    # BULK INSERT con transacción atómica
    if to_create:
        try:
            with transaction.atomic():
                Estudiante.objects.bulk_create(to_create, batch_size=500)
            
            logger.info(f"[DEBUG] Bulk_create completado. Programando envio de {len(passwords_for_emails)} correos...")
            _send_bulk_welcome_emails_async(passwords_for_emails, max_emails=10)
            
        except Exception as e:
            errors.append({"error": f"Error en inserción masiva: {str(e)}"})
            created = 0
            imported_students = []

    # BULK UPDATE de estudiantes existentes (reimportación)
    if to_update:
        try:
            with transaction.atomic():
                Estudiante.objects.bulk_update(
                    to_update,
                    ['codigo_estudiante', 'nombre', 'apellido', 'correo', 'tipo_documento', 'num_documento', 'jornada'],
                    batch_size=500,
                )
        except Exception as e:
            errors.append({"error": f"Error en actualización masiva: {str(e)}"})
            updated = 0
    
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    payload = {
        "created": created,
        "updated": updated,
        "existing": existing,
        "errors": errors,
        "imported_students": imported_students,
        "password_mode": "generic",
    }
    try:
        logger.info("import_estudiantes: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": getattr(f, "name", None),
            **{k: payload[k] for k in ("created", "existing")},
            "errors_count": len(errors)
        })
        ImportAudit.objects.create(
            coordinador=coord,
            kind="estudiantes",
            filename=fname,
            created_count=created,
            existing_count=existing,
            errors_count=len(errors),
        )
    except Exception:
        pass
    return Response(payload, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignaturas_view(request):
    """Listado de asignaturas para coordinador, con filtros y paginación."""
    coord, err = _require_coordinador(request)
    if err:
        return err
    qs = Asignatura.objects.select_related("docente", "programa", "periodo")
    detected_program = _infer_program_for_coordinador(coord)
    if detected_program:
        qs = qs.filter(programa=detected_program)

    prog_code = request.query_params.get("programa")
    docente_code = request.query_params.get("docente")
    periodo_desc = request.query_params.get("periodo")
    if prog_code:
        qs = qs.filter(programa__codigo_programa=prog_code)
    if docente_code:
        qs = qs.filter(docente__codigo_docente=docente_code)
    if periodo_desc:
        qs = qs.filter(Q(periodo__descripcion=periodo_desc) | Q(matricula__periodo__descripcion=periodo_desc)).distinct()
    search = (request.query_params.get("search") or "").strip()
    if search:
        qs = qs.filter(
            Q(codigo_asignatura__icontains=search) |
            Q(nombre__icontains=search)
        )
    from django.db.models import Count
    page_size = int(request.query_params.get("page_size") or 20)
    page = int(request.query_params.get("page") or 1)
    if page < 1:
        page = 1
    offset = (page - 1) * page_size
    
    # Optimización: calcular conteos en una sola query con annotate
    qs = qs.annotate(
        total_estudiantes=Count('matricula', distinct=True),
        total_ras=Count('resultadodeaprendizaje', distinct=True)
    )
    total = qs.count()
    
    rows = []
    for a in qs.order_by("nombre")[offset:offset+page_size]:
        rows.append({
            "id_asignatura": a.id_asignatura,
            "codigo": a.codigo_asignatura,
            "nombre": a.nombre,
            "grupo": a.grupo,
            "sede": a.sede,
            "creditos": getattr(a, "creditos", 0),
            "periodo": getattr(getattr(a, "periodo", None), "descripcion", None),
            "programa": getattr(a.programa, "nombre", None),
            "programa_codigo": getattr(a.programa, "codigo_programa", None),
            "docente": getattr(a.docente, "nombre", None),
            "docente_codigo": getattr(a.docente, "codigo_docente", None),
            "total_estudiantes": a.total_estudiantes,
            "total_ras": a.total_ras,
        })
    return Response({
        "page": page,
        "page_size": page_size,
        "total": total,
        "results": rows,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignatura_ras_view(request):
    """Lista RAs y conteo de actividades por asignatura; opcional periodo. Solo coordinador.
    Query params:
      - codigo_asignatura (requerido)
      - periodo (opcional, para filtrar actividades asociadas a matrículas de ese periodo)
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    codigo = request.query_params.get("codigo_asignatura")
    if not codigo:
        return Response({"detail": "codigo_asignatura requerido"}, status=status.HTTP_400_BAD_REQUEST)
    periodo_desc = request.query_params.get("periodo")
    asig = Asignatura.objects.filter(codigo_asignatura=codigo).first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    
    # Optimización: prefetch relacionados para evitar N+1 queries
    ras = ResultadoDeAprendizaje.objects.filter(asignatura=asig).prefetch_related(
        'raactividad_set',
        'raactividad_set__notasactividad_set',
        'raactividad_set__notasactividad_set__matricula',
        'raactividad_set__notasactividad_set__matricula__periodo'
    ).order_by("id_ra")
    
    out = []
    for ra in ras:
        rels = ra.raactividad_set.all()
        # Si se filtra periodo, contar solo actividades con al menos una nota de matriculas de ese periodo
        if periodo_desc:
            rels = [rel for rel in rels if any(
                nota.matricula.periodo.descripcion == periodo_desc 
                for nota in rel.notasactividad_set.all()
            )]
            count = len(rels)
        else:
            count = len(rels)
        
        out.append({
            "id_ra": ra.id_ra,
            "numero_ra": ra.numero_ra,
            "descripcion": ra.descripcion,
            "porcentaje_ra": float(ra.porcentaje_ra),
            "total_actividades": count,
        })
    return Response({
        "codigo_asignatura": codigo,
        "periodo": periodo_desc,
        "ras": out,
        "total_ras": len(out),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_crear_asignatura_ra_view(request):
    """Crea o actualiza una asignatura y agrega uno o varios RAs en una sola transacción.

    Body esperado:
            {
        "codigo_asignatura": str,
        "nombre_asignatura": str,
        "codigo_docente": str,
        "codigo_programa": str,
                "grupo": str,
        "ras": [
                    {
                        "descripcion": str,
                        "porcentaje_ra": number,
                        "indicadores": [
                            { "descripcion": str, "porcentaje_ind": number },
                            ...
                        ]
                    },
          ...
        ]
      }
    """
    coord, err = _require_coordinador(request)
    if err:
        return err

    data = request.data if isinstance(request.data, dict) else {}

    codigo_asignatura = str(data.get("codigo_asignatura") or "").strip()
    nombre_asignatura = str(data.get("nombre_asignatura") or "").strip()
    codigo_docente = str(data.get("codigo_docente") or "").strip()
    codigo_programa = str(data.get("codigo_programa") or "").strip()
    periodo_desc = str(data.get("periodo") or "").strip()
    raw_creditos = data.get("creditos")
    grupo = str(data.get("grupo") or "").strip()
    sede = str(data.get("sede") or "").strip()
    ras_input = data.get("ras") or []

    if not (codigo_asignatura and nombre_asignatura and codigo_docente and periodo_desc and grupo and sede):
        return Response(
            {"detail": "codigo_asignatura, nombre_asignatura, codigo_docente, periodo, grupo y sede son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        creditos = int(raw_creditos)
    except (TypeError, ValueError):
        return Response({"detail": "creditos es obligatorio y debe ser un entero"}, status=status.HTTP_400_BAD_REQUEST)

    if creditos <= 0:
        return Response({"detail": "creditos debe ser mayor que 0"}, status=status.HTTP_400_BAD_REQUEST)

    periodo = PeriodoAcademico.objects.filter(descripcion=periodo_desc).first()
    if not periodo:
        return Response({"detail": f"Periodo no encontrado en BD: {periodo_desc}"}, status=status.HTTP_400_BAD_REQUEST)

    if not isinstance(ras_input, list):
        return Response({"detail": "ras debe ser una lista"}, status=status.HTTP_400_BAD_REQUEST)

    docente = Docente.objects.filter(codigo_docente=codigo_docente).first()
    if not docente:
        return Response({"detail": f"Docente no encontrado: {codigo_docente}"}, status=status.HTTP_400_BAD_REQUEST)

    # Detección automática basada en el coordinador autenticado.
    programa = _infer_program_for_coordinador(coord)

    # Fallback controlado: si no se detecta automáticamente, aceptar código explícito.
    if not programa and codigo_programa:
        programa = Programa.objects.filter(codigo_programa=codigo_programa).first()

    if not programa:
        return Response(
            {"detail": "No se pudo detectar automáticamente el programa del coordinador. Configura el perfil o envía codigo_programa válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Normalizar y validar RAs entrantes
    ras_normalizados = []
    suma_nuevos = 0.0
    descripciones_limpias = set()
    for idx, item in enumerate(ras_input):
        if not isinstance(item, dict):
            return Response({"detail": f"RA en posición {idx + 1} inválido"}, status=status.HTTP_400_BAD_REQUEST)

        descripcion = str(item.get("descripcion") or "").strip()
        raw_pct = item.get("porcentaje_ra")
        indicadores_input = item.get("indicadores") or []

        if not descripcion and (raw_pct is None or str(raw_pct).strip() == ""):
            continue

        if not descripcion:
            return Response({"detail": f"La descripción es obligatoria para el RA {idx + 1}"}, status=status.HTTP_400_BAD_REQUEST)

        if raw_pct is None or str(raw_pct).strip() == "":
            return Response({"detail": f"El porcentaje es obligatorio para el RA {idx + 1}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            porcentaje = float(raw_pct)
        except (TypeError, ValueError):
            return Response({"detail": f"porcentaje_ra inválido en RA {idx + 1}"}, status=status.HTTP_400_BAD_REQUEST)

        if porcentaje <= 0 or porcentaje > 100:
            return Response(
                {"detail": f"El porcentaje del RA {idx + 1} debe ser mayor que 0 y no exceder 100"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        desc_key = descripcion.lower()
        if desc_key in descripciones_limpias:
            return Response(
                {"detail": f"La descripción '{descripcion}' está repetida en los RAs nuevos"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        descripciones_limpias.add(desc_key)

        if not isinstance(indicadores_input, list):
            return Response(
                {"detail": f"indicadores debe ser una lista en RA {idx + 1}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        indicadores_normalizados = []
        indicadores_desc = set()
        for ind_idx, ind_item in enumerate(indicadores_input):
            if not isinstance(ind_item, dict):
                return Response(
                    {"detail": f"Indicador inválido en RA {idx + 1}, posición {ind_idx + 1}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ind_descripcion = str(ind_item.get("descripcion") or "").strip()

            if not ind_descripcion:
                continue

            ind_desc_key = ind_descripcion.lower()
            if ind_desc_key in indicadores_desc:
                return Response(
                    {"detail": f"La descripción del indicador '{ind_descripcion}' está repetida en RA {idx + 1}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            indicadores_desc.add(ind_desc_key)

            indicadores_normalizados.append({
                "descripcion": ind_descripcion,
            })

        if not indicadores_normalizados:
            return Response(
                {"detail": f"Cada RA debe tener al menos un indicador de logro. RA {idx + 1} no tiene indicadores válidos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ras_normalizados.append({
            "descripcion": descripcion[:255],
            "porcentaje_ra": porcentaje,
            "indicadores": indicadores_normalizados,
        })
        suma_nuevos += porcentaje

    with transaction.atomic():
        asignatura = Asignatura.objects.select_related("docente", "programa").filter(
            codigo_asignatura=codigo_asignatura,
            grupo=grupo,
            sede=sede,
            periodo=periodo,
        ).first()
        asignatura_creada = False
        asignatura_actualizada = False

        if not asignatura:
            asignatura = Asignatura.objects.create(
                codigo_asignatura=codigo_asignatura,
                nombre=nombre_asignatura,
                docente=docente,
                programa=programa,
                periodo=periodo,
                grupo=grupo,
                sede=sede,
                creditos=creditos,
            )
            asignatura_creada = True
        else:
            updates = {}
            if asignatura.nombre != nombre_asignatura:
                updates["nombre"] = nombre_asignatura
            if asignatura.docente_id != docente.id_docente:
                updates["docente"] = docente
            if asignatura.programa_id != programa.id_programa:
                updates["programa"] = programa
            if asignatura.periodo_id != periodo.id_periodo:
                updates["periodo"] = periodo
            if asignatura.grupo != grupo:
                updates["grupo"] = grupo
            if asignatura.sede != sede:
                updates["sede"] = sede
            if int(getattr(asignatura, "creditos", 0) or 0) != creditos:
                updates["creditos"] = creditos

            if updates:
                for field, value in updates.items():
                    setattr(asignatura, field, value)
                asignatura.save(update_fields=list(updates.keys()))
                asignatura_actualizada = True

        suma_existente = float(
            ResultadoDeAprendizaje.objects.filter(asignatura=asignatura).aggregate(v=Sum("porcentaje_ra"))["v"] or 0
        )

        if (suma_existente + suma_nuevos) > 100.0:
            return Response(
                {
                    "detail": (
                        f"La suma de porcentajes de RA excede 100% "
                        f"({suma_existente + suma_nuevos:.2f}%). Actual: {suma_existente:.2f}%, nuevos: {suma_nuevos:.2f}%"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existentes_desc = set(
            (
                ResultadoDeAprendizaje.objects.filter(asignatura=asignatura)
                .exclude(descripcion__isnull=True)
                .exclude(descripcion__exact="")
                .values_list("descripcion", flat=True)
            )
        )
        existentes_desc_lc = {str(d).strip().lower() for d in existentes_desc if d is not None}

        ras_to_create = []
        ras_to_create_payload = []
        ras_omitidos = []
        for ra in ras_normalizados:
            if ra["descripcion"].lower() in existentes_desc_lc:
                ras_omitidos.append({"descripcion": ra["descripcion"], "motivo": "RA ya existe"})
                continue
            ras_to_create.append(
                ResultadoDeAprendizaje(
                    asignatura=asignatura,
                    descripcion=ra["descripcion"],
                    porcentaje_ra=ra["porcentaje_ra"],
                )
            )
            ras_to_create_payload.append(ra)

        # Obtener el próximo número de RA para esta asignatura
        next_numero_ra = ResultadoDeAprendizaje.get_next_numero_for_asignatura(asignatura)

        # Asignar números secuenciales a los RAs que se van a crear
        for idx, ra_obj in enumerate(ras_to_create):
            ra_obj.numero_ra = next_numero_ra + idx

        # Guardar los RAs con sus números asignados
        ras_creados = ResultadoDeAprendizaje.objects.bulk_create(ras_to_create, batch_size=200) if ras_to_create else []

        indicadores_to_create = []
        if ras_creados:
            for ra_creado, ra_payload in zip(ras_creados, ras_to_create_payload):
                for indicador in ra_payload["indicadores"]:
                    indicadores_to_create.append(
                        IndicadoresDeLogro(
                            ra=ra_creado,
                            descripcion=indicador["descripcion"],
                        )
                    )

        indicadores_creados = (
            IndicadoresDeLogro.objects.bulk_create(indicadores_to_create, batch_size=500)
            if indicadores_to_create
            else []
        )

        indicadores_por_ra = {}
        for ind in indicadores_creados:
            indicadores_por_ra.setdefault(ind.ra_id, []).append({
                "id_ind": ind.id_ind,
                "descripcion": ind.descripcion,
            })

    try:
        logger.info(
            "crear_asignatura_ra: %s",
            {
                "coordinador": getattr(coord, "codigo_coordinador", None),
                "codigo_asignatura": codigo_asignatura,
                "asignatura_creada": asignatura_creada,
                "asignatura_actualizada": asignatura_actualizada,
                "ras_creados": len(ras_creados),
                "indicadores_creados": len(indicadores_creados),
                "ras_omitidos": len(ras_omitidos),
            },
        )
    except Exception:
        pass

    return Response(
        {
            "detail": "Asignatura procesada correctamente",
            "asignatura": {
                "codigo": asignatura.codigo_asignatura,
                "nombre": asignatura.nombre,
                "periodo": getattr(asignatura.periodo, "descripcion", None),
                "grupo": asignatura.grupo,
                "sede": asignatura.sede,
                "creditos": int(getattr(asignatura, "creditos", 0) or 0),
                "programa_codigo": getattr(asignatura.programa, "codigo_programa", None),
                "docente_codigo": getattr(asignatura.docente, "codigo_docente", None),
            },
            "asignatura_creada": asignatura_creada,
            "asignatura_actualizada": asignatura_actualizada,
            "ras_creados": [
                {
                    "id_ra": r.id_ra,
                    "descripcion": r.descripcion,
                    "porcentaje_ra": float(r.porcentaje_ra),
                    "indicadores": indicadores_por_ra.get(r.id_ra, []),
                }
                for r in ras_creados
            ],
            "ras_omitidos": ras_omitidos,
            "total_ra_asignatura": float(
                ResultadoDeAprendizaje.objects.filter(asignatura=asignatura).aggregate(v=Sum("porcentaje_ra"))["v"] or 0
            ),
        },
        status=status.HTTP_201_CREATED if asignatura_creada else status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignatura_detalle_edicion_view(request):
    """Retorna una asignatura exacta (codigo + periodo + grupo + sede) con RAs e indicadores para edición."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    codigo_asignatura = str(request.query_params.get("codigo_asignatura") or "").strip()
    periodo_desc = str(request.query_params.get("periodo") or "").strip()
    grupo = str(request.query_params.get("grupo") or "").strip()
    sede = str(request.query_params.get("sede") or "").strip()

    if not (codigo_asignatura and periodo_desc and grupo and sede):
        return Response(
            {"detail": "codigo_asignatura, periodo, grupo y sede son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    detected_program = _infer_program_for_coordinador(coord)

    asig_qs = Asignatura.objects.select_related("docente", "programa", "periodo").filter(
        codigo_asignatura=codigo_asignatura,
        periodo__descripcion=periodo_desc,
        grupo=grupo,
        sede=sede,
    )

    if detected_program:
        asig_qs = asig_qs.filter(programa=detected_program)

    total_matches = asig_qs.count()
    if total_matches == 0:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    if total_matches > 1:
        return Response(
            {"detail": "La combinación código + periodo + grupo + sede no es única."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    asig = asig_qs.first()
    ras = ResultadoDeAprendizaje.objects.filter(asignatura=asig).order_by("id_ra")

    ras_payload = []
    for ra in ras:
        indicadores = IndicadoresDeLogro.objects.filter(ra=ra).order_by("id_ind")
        ras_payload.append(
            {
                "id_ra": ra.id_ra,
                "numero_ra": ra.numero_ra,
                "descripcion": ra.descripcion,
                "porcentaje_ra": float(ra.porcentaje_ra or 0),
                "indicadores": [
                    {
                        "id_ind": ind.id_ind,
                        "descripcion": ind.descripcion,
                    }
                    for ind in indicadores
                ],
            }
        )

    return Response(
        {
            "asignatura": {
                "id_asignatura": asig.id_asignatura,
                "codigo_asignatura": asig.codigo_asignatura,
                "nombre_asignatura": asig.nombre,
                "codigo_docente": getattr(asig.docente, "codigo_docente", None),
                "codigo_programa": getattr(asig.programa, "codigo_programa", None),
                "programa_nombre": getattr(asig.programa, "nombre", None),
                "periodo": getattr(asig.periodo, "descripcion", None),
                "creditos": int(getattr(asig, "creditos", 0) or 0),
                "grupo": asig.grupo,
                "sede": asig.sede,
            },
            "ras": ras_payload,
            "total_ra_asignatura": float(sum((r["porcentaje_ra"] for r in ras_payload), 0.0)),
        }
    )


@api_view(["PATCH"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_actualizar_asignatura_ra_view(request):
    """Actualiza datos base de asignatura y permite editar/crear RAs e indicadores."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    data = request.data if isinstance(request.data, dict) else {}

    codigo_asignatura = str(data.get("codigo_asignatura") or "").strip()
    nombre_asignatura = str(data.get("nombre_asignatura") or "").strip()
    codigo_docente = str(data.get("codigo_docente") or "").strip()
    codigo_programa = str(data.get("codigo_programa") or "").strip()
    periodo_desc = str(data.get("periodo") or "").strip()
    raw_creditos = data.get("creditos")
    grupo = str(data.get("grupo") or "").strip()
    sede = str(data.get("sede") or "").strip()
    ras_input = data.get("ras") or []

    if not (codigo_asignatura and nombre_asignatura and codigo_docente and periodo_desc and grupo and sede):
        return Response(
            {"detail": "codigo_asignatura, nombre_asignatura, codigo_docente, periodo, grupo y sede son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(ras_input, list):
        return Response({"detail": "ras debe ser una lista"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        creditos = int(raw_creditos)
    except (TypeError, ValueError):
        return Response({"detail": "creditos es obligatorio y debe ser un entero"}, status=status.HTTP_400_BAD_REQUEST)

    if creditos <= 0:
        return Response({"detail": "creditos debe ser mayor que 0"}, status=status.HTTP_400_BAD_REQUEST)

    periodo = PeriodoAcademico.objects.filter(descripcion=periodo_desc).first()
    if not periodo:
        return Response({"detail": f"Periodo no encontrado en BD: {periodo_desc}"}, status=status.HTTP_400_BAD_REQUEST)

    docente = Docente.objects.filter(codigo_docente=codigo_docente).first()
    if not docente:
        return Response({"detail": f"Docente no encontrado: {codigo_docente}"}, status=status.HTTP_400_BAD_REQUEST)

    programa = _infer_program_for_coordinador(coord)
    if not programa and codigo_programa:
        programa = Programa.objects.filter(codigo_programa=codigo_programa).first()
    if not programa:
        return Response(
            {"detail": "No se pudo detectar automáticamente el programa del coordinador. Configura el perfil o envía codigo_programa válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    asig_qs = Asignatura.objects.filter(
        codigo_asignatura=codigo_asignatura,
        periodo=periodo,
        grupo=grupo,
        sede=sede,
    )
    if programa:
        asig_qs = asig_qs.filter(programa=programa)

    asig = asig_qs.first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada para actualización"}, status=status.HTTP_404_NOT_FOUND)

    # Validaciones de RAs e indicadores
    ra_desc_seen = set()
    ras_normalizados = []
    for idx, item in enumerate(ras_input):
        if not isinstance(item, dict):
            return Response({"detail": f"RA en posición {idx + 1} inválido"}, status=status.HTTP_400_BAD_REQUEST)

        ra_id = item.get("id_ra")
        descripcion = str(item.get("descripcion") or "").strip()
        raw_pct = item.get("porcentaje_ra")
        indicadores_input = item.get("indicadores") or []

        if not descripcion:
            return Response({"detail": f"La descripción es obligatoria para el RA {idx + 1}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            porcentaje_ra = float(raw_pct)
        except (TypeError, ValueError):
            return Response({"detail": f"porcentaje_ra inválido en RA {idx + 1}"}, status=status.HTTP_400_BAD_REQUEST)

        if porcentaje_ra <= 0 or porcentaje_ra > 100:
            return Response(
                {"detail": f"El porcentaje del RA {idx + 1} debe ser mayor que 0 y no exceder 100"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        key_desc = descripcion.lower()
        if key_desc in ra_desc_seen:
            return Response({"detail": f"La descripción '{descripcion}' está repetida en los RAs"}, status=status.HTTP_400_BAD_REQUEST)
        ra_desc_seen.add(key_desc)

        if not isinstance(indicadores_input, list):
            return Response({"detail": f"indicadores debe ser lista en RA {idx + 1}"}, status=status.HTTP_400_BAD_REQUEST)

        ind_desc_seen = set()
        indicadores_normalizados = []
        for ind_idx, ind_item in enumerate(indicadores_input):
            if not isinstance(ind_item, dict):
                return Response(
                    {"detail": f"Indicador inválido en RA {idx + 1}, posición {ind_idx + 1}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ind_id = ind_item.get("id_ind")
            ind_desc = str(ind_item.get("descripcion") or "").strip()

            if not ind_desc:
                return Response(
                    {"detail": f"La descripción del indicador es obligatoria en RA {idx + 1}, indicador {ind_idx + 1}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ind_key = ind_desc.lower()
            if ind_key in ind_desc_seen:
                return Response(
                    {"detail": f"Indicador duplicado '{ind_desc}' en RA {idx + 1}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            ind_desc_seen.add(ind_key)

            indicadores_normalizados.append(
                {
                    "id_ind": ind_id,
                    "descripcion": ind_desc,
                }
            )

        if not indicadores_normalizados:
            return Response(
                {"detail": f"Cada RA debe tener al menos un indicador. RA {idx + 1} no tiene indicadores válidos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ras_normalizados.append(
            {
                "id_ra": ra_id,
                "descripcion": descripcion,
                "porcentaje_ra": porcentaje_ra,
                "indicadores": indicadores_normalizados,
            }
        )

    total_ra_form = sum((ra["porcentaje_ra"] for ra in ras_normalizados), 0.0)
    if total_ra_form > 100:
        return Response(
            {"detail": f"La suma de porcentajes de RA en el formulario excede 100% ({total_ra_form:.2f}%)"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            updates = {}
            if asig.nombre != nombre_asignatura:
                updates["nombre"] = nombre_asignatura
            if asig.docente_id != docente.id_docente:
                updates["docente"] = docente
            if asig.programa_id != programa.id_programa:
                updates["programa"] = programa
            if asig.periodo_id != periodo.id_periodo:
                updates["periodo"] = periodo
            if asig.grupo != grupo:
                updates["grupo"] = grupo
            if asig.sede != sede:
                updates["sede"] = sede
            if int(getattr(asig, "creditos", 0) or 0) != creditos:
                updates["creditos"] = creditos

            if updates:
                for field, value in updates.items():
                    setattr(asig, field, value)
                asig.save(update_fields=list(updates.keys()))

            existing_ras = {r.id_ra: r for r in ResultadoDeAprendizaje.objects.filter(asignatura=asig)}
            ras_actualizados = 0
            ras_creados = 0
            inds_actualizados = 0
            inds_creados = 0
            ras_eliminados = 0
            inds_eliminados = 0

            submitted_existing_ra_ids = set()

            for ra_item in ras_normalizados:
                ra_obj = None
                ra_id = ra_item.get("id_ra")
                if ra_id is not None:
                    try:
                        ra_id_int = int(ra_id)
                    except (TypeError, ValueError):
                        return Response({"detail": f"id_ra inválido: {ra_id}"}, status=status.HTTP_400_BAD_REQUEST)

                    ra_obj = existing_ras.get(ra_id_int)
                    if not ra_obj:
                        return Response(
                            {"detail": f"El RA {ra_id_int} no pertenece a la asignatura seleccionada"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    submitted_existing_ra_ids.add(ra_id_int)

                    changed_fields = []
                    if (ra_obj.descripcion or "") != ra_item["descripcion"]:
                        ra_obj.descripcion = ra_item["descripcion"]
                        changed_fields.append("descripcion")
                    if float(ra_obj.porcentaje_ra or 0) != float(ra_item["porcentaje_ra"]):
                        ra_obj.porcentaje_ra = ra_item["porcentaje_ra"]
                        changed_fields.append("porcentaje_ra")
                    if changed_fields:
                        ra_obj.save(update_fields=changed_fields)
                        ras_actualizados += 1
                else:
                    ra_obj = ResultadoDeAprendizaje.objects.create(
                        asignatura=asig,
                        descripcion=ra_item["descripcion"],
                        porcentaje_ra=ra_item["porcentaje_ra"],
                            numero_ra=ResultadoDeAprendizaje.get_next_numero_for_asignatura(asig),
                    )
                    ras_creados += 1

                existing_inds = {ind.id_ind: ind for ind in IndicadoresDeLogro.objects.filter(ra=ra_obj)}
                submitted_existing_ind_ids = set()
                for ind_item in ra_item["indicadores"]:
                    ind_obj = None
                    ind_id = ind_item.get("id_ind")
                    if ind_id is not None:
                        try:
                            ind_id_int = int(ind_id)
                        except (TypeError, ValueError):
                            return Response({"detail": f"id_ind inválido: {ind_id}"}, status=status.HTTP_400_BAD_REQUEST)

                        ind_obj = existing_inds.get(ind_id_int)
                        if not ind_obj:
                            return Response(
                                {"detail": f"El indicador {ind_id_int} no pertenece al RA {ra_obj.id_ra}"},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        submitted_existing_ind_ids.add(ind_id_int)

                        ind_changes = []
                        if (ind_obj.descripcion or "") != ind_item["descripcion"]:
                            ind_obj.descripcion = ind_item["descripcion"]
                            ind_changes.append("descripcion")
                        if ind_changes:
                            ind_obj.save(update_fields=ind_changes)
                            inds_actualizados += 1
                    else:
                        IndicadoresDeLogro.objects.create(
                            ra=ra_obj,
                            descripcion=ind_item["descripcion"],
                        )
                        inds_creados += 1

                # Eliminar indicadores que se quitaron del formulario (solo los existentes)
                inds_to_delete_ids = set(existing_inds.keys()) - submitted_existing_ind_ids
                if inds_to_delete_ids:
                    for ind_id in inds_to_delete_ids:
                        has_links = RaActividadIndicador.objects.filter(indicador_id=ind_id).exists()
                        has_notes = NotasActividad.objects.filter(indicador_id=ind_id).exists()
                        if has_links or has_notes:
                            return Response(
                                {
                                    "detail": (
                                        f"No se puede eliminar el indicador {ind_id} porque tiene actividades o notas asociadas. "
                                        "Retíralo manualmente de esas asociaciones primero."
                                    )
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )

                    IndicadoresDeLogro.objects.filter(id_ind__in=list(inds_to_delete_ids)).delete()
                    inds_eliminados += len(inds_to_delete_ids)

            # Eliminar RAs que se quitaron del formulario (solo RAs existentes)
            ras_to_delete_ids = set(existing_ras.keys()) - submitted_existing_ra_ids
            if ras_to_delete_ids:
                for ra_id in ras_to_delete_ids:
                    has_activities = RaActividad.objects.filter(ra_id=ra_id).exists()
                    if has_activities:
                        return Response(
                            {
                                "detail": (
                                    f"No se puede eliminar el RA {ra_id} porque tiene actividades asociadas. "
                                    "Elimina o reasigna esas actividades primero."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                ResultadoDeAprendizaje.objects.filter(id_ra__in=list(ras_to_delete_ids)).delete()
                ras_eliminados += len(ras_to_delete_ids)

            total_ra_asignatura = float(
                ResultadoDeAprendizaje.objects.filter(asignatura=asig).aggregate(v=Sum("porcentaje_ra"))["v"] or 0
            )
            if total_ra_asignatura > 100:
                raise IntegrityError(f"La suma de porcentajes de RA excede 100% ({total_ra_asignatura:.2f}%)")
    except IntegrityError as db_err:
        return Response({"detail": str(db_err)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "detail": "Asignatura y RAs actualizados correctamente",
            "asignatura": {
                "codigo": asig.codigo_asignatura,
                "nombre": asig.nombre,
                "periodo": getattr(asig.periodo, "descripcion", None),
                "grupo": asig.grupo,
                "sede": asig.sede,
                "creditos": int(getattr(asig, "creditos", 0) or 0),
                "programa_codigo": getattr(asig.programa, "codigo_programa", None),
                "docente_codigo": getattr(asig.docente, "codigo_docente", None),
            },
            "resumen": {
                "ras_actualizados": ras_actualizados,
                "ras_creados": ras_creados,
                "ras_eliminados": ras_eliminados,
                "indicadores_actualizados": inds_actualizados,
                "indicadores_creados": inds_creados,
                "indicadores_eliminados": inds_eliminados,
            },
            "total_ra_asignatura": total_ra_asignatura,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignatura_estudiantes_view(request):
    """Lista estudiantes de una asignatura y periodo (opcional), paginado. Solo coordinador."""
    coord, err = _require_coordinador(request)
    if err:
        return err
    codigo = request.query_params.get("codigo_asignatura")
    grupo = (request.query_params.get("grupo") or "").strip()
    id_asignatura = request.query_params.get("id_asignatura")
    if not codigo:
        return Response({"detail": "codigo_asignatura requerido"}, status=status.HTTP_400_BAD_REQUEST)
    periodo_desc = request.query_params.get("periodo")
    asig_qs = Asignatura.objects.filter(codigo_asignatura=codigo)
    if grupo:
        asig_qs = asig_qs.filter(grupo=grupo)
    if id_asignatura:
        asig_qs = asig_qs.filter(id_asignatura=id_asignatura)
    asig = asig_qs.order_by("id_asignatura").first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    mats = Matricula.objects.filter(asignatura=asig).select_related("estudiante", "periodo")
    if periodo_desc:
        mats = mats.filter(periodo__descripcion=periodo_desc)
    page_size = int(request.query_params.get("page_size") or 20)
    page = int(request.query_params.get("page") or 1)
    if page < 1:
        page = 1
    offset = (page - 1) * page_size
    total = mats.count()
    rows = [{
        "id_matricula": m.id_matricula,
        "id_estudiante": m.estudiante_id,
        "nombre": m.estudiante.nombre,
        "apellido": m.estudiante.apellido,
        "codigo_estudiante": m.estudiante.codigo_estudiante,
        "periodo": m.periodo.descripcion,
    } for m in mats.order_by("estudiante__nombre", "estudiante__apellido")[offset:offset+page_size]]
    return Response({
        "page": page, "page_size": page_size, "total": total, "results": rows
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_desmatricular_view(request):
    """Elimina una matrícula existente. Solo coordinador."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    id_matricula_raw = request.data.get("id_matricula")
    try:
        id_matricula = int(id_matricula_raw)
    except (TypeError, ValueError):
        return Response({"detail": "id_matricula inválido"}, status=status.HTTP_400_BAD_REQUEST)

    matricula = Matricula.objects.select_related("estudiante", "asignatura", "periodo").filter(id_matricula=id_matricula).first()
    if not matricula:
        return Response({"detail": "Matrícula no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    payload = {
        "id_matricula": matricula.id_matricula,
        "id_estudiante": matricula.estudiante_id,
        "codigo_estudiante": matricula.estudiante.codigo_estudiante,
        "id_asignatura": matricula.asignatura_id,
        "codigo_asignatura": matricula.asignatura.codigo_asignatura,
        "periodo": matricula.periodo.descripcion,
    }

    matricula.delete()
    logger.info("coordinador_desmatricular", {
        "coordinador": getattr(coord, "codigo_coordinador", None),
        **payload,
    })

    return Response({
        "detail": "Estudiante desmatriculado correctamente",
        "matricula": payload,
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_asignatura_avance_view(request):
    """Resumen de avance por asignatura para el coordinador.
    Devuelve promedios por RA y consolidado del curso a partir de las notas registradas.

    Query params:
      - codigo_asignatura (requerido)
      - periodo (opcional) para filtrar matrículas por periodo académico (descripcion)

    Respuesta:
    {
      codigo_asignatura, periodo, total_estudiantes,
      total: { avg: number, ok_pct: number, low_pct: number, coverage_avg: number, threshold: 3.0 },
      ras: [ { id_ra, descripcion, porcentaje_ra, avg: number, ok_pct: number, low_pct: number, coverage_avg: number } ]
    }
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    codigo = request.query_params.get("codigo_asignatura")
    if not codigo:
        return Response({"detail": "codigo_asignatura requerido"}, status=status.HTTP_400_BAD_REQUEST)
    periodo_desc = request.query_params.get("periodo")

    asig = Asignatura.objects.filter(codigo_asignatura=codigo).first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    mats = Matricula.objects.filter(asignatura=asig)
    if periodo_desc:
        mats = mats.filter(periodo__descripcion=periodo_desc)
    mats = list(mats)
    total_est = len(mats)

    # RAs y relaciones actividad-RA
    ras = list(ResultadoDeAprendizaje.objects.filter(asignatura=asig).order_by("id_ra"))
    rels_by_ra: dict[int, list[RaActividad]] = {r.id_ra: [] for r in ras}
    for rel in RaActividad.objects.filter(ra__asignatura=asig).select_related("actividad", "ra"):
        rels_by_ra.setdefault(rel.ra_id, []).append(rel)

    # Notas por (matricula, rel)
    notas = list(NotasActividad.objects.filter(matricula__in=mats, ra_actividad__ra__asignatura=asig)
                 .select_related("ra_actividad", "matricula"))
    notas_map: dict[tuple[int, int], NotasActividad] = {}
    for n in notas:
        notas_map[(n.matricula_id, n.ra_actividad_id)] = n

    threshold = 3.0
    ras_out = []

    # Para consolidado por curso por estudiante
    w_ra = {r.id_ra: float(r.porcentaje_ra) / 100.0 for r in ras}

    # Precalcular por estudiante: nota progresiva por RA y cobertura
    student_ra_prog: dict[tuple[int, int], tuple[float|None, float]] = {}
    for m in mats:
        for r in ras:
            rels = rels_by_ra.get(r.id_ra, [])
            sum_w = 0.0
            sum_wg = 0.0
            acc = 0.0
            for rel in rels:
                w = float(rel.porcentaje_ra_actividad) / 100.0
                sum_w += w
                n = notas_map.get((m.id_matricula, rel.id_ra_actividad))
                nota = float(n.nota_ra_actividad) if (n and n.nota_ra_actividad is not None) else None
                if nota is not None:
                    sum_wg += w
                    acc += nota * w
            prog = (acc / sum_wg) if sum_wg > 0 else None
            coverage = (sum_wg / sum_w) if sum_w > 0 else 0.0
            student_ra_prog[(m.id_matricula, r.id_ra)] = (prog, coverage)

    # Agregar métricas por RA
    for r in ras:
        vals = []
        oks = 0
        cov_acc = 0.0
        for m in mats:
            prog, cov = student_ra_prog.get((m.id_matricula, r.id_ra), (None, 0.0))
            if prog is not None:
                vals.append(prog)
                if prog >= threshold:
                    oks += 1
            cov_acc += cov
        avg = (sum(vals) / len(vals)) if vals else None
        total = total_est if total_est > 0 else 1
        ok_pct = (oks / total) * 100.0
        low_pct = 100.0 - ok_pct
        coverage_avg = (cov_acc / total)
        ras_out.append({
            "id_ra": r.id_ra,
            "numero_ra": r.numero_ra,
            "descripcion": r.descripcion,
            "porcentaje_ra": float(r.porcentaje_ra),
            "avg": round(avg, 2) if avg is not None else None,
            "ok_pct": round(ok_pct, 2),
            "low_pct": round(low_pct, 2),
            "coverage_avg": round(coverage_avg, 4),
        })

    # Consolidado total por estudiante (promedio progresivo ponderado por RA)
    course_vals = []
    course_oks = 0
    course_cov_acc = 0.0
    for m in mats:
        acc = 0.0
        acc_w = 0.0
        cov_w = 0.0
        for r in ras:
            prog, cov = student_ra_prog.get((m.id_matricula, r.id_ra), (None, 0.0))
            w = w_ra.get(r.id_ra, 0.0)
            if prog is not None:
                acc += prog * w
            # Para cobertura ponderada por RA
            cov_w += cov * w
            acc_w += w
        # No normalizamos por acc_w para mantener compatibilidad con total.progressive de course_grade_view
        course_vals.append(acc)
        course_cov_acc += cov_w
        if acc >= threshold:
            course_oks += 1

    total_avg = (sum(course_vals) / len(course_vals)) if course_vals else None
    total_ok_pct = (course_oks / (total_est if total_est > 0 else 1)) * 100.0
    total_low_pct = 100.0 - total_ok_pct
    total_cov_avg = (course_cov_acc / (total_est if total_est > 0 else 1))

    return Response({
        "codigo_asignatura": codigo,
        "periodo": periodo_desc,
        "total_estudiantes": total_est,
        "total": {
            "avg": round(total_avg, 2) if total_avg is not None else None,
            "ok_pct": round(total_ok_pct, 2),
            "low_pct": round(total_low_pct, 2),
            "coverage_avg": round(total_cov_avg, 4),
            "threshold": threshold,
        },
        "ras": ras_out,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_estudiante_perfil_view(request, id_estudiante: int):
    """
    Vista detallada del estudiante para el coordinador.
    Devuelve información personal y progreso en todas sus asignaturas.
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    
    # Obtener estudiante
    try:
        estudiante = Estudiante.objects.select_related(
            'tipo_documento'
        ).get(id_estudiante=id_estudiante)
    except Estudiante.DoesNotExist:
        return Response({"detail": "Estudiante no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    detected_program = _infer_program_for_coordinador(coord)
    if not detected_program:
        return Response({"detail": "No se pudo determinar el programa del coordinador"}, status=status.HTTP_403_FORBIDDEN)
    
    # Obtener todas las matrículas del estudiante
    matriculas = Matricula.objects.filter(
        estudiante=estudiante,
        asignatura__programa=detected_program,
    ).select_related(
        'asignatura', 'asignatura__docente', 'asignatura__programa', 'periodo'
    ).order_by('-periodo__fecha_inicio')

    if not matriculas.exists():
        # Si el estudiante tiene matrículas, pero no en el programa del coordinador, se mantiene restricción.
        if Matricula.objects.filter(estudiante=estudiante).exists():
            return Response({"detail": "Estudiante fuera del alcance de tu programa"}, status=status.HTTP_403_FORBIDDEN)

        # Caso estudiante nuevo sin matrículas: devolver perfil básico sin historial académico.
        inferred_program = _student_program_from_code(estudiante.codigo_estudiante)
        programa_nombre = inferred_program.nombre if inferred_program else detected_program.nombre

        info_personal = {
            "id_estudiante": estudiante.id_estudiante,
            "codigo_estudiante": estudiante.codigo_estudiante,
            "nombre": estudiante.nombre,
            "apellido": estudiante.apellido,
            "nombre_completo": f"{estudiante.nombre} {estudiante.apellido}",
            "correo": estudiante.correo,
            "tipo_documento": estudiante.tipo_documento.descripcion if estudiante.tipo_documento else None,
            "num_documento": estudiante.num_documento,
            "programa": programa_nombre,
            "jornada": estudiante.jornada,
        }

        return Response({
            "estudiante": info_personal,
            "periodos": [],
            "estadisticas": {
                "total_asignaturas": 0,
                "promedio_general": None,
                "asignaturas_aprobadas": 0,
                "asignaturas_reprobadas": 0,
            },
        }, status=status.HTTP_200_OK)
    
    # Obtener programa del estudiante (de su primera matrícula)
    programa_nombre = None
    if matriculas.exists():
        primera_mat = matriculas.first()
        if primera_mat and primera_mat.asignatura and primera_mat.asignatura.programa:
            programa_nombre = primera_mat.asignatura.programa.nombre

    # Fallback: inferir programa desde código de estudiante (codigo-programa)
    if not programa_nombre:
        inferred_program = _student_program_from_code(estudiante.codigo_estudiante)
        if inferred_program:
            programa_nombre = inferred_program.nombre

    # Fallback final: usar programa del coordinador que consulta
    if not programa_nombre:
        coord_program = _infer_program_for_coordinador(coord)
        if coord_program:
            programa_nombre = coord_program.nombre
    
    # Información personal
    info_personal = {
        "id_estudiante": estudiante.id_estudiante,
        "codigo_estudiante": estudiante.codigo_estudiante,
        "nombre": estudiante.nombre,
        "apellido": estudiante.apellido,
        "nombre_completo": f"{estudiante.nombre} {estudiante.apellido}",
        "correo": estudiante.correo,
        "tipo_documento": estudiante.tipo_documento.descripcion if estudiante.tipo_documento else None,
        "num_documento": estudiante.num_documento,
        "programa": programa_nombre,
        "jornada": estudiante.jornada,
    }
    
    # Agrupar por período
    periodos_dict = {}
    # Lista para recopilar todas las notas calculadas (para las estadísticas)
    todas_notas_calculadas = []
    
    for mat in matriculas:
        periodo_id = mat.periodo_id
        periodo_desc = mat.periodo.descripcion
        
        if periodo_id not in periodos_dict:
            periodos_dict[periodo_id] = {
                "id_periodo": periodo_id,
                "descripcion": periodo_desc,
                "fecha_inicio": mat.periodo.fecha_inicio,
                "fecha_finalizacion": mat.periodo.fecha_finalizacion,
                "asignaturas": []
            }
        
        # Calcular progreso de la asignatura
        asignatura = mat.asignatura
        ras = ResultadoDeAprendizaje.objects.filter(asignatura=asignatura)
        
        total_strict = 0.0
        total_prog = 0.0
        total_coverage = 0.0
        sum_peso_ras = 0.0
        
        ras_data = []
        
        for ra in ras:
            peso_ra = float(ra.porcentaje_ra) / 100.0
            sum_peso_ras += peso_ra
            
            # Obtener actividades del RA
            rels = RaActividad.objects.filter(ra=ra).select_related('actividad')
            
            sum_w = 0.0
            sum_w_graded = 0.0
            acc_strict = 0.0
            actividades_calificadas = 0
            total_actividades = rels.count()
            
            for rel in rels:
                w = float(rel.porcentaje_ra_actividad) / 100.0
                sum_w += w
                
                nota_obj = NotasActividad.objects.filter(
                    matricula=mat, ra_actividad=rel
                ).first()
                
                if nota_obj and nota_obj.nota_ra_actividad is not None:
                    nota = float(nota_obj.nota_ra_actividad)
                    sum_w_graded += w
                    acc_strict += nota * w
                    actividades_calificadas += 1
            
            ra_strict = acc_strict
            ra_prog = (acc_strict / sum_w_graded) if sum_w_graded > 0 else None
            coverage = (sum_w_graded / sum_w) if sum_w > 0 else 0.0
            
            total_strict += ra_strict * peso_ra
            if ra_prog is not None:
                total_prog += ra_prog * peso_ra
            total_coverage += coverage * peso_ra
            
            ras_data.append({
                "id_ra": ra.id_ra,
                "numero_ra": ra.numero_ra,
                "descripcion": ra.descripcion,
                "porcentaje_ra": float(ra.porcentaje_ra),
                "nota_strict": round(ra_strict, 2) if ra_strict else 0,
                "nota_progressive": round(ra_prog, 2) if ra_prog else None,
                "coverage": round(coverage * 100, 1),
                "actividades_calificadas": actividades_calificadas,
                "total_actividades": total_actividades,
            })
        
        # Normalizar si los pesos no suman exactamente 100%
        if sum_peso_ras > 0:
            total_strict = total_strict / sum_peso_ras
            total_prog = total_prog / sum_peso_ras
            total_coverage = total_coverage / sum_peso_ras
        
        # Determinar estado
        estado = "aprobado" if total_strict >= 3.0 else "reprobado"
        if total_coverage < 0.5:
            estado = "en_progreso"
        
        # Recopilar nota calculada para estadísticas (usar total_strict como nota definitiva)
        # Solo incluir si hay cobertura (al menos 50% de actividades calificadas)
        if total_coverage >= 0.5:
            todas_notas_calculadas.append(total_strict)
        
        periodos_dict[periodo_id]["asignaturas"].append({
            "id_asignatura": asignatura.id_asignatura,
            "codigo_asignatura": asignatura.codigo_asignatura,
            "nombre": asignatura.nombre,
            "docente": f"{asignatura.docente.nombre} {asignatura.docente.apellido}",
            "nota_final": float(mat.nota_final) if mat.nota_final else None,
            "nota_strict": round(total_strict, 2),
            "nota_progressive": round(total_prog, 2),
            "coverage": round(total_coverage * 100, 1),
            "estado": estado,
            "ras": ras_data,
        })
    
    # Convertir a lista ordenada por período
    periodos_list = sorted(
        periodos_dict.values(), 
        key=lambda x: x['fecha_inicio'], 
        reverse=True
    )
    
    # Calcular estadísticas generales basadas en las notas calculadas
    estadisticas = {
        "total_asignaturas": matriculas.count(),
        "promedio_general": round(sum(todas_notas_calculadas) / len(todas_notas_calculadas), 2) if todas_notas_calculadas else None,
        "asignaturas_aprobadas": sum(1 for n in todas_notas_calculadas if n >= 3.0),
        "asignaturas_reprobadas": sum(1 for n in todas_notas_calculadas if n < 3.0),
        "tasa_aprobacion": round(sum(1 for n in todas_notas_calculadas if n >= 3.0) / len(todas_notas_calculadas) * 100, 1) if todas_notas_calculadas else None,
    }
    
    return Response({
        "estudiante": info_personal,
        "estadisticas": estadisticas,
        "periodos": periodos_list,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_import_matriculados_view(request):
    """Importa matriculados desde CSV o Excel con BULK INSERT optimizado. Solo coordinador.
    Columnas mínimas requeridas: codigo_estudiante
    Si no se envían asignaturas seleccionadas en el formulario, también requiere codigo_asignatura.
    Si no se envía periodo en el archivo, usa por defecto el último período académico disponible.
    Recomendado: incluir grupo para desambiguar asignaturas con mismo código.
    Soporta: .csv, .xlsx, .xls
    Campos aceptados (sinónimos):
      - codigo_estudiante | estudiante | code
      - codigo_asignatura | asignatura | curso
                        (si no viene en columna, se intenta inferir del nombre del archivo: ..._801126C)
            - grupo
            - semestre (si existe, tiene prioridad para decidir el periodo)
            - periodo | periodo_academico (opcional)
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo requerido (CSV o Excel)"}, status=status.HTTP_400_BAD_REQUEST)
    original_fname = getattr(f, 'name', '')
    fname = original_fname.lower()
    inferred_codigo_asignatura = _extract_codigo_asignatura_from_filename(original_fname)
    
    # Validar extensión del archivo
    if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
        return Response({"detail": "Se requiere archivo .csv, .xlsx o .xls"}, status=status.HTTP_400_BAD_REQUEST)
    
    size = int(getattr(f, "size", 0) or 0)
    if size > 10 * 1024 * 1024:  # Aumentado a 10MB para Excel
        return Response({"detail": "El archivo supera 10MB"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Leer archivo con pandas (soporta CSV y Excel)
    df = _read_imported_file(f)
    if df is None or df.empty:
        return Response(
            {"detail": "No se pudo leer el archivo o está vacío. Intente con formato .xlsx o .csv UTF-8."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Normalizar nombres de columnas
    df = _normalize_dataframe_columns(df)
    
    # OPTIMIZACIÓN: Pre-cargar todos los datos en memoria
    estudiantes_map = {e.codigo_estudiante: e for e in Estudiante.objects.all()}
    asignaturas_por_codigo = {}
    for a in Asignatura.objects.all():
        asignaturas_por_codigo.setdefault(a.codigo_asignatura, []).append(a)
    periodos_qs = PeriodoAcademico.objects.all()
    valid_periodos = [p for p in periodos_qs if _is_valid_periodo_description(p.descripcion)]
    periodos_map = _build_periodos_lookup(valid_periodos)
    latest_period = sorted(valid_periodos, key=lambda p: (p.fecha_inicio, p.id_periodo), reverse=True)[0] if valid_periodos else None

    # Asignaturas seleccionadas desde el cliente para aplicar la importación a una o varias materias
    selected_asignaturas = []
    selected_ids_raw = request.POST.getlist("id_asignaturas[]") or request.POST.getlist("id_asignaturas")
    if selected_ids_raw:
        selected_ids = []
        for raw_id in selected_ids_raw:
            try:
                selected_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue

        if not selected_ids:
            return Response({"detail": "No se recibieron asignaturas válidas para la importación"}, status=status.HTTP_400_BAD_REQUEST)

        selected_asignaturas = list(Asignatura.objects.filter(id_asignatura__in=selected_ids))
        if not selected_asignaturas:
            return Response({"detail": "Las asignaturas seleccionadas no existen"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Pre-cargar matrículas existentes para evitar duplicados
    existing_matriculas = set(
        Matricula.objects.values_list('estudiante_id', 'periodo_id', 'asignatura_id')
    )
    existing_matriculas_map = {
        (m.estudiante_id, m.periodo_id, m.asignatura_id): m
        for m in Matricula.objects.select_related('estudiante', 'periodo', 'asignatura').all()
    }
    
    created = 0
    updated = 0
    existing = 0
    errors = []
    max_rows = 5000
    to_create = []
    to_update = []
    enrollments_for_emails = []
    created_keys = set()
    
    # Helper function para acceder a columnas de pandas de forma segura
    def get_col(row, *col_names):
        """Intenta obtener el valor de la primera columna que existe y no es None/NaN"""
        for col in col_names:
            if col in row.index:
                val = row[col]
                if pd.notna(val):
                    return val
        return None
    
    for idx, row in df.iterrows():
        row_num = idx + 2  # +2 porque índice empieza en 0 y hay header
        if idx >= max_rows:
            errors.append({"row": row_num, "error": f"Se excede límite de {max_rows} filas"})
            break
        
        # Extraer campos con sinónimos
        cod_est = get_col(row, "codigo_estudiante", "codigo", "cod_estudiante", "estudiante", "code", "matricula")
        cod_asig = get_col(row, "codigo_asignatura", "asignatura", "curso")
        grupo = get_col(row, "grupo")
        semestre_desc = get_col(row, "semestre")
        periodo_desc = get_col(row, "periodo", "periodo_academico", "periodo academico", "periodo académico")
        raw_nota_final = get_col(row, "nota_final", "nota", "calificacion")
        
        # Limpiar strings
        if cod_est: cod_est = str(cod_est).strip()[:50]
        if cod_asig: cod_asig = str(cod_asig).strip()[:50]
        if grupo: grupo = str(grupo).strip()[:20]
        if semestre_desc: semestre_desc = str(semestre_desc).strip()[:100]
        if periodo_desc: periodo_desc = str(periodo_desc).strip()[:100]

        if semestre_desc:
            periodo_desc = semestre_desc

        if not cod_asig and inferred_codigo_asignatura:
            cod_asig = inferred_codigo_asignatura
        
        requires_asignatura_in_file = not selected_asignaturas
        if not cod_est or (requires_asignatura_in_file and not cod_asig):
            if requires_asignatura_in_file:
                errors.append({"row": row_num, "error": "Faltan columnas requeridas (codigo_estudiante, codigo_asignatura)"})
            else:
                errors.append({"row": row_num, "error": "Faltan columnas requeridas (codigo_estudiante)"})
            continue
        
        est = estudiantes_map.get(cod_est)
        if not est:
            errors.append({"row": row_num, "error": f"Estudiante no encontrado: {cod_est}"})
            continue
        
        row_asignaturas = []
        if selected_asignaturas:
            row_asignaturas = selected_asignaturas
        else:
            asig = None
            candidatos = asignaturas_por_codigo.get(cod_asig, [])
            if grupo:
                candidatos = [a for a in candidatos if str(getattr(a, "grupo", "") or "").strip() == grupo]

            if len(candidatos) == 1:
                asig = candidatos[0]
            elif len(candidatos) > 1:
                if grupo:
                    errors.append({"row": row_num, "error": f"Asignatura ambigua ({cod_asig}, grupo {grupo}). Selecciona una asignatura específica en el formulario de matriculados."})
                else:
                    errors.append({"row": row_num, "error": f"Asignatura ambigua ({cod_asig}). Debes indicar grupo."})
                continue
            if not asig:
                detalle = f"{cod_asig} grupo {grupo}" if grupo else cod_asig
                errors.append({"row": row_num, "error": f"Asignatura no encontrada: {detalle}"})
                continue
            row_asignaturas = [asig]
        
        if periodo_desc:
            per = _find_periodo_by_desc(periodos_map, periodo_desc)
            if not per:
                errors.append({"row": row_num, "error": f"Periodo no encontrado: {periodo_desc}"})
                continue
        else:
            per = latest_period
            if not per:
                errors.append({"row": row_num, "error": "No existe un período académico para usar por defecto"})
                continue

        nota_final = None
        if raw_nota_final not in (None, ""):
            try:
                nota_final = float(raw_nota_final)
            except (TypeError, ValueError):
                errors.append({"row": row_num, "error": f"nota_final inválida: {raw_nota_final}"})
                continue
            if nota_final < 0 or nota_final > 5:
                errors.append({"row": row_num, "error": f"nota_final fuera de rango: {nota_final}"})
                continue
        
        for asig in row_asignaturas:
            # Verificar si ya existe
            key = (est.id_estudiante, per.id_periodo, asig.id_asignatura)
            if key in created_keys:
                existing += 1
                continue
            existing_matricula = existing_matriculas_map.get(key)
            if existing_matricula:
                changed = False
                if raw_nota_final not in (None, "") and float(existing_matricula.nota_final or 0) != float(nota_final if nota_final is not None else existing_matricula.nota_final or 0):
                    existing_matricula.nota_final = nota_final
                    changed = True

                if changed:
                    to_update.append(existing_matricula)
                    updated += 1
                else:
                    existing += 1
                continue

            # Agregar a lista de creación y marcar como existente para evitar duplicados en el mismo archivo
            to_create.append(Matricula(
                estudiante=est,
                periodo=per,
                asignatura=asig,
                nota_final=nota_final
            ))
            enrollments_for_emails.append({
                "estudiante_nombre": f"{est.nombre} {est.apellido}".strip(),
                "estudiante_correo": est.correo,
                "asignatura_nombre": asig.nombre,
                "asignatura_codigo": asig.codigo_asignatura,
                "grupo": asig.grupo,
                "sede": asig.sede,
                "periodo": per.descripcion,
                "programa": getattr(asig.programa, "nombre", None),
                "docente": f"{getattr(asig.docente, 'nombre', '')} {getattr(asig.docente, 'apellido', '')}".strip(),
            })
            existing_matriculas.add(key)
            existing_matriculas_map[key] = to_create[-1]
            created_keys.add(key)
            created += 1
    
    # BULK INSERT con transacción atómica
    if to_create:
        try:
            with transaction.atomic():
                Matricula.objects.bulk_create(to_create, batch_size=500, ignore_conflicts=True)
        except Exception as e:
            errors.append({"error": f"Error en inserción masiva: {str(e)}"})
            created = 0

    if to_update:
        try:
            with transaction.atomic():
                Matricula.objects.bulk_update(to_update, ["nota_final"], batch_size=500)
        except Exception as e:
            errors.append({"error": f"Error en actualización masiva: {str(e)}"})
            updated = 0
    
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    notified = 0
    if created > 0 and enrollments_for_emails:
        try:
            notified = _send_bulk_enrollment_emails_async(enrollments_for_emails)
        except Exception as e:
            logger.error(f"No fue posible programar correos de matricula: {str(e)}")

    payload = {"created": created, "updated": updated, "existing": existing, "errors": errors, "notified": notified}
    try:
        logger.info("import_matriculados: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": getattr(f, "name", None),
            **{k: payload[k] for k in ("created", "updated", "existing")},
            "errors_count": len(errors)
        })
        # Persistir auditoría mínima
        ImportAudit.objects.create(
            coordinador=coord,
            kind="matriculados",
            filename=fname,
            created_count=created,
            existing_count=existing,
            errors_count=len(errors),
        )
    except Exception:
        pass
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_download_template_view(request, filename: str):
    """Descarga de plantillas de importación para coordinador."""
    coord, err = _require_coordinador(request)
    if err:
        return err

    safe_name = os.path.basename(str(filename or "")).strip()
    if safe_name not in ALLOWED_IMPORT_TEMPLATES:
        return Response({"detail": "Plantilla no permitida"}, status=status.HTTP_404_NOT_FOUND)

    template_path = settings.BASE_DIR / "plantillas" / safe_name
    if not template_path.exists() or not template_path.is_file():
        return Response({"detail": "Plantilla no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    try:
        response = FileResponse(open(template_path, "rb"), as_attachment=True, filename=safe_name)
        response["Cache-Control"] = "no-store"
        logger.info("download_template: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": safe_name,
        })
        return response
    except Exception:
        return Response({"detail": "No se pudo descargar la plantilla"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    detected_program = _infer_program_for_coordinador(coord)
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def docente_import_estudiantes_view(request, codigo_asignatura: str):
    """Importa estudiantes matriculados desde CSV del SIRA. Solo docente puede importar para su curso.
    CSV esperado (cabeceras mínimas): codigo_estudiante, (periodo opcional - se usa periodo actual si no se especifica)
    Campos aceptados:
      - codigo_estudiante | estudiante | code | matricula
      - periodo | periodo_academico (opcional)
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    if tok.get("rol") != "docente":
        return Response({"detail": "Solo docentes pueden importar estudiantes"}, status=status.HTTP_403_FORBIDDEN)
    
    docente_id = tok.get("id")
    # Verificar que el docente dicta el curso
    asignatura = Asignatura.objects.filter(
        codigo_asignatura=codigo_asignatura,
        docente_id=docente_id
    ).first()
    
    if not asignatura:
        return Response({"detail": "No tienes permisos para importar estudiantes en este curso"}, status=status.HTTP_403_FORBIDDEN)
    
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo CSV requerido como 'file'"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validar archivo
    fname = getattr(f, 'name', '')
    ctype = (getattr(f, 'content_type', '') or '').lower()
    if not fname.lower().endswith('.csv') and 'csv' not in ctype:
        return Response({"detail": "Se requiere archivo .csv"}, status=status.HTTP_400_BAD_REQUEST)
    
    size = int(getattr(f, "size", 0) or 0)
    if size > 5 * 1024 * 1024:
        return Response({"detail": "El archivo supera 5MB"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Obtener periodo actual o más reciente
    periodo_actual = PeriodoAcademico.objects.filter(
        fecha_inicio__lte=datetime.date.today(),
        fecha_fin__gte=datetime.date.today()
    ).first()
    
    if not periodo_actual:
        periodo_actual = PeriodoAcademico.objects.order_by('-fecha_inicio').first()
    
    if not periodo_actual:
        return Response({"detail": "No hay periodo académico configurado"}, status=status.HTTP_400_BAD_REQUEST)

    periodos_lookup = _build_periodos_lookup(PeriodoAcademico.objects.all())
    
    # Lectura CSV
    try:
        text_stream = io.TextIOWrapper(f.file, encoding="utf-8-sig")
    except Exception:
        content = f.read()
        text_stream = io.StringIO(content.decode("utf-8", errors="ignore"))
    
    reader = csv.DictReader(text_stream)
    created = 0
    existing = 0
    errors = []
    rownum = 1
    max_rows = 1000
    
    for raw in reader:
        if rownum > max_rows:
            errors.append({"row": rownum, "error": f"Se excede límite de {max_rows} filas"})
            break
        rownum += 1
        
        d = {(k or "").strip().lower(): ((v.strip() if isinstance(v, str) else v)) for k, v in (raw or {}).items()}
        
        # Sanitizar
        for k in list(d.keys()):
            v = d[k]
            if isinstance(v, str):
                d[k] = v.replace('\x00', '').strip()[:255]
        
        cod_est = d.get("codigo_estudiante") or d.get("estudiante") or d.get("code") or d.get("matricula")
        periodo_desc = d.get("periodo") or d.get("periodo_academico")
        
        if not cod_est:
            errors.append({"row": rownum, "error": "Falta codigo_estudiante"})
            continue
        
        est = Estudiante.objects.filter(codigo_estudiante=cod_est).first()
        if not est:
            errors.append({"row": rownum, "error": f"Estudiante no encontrado: {cod_est}"})
            continue
        
        # Usar periodo especificado o periodo actual
        periodo_usar = periodo_actual
        if periodo_desc:
            per = _find_periodo_by_desc(periodos_lookup, periodo_desc)
            if per:
                periodo_usar = per
            else:
                errors.append({"row": rownum, "error": f"Periodo no encontrado: {periodo_desc}"})
                continue
        
        obj, was_created = Matricula.objects.get_or_create(
            estudiante=est,
            periodo=periodo_usar,
            asignatura=asignatura,
            defaults={"nota_final": None}
        )
        
        if was_created:
            created += 1
        else:
            existing += 1
    
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    
    return Response({
        "created": created,
        "existing": existing,
        "errors": errors,
        "summary": f"Se matricularon {created} nuevos estudiantes. {existing} ya estaban matriculados."
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def docente_buscar_estudiante_view(request):
    """
    Permite al docente buscar un estudiante por código antes de agregarlo.
    Query params: codigo_estudiante (formato: codigo o codigo-programa)
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    if tok.get("rol") != "docente":
        return Response({"detail": "Solo docentes pueden buscar estudiantes"}, status=status.HTTP_403_FORBIDDEN)
    
    # Obtener código del estudiante (puede incluir programa: codigo-programa)
    codigo_completo = request.query_params.get("codigo_estudiante", "").strip()
    
    if not codigo_completo:
        return Response({"detail": "El código del estudiante es requerido"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Separar código de estudiante y código de programa si vienen juntos
    if "-" in codigo_completo:
        codigo_estudiante, codigo_programa = codigo_completo.split("-", 1)
    else:
        codigo_estudiante = codigo_completo
        codigo_programa = None
    
    # Buscar estudiante
    estudiante = Estudiante.objects.filter(codigo_estudiante=codigo_estudiante).first()
    
    if not estudiante:
        return Response(
            {"detail": f"No se encontró un estudiante con código {codigo_estudiante}"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({
        "ok": True,
        "estudiante": {
            "id": estudiante.id_estudiante,
            "codigo": estudiante.codigo_estudiante,
            "codigo_programa": codigo_programa,
            "nombre": estudiante.nombre,
            "apellido": estudiante.apellido,
            "correo": estudiante.correo,
            "documento": estudiante.num_documento,
            "tipo_documento": estudiante.tipo_documento.descripcion if estudiante.tipo_documento else "N/A"
        }
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def docente_agregar_estudiante_view(request, codigo_asignatura: str):
    """
    Agregar un estudiante individual a una asignatura por su código.
    Solo el docente puede agregar estudiantes a su curso.
    Se envía un email al estudiante y se crea la matrícula.
    
    Request Body:
        - codigo_estudiante (str): Código del estudiante a agregar
    
    Response:
        - 201: Estudiante agregado y notificado
        - 400: Estudiante ya matriculado o no encontrado
    """
    logger = logging.getLogger(__name__)
    
    token = _bearer_token(request)
    if not token:
        logger.error("No se encontró token de autenticación")
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception as e:
        logger.error(f"Error al decodificar token: {str(e)}")
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    if tok.get("rol") != "docente":
        logger.error(f"Usuario no es docente: rol={tok.get('rol')}")
        return Response({"detail": "Solo docentes pueden agregar estudiantes"}, status=status.HTTP_403_FORBIDDEN)
    
    docente_id = tok.get("id")
    
    # Verificar que el docente dicta el curso
    asignatura = Asignatura.objects.filter(
        codigo_asignatura=codigo_asignatura,
        docente_id=docente_id
    ).select_related("docente", "programa").first()
    
    if not asignatura:
        logger.error(f"Docente {docente_id} no dicta la asignatura {codigo_asignatura}")
        return Response(
            {"detail": "No tienes permisos para agregar estudiantes en este curso"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Obtener código del estudiante (puede incluir programa: codigo-programa)
    codigo_completo = request.data.get("codigo_estudiante", "").strip()
    
    if not codigo_completo:
        logger.error("No se proporcionó código de estudiante")
        return Response({"detail": "El código del estudiante es requerido"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Separar código de estudiante y código de programa si vienen juntos
    if "-" in codigo_completo:
        codigo_estudiante, codigo_programa = codigo_completo.split("-", 1)
        
        # Validar que el código del programa coincida con el programa de la asignatura
        if codigo_programa != asignatura.programa.codigo_programa:
            logger.warning(f"Programa no coincide - estudiante: {codigo_programa}, asignatura: {asignatura.programa.codigo_programa}")
            return Response(
                {"detail": f"El estudiante pertenece al programa {codigo_programa}, pero este curso es del programa {asignatura.programa.codigo_programa}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        codigo_estudiante = codigo_completo
    
    # Buscar estudiante
    estudiante = Estudiante.objects.filter(codigo_estudiante=codigo_estudiante).first()
    
    if not estudiante:
        logger.error(f"No se encontró estudiante con código {codigo_estudiante}")
        return Response(
            {"detail": f"No se encontró un estudiante con código {codigo_estudiante}"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Obtener periodo actual o más reciente
    periodo_actual = PeriodoAcademico.objects.filter(
        fecha_inicio__lte=datetime.date.today(),
        fecha_finalizacion__gte=datetime.date.today()
    ).first()
    
    if not periodo_actual:
        periodo_actual = PeriodoAcademico.objects.order_by('-fecha_inicio').first()
    
    if not periodo_actual:
        logger.error("No hay periodo académico configurado")
        return Response(
            {"detail": "No hay periodo académico configurado"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verificar si ya está matriculado
    matricula_existente = Matricula.objects.filter(
        estudiante=estudiante,
        periodo=periodo_actual,
        asignatura=asignatura
    ).first()
    
    if matricula_existente:
        logger.warning(f"Estudiante {estudiante.nombre} ya está matriculado en {asignatura.nombre}")
        return Response(
            {"detail": f"{estudiante.nombre} {estudiante.apellido} ya está matriculado en este curso"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Crear matrícula
    with transaction.atomic():
        matricula = Matricula.objects.create(
            estudiante=estudiante,
            periodo=periodo_actual,
            asignatura=asignatura,
            nota_final=None
        )
        
        logger.info(f"Estudiante {estudiante.codigo_estudiante} agregado a {asignatura.codigo_asignatura}")
        
        # Enviar email al estudiante
        try:
            subject = f"Inscripción en {asignatura.nombre}"
            message = (
                f"Hola {estudiante.nombre},\n\n"
                f"Has sido agregado a la asignatura {asignatura.nombre} "
                f"(código: {asignatura.codigo_asignatura}) "
                f"dictada por {asignatura.docente.nombre} {asignatura.docente.apellido}.\n\n"
                f"Periodo académico: {periodo_actual.descripcion}\n"
                f"Programa: {asignatura.programa.nombre if asignatura.programa else 'N/A'}\n\n"
                f"Puedes acceder al curso desde tu perfil en el sistema.\n\n"
                f"Saludos,\n"
                f"Sistema de Gestión Académica"
            )
            
            email_sent = send_email_with_logging(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[estudiante.correo],
                logger=logger,
                context="matricula_individual",
            )
        except Exception as e:
            logger.error(f"Error enviando email: {str(e)}")
            email_sent = False
    
    return Response({
        "ok": True,
        "id_matricula": matricula.id_matricula,
        "estudiante": {
            "id": estudiante.id_estudiante,
            "codigo": estudiante.codigo_estudiante,
            "nombre": estudiante.nombre,
            "apellido": estudiante.apellido,
            "correo": estudiante.correo
        },
        "email_sent": email_sent,
        "message": (
            f"{estudiante.nombre} {estudiante.apellido} ha sido agregado exitosamente. "
            + (f"Se envió una notificación a {estudiante.correo}" if email_sent else "No se pudo enviar la notificación por correo en este momento")
        )
    }, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_import_docentes_view(request):
    """Importa docentes desde CSV o Excel con BULK INSERT optimizado. Solo coordinador.
    Columnas mínimas requeridas: codigo_docente, nombre, apellido, correo, tipo_documento, num_documento
    Opcionales: num_telefono, password (si no se provee se genera aleatoria).
    Soporta: .csv, .xlsx, .xls
    Sinónimos aceptados:
      - codigo_docente | docente | codigo
      - nombre | first_name
      - apellido | last_name
      - correo | email
      - tipo_documento | tipo_doc | doc_type
      - num_documento | documento | doc_number
      - num_telefono | telefono | phone
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo requerido (CSV o Excel)"}, status=status.HTTP_400_BAD_REQUEST)
    fname = getattr(f, 'name', '').lower()
    
    # Validar extensión del archivo
    if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
        return Response({"detail": "Se requiere archivo .csv, .xlsx o .xls"}, status=status.HTTP_400_BAD_REQUEST)
    
    size = int(getattr(f, "size", 0) or 0)
    if size > 10 * 1024 * 1024:  # Aumentado a 10MB para Excel
        return Response({"detail": "El archivo supera 10MB"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Leer archivo con pandas (soporta CSV y Excel)
    df = _read_imported_file(f)
    if df is None or df.empty:
        return Response(
            {"detail": "No se pudo leer el archivo o está vacío. Intente con formato .xlsx o .csv UTF-8."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Normalizar nombres de columnas
    df.columns = df.columns.str.strip().str.lower()
    
    # OPTIMIZACIÓN: Pre-cargar datos existentes
    tipos_documento_map_desc_norm = {}
    for td in TipoDocumento.objects.all():
        tipos_documento_map_desc_norm[_normalize_text(td.descripcion)] = td

    # Mantener compatibilidad con abreviaturas usadas en estudiantes (C.C., C.R., T.I., PPT)
    allowed_tipo_doc_aliases = {
        "cc": "cedula de ciudadania",
        "c.c": "cedula de ciudadania",
        "c.c.": "cedula de ciudadania",
        "ce": "cedula de extranjeria",
        "c.e": "cedula de extranjeria",
        "c.e.": "cedula de extranjeria",
        "ti": "tarjeta de identidad",
        "t.i": "tarjeta de identidad",
        "t.i.": "tarjeta de identidad",
        "pas": "pasaporte",
        "pasaporte": "pasaporte",
        "rc": "registro civil",
        "cr": "registro civil",
        "c.r": "registro civil",
        "c.r.": "registro civil",
        "ppt": "permiso por proteccion temporal",
        "p.p.t": "permiso por proteccion temporal",
        "p.p.t.": "permiso por proteccion temporal",
        "nuip": "nuip",
    }

    ppt_norm = _normalize_text("permiso por proteccion temporal")
    if ppt_norm not in tipos_documento_map_desc_norm:
        tipo_ppt = TipoDocumento.objects.create(descripcion="Permiso por Protección Temporal")
        tipos_documento_map_desc_norm[_normalize_text(tipo_ppt.descripcion)] = tipo_ppt
    existing_docentes_by_code = {
        d.codigo_docente: d
        for d in Docente.objects.select_related('programa', 'tipo_documento').all()
    }
    existing_docentes_correos = {
        d.correo: d.codigo_docente
        for d in existing_docentes_by_code.values()
        if getattr(d, 'correo', None)
    }
    existing_docentes_docs = {
        d.num_documento: d.codigo_docente
        for d in existing_docentes_by_code.values()
        if getattr(d, 'num_documento', None)
    }
    existing_docentes_codigos = set(existing_docentes_by_code.keys())
    docentes_to_update = []
    
    created = 0
    updated = 0
    existing = 0
    errors = []
    max_rows = 5000
    to_create = []
    
    # Helper function para acceder a columnas de pandas de forma segura
    def get_col(row, *col_names):
        """Intenta obtener el valor de la primera columna que existe y no es None/NaN"""
        for col in col_names:
            if col in row.index:
                val = row[col]
                if pd.notna(val):
                    return val
        return None
    
    for idx, row in df.iterrows():
        row_num = idx + 2  # +2 porque índice empieza en 0 y hay header
        if idx >= max_rows:
            errors.append({"row": row_num, "error": f"Se excede límite de {max_rows} filas"})
            break
        
        # Extraer campos con sinónimos
        codigo = get_col(row, "codigo_docente", "docente", "codigo")
        nombre = get_col(row, "nombre", "first_name")
        apellido = get_col(row, "apellido", "last_name")
        correo = get_col(row, "correo", "email")
        tipo_doc_desc = get_col(row, "tipo_documento", "tipo_doc", "doc_type")
        num_documento = get_col(row, "num_documento", "documento", "doc_number")
        telefono = get_col(row, "num_telefono", "telefono", "phone")
        raw_pass = get_col(row, "password")
        
        # Limpiar strings
        if codigo: codigo = str(codigo).strip()[:50]
        if nombre: nombre = str(nombre).strip()[:50]
        if apellido: apellido = str(apellido).strip()[:50]
        if correo: correo = str(correo).strip()[:100]
        if tipo_doc_desc: tipo_doc_desc = str(tipo_doc_desc).strip()
        if num_documento: num_documento = str(num_documento).strip()[:20]
        if telefono: telefono = str(telefono).strip()[:20]
        if raw_pass: raw_pass = str(raw_pass).strip()
        
        if not (codigo and nombre and apellido and correo and tipo_doc_desc and num_documento):
            errors.append({"row": row_num, "error": "Faltan columnas requeridas"}); continue
        
        # Tipo documento (tolerante a alias como CC, C.C., CR, T.I., PPT)
        tipo_doc = None
        input_norm = _normalize_text(tipo_doc_desc)
        mapped_norm = allowed_tipo_doc_aliases.get(input_norm, input_norm)
        tipo_doc = tipos_documento_map_desc_norm.get(mapped_norm)

        if not tipo_doc:
            for key_norm, td in tipos_documento_map_desc_norm.items():
                if mapped_norm in key_norm or key_norm in mapped_norm:
                    tipo_doc = td
                    break

        if not tipo_doc:
            errors.append({"row": row_num, "error": f"Tipo de documento no válido: {tipo_doc_desc}"}); continue

        detected_program = _infer_program_for_coordinador(coord)
        if not detected_program:
            errors.append({"row": row_num, "error": "No se pudo determinar el programa del coordinador para asignar el docente"}); continue
        
        existing_docente = existing_docentes_by_code.get(codigo)
        if existing_docente:
            correo_owner = existing_docentes_correos.get(correo)
            if correo_owner and correo_owner != codigo:
                errors.append({"row": row_num, "error": f"Correo ya existe en otro docente: {correo}"}); continue

            doc_owner = existing_docentes_docs.get(num_documento)
            if doc_owner and doc_owner != codigo:
                errors.append({"row": row_num, "error": f"Documento ya existe en otro docente: {num_documento}"}); continue

            changed = False
            if existing_docente.nombre != nombre:
                existing_docente.nombre = nombre
                changed = True
            if existing_docente.apellido != apellido:
                existing_docente.apellido = apellido
                changed = True
            if existing_docente.correo != correo:
                old_correo = existing_docente.correo
                existing_docente.correo = correo
                changed = True
            else:
                old_correo = None
            if existing_docente.num_documento != num_documento:
                old_doc = existing_docente.num_documento
                existing_docente.num_documento = num_documento
                changed = True
            else:
                old_doc = None
            if getattr(existing_docente, 'tipo_documento_id', None) != getattr(tipo_doc, 'id_tipo_documento', None):
                existing_docente.tipo_documento = tipo_doc
                changed = True
            if getattr(existing_docente, 'programa_id', None) != getattr(detected_program, 'id_programa', None):
                existing_docente.programa = detected_program
                changed = True
            if telefono is not None and existing_docente.num_telefono != (telefono or None):
                existing_docente.num_telefono = telefono or None
                changed = True
            if raw_pass:
                existing_docente.contrasenia_docente = make_password(raw_pass)
                changed = True

            if changed:
                docentes_to_update.append(existing_docente)
                updated += 1
                if old_correo:
                    existing_docentes_correos.pop(old_correo, None)
                existing_docentes_correos[correo] = codigo
                if old_doc:
                    existing_docentes_docs.pop(old_doc, None)
                existing_docentes_docs[num_documento] = codigo
            else:
                existing += 1
            continue

        # Validar unicidad de correo y documento para nuevos docentes
        if correo in existing_docentes_correos:
            errors.append({"row": row_num, "error": f"Correo ya existe: {correo}"}); continue
        if num_documento in existing_docentes_docs:
            errors.append({"row": row_num, "error": f"Documento ya existe: {num_documento}"}); continue
        
        # Generar contraseña si no viene. Use fixed generic docente password per user request.
        password = raw_pass or "docente123"
        hashed = make_password(password)
        # Preparar lista de envios de correo para docentes importados
        if 'passwords_for_emails' not in locals():
            passwords_for_emails = []
        
        # Agregar a lista de creación
        to_create.append(Docente(
            nombre=nombre,
            apellido=apellido,
            codigo_docente=codigo,
            contrasenia_docente=hashed,
            correo=correo,
            programa=detected_program,
            tipo_documento=tipo_doc,
            num_documento=num_documento,
            num_telefono=telefono or None
        ))
        passwords_for_emails.append({
            'correo': correo,
            'nombre': nombre,
            'apellido': apellido,
            'codigo': codigo,
            'password': password
        })
        # Marcar como existente para evitar duplicados en el mismo archivo
        existing_docentes_codigos.add(codigo)
        existing_docentes_correos[correo] = codigo
        existing_docentes_docs[num_documento] = codigo
        existing_docentes_by_code[codigo] = to_create[-1]
        created += 1
    
    # BULK INSERT con transacción atómica
    if to_create:
        try:
            with transaction.atomic():
                Docente.objects.bulk_create(to_create, batch_size=500)
        except Exception as e:
            errors.append({"error": f"Error en inserción masiva: {str(e)}"})
            created = 0
    # Enviar correos de bienvenida a docentes creados (en background)
    try:
        if 'passwords_for_emails' in locals() and passwords_for_emails:
            _send_bulk_welcome_emails_docente_async(passwords_for_emails, max_emails=10)
    except Exception:
        logger.exception("Error programando envios de correo docentes")

    if docentes_to_update:
        try:
            with transaction.atomic():
                Docente.objects.bulk_update(
                    docentes_to_update,
                    [
                        'nombre',
                        'apellido',
                        'correo',
                        'tipo_documento',
                        'num_documento',
                        'num_telefono',
                        'programa',
                        'contrasenia_docente',
                    ],
                    batch_size=500,
                )
        except Exception as e:
            errors.append({"error": f"Error en actualización masiva de docentes: {str(e)}"})
            updated = 0
    
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    payload = {"created": created, "updated": updated, "existing": existing, "errors": errors}
    try:
        logger.info("import_docentes: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": getattr(f, "name", None),
            **{k: payload[k] for k in ("created", "updated", "existing")},
            "errors_count": len(errors)
        })
        ImportAudit.objects.create(
            coordinador=coord,
            kind="docentes",
            filename=fname,
            created_count=created,
            existing_count=existing,
            errors_count=len(errors),
        )
    except Exception:
        pass
    return Response(payload, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def coordinador_import_asignaturas_ras_view(request):
    """Importa asignaturas y RAs desde CSV o Excel con BULK INSERT optimizado. Solo coordinador.
    Columnas mínimas asignatura: codigo_asignatura, nombre_asignatura|nombre, codigo_docente, codigo_programa, periodo, grupo, sede, creditos
    Columnas RA opcionales (si presentes se crea RA): ra_descripcion, ra_porcentaje
        Columnas de indicador opcionales: indicador_descripcion, indicador_porcentaje
    Soporta: .csv, .xlsx, .xls
    Sinónimos aceptados:
      - codigo_asignatura | asignatura | codigo
      - nombre_asignatura | nombre | nombre_curso
      - codigo_docente | docente
      - codigo_programa | programa
            - periodo | periodo_academico
            - creditos | credito
      - ra_descripcion | ra_desc | descripcion_ra
      - ra_porcentaje | ra_pct | porcentaje_ra
            - indicador_descripcion | il_descripcion | descripcion_indicador | indicador
            - indicador_porcentaje | il_porcentaje | porcentaje_indicador | porcentaje_il | porcentaje_ind
    Valida que suma de porcentajes de RA no exceda 100.
    """
    coord, err = _require_coordinador(request)
    if err:
        return err
    f = request.FILES.get("file") or request.FILES.get("csv")
    if not f:
        return Response({"detail": "Archivo requerido (CSV o Excel)"}, status=status.HTTP_400_BAD_REQUEST)
    fname = getattr(f, 'name', '').lower()
    
    # Validar extensión del archivo
    if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
        return Response({"detail": "Se requiere archivo .csv, .xlsx o .xls"}, status=status.HTTP_400_BAD_REQUEST)
    
    size = int(getattr(f, "size", 0) or 0)
    if size > 10 * 1024 * 1024:  # Aumentado a 10MB para Excel
        return Response({"detail": "El archivo supera 10MB"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Leer archivo con pandas (soporta CSV y Excel)
    df = _read_imported_file(f)
    if df is None or df.empty:
        return Response(
            {"detail": "No se pudo leer el archivo o está vacío. Intente con formato .xlsx o .csv UTF-8."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Normalizar nombres de columnas
    df.columns = df.columns.str.strip().str.lower()
    
    # OPTIMIZACIÓN: Pre-cargar datos existentes
    docentes_map = {d.codigo_docente: d for d in Docente.objects.all()}
    programas_map = {p.codigo_programa: p for p in Programa.objects.all()}
    periodos_map = {p.descripcion: p for p in PeriodoAcademico.objects.all()}
    asignaturas_map = {(a.codigo_asignatura, a.grupo, a.sede, a.periodo_id): a for a in Asignatura.objects.select_related('docente', 'programa', 'periodo').all()}
    
    # Calcular sumas de porcentajes de RAs por asignatura
    ra_sumas = {}
    for ra in ResultadoDeAprendizaje.objects.values('asignatura__codigo_asignatura', 'asignatura__grupo', 'asignatura__sede', 'asignatura__periodo_id').annotate(suma=Sum('porcentaje_ra')):
        ra_sumas[(ra['asignatura__codigo_asignatura'], ra['asignatura__grupo'], ra['asignatura__sede'], ra['asignatura__periodo_id'])] = float(ra['suma'] or 0)

    existing_ras_by_key = {}
    for ra in ResultadoDeAprendizaje.objects.select_related('asignatura').all():
        existing_ras_by_key[(
            ra.asignatura.codigo_asignatura,
            ra.asignatura.grupo,
            ra.asignatura.sede,
            ra.asignatura.periodo_id,
            _normalize_text(ra.descripcion or ""),
        )] = ra

    existing_indicators_by_ra = {}
    for ind in IndicadoresDeLogro.objects.select_related('ra__asignatura').all():
        existing_indicators_by_ra.setdefault(ind.ra_id, {})[_normalize_text(ind.descripcion or "")] = ind
    
    created_asig = 0
    updated_asig = 0
    existing_asig = 0
    created_ras = 0
    updated_ras = 0
    created_indicadores = 0
    updated_indicadores = 0
    errors = []
    max_rows = 5000
    asignaturas_to_create = []
    asignaturas_to_update = {}
    ras_to_create = []
    ras_pendientes = []  # Para procesar después de crear asignaturas
    ra_entries = {}
    
    # Helper function para acceder a columnas de pandas de forma segura
    def get_col(row, *col_names):
        """Intenta obtener el valor de la primera columna que existe y no es None/NaN"""
        for col in col_names:
            if col in row.index:
                val = row[col]
                if pd.notna(val):
                    return val
        return None
    
    for idx, row in df.iterrows():
        row_num = idx + 2  # +2 porque índice empieza en 0 y hay header
        if idx >= max_rows:
            errors.append({"row": row_num, "error": f"Se excede límite de {max_rows} filas"})
            break
        
        # Extraer campos con sinónimos
        codigo = get_col(row, "codigo_asignatura", "asignatura", "codigo")
        nombre = get_col(row, "nombre_asignatura", "nombre", "nombre_curso")
        codigo_doc = get_col(row, "codigo_docente", "docente")
        codigo_prog = get_col(row, "codigo_programa", "programa")
        periodo_desc = get_col(row, "periodo", "periodo_academico")
        raw_creditos = get_col(row, "creditos", "credito")
        grupo = get_col(row, "grupo")
        sede = get_col(row, "sede")
        ra_desc = get_col(row, "ra_descripcion", "ra_desc", "descripcion_ra")
        raw_pct = get_col(row, "ra_porcentaje", "ra_pct", "porcentaje_ra")
        ind_desc = get_col(row, "indicador_descripcion", "il_descripcion", "descripcion_indicador", "indicador", "il_desc")
        raw_ind_pct = get_col(row, "indicador_porcentaje", "il_porcentaje", "porcentaje_indicador", "porcentaje_il", "porcentaje_ind", "il_pct")
        
        # Limpiar strings
        if codigo: codigo = str(codigo).strip()[:50]
        if nombre: nombre = str(nombre).strip()[:200]
        if codigo_doc: codigo_doc = str(codigo_doc).strip()[:50]
        if codigo_prog: codigo_prog = str(codigo_prog).strip()[:50]
        if periodo_desc: periodo_desc = str(periodo_desc).strip()[:100]
        if grupo: grupo = str(grupo).strip()[:20]
        if sede: sede = str(sede).strip()[:80]
        if ra_desc: ra_desc = str(ra_desc).strip()[:255]
        if ind_desc: ind_desc = str(ind_desc).strip()[:255]
        
        if not (codigo and nombre and codigo_doc and codigo_prog and periodo_desc and grupo and sede and raw_creditos is not None and str(raw_creditos).strip() != ""):
            errors.append({"row": row_num, "error": "Faltan columnas requeridas asignatura"}); continue
        
        docente = docentes_map.get(codigo_doc)
        if not docente:
            errors.append({"row": row_num, "error": f"Docente no encontrado: {codigo_doc}"}); continue
        
        programa = programas_map.get(codigo_prog)
        if not programa:
            errors.append({"row": row_num, "error": f"Programa no encontrado: {codigo_prog}"}); continue

        periodo = periodos_map.get(periodo_desc)
        if not periodo:
            errors.append({"row": row_num, "error": f"Periodo no encontrado: {periodo_desc}"}); continue

        try:
            creditos = int(raw_creditos)
        except (TypeError, ValueError):
            errors.append({"row": row_num, "error": f"creditos inválido: {raw_creditos}"}); continue

        if creditos <= 0:
            errors.append({"row": row_num, "error": f"creditos debe ser mayor que 0: {creditos}"}); continue
        
        # Verificar si asignatura existe
        asig_key = (codigo, grupo, sede, periodo.id_periodo)
        asign = asignaturas_map.get(asig_key)
        if not asign:
            # Verificar si ya la vamos a crear en este batch
            if asig_key not in [(a.codigo_asignatura, a.grupo, a.sede, a.periodo_id) for a in asignaturas_to_create]:
                asignaturas_to_create.append(Asignatura(
                    nombre=nombre,
                    codigo_asignatura=codigo,
                    docente=docente,
                    periodo=periodo,
                    grupo=grupo,
                    sede=sede,
                    programa=programa,
                    creditos=creditos,
                ))
                asignaturas_map[asig_key] = None  # Marcador temporal
                created_asig += 1
        else:
            if asig_key not in asignaturas_to_update:
                existing_asig += 1
            # Actualizar nombre/grupo si difiere
            changed = False
            updates = {}
            if nombre and asign.nombre != nombre:
                updates['nombre'] = nombre
                changed = True
            if asign.docente_id != docente.id_docente:
                updates['docente_id'] = docente.id_docente
                changed = True
            if asign.programa_id != programa.id_programa:
                updates['programa_id'] = programa.id_programa
                changed = True
            if int(getattr(asign, 'creditos', 0) or 0) != creditos:
                updates['creditos'] = creditos
                changed = True
            if changed:
                asignaturas_to_update[asig_key] = updates
        
        # Procesar RA si columnas presentes
        if ra_desc and raw_pct is not None and raw_pct != "":
            try:
                pct = float(raw_pct)
            except (TypeError, ValueError):
                errors.append({"row": row_num, "error": f"ra_porcentaje inválido: {raw_pct}"}); continue
            if pct < 0 or pct > 100:
                errors.append({"row": row_num, "error": f"ra_porcentaje fuera de rango: {pct}"}); continue

            ra_desc_norm = _normalize_text(ra_desc)
            ra_key = (codigo, grupo, sede, periodo.id_periodo, ra_desc_norm)
            ra_entry = ra_entries.get(ra_key)

            if not ra_entry:
                existing_ra = existing_ras_by_key.get(ra_key)
                suma_actual = ra_sumas.get(asig_key, 0.0)
                if existing_ra:
                    suma_proyectada = float(suma_actual) - float(existing_ra.porcentaje_ra or 0) + pct
                else:
                    suma_proyectada = float(suma_actual) + pct

                if suma_proyectada > 100.0:
                    errors.append({"row": row_num, "error": f"Suma RA excede 100% ({suma_proyectada:.2f})"}); continue

                ra_entry = {
                    'codigo_asignatura': codigo,
                    'grupo': grupo,
                    'sede': sede,
                    'periodo_id': periodo.id_periodo,
                    'descripcion': ra_desc,
                    'descripcion_norm': ra_desc_norm,
                    'porcentaje': pct,
                    'existing_ra': existing_ra,
                    'indicadores': [],
                    'indicator_keys': set(),
                    'existing_indicators': existing_indicators_by_ra.get(getattr(existing_ra, 'id_ra', None), {}) if existing_ra else {},
                    'is_new': existing_ra is None,
                }
                ra_entries[ra_key] = ra_entry
                ra_sumas[asig_key] = suma_proyectada
                if existing_ra is None:
                    created_ras += 1
            else:
                if abs(float(ra_entry['porcentaje']) - pct) > 1e-9:
                    errors.append({"row": row_num, "error": f"RA repetido con porcentaje distinto para '{ra_desc}'"}); continue

            if ind_desc:
                ind_key = _normalize_text(ind_desc)
                if ind_key in ra_entry['indicator_keys']:
                    errors.append({"row": row_num, "error": f"Indicador repetido en RA '{ra_desc}': {ind_desc}"}); continue
                ra_entry['indicator_keys'].add(ind_key)
                ra_entry['indicadores'].append({
                    'descripcion': str(ind_desc).strip(),
                    'descripcion_norm': ind_key,
                })
    
    # BULK INSERT de asignaturas nuevas
    if asignaturas_to_create:
        try:
            with transaction.atomic():
                Asignatura.objects.bulk_create(asignaturas_to_create, batch_size=500)
                # Recargar mapa de asignaturas con las recién creadas
                asignaturas_map = {(a.codigo_asignatura, a.grupo, a.sede, a.periodo_id): a for a in Asignatura.objects.select_related('docente', 'programa', 'periodo').all()}
        except Exception as e:
            errors.append({"error": f"Error en inserción masiva de asignaturas: {str(e)}"})
            created_asig = 0
            ras_pendientes = []  # No crear RAs si falló la creación de asignaturas
    
    # Actualizar asignaturas existentes
    if asignaturas_to_update:
        try:
            for (codigo, grupo, sede, periodo_id), updates in asignaturas_to_update.items():
                Asignatura.objects.filter(codigo_asignatura=codigo, grupo=grupo, sede=sede, periodo_id=periodo_id).update(**updates)
            updated_asig = len(asignaturas_to_update)
        except Exception:
            pass
    
    # UPSERT de RAs e indicadores
    if ra_entries:
        try:
            ras_to_create_objs = []
            ras_to_update = []
            indicadores_to_create = []
            indicadores_to_update = []
            next_numero_by_asig = {}

            for ra_entry in ra_entries.values():
                asig_key = (
                    ra_entry['codigo_asignatura'],
                    ra_entry['grupo'],
                    ra_entry['sede'],
                    ra_entry['periodo_id'],
                )
                asign = asignaturas_map.get(asig_key)
                if not asign:
                    continue

                existing_ra = ra_entry['existing_ra']
                if existing_ra:
                    changed = False
                    if existing_ra.asignatura_id != asign.id_asignatura:
                        existing_ra.asignatura = asign
                        changed = True
                    if (existing_ra.descripcion or "").strip() != ra_entry['descripcion']:
                        existing_ra.descripcion = ra_entry['descripcion']
                        changed = True
                    if float(existing_ra.porcentaje_ra or 0) != float(ra_entry['porcentaje']):
                        existing_ra.porcentaje_ra = ra_entry['porcentaje']
                        changed = True
                    if changed:
                        ras_to_update.append(existing_ra)

                    existing_inds = ra_entry['existing_indicators']
                    for ind_data in ra_entry['indicadores']:
                        existing_ind = existing_inds.get(ind_data['descripcion_norm'])
                        if existing_ind:
                            if (existing_ind.descripcion or "").strip() != ind_data['descripcion']:
                                existing_ind.descripcion = ind_data['descripcion']
                                indicadores_to_update.append(existing_ind)
                        else:
                            indicadores_to_create.append(
                                IndicadoresDeLogro(
                                    ra=existing_ra,
                                    descripcion=ind_data['descripcion'],
                                )
                            )
                    continue

                next_numero = next_numero_by_asig.get(asig_key)
                if next_numero is None:
                    next_numero = ResultadoDeAprendizaje.get_next_numero_for_asignatura(asign)
                ra_obj = ResultadoDeAprendizaje(
                    asignatura=asign,
                    porcentaje_ra=ra_entry['porcentaje'],
                    descripcion=ra_entry['descripcion'],
                    numero_ra=next_numero,
                )
                next_numero_by_asig[asig_key] = next_numero + 1
                ras_to_create_objs.append((ra_obj, ra_entry))

            if ras_to_update:
                with transaction.atomic():
                    ResultadoDeAprendizaje.objects.bulk_update(
                        ras_to_update,
                        ['asignatura', 'descripcion', 'porcentaje_ra'],
                        batch_size=500,
                    )

            if ras_to_create_objs:
                new_ra_objs = [item[0] for item in ras_to_create_objs]
                with transaction.atomic():
                    ResultadoDeAprendizaje.objects.bulk_create(new_ra_objs, batch_size=500)

                    for ra_obj, ra_entry in ras_to_create_objs:
                        ra_pk = getattr(ra_obj, 'id_ra', None)
                        if not ra_pk:
                            found = ResultadoDeAprendizaje.objects.filter(
                                asignatura=ra_obj.asignatura,
                                numero_ra=ra_obj.numero_ra,
                            ).order_by('-id_ra').first()
                            ra_pk = getattr(found, 'id_ra', None)
                        if not ra_pk:
                            continue

                        for ind in (ra_entry.get('indicadores') or []):
                            indicadores_to_create.append(
                                IndicadoresDeLogro(
                                    ra_id=ra_pk,
                                    descripcion=ind['descripcion'],
                                )
                            )

            if indicadores_to_update:
                with transaction.atomic():
                    IndicadoresDeLogro.objects.bulk_update(
                        indicadores_to_update,
                        ['descripcion'],
                        batch_size=500,
                    )

            if indicadores_to_create:
                with transaction.atomic():
                    created_inds = IndicadoresDeLogro.objects.bulk_create(indicadores_to_create, batch_size=500)
                    created_indicadores = len(created_inds)

            updated_ras = len(ras_to_update)
            updated_indicadores = len(indicadores_to_update)
        except Exception as e:
            errors.append({"error": f"Error en upsert masivo de RAs: {str(e)}"})
            created_ras = 0
            updated_ras = 0
            created_indicadores = 0
            updated_indicadores = 0
    
    if len(errors) > 100:
        errors = errors[:100] + [{"more": "se omitieron errores adicionales"}]
    payload = {
        "created_asignaturas": created_asig,
        "updated_asignaturas": updated_asig,
        "existing_asignaturas": existing_asig,
        "created_ras": created_ras,
        "updated_ras": updated_ras,
        "created_indicadores": created_indicadores,
        "updated_indicadores": updated_indicadores,
        "errors": errors,
    }
    try:
        logger.info("import_asignaturas_ras: %s", {
            "coordinador": getattr(coord, "codigo_coordinador", None),
            "filename": getattr(f, "name", None),
            "created_asignaturas": created_asig,
            "updated_asignaturas": updated_asig,
            "existing_asignaturas": existing_asig,
            "created_ras": created_ras,
            "updated_ras": updated_ras,
            "created_indicadores": created_indicadores,
            "updated_indicadores": updated_indicadores,
            "errors_count": len(errors)
        })
        ImportAudit.objects.create(
            coordinador=coord,
            kind="asignaturas_ras",
            filename=fname,
            created_count=(created_asig + created_ras + created_indicadores),
            existing_count=existing_asig,
            errors_count=len(errors),
        )
    except Exception:
        pass
    return Response(payload, status=status.HTTP_200_OK)

@api_view(["POST", "GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def logout_view(request):
    return Response(status=status.HTTP_204_NO_CONTENT)

@ratelimit(key='ip', rate='5/m', method='POST', block=True)
@ratelimit(key='user_or_ip', rate='10/h', method='POST', block=True)
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_forgot_view(request):
    """
    Endpoint para solicitar recuperación de contraseña mediante OTP seguro.
    Rate limiting: 5 intentos/minuto por IP, 10 intentos/hora por usuario/IP
    
    - Usa secrets en lugar de random para generar OTP
    - Registra evento de seguridad
    - OTP de 6 dígitos con expiración de 5 minutos
    
    Request Body:
        - email (str): Correo electrónico del usuario
    
    Response:
        - 200: {"ok": true, "message": "Si el correo existe, recibirás un código OTP"}
    """
    from django.utils import timezone
    from datetime import timedelta
    from ..models.models import PasswordResetOTP
    from ..serializers.serializers import PasswordForgotSerializer
    
    # Obtener IP para auditoría
    ip_address = get_client_ip(request)

    # Validar datos de entrada con serializer
    serializer = PasswordForgotSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    
    # Buscar usuario por correo - PRIORIDAD: Estudiantes primero, luego Docentes
    user = None
    rol = None
    
    # 1. Buscar en Estudiantes
    estudiante = Estudiante.objects.filter(correo__iexact=email).first()
    if estudiante:
        user = estudiante
        rol = "estudiante"
    else:
        # 2. Si no es estudiante, buscar en Docentes
        docente = Docente.objects.filter(correo__iexact=email).first()
        if docente:
            user = docente
            rol = "docente"
        else:
            # 3. Si no es docente, buscar en Coordinadores
            coordinador = Coordinador.objects.filter(correo__iexact=email).first()
            if coordinador:
                user = coordinador
                rol = "coordinador"

    # Siempre responder 200 OK para evitar enumeración de usuarios
    if user and rol:
        try:
            # Invalidar todos los OTPs anteriores no usados del mismo email
            PasswordResetOTP.objects.filter(
                email__iexact=email, 
                is_used=False
            ).update(is_used=True)

            # Generar código OTP SEGURO usando secrets
            otp_code = generate_secure_otp(length=6)
            
            # Crear nuevo registro OTP con expiración de 5 minutos
            expires_at = timezone.now() + timedelta(minutes=5)
            PasswordResetOTP.objects.create(
                email=email.lower(),
                otp_code=otp_code,
                expires_at=expires_at,
                rol=rol
            )
            
            # Registrar evento de seguridad
            registrar_evento_seguridad(
                evento='OTP_GENERATED',
                usuario_codigo=getattr(user, 'codigo_estudiante', None) or 
                              getattr(user, 'codigo_docente', None) or
                              getattr(user, 'codigo_coordinador', None),
                ip_address=ip_address,
                detalles={'email': email, 'rol': rol}
            )

            # Preparar y enviar correo electrónico
            subject = "Código de Recuperación de Contraseña - RA Manager"
            message = (
                f"Hola {user.nombre},\n\n"
                "Recibimos una solicitud para restablecer tu contraseña en RA Manager.\n\n"
                f"Tu código de verificación es: {otp_code}\n\n"
                "Este código es válido por 5 minutos.\n\n"
                "Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\n"
                "Saludos,\n"
                "Equipo RA Manager\n"
                "Universidad del Valle"
            )
            
            # Enviar correo
            email_sent = send_email_with_logging(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                logger=logging.getLogger(__name__),
                context="otp_recuperacion",
            )
            if not email_sent:
                PasswordResetOTP.objects.filter(
                    email=email.lower(),
                    otp_code=otp_code,
                    is_used=False,
                ).update(is_used=True)
            
        except Exception as e:
            # Log del error pero no exponer detalles al usuario
            logger = logging.getLogger(__name__)
            logger.error(f"Error al enviar OTP a {email}: {str(e)}")
            # Continuar con respuesta genérica por seguridad

    return Response({
        "ok": True,
        "message": "Si el correo está registrado, recibirás un código de verificación"
    })

@ratelimit(key='ip', rate='10/m', method='POST', block=True)
@ratelimit(key='user_or_ip', rate='20/h', method='POST', block=True)
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_otp_view(request):
    """
    Endpoint para verificar un código OTP.
    Rate limiting: 10 intentos/minuto por IP, 20 intentos/hora por usuario/IP
    
    Valida que el código OTP sea correcto, no esté usado y no haya expirado.
    
    Request Body:
        - email (str): Correo electrónico del usuario
        - otp_code (str): Código OTP de 6 dígitos
    
    Response:
        - 200: {"ok": true, "message": "Código verificado correctamente"}
        - 400: Código inválido o expirado
    """
    from django.utils import timezone
    from ..models.models import PasswordResetOTP
    from ..serializers.serializers import VerifyOTPSerializer

    # Validar datos de entrada con serializer
    serializer = VerifyOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    otp_code = serializer.validated_data["otp_code"]

    # Buscar el OTP más reciente que coincida y sea válido
    otp = PasswordResetOTP.objects.filter(
        email__iexact=email,
        otp_code=otp_code,
        is_used=False,
        expires_at__gt=timezone.now()
    ).order_by('-created_at').first()

    if not otp:
        return Response(
            {"message": "Código OTP inválido o expirado. Por favor, solicita uno nuevo."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verificar si está a punto de expirar (opcional: advertir al usuario)
    time_remaining = (otp.expires_at - timezone.now()).total_seconds()
    warning = None
    if time_remaining < 60:  # Menos de 1 minuto restante
        warning = "Tu código expirará pronto. Completa el proceso rápidamente."

    response_data = {
        "ok": True,
        "message": "Código verificado correctamente. Procede a cambiar tu contraseña."
    }
    
    if warning:
        response_data["warning"] = warning

    return Response(response_data)

@ratelimit(key='ip', rate='10/m', method='POST', block=True)
@ratelimit(key='user_or_ip', rate='20/h', method='POST', block=True)
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_reset_view(request):
    """
    Endpoint para restablecer la contraseña usando OTP verificado.
    Rate limiting: 10 intentos/minuto por IP, 20 intentos/hora por usuario/IP
    
    - Valida fortaleza de la contraseña
    - Usa transacciones atómicas
    - Registra evento de seguridad
    - Marca OTP como usado
    
    Request Body:
        - email (str): Correo electrónico
        - otp_code (str): Código OTP de 6 dígitos
        - password (str): Nueva contraseña (requisitos estrictos)
    
    Response:
        - 200: Contraseña actualizada
        - 400: Error de validación
    """
    from django.utils import timezone
    from django.db import transaction
    from ..models.models import PasswordResetOTP
    from ..serializers.serializers import PasswordResetSerializer
    
    # Obtener IP para auditoría
    ip_address = get_client_ip(request)

    # Validar datos de entrada con serializer
    serializer = PasswordResetSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    otp_code = serializer.validated_data["otp_code"]
    new_password = serializer.validated_data["password"]
    
    # VALIDAR FORTALEZA DE LA CONTRASEÑA
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        return Response({"message": error_msg}, status=status.HTTP_400_BAD_REQUEST)

    # Buscar el OTP más reciente que coincida y sea válido
    otp = PasswordResetOTP.objects.filter(
        email__iexact=email,
        otp_code=otp_code,
        is_used=False,
        expires_at__gt=timezone.now()
    ).order_by('-created_at').first()

    if not otp:
        # Registrar evento de OTP fallido
        registrar_evento_seguridad(
            evento='OTP_FAILED',
            usuario_codigo=None,
            ip_address=ip_address,
            detalles={'email': email, 'motivo': 'OTP inválido o expirado'}
        )
        return Response(
            {"message": "Código OTP inválido o expirado. Solicita un nuevo código."},
            status=status.HTTP_400_BAD_REQUEST
        )

    rol = otp.rol

    try:
        # Usar transacción para garantizar atomicidad
        with transaction.atomic():
            # Buscar y actualizar contraseña según el rol
            user = None
            codigo_usuario = None
            
            if rol == "docente":
                user = Docente.objects.filter(correo__iexact=email).first()
                if not user:
                    return Response(
                        {"message": "Usuario docente no encontrado"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                user.contrasenia_docente = make_password(new_password)
                user.save(update_fields=["contrasenia_docente"])
                codigo_usuario = user.codigo_docente
                
            elif rol == "estudiante":
                user = Estudiante.objects.filter(correo__iexact=email).first()
                if not user:
                    return Response(
                        {"message": "Usuario estudiante no encontrado"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                user.contrasena_estudiante = make_password(new_password)
                user.save(update_fields=["contrasena_estudiante"])
                codigo_usuario = user.codigo_estudiante
                
            elif rol == "coordinador":
                user = Coordinador.objects.filter(correo__iexact=email).first()
                if not user:
                    return Response(
                        {"message": "Usuario coordinador no encontrado"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                user.contrasenia_coord = make_password(new_password)
                user.save(update_fields=["contrasenia_coord"])
                codigo_usuario = user.codigo_coordinador
            else:
                return Response(
                    {"message": "Rol de usuario no válido"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Marcar el OTP como usado para evitar reutilización
            otp.is_used = True
            otp.save(update_fields=["is_used"])

            # Invalidar cualquier otro OTP pendiente para este email por seguridad
            PasswordResetOTP.objects.filter(
                email__iexact=email,
                is_used=False
            ).exclude(id=otp.id).update(is_used=True)
            
            # Registrar evento de seguridad
            registrar_evento_seguridad(
                evento='PASSWORD_RESET_SUCCESS',
                usuario_codigo=codigo_usuario,
                ip_address=ip_address,
                detalles={'email': email, 'rol': rol}
            )

        logger.info(f"Contraseña restablecida exitosamente para {email} (rol: {rol})")

        return Response({
            "ok": True,
            "message": "Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión."
        })

    except Exception as e:
        # Log del error
        logger_instance = logging.getLogger(__name__)
        logger_instance.error(f"Error al restablecer contraseña para {email}: {str(e)}")
        
        return Response(
            {"message": "Error al actualizar la contraseña. Por favor, intenta nuevamente."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class TipoDocumentoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para tipos de documento.
    Acceso público para registro de usuarios.
    """
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer
    permission_classes = [AllowAny]
    pagination_class = None  # Sin paginación para catálogos pequeños


class TipoActividadViewSet(viewsets.ModelViewSet):
    """
    ViewSet para tipos de actividad.
    Solo lectura para usuarios autenticados.
    """
    queryset = TipoActividad.objects.all()
    serializer_class = TipoActividadSerializer
    permission_classes = [AllowAny]  # Cambiable a IsAuthenticated según necesidad
    pagination_class = None
    http_method_names = ['get', 'head', 'options']  # Solo lectura


class ProgramaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para programas académicos.
    Solo lectura para usuarios autenticados.
    """
    queryset = Programa.objects.all()
    serializer_class = ProgramaSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    http_method_names = ['get', 'head', 'options']


class DocenteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para docentes.
    ADVERTENCIA: Datos sensibles - requiere autenticación y permisos.
    """
    # Optimización: select_related para evitar queries N+1 al acceder a tipo_documento
    queryset = Docente.objects.select_related('tipo_documento').all()
    serializer_class = DocenteSerializer
    permission_classes = [AllowAny]  # TODO: Cambiar a IsAuthenticated + custom permissions
    http_method_names = ['head', 'options']
    # TODO: Implementar filtrado por usuario autenticado


class EstudianteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para estudiantes.
    ADVERTENCIA: Datos sensibles - requiere autenticación y permisos.
    """
    # Optimización: select_related para tipo_documento
    queryset = Estudiante.objects.select_related('tipo_documento').all()
    serializer_class = EstudianteSerializer
    permission_classes = [AllowAny]  # TODO: Cambiar a IsAuthenticated + custom permissions
    http_method_names = ['head', 'options']
    # TODO: Implementar filtrado por usuario autenticado


class AsignaturaViewSet(viewsets.ModelViewSet):
    # Optimización: select_related para docente y programa
    queryset = Asignatura.objects.select_related(
        'docente',
        'docente__tipo_documento',
        'programa'
    ).prefetch_related(
        'resultadodeaprendizaje_set',
        'matricula_set__estudiante'
    ).order_by('codigo_asignatura')
    serializer_class = AsignaturaSerializer
    lookup_field = "codigo_asignatura"
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        req = self.request
        docente_id = req.query_params.get("id_docente")
        docente_code = req.query_params.get("docente") or req.query_params.get("codigo_docente") or req.query_params.get("codigo")
        estudiante_id = req.query_params.get("id_estudiante")
        estudiante_code = req.query_params.get("estudiante") or req.query_params.get("codigo_estudiante")
        if docente_id: return qs.filter(docente__id_docente=docente_id)
        if docente_code: return qs.filter(docente__codigo_docente=docente_code)
        if estudiante_id: return qs.filter(matricula__estudiante__id_estudiante=estudiante_id).distinct()
        if estudiante_code: return qs.filter(matricula__estudiante__codigo_estudiante=estudiante_code).distinct()
        token = _bearer_token(req)
        if token:
            try:
                data = signing.loads(token, max_age=TOKEN_MAX_AGE)
                if data.get("rol") == "docente":
                    return qs.filter(docente__id_docente=data.get("id"))
                if data.get("rol") == "estudiante":
                    return qs.filter(matricula__estudiante__id_estudiante=data.get("id")).distinct()
            except Exception:
                pass
        return qs

    def get_object(self):
        """Resuelve asignatura por codigo_asignatura permitiendo múltiples grupos.

        Con el nuevo modelo (codigo + grupo), el código por sí solo puede no ser único.
        Este resolver evita MultipleObjectsReturned y permite desambiguar por:
        - query param grupo
        - query param id_asignatura
        """
        codigo = self.kwargs.get(self.lookup_field)
        qs = self.filter_queryset(self.get_queryset()).filter(codigo_asignatura=codigo)

        grupo = (self.request.query_params.get("grupo") or "").strip()
        if grupo:
            qs = qs.filter(grupo=grupo)

        id_asignatura = self.request.query_params.get("id_asignatura")
        if id_asignatura:
            qs = qs.filter(id_asignatura=id_asignatura)

        obj = qs.order_by("id_asignatura").first()
        if not obj:
            raise NotFound("Asignatura no encontrada")

        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=["get"])
    def estudiantes(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        qs = Matricula.objects.filter(asignatura=asignatura).select_related("estudiante", "periodo")
        pid = request.query_params.get("id_periodo")
        periodo_desc = request.query_params.get("periodo")
        if pid:
            qs = qs.filter(periodo_id=pid)
        elif periodo_desc:
            p = PeriodoAcademico.objects.filter(descripcion=periodo_desc).first()
            if p: qs = qs.filter(periodo=p)
        rows = [{
            "id_estudiante": m.estudiante_id,
            "codigo_estudiante": m.estudiante.codigo_estudiante,
            "nombre": m.estudiante.nombre,
            "apellido": m.estudiante.apellido,
            "primer_nombre": m.estudiante.nombre,  # Compatibilidad
            "primer_apellido": m.estudiante.apellido,  # Compatibilidad
            "id_matricula": m.id_matricula,
            "periodo": m.periodo.descripcion,
        } for m in qs.order_by("estudiante__nombre", "estudiante__apellido")]
        return Response(rows)

    @action(detail=True, methods=["get"], url_path="mi-matricula")
    def mi_matricula(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        token = _bearer_token(request)
        student_id = None
        if token:
            try:
                data = signing.loads(token, max_age=TOKEN_MAX_AGE)
                if data.get("rol") == "estudiante":
                    student_id = data.get("id")
            except Exception:
                pass
        if not student_id:
            student_id = request.query_params.get("id_estudiante")
        if not student_id:
            return Response({"detail": "id_estudiante requerido"}, status=status.HTTP_400_BAD_REQUEST)
        mat = Matricula.objects.filter(asignatura=asignatura, estudiante_id=student_id).order_by("-id_matricula").first()
        if not mat:
            return Response({"id_matricula": None}, status=status.HTTP_200_OK)
        return Response({"id_matricula": mat.id_matricula}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="periodos")
    def periodos(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        qs = (PeriodoAcademico.objects
              .filter(matricula__asignatura=asignatura)
              .distinct()
              .order_by("fecha_inicio"))
        return Response([{"id_periodo": p.id_periodo, "descripcion": p.descripcion} for p in qs])

    @action(detail=True, methods=["get"], url_path="ras")
    def ras(self, request, codigo_asignatura=None):
        asignatura = self.get_object()
        qs = ResultadoDeAprendizaje.objects.filter(asignatura=asignatura).order_by("id_ra")
        return Response([{
            "id_ra": r.id_ra,
            "id": r.id_ra,
            "porcentaje_ra": float(r.porcentaje_ra),
            "descripcion": r.descripcion,
        } for r in qs])

    @action(detail=True, methods=["get", "post"], url_path="recursos", permission_classes=[AllowAny], authentication_classes=[])
    def recursos(self, request, codigo_asignatura=None):
        # Buscar asignatura por código
        asign = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
        if not asign:
            return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # GET: listar recursos con URL absoluta para descarga
        if request.method.lower() == "get":
            qs = Recurso.objects.filter(asignatura=asign).order_by("-fecha_subida")
            base_url = request.build_absolute_uri("/")[:-1]  # http://localhost:8000
            out = []
            for r in qs:
                rel = r.archivo.url if hasattr(r.archivo, "url") else ""
                abs_url = (base_url + rel) if rel.startswith("/") else rel
                out.append({
                    "id_recurso": r.id_recurso,
                    "titulo": r.titulo,
                    "archivo": rel,
                    "archivo_url": abs_url,
                    "fecha_subida": r.fecha_subida,
                })
            return Response(out)

        # POST: subir archivo
        titulo = request.data.get("titulo") or request.data.get("title") or "Recurso"
        f = request.FILES.get("file") or request.FILES.get("archivo")
        if not f:
            return Response({"detail": "Archivo requerido (file)"}, status=status.HTTP_400_BAD_REQUEST)
        rec = Recurso.objects.create(asignatura=asign, titulo=titulo, archivo=f)
        abs_url = request.build_absolute_uri(rec.archivo.url)
        return Response({
            "id_recurso": rec.id_recurso,
            "titulo": rec.titulo,
            "archivo": rec.archivo.url,
            "archivo_url": abs_url,
            "fecha_subida": rec.fecha_subida,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="anuncios")
    def anuncios(self, request, codigo_asignatura=None):
        asign = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
        if not asign:
            return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # GET: listar anuncios
        if request.method.lower() == "get":
            qs = Anuncio.objects.filter(asignatura=asign).select_related("docente").order_by("-fecha_publicacion")
            out = []
            for a in qs:
                out.append({
                    "id": a.id,
                    "titulo": a.titulo,
                    "contenido": a.contenido,
                    "fecha_publicacion": a.fecha_publicacion,
                    "es_importante": a.es_importante,
                    "docente_nombre": f"{a.docente.nombre} {a.docente.apellido}",
                })
            return Response(out)

        # POST: crear anuncio (requiere autenticación de docente)
        token = _bearer_token(request)
        docente_id = None
        if token:
            try:
                data = signing.loads(token, max_age=TOKEN_MAX_AGE)
                if data.get("rol") == "docente":
                    docente_id = data.get("id")
            except Exception:
                pass
        
        if not docente_id:
            return Response({"detail": "Autenticación de docente requerida"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verificar que el docente pertenece a la asignatura
        if asign.docente_id != docente_id:
            return Response({"detail": "No tienes permiso para crear anuncios en esta asignatura"}, status=status.HTTP_403_FORBIDDEN)
        
        titulo = request.data.get("titulo", "").strip()
        contenido = request.data.get("contenido", "").strip()
        es_importante = request.data.get("es_importante", False)
        
        if not titulo:
            return Response({"detail": "El título es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        if not contenido:
            return Response({"detail": "El contenido es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        
        anuncio = Anuncio.objects.create(
            asignatura=asign,
            docente_id=docente_id,
            titulo=titulo,
            contenido=contenido,
            es_importante=bool(es_importante)
        )
        
        return Response({
            "id": anuncio.id,
            "titulo": anuncio.titulo,
            "contenido": anuncio.contenido,
            "fecha_publicacion": anuncio.fecha_publicacion,
            "es_importante": anuncio.es_importante,
        }, status=status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_indicadores_view(request, ra_id: int):
    inds = IndicadoresDeLogro.objects.filter(ra_id=ra_id).order_by("id_ind")
    return Response([{
        "id": ind.id_ind,
        "id_ind": ind.id_ind,
        "descripcion": ind.descripcion,
    } for ind in inds])

@api_view(["DELETE"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_indicador_detail_view(request, ra_id: int, ind_id: int):
    """
    DELETE: Elimina un indicador de logro de un RA.
      Requiere:
        - Header Authorization con token de docente

      Efectos:
        - Elimina el Indicador (cascada elimina vínculos ra_actividad_indicador)
        - En notas_actividad, el indicador asociado se establece en NULL (SET_NULL)
    """
    ind = IndicadoresDeLogro.objects.filter(pk=ind_id, ra_id=ra_id).first()
    if not ind:
        return Response({"detail": "Indicador no encontrado para este RA"}, status=status.HTTP_404_NOT_FOUND)

    _, _, auth_err = _require_docente_for_ra(request, ra_id)
    if auth_err:
        return auth_err

    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    if tok.get("rol") != "docente":
        return Response({"detail": "Sólo un docente puede eliminar indicadores"}, status=status.HTTP_403_FORBIDDEN)
    docente_id = tok.get("id")
    doc = Docente.objects.filter(pk=docente_id).first()
    if not doc:
        return Response({"detail": "Docente no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)

    with transaction.atomic():
        # Eliminación en cascada de relaciones se maneja por FK CASCADE en RaActividadIndicador
        ind.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["DELETE"])
@permission_classes([AllowAny])
@authentication_classes([])
def anuncio_delete_view(request, anuncio_id: int):
    """
    DELETE: Elimina un anuncio.
    Requiere:
      - Header Authorization con token de docente
      - El docente debe ser el dueño del anuncio
    """
    anuncio = Anuncio.objects.filter(pk=anuncio_id).select_related("docente", "asignatura").first()
    if not anuncio:
        return Response({"detail": "Anuncio no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    if tok.get("rol") != "docente":
        return Response({"detail": "Solo un docente puede eliminar anuncios"}, status=status.HTTP_403_FORBIDDEN)
    
    docente_id = tok.get("id")
    
    # Verificar que el docente es el dueño del anuncio O es el docente de la asignatura
    if anuncio.docente_id != docente_id and anuncio.asignatura.docente_id != docente_id:
        return Response({"detail": "No tienes permiso para eliminar este anuncio"}, status=status.HTTP_403_FORBIDDEN)
    
    anuncio.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def docente_crear_indicador_view(request, ra_id: int):
    """
    Crea un nuevo indicador de logro para un RA.
    Solo docentes pueden crear indicadores de sus propios RAs.
    
    Body esperado:
    {
        "descripcion": "str (requerido)"
    }
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    if tok.get("rol") != "docente":
        return Response({"detail": "Solo docentes pueden crear indicadores"}, status=status.HTTP_403_FORBIDDEN)
    
    docente_id = tok.get("id")
    
    # Verificar que el RA existe y pertenece a una asignatura del docente
    ra = ResultadoDeAprendizaje.objects.select_related('asignatura').filter(id_ra=ra_id).first()
    if not ra:
        return Response({"detail": "RA no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    if ra.asignatura.docente_id != docente_id:
        return Response({"detail": "No tienes permiso para crear indicadores en este RA"}, status=status.HTTP_403_FORBIDDEN)
    
    data = request.data or {}
    descripcion = str(data.get("descripcion") or "").strip()
    
    if not descripcion:
        return Response({"detail": "La descripción del indicador es requerida"}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(descripcion) > 1000:
        return Response({"detail": "La descripción no puede exceder 1000 caracteres"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar que no exista un indicador con la misma descripción en este RA
    existe = IndicadoresDeLogro.objects.filter(ra_id=ra_id, descripcion__iexact=descripcion).exists()
    if existe:
        return Response({"detail": f"Ya existe un indicador con la descripción '{descripcion}' en este RA"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        indicador = IndicadoresDeLogro.objects.create(
            ra_id=ra_id,
            descripcion=descripcion
        )
        return Response({
            "detail": "Indicador creado exitosamente",
            "indicador": {
                "id_ind": indicador.id_ind,
                "descripcion": indicador.descripcion,
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"detail": f"Error al crear indicador: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PUT"])
@permission_classes([AllowAny])
@authentication_classes([])
def docente_actualizar_indicador_view(request, ra_id: int, ind_id: int):
    """
    Actualiza la descripción de un indicador de logro.
    Solo el docente propietario del RA puede actualizar.
    
    Body esperado:
    {
        "descripcion": "str (requerido)"
    }
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    
    if tok.get("rol") != "docente":
        return Response({"detail": "Solo docentes pueden actualizar indicadores"}, status=status.HTTP_403_FORBIDDEN)
    
    docente_id = tok.get("id")
    
    # Verificar que el indicador existe y pertenece al RA especificado
    indicador = IndicadoresDeLogro.objects.select_related('ra__asignatura').filter(id_ind=ind_id, ra_id=ra_id).first()
    if not indicador:
        return Response({"detail": "Indicador no encontrado para este RA"}, status=status.HTTP_404_NOT_FOUND)
    
    # Verificar que el docente tiene permiso
    if indicador.ra.asignatura.docente_id != docente_id:
        return Response({"detail": "No tienes permiso para actualizar este indicador"}, status=status.HTTP_403_FORBIDDEN)
    
    data = request.data or {}
    descripcion = str(data.get("descripcion") or "").strip()
    
    if not descripcion:
        return Response({"detail": "La descripción del indicador es requerida"}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(descripcion) > 1000:
        return Response({"detail": "La descripción no puede exceder 1000 caracteres"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar que no exista otro indicador con la misma descripción en este RA
    existe = IndicadoresDeLogro.objects.filter(
        ra_id=ra_id, 
        descripcion__iexact=descripcion
    ).exclude(id_ind=ind_id).exists()
    if existe:
        return Response({"detail": f"Ya existe otro indicador con la descripción '{descripcion}' en este RA"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        indicador.descripcion = descripcion
        indicador.save()
        return Response({
            "detail": "Indicador actualizado exitosamente",
            "indicador": {
                "id_ind": indicador.id_ind,
                "descripcion": indicador.descripcion,
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"detail": f"Error al actualizar indicador: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_actividades_view(request, ra_id: int):
    if request.method == "GET":
        id_matricula = request.query_params.get("id_matricula")
        rels = (RaActividad.objects
                .filter(ra_id=ra_id)
                .select_related("actividad__tipo_actividad")
                .prefetch_related("indicadores_rel__indicador"))
        out = []
        for rel in rels:
            act = rel.actividad
            inds = [
                {
                    "id_ind": rir.indicador_id,
                    "descripcion": rir.indicador.descripcion,
                }
                for rir in rel.indicadores_rel.all()
            ]
            row = {
                "id_actividad": act.id_actividad,
                "id_ra_actividad": rel.id_ra_actividad,
                "nombre_actividad": act.nombre_actividad,
                "descripcion": act.descripcion,
                "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
                "id_tipo_actividad": act.tipo_actividad_id,
                "tipo_actividad": getattr(act.tipo_actividad, "descripcion", None),
                "fecha_cierre": act.fecha_cierre,
                "indicadores": inds,
            }
            if id_matricula:
                # 🔴 CRÍTICO: Devolver TODAS las notas por indicador para que el frontend pueda seleccionar
                notas = list(NotasActividad.objects
                        .filter(matricula_id=id_matricula, ra_actividad_id=rel.id_ra_actividad)
                        .order_by('indicador_id'))
                
                # Devolver array de notas con sus indicadores
                row["notas_por_indicador"] = [
                    {
                        "nota": float(n.nota_ra_actividad) if n.nota_ra_actividad is not None else None,
                        "retroalimentacion": n.retroalimentacion,
                        "id_ind": n.indicador_id,
                    }
                    for n in notas
                ]
                
                # Por compatibilidad, seguir devolviendo la primera nota en los campos legacy
                if notas:
                    nota = notas[0]
                    row["nota"] = float(nota.nota_ra_actividad) if nota.nota_ra_actividad is not None else None
                    row["retroalimentacion"] = nota.retroalimentacion
                    row["id_ind"] = nota.indicador_id
            out.append(row)
        return Response(out, status=status.HTTP_200_OK)

    _, ra_obj, auth_err = _require_docente_for_ra(request, ra_id)
    if auth_err:
        return auth_err

    body = request.data or {}
    nombre = body.get("nombre_actividad")
    id_tipo = body.get("id_tipo_actividad")
    porcentaje_ra_actividad = body.get("porcentaje_ra_actividad")
    descripcion = body.get("descripcion")
    fecha_cierre = body.get("fecha_cierre")
    indicadores = body.get("indicadores")  # Lista opcional de ids de indicadores

    if not (nombre and id_tipo is not None):
        return Response({"message": "Campos requeridos: nombre_actividad, id_tipo_actividad"},
                        status=status.HTTP_400_BAD_REQUEST)

    # fecha_cierre es obligatoria y no puede ser en el pasado
    if not fecha_cierre:
        return Response({"message": "fecha_cierre es requerido (AAAA-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        fecha_cierre_dt = datetime.datetime.strptime(str(fecha_cierre), "%Y-%m-%d").date()
    except ValueError:
        return Response({"message": "fecha_cierre debe tener formato AAAA-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
    hoy = datetime.date.today()
    if fecha_cierre_dt < hoy:
        return Response({"message": "fecha_cierre no puede ser anterior a hoy"}, status=status.HTTP_400_BAD_REQUEST)

    # porcentaje_ra_actividad es obligatorio y debe ser > 0 y <= 100
    if porcentaje_ra_actividad is None or str(porcentaje_ra_actividad).strip() == "":
        return Response({"message": "porcentaje_ra_actividad es requerido"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        pct_value = float(porcentaje_ra_actividad)
    except (TypeError, ValueError):
        return Response({"message": "porcentaje_ra_actividad debe ser numérico"}, status=status.HTTP_400_BAD_REQUEST)
    if pct_value <= 0 or pct_value > 100:
        return Response({"message": "porcentaje_ra_actividad debe ser mayor que 0 y no exceder 100"}, status=status.HTTP_400_BAD_REQUEST)

    suma_actual = (RaActividad.objects.filter(ra_id=ra_id)
                   .aggregate(v=Sum("porcentaje_ra_actividad"))["v"] or 0)
    nuevo_total = float(suma_actual) + float(pct_value)
    if nuevo_total > 100.0:
        return Response({"message": f"El porcentaje total del RA excede 100% ({nuevo_total:.2f}%). Ajusta porcentaje_ra_actividad."},
                        status=status.HTTP_400_BAD_REQUEST)

    # indicadores es obligatorio (al menos uno) y deben pertenecer al RA
    if not isinstance(indicadores, (list, tuple)) or len(indicadores) == 0:
        return Response({"message": "Debes asignar al menos un indicador del RA"}, status=status.HTTP_400_BAD_REQUEST)
    valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=ra_id, id_ind__in=indicadores).values_list("id_ind", flat=True))
    if not valid_inds:
        # Puede ser que el RA no tenga indicadores o que los ids no correspondan
        exists_any = IndicadoresDeLogro.objects.filter(ra_id=ra_id).exists()
        if not exists_any:
            return Response({"message": "Este RA no tiene indicadores definidos. No se puede crear la actividad sin indicadores."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Los indicadores enviados no corresponden al RA"}, status=status.HTTP_400_BAD_REQUEST)

    act = Actividad.objects.create(
        tipo_actividad_id=id_tipo,
        nombre_actividad=nombre,
        descripcion=descripcion,
        fecha_creacion=datetime.date.today(),
        fecha_cierre=fecha_cierre_dt,
    )
    rel = RaActividad.objects.create(actividad=act, ra_id=ra_id, porcentaje_ra_actividad=pct_value)
    # Asignar indicadores (obligatorios ya validados)
    bulk = [RaActividadIndicador(ra_actividad=rel, indicador_id=i) for i in valid_inds]
    RaActividadIndicador.objects.bulk_create(bulk, ignore_conflicts=True)
    
    # Crear notificación personalizada para cada estudiante del curso
    try:
        if ra_obj:
            asignatura = ra_obj.asignatura
            # Obtener todos los estudiantes matriculados en la asignatura
            matriculas = Matricula.objects.filter(asignatura=asignatura).select_related('estudiante')
            
            fecha_str = fecha_cierre_dt.strftime("%d/%m/%Y")
            notif_link = f"/estudiante?curso={asignatura.codigo_asignatura}"
            
            # Crear notificación personalizada para cada estudiante
            for mat in matriculas:
                notif_text = f"{mat.estudiante.nombre}, nueva actividad en {asignatura.nombre}: {nombre} - Vence: {fecha_str}"
                _add_notification(mat.estudiante_id, "deadline", notif_text, notif_link)
    except Exception:
        pass  # No fallar si hay error en notificación
    
    return Response({
        "id_actividad": act.id_actividad,
        "id_ra_actividad": rel.id_ra_actividad,
        "nombre_actividad": act.nombre_actividad,
        "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
    }, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_actividad_detail_view(request, ra_id: int, rel_id: int):
    """
    PATCH: Actualiza una actividad (y/o su relación con el RA) validando reglas de porcentajes.
      Body opcional:
    - nombre_actividad, descripcion, fecha_cierre (AAAA-MM-DD)
        - porcentaje_ra_actividad (para la relación actual con este RA)
        - indicadores: [ids] (reemplaza el set de indicadores para esta relación)

    DELETE: Elimina la relación RA-Actividad. Si la Actividad no queda asociada a ningún RA, elimina también la Actividad.
      Requiere password del perfil del docente en body: { password: "..." }
      (La doble confirmación se gestiona en el front; aquí sólo se valida contraseña y se elimina.)
    """
    rel = (RaActividad.objects
           .filter(pk=rel_id, ra_id=ra_id)
           .select_related("actividad")
           .first())
    if not rel:
        return Response({"detail": "Relación RA-Actividad no existe"}, status=status.HTTP_404_NOT_FOUND)

    act = rel.actividad

    if request.method == "PATCH":
        _, _, auth_err = _require_docente_for_ra(request, ra_id)
        if auth_err:
            return auth_err

        body = request.data or {}
        nombre = body.get("nombre_actividad")
        descripcion = body.get("descripcion")
        pct_rel = body.get("porcentaje_ra_actividad")
        fecha_cierre = body.get("fecha_cierre")
        indicadores = body.get("indicadores")

        # Parse fecha si viene
        fecha_cierre_dt = act.fecha_cierre
        if fecha_cierre is not None:
            if fecha_cierre == "" or fecha_cierre is None:
                fecha_cierre_dt = None
            else:
                try:
                    fecha_cierre_dt = datetime.datetime.strptime(str(fecha_cierre), "%Y-%m-%d").date()
                except ValueError:
                    return Response({"message": "fecha_cierre debe tener formato AAAA-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        # Validaciones de porcentajes
        # 1) Si cambia porcentaje_ra_actividad, la suma en este RA no debe pasar 100
        if pct_rel is not None:
            try:
                pct_rel_f = float(pct_rel)
            except (TypeError, ValueError):
                return Response({"message": "porcentaje_ra_actividad debe ser numérico"}, status=status.HTTP_400_BAD_REQUEST)
            suma_otros = (RaActividad.objects
                          .filter(ra_id=ra_id)
                          .exclude(pk=rel.id_ra_actividad)
                          .aggregate(v=Sum("porcentaje_ra_actividad"))['v'] or 0)
            if float(suma_otros) + pct_rel_f > 100.0 + 1e-6:
                return Response({
                    "message": f"El RA {ra_id} excede 100% con este aporte ({float(suma_otros)+pct_rel_f:.2f}%). Ajusta porcentaje_ra_actividad.",
                    "ra_id": ra_id,
                    "suma_actual": float(suma_otros),
                }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Actualizar actividad
            updates_act = []
            if nombre is not None:
                act.nombre_actividad = nombre
                updates_act.append("nombre_actividad")
            if descripcion is not None:
                act.descripcion = descripcion
                updates_act.append("descripcion")
            if fecha_cierre is not None:
                act.fecha_cierre = fecha_cierre_dt
                updates_act.append("fecha_cierre")
            if updates_act:
                act.save(update_fields=updates_act)

            # Actualizar relación
            if pct_rel is not None:
                rel.porcentaje_ra_actividad = pct_rel
                rel.save(update_fields=["porcentaje_ra_actividad"])

            # Reemplazar indicadores si vienen
            if isinstance(indicadores, (list, tuple)):
                # Validar que sean del mismo RA
                valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=ra_id, id_ind__in=indicadores).values_list("id_ind", flat=True))
                # Borrar actuales y crear nuevos
                RaActividadIndicador.objects.filter(ra_actividad=rel).delete()
                bulk = [RaActividadIndicador(ra_actividad=rel, indicador_id=i) for i in valid_inds]
                if bulk:
                    RaActividadIndicador.objects.bulk_create(bulk, ignore_conflicts=True)

        return Response({
            "id_actividad": act.id_actividad,
            "id_ra_actividad": rel.id_ra_actividad,
            "nombre_actividad": act.nombre_actividad,
            "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
            "descripcion": act.descripcion,
            "fecha_cierre": act.fecha_cierre,
        })

    # DELETE
    # Validar token para conocer rol y usuario; exigir contraseña del docente
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    if tok.get("rol") != "docente":
        return Response({"detail": "Sólo un docente puede eliminar actividades"}, status=status.HTTP_403_FORBIDDEN)
    docente_id = tok.get("id")
    doc = Docente.objects.filter(pk=docente_id).first()
    if not doc:
        return Response({"detail": "Docente no encontrado"}, status=status.HTTP_401_UNAUTHORIZED)

    password = (request.data or {}).get("password")
    password_ok = check_user_password(doc.contrasenia_docente, password)
    if not password:
        return Response({"message": "Se requiere la contraseña para confirmar la eliminación"}, status=status.HTTP_400_BAD_REQUEST)
    if not password_ok:
        return Response({"message": "Contraseña incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        if not check_password(password, doc.contrasenia_docente) and password != (doc.contrasenia_docente or ""):
            return Response({"message": "Contraseña incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        # Si la contraseña en DB está en plano (entorno de prueba), permitir comparación directa arriba
        pass

    with transaction.atomic():
        # Eliminar relación y sus indicadores asociados
        RaActividadIndicador.objects.filter(ra_actividad=rel).delete()
        rel.delete()
        # Si la actividad ya no tiene más relaciones, eliminar la actividad (y notas vía FK)
        if not RaActividad.objects.filter(actividad=act).exists():
            act.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST", "PUT"])
@permission_classes([AllowAny])
@authentication_classes([])
def notas_view(request):
    body = request.data or {}
    id_matricula = body.get("id_matricula")
    id_ra_actividad = body.get("id_ra_actividad")
    nota = body.get("nota")
    retro = body.get("retroalimentacion")
    id_ind = body.get("id_ind")
    if not (id_matricula and id_ra_actividad and nota is not None):
        return Response({"detail": "Campos requeridos"}, status=status.HTTP_400_BAD_REQUEST)

    _, _, rel, auth_err = _require_docente_for_grade(request, id_matricula, id_ra_actividad)
    if auth_err:
        return auth_err
    
    # Normalizar id_ind: convertir valores vacíos, 'null', 'undefined' a None
    if id_ind in (None, '', 'null', 'undefined'):
        id_ind = None
    elif not RaActividadIndicador.objects.filter(ra_actividad=rel, indicador_id=id_ind).exists():
        return Response({"detail": "El indicador no está asociado a esta actividad"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Incluir indicador en la búsqueda para permitir múltiples notas por indicador
    obj, created = NotasActividad.objects.get_or_create(
        matricula_id=id_matricula,
        ra_actividad_id=id_ra_actividad,
        indicador_id=id_ind,  # Incluido en la clave única
        defaults={"nota_ra_actividad": nota, "retroalimentacion": retro},
    )
    if not created:
        obj.nota_ra_actividad = nota
        obj.retroalimentacion = retro
        obj.save(update_fields=["nota_ra_actividad", "retroalimentacion"])
    
    # Crear notificación personalizada para el estudiante
    try:
        matricula = obj.matricula
        ra_act = obj.ra_actividad
        actividad = ra_act.actividad
        asignatura = ra_act.ra.asignatura
        estudiante = matricula.estudiante
        
        # Mensaje personalizado con el nombre del estudiante
        notif_text = f"{estudiante.nombre}, tu calificación en {asignatura.nombre}: {actividad.nombre_actividad} es {nota}/5"
        notif_link = f"/estudiante?curso={asignatura.codigo_asignatura}"
        
        _add_notification(estudiante.id_estudiante, "grade", notif_text, notif_link)
    except Exception:
        pass  # No fallar si hay error en notificación
    
    return Response({
        "id": obj.id,
        "id_matricula": obj.matricula_id,
        "id_ra_actividad": obj.ra_actividad_id,
        "nota": float(obj.nota_ra_actividad) if obj.nota_ra_actividad is not None else None,
        "retroalimentacion": obj.retroalimentacion,
        "id_ind": obj.indicador_id,
    }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_student_indicators_view(request, codigo_asignatura: str, id_estudiante: int):
    from django.db.models import F, Avg, Case, When, DecimalField
    
    asignatura = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asignatura:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)
    _, auth_err = _require_asignatura_access(request, asignatura, id_estudiante=id_estudiante)
    if auth_err:
        return auth_err
    mat = Matricula.objects.filter(asignatura=asignatura, estudiante_id=id_estudiante).order_by("-id_matricula").first()
    if not mat:
        return Response([], status=status.HTTP_200_OK)
    
    # Optimized: Use a single aggregation query instead of N+1 queries
    inds = IndicadoresDeLogro.objects.filter(ra__asignatura=asignatura).select_related("ra").annotate(
        avg_nota=Avg(
            Case(
                When(notasactividad__matricula=mat, then=F('notasactividad__nota_ra_actividad')),
                default=None,
                output_field=DecimalField()
            )
        )
    )
    
    rows = []
    for ind in inds:
        avg_nota = ind.avg_nota
        rows.append({
            "id_ind": ind.id_ind,
            "ra_id": ind.ra_id,
            "descripcion": ind.descripcion,
            "avg_nota": float(avg_nota) if avg_nota is not None else None,
            "avg_pct": float(avg_nota * 20) if avg_nota is not None else None,
        })
    return Response(rows)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_grade_view(request, codigo_asignatura: str, id_estudiante: int):
    """
    Devuelve el consolidado de calificaciones de un estudiante en una asignatura,
    usando únicamente porcentajes de RA (porcentaje_ra) y los aportes de actividades
    dentro de cada RA (porcentaje_ra_actividad). El peso interno de la actividad NO existe.

    Calcula dos variantes:
      - strict: trata actividades no calificadas como 0 (aplican su peso igualmente).
      - progressive: normaliza sobre el peso ya calificado (no penaliza lo pendiente).

    Respuesta ejemplo:
    {
      "asignatura": { "codigo": "CS101", "nombre": "Curso" },
      "matricula_id": 123,
      "total": { "strict": 3.45, "progressive": 4.10, "coverage": 0.65 },
      "ras": [
        {
          "id_ra": 10,
          "descripcion": "...",
          "porcentaje_ra": 40.0,
          "strict": 3.30,
          "progressive": 4.12,
          "coverage": 0.50,
          "actividades": [
            { "id_ra_actividad": 55, "id_actividad": 77, "nombre": "Quiz", "porcentaje_ra_actividad": 25.0, "nota": 4.0 }
          ]
        }
      ]
    }
    """
    asig = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asig:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)
    _, auth_err = _require_asignatura_access(request, asig, id_estudiante=id_estudiante)
    if auth_err:
        return auth_err

    mat = (Matricula.objects
           .filter(asignatura=asig, estudiante_id=id_estudiante)
           .order_by("-id_matricula")
           .first())
    if not mat:
        return Response({"detail": "Sin matrícula para este estudiante en la asignatura"}, status=status.HTTP_404_NOT_FOUND)

    # RAs de la asignatura
    ras = list(ResultadoDeAprendizaje.objects.filter(asignatura=asig))

    out_ras = []
    total_strict = 0.0
    total_prog = 0.0
    total_coverage = 0.0  # cobertura ponderada por RA

    for ra in ras:
        rels = list(RaActividad.objects.filter(ra=ra).select_related("actividad"))

        # Construir lista de (nota, w_ra_act)
        items = []
        sum_w = 0.0
        sum_w_graded = 0.0
        acc_strict = 0.0
        for rel in rels:
            w = float(rel.porcentaje_ra_actividad) / 100.0
            sum_w += w
            nota_obj = NotasActividad.objects.filter(matricula=mat, ra_actividad=rel).first()
            nota = float(nota_obj.nota_ra_actividad) if (nota_obj and nota_obj.nota_ra_actividad is not None) else None
            if nota is not None:
                sum_w_graded += w
                acc_strict += nota * w
            items.append({
                "id_ra_actividad": rel.id_ra_actividad,
                "id_actividad": rel.actividad_id,
                "nombre": getattr(rel.actividad, "nombre_actividad", None),
                "porcentaje_ra_actividad": float(rel.porcentaje_ra_actividad),
                "nota": nota,
            })

        # Por robustez ante configuraciones incompletas, no asumimos exactamente 1.0
        # strict: actividades sin nota cuentan como 0 (ya contemplado en acc_strict)
        ra_strict = acc_strict  # escala 0..5

        # progressive: normaliza por peso ya calificado
        if sum_w_graded > 0.0:
            ra_prog = acc_strict / sum_w_graded
            coverage = min(1.0, max(0.0, sum_w_graded / (sum_w if sum_w > 0 else 1.0)))
        else:
            ra_prog = None
            coverage = 0.0

        w_ra = float(ra.porcentaje_ra) / 100.0
        total_strict += (ra_strict or 0.0) * w_ra
        total_prog += (ra_prog or 0.0) * w_ra
        total_coverage += coverage * w_ra

        out_ras.append({
            "id_ra": ra.id_ra,
            "numero_ra": ra.numero_ra,
            "descripcion": ra.descripcion,
            "porcentaje_ra": float(ra.porcentaje_ra),
            "strict": round(ra_strict, 2) if ra_strict is not None else None,
            "progressive": round(ra_prog, 2) if ra_prog is not None else None,
            "coverage": round(coverage, 4),
            "actividades": items,
        })

    return Response({
        "asignatura": {"codigo": asig.codigo_asignatura, "nombre": asig.nombre},
        "matricula_id": mat.id_matricula,
        "total": {
            "strict": round(total_strict, 2),
            "progressive": round(total_prog, 2) if total_prog != 0.0 else 0.0,
            "coverage": round(total_coverage, 4),
        },
        "ras": out_ras,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_detail_view(request, codigo_asignatura: str, id_estudiante: int):
    """
    Devuelve información detallada de una asignatura para un estudiante específico.
    Incluye:
    - Información de la asignatura
    - Información del docente
    - Total de estudiantes matriculados
    - Estadísticas del estudiante (nota, cobertura)
    - Estadísticas del curso (promedio, desviación)
    - Lista de RAs con progreso
    """
    asig = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).select_related("docente", "programa", "periodo").first()
    if not asig:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)
    _, auth_err = _require_asignatura_access(request, asig, id_estudiante=id_estudiante)
    if auth_err:
        return auth_err

    # Verificar matrícula del estudiante
    mat = (Matricula.objects
           .filter(asignatura=asig, estudiante_id=id_estudiante)
           .select_related("periodo")
           .order_by("-id_matricula")
           .first())
    
    if not mat:
        return Response({"detail": "Sin matrícula para este estudiante en la asignatura"}, status=status.HTTP_404_NOT_FOUND)

    # Información básica de la asignatura
    asignatura_info = {
        "codigo": asig.codigo_asignatura,
        "nombre": asig.nombre,
        "grupo": asig.grupo,
        "sede": asig.sede,
        "creditos": int(getattr(asig, "creditos", 0) or 0),
        "programa": {
            "codigo": asig.programa.codigo_programa if asig.programa else None,
            "nombre": asig.programa.nombre if asig.programa else None,
        },
        "periodo": {
            "id": asig.periodo.id_periodo if asig.periodo else (mat.periodo.id_periodo if mat.periodo else None),
            "descripcion": asig.periodo.descripcion if asig.periodo else (mat.periodo.descripcion if mat.periodo else None),
        },
    }

    # Información del docente
    docente_info = None
    if asig.docente:
        docente_info = {
            "codigo": asig.docente.codigo_docente,
            "nombre": f"{asig.docente.nombre} {asig.docente.apellido}",
            "correo": asig.docente.correo,
        }

    # Total de estudiantes matriculados en este curso
    total_estudiantes = Matricula.objects.filter(asignatura=asig, periodo=mat.periodo).count()

    # Calcular estadísticas del estudiante
    ras = list(ResultadoDeAprendizaje.objects.filter(asignatura=asig))
    
    estudiante_stats = {
        "nota_strict": 0.0,
        "nota_progressive": 0.0,
        "coverage": 0.0,
        "actividades_totales": 0,
        "actividades_calificadas": 0,
    }

    total_strict = 0.0
    total_prog = 0.0
    total_coverage = 0.0
    total_acts = 0
    total_acts_graded = 0

    ras_info = []

    for ra in ras:
        rels = list(RaActividad.objects.filter(ra=ra).select_related("actividad"))
        sum_w = 0.0
        sum_w_graded = 0.0
        acc_strict = 0.0
        acts_graded = 0

        for rel in rels:
            total_acts += 1
            w = float(rel.porcentaje_ra_actividad) / 100.0
            sum_w += w
            nota_obj = NotasActividad.objects.filter(matricula=mat, ra_actividad=rel).first()
            nota = float(nota_obj.nota_ra_actividad) if (nota_obj and nota_obj.nota_ra_actividad is not None) else None
            if nota is not None:
                sum_w_graded += w
                acc_strict += nota * w
                acts_graded += 1
                total_acts_graded += 1

        ra_strict = acc_strict
        ra_prog = acc_strict / sum_w_graded if sum_w_graded > 0.0 else None
        coverage = min(1.0, max(0.0, sum_w_graded / (sum_w if sum_w > 0 else 1.0)))

        w_ra = float(ra.porcentaje_ra) / 100.0
        total_strict += (ra_strict or 0.0) * w_ra
        total_prog += (ra_prog or 0.0) * w_ra
        total_coverage += coverage * w_ra

        ras_info.append({
            "id_ra": ra.id_ra,
            "numero_ra": ra.numero_ra,
            "descripcion": ra.descripcion,
            "porcentaje_ra": float(ra.porcentaje_ra),
            "actividades_total": len(rels),
            "actividades_calificadas": acts_graded,
            "coverage": round(coverage * 100, 1),
            "nota": round(ra_prog, 2) if ra_prog is not None else None,
        })

    estudiante_stats["nota_strict"] = round(total_strict, 2)
    estudiante_stats["nota_progressive"] = round(total_prog, 2) if total_prog != 0.0 else 0.0
    estudiante_stats["coverage"] = round(total_coverage * 100, 1)
    estudiante_stats["actividades_totales"] = total_acts
    estudiante_stats["actividades_calificadas"] = total_acts_graded

    # Calcular estadísticas del curso (promedio de todos los estudiantes)
    # Obtenemos todas las matrículas del mismo periodo
    matriculas_curso = Matricula.objects.filter(asignatura=asig, periodo=mat.periodo).select_related("estudiante")
    
    notas_curso = []
    for m in matriculas_curso:
        nota_m = 0.0
        for ra in ras:
            rels = list(RaActividad.objects.filter(ra=ra))
            sum_w = 0.0
            sum_w_graded = 0.0
            acc_strict = 0.0
            
            for rel in rels:
                w = float(rel.porcentaje_ra_actividad) / 100.0
                sum_w += w
                nota_obj = NotasActividad.objects.filter(matricula=m, ra_actividad=rel).first()
                nota = float(nota_obj.nota_ra_actividad) if (nota_obj and nota_obj.nota_ra_actividad is not None) else None
                if nota is not None:
                    sum_w_graded += w
                    acc_strict += nota * w
            
            ra_prog = acc_strict / sum_w_graded if sum_w_graded > 0.0 else 0.0
            w_ra = float(ra.porcentaje_ra) / 100.0
            nota_m += ra_prog * w_ra
        
        notas_curso.append(nota_m)

    curso_stats = {
        "promedio": 0.0,
        "nota_max": 0.0,
        "nota_min": 0.0,
        "estudiantes_aprobados": 0,
        "estudiantes_reprobados": 0,
    }

    if notas_curso:
        curso_stats["promedio"] = round(sum(notas_curso) / len(notas_curso), 2)
        curso_stats["nota_max"] = round(max(notas_curso), 2)
        curso_stats["nota_min"] = round(min(notas_curso), 2)
        curso_stats["estudiantes_aprobados"] = sum(1 for n in notas_curso if n >= 3.0)
        curso_stats["estudiantes_reprobados"] = sum(1 for n in notas_curso if n < 3.0)

    return Response({
        "asignatura": asignatura_info,
        "docente": docente_info,
        "estudiantes_matriculados": total_estudiantes,
        "mi_estadistica": estudiante_stats,
        "estadistica_curso": curso_stats,
        "resultados_aprendizaje": ras_info,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_analytics_view(request, codigo_asignatura: str):
    """
    Devuelve análisis general de una asignatura para vista del coordinador.
    Incluye:
    - Información de la asignatura
    - Información del docente
    - Total de estudiantes matriculados
    - Estadísticas del curso (promedio, desviación, distribución de notas)
    - Lista de RAs con promedios generales
    - Lista de estudiantes con sus notas
    """
    id_asignatura = request.query_params.get("id_asignatura")
    grupo = (request.query_params.get("grupo") or "").strip()
    sede = (request.query_params.get("sede") or "").strip()

    # Obtener asignatura con optimización de queries
    asig_qs = Asignatura.objects.filter(
        codigo_asignatura=codigo_asignatura
    ).select_related(
        "docente", 
        "programa",
        "periodo"
    )

    if id_asignatura:
        asig_qs = asig_qs.filter(id_asignatura=id_asignatura)
    if grupo:
        asig_qs = asig_qs.filter(grupo=grupo)
    if sede:
        asig_qs = asig_qs.filter(sede=sede)

    asig = asig_qs.first()
    
    if not asig:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)

    # Obtener periodo más reciente para esta asignatura
    mat_reciente = (Matricula.objects
                    .filter(asignatura=asig)
                    .select_related("periodo")
                    .order_by("-periodo__id_periodo")
                    .first())
    
    periodo = asig.periodo or (mat_reciente.periodo if mat_reciente else None)

    # Información básica de la asignatura
    asignatura_info = {
        "codigo": asig.codigo_asignatura,
        "nombre": asig.nombre,
        "grupo": asig.grupo,
        "sede": asig.sede,
        "creditos": int(getattr(asig, "creditos", 0) or 0),
        "programa": {
            "codigo": asig.programa.codigo_programa if asig.programa else None,
            "nombre": asig.programa.nombre if asig.programa else None,
        },
        "periodo": {
            "id": periodo.id_periodo if periodo else None,
            "descripcion": periodo.descripcion if periodo else None,
        },
    }

    # Información del docente
    docente_info = None
    if asig.docente:
        docente_info = {
            "codigo": asig.docente.codigo_docente,
            "nombre": f"{asig.docente.nombre} {asig.docente.apellido}",
            "correo": asig.docente.correo,
        }

    # Optimización: Traer todas las matrículas con estudiantes en una sola query
    matriculas_curso = Matricula.objects.filter(asignatura=asig).select_related("estudiante")
    if periodo:
        matriculas_curso = matriculas_curso.filter(periodo=periodo)
    total_estudiantes = matriculas_curso.count()

    # Optimización: Prefetch RAs con todas sus relaciones
    ras = list(ResultadoDeAprendizaje.objects.filter(
        asignatura=asig
    ).prefetch_related(
        'raactividad_set',
        'raactividad_set__notasactividad_set',
        'raactividad_set__notasactividad_set__matricula'
    ))

    # Calcular estadísticas por estudiante
    estudiantes_data = []
    notas_curso = []

    for mat in matriculas_curso:
        nota_total = 0.0
        coverage_total = 0.0
        acts_calificadas = 0
        acts_totales = 0

        for ra in ras:
            # Usar datos ya prefetched para evitar N+1 queries
            rels = list(ra.raactividad_set.all())
            sum_w = 0.0
            sum_w_graded = 0.0
            acc_strict = 0.0
            
            for rel in rels:
                acts_totales += 1
                w = float(rel.porcentaje_ra_actividad) / 100.0
                sum_w += w
                # Buscar en los datos ya prefetched
                nota_obj = None
                for nota in rel.notasactividad_set.all():
                    if nota.matricula_id == mat.id_matricula:
                        nota_obj = nota
                        break
                
                nota = float(nota_obj.nota_ra_actividad) if (nota_obj and nota_obj.nota_ra_actividad is not None) else None
                if nota is not None:
                    sum_w_graded += w
                    acc_strict += nota * w
                    acts_calificadas += 1
            
            ra_prog = acc_strict / sum_w_graded if sum_w_graded > 0.0 else 0.0
            coverage = min(1.0, max(0.0, sum_w_graded / (sum_w if sum_w > 0 else 1.0)))
            w_ra = float(ra.porcentaje_ra) / 100.0
            nota_total += ra_prog * w_ra
            coverage_total += coverage * w_ra

        notas_curso.append(nota_total)
        estudiantes_data.append({
            "id": mat.estudiante.codigo_estudiante,
            "nombre": f"{mat.estudiante.nombre} {mat.estudiante.apellido}",
            "correo": mat.estudiante.correo,
            "nota": round(nota_total, 2),
            "coverage": round(coverage_total * 100, 1),
            "actividades_calificadas": acts_calificadas,
            "actividades_totales": acts_totales,
        })

    # Estadísticas del curso
    curso_stats = {
        "promedio": 0.0,
        "nota_max": 0.0,
        "nota_min": 0.0,
        "estudiantes_aprobados": 0,
        "estudiantes_reprobados": 0,
        "desviacion_estandar": 0.0,
    }

    if notas_curso:
        promedio = sum(notas_curso) / len(notas_curso)
        curso_stats["promedio"] = round(promedio, 2)
        curso_stats["nota_max"] = round(max(notas_curso), 2)
        curso_stats["nota_min"] = round(min(notas_curso), 2)
        curso_stats["estudiantes_aprobados"] = sum(1 for n in notas_curso if n >= 3.0)
        curso_stats["estudiantes_reprobados"] = sum(1 for n in notas_curso if n < 3.0)
        
        # Calcular desviación estándar
        if len(notas_curso) > 1:
            varianza = sum((n - promedio) ** 2 for n in notas_curso) / len(notas_curso)
            curso_stats["desviacion_estandar"] = round(varianza ** 0.5, 2)

    # Información de RAs con promedios
    ras_info = []
    for ra in ras:
        # Usar datos ya prefetched
        rels = list(ra.raactividad_set.all())
        notas_ra = []
        
        for mat in matriculas_curso:
            sum_w = 0.0
            sum_w_graded = 0.0
            acc_strict = 0.0
            
            for rel in rels:
                w = float(rel.porcentaje_ra_actividad) / 100.0
                sum_w += w
                # Buscar en datos prefetched
                nota_obj = None
                for nota in rel.notasactividad_set.all():
                    if nota.matricula_id == mat.id_matricula:
                        nota_obj = nota
                        break
                
                nota = float(nota_obj.nota_ra_actividad) if (nota_obj and nota_obj.nota_ra_actividad is not None) else None
                if nota is not None:
                    sum_w_graded += w
                    acc_strict += nota * w
            
            ra_prog = acc_strict / sum_w_graded if sum_w_graded > 0.0 else None
            if ra_prog is not None:
                notas_ra.append(ra_prog)

        promedio_ra = round(sum(notas_ra) / len(notas_ra), 2) if notas_ra else 0.0
        coverage_promedio = round((len(notas_ra) / max(1, len(matriculas_curso))) * 100, 1)

        ras_info.append({
            "id_ra": ra.id_ra,
            "numero_ra": ra.numero_ra,
            "descripcion": ra.descripcion,
            "porcentaje_ra": float(ra.porcentaje_ra),
            "actividades_total": len(rels),
            "promedio": promedio_ra,
            "coverage_promedio": coverage_promedio,
        })

    return Response({
        "asignatura": asignatura_info,
        "docente": docente_info,
        "estudiantes_matriculados": total_estudiantes,
        "estadistica_curso": curso_stats,
        "resultados_aprendizaje": ras_info,
        "estudiantes": estudiantes_data,
    })

@api_view(["GET", "PUT", "PATCH"])
@permission_classes([AllowAny])
@authentication_classes([])
def profile_view(request):
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)

    rol, uid = tok.get("rol"), tok.get("id")

    if request.method in ("PUT", "PATCH"):
        body = request.data or {}
        if rol == "docente":
            u = Docente.objects.filter(pk=uid).first()
            if not u: return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            if "correo" in body: u.correo = body["correo"]
            if "telefono" in body or "num_telefono" in body: u.num_telefono = body.get("telefono") or body.get("num_telefono")
            u.save()
        else:
            u = Estudiante.objects.filter(pk=uid).first()
            if not u: return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
            if "correo" in body: u.correo = body["correo"]
            if "jornada" in body: u.jornada = body["jornada"]
            u.save()
        request.method = "GET"

    def _avatar_url_for(rol_value: str, uid_value: int):
        try:
            base = os.path.join("avatars", str(rol_value), str(uid_value))
            media_root = getattr(settings, "MEDIA_ROOT", None)
            media_url = getattr(settings, "MEDIA_URL", "/media/")
            if not media_root:
                return None
            folder = os.path.join(media_root, base)
            if not os.path.isdir(folder):
                return None
            files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
            if not files:
                return None
            newest = sorted(files, key=lambda f: os.path.getmtime(os.path.join(folder, f)))[-1]
            rel_path = os.path.join(base, newest).replace("\\", "/")
            return request.build_absolute_uri(media_url + rel_path)
        except Exception:
            return None

    if rol == "docente":
        u = Docente.objects.filter(pk=uid).select_related("tipo_documento").first()
        if not u:
            return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
        # Obtener asignaturas del docente y agrupar por el periodo propio de la asignatura.
        # Esto evita ocultar asignaturas nuevas que aún no tienen matrículas.
        asignaturas_qs = (
            Asignatura.objects
            .filter(docente=u)
            .select_related("programa", "periodo")
            .order_by("periodo__fecha_inicio", "id_asignatura")
        )
        
        cursos = []
        grupos = {}
        programas_set = set()
        programas = []
        
        for a in asignaturas_qs:
            # Construir datos del curso
            curso_data = {
                "codigo": a.codigo_asignatura, 
                "nombre": a.nombre, 
                "grupo": a.grupo, 
                "programa": getattr(a.programa, "nombre", None)
            }
            cursos.append(curso_data)

            # Agrupar por período
            p = getattr(a, "periodo", None)
            key = str(getattr(p, "id_periodo", "sin_periodo"))
            if key not in grupos:
                grupos[key] = {
                    "periodo": {
                        "id": getattr(p, "id_periodo", None),
                        "descripcion": getattr(p, "descripcion", "Sin periodo")
                    }, 
                    "cursos": []
                }
            
            # Agregar curso al período
            grupos[key]["cursos"].append(curso_data)
            
            # Recopilar programas únicos
            prog = getattr(a, "programa", None)
            if prog:
                prog_key = (getattr(prog, "codigo_programa", None), getattr(prog, "nombre", None))
                if prog_key not in programas_set:
                    programas_set.add(prog_key)
                    programas.append({"codigo": prog_key[0], "nombre": prog_key[1]})
        
        # Determinar período actual (último por fecha de inicio)
        periodo_actual = None
        total_cursos_periodo_actual = None
        if grupos:
            last_key = list(grupos.keys())[-1]
            periodo_actual = grupos[last_key]["periodo"]
            total_cursos_periodo_actual = len(grupos[last_key]["cursos"])
        
        details = {
            "correo": u.correo,
            "codigo": u.codigo_docente,
            "documento": {"tipo": getattr(u.tipo_documento, "descripcion", None), "numero": u.num_documento},
            "telefono": u.num_telefono,
            "zona_horaria": settings.TIME_ZONE,
            "programas": programas,
            "total_cursos": asignaturas_qs.count(),
            "periodo_actual": periodo_actual,
            "total_cursos_periodo_actual": total_cursos_periodo_actual,
        }
        # Adjunta URL del avatar si existe
        details["avatar_url"] = _avatar_url_for(rol, uid)
        return Response({
            "user": _serialize_user(u, "docente"), 
            "details": details, 
            "cursos": cursos, 
            "cursos_por_periodo": list(grupos.values())
        })

    u = Estudiante.objects.filter(pk=uid).select_related("tipo_documento").first()
    if not u:
        return Response({"detail": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    mats = (Matricula.objects
            .filter(estudiante=u)
            .select_related("asignatura__programa", "periodo")
            .order_by("periodo__fecha_inicio"))
    cursos_actuales = []
    grupos = {}
    programas_set = set()
    programas = []
    for m in mats:
        a = m.asignatura
        p = m.periodo
        cursos_actuales.append({"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)})
        key = str(p.id_periodo)
        if key not in grupos:
            grupos[key] = {"periodo": {"id": p.id_periodo, "descripcion": p.descripcion}, "cursos": []}
        grupos[key]["cursos"].append({"codigo": a.codigo_asignatura, "nombre": a.nombre, "grupo": a.grupo, "programa": getattr(a.programa, "nombre", None)})
        prog = getattr(a, "programa", None)
        if prog:
            prog_key = (getattr(prog, "codigo_programa", None), getattr(prog, "nombre", None))
            if prog_key not in programas_set:
                programas_set.add(prog_key)
                programas.append({"codigo": prog_key[0], "nombre": prog_key[1]})
    # Periodo actual (último por fecha de inicio) y total de cursos en ese periodo
    periodo_actual = None
    total_cursos_periodo_actual = None
    if grupos:
        # grupos mantiene orden de inserción acorde al orden de mats; tomar el último
        last_key = list(grupos.keys())[-1]
        periodo_actual = grupos[last_key]["periodo"]
        total_cursos_periodo_actual = len(grupos[last_key]["cursos"])
    details = {
        "correo": u.correo,
        "codigo": u.codigo_estudiante,
        "documento": {"tipo": getattr(u.tipo_documento, "descripcion", None), "numero": u.num_documento},
        "jornada": u.jornada,
        "zona_horaria": settings.TIME_ZONE,
        "programas": programas,
        "periodo_actual": periodo_actual,
        "total_cursos_periodo_actual": total_cursos_periodo_actual,
    }
    # Adjunta URL del avatar si existe
    details["avatar_url"] = _avatar_url_for(rol, uid)
    return Response({"user": _serialize_user(u, "estudiante"), "details": details, "cursos": cursos_actuales[-10:], "cursos_por_periodo": list(grupos.values())})

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def password_change_view(request):
    """Cambia la contraseña del usuario autenticado (docente/estudiante/coordinador).
    Body: { current_password: str, new_password: str }
    Auth: Authorization: Bearer <token>
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = tok.get("rol"), tok.get("id")

    body = request.data or {}
    cur = body.get("current_password")
    new = body.get("new_password")
    if not cur or not new:
        return Response({"message": "Se requieren current_password y new_password"}, status=status.HTTP_400_BAD_REQUEST)
    
    # VALIDAR FORTALEZA DE LA CONTRASEÑA (debe coincidir con frontend)
    is_valid, error_msg = validate_password_strength(new)
    if not is_valid:
        return Response({"message": error_msg}, status=status.HTTP_400_BAD_REQUEST)

    if rol == "docente":
        u = Docente.objects.filter(pk=uid).first()
        if not u:
            return Response({"message": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        # SOLO usar check_password, sin fallback inseguro
        if not check_user_password(u.contrasenia_docente, cur):
            return Response({"message": "Contraseña actual incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
        u.contrasenia_docente = make_password(new)
        u.save(update_fields=["contrasenia_docente"])
    elif rol == "coordinador":
        u = Coordinador.objects.filter(pk=uid).first()
        if not u:
            return Response({"message": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        # SOLO usar check_password, sin fallback inseguro
        if not check_user_password(u.contrasenia_coord, cur):
            return Response({"message": "Contraseña actual incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
        u.contrasenia_coord = make_password(new)
        u.save(update_fields=["contrasenia_coord"])
    else:  # estudiante
        u = Estudiante.objects.filter(pk=uid).first()
        if not u:
            return Response({"message": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        # SOLO usar check_password, sin fallback inseguro
        if not check_user_password(u.contrasena_estudiante, cur):
            return Response({"message": "Contraseña actual incorrecta"}, status=status.HTTP_400_BAD_REQUEST)
        u.contrasena_estudiante = make_password(new)
        u.save(update_fields=["contrasena_estudiante"])

    return Response({"ok": True, "message": "Contraseña actualizada correctamente"})


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def profile_avatar_view(request):
    """Sube/actualiza el avatar del usuario autenticado. Campo esperado: 'avatar' (archivo)."""
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = tok.get("rol"), tok.get("id")
    f = request.FILES.get("avatar")
    if not f:
        return Response({"message": "Archivo 'avatar' requerido"}, status=status.HTTP_400_BAD_REQUEST)
    # Validaciones básicas de archivo: tipo MIME y tamaño (máx. 2MB)
    try:
        content_type = getattr(f, "content_type", "") or ""
        size = int(getattr(f, "size", 0) or 0)
    except Exception:
        content_type, size = "", 0
    allowed_types = {"image/png", "image/jpeg", "image/jpg"}
    if content_type.lower() not in allowed_types and not content_type.lower().startswith("image/"):
        return Response({"message": "Tipo de archivo no permitido. Solo PNG o JPG."}, status=status.HTTP_400_BAD_REQUEST)
    if size > 2 * 1024 * 1024:
        return Response({"message": "El archivo supera el tamaño máximo de 2MB."}, status=status.HTTP_400_BAD_REQUEST)
    fname = get_valid_filename(getattr(f, "name", "avatar"))
    base = os.path.join("avatars", str(rol or "user"), str(uid))
    path = os.path.join(base, fname)
    saved = default_storage.save(path, f)
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    url = request.build_absolute_uri(media_url + saved.replace("\\", "/"))
    return Response({"url": url})

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def ra_validation_view(request, ra_id: int):
    ra = ResultadoDeAprendizaje.objects.filter(pk=ra_id).first()
    if not ra:
        return Response({"detail": "RA no existe"}, status=status.HTTP_404_NOT_FOUND)
    act_sum = RaActividad.objects.filter(ra_id=ra_id).aggregate(v=Sum("porcentaje_ra_actividad"))["v"] or 0
    act_count = RaActividad.objects.filter(ra_id=ra_id).count()
    ind_count = IndicadoresDeLogro.objects.filter(ra_id=ra_id).count()
    return Response({
        "ra_id": ra_id,
        "actividades": {"suma": float(act_sum), "count": act_count, "ok": float(act_sum) == 100.0, "faltante": max(0.0, 100.0 - float(act_sum))},
        "indicadores": {"suma": 0, "count": ind_count, "ok": ind_count > 0, "faltante": 0},
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def asignatura_validation_view(request, codigo_asignatura: str):
    asig = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asig:
        return Response({"detail": "Asignatura no existe"}, status=status.HTTP_404_NOT_FOUND)
    ra_sum = ResultadoDeAprendizaje.objects.filter(asignatura=asig).aggregate(v=Sum("porcentaje_ra"))["v"] or 0
    return Response({
        "codigo_asignatura": codigo_asignatura,
        "ras": {"suma": float(ra_sum), "ok": float(ra_sum) == 100.0, "faltante": max(0.0, 100.0 - float(ra_sum))},
    })

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def notifications_view(request):
    """
    GET: Obtener notificaciones del estudiante desde BD (persistentes)
    POST: Marcar notificaciones como leídas
    """
    token = _bearer_token(request)
    if not token:
        return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        tok = signing.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return Response({"detail": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)
    rol, uid = tok.get("rol"), tok.get("id")
    if rol != "estudiante":
        return Response([], status=status.HTTP_200_OK)
    
    if request.method == "POST":
        # Marcar notificaciones como leídas
        notif_ids = request.data.get("ids", [])
        if notif_ids:
            Notificacion.objects.filter(
                estudiante_id=uid,
                id__in=notif_ids
            ).update(leida=True, fecha_lectura=timezone.now())
        return Response({"message": "Notificaciones actualizadas"}, status=status.HTTP_200_OK)
    
    # GET: Obtener notificaciones desde BD
    # Limitar a las últimas 50 notificaciones no leídas + las 10 más recientes leídas
    notificaciones_no_leidas = Notificacion.objects.filter(
        estudiante_id=uid,
        leida=False
    ).order_by('-fecha_creacion')[:50]
    
    notificaciones_leidas = Notificacion.objects.filter(
        estudiante_id=uid,
        leida=True
    ).order_by('-fecha_creacion')[:10]
    
    # Combinar y serializar
    todas_notificaciones = list(notificaciones_no_leidas) + list(notificaciones_leidas)
    todas_notificaciones.sort(key=lambda n: n.fecha_creacion, reverse=True)
    
    result = [{
        "id": str(notif.id),
        "kind": notif.tipo,
        "text": notif.texto,
        "date": notif.fecha_creacion.isoformat(),
        "read": notif.leida,
        "link": notif.enlace
    } for notif in todas_notificaciones[:30]]  # Retornar últimas 30
    
    return Response(result)


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def actividades_multi_view(request):
    """
    Crea una sola Actividad y la asocia a múltiples RAs (del mismo curso) en una sola operación.
    Body esperado:
    {
      "nombre_actividad": str,
      "id_tipo_actividad": int,
      "descripcion"?: str,
      "fecha_cierre"?: "AAAA-MM-DD",
      "ras": [
        { "ra_id": int, "porcentaje_ra_actividad": number, "indicadores"?: [int, ...] }, ...
      ]
    }
    Validaciones:
    - Todas las RAs deben pertenecer a la misma asignatura.
    - Para cada RA, la suma de porcentaje_ra_actividad no debe superar 100.
    """
    body = request.data or {}
    nombre = body.get("nombre_actividad")
    id_tipo = body.get("id_tipo_actividad")
    descripcion = body.get("descripcion")
    fecha_cierre = body.get("fecha_cierre")
    ras = body.get("ras")

    if not (nombre and id_tipo is not None and isinstance(ras, (list, tuple)) and len(ras) > 0):
        return Response({
            "message": "Campos requeridos: nombre_actividad, id_tipo_actividad y ras[]"
        }, status=status.HTTP_400_BAD_REQUEST)

    # fecha_cierre obligatoria
    if not fecha_cierre:
        return Response({"message": "fecha_cierre es requerido (AAAA-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        fecha_cierre_dt = datetime.datetime.strptime(str(fecha_cierre), "%Y-%m-%d").date()
    except ValueError:
        return Response({"message": "fecha_cierre debe tener formato AAAA-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

    # Validar: fecha_cierre >= hoy
    hoy = datetime.date.today()
    if fecha_cierre_dt < hoy:
        return Response({
            "message": "fecha_cierre no puede ser anterior a la fecha de creación (hoy). Elige hoy o una fecha futura.",
            "hoy": hoy.isoformat(),
            "fecha_cierre": fecha_cierre_dt.isoformat(),
        }, status=status.HTTP_400_BAD_REQUEST)

    # Cargar RAs y validar que pertenezcan a la misma asignatura
    ra_ids = [int(x.get("ra_id")) for x in ras if x and x.get("ra_id") is not None]
    if not ra_ids:
        return Response({"message": "ras debe incluir al menos un objeto con ra_id"}, status=status.HTTP_400_BAD_REQUEST)

    ra_objs = list(ResultadoDeAprendizaje.objects.filter(id_ra__in=ra_ids).select_related("asignatura"))
    if len(ra_objs) != len(set(ra_ids)):
        return Response({"message": "Algún ra_id no existe"}, status=status.HTTP_400_BAD_REQUEST)
    asig_ids = {r.asignatura_id for r in ra_objs}
    if len(asig_ids) != 1:
        return Response({"message": "Todas las RAs deben pertenecer a la misma asignatura"}, status=status.HTTP_400_BAD_REQUEST)

    _, _, auth_err = _require_docente_for_ra(request, ra_objs[0].id_ra)
    if auth_err:
        return auth_err

    # Validar porcentajes por RA e indicadores (ambos obligatorios, aporte > 0)
    for item in ras:
        try:
            rid = int(item.get("ra_id"))
        except (TypeError, ValueError):
            return Response({"message": "Cada elemento en ras debe incluir ra_id válido"}, status=status.HTTP_400_BAD_REQUEST)
        raw_pct = item.get("porcentaje_ra_actividad")
        if raw_pct is None or str(raw_pct).strip() == "":
            return Response({"message": f"porcentaje_ra_actividad es requerido para RA {rid}"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pct = float(raw_pct)
        except (TypeError, ValueError):
            return Response({"message": "porcentaje_ra_actividad debe ser numérico"}, status=status.HTTP_400_BAD_REQUEST)
        if pct <= 0 or pct > 100:
            return Response({"message": "porcentaje_ra_actividad debe ser mayor que 0 y no exceder 100"}, status=status.HTTP_400_BAD_REQUEST)
        suma_actual = (RaActividad.objects.filter(ra_id=rid).aggregate(v=Sum("porcentaje_ra_actividad"))['v'] or 0)
        if float(suma_actual) + pct > 100.0:
            return Response({
                "message": f"El RA {rid} excede 100% con este aporte ({float(suma_actual)+pct:.2f}%). Ajusta porcentaje_ra_actividad.",
                "ra_id": rid,
                "suma_actual": float(suma_actual),
            }, status=status.HTTP_400_BAD_REQUEST)
        # Indicadores obligatorios por cada RA
        inds = item.get("indicadores") or []
        if not isinstance(inds, (list, tuple)) or len(inds) == 0:
            return Response({"message": f"Debes asignar al menos un indicador para el RA {rid}"}, status=status.HTTP_400_BAD_REQUEST)
        valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=rid, id_ind__in=inds).values_list("id_ind", flat=True))
        if not valid_inds:
            exists_any = IndicadoresDeLogro.objects.filter(ra_id=rid).exists()
            if not exists_any:
                return Response({"message": f"El RA {rid} no tiene indicadores definidos. No se puede crear la actividad sin indicadores."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"message": f"Los indicadores enviados no corresponden al RA {rid}"}, status=status.HTTP_400_BAD_REQUEST)


    # Crear actividad y relaciones en una transacción para consistencia
    try:
        with transaction.atomic():
            act = Actividad.objects.create(
                tipo_actividad_id=id_tipo,
                nombre_actividad=nombre,
                descripcion=descripcion,
                fecha_creacion=hoy,
                fecha_cierre=fecha_cierre_dt,
            )

            relaciones = []
            for item in ras:
                rid = int(item["ra_id"])  # seguro por validaciones previas
                raw_pct = item.get("porcentaje_ra_actividad")
                pct = float(raw_pct)
                rel = RaActividad.objects.create(actividad=act, ra_id=rid, porcentaje_ra_actividad=pct)
                relaciones.append(rel)
                # Indicadores (opcionales) – asegurar que pertenezcan al mismo RA
                inds = item.get("indicadores") or []
                valid_inds = set(IndicadoresDeLogro.objects.filter(ra_id=rid, id_ind__in=inds).values_list("id_ind", flat=True))
                bulk = [RaActividadIndicador(ra_actividad=rel, indicador_id=i) for i in valid_inds]
                RaActividadIndicador.objects.bulk_create(bulk, ignore_conflicts=True)
            
            # Crear notificación personalizada para cada estudiante del curso
            try:
                asignatura = ra_objs[0].asignatura if ra_objs else None
                if asignatura:
                    matriculas = Matricula.objects.filter(asignatura=asignatura).select_related('estudiante')
                    fecha_str = fecha_cierre_dt.strftime("%d/%m/%Y")
                    notif_link = f"/estudiante?curso={asignatura.codigo_asignatura}"
                    
                    # Crear notificación personalizada para cada estudiante
                    for mat in matriculas:
                        notif_text = f"{mat.estudiante.nombre}, nueva actividad en {asignatura.nombre}: {nombre} - Vence: {fecha_str}"
                        _add_notification(mat.estudiante_id, "deadline", notif_text, notif_link)
            except Exception:
                pass  # No fallar si hay error en notificación
    except (IntegrityError, DatabaseError) as e:
        # Capturar mensajes del trigger para devolver 400 legible
        msg = str(e)
        # Limpiar un poco el mensaje si contiene línea de RAISE
        if ("deben sumar 100" in msg) or ("exced" in msg) or ("trg_check_sum_acts_por_ra" in msg):
            return Response({"message": msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "No se pudo crear la actividad por una restricción de base de datos.", "detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "id_actividad": act.id_actividad,
        "nombre_actividad": act.nombre_actividad,
        "fecha_cierre": act.fecha_cierre,
        "relaciones": [
            {
                "id_ra": r.ra_id,
                "id_ra_actividad": r.id_ra_actividad,
                "porcentaje_ra_actividad": float(r.porcentaje_ra_actividad),
            } for r in relaciones
        ]
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def current_period_view(request):
    """
    Devuelve el periodo académico actual basado en la fecha actual del sistema.
    El periodo actual es el que está activo según su fecha de inicio/fin.
    
    Respuesta:
    {
      "id_periodo": int,
      "descripcion": str,
      "fecha_inicio": "AAAA-MM-DD",
      "fecha_fin": "AAAA-MM-DD" | null,
      "is_current": true
    }
    """
    hoy = datetime.date.today()
    
    # Buscar periodo que esté activo (fecha_inicio <= hoy <= fecha_fin o sin fecha_fin definida)
    periodo = (PeriodoAcademico.objects
               .filter(fecha_inicio__lte=hoy)
               .order_by('-fecha_inicio')
               .first())
    
    if not periodo:
        # Si no hay periodo que haya comenzado, devolver el próximo
        periodo = PeriodoAcademico.objects.order_by('fecha_inicio').first()
    
    if not periodo:
        return Response({"detail": "No hay periodos académicos configurados"}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        "id_periodo": periodo.id_periodo,
        "descripcion": periodo.descripcion,
        "fecha_inicio": periodo.fecha_inicio,
        "fecha_fin": getattr(periodo, 'fecha_fin', None),
        "is_current": True
    })


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def course_activities_grouped_view(request, codigo_asignatura: str):
    """
    Devuelve todas las actividades de una asignatura AGRUPADAS por ID de actividad.
    Cada actividad muestra todos los RAs a los que está asociada con sus porcentajes.
    
    Soluciona el problema de duplicación cuando una actividad pertenece a múltiples RAs.
    
    Query params:
      - id_matricula (opcional): Si se provee, incluye la nota del estudiante
    
    Respuesta:
    [
      {
        "id_actividad": int,
        "nombre_actividad": str,
        "descripcion": str | null,
        "fecha_creacion": "AAAA-MM-DD",
        "fecha_cierre": "AAAA-MM-DD" | null,
        "id_tipo_actividad": int,
        "tipo_actividad": str,
        "porcentaje_total": float,  // Suma de todos los porcentajes en todos los RAs
        "nota": float | null,  // Nota del estudiante (única para toda la actividad)
        "retroalimentacion": str | null,
        "ras_asociados": [
          {
            "id_ra": int,
            "id_ra_actividad": int,  // ID de la relación
            "titulo_ra": str,
            "porcentaje_ra": float,  // Porcentaje del RA en la asignatura
            "porcentaje_actividad": float,  // Porcentaje de esta actividad en este RA
            "indicadores": [
              {
                "id_ind": int,
                "descripcion": str,
                "porcentaje_ind": float
              }
            ]
          }
        ]
      }
    ]
    """
    asig = Asignatura.objects.filter(codigo_asignatura=codigo_asignatura).first()
    if not asig:
        return Response({"detail": "Asignatura no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    auth_ctx, auth_err = _require_asignatura_access(request, asig)
    if auth_err:
        return auth_err
    
    id_matricula = request.query_params.get("id_matricula")
    if id_matricula:
        mat_qs = Matricula.objects.filter(id_matricula=id_matricula, asignatura=asig)
        if auth_ctx and auth_ctx.get("rol") == "estudiante":
            mat_qs = mat_qs.filter(estudiante_id=auth_ctx.get("id"))
        if not mat_qs.exists():
            return Response({"detail": "Matrícula no válida para esta asignatura"}, status=status.HTTP_403_FORBIDDEN)
    
    # Obtener todas las relaciones RA-Actividad de esta asignatura
    rels = (RaActividad.objects
            .filter(ra__asignatura=asig)
            .select_related("actividad__tipo_actividad", "ra")
            .prefetch_related("indicadores_rel__indicador")
            .order_by("actividad__fecha_cierre", "actividad__nombre_actividad"))
    
    # Agrupar por ID de actividad
    activities_dict = {}
    for rel in rels:
        act = rel.actividad
        act_id = act.id_actividad
        
        # Si es la primera vez que vemos esta actividad, inicializar
        if act_id not in activities_dict:
            activities_dict[act_id] = {
                "id_actividad": act_id,
                "nombre_actividad": act.nombre_actividad,
                "descripcion": act.descripcion,
                "fecha_creacion": act.fecha_creacion,
                "fecha_cierre": act.fecha_cierre,
                "id_tipo_actividad": act.tipo_actividad_id,
                "tipo_actividad": getattr(act.tipo_actividad, "descripcion", None),
                "porcentaje_total": 0.0,
                "nota": None,
                "retroalimentacion": None,
                "ras_asociados": []
            }
        
        # Agregar este RA a la lista de RAs asociados
        indicadores = [
            {
                "id_ind": rir.indicador_id,
                "descripcion": rir.indicador.descripcion,
            }
            for rir in rel.indicadores_rel.all()
        ]
        
        activities_dict[act_id]["ras_asociados"].append({
            "id_ra": rel.ra_id,
            "id_ra_actividad": rel.id_ra_actividad,
            "titulo_ra": rel.ra.descripcion,
            "porcentaje_ra": float(rel.ra.porcentaje_ra),
            "porcentaje_actividad": float(rel.porcentaje_ra_actividad),
            "indicadores": indicadores
        })
        
        # Sumar al porcentaje total
        activities_dict[act_id]["porcentaje_total"] += float(rel.porcentaje_ra_actividad)
    
    # Si se proporcionó id_matricula, agregar notas
    if id_matricula:
        # Obtener todas las notas del estudiante para esta asignatura
        notas = list(NotasActividad.objects.filter(
            matricula_id=id_matricula,
            ra_actividad__ra__asignatura=asig
        ).select_related("ra_actividad"))
        
        # Mapear notas por ID de actividad (todas las relaciones de una actividad comparten la misma nota)
        notas_por_actividad = {}
        for nota in notas:
            act_id = nota.ra_actividad.actividad_id
            if act_id not in notas_por_actividad:
                notas_por_actividad[act_id] = nota
        
        # Agregar notas a las actividades
        for act_id, nota_obj in notas_por_actividad.items():
            if act_id in activities_dict:
                activities_dict[act_id]["nota"] = float(nota_obj.nota_ra_actividad) if nota_obj.nota_ra_actividad is not None else None
                activities_dict[act_id]["retroalimentacion"] = nota_obj.retroalimentacion
    
    # Convertir a lista y retornar
    result = list(activities_dict.values())
    
    return Response(result, status=status.HTTP_200_OK)
