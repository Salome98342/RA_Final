# 📑 Índice de Diagramas UML - RA Manager

## 📂 Estructura de Directorios

```
diagramas/
├── README.md (guía de uso y convenciones)
├── INDICE.md (este archivo - navegación rápida)
│
├── casos_de_uso/
│   ├── casos_uso_estudiante.puml ✅
│   ├── casos_uso_docente.puml ✅
│   └── casos_uso_coordinador.puml ✅
│
├── clases/
│   └── diagrama_clases.puml ✅
│
├── paquetes/
│   └── diagrama_paquetes.puml ✅
│
├── entidad_relacion/
│   └── diagrama_er.puml ✅
│
├── secuencia/
│   ├── secuencia_login_recuperacion.puml ✅
│   ├── secuencia_estudiante_notas.puml ✅ (NUEVO)
│   ├── secuencia_estudiante_calificaciones.puml ✅
│   ├── secuencia_docente_crear_actividad.puml ✅ (ACTUALIZADO - Multi-RA)
│   ├── secuencia_docente_recursos.puml ✅ (NUEVO)
│   ├── secuencia_calificar.puml ✅
│   ├── secuencia_coordinador_importacion.puml ✅ (ACTUALIZADO - 3 tipos)
│   ├── secuencia_coordinador_avance.puml ✅ (NUEVO)
│   ├── secuencia_notificaciones.puml ✅ (NUEVO)
│   └── secuencia_perfil.puml ✅ (NUEVO)
│
├── flujo/
│   ├── flujo_calificacion.puml ✅
│   ├── flujo_importacion.puml ✅
│   └── flujo_crear_actividad_multi_ra.puml ✅ (NUEVO)
│
├── componentes/
│   └── diagrama_componentes.puml ✅
│
└── despliegue/
    └── diagrama_despliegue.puml ✅
```

---

## 🎯 Navegación por Tipo de Usuario

### 👨‍🎓 Estudiante

**Casos de Uso:** `casos_de_uso/casos_uso_estudiante.puml`
- Ver cursos actuales y pasados
- Consultar actividades y calificaciones
- Ver resumen de notas (progresiva/estricta)
- Descargar recursos educativos
- Ver notificaciones de nuevas calificaciones

**Diagramas de Secuencia:**
- `secuencia/secuencia_login_recuperacion.puml` - Login y recuperación de contraseña
- `secuencia/secuencia_estudiante_notas.puml` - **[NUEVO]** Flujo completo:
  - Carga de dashboard con cursos
  - Ver actividades agrupadas por múltiples RAs
  - Ver resumen de calificaciones progresivas
  - Ver y descargar recursos
  - Sistema de notificaciones
- `secuencia/secuencia_estudiante_calificaciones.puml` - Vista detallada de calificaciones
- `secuencia/secuencia_notificaciones.puml` - **[NUEVO]** Sistema de notificaciones
- `secuencia/secuencia_perfil.puml` - **[NUEVO]** Gestión de perfil (todos los roles)

**Componentes Frontend:**
- `Estudiante.tsx` - Dashboard principal
- `GradeSummary.tsx` - Resumen de notas
- `RaCard.tsx` - Tarjeta de RA
- `ActivityDetailsModal.tsx` - Modal de actividad multi-RA
- `NotificationsBell.tsx` - Campana de notificaciones
- `Profile.tsx` - Gestión de perfil (compartido por todos)

---

### 👨‍🏫 Docente

**Casos de Uso:** `casos_de_uso/casos_uso_docente.puml`
- Ver cursos asignados
- Crear actividades multi-RA con indicadores
- Calificar estudiantes por indicador
- Subir y gestionar recursos educativos
- Importar estudiantes desde CSV
- Ver estadísticas de estudiantes

**Diagramas de Secuencia:**
- `secuencia/secuencia_login_recuperacion.puml` - Login y recuperación
- `secuencia/secuencia_docente_crear_actividad.puml` - **[ACTUALIZADO]** Creación de actividades:
  - Selección de múltiples RAs
  - Asignación de porcentajes por RA
  - Selección de indicadores por cada RA
  - Validaciones (suma = 100%)
  - Creación de registros de notas para estudiantes
