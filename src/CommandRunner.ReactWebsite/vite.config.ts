import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import * as path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';

  return {
    plugins: [
      react(),
      // Only include PWA plugin for web builds, not Electron
      ...(isElectron ? [] : [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Command Runner',
          short_name: 'CmdRunner',
          description: 'Cross-platform command execution tool',
          theme_color: '#1976d2',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })])
    ],
    base: isElectron ? './' : '/',
    build: {
      outDir: isElectron ? 'dist' : 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        }
      }
    },
    define: {
      // Define environment variables for Electron
      'process.env.IS_ELECTRON': JSON.stringify(isElectron)
    }
  };
})