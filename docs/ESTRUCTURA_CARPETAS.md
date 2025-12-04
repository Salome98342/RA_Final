# Estructura de Carpetas - RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025

---

## 1. Estructura General del Proyecto

```
RA-Manager/
├── backend/                    # Backend Django
├── frontend/                   # Frontend React + TypeScript
├── docs/                       # Documentación del proyecto
├── env/                        # Entorno virtual Python
├── README.md                   # Documentación principal
├── CHANGELOG.md                # Historial de cambios
├── CONTRIBUTING.md             # Guía de contribución
├── DEVELOPMENT.md              # Guía de desarrollo
└── SECURITY.md                 # Políticas de seguridad
```

---

## 2. Backend (Django REST Framework)

### 2.1 Estructura Principal

```
backend/
├── manage.py                   # CLI de Django
├── requirements.txt            # Dependencias Python
├── check_env.py                # Script de verificación de entorno
├── setup_real_email.py         # Configuración de email SMTP
├── test_otp_system.py          # Tests del sistema OTP
├── ENV_GUIDE.md                # Guía de variables de entorno
├── GMAIL_SETUP.md              # Configuración de Gmail SMTP
├── SETUP.md                    # Guía de setup inicial
├── api/                        # App principal de Django
├── backend/                    # Configuración del proyecto
├── db/                         # Base de datos y scripts SQL
├── docs/                       # Documentación técnica backend
├── logs/                       # Logs de la aplicación
└── media/                      # Archivos subidos (avatares, recursos)
```

### 2.2 Directorio `backend/api/`

```
api/
├── __init__.py
├── admin.py                    # Configuración del admin de Django
├── apps.py                     # Configuración de la app
├── tests.py                    # Tests unitarios
├── models/                     # Modelos de base de datos
│   ├── __init__.py
│   ├── user.py                 # User, Estudiante, Docente, Coordinador
│   ├── programa.py             # Programa
│   ├── asignatura.py           # Asignatura
│   ├── ra.py                   # Ra, Indicador
│   ├── actividad.py            # Actividad, TipoActividad, RaActividad
│   ├── notas.py                # NotasActividad
│   ├── matricula.py            # Matricula
│   ├── recurso.py              # Recurso
│   ├── notificacion.py         # Notificacion
│   └── otp.py                  # OTPRecovery, ImportAudit
├── serializers/                # Serializadores DRF
│   ├── __init__.py
│   ├── user_serializer.py
│   ├── asignatura_serializer.py
│   ├── actividad_serializer.py
│   ├── notas_serializer.py
│   ├── import_serializer.py
│   └── ...
├── views/                      # Views y ViewSets DRF
│   ├── __init__.py
│   ├── auth_views.py           # Login, recuperación OTP
│   ├── estudiante_views.py     # Endpoints de estudiante
│   ├── docente_views.py        # Endpoints de docente
│   ├── coordinador_views.py    # Endpoints de coordinador
│   ├── actividad_views.py      # CRUD de actividades
│   ├── notas_views.py          # Calificaciones
│   ├── import_views.py         # Importaciones CSV
│   ├── notificacion_views.py   # Notificaciones
│   └── ...
├── urls/                       # Rutas de la API
│   ├── __init__.py
│   ├── auth_urls.py            # /api/auth/
│   ├── estudiante_urls.py      # /api/estudiante/
│   ├── docente_urls.py         # /api/docente/
│   ├── coordinador_urls.py     # /api/coordinador/
│   └── ...
├── middleware/                 # Middlewares personalizados
│   ├── __init__.py
│   └── error_handler.py        # Manejo global de errores
├── migrations/                 # Migraciones de Django
│   ├── __init__.py
│   ├── 0001_initial.py
│   ├── 0002_actividad_docente_estudiante.py
│   └── ...
└── management/                 # Comandos personalizados
    └── commands/
        └── seed_data.py        # Comando para poblar BD
```

### 2.3 Directorio `backend/backend/`

```
backend/
├── __init__.py
├── settings.py                 # Configuración de Django
├── urls.py                     # Rutas principales
├── wsgi.py                     # Punto de entrada WSGI
└── asgi.py                     # Punto de entrada ASGI
```

### 2.4 Directorio `backend/db/`

```
db/
├── db.sqlite3                  # Base de datos SQLite (desarrollo)
├── ra_manager.psql             # Dump de PostgreSQL
├── inserts.sql                 # Datos de prueba
├── insert_test.sql             # Datos de test adicionales
└── README.md                   # Documentación de BD
```