- `secuencia/secuencia_docente_recursos.puml` - **[NUEVO]** Gestión de recursos:
  - Subir archivos (PDF, DOCX, PPTX, ZIP)
  - Validación (tamaño, extensión)
  - Almacenamiento en filesystem
  - Descargar y eliminar recursos
- `secuencia/secuencia_calificar.puml` - Proceso de calificación por indicador

**Flujos:**
- `flujo/flujo_calificacion.puml` - Flujo completo de calificación
- `flujo/flujo_crear_actividad_multi_ra.puml` - **[NUEVO]** Flujo completo de creación de actividad multi-RA

**Componentes Frontend:**
- `Docente.tsx` - Dashboard docente
- `Cursos.tsx` - Lista de cursos
- `RAs.tsx` - Gestión de RAs
- `NuevaActividad.tsx` - Formulario multi-RA (simple)
- `CrearActividad.tsx` - Formulario multi-RA avanzado (múltiples RAs simultáneos)
- `Calificar.tsx` - Interface de calificación
- `Recursos.tsx` - Gestión de recursos

---

### 👨‍💼 Coordinador

**Casos de Uso:** `casos_de_uso/casos_uso_coordinador.puml`
- Ver dashboard con estadísticas globales
- Gestionar asignaturas por programa/periodo
- Importar datos masivos desde CSV
- Ver avance y estadísticas por curso
- Generar reportes de auditoría
- Vista completa de docente en cualquier asignatura

**Diagramas de Secuencia:**
- `secuencia/secuencia_login_recuperacion.puml` - Login y recuperación
- `secuencia/secuencia_coordinador_importacion.puml` - **[ACTUALIZADO]** Sistema de importación:
  - **Importar Matriculados**: Estudiantes + asignatura + periodo
  - **Importar Docentes**: Asignación docente-asignatura
  - **Importar Asignaturas y RAs**: Estructura completa con indicadores
  - Validaciones transaccionales
  - Auditoría con ImportAudit
  - Historial de errores y warnings
- `secuencia/secuencia_coordinador_avance.puml` - **[NUEVO]** Consulta de estadísticas:
  - Filtrado por programa/docente/periodo
  - Vista de curso específico
  - Estadísticas de estudiantes
  - Notas por RA y actividad
  - Progreso del curso

**Flujos:**
- `flujo/flujo_importacion.puml` - Flujo completo de importación CSV

**Componentes Frontend:**
- `Dashboard.tsx` - Dashboard coordinador
- `Materias.tsx` - Lista de asignaturas
- `Asignatura.tsx` - Detalle de asignatura
- `Imports.tsx` - Interface de importación CSV

---

## 🏗️ Diagramas Estructurales

### Modelo de Dominio
**Archivo:** `clases/diagrama_clases.puml`

**18+ Clases principales:**
- `TipoDocumento`, `Docente`, `Estudiante`, `Coordinador`
- `Programa`, `PeriodoAcademico`, `Asignatura`
- `ResultadoDeAprendizaje`, `IndicadoresDeLogro`
- `TipoActividad`, `Actividad`
- **`RaActividad`** - Relación N:N entre RA y Actividad con porcentaje
- **`RaActividadIndicador`** - Relación N:N:N entre RA, Actividad e Indicador
- `Matricula`, `NotasActividad`
- `Recurso`, `ImportAudit`, `PasswordResetOTP`

**Características destacadas:**
- Sistema de actividades **multi-RA** (una actividad puede estar en varios RAs)
- Cada RA-Actividad tiene su propio porcentaje
- Indicadores específicos por cada RA en la actividad
- Auditoría de importaciones con registro de errores

---

### Arquitectura de Paquetes
**Archivo:** `paquetes/diagrama_paquetes.puml`

**Organización:**
- `frontend/` - React + TypeScript
  - `pages/` - Estudiante, Docente, Coordinador
  - `components/` - 15 componentes reutilizables
  - `services/` - API, Auth, HTTP
  - `state/` - Context API
