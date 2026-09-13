import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Configured for GitHub Pages subpath deployment
  base: process.env.NODE_ENV === 'production' ? '/devtools/' : '/',
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
          mermaid: ['mermaid'],
          sqlite: ['@sqlite.org/sqlite-wasm'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