### 2.5 Directorio `backend/docs/`

```
docs/
├── EMAIL_SETUP.md              # Configuración de email SMTP
├── OTP_IMPLEMENTATION_SUMMARY.md  # Resumen implementación OTP
├── OTP_SYSTEM_COMPLETE.md      # Sistema OTP completo
└── OTP_SYSTEM.md               # Documentación del sistema OTP
```

### 2.6 Directorio `backend/media/`

```
media/
├── avatars/                    # Avatares de usuarios
│   ├── EST001_avatar.jpg
│   ├── DOC001_avatar.png
│   └── ...
└── recursos/                   # Recursos educativos
    ├── PROG101/                # Por código de asignatura
    │   ├── 20251201_slides.pdf
    │   ├── 20251205_taller.docx
    │   └── ...
    └── BD201/
        └── ...
```

---

## 3. Frontend (React + TypeScript + Vite)

### 3.1 Estructura Principal

```
frontend/
├── index.html                  # HTML principal
├── package.json                # Dependencias Node.js
├── vite.config.ts              # Configuración de Vite
├── vitest.config.ts            # Configuración de tests
├── vitest.setup.ts             # Setup de tests
├── tsconfig.json               # Configuración TypeScript
├── tsconfig.app.json           # Config TS para app
├── tsconfig.node.json          # Config TS para Node
├── eslint.config.js            # Configuración ESLint
├── README.md                   # Documentación frontend
├── rutas.txt                   # Listado de rutas
├── docs/                       # Documentación técnica
├── public/                     # Archivos públicos estáticos
└── src/                        # Código fuente React
```

### 3.2 Directorio `frontend/src/`

```
src/
├── main.tsx                    # Punto de entrada de React
├── App.tsx                     # Componente principal
├── App.css                     # Estilos del App
├── index.css                   # Estilos globales
├── types.ts                    # Tipos TypeScript globales
├── vite-env.d.ts               # Definiciones de tipos Vite
├── assets/                     # Assets estáticos (imágenes, logos)
│   └── logo.png
├── components/                 # Componentes reutilizables
│   ├── Navbar.tsx              # Barra de navegación
│   ├── Sidebar.tsx             # Menú lateral
│   ├── Footer.tsx              # Pie de página
│   ├── AlertMessage.tsx        # Sistema de alertas
│   ├── LoadingSpinner.tsx      # Spinner de carga
│   ├── ConfirmDialog.tsx       # Diálogo de confirmación
│   ├── NotificationDropdown.tsx # Dropdown de notificaciones
│   ├── ProfileAvatar.tsx       # Avatar de usuario
│   ├── DataTable.tsx           # Tabla de datos genérica
│   ├── FormInput.tsx           # Input de formulario
│   ├── ChartBar.tsx            # Gráfico de barras
│   └── ...
├── pages/                      # Páginas/Vistas de la aplicación
│   ├── Login.tsx               # Página de login
│   ├── RecuperarContrasena.tsx # Recuperación de contraseña
│   ├── estudiante/             # Páginas de estudiante
│   │   ├── DashboardEstudiante.tsx
│   │   ├── MisCursos.tsx
│   │   ├── ActividadesAgrupadas.tsx
│   │   ├── Calificaciones.tsx
│   │   ├── Recursos.tsx
│   │   └── Perfil.tsx
│   ├── docente/                # Páginas de docente
│   │   ├── DashboardDocente.tsx
│   │   ├── MisCursos.tsx
│   │   ├── CrearActividad.tsx
│   │   ├── CrearActividadMultiRA.tsx
│   │   ├── Calificar.tsx
│   │   ├── ProgresoEstudiantes.tsx
│   │   ├── Recursos.tsx
│   │   └── Perfil.tsx
│   └── coordinador/            # Páginas de coordinador
│       ├── DashboardCoordinador.tsx
│       ├── Asignaturas.tsx
│       ├── DetalleAsignatura.tsx
│       ├── EstadisticasAsignatura.tsx
│       ├── ImportarMatriculados.tsx
│       ├── ImportarDocentes.tsx
│       ├── ImportarAsignaturas.tsx
│       ├── HistorialImportaciones.tsx
│       └── Perfil.tsx
├── services/                   # Servicios de API (Axios)
│   ├── api.ts                  # Cliente Axios configurado
│   ├── authService.ts          # Autenticación (login, OTP)
│   ├── estudianteService.ts    # Endpoints de estudiante
│   ├── docenteService.ts       # Endpoints de docente
│   ├── coordinadorService.ts   # Endpoints de coordinador
│   ├── notificacionService.ts  # Notificaciones
│   └── ...
├── state/                      # Gestión de estado (Context API)
│   ├── AuthContext.tsx         # Contexto de autenticación
│   ├── NotificationContext.tsx # Contexto de notificaciones
│   └── AlertContext.tsx        # Contexto de alertas
├── hooks/                      # Custom Hooks
│   ├── useAuth.ts              # Hook de autenticación
│   ├── useNotifications.ts     # Hook de notificaciones
│   ├── useAlert.ts             # Hook de alertas
│   └── useFetch.ts             # Hook genérico de fetch
├── utils/                      # Utilidades y helpers
│   ├── formatDate.ts           # Formateo de fechas
│   ├── validateForm.ts         # Validación de formularios
│   ├── calculateGrades.ts      # Cálculos de notas
│   └── constants.ts            # Constantes globales
├── styles/                     # Estilos CSS modulares
│   ├── variables.css           # Variables CSS
│   ├── dashboard.css           # Estilos de dashboard
│   └── forms.css               # Estilos de formularios
├── connections/                # Configuración de conexiones
│   └── axiosConfig.ts          # Configuración de Axios
├── __tests__/                  # Tests unitarios y de integración
│   ├── components/
│   │   ├── Navbar.test.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── Login.test.tsx
│   │   └── ...
│   └── services/
│       ├── authService.test.ts
│       └── ...
└── mocks/                      # Mocks para tests
    ├── handlers.ts             # Handlers de MSW
    └── server.ts               # Server de MSW
```

