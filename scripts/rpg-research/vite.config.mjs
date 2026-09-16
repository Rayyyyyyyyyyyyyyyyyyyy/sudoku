import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate dev-only entry and cache; never modifies the shared dependency tree
// or the production offline build configuration.
export default defineConfig({
  plugins: [react()],
  cacheDir: '.rpg-research-cache',
  server: { host: '127.0.0.1', port: 5174, open: false },
});
