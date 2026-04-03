import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import siteConfig from './site.config.js';

const buildTime = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
const buildVersion = process.env.BUILD_VERSION || null;

export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  define: {
    __BUILD_TIME__: mode === 'development' ? null : JSON.stringify(buildTime),
    __BUILD_VERSION__: mode === 'development' ? null : JSON.stringify(buildVersion),
    __RELAY_URL__: JSON.stringify(siteConfig.relayUrl),
    __API_URL__: JSON.stringify(siteConfig.apiUrl)
  },
  worker: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].js'
      }
    }
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
    rolldownOptions: {
      checks: {
        pluginTimings: false
      },
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
    },
    proxy: {
      '^/symbols/.+/isle\\.wasm\\.map$': {
        target: 'http://localhost:5173',
        rewrite: () => '/isle.wasm.map'
      }
    }
  }
}));
