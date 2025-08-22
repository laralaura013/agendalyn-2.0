import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Gera service worker e manifest durante o build
      strategies: 'generateSW',
      manifestFilename: 'manifest.webmanifest',

      // Evita o warning dos padrões de cache
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
      },

      // (Opcional) garante cópia de assets estáticos
      includeAssets: [
        'favicon.ico',
        // se tiver apple-touch-icon.png em /public, deixe a linha abaixo:
        // 'apple-touch-icon.png',
        'screenshots/screenshot-desktop.png',
        'screenshots/screenshot-mobile.png',
      ],

      manifest: {
        name: 'Agendalyn',
        short_name: 'Agendalyn',
        description: 'Sistema de agendamento para barbearias, salões de beleza e clínicas.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#9333ea',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // 👉 Se você adicionar um ícone maskable em /public/icons/icon-512-maskable.png,
          // descomente a linha abaixo:
          // { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Richer Install UI
        screenshots: [
          {
            src: '/screenshots/screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard (desktop)'
          },
          {
            src: '/screenshots/screenshot-mobile.png',
            sizes: '540x1200',
            type: 'image/png',
            label: 'Painel (mobile)'
          }
        ],
        // (Opcional) atalhos rápidos no Android
        shortcuts: [
          { name: 'Agenda', url: '/dashboard/schedule' },
          { name: 'Comandas', url: '/dashboard/orders' },
          { name: 'Clientes', url: '/dashboard/clients' }
        ]
      }
    })
  ]
})
