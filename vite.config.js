import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Configures relative asset paths so Electron loads files correctly from the filesystem
  server: {
    port: 4000,
    strictPort: true
  },
  build: {
    outDir: 'frontend-build',
    emptyOutDir: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
