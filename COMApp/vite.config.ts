import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
    force: true
  },
  server: {
    port: 3001,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  define: {
    global: 'globalThis'
  }
})