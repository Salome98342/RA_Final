# Casos de Uso - RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Sistema**: RA-Manager (Results of Learning Manager)

---

## 1. Introducción

Este documento describe los casos de uso del sistema RA-Manager, complementando los **diagramas de casos de uso PlantUML** ubicados en `docs/diagramas/casos_de_uso/`.

Los actores del sistema son:
- **Estudiante**: Consulta calificaciones, actividades y recursos
- **Docente**: Crea actividades, califica, gestiona recursos
- **Coordinador**: Gestiona programa, importa datos, consulta estadísticas

---

## 2. Casos de Uso del Estudiante

### CU-EST-001: Iniciar Sesión

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante registrado en el sistema  
**Poscondiciones**: Usuario autenticado con token JWT

**Flujo Normal**:
1. Estudiante accede a la página de login
2. Estudiante ingresa código y contraseña
3. Sistema valida credenciales
4. Sistema identifica rol como "estudiante"
5. Sistema genera token JWT firmado
6. Sistema redirige al dashboard de estudiante

**Flujos Alternativos**:
- **FA-001**: Credenciales incorrectas
  * Sistema muestra mensaje de error "Credenciales inválidas"
  * Estudiante puede reintentar

**Diagrama**: `docs/diagramas/secuencia/secuencia_login_recuperacion.puml`

---

### CU-EST-002: Recuperar Contraseña

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante registrado con email válido  
**Poscondiciones**: Contraseña actualizada, OTP usado

**Flujo Normal**:
1. Estudiante selecciona "¿Olvidaste tu contraseña?"
2. Estudiante ingresa su email
3. Sistema valida que email existe
4. Sistema genera OTP de 6 dígitos
5. Sistema envía OTP por email (SMTP)
6. Estudiante recibe email con OTP
7. Estudiante ingresa OTP en formulario
8. Sistema valida OTP (no expirado, no usado)
9. Estudiante ingresa nueva contraseña
10. Sistema actualiza contraseña (hash PBKDF2)
11. Sistema marca OTP como usado
12. Sistema muestra mensaje de éxito

**Flujos Alternativos**:
- **FA-001**: Email no existe
  * Sistema muestra mensaje "Email no encontrado"
- **FA-002**: OTP expirado o inválido
  * Sistema muestra mensaje "Código inválido o expirado"
  * Estudiante puede solicitar nuevo OTP

**Restricciones**:
- OTP válido por 15 minutos
- OTP de 6 dígitos numéricos

**Diagrama**: `docs/diagramas/secuencia/secuencia_login_recuperacion.puml`

---

### CU-EST-003: Ver Lista de Cursos

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante autenticado  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Sistema muestra dashboard de estudiante
2. Sistema consulta asignaturas donde estudiante está matriculado
3. Sistema muestra lista de asignaturas con:
   - Código y nombre
   - Periodo académico
   - Nombre del docente
   - Total de RAs
   - Total de actividades
4. Estudiante puede seleccionar una asignatura

**Diagrama**: `docs/diagramas/casos_de_uso/casos_uso_estudiante.puml`

---

### CU-EST-004: Ver Actividades Agrupadas

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante autenticado, asignatura seleccionada  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Estudiante selecciona una asignatura
2. Sistema consulta actividades de la asignatura
3. Sistema agrupa actividades multi-RA (sin duplicar)
4. Para cada actividad, sistema muestra:
   - Nombre y descripción
   - Tipo de actividad (Quiz, Taller, Parcial, etc.)
   - Fecha de cierre
   - **RAs asociados** (lista):
     * Nombre del RA
     * Porcentaje en el RA
     * Indicadores evaluados
   - Porcentaje total (suma de todos los RAs)
   - Nota obtenida (única para toda la actividad)
   - Retroalimentación del docente
   - Estado: Calificada / Pendiente
5. Estudiante puede ver detalles de cada actividad

**Datos Mostrados**:
```
Actividad: Parcial 1 - POO y Estructuras
Tipo: Parcial
Fecha Cierre: 15/12/2025
RAs:
  - RA1: Programación Orientada a Objetos (60%)
    Indicadores: IND1-1, IND1-2
  - RA2: Estructuras de Datos (40%)
    Indicadores: IND2-1
Porcentaje Total: 100%
Nota: 4.2 / 5.0
Retroalimentación: "Excelente dominio de conceptos"
Estado: Calificada
```

**Diagrama**: `docs/diagramas/secuencia/secuencia_estudiante_actividades.puml`

---

### CU-EST-005: Ver Resumen de Calificaciones

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante autenticado, asignatura seleccionada  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Estudiante selecciona "Ver calificaciones"
2. Sistema calcula:
   - **Nota acumulada (progresiva)**: Promedio sobre actividades calificadas
   - **Nota sobre el total (estricta)**: Incluyendo actividades sin calificar
3. Para cada RA, sistema calcula:
   - Nota progresiva del RA (promedio ponderado de actividades calificadas)
   - Nota estricta del RA (nota obtenida / total posible)
   - Cobertura (% actividades calificadas)
4. Sistema muestra:
   - Tabla con RAs y sus métricas
   - Gráfico de barras de progreso por RA
   - Nota final proyectada

**Ejemplo de Datos**:
```
Asignatura: Programación Avanzada
Nota Acumulada: 4.3 / 5.0 (85%)
Nota Sobre el Total: 3.2 / 5.0 (64%)

RA1: POO (40%)
  - Nota Progresiva: 4.5
  - Nota Estricta: 3.6
  - Cobertura: 80%

RA2: Estructuras de Datos (35%)
  - Nota Progresiva: 4.1
  - Nota Estricta: 3.0
  - Cobertura: 73%

RA3: Algoritmos (25%)
  - Nota Progresiva: 4.2
  - Nota Estricta: 2.8
  - Cobertura: 67%
```

**Fórmulas**:
```
Nota Progresiva (RA) = Σ(nota × peso_actividad) / Σ(peso_actividad_calificada)
Cobertura = (Actividades_calificadas / Total) × 100
Nota Acumulada = Σ(nota_progresiva_RA × %_RA)
```

**Diagrama**: `docs/diagramas/secuencia/secuencia_estudiante_calificaciones.puml`

---

### CU-EST-006: Ver Recursos del Curso

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante autenticado, asignatura seleccionada  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Estudiante selecciona "Recursos"
2. Sistema consulta recursos subidos por el docente
3. Sistema muestra lista con:
   - Título del recurso
   - Tipo de archivo (PDF, DOCX, etc.)
   - Tamaño
   - Fecha de subida
4. Estudiante puede descargar recurso
5. Sistema sirve archivo desde `/media/recursos/`

**Diagrama**: `docs/diagramas/casos_de_uso/casos_uso_estudiante.puml`

---

### CU-EST-007: Ver Notificaciones

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante autenticado  
**Poscondiciones**: Notificaciones marcadas como leídas

**Flujo Normal**:
1. Sistema hace polling cada 30 segundos a `/api/notificaciones/no-leidas/`
2. Sistema actualiza badge con contador de no leídas
3. Estudiante abre dropdown de notificaciones
4. Sistema muestra lista de notificaciones:
   - Nueva calificación disponible
   - Nueva actividad creada
   - Actividad próxima a vencer
   - Nuevo recurso subido
5. Estudiante hace clic en notificación
6. Sistema marca notificación como leída
7. Sistema redirige a página relacionada

**Tipos de Notificaciones**:
- `nueva_calificacion`: "Nueva calificación en Parcial 1"
- `nueva_actividad`: "Nueva actividad: Quiz 2"
- `actividad_proxima`: "Taller 3 vence en 24 horas"
- `nuevo_recurso`: "Nuevo recurso subido: Slides Clase 5"

**Diagrama**: `docs/diagramas/secuencia/secuencia_notificaciones.puml`

---

### CU-EST-008: Gestionar Perfil

**Actor Principal**: Estudiante  
**Precondiciones**: Estudiante autenticado  
**Poscondiciones**: Datos de perfil actualizados

**Flujo Normal**:
1. Estudiante selecciona "Mi Perfil"
2. Sistema muestra datos actuales:
   - Código
   - Nombre
   - Email
   - Documento
   - Avatar
3. Estudiante puede editar:
   - Nombre
   - Email
   - Avatar (JPG/PNG/GIF, max 2MB)
   - Contraseña
4. Sistema valida cambios
5. Sistema actualiza base de datos
6. Sistema muestra mensaje de éxito

**Flujos Alternativos**:
- **FA-001**: Email ya registrado
  * Sistema muestra mensaje "Email ya en uso"
- **FA-002**: Archivo de avatar inválido
  * Sistema muestra mensaje "Formato o tamaño inválido"

**Diagrama**: `docs/diagramas/secuencia/secuencia_perfil.puml`

---

## 3. Casos de Uso del Docente

### CU-DOC-001: Ver Lista de Cursos

**Actor Principal**: Docente  
**Precondiciones**: Docente autenticado  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Sistema muestra dashboard de docente
2. Sistema consulta asignaturas que imparte
3. Sistema muestra lista con:
   - Código y nombre de asignatura
   - Periodo académico
   - Total de estudiantes matriculados
   - Total de RAs
   - Total de actividades creadas
4. Docente puede seleccionar una asignatura

**Diagrama**: `docs/diagramas/casos_de_uso/casos_uso_docente.puml`

---

### CU-DOC-002: Crear Actividad Multi-RA

**Actor Principal**: Docente  
**Precondiciones**: Docente autenticado, asignatura seleccionada  
**Poscondiciones**: Actividad creada, notificaciones enviadas a estudiantes

**Flujo Normal**:
1. Docente selecciona "Crear Actividad"
2. Sistema muestra formulario con:
   - Nombre de actividad
   - Descripción
   - Tipo de actividad (dropdown)
   - Fecha de cierre
   - **Lista de RAs** (checkboxes)
   - Por cada RA seleccionado:
     * Campo de porcentaje
     * Lista de indicadores (checkboxes)
3. Docente selecciona 1 o más RAs
4. Docente asigna porcentajes (suma = 100%)
5. Docente selecciona indicadores para cada RA
6. Docente guarda actividad
7. Sistema valida:
   - Suma de porcentajes = 100%
   - Al menos 1 RA seleccionado
   - Cada RA con al menos 1 indicador
8. Sistema crea **transaccionalmente**:
   - Registro en `actividad`
   - Registros en `ra_actividad` (uno por RA)
   - Registros en `ra_actividad_indicador`
   - Registros en `notas_actividad` (uno por estudiante, nota NULL)
9. Sistema envía notificaciones a estudiantes
10. Sistema muestra mensaje de éxito

**Ejemplo**:
```
Actividad: Parcial 1 - POO y Estructuras
Tipo: Parcial
Fecha Cierre: 15/12/2025

RAs seleccionados:
☑ RA1: Programación Orientada a Objetos (60%)
  ☑ IND1-1: Implementa clases con encapsulamiento
  ☑ IND1-2: Aplica herencia y polimorfismo
  
☑ RA2: Estructuras de Datos (40%)
  ☑ IND2-1: Implementa listas y árboles

Total: 100% ✓
```

**Flujos Alternativos**:
- **FA-001**: Porcentajes no suman 100%
  * Sistema muestra mensaje "Los porcentajes deben sumar 100%"
- **FA-002**: No se seleccionaron indicadores
  * Sistema muestra mensaje "Debe seleccionar al menos un indicador por RA"

**Diagrama**: `docs/diagramas/flujo/flujo_crear_actividad_multi_ra.puml`

---

### CU-DOC-003: Calificar Actividad

**Actor Principal**: Docente  
**Precondiciones**: Docente autenticado, actividad creada  
**Poscondiciones**: Estudiante calificado, notificación enviada

**Flujo Normal**:
1. Docente selecciona "Calificar"
2. Sistema muestra lista de estudiantes matriculados
3. Docente selecciona actividad a calificar (dropdown)
4. Sistema muestra tabla con:
   - Código y nombre de estudiante
   - Campo de nota (0.0 - 5.0)
   - Campo de retroalimentación
   - Estado actual (calificado / pendiente)
5. Docente ingresa nota y retroalimentación
6. Docente guarda calificación
7. Sistema valida nota (0.0 - 5.0)
8. Sistema actualiza `notas_actividad`
9. Sistema envía notificación al estudiante
10. Sistema muestra mensaje de éxito

**Flujos Alternativos**:
- **FA-001**: Nota fuera de rango
  * Sistema muestra mensaje "La nota debe estar entre 0.0 y 5.0"

**Diagrama**: `docs/diagramas/secuencia/secuencia_docente_calificar.puml`

---

### CU-DOC-004: Ver Progreso de Estudiantes

**Actor Principal**: Docente  
**Precondiciones**: Docente autenticado, asignatura seleccionada  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Docente selecciona "Progreso de Estudiantes"
2. Sistema calcula para cada estudiante:
   - Nota acumulada
   - Nota sobre el total
   - Cobertura de calificaciones
3. Sistema muestra tabla con:
   - Código y nombre
   - Nota acumulada
   - Nota estricta
   - Cobertura
   - Estado (Aprobado / En riesgo)
4. Docente puede exportar a CSV

**Diagrama**: `docs/diagramas/secuencia/secuencia_docente_progreso.puml`

---

### CU-DOC-005: Subir Recurso Educativo

**Actor Principal**: Docente  
**Precondiciones**: Docente autenticado, asignatura seleccionada  
**Poscondiciones**: Recurso subido, notificaciones enviadas

**Flujo Normal**:
1. Docente selecciona "Subir Recurso"
2. Sistema muestra formulario:
   - Título del recurso
   - Archivo (file upload)
3. Docente selecciona archivo
4. Sistema valida:
   - Extensión permitida (PDF, DOCX, PPTX, XLSX, ZIP, JPG, PNG)
   - Tamaño <= 10MB
5. Sistema guarda archivo en `/media/recursos/<codigo_asignatura>/`
6. Sistema crea registro en `recurso`
7. Sistema envía notificaciones a estudiantes
8. Sistema muestra mensaje de éxito

**Flujos Alternativos**:
- **FA-001**: Archivo muy grande
  * Sistema muestra mensaje "El archivo no debe superar 10 MB"
- **FA-002**: Extensión no permitida
  * Sistema muestra mensaje "Formato no permitido"

**Diagrama**: `docs/diagramas/secuencia/secuencia_docente_recursos.puml`

---

### CU-DOC-006: Eliminar Recurso

**Actor Principal**: Docente  
**Precondiciones**: Docente autenticado, recurso existe  
**Poscondiciones**: Recurso eliminado del filesystem y base de datos

**Flujo Normal**:
1. Docente selecciona recurso a eliminar
2. Sistema muestra confirmación "¿Eliminar recurso?"
3. Docente confirma
4. Sistema elimina archivo de `/media/recursos/`
5. Sistema elimina registro de `recurso`
6. Sistema muestra mensaje de éxito

**Diagrama**: `docs/diagramas/secuencia/secuencia_docente_recursos.puml`

---

### CU-DOC-007: Gestionar Perfil

Similar a **CU-EST-008**, pero para docente.

**Diagrama**: `docs/diagramas/secuencia/secuencia_perfil.puml`

---

## 4. Casos de Uso del Coordinador

### CU-COORD-001: Ver Dashboard de Estadísticas

**Actor Principal**: Coordinador  
**Precondiciones**: Coordinador autenticado  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Sistema muestra dashboard de coordinador
2. Sistema calcula métricas globales:
   - Total de estudiantes matriculados
   - Total de asignaturas activas
   - Total de docentes
   - Promedio general del programa
   - Distribución de calificaciones (aprobados/reprobados)
3. Sistema muestra gráficos:
   - Barras de promedios por asignatura
   - Pie de distribución de notas
4. Coordinador puede filtrar por periodo

**Diagrama**: `docs/diagramas/casos_de_uso/casos_uso_coordinador.puml`

---

### CU-COORD-002: Ver Detalle de Asignatura

**Actor Principal**: Coordinador  
**Precondiciones**: Coordinador autenticado  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Coordinador selecciona una asignatura
2. Sistema muestra:
   - Información básica (código, nombre, docente, periodo)
   - Total de estudiantes
   - Lista de RAs con porcentajes
   - Total de actividades creadas
3. Coordinador puede ver:
   - Estadísticas detalladas (botón)
   - Lista de estudiantes (botón)

**Diagrama**: `docs/diagramas/secuencia/secuencia_coordinador_detalle_asignatura.puml`

---

### CU-COORD-003: Ver Estadísticas de Asignatura

**Actor Principal**: Coordinador  
**Precondiciones**: Coordinador autenticado, asignatura seleccionada  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Coordinador selecciona "Estadísticas"
2. Sistema calcula:
   - **Globales**:
     * Total de estudiantes
     * Promedio general
     * % de aprobados (nota >= 3.0)
   - **Por RA**:
     * Promedio del RA
     * Cobertura de actividades
     * % de estudiantes en nivel esperado
   - **Por estudiante**:
     * Nota progresiva
     * Nota estricta
     * Cobertura
3. Sistema muestra:
   - Tabla de métricas por RA
   - Tabla de estudiantes con sus notas
   - Gráficos de distribución
4. Coordinador puede exportar a PDF/CSV

**Diagrama**: `docs/diagramas/secuencia/secuencia_coordinador_avance.puml`

---

### CU-COORD-004: Importar Matriculados desde CSV

**Actor Principal**: Coordinador  
**Precondiciones**: Coordinador autenticado, archivo CSV válido  
**Poscondiciones**: Estudiantes matriculados, auditoría registrada

**Flujo Normal**:
1. Coordinador selecciona "Importar Matriculados"
2. Sistema muestra formulario con:
   - File upload
   - Instrucciones de formato CSV
3. Coordinador sube archivo CSV
4. Sistema valida formato: `codigo_estudiante,codigo_asignatura,periodo`
5. Sistema procesa cada fila:
   - Valida que estudiante existe
   - Valida que asignatura existe
   - Valida que periodo existe
   - Verifica que no esté duplicado
6. Sistema crea registros en `matricula`
7. Sistema crea registros en `notas_actividad` (nota NULL) para actividades existentes
8. Sistema registra auditoría en `import_audit`:
   - Total de filas
   - Filas exitosas
   - Filas fallidas con detalle de errores
9. Sistema muestra resumen de importación

**Formato CSV**:
```csv
codigo_estudiante,codigo_asignatura,periodo
EST001,PROG101,2025-1
EST002,PROG101,2025-1
EST003,BD201,2025-1
```

**Flujos Alternativos**:
- **FA-001**: Estudiante no existe
  * Sistema registra error en auditoría
  * Fila no procesada
- **FA-002**: Asignatura no existe
  * Sistema registra error en auditoría
  * Fila no procesada
- **FA-003**: Matrícula duplicada
  * Sistema registra error en auditoría
  * Fila no procesada

**Diagrama**: `docs/diagramas/flujo/flujo_importacion.puml`

---

### CU-COORD-005: Importar Docentes desde CSV

**Actor Principal**: Coordinador  
**Precondiciones**: Coordinador autenticado, archivo CSV válido  
**Poscondiciones**: Docentes asignados a asignaturas, auditoría registrada

**Flujo Normal**:
1. Coordinador selecciona "Importar Docentes"
2. Sistema muestra formulario
3. Coordinador sube archivo CSV
4. Sistema valida formato: `codigo_docente,codigo_asignatura`
5. Sistema procesa cada fila:
   - Valida que docente existe
   - Valida que asignatura existe
   - Actualiza `asignatura.id_docente`
6. Sistema registra auditoría
7. Sistema muestra resumen

**Formato CSV**:
```csv
codigo_docente,codigo_asignatura
DOC001,PROG101
DOC002,BD201
```

**Diagrama**: `docs/diagramas/secuencia/secuencia_coordinador_importacion.puml`

---

### CU-COORD-006: Importar Asignaturas y RAs desde CSV

**Actor Principal**: Coordinador  
**Precondiciones**: Coordinador autenticado, archivo CSV válido  
**Poscondiciones**: Estructura académica creada, auditoría registrada

**Flujo Normal**:
1. Coordinador selecciona "Importar Asignaturas y RAs"
2. Sistema muestra formulario
3. Coordinador sube archivo CSV
4. Sistema valida formato: `codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind`
5. Sistema agrupa por asignatura
6. Sistema valida que suma de porcentajes de RAs = 100%
7. Sistema crea **transaccionalmente**:
   - Registros en `asignatura`
   - Registros en `ra`
   - Registros en `indicador`
8. Sistema registra auditoría
9. Sistema muestra resumen

**Formato CSV**:
```csv
codigo_asig,nombre_asig,codigo_ra,nombre_ra,porcentaje_ra,codigo_ind,nombre_ind
PROG101,Programación Avanzada,RA1,POO,40,IND1-1,Implementa clases
PROG101,Programación Avanzada,RA1,POO,40,IND1-2,Aplica herencia
PROG101,Programación Avanzada,RA2,Estructuras,35,IND2-1,Implementa listas
PROG101,Programación Avanzada,RA3,Algoritmos,25,IND3-1,Analiza complejidad
```

**Flujos Alternativos**:
- **FA-001**: Porcentajes no suman 100%
  * Sistema registra error crítico
  * Rollback de toda la asignatura

**Diagrama**: `docs/diagramas/secuencia/secuencia_coordinador_importacion.puml`

---

### CU-COORD-007: Ver Historial de Importaciones

**Actor Principal**: Coordinador  
**Precondiciones**: Coordinador autenticado  
**Poscondiciones**: Ninguna

**Flujo Normal**:
1. Coordinador selecciona "Historial de Importaciones"
2. Sistema consulta tabla `import_audit`
3. Sistema muestra lista con:
   - Tipo de importación
   - Fecha
   - Archivo CSV
   - Total de filas
   - Filas exitosas / fallidas
   - Detalle de errores (JSON)
4. Coordinador puede descargar log de errores

**Diagrama**: `docs/diagramas/casos_de_uso/casos_uso_coordinador.puml`

---

### CU-COORD-008: Gestionar Perfil

Similar a **CU-EST-008**, pero para coordinador.

**Diagrama**: `docs/diagramas/secuencia/secuencia_perfil.puml`

---

## 5. Casos de Uso Comunes

### CU-COM-001: Cerrar Sesión

**Actor Principal**: Todos los usuarios  
**Precondiciones**: Usuario autenticado  
**Poscondiciones**: Sesión cerrada

**Flujo Normal**:
1. Usuario selecciona "Cerrar Sesión"
2. Sistema elimina token JWT del frontend (localStorage)
3. Sistema redirige a página de login

**Nota**: Como el sistema es stateless (JWT), no hay invalidación de token en backend.

---

### CU-COM-002: Cambiar Contraseña

**Actor Principal**: Todos los usuarios  
**Precondiciones**: Usuario autenticado  
**Poscondiciones**: Contraseña actualizada

**Flujo Normal**:
1. Usuario selecciona "Cambiar Contraseña" en perfil
2. Sistema muestra formulario:
   - Contraseña actual
   - Nueva contraseña
   - Confirmar nueva contraseña
3. Usuario ingresa datos
4. Sistema valida contraseña actual
5. Sistema valida que nuevas contraseñas coincidan
6. Sistema actualiza contraseña (hash PBKDF2)
7. Sistema muestra mensaje de éxito

**Flujos Alternativos**:
- **FA-001**: Contraseña actual incorrecta
  * Sistema muestra mensaje "Contraseña actual incorrecta"
- **FA-002**: Nuevas contraseñas no coinciden
  * Sistema muestra mensaje "Las contraseñas no coinciden"

**Diagrama**: `docs/diagramas/secuencia/secuencia_perfil.puml`

---

## 6. Reglas de Negocio

### RN-001: Validación de Porcentajes de RAs
Los porcentajes de todos los RAs de una asignatura deben sumar exactamente 100%.

### RN-002: Validación de Porcentajes en Actividad Multi-RA
Los porcentajes de todos los RAs en una actividad deben sumar exactamente 100%.

### RN-003: Indicadores Válidos
Al crear una actividad multi-RA, los indicadores seleccionados deben pertenecer al RA correspondiente.

### RN-004: Nota Única por Actividad
Una actividad multi-RA tiene una única nota que se distribuye proporcionalmente entre los RAs según el porcentaje asignado.

### RN-005: Expiración de OTP
Los códigos OTP para recuperación de contraseña expiran después de 15 minutos.

### RN-006: Rango de Notas
Las notas deben estar en el rango [0.0, 5.0].

### RN-007: Cobertura Mínima
No hay cobertura mínima forzada, pero el sistema calcula métricas de cobertura para visibilidad.

---

## 7. Prioridad de Casos de Uso

### Críticos (MVP)
- CU-EST-001: Iniciar Sesión
- CU-EST-002: Recuperar Contraseña
- CU-EST-004: Ver Actividades Agrupadas
- CU-EST-005: Ver Resumen de Calificaciones
- CU-DOC-002: Crear Actividad Multi-RA
- CU-DOC-003: Calificar Actividad

### Altos
- CU-COORD-004: Importar Matriculados
- CU-COORD-005: Importar Docentes
- CU-COORD-006: Importar Asignaturas y RAs
- CU-DOC-005: Subir Recurso
- CU-EST-007: Ver Notificaciones

### Medios
- CU-COORD-003: Ver Estadísticas de Asignatura
- CU-DOC-004: Ver Progreso de Estudiantes
- CU-COM-002: Cambiar Contraseña

---

## 8. Referencias

### 8.1 Diagramas Relacionados
- **Diagramas de casos de uso**: `docs/diagramas/casos_de_uso/`
- **Diagramas de secuencia**: `docs/diagramas/secuencia/`
- **Diagramas de flujo**: `docs/diagramas/flujo/`

### 8.2 Documentación Relacionada
- **Requerimientos**: `docs/REQUERIMIENTOS.md`
- **Modelo Relacional**: `docs/MODELO_RELACIONAL.md`
- **Manual de Usuario**: `docs/MANUAL_USUARIO.md`
- **Manual de Administrador**: `docs/MANUAL_ADMINISTRADOR.md`

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del documento**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager
