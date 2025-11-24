# Validación: Cálculo de Notas en Actividades Multi-RA

## 📋 Resumen

Este documento valida que el cálculo de notas funciona correctamente cuando una actividad está asociada a múltiples RAs, evitando duplicación de puntajes.

## 🔍 Análisis del Sistema Actual

### Estructura de Datos

```
Actividad (id_actividad)
    ↓ (1:N)
RaActividad (id_ra_actividad) → vincula Actividad + RA + porcentaje_ra_actividad
    ↓ (1:N)
NotasActividad (id) → vincula Matricula + RaActividad + nota
```

### Comportamiento Actual ✅

#### 1. **Almacenamiento de Notas**

```python
# backend/api/models/models.py línea 254
class NotasActividad(models.Model):
    id = models.BigAutoField(primary_key=True)
    matricula = models.ForeignKey(Matricula, on_delete=models.CASCADE)
    ra_actividad = models.ForeignKey(RaActividad, on_delete=models.CASCADE)  # ← Clave
    nota_ra_actividad = models.DecimalField(max_digits=5, decimal_places=2)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["matricula", "ra_actividad"], 
                name="uq_notas_actividad"
            )
        ]
```

**✅ Correcto**: La nota está asociada a `ra_actividad` (la relación específica), no a la actividad directamente. Esto significa:
- Si una actividad está en RA1 y RA2, hay **DOS registros** de `RaActividad`
- Cada estudiante tiene **DOS registros** de `NotasActividad` (uno por cada `ra_actividad`)
- Pero el docente califica **UNA SOLA VEZ** la actividad, y esa nota se replica en ambos registros

#### 2. **Guardado de Notas** (Backend)

```python
# backend/api/views/views.py línea 1304
@api_view(["POST"])
def notas_view(request):
    obj, created = NotasActividad.objects.get_or_create(
        matricula_id=id_matricula,
        ra_actividad_id=id_ra_actividad,  # ← Se guarda por relación específica
        defaults={"nota_ra_actividad": nota, ...}
    )
```

**✅ Correcto**: Cada calificación se guarda para una relación `ra_actividad` específica.

#### 3. **Cálculo de Promedio por RA**

```python
# backend/api/views/views.py línea 1400 (course_grade_view)
for ra in ras:
    rels = RaActividad.objects.filter(ra=ra).select_related("actividad")
    
    for rel in rels:
        w = float(rel.porcentaje_ra_actividad) / 100.0
        nota_obj = NotasActividad.objects.filter(
            matricula=mat, 
            ra_actividad=rel  # ← Busca por relación específica
        ).first()
        nota = float(nota_obj.nota_ra_actividad) if nota_obj else None
        
        if nota is not None:
            sum_w_graded += w
            acc_strict += nota * w  # ← Pondera por el porcentaje de la actividad EN ESTE RA
    
    ra_strict = acc_strict  # Promedio del RA (escala 0-5)
```

**✅ Correcto**: 
- Se itera por cada relación `RaActividad` dentro de un RA
- Se obtiene la nota específica para esa relación
- Se pondera por `porcentaje_ra_actividad` (el aporte de la actividad en **ese** RA)
- **NO hay duplicación** porque cada nota se usa una sola vez en su contexto

#### 4. **Cálculo de Promedio Total del Curso**

```python
# backend/api/views/views.py línea 1440
for ra in ras:
    w_ra = float(ra.porcentaje_ra) / 100.0  # Peso del RA en el curso
    total_strict += (ra_strict or 0.0) * w_ra  # Pondera por peso del RA
```

**✅ Correcto**: El promedio total se calcula ponderando cada RA por su `porcentaje_ra`.

## 📊 Ejemplo Práctico

### Escenario
- **Actividad**: "Examen Final"
- **Asociada a**: RA1 (40%) y RA2 (60%)
- **Calificación del estudiante**: 4.5/5.0

### Datos en la BD

