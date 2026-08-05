import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { applySiteColor } from './lib/siteAppearance'
import App from './App.tsx'

const baseUrl = import.meta.env.BASE_URL
const routerBasename =
  baseUrl === '/' || baseUrl === '' ? undefined : baseUrl.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      {/* Apply persisted site color before mounting app UI */}
      {applySiteColor()}
      <App />
    </BrowserRouter>
  </StrictMode>,
)
