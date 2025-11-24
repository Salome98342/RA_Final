# Sistema OTP para Recuperación de Contraseña

## Descripción General

Se implementó un sistema de recuperación de contraseña mediante códigos OTP (One-Time Password) de 6 dígitos que se envían al correo electrónico del usuario.

## Flujo de Recuperación

### 1. Solicitar Código OTP
**Endpoint**: `POST /api/auth/password/forgot`

**Request Body**:
```json
{
  "email": "estudiante@correounivalle.edu.co"
}
```

**Response**:
```json
{
  "ok": true
}
```

**Comportamiento**:
- Busca el usuario por correo (estudiante o docente)
- Invalida OTPs anteriores no usados del mismo email
- Genera un código OTP de 6 dígitos aleatorio
- Crea registro en BD con expiración de 10 minutos
- Envía correo con el código OTP
- Siempre responde 200 OK (evita enumeración de usuarios)

### 2. Verificar Código OTP
**Endpoint**: `POST /api/auth/password/verify-otp`

**Request Body**:
```json
{
  "email": "estudiante@correounivalle.edu.co",
  "otp_code": "123456"
}
```

**Response Success**:
```json
{
  "ok": true,
  "message": "Código verificado correctamente"
}
```

**Response Error**:
```json
{
  "message": "Código OTP inválido o expirado"
}
```

**Comportamiento**:
- Valida que el código OTP sea válido (no usado y no expirado)
- No marca el OTP como usado (se marcará al cambiar contraseña)

### 3. Cambiar Contraseña
**Endpoint**: `POST /api/auth/password/reset`

**Request Body**:
```json
{
  "email": "estudiante@correounivalle.edu.co",
  "otp_code": "123456",
  "password": "nuevaContraseña123"
}
```

**Response Success**:
```json
{
  "ok": true,
  "message": "Contraseña actualizada correctamente"
}
```

**Response Error**:
```json
{
  "message": "Código OTP inválido o expirado"
}
```

**Comportamiento**:
- Valida el código OTP
- Busca al usuario por email y rol
- Actualiza la contraseña (hasheada)
- Marca el OTP como usado
- Responde con éxito

## Modelo de Base de Datos

```python
class PasswordResetOTP(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=255, db_index=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Actual time + 10 minutos
    is_used = models.BooleanField(default=False)
    rol = models.CharField(max_length=20)  # 'estudiante' o 'docente'
```

**Tabla**: `password_reset_otp`

## Frontend

### Página de Recuperación (`/recuperar`)

Tiene 3 pasos:

1. **Ingresar Email**: Usuario ingresa su correo institucional
2. **Ingresar OTP**: Se muestra campo para código de 6 dígitos
3. **Nueva Contraseña**: Usuario ingresa nueva contraseña y confirmación

### Validaciones Frontend

- Email requerido y válido
- Código OTP de 6 dígitos numéricos
- Contraseña mínimo 6 caracteres
- Confirmación de contraseña debe coincidir

## Seguridad

### Mitigaciones Implementadas

1. **Enumeración de Usuarios**: Siempre responde 200 OK aunque el email no exista
2. **Expiración**: Códigos OTP válidos por 10 minutos
3. **Un Solo Uso**: OTP se marca como usado al cambiar contraseña
4. **Invalidación**: OTPs anteriores se invalidan al solicitar uno nuevo
5. **Hash de Contraseñas**: Contraseñas almacenadas con hash seguro
6. **Rate Limiting**: Considerar implementar límite de intentos por IP

### Consideraciones de Seguridad Adicionales

- [ ] Implementar rate limiting en endpoints de OTP
- [ ] Agregar logging de intentos fallidos
- [ ] Bloquear IPs tras múltiples intentos fallidos
- [ ] Notificar al usuario cuando se solicite recuperación
- [ ] Agregar verificación 2FA opcional

## Configuración de Email

### Desarrollo
```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```
Los correos se imprimen en la consola del servidor.

### Producción
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password-aqui
DEFAULT_FROM_EMAIL=no-reply@univalle.edu.co
```

## Pruebas

### Probar en Desarrollo

1. Iniciar el servidor backend:
```bash
cd backend
..\env\Scripts\python.exe manage.py runserver
```

2. Navegar a `http://localhost:5173/recuperar`

3. Ingresar un correo de estudiante o docente existente

4. Revisar la consola del servidor backend para ver el código OTP

5. Ingresar el código de 6 dígitos

6. Ingresar nueva contraseña

7. Verificar que se pueda iniciar sesión con la nueva contraseña

### Ejemplo de Salida en Consola

```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: =?utf-8?q?C=C3=B3digo_de_recuperaci=C3=B3n_de_contrase=C3=B1a?=
From: no-reply@univalle.local
To: estudiante@correounivalle.edu.co
Date: Sat, 23 Nov 2025 23:46:32 -0000

Hola,

Recibimos una solicitud para restablecer tu contraseña.
Tu código de verificación es: 456789

Este código es válido por 10 minutos.
Si no fuiste tú, puedes ignorar este mensaje.

— Universidad del Valle
```

## Migración

La migración `0021_passwordresetotp.py` crea la tabla necesaria:

```bash
python manage.py migrate
```

## Endpoints Anteriores

El endpoint anterior `/reset?token=...` ahora redirige a `/recuperar` con el nuevo flujo OTP.

## Archivos Modificados

### Backend
- `api/models/models.py`: Modelo `PasswordResetOTP`
- `api/views/views.py`: Funciones `password_forgot_view`, `verify_otp_view`, `password_reset_view`
- `api/urls/urls.py`: Nueva ruta `/auth/password/verify-otp`
- `api/serializers/serializers.py`: Import del modelo OTP
- `api/migrations/0021_passwordresetotp.py`: Nueva migración

### Frontend
- `services/auth.ts`: Funciones `verifyOTP` y `resetPassword` actualizadas
- `connections/endpoints.ts`: Endpoint `verifyOtp`
- `pages/Recuperar.tsx`: Flujo completo de 3 pasos
- `pages/Reset.tsx`: Redirige a recuperar (compatibilidad)

## Limpieza de Base de Datos

Para limpiar OTPs expirados periódicamente, crear un comando de Django:

```python
# management/commands/cleanup_expired_otp.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import PasswordResetOTP

class Command(BaseCommand):
    def handle(self, *args, **options):
        deleted = PasswordResetOTP.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        self.stdout.write(f"Eliminados {deleted[0]} OTPs expirados")
```

Ejecutar con cron:
```bash
python manage.py cleanup_expired_otp
```
