import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env variables from .env.local and .env files
    const env = loadEnv(mode, process.cwd(), '');
    
    // Debug: log to verify env is loading (only in dev mode)
    if (mode === 'development') {
      console.log('GEMINI_API_KEY loaded:', env.GEMINI_API_KEY ? 'Yes (length: ' + env.GEMINI_API_KEY.length + ')' : 'No');
    }
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Vite automatically exposes env variables prefixed with VITE_ to import.meta.env
      // We use define to inject process.env variables at build time
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY || ''),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
