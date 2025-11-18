# RA-Manager 📚

Sistema de gestión de Resultados de Aprendizaje (RAs) para instituciones educativas. Permite a coordinadores, docentes y estudiantes gestionar asignaturas, actividades, calificaciones y seguimiento de RAs.

---

## 🚀 Características Principales

### 👥 Por Rol

#### **Coordinador**
- Dashboard con vista global de asignaturas
- Gestión de docentes y estudiantes
- Importación masiva desde CSV/Excel
- Visualización de avance por RA
- Acceso a vista de docente (modo observador)

#### **Docente**
- Gestión de cursos y actividades
- Calificación de estudiantes por indicador de logro
- Exportación de notas a CSV/PDF
- Subida de recursos educativos
- Gráficas de desempeño por RA

#### **Estudiante**
- Vista de cursos actuales y anteriores
- Seguimiento de actividades y notas
- Acceso a recursos educativos
- Visualización de avance por RA

---

## 🛠️ Tecnologías

### Backend
- **Django 5.2.6** - Framework web Python
- **Django REST Framework 3.16.1** - API REST
- **PostgreSQL** - Base de datos
- **python-dotenv** - Gestión de variables de entorno

### Frontend
- **React 18** - Librería UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **React Router 6** - Enrutamiento

---

## 📋 Requisitos Previos

- **Python 3.11+**
- **Node.js 18+** y npm
- **PostgreSQL 12+**
- Git

---

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Salome98342/RA_Final.git
cd RA_Final
```

### 2. Configurar Backend

```bash
# Crear entorno virtual
python -m venv env

# Activar entorno virtual
# Windows:
.\env\Scripts\Activate.ps1
# Linux/Mac:
source env/bin/activate

# Instalar dependencias
cd backend
pip install -r requirements.txt

# Copiar archivo de configuración
cp .env.example backend/.env

# Editar backend/.env con tus credenciales
# SECRET_KEY, DB_PASSWORD, etc.

# Generar SECRET_KEY segura
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Crear base de datos PostgreSQL
createdb -U postgres ra_manager

# Ejecutar migraciones
python manage.py migrate

# (Opcional) Cargar datos de prueba
psql -U postgres -d ra_manager -f db/inserts.sql

# Iniciar servidor
python manage.py runserver
```

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar configuración (si existe .env.example)
# cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

### 4. Acceder a la aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/

---

## 👤 Credenciales de Prueba

Si cargaste los datos de prueba (`inserts.sql`):

### Coordinador
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Docentes
- **Usuario**: `codigo_docente` (ej: `DOC001`)
- **Contraseña**: `password123`

### Estudiantes
- **Usuario**: `codigo_estudiante` (ej: `EST001`)
- **Contraseña**: `password123`

⚠️ **IMPORTANTE**: Cambiar estas contraseñas en producción.

---

## 📁 Estructura del Proyecto

```
RA-Manager/
├── backend/                 # Django backend
│   ├── api/                # App principal
│   │   ├── models/        # Modelos de datos
│   │   ├── serializers/   # Serializers DRF
│   │   ├── views/         # Vistas y lógica
│   │   ├── urls/          # Rutas API
│   │   └── migrations/    # Migraciones BD
│   ├── backend/           # Configuración Django
│   │   ├── settings.py   # Configuración (usa .env)
│   │   └── urls.py       # Rutas principales
│   ├── db/               # Scripts SQL
│   ├── media/            # Archivos subidos
│   ├── .env              # Variables de entorno (NO en Git)
│   └── requirements.txt  # Dependencias Python
│
├── frontend/              # React frontend
│   ├── src/
│   │   ├── pages/        # Vistas principales
│   │   ├── components/   # Componentes reutilizables
│   │   ├── services/     # Lógica API y auth
│   │   ├── connections/  # Cliente HTTP
│   │   ├── state/        # Context API
│   │   └── styles/       # Estilos globales
│   ├── public/           # Assets estáticos
│   └── package.json      # Dependencias npm
│
├── env/                   # Entorno virtual Python
├── .gitignore            # Archivos ignorados por Git
├── SECURITY.md           # Guía de seguridad
├── DEVELOPMENT.md        # Guía de desarrollo
└── OPTIMIZATIONS.md      # Optimizaciones recomendadas
```

---

## 📚 Documentación Adicional

- **[SECURITY.md](./SECURITY.md)** - Configuración de seguridad y variables de entorno
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Guía completa de desarrollo, convenciones y testing
- **[OPTIMIZATIONS.md](./OPTIMIZATIONS.md)** - Optimizaciones de rendimiento recomendadas
- **[backend/db/README.md](./backend/db/README.md)** - Documentación de scripts SQL

---

## 🔒 Seguridad

Este proyecto usa variables de entorno para credenciales sensibles. **NUNCA** commitear el archivo `.env` a Git.

Ver [SECURITY.md](./SECURITY.md) para configuración detallada.

---

## 🧪 Testing

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
cd frontend
npm run test
```

Ver [DEVELOPMENT.md](./DEVELOPMENT.md) para guías detalladas de testing.

---

## 🚀 Deployment

### Checklist de Producción

Backend:
- [ ] `DEBUG=False` en `.env`
- [ ] `SECRET_KEY` único y seguro
- [ ] `ALLOWED_HOSTS` configurado
- [ ] `CORS_ORIGINS` restringido
- [ ] `EMAIL_BACKEND` configurado para SMTP
- [ ] PostgreSQL con credenciales seguras
- [ ] Servidor: Gunicorn + Nginx

Frontend:
- [ ] Build de producción: `npm run build`
- [ ] `VITE_API_URL` apuntando a backend real
- [ ] Servir con Nginx/Caddy

**Más detalles**: Ver sección "Deployment" en [DEVELOPMENT.md](./DEVELOPMENT.md)

---

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## 📝 Convenciones de Código

### Backend (Python)
- PEP 8 style guide
- Docstrings en funciones públicas
- Type hints recomendados

### Frontend (TypeScript)
- ESLint + Prettier
- Componentes funcionales con hooks
- Props tipadas con interfaces

**Ver [DEVELOPMENT.md](./DEVELOPMENT.md)** para convenciones completas.

---

## 🐛 Troubleshooting

### "No module named 'dotenv'"
```bash
pip install python-dotenv
```

### "CORS error" en frontend
Verificar `CORS_ORIGINS` en `backend/.env` incluye `http://localhost:5173`

### Migraciones no se aplican
```bash
python manage.py migrate --fake-initial
```

**Más soluciones**: Ver sección "Troubleshooting" en [DEVELOPMENT.md](./DEVELOPMENT.md)

---

## 📊 Estado del Proyecto

- ✅ **Backend API**: Completo y funcional
- ✅ **Frontend UI**: Completo y funcional
- ✅ **Autenticación**: Implementada con tokens
- ✅ **CRUD Completo**: Todas las entidades principales
- ✅ **Seguridad**: Variables de entorno, .gitignore configurado
- ✅ **Documentación**: Guías completas de uso y desarrollo
- 🔄 **Optimizaciones**: Recomendaciones documentadas (ver OPTIMIZATIONS.md)
- 🔄 **Tests**: Por implementar (guías disponibles en DEVELOPMENT.md)

---

## 📧 Contacto

- **Proyecto**: [RA_Final en GitHub](https://github.com/Salome98342/RA_Final)
- **Rama actual**: `Ajustes_Indicadores_RA`

---

## 📄 Licencia

[Especificar licencia si aplica]

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0  
**Mantenido por**: Equipo RA-Manager
