"""
Utilidades de seguridad para el sistema RA-Manager.
Incluye funciones para autenticación segura, rate limiting y auditoría.
"""
import logging
import secrets
from typing import Optional, Tuple
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.contrib.auth.hashers import check_password
from datetime import timedelta
import json

logger = logging.getLogger(__name__)


def get_client_ip(request) -> str:
    """
    Obtiene la dirección IP real del cliente, considerando proxies y load balancers.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', 'unknown')
    return ip


def get_user_agent(request) -> str:
    """Obtiene el User-Agent del navegador"""
    return request.META.get('HTTP_USER_AGENT', '')[:500]  # Limitar longitud


def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Valida la fortaleza de una contraseña.
    
    Requisitos:
    - Mínimo 8 caracteres
    - Al menos una mayúscula
    - Al menos una minúscula
    - Al menos un número
    - Al menos un carácter especial
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    
    if not any(c.isupper() for c in password):
        return False, "La contraseña debe contener al menos una mayúscula"
    
    if not any(c.islower() for c in password):
        return False, "La contraseña debe contener al menos una minúscula"
    
    if not any(c.isdigit() for c in password):
        return False, "La contraseña debe contener al menos un número"
    
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        return False, "La contraseña debe contener al menos un carácter especial"
    
    return True, None


def check_user_password(db_password: Optional[str], provided_password: str) -> bool:
    """
    Valida una contraseña de forma segura.
    
    NUNCA retorna True si la contraseña no se proporciona.
    NUNCA hace comparación en texto plano como fallback.
    
    Args:
        db_password: Hash de contraseña almacenado en BD
        provided_password: Contraseña proporcionada por el usuario
    
    Returns:
        True si la contraseña es válida, False en cualquier otro caso
    """
    # Ambos parámetros son obligatorios
    if not provided_password or not db_password:
        return False
    
    try:
        # SOLO usar check_password de Django (bcrypt/pbkdf2)
        return check_password(provided_password, db_password)
    except Exception as e:
        logger.error(f"Error al verificar contraseña: {e}")
        return False


def generate_secure_otp(length: int = 6) -> str:
    """
    Genera un código OTP criptográficamente seguro.
    
    Usa secrets en lugar de random para evitar predicciones.
    
    Args:
        length: Longitud del código (default: 6)
    
    Returns:
        Código OTP de dígitos
    """
    return ''.join(secrets.choice('0123456789') for _ in range(length))


def check_account_lockout(usuario_codigo: str) -> Tuple[bool, Optional[str], Optional[int]]:
    """
    Verifica si una cuenta está bloqueada por intentos fallidos.
    
    Returns:
        (is_locked, reason, remaining_minutes)
    """
    from ..models.models import AccountLockout
    
    try:
        lockout = AccountLockout.objects.get(usuario_codigo=usuario_codigo)
        
        if lockout.is_locked():
            # Calcular tiempo restante de bloqueo
            if lockout.fecha_desbloqueo:
                remaining = (lockout.fecha_desbloqueo - timezone.now()).total_seconds() / 60
                remaining_minutes = max(0, int(remaining))
                return True, "Cuenta bloqueada por intentos fallidos", remaining_minutes
            return True, "Cuenta bloqueada por intentos fallidos", None
        
        return False, None, None
    
    except AccountLockout.DoesNotExist:
        return False, None, None


def registrar_intento_login(
    usuario_codigo: str,
    exito: bool,
    ip_address: str,
    user_agent: str,
    usuario_email: Optional[str] = None,
    rol_intentado: Optional[str] = None,
    motivo_fallo: Optional[str] = None
):
    """
    Registra un intento de login en la auditoría.
    """
    from ..models.models import LoginAttempt, SecurityEvent
    
    # Registrar intento
    LoginAttempt.objects.create(
        usuario_codigo=usuario_codigo,
        usuario_email=usuario_email,
        rol_intentado=rol_intentado,
        exito=exito,
        motivo_fallo=motivo_fallo,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Registrar evento de seguridad
    evento = 'LOGIN_SUCCESS' if exito else 'LOGIN_FAILED'
    detalles = {
        'rol': rol_intentado,
        'motivo': motivo_fallo,
        'user_agent': user_agent[:200]
    }
    
    SecurityEvent.objects.create(
        evento=evento,
        usuario_codigo=usuario_codigo,
        ip_address=ip_address,
        detalles=json.dumps(detalles)
    )


def manejar_intento_fallido(usuario_codigo: str, ip_address: str, email: Optional[str] = None):
    """
    Maneja un intento de login fallido.
    
    - Incrementa el contador de intentos fallidos
    - Bloquea la cuenta al tercer intento
    - Envía email de alerta al bloquear
    
    Returns:
        (cuenta_bloqueada, intentos_restantes)
    """
    from ..models.models import AccountLockout, SecurityEvent
    
    MAX_INTENTOS = 3
    DURACION_BLOQUEO_MINUTOS = 30
    
    # Obtener o crear registro de lockout
    lockout, created = AccountLockout.objects.get_or_create(
        usuario_codigo=usuario_codigo,
        defaults={'intentos_fallidos': 0}
    )
    
    # Registrar intento fallido
    lockout.registrar_intento_fallido(ip_address)
    
    # Verificar si debe bloquearse
    if lockout.intentos_fallidos >= MAX_INTENTOS and not lockout.bloqueado:
        # BLOQUEAR CUENTA
        lockout.bloquear(duracion_minutos=DURACION_BLOQUEO_MINUTOS)
        
        # Registrar evento de seguridad
        SecurityEvent.objects.create(
            evento='ACCOUNT_LOCKED',
            usuario_codigo=usuario_codigo,
            ip_address=ip_address,
            detalles=json.dumps({
                'intentos': lockout.intentos_fallidos,
                'duracion_minutos': DURACION_BLOQUEO_MINUTOS
            })
        )
        
        # Enviar email de alerta
        if email and not lockout.notificacion_enviada:
            enviar_alerta_bloqueo(email, usuario_codigo, DURACION_BLOQUEO_MINUTOS)
            lockout.notificacion_enviada = True
            lockout.save()
        
        logger.warning(f"Cuenta bloqueada: {usuario_codigo} desde IP {ip_address}")
        return True, 0
    
    intentos_restantes = MAX_INTENTOS - lockout.intentos_fallidos
    return False, max(0, intentos_restantes)


def enviar_alerta_bloqueo(email: str, usuario_codigo: str, duracion_minutos: int):
    """
    Envía un correo electrónico de alerta cuando se bloquea una cuenta.
    """
    subject = "Alerta de Seguridad - Cuenta Bloqueada - RA Manager"
    
    message = f"""
Hola,

Tu cuenta con código {usuario_codigo} ha sido bloqueada temporalmente debido a múltiples intentos fallidos de inicio de sesión.

Duración del bloqueo: {duracion_minutos} minutos
Tu cuenta se desbloqueará automáticamente después de este tiempo.

Si NO intentaste acceder a tu cuenta:
• Alguien podría estar intentando acceder sin autorización
• Cambia tu contraseña inmediatamente cuando se desbloquee tu cuenta
• Contacta al administrador del sistema si sospechas actividad maliciosa

Si fuiste tú quien intentó acceder:
• Verifica que estés usando las credenciales correctas
• Espera {duracion_minutos} minutos antes de intentar nuevamente
• Si olvidaste tu contraseña, usa la opción "Recuperar contraseña"

Este es un correo automático del sistema de seguridad.

Saludos,
Sistema de Seguridad RA Manager
Universidad del Valle
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False
        )
        logger.info(f"Alerta de bloqueo enviada a: {email}")
    except Exception as e:
        logger.error(f"Error al enviar alerta de bloqueo a {email}: {e}")


def limpiar_intentos_exitosos(usuario_codigo: str):
    """
    Limpia los contadores de intentos fallidos después de un login exitoso.
    """
    from ..models.models import AccountLockout
    
    try:
        lockout = AccountLockout.objects.get(usuario_codigo=usuario_codigo)
        if not lockout.bloqueado:
            lockout.intentos_fallidos = 0
            lockout.ultimo_intento_fallido = None
            lockout.save()
    except AccountLockout.DoesNotExist:
        pass


def registrar_evento_seguridad(evento: str, usuario_codigo: str, ip_address: str, detalles: dict = None):
    """
    Registra un evento de seguridad genérico en la bitácora.
    """
    from ..models.models import SecurityEvent
    
    SecurityEvent.objects.create(
        evento=evento,
        usuario_codigo=usuario_codigo,
        ip_address=ip_address,
        detalles=json.dumps(detalles) if detalles else None
    )
