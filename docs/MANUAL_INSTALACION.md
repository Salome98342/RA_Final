# Manual de Instalación - RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Sistema**: RA-Manager (Results of Learning Manager)

---

## 1. Introducción

Este manual describe el proceso de instalación y configuración de RA-Manager en diferentes entornos:

- **Desarrollo Local**: Para desarrollo y pruebas
- **Producción**: Para despliegue en servidor

---

## 2. Requisitos del Sistema

### 2.1 Software Requerido

| **Componente** | **Versión Mínima** | **Recomendada** |
|----------------|-------------------|-----------------|
| Python | 3.11+ | 3.12 |
| Node.js | 18.x | 20.x LTS |
| PostgreSQL | 12+ | 14+ |
| Git | 2.x | Última |

### 2.2 Hardware Mínimo

**Desarrollo**:
- CPU: 2 cores
- RAM: 4 GB
- Disco: 10 GB

**Producción**:
- CPU: 4 cores
- RAM: 8 GB
- Disco: 50 GB
- Conexión a internet estable

### 2.3 Sistema Operativo

- Windows 10/11
- Linux (Ubuntu 20.04+, CentOS 8+)
- macOS 11+

---

## 3. Instalación en Desarrollo

### 3.1 Clonar el Repositorio

```bash
git clone https://github.com/tu-org/RA-Manager.git
cd RA-Manager
```

---

### 3.2 Configuración del Backend (Django)

#### 3.2.1 Crear Entorno Virtual

**Windows (PowerShell)**:
```powershell
python -m venv env
.\env\Scripts\Activate.ps1
```

**Linux/Mac**:
```bash
python3 -m venv env
source env/bin/activate
```

#### 3.2.2 Instalar Dependencias

```bash
pip install -r backend/requirements.txt
```

**Dependencias principales**:
- Django 5.2.6
- djangorestframework 3.14+
- psycopg2 2.9+ (PostgreSQL adapter)
- django-cors-headers 4.0+
- PyJWT 2.8+

#### 3.2.3 Configurar Base de Datos

**Opción A: PostgreSQL (Recomendada para producción)**

1. Instala PostgreSQL:
   - Windows: Descarga de https://www.postgresql.org/download/windows/
   - Linux: `sudo apt install postgresql postgresql-contrib`
   - Mac: `brew install postgresql`

2. Crea la base de datos:

```sql
-- En psql o pgAdmin
CREATE DATABASE ra_manager;
CREATE USER ra_user WITH PASSWORD 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON DATABASE ra_manager TO ra_user;
```

3. Configura `backend/backend/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ra_manager',
        'USER': 'ra_user',
        'PASSWORD': 'tu_contraseña_segura',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

**Opción B: SQLite (Solo desarrollo)**

SQLite ya está configurado por defecto:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db' / 'db.sqlite3',
    }
}
```

#### 3.2.4 Configurar Variables de Entorno

Crea archivo `backend/.env`:

```env
# Django
SECRET_KEY='tu_clave_secreta_django'
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de Datos PostgreSQL
DB_NAME=ra_manager
DB_USER=ra_user
DB_PASSWORD=tu_contraseña_segura
DB_HOST=localhost
DB_PORT=5432

# Email SMTP (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password_gmail

# JWT
JWT_SECRET_KEY='otra_clave_secreta_para_jwt'
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

**IMPORTANTE**: Nunca versiones el archivo `.env` (debe estar en `.gitignore`).

#### 3.2.5 Configurar Email (Gmail SMTP)

Para recuperación de contraseña con OTP:

1. **Habilita autenticación de 2 factores** en tu cuenta Gmail
2. **Genera App Password**:
   - Ve a https://myaccount.google.com/apppasswords
   - Selecciona "Mail" y "Other (Custom name)"
   - Copia la contraseña de 16 caracteres
3. **Actualiza `.env`**:
   ```env
   EMAIL_HOST_USER=tu_email@gmail.com
   EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop  # App Password (sin espacios)
   ```

**Referencia**: `backend/GMAIL_SETUP.md`

#### 3.2.6 Aplicar Migraciones

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

#### 3.2.7 Crear Superusuario

```bash
python manage.py createsuperuser
```

Ingresa:
- Username (código): `ADMIN001`
- Email: `admin@ra-manager.edu`
- Password: (tu contraseña segura)

#### 3.2.8 Poblar Base de Datos (Opcional)

Para datos de prueba:

```bash
python manage.py seed_data
```

O carga el dump SQL:

```bash
psql -U ra_user -d ra_manager < db/ra_manager.psql
```

#### 3.2.9 Ejecutar Servidor de Desarrollo

```bash
python manage.py runserver
```

Backend corriendo en: `http://127.0.0.1:8000`

**Verificación**:
- Admin: `http://127.0.0.1:8000/admin/`
- API: `http://127.0.0.1:8000/api/`

---

### 3.3 Configuración del Frontend (React + Vite)

