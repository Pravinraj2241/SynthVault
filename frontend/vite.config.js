import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * SynthVault frontend build config (Vite + React 18).
 *
 * API base URL rules:
 *  - the app always reads VITE_API_BASE_URL (see src/services/api.js)
 *  - when it is unset, the app falls back to http://localhost:8080
 *
 * Dev proxy:
 *  The Spring Boot backend (synthvault-mca) does not declare any CORS
 *  configuration, so a browser page served from http://localhost:5173 cannot
 *  call http://localhost:8080 directly. Setting VITE_API_BASE_URL=/api in
 *  .env.local (see .env.example) routes every API call through this proxy
 *  instead, which is same-origin for the browser.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
  };
});