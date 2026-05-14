import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {
  securityHeaders,
  productionSecurityHeaders,
  developmentSecurityHeaders,
} from './vite.security-plugin';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      // Добавляем security headers plugin
      isProduction ? productionSecurityHeaders() : developmentSecurityHeaders(),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: true,
      // Включить source maps для production (для отладки безопасности)
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            animations: ['framer-motion'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
    preview: {
      port: 4173,
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  };
});
