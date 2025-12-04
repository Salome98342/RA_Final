# Modelo Relacional - RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Sistema**: RA-Manager (Results of Learning Manager)

---

## 1. Descripción General del Modelo

El modelo relacional de RA-Manager está diseñado para gestionar un sistema académico centrado en **Resultados de Aprendizaje (RAs)**. La estructura permite:

- Gestión de programas académicos, asignaturas y sus RAs
- Relaciones multi-RA en actividades (una actividad puede evaluar múltiples RAs)
- Calificación progresiva por indicadores
- Auditoría de importaciones masivas
- Sistema de notificaciones
- Recuperación de contraseña con OTP

---

## 2. Entidades Principales

### 2.1 Entidad: **USUARIO** (User)

**Descripción**: Entidad base para todos los usuarios del sistema (herencia común).

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| codigo | VARCHAR(20) | UNIQUE, NOT NULL | Código institucional |
| nombre | VARCHAR(100) | NOT NULL | Nombre completo |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Correo electrónico |
| documento | VARCHAR(20) | UNIQUE, NOT NULL | Documento de identidad |
| contrasena | VARCHAR(255) | NOT NULL | Hash PBKDF2 de contraseña |
| fecha_creacion | TIMESTAMP | DEFAULT NOW() | Fecha de registro |
| ultimo_acceso | TIMESTAMP | NULL | Último inicio de sesión |
| activo | BOOLEAN | DEFAULT TRUE | Estado del usuario |

**Relaciones**:
- Superclase de: `ESTUDIANTE`, `DOCENTE`, `COORDINADOR`

**Índices**:
- `idx_user_codigo` ON codigo
- `idx_user_email` ON email

---

### 2.2 Entidad: **ESTUDIANTE** (Estudiante)

**Descripción**: Estudiante matriculado en el sistema.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_estudiante** | INTEGER | PK, FK(User.id) | Identificador (hereda de User) |
| avatar | VARCHAR(255) | NULL | Ruta del archivo de avatar |

**Relaciones**:
- HEREDA DE: `USUARIO` (1:1)
- PARTICIPA EN: `MATRICULA` (1:N) → Un estudiante tiene muchas matrículas
- RECIBE: `NOTAS_ACTIVIDAD` (1:N) → Un estudiante tiene muchas notas
- RECIBE: `NOTIFICACION` (1:N)

**Índices**:
- PK heredada de User

---

### 2.3 Entidad: **DOCENTE** (Docente)

**Descripción**: Docente que imparte asignaturas.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_docente** | INTEGER | PK, FK(User.id) | Identificador (hereda de User) |
| especialidad | VARCHAR(100) | NULL | Área de especialidad |
| avatar | VARCHAR(255) | NULL | Ruta del archivo de avatar |

**Relaciones**:
- HEREDA DE: `USUARIO` (1:1)
- IMPARTE: `ASIGNATURA` (1:N) → Un docente imparte muchas asignaturas
- CREA: `ACTIVIDAD` (1:N) → Un docente crea muchas actividades
- SUBE: `RECURSO` (1:N)
- RECIBE: `NOTIFICACION` (1:N)

**Índices**:
- PK heredada de User

---

### 2.4 Entidad: **COORDINADOR** (Coordinador)

**Descripción**: Coordinador académico del programa.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_coordinador** | INTEGER | PK, FK(User.id) | Identificador (hereda de User) |
| avatar | VARCHAR(255) | NULL | Ruta del archivo de avatar |

**Relaciones**:
- HEREDA DE: `USUARIO` (1:1)
- GESTIONA: `PROGRAMA` (1:N) → Un coordinador gestiona muchos programas
- REALIZA: `IMPORT_AUDIT` (1:N) → Registros de importaciones
- RECIBE: `NOTIFICACION` (1:N)

**Índices**:
- PK heredada de User

---

### 2.5 Entidad: **PROGRAMA** (Programa)

**Descripción**: Programa académico (carrera).

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_programa** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| codigo_programa | VARCHAR(20) | UNIQUE, NOT NULL | Código del programa |
| nombre_programa | VARCHAR(100) | NOT NULL | Nombre del programa |
| descripcion | TEXT | NULL | Descripción del programa |

**Relaciones**:
- CONTIENE: `ASIGNATURA` (1:N) → Un programa tiene muchas asignaturas
- COORDINADO POR: `COORDINADOR` (N:1)

**Índices**:
- `idx_programa_codigo` ON codigo_programa

---

### 2.6 Entidad: **ASIGNATURA** (Asignatura)

**Descripción**: Asignatura/curso del programa.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_asignatura** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| codigo_asignatura | VARCHAR(20) | UNIQUE, NOT NULL | Código de la asignatura |
| nombre_asignatura | VARCHAR(100) | NOT NULL | Nombre de la asignatura |
| creditos | INTEGER | CHECK >= 1 | Créditos académicos |
| periodo_academico | VARCHAR(20) | NOT NULL | Periodo (ej: 2025-1) |
| id_programa | INTEGER | FK(Programa.id) | Programa al que pertenece |
| id_docente | INTEGER | FK(Docente.id), NULL | Docente asignado |

**Relaciones**:
- PERTENECE A: `PROGRAMA` (N:1)
- IMPARTIDA POR: `DOCENTE` (N:1)
- TIENE: `RA` (1:N) → Una asignatura tiene muchos RAs
- TIENE: `MATRICULA` (1:N) → Una asignatura tiene muchas matrículas
- TIENE: `ACTIVIDAD` (1:N)
- TIENE: `RECURSO` (1:N)

**Índices**:
- `idx_asignatura_codigo` ON codigo_asignatura
- `idx_asignatura_periodo` ON periodo_academico
- `idx_asignatura_docente` ON id_docente

**Restricciones de Negocio**:
- `creditos` >= 1

---

### 2.7 Entidad: **RA** (Resultado de Aprendizaje)

**Descripción**: Resultado de Aprendizaje de una asignatura.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_ra** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| codigo_ra | VARCHAR(20) | NOT NULL | Código del RA (ej: RA1) |
| nombre_ra | VARCHAR(200) | NOT NULL | Descripción del RA |
| porcentaje | DECIMAL(5,2) | CHECK 0-100 | Porcentaje del RA en la asignatura |
| id_asignatura | INTEGER | FK(Asignatura.id) | Asignatura a la que pertenece |

**Relaciones**:
- PERTENECE A: `ASIGNATURA` (N:1)
- TIENE: `INDICADOR` (1:N) → Un RA tiene muchos indicadores
- SE EVALÚA EN: `RA_ACTIVIDAD` (N:M con ACTIVIDAD)

**Índices**:
- `idx_ra_asignatura` ON id_asignatura
- `idx_ra_codigo` ON codigo_ra

**Restricciones de Negocio**:
- `porcentaje` entre 0 y 100
- La suma de `porcentajes` de todos los RAs de una asignatura debe ser 100

---

### 2.8 Entidad: **INDICADOR** (Indicador)

**Descripción**: Criterio de evaluación de un RA.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_indicador** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| codigo_indicador | VARCHAR(20) | NOT NULL | Código del indicador |
| nombre_indicador | VARCHAR(200) | NOT NULL | Descripción del indicador |
| id_ra | INTEGER | FK(Ra.id) | RA al que pertenece |

**Relaciones**:
- PERTENECE A: `RA` (N:1)
- SE EVALÚA EN: `RA_ACTIVIDAD_INDICADOR` (relación con actividades)

**Índices**:
- `idx_indicador_ra` ON id_ra

---

### 2.9 Entidad: **TIPO_ACTIVIDAD** (TipoActividad)

**Descripción**: Catálogo de tipos de actividades.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_tipo_actividad** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| nombre_tipo | VARCHAR(50) | UNIQUE, NOT NULL | Nombre del tipo (Quiz, Taller, Parcial, etc.) |

**Relaciones**:
- CLASIFICA: `ACTIVIDAD` (1:N)

**Valores Predefinidos**:
- Quiz
- Taller
- Laboratorio
- Parcial
- Proyecto
- Trabajo Final
- Exposición

---

### 2.10 Entidad: **ACTIVIDAD** (Actividad)

**Descripción**: Actividad académica evaluativa.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_actividad** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| nombre_actividad | VARCHAR(100) | NOT NULL | Nombre de la actividad |
| descripcion | TEXT | NULL | Descripción detallada |
| fecha_creacion | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| fecha_cierre | DATE | NULL | Fecha límite de entrega |
| id_asignatura | INTEGER | FK(Asignatura.id) | Asignatura a la que pertenece |
| id_docente | INTEGER | FK(Docente.id) | Docente que creó la actividad |
| id_tipo_actividad | INTEGER | FK(TipoActividad.id) | Tipo de actividad |

**Relaciones**:
- PERTENECE A: `ASIGNATURA` (N:1)
- CREADA POR: `DOCENTE` (N:1)
- ES DE TIPO: `TIPO_ACTIVIDAD` (N:1)
- EVALÚA: `RA_ACTIVIDAD` (1:N) → **Relación multi-RA**
- TIENE: `NOTAS_ACTIVIDAD` (1:N)

