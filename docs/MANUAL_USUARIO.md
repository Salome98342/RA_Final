# Manual de Usuario - RA-Manager

**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Audiencia**: Estudiantes y Docentes

---

## 1. Introducción

RA-Manager es un sistema de gestión académica centrado en **Resultados de Aprendizaje (RAs)**. Este manual está dirigido a:

- **Estudiantes**: Consultar calificaciones, actividades y recursos
- **Docentes**: Crear actividades, calificar estudiantes y gestionar recursos

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Accede a la URL del sistema: `http://localhost:5173` (desarrollo)
2. Ingresa tu **código institucional** (ej: `EST001`)
3. Ingresa tu **contraseña**
4. Haz clic en **"Iniciar Sesión"**
5. El sistema te redirigirá a tu dashboard según tu rol

![Login](../backend/docs/screenshots/login.png)

---

### 2.2 Recuperar Contraseña

Si olvidaste tu contraseña:

1. En la página de login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu **email registrado**
3. Haz clic en **"Enviar código"**
4. Revisa tu correo y copia el **código OTP de 6 dígitos**
5. Ingresa el código en el formulario
6. Establece tu **nueva contraseña**
7. Haz clic en **"Restablecer contraseña"**

**Nota**: El código OTP expira en **15 minutos**.

---

## 3. Funcionalidades del Estudiante

### 3.1 Dashboard

Al iniciar sesión, verás el dashboard con:

- **Resumen de cursos**: Total de asignaturas matriculadas
- **Actividades pendientes**: Actividades sin calificar
- **Últimas notificaciones**: Nuevas calificaciones, recursos, etc.

---

### 3.2 Ver Mis Cursos

1. En el menú lateral, haz clic en **"Mis Cursos"**
2. Verás la lista de asignaturas en las que estás matriculado:
   - Código y nombre de la asignatura
   - Periodo académico
   - Docente asignado
   - Total de RAs
   - Total de actividades
3. Haz clic en una asignatura para ver detalles

---

### 3.3 Ver Actividades (Agrupadas)

1. Selecciona una asignatura
2. Haz clic en **"Actividades"**
3. Verás la lista de actividades **sin duplicación** (agrupadas):

Para cada actividad, se muestra:

- **Nombre y descripción**
- **Tipo**: Quiz, Taller, Parcial, etc.
- **Fecha de cierre**
- **RAs asociados** (múltiples):
  - Nombre del RA
  - Porcentaje de la actividad en ese RA
  - Indicadores evaluados
- **Porcentaje total** (suma de todos los RAs)
- **Nota obtenida** (única para toda la actividad)
- **Retroalimentación del docente**
- **Estado**: Calificada ✓ / Pendiente ⏳

**Ejemplo**:

```
Actividad: Parcial 1 - POO y Estructuras
Tipo: Parcial
Fecha Cierre: 15/12/2025

RAs:
  • RA1: Programación Orientada a Objetos (60%)
    Indicadores: IND1-1, IND1-2
  • RA2: Estructuras de Datos (40%)
    Indicadores: IND2-1

Porcentaje Total: 100%
Nota: 4.2 / 5.0
Retroalimentación: "Excelente dominio de conceptos de POO y estructuras básicas"
Estado: Calificada ✓
```

---

### 3.4 Ver Calificaciones (Resumen por RA)

1. Selecciona una asignatura
2. Haz clic en **"Calificaciones"**
3. Verás el resumen de tus notas:

**Métricas Globales**:
- **Nota Acumulada** (progresiva): Promedio sobre actividades calificadas
- **Nota Sobre el Total** (estricta): Incluyendo actividades sin calificar

**Métricas por RA**:
- **Nombre y porcentaje en el curso**
- **Nota Progresiva**: Promedio ponderado de actividades calificadas
- **Nota Estricta**: Nota obtenida / Total del RA
- **Cobertura**: % de actividades calificadas
- **Barra de progreso visual**

**Ejemplo**:

```
Asignatura: Programación Avanzada
Nota Acumulada: 4.3 / 5.0 (85%)
Nota Sobre el Total: 3.2 / 5.0 (64%)

RA1: POO (40%)
  Nota Progresiva: 4.5
  Nota Estricta: 3.6
  Cobertura: 80%
  ████████████████░░░░

RA2: Estructuras de Datos (35%)
  Nota Progresiva: 4.1
  Nota Estricta: 3.0
  Cobertura: 73%
  ██████████████▓░░░░░

RA3: Algoritmos (25%)
  Nota Progresiva: 4.2
  Nota Estricta: 2.8
  Cobertura: 67%
  █████████████▒░░░░░░
```

**Interpretación**:
- **Nota Progresiva**: "Si todas las actividades tuvieran esta nota..."
- **Nota Estricta**: "Tu nota actual considerando actividades sin calificar"
- **Cobertura**: % de actividades ya calificadas

---

### 3.5 Ver Recursos del Curso

1. Selecciona una asignatura
2. Haz clic en **"Recursos"**
3. Verás la lista de recursos subidos por el docente:
   - Título del recurso
   - Tipo de archivo (PDF, DOCX, PPTX, etc.)
   - Tamaño del archivo
   - Fecha de subida
4. Haz clic en **"Descargar"** para obtener el archivo

---

### 3.6 Notificaciones

El sistema te notifica automáticamente sobre:

- ✅ **Nueva calificación disponible**: "Calificación disponible para Parcial 1"
- 📝 **Nueva actividad creada**: "Nueva actividad: Quiz 2"
- ⏰ **Actividad próxima a vencer**: "Taller 3 vence en 24 horas"
- 📚 **Nuevo recurso subido**: "Nuevo recurso: Slides Clase 5"

**Cómo ver notificaciones**:

1. En la barra superior, verás un ícono de campana 🔔 con un **badge** (contador)
2. Haz clic en el ícono para abrir el dropdown
3. Verás la lista de notificaciones (más recientes primero)
4. Haz clic en una notificación para:
   - Marcarla como leída
   - Ir a la página relacionada

---

### 3.7 Gestionar Perfil

1. En la barra superior, haz clic en tu **avatar** o nombre
2. Selecciona **"Mi Perfil"**
3. Verás tus datos:
   - Código (no editable)
   - Nombre
   - Email
   - Documento (no editable)
   - Avatar

**Editar datos**:

1. Haz clic en **"Editar Perfil"**
2. Modifica:
   - Nombre
   - Email
3. Haz clic en **"Guardar Cambios"**

**Cambiar Avatar**:

1. Haz clic en **"Cambiar Avatar"**
2. Selecciona un archivo (JPG, PNG, GIF)
3. Máximo **2 MB**
4. Haz clic en **"Subir"**

**Cambiar Contraseña**:

1. Haz clic en **"Cambiar Contraseña"**
2. Ingresa:
   - Contraseña actual
   - Nueva contraseña
   - Confirmar nueva contraseña
3. Haz clic en **"Guardar"**

---

## 4. Funcionalidades del Docente

### 4.1 Dashboard

Al iniciar sesión, verás:

- **Resumen de cursos**: Total de asignaturas que impartes
- **Actividades creadas**: Total de actividades
- **Estudiantes**: Total de estudiantes en tus cursos
- **Recursos subidos**: Total de recursos

---

### 4.2 Ver Mis Cursos

1. En el menú lateral, haz clic en **"Mis Cursos"**
2. Verás la lista de asignaturas que impartes:
   - Código y nombre
   - Periodo académico
   - Total de estudiantes matriculados
   - Total de RAs
   - Total de actividades
3. Haz clic en una asignatura para gestionar

---

### 4.3 Crear Actividad Multi-RA

**Importante**: Una actividad puede evaluar **múltiples RAs** simultáneamente.

1. Selecciona una asignatura
2. Haz clic en **"Crear Actividad"**
3. Llena el formulario:

**Datos Básicos**:
- **Nombre de la actividad**: (ej: "Parcial 1 - POO y Estructuras")
- **Descripción**: Detalles de la actividad
- **Tipo**: Selecciona de la lista (Quiz, Taller, Parcial, etc.)
- **Fecha de cierre**: Fecha límite de entrega

**Selección de RAs** (Multi-RA):

4. Marca los **checkboxes** de los RAs que la actividad evaluará
5. Para cada RA marcado:
   - Ingresa el **porcentaje** de la actividad en ese RA
   - Marca los **indicadores** específicos que se evaluarán

**Validaciones**:
- La suma de porcentajes de todos los RAs debe ser **100%**
- Debes seleccionar **al menos 1 RA**
- Cada RA debe tener **al menos 1 indicador** marcado

6. Haz clic en **"Crear Actividad"**

**Ejemplo**:

```
Actividad: Parcial 1 - POO y Estructuras
Tipo: Parcial
Fecha Cierre: 15/12/2025

RAs:
☑ RA1: Programación Orientada a Objetos (60%)
  ☑ IND1-1: Implementa clases con encapsulamiento
  ☑ IND1-2: Aplica herencia y polimorfismo
  
☑ RA2: Estructuras de Datos (40%)
  ☑ IND2-1: Implementa listas y árboles

Total: 60% + 40% = 100% ✓
```

**Resultado**:
- Se crea la actividad
- Se crean automáticamente registros de notas vacíos para todos los estudiantes
- Se envían notificaciones a los estudiantes

---

### 4.4 Calificar Estudiantes

1. Selecciona una asignatura
2. Haz clic en **"Calificar"**
3. Selecciona la actividad a calificar (dropdown)
4. Verás la tabla de estudiantes:
   - Código y nombre
   - Campo de nota (0.0 - 5.0)
   - Retroalimentación (opcional)
   - Estado (Calificado / Pendiente)
5. Ingresa la **nota** (una única nota para toda la actividad)
6. Ingresa **retroalimentación** (opcional)
7. Haz clic en **"Guardar"**

**Nota**: La nota se distribuye automáticamente entre los RAs según los porcentajes configurados en la actividad.

**Ejemplo**:
- Actividad: "Parcial 1" evalúa RA1 (60%) y RA2 (40%)
- Estudiante obtiene nota: **4.0**
- Se distribuye:
  - RA1: 4.0 × 60% = 2.4 puntos
  - RA2: 4.0 × 40% = 1.6 puntos

---

### 4.5 Ver Progreso de Estudiantes

1. Selecciona una asignatura
2. Haz clic en **"Progreso"**
3. Verás tabla con:
   - Código y nombre de estudiante
   - Nota acumulada (progresiva)
   - Nota sobre el total (estricta)
   - Cobertura de calificaciones
   - Estado (Aprobado / En riesgo)
4. Puedes exportar a **CSV**

---

### 4.6 Subir Recursos Educativos

1. Selecciona una asignatura
2. Haz clic en **"Recursos"**
3. Haz clic en **"Subir Recurso"**
4. Llena el formulario:
   - **Título**: Nombre descriptivo (ej: "Slides Clase 5")
   - **Archivo**: Selecciona el archivo
5. Haz clic en **"Subir"**

**Formatos permitidos**:
- Documentos: PDF, DOCX, PPTX, XLSX
- Comprimidos: ZIP
- Imágenes: JPG, PNG

**Tamaño máximo**: 10 MB

**Resultado**:
- El recurso se guarda en el servidor
- Se envían notificaciones a los estudiantes

---

### 4.7 Eliminar Recursos

1. En la lista de recursos, haz clic en **"Eliminar"** (ícono de papelera)
2. Confirma la acción
3. El recurso se elimina del servidor

---

### 4.8 Gestionar Perfil

Similar a estudiante (ver sección 3.7).

---

## 5. Preguntas Frecuentes (FAQ)

### 5.1 Estudiante

**P: ¿Por qué veo la misma actividad una sola vez si evalúa varios RAs?**  
R: El sistema agrupa las actividades multi-RA para evitar duplicación. Una actividad tiene una única nota que se distribuye entre los RAs.

**P: ¿Qué es "Nota Progresiva" y "Nota Estricta"?**  
R:
- **Nota Progresiva**: Promedio de las actividades **calificadas** (como si todas tuvieran esa nota)
- **Nota Estricta**: Tu nota actual **incluyendo actividades sin calificar** (como 0)

**P: ¿Qué significa "Cobertura"?**  
R: Porcentaje de actividades que ya han sido calificadas. Ej: Si hay 10 actividades y 7 están calificadas, cobertura = 70%.

**P: ¿Cómo sé si tengo nuevas notificaciones?**  
R: Verás un badge (círculo rojo) con el número de notificaciones sin leer en el ícono de campana 🔔.

**P: ¿Puedo descargar mis calificaciones?**  
R: Actualmente no, pero está planificado para futuras versiones (exportar a PDF/CSV).

---

### 5.2 Docente

**P: ¿Puedo crear una actividad que evalúe solo un RA?**  
R: Sí, simplemente marca un solo RA y asígnale 100% del porcentaje.

**P: ¿Qué pasa si los porcentajes de los RAs no suman 100%?**  
R: El sistema mostrará un error y no permitirá crear la actividad hasta que sumen 100%.

**P: ¿Puedo editar una actividad después de crearla?**  
R: Actualmente no se puede editar la estructura de RAs, pero puedes editar nombre, descripción y fecha de cierre.

**P: ¿Cómo elimino una actividad?**  
R: Ve a la lista de actividades y haz clic en "Eliminar". Esto eliminará también todas las notas asociadas.

**P: ¿Puedo calificar por indicador?**  
R: Actualmente el sistema califica por actividad completa. La granularidad por indicador está planificada para futuras versiones.

**P: ¿Qué pasa si subo un archivo muy grande?**  
R: El sistema rechazará archivos mayores a 10 MB con un mensaje de error.

---

## 6. Solución de Problemas

### 6.1 No puedo iniciar sesión

- Verifica que tu código y contraseña sean correctos
- Si olvidaste tu contraseña, usa **"¿Olvidaste tu contraseña?"**
- Contacta al coordinador si tu usuario está inactivo

### 6.2 No recibo el código OTP por email

- Verifica que tu email esté correctamente registrado
- Revisa la carpeta de **spam/correo no deseado**
- El código expira en **15 minutos**, solicita uno nuevo si es necesario

### 6.3 No veo mis calificaciones

- Verifica que el docente haya calificado las actividades
- Las actividades **sin calificar** aparecen con estado "Pendiente"
- Contacta al docente si hay retrasos

### 6.4 Error al subir recurso

- Verifica el formato del archivo (debe ser PDF, DOCX, PPTX, XLSX, ZIP, JPG, PNG)
- Verifica que el tamaño sea menor a **10 MB**
- Si el problema persiste, contacta soporte técnico

### 6.5 Notificaciones no se actualizan

- Refresca la página (F5)
- El sistema hace polling cada 30 segundos automáticamente
- Verifica tu conexión a internet

---

## 7. Contacto y Soporte

Para soporte técnico o reportar problemas:

- **Email**: soporte@ra-manager.edu
- **Teléfono**: +57 (XXX) XXX-XXXX
- **Horario de atención**: Lunes a Viernes, 8:00 AM - 5:00 PM

---

## 8. Atajos de Teclado (Planificado)

En futuras versiones:

- `Ctrl + K`: Buscar
- `Ctrl + N`: Nueva actividad (docente)
- `Ctrl + P`: Ver perfil
- `Esc`: Cerrar modal

---

## 9. Mejores Prácticas

### 9.1 Estudiantes

- ✅ Revisa tus notificaciones diariamente
- ✅ Consulta tus calificaciones regularmente
- ✅ Descarga los recursos tan pronto se publiquen
- ✅ Mantén tu email actualizado

### 9.2 Docentes

- ✅ Crea actividades con anticipación
- ✅ Califica dentro de los plazos establecidos
- ✅ Proporciona retroalimentación constructiva
- ✅ Sube recursos con títulos descriptivos
- ✅ Verifica que los porcentajes de RAs sumen 100%

---

**Fecha de última actualización**: Diciembre 4, 2025  
**Versión del manual**: 1.0  
**Responsable**: Equipo de Desarrollo RA-Manager
