import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const buildTime = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');

export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  define: {
    __BUILD_TIME__: mode === 'development' ? null : JSON.stringify(buildTime)
  },
  build: {
    outDir: 'dist',
    assetsDir: '.',
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2
      }
    },
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
}));