- `backend/` - Django + DRF
  - `models/` - Modelos del dominio
  - `views/` - 30+ endpoints REST
  - `serializers/` - Serialización JSON
  - `middleware/` - Error handling
- `database/` - PostgreSQL 14+

---

### Base de Datos
**Archivo:** `entidad_relacion/diagrama_er.puml`

**Relaciones clave:**
- N:N entre `Estudiante` ↔ `Asignatura` (via `Matricula`)
- N:N entre `RA` ↔ `Actividad` (via `RaActividad`)
- N:N:N entre `RA` ↔ `Actividad` ↔ `Indicador` (via `RaActividadIndicador`)
- 1:N entre `RaActividad` ↔ `NotasActividad` (notas por estudiante)
- Constraints: CHECK porcentajes, UNIQUE para evitar duplicados

---

### Componentes de Software
**Archivo:** `componentes/diagrama_componentes.puml`

**Capas:**
- **Frontend**: React Router → Pages → Components → Services
- **Backend**: URLs → Views → Serializers → Models → ORM
- **Database**: PostgreSQL con índices y constraints
- **Storage**: Filesystem para avatares y recursos

---

### Arquitectura de Despliegue
**Archivo:** `despliegue/diagrama_despliegue.puml`

**Nodos:**
- Cliente Web (navegador)
- Servidor de Aplicación (Django + Vite dev server)
- Servidor de Base de Datos (PostgreSQL)
- Filesystem (media files)

---

## 🔑 Funcionalidades Clave Documentadas

### 1. Sistema de Actividades Multi-RA ⭐
**Archivos relacionados:**
- `secuencia/secuencia_docente_crear_actividad.puml` - Creación
- `secuencia/secuencia_estudiante_notas.puml` - Vista estudiante
- `clases/diagrama_clases.puml` - Modelo `RaActividad`, `RaActividadIndicador`

**Características:**
- Una actividad puede estar asociada a múltiples RAs
- Cada RA tiene su propio porcentaje en la actividad
- Cada RA puede tener indicadores diferentes en la misma actividad
- Validación: suma de porcentajes = 100%
- Los estudiantes ven la actividad agrupada con todos sus RAs

---

### 2. Sistema de Calificación Progresiva 📊
**Archivos relacionados:**
- `secuencia/secuencia_estudiante_notas.puml` - Vista de resumen
- `secuencia/secuencia_calificar.puml` - Proceso de calificación
- `flujo/flujo_calificacion.puml` - Flujo completo

**Métricas calculadas:**
- **Nota Progresiva (RA)**: Promedio ponderado de actividades calificadas del RA
- **Nota Estricta (RA)**: Nota sobre el total del RA (incluye actividades sin calificar)
- **Nota Progresiva (Curso)**: Promedio de RAs ponderado por % de cada RA
- **Nota Estricta (Curso)**: Nota sobre el total del curso
- **Cobertura**: Porcentaje de actividades calificadas

---

### 3. Sistema de Importación CSV 📥
**Archivos relacionados:**
- `secuencia/secuencia_coordinador_importacion.puml` - Flujo detallado
- `flujo/flujo_importacion.puml` - Flujo general
- `clases/diagrama_clases.puml` - Modelo `ImportAudit`

**Tipos de importación:**
1. **Matriculados**: `codigo_estudiante,codigo_asignatura,periodo`
   - Valida estudiante, asignatura y periodo existen
   - Crea registros de `NotasActividad` para actividades existentes
   
2. **Docentes**: `codigo_docente,codigo_asignatura`
   - Valida docente y asignatura existen
   - Asigna docente a asignatura
   
3. **Asignaturas y RAs**: `codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind`
   - Crea estructura completa: Asignatura → RAs → Indicadores
   - Valida suma de porcentajes de RAs = 100%

**Características:**
- Transacciones atómicas (rollback en errores críticos)
- Auditoría completa con `ImportAudit`
- Registro de errores y warnings por fila
- Historial de importaciones consultable

