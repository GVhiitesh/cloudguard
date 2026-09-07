import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Lets the app call the API at /api in dev without CORS or a hardcoded host.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
