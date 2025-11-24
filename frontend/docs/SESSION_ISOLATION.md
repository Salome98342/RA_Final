# Sistema de Aislamiento de Sesiones

## Problema Resuelto

### 🔴 Problema Original
- **Múltiples pestañas compartían la misma sesión** → Login en una pestaña sobrescribía el token en todas
- **La ruta `/estudiante` no tenía ID** → Dependía solo del token actual, causando confusión
- **localStorage compartido entre pestañas** → No había aislamiento de sesiones

### ✅ Solución Implementada

## 1. Sistema de Almacenamiento en Capas

```typescript
// Prioridad de almacenamiento:
sessionStorage (PRIORIDAD) → localStorage (FALLBACK)
```

### `sessionStorage` - Aislado por Pestaña
- **Ventaja**: Cada pestaña tiene su propio storage independiente
- **Ciclo de vida**: Se limpia al cerrar la pestaña
- **Uso**: Token de autenticación actual

### `localStorage` - Compartido entre Pestañas
- **Ventaja**: Persiste entre recargas de página
- **Ciclo de vida**: Persiste hasta logout manual
- **Uso**: Fallback y persistencia

## 2. Funciones de Gestión de Tokens

### `getAuthToken()`
```typescript
// 1. Busca en sessionStorage (aislado por pestaña)
// 2. Si no existe, busca en localStorage
// 3. Si encuentra en localStorage, lo migra a sessionStorage
// 4. Retorna el token o null
```

### `setAuthToken(token)`
```typescript
// 1. Guarda en sessionStorage (aislamiento)
// 2. Guarda en localStorage (persistencia)
```

### `removeAuthToken()`
```typescript
// 1. Limpia sessionStorage
// 2. Limpia localStorage
// 3. Limpia todo el sessionStorage de la pestaña
```

## 3. Protección de Rutas

### Sistema `<ProtectedRoute>`

```tsx
<ProtectedRoute allowedRoles={['estudiante']}>
  <Estudiante />
</ProtectedRoute>
```

**Validaciones:**
1. ✅ Verifica existencia de token
2. ✅ Verifica rol del usuario
3. ✅ Redirige a login si no hay token
4. ✅ Redirige a dashboard correcto si rol no autorizado

### Configuración de Rutas

| Ruta | Roles Permitidos |
|------|------------------|
| `/estudiante` | `estudiante` |
| `/docente/*` | `docente`, `coordinador` |
| `/coordinador/*` | `coordinador` |
| `/perfil` | `docente`, `estudiante`, `coordinador` |

## 4. Flujo de Login

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario hace login                                       │
│    ↓                                                         │
│ 2. Backend devuelve token JWT                               │
│    ↓                                                         │
│ 3. setAuthToken(token)                                      │
│    ├─> Guarda en sessionStorage (pestaña actual)           │
│    └─> Guarda en localStorage (persistencia)               │
│    ↓                                                         │
│ 4. Redirige al dashboard según rol                          │
└─────────────────────────────────────────────────────────────┘
```

## 5. Flujo Multi-Pestaña

### Escenario: Dos Estudiantes en Diferentes Pestañas

```
PESTAÑA A (Estudiante Juan)
├─ sessionStorage: { auth_token: "TOKEN_JUAN" }
├─ localStorage: { auth_token: "TOKEN_JUAN" }
└─ Estado: Muestra perfil de Juan ✅

Usuario abre PESTAÑA B y hace login con María

PESTAÑA B (Estudiante María)
├─ sessionStorage: { auth_token: "TOKEN_MARIA" }
├─ localStorage: { auth_token: "TOKEN_MARIA" } ⚠️ (Sobrescribe)
└─ Estado: Muestra perfil de María ✅

PESTAÑA A (Estudiante Juan) - SIN CAMBIOS
├─ sessionStorage: { auth_token: "TOKEN_JUAN" } ✅ (AISLADO)
├─ Estado: SIGUE mostrando perfil de Juan ✅
```

**Resultado**: Cada pestaña mantiene su sesión independiente.

## 6. Manejo de Errores

### Error 401 (No Autorizado)
```typescript
// 1. Detecta 401 en interceptor
// 2. Llama removeAuthToken() → Limpia ambos storage
// 3. Limpia sessionStorage completo de la pestaña
// 4. Redirige a /login
```

### Rol No Autorizado
```typescript
// 1. ProtectedRoute detecta rol incorrecto
// 2. Redirige al dashboard correcto según rol:
//    - docente → /docente
//    - coordinador → /coordinador/materias
//    - estudiante → /estudiante
```

## 7. Ventajas del Sistema

✅ **Aislamiento Total**: Cada pestaña tiene su propia sesión  
✅ **Persistencia**: localStorage mantiene sesión entre recargas  
✅ **Seguridad**: Tokens no se comparten accidentalmente  
✅ **Validación**: Rutas protegidas validan roles  
✅ **UX Mejorada**: No hay confusión entre sesiones  

## 8. Consideraciones

### Recarga de Página
- **sessionStorage se limpia** al cerrar pestaña
- **localStorage persiste** → Automáticamente migra a sessionStorage en siguiente carga
- Usuario no necesita re-loggearse

### Cierre de Pestaña
- **sessionStorage se limpia** automáticamente
- **localStorage persiste** para otras pestañas

### Logout
- Limpia **ambos** storage
- Redirige a login
- Sesión terminada en la pestaña actual
- Otras pestañas siguen funcionando con sus propios tokens

## 9. Debugging

### Inspeccionar Tokens
```javascript
// En la consola del navegador:
console.log('Session Token:', sessionStorage.getItem('auth_token'))
console.log('Local Token:', localStorage.getItem('auth_token'))
```

### Verificar Aislamiento
1. Abre dos pestañas
2. Haz login con diferentes usuarios en cada una
3. Verifica que cada pestaña muestra el perfil correcto
4. Recarga una pestaña → Debe mantener su sesión

## 10. Migración

### Para Usuarios Existentes
- El sistema **automáticamente migra** tokens de localStorage a sessionStorage
- No se requiere acción del usuario
- Backward compatible

### Para Desarrolladores
```typescript
// ANTES (compartido entre pestañas)
localStorage.getItem('auth_token')
localStorage.setItem('auth_token', token)

// AHORA (aislado por pestaña)
import { getAuthToken, setAuthToken, removeAuthToken } from '@/connections/http'
getAuthToken()      // Prioriza sessionStorage
setAuthToken(token) // Guarda en ambos
removeAuthToken()   // Limpia ambos
```
