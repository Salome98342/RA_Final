import React, { createContext, useState, useCallback, useEffect } from 'react'
import Spinner from '@/components/Spinner'
import { loadingEventBus } from '@/utils/loadingEvents'

interface LoadingContextType {
  isLoading: boolean
  showLoading: (text?: string) => void
  hideLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export const LoadingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState<string | undefined>()

  // Suscribirse a eventos de loading desde axios interceptors
  useEffect(() => {
    const unsubscribe = loadingEventBus.subscribe((loading, text) => {
      setIsLoading(loading)
      if (loading && text) {
        setLoadingText(text)
      } else if (!loading) {
        setLoadingText(undefined)
      }
    })

    return unsubscribe
  }, [])

  const showLoading = useCallback((text?: string) => {
    setLoadingText(text)
    setIsLoading(true)
    loadingEventBus.start(text)
  }, [])

  const hideLoading = useCallback(() => {
    setIsLoading(false)
    setLoadingText(undefined)
    loadingEventBus.stop()
  }, [])

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
      {children}
      {isLoading && <Spinner fullscreen size="lg" text={loadingText} />}
    </LoadingContext.Provider>
  )
}

