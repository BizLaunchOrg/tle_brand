import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { bootstrapAppearanceFromCache } from './lib/storeAppearance'
import App from './App.tsx'

const baseUrl = import.meta.env.BASE_URL
const routerBasename =
  baseUrl === '/' || baseUrl === '' ? undefined : baseUrl.replace(/\/$/, '')

// Instant theme from cache — CSS variables only (no MutationObserver)
bootstrapAppearanceFromCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
