# 🎨 Guía de Integración Frontend - Sistema de Recuperación de Contraseña

Esta guía te ayudará a integrar el sistema de recuperación de contraseña con OTP en tu aplicación React/TypeScript.

---

## 📋 Flujo Visual

```
┌─────────────────────────────────────────────────┐
│  Paso 1: Ingresar Email                         │
│  ┌────────────────────────────────────────┐     │
│  │ Email: [___________________________]   │     │
│  │ [Enviar código de recuperación]       │     │
│  └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Paso 2: Verificar Código OTP                   │
│  ┌────────────────────────────────────────┐     │
│  │ Código: [__ __ __ __ __ __]           │     │
│  │ ⏰ Expira en: 4:32                    │     │
│  │ [Verificar código]  [Reenviar]       │     │
│  └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Paso 3: Nueva Contraseña                       │
│  ┌────────────────────────────────────────┐     │
│  │ Nueva contraseña: [________________]   │     │
│  │ Confirmar: [_______________________]   │     │
│  │ [Cambiar contraseña]                   │     │
│  └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Implementación en React + TypeScript

### 1. Crear el servicio de API

```typescript
// src/services/passwordRecovery.ts

import { api } from '@/connections/http'

export interface ForgotPasswordRequest {
  email: string
}

export interface VerifyOTPRequest {
  email: string
  otp_code: string
}

export interface ResetPasswordRequest {
  email: string
  otp_code: string
  password: string
}

export interface ForgotPasswordResponse {
  ok: boolean
  message: string
}

export interface VerifyOTPResponse {
  ok: boolean
  message: string
  warning?: string
}

export interface ResetPasswordResponse {
  ok: boolean
  message: string
}

/**
 * Solicita un código OTP para recuperación de contraseña
 */
export async function requestPasswordReset(
  email: string
): Promise<ForgotPasswordResponse> {
  const response = await api.post<ForgotPasswordResponse>(
    '/auth/password/forgot',
    { email }
  )
  return response.data
}

/**
 * Verifica el código OTP ingresado por el usuario
 */
export async function verifyOTP(
  email: string,
  otpCode: string
): Promise<VerifyOTPResponse> {
  const response = await api.post<VerifyOTPResponse>(
    '/auth/password/verify-otp',
    { email, otp_code: otpCode }
  )
  return response.data
}

/**
 * Restablece la contraseña usando el código OTP verificado
 */
export async function resetPassword(
  email: string,
  otpCode: string,
  password: string
): Promise<ResetPasswordResponse> {
  const response = await api.post<ResetPasswordResponse>(
    '/auth/password/reset',
    { email, otp_code: otpCode, password }
  )
  return response.data
}
```

---

### 2. Crear el componente principal

```tsx
// src/pages/PasswordRecovery.tsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  requestPasswordReset, 
  verifyOTP, 
  resetPassword 
} from '@/services/passwordRecovery'
import Alert from '@/components/Alert'

type Step = 'email' | 'verify-otp' | 'new-password'

const PasswordRecovery: React.FC = () => {
  const navigate = useNavigate()
  
  // Estado del flujo
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Estado de UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  // Paso 1: Solicitar código OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const response = await requestPasswordReset(email)
      setSuccess(response.message)
      setStep('verify-otp')
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.email?.[0] || 
        'Error al enviar el código. Intenta nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Paso 2: Verificar código OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setWarning(null)
    setLoading(true)

    try {
      const response = await verifyOTP(email, otpCode)
      setSuccess(response.message)
      if (response.warning) {
        setWarning(response.warning)
      }
      setStep('new-password')
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Código inválido o expirado. Solicita uno nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Paso 3: Cambiar contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    // Validación local
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const response = await resetPassword(email, otpCode, password)
      setSuccess(response.message)
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Error al cambiar la contraseña. Intenta nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'email' && 'Ingresa tu correo electrónico'}
            {step === 'verify-otp' && 'Verifica el código OTP'}
            {step === 'new-password' && 'Crea tu nueva contraseña'}
          </p>
        </div>

        {/* Alertas */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} />}
        {warning && <Alert type="warning" message={warning} />}

        {/* Paso 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleRequestOTP} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="correo@ejemplo.com"
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar código de recuperación'}
              </button>
            </div>
          </form>
        )}

        {/* Paso 2: Verificar OTP */}
        {step === 'verify-otp' && (
          <form onSubmit={handleVerifyOTP} className="mt-8 space-y-6">
            <div>
              <label htmlFor="otp" className="sr-only">Código OTP</label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 text-center text-2xl tracking-widest focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-3xl"
                placeholder="000000"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Revisa tu correo. El código expira en 5 minutos.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              
              <button
                type="button"
                onClick={() => setStep('email')}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Reenviar
              </button>
            </div>
          </form>
        )}

        {/* Paso 3: Nueva contraseña */}
        {step === 'new-password' && (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="sr-only">Nueva contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirmar contraseña</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirmar contraseña"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        )}

        {/* Volver al login */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export default PasswordRecovery
```

---

### 3. Agregar ruta en App.tsx

```tsx
// src/App.tsx

import PasswordRecovery from '@/pages/PasswordRecovery'

// Dentro del Router
<Route path="/recuperar" element={<PasswordRecovery />} />
```

---

### 4. Agregar link en página de login

```tsx
// src/pages/Login.tsx

<div className="text-center">
  <Link 
    to="/recuperar" 
    className="text-sm text-indigo-600 hover:text-indigo-500"
  >
    ¿Olvidaste tu contraseña?
  </Link>
</div>
```

---

## 🎨 Mejoras Opcionales

### Temporizador de Expiración

```tsx
const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutos

useEffect(() => {
  if (step !== 'verify-otp') return
  
  const timer = setInterval(() => {
    setTimeRemaining((prev) => {
      if (prev <= 0) {
        clearInterval(timer)
        setError('El código ha expirado. Solicita uno nuevo.')
        setStep('email')
        return 0
      }
      return prev - 1
    })
  }, 1000)
  
  return () => clearInterval(timer)
}, [step])

// Mostrar en UI
const minutes = Math.floor(timeRemaining / 60)
const seconds = timeRemaining % 60

<p className="text-sm text-gray-500">
  ⏰ Expira en: {minutes}:{seconds.toString().padStart(2, '0')}
</p>
```

### Input OTP con Separación Visual

```tsx
const OTPInput: React.FC<{
  value: string
  onChange: (val: string) => void
}> = ({ value, onChange }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, val: string) => {
    const newOTP = value.split('')
    newOTP[index] = val
    onChange(newOTP.join(''))
    
    // Auto-focus next input
    if (val && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex justify-center space-x-2">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => (inputs.current[index] = el)}
          type="text"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-12 text-center text-2xl border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
        />
      ))}
    </div>
  )
}
```

### Validación de Contraseña con Indicadores

```tsx
const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const checks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  }

  const strength = Object.values(checks).filter(Boolean).length

  return (
    <div className="mt-2 space-y-2">
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded ${
              level <= strength
                ? level === 1
                  ? 'bg-red-500'
                  : level === 2
                  ? 'bg-yellow-500'
                  : level === 3
                  ? 'bg-blue-500'
                  : 'bg-green-500'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      <ul className="text-xs space-y-1">
        <li className={checks.length ? 'text-green-600' : 'text-gray-400'}>
          ✓ Mínimo 6 caracteres
        </li>
        <li className={checks.uppercase ? 'text-green-600' : 'text-gray-400'}>
          ✓ Una mayúscula
        </li>
        <li className={checks.number ? 'text-green-600' : 'text-gray-400'}>
          ✓ Un número
        </li>
      </ul>
    </div>
  )
}
```

---

## 🧪 Testing Frontend

```typescript
// src/__tests__/PasswordRecovery.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PasswordRecovery from '@/pages/PasswordRecovery'
import * as api from '@/services/passwordRecovery'

jest.mock('@/services/passwordRecovery')

describe('PasswordRecovery', () => {
  it('solicita código OTP correctamente', async () => {
    (api.requestPasswordReset as jest.Mock).mockResolvedValue({
      ok: true,
      message: 'Código enviado'
    })

    render(
      <BrowserRouter>
        <PasswordRecovery />
      </BrowserRouter>
    )

    const emailInput = screen.getByPlaceholderText(/correo/i)
    const submitBtn = screen.getByText(/enviar código/i)

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.requestPasswordReset).toHaveBeenCalledWith('test@example.com')
    })
  })
})
```

---

## 📱 Adaptación Móvil

```css
/* src/styles/password-recovery.css */

@media (max-width: 640px) {
  .password-recovery-container {
    padding: 1rem;
  }

  .otp-input {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.25rem;
  }
}
```

---

## 🎯 Checklist de Integración

- [ ] Crear servicio de API (`passwordRecovery.ts`)
- [ ] Crear componente principal (`PasswordRecovery.tsx`)
- [ ] Agregar ruta en `App.tsx`
- [ ] Agregar link en página de login
- [ ] Probar flujo completo
- [ ] Agregar validaciones visuales
- [ ] Implementar temporizador (opcional)
- [ ] Mejorar input OTP (opcional)
- [ ] Agregar indicador de fortaleza de contraseña (opcional)
- [ ] Escribir tests unitarios
- [ ] Verificar responsive design

---

## 📚 Referencias

- Componente existente: `frontend/src/pages/Recuperar.tsx`
- Sistema de alertas: `frontend/src/components/Alert.tsx`
- HTTP client: `frontend/src/connections/http.ts`

---

**¿Necesitas ayuda?**  
Consulta la documentación completa en `backend/docs/OTP_SYSTEM_COMPLETE.md`