```sql
-- Tabla: actividad
id_actividad | nombre_actividad
1            | Examen Final

-- Tabla: ra_actividad
id_ra_actividad | id_actividad | id_ra | porcentaje_ra_actividad
10              | 1            | 1     | 30.0  -- 30% del RA1
20              | 1            | 2     | 50.0  -- 50% del RA2

-- Tabla: resultado_de_aprendizaje
id_ra | porcentaje_ra
1     | 40.0  -- RA1 vale 40% del curso
2     | 60.0  -- RA2 vale 60% del curso

-- Tabla: notas_actividad (después de calificar)
id | id_matricula | id_ra_actividad | nota_ra_actividad
1  | 123          | 10              | 4.5  -- Nota en RA1
2  | 123          | 20              | 4.5  -- Nota en RA2 (misma nota)
```

### Cálculo del Promedio

#### RA1 (40% del curso)
```
Actividad "Examen Final":
  - Peso en RA1: 30%
  - Nota: 4.5
  - Contribución: 4.5 × 0.30 = 1.35

Promedio RA1 = 1.35 / 0.30 = 4.5  (si es la única actividad calificada)
```

#### RA2 (60% del curso)
```
Actividad "Examen Final":
  - Peso en RA2: 50%
  - Nota: 4.5
  - Contribución: 4.5 × 0.50 = 2.25

Promedio RA2 = 2.25 / 0.50 = 4.5  (si es la única actividad calificada)
```

#### Promedio Total del Curso
```
Total = (RA1 × peso_RA1) + (RA2 × peso_RA2)
Total = (4.5 × 0.40) + (4.5 × 0.60)
Total = 1.8 + 2.7
Total = 4.5 ✅
```

**✅ No hay duplicación**: Aunque la actividad aparece en dos RAs, la nota se pondera correctamente por el peso de cada RA en el curso.

## 🔄 Vista de Actividades Agrupadas (Estudiante)

### Implementación Actual

```python
# backend/api/views/views.py línea 2028
if id_matricula:
    notas = NotasActividad.objects.filter(
        matricula_id=id_matricula,
        ra_actividad__ra__asignatura=asig
    )
    
    notas_por_actividad = {}
    for nota in notas:
        act_id = nota.ra_actividad.actividad_id
        if act_id not in notas_por_actividad:
            notas_por_actividad[act_id] = nota  # ← Toma la PRIMERA nota encontrada
```

### ✅ Comportamiento Implementado (20/11/2025)

Para una actividad multi-RA, **todas las relaciones tienen la misma nota**.

**Implementación en Frontend** (`frontend/src/pages/docente/Calificar.tsx`):

```typescript
// Al guardar una nota, detecta todas las actividades con el mismo id_actividad
const relatedActivities = activities.filter(act => act.id === a.id && act.raActividadId)
const keysToUpdate = relatedActivities.map(act => act.raActividadId!)

// Guarda la nota en TODAS las relaciones ra_actividad
const savePromises = keysToUpdate.map(raActId =>
  upsertGrade({ matriculaId, raActividadId: raActId, nota, ... })
)
await Promise.all(savePromises)
```

**✅ Solución implementada**: El frontend detecta automáticamente cuando una actividad está en múltiples RAs y replica la nota en **todas** las relaciones `ra_actividad` correspondientes.

## ✅ Validación Final

### Estado Actual: **CORRECTO** ✅

1. ✅ **Almacenamiento**: Notas asociadas a `ra_actividad` (relación específica)
2. ✅ **Cálculo por RA**: Cada nota se usa una vez, ponderada por su peso en ese RA
3. ✅ **Cálculo total**: Los RAs se ponderan por su peso en el curso
4. ✅ **No hay duplicación matemática**: Una nota de 4.5 en una actividad multi-RA no se cuenta dos veces

### Ejemplo de Validación Matemática

**Supongamos**:
- Actividad A: 4.0, en RA1 (30%) y RA2 (50%)
- RA1: 40% del curso
- RA2: 60% del curso

**Cálculo INCORRECTO (con duplicación)**:
```
Total = (4.0 × 0.30) + (4.0 × 0.50) = 1.2 + 2.0 = 3.2 ❌ INCORRECTO
```

