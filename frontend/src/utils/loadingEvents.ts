/**
 * Sistema de eventos para el loading global
 * Permite que los interceptores de axios disparen eventos de loading
 * sin necesidad de acceder al contexto de React
 */

type LoadingListener = (isLoading: boolean, text?: string) => void

class LoadingEventBus {
  private listeners: Set<LoadingListener> = new Set()
  private pendingRequests: number = 0
  private loadingTimeout: NodeJS.Timeout | null = null
  private isShowing: boolean = false

  subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(text?: string) {
    this.pendingRequests++
    
    // Solo mostrar spinner si la petición tarda más de 500ms
    if (this.pendingRequests === 1 && !this.loadingTimeout) {
      this.loadingTimeout = setTimeout(() => {
        if (this.pendingRequests > 0) {
          this.isShowing = true
          this.notify(true, text)
        }
      }, 500) // Delay de 500ms antes de mostrar el spinner
    }
  }

  stop() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1)
    
    if (this.pendingRequests === 0) {
      // Cancelar el timeout si la petición terminó rápido
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout)
        this.loadingTimeout = null
      }
      
      // Solo ocultar si se estaba mostrando
      if (this.isShowing) {
        this.isShowing = false
        this.notify(false)
      }
    }
  }

  private notify(isLoading: boolean, text?: string) {
    this.listeners.forEach(listener => listener(isLoading, text))
  }

  reset() {
    this.pendingRequests = 0
    this.notify(false)
  }
}

export const loadingEventBus = new LoadingEventBus()
