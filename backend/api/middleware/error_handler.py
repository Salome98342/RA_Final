# api/middleware/error_handler.py
"""
Middleware centralizado para manejo consistente de errores en toda la aplicación.
Captura excepciones no manejadas y devuelve respuestas JSON estandarizadas.
"""
import logging
import traceback
from django.http import JsonResponse
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import DatabaseError, IntegrityError
from rest_framework.exceptions import APIException
from rest_framework import status

logger = logging.getLogger('ra_manager.errors')


class ErrorHandlerMiddleware:
    """
    Middleware que intercepta todas las excepciones no manejadas
    y devuelve respuestas JSON consistentes con información útil.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        """
        Procesa excepciones no capturadas y devuelve respuestas estandarizadas.
        """
        # Log completo del error para debugging
        logger.error(
            f"Unhandled exception in {request.path}",
            exc_info=True,
            extra={
                'method': request.method,
                'path': request.path,
                'user': getattr(request.user, 'id', 'anonymous'),
            }
        )

        # Formato de respuesta estándar
        error_response = {
            'success': False,
            'error': {
                'message': 'Ha ocurrido un error',
                'type': exception.__class__.__name__,
                'code': None,
            }
        }

        # Determinar código de estado y mensaje según tipo de excepción
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

        # Excepciones de validación
        if isinstance(exception, ValidationError):
            status_code = status.HTTP_400_BAD_REQUEST
            error_response['error']['message'] = str(exception)
            error_response['error']['code'] = 'VALIDATION_ERROR'

        # Excepciones de base de datos
        elif isinstance(exception, (DatabaseError, IntegrityError)):
            status_code = status.HTTP_400_BAD_REQUEST
            # No exponer detalles internos de BD en producción
            error_response['error']['message'] = 'Error al procesar la operación en la base de datos'
            error_response['error']['code'] = 'DATABASE_ERROR'
            # Log detallado para administradores
            logger.error(f"Database error: {str(exception)}")

        # Excepciones de permisos
        elif isinstance(exception, PermissionDenied):
            status_code = status.HTTP_403_FORBIDDEN
            error_response['error']['message'] = 'No tienes permisos para realizar esta acción'
            error_response['error']['code'] = 'PERMISSION_DENIED'

        # Excepciones de DRF
        elif isinstance(exception, APIException):
            status_code = exception.status_code
            error_response['error']['message'] = str(exception.detail)
            error_response['error']['code'] = exception.default_code.upper()

        # Excepción genérica
        else:
            error_response['error']['message'] = 'Error interno del servidor'
            error_response['error']['code'] = 'INTERNAL_ERROR'

        return JsonResponse(error_response, status=status_code)


class RequestLoggingMiddleware:
    """
    Middleware para logging de requests entrantes (útil para debugging).
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger('ra_manager.requests')

    def __call__(self, request):
        # Log request entrante
        self.logger.debug(
            f"{request.method} {request.path}",
            extra={
                'method': request.method,
                'path': request.path,
                'query_params': dict(request.GET),
            }
        )
        
        response = self.get_response(request)
        
        # Log response
        self.logger.debug(
            f"{request.method} {request.path} -> {response.status_code}",
            extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
            }
        )
        
        return response
