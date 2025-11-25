# 📧 Guía para Enviar Correos Reales con Gmail

## 🎯 Resumen

Django **ya tiene** todo lo necesario para enviar correos. Solo necesitas configurar tu cuenta de Gmail correctamente.

**NO necesitas instalar nada nuevo.** Las dependencias que ya tienes son suficientes.

---

## 🔑 Paso 1: Crear una Contraseña de Aplicación en Gmail

### ⚠️ IMPORTANTE: NO uses tu contraseña normal de Gmail

Gmail requiere que uses una "Contraseña de aplicación" especial para aplicaciones externas.

### Pasos:

1. **Ve a tu cuenta de Google**
   - Abre: https://myaccount.google.com/security
   - Inicia sesión con tu cuenta de Gmail

2. **Activa la Verificación en Dos Pasos** (si no la tienes activada)
   - Busca "Verificación en dos pasos"
   - Sigue las instrucciones para activarla
   - Es un requisito obligatorio para usar contraseñas de aplicación

3. **Crea una Contraseña de Aplicación**
   - En la misma página de seguridad, busca "Contraseñas de aplicaciones"
   - Si no aparece, busca directamente: https://myaccount.google.com/apppasswords
   - Haz clic en "Contraseñas de aplicaciones"

4. **Genera la contraseña**
   - En "Selecciona la app": elige **"Correo"** o **"Otra (nombre personalizado)"** y escribe "Django RA-Manager"
   - En "Selecciona el dispositivo": elige **"Windows"** o el que uses
   - Haz clic en **"Generar"**

5. **Copia la contraseña generada**
   - Gmail te mostrará una contraseña de 16 caracteres como: `abcd efgh ijkl mnop`
   - **Cópiala** (puedes copiarla con espacios o sin espacios, ambos funcionan)
   - **Guárdala de forma segura** - no podrás verla de nuevo

---

## ⚙️ Paso 2: Configurar tu archivo .env

Abre tu archivo `backend/.env` y actualiza estas líneas:

```dotenv
# ==================== CONFIGURACIÓN DE EMAIL ====================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop
DEFAULT_FROM_EMAIL=tu_correo@gmail.com
```

### Ejemplo con datos reales:

```dotenv
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=salome.dev@gmail.com
EMAIL_HOST_PASSWORD=xyzw abcd efgh ijkl
DEFAULT_FROM_EMAIL=salome.dev@gmail.com
```

---

## 🧪 Paso 3: Probar el Envío de Correos

### Opción 1: Usar el script de prueba

```bash
cd backend
python test_otp_system.py
```

Este script:
- ✅ Prueba el envío de OTP
- ✅ Verifica la conexión SMTP
- ✅ Muestra errores detallados si algo falla

### Opción 2: Probar desde Django shell

```bash
cd backend
python manage.py shell
```

Luego ejecuta:

```python
from django.core.mail import send_mail

send_mail(
    subject='Prueba de Correo - RA Manager',
    message='Este es un correo de prueba desde Django.',
    from_email='tu_correo@gmail.com',
    recipient_list=['tu_correo@gmail.com'],
    fail_silently=False,
)
print("✅ Correo enviado exitosamente!")
```

### Opción 3: Probar recuperación de contraseña

1. Inicia el servidor:
   ```bash
   python manage.py runserver
   ```

2. Abre el frontend: http://localhost:5173

3. Haz clic en "¿Olvidaste tu contraseña?"

4. Ingresa un correo que exista en tu base de datos (estudiante o docente)

5. Revisa tu bandeja de entrada (y spam si no llega)

---

## 🐛 Solución de Problemas

### ❌ Error: "SMTPAuthenticationError: Username and Password not accepted"

**Causa**: Contraseña incorrecta o no estás usando una contraseña de aplicación.

**Solución**:
1. Asegúrate de haber creado una contraseña de aplicación (no uses tu contraseña normal)
2. Verifica que copiaste la contraseña completa (16 caracteres)
3. Verifica que la verificación en dos pasos esté activada

