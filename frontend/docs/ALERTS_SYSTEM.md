# Sistema de Alertas Mejorado - RA Manager

## 📋 Descripción

Este sistema proporciona alertas y notificaciones mejoradas con animaciones fluidas, mejor redacción y experiencia de usuario optimizada en toda la aplicación.

## 🎨 Componentes Disponibles

### 1. **Toast** - Notificaciones Flotantes
Notificaciones temporales que aparecen en la parte superior de la pantalla.

```tsx
import Toast from '@/components/Toast'

// Uso básico
<Toast text="Operación exitosa" type="ok" />
<Toast text="Error al procesar" type="error" />
<Toast text="Advertencia importante" type="warning" />
<Toast text="Información relevante" type="info" />

// Con duración personalizada y callback
<Toast 
  text="Guardado correctamente" 
  type="ok"
  duration={3000}
  onClose={() => console.log('Toast cerrado')}
/>
```

**Props:**
- `text` (string, required): Mensaje a mostrar
- `type` ('ok' | 'error' | 'warning' | 'info', default: 'ok'): Tipo de alerta
- `duration` (number, default: 3000): Duración en milisegundos (0 = permanente)
- `onClose` (() => void, optional): Callback al cerrar

### 2. **Alert** - Alertas de Bootstrap Mejoradas
Alertas integradas con el diseño de la aplicación, ideales para formularios y páginas.

```tsx
import Alert from '@/components/Alert'

<Alert 
  type="success" 
  message="Actividad creada exitosamente"
  icon={true}
/>

<Alert 
  type="error" 
  message="Error al guardar los cambios"
  duration={0}
  onClose={() => handleCloseAlert()}
/>
```

**Props:**
- `type` ('success' | 'error' | 'warning' | 'info', required): Tipo de alerta
- `message` (string, required): Mensaje a mostrar
- `duration` (number, default: 0): Duración en milisegundos (0 = permanente)
- `onClose` (() => void, optional): Callback al cerrar
- `icon` (boolean, default: true): Mostrar icono

### 3. **useAlert Hook** - Gestión de Alertas en Componentes
Hook personalizado para manejar alertas fácilmente en tus componentes.

```tsx
import { useAlert } from '@/hooks/useAlert'
import Alert from '@/components/Alert'

function MyComponent() {
  const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()

  const handleSave = async () => {
    try {
      await saveData()
      showSuccess('Datos guardados correctamente')
    } catch (error) {
      showError('Error al guardar los datos')
    }
  }

  return (
    <div>
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
      <button onClick={handleSave}>Guardar</button>
    </div>
  )
}
```

**Métodos del Hook:**
- `showSuccess(message, duration?)`: Muestra alerta de éxito
- `showError(message, duration?)`: Muestra alerta de error
- `showWarning(message, duration?)`: Muestra alerta de advertencia
- `showInfo(message, duration?)`: Muestra alerta informativa
- `hideAlert()`: Oculta la alerta actual

## 📝 Mensajes Estandarizados

Usa los mensajes predefinidos para mantener consistencia:

```tsx
import { ALERT_MESSAGES, getApiErrorMessage } from '@/utils/alertMessages'

// Mensajes de autenticación
showSuccess(ALERT_MESSAGES.auth.loginSuccess)
showError(ALERT_MESSAGES.auth.loginError)

// Mensajes de actividades
showSuccess(ALERT_MESSAGES.activities.createSuccess)
showError(ALERT_MESSAGES.activities.createError)

// Manejo de errores de API
try {
  await api.post('/endpoint', data)
} catch (error) {
  const errorMessage = getApiErrorMessage(error)
  showError(errorMessage)
}

// Mensajes con variables
import { formatMessage } from '@/utils/alertMessages'
const message = formatMessage(
  ALERT_MESSAGES.ras.percentageIncomplete,
  { percentage: 25 }
)
showWarning(message) // "Falta distribuir el 25% del peso del RA"
```

## 🎭 Tipos de Alertas y Casos de Uso

### ✅ Success (Éxito)
**Color:** Verde  
**Icono:** Check circle  
**Uso:** Confirmación de operaciones exitosas

```tsx
showSuccess('Actividad creada exitosamente')
showSuccess('Calificaciones guardadas correctamente')
showSuccess('Perfil actualizado')
```

### ❌ Error
**Color:** Rojo  
**Icono:** Exclamation triangle  
**Uso:** Errores críticos que impiden completar una acción

```tsx
showError('Error al cargar los datos')
showError('Usuario o contraseña incorrectos')
showError('No tienes permisos para esta acción')
```

### ⚠️ Warning (Advertencia)
**Color:** Naranja/Amarillo  
**Icono:** Exclamation circle  
**Uso:** Advertencias importantes que no bloquean, pero requieren atención

