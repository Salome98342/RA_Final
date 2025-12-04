# 📊 Resumen Completo de Diagramas UML - RA Manager

**Fecha**: Diciembre 2025  
**Sistema**: RA-Manager (Results of Learning Manager)  
**Stack**: Django 5.2.6 + React 18.3 + PostgreSQL 14+  

---

## ✅ Estado de la Documentación

### **COBERTURA: 100%** 🎉

Todas las funcionalidades principales del sistema han sido documentadas en diagramas PlantUML detallados.

---

## 📁 Inventario de Diagramas

### Total: **18 archivos PlantUML**

#### 1️⃣ Casos de Uso (3 archivos)
| Archivo | Usuario | Funcionalidades |
|---------|---------|-----------------|
| `casos_uso_estudiante.puml` | Estudiante | Ver cursos, notas, actividades agrupadas, recursos, notificaciones |
| `casos_uso_docente.puml` | Docente | Crear actividades multi-RA, calificar, subir recursos, importar estudiantes |
| `casos_uso_coordinador.puml` | Coordinador | Dashboard, gestión de asignaturas, importaciones CSV (3 tipos), estadísticas |

#### 2️⃣ Diagramas de Secuencia (10 archivos)

**Autenticación y Perfil:**
- `secuencia_login_recuperacion.puml` - Login + OTP recovery (todos los roles)
- `secuencia_perfil.puml` ⭐ **[NUEVO]** - Gestión de perfil, avatar, contraseña (todos los roles)

**Estudiante:**
- `secuencia_estudiante_notas.puml` ⭐ **[NUEVO]** - Dashboard, actividades agrupadas, resumen calificaciones
- `secuencia_estudiante_calificaciones.puml` - Vista detallada de calificaciones

**Docente:**
- `secuencia_docente_crear_actividad.puml` - Crear actividades multi-RA
- `secuencia_docente_recursos.puml` ⭐ **[NUEVO]** - Upload/download/delete recursos
- `secuencia_calificar.puml` - Proceso de calificación por indicador

**Coordinador:**
- `secuencia_coordinador_importacion.puml` - 3 tipos de importación CSV con auditoría
- `secuencia_coordinador_avance.puml` ⭐ **[NUEVO]** - Estadísticas y avance por curso

**Transversal:**
- `secuencia_notificaciones.puml` ⭐ **[NUEVO]** - Sistema de notificaciones en memoria

#### 3️⃣ Diagramas de Flujo (3 archivos)
- `flujo_calificacion.puml` - Flujo completo de calificación
- `flujo_importacion.puml` - Flujo de importación CSV
- `flujo_crear_actividad_multi_ra.puml` ⭐ **[NUEVO]** - Flujo de creación multi-RA

#### 4️⃣ Diagramas Estructurales (5 archivos)
- `diagrama_clases.puml` - 18+ modelos del dominio
- `diagrama_er.puml` - Base de datos PostgreSQL completa
- `diagrama_paquetes.puml` - Organización en paquetes
- `diagrama_componentes.puml` - Arquitectura de componentes
- `diagrama_despliegue.puml` - Infraestructura de despliegue

---

## 🎯 Funcionalidades Críticas Documentadas

### 1. Sistema de Actividades Multi-RA ⭐⭐⭐

**¿Qué es?**  
Una actividad puede estar asociada a **múltiples Resultados de Aprendizaje (RAs)** con diferentes porcentajes e indicadores.

**Ejemplo:**
```
Taller 1: Álgebra Lineal (100%)
├─ RA1 - Matrices (40%)
│  ├─ IND1: Resolver sistemas 2x2
│  └─ IND2: Calcular determinantes
└─ RA2 - Espacios Vectoriales (60%)
   └─ IND3: Identificar bases
```

**Diagramas relacionados:**
- `secuencia_docente_crear_actividad.puml` - Creación
- `flujo_crear_actividad_multi_ra.puml` - Flujo completo
- `secuencia_estudiante_notas.puml` - Vista estudiante
- `diagrama_clases.puml` - Modelo `RaActividad`, `RaActividadIndicador`