**Índices**:
- `idx_actividad_asignatura` ON id_asignatura
- `idx_actividad_docente` ON id_docente
- `idx_actividad_fecha_cierre` ON fecha_cierre

---

### 2.11 Entidad: **RA_ACTIVIDAD** (RaActividad)

**Descripción**: **Tabla de relación N:M** entre RA y ACTIVIDAD. Permite que una actividad evalúe múltiples RAs con diferentes porcentajes.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_ra_actividad** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| id_ra | INTEGER | FK(Ra.id) | RA evaluado |
| id_actividad | INTEGER | FK(Actividad.id) | Actividad que evalúa |
| porcentaje_en_actividad | DECIMAL(5,2) | CHECK 0-100 | % de la actividad en este RA |

**Relaciones**:
- CONECTA: `RA` (N:1)
- CONECTA: `ACTIVIDAD` (N:1)
- TIENE: `RA_ACTIVIDAD_INDICADOR` (1:N) → Indicadores específicos

**Índices**:
- `idx_ra_actividad_ra` ON id_ra
- `idx_ra_actividad_actividad` ON id_actividad
- UNIQUE (id_ra, id_actividad) → Una actividad no puede tener el mismo RA dos veces

**Restricciones de Negocio**:
- `porcentaje_en_actividad` entre 0 y 100
- La suma de `porcentaje_en_actividad` de todos los RAs de una actividad debe ser 100

---

### 2.12 Entidad: **RA_ACTIVIDAD_INDICADOR** (RaActividadIndicador)

**Descripción**: Relación entre RA_ACTIVIDAD e INDICADOR. Define qué indicadores específicos se evalúan en cada RA de una actividad.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| id_ra_actividad | INTEGER | FK(RaActividad.id) | Relación RA-Actividad |
| id_indicador | INTEGER | FK(Indicador.id) | Indicador evaluado |

**Relaciones**:
- PERTENECE A: `RA_ACTIVIDAD` (N:1)
- EVALÚA: `INDICADOR` (N:1)

**Índices**:
- `idx_ra_act_ind_ra_actividad` ON id_ra_actividad
- `idx_ra_act_ind_indicador` ON id_indicador
- UNIQUE (id_ra_actividad, id_indicador)

**Restricciones de Negocio**:
- El `id_indicador` debe pertenecer al mismo `id_ra` de `id_ra_actividad`

---

### 2.13 Entidad: **MATRICULA** (Matricula)

**Descripción**: Relación de estudiantes matriculados en asignaturas.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_matricula** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| id_estudiante | INTEGER | FK(Estudiante.id) | Estudiante matriculado |
| id_asignatura | INTEGER | FK(Asignatura.id) | Asignatura en la que se matricula |
| fecha_matricula | TIMESTAMP | DEFAULT NOW() | Fecha de matrícula |
| periodo_academico | VARCHAR(20) | NOT NULL | Periodo (ej: 2025-1) |

**Relaciones**:
- RELACIONA: `ESTUDIANTE` (N:1)
- RELACIONA: `ASIGNATURA` (N:1)

**Índices**:
- `idx_matricula_estudiante` ON id_estudiante
- `idx_matricula_asignatura` ON id_asignatura
- UNIQUE (id_estudiante, id_asignatura, periodo_academico) → No duplicar matrículas

---

### 2.14 Entidad: **NOTAS_ACTIVIDAD** (NotasActividad)

**Descripción**: Notas de los estudiantes en las actividades. **Una nota por actividad-estudiante**, no por RA.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_nota** | INTEGER | PK, AUTO_INCREMENT | Identificador único (surrogate key) |
| id_actividad | INTEGER | FK(Actividad.id) | Actividad calificada |
| id_estudiante | INTEGER | FK(Estudiante.id) | Estudiante calificado |
| nota | DECIMAL(3,2) | CHECK 0.00-5.00, NULL | Nota obtenida (0.0-5.0) |
| retroalimentacion | TEXT | NULL | Comentarios del docente |
| fecha_calificacion | TIMESTAMP | NULL | Fecha de calificación |
| id_indicador | INTEGER | FK(Indicador.id), NULL | Indicador específico (opcional) |

**Relaciones**:
- PERTENECE A: `ACTIVIDAD` (N:1)
- PERTENECE A: `ESTUDIANTE` (N:1)
- EVALÚA: `INDICADOR` (N:1, opcional)

**Índices**:
- `idx_notas_actividad` ON id_actividad
- `idx_notas_estudiante` ON id_estudiante
- UNIQUE (id_actividad, id_estudiante, id_indicador) → Una nota por actividad-estudiante(-indicador)

