import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-site-shell',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'site.html'),
    },
  },
});