**Tablas DB:**
- `actividad` (1 registro)
- `ra_actividad` (N registros, uno por cada RA)
- `ra_actividad_indicador` (N:N:N entre RA, Actividad e Indicador)
- `notas_actividad` (uno por estudiante por cada ra_actividad)

**Endpoint clave:**
- `POST /api/actividades-multi/` - Crear actividad multi-RA
- `GET /api/asignaturas/:codigo/actividades-agrupadas/` - Vista agrupada sin duplicados

---

### 2. Sistema de Calificación Progresiva 📊

**Métricas calculadas:**

| Métrica | Fórmula | Descripción |
|---------|---------|-------------|
| **Nota Progresiva (RA)** | AVG(notas_calificadas) ponderado | Promedio solo de actividades calificadas |
| **Nota Estricta (RA)** | Nota_obtenida / Total_RA | Nota sobre el total del RA (incluye sin calificar) |
| **Nota Progresiva (Curso)** | Σ(nota_RA × %_RA) | Promedio de RAs ponderado por % |
| **Nota Estricta (Curso)** | Nota_obtenida / Total_curso | Nota sobre el total del curso |
| **Cobertura** | (Actividades_calificadas / Total) × 100 | % de actividades calificadas |

**Diagramas relacionados:**
- `secuencia_estudiante_notas.puml` - Vista de resumen con métricas
- `secuencia_calificar.puml` - Proceso de calificación
- `flujo_calificacion.puml` - Flujo completo

**Endpoint:**
- `GET /api/cursos/:codigo/estudiantes/:id/resumen/` - Resumen de calificaciones

---

### 3. Sistema de Importación CSV 📥

**3 tipos de importación con auditoría completa:**

#### Tipo 1: Matriculados
**CSV:** `codigo_estudiante,codigo_asignatura,periodo`

**Proceso:**
1. Validar estudiante existe
2. Validar asignatura existe
3. Validar periodo existe
4. Crear matrícula
5. Crear `notas_actividad` para actividades existentes
6. Registrar en `ImportAudit`

#### Tipo 2: Docentes
**CSV:** `codigo_docente,codigo_asignatura`

**Proceso:**
1. Validar docente y asignatura existen
2. Asignar docente a asignatura
3. Auditoría

#### Tipo 3: Asignaturas y RAs
**CSV:** `codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind`

**Proceso:**
1. Crear/actualizar asignatura
2. Crear RAs con porcentajes
3. Crear indicadores por RA
4. **Validar suma de % RAs = 100%**
5. Auditoría

**Características:**
- Transacciones atómicas (rollback en errores)
- Registro de errores por fila
- Historial consultable
- Reporte detallado post-importación

**Diagramas relacionados:**
- `secuencia_coordinador_importacion.puml` - Flujo detallado
- `flujo_importacion.puml` - Flujo general

**Endpoints:**
- `POST /api/coordinador/import-matriculados/`
- `POST /api/coordinador/import-docentes/`
- `POST /api/coordinador/import-asignaturas-ras/`
- `GET /api/coordinador/import-audits/` - Historial

---

### 4. Sistema de Recursos Educativos 📚

**Características:**
- **Upload**: PDF, DOCX, PPTX, XLSX, ZIP, imágenes
- **Límite**: 10MB por archivo
- **Almacenamiento**: `/media/recursos/<codigo_asignatura>/<timestamp>_<filename>`
- **Validaciones**: Formato, tamaño, seguridad básica
- **Notificaciones**: Automáticas a estudiantes matriculados
- **Download**: Directo desde filesystem
- **Delete**: Con confirmación y validación de permisos

**Diagramas relacionados:**
- `secuencia_docente_recursos.puml` - Gestión completa

**Endpoints:**
- `GET /api/asignaturas/:codigo/recursos/` - Listar recursos
- `POST /api/recursos/` - Subir recurso
- `DELETE /api/recursos/:id/` - Eliminar recurso
- `GET /media/recursos/:path` - Descargar archivo

---

### 5. Sistema de Notificaciones 🔔

**Arquitectura actual:**
- Cache en memoria: `_NOTIFICATIONS_CACHE`
- Polling cada 30 segundos
- Badge con contador de no leídas

**6 tipos de notificaciones:**
1. **nueva_calificacion**: Docente califica actividad
2. **nueva_actividad**: Docente crea actividad
3. **actividad_venciendo**: 24-48h antes del cierre
4. **nuevo_recurso**: Docente sube recurso
5. **actividad_vencida**: Después del cierre sin nota
6. **retroalimentacion**: Docente actualiza comentario

**Estructura de notificación:**
```python
{
  'id': uuid,
  'tipo': 'nueva_calificacion',
  'mensaje': 'Nueva nota en Taller 1',
  'fecha': datetime.now(),
  'leida': False,
  'metadata': {'curso': 'MAT101', 'actividad': 'Taller 1', 'nota': 4.5}
}
```

**Limitaciones actuales:**
- ⚠️ Cache in-memory (se pierde al reiniciar)
- ⚠️ No hay persistencia en DB
- ⚠️ Polling (no push en tiempo real)

**Mejoras recomendadas:**
- ✅ Persistir en tabla `notificaciones`
- ✅ Usar Redis para cache distribuido
- ✅ Implementar WebSockets para push

**Diagramas relacionados:**
- `secuencia_notificaciones.puml` - Sistema completo

**Endpoint:**
- `GET /api/notificaciones/` - Obtener notificaciones del usuario
- `PATCH /api/notificaciones/:id/` - Marcar como leída

---

### 6. Gestión de Perfil 👤

**Funcionalidades para todos los roles:**

#### Ver Perfil
- Datos personales: nombre, código, email, tipo documento
- Avatar/foto de perfil
- Información académica:
  - **Estudiante**: Periodos matriculados
  - **Docente**: Asignaturas que imparte
  - **Coordinador**: Programas que coordina

#### Editar Perfil
- Campos editables: nombre, email, teléfono
- Validación de email único
- Campos fijos: código, documento, rol

#### Cambiar Avatar
- Formatos: JPG, PNG, GIF
- Tamaño: hasta 2MB
- Dimensiones: mínimo 100×100px
- Storage: `/media/avatars/<rol>_<id>_<timestamp>.jpg`
- Eliminación automática de avatar anterior

#### Cambiar Contraseña
- Validar contraseña actual
- Mínimo 8 caracteres
- Hash: PBKDF2-SHA256

**Diagramas relacionados:**
- `secuencia_perfil.puml` - Flujo completo

**Endpoints:**
- `GET /api/auth/profile/` - Ver perfil
- `PUT /api/auth/profile/` - Editar perfil
- `POST /api/upload-avatar/` - Subir avatar
- `POST /api/auth/change-password/` - Cambiar contraseña

---

### 7. Autenticación con OTP 🔐

**Sistema de recuperación segura:**
1. Usuario solicita recuperación (email)
2. Sistema genera OTP de 6 dígitos
3. OTP se envía por email (SMTP)
4. OTP expira en 15 minutos
5. Usuario verifica OTP
6. Sistema valida OTP
7. Usuario restablece contraseña
8. OTP se marca como usado

**Modelo DB:** `PasswordResetOTP`
- `codigo_otp`: 6 dígitos
- `fecha_creacion`: Timestamp
- `fecha_expiracion`: +15 minutos
- `usado`: Boolean

**Diagramas relacionados:**
- `secuencia_login_recuperacion.puml` - Flujo completo

**Endpoints:**
- `POST /api/auth/login/` - Login
- `POST /api/auth/forgot/` - Solicitar OTP
- `POST /api/auth/verify-otp/` - Verificar OTP
- `POST /api/auth/reset/` - Resetear contraseña
- `POST /api/auth/logout/` - Logout

---

## 🔍 Endpoints API Documentados

### Total: **30+ endpoints REST**

**Autenticación (7):**
- POST `/api/auth/login/`
- GET `/api/auth/me/`
- POST `/api/auth/logout/`
- POST `/api/auth/forgot/`
- POST `/api/auth/verify-otp/`
- POST `/api/auth/reset/`
- GET `/api/auth/profile/`

**Coordinador (8):**
- GET `/api/coordinador/asignaturas/`
- GET `/api/asignaturas/:codigo/ras/`
- GET `/api/asignaturas/:codigo/estudiantes/`
- GET `/api/asignaturas/:codigo/avance/`
- POST `/api/coordinador/import-matriculados/`
- POST `/api/coordinador/import-docentes/`
- POST `/api/coordinador/import-asignaturas-ras/`
- GET `/api/coordinador/import-audits/`

**Docente (9):**
- GET `/api/asignaturas/`
- GET `/api/asignaturas/:codigo/actividades-agrupadas/` ⭐
- POST `/api/actividades-multi/` ⭐
- POST `/api/asignaturas/:codigo/actividades/`
- GET `/api/ras/:raId/indicadores/`
- GET `/api/asignaturas/:codigo/recursos/`
- POST `/api/recursos/`
- DELETE `/api/recursos/:id/`
- POST `/api/notas/`

**Estudiante (4):**
- GET `/api/asignaturas/`
- GET `/api/cursos/:codigo/estudiantes/:id/resumen/`
- GET `/api/notificaciones/`
- GET `/media/recursos/:path`

**Común (5):**
- PUT `/api/auth/profile/`
- POST `/api/auth/change-password/`
- POST `/api/upload-avatar/`
- GET `/api/tipos-actividad/`
- GET `/api/periodos/current/`

---

## 🗄️ Modelos del Dominio

### Total: **18+ clases Django**

**Usuarios y Autenticación:**
- `TipoDocumento`
- `Docente`
- `Estudiante`
- `Coordinador`
- `PasswordResetOTP`

**Estructura Académica:**
- `Programa`
- `PeriodoAcademico`
- `Asignatura`

**Resultados de Aprendizaje:**
- `ResultadoDeAprendizaje`
- `IndicadoresDeLogro`

**Actividades y Calificación:**
- `TipoActividad`
- `Actividad`
- `RaActividad` ⭐ (N:N entre RA y Actividad)
- `RaActividadIndicador` ⭐ (N:N:N)
- `Matricula`
- `NotasActividad`

**Recursos y Auditoría:**
- `Recurso`
- `ImportAudit`

---

## 🎨 Frontend: Páginas y Componentes

### Páginas (15+)

**Públicas:**
- `Login.tsx`
- `Recuperar.tsx`
- `Reset.tsx`

**Estudiante:**
- `Estudiante.tsx` - Dashboard

**Docente:**
- `Docente.tsx` - Dashboard (redirect a Cursos)
- `Cursos.tsx` - Lista de cursos
- `RAs.tsx` - Gestión de RAs
- `NuevaActividad.tsx` - Formulario simple (1 RA)
- `CrearActividad.tsx` - Formulario avanzado (múltiples RAs) ⭐
- `Calificar.tsx` - Calificación de estudiantes
- `Recursos.tsx` - Gestión de recursos

**Coordinador:**
- `Dashboard.tsx` - Redirect a Materias
- `Materias.tsx` - Lista de asignaturas
- `Asignatura.tsx` - Detalle de asignatura
- `Imports.tsx` - Importaciones CSV

**Compartido:**
- `Profile.tsx` - Gestión de perfil

### Componentes React (15+)
- `HeaderBar.tsx`
- `Sidebar.tsx`
- `NotificationsBell.tsx` ⭐
- `Alert.tsx`
- `Toast.tsx`
- `Spinner.tsx`
- `Skeleton.tsx`
- `ConfirmDialog.tsx`
- `Dropdown.tsx`
- `SearchPill.tsx`
- `GradeSummary.tsx` ⭐
- `RaCard.tsx`
- `CardGrid.tsx`
- `ActivityDetailsModal.tsx` ⭐
- `StudentList.tsx`

---

## 🛠️ Stack Tecnológico

**Backend:**
- Python 3.11+
- Django 5.2.6
- Django REST Framework
- PostgreSQL 14+
- JWT (signing.dumps())
- SMTP (Gmail)

**Frontend:**
- React 18.3.1
- TypeScript 5.6+
- Vite 6.0
- React Router 7.1
- Axios
- Context API

**Storage:**
- PostgreSQL (datos estructurados)
- Filesystem (avatares, recursos)

---

## 📝 Archivos de Documentación

1. **README.md** - Guía principal con instrucciones de uso
2. **INDICE.md** - Navegación rápida por usuario y categoría
3. **RESUMEN_COMPLETO.md** - Este archivo

---

## 🎓 Convenciones de Diagramas

### Colores y Estilos
- **Verde** (`#27AE60`): Inicio de flujos
- **Rojo** (`#E74C3C`): Fin de flujos / errores
- **Azul** (`#3498DB`): Actores principales
- **Gris** (`#34495E`): Componentes del sistema

### Notación
- `⭐` - Diagrama nuevo o actualizado recientemente
- `✅` - Funcionalidad completamente documentada
- `⚠️` - Limitación o mejora pendiente

### Nomenclatura de Archivos
- `casos_uso_[rol].puml` - Casos de uso por rol
- `secuencia_[actor]_[accion].puml` - Diagramas de secuencia
- `flujo_[proceso].puml` - Diagramas de flujo
- `diagrama_[tipo].puml` - Diagramas estructurales

---

## ✅ Checklist de Completitud

### Casos de Uso
- [x] Estudiante
- [x] Docente
- [x] Coordinador

### Flujos de Secuencia
**Autenticación:**
- [x] Login
- [x] Recuperación con OTP
- [x] Gestión de perfil
- [x] Cambio de contraseña

**Estudiante:**
- [x] Ver dashboard y cursos
- [x] Consultar actividades agrupadas
- [x] Ver resumen de calificaciones
- [x] Descargar recursos

**Docente:**
- [x] Crear actividades (simple y multi-RA)
- [x] Calificar estudiantes
- [x] Gestionar recursos

**Coordinador:**
- [x] Importar matriculados
- [x] Importar docentes
- [x] Importar asignaturas y RAs
- [x] Consultar estadísticas

**Transversal:**
- [x] Sistema de notificaciones

### Diagramas Estructurales
- [x] Clases (18+ modelos)
- [x] ER (base de datos)
- [x] Paquetes
- [x] Componentes
- [x] Despliegue

### Flujos de Actividad
- [x] Calificación
- [x] Importación
- [x] Crear actividad multi-RA

---

## 🚀 Cómo Usar Esta Documentación

### Para Desarrolladores
1. **Entender el sistema**: Empieza por `INDICE.md`
2. **Implementar funcionalidad**: Busca el diagrama de secuencia correspondiente
3. **Diseñar base de datos**: Consulta `diagrama_er.puml` y `diagrama_clases.puml`
4. **Agregar endpoints**: Revisa endpoints existentes en este documento

### Para Product Owners
1. **Ver funcionalidades por usuario**: Navega por los casos de uso separados
2. **Entender flujos**: Consulta diagramas de flujo
3. **Priorizar features**: Usa las estadísticas de cobertura

### Para QA/Testers
1. **Casos de prueba**: Basados en diagramas de secuencia
2. **Flujos alternativos**: Documentados en diagramas de flujo
3. **Validaciones**: Detalladas en cada diagrama

---

## 📞 Contacto y Contribución

Para modificar o agregar diagramas:
1. Edita archivos `.puml` en `docs/diagramas/`
2. Sigue las convenciones de nomenclatura
3. Actualiza `README.md` e `INDICE.md`
4. Verifica renderizado con PlantUML

---

**Proyecto**: RA-Manager  
**Repositorio**: Salome98342/RA_Final  
**Rama**: main  
**Última actualización**: Diciembre 4, 2025  

**Estado**: ✅ **DOCUMENTACIÓN COMPLETA** 🎉
