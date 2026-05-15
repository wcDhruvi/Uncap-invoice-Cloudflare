import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Base path for the embedded app
  base: '/admin', 
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: true,
    port: 5173,
    // By setting allowedHosts to true, we dynamically allow any ngrok or cloudflare tunnel URL
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Basic optimizations for better LCP
    cssCodeSplit: true,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate large vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@shopify/polaris')) {
              return 'polaris';
            }
            if (id.includes('@shopify/app-bridge')) {
              return 'app-bridge';
            }
          }
        }
      }
    }
  }
});
