# 📚 Guía Rápida para Nuevos Desarrolladores

## 👋 ¡Bienvenido al equipo de RA-Manager!

Esta guía te ayudará a configurar el proyecto en tu computadora en **menos de 10 minutos**.

---

## ⚡ Pasos Rápidos (TL;DR)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Salome98342/RA_Final.git
cd RA_Final

# 2. Backend - Configurar Python
cd backend
python -m venv env
.\env\Scripts\Activate.ps1  # Windows
source env/bin/activate      # Linux/Mac
pip install -r requirements.txt

# 3. Backend - Configurar variables de entorno
copy .env.example .env       # Windows
cp .env.example .env         # Linux/Mac
# EDITA .env con tus credenciales

# 4. Backend - Verificar configuración
python check_env.py

# 5. Backend - Base de datos
createdb -U postgres ra_manager
python manage.py migrate
python manage.py runserver

# 6. Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

✅ **Listo**: Abre http://localhost:5173

---

## 🔐 LO MÁS IMPORTANTE: El Archivo .env

### ❓ ¿Qué es el archivo .env?

Es un archivo de configuración que contiene **información privada** como:
- Contraseñas de bases de datos
- Claves secretas
- Credenciales de email

### ⚠️ REGLA DE ORO

```
❌ NUNCA subas tu archivo .env a GitHub
✅ SIEMPRE crea tu propio .env desde .env.example
```

### 🎯 ¿Cómo funciona?

```
1. El repositorio tiene:      .env.example  (plantilla pública)
                               .env          (en .gitignore - no se sube)

2. Tú copias:                  .env.example → .env

3. Editas .env con TUS datos:  DB_PASSWORD=mi_password_personal

4. Git ignora tu .env:         ✓ Tu información está segura
```

---

## 📋 Checklist de Configuración

### Backend

- [ ] Python 3.11+ instalado
- [ ] PostgreSQL 12+ instalado y corriendo
- [ ] Entorno virtual creado y activado
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Archivo `.env` creado desde `.env.example`
- [ ] Variables de entorno configuradas (especialmente `DB_PASSWORD`)
- [ ] Base de datos `ra_manager` creada
- [ ] Migraciones ejecutadas (`python manage.py migrate`)
- [ ] Servidor corriendo en http://localhost:8000

**Verificación automática:**
```bash
cd backend
python check_env.py
```

### Frontend

- [ ] Node.js 18+ instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Servidor corriendo en http://localhost:5173

---

## 🐛 Problemas Comunes

### ❌ "ModuleNotFoundError: No module named 'rest_framework'"

**Solución:**
```bash
cd backend
pip install -r requirements.txt
```

### ❌ "FATAL: password authentication failed for user 'postgres'"

**Causa:** Tu contraseña de PostgreSQL en `.env` es incorrecta.

**Solución:**
1. Abre `backend/.env`
2. Cambia `DB_PASSWORD=TU_PASSWORD_AQUI` por tu contraseña real de PostgreSQL
3. Guarda el archivo

### ❌ "database 'ra_manager' does not exist"

**Solución:**
```bash
createdb -U postgres ra_manager
# O desde psql:
psql -U postgres
CREATE DATABASE ra_manager;
\q
```

### ❌ "No module named 'dotenv'"

**Solución:**
```bash
pip install python-dotenv
```

### ❌ "Error: Cannot find module 'vite'" (Frontend)

**Solución:**
```bash
cd frontend
npm install
```

### ❌ Los códigos OTP no se envían por email

**Esto es normal en desarrollo**. En modo desarrollo, los códigos OTP se **imprimen en la consola del servidor** (donde corre `python manage.py runserver`), no se envían por email.

**Para habilitar envío real:**
1. Abre `backend/.env`
2. Configura tu email de Gmail según [EMAIL_SETUP.md](backend/docs/EMAIL_SETUP.md)

---

## 📚 Documentación Adicional

| Documento | Descripción |
|-----------|-------------|
| **[SETUP.md](backend/SETUP.md)** | Guía completa de instalación |
| **[ENV_GUIDE.md](backend/ENV_GUIDE.md)** | Explicación detallada del .env |
| **[EMAIL_SETUP.md](backend/docs/EMAIL_SETUP.md)** | Configurar envío de emails |
| **[API_CONTRACT.md](frontend/docs/API_CONTRACT.md)** | Documentación de la API |
| **[OTP_SYSTEM_COMPLETE.md](backend/docs/OTP_SYSTEM_COMPLETE.md)** | Sistema de recuperación de contraseña |

---

## 🔑 Credenciales de Prueba

Si ejecutaste `psql -U postgres -d ra_manager -f db/inserts.sql`:

### Coordinador
- Usuario: `admin`
- Contraseña: `admin123`

### Docente de Prueba
- Usuario: `DOC001`
- Contraseña: `password123`

### Estudiante de Prueba
- Usuario: `EST001`
- Contraseña: `password123`

---

## 💡 Consejos Pro

### Mantener tu .env actualizado

Cuando un compañero agregue nuevas variables al `.env.example`, debes:

1. Revisar los cambios:
   ```bash
   git pull origin main
   ```

2. Comparar tu `.env` con el nuevo `.env.example`

3. Agregar las nuevas variables a tu `.env` personal

### Generar una SECRET_KEY única

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copia el resultado y úsalo en tu `.env`:
```dotenv
SECRET_KEY=django-insecure-xyz123abc456...
```

### Limpiar códigos OTP expirados

```bash
cd backend
python manage.py clean_expired_otps
```

---

## 🤝 Trabajando en Equipo

### ✅ Qué SÍ hacer

- ✅ Crear tu propio `.env` desde `.env.example`
- ✅ Actualizar `.env.example` cuando agregues nuevas variables
- ✅ Documentar cambios en los archivos de documentación
- ✅ Hacer commit de cambios en código
- ✅ Compartir `.env.example` (sin datos sensibles)

### ❌ Qué NO hacer

- ❌ Compartir tu archivo `.env` personal
- ❌ Hacer commit de `.env` (ya está en `.gitignore`)
- ❌ Poner contraseñas reales en `.env.example`
- ❌ Hardcodear credenciales en el código
- ❌ Usar las contraseñas de prueba en producción

---

## 🆘 ¿Necesitas Ayuda?

1. **Primero, ejecuta:**
   ```bash
   cd backend
   python check_env.py
   ```

2. **Lee la documentación relevante:**
   - Problemas de instalación → [SETUP.md](backend/SETUP.md)
   - Problemas con .env → [ENV_GUIDE.md](backend/ENV_GUIDE.md)
   - Problemas con email → [EMAIL_SETUP.md](backend/docs/EMAIL_SETUP.md)

3. **Verifica errores comunes:**
   - PostgreSQL está corriendo: `pg_ctl status`
   - Puerto 8000 libre: `netstat -an | findstr 8000`
   - Python correcto: `python --version` (debe ser 3.11+)

4. **Si nada funciona:**
   - Contacta al equipo
   - Comparte el output de `python check_env.py`

---

## ✨ Próximos Pasos

Una vez que tengas todo funcionando:

1. 📖 Lee la documentación del proyecto
2. 🔍 Explora el código fuente
3. 🧪 Ejecuta los tests: `python manage.py test`
4. 💻 ¡Empieza a contribuir!

---

**¡Éxito con el proyecto! 🚀**

_Última actualización: Noviembre 2025_
