import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'pg',
        '@napi-rs/canvas',
        'pdfjs-dist',
        'url',
        'path',
        'fs',
      ],
    },
  },
});