#### 3.3.1 Instalar Dependencias

```bash
cd frontend
npm install
```

**Dependencias principales**:
- React 18.3.1
- TypeScript 5.6+
- Vite 6.0
- React Router 7.1
- Axios 1.6+
- Bootstrap 5.3

#### 3.3.2 Configurar Variables de Entorno

Crea archivo `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

#### 3.3.3 Configurar Proxy (opcional)

En `frontend/vite.config.ts`, el proxy ya está configurado:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

#### 3.3.4 Ejecutar Servidor de Desarrollo

```bash
npm run dev
```

Frontend corriendo en: `http://localhost:5173`

**Verificación**:
- Abre `http://localhost:5173`
- Deberías ver la página de login

---

### 3.4 Verificación del Sistema Completo

1. **Backend funcionando**: `http://localhost:8000/admin/`
2. **Frontend funcionando**: `http://localhost:5173`
3. **Conexión frontend-backend**: Intenta hacer login
4. **Email SMTP**: Prueba recuperación de contraseña

**Script de Verificación**:

```bash
cd backend
python check_env.py
```

Verifica:
- ✅ Variables de entorno configuradas
- ✅ Base de datos conectada
- ✅ Email SMTP configurado

---

## 4. Instalación en Producción

### 4.1 Preparación del Servidor

#### 4.1.1 Actualizar Sistema

**Ubuntu/Debian**:
```bash
sudo apt update && sudo apt upgrade -y
```

**CentOS/RHEL**:
```bash
sudo yum update -y
```

#### 4.1.2 Instalar Software Base

```bash
# Python 3.11+
sudo apt install python3 python3-pip python3-venv

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Node.js (usando NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx (servidor web)
sudo apt install nginx

# Git
sudo apt install git
```

---

### 4.2 Configuración de PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE ra_manager;
CREATE USER ra_user WITH PASSWORD 'CONTRASEÑA_SEGURA_AQUI';
GRANT ALL PRIVILEGES ON DATABASE ra_manager TO ra_user;
\q
```

**Configurar acceso remoto** (opcional):

Edita `/etc/postgresql/14/main/pg_hba.conf`:

```
# Permitir conexiones locales
host    ra_manager      ra_user         127.0.0.1/32            md5
```

Reinicia PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

### 4.3 Despliegue del Backend

#### 4.3.1 Clonar y Configurar

```bash
# Crear directorio de aplicación
sudo mkdir -p /var/www/ra-manager
sudo chown $USER:$USER /var/www/ra-manager
cd /var/www/ra-manager

# Clonar repositorio
git clone https://github.com/tu-org/RA-Manager.git .

# Crear entorno virtual
python3 -m venv env
source env/bin/activate

# Instalar dependencias
pip install -r backend/requirements.txt
pip install gunicorn  # WSGI server para producción
```

#### 4.3.2 Configurar Variables de Entorno

Crea `backend/.env`:

```env
SECRET_KEY='GENERA_UNA_CLAVE_SEGURA_DE_50_CARACTERES'
DEBUG=False
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com,IP_DEL_SERVIDOR

DB_NAME=ra_manager
DB_USER=ra_user
DB_PASSWORD='CONTRASEÑA_SEGURA_AQUI'
DB_HOST=localhost
DB_PORT=5432

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password

JWT_SECRET_KEY='OTRA_CLAVE_SEGURA_DIFERENTE'
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

**Generar SECRET_KEY**:

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 4.3.3 Configurar Django para Producción

Edita `backend/backend/settings.py`:

```python
# Leer variables de entorno
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

# Seguridad
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Archivos estáticos
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

#### 4.3.4 Aplicar Migraciones y Recopilar Estáticos

```bash
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

#### 4.3.5 Configurar Gunicorn

Crea `backend/gunicorn_config.py`:

```python
bind = '127.0.0.1:8000'
workers = 4  # (2 x CPU cores) + 1
worker_class = 'sync'
timeout = 120
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'
loglevel = 'info'
```

Crea directorios de logs:

```bash
sudo mkdir -p /var/log/gunicorn
sudo chown $USER:$USER /var/log/gunicorn
```

#### 4.3.6 Crear Servicio Systemd para Gunicorn

Crea `/etc/systemd/system/ra-manager.service`:

```ini
[Unit]
Description=RA-Manager Gunicorn daemon
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/ra-manager/backend
Environment="PATH=/var/www/ra-manager/env/bin"
ExecStart=/var/www/ra-manager/env/bin/gunicorn backend.wsgi:application -c gunicorn_config.py
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Activar y arrancar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ra-manager
sudo systemctl start ra-manager
sudo systemctl status ra-manager
```

---

### 4.4 Despliegue del Frontend

#### 4.4.1 Build de Producción

```bash
cd frontend
npm install
npm run build
```

Esto genera la carpeta `frontend/dist/` con los archivos estáticos.

#### 4.4.2 Mover Build a Directorio de Nginx

