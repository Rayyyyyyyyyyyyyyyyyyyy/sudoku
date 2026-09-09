import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { offlineServiceWorker } from './build/offlineServiceWorker.js';

export default defineConfig({
  plugins: [react(), offlineServiceWorker()],
  server: { port: 5173, open: true }
});
