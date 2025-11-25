# 📧 Guía Completa de Configuración de Email para OTP

Esta guía te ayudará a configurar el envío de correos electrónicos para el sistema de recuperación de contraseña con OTP.

---

## 🚀 Inicio Rápido

### Para Desarrollo (Sin email real)

Si solo quieres probar el sistema sin configurar un servidor SMTP real:

```bash
# backend/.env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Los emails se imprimirán en la consola donde corre el servidor Django.

---

## 📮 Configuración con Gmail (Recomendado)

### Paso 1: Habilitar Verificación en 2 Pasos

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Clic en **Seguridad** (panel izquierdo)
3. Busca **Verificación en dos pasos**
4. Haz clic en **Activar** y sigue los pasos

### Paso 2: Crear Contraseña de Aplicación

1. Una vez activada la verificación en 2 pasos, regresa a **Seguridad**
2. Busca **Contraseñas de aplicaciones** (puede estar al final)
3. Haz clic en **Contraseñas de aplicaciones**
4. Selecciona:
   - **Aplicación:** Correo
   - **Dispositivo:** Otro (nombre personalizado)
5. Escribe "RA Manager" o cualquier nombre
6. Haz clic en **Generar**
7. Copia el código de 16 caracteres (formato: `xxxx xxxx xxxx xxxx`)

⚠️ **IMPORTANTE:** Guarda este código inmediatamente. No podrás verlo nuevamente.

### Paso 3: Configurar Variables de Entorno

Edita tu archivo `backend/.env`:

```bash
# ==================== CONFIGURACIÓN DE EMAIL ====================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=noreply@ramanager.com
```

Reemplaza:
- `tu_correo@gmail.com` con tu email real de Gmail
- `xxxx xxxx xxxx xxxx` con la contraseña de aplicación generada

### Paso 4: Reiniciar Servidor Django

```bash
# Detener el servidor (Ctrl+C)
# Iniciar nuevamente
python manage.py runserver
```

### Paso 5: Probar

```bash
# Desde otro terminal
curl -X POST http://localhost:8000/api/auth/password/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Deberías recibir un email en la bandeja de entrada del destinatario.

---

## 📮 Configuración con Outlook/Hotmail

### Variables de Entorno

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_correo@outlook.com
EMAIL_HOST_PASSWORD=tu_contraseña
DEFAULT_FROM_EMAIL=noreply@ramanager.com
```

⚠️ **Nota:** Outlook puede requerir configuración adicional de seguridad.

---

## 📮 Configuración con Yahoo Mail

### Variables de Entorno

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_correo@yahoo.com
EMAIL_HOST_PASSWORD=contraseña_aplicacion_yahoo
DEFAULT_FROM_EMAIL=noreply@ramanager.com
```

Yahoo también requiere contraseña de aplicación similar a Gmail.

---

## 📮 Configuración con SendGrid (Producción)

SendGrid es un servicio profesional de envío de emails, ideal para producción.

### Paso 1: Crear cuenta

1. Registrarse en https://sendgrid.com/ (plan gratuito: 100 emails/día)
2. Verificar tu email
3. Crear una API Key

### Paso 2: Configurar Django

Instalar paquete adicional:

```bash
pip install sendgrid
```

Agregar a `requirements.txt`:

```txt
sendgrid>=6.11.0
```

### Paso 3: Variables de Entorno

```bash
EMAIL_BACKEND=sendgrid_backend.SendgridBackend
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@tudominio.com
```

### Paso 4: Instalar backend de SendGrid

```bash
pip install django-sendgrid-v5
```

---

## 🧪 Probar Configuración de Email

### Método 1: Shell de Django

```bash
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    subject='Test Email',
    message='Este es un email de prueba desde RA Manager',
    from_email='noreply@ramanager.com',
    recipient_list=['tu_email@ejemplo.com'],
    fail_silently=False,
)
```

Si no hay errores, ¡funciona! ✅

### Método 2: Endpoint de prueba

Crear endpoint temporal en `views.py`:

```python
@api_view(["GET"])
@permission_classes([AllowAny])
def test_email(request):
    try:
        send_mail(
            subject='Test RA Manager',
            message='Email de prueba',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['test@example.com'],
            fail_silently=False,
        )
        return Response({"ok": True, "message": "Email enviado"})
    except Exception as e:
        return Response({"ok": False, "error": str(e)}, status=500)
```

### Método 3: Script de prueba

```bash
python backend/test_otp_system.py
```

---

## 🐛 Solución de Problemas

### Error: `SMTPAuthenticationError`

**Causa:** Credenciales incorrectas o contraseña de aplicación no configurada.

**Solución:**
1. Verifica que `EMAIL_HOST_USER` sea correcto
2. Genera una nueva contraseña de aplicación
3. Asegúrate de que la verificación en 2 pasos esté activa

### Error: `SMTPServerDisconnected`

**Causa:** Puerto o host incorrecto.

**Solución:**
- Gmail: `smtp.gmail.com:587` con `EMAIL_USE_TLS=True`
- O prueba: `smtp.gmail.com:465` con `EMAIL_USE_SSL=True`

```bash
# Para SSL en lugar de TLS
EMAIL_PORT=465
EMAIL_USE_TLS=False
EMAIL_USE_SSL=True
```

