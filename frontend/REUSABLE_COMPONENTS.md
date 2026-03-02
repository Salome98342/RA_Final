# Componentes y Utilidades Reutilizables

Este documento describe componentes y utilidades disponibles que pueden integrarse cuando sea necesario.

## 📦 Componentes UI

### Alert.tsx
**Ubicación**: `src/components/Alert.tsx`  
**Estado**: Disponible pero no utilizado actualmente (se usa Toast en su lugar)

Componente de alerta con animaciones suaves y cuatro tipos de estado.

#### Características:
- ✅ 4 tipos: `success`, `error`, `warning`, `info`
- ✅ Animaciones de entrada/salida suaves
- ✅ Auto-cierre configurable con duración
- ✅ Botón de cierre manual (dismissible)
- ✅ Iconos de Bootstrap automáticos
- ✅ Accesibilidad completa (ARIA labels)

#### Uso:
```tsx
import Alert from '@/components/Alert'

<Alert 
  type="success" 
  message="Operación exitosa" 
  duration={5000} // Auto-cierre en 5 segundos
  onClose={() => console.log('closed')}
  dismissible={true}
  icon={true}
/>
```

#### Integración futura:
Podría reemplazar algunos usos de Toast cuando se necesite un comportamiento más inline o para mensajes que no requieren notificación flotante.

---

### Dropdown.tsx
**Ubicación**: `src/components/Dropdown.tsx`  
**Estado**: Disponible pero no utilizado actualmente

Componente dropdown personalizado con soporte completo de teclado y accesibilidad.

#### Características:
- ✅ Navegación por teclado (Enter, Space, Escape)
- ✅ ARIA completo (role="combobox", "listbox", "option")
- ✅ Cierre automático al perder foco
- ✅ Estilizado personalizable vía CSS

#### Uso:
```tsx
import Dropdown from '@/components/Dropdown'

const options = [
  { value: '2024-1', label: 'Período 2024-1' },
  { value: '2024-2', label: 'Período 2024-2' }
]

<Dropdown 
  options={options}
  value={selectedPeriod}
  onChange={(newValue) => setSelectedPeriod(newValue)}
/>
```

#### Integración futura:
Puede usarse para selectores de periodo, filtros, o cualquier dropdown personalizado donde se necesite control total del estilo.

---

## 🛠️ Utilidades

### alertMessages.ts
**Ubicación**: `src/utils/alertMessages.ts`  
**Estado**: ✅ **MEJORADO Y LISTO PARA USO**

Biblioteca centralizada de mensajes estandarizados para toda la aplicación.

#### Características:
- ✅ Mensajes consistentes en toda la app
- ✅ Soporte para interpolación de variables
- ✅ Helper `formatMessage()` para variables dinámicas
- ✅ Helper `buildMessage()` para funciones de mensajes
- ✅ Helper `getApiErrorMessage()` para errores de API
- ✅ Mensajes de seguridad (lockout, OTP, contraseñas)

#### Categorías disponibles:
- `auth` - Autenticación, seguridad, contraseñas, OTP
- `profile` - Perfil de usuario, avatar
- `courses` - Cursos y asignaturas
- `activities` - Actividades académicas
- `grades` - Calificaciones
- `ras` - Resultados de Aprendizaje
- `indicators` - Indicadores de logro
- `students` - Estudiantes
- `resources` - Recursos educativos
- `imports` - Importaciones (coordinador)
- `subjects` - Asignaturas
- `general` - Errores generales
- `confirm` - Confirmaciones
- `loading` - Mensajes de carga

#### Uso básico:
```tsx
import { ALERT_MESSAGES } from '@/utils/alertMessages'

// Mensaje simple
alert(ALERT_MESSAGES.auth.loginSuccess)

// Mensaje con función
const attemptsMsg = ALERT_MESSAGES.auth.attemptsRemaining(2)
// "Te quedan 2 intentos"

// Mensaje con variables
import { formatMessage } from '@/utils/alertMessages'
const msg = formatMessage(ALERT_MESSAGES.ras.percentageIncomplete, { percentage: 30 })
// "Falta distribuir el 30% del peso del RA"

// Error de API formateado
import { getApiErrorMessage } from '@/utils/alertMessages'
try {
  await api.post('/endpoint')
} catch (error) {
  const message = getApiErrorMessage(error)
  showToast(message, 'error')
}
```