### ❌ Error: "SMTPServerDisconnected: Connection unexpectedly closed"

**Causa**: Gmail bloqueó el acceso.

**Solución**:
1. Ve a https://myaccount.google.com/lesssecureapps
2. Si aparece algo sobre "Acceso de apps menos seguras", **NO lo actives** (está obsoleto)
3. En su lugar, asegúrate de usar una contraseña de aplicación (Paso 1)

### ❌ Error: "SMTPRecipientsRefused"

**Causa**: El correo del destinatario no es válido o no existe.

**Solución**:
1. Verifica que el correo esté bien escrito en la base de datos
2. Asegúrate de que el correo exista en la tabla de Estudiantes o Docentes

### ❌ Los correos se envían pero no llegan

**Causa**: Gmail los marcó como spam.

**Solución**:
1. Revisa tu carpeta de **Spam** en Gmail
2. Marca el correo como "No es spam"
3. Agrega el remitente a tus contactos

### ❌ Error: "timeout" o "Connection refused"

**Causa**: Problemas de red o firewall.

**Solución**:
1. Verifica tu conexión a Internet
2. Verifica que tu firewall permita conexiones al puerto 587
3. Si estás detrás de un proxy corporativo, puede bloquear SMTP

---

## 🔒 Seguridad

### ✅ Buenas Prácticas

- ✅ Usa contraseñas de aplicación, no tu contraseña normal
- ✅ NUNCA subas tu archivo `.env` a GitHub (ya está en `.gitignore`)
- ✅ Revoca contraseñas de aplicación que ya no uses
- ✅ Usa diferentes contraseñas de aplicación para diferentes proyectos

### ❌ Malas Prácticas

- ❌ No uses "Acceso de apps menos seguras" (obsoleto y peligroso)
- ❌ No compartas tu contraseña de aplicación
- ❌ No hardcodees credenciales en el código
- ❌ No uses tu contraseña personal de Gmail

---

## 🔄 Volver al Modo Consola (Desarrollo)

Si quieres volver a imprimir los correos en la consola en lugar de enviarlos:

```dotenv
# backend/.env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Esto es útil para:
- ✅ Desarrollo local sin consumir cuota de Gmail
- ✅ Pruebas sin enviar correos reales
- ✅ Evitar spam durante debugging

---

## 📊 Límites de Gmail

Gmail tiene límites para envío de correos:

| Tipo de cuenta | Límite diario |
|----------------|---------------|
| Gmail gratuito | ~500 correos/día |
| Google Workspace | ~2000 correos/día |

Para este proyecto (recuperación de contraseña), es más que suficiente.

---

## 🎯 Checklist Final

- [ ] Verificación en dos pasos activada en Gmail
- [ ] Contraseña de aplicación generada
- [ ] `EMAIL_HOST_USER` configurado con tu Gmail
- [ ] `EMAIL_HOST_PASSWORD` configurado con la contraseña de aplicación
- [ ] `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- [ ] Servidor Django reiniciado después de cambiar `.env`
- [ ] Correo de prueba enviado exitosamente

---

## 📧 Ejemplo de Correo que se Enviará

Cuando un usuario solicite recuperación de contraseña, recibirá un correo así:

```
Asunto: Código de Recuperación de Contraseña - RA Manager

Hola Juan,

Recibimos una solicitud para restablecer tu contraseña en RA Manager.

Tu código de verificación es: 123456

⚠️ Este código es válido por 5 minutos.

Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.

Saludos,
Equipo RA Manager
Universidad del Valle
```

---

## 🆘 ¿Sigues Teniendo Problemas?

1. **Verifica tu configuración:**
   ```bash
   python check_env.py
   ```

2. **Revisa los logs del servidor Django** para ver errores detallados

3. **Consulta la documentación oficial:**
   - Gmail: https://support.google.com/accounts/answer/185833
   - Django: https://docs.djangoproject.com/en/5.2/topics/email/

4. **Contacta al equipo** con el mensaje de error completo

---

**¡Listo! Ya puedes enviar correos reales. 📧✨**

_Última actualización: Noviembre 2025_