**Restricciones de Negocio**:
- `nota` entre 0.00 y 5.00
- `nota` NULL = no calificada aún

**Nota Importante**: Una actividad multi-RA tiene una **única nota** que se distribuye proporcionalmente entre los RAs según `porcentaje_en_actividad` de la tabla `RA_ACTIVIDAD`.

---

### 2.15 Entidad: **RECURSO** (Recurso)

**Descripción**: Recursos educativos subidos por docentes.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_recurso** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| titulo | VARCHAR(200) | NOT NULL | Título del recurso |
| archivo | VARCHAR(255) | NOT NULL | Ruta del archivo en filesystem |
| tipo_archivo | VARCHAR(10) | NOT NULL | Extensión (pdf, docx, etc.) |
| tamano | BIGINT | NOT NULL | Tamaño en bytes |
| fecha_subida | TIMESTAMP | DEFAULT NOW() | Fecha de carga |
| id_asignatura | INTEGER | FK(Asignatura.id) | Asignatura relacionada |
| id_docente | INTEGER | FK(Docente.id) | Docente que subió |

**Relaciones**:
- PERTENECE A: `ASIGNATURA` (N:1)
- SUBIDO POR: `DOCENTE` (N:1)

**Índices**:
- `idx_recurso_asignatura` ON id_asignatura
- `idx_recurso_docente` ON id_docente
- `idx_recurso_fecha` ON fecha_subida

**Restricciones de Negocio**:
- Tamaño máximo: 10 MB (10,485,760 bytes)
- Extensiones permitidas: pdf, docx, pptx, xlsx, zip, jpg, png

---

### 2.16 Entidad: **NOTIFICACION** (Notificacion)

**Descripción**: Sistema de notificaciones para usuarios.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_notificacion** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| tipo | VARCHAR(50) | NOT NULL | Tipo de notificación |
| mensaje | TEXT | NOT NULL | Contenido del mensaje |
| leida | BOOLEAN | DEFAULT FALSE | Estado de lectura |
| fecha_creacion | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| id_usuario | INTEGER | FK(User.id) | Usuario destinatario |
| id_actividad | INTEGER | FK(Actividad.id), NULL | Actividad relacionada |
| id_recurso | INTEGER | FK(Recurso.id), NULL | Recurso relacionado |

**Relaciones**:
- DIRIGIDA A: `USUARIO` (N:1) → Puede ser Estudiante, Docente o Coordinador
- RELACIONADA CON: `ACTIVIDAD` (N:1, opcional)
- RELACIONADA CON: `RECURSO` (N:1, opcional)

**Índices**:
- `idx_notificacion_usuario` ON id_usuario
- `idx_notificacion_leida` ON leida
- `idx_notificacion_fecha` ON fecha_creacion

**Tipos de Notificación**:
- `nueva_calificacion`: Nueva calificación disponible
- `nueva_actividad`: Nueva actividad creada
- `actividad_proxima`: Actividad próxima a vencer
- `nuevo_recurso`: Nuevo recurso subido
- `actividad_vencida`: Actividad vencida sin calificar

---

### 2.17 Entidad: **OTP_RECOVERY** (OTPRecovery)

**Descripción**: Códigos OTP para recuperación de contraseña.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_otp** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| codigo_otp | VARCHAR(6) | NOT NULL | Código OTP de 6 dígitos |
| usado | BOOLEAN | DEFAULT FALSE | Si fue usado |
| fecha_creacion | TIMESTAMP | DEFAULT NOW() | Fecha de generación |
| fecha_expiracion | TIMESTAMP | NOT NULL | Fecha de expiración (15 min) |
| id_usuario | INTEGER | FK(User.id) | Usuario solicitante |

**Relaciones**:
- PERTENECE A: `USUARIO` (N:1)

**Índices**:
- `idx_otp_usuario` ON id_usuario
- `idx_otp_codigo` ON codigo_otp
- `idx_otp_usado` ON usado

**Restricciones de Negocio**:
- `codigo_otp` debe ser único y temporal
- `fecha_expiracion` = `fecha_creacion` + 15 minutos
- OTP expira si `NOW() > fecha_expiracion` o `usado = TRUE`

---

### 2.18 Entidad: **IMPORT_AUDIT** (ImportAudit)

**Descripción**: Auditoría de importaciones masivas.

