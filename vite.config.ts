import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Configured for GitHub Pages subpath deployment
  base: process.env.NODE_ENV === 'production' ? '/devtools/' : '/',
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
          mermaid: ['mermaid']
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
});
