import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {

    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
    proxy: {
      '/api': {
        target: 'https://influo-seven.vercel.app',
        changeOrigin: true,
        secure: true,
        // НЕ удаляем /api prefix - backend ожидает его в path
      },
    },
  },
});
