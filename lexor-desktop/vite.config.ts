import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  root: 'src/renderer',
  base: './',
  
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development'
  },

  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost'
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main'),
      '@preload': resolve(__dirname, 'src/preload')
    }
  },

  css: {
    postcss: './postcss.config.js'
  },

  optimizeDeps: {
    include: ['react', 'react-dom']
  },

  define: {
    __DEV__: process.env.NODE_ENV === 'development'
  },

  // Configure PDF.js worker
  assetsInclude: ['**/*.worker.js', '**/*.worker.mjs'],
  
  worker: {
    format: 'es'
  }
});