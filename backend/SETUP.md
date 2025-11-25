# 🚀 Configuración del Backend - RA Manager

## 📋 Requisitos Previos

- Python 3.10 o superior
- PostgreSQL 12 o superior
- pip (gestor de paquetes de Python)

## ⚙️ Configuración Inicial

### 1. Crear y activar entorno virtual

**Windows (PowerShell):**
```powershell
python -m venv env
.\env\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
python -m venv env
.\env\Scripts\activate.bat
```

**Linux/Mac:**
```bash
python3 -m venv env
source env/bin/activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

**IMPORTANTE**: Cada desarrollador debe crear su propio archivo `.env` basado en `.env.example`

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

Luego editar `.env` con tus propias credenciales:

```dotenv
# ==================== CONFIGURACIÓN DE DJANGO ====================
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# ==================== CONFIGURACIÓN DE BASE DE DATOS ====================
# Configura aquí TU base de datos PostgreSQL local
DB_NAME=ra_manager
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_AQUI  # ⚠️ Cambia esto por tu contraseña de PostgreSQL
DB_HOST=localhost
DB_PORT=5432

# ==================== CONFIGURACIÓN DE CORS ====================
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_URL=http://localhost:5173

# ==================== CONFIGURACIÓN DE EMAIL ====================
# Para desarrollo: deja el backend de consola (imprime emails en terminal)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@ramanager.local

# Para probar envío real de emails con Gmail:
# 1. Ve a tu cuenta Google → Seguridad
# 2. Activa "Verificación en dos pasos"
# 3. Genera una "Contraseña de aplicación" (16 caracteres)
# 4. Descomenta y configura:
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=tu_correo@gmail.com
# EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
# DEFAULT_FROM_EMAIL=tu_correo@gmail.com

# ==================== CONFIGURACIÓN DE LOGGING ====================
DJANGO_LOG_LEVEL=INFO
```

### 4. Configurar la base de datos PostgreSQL

```sql
-- Conéctate a PostgreSQL y crea la base de datos
CREATE DATABASE ra_manager;
CREATE USER postgres WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE ra_manager TO postgres;
```

### 5. Ejecutar migraciones

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. (Opcional) Cargar datos de prueba

Si existe un archivo de datos de prueba:

```bash
psql -U postgres -d ra_manager -f db/inserts.sql
```

### 7. Ejecutar el servidor

```bash
python manage.py runserver
```

El servidor estará disponible en: `http://localhost:8000`

## 🔐 Seguridad - Archivo .env

### ⚠️ MUY IMPORTANTE

- **NUNCA** subas el archivo `.env` a GitHub
- El archivo `.env` ya está en `.gitignore` para protegerlo
- Cada desarrollador debe crear su propio `.env` con sus credenciales locales
- El archivo `.env.example` es el que se comparte en el repositorio (sin datos sensibles)

### ¿Por qué?

El archivo `.env` contiene:
- Contraseñas de base de datos
- Claves secretas de Django
- Credenciales de email
- Información sensible específica de cada entorno

## 📧 Configuración de Email para OTP

### Modo Desarrollo (Recomendado)

Los emails se imprimen en la **consola del servidor** en lugar de enviarse:

```dotenv
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Cuando solicites recuperación de contraseña, verás el código OTP en la terminal donde corre el servidor.

### Modo Producción (Gmail)

Para enviar emails reales:

1. **Crear contraseña de aplicación en Gmail:**
   - Ve a https://myaccount.google.com/security
   - Activa "Verificación en dos pasos"
   - Busca "Contraseñas de aplicaciones"
   - Genera una nueva contraseña para "Correo"
   - Copia la contraseña de 16 caracteres

2. **Configurar en .env:**
   ```dotenv
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=tu_correo@gmail.com
   EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop
   DEFAULT_FROM_EMAIL=tu_correo@gmail.com
   ```

## 🧪 Probar el Sistema OTP

```bash
# Ejecutar script de prueba
python test_otp_system.py
```

## 🔧 Comandos Útiles

```bash
# Crear un superusuario para Django Admin
python manage.py createsuperuser

# Limpiar códigos OTP expirados
python manage.py clean_expired_otps

# Listar todas las URLs disponibles
python manage.py list_urls

# Ejecutar tests
python manage.py test
```

## 🐛 Solución de Problemas

### Error: "FATAL: password authentication failed"

- Verifica que tu contraseña de PostgreSQL en `.env` sea correcta
- Asegúrate de que PostgreSQL esté corriendo: `pg_ctl status`

### Error: "No module named 'rest_framework'"

```bash
pip install -r requirements.txt
```

### Error: "SECRET_KEY not found"

- Asegúrate de tener el archivo `.env` en la carpeta `backend/`
- Verifica que tenga la variable `SECRET_KEY=...`

### Los emails OTP no se envían

- En desarrollo, verifica que `EMAIL_BACKEND=console.EmailBackend`
- Los códigos OTP aparecerán en la **consola del servidor**, no en el navegador
- Para envío real, configura Gmail según las instrucciones arriba

## 📚 Documentación Adicional

- [Documentación del Sistema OTP](docs/OTP_SYSTEM_COMPLETE.md)
- [Configuración de Email](docs/EMAIL_SETUP.md)
- [API Contract](../frontend/docs/API_CONTRACT.md)

## 🤝 Contribuir

1. Crea tu propio `.env` (no compartas el tuyo)
2. Trabaja en una rama separada
3. Haz commit de tus cambios (el `.env` no se subirá automáticamente)
4. Crea un Pull Request

---

**Nota**: Si encuentras algún problema, revisa que tu archivo `.env` tenga todas las variables necesarias comparando con `.env.example`