### 3.3 Directorio `frontend/docs/`

```
docs/
├── ALERTS_IMPROVEMENTS_SUMMARY.md  # Mejoras del sistema de alertas
├── ALERTS_SYSTEM.md                # Sistema de alertas
├── API_CONTRACT.md                 # Contrato de API (endpoints)
├── COORDINADOR_IMPORTS.md          # Importaciones del coordinador
├── PASSWORD_RECOVERY_INTEGRATION.md # Integración de recuperación
└── SESSION_ISOLATION.md            # Aislamiento de sesiones
```

---

## 4. Documentación del Proyecto (`docs/`)

```
docs/
├── REQUERIMIENTOS.md           # Requerimientos funcionales y no funcionales
├── MODELO_RELACIONAL.md        # Modelo relacional de BD
├── CASOS_DE_USO.md             # Casos de uso textuales
├── ESTRUCTURA_CARPETAS.md      # Este documento
├── MANUAL_USUARIO.md           # Manual para estudiantes y docentes
├── MANUAL_ADMINISTRADOR.md     # Manual para coordinadores
├── MANUAL_INSTALACION.md       # Guía de instalación y despliegue
├── ACTIVIDADES_AGRUPADAS.md    # Documentación de actividades multi-RA
├── VALIDACION_NOTAS_MULTI_RA.md # Validación de notas multi-RA
└── diagramas/                  # Diagramas PlantUML
    ├── README.md               # Guía de uso de diagramas
    ├── INDICE.md               # Índice de diagramas
    ├── RESUMEN_COMPLETO.md     # Resumen completo del sistema
    ├── casos_de_uso/
    │   ├── casos_uso_estudiante.puml
    │   ├── casos_uso_docente.puml
    │   └── casos_uso_coordinador.puml
    ├── secuencia/
    │   ├── secuencia_login_recuperacion.puml
    │   ├── secuencia_estudiante_actividades.puml
    │   ├── secuencia_estudiante_calificaciones.puml
    │   ├── secuencia_docente_crear_actividad.puml
    │   ├── secuencia_docente_calificar.puml
    │   ├── secuencia_docente_progreso.puml
    │   ├── secuencia_docente_recursos.puml
    │   ├── secuencia_coordinador_detalle_asignatura.puml
    │   ├── secuencia_coordinador_importacion.puml
    │   ├── secuencia_coordinador_avance.puml
    │   ├── secuencia_notificaciones.puml
    │   └── secuencia_perfil.puml
    ├── flujo/
    │   ├── flujo_calificacion.puml
    │   ├── flujo_importacion.puml
    │   └── flujo_crear_actividad_multi_ra.puml
    ├── clases/
    │   └── diagrama_clases.puml
    ├── paquetes/
    │   └── diagrama_paquetes.puml
    ├── entidad_relacion/
    │   └── diagrama_er.puml
    ├── componentes/
    │   └── diagrama_componentes.puml
    └── despliegue/
        └── diagrama_despliegue.puml
```

