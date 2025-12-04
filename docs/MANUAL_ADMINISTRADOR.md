# Manual de Administrador - RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Audiencia**: Coordinadores Académicos

---

## 1. Introducción

Este manual está dirigido a **Coordinadores Académicos** que administran el sistema RA-Manager. Como coordinador, tienes acceso completo a:

- Dashboard con estadísticas globales del programa
- Gestión de asignaturas y visualización de avance académico
- Importaciones masivas (estudiantes, docentes, asignaturas)
- Auditoría de importaciones
- Exportación de reportes

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión como Coordinador

1. Accede a `http://localhost:5173` (desarrollo)
2. Ingresa tu código de coordinador (ej: `COORD001`)
3. Ingresa tu contraseña
4. Haz clic en **"Iniciar Sesión"**
5. Serás redirigido al **Dashboard de Coordinador**

---

## 3. Dashboard de Coordinador

El dashboard muestra métricas globales del programa académico:

**Métricas Principales**:
- **Total de Estudiantes Matriculados**: Suma de todas las matrículas activas
- **Total de Asignaturas Activas**: Asignaturas del periodo actual
- **Total de Docentes**: Docentes con asignaturas asignadas
- **Promedio General del Programa**: Promedio de todas las calificaciones

**Gráficos**:
- **Promedios por Asignatura**: Gráfico de barras con promedio de cada asignatura
- **Distribución de Calificaciones**: Gráfico circular (Aprobados vs Reprobados)

**Filtros**:
- Periodo académico (ej: 2025-1, 2025-2)
- Programa académico (si hay múltiples programas)

---

## 4. Gestión de Asignaturas

### 4.1 Ver Lista de Asignaturas

1. En el menú lateral, haz clic en **"Asignaturas"**
2. Verás tabla con:
   - Código y nombre de asignatura
   - Periodo académico
   - Docente asignado
   - Total de estudiantes matriculados
   - Total de RAs configurados
   - Total de actividades creadas
3. Puedes filtrar por:
   - Programa
   - Docente
   - Periodo académico

---

### 4.2 Ver Detalle de Asignatura

1. Haz clic en una asignatura de la lista
2. Verás:

**Información Básica**:
- Código, nombre, créditos
- Periodo académico
- Docente asignado
- Total de estudiantes

**RAs Configurados**:
- Lista de RAs con sus porcentajes
- Suma de porcentajes (debe ser 100%)

**Actividades Creadas**:
- Total de actividades
- Tipos de actividades (Quiz, Taller, Parcial, etc.)

**Acciones**:
- **Ver Estadísticas**: Métricas detalladas de rendimiento
- **Ver Estudiantes**: Lista completa de matriculados
- **Exportar Datos**: Descargar reporte en CSV/PDF

---

### 4.3 Ver Estadísticas de Asignatura

Esta es la funcionalidad más importante para seguimiento académico.

1. Selecciona una asignatura
2. Haz clic en **"Estadísticas"**
3. Verás tres secciones:

#### 4.3.1 Estadísticas Globales

- **Total de Estudiantes**: Matriculados en la asignatura
- **Promedio General**: Promedio de todos los estudiantes
- **% de Aprobados**: Estudiantes con nota >= 3.0
- **% de Reprobados**: Estudiantes con nota < 3.0

#### 4.3.2 Estadísticas por RA

Para cada RA, se muestra:

- **Nombre y porcentaje** en la asignatura
- **Promedio del RA**: Promedio de todos los estudiantes en ese RA
- **Cobertura de Actividades**: % de actividades calificadas
- **% en Nivel Esperado**: Estudiantes con nota >= 3.0 en ese RA

**Ejemplo**:

```
RA1: Programación Orientada a Objetos (40%)
  Promedio: 4.1
  Cobertura: 85%
  Nivel Esperado: 78% (23/30 estudiantes)

RA2: Estructuras de Datos (35%)
  Promedio: 3.8
  Cobertura: 80%
  Nivel Esperado: 70% (21/30 estudiantes)

RA3: Algoritmos (25%)
  Promedio: 3.5
  Cobertura: 75%
  Nivel Esperado: 65% (19/30 estudiantes)
```

#### 4.3.3 Tabla de Estudiantes

Tabla con cada estudiante:

- Código y nombre
- **Nota Progresiva**: Promedio sobre actividades calificadas
- **Nota Estricta**: Incluyendo actividades sin calificar
- **Cobertura**: % de actividades calificadas
- **Estado**: Aprobado (>= 3.0) / En riesgo (< 3.0)

**Acciones**:
- Ordenar por columna (clic en encabezado)
- Filtrar por estado
- Exportar a CSV/PDF

---

### 4.4 Ver Lista de Estudiantes

1. En detalle de asignatura, haz clic en **"Ver Estudiantes"**
2. Verás lista completa de matriculados:
   - Código, nombre, email
   - Documento de identidad
   - Fecha de matrícula
   - Nota actual
   - Estado
3. Puedes exportar la lista a CSV

---

## 5. Importaciones Masivas

Una de las funciones clave del coordinador es importar datos masivamente desde archivos CSV.

### 5.1 Importar Estudiantes Matriculados

**Objetivo**: Matricular estudiantes en asignaturas de forma masiva.

**Pasos**:

1. En el menú lateral, haz clic en **"Importaciones"**
2. Selecciona **"Importar Matriculados"**
3. Verás instrucciones del formato CSV requerido
4. Haz clic en **"Seleccionar Archivo CSV"**
5. Selecciona tu archivo
6. Haz clic en **"Procesar Importación"**
7. El sistema validará cada fila y mostrará un resumen:
   - Total de filas procesadas
   - Filas exitosas
   - Filas con errores (con detalle)

**Formato CSV**:

```csv
codigo_estudiante,codigo_asignatura,periodo
EST001,PROG101,2025-1
EST002,PROG101,2025-1
EST003,BD201,2025-1
EST004,PROG101,2025-1
```

**Validaciones**:
- ✅ Estudiante existe en la base de datos
- ✅ Asignatura existe en la base de datos
- ✅ Periodo académico existe
- ✅ No duplicar matrícula existente

**Resultado**:
- Registros creados en tabla `matricula`
- Registros de notas vacíos creados para actividades existentes
- Auditoría registrada en `import_audit`

**Ejemplo de Resumen**:

```
Importación Completada
─────────────────────────
Total de Filas: 50
Exitosas: 47
Fallidas: 3

Errores:
  Fila 12: Estudiante EST012 no existe
  Fila 28: Asignatura XYZ999 no encontrada
  Fila 45: Matrícula duplicada (EST045 ya está matriculado en PROG101)
```

---

### 5.2 Importar Docentes

**Objetivo**: Asignar docentes a asignaturas de forma masiva.

**Pasos**:

1. En **"Importaciones"**, selecciona **"Importar Docentes"**
2. Descarga plantilla CSV (opcional)
3. Sube tu archivo CSV
4. Haz clic en **"Procesar Importación"**
5. Revisa el resumen de la importación

**Formato CSV**:

```csv
codigo_docente,codigo_asignatura
DOC001,PROG101
DOC002,BD201
DOC001,MAT201
```

**Validaciones**:
- ✅ Docente existe
- ✅ Asignatura existe
- ✅ No duplicar asignación

**Resultado**:
- Campo `id_docente` actualizado en tabla `asignatura`
- Auditoría registrada

---

### 5.3 Importar Asignaturas y RAs

**Objetivo**: Crear estructura completa de asignaturas con sus RAs e indicadores.

**IMPORTANTE**: Este es el proceso más complejo y crítico.

**Pasos**:

1. En **"Importaciones"**, selecciona **"Importar Asignaturas y RAs"**
2. Descarga plantilla CSV (recomendado)
3. Llena el CSV con cuidado
4. Sube el archivo
5. Haz clic en **"Procesar Importación"**
6. El sistema validará:
   - Suma de porcentajes de RAs = 100% por asignatura
   - No duplicar códigos
7. Si todo es válido, se crean transaccionalmente:
   - Asignatura
   - RAs de la asignatura
   - Indicadores de cada RA
8. Si hay errores críticos, se hace **rollback** completo

**Formato CSV**:

```csv
codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind
PROG101,Programación Avanzada,RA1,POO,40,IND1-1,Implementa clases
PROG101,Programación Avanzada,RA1,POO,40,IND1-2,Aplica herencia
PROG101,Programación Avanzada,RA2,Estructuras,35,IND2-1,Implementa listas
PROG101,Programación Avanzada,RA2,Estructuras,35,IND2-2,Implementa árboles
PROG101,Programación Avanzada,RA3,Algoritmos,25,IND3-1,Analiza complejidad
BD201,Bases de Datos,RA1,Modelado,50,IND1-1,Crea modelo ER
BD201,Bases de Datos,RA2,SQL,50,IND2-1,Escribe consultas SQL
```

**Validaciones Críticas**:
- ✅ Suma de porcentajes de RAs = 100% **por asignatura**
- ✅ No duplicar código de asignatura
- ✅ No duplicar código de RA dentro de la misma asignatura
- ✅ Al menos 1 indicador por RA

**Ejemplo de Error Crítico**:

```
ERROR: Asignatura PROG101
  RA1: 40%
  RA2: 35%
  RA3: 20%
  ─────────
  Total: 95% ❌ (debe ser 100%)

La importación de PROG101 se canceló (rollback)
```

---

### 5.4 Ver Historial de Importaciones

1. En **"Importaciones"**, haz clic en **"Historial"**
2. Verás lista de todas las importaciones realizadas:
   - Tipo (Matriculados, Docentes, Asignaturas)
   - Fecha y hora
   - Nombre del archivo CSV
   - Coordinador que realizó la importación
   - Total de filas / Exitosas / Fallidas
3. Haz clic en una importación para ver:
   - Detalle completo de errores (JSON)
   - Opción de descargar log de errores

**Uso del Historial**:
- Auditoría de operaciones
- Troubleshooting de importaciones fallidas
- Cumplimiento normativo

---

## 6. Reportes y Exportaciones

### 6.1 Exportar Estadísticas de Asignatura

1. En **"Estadísticas"** de una asignatura
2. Haz clic en **"Exportar a CSV"** o **"Exportar a PDF"**
3. Se descargará archivo con:
   - Métricas globales
   - Estadísticas por RA
   - Tabla de estudiantes con notas

### 6.2 Exportar Lista de Estudiantes

1. En **"Ver Estudiantes"** de una asignatura
2. Haz clic en **"Exportar a CSV"**
3. Se descargará archivo con datos de estudiantes

### 6.3 Exportar Dashboard Completo

1. En el Dashboard principal
2. Haz clic en **"Exportar Resumen"**
3. Se genera PDF con:
   - Métricas globales del programa
   - Gráficos de distribución
   - Tabla de asignaturas con promedios

---

## 7. Gestión de Programas (si aplica)

Si el sistema maneja múltiples programas académicos:

### 7.1 Ver Programas

1. En el menú lateral, haz clic en **"Programas"**
2. Verás lista de programas:
   - Código y nombre
   - Total de asignaturas
   - Total de estudiantes
   - Promedio general

### 7.2 Crear Programa

1. Haz clic en **"Crear Programa"**
2. Llena el formulario:
   - Código (único)
   - Nombre
   - Descripción
3. Haz clic en **"Guardar"**

---

## 8. Gestión de Perfil

Similar al manual de usuario (ver Manual de Usuario, sección 3.7).

---

## 9. Mejores Prácticas

### 9.1 Importaciones

- ✅ **Siempre descarga la plantilla CSV** antes de crear tu archivo
- ✅ **Valida los datos** en Excel antes de importar
- ✅ **Importa en horarios de baja carga** (evita horarios de clase)
- ✅ **Haz backup de la BD** antes de importaciones grandes
- ✅ **Prueba con archivo pequeño** primero (5-10 filas)
- ✅ **Revisa el historial** después de cada importación

### 9.2 Gestión de Asignaturas

- ✅ **Verifica suma de porcentajes de RAs** siempre sea 100%
- ✅ **Asigna docentes** antes del inicio de clases
- ✅ **Revisa estadísticas** al menos una vez por semana
- ✅ **Exporta reportes** al final de cada periodo

### 9.3 Monitoreo

- ✅ **Revisa el dashboard** diariamente
- ✅ **Identifica asignaturas con bajo rendimiento** (promedio < 3.0)
- ✅ **Contacta docentes** si hay baja cobertura de calificaciones
- ✅ **Genera reportes mensuales** para la dirección

---

## 10. Solución de Problemas

### 10.1 Importación Fallida Completamente

**Problema**: Todas las filas fallan en la importación.

**Soluciones**:
- Verifica el formato CSV (delimitador, encoding)
- Verifica que las columnas coincidan con el formato requerido
- Abre el CSV en un editor de texto para verificar caracteres extraños

### 10.2 Porcentajes de RAs No Suman 100%

**Problema**: Error al importar asignaturas.

**Soluciones**:
- Revisa el CSV con filtros en Excel por `codigo_asig`
- Suma los porcentajes manualmente
- Ajusta los porcentajes para que sumen exactamente 100.00

### 10.3 Estudiante No Existe

**Problema**: Error "Estudiante EST999 no existe" al importar matriculados.

**Soluciones**:
- Verifica que el código del estudiante esté correcto
- Verifica que el estudiante esté registrado en la tabla `User`
- Si es un nuevo estudiante, primero regístralo manualmente

### 10.4 Asignatura Ya Tiene Docente Asignado

**Problema**: Advertencia al importar docentes.

**Soluciones**:
- Verifica si quieres reemplazar el docente existente
- El sistema sobrescribirá el docente anterior

### 10.5 Estadísticas Incorrectas

**Problema**: Los promedios no coinciden con lo esperado.

**Soluciones**:
- Verifica que todas las actividades estén calificadas
- Recuerda: **Nota Progresiva** solo considera calificadas, **Nota Estricta** incluye todas
- Refresca la página (F5)
- Contacta soporte técnico si persiste

---

## 11. Auditoría y Seguridad

### 11.1 Logs de Importaciones

Todas las importaciones se registran en la tabla `import_audit`:

- Fecha y hora
- Coordinador que realizó la importación
- Archivo CSV
- Total de filas, exitosas, fallidas
- Detalle de errores en JSON

**Acceso**:
1. Menú lateral → **"Historial de Importaciones"**
2. Haz clic en una importación para ver detalles

### 11.2 Backup de Base de Datos

**Recomendación**: Hacer backup antes de importaciones grandes.

**Comando PostgreSQL**:
```bash
pg_dump ra_manager > backup_$(date +%Y%m%d).sql
```

### 11.3 Recuperación ante Errores

Si una importación causó problemas:

1. **Rollback manual** (si es necesario):
   - Restaurar backup de BD
2. **Eliminar registros erróneos**:
   - Usar SQL para eliminar matrículas del periodo afectado
3. **Contactar soporte técnico**

---

## 12. Casos de Uso Avanzados

### 12.1 Importar Múltiples Periodos

Si necesitas importar datos de varios periodos:

1. Crea un CSV por periodo (recomendado)
2. Importa periodo por periodo
3. Verifica cada importación antes de continuar

### 12.2 Reasignar Docente a Asignatura

1. Prepara CSV de docentes con la nueva asignación
2. El sistema sobrescribirá el docente anterior
3. No hay historial de docentes anteriores (limitación actual)

### 12.3 Migrar Datos de Sistema Anterior

1. Exporta datos del sistema anterior
2. Transforma a formato CSV de RA-Manager
3. Importa en el siguiente orden:
   1. Programas
   2. Asignaturas y RAs
   3. Docentes
   4. Estudiantes
   5. Matriculados

---

## 13. Preguntas Frecuentes (FAQ)

**P: ¿Puedo editar un RA después de crearlo?**  
R: Sí, pero no desde la interfaz web. Debes editar directamente en la BD o contactar soporte técnico.

**P: ¿Puedo eliminar una asignatura con estudiantes matriculados?**  
R: No, el sistema rechazará la operación. Primero debes des-matricular a todos los estudiantes.

**P: ¿Qué pasa si importo dos veces el mismo archivo CSV?**  
R: Las matrículas duplicadas serán rechazadas (validación en el sistema).

**P: ¿Puedo exportar calificaciones de todos los cursos a la vez?**  
R: Actualmente no, pero está planificado para futuras versiones.

**P: ¿Cuánto tiempo se conserva el historial de importaciones?**  
R: Indefinidamente (no hay purga automática). Puedes eliminar registros manualmente si es necesario.

---

## 14. Contacto y Soporte Técnico

Para soporte técnico avanzado:

- **Email**: admin@ra-manager.edu
- **Teléfono**: +57 (XXX) XXX-XXXX
- **Horario**: Lunes a Viernes, 8:00 AM - 5:00 PM
- **Soporte Urgente**: +57 (XXX) XXX-XXXX (24/7)

---

## 15. Anexos

### 15.1 Plantilla CSV - Matriculados

```csv
codigo_estudiante,codigo_asignatura,periodo
EST001,PROG101,2025-1
```

### 15.2 Plantilla CSV - Docentes

```csv
codigo_docente,codigo_asignatura
DOC001,PROG101
```

### 15.3 Plantilla CSV - Asignaturas y RAs

```csv
codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind
PROG101,Programación Avanzada,RA1,POO,40,IND1-1,Implementa clases
```

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del manual**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager
