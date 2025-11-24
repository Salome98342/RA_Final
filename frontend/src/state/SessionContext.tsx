import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Added 'coordinador' role for coordinador/Director
export type Role = 'docente' | 'estudiante' | 'coordinador' | null
export interface SessionState {
  name: string | null
  role: Role
  code?: string | null
  selectedCurso: string | null
}

const defaultState: SessionState = { name: null, role: null, code: null, selectedCurso: null }

type Ctx = {
  state: SessionState
  setName: (n: string | null) => void
  setRole: (r: Role) => void
  setCode: (code: string | null) => void
  setSelectedCurso: (c: string | null) => void
}

const SessionContext = createContext<Ctx | undefined>(undefined)

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<SessionState>(() => {
    try {
      // Priorizar sessionStorage (aislado por pestaña)
      const sessionRaw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('session') : null
      if (sessionRaw) {
        return JSON.parse(sessionRaw)
      }

      // Fallback a localStorage (migración automática)
      const localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('session') : null
      if (localRaw) {
        const parsed = JSON.parse(localRaw)
        // Migrar a sessionStorage
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('session', localRaw)
        }
        return parsed
      }

      return defaultState
    } catch {
      return defaultState
    }
  })

  useEffect(() => {
    try {
      // Guardar en sessionStorage (aislado por pestaña)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('session', JSON.stringify(state))
      }
      // También en localStorage para persistencia entre recargas
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('session', JSON.stringify(state))
      }
    } catch { /* ignore */ }
  }, [state])

  const value = useMemo<Ctx>(() => ({
    state,
    setName: (n) => setState((s) => ({ ...s, name: n })),
    setRole: (r) => setState((s) => ({ ...s, role: r })),
    setCode: (code) => setState((s) => ({ ...s, code })),
    setSelectedCurso: (c) => setState((s) => ({ ...s, selectedCurso: c }))
  }), [state])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
