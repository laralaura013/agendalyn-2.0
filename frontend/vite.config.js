import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // O plugin irá agora detetar o nosso manifest.json público automaticamente
      injectRegister: 'auto'
    })
  ],
})