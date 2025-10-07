import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    // Define `process.env` to expose environment variables to your client-side code.
    // This makes the API key available in the same way as in the AI Studio environment,
    // allowing the app to work outside of AI Studio.
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      }
    }
  }
});