# 🔧 SOLUCIONES IMPLEMENTADAS Y PLAN DE MEJORAS

## 📅 Fecha: 17 de noviembre de 2025

---

## ✅ SOLUCIONES IMPLEMENTADAS

### 1️⃣ CARGA INCONSISTENTE Y MANEJO DE ERRORES

#### **Backend: Middleware Centralizado**
**Archivo**: `backend/api/middleware/error_handler.py`

**Características implementadas**:
- ✅ **ErrorHandlerMiddleware**: Captura todas las excepciones no manejadas
  - ValidationError → 400 BAD REQUEST
  - DatabaseError/IntegrityError → 400 con mensaje genérico (seguridad)
  - PermissionDenied → 403 FORBIDDEN
  - APIException → código apropiado
  - Excepciones genéricas → 500 INTERNAL ERROR

- ✅ **RequestLoggingMiddleware**: Logging detallado de requests/responses
  - Registra método, path, query params
  - Log de código de respuesta
  - Útil para debugging y auditoría

- ✅ **Formato de respuesta estandarizado**:
  ```json
  {
    "success": false,
    "error": {
      "message": "Descripción legible del error",
      "type": "VALIDATION_ERROR",
      "code": "CODIGO_ERROR"
    }
  }
  ```

**Configuración**: Agregado a `backend/backend/settings.py` en MIDDLEWARE

#### **Frontend: Interceptores HTTP Mejorados**
**Archivo**: `frontend/src/connections/http.ts`

**Mejoras implementadas**:
- ✅ **Timeout configurado**: 30 segundos para prevenir cuelgues
- ✅ **Retry logic automático**:
  - Errores de red: hasta 2 reintentos con backoff exponencial
  - 503 Service Unavailable: 1 reintento después de 2 segundos
  
- ✅ **Manejo robusto de errores**:
  - 401: Limpieza de tokens y redirección automática a login
  - 403: Mensaje claro de permisos insuficientes
  - 404: Recurso no encontrado
  - 500+: Error del servidor con reintento cuando aplica
  - Network errors: Mensaje de conexión con reintentos

- ✅ **Utilidades exportadas**:
  - `handleApiError()`: Parser consistente de errores
  - `loadingState`: Estado de carga global (opcional para context)

**Beneficios**:
- 🎯 Experiencia de usuario mejorada con reintentos automáticos
- 🛡️ Manejo consistente de sesiones expiradas
- 📊 Mensajes de error claros y traducidos
- ⚡ Resiliencia ante problemas temporales de red

---

### 2️⃣ SEPARACIÓN DE ASIGNATURAS ACTUALES Y PASADAS

#### **Backend: Endpoint de Periodo Actual**
**Archivo**: `backend/api/views/views.py`

**Nuevo endpoint**:
```python
GET /api/periodos/actual
```

**Respuesta**:
```json
{
  "id_periodo": 123,
  "descripcion": "2024-2",
  "fecha_inicio": "2024-08-01",
  "fecha_fin": "2024-12-15",
  "is_current": true
}
```

**Lógica**:
1. Busca periodo donde `fecha_inicio <= hoy`
2. Ordena por más reciente
3. Si no hay periodo activo, devuelve el próximo programado

#### **Frontend: Utilidades de Periodos**
**Archivo**: `frontend/src/utils/periods.ts`

**Funciones implementadas**:
- ✅ `getCurrentPeriod(periodos)`: Identifica el periodo actual
- ✅ `separateCoursesByPeriod(courses, currentPeriodId)`: Separa en actuales/pasados
- ✅ `groupCoursesByPeriod(courses)`: Agrupa por periodo

**Uso en componentes** (pendiente de aplicar):
```typescript
const { current, past } = separateCoursesByPeriod(courses, currentPeriod?.id)
```

---

## 🚧 SOLUCIONES PENDIENTES DE IMPLEMENTAR

### 3️⃣ ACTUALIZACIÓN EN TIEMPO REAL

#### **Opción A: Server-Sent Events (SSE)** ⭐ RECOMENDADO
**Ventajas**:
- ✅ Más simple que WebSockets
- ✅ Unidireccional (servidor → cliente) suficiente para notificaciones
- ✅ Reconexión automática integrada
- ✅ Compatible con HTTP/1.1 estándar
- ✅ Funciona con proxies/balanceadores sin configuración especial

