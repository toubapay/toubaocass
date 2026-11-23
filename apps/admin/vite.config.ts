import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Served at /admin/* behind the combined Render nginx instance (see
  // Dockerfile.frontends) — apps/web owns the domain root.
  base: '/admin/',
  plugins: [
    react(),
    VitePWA({
      // No installable-app manifest here (this is a back-office tool, not
      // something to add to a home screen) — just precache the built
      // assets so the app shell still loads on a flaky connection.
      manifest: false,
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    // shared-web (see package.json's "shared-web": "file:../../packages/shared-web")
    // ships its own node_modules so it can type-check standalone — without
    // this, Vite would bundle two separate copies of React (one from here,
    // one resolved from inside that linked package), which breaks hooks at
    // runtime even though the build itself succeeds without error.
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next', 'use-sync-external-store', 'react-router-dom'],
  },
})
