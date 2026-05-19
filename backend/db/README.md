# Base de Datos - Scripts SQL

Esta carpeta contiene scripts SQL para inicialización, datos de prueba y validación de la base de datos PostgreSQL del proyecto RA-Manager.

## 📁 Archivos

### `ra_manager.psql`
**Propósito**: Script de creación de la estructura de la base de datos.

**Contenido**:
- Eliminación de tablas existentes (DROP TABLE ... CASCADE)
- Definición de todas las tablas del sistema:
  - Catálogos: `tipo_documento`, `tipo_actividad`, `programa`, `periodo_academico`
  - Entidades principales: `docente`, `estudiante`, `asignatura`, `resultado_de_aprendizaje`, `indicadores_de_logro`
  - Relaciones: `actividad`, `ra_actividad`, `matricula`, `notas_actividad`, `coordinador`
- Definición de claves primarias, foráneas y constraints

**Uso**:
```bash
# Ejecutar desde PostgreSQL
psql -U postgres -d ra_manager -f ra_manager.psql

# O desde el cliente psql
\i backend/db/ra_manager.psql
```

**⚠️ ADVERTENCIA**: Este script elimina todas las tablas existentes. Usar solo en inicialización o reset completo.

---

### `inserts.sql`
**Propósito**: Script de población de datos iniciales y de prueba.

**Contenido**:
- **TRUNCATE** completo de todas las tablas con `RESTART IDENTITY CASCADE`
-- Datos de catálogos:
  - 3 tipos de documento (C.C., T.I., C.R.)
  - 8+ tipos de actividad (Taller, Quiz, Examen, Proyecto, etc.)
  - 5+ programas académicos
  - Periodos académicos (2025-1, 2025-2)
- Datos de prueba:
  - 8 docentes con contraseñas hasheadas
  - 24 estudiantes distribuidos en diferentes programas
  - Asignaturas con sus RAs e indicadores de logro
  - Matrículas y notas de actividades

**Uso**:
```bash
# Ejecutar desde PostgreSQL
psql -U postgres -d ra_manager -f inserts.sql

# O desde el cliente psql conectado a la BD
\i backend/db/inserts.sql
```

**Transacciones**: Todo el script corre dentro de `BEGIN...COMMIT` para garantizar atomicidad.

---

### `insert_test.sql`
**Propósito**: Script de validación de datos insertados.

**Contenido**:
- Tests de integridad después de ejecutar `inserts.sql`
-- Validaciones de conteos:
  - =3 tipos de documento
  - ≥8 tipos de actividad
  - ≥5 programas
  - =8 docentes
  - =24 estudiantes
- Validaciones de relaciones:
  - FK válidas entre matriculas, asignaturas, estudiantes
  - Integridad de notas_actividad
  - Consistencia de ra_actividad

**Uso**:
```bash
# Ejecutar después de inserts.sql
psql -U postgres -d ra_manager -f insert_test.sql
```

**Output esperado**:
```
PASS: tipo_documento = 3 (3).
PASS: tipo_actividad >= 8 (8).
PASS: programa >= 5 (5).
PASS: docentes = 8.
PASS: estudiantes = 24.
...
COMMIT
```

**⚠️ Nota**: Si alguna validación falla, el script hace `RAISE EXCEPTION` y detiene la ejecución.

---

### `db.sqlite3`
**Propósito**: Base de datos SQLite (obsoleta, no en uso).

**Estado**: Este archivo es un remanente de desarrollo temprano cuando el proyecto usaba SQLite. 

**⚠️ IMPORTANTE**: El proyecto actual usa PostgreSQL. Este archivo puede eliminarse de forma segura.

---

## 🔄 Flujo de Trabajo Recomendado

### Inicialización completa desde cero:
```bash
# 1. Crear la base de datos (si no existe)
createdb -U postgres ra_manager

# 2. Ejecutar estructura
psql -U postgres -d ra_manager -f backend/db/ra_manager.psql

# 3. Insertar datos de prueba
psql -U postgres -d ra_manager -f backend/db/inserts.sql

# 4. Validar integridad
psql -U postgres -d ra_manager -f backend/db/insert_test.sql
```

### Reseteo de datos (mantiene estructura):
```bash
# Solo re-ejecutar inserts (incluye TRUNCATE)
psql -U postgres -d ra_manager -f backend/db/inserts.sql
psql -U postgres -d ra_manager -f backend/db/insert_test.sql
```

### Con Django (recomendado):
```bash
# Usar migraciones de Django en lugar de scripts SQL directos
python manage.py migrate

# Los datos de prueba se pueden insertar con fixtures o scripts personalizados
```

---

## 🔐 Seguridad

**Contraseñas de docentes en `inserts.sql`**:
- Todas las contraseñas están hasheadas usando el algoritmo de Django (`pbkdf2_sha256`)
- Contraseña de prueba predeterminada para docentes: `password123`
- **⚠️ NUNCA** usar estas contraseñas en producción

**Credenciales de coordinador**:
- Usuario: `admin`
- Contraseña: `admin123` (hasheada en BD)
- **⚠️ CAMBIAR** inmediatamente en producción

---

## 📊 Estadísticas de Datos de Prueba

- **Docentes**: 8 (con materias asignadas)
- **Estudiantes**: 24 (distribuidos en 5 programas)
- **Asignaturas**: ~6-8 materias con RAs completos
- **Actividades**: ~30-50 actividades con notas
- **Periodos**: 2 periodos académicos (2025-1, 2025-2)

---

## 🔍 Dependencias

Estos scripts asumen:
- PostgreSQL 12+ (recomendado: 14+)
- Usuario con permisos de creación de tablas
- Base de datos `ra_manager` creada
- Encoding UTF-8

---

## 📝 Notas Adicionales

- Los scripts usan `BIGSERIAL` para IDs autoincrementales
- Las relaciones many-to-many usan tablas intermedias (`ra_actividad`, `matricula`)
- Todos los `VARCHAR` tienen límites explícitos
- Los `DECIMAL` para notas/porcentajes usan precisión (5,2)
- Las fechas usan tipo `DATE` sin timezone

---

**Última actualización**: Noviembre 2025  
**Mantenido por**: Equipo RA-Manager