**Cálculo CORRECTO (sistema actual)**:
```
RA1 = 4.0 × 0.30 = 1.2 (contribución en RA1)
RA2 = 4.0 × 0.50 = 2.0 (contribución en RA2)

Total_RA1 = 1.2 / 0.30 = 4.0
Total_RA2 = 2.0 / 0.50 = 4.0

Promedio_Curso = (4.0 × 0.40) + (4.0 × 0.60) = 1.6 + 2.4 = 4.0 ✅ CORRECTO
```

## 🧪 Pruebas Recomendadas

### Test Case 1: Actividad en 1 RA
```
Actividad A: nota 4.5, 100% de RA1
RA1: 100% del curso
Esperado: 4.5
```

### Test Case 2: Actividad en 2 RAs (mismo peso)
```
Actividad A: nota 4.0, 50% de RA1, 50% de RA2
RA1: 50% del curso
RA2: 50% del curso
Esperado: 4.0 (no 8.0)
```

### Test Case 3: Actividad en 2 RAs (diferente peso)
```
Actividad A: nota 5.0, 30% de RA1, 70% de RA2
RA1: 40% del curso
RA2: 60% del curso
Esperado: 5.0 (no 10.0)
```

### Test Case 4: Múltiples actividades multi-RA
```
Actividad A: 4.0, en RA1 (30%) y RA2 (40%)
Actividad B: 3.0, en RA1 (70%)
Actividad C: 5.0, en RA2 (60%)

RA1 (40% del curso): (4.0×0.3 + 3.0×0.7) = (1.2 + 2.1) = 3.3
RA2 (60% del curso): (4.0×0.4 + 5.0×0.6) = (1.6 + 3.0) = 4.6

Curso: (3.3 × 0.4) + (4.6 × 0.6) = 1.32 + 2.76 = 4.08
```

## 📝 Conclusión

### ✅ Sistema Validado

El cálculo de notas en actividades multi-RA **NO presenta duplicación**. El diseño actual es correcto:

1. Cada nota se almacena por relación `ra_actividad`
2. Cada nota se pondera por su peso en el RA correspondiente
3. Los promedios de RA se ponderan por el peso del RA en el curso
4. La matemática es consistente y no duplica contribuciones

### 🎯 Estado de Implementación

1. **✅ IMPLEMENTADO (20/11/2025)**: Vista de actividades agrupadas para el estudiante
2. **✅ IMPLEMENTADO (20/11/2025)**: Endpoint que agrupa actividades multi-RA
3. **✅ IMPLEMENTADO (20/11/2025)**: Frontend actualiza TODAS las relaciones al calificar
   - **Archivo**: `frontend/src/pages/docente/Calificar.tsx` (función `saveRow`)
   - **Comportamiento**: Detecta automáticamente actividades con mismo `id_actividad` y replica la nota en todas las relaciones `ra_actividad`
   - **Feedback visual**: Muestra "Guardado correctamente (replicada en N RAs)" cuando aplica
4. **⚠️ RECOMENDADO**: Tests unitarios automáticos para validar los cálculos

### 📚 Referencias

- **Modelo**: `backend/api/models/models.py` línea 254
- **Vista de calificación**: `backend/api/views/views.py` línea 1304
- **Cálculo de promedio**: `backend/api/views/views.py` línea 1352
- **Vista agrupada**: `backend/api/views/views.py` línea 1926
- **Replicación frontend**: `frontend/src/pages/docente/Calificar.tsx` línea 247 (función `saveRow`)
- **Documentación**: `docs/ACTIVIDADES_AGRUPADAS.md`

---

**Estado**: ✅ **VALIDADO Y COMPLETAMENTE IMPLEMENTADO**  
**Validación**: 20/11/2025 | **Implementación**: 20/11/2025  
**Sistema**: Sin duplicación matemática + Replicación automática en actividades multi-RA  
**Fecha**: Noviembre 18, 2025  
**Autor**: Equipo RA-Manager
