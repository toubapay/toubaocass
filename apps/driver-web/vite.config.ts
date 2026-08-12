import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served at /driver/* behind the combined Render nginx instance (see
  // Dockerfile.frontends) — apps/web owns the domain root.
  base: '/driver/',
  plugins: [react()],
})
