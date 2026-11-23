import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The manifest.webmanifest in public/ is already linked by hand in
      // index.html — this plugin only owns the service worker.
      manifest: false,
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // index.html isn't fingerprinted, so it wouldn't otherwise be
        // included in the precache list that SPA offline navigation
        // (see sw.js's NavigationRoute) depends on.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
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
