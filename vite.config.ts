import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [tailwindcss(), react(), checker({ typescript: true })],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'Baratie',
      fileName: 'index',
      formats: ['umd'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: true,
      format: {
        beautify: false,
        comments: false,
      },
    },
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