```bash
sudo mkdir -p /var/www/ra-manager/frontend-build
sudo cp -r frontend/dist/* /var/www/ra-manager/frontend-build/
sudo chown -R www-data:www-data /var/www/ra-manager/frontend-build
```

---

### 4.5 Configuración de Nginx

#### 4.5.1 Crear Configuración de Sitio

Crea `/etc/nginx/sites-available/ra-manager`:

```nginx
# Upstream para Gunicorn
upstream ra_manager_backend {
    server 127.0.0.1:8000;
}

# Redirección HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    return 301 https://$host$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/ra-manager-access.log;
    error_log /var/log/nginx/ra-manager-error.log;

    # Archivos estáticos del frontend
    location / {
        root /var/www/ra-manager/frontend-build;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API del backend
    location /api/ {
        proxy_pass http://ra_manager_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin de Django
    location /admin/ {
        proxy_pass http://ra_manager_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos estáticos de Django
    location /static/ {
        alias /var/www/ra-manager/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Archivos media (avatares, recursos)
    location /media/ {
        alias /var/www/ra-manager/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Límites de tamaño
    client_max_body_size 10M;
}
```

#### 4.5.2 Activar Sitio

```bash
sudo ln -s /etc/nginx/sites-available/ra-manager /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl restart nginx
```

---

### 4.6 Configurar Certificado SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Renovación automática (ya está configurado por defecto)
sudo certbot renew --dry-run
```

---

### 4.7 Configurar Firewall

```bash
# Permitir tráfico HTTP/HTTPS y SSH
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

## 5. Mantenimiento y Actualización

### 5.1 Actualizar Código

```bash
cd /var/www/ra-manager
git pull origin main

# Backend
source env/bin/activate
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py collectstatic --noinput
sudo systemctl restart ra-manager

# Frontend
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/ra-manager/frontend-build/
sudo systemctl reload nginx
```

### 5.2 Backup de Base de Datos

**Backup manual**:

```bash
sudo -u postgres pg_dump ra_manager > backup_$(date +%Y%m%d).sql
```

**Backup automático** (cron):

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2 AM)
0 2 * * * sudo -u postgres pg_dump ra_manager > /var/backups/ra-manager/backup_$(date +\%Y\%m\%d).sql
```

### 5.3 Restaurar Backup

```bash
sudo -u postgres psql ra_manager < backup_20251201.sql
```

### 5.4 Logs del Sistema

**Logs de Gunicorn**:
```bash
tail -f /var/log/gunicorn/error.log
tail -f /var/log/gunicorn/access.log
```

**Logs de Nginx**:
```bash
tail -f /var/log/nginx/ra-manager-error.log
tail -f /var/log/nginx/ra-manager-access.log
```

**Logs de Django**:
```bash
tail -f /var/www/ra-manager/backend/logs/django.log
```

---

## 6. Troubleshooting

### 6.1 Backend no arranca

```bash
# Ver status del servicio
sudo systemctl status ra-manager

# Ver logs
sudo journalctl -u ra-manager -f
```

**Posibles causas**:
- Error en `settings.py`
- Base de datos no conectada
- Permisos incorrectos

### 6.2 Nginx devuelve 502 Bad Gateway

**Causa**: Gunicorn no está corriendo o no responde.

**Solución**:
```bash
sudo systemctl restart ra-manager
sudo systemctl status ra-manager
```

### 6.3 Email SMTP no funciona

**Verificar configuración**:

```bash
cd /var/www/ra-manager/backend
source ../env/bin/activate
python test_otp_system.py
```

**Posibles causas**:
- App Password de Gmail incorrecto
- Firewall bloqueando puerto 587
- Email no configurado en `.env`

### 6.4 Archivos media no se sirven

**Verificar permisos**:

```bash
sudo chown -R www-data:www-data /var/www/ra-manager/backend/media/
sudo chmod -R 755 /var/www/ra-manager/backend/media/
```

**Verificar configuración Nginx**:
- `location /media/` debe apuntar a `alias /var/www/ra-manager/backend/media/;`

---

## 7. Seguridad

### 7.1 Checklist de Seguridad

- ✅ `DEBUG=False` en producción
- ✅ `SECRET_KEY` único y seguro (50+ caracteres)
- ✅ HTTPS habilitado (certificado SSL)
- ✅ Firewall configurado (solo puertos 80, 443, 22)
- ✅ Contraseñas de BD seguras
- ✅ Backup automático configurado
- ✅ `ALLOWED_HOSTS` restringido a dominios válidos
- ✅ CSRF y XSS protecciones habilitadas

### 7.2 Actualizar Dependencias

```bash
# Backend
pip list --outdated
pip install -U <paquete>

# Frontend
npm outdated
npm update
```

---

## 8. Contacto y Soporte

Para soporte técnico de instalación:

- **Email**: devops@ra-manager.edu
- **Documentación**: `docs/`
- **Issues**: https://github.com/tu-org/RA-Manager/issues

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del manual**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager
