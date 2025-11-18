# Solución al Problema de Duplicación de Actividades Multi-RA

## 📌 Problema Identificado

Cuando una actividad está asociada a más de un Resultado de Aprendizaje (RA), el sistema mostraba **actividades duplicadas** en la vista del estudiante. 

**Ejemplo:**
- Quiz 1 asociado a:
  - RA1 con 15%
  - RA2 con 5%
- **Problema:** Se mostraban como dos actividades separadas
- **Esperado:** Una sola actividad con peso total del 20% y lista de RAs asociados

## ✅ Solución Implementada

### 1. Backend: Endpoint de Actividades Agrupadas

**Archivo:** `backend/api/views/views.py`

Se creó un nuevo endpoint que agrupa las actividades por `id_actividad` en lugar de mostrarlas por cada relación `RaActividad`:

```python
@api_view(['GET'])
def course_activities_grouped_view(request, codigo_asignatura):
    """
    Obtener actividades agrupadas por asignatura (sin duplicación por RA).
    
    Soluciona el problema de duplicación cuando una actividad pertenece a múltiples RAs.
    Agrupa por actividad y retorna lista de RAs asociados con sus porcentajes.
    """
```

**Características clave:**
- Agrupa por `actividad.id_actividad`
- Calcula `porcentaje_total` sumando el peso de la actividad en cada RA
- Retorna array `ras_asociados` con detalles de cada RA:
  - `id_ra`, `titulo_ra`, `porcentaje_ra`
  - `porcentaje_actividad` (peso de la actividad en ese RA)
  - `indicadores` asociados a esa relación
- La nota se obtiene UNA SOLA VEZ por actividad (no duplicada por RA)

**Ruta:** `GET /api/asignaturas/<codigo_asignatura>/actividades-agrupadas/?id_matricula=<id>`

### 2. Frontend: Tipo TypeScript

**Archivo:** `frontend/src/types.ts`

```typescript
export type GroupedActivityRA = {
  id_ra: number | string
  id_ra_actividad: number | string
  titulo_ra: string
  porcentaje_ra: number
  porcentaje_actividad: number
  indicadores: Array<{ 
    id_ind: number | string
    descripcion: string
    porcentaje_ind: number 
  }>
}

export type GroupedActivity = {
  id_actividad: number | string
  nombre_actividad: string
  descripcion: string | null
  fecha_creacion: string
  fecha_cierre: string | null
  tipo_actividad: string
  porcentaje_total: number  // ✨ Suma de porcentajes en todos los RAs
  nota: number | null
  retroalimentacion: string | null
  ras_asociados: GroupedActivityRA[]  // ✨ Lista de RAs asociados
}
```

### 3. Frontend: Servicio API

**Archivo:** `frontend/src/services/api.ts`

```typescript
export async function getCourseActivitiesGrouped(
  courseCode: string,
  opts?: { matriculaId?: string }
): Promise<GroupedActivity[]>
```

### 4. Frontend: Vista Actualizada

**Archivo:** `frontend/src/pages/Estudiante.tsx`

#### Cambios principales:

1. **Toggle de vista:** Se agregó un botón para alternar entre:
   - 🆕 **"Todas las actividades"** (vista agrupada, sin duplicación)
   - 📚 **"Por resultados de aprendizaje"** (vista tradicional por RAs)

2. **Vista de actividades agrupadas:**
   - Muestra una sola card por actividad
   - Peso total calculado automáticamente
   - Lista de RAs asociados con badges
   - Estado único (Pendiente/Calificada/Vencida)

3. **Detalle expandido:**
   - Información completa de la actividad
   - Sección dedicada a "Resultados de aprendizaje asociados"
   - Para cada RA muestra:
     - Título del RA
     - Peso de la actividad en ese RA
     - Peso del RA en la asignatura
     - Indicadores evaluados

## 📊 Comparación Antes vs Después

### Antes (❌ Duplicación)
```
Quiz 1 - RA1 (15%)
  Nota: 4.5
  Estado: Calificada

Quiz 1 - RA2 (5%)
  Nota: 4.5
  Estado: Calificada
```

### Después (✅ Sin Duplicación)
```
Quiz 1 (20% total)
  Nota: 4.5
  Estado: Calificada
  Asociado a 2 RAs:
    • RA1 - Análisis de Sistemas (15% del RA)
    • RA2 - Diseño de Software (5% del RA)
```

## 🔍 Validación de Notas

### Cómo funciona el sistema de notas:

1. **Almacenamiento:** 
   - La nota se almacena en `NotasActividad` con referencia a `ra_actividad_id`
   - Aunque hay múltiples `RaActividad` para la misma actividad, la nota es ÚNICA

2. **Recuperación:**
   - El endpoint agrupa por `actividad.id_actividad`
   - Mapea las notas usando `ra_actividad.actividad_id` (no `ra_actividad_id`)
   - Resultado: una sola nota por actividad, independientemente de cuántos RAs tenga

3. **Cálculo de promedios:**
   - La actividad contribuye al promedio de CADA RA según su `porcentaje_actividad`
   - Ejemplo: Quiz 1 (nota 4.5)
     - Contribuye 15% × 4.5 = 0.675 al promedio de RA1
     - Contribuye 5% × 4.5 = 0.225 al promedio de RA2

## 🧪 Testing Recomendado

### Escenarios a validar:

1. ✅ **Actividad con un solo RA:**
   - Debe mostrarse una sola vez
   - Peso total = porcentaje en ese único RA

2. ✅ **Actividad con múltiples RAs:**
   - Una sola card
   - Peso total = suma de todos los porcentajes
   - Todos los RAs listados en `ras_asociados`

3. ✅ **Notas:**
   - Al calificar desde cualquier RA, la nota aparece en TODOS los RAs
   - El promedio del curso se calcula correctamente

4. ✅ **Filtros:**
   - "Todas" muestra todas las actividades
   - "Pendientes" muestra solo sin calificar
   - "Calificadas" muestra solo con nota
   - "Vencidas" muestra pendientes con fecha_cierre pasada

5. ✅ **Ordenamiento:**
   - Por fecha: ordena por `fecha_cierre`
   - Por nombre: ordena alfabéticamente

## 📝 Notas Técnicas

### Compatibilidad
- ✅ La vista tradicional por RAs sigue funcionando
- ✅ No se modificó el modelo de datos
- ✅ Endpoint retrocompatible (solo lectura)

### Rendimiento
- ✅ Se usa `select_related()` y `prefetch_related()` para optimización
- ✅ Una sola consulta para todas las actividades del curso
- ✅ No se hacen queries N+1

### Seguridad
- ✅ Requiere `id_matricula` del estudiante
- ✅ Valida que la matrícula pertenezca al curso
- ✅ Solo retorna actividades del curso especificado

## 🚀 Próximos Pasos

1. **Testing en desarrollo:**
   - Crear datos de prueba con actividades multi-RA
   - Validar que los cálculos de promedio son correctos

2. **Validación de cálculos:**
   - Verificar que `course_grade_view()` maneja correctamente actividades multi-RA
   - Asegurar que no hay contribución duplicada al promedio

3. **Mejoras futuras (opcional):**
   - Agregar gráfico de distribución de peso por RA
   - Notificación cuando una actividad multi-RA es calificada
   - Export/print de actividades agrupadas

## 📚 Archivos Modificados

### Backend
- ✅ `backend/api/views/views.py` - Endpoint `course_activities_grouped_view`
- ✅ `backend/api/urls/urls.py` - Ruta registrada

### Frontend
- ✅ `frontend/src/types.ts` - Tipos `GroupedActivity` y `GroupedActivityRA`
- ✅ `frontend/src/services/api.ts` - Función `getCourseActivitiesGrouped()`
- ✅ `frontend/src/pages/Estudiante.tsx` - Vista actualizada con toggle y detalle

## ✨ Beneficios

1. **Claridad:** Los estudiantes ven exactamente cuántas actividades tienen
2. **Transparencia:** Se muestra claramente el peso total y desglose por RA
3. **Eficiencia:** Una sola consulta para todas las actividades
4. **Flexibilidad:** Toggle permite elegir entre vista agrupada o por RAs
5. **Integridad:** La nota sigue siendo única, evitando confusiones

---

**Fecha de implementación:** 2025-01-XX  
**Estado:** ✅ Implementado - Pendiente de testing
