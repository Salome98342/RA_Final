# Sistema Completo de Recuperación de Contraseña con OTP

## 📋 Descripción General

Sistema robusto de recuperación de contraseña mediante códigos OTP (One-Time Password) de 6 dígitos enviados por correo electrónico. Implementado con Django REST Framework, soporte para múltiples roles (Estudiante/Docente) y medidas de seguridad avanzadas.

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Modelo `PasswordResetOTP`**: Almacena códigos OTP temporales
2. **Serializers de validación**: Validan y normalizan datos de entrada
3. **Endpoints REST**: Tres endpoints para el flujo completo
4. **Sistema de email**: Envío de códigos por SMTP

---

## 🗄️ Modelo de Datos

### Tabla: `password_reset_otp`

```python
class PasswordResetOTP(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=255, db_index=True)  # Email del usuario
    otp_code = models.CharField(max_length=6)                  # Código de 6 dígitos
    created_at = models.DateTimeField(auto_now_add=True)      # Fecha de creación
    expires_at = models.DateTimeField()                        # Fecha de expiración (5 min)
    is_used = models.BooleanField(default=False)              # Si ya fue usado
    rol = models.CharField(max_length=20)                      # 'estudiante' o 'docente'
```

**Características:**
- Índice en `email` para búsquedas rápidas
- Expiración automática después de 5 minutos
- Flag `is_used` para prevenir reutilización
- Ordenamiento por `-created_at` (más reciente primero)

---

## 🔐 Flujo de Recuperación de Contraseña

```
┌─────────────────┐
│  1. Solicitar   │
│   Código OTP    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Verificar   │
│   Código OTP    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Cambiar     │
│   Contraseña    │
└─────────────────┘
```

---

## 📡 Endpoints de la API

### 1. Solicitar Código OTP

**Endpoint:** `POST /api/auth/password/forgot`

**Descripción:** Genera un código OTP y lo envía al correo del usuario.

**Request Body:**
```json
{
  "email": "estudiante@correounivalle.edu.co"
}
```

**Response Success (200):**
```json
{
  "ok": true,
  "message": "Si el correo está registrado, recibirás un código de verificación"
}
```

**Response Error (400):**
```json
{
  "errors": {
    "email": ["El correo electrónico es requerido"]
  }
}
```

**Lógica de búsqueda:**
1. Busca primero en tabla `Estudiante`
2. Si no encuentra, busca en tabla `Docente`
3. Prioriza estudiantes si el email existe en ambas tablas
4. Siempre responde 200 OK (previene enumeración de usuarios)

**Seguridad:**
- Invalida OTPs previos del mismo email
- Genera código aleatorio de 6 dígitos (100000-999999)
- Expira en 5 minutos
- No revela si el email existe o no

---

### 2. Verificar Código OTP

**Endpoint:** `POST /api/auth/password/verify-otp`

**Descripción:** Valida que el código OTP sea correcto y no haya expirado.

**Request Body:**
```json
{
  "email": "estudiante@correounivalle.edu.co",
  "otp_code": "123456"
}
```

**Response Success (200):**
```json
{
  "ok": true,
  "message": "Código verificado correctamente. Procede a cambiar tu contraseña."
}
```

**Response con advertencia (200):**
```json
{
  "ok": true,
  "message": "Código verificado correctamente. Procede a cambiar tu contraseña.",
  "warning": "Tu código expirará pronto. Completa el proceso rápidamente."
}
```

**Response Error (400):**
```json
{
  "message": "Código OTP inválido o expirado. Por favor, solicita uno nuevo."
}
```

**Validaciones:**
- Email debe ser válido
- OTP debe ser exactamente 6 dígitos numéricos
- OTP no debe estar usado (`is_used=False`)
- OTP no debe estar expirado (`expires_at > now`)
- Advierte si quedan menos de 60 segundos

---

### 3. Restablecer Contraseña

**Endpoint:** `POST /api/auth/password/reset`

**Descripción:** Cambia la contraseña del usuario usando el código OTP verificado.

**Request Body:**
```json
{
  "email": "estudiante@correounivalle.edu.co",
  "otp_code": "123456",
  "password": "nuevaContraseña123"
}
```

**Response Success (200):**
```json
{
  "ok": true,
  "message": "Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión."
}
```

**Response Error (400):**
```json
{
  "message": "Código OTP inválido o expirado. Solicita un nuevo código."
}
```

**Response Error (404):**
```json
{
  "message": "Usuario estudiante no encontrado"
}
```

**Response Error (500):**
```json
{
  "message": "Error al actualizar la contraseña. Por favor, intenta nuevamente."
}
```

**Proceso:**
1. Valida email, código OTP y nueva contraseña
2. Verifica que el OTP sea válido
3. Localiza al usuario según el rol almacenado
4. Hashea la nueva contraseña con `make_password()`
5. Actualiza el campo correspondiente:
   - Docente: `contrasenia_docente`
   - Estudiante: `contrasena_estudiante`
6. Marca el OTP como usado
7. Invalida otros OTPs pendientes del mismo email
8. **Usa transacción atómica** para garantizar consistencia

---

## 📧 Configuración de Email

### Para Desarrollo (Console Backend)

Imprime los emails en la consola:

```python
# backend/backend/settings.py
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

### Para Producción (SMTP con Gmail)

```python
# backend/backend/settings.py
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "tu_correo@gmail.com"
EMAIL_HOST_PASSWORD = "tu_password_de_aplicacion"
DEFAULT_FROM_EMAIL = "noreply@ramanager.com"
```

### Configuración con Variables de Entorno

```bash
# backend/.env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=noreply@ramanager.com
```

### Generar Contraseña de Aplicación en Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Seguridad → Verificación en dos pasos (activar si no lo está)
3. Seguridad → Contraseñas de aplicaciones
4. Selecciona "Correo" y "Otro (nombre personalizado)"
5. Escribe "RA Manager" y genera
6. Copia el código de 16 caracteres (sin espacios)
7. Úsalo como `EMAIL_HOST_PASSWORD`

---

## 🧪 Serializers de Validación

### 1. PasswordForgotSerializer

```python
class PasswordForgotSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        return value.lower().strip()
```

**Validaciones:**
- Email es requerido
- Formato de email válido
- Normalización a minúsculas

---

### 2. VerifyOTPSerializer

```python
class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(max_length=6, min_length=6, required=True)
    
    def validate_otp_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('El código OTP debe contener solo dígitos')
        return value
```

**Validaciones:**
- Email válido
- OTP exactamente 6 caracteres
- OTP solo dígitos numéricos

---

### 3. PasswordResetSerializer

```python
class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(max_length=6, min_length=6, required=True)
    password = serializers.CharField(min_length=6, max_length=128, write_only=True)
```

**Validaciones:**
- Email válido
- OTP de 6 dígitos numéricos
- Contraseña mínimo 6 caracteres
- Contraseña máximo 128 caracteres
- Campo `password` es write-only (no se retorna en respuestas)

---

## 🛡️ Medidas de Seguridad

### 1. Prevención de Enumeración de Usuarios
- Siempre responde 200 OK, incluso si el email no existe
- Mensaje genérico: "Si el correo está registrado..."

### 2. Expiración de Códigos
- Los códigos OTP expiran en **5 minutos**
- Advertencia si quedan menos de 60 segundos

### 3. Prevención de Reutilización
- Flag `is_used` marca códigos ya utilizados
- Al usar un OTP, se invalidan todos los demás del mismo email

### 4. Limitación de Intentos
- Un OTP solo puede usarse una vez
- Códigos antiguos se invalidan al generar uno nuevo

### 5. Transacciones Atómicas
- Cambio de contraseña usa `transaction.atomic()`
- Garantiza consistencia (todo o nada)

### 6. Hashing de Contraseñas
- Usa `make_password()` de Django
- Algoritmo PBKDF2 por defecto

### 7. Búsqueda Case-Insensitive
- Usa `__iexact` en queries
- Normaliza emails a minúsculas

### 8. Logging de Eventos
- Log de errores de envío de email
- Log de cambios exitosos de contraseña
- No logea contraseñas ni códigos OTP

---

## 🧪 Pruebas de Integración

### Escenario 1: Flujo completo exitoso

```python
# 1. Solicitar código
response = client.post('/api/auth/password/forgot', {
    'email': 'test@example.com'
})
assert response.status_code == 200
assert response.json()['ok'] == True

# 2. Verificar código (obtener del email/console)
response = client.post('/api/auth/password/verify-otp', {
    'email': 'test@example.com',
    'otp_code': '123456'
})
assert response.status_code == 200

# 3. Cambiar contraseña
response = client.post('/api/auth/password/reset', {
    'email': 'test@example.com',
    'otp_code': '123456',
    'password': 'nuevaPassword123'
})
assert response.status_code == 200
```

### Escenario 2: Código expirado

```python
# Esperar más de 5 minutos
time.sleep(301)

response = client.post('/api/auth/password/verify-otp', {
    'email': 'test@example.com',
    'otp_code': '123456'
})
assert response.status_code == 400
assert 'expirado' in response.json()['message']
```

### Escenario 3: Código ya usado

```python
# Usar el código una vez
client.post('/api/auth/password/reset', {...})

# Intentar usar nuevamente
response = client.post('/api/auth/password/reset', {...})
assert response.status_code == 400
```

---

## 📝 Ejemplo de Email Enviado

```
Asunto: Código de Recuperación de Contraseña - RA Manager

Hola Juan,

Recibimos una solicitud para restablecer tu contraseña en RA Manager.

