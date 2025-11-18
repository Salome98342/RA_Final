# Optimizaciones Recomendadas - RA-Manager

Este documento lista optimizaciones identificadas para mejorar el rendimiento del proyecto. Estas son **sugerencias** para futuras iteraciones y no bloquean el funcionamiento actual.

---

## 🔍 Backend - Optimizaciones de Queries

### 1. **Uso de `select_related` y `prefetch_related`**

**Problema**: Queries N+1 donde se hace un query adicional por cada relación.

**Ubicación**: `backend/api/views/views.py`

#### Ejemplos identificados:

**Línea 208-211** - `get_course_activities`:
```python
# ACTUAL
ras = ResultadoDeAprendizaje.objects.filter(asignatura=asig).order_by("id_ra")
for ra in ras:
    rels = RaActividad.objects.filter(ra=ra)  # N+1 query
```

**OPTIMIZADO**:
```python
ras = ResultadoDeAprendizaje.objects.filter(asignatura=asig)\
    .prefetch_related('raactividad_set__actividad__tipo')\
    .order_by("id_ra")
```

---

**Línea 301-303** - `get_course_grades`:
```python
# ACTUAL
ras = list(ResultadoDeAprendizaje.objects.filter(asignatura=asig).order_by("id_ra"))
for rel in RaActividad.objects.filter(ra__asignatura=asig).select_related("actividad", "ra"):
```

**OPTIMIZADO**:
```python
ras = list(ResultadoDeAprendizaje.objects.filter(asignatura=asig)\
    .prefetch_related('raactividad_set__actividad__tipo')\
    .order_by("id_ra"))
```

---

### 2. **Cache de queries repetitivas**

**Problema**: Queries a tablas de catálogo (TipoActividad, Programa, etc.) que no cambian frecuentemente.

**Solución**: Implementar cache con Django cache framework

**Ejemplo**:
```python
from django.core.cache import cache

@api_view(['GET'])
def get_activity_types(request):
    types = cache.get('activity_types')
    if not types:
        types = list(TipoActividad.objects.all().values())
        cache.set('activity_types', types, 3600)  # 1 hora
    return Response(types)
```

**Aplica a**:
- `get_activity_types` (línea 841)
- `get_programs` (línea 845)
- `get_document_types` (línea 837)

---

### 3. **Uso de `only()` y `defer()` para queries específicas**

**Problema**: Se traen todos los campos cuando solo se necesitan algunos.

**Ejemplo - Línea 849**:
```python
# ACTUAL
queryset = Docente.objects.all()

# OPTIMIZADO (si solo necesitas nombre y código)
queryset = Docente.objects.only('id_docente', 'nombre', 'codigo_docente')
```

---

### 4. **Bulk operations**

**Problema**: Operaciones dentro de loops que pueden hacerse en bulk.

**Ejemplo - Importaciones de coordinador**:
```python
# ACTUAL (múltiples INSERT)
for row in data:
    Estudiante.objects.create(...)

# OPTIMIZADO (single INSERT)
estudiantes = [Estudiante(**row) for row in data]
Estudiante.objects.bulk_create(estudiantes, ignore_conflicts=True)
```

---

## ⚡ Frontend - Optimizaciones de Performance

### 1. **Memoización de componentes**

**Problema**: Re-renders innecesarios de componentes costosos.

**Solución**: Usar `React.memo` para componentes que reciben las mismas props.

**Ejemplo**:
```typescript
// components/StudentList.tsx
const StudentList: React.FC<Props> = React.memo(({ students, onSelect }) => {
  // ... render logic
}, (prevProps, nextProps) => {
  return prevProps.students === nextProps.students
})
```

**Aplica a**:
- `StudentList.tsx`
- `RaCard.tsx`
- `CardGrid.tsx`

---

### 2. **Debounce en búsquedas**

**Problema**: Se disparan requests en cada tecla presionada.

**Ubicación**: Filtros de búsqueda en vistas de Docente, Estudiante, Coordinador.

**Solución**:
```typescript
import { useState, useEffect } from 'react'

const [filter, setFilter] = useState('')
const [debouncedFilter, setDebouncedFilter] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedFilter(filter)
  }, 300)
  
  return () => clearTimeout(timer)
}, [filter])

// Usar debouncedFilter para la búsqueda
useEffect(() => {
  if (debouncedFilter) {
    performSearch(debouncedFilter)
  }
}, [debouncedFilter])
```

---

### 3. **Lazy loading de rutas**

**Problema**: Todo el JavaScript se carga al inicio.

**Ubicación**: `App.tsx`

**Solución**:
```typescript
import { lazy, Suspense } from 'react'

const Docente = lazy(() => import('@/pages/Docente'))
const Estudiante = lazy(() => import('@/pages/Estudiante'))
const Coordinador = lazy(() => import('@/pages/coordinador/Dashboard'))

// En el render:
<Suspense fallback={<div>Cargando...</div>}>
  <Route path="/docente" element={<Docente />} />
</Suspense>
```

---

### 4. **Virtualización de listas largas**

**Problema**: Listas con muchos elementos renderizados a la vez.

**Ubicación**: Listas de estudiantes en Coordinador, actividades en Docente.

**Solución**: Usar `react-window` o `react-virtual`

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={students.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {students[index].nombre}
    </div>
  )}
</FixedSizeList>
```

---

### 5. **Optimización de useEffect**

**Problema**: `useEffect` sin array de dependencias correcto causa re-renders.

**Ejemplo encontrado** (varios archivos):
```typescript
// ❌ INCORRECTO
useEffect(() => {
  loadData()
}, []) // loadData no está en deps, ESLint warning

// ✅ CORRECTO - Opción 1: incluir dependencia
useEffect(() => {
  loadData()
}, [loadData])

// ✅ CORRECTO - Opción 2: usar useCallback
const loadData = useCallback(async () => {
  // lógica
}, [/* deps reales */])
```

---

## 📦 Optimizaciones de Build

### 1. **Code splitting por ruta**

Implementar lazy loading (ver sección frontend #3)

### 2. **Tree shaking**

Verificar imports:
```typescript
// ❌ EVITAR (importa toda la librería)
import _ from 'lodash'

// ✅ MEJOR (solo importa lo necesario)
import debounce from 'lodash/debounce'
```

### 3. **Compresión de assets**

**Backend - settings.py**:
```python
# Para producción
MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',  # Agregar al inicio
    # ... resto de middleware
]
```

**Frontend - vite.config.ts**:
```typescript
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip' })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true  // Remover console.log en prod
      }
    }
  }
})
```

---

## 🗄️ Base de Datos

### 1. **Índices**

Agregar índices para columnas frecuentemente consultadas:

```sql
-- Índices recomendados
CREATE INDEX idx_matricula_asignatura ON matricula(asignatura_id);
CREATE INDEX idx_matricula_estudiante ON matricula(estudiante_id);
CREATE INDEX idx_notas_matricula ON notas_actividad(matricula_id);
CREATE INDEX idx_notas_ra_actividad ON notas_actividad(ra_actividad_id);
CREATE INDEX idx_actividad_asignatura ON actividad(asignatura_id);
```

**O en Django models**:
```python
class Matricula(models.Model):
    # ... campos
    
    class Meta:
        indexes = [
            models.Index(fields=['asignatura']),
            models.Index(fields=['estudiante']),
            models.Index(fields=['asignatura', 'periodo']),
        ]
```

### 2. **VACUUM y ANALYZE**

Para PostgreSQL, ejecutar periódicamente:
```sql
VACUUM ANALYZE;
```

### 3. **Connection pooling**

Usar `django-db-connection-pool` para reutilizar conexiones:

```bash
pip install django-db-connection-pool
```

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'dj_db_conn_pool.backends.postgresql',
        'CONN_MAX_AGE': 0,
        'POOL_OPTIONS': {
            'POOL_SIZE': 10,
            'MAX_OVERFLOW': 10
        },
        # ... resto de config
    }
}
```

---

## 📊 Monitoreo

### 1. **Django Debug Toolbar** (solo desarrollo)

```bash
pip install django-debug-toolbar
```

Ayuda a identificar queries lentas y N+1.

### 2. **Frontend - React DevTools Profiler**

Usar el Profiler de React DevTools para identificar componentes lentos.

### 3. **Logging de queries lentas**

**settings.py**:
```python
LOGGING = {
    # ... config existente
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}
```

---

## 📝 Priorización

### 🔴 Alta Prioridad (Impacto inmediato)
1. Agregar índices en base de datos
2. Implementar `select_related/prefetch_related` en endpoints más usados
3. Debounce en búsquedas frontend

### 🟡 Media Prioridad (Mejora notable)
4. Cache de catálogos (tipos, programas)
5. Lazy loading de rutas
6. Memoización de componentes pesados

### 🟢 Baja Prioridad (Mejora progresiva)
7. Virtualización de listas
8. Connection pooling
9. Compression de assets

---

## 🧪 Cómo Medir Mejoras

### Backend
```python
import time
from django.db import connection

start = time.time()
# ... tu código
end = time.time()
print(f"Tiempo: {end - start}s")
print(f"Queries: {len(connection.queries)}")
```

### Frontend
```typescript
const start = performance.now()
// ... tu código
const end = performance.now()
console.log(`Tiempo: ${end - start}ms`)
```

---

**Nota**: Estas optimizaciones no son urgentes para el funcionamiento actual. Se recomienda implementarlas progresivamente basándose en métricas reales de uso.

**Última actualización**: Noviembre 2025