| **Campo** | **Tipo** | **Restricciones** | **Descripción** |
|-----------|---------|------------------|-----------------|
| **id_audit** | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| tipo_importacion | VARCHAR(50) | NOT NULL | Tipo (matriculados, docentes, asignaturas) |
| fecha_importacion | TIMESTAMP | DEFAULT NOW() | Fecha de la importación |
| archivo_csv | VARCHAR(255) | NOT NULL | Nombre del archivo |
| total_filas | INTEGER | NOT NULL | Total de filas procesadas |
| filas_exitosas | INTEGER | NOT NULL | Filas importadas correctamente |
| filas_fallidas | INTEGER | NOT NULL | Filas con errores |
| errores_detalle | JSON | NULL | JSON con errores por fila |
| id_coordinador | INTEGER | FK(Coordinador.id) | Coordinador que realizó |

**Relaciones**:
- REALIZADA POR: `COORDINADOR` (N:1)

**Índices**:
- `idx_audit_coordinador` ON id_coordinador
- `idx_audit_fecha` ON fecha_importacion
- `idx_audit_tipo` ON tipo_importacion

**Estructura JSON de errores_detalle**:
```json
{
  "errores": [
    {
      "fila": 5,
      "error": "Estudiante con código EST003 no existe"
    },
    {
      "fila": 12,
      "error": "Asignatura con código MAT101 no encontrada"
    }
  ]
}
```

---

## 3. Relaciones del Modelo

### 3.1 Relaciones 1:N (Uno a Muchos)

| **Entidad Padre** | **Entidad Hija** | **Cardinalidad** | **Descripción** |
|-------------------|------------------|-----------------|-----------------|
| PROGRAMA | ASIGNATURA | 1:N | Un programa tiene muchas asignaturas |
| ASIGNATURA | RA | 1:N | Una asignatura tiene muchos RAs |
| ASIGNATURA | ACTIVIDAD | 1:N | Una asignatura tiene muchas actividades |
| ASIGNATURA | MATRICULA | 1:N | Una asignatura tiene muchas matrículas |
| ASIGNATURA | RECURSO | 1:N | Una asignatura tiene muchos recursos |
| RA | INDICADOR | 1:N | Un RA tiene muchos indicadores |
| ACTIVIDAD | NOTAS_ACTIVIDAD | 1:N | Una actividad tiene muchas notas |
| ACTIVIDAD | RA_ACTIVIDAD | 1:N | Una actividad evalúa muchos RAs |
| ESTUDIANTE | MATRICULA | 1:N | Un estudiante tiene muchas matrículas |
| ESTUDIANTE | NOTAS_ACTIVIDAD | 1:N | Un estudiante tiene muchas notas |
| DOCENTE | ASIGNATURA | 1:N | Un docente imparte muchas asignaturas |
| DOCENTE | ACTIVIDAD | 1:N | Un docente crea muchas actividades |
| DOCENTE | RECURSO | 1:N | Un docente sube muchos recursos |
| COORDINADOR | IMPORT_AUDIT | 1:N | Un coordinador realiza muchas importaciones |
| USUARIO | NOTIFICACION | 1:N | Un usuario recibe muchas notificaciones |
| USUARIO | OTP_RECOVERY | 1:N | Un usuario puede tener muchos OTPs |

---

### 3.2 Relaciones N:M (Muchos a Muchos)

#### **RA ↔ ACTIVIDAD** (a través de RA_ACTIVIDAD)

**Descripción**: Una actividad puede evaluar múltiples RAs, y un RA puede ser evaluado por múltiples actividades.

**Tabla Intermedia**: `RA_ACTIVIDAD`

**Cardinalidad**: N:M

**Atributos de la Relación**:
- `porcentaje_en_actividad`: Porcentaje de la actividad que corresponde a este RA

**Ejemplo**:
- **Parcial 1** evalúa:
  - 60% del RA1 (Programación Orientada a Objetos)
  - 40% del RA2 (Estructuras de Datos)

---

### 3.3 Relaciones de Herencia

**USUARIO** (superclase) → `ESTUDIANTE`, `DOCENTE`, `COORDINADOR` (subclases)

**Tipo de Herencia**: **Table-per-Subclass (TPH)**

**Implementación**:
- Tabla `User` con campo discriminador `rol` (VARCHAR: 'estudiante', 'docente', 'coordinador')
- Tablas `Estudiante`, `Docente`, `Coordinador` con FK a `User.id` (PK)

---

## 4. Restricciones de Integridad Referencial

### 4.1 Restricciones ON DELETE

| **Relación** | **ON DELETE** | **Justificación** |
|--------------|---------------|-------------------|
| Programa → Asignatura | RESTRICT | No eliminar programa si tiene asignaturas |
| Asignatura → RA | CASCADE | Si se elimina asignatura, eliminar sus RAs |
| Asignatura → Actividad | CASCADE | Si se elimina asignatura, eliminar sus actividades |
| Asignatura → Matricula | CASCADE | Si se elimina asignatura, eliminar matrículas |
| Actividad → NotasActividad | CASCADE | Si se elimina actividad, eliminar sus notas |
| Estudiante → Matricula | CASCADE | Si se elimina estudiante, eliminar sus matrículas |
| Docente → Actividad | SET NULL | Si se elimina docente, actividad queda sin docente |
| Usuario → Notificacion | CASCADE | Si se elimina usuario, eliminar sus notificaciones |
| Usuario → OTPRecovery | CASCADE | Si se elimina usuario, eliminar sus OTPs |

---

### 4.2 Restricciones CHECK

#### **ASIGNATURA**
```sql
CHECK (creditos >= 1)
```

#### **RA**
```sql
CHECK (porcentaje >= 0 AND porcentaje <= 100)
```

#### **RA_ACTIVIDAD**
```sql
CHECK (porcentaje_en_actividad >= 0 AND porcentaje_en_actividad <= 100)
```

#### **NOTAS_ACTIVIDAD**
```sql
CHECK (nota IS NULL OR (nota >= 0.00 AND nota <= 5.00))
```

#### **RECURSO**
```sql
CHECK (tamano > 0 AND tamano <= 10485760) -- 10 MB
```

---

### 4.3 Restricciones de Unicidad (UNIQUE)

| **Tabla** | **Campos UNIQUE** | **Descripción** |
|-----------|------------------|-----------------|
| User | codigo | No duplicar códigos institucionales |
| User | email | No duplicar correos electrónicos |
| User | documento | No duplicar documentos de identidad |
| Programa | codigo_programa | No duplicar códigos de programa |
| Asignatura | codigo_asignatura | No duplicar códigos de asignatura |
| TipoActividad | nombre_tipo | No duplicar tipos de actividad |
| Matricula | (id_estudiante, id_asignatura, periodo_academico) | No duplicar matrículas en mismo periodo |
| NotasActividad | (id_actividad, id_estudiante, id_indicador) | Una nota por actividad-estudiante-indicador |
| RaActividad | (id_ra, id_actividad) | Una actividad no evalúa el mismo RA dos veces |
| RaActividadIndicador | (id_ra_actividad, id_indicador) | Un indicador por RA-Actividad |

---

## 5. Reglas de Negocio Implementadas

### 5.1 Regla: Suma de Porcentajes de RAs = 100%

**Descripción**: Los porcentajes de todos los RAs de una asignatura deben sumar 100%.

**Implementación**: Validación en la capa de aplicación (Django serializer).

**Consulta de verificación**:
```sql
SELECT id_asignatura, SUM(porcentaje) as total
FROM ra
GROUP BY id_asignatura
HAVING SUM(porcentaje) != 100;
```

---

### 5.2 Regla: Suma de Porcentajes en Actividad Multi-RA = 100%

**Descripción**: Los porcentajes de todos los RAs en una actividad deben sumar 100%.

**Implementación**: Validación en la capa de aplicación.

**Consulta de verificación**:
```sql
SELECT id_actividad, SUM(porcentaje_en_actividad) as total
FROM ra_actividad
GROUP BY id_actividad
HAVING SUM(porcentaje_en_actividad) != 100;
```

---

### 5.3 Regla: Indicadores Deben Pertenecer al RA Correcto

**Descripción**: En `RA_ACTIVIDAD_INDICADOR`, el `id_indicador` debe pertenecer al mismo `id_ra` de la tabla `RA_ACTIVIDAD`.

**Implementación**: Validación con JOIN en la capa de aplicación.

**Consulta de verificación**:
```sql
SELECT rai.id
FROM ra_actividad_indicador rai
JOIN ra_actividad ra_act ON rai.id_ra_actividad = ra_act.id_ra_actividad
JOIN indicador ind ON rai.id_indicador = ind.id_indicador
WHERE ind.id_ra != ra_act.id_ra;
```

---

### 5.4 Regla: Creación Transaccional de Actividad Multi-RA

**Descripción**: Al crear una actividad multi-RA, se deben crear:
1. Registro en `ACTIVIDAD`
2. Registros en `RA_ACTIVIDAD` (uno por RA)
3. Registros en `RA_ACTIVIDAD_INDICADOR` (uno por indicador seleccionado)
4. Registros en `NOTAS_ACTIVIDAD` (uno por estudiante matriculado, nota NULL)

**Implementación**: Transacción atómica en Django (`transaction.atomic`).

---

### 5.5 Regla: Cálculo de Nota Progresiva por RA

**Descripción**: La nota progresiva de un RA es el promedio ponderado de las notas de actividades **calificadas** que evalúan ese RA.

**Fórmula**:
```
Nota_Progresiva(RA) = Σ(nota × porcentaje_en_actividad) / Σ(porcentaje_en_actividad)
```

**Consulta SQL**:
```sql
SELECT 
  ra.id_ra,
  ra.nombre_ra,
  SUM(na.nota * ra_act.porcentaje_en_actividad) / SUM(ra_act.porcentaje_en_actividad) AS nota_progresiva
FROM ra
JOIN ra_actividad ra_act ON ra.id_ra = ra_act.id_ra
JOIN actividad act ON ra_act.id_actividad = act.id_actividad
JOIN notas_actividad na ON act.id_actividad = na.id_actividad
WHERE na.id_estudiante = ? 
  AND na.nota IS NOT NULL
GROUP BY ra.id_ra;
```

---

### 5.6 Regla: Cálculo de Cobertura por RA

**Descripción**: La cobertura de un RA es el porcentaje de actividades calificadas respecto al total.

**Fórmula**:
```
Cobertura(RA) = (Actividades_Calificadas / Total_Actividades) × 100
```

**Consulta SQL**:
```sql
SELECT 
  ra.id_ra,
  COUNT(CASE WHEN na.nota IS NOT NULL THEN 1 END) AS actividades_calificadas,
  COUNT(*) AS total_actividades,
  (COUNT(CASE WHEN na.nota IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)) AS cobertura
FROM ra
JOIN ra_actividad ra_act ON ra.id_ra = ra_act.id_ra
JOIN actividad act ON ra_act.id_actividad = act.id_actividad
JOIN notas_actividad na ON act.id_actividad = na.id_actividad
WHERE na.id_estudiante = ?
GROUP BY ra.id_ra;
```

---

## 6. Índices y Optimización

### 6.1 Índices Primarios (PK)

Todas las tablas tienen un índice primario en el campo `id` (AUTO_INCREMENT).

---

### 6.2 Índices de Clave Foránea (FK)

**Justificación**: Mejoran el rendimiento de JOINs y consultas de relaciones.

**Índices creados**:
- `idx_asignatura_programa` ON asignatura(id_programa)
- `idx_asignatura_docente` ON asignatura(id_docente)
- `idx_ra_asignatura` ON ra(id_asignatura)
- `idx_indicador_ra` ON indicador(id_ra)
- `idx_actividad_asignatura` ON actividad(id_asignatura)
- `idx_actividad_docente` ON actividad(id_docente)
- `idx_matricula_estudiante` ON matricula(id_estudiante)
- `idx_matricula_asignatura` ON matricula(id_asignatura)
- `idx_notas_actividad` ON notas_actividad(id_actividad)
- `idx_notas_estudiante` ON notas_actividad(id_estudiante)
- `idx_ra_act_ra` ON ra_actividad(id_ra)
- `idx_ra_act_actividad` ON ra_actividad(id_actividad)
- `idx_notificacion_usuario` ON notificacion(id_usuario)
- `idx_otp_usuario` ON otp_recovery(id_usuario)
- `idx_recurso_asignatura` ON recurso(id_asignatura)

---

### 6.3 Índices de Búsqueda

**Justificación**: Campos frecuentemente usados en cláusulas WHERE y ORDER BY.

**Índices creados**:
- `idx_user_codigo` ON user(codigo)
- `idx_user_email` ON user(email)
- `idx_programa_codigo` ON programa(codigo_programa)
- `idx_asignatura_codigo` ON asignatura(codigo_asignatura)
- `idx_asignatura_periodo` ON asignatura(periodo_academico)
- `idx_actividad_fecha_cierre` ON actividad(fecha_cierre)
- `idx_notificacion_leida` ON notificacion(leida)
- `idx_notificacion_fecha` ON notificacion(fecha_creacion)
- `idx_otp_codigo` ON otp_recovery(codigo_otp)
- `idx_otp_usado` ON otp_recovery(usado)
- `idx_recurso_fecha` ON recurso(fecha_subida)
- `idx_audit_fecha` ON import_audit(fecha_importacion)

---

### 6.4 Índices Compuestos

**Justificación**: Consultas que filtran por múltiples campos.

**Índices creados**:
- `idx_matricula_est_asig_periodo` ON matricula(id_estudiante, id_asignatura, periodo_academico)
- `idx_notas_act_est_ind` ON notas_actividad(id_actividad, id_estudiante, id_indicador)
- `idx_ra_act_ra_actividad` ON ra_actividad(id_ra, id_actividad)

---

## 7. Diagrama ER (Referencia)

El diagrama Entidad-Relación completo está disponible en:
```
docs/diagramas/entidad_relacion/diagrama_er.puml
```

**Herramientas para visualizar**:
- PlantUML: http://www.plantuml.com/plantuml/
- VS Code: Extensión "PlantUML"
- CLI: `java -jar plantuml.jar diagrama_er.puml`

---

## 8. Notas de Implementación

### 8.1 Django Models

Las entidades están implementadas como modelos Django en:
```
backend/api/models/
├── user.py (User, Estudiante, Docente, Coordinador)
├── programa.py (Programa)
├── asignatura.py (Asignatura)
├── ra.py (Ra, Indicador)
├── actividad.py (Actividad, TipoActividad, RaActividad, RaActividadIndicador)
├── notas.py (NotasActividad)
├── matricula.py (Matricula)
├── recurso.py (Recurso)
├── notificacion.py (Notificacion)
└── otp.py (OTPRecovery, ImportAudit)
```

---

### 8.2 PostgreSQL

**Versión mínima**: PostgreSQL 12+

**Configuración recomendada**:
```ini
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB
```

---

### 8.3 Migraciones

Las migraciones de Django están en:
```
backend/api/migrations/
```

**Aplicar migraciones**:
```bash
python manage.py migrate
```

---

## 9. Consultas Frecuentes

### 9.1 Listar Actividades de un Estudiante (Agrupadas)

```sql
SELECT 
  a.id_actividad,
  a.nombre_actividad,
  a.descripcion,
  a.fecha_cierre,
  ta.nombre_tipo,
  na.nota,
  na.retroalimentacion,
  GROUP_CONCAT(r.nombre_ra) AS ras,
  SUM(ra_act.porcentaje_en_actividad) AS porcentaje_total
FROM actividad a
JOIN tipo_actividad ta ON a.id_tipo_actividad = ta.id_tipo_actividad
JOIN ra_actividad ra_act ON a.id_actividad = ra_act.id_actividad
JOIN ra r ON ra_act.id_ra = r.id_ra
LEFT JOIN notas_actividad na ON a.id_actividad = na.id_actividad AND na.id_estudiante = ?
WHERE a.id_asignatura = ?
GROUP BY a.id_actividad;
```

---

### 9.2 Calcular Nota Progresiva de un Estudiante en una Asignatura

```sql
SELECT 
  asig.codigo_asignatura,
  asig.nombre_asignatura,
  SUM(
    (SELECT AVG(na2.nota) 
     FROM notas_actividad na2
     JOIN actividad a2 ON na2.id_actividad = a2.id_actividad
     JOIN ra_actividad ra_act2 ON a2.id_actividad = ra_act2.id_actividad
     WHERE na2.id_estudiante = ? 
       AND ra_act2.id_ra = r.id_ra
       AND na2.nota IS NOT NULL
    ) * r.porcentaje / 100
  ) AS nota_progresiva
FROM asignatura asig
JOIN ra r ON asig.id_asignatura = r.id_asignatura
WHERE asig.id_asignatura = ?
GROUP BY asig.id_asignatura;
```

---

### 9.3 Obtener Estadísticas de una Asignatura

```sql
SELECT 
  COUNT(DISTINCT m.id_estudiante) AS total_estudiantes,
  AVG(
    SELECT AVG(na.nota)
    FROM notas_actividad na
    JOIN actividad a ON na.id_actividad = a.id_actividad
    WHERE a.id_asignatura = ? AND na.id_estudiante = m.id_estudiante
  ) AS promedio_general,
  COUNT(CASE WHEN promedio >= 3.0 THEN 1 END) * 100.0 / COUNT(*) AS porcentaje_aprobados
FROM matricula m
WHERE m.id_asignatura = ?;
```

---

## 10. Referencias

### 10.1 Documentación Relacionada
- **Diagrama ER**: `docs/diagramas/entidad_relacion/diagrama_er.puml`
- **Diagrama de Clases**: `docs/diagramas/clases/diagrama_clases.puml`
- **Requerimientos**: `docs/REQUERIMIENTOS.md`
- **Manual de Instalación**: `docs/MANUAL_INSTALACION.md`

### 10.2 Herramientas
- **Django ORM**: https://docs.djangoproject.com/en/5.2/topics/db/models/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **PlantUML**: http://plantuml.com/

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del documento**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager
