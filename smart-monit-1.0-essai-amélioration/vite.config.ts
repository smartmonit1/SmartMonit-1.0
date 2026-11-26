import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.AI_PROVIDER': JSON.stringify(env.AI_PROVIDER || 'algorithmic'),
      'process.env.MISTRAL_API_KEY': JSON.stringify(env.MISTRAL_API_KEY || ''),
      'process.env.MISTRAL_BASE_URL': JSON.stringify(env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1'),
      'process.env.MISTRAL_MODEL_FAST': JSON.stringify(env.MISTRAL_MODEL_FAST || 'mistral-small-latest'),
      'process.env.MISTRAL_MODEL_SMART': JSON.stringify(env.MISTRAL_MODEL_SMART || 'mistral-large-latest'),
      'process.env.MISTRAL_MODEL_VISION': JSON.stringify(env.MISTRAL_MODEL_VISION || 'pixtral-12b-2409'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            'vendor-charts': ['recharts'],
          },
        },
      },
    },
  };
});