---

### 4. Sistema de Recursos Educativos 📚
**Archivos relacionados:**
- `secuencia/secuencia_docente_recursos.puml` - Gestión completa
- `clases/diagrama_clases.puml` - Modelo `Recurso`

**Características:**
- Upload de archivos: PDF, DOCX, PPTX, XLSX, ZIP, imágenes
- Límite: 10MB por archivo
- Almacenamiento: `/media/recursos/<codigo_asignatura>/<timestamp>_<filename>`
- Notificaciones a estudiantes cuando se sube nuevo recurso
- Descarga directa desde filesystem
- Validaciones de seguridad (extensión, tamaño, malware básico)

---

### 5. Sistema de Autenticación y Recuperación 🔐
**Archivos relacionados:**
- `secuencia/secuencia_login_recuperacion.puml` - Flujo completo

**Características:**
- Login con JWT (signing.dumps())
- Recuperación de contraseña con OTP (6 dígitos)
- Envío de OTP por email (SMTP)
- Expiración de OTP: 15 minutos
- Validación de OTP antes de reset
- Modelo `PasswordResetOTP` para auditoría

---

## 🔍 Endpoints API Documentados

**Total: 30+ endpoints REST**

**Autenticación:**
- `POST /api/auth/login/` - Login
- `GET /api/auth/me/` - Usuario actual
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/forgot/` - Olvidé contraseña
- `POST /api/auth/verify-otp/` - Verificar OTP
- `POST /api/auth/reset/` - Resetear contraseña

**Coordinador:**
- `GET /api/coordinador/asignaturas/` - Lista de asignaturas
- `GET /api/asignaturas/:codigo/ras/` - RAs de asignatura
- `GET /api/asignaturas/:codigo/estudiantes/` - Estudiantes matriculados
- `GET /api/asignaturas/:codigo/avance/` - Estadísticas de avance
- `POST /api/coordinador/import-matriculados/` - Importar matriculados
- `POST /api/coordinador/import-docentes/` - Importar docentes
- `POST /api/coordinador/import-asignaturas-ras/` - Importar asignaturas
- `GET /api/coordinador/import-audits/` - Historial de importaciones

**Docente:**
- `GET /api/asignaturas/:codigo/actividades-agrupadas/` - Actividades multi-RA
- `POST /api/asignaturas/:codigo/actividades/` - Crear actividad multi-RA
- `GET /api/ras/:raId/indicadores/` - Indicadores de un RA
- `GET /api/asignaturas/:codigo/recursos/` - Recursos del curso
- `POST /api/recursos/` - Subir recurso
- `DELETE /api/recursos/:id/` - Eliminar recurso
- `POST /api/notas/` - Calificar estudiante

**Estudiante:**
- `GET /api/asignaturas/` - Lista de cursos
- `GET /api/cursos/:codigo/estudiantes/:id/resumen/` - Resumen de calificaciones
- `GET /api/estudiante/notificaciones/` - Notificaciones

**Común:**
- `GET /api/auth/profile/` - Perfil completo
- `PUT /api/auth/profile/` - Actualizar perfil
- `POST /api/auth/change-password/` - Cambiar contraseña
- `POST /api/upload-avatar/` - Subir avatar
- `GET /api/tipos-actividad/` - Tipos de actividad

---

## 🛠️ Tecnologías Reflejadas en Diagramas

**Backend:**
- Django 5.2.6
- Django REST Framework
- PostgreSQL 14+
- Python 3.11+
- JWT (signing.dumps())
- SMTP para emails

**Frontend:**
- React 18.3.1
- TypeScript 5.6+
- Vite 6.0
- React Router 7.1
- Axios para HTTP
- Context API para estado

**Almacenamiento:**
- PostgreSQL (datos estructurados)
- Filesystem (avatares, recursos)

---

## 📖 Cómo Usar Este Índice

1. **Por Rol**: Si eres estudiante, docente o coordinador, ve a tu sección
2. **Por Funcionalidad**: Busca la funcionalidad específica (importación, calificación, etc.)
3. **Por Tipo de Diagrama**: Si necesitas un tipo específico (secuencia, clases, etc.)

---

## 🔗 Enlaces Relacionados

- **[README.md](./README.md)** - Guía de uso, convenciones y herramientas PlantUML
- **[Código Backend](../../backend/api/)** - Implementación de modelos, views, serializers
- **[Código Frontend](../../frontend/src/)** - Componentes React y páginas
- **[Documentación OTP](../../backend/docs/OTP_SYSTEM_COMPLETE.md)** - Sistema de recuperación
- **[Documentación Email](../../backend/docs/EMAIL_SETUP.md)** - Configuración SMTP

---

## 🆕 Funcionalidades Adicionales Documentadas

### 6. Sistema de Notificaciones 🔔
**Archivos relacionados:**
- `secuencia/secuencia_notificaciones.puml` - Flujo completo del sistema

**Características:**
- Cache en memoria (`_NOTIFICATIONS_CACHE`)
- Polling cada 30 segundos desde frontend
- Badge con contador de notificaciones no leídas
- Marcar como leída (actualización en cache)

**Tipos de notificaciones:**
1. **nueva_calificacion**: Cuando docente califica actividad
2. **nueva_actividad**: Cuando docente crea actividad
3. **actividad_venciendo**: 24-48h antes del cierre
4. **nuevo_recurso**: Cuando docente sube recurso
5. **actividad_vencida**: Después del cierre sin nota
6. **retroalimentacion**: Cuando docente actualiza comentario

**Limitaciones actuales:**
- Cache in-memory (se pierde al reiniciar servidor)
- No hay persistencia en base de datos

**Mejoras sugeridas:**
- Persistir en tabla `notificaciones`
- Usar Redis para cache distribuido
- Implementar WebSockets para push en tiempo real

---

### 7. Gestión de Perfil 👤
**Archivos relacionados:**
- `secuencia/secuencia_perfil.puml` - Flujo completo

**Funcionalidades compartidas por todos los roles:**

**Ver Perfil:**
- Datos personales (nombre, código, email, tipo documento)
- Avatar/foto de perfil
- Información académica según rol:
  * **Estudiante**: Periodos académicos matriculados
  * **Docente**: Asignaturas que imparte
  * **Coordinador**: Programas que coordina

**Editar Perfil:**
- Actualizar nombre, email, teléfono
- Validación de email único
- Campos no editables: código, tipo documento, rol

**Cambiar Avatar:**
- Formatos: JPG, PNG, GIF
- Tamaño máximo: 2MB
- Dimensiones mínimas: 100x100px
- Validaciones: formato, tamaño, seguridad
- Almacenamiento: `/media/avatars/<rol>_<id>_<timestamp>`
- Eliminación de avatar anterior automática

**Cambiar Contraseña:**
- Validar contraseña actual
- Nueva contraseña mínimo 8 caracteres
- Confirmación de nueva contraseña
- Hash con PBKDF2-SHA256

---

### 8. Endpoint de Actividades Agrupadas 📋
**Endpoint:** `GET /api/asignaturas/:codigo/actividades-agrupadas/`

**Propósito crítico:**
Resuelve el problema de **duplicación** cuando una actividad está asociada a múltiples RAs.

**Respuesta:**
```json
[
  {
    "id_actividad": 1,
    "nombre_actividad": "Taller 1: Álgebra Lineal",
    "porcentaje_total": 100,
    "nota": 4.5,
    "ras_asociados": [
      {
        "id_ra": 1,
        "titulo_ra": "RA1 - Matrices",
        "porcentaje_ra": 40,
        "porcentaje_actividad": 40,
        "indicadores": [
          {"id_ind": 1, "descripcion": "Resolver sistemas 2x2"},
          {"id_ind": 2, "descripcion": "Calcular determinantes"}
        ]
      },
      {
        "id_ra": 2,
        "titulo_ra": "RA2 - Espacios Vectoriales",
        "porcentaje_ra": 60,
        "porcentaje_actividad": 60,
        "indicadores": [
          {"id_ind": 3, "descripcion": "Identificar bases"}
        ]
      }
    ]
  }
]
```

**Usado por:**
- Estudiantes: Ver sus actividades sin duplicados
- Docentes: Ver lista de actividades del curso

---

### 9. CrearActividad vs NuevaActividad 🆚

**`NuevaActividad.tsx`** (Simple):
- Crear actividad para **un solo RA**
- Formulario básico
- Usado desde ruta: `/docente/:curso/actividades/nueva`

**`CrearActividad.tsx`** (Avanzado):
- Crear actividad para **múltiples RAs simultáneamente**
- Selección de checkboxes de RAs
- Input de porcentaje por cada RA
- Select múltiple de indicadores por cada RA
- Validación: suma de porcentajes = 100%
- Usado desde página de gestión de actividades

---

## 📈 Estadísticas de Documentación

**Total de diagramas PlantUML:** 18 archivos

**Distribución por tipo:**
- ✅ Casos de Uso: 3 (separados por usuario)
- ✅ Secuencia: 10 (incluye login, estudiante x2, docente x3, coordinador x2, notificaciones, perfil)
- ✅ Flujo: 3 (calificación, importación, crear actividad multi-RA)
- ✅ Clases: 1 (18+ modelos)
- ✅ ER: 1 (base de datos completa)
- ✅ Paquetes: 1
- ✅ Componentes: 1
- ✅ Despliegue: 1

**Endpoints documentados:** 30+  
**Modelos documentados:** 18+  
**Páginas frontend:** 15+  
**Componentes React:** 15+

**Funcionalidades clave cubiertas:**
1. ✅ Sistema Multi-RA (actividades en múltiples RAs)
2. ✅ Calificación Progresiva vs Estricta
3. ✅ Importación CSV (3 tipos con auditoría)
4. ✅ Recursos Educativos (upload/download)
5. ✅ Sistema de Notificaciones (6 tipos)
6. ✅ Gestión de Perfil (ver, editar, avatar, contraseña)
7. ✅ Autenticación con OTP (recuperación segura)
8. ✅ Actividades Agrupadas (sin duplicación)

---

**Última actualización**: Diciembre 2025  
**Diagramas totales**: 18 archivos PlantUML  
**Estado**: ✅ **COMPLETAMENTE DOCUMENTADO** - Sistema multi-RA, importaciones, notificaciones, perfil, y todas las funcionalidades principales
  - Backend: `estudiante_views`, `grade_views`

#### Docente
- **Casos de Uso:** `casos_de_uso/casos_uso_docente.puml`
- **Secuencia:**
  - `secuencia/secuencia_docente_crear_actividad.puml`
  - `secuencia/secuencia_docente_calificar.puml`
- **Flujo:** `flujo/flujo_calificacion.puml`
- **Componentes relacionados:**
  - Frontend: `DocenteCursos`, `DocenteCalificar`, `NuevaActividad`
  - Backend: `docente_views`, `grade_calculator`

#### Coordinador
- **Casos de Uso:** `casos_de_uso/casos_uso_coordinador.puml`
- **Secuencia:** `secuencia/secuencia_coordinador_importacion.puml`
- **Flujo:** `flujo/flujo_importacion.puml`
- **Componentes relacionados:**
  - Frontend: `CoordinadorMaterias`, `CoordinadorImports`, `CoordinadorAsignatura`
  - Backend: `coordinador_views`, `csv_processor`, `import_audit`

### 🔐 Por Funcionalidad

#### Autenticación y Seguridad
- **Secuencia:** `secuencia/secuencia_login_recuperacion.puml`
- **Casos de Uso:** Incluido en los 3 archivos de casos de uso
- **Modelos:** `Docente`, `Estudiante`, `Coordinador`, `PasswordResetOTP`
- **Características:**
  - Login multi-rol con JWT
  - Recuperación de contraseña con OTP
  - Validación de permisos por rol

#### Gestión Académica
- **Clases:** `clases/diagrama_clases.puml`
- **ER:** `entidad_relacion/diagrama_er.puml`
- **Modelos principales:**
  - `Programa`, `PeriodoAcademico`
  - `Asignatura`, `ResultadoDeAprendizaje`
  - `IndicadoresDeLogro`, `Actividad`

#### Sistema de Calificaciones
- **Secuencia:**
  - `secuencia/secuencia_docente_calificar.puml`
  - `secuencia/secuencia_estudiante_calificaciones.puml`
- **Flujo:** `flujo/flujo_calificacion.puml`
- **Modelos:** `Matricula`, `NotasActividad`, `RaActividad`
- **Características:**
  - Calificación por indicadores específicos
  - Cálculo de nota progresiva y estricta
  - Cálculo de cobertura por RA
  - Retroalimentación personalizada

#### Importación de Datos
- **Secuencia:** `secuencia/secuencia_coordinador_importacion.puml`
- **Flujo:** `flujo/flujo_importacion.puml`
- **Modelo:** `ImportAudit`
- **Tipos de importación:**
  - Matriculados (estudiantes en cursos)
  - Docentes (con generación de contraseñas)
  - Asignaturas y RAs completos

### 🏗️ Por Nivel de Abstracción

#### Nivel Conceptual
1. **Casos de Uso** (3 archivos por rol)
   - Vista de alto nivel de interacciones
   - Funcionalidades por actor
   - Relaciones include/extend

#### Nivel Lógico
2. **Diagrama de Clases:** `clases/diagrama_clases.puml`
   - Modelo de dominio completo
   - Atributos y métodos
   - Relaciones y cardinalidad

3. **Diagrama ER:** `entidad_relacion/diagrama_er.puml`
   - Modelo de base de datos
   - Tipos de datos PostgreSQL
   - Constraints y validaciones

#### Nivel de Proceso
4. **Diagramas de Secuencia** (5 archivos)
   - Flujo temporal de mensajes
   - Interacciones entre componentes
   - Llamadas API y base de datos

5. **Diagramas de Flujo** (2 archivos)
   - Lógica de decisión
   - Validaciones y bifurcaciones
   - Procesamiento paso a paso

#### Nivel Arquitectónico
6. **Diagrama de Paquetes:** `paquetes/diagrama_paquetes.puml`
   - Organización del código
   - Dependencias entre módulos
   - Separación frontend/backend

7. **Diagrama de Componentes:** `componentes/diagrama_componentes.puml`
   - Componentes del sistema
   - Interfaces y contratos
   - Servicios externos

8. **Diagrama de Despliegue:** `despliegue/diagrama_despliegue.puml`
   - Infraestructura física/virtual
   - Nodos y servidores
   - Configuración de producción

## 📊 Matriz de Referencias Cruzadas

| Funcionalidad | Casos de Uso | Secuencia | Flujo | Clases | ER | Componentes |
|--------------|--------------|-----------|-------|--------|-----|-------------|
| Login/Auth | ✓ (3 archivos) | login_recuperacion | - | PasswordResetOTP | ✓ | Auth Service |
| Ver Calificaciones | estudiante | estudiante_calificaciones | - | NotasActividad | ✓ | Grade Views |
| Crear Actividad | docente | docente_crear_actividad | - | Actividad, RaActividad | ✓ | Activity Views |
| Calificar | docente | docente_calificar | calificacion | NotasActividad | ✓ | Grade Calculator |
| Importar CSV | coordinador | coordinador_importacion | importacion | ImportAudit | ✓ | CSV Processor |
| Ver Dashboard | estudiante, docente, coordinador | - | - | - | - | Dashboard Components |
| Gestionar RAs | docente | docente_crear_actividad | - | ResultadoDeAprendizaje | ✓ | Academic Models |

## 🎨 Guía de Colores por Rol

Para mantener consistencia visual en todos los diagramas:

- **Azul claro** (`#E1F5FE`): Estudiante y componentes relacionados
- **Verde claro** (`#E8F5E9`): Docente y componentes relacionados
- **Salmón claro** (`#FFEBEE`): Coordinador y componentes relacionados
- **Amarillo** (`#FFF9C4`): Casos de uso, decisiones, alertas
- **Gris** (`#F5F5F5`): Sistemas externos (email, storage)
- **Morado** (`#E8EAF6`): Backend, servicios, infraestructura