Tu código de verificación es: 438291

⚠️ Este código es válido por 5 minutos.

Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.

Saludos,
Equipo RA Manager
Universidad del Valle
```

---

## 🚀 Integración Frontend

### Flujo recomendado en React/TypeScript

```typescript
// 1. Solicitar código OTP
const handleForgotPassword = async (email: string) => {
  try {
    const response = await api.post('/auth/password/forgot', { email });
    if (response.data.ok) {
      setStep('verify-otp');
      alert('Código enviado. Revisa tu correo.');
    }
  } catch (error) {
    console.error('Error al solicitar OTP:', error);
  }
};

// 2. Verificar código
const handleVerifyOTP = async (email: string, otpCode: string) => {
  try {
    const response = await api.post('/auth/password/verify-otp', {
      email,
      otp_code: otpCode
    });
    if (response.data.ok) {
      setStep('reset-password');
    }
  } catch (error) {
    alert('Código inválido o expirado');
  }
};

// 3. Cambiar contraseña
const handleResetPassword = async (
  email: string,
  otpCode: string,
  newPassword: string
) => {
  try {
    const response = await api.post('/auth/password/reset', {
      email,
      otp_code: otpCode,
      password: newPassword
    });
    if (response.data.ok) {
      navigate('/login');
      alert('Contraseña actualizada. Inicia sesión.');
    }
  } catch (error) {
    alert('Error al cambiar contraseña');
  }
};
```

---

## 🔧 Mantenimiento

### Limpiar OTPs expirados (comando de gestión)

```python
# backend/api/management/commands/clean_expired_otps.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models.models import PasswordResetOTP

class Command(BaseCommand):
    help = 'Elimina códigos OTP expirados de la base de datos'

    def handle(self, *args, **options):
        expired = PasswordResetOTP.objects.filter(
            expires_at__lt=timezone.now()
        )
        count = expired.count()
        expired.delete()
        self.stdout.write(
            self.style.SUCCESS(f'Eliminados {count} OTPs expirados')
        )
```

**Ejecutar:**
```bash
python manage.py clean_expired_otps
```

### Configurar cron job (Linux)

```bash
# Ejecutar diariamente a las 2 AM
0 2 * * * cd /path/to/project && python manage.py clean_expired_otps
```

---

## 📊 Monitoreo y Logs

### Logs importantes

```python
# Ejemplo de logs generados
[INFO] Contraseña restablecida exitosamente para test@example.com (rol: estudiante)
[ERROR] Error al enviar OTP a test@example.com: SMTPAuthenticationError
[WARNING] Intento de verificar OTP expirado para test@example.com
```

### Configuración de logging

```python
# backend/backend/settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'otp_system.log',
        },
    },
    'loggers': {
        'api.views.views': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si el correo está en ambas tablas?
Se prioriza la tabla `Estudiante`. Si un email existe como estudiante y como docente, se enviará el OTP al registro de estudiante.

### ¿Cuánto tiempo dura el código OTP?
**5 minutos** desde el momento de generación.

### ¿Puedo usar el mismo código múltiples veces?
No. Una vez usado, el código se marca como `is_used=True` y no se puede reutilizar.

### ¿Qué pasa si solicito un nuevo código mientras uno está activo?
El código anterior se invalida automáticamente y se genera uno nuevo.

### ¿Es seguro enviar el OTP por email?
Sí, siempre que:
- Uses HTTPS en producción
- El código expire rápidamente (5 min)
- El código solo se use una vez
- El email del usuario sea seguro (no compartido)

### ¿Puedo cambiar el tiempo de expiración?
Sí, modifica `timedelta(minutes=5)` en `password_forgot_view`:

```python
expires_at = timezone.now() + timedelta(minutes=10)  # 10 minutos
```

---

## 📚 Referencias

- [Django Email Documentation](https://docs.djangoproject.com/en/5.0/topics/email/)
- [Django REST Framework Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [Django Transactions](https://docs.djangoproject.com/en/5.0/topics/db/transactions/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

---

## ✅ Checklist de Implementación

- [x] Modelo `PasswordResetOTP` creado
- [x] Migración de base de datos aplicada
- [x] Serializers de validación implementados
- [x] Endpoint `POST /api/auth/password/forgot` funcionando
- [x] Endpoint `POST /api/auth/password/verify-otp` funcionando
- [x] Endpoint `POST /api/auth/password/reset` funcionando
- [x] Configuración de email en `settings.py`
- [x] Variables de entorno en `.env.example`
- [x] Pruebas de integración
- [ ] Frontend integrado
- [ ] Comando de limpieza de OTPs expirados
- [ ] Monitoreo de logs configurado
- [ ] Deploy en producción

---

**Sistema implementado por:** RA Manager Team  
**Última actualización:** Noviembre 2025  
**Versión del documento:** 2.0
