import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: 'all',
    proxy: {
      // During dev, proxy API calls to backend
      '/stories': 'http://localhost:8000',
      '/admin':   'http://localhost:8000',
      '/users':   'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react:  ['react', 'react-dom', 'react-router-dom'],
          sdk:    ['@twa-dev/sdk'],
          icons:  ['lucide-react'],
        },
      },
    },
  },
});