#### ⚠️ **RECOMENDACIÓN DE INTEGRACIÓN:**
Este archivo ya está mejorado con mensajes de seguridad. Se recomienda:

1. **Reemplazar mensajes hardcoded en Login.tsx** con `ALERT_MESSAGES.auth.*`
2. **Reemplazar mensajes hardcoded en Recuperar.tsx** con `ALERT_MESSAGES.auth.*`
3. **Usar `getApiErrorMessage()` en todos los catches** de API para mensajes consistentes
4. **Eliminar mensajes duplicados** en componentes individuales

Ejemplo de migración en Login.tsx:
```tsx
// ANTES:
showToast('Usuario o contraseña incorrectos', 'error')

// DESPUÉS:
import { ALERT_MESSAGES } from '@/utils/alertMessages'
showToast(ALERT_MESSAGES.auth.loginError, 'error')
```

---

### periods.ts
**Ubicación**: `src/utils/periods.ts`  
**Estado**: Disponible pero no utilizado actualmente

Utilidades para determinación automática de periodo académico actual y separación de cursos por periodo.

#### Funciones disponibles:

##### `getCurrentPeriod(periodos: ProfilePeriodo[]): ProfilePeriodo | null`
Determina el periodo actual basado en:
1. Marcador explícito `is_current: true`
2. Si no, el periodo más reciente que ya comenzó según `fecha_inicio`
3. Fallback al primer periodo si ninguno ha comenzado

##### `separateCoursesByPeriod<T>(courses: T[], currentPeriodId?: number | string): { current: T[]; past: T[] }`
Separa cursos en actuales vs históricos basado en el periodo.

#### Uso:
```tsx
import { getCurrentPeriod, separateCoursesByPeriod } from '@/utils/periods'

const periodos = await fetchPeriodos()
const currentPeriod = getCurrentPeriod(periodos)

const courses = await fetchCourses()
const { current, past } = separateCoursesByPeriod(courses, currentPeriod?.id)
```

#### Integración futura:
Si se necesita filtrado automático de cursos por periodo o determinación inteligente de periodo activo, estas funciones están listas para usar.

---

## 📋 Estado de Integración

| Archivo | Estado | Prioridad Integración | Notas |
|---------|--------|----------------------|-------|
| `Alert.tsx` | Sin uso | Baja | Toast funciona bien actualmente |
| `Dropdown.tsx` | Sin uso | Baja | Solo si se necesita UI personalizado |
| `alertMessages.ts` | ✅ Mejorado | **ALTA** | **Usar para consistencia de mensajes** |
| `periods.ts` | Sin uso | Media | Útil si se implementa filtrado automático |

---

## 🎯 Recomendaciones de Acción

### Alta Prioridad ⚡
1. **Migrar mensajes hardcoded a `alertMessages.ts`**
   - Login.tsx
   - Recuperar.tsx  
   - Profile.tsx
   - Todas las catches de API

### Media Prioridad 📋
2. **Evaluar uso de `periods.ts`** si se requiere filtrado automático de cursos por periodo

### Baja Prioridad 💡
3. **Considerar `Alert.tsx`** solo si se necesita reemplazar Toast en casos específicos
4. **Considerar `Dropdown.tsx`** solo si se necesita personalización total de selects

---

## 📝 Mantenimiento

Este archivo debe actualizarse cuando:
- Se integra alguno de estos componentes
- Se agregan nuevos componentes reutilizables
- Se descubre código que puede convertirse en componente reutilizable
- Se eliminan componentes obsoletos

**Última actualización**: 25/02/2026