```tsx
showWarning('La suma de porcentajes no puede exceder el 100%')
showWarning('Tienes cambios sin guardar')
showWarning('El archivo excede el tamaño máximo permitido')
```

### ℹ️ Info (Información)
**Color:** Azul  
**Icono:** Info circle  
**Uso:** Información contextual útil, estados vacíos

```tsx
showInfo('No hay actividades programadas')
showInfo('Selecciona un curso para ver más detalles')
showInfo('Los cambios se guardarán automáticamente')
```

## 🎬 Animaciones

Las alertas incluyen animaciones suaves:

- **Entrada:** `slideInDown` con efecto de rebote
- **Salida:** `slideOutUp` con desvanecimiento
- **Pulso sutil:** Para alertas críticas (error/warning)
- **Glow:** Efecto de brillo para alertas de éxito

Las animaciones están definidas en `src/styles/animations.css` y se aplican automáticamente.

## 🎨 Estilos y Personalización

### Modificar Duración de Animaciones

Edita `src/styles/animations.css`:

```css
.alert.show {
  animation: slideInDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Cambiar Colores

Los colores están en los gradientes del archivo CSS:

```css
.mensaje.ok {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
}
```

## 📚 Ejemplos Completos

### Ejemplo 1: Formulario de Creación

```tsx
import { useState } from 'react'
import { useAlert } from '@/hooks/useAlert'
import Alert from '@/components/Alert'
import { ALERT_MESSAGES } from '@/utils/alertMessages'

function CreateActivityForm() {
  const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()
  const [formData, setFormData] = useState({ name: '', percentage: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación
    if (!formData.name) {
      showWarning(ALERT_MESSAGES.activities.nameRequired, 5000)
      return
    }

    if (formData.percentage > 100) {
      showError(ALERT_MESSAGES.activities.invalidPercentage)
      return
    }

    // Envío
    try {
      await createActivity(formData)
      showSuccess(ALERT_MESSAGES.activities.createSuccess, 4000)
      // Redirigir o limpiar formulario
    } catch (error) {
      showError(ALERT_MESSAGES.activities.createError)
    }
  }

  return (
    <div>
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
      
      <form onSubmit={handleSubmit}>
        {/* campos del formulario */}
        <button type="submit">Crear Actividad</button>
      </form>
    </div>
  )
}
```

### Ejemplo 2: Carga de Datos con Estados

```tsx
import { useEffect } from 'react'
import { useAlert } from '@/hooks/useAlert'
import Alert from '@/components/Alert'
import { ALERT_MESSAGES, getApiErrorMessage } from '@/utils/alertMessages'

function CoursesList() {
  const { alert, showError, showInfo, hideAlert } = useAlert()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const data = await api.get('/courses')
      setCourses(data)
      
      if (data.length === 0) {
        showInfo(ALERT_MESSAGES.courses.empty, 0)
      }
    } catch (error) {
      showError(getApiErrorMessage(error), 0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
      
      {/* Renderizar lista */}
    </div>
  )
}
```

## 🔄 Migración de Código Existente

### Antes:
```tsx
const [error, setError] = useState<string | null>(null)
// ...
{error && <div className="alert alert-danger">{error}</div>}
```

### Después:
```tsx
const { alert, showError, hideAlert } = useAlert()
// ...
{alert.show && <Alert type={alert.type} message={alert.message} onClose={hideAlert} />}
```

## 📱 Accesibilidad

Todas las alertas incluyen:
- ✅ `role="alert"` o `role="status"`
- ✅ `aria-live="polite"`
- ✅ `aria-label` descriptivo
- ✅ Iconos con `aria-hidden="true"`
- ✅ Botones de cierre con `aria-label`
- ✅ Colores con suficiente contraste

## 🐛 Troubleshooting

**Las alertas no aparecen:**
- Verifica que `animations.css` esté importado en `main.tsx`
- Comprueba que el componente Alert esté renderizado
- Revisa la consola por errores

**Animaciones no funcionan:**
- Verifica que las clases CSS se apliquen correctamente
- Comprueba el inspector del navegador
- Asegúrate de que no haya conflictos con otros estilos

**Mensajes no se cierran automáticamente:**
- Verifica el valor de `duration` (debe ser > 0)
- Comprueba que los useEffect se estén ejecutando
- Revisa si hay errores en la consola

## 📖 Recursos Adicionales

- **Bootstrap Icons:** https://icons.getbootstrap.com/
- **Bootstrap Alerts:** https://getbootstrap.com/docs/5.3/components/alerts/
- **Cubic Bezier Generator:** https://cubic-bezier.com/

---

**Última actualización:** Noviembre 2024  
**Versión:** 2.0  
**Autor:** Equipo RA Manager
