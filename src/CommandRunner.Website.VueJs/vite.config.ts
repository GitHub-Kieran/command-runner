import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    // Only relevant when the page is loaded from this dev server itself (the Photino desktop
    // host's DEBUG build does exactly that, for hot reload) -- window.location.origin is then
    // localhost:5174, so API calls need forwarding to reach CommandRunner.Desktop's fixed DEBUG
    // port. Not used when Desktop serves the built Vue bundle itself (same-origin already).
    proxy: {
      '/api': 'http://127.0.0.1:5081',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
