# 🔐 Sistema de Variables de Entorno (.env)

## ⚠️ IMPORTANTE: NO COMPARTAS TU ARCHIVO .env

### ❌ Archivo `.env` (PRIVADO - NO SE SUBE A GITHUB)
```
c:\Users\salom\OneDrive\Escritorio\RA-Manager\backend\.env
```

**Contenido ejemplo:**
```dotenv
SECRET_KEY=mi-clave-secreta-personal-12345
DB_PASSWORD=mi_password_de_postgres
EMAIL_HOST_USER=salome@gmail.com
EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop
```

Este archivo:
- ✅ Contiene TUS credenciales reales
- ✅ Es diferente para cada desarrollador
- ✅ Ya está en `.gitignore` (no se sube a GitHub)
- ❌ NUNCA debe compartirse públicamente
- ❌ NO debe copiarse/pegarse entre compañeros

---

### ✅ Archivo `.env.example` (PÚBLICO - SÍ SE COMPARTE)
```
c:\Users\salom\OneDrive\Escritorio\RA-Manager\backend\.env.example
```

**Contenido ejemplo:**
```dotenv
SECRET_KEY=django-insecure-dev-key-CAMBIA-ESTO
DB_PASSWORD=TU_PASSWORD_DE_POSTGRESQL_AQUI
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=xxxxxxxxxxxxxxxxxxxx
```

Este archivo:
- ✅ Es una plantilla SIN datos reales
- ✅ Sí se sube a GitHub
- ✅ Tus compañeros lo copian y crean su propio `.env`
- ✅ Tiene valores de ejemplo y comentarios

---

## 🚀 Flujo de Trabajo para Nuevos Desarrolladores

### Tu compañero clona el repositorio:
```bash
git clone https://github.com/usuario/RA-Manager.git
cd RA-Manager/backend
```

### Configura su propio entorno:
```bash
# 1. Copia el archivo de ejemplo
copy .env.example .env    # Windows
# o
cp .env.example .env      # Linux/Mac

# 2. Edita .env con SUS propias credenciales
# Ejemplo en Windows:
notepad .env

# Ejemplo en VS Code:
code .env
```

### Cada desarrollador configura:
```dotenv
# backend/.env (archivo de cada persona)

# Contraseña de PostgreSQL de SU computadora
DB_PASSWORD=su_propia_password

# Su email personal (si va a probar envío de correos)
EMAIL_HOST_USER=compañero@gmail.com
EMAIL_HOST_PASSWORD=su_password_de_app

# Etc...
```

---

## 🔍 ¿Cómo sabe Django dónde está el .env?

Django busca el archivo `.env` en estas ubicaciones **en orden**:

1. **Ruta del proyecto** (donde está `settings.py`):
   ```
   backend/.env  ← Aquí está el tuyo
   ```

2. **Ruta base del proyecto** (`BASE_DIR`):
   ```python
   # En settings.py
   BASE_DIR = Path(__file__).resolve().parent.parent
   load_dotenv(BASE_DIR / '.env')
   ```

**Resultado:** Cada desarrollador tiene su `.env` en su propia computadora, en la misma ruta relativa del proyecto.

---

## 📂 Estructura de Archivos

```
RA-Manager/
├── backend/
│   ├── .env                 ← Tu archivo personal (NO en GitHub)
│   ├── .env.example         ← Plantilla pública (SÍ en GitHub)
│   ├── .gitignore           ← Protege .env de subirse
│   ├── settings.py          ← Lee variables del .env
│   └── ...
└── frontend/
    ├── .env                 ← Tu config del frontend
    ├── .env.example         ← Plantilla pública
    └── ...
```

---

## ✅ Verificar que .env NO se suba a GitHub

```bash
# Ver qué archivos están siendo trackeados
git status

# El .env NO debe aparecer en la lista
# Si aparece, significa que NO está en .gitignore
```

### Si accidentalmente subiste el .env:

```bash
# 1. Borrarlo del historial de Git (¡CUIDADO!)
git rm --cached backend/.env

# 2. Asegurarse que esté en .gitignore
echo "backend/.env" >> .gitignore
echo ".env" >> backend/.gitignore

# 3. Commit de los cambios
git add .gitignore
git commit -m "Remove .env from tracking"

# 4. CAMBIAR todas las contraseñas que estaban en ese .env
```

---

## 🎯 Resumen

| Archivo | ¿Se comparte? | ¿Tiene datos reales? | Propósito |
|---------|---------------|----------------------|-----------|
| `.env` | ❌ NO | ✅ SÍ | Tu configuración personal |
| `.env.example` | ✅ SÍ | ❌ NO | Plantilla para otros |
| `.gitignore` | ✅ SÍ | N/A | Protege archivos privados |

---

## 🔐 Buenas Prácticas de Seguridad

1. ✅ **Nunca** hagas commit del archivo `.env`
2. ✅ **Siempre** usa `.env.example` como plantilla
3. ✅ **Revisa** `.gitignore` antes de hacer push
4. ✅ **Cambia** contraseñas si accidentalmente se exponen
5. ✅ **Usa** contraseñas de aplicación (no tu contraseña de Gmail)
6. ✅ **Documenta** nuevas variables en `.env.example`

---

## 🆘 Preguntas Frecuentes

### ¿Cómo comparto mi configuración con un compañero?
**R:** NO compartas tu `.env`. Tu compañero debe:
1. Copiar `.env.example` → `.env`
2. Configurar sus propias credenciales

### ¿Qué pasa si mi compañero usa otra contraseña de PostgreSQL?
**R:** ¡Perfecto! Cada uno debe usar la contraseña de SU propia instalación de PostgreSQL.

### ¿Puedo usar el mismo SECRET_KEY que mi compañero?
**R:** En desarrollo local sí, pero en producción cada deployment debe tener su propia clave única.

### ¿Por qué mi .env está en una ruta de OneDrive?
**R:** Es tu ruta local de Windows. Cada desarrollador tendrá una ruta diferente:
- Tú: `C:\Users\salom\OneDrive\...\backend\.env`
- Compañero 1: `C:\Users\juan\Documents\...\backend\.env`
- Compañero 2: `/home/maria/projects/...\backend\.env`

**Lo importante es que todos tengan el archivo en:**
```
<su-ruta-del-proyecto>/backend/.env
```

### ¿Qué variables son obligatorias?
Revisa `SETUP.md` - las mínimas son:
- `SECRET_KEY`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `EMAIL_BACKEND`

---

**Última actualización**: Noviembre 2025
**Equipo**: RA-Manager
