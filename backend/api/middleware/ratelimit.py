"""
Middleware personalizado para manejar rate limiting y seguridad.
"""
from django.http import JsonResponse
from django_ratelimit.exceptions import Ratelimited
from api.utils.security import registrar_evento_seguridad, get_client_ip
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware:
    """
    Middleware para capturar excepciones de rate limiting y registrarlas
    en la bitácora de seguridad.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        """
        Captura excepciones de django-ratelimit y registra el evento.
        """
        if isinstance(exception, Ratelimited):
            # Obtener información del request
            ip_address = get_client_ip(request)
            path = request.path
            method = request.method
            
            # Registrar evento de seguridad
            try:
                registrar_evento_seguridad(
                    evento='RATE_LIMIT_EXCEEDED',
                    usuario_codigo=request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
                    ip_address=ip_address,
                    detalles={
                        'path': path,
                        'method': method,
                        'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200]
                    }
                )
            except Exception as e:
                logger.error(f"Error al registrar evento de rate limit: {e}")
            
            # Retornar respuesta JSON apropiada
            return JsonResponse(
                {
                    'error': 'Too Many Requests',
                    'detail': 'Has excedido el límite de intentos. Por favor, intenta más tarde.',
                    'status': 429
                },
                status=429
            )
        
        # Si no es una excepción de rate limit, dejar que Django la maneje
        return None
