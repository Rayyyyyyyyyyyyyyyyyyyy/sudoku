import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/ui/**/*.test.jsx'],
    setupFiles: ['./test/ui/setup.js'],
    restoreMocks: true
  }
});