**Implementación Backend** (Django):
```python
# backend/api/views/sse.py
from django.http import StreamingHttpResponse
import json
import time

def grade_updates_stream(request):
    """
    SSE endpoint para notificaciones de notas actualizadas.
    Requiere autenticación con token del estudiante.
    """
    def event_stream():
        # Verificar token y obtener estudiante_id
        token = _bearer_token(request)
        try:
            data = signing.loads(token, max_age=TOKEN_MAX_AGE)
            if data.get('rol') != 'estudiante':
                yield f"event: error\ndata: {json.dumps({'message': 'Solo estudiantes'})}\n\n"
                return
            estudiante_id = data.get('id')
        except:
            yield f"event: error\ndata: {json.dumps({'message': 'Token inválido'})}\n\n"
            return
        
        # Enviar keep-alive cada 15 segundos
        last_check = time.time()
        while True:
            # Verificar nuevas notas desde última verificación
            # (Implementar lógica de caché/timestamp)
            
            yield f"data: {json.dumps({'type': 'ping'})}\n\n"
            time.sleep(15)
    
    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
```

**Implementación Frontend**:
```typescript
// frontend/src/services/notifications.ts
export function subscribeToGradeUpdates(onUpdate: (data: any) => void) {
  const token = localStorage.getItem('auth_token')
  if (!token) return null
  
  const eventSource = new EventSource(
    `${import.meta.env.VITE_API_URL}/stream/notas`,
    { withCredentials: true }
  )
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'grade_update') {
        onUpdate(data)
      }
    } catch (e) {
      console.error('Error parsing SSE:', e)
    }
  }
  
  eventSource.onerror = () => {
    console.error('SSE connection error - will reconnect automatically')
  }
  
  return () => eventSource.close()
}
```

**Uso en componente Estudiante**:
```typescript
useEffect(() => {
  const unsubscribe = subscribeToGradeUpdates((update) => {
    // Actualizar estado local con nueva nota
    setActivities(prev => prev.map(act => 
      act.id === update.id_actividad 
        ? { ...act, nota: update.nota }
        : act
    ))
    // Mostrar notificación toast
    toast.success(`Nueva calificación en ${update.actividad_nombre}`)
  })
  
  return () => unsubscribe?.()
}, [])
```

#### **Opción B: WebSockets con Django Channels**
**Ventajas**:
- ✅ Bidireccional (si se requiere en el futuro)
- ✅ Más flexible para chat/interacciones complejas

**Desventajas**:
- ⚠️ Requiere configuración adicional (Redis/RabbitMQ)
- ⚠️ Más complejo de mantener
- ⚠️ Puede tener problemas con algunos proxies

**Implementación** (si se elige esta opción):
```python
# Instalar: pip install channels channels-redis
# settings.py
INSTALLED_APPS += ['channels']
ASGI_APPLICATION = 'backend.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {"hosts": [('127.0.0.1', 6379)]},
    },
}

# backend/api/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class GradeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.student_id = self.scope['url_route']['kwargs']['student_id']
        self.room_group_name = f'grades_{self.student_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def grade_update(self, event):
        await self.send(text_data=json.dumps(event['data']))
```

---

### 4️⃣ SEGURIDAD Y AUTENTICACIÓN MEJORADA

#### **Refresh Tokens**
**Problema actual**: Token único con expiración fija (7 días)

**Solución propuesta**:
```python
# backend/api/views/auth.py
@api_view(["POST"])
def login_view_v2(request):
    # ... validación de credenciales ...
    
    # Access token: corta duración (15 minutos)
    access_payload = {"rol": user_rol, "id": user.pk, "type": "access"}
    access_token = signing.dumps(access_payload, salt='access')
    
    # Refresh token: larga duración (7 días), almacenado en httpOnly cookie
    refresh_payload = {"rol": user_rol, "id": user.pk, "type": "refresh"}
    refresh_token = signing.dumps(refresh_payload, salt='refresh')
    
    response = Response({
        "token": access_token,
        "user": _serialize_user(user, user_rol)
    })
    
    # Cookie httpOnly para refresh token (más seguro que localStorage)
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        max_age=7*24*60*60,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG  # Solo HTTPS en producción
    )
    
    return response

@api_view(["POST"])
def token_refresh_view(request):
    """Renueva access token usando refresh token"""
    refresh_token = request.COOKIES.get('refresh_token')
    if not refresh_token:
        return Response({"detail": "No refresh token"}, status=401)
    
    try:
        data = signing.loads(refresh_token, max_age=7*24*60*60, salt='refresh')
        if data.get('type') != 'refresh':
            raise ValueError("Invalid token type")
    except:
        return Response({"detail": "Invalid refresh token"}, status=401)
    
    # Generar nuevo access token
    access_payload = {"rol": data['rol'], "id": data['id'], "type": "access"}
    access_token = signing.dumps(access_payload, salt='access')
    
    return Response({"token": access_token})
```

