import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served at /admin/* behind the combined Render nginx instance (see
  // Dockerfile.frontends) — apps/web owns the domain root.
  base: '/admin/',
  plugins: [react()],
  resolve: {
    // shared-web (see package.json's "shared-web": "file:../../packages/shared-web")
    // ships its own node_modules so it can type-check standalone — without
    // this, Vite would bundle two separate copies of React (one from here,
    // one resolved from inside that linked package), which breaks hooks at
    // runtime even though the build itself succeeds without error.
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next', 'use-sync-external-store', 'react-router-dom'],
  },
})
