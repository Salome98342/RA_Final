# RA-Manager 📚

<div align="center">

![Django](https://img.shields.io/badge/Django-5.2.6-092E20?style=for-the-badge&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)

[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Code Style](https://img.shields.io/badge/code%20style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

</div>

---

Sistema integral de gestión de Resultados de Aprendizaje (RAs) para instituciones educativas. Plataforma completa que permite a coordinadores, docentes y estudiantes gestionar asignaturas, actividades, calificaciones y realizar seguimiento detallado de RAs con visualizaciones en tiempo real.

**🌟 Características clave**: Alertas modernas, actividades multi-RA, indicadores de logro, importación CSV, gráficas interactivas, y diseño accesible.

---

## ✨ Características Destacadas

### 🎨 **Interfaz Moderna**
- Diseño responsivo con Bootstrap 5
- Animaciones fluidas y transiciones suaves (60fps)
- Sistema de alertas y notificaciones mejorado
- Modo oscuro y temas personalizables
- Accesibilidad WCAG 2.1 AA compliant

### � **Sistema de Notificaciones**
- Alertas contextuales con 4 tipos (success, error, warning, info)
- Toasts flotantes con auto-cierre configurable
- Mensajes estandarizados en español
- Animaciones naturales con cubic-bezier
- Soporte completo para lectores de pantalla

### 📊 **Análisis y Reportes**
- Gráficas interactivas de desempeño
- Exportación a CSV/PDF
- Seguimiento de progreso por RA
- Indicadores de logro detallados
- Dashboard con métricas en tiempo real

---

## 👥 Funcionalidades por Rol

### **🎓 Coordinador**
- 📈 Dashboard global con métricas de todas las asignaturas
- 👨‍🏫 Gestión completa de docentes y estudiantes
- 📥 Importación masiva desde CSV (docentes, estudiantes, asignaciones)
- 🔍 Visualización detallada de avance por RA y asignatura
- 👁️ Acceso a vista de docente (modo observador read-only)
- 📊 Reportes de rendimiento por período académico
- 🔐 Gestión de permisos y roles

### **👨‍🏫 Docente**
- 📚 Gestión de cursos y actividades multi-RA
- ✍️ Calificación de estudiantes por indicador de logro
- 📋 Creación de actividades con múltiples indicadores
- 📤 Subida y gestión de recursos educativos (PDF, imágenes, videos)
- 📊 Gráficas de desempeño individual y grupal
- 💬 Retroalimentación personalizada por actividad
- 📥 Exportación de notas a CSV
- 🔔 Notificaciones de actividades próximas a vencer

### **🎒 Estudiante**
- 📖 Vista consolidada de cursos actuales y anteriores
- ✅ Seguimiento en tiempo real de actividades y calificaciones
- 📈 Visualización de avance por RA con barras de progreso
- 📚 Acceso a recursos educativos del curso
- 💬 Visualización de retroalimentación del docente
- 🎯 Indicadores de rendimiento personalizados
- 🔔 Alertas de nuevas actividades y recursos

---

## 🛠️ Stack Tecnológico

### **Backend**
- **Django 5.2.6** - Framework web robusto en Python
- **Django REST Framework 3.16.1** - API RESTful con serializers
- **PostgreSQL 12+** - Base de datos relacional
- **psycopg2-binary 2.9.10** - Adaptador PostgreSQL
- **python-dotenv 1.1.1** - Gestión segura de variables de entorno
- **django-cors-headers 4.9.0** - Manejo de CORS para API

### **Frontend**
- **React 18.3** - Librería UI moderna con hooks
- **TypeScript 5.5** - Tipado estático robusto
- **Vite 6.0** - Build tool ultra-rápido y HMR
- **React Router 6.23** - Enrutamiento declarativo SPA
- **Bootstrap 5.3.3** - Framework CSS responsivo
- **Bootstrap Icons 1.11.3** - Iconografía consistente
- **Axios** - Cliente HTTP con interceptores

### **Testing & Quality**
- **Vitest** - Test runner rápido compatible con Vite
- **ESLint** - Linter para calidad de código
- **Prettier** - Formateador automático
- **TypeScript Strict Mode** - Validación de tipos estricta

### **DevOps & Tools**
- **Git** - Control de versiones
- **npm/pip** - Gestores de paquetes
- **Gunicorn** (producción) - Servidor WSGI
- **Nginx** (producción) - Reverse proxy y archivos estáticos

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

# Copiar archivo de configuración (IMPORTANTE: Cada desarrollador necesita su propio .env)
# Windows:
copy .env.example .env
# Linux/Mac:
cp .env.example .env

# Editar .env con TUS credenciales personales
# ⚠️ NO COMPARTAS TU ARCHIVO .env - Es privado y ya está en .gitignore

# Verificar tu configuración
python check_env.py

# Generar SECRET_KEY segura (opcional, pero recomendado)
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

## 🔐 Configuración de Variables de Entorno (.env)

### ⚠️ Información Crítica sobre el archivo .env

El archivo `.env` contiene **información sensible y personal** de cada desarrollador:

- ✅ **Cada desarrollador debe crear su propio `.env`** copiando `.env.example`
- ❌ **NUNCA subas tu `.env` a GitHub** (ya está protegido en `.gitignore`)
- ✅ **El archivo `.env.example` sí se comparte** (es una plantilla sin datos reales)

### 📖 Guías Disponibles

Para información detallada sobre configuración:

1. **[SETUP.md](backend/SETUP.md)** - Guía completa de instalación paso a paso
2. **[ENV_GUIDE.md](backend/ENV_GUIDE.md)** - Explicación detallada del sistema de variables de entorno
3. **[EMAIL_SETUP.md](backend/docs/EMAIL_SETUP.md)** - Configuración del sistema de correo electrónico

### 🚀 Inicio Rápido

```bash
# 1. Ve a la carpeta backend
cd backend

# 2. Copia el archivo de ejemplo
copy .env.example .env    # Windows
# o
cp .env.example .env      # Linux/Mac

# 3. Edita .env con tus credenciales
notepad .env              # Windows
# o
nano .env                 # Linux/Mac

# 4. Verifica que todo esté configurado correctamente
python check_env.py
```

### 📝 Variables Mínimas Requeridas

```dotenv
# Backend/.env (tu archivo personal)

SECRET_KEY=tu-clave-secreta-unica-aqui
DEBUG=True

# Base de datos PostgreSQL (TU configuración local)
DB_NAME=ra_manager
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_DE_POSTGRESQL

# Email (desarrollo: imprime en consola)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### 🔍 ¿Cómo funciona en equipo?

```
Tu computadora:
  C:\Users\salome\...\backend\.env  ← Tu archivo personal

Compañero 1:
  C:\Users\juan\...\backend\.env    ← Su archivo personal

Compañero 2:
  /home/maria/.../backend/.env      ← Su archivo personal
```

**Todos usan la misma ruta relativa (`backend/.env`), pero cada uno tiene sus propias credenciales.**

### ✅ Verificación Automática

Ejecuta el script de verificación para asegurar que tu entorno está correctamente configurado:

```bash
cd backend
python check_env.py
```

Este script verifica:
- ✓ Existencia del archivo `.env`
- ✓ Variables de entorno configuradas
- ✓ Conexión a PostgreSQL
- ✓ Dependencias de Python instaladas
- ✓ Estado de migraciones

---

## 📁 Estructura del Proyecto

```
RA-Manager/
├── backend/                      # 🐍 Django REST API Backend
│   ├── api/                     # App principal de la aplicación
│   │   ├── models/             # 📊 Modelos de datos (ORM)
│   │   │   └── models.py       # Docente, Estudiante, Actividad, RA, etc.
│   │   ├── serializers/        # 🔄 Serializers DRF (JSON ↔ Python)
│   │   │   └── serializers.py  # Transformación de datos
│   │   ├── views/              # 🎯 Lógica de negocio y endpoints
│   │   │   └── views.py        # ViewSets y vistas personalizadas
│   │   ├── urls/               # 🛣️ Definición de rutas API
│   │   │   └── urls.py         # Mapeo URL → View
│   │   ├── migrations/         # 📦 Migraciones de base de datos (23 archivos)
│   │   ├── middleware/         # 🔧 Middleware personalizado
│   │   │   └── error_handler.py # Manejo centralizado de errores
│   │   ├── management/         # ⚙️ Comandos personalizados
│   │   │   └── commands/       # django-admin custom commands
│   │   └── tests.py            # 🧪 Tests unitarios
│   │
│   ├── backend/                # ⚙️ Configuración del proyecto Django
│   │   ├── settings.py         # Configuración (usa variables .env)
│   │   ├── urls.py             # Rutas principales (/api/, /admin/)
│   │   ├── wsgi.py             # Punto de entrada WSGI
│   │   └── .env                # 🔐 Variables de entorno (NO en Git)
│   │
│   ├── db/                     # 💾 Scripts y dumps SQL
│   │   ├── inserts.sql         # Datos de prueba completos
│   │   ├── insert_test.sql     # Tests de integridad SQL
│   │   ├── ra_manager.psql     # Schema completo PostgreSQL
│   │   └── README.md           # Documentación de BD
│   │
│   ├── media/                  # 📁 Archivos subidos por usuarios
│   │   ├── avatars/            # Fotos de perfil (docente/estudiante)
│   │   └── recursos/           # Recursos educativos (PDF, etc.)
│   │
│   ├── logs/                   # 📝 Logs de la aplicación
│   ├── .env.example            # Plantilla de variables de entorno
│   ├── requirements.txt        # 📦 Dependencias Python
│   └── manage.py               # CLI de Django
│
├── frontend/                    # ⚛️ React + TypeScript Frontend
│   ├── src/
│   │   ├── pages/              # 📄 Vistas principales (rutas)
│   │   │   ├── Docente.tsx     # Dashboard docente
│   │   │   ├── Estudiante.tsx  # Dashboard estudiante
│   │   │   ├── Login.tsx       # Autenticación
│   │   │   ├── Profile.tsx     # Perfil de usuario
│   │   │   ├── coordinador/    # Vistas del coordinador
│   │   │   │   ├── Materias.tsx      # Lista de asignaturas
│   │   │   │   ├── Asignatura.tsx    # Detalle de asignatura
│   │   │   │   └── Imports.tsx       # Importación CSV
│   │   │   └── docente/        # Vistas del docente
│   │   │       ├── Cursos.tsx        # Lista de cursos
│   │   │       ├── RAs.tsx           # Gestión de RAs
│   │   │       ├── Calificar.tsx     # Calificación
│   │   │       ├── CrearActividad.tsx # Nueva actividad
│   │   │       └── Recursos.tsx      # Recursos educativos
│   │   │
│   │   ├── components/         # 🧩 Componentes reutilizables
│   │   │   ├── Alert.tsx       # ✨ Sistema de alertas inline
│   │   │   ├── Toast.tsx       # 🔔 Notificaciones flotantes
│   │   │   ├── HeaderBar.tsx   # Barra superior
│   │   │   ├── Sidebar.tsx     # Menú lateral
│   │   │   ├── RaCard.tsx      # Card de RA
│   │   │   ├── GradeSummary.tsx # Resumen de calificaciones
│   │   │   ├── ActivityDetailsModal.tsx # Modal de actividad
│   │   │   ├── ConfirmDialog.tsx # Diálogo de confirmación
│   │   │   ├── Dropdown.tsx    # Selector accesible
│   │   │   ├── SearchPill.tsx  # Búsqueda con icono
│   │   │   ├── Skeleton.tsx    # Cargando placeholder
│   │   │   └── ...
│   │   │
│   │   ├── hooks/              # 🪝 Custom React Hooks
│   │   │   └── useAlert.ts     # ✨ Hook de alertas (nuevo)
│   │   │
│   │   ├── services/           # 🔌 Lógica de API y servicios
│   │   │   ├── api.ts          # Funciones API principales
│   │   │   ├── auth.ts         # Autenticación y logout
│   │   │   └── coordinador.ts  # API específica coordinador
│   │   │
│   │   ├── connections/        # 🌐 Configuración HTTP
│   │   │   ├── http.ts         # Cliente Axios con interceptores
│   │   │   └── endpoints.ts    # Constantes de URLs
│   │   │
│   │   ├── state/              # 📊 Gestión de estado global
│   │   │   └── SessionContext.tsx # Context API (usuario, rol, curso)
│   │   │
│   │   ├── utils/              # 🛠️ Utilidades
│   │   │   ├── alertMessages.ts # ✨ 60+ mensajes estandarizados
│   │   │   └── periods.ts      # Formateo de períodos
│   │   │
│   │   ├── styles/             # 🎨 Estilos globales
│   │   │   ├── animations.css  # ✨ Keyframes y transiciones
│   │   │   └── app.css         # Estilos base
│   │   │
│   │   ├── __tests__/          # 🧪 Tests unitarios
│   │   ├── mocks/              # 🎭 Datos mock para desarrollo
│   │   ├── types.ts            # 📝 TypeScript interfaces globales
│   │   ├── App.tsx             # Componente raíz con router
│   │   └── main.tsx            # Entry point
│   │
│   ├── docs/                   # 📚 Documentación frontend
│   │   ├── ALERTS_SYSTEM.md    # ✨ Guía completa de alertas (436 líneas)
│   │   ├── ALERTS_IMPROVEMENTS_SUMMARY.md # Resumen mejoras (280 líneas)
│   │   ├── API_CONTRACT.md     # Contrato API Backend ↔ Frontend
│   │   └── COORDINADOR_IMPORTS.md # Formato CSV importaciones
│   │
│   ├── public/                 # 📦 Assets estáticos
│   ├── .vscode/                # ⚙️ Configuración VS Code
│   │   ├── settings.json       # Ocultar archivos de config
│   │   └── tasks.json          # Tareas automatizadas
│   ├── .env.development        # Variables de desarrollo
│   ├── .env.example            # Plantilla de variables
│   ├── package.json            # 📦 Dependencias npm
│   ├── tsconfig.json           # Configuración TypeScript
│   ├── vite.config.ts          # Configuración Vite
│   ├── vitest.config.ts        # Configuración Vitest
│   ├── vitest.setup.ts         # Setup tests
│   ├── eslint.config.js        # Reglas ESLint
│   └── .prettierrc             # Reglas Prettier
│
├── env/                        # 🐍 Entorno virtual Python (no en Git)
│   ├── Lib/site-packages/      # Paquetes instalados
│   └── Scripts/                # Ejecutables (activate, pip, python)
│
├── docs/                       # 📖 Documentación general del proyecto
│   └── ACTIVIDADES_AGRUPADAS.md # Especificación actividades multi-RA
│
├── .gitignore                  # 🚫 Archivos ignorados por Git
├── README.md                   # 📘 Este archivo
├── SECURITY.md                 # 🔒 Guía de seguridad
├── DEVELOPMENT.md              # 👨‍💻 Guía de desarrollo
└── OPTIMIZATIONS.md            # ⚡ Optimizaciones recomendadas
```

### 📊 Métricas del Proyecto

- **Backend**: ~5,000 líneas de código Python
- **Frontend**: ~12,000 líneas de código TypeScript/React
- **Migraciones**: 23 archivos (historial completo de BD)
- **Componentes React**: 30+ componentes reutilizables
- **Endpoints API**: 40+ endpoints RESTful
- **Documentación**: 2,000+ líneas en Markdown

---

## 📚 Documentación Adicional

### 📘 Documentación Principal
- **[SECURITY.md](./SECURITY.md)** - Configuración de seguridad, variables de entorno y best practices
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Guía completa de desarrollo, convenciones de código y testing
- **[OPTIMIZATIONS.md](./OPTIMIZATIONS.md)** - Optimizaciones de rendimiento y escalabilidad recomendadas

### 📗 Documentación Backend
- **[backend/db/README.md](./backend/db/README.md)** - Documentación de scripts SQL y estructura de BD

### 📙 Documentación Frontend
- **[frontend/docs/ALERTS_SYSTEM.md](./frontend/docs/ALERTS_SYSTEM.md)** - Sistema completo de alertas y notificaciones
- **[frontend/docs/ALERTS_IMPROVEMENTS_SUMMARY.md](./frontend/docs/ALERTS_IMPROVEMENTS_SUMMARY.md)** - Resumen de mejoras en UX
- **[frontend/docs/API_CONTRACT.md](./frontend/docs/API_CONTRACT.md)** - Contrato de API entre Backend y Frontend
- **[frontend/docs/COORDINADOR_IMPORTS.md](./frontend/docs/COORDINADOR_IMPORTS.md)** - Formato y reglas de importación CSV

### 📕 Especificaciones Técnicas
- **[docs/ACTIVIDADES_AGRUPADAS.md](./docs/ACTIVIDADES_AGRUPADAS.md)** - Implementación de actividades multi-RA

---

## 🔒 Seguridad y Buenas Prácticas

### 🛡️ Variables de Entorno
Este proyecto usa variables de entorno para **todas** las credenciales sensibles:

- ❌ **NUNCA** commitear archivos `.env` a Git
- ✅ Usar `.env.example` como plantilla
- ✅ Generar `SECRET_KEY` única por entorno
- ✅ Usar contraseñas fuertes en producción

### 🔐 Configuración de Seguridad

**Backend (`backend/.env`)**:
```env
SECRET_KEY=tu-secret-key-unica-y-segura-de-50-caracteres
DEBUG=False  # En producción
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com
CORS_ORIGINS=https://tu-dominio.com

DB_NAME=ra_manager
DB_USER=postgres
DB_PASSWORD=contraseña-segura-postgresql
DB_HOST=localhost
DB_PORT=5432

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password
```

**Frontend (`frontend/.env`)**:
```env
VITE_API_URL=https://tu-dominio.com/api
```

### 🔑 Generar SECRET_KEY Segura

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 🚨 Checklist de Seguridad

- [ ] SECRET_KEY única (50+ caracteres)
- [ ] DEBUG=False en producción
- [ ] ALLOWED_HOSTS configurado
- [ ] CORS_ORIGINS restringido a dominios conocidos
- [ ] Credenciales de BD seguras (no usar 'postgres'/'admin')
- [ ] HTTPS habilitado (certificado SSL)
- [ ] Cambiar contraseñas por defecto de usuarios de prueba
- [ ] Backups automáticos de BD configurados
- [ ] Logs de errores monitoreados

**Ver [SECURITY.md](./SECURITY.md)** para guía completa de seguridad.

---

## ⚡ Características Técnicas Destacadas

### 🎨 Sistema de Alertas Moderno (Nuevo)
```typescript
// Uso simple con hook personalizado
import { useAlert } from '@/hooks/useAlert'
import { ALERT_MESSAGES } from '@/utils/alertMessages'

const { alert, showSuccess, showError } = useAlert()

// Mostrar alerta de éxito
showSuccess(ALERT_MESSAGES.activities.created)

// Alerta con duración personalizada
showError('Error al guardar', 5000)

// 60+ mensajes estandarizados
// Animaciones fluidas con cubic-bezier
// Accesibilidad WCAG 2.1 AA compliant
```

### 🔐 Autenticación Segura
- Tokens de sesión con expiración
- Middleware de error handling centralizado
- Validación de permisos por rol
- Regeneración automática de SECRET_KEY

### 📊 Actividades Multi-RA
```typescript
// Una actividad puede pertenecer a múltiples RAs
interface GroupedActivity {
  id_actividad: string
  nombre_actividad: string
  ras_asociados: Array<{
    id_ra: string
    nombre_ra: string
    porcentaje: number
    nota: number | null
  }>
}
```

### 🎯 Indicadores de Logro
- Múltiples indicadores por actividad
- Validación automática de porcentajes (suma = 100%)
- Triggers PostgreSQL para integridad
- Retroalimentación individualizada

### 🚀 Optimizaciones de Rendimiento
- Lazy loading de componentes React
- Memoización con `useMemo` y `useCallback`
- Debounce en búsquedas
- Compresión de assets con Vite

### ♿ Accesibilidad
- Navegación por teclado completa
- ARIA labels en todos los componentes interactivos
- Contraste de colores WCAG AA
- Screen reader friendly
- Focus management adecuado

### 📱 Diseño Responsivo
- Mobile-first approach
- Breakpoints Bootstrap 5
- Menú lateral colapsable
- Cards adaptables
- Modales centrados

---

## 🧪 Testing

### Backend (Django)
```bash
cd backend

# Ejecutar todos los tests
python manage.py test

# Test específico de una app
python manage.py test api

# Test con cobertura
coverage run --source='.' manage.py test
coverage report

# Tests SQL de integridad
psql -U postgres -d ra_manager -f db/insert_test.sql
```

### Frontend (Vitest)
```bash
cd frontend

# Ejecutar todos los tests
npm run test

# Tests en modo watch
npm run test:watch

# Tests con UI
npm run test:ui

# Cobertura de código
npm run test:coverage
```

### Tests Manuales
1. **Flujo de autenticación**: Login → Dashboard → Logout
2. **CRUD de actividades**: Crear → Editar → Calificar → Eliminar
3. **Importación CSV**: Subir archivo → Validar → Ver resultados
4. **Responsividad**: Probar en móvil, tablet, desktop
5. **Accesibilidad**: Navegar solo con teclado (Tab, Enter, Escape)

Ver [DEVELOPMENT.md](./DEVELOPMENT.md) para guías detalladas de testing y casos de prueba.

---

## 🚀 Deployment a Producción

### 📋 Checklist Pre-Deployment

#### Backend (Django)
- [ ] `DEBUG=False` en `.env`
- [ ] `SECRET_KEY` único y seguro (50+ caracteres)
- [ ] `ALLOWED_HOSTS` configurado con dominios reales
- [ ] `CORS_ORIGINS` restringido a frontend real
- [ ] `EMAIL_BACKEND` configurado para SMTP
- [ ] PostgreSQL con usuario dedicado (no 'postgres')
- [ ] Credenciales de BD seguras y únicas
- [ ] Backups automáticos configurados
- [ ] SSL/TLS habilitado (SECURE_SSL_REDIRECT=True)
- [ ] Logs de errores configurados
- [ ] Servidor: Gunicorn + Nginx
- [ ] Archivos media servidos correctamente
- [ ] Migraciones aplicadas: `python manage.py migrate`
- [ ] Archivos estáticos recolectados: `python manage.py collectstatic`

#### Frontend (React)
- [ ] Build de producción: `npm run build`
- [ ] `VITE_API_URL` apuntando a backend real (HTTPS)
- [ ] Variables de entorno configuradas
- [ ] Assets optimizados y comprimidos
- [ ] Servir con Nginx/Caddy/Apache
- [ ] Certificado SSL instalado (Let's Encrypt)
- [ ] Caché de navegador configurado
- [ ] GZIP/Brotli habilitado
- [ ] CDN configurado (opcional)

#### Base de Datos
- [ ] PostgreSQL actualizado (12+)
- [ ] Índices creados en tablas grandes
- [ ] Backups automáticos diarios
- [ ] Replicación configurada (opcional)
- [ ] Monitoreo de rendimiento
- [ ] Tune de parámetros PostgreSQL

#### Seguridad
- [ ] Cambiar contraseñas por defecto
- [ ] Firewall configurado (solo puertos 80, 443)
- [ ] Rate limiting habilitado
- [ ] HTTPS forzado (HTTP → HTTPS redirect)
- [ ] Headers de seguridad (HSTS, CSP, X-Frame-Options)
- [ ] Dependencias actualizadas (sin CVEs)

---

### 🐳 Deployment con Docker (Recomendado)

#### 1. Crear Dockerfile para Backend
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Recolectar estáticos
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

#### 2. Crear Dockerfile para Frontend
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ra_manager
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: always

  backend:
    build: ./backend
    command: gunicorn backend.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - ./backend:/app
      - media_data:/app/media
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - DB_HOST=db
      - DB_NAME=ra_manager
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      - db
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: always

volumes:
  postgres_data:
  media_data:
```

---

### 🖥️ Deployment Manual (VPS/Dedicated Server)

#### 1. Preparar Servidor (Ubuntu 22.04)
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y python3.11 python3-pip python3-venv \
    postgresql postgresql-contrib nginx git

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 2. Configurar PostgreSQL
```bash
# Crear usuario y base de datos
sudo -u postgres psql

CREATE DATABASE ra_manager;
CREATE USER ra_user WITH PASSWORD 'contraseña_segura';
GRANT ALL PRIVILEGES ON DATABASE ra_manager TO ra_user;
\q
```

#### 3. Clonar y Configurar Backend
```bash
# Clonar repositorio
cd /var/www
sudo git clone https://github.com/Salome98342/RA_Final.git
cd RA_Final

# Crear entorno virtual
python3 -m venv env
source env/bin/activate

# Instalar dependencias
pip install -r backend/requirements.txt
pip install gunicorn

# Configurar variables de entorno
cp backend/.env.example backend/.env
nano backend/.env  # Editar con credenciales reales

# Aplicar migraciones
cd backend
python manage.py migrate
python manage.py collectstatic
```

#### 4. Configurar Gunicorn
```bash
# Crear archivo de servicio systemd
sudo nano /etc/systemd/system/ra-manager.service
```

```ini
[Unit]
Description=RA Manager Gunicorn
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/RA_Final/backend
Environment="PATH=/var/www/RA_Final/env/bin"
ExecStart=/var/www/RA_Final/env/bin/gunicorn \
    --workers 3 \
    --bind unix:/var/www/RA_Final/backend/gunicorn.sock \
    backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
# Iniciar servicio
sudo systemctl start ra-manager
sudo systemctl enable ra-manager
```

#### 5. Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/ra-manager
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Frontend (React build)
    location / {
        root /var/www/RA_Final/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://unix:/var/www/RA_Final/backend/gunicorn.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Media files
    location /media/ {
        alias /var/www/RA_Final/backend/media/;
    }

    # Static files
    location /static/ {
        alias /var/www/RA_Final/backend/staticfiles/;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/ra-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Configurar SSL con Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

#### 7. Build Frontend
```bash
cd /var/www/RA_Final/frontend
npm install
npm run build
```

---

### 📊 Monitoreo y Mantenimiento

#### Logs
```bash
# Logs de Gunicorn
sudo journalctl -u ra-manager -f

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### Backups Automáticos
```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-ra-manager.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ra-manager"

# Backup de BD
pg_dump -U ra_user ra_manager | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup de media
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /var/www/RA_Final/backend/media/

# Limpiar backups antiguos (>30 días)
find $BACKUP_DIR -type f -mtime +30 -delete
```

```bash
# Agendar con cron (diario a las 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-ra-manager.sh
```

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

## 🐛 Troubleshooting y Soluciones Comunes

### 🔧 Problemas de Instalación

#### "No module named 'dotenv'"
```bash
# Asegurarse de tener el entorno virtual activado
pip install python-dotenv
```

#### "psycopg2 installation error"
```bash
# Windows: Instalar Visual C++ Build Tools
# O usar la versión binaria
pip install psycopg2-binary
```

#### "npm ERR! code ENOENT"
```bash
# Limpiar caché de npm e instalar de nuevo
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 🌐 Problemas de CORS

#### "CORS error" en frontend
**Causa**: Backend no permite el origen del frontend

**Solución**: Verificar `CORS_ORIGINS` en `backend/.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

También verificar `CORS_ALLOW_CREDENTIALS=True` en `settings.py`

### 💾 Problemas de Base de Datos

#### Migraciones no se aplican
```bash
# Ver estado de migraciones
python manage.py showmigrations

# Aplicar migraciones con fake si es necesario
python manage.py migrate --fake-initial

# Si hay conflictos, hacer merge
python manage.py makemigrations --merge
```

#### "relation does not exist"
```bash
# Eliminar todas las migraciones y recrear
# ⚠️ CUIDADO: Esto borra datos
python manage.py migrate api zero
python manage.py migrate
```

#### Error de permisos PostgreSQL
```bash
# Dar permisos completos al usuario
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE ra_manager TO tu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tu_usuario;
```

### 🔐 Problemas de Autenticación

#### "Invalid token" o "Unauthorized"
**Causas comunes**:
- Token expirado
- SECRET_KEY cambió en backend
- Cookies no se están enviando

**Soluciones**:
```bash
# 1. Limpiar cookies del navegador (F12 → Application → Cookies)
# 2. Verificar withCredentials en http.ts:
# withCredentials: true

# 3. Verificar CORS_ALLOW_CREDENTIALS en backend
```

#### No se puede iniciar sesión
```bash
# Verificar que el usuario existe en BD
python manage.py shell
>>> from api.models.models import Docente, Estudiante
>>> Docente.objects.all()

# Crear superusuario coordinador si es necesario
psql -U postgres -d ra_manager
INSERT INTO coordinador (nombre, correo, password) 
VALUES ('Admin', 'admin@example.com', 'pbkdf2_sha256$...');
```

### ⚡ Problemas de Rendimiento

#### Frontend muy lento
```bash
# 1. Verificar que estás en modo desarrollo
npm run dev

# 2. Limpiar caché de Vite
rm -rf node_modules/.vite

# 3. Verificar que no hay memoria leak en DevTools
```

#### Backend lento en consultas
```sql
-- Verificar índices en PostgreSQL
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Analizar query lento
EXPLAIN ANALYZE SELECT * FROM api_actividad WHERE ...;
```

### 📦 Problemas de Build

#### "Cannot find module" en TypeScript
```bash
# Limpiar y reinstalar
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

#### Errores de tipado en producción
```bash
# Verificar tsconfig.json tiene strict: true
# Ejecutar type-check antes de build
npx tsc --noEmit
```

### 🖼️ Problemas con Archivos Media

#### Avatares/recursos no se muestran
**Verificar**:
1. Carpeta `media/` existe y tiene permisos de escritura
2. `MEDIA_URL` y `MEDIA_ROOT` en `settings.py`
3. URL incluye `/media/...` correctamente
4. En desarrollo, Django sirve archivos media:
```python
# backend/urls.py
from django.conf.urls.static import static
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 🔄 Problemas de Estado/Cache

#### Cambios no se reflejan
```bash
# Frontend: Hard reload
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)

# Backend: Reiniciar servidor
Ctrl + C
python manage.py runserver

# Base de datos: Limpiar caché de Django
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
```

### 📱 Más Soluciones

Para problemas más específicos, consultar:
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Troubleshooting detallado de desarrollo
- **[SECURITY.md](./SECURITY.md)** - Problemas de configuración de seguridad
- **[GitHub Issues](https://github.com/Salome98342/RA_Final/issues)** - Reportar bugs nuevos

### 💬 Obtener Ayuda

1. Revisar logs del backend: `backend/logs/`
2. Consola del navegador (F12) para errores frontend
3. Revisar documentación de [Django](https://docs.djangoproject.com/) y [React](https://react.dev/)
4. Crear un issue en GitHub con:
   - Descripción del problema
   - Pasos para reproducir
   - Logs relevantes
   - Sistema operativo y versiones

---

## 📊 Estado del Proyecto y Roadmap

### ✅ Implementado y Funcional

#### **Backend (Django REST API)**
- ✅ API RESTful completa con 40+ endpoints
- ✅ Autenticación con tokens seguros
- ✅ Middleware de manejo de errores centralizado
- ✅ Modelos relacionales con 23 migraciones aplicadas
- ✅ Serializers DRF con validación robusta
- ✅ CRUD completo para todas las entidades:
  - Docentes, Estudiantes, Coordinadores
  - Asignaturas, RAs, Indicadores
  - Actividades, Calificaciones
  - Recursos educativos
  - Importaciones CSV
- ✅ Triggers PostgreSQL para validación de porcentajes
- ✅ Tests SQL de integridad de datos
- ✅ Configuración segura con variables de entorno

#### **Frontend (React + TypeScript)**
- ✅ Interfaz responsiva con Bootstrap 5
- ✅ 30+ componentes reutilizables y tipados
- ✅ Sistema de rutas con React Router 6
- ✅ Context API para gestión de sesión global
- ✅ **Sistema de alertas moderno** (commit reciente):
  - 🎨 4 tipos de alertas con animaciones fluidas
  - 📝 60+ mensajes estandarizados en español
  - ♿ Accesibilidad WCAG 2.1 AA
  - 🚀 Rendimiento 60fps con cubic-bezier
- ✅ Hooks personalizados (useAlert)
- ✅ Cliente HTTP con interceptores Axios
- ✅ TypeScript strict mode habilitado
- ✅ ESLint + Prettier configurados

#### **Funcionalidades por Rol**
- ✅ **Coordinador**:
  - Dashboard con métricas globales
  - Importación CSV masiva (docentes, estudiantes, asignaciones)
  - Visualización de avance por asignatura y RA
  - Modo observador read-only
- ✅ **Docente**:
  - Gestión de actividades multi-RA
  - Calificación por indicadores de logro
  - Subida de recursos educativos
  - Retroalimentación personalizada
  - Gráficas de desempeño
- ✅ **Estudiante**:
  - Vista consolidada de actividades
  - Seguimiento de calificaciones y avance
  - Acceso a recursos del curso
  - Visualización de retroalimentación

#### **Seguridad y Calidad**
- ✅ Variables de entorno para credenciales
- ✅ .gitignore configurado (no expone .env)
- ✅ Regeneración de SECRET_KEY segura
- ✅ CORS configurado correctamente
- ✅ Validación de entrada en todos los formularios
- ✅ Middleware de error handling
- ✅ Logs estructurados

#### **Documentación**
- ✅ README completo con ejemplos
- ✅ Guías de seguridad (SECURITY.md)
- ✅ Guías de desarrollo (DEVELOPMENT.md)
- ✅ Documentación de API (API_CONTRACT.md)
- ✅ Guías de importación CSV
- ✅ Documentación de sistema de alertas (436 líneas)
- ✅ Comentarios inline en código crítico

### 🔄 En Progreso / Próximas Mejoras

#### **Testing**
- ⏳ Tests unitarios Frontend (Vitest configurado)
- ⏳ Tests de integración Backend (Django TestCase)
- ⏳ Tests E2E con Playwright
- ⏳ Cobertura de código >80%

#### **Optimizaciones**
- ⏳ Paginación en listados grandes
- ⏳ Caché de queries frecuentes (Redis)
- ⏳ Lazy loading de componentes
- ⏳ Compresión de respuestas API (gzip)
- ⏳ CDN para assets estáticos

#### **Nuevas Funcionalidades**
- 🔮 Notificaciones push en tiempo real (WebSockets)
- 🔮 Exportación de reportes en PDF mejorado
- 🔮 Modo oscuro completo
- 🔮 Multi-idioma (i18n)
- 🔮 Dashboard de analíticas avanzadas
- 🔮 Integración con calendario académico
- 🔮 Chat en tiempo real docente-estudiante

#### **DevOps**
- 🔮 CI/CD con GitHub Actions
- 🔮 Docker Compose para desarrollo
- 🔮 Kubernetes manifests para producción
- 🔮 Monitoreo con Prometheus + Grafana

### � Métricas Actuales

| Métrica | Valor |
|---------|-------|
| **Líneas de código** | ~17,000 |
| **Componentes React** | 30+ |
| **Endpoints API** | 40+ |
| **Migraciones BD** | 23 |
| **Tests** | 3 (frontend) |
| **Documentación (MD)** | 2,000+ líneas |
| **Cobertura de código** | Por implementar |

### 🏆 Logros Recientes

- ✨ **Nov 2024**: Sistema de alertas modernizado (40% menos código, animaciones 60fps)
- 🔒 **Nov 2024**: Seguridad reforzada (SECRET_KEY regenerada, variables de entorno)
- 🎨 **Nov 2024**: Rediseño completo del módulo Docente (estética consistente)
- 📝 **Nov 2024**: Documentación exhaustiva del sistema
- 🐛 **Oct 2024**: Corrección de migraciones Django (dependencias)

---

## 📧 Contacto

- **Proyecto**: [RA_Final en GitHub](https://github.com/Salome98342/RA_Final)
- **Rama actual**: `Ajustes_Indicadores_RA`

---

## 🎯 Próximos Pasos Recomendados

### Para Nuevos Desarrolladores
1. ✅ Leer completamente este README
2. ✅ Revisar [DEVELOPMENT.md](./DEVELOPMENT.md) para convenciones
3. ✅ Instalar el proyecto siguiendo la sección de instalación
4. ✅ Explorar la estructura de carpetas
5. ✅ Revisar el código de ejemplo en `frontend/docs/ALERTS_SYSTEM.md`
6. ✅ Ejecutar tests existentes: `npm run test` (frontend)
7. ✅ Hacer cambios pequeños y probar localmente
8. ✅ Crear PR con descripción detallada

### Para Deployment en Producción
1. ✅ Seguir checklist de seguridad (ver arriba)
2. ✅ Configurar servidor con Gunicorn + Nginx
3. ✅ Configurar PostgreSQL con backups automáticos
4. ✅ Habilitar HTTPS con Let's Encrypt
5. ✅ Configurar variables de entorno de producción
6. ✅ Ejecutar `npm run build` para frontend
7. ✅ Configurar monitoreo de logs y errores
8. ✅ Hacer testing exhaustivo antes de lanzar

### Para Contribuir
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/NuevaCaracteristica`
3. Seguir convenciones de código (ESLint/Prettier)
4. Escribir tests para nuevas funcionalidades
5. Commit con mensajes descriptivos: `feat: Agregar exportación PDF`
6. Push: `git push origin feature/NuevaCaracteristica`
7. Crear Pull Request con descripción detallada

---

## 📞 Soporte y Contacto

### 🔗 Enlaces del Proyecto
- **Repositorio**: [github.com/Salome98342/RA_Final](https://github.com/Salome98342/RA_Final)
- **Branch principal**: `main`
- **Branch de desarrollo**: `Ajustes_Indicadores_RA`
- **Issues**: [github.com/Salome98342/RA_Final/issues](https://github.com/Salome98342/RA_Final/issues)

### 🐛 Reportar Bugs
Por favor, incluir en el issue:
- Descripción clara del problema
- Pasos para reproducir
- Comportamiento esperado vs actual
- Screenshots si aplica
- Sistema operativo y versiones (Python, Node, navegador)
- Logs relevantes

### 💡 Solicitar Features
- Describir el caso de uso
- Explicar el beneficio para los usuarios
- Sugerir una posible implementación
- Marcar como "enhancement" en labels

### 📧 Contacto
- **Proyecto mantenido por**: JimmySoft
- **Última actualización**: Noviembre 17, 2024
- **Versión**: 1.0.0

---

## 🏆 Créditos y Reconocimientos

### 🙏 Tecnologías y Librerías
- [Django](https://www.djangoproject.com/) - Framework web robusto
- [React](https://react.dev/) - Librería UI moderna
- [TypeScript](https://www.typescriptlang.org/) - Tipado estático
- [Bootstrap](https://getbootstrap.com/) - Framework CSS
- [PostgreSQL](https://www.postgresql.org/) - Base de datos relacional
- [Vite](https://vitejs.dev/) - Build tool ultra-rápido

### 📝 Commits Destacados
- `5422848` - Sistema de alertas moderno con animaciones fluidas
- `44bb35e` - Refactorización de seguridad y SECRET_KEY
- `0d5257a` - Corrección de accesibilidad ARIA
- `ac43196` - Documentación completa del sistema

### 🌟 Colaboradores
Ver la lista completa de [contribuidores en GitHub](https://github.com/Salome98342/RA_Final/graphs/contributors)

---

**⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub ⭐**

[![GitHub stars](https://img.shields.io/github/stars/Salome98342/RA_Final?style=social)](https://github.com/Salome98342/RA_Final)
[![GitHub forks](https://img.shields.io/github/forks/Salome98342/RA_Final?style=social)](https://github.com/Salome98342/RA_Final/fork)

**Hecho con ❤️ por el equipo JimmySoft**

*Sistema de gestión de Resultados de Aprendizaje para la educación del futuro*

</div>
