/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logoapp.png'],
      manifest: {
        name: 'Brody',
        short_name: 'Brody',
        description: 'Brody — tu asistente de notas para estudiantes',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'logoapp.png', sizes: '192x192', type: 'image/png' },
          { src: 'logoapp.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'logoapp.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  // El build de producción minifica JS/CSS y NO emite source maps → el código
  // queda ofuscado/ilegible (no se puede "robar" el fuente legible).
  build: {
    sourcemap: false,
    minify: 'esbuild',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
