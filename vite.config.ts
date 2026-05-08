import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://v3.vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  let base = env.VITE_BASE?.trim() || '/'
  if (base !== '/' && !base.endsWith('/')) base = `${base}/`

  return {
    base,
    plugins: [react()],
  }
})
