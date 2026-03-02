import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SessionProvider } from '@/state/SessionContext'
import { LoadingProvider } from '@/state/LoadingContext'
import ErrorBoundary from '@/components/ErrorBoundary'

// Global styles
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '@/styles/app.css'
import '@/styles/animations.css'
import '@/styles/utility-classes.css'
import '@/styles/sweetalert.css'

// Optional: Bootstrap JS for components that need it
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <LoadingProvider>
            <App />
          </LoadingProvider>
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