## 🔍 Búsqueda Rápida

### Por Entidad del Modelo
- **Estudiante:** casos_uso_estudiante, diagrama_clases, diagrama_er, secuencia_estudiante_calificaciones
- **Docente:** casos_uso_docente, diagrama_clases, diagrama_er, secuencia_docente_*
- **Coordinador:** casos_uso_coordinador, diagrama_clases, diagrama_er, secuencia_coordinador_*
- **Asignatura:** diagrama_clases, diagrama_er, todos los diagramas de secuencia
- **ResultadoDeAprendizaje (RA):** diagrama_clases, diagrama_er, secuencia_docente_crear_actividad
- **Actividad:** diagrama_clases, diagrama_er, secuencia_docente_crear_actividad, flujo_calificacion
- **NotasActividad:** diagrama_clases, diagrama_er, secuencia_docente_calificar, secuencia_estudiante_calificaciones
- **Matricula:** diagrama_clases, diagrama_er, flujo_importacion, secuencia_coordinador_importacion

### Por Tecnología
- **React/TypeScript:** diagrama_paquetes, diagrama_componentes, todos los diagramas de secuencia (UI layer)
- **Django/Python:** diagrama_paquetes, diagrama_componentes, todos los diagramas de secuencia (Backend)
- **PostgreSQL:** diagrama_er, diagrama_despliegue, todos los diagramas de secuencia (DB layer)
- **JWT/Auth:** secuencia_login_recuperacion, diagrama_componentes
- **REST API:** diagrama_componentes, todos los diagramas de secuencia
- **Gmail SMTP:** secuencia_login_recuperacion, diagrama_despliegue

### Por Patrón de Diseño
- **MVC:** diagrama_paquetes, diagrama_componentes
- **Repository Pattern:** diagrama_clases (models), diagrama_componentes (ORM)
- **Service Layer:** diagrama_componentes (services), diagrama_paquetes
- **Middleware:** diagrama_componentes (error_handler, logger), diagrama_paquetes
- **Context API:** diagrama_componentes (SessionContext), diagrama_paquetes

## 📚 Recomendaciones de Lectura

### Para Nuevos Desarrolladores
1. Empezar con: `README.md`
2. Revisar: `casos_de_uso/` (el rol correspondiente)
3. Estudiar: `diagrama_clases.puml` y `diagrama_er.puml`
4. Profundizar: `secuencia/` (flujos específicos de su rol)
5. Comprender arquitectura: `diagrama_paquetes.puml` y `diagrama_componentes.puml`

### Para Arquitectos de Software
1. `diagrama_componentes.puml` - Arquitectura de 3 capas
2. `diagrama_despliegue.puml` - Infraestructura y escalabilidad
3. `diagrama_paquetes.puml` - Organización del código
4. `diagrama_er.puml` - Diseño de base de datos

### Para Product Owners / Stakeholders
1. `casos_de_uso/` - Funcionalidades por rol
2. `flujo/` - Procesos de negocio críticos
3. `secuencia/` - Flujos de interacción detallados

### Para QA / Testers
1. `casos_de_uso/` - Casos de prueba funcionales
2. `secuencia/` - Flujos de integración end-to-end
3. `flujo/` - Escenarios de validación

## 🔄 Actualización de Diagramas

Cuando actualices el código, recuerda actualizar:

1. **Nuevos modelos:** Actualizar `diagrama_clases.puml` y `diagrama_er.puml`
2. **Nueva funcionalidad:** Actualizar caso de uso correspondiente
3. **Nuevo flujo API:** Crear/actualizar diagrama de secuencia
4. **Nueva tecnología:** Actualizar `diagrama_componentes.puml` y `diagrama_despliegue.puml`

---

**Última actualización:** Diciembre 2025  
**Versión:** 2.0 (Reorganización por roles)