### Error: `Connection refused`

**Causa:** Firewall bloqueando puerto 587.

**Solución:**
1. Verificar firewall del sistema
2. Probar con puerto 465 (SSL)
3. Verificar que no estés en una red corporativa que bloquee SMTP

### Emails no llegan (sin errores)

**Causa:** Emails van a spam o carpeta de correo no deseado.

**Solución:**
1. Revisar carpeta de spam
2. Agregar `noreply@ramanager.com` a contactos
3. Usar un dominio verificado en producción

### Error: `[Errno 11001] getaddrinfo failed`

**Causa:** No hay conexión a internet o DNS no resuelve.

**Solución:**
1. Verificar conexión a internet
2. Hacer ping a `smtp.gmail.com`
3. Verificar configuración de DNS

---

## 🔒 Mejores Prácticas de Seguridad

### 1. Nunca commitear credenciales

✅ **Correcto:**
```bash
# backend/.env
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
```

❌ **Incorrecto:**
```python
# backend/settings.py
EMAIL_HOST_PASSWORD = "xxxx xxxx xxxx xxxx"  # ¡NUNCA!
```

### 2. Usar contraseñas de aplicación

No uses tu contraseña real de Gmail. Siempre usa contraseñas de aplicación.

### 3. Limitar rate de envío

Implementar throttling para prevenir spam:

```python
# backend/backend/settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '5/hour',  # 5 solicitudes de OTP por hora por IP
    }
}
```

### 4. Logs de envío

No logues códigos OTP completos:

```python
# ✅ Correcto
logger.info(f"OTP enviado a {email}")

# ❌ Incorrecto
logger.info(f"OTP {otp_code} enviado a {email}")
```

### 5. Validar emails antes de enviar

```python
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

try:
    validate_email(email)
except ValidationError:
    return Response({"error": "Email inválido"}, status=400)
```

---

## 📊 Monitoreo de Emails

### Logs de envío

Django registra automáticamente envíos de email en desarrollo:

```bash
# Console backend muestra:
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: Código de Recuperación de Contraseña - RA Manager
From: noreply@ramanager.com
To: test@example.com
Date: Sun, 24 Nov 2024 10:30:00 -0000

Hola Test,

Tu código de verificación es: 123456
...
```

### Estadísticas de SendGrid

Si usas SendGrid, accede a:
- https://app.sendgrid.com/statistics
- Ver emails enviados, abiertos, clicks, etc.

---

## 🌍 Variables de Entorno Completas

### Archivo `.env` de referencia

```bash
# ==================== DATABASE ====================
DB_NAME=ra_manager
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432

# ==================== DJANGO ====================
SECRET_KEY=django-insecure-change-this
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# ==================== CORS ====================
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_URL=http://localhost:5173

# ==================== EMAIL (DESARROLLO) ====================
# Opción 1: Console backend (emails en consola)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# ==================== EMAIL (PRODUCCIÓN - GMAIL) ====================
# Opción 2: Gmail SMTP
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=tu_correo@gmail.com
# EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
# DEFAULT_FROM_EMAIL=noreply@ramanager.com

# ==================== EMAIL (PRODUCCIÓN - SENDGRID) ====================
# Opción 3: SendGrid
# EMAIL_BACKEND=sendgrid_backend.SendgridBackend
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
# DEFAULT_FROM_EMAIL=noreply@tudominio.com

# ==================== SECURITY (SOLO PRODUCCIÓN) ====================
# SECURE_HSTS_SECONDS=31536000
# SECURE_SSL_REDIRECT=True
# SESSION_COOKIE_SECURE=True
# CSRF_COOKIE_SECURE=True
```

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [Django Email Documentation](https://docs.djangoproject.com/en/5.0/topics/email/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [SendGrid Documentation](https://docs.sendgrid.com/)

### Herramientas de Testing

- [Mailtrap](https://mailtrap.io/) - Servidor SMTP de prueba
- [MailHog](https://github.com/mailhog/MailHog) - Servidor local de testing
- [Ethereal Email](https://ethereal.email/) - Email de prueba temporal

### Plantillas de Email

Para emails más profesionales, considera usar:
- [Django Templates](https://docs.djangoproject.com/en/5.0/topics/templates/)
- [django-templated-email](https://github.com/vintasoftware/django-templated-email)
- [Premailer](https://pypi.org/project/premailer/) - Inline CSS para emails

---

## ✅ Checklist de Configuración

- [ ] Decidir backend de email (console, Gmail, SendGrid, etc.)
- [ ] Crear cuenta y obtener credenciales
- [ ] Configurar variables de entorno en `.env`
- [ ] Instalar dependencias adicionales si es necesario
- [ ] Reiniciar servidor Django
- [ ] Enviar email de prueba desde shell
- [ ] Probar endpoint de recuperación de contraseña
- [ ] Verificar que emails lleguen correctamente
- [ ] Revisar logs por errores
- [ ] Configurar throttling para producción
- [ ] Documentar configuración para el equipo

---

**¿Necesitas ayuda?**  
Consulta el archivo `backend/docs/OTP_SYSTEM_COMPLETE.md` para más detalles del sistema OTP.

---

**Última actualización:** Noviembre 2025  
**Mantenido por:** RA Manager Team
