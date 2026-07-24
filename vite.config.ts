import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'UgoBoard - 動くミニバス作戦盤',
        short_name: 'UgoBoard',
        description: 'ミニバス向けの動く作戦盤',
        theme_color: '#173d2b',
        background_color: '#f4efe5',
        display: 'standalone',
        orientation: 'any',
        icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
})