**Frontend**: Interceptor automático
```typescript
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      
      try {
        // Intentar renovar token
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        localStorage.setItem('auth_token', data.token)
        
        // Reintentar request original
        error.config.headers['Authorization'] = `Bearer ${data.token}`
        return api.request(error.config)
      } catch {
        // Refresh falló -> logout
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
```

#### **Middleware de Roles**
```python
# backend/api/middleware/roles.py
class RoleValidationMiddleware:
    """Valida roles en endpoints protegidos basado en prefijo de URL"""
    
    ROLE_PATHS = {
        '/api/coordinador/': 'coordinador',
        '/api/docente/': 'docente',
        '/api/estudiante/': 'estudiante',
    }
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Verificar si es ruta protegida
        for path_prefix, required_role in self.ROLE_PATHS.items():
            if request.path.startswith(path_prefix):
                token = self._get_token(request)
                if not token:
                    return JsonResponse({'detail': 'No autorizado'}, status=401)
                
                try:
                    data = signing.loads(token, max_age=15*60, salt='access')
                    if data.get('rol') != required_role:
                        return JsonResponse(
                            {'detail': f'Requiere rol {required_role}'}, 
                            status=403
                        )
                except:
                    return JsonResponse({'detail': 'Token inválido'}, status=401)
        
        return self.get_response(request)
```

#### **Protección CSRF Mejorada**
Ya implementado en `http.ts` con extracción de cookie `csrftoken`.

**Configuración adicional** (producción):
```python
# settings.py
CSRF_COOKIE_SECURE = not DEBUG  # Solo HTTPS
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
```

#### **Protección XSS**
**Headers de seguridad**:
```python
# settings.py
MIDDLEWARE += ['django.middleware.security.SecurityMiddleware']

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Mejoras Inmediatas ✅
- [x] Middleware de errores backend
- [x] Interceptores HTTP mejorados frontend
- [x] Endpoint periodo actual
- [x] Utilidades de separación de periodos

### Fase 2: UI y UX (EN PROGRESO)
- [ ] Actualizar vista Docente con separación actual/pasado
- [ ] Actualizar vista Estudiante con separación actual/pasado
- [ ] Agregar badges visuales para periodo actual
- [ ] Loading states consistentes en todos los componentes

### Fase 3: Tiempo Real
- [ ] Decidir: SSE (recomendado) vs WebSockets
- [ ] Implementar endpoint de streaming backend
- [ ] Crear servicio de suscripción frontend
- [ ] Integrar en vista Estudiante
- [ ] Probar con múltiples usuarios simultáneos

### Fase 4: Seguridad Avanzada
- [ ] Sistema de refresh tokens
- [ ] Middleware de validación de roles
- [ ] Headers de seguridad en producción
- [ ] Rate limiting (django-ratelimit)
- [ ] Logging de intentos de acceso fallidos

### Fase 5: Testing y Optimización
- [ ] Tests unitarios de middleware
- [ ] Tests de integración de autenticación
- [ ] Performance testing con carga
- [ ] Documentación de API actualizada

---

## 🎯 RECOMENDACIONES FINALES

### Prioridad Alta
1. **Aplicar separación de periodos en UI** (2-3 horas)
2. **Implementar SSE para notificaciones** (4-6 horas)
3. **Sistema de refresh tokens** (3-4 horas)

### Prioridad Media
4. **Middleware de roles** (2 horas)
5. **Tests de autenticación** (4 horas)
6. **Rate limiting** (1-2 horas)

### Prioridad Baja
7. **WebSockets** (solo si SSE no es suficiente)
8. **Optimizaciones adicionales de performance**

---

## 📚 RECURSOS Y DOCUMENTACIÓN

### Django
- [Django Middleware](https://docs.djangoproject.com/en/5.2/topics/http/middleware/)
- [Django Channels](https://channels.readthedocs.io/)
- [Django Security](https://docs.djangoproject.com/en/5.2/topics/security/)

### Frontend
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

### Seguridad
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Django Security Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)

---

## 🔐 BUENAS PRÁCTICAS APLICADAS

✅ **Separación de responsabilidades**: Middleware especializado  
✅ **Principio de mínimo privilegio**: Validación de roles  
✅ **Defensa en profundidad**: Múltiples capas de seguridad  
✅ **Fail-safe defaults**: Errores devuelven respuestas seguras  
✅ **Logging y auditoría**: Trazabilidad de operaciones críticas  
✅ **Manejo graceful de errores**: UX no se rompe con errores  
✅ **Resiliencia**: Reintentos automáticos para fallos temporales  

---

**Última actualización**: 17 de noviembre de 2025  
**Versión**: 1.0  
**Estado**: Implementación parcial (fases 1-2)