---

## 5. Entorno Virtual (`env/`)

```
env/
├── Include/                    # Headers de Python
├── Lib/                        # Librerías Python instaladas
│   └── site-packages/
│       ├── django/
│       ├── djangorestframework/
│       ├── psycopg2/
│       └── ...
├── Scripts/                    # Scripts de activación (Windows)
│   ├── activate.bat
│   ├── activate.ps1
│   ├── deactivate.bat
│   └── python.exe
└── pyvenv.cfg                  # Configuración del entorno
```

---

## 6. Convenciones de Nomenclatura

### 6.1 Backend (Python/Django)

- **Archivos**: `snake_case.py` (ej: `user_serializer.py`)
- **Clases**: `PascalCase` (ej: `UserSerializer`)
- **Funciones/métodos**: `snake_case` (ej: `get_user_profile`)
- **Constantes**: `UPPER_SNAKE_CASE` (ej: `MAX_FILE_SIZE`)
- **Modelos**: `PascalCase` (ej: `Estudiante`, `Actividad`)
- **URLs**: `kebab-case` (ej: `/api/mis-cursos/`)

### 6.2 Frontend (TypeScript/React)

- **Archivos**: `PascalCase.tsx` para componentes (ej: `Navbar.tsx`)
- **Archivos**: `camelCase.ts` para servicios (ej: `authService.ts`)
- **Componentes**: `PascalCase` (ej: `<DashboardEstudiante />`)
- **Funciones**: `camelCase` (ej: `fetchUserData`)
- **Constantes**: `UPPER_SNAKE_CASE` (ej: `API_BASE_URL`)
- **Types/Interfaces**: `PascalCase` (ej: `interface User`)

---

## 7. Archivos de Configuración

### 7.1 Backend

- **requirements.txt**: Dependencias Python
- **manage.py**: CLI de Django
- **settings.py**: Configuración de Django (base de datos, SMTP, CORS, etc.)
- **.env**: Variables de entorno (no versionado)

### 7.2 Frontend

- **package.json**: Dependencias Node.js y scripts npm
- **vite.config.ts**: Configuración de Vite (proxy, build, etc.)
- **tsconfig.json**: Configuración de TypeScript
- **eslint.config.js**: Reglas de linting

### 7.3 Proyecto

- **.gitignore**: Archivos ignorados por Git
- **README.md**: Documentación principal
- **CHANGELOG.md**: Historial de versiones
- **CONTRIBUTING.md**: Guía de contribución

---

## 8. Rutas de Archivos Clave

### 8.1 Modelos Principales

- Usuario: `backend/api/models/user.py`
- Actividad Multi-RA: `backend/api/models/actividad.py`
- Notas: `backend/api/models/notas.py`
- OTP: `backend/api/models/otp.py`

### 8.2 Vistas Principales

- Login/OTP: `backend/api/views/auth_views.py`
- Actividades Multi-RA: `backend/api/views/actividad_views.py`
- Importaciones: `backend/api/views/import_views.py`
- Notificaciones: `backend/api/views/notificacion_views.py`

### 8.3 Páginas Frontend

- Login: `frontend/src/pages/Login.tsx`
- Actividades Agrupadas: `frontend/src/pages/estudiante/ActividadesAgrupadas.tsx`
- Crear Actividad Multi-RA: `frontend/src/pages/docente/CrearActividadMultiRA.tsx`
- Dashboard Coordinador: `frontend/src/pages/coordinador/DashboardCoordinador.tsx`

---

## 9. Comandos Útiles

### 9.1 Backend

```bash
# Activar entorno virtual
.\env\Scripts\Activate.ps1

# Instalar dependencias
pip install -r backend/requirements.txt

# Migraciones
python backend/manage.py makemigrations
python backend/manage.py migrate

# Crear superusuario
python backend/manage.py createsuperuser

# Correr servidor
python backend/manage.py runserver
```

### 9.2 Frontend

```bash
# Instalar dependencias
cd frontend
npm install

# Modo desarrollo
npm run dev

# Build de producción
npm run build

# Tests
npm run test

# Linting
npm run lint
```

---

## 10. Referencias

- **Documentación de Django**: https://docs.djangoproject.com/
- **Documentación de React**: https://react.dev/
- **Documentación de TypeScript**: https://www.typescriptlang.org/
- **Documentación de Vite**: https://vitejs.dev/

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del documento**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager
