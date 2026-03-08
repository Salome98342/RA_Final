# 🏗️ ARQUITECTURA DEL SISTEMA RA-MANAGER

**Fecha de elaboración:** 4 de marzo de 2026  
**Proyecto:** RA-Manager (Sistema de Gestión de Resultados de Aprendizaje)  
**Stack tecnológico:** Django 5.2.6 + DRF + React 19 + TypeScript + PostgreSQL  
**Autor:** Documentación generada a partir del análisis del código fuente

---

## 📋 ÍNDICE

1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Roles del Sistema](#2-roles-del-sistema)
3. [Diagramas de Casos de Uso](#3-diagramas-de-casos-de-uso)
4. [Diagrama de Clases](#4-diagrama-de-clases)
5. [Modelo Relacional](#5-modelo-relacional)
6. [Diagrama de Componentes](#6-diagrama-de-componentes)
7. [Diagrama de Despliegue Actual](#7-diagrama-de-despliegue-actual)
8. [Diagrama de Despliegue Ideal](#8-diagrama-de-despliegue-ideal)
9. [Flujo de Autenticación](#9-flujo-de-autenticación)
10. [Flujo de Calificación](#10-flujo-de-calificación)
11. [Arquitectura de Módulos](#11-arquitectura-de-módulos)

---

## 1. DESCRIPCIÓN GENERAL DEL SISTEMA

### 1.1 Propósito del sistema

**RA-Manager** es un sistema de gestión académica enfocado en el seguimiento de **Resultados de Aprendizaje (RAs)** e **Indicadores de Logro** para programas educativos. Permite a docentes:

- Crear y gestionar actividades evaluativas asociadas a RAs
- Calificar estudiantes por indicadores de logro
- Publicar recursos educativos
- Comunicarse mediante anuncios

A estudiantes:
- Consultar sus calificaciones y avance por RA
- Descargar recursos educativos
- Recibir notificaciones de nuevas calificaciones

A coordinadores:
- Gestionar estudiantes, docentes y asignaturas
- Importar datos masivos (matrículas, calificaciones)
- Monitorear avance académico general
- Analizar rendimiento por asignatura

### 1.2 Arquitectura general

El sistema implementa una **arquitectura de tres capas** con separación cliente-servidor:

- **Frontend:** Single Page Application (SPA) desarrollada en **React 19 con TypeScript**
- **Backend:** API RESTful desarrollada con **Django 5.2.6 y Django REST Framework 3.16**
- **Base de datos:** **PostgreSQL** (producción) / SQLite (desarrollo)

**Comunicación:** HTTP/JSON mediante cliente **Axios** con autenticación por tokens Bearer.

### 1.3 Tecnologías utilizadas

#### Backend
```yaml
Framework: Django 5.2.6
API: Django REST Framework 3.16.1
Base de datos:
  - PostgreSQL (producción)
  - psycopg2-binary 2.9.0
Seguridad:
  - django-cors-headers 4.0.0
  - django-ratelimit 4.0.0
  - Hashing: bcrypt/pbkdf2 (Django Auth)
Procesamiento de datos:
  - pandas 2.0.0
  - openpyxl 3.1.0 (Excel)
Documentación:
  - drf-spectacular 0.27.0 (OpenAPI/Swagger)
Configuración:
  - python-dotenv 1.0.0
```

#### Frontend
```yaml
Framework: React 19.1.1
Lenguaje: TypeScript 5.8.3
Bundler: Vite 5.4.10
UI Framework: Bootstrap 5.3.3 + Bootstrap Icons 1.11.3
HTTP Client: Axios 1.12.2
Gráficos: Chart.js 4.5.0
Alertas: SweetAlert2 11.26.20
Routing: react-router-dom 6.26.2
Testing:
  - Vitest 2.1.1
  - Testing Library (React 16.3.0)
```

---

## 2. ROLES DEL SISTEMA

El sistema identifica **tres roles principales** basados en el análisis del código:

### 2.1 Estudiante

**Entidad:** `Estudiante` (modelo en `api/models/models.py`)

**Atributos principales:**
- `codigo_estudiante` (único)
- `nombre`, `apellido`
- `correo` (único)
- `contrasena_estudiante` (hasheada)
- `tipo_documento`, `num_documento`
- `jornada`

**Permisos:**
- Consultar sus propias calificaciones
- Ver resultados de aprendizaje de sus asignaturas
- Descargar recursos educativos
- Recibir notificaciones
- Ver anuncios de sus docentes
- Actualizar su perfil personal

**Restricciones:**
- NO puede crear actividades
- NO puede calificar
- NO puede ver información de otros estudiantes
- NO puede gestionar usuarios

---

### 2.2 Docente

**Entidad:** `Docente` (modelo en `api/models/models.py`)

**Atributos principales:**
- `codigo_docente` (único)
- `nombre`, `apellido`
- `correo` (único)
- `contrasenia_docente` (hasheada)
- `tipo_documento`, `num_documento`
- `num_telefono`

**Permisos:**
- Gestionar actividades de sus asignaturas
- Calificar estudiantes (notas por indicador)
- Publicar recursos educativos
- Crear anuncios para sus estudiantes
- Consultar listado de estudiantes matriculados en sus cursos
- Importar estudiantes individualmente o por CSV
- Consultar analítica de rendimiento de sus asignaturas

**Restricciones:**
- Solo puede acceder a sus propias asignaturas
- NO puede crear asignaturas ni RAs (establecidos por coordinador)
- NO puede modificar estructuras de RAs/indicadores
- NO puede acceder a datos de asignaturas de otros docentes

---

### 2.3 Coordinador

**Entidad:** `Coordinador` (modelo en `api/models/models.py`)

**Atributos principales:**
- `codigo_coordinador` (único)
- `nombre`
- `correo` (único)
- `contrasenia_coord` (hasheada)

**Permisos (administrativos):**
- Gestionar estudiantes (CRUD completo)
- Gestionar docentes (crear, listar)
- Gestionar asignaturas y programas
- Importar datos masivos:
  - Matrículas (CSV/Excel)
  - Docentes (CSV/Excel)
  - Estudiantes (CSV/Excel)
  - Asignaturas con RAs (CSV/Excel)
- Consultar analíticas globales
- Monitorear avance de asignaturas
- Ver perfil completo de estudiantes
- Auditar importaciones

**Restricciones:**
- NO puede calificar directamente (es rol administrativo)
- NO puede crear actividades (responsabilidad de docentes)

---

## 3. DIAGRAMAS DE CASOS DE USO

### 3.1 Casos de uso: Estudiante

```mermaid
graph TD
    Estudiante((Estudiante))
    
    Estudiante -->|Consultar| UC1[Ver mis calificaciones]
    Estudiante -->|Consultar| UC2[Ver detalle de asignatura]
    Estudiante -->|Consultar| UC3[Ver avance por RA]
    Estudiante -->|Consultar| UC4[Ver indicadores de logro]
    Estudiante -->|Descargar| UC5[Descargar recursos educativos]
    Estudiante -->|Leer| UC6[Ver anuncios]
    Estudiante -->|Gestionar| UC7[Ver notificaciones]
    Estudiante -->|Actualizar| UC8[Actualizar perfil]
    Estudiante -->|Cambiar| UC9[Cambiar contraseña]
    Estudiante -->|Recuperar| UC10[Recuperar contraseña]
    
    subgraph "Sistema de Calificaciones"
        UC1
        UC2
        UC3
        UC4
    end
    
    subgraph "Sistema de Recursos"
        UC5
        UC6
    end
    
    subgraph "Sistema de Notificaciones"
        UC7
    end
    
    subgraph "Gestión de Cuenta"
        UC8
        UC9
        UC10
    end
```

---

### 3.2 Casos de uso: Docente

```mermaid
graph TD
    Docente((Docente))
    
    Docente -->|Gestionar| UC1[Crear actividad]
    Docente -->|Gestionar| UC2[Editar actividad]
    Docente -->|Gestionar| UC3[Eliminar actividad]
    Docente -->|Asociar| UC4[Vincular actividad a RAs]
    Docente -->|Calificar| UC5[Ingresar notas por indicador]
    Docente -->|Calificar| UC6[Editar notas existentes]
    Docente -->|Calificar| UC7[Agregar retroalimentación]
    Docente -->|Consultar| UC8[Ver listado de estudiantes]
    Docente -->|Consultar| UC9[Ver analítica de asignatura]
    Docente -->|Gestionar| UC10[Publicar recursos]
    Docente -->|Gestionar| UC11[Crear anuncios]
    Docente -->|Gestionar| UC12[Eliminar anuncios]
    Docente -->|Importar| UC13[Agregar estudiante individual]
    Docente -->|Importar| UC14[Importar estudiantes CSV]
    Docente -->|Actualizar| UC15[Actualizar perfil]
    
    subgraph "Gestión de Actividades"
        UC1
        UC2
        UC3
        UC4
    end
    
    subgraph "Sistema de Calificaciones"
        UC5
        UC6
        UC7
    end
    
    subgraph "Gestión de Estudiantes"
        UC8
        UC13
        UC14
    end
    
    subgraph "Recursos y Comunicación"
        UC10
        UC11
        UC12
    end
    
    subgraph "Analítica"
        UC9
    end
```

---

### 3.3 Casos de uso: Coordinador

```mermaid
graph TD
    Coord((Coordinador))
    
    Coord -->|Gestionar| UC1[Crear estudiante]
    Coord -->|Gestionar| UC2[Editar estudiante]
    Coord -->|Gestionar| UC3[Ver perfil completo estudiante]
    Coord -->|Gestionar| UC4[Listar todos los estudiantes]
    Coord -->|Importar| UC5[Importar estudiantes masivo]
    Coord -->|Importar| UC6[Importar docentes]
    Coord -->|Importar| UC7[Importar matrículas]
    Coord -->|Importar| UC8[Importar asignaturas con RAs]
    Coord -->|Consultar| UC9[Ver todas las asignaturas]
    Coord -->|Consultar| UC10[Ver estudiantes por asignatura]
    Coord -->|Consultar| UC11[Ver RAs por asignatura]
    Coord -->|Consultar| UC12[Ver avance por asignatura]
    Coord -->|Analizar| UC13[Analítica global de asignatura]
    Coord -->|Auditar| UC14[Ver historial de importaciones]
    Coord -->|Gestionar| UC15[Ver periodo académico actual]
    
    subgraph "Gestión de Estudiantes"
        UC1
        UC2
        UC3
        UC4
        UC5
    end
    
    subgraph "Importaciones Masivas"
        UC6
        UC7
        UC8
    end
    
    subgraph "Consultas Administrativas"
        UC9
        UC10
        UC11
        UC12
    end
    
    subgraph "Analítica y Auditoría"
        UC13
        UC14
    end
```

---

## 4. DIAGRAMA DE CLASES

```mermaid
classDiagram
    class TipoDocumento {
        +BigInt id_tipo_documento
        +String descripcion
    }
    
    class Estudiante {
        +BigInt id_estudiante
        +String nombre
        +String apellido
        +String codigo_estudiante
        +String contrasena_estudiante
        +String num_documento
        +String correo
        +String jornada
        +ForeignKey tipo_documento
    }
    
    class Docente {
        +BigInt id_docente
        +String nombre
        +String apellido
        +String codigo_docente
        +String contrasenia_docente
        +String num_documento
        +String correo
        +String num_telefono
        +ForeignKey tipo_documento
    }
    
    class Coordinador {
        +BigInt id_coordinador
        +String nombre
        +String codigo_coordinador
        +String contrasenia_coord
        +String correo
    }
    
    class Programa {
        +BigInt id_programa
        +String nombre
        +String codigo_programa
    }
    
    class PeriodoAcademico {
        +BigInt id_periodo
        +String descripcion
        +Date fecha_inicio
        +Date fecha_finalizacion
    }
    
    class Asignatura {
        +BigInt id_asignatura
        +String nombre
        +String codigo_asignatura
        +String grupo
        +ForeignKey docente
        +ForeignKey programa
    }
    
    class ResultadoDeAprendizaje {
        +BigInt id_ra
        +Decimal porcentaje_ra
        +Text descripcion
        +ForeignKey asignatura
        +validar_porcentaje()
    }
    
    class IndicadoresDeLogro {
        +BigInt id_ind
        +Decimal porcentaje_ind
        +Text descripcion
        +ForeignKey ra
        +validar_porcentaje()
    }
    
    class TipoActividad {
        +BigInt id_tipo_actividad
        +String descripcion
    }
    
    class Actividad {
        +BigInt id_actividad
        +String nombre_actividad
        +Text descripcion
        +Date fecha_creacion
        +Date fecha_cierre
        +ForeignKey tipo_actividad
    }
    
    class RaActividad {
        +BigInt id_ra_actividad
        +Decimal porcentaje_ra_actividad
        +ForeignKey actividad
        +ForeignKey ra
    }
    
    class RaActividadIndicador {
        +BigInt id
        +ForeignKey ra_actividad
        +ForeignKey indicador
    }
    
    class Matricula {
        +BigInt id_matricula
        +Decimal nota_final
        +ForeignKey estudiante
        +ForeignKey periodo
        +ForeignKey asignatura
    }
    
    class NotasActividad {
        +BigInt id
        +Decimal nota_ra_actividad
        +Text retroalimentacion
        +ForeignKey matricula
        +ForeignKey ra_actividad
        +ForeignKey indicador
    }
    
    class Recurso {
        +BigInt id_recurso
        +String titulo
        +File archivo
        +DateTime fecha_subida
        +ForeignKey asignatura
    }
    
    class Anuncio {
        +BigInt id
        +String titulo
        +Text contenido
        +DateTime fecha_publicacion
        +Boolean es_importante
        +ForeignKey asignatura
        +ForeignKey docente
    }
    
    class Notificacion {
        +UUID id
        +String tipo
        +Text texto
        +String enlace
        +Boolean leida
        +DateTime fecha_creacion
        +ForeignKey estudiante
        +marcar_leida()
    }
    
    class LoginAttempt {
        +BigInt id
        +String usuario_codigo
        +Boolean exito
        +String ip_address
        +DateTime timestamp
    }
    
    class AccountLockout {
        +BigInt id
        +String usuario_codigo
        +Int intentos_fallidos
        +Boolean bloqueado
        +DateTime fecha_bloqueo
        +is_locked()
        +bloquear()
        +desbloquear()
    }
    
    %% Relaciones principales
    TipoDocumento "1" --> "*" Estudiante
    TipoDocumento "1" --> "*" Docente
    Programa "1" --> "*" Asignatura
    Docente "1" --> "*" Asignatura
    Asignatura "1" --> "*" ResultadoDeAprendizaje
    ResultadoDeAprendizaje "1" --> "*" IndicadoresDeLogro
    TipoActividad "1" --> "*" Actividad
    Actividad "1" --> "*" RaActividad
    ResultadoDeAprendizaje "1" --> "*" RaActividad
    RaActividad "1" --> "*" RaActividadIndicador
    IndicadoresDeLogro "1" --> "*" RaActividadIndicador
    Estudiante "1" --> "*" Matricula
    PeriodoAcademico "1" --> "*" Matricula
    Asignatura "1" --> "*" Matricula
    Matricula "1" --> "*" NotasActividad
    RaActividad "1" --> "*" NotasActividad
    IndicadoresDeLogro "0..1" --> "*" NotasActividad
    Asignatura "1" --> "*" Recurso
    Asignatura "1" --> "*" Anuncio
    Docente "1" --> "*" Anuncio
    Estudiante "1" --> "*" Notificacion
```

---

## 5. MODELO RELACIONAL

```mermaid
erDiagram
    TIPO_DOCUMENTO ||--o{ ESTUDIANTE : tiene
    TIPO_DOCUMENTO ||--o{ DOCENTE : tiene
    
    ESTUDIANTE {
        bigint id_estudiante PK
        varchar nombre
        varchar apellido
        varchar codigo_estudiante UK
        varchar contrasena_estudiante
        varchar num_documento UK
        varchar correo UK
        varchar jornada
        bigint id_tipo_documento FK
    }
    
    DOCENTE {
        bigint id_docente PK
        varchar nombre
        varchar apellido
        varchar codigo_docente UK
        varchar contrasenia_docente
        varchar num_documento UK
        varchar correo UK
        varchar num_telefono
        bigint id_tipo_documento FK
    }
    
    COORDINADOR {
        bigint id_coordinador PK
        varchar nombre
        varchar codigo_coordinador UK
        varchar contrasenia_coord
        varchar correo UK
    }
    
    PROGRAMA ||--o{ ASIGNATURA : ofrece
    DOCENTE ||--o{ ASIGNATURA : imparte
    
    PROGRAMA {
        bigint id_programa PK
        varchar nombre
        varchar codigo_programa UK
    }
    
    ASIGNATURA {
        bigint id_asignatura PK
        varchar nombre
        varchar codigo_asignatura UK
        varchar grupo
        bigint id_docente FK
        bigint id_programa FK
    }
    
    ASIGNATURA ||--o{ RESULTADO_DE_APRENDIZAJE : define
    
    RESULTADO_DE_APRENDIZAJE {
        bigint id_ra PK
        decimal porcentaje_ra
        text descripcion
        bigint id_asignatura FK
    }
    
    RESULTADO_DE_APRENDIZAJE ||--o{ INDICADORES_DE_LOGRO : contiene
    
    INDICADORES_DE_LOGRO {
        bigint id_ind PK
        decimal porcentaje_ind
        text descripcion
        bigint id_ra FK
    }
    
    TIPO_ACTIVIDAD ||--o{ ACTIVIDAD : clasifica
    
    TIPO_ACTIVIDAD {
        bigint id_tipo_actividad PK
        varchar descripcion UK
    }
    
    ACTIVIDAD {
        bigint id_actividad PK
        varchar nombre_actividad
        text descripcion
        date fecha_creacion
        date fecha_cierre
        bigint id_tipo_actividad FK
    }
    
    ACTIVIDAD ||--o{ RA_ACTIVIDAD : "se asocia a"
    RESULTADO_DE_APRENDIZAJE ||--o{ RA_ACTIVIDAD : "se evalúa con"
    
    RA_ACTIVIDAD {
        bigint id_ra_actividad PK
        decimal porcentaje_ra_actividad
        bigint id_actividad FK
        bigint id_ra FK
    }
    
    RA_ACTIVIDAD ||--o{ RA_ACTIVIDAD_INDICADOR : "evalúa"
    INDICADORES_DE_LOGRO ||--o{ RA_ACTIVIDAD_INDICADOR : "se mide en"
    
    RA_ACTIVIDAD_INDICADOR {
        bigint id PK
        bigint id_ra_actividad FK
        bigint id_ind FK
    }
    
    ESTUDIANTE ||--o{ MATRICULA : "se inscribe"
    PERIODO_ACADEMICO ||--o{ MATRICULA : "corresponde a"
    ASIGNATURA ||--o{ MATRICULA : "tiene"
    
    PERIODO_ACADEMICO {
        bigint id_periodo PK
        varchar descripcion UK
        date fecha_inicio
        date fecha_finalizacion
    }
    
    MATRICULA {
        bigint id_matricula PK
        decimal nota_final
        bigint id_estudiante FK
        bigint id_periodo FK
        bigint id_asignatura FK
    }
    
    MATRICULA ||--o{ NOTAS_ACTIVIDAD : "recibe"
    RA_ACTIVIDAD ||--o{ NOTAS_ACTIVIDAD : "califica"
    INDICADORES_DE_LOGRO ||--o{ NOTAS_ACTIVIDAD : "evalúa por"
    
    NOTAS_ACTIVIDAD {
        bigint id PK
        decimal nota_ra_actividad
        text retroalimentacion
        bigint id_matricula FK
        bigint id_ra_actividad FK
        bigint id_ind FK
    }
    
    ASIGNATURA ||--o{ RECURSO : "tiene"
    
    RECURSO {
        bigint id_recurso PK
        varchar titulo
        file archivo
        datetime fecha_subida
        bigint id_asignatura FK
    }
    
    ASIGNATURA ||--o{ ANUNCIO : "tiene"
    DOCENTE ||--o{ ANUNCIO : "publica"
    
    ANUNCIO {
        bigint id PK
        varchar titulo
        text contenido
        datetime fecha_publicacion
        boolean es_importante
        bigint id_asignatura FK
        bigint id_docente FK
    }
    
    ESTUDIANTE ||--o{ NOTIFICACION : "recibe"
    
    NOTIFICACION {
        uuid id PK
        varchar tipo
        text texto
        varchar enlace
        boolean leida
        datetime fecha_creacion
        bigint id_estudiante FK
    }
    
    COORDINADOR ||--o{ IMPORT_AUDIT : "realiza"
    
    IMPORT_AUDIT {
        bigint id PK
        varchar kind
        varchar filename
        int created_count
        int existing_count
        int errors_count
        datetime created_at
        bigint id_coordinador FK
    }
```

**Restricciones de integridad identificadas:**
- `chk_ra_pct`: Porcentajes de RA entre 0 y 100
- `chk_ind_pct`: Porcentajes de indicadores entre 0 y 100
- `chk_nota_final`: Nota final entre 0 y 5
- `chk_nota_ra`: Nota de actividad entre 0 y 5
- `chk_periodo_fechas`: Fecha finalización >= fecha inicio
- `chk_act_fechas`: Fecha cierre >= fecha creación
- `uq_matricula`: Unique(estudiante, periodo, asignatura)
- `uq_ra_act`: Unique(actividad, ra)
- `uq_notas_actividad_indicador`: Unique(matricula, ra_actividad, indicador)

---

## 6. DIAGRAMA DE COMPONENTES

```mermaid
graph TB
    subgraph "🌐 NAVEGADOR"
        UI[React App<br/>TypeScript]
    end
    
    subgraph "📱 FRONTEND"
        Router[React Router<br/>Navegación SPA]
        Components[Componentes UI<br/>Bootstrap + Chart.js]
        Services[Servicios<br/>API Clients]
        State[Gestión de Estado<br/>SessionContext]
        HTTP[Cliente HTTP<br/>Axios]
    end
    
    subgraph "🔌 MIDDLEWARE"
        CORS[CORS<br/>django-cors-headers]
        CSRF[CSRF Protection]
        Auth[Session Auth]
        ErrorHandler[Error Handler<br/>Middleware]
        RateLimit[Rate Limiter<br/>django-ratelimit]
        Logger[Request Logger]
    end
    
    subgraph "🖥️ BACKEND"
        API[Django REST Framework<br/>API RESTful]
        Views[Views<br/>Lógica de negocio]
        Serializers[Serializers<br/>Transformación datos]
        Models[Models<br/>ORM Django]
        Utils[Utilidades<br/>security.py]
    end
    
    subgraph "💾 BASE DE DATOS"
        DB[(PostgreSQL<br/>Datos relacionales)]
    end
    
    subgraph "📁 ALMACENAMIENTO"
        Media[Media Files<br/>Avatars, Recursos]
        Logs[Log Files<br/>django.log, errors.log]
    end
    
    UI --> Router
    UI --> Components
    Router --> Services
    Components --> Services
    Services --> State
    Services --> HTTP
    
    HTTP -->|HTTP/JSON| CORS
    CORS --> CSRF
    CSRF --> Auth
    Auth --> ErrorHandler
    ErrorHandler --> RateLimit
    RateLimit --> Logger
    Logger --> API
    
    API --> Views
    Views --> Serializers
    Views --> Utils
    Serializers --> Models
    Models --> DB
    
    Views -->|File Upload| Media
    Views -->|Logging| Logs
    ErrorHandler -->|Logging| Logs
    
    style UI fill:#e1f5ff
    style Frontend fill:#fff4e6
    style Middleware fill:#f3e5f5
    style Backend fill:#e8f5e9
    style DB fill:#fce4ec
    style Media fill:#fff9c4
    style Logs fill:#fff9c4
```

**Descripción de componentes:**

| Componente | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| React App | React 19 + TS | Interfaz de usuario interactiva |
| React Router | react-router-dom | Navegación SPA sin recargas |
| Servicios | Axios | Comunicación con API backend |
| Estado | Context API | Gestión de sesión de usuario |
| Django REST Framework | DRF 3.16 | Exposición de API REST |
| Views | Django | Lógica de negocio y controladores |
| Serializers | DRF | Validación y serialización JSON |
| Models | Django ORM | Mapeo objeto-relacional |
| PostgreSQL | RDBMS | Persistencia de datos |
| Media Files | FileSystemStorage | Almacenamiento de archivos |

---

## 7. DIAGRAMA DE DESPLIEGUE ACTUAL

```mermaid
graph TB
    subgraph "💻 MÁQUINA DE DESARROLLO"
        subgraph "🖥️ Node.js (localhost:5173)"
            Frontend[Vite Dev Server<br/>React App]
        end
        
        subgraph "🐍 Python (localhost:8000)"
            Django[Django Dev Server<br/>manage.py runserver]
        end
        
        subgraph "🗄️ PostgreSQL (localhost:5432)"
            DB[(Base de datos<br/>ra_manager)]
        end
        
        subgraph "📁 Sistema de archivos"
            Media[/media/<br/>avatars, recursos]
            Logs[/logs/<br/>django.log, errors.log]
        end
    end
    
    Frontend -->|HTTP GET/POST| Django
    Django -->|SQL Queries| DB
    Django -->|Read/Write| Media
    Django -->|Write| Logs
    
    style Frontend fill:#61dafb
    style Django fill:#0c4b33
    style DB fill:#336791
    style Media fill:#ffa726
    style Logs fill:#ffa726
```

**Configuración actual (desarrollo):**

```yaml
Frontend:
  Host: localhost
  Port: 5173
  Server: Vite Dev Server
  Hot Reload: Activado
  
Backend:
  Host: localhost
  Port: 8000
  Server: Django Development Server (manage.py runserver)
  Workers: 1 (single-threaded)
  Debug: True
  
Database:
  Engine: PostgreSQL
  Host: localhost
  Port: 5432
  Name: ra_manager
  Connection Pool: Por defecto de Django
  
CORS:
  Allowed Origins:
    - http://localhost:5173
    - http://127.0.0.1:5173
  Allow All: True (en desarrollo)
  
Session:
  Backend: django.contrib.sessions.backends.db
  Cookie Secure: False (en desarrollo)
  
Static Files:
  Served by: Django staticfiles
  
Media Files:
  Storage: FileSystemStorage
  Location: /media/
```

---

## 8. DIAGRAMA DE DESPLIEGUE IDEAL (PRODUCCIÓN ESCALABLE)

```mermaid
graph TB
    subgraph "🌍 INTERNET"
        Users[👥 Usuarios<br/>10,000+ estudiantes]
    end
    
    subgraph "🔒 FIREWALL / WAF"
        CDN[Cloudflare / AWS CloudFront<br/>CDN + DDoS Protection]
    end
    
    subgraph "⚖️ LOAD BALANCER"
        LB[Nginx / AWS ALB<br/>HTTPS Termination<br/>Load Balancing]
    end
    
    subgraph "🖥️ FRONTEND SERVERS"
        Static1[Nginx Static Server 1<br/>React Build]
        Static2[Nginx Static Server 2<br/>React Build]
    end
    
    subgraph "🐍 BACKEND API SERVERS"
        API1[Gunicorn Server 1<br/>Django + DRF<br/>4 workers]
        API2[Gunicorn Server 2<br/>Django + DRF<br/>4 workers]
        API3[Gunicorn Server 3<br/>Django + DRF<br/>4 workers]
    end
    
    subgraph "⚡ CACHE LAYER"
        Redis[(Redis<br/>Session Cache<br/>Query Cache)]
    end
    
    subgraph "🗄️ DATABASE CLUSTER"
        DBMaster[(PostgreSQL Master<br/>Read/Write)]
        DBReplica1[(PostgreSQL Replica 1<br/>Read Only)]
        DBReplica2[(PostgreSQL Replica 2<br/>Read Only)]
    end
    
    subgraph "📁 OBJECT STORAGE"
        S3[AWS S3 / Azure Blob<br/>Media Files<br/>Avatars, Recursos]
    end
    
    subgraph "🔧 BACKGROUND WORKERS"
        Celery[Celery Workers<br/>Tareas asíncronas<br/>Importaciones, Emails]
        Queue[(Redis / RabbitMQ<br/>Task Queue)]
    end
    
    subgraph "📊 MONITORING"
        Monitor[Prometheus + Grafana<br/>Métricas de rendimiento]
        Sentry[Sentry<br/>Error Tracking]
        ELK[ELK Stack<br/>Logs centralizados]
    end
    
    Users -->|HTTPS| CDN
    CDN --> LB
    LB --> Static1
    LB --> Static2
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> Redis
    API2 --> Redis
    API3 --> Redis
    
    API1 --> DBMaster
    API1 --> DBReplica1
    API2 --> DBMaster
    API2 --> DBReplica2
    API3 --> DBMaster
    API3 --> DBReplica1
    
    DBMaster -.Replicación.-> DBReplica1
    DBMaster -.Replicación.-> DBReplica2
    
    API1 --> S3
    API2 --> S3
    API3 --> S3
    
    API1 -->|Encolar tareas| Queue
    API2 -->|Encolar tareas| Queue
    API3 -->|Encolar tareas| Queue
    Queue --> Celery
    Celery --> DBMaster
    Celery --> S3
    
    API1 -->|Métricas| Monitor
    API2 -->|Métricas| Monitor
    API3 -->|Métricas| Monitor
    
    API1 -->|Errores| Sentry
    API2 -->|Errores| Sentry
    API3 -->|Errores| Sentry
    
    API1 -->|Logs| ELK
    API2 -->|Logs| ELK
    API3 -->|Logs| ELK
    
    style Users fill:#4caf50
    style CDN fill:#ff9800
    style LB fill:#2196f3
    style Redis fill:#f44336
    style DBMaster fill:#9c27b0
    style S3 fill:#ffc107
    style Celery fill:#00bcd4
    style Monitor fill:#607d8b
```

**Configuración recomendada para producción:**

```yaml
Infraestructura:
  Cloud Provider: AWS / Azure / GCP
  Regions: Multi-región para redundancia
  
Frontend:
  Deployment: Static Build (npm run build)
  Hosting: S3 + CloudFront / Azure Blob + CDN
  Servers: Nginx (2+ instancias)
  Cache: Browser cache + CDN edge cache
  
Load Balancer:
  Type: Application Load Balancer
  SSL: AWS Certificate Manager / Let's Encrypt
  Health Checks: /api/health (endpoint a crear)
  Sticky Sessions: Habilitado para WebSockets
  
Backend API:
  Server: Gunicorn con 4-8 workers por instancia
  Instances: 3+ (auto-scaling)
  Workers: (2 × CPU cores) + 1
  Timeout: 60 segundos
  Keep-alive: 5 segundos
  
Cache:
  Engine: Redis 7.x
  Deployment: AWS ElastiCache / Azure Cache
  Use Cases:
    - Session storage
    - Query result caching
    - Rate limiting
    - Task queue (Celery)
  TTL: Variable por tipo de dato
  
Database:
  Primary: PostgreSQL 16.x (Master)
  Replicas: 2+ (Read replicas)
  Connection Pooling: PgBouncer (max 100 connections)
  Backups: Automated daily + point-in-time recovery
  Storage: SSD con IOPS provisionados
  
Object Storage:
  Service: AWS S3 / Azure Blob Storage
  Buckets:
    - media-avatars (público con CloudFront)
    - media-recursos (privado con signed URLs)
  Lifecycle: Archivar recursos > 2 años a Glacier
  
Background Workers:
  Framework: Celery
  Broker: Redis / RabbitMQ
  Workers: 4+ instancias
  Queues:
    - default (baja prioridad)
    - high_priority (importaciones, notificaciones)
    - email (envío de correos)
  Monitoring: Flower (Celery Monitoring)
  
Monitoring y Observabilidad:
  Métricas: Prometheus + Grafana
    - Request rate, latency, error rate
    - Database connections, query time
    - Memory, CPU usage
  Logging: ELK Stack (Elasticsearch, Logstash, Kibana)
    - Logs centralizados de todas las instancias
    - Alertas por patrones de errores
  Error Tracking: Sentry
    - Captura de excepciones en tiempo real
    - Stack traces con contexto
  Uptime Monitoring: Pingdom / UptimeRobot
    
Security:
  WAF: AWS WAF / Cloudflare
  DDoS Protection: Shield Advanced
  Secrets: AWS Secrets Manager / Azure Key Vault
  SSL/TLS: TLS 1.3 mínimo
  
Escalabilidad estimada:
  Usuarios concurrentes: 1,000+
  Estudiantes totales: 10,000+
  Requests por segundo: 500+
  Tiempo de respuesta promedio: < 200ms
```

---

## 9. FLUJO DE AUTENTICACIÓN

```mermaid
sequenceDiagram
    actor Usuario
    participant Frontend
    participant API as Django API
    participant Auth as SecurityUtils
    participant DB as PostgreSQL
    participant Audit as LoginAttempt
    
    Usuario->>Frontend: Ingresa código y contraseña
    Frontend->>API: POST /api/auth/login<br/>{codigo, password}
    
    API->>Auth: get_client_ip(request)
    Auth-->>API: IP del cliente
    
    API->>Auth: check_account_lockout(codigo)
    Auth->>DB: SELECT * FROM account_lockout
    
    alt Cuenta bloqueada
        DB-->>Auth: bloqueado=True
        Auth-->>API: is_locked=True, motivo
        API-->>Frontend: 403 Forbidden<br/>"Cuenta bloqueada por X minutos"
        Frontend->>Usuario: ❌ Muestra error y tiempo restante
    else Cuenta desbloqueada
        API->>DB: Buscar usuario por código en Estudiante/Docente/Coordinador
        
        alt Usuario no encontrado
            DB-->>API: None
            API->>Audit: registrar_intento_login(exito=False, motivo="Usuario no existe")
            API-->>Frontend: 401 Unauthorized
            Frontend->>Usuario: ❌ "Credenciales inválidas"
        else Usuario encontrado
            DB-->>API: usuario
            API->>Auth: check_user_password(db_password, provided_password)
            Auth->>Auth: bcrypt.verify()
            
            alt Contraseña incorrecta
                Auth-->>API: False
                API->>Audit: registrar_intento_login(exito=False, motivo="Contraseña incorrecta")
                API->>DB: Incrementar intentos_fallidos en AccountLockout
                
                alt Intentos >= 5
                    API->>Auth: bloquear_cuenta(codigo, duracion=30 min)
                    Auth->>DB: UPDATE account_lockout SET bloqueado=True
                    API->>Audit: registrar_evento(ACCOUNT_LOCKED)
                end
                
                API-->>Frontend: 401 Unauthorized
                Frontend->>Usuario: ❌ "Contraseña incorrecta"
            else Contraseña correcta
                Auth-->>API: True
                API->>Auth: generar_token_jwt(usuario)
                Auth-->>API: token
                
                API->>Audit: registrar_intento_login(exito=True)
                API->>DB: RESET account_lockout (intentos=0)
                API->>Audit: registrar_evento(LOGIN_SUCCESS)
                
                API-->>Frontend: 200 OK<br/>{token, user: {id, nombre, rol, code}}
                Frontend->>Frontend: setAuthToken(token)<br/>localStorage + sessionStorage
                Frontend->>Frontend: Actualizar SessionContext
                Frontend->>Usuario: ✅ Redirige a dashboard según rol
            end
        end
    end
```

**Detalles de implementación:**

```python
# Token format (Django signing)
token = signing.dumps({
    'id': user.pk,
    'rol': 'docente|estudiante|coordinador',
    'code': user.codigo_xxx,
}, salt='auth-token', max_age=TOKEN_MAX_AGE)

# TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 días
```

**Seguridad implementada:**
- ✅ Hashing de contraseñas con bcrypt/pbkdf2
- ✅ Rate limiting por IP
- ✅ Bloqueo de cuenta tras 5 intentos fallidos
- ✅ Auditoría de todos los intentos de login
- ✅ Tokens con expiración de 7 días
- ⚠️ **Falta:** Validación de tokens en endpoints (AllowAny)

---

## 10. FLUJO DE CALIFICACIÓN

### 10.1 Creación de actividad y asignación de RAs

```mermaid
sequenceDiagram
    actor Docente
    participant Frontend
    participant API as Django API
    participant Views
    participant DB as PostgreSQL
    
    Docente->>Frontend: Accede a "Crear Actividad"
    Frontend->>Docente: Muestra formulario con RAs disponibles
    
    Docente->>Frontend: Completa datos:<br/>- Nombre, descripción<br/>- Fecha cierre<br/>- Selecciona RAs y porcentajes<br/>- Selecciona indicadores
    
    Frontend->>Frontend: Valida suma de porcentajes = 100%
    
    Frontend->>API: POST /api/actividades/multi<br/>{actividad, ras: [{id_ra, porcentaje, indicadores}]}
    
    API->>Views: actividades_multi_view()
    Views->>Views: Validar que docente imparte la asignatura
    Views->>DB: BEGIN TRANSACTION
    
    Views->>DB: INSERT INTO actividad
    DB-->>Views: id_actividad
    
    loop Por cada RA seleccionado
        Views->>DB: INSERT INTO ra_actividad<br/>(id_actividad, id_ra, porcentaje)
        DB-->>Views: id_ra_actividad
        
        loop Por cada indicador seleccionado
            Views->>DB: INSERT INTO ra_actividad_indicador<br/>(id_ra_actividad, id_ind)
        end
    end
    
    Views->>DB: COMMIT TRANSACTION
    
    Views-->>API: 201 Created
    API-->>Frontend: {actividad: {...}, ras_asociados: [...]}
    Frontend->>Docente: ✅ "Actividad creada exitosamente"
```

---

### 10.2 Calificación de estudiante por indicador

```mermaid
sequenceDiagram
    actor Docente
    participant Frontend
    participant API as Django API
    participant Views
    participant DB as PostgreSQL
    participant Notif as Sistema de Notificaciones
    
    Docente->>Frontend: Accede a "Calificar"
    Frontend->>API: GET /api/asignaturas/{codigo}/estudiantes
    API->>DB: SELECT matriculas con estudiantes
    DB-->>API: Lista de estudiantes
    API-->>Frontend: [{estudiante, matricula}]
    
    Frontend->>Docente: Muestra tabla de estudiantes y actividades
    
    Docente->>Frontend: Selecciona estudiante y actividad
    Frontend->>API: GET actividades con indicadores
    API-->>Frontend: [{actividad, ras, indicadores}]
    
    Frontend->>Docente: Muestra formulario de calificación por indicador
    
    Docente->>Frontend: Ingresa nota por indicador:<br/>- Indicador 1: 4.5<br/>- Indicador 2: 3.8<br/>- Retroalimentación: "Buen trabajo..."
    
    Frontend->>API: POST /api/notas<br/>{<br/>  id_matricula,<br/>  id_ra_actividad,<br/>  notas: [{id_ind, nota}],<br/>  retroalimentacion<br/>}
    
    API->>Views: notas_view()
    Views->>Views: Validar que docente imparte la asignatura
    Views->>Views: Validar rango de notas (0-5)
    
    Views->>DB: BEGIN TRANSACTION
    
    loop Por cada indicador calificado
        Views->>DB: INSERT INTO notas_actividad<br/>(id_matricula, id_ra_actividad, id_ind, nota, retroalimentacion)<br/>ON CONFLICT UPDATE
    end
    
    Views->>DB: Calcular nota promedio de la actividad
    Views->>DB: Actualizar nota_final en matricula (trigger/manual)
    
    Views->>DB: COMMIT TRANSACTION
    
    Views->>Notif: _add_notification(id_estudiante, 'grade', 'Nueva calificación en...')
    Notif->>DB: INSERT INTO notificacion
    
    Views-->>API: 200 OK
    API-->>Frontend: {success: true, notas: [...]}
    Frontend->>Docente: ✅ "Notas registradas exitosamente"
```

---

### 10.3 Consulta de calificaciones por estudiante

```mermaid
sequenceDiagram
    actor Estudiante
    participant Frontend
    participant API as Django API
    participant Views
    participant DB as PostgreSQL
    
    Estudiante->>Frontend: Accede a "Mis Materias"
    Frontend->>API: GET /api/auth/me
    API-->>Frontend: {user: {id, rol, code}}
    
    Frontend->>API: GET /api/asignaturas (filtrado por estudiante)
    API->>DB: SELECT matriculas WHERE id_estudiante=X<br/>JOIN asignatura, programa
    DB-->>API: Lista de asignaturas matriculadas
    API-->>Frontend: [{asignatura, programa, docente}]
    
    Estudiante->>Frontend: Selecciona asignatura
    Frontend->>API: GET /api/asignaturas/{codigo}/detalle/{id_estudiante}
    
    API->>Views: course_detail_view()
    Views->>DB: SELECT resultado_de_aprendizaje WHERE id_asignatura=X
    DB-->>Views: Lista de RAs con porcentajes
    
    loop Por cada RA
        Views->>DB: SELECT indicadores_de_logro WHERE id_ra=Y
        Views->>DB: SELECT ra_actividad WHERE id_ra=Y
        Views->>DB: SELECT notas_actividad<br/>WHERE id_matricula=Z AND id_ra_actividad IN (...)
        
        Views->>Views: Calcular:<br/>- Nota obtenida por indicador<br/>- Promedio por RA<br/>- Porcentaje de avance
    end
    
    Views->>Views: Calcular nota final acumulada
    Views-->>API: {<br/>  asignatura: {...},<br/>  ras: [{id_ra, porcentaje, nota_obtenida, indicadores: [...]}],<br/>  nota_final_calculada<br/>}
    
    API-->>Frontend: JSON con detalle completo
    Frontend->>Frontend: Renderizar gráfico de avance (Chart.js)
    Frontend->>Estudiante: Muestra dashboard con:<br/>- Gráfico de RAs<br/>- Tabla de calificaciones<br/>- Retroalimentación
```

---

## 11. ARQUITECTURA DE MÓDULOS

### 11.1 Estructura del backend Django

```
backend/
├── api/                          # Aplicación principal
│   ├── models/
│   │   └── models.py             # 527 líneas - Todos los modelos
│   │       ├── TipoDocumento, TipoActividad, Programa
│   │       ├── Estudiante, Docente, Coordinador
│   │       ├── Asignatura, ResultadoDeAprendizaje, IndicadoresDeLogro
│   │       ├── Actividad, RaActividad, RaActividadIndicador
│   │       ├── Matricula, NotasActividad
│   │       ├── Recurso, Anuncio, Notificacion
│   │       └── LoginAttempt, AccountLockout, SecurityEvent, ImportAudit
│   │
│   ├── serializers/
│   │   └── serializers.py        # Serialización de datos para API
│   │       ├── TipoDocumentoSerializer
│   │       ├── DocenteSerializer, EstudianteSerializer
│   │       ├── AsignaturaSerializer (con nested objects)
│   │       └── PasswordForgot/Verify/Reset Serializers
│   │
│   ├── views/
│   │   ├── views.py              # ⚠️ 4380 líneas - MONOLÍTICO
│   │   │   ├── Login, logout, me, password recovery
│   │   │   ├── Endpoints de catálogos (ViewSets)
│   │   │   ├── Endpoints de docente (RAs, actividades, calificaciones)
│   │   │   ├── Endpoints de estudiante (consultas, notificaciones)
│   │   │   ├── Endpoints de coordinador (imports, gestión)
│   │   │   └── Endpoints de analítica
│   │   │
│   │   └── utils.py              # Funciones auxiliares
│   │       ├── _bearer_token(), _serialize_user()
│   │       ├── _read_imported_file() (CSV/Excel)
│   │       └── _send_welcome_email()
│   │
│   ├── urls/
│   │   └── urls.py               # Rutas de API (REST + custom endpoints)
│   │
│   ├── middleware/
│   │   ├── error_handler.py      # Error handling centralizado
│   │   │   ├── ErrorHandlerMiddleware (process_exception)
│   │   │   └── RequestLoggingMiddleware
│   │   │
│   │   └── ratelimit.py          # Rate limiting por IP/usuario
│   │
│   └── utils/
│       └── security.py           # 302 líneas - Utilidades de seguridad
│           ├── get_client_ip(), get_user_agent()
│           ├── validate_password_strength()
│           ├── check_user_password()
│           ├── generate_secure_otp()
│           ├── check_account_lockout()
│           ├── registrar_intento_login()
│           └── manejar_intento_fallido()
│
├── backend/                      # Configuración del proyecto
│   ├── settings.py               # 319 líneas - Configuración central
│   │   ├── SECRET_KEY validation
│   │   ├── Database (PostgreSQL)
│   │   ├── CORS (allowed origins)
│   │   ├── Security (HSTS, SSL redirect)
│   │   ├── Logging (RotatingFileHandler)
│   │   └── Middleware stack
│   │
│   ├── urls.py                   # Rutas principales
│   │   ├── /api/ → api.urls
│   │   ├── /admin/ → Django admin
│   │   └── /api/schema/ → drf-spectacular (Swagger)
│   │
│   └── wsgi.py                   # WSGI entry point
│
├── db/                           # Base de datos y scripts SQL
│   ├── db.sqlite3                # SQLite (desarrollo)
│   └── *.sql, *.psql             # Scripts de inicialización
│
├── logs/                         # Archivos de log
│   ├── django.log                # Log general (10MB rotating)
│   └── errors.log                # Solo errores
│
├── media/                        # Archivos subidos
│   ├── avatars/                  # Fotos de perfil
│   └── recursos/                 # Recursos educativos
│
├── manage.py                     # CLI de Django
└── requirements.txt              # Dependencias Python
```

**Dependencias entre módulos:**

```
views.py
  ├── depends on: models.py (importa todos los modelos)
  ├── depends on: serializers.py
  ├── depends on: utils/security.py
  └── depends on: utils.py (funciones auxiliares)

middleware/error_handler.py
  └── depends on: logging (Python stdlib)

middleware/ratelimit.py
  └── depends on: django-ratelimit, models.SecurityEvent

serializers.py
  └── depends on: models.py

models.py
  └── standalone (solo Django)

utils/security.py
  └── depends on: models.LoginAttempt, AccountLockout, SecurityEvent
```

---

### 11.2 Estructura del frontend React

```
frontend/src/
├── main.tsx                      # Entry point (ReactDOM.render)
│   └── Envuelve <App> en <BrowserRouter> y <SessionProvider>
│
├── App.tsx                       # Router principal
│   ├── Define todas las rutas protegidas
│   ├── Componente: ProtectedRoute (verifica rol)
│   └── Redirige según rol en caso de acceso no autorizado
│
├── components/                   # Componentes reutilizables
│   ├── HeaderBar.tsx             # Barra de navegación con perfil
│   ├── Sidebar.tsx               # Menú lateral según rol
│   ├── NotificationsBell.tsx     # Campana de notificaciones
│   ├── Alert.tsx, Toast.tsx      # Mensajes al usuario
│   ├── Spinner.tsx, Skeleton.tsx # Estados de carga
│   ├── ErrorBoundary.tsx         # Captura de errores React
│   ├── ConfirmDialog.tsx         # Diálogos de confirmación
│   ├── GradeSummary.tsx          # Resumen de calificaciones
│   ├── RaCard.tsx                # Tarjeta de Resultado de Aprendizaje
│   ├── StudentList.tsx           # Tabla de estudiantes
│   └── EstudiantePerfilModal.tsx # Modal de perfil de estudiante
│
├── pages/                        # Páginas principales
│   ├── Login.tsx                 # Página de login
│   ├── Recuperar.tsx             # Recuperación de contraseña
│   ├── Reset.tsx                 # Reseteo de contraseña con OTP
│   ├── Profile.tsx               # Perfil de usuario
│   │
│   ├── estudiante/
│   │   └── MateriaDetalle.tsx    # Vista detallada de asignatura
│   │
│   ├── docente/
│   │   ├── Cursos.tsx            # Listado de asignaturas
│   │   ├── RAs.tsx               # Gestión de RAs
│   │   ├── NuevaActividad.tsx    # Crear actividad
│   │   ├── Calificar.tsx         # Calificar estudiantes
│   │   └── Recursos.tsx          # Publicar recursos
│   │
│   └── coordinador/
│       ├── Dashboard.tsx         # Dashboard coordinador
│       ├── Materias.tsx          # Listado de asignaturas
│       ├── Estudiantes.tsx       # Gestión de estudiantes
│       ├── Imports.tsx           # Importaciones masivas
│       ├── Asignatura.tsx        # Vista de asignatura
│       └── AsignaturaAnalisis.tsx# Analítica de asignatura
│
├── services/                     # Servicios de API
│   ├── auth.ts                   # login, logout, getProfile, changePassword
│   ├── api.ts                    # Endpoints generales (asignaturas, RAs)
│   ├── coordinador.ts            # Servicios específicos de coordinador
│   └── index.ts                  # Re-exportación
│
├── connections/                  # Configuración HTTP
│   ├── http.ts                   # Cliente Axios configurado
│   │   ├── api (Axios instance)
│   │   ├── Interceptors (token, CSRF, loading)
│   │   ├── getAuthToken(), setAuthToken(), removeAuthToken()
│   │   └── Manejo de errores
│   │
│   └── endpoints.ts              # Definición de rutas de API
│
├── state/                        # Gestión de estado
│   └── SessionContext.tsx        # Context API para sesión de usuario
│       ├── SessionProvider
│       ├── useSession() hook
│       └── Estado: {id, role, nombre, code}
│
├── hooks/                        # Custom hooks
│   └── [hooks personalizados]
│
├── utils/                        # Utilidades
│   ├── loadingEvents.ts          # Event bus para spinner global
│   └── [otras utilidades]
│
├── types.ts                      # Definiciones de tipos TypeScript
│   ├── UserProfile, ProfileDetails
│   ├── Asignatura, Programa, Docente
│   └── ResultadoAprendizaje, Indicador, Actividad
│
└── styles/                       # Estilos CSS
    └── [archivos de estilos]
```

**Flujo de datos:**

```
Usuario interactúa con página
  ↓
Página llama a servicio (ej: auth.login)
  ↓
Servicio usa http.ts (Axios)
  ↓
http.ts intercepta request (añade token)
  ↓
Request enviado a API backend
  ↓
Response interceptado (maneja errores, loading)
  ↓
Servicio procesa response y retorna datos
  ↓
Página actualiza estado (useState/SessionContext)
  ↓
React re-renderiza componentes
```

---

### 11.3 Flujo de comunicación completo

```mermaid
sequenceDiagram
    participant User as 👤 Usuario
    participant Page as 📄 React Page
    participant Service as 🔌 Service Layer
    participant HTTP as 🌐 HTTP Client (Axios)
    participant MW as 🛡️ Middleware
    participant View as 🎯 Django View
    participant Model as 📊 Django Model
    participant DB as 🗄️ PostgreSQL
    
    User->>Page: Interacción (ej: click "Ver calificaciones")
    Page->>Service: Llama función (ej: getCursoDetalle(codigo, id))
    Service->>HTTP: api.get(endpoint)
    HTTP->>HTTP: Interceptor: añade token Bearer
    HTTP->>MW: GET /api/asignaturas/{codigo}/detalle/{id}
    MW->>MW: Procesa: CORS, CSRF, Auth, Logging
    MW->>View: Ejecuta course_detail_view()
    View->>Model: Query ORM (select_related, prefetch)
    Model->>DB: SQL Query
    DB-->>Model: Resultados
    Model-->>View: Objetos Python
    View->>View: Serialización (manual o con Serializer)
    View-->>MW: JsonResponse(data, status=200)
    MW->>MW: ErrorHandlerMiddleware (si hay error)
    MW-->>HTTP: Response JSON
    HTTP->>HTTP: Interceptor: maneja loading, errores
    HTTP-->>Service: data / error
    Service-->>Page: Objeto tipado (TypeScript)
    Page->>Page: setState(data) / actualiza UI
    Page-->>User: Muestra información
```

---

## 📊 CONCLUSIONES

Este sistema **RA-Manager** presenta:

✅ **Arquitectura bien estructurada:**
- Separación clara frontend/backend
- Modelos de datos normalizados con integridad referencial
- Sistema de auditoría robusto
- Manejo de errores centralizado

⚠️ **Áreas críticas de mejora:**
- Implementar autenticación real en endpoints (actualmente AllowAny)
- Dividir views.py monolítico en módulos
- Agregar tests automatizados
- Implementar caché para consultas frecuentes

🚀 **Escalabilidad:**
- Con la arquitectura ideal propuesta, el sistema puede escalar a 10,000+ estudiantes
- Requiere implementación de load balancing, read replicas y object storage

---

**Documento generado a partir del análisis del código fuente del proyecto RA-Manager**  
**Para uso interno del equipo de desarrollo**

---

## ANEXO: LISTADO COMPLETO DE ENDPOINTS

| Endpoint | Método | Descripción | Rol |
|----------|--------|-------------|-----|
| `/api/auth/login` | POST | Autenticación de usuario | Público |
| `/api/auth/me` | GET | Obtener usuario actual | Auth |
| `/api/auth/logout` | POST | Cerrar sesión | Auth |
| `/api/auth/profile` | GET, PUT, PATCH | Ver/editar perfil | Auth |
| `/api/auth/password/forgot` | POST | Solicitar OTP de recuperación | Público |
| `/api/auth/password/verify-otp` | POST | Verificar código OTP | Público |
| `/api/auth/password/reset` | POST | Resetear contraseña con OTP | Público |
| `/api/auth/password/change` | POST | Cambiar contraseña | Auth |
| `/api/auth/profile/avatar` | POST | Subir avatar | Auth |
| `/api/tipos-documento` | GET, POST | CRUD tipo documento | Admin |
| `/api/tipos-actividad` | GET, POST | CRUD tipo actividad | Admin |
| `/api/programas` | GET, POST | CRUD programas | Admin |
| `/api/docentes` | GET, POST | CRUD docentes | Admin |
| `/api/estudiantes` | GET, POST | CRUD estudiantes | Admin |
| `/api/asignaturas` | GET, POST | CRUD asignaturas | Docente/Admin |
| `/api/ras/{id_ra}/indicadores/` | GET, POST | Gestión de indicadores | Docente |
| `/api/ras/{id_ra}/indicadores/{id_ind}/` | GET, PUT, DELETE | CRUD indicador específico | Docente |
| `/api/ras/{id_ra}/actividades/` | GET, POST | Actividades de un RA | Docente |
| `/api/ras/{id_ra}/actividades/{rel_id}/` | PATCH, DELETE | Editar/eliminar RA-Actividad | Docente |
| `/api/actividades/multi` | POST | Crear actividad con múltiples RAs | Docente |
| `/api/notas` | POST, PUT | Ingresar/editar notas | Docente |
| `/api/asignaturas/{codigo}/estudiante/{id}/indicadores` | GET | Indicadores de estudiante | Docente/Estudiante |
| `/api/asignaturas/{codigo}/calificaciones/{id}/` | GET | Calificaciones consolidadas | Docente/Estudiante |
| `/api/asignaturas/{codigo}/detalle/{id}/` | GET | Detalle completo de asignatura | Estudiante |
| `/api/asignaturas/{codigo}/analitica/` | GET | Analítica de asignatura | Coordinador |
| `/api/asignaturas/{codigo}/actividades-agrupadas/` | GET | Actividades sin duplicación | Docente |
| `/api/notificaciones` | GET | Notificaciones del estudiante | Estudiante |
| `/api/validacion/ra/{id_ra}` | GET | Validar porcentajes de RA | Docente |
| `/api/validacion/asignatura/{codigo}` | GET | Validar asignatura completa | Docente |
| `/api/periodos/actual` | GET | Periodo académico actual | Auth |
| `/api/coordinador/estudiantes` | GET, POST | Gestión de estudiantes | Coordinador |
| `/api/coordinador/estudiantes/{id}/perfil` | GET | Perfil completo de estudiante | Coordinador |
| `/api/coordinador/asignaturas` | GET | Todas las asignaturas | Coordinador |
| `/api/coordinador/asignaturas/estudiantes` | GET | Estudiantes por asignatura | Coordinador |
| `/api/coordinador/asignaturas/ras` | GET | RAs por asignatura | Coordinador |
| `/api/coordinador/asignaturas/avance` | GET | Avance por asignatura | Coordinador |
| `/api/coordinador/import/matriculados` | POST | Importar matrículas CSV | Coordinador |
| `/api/coordinador/import/docentes` | POST | Importar docentes CSV | Coordinador |
| `/api/coordinador/import/estudiantes` | POST | Importar estudiantes CSV | Coordinador |
| `/api/coordinador/import/asignaturas-ras` | POST | Importar asignaturas y RAs | Coordinador |
| `/api/docente/asignaturas/{codigo}/import/estudiantes` | POST | Importar estudiantes (docente) | Docente |
| `/api/docente/buscar-estudiante` | GET | Buscar estudiante por código | Docente |
| `/api/docente/asignaturas/{codigo}/estudiantes` | POST | Agregar estudiante individual | Docente |
| `/api/anuncios/{id}/` | DELETE | Eliminar anuncio | Docente |

---

**FIN DE LA DOCUMENTACIÓN ARQUITECTÓNICA**
