import { relative } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  outDir: 'dist',
  format: 'esm',
  dts: true,
  sourcemap: true,

  minify: true,
  treeshake: true,
  keepNames: true,
  target: 'ES2020',

  clean: true,
  entry: ['src/index.ts'],
  tsconfig: relative(__dirname, 'tsconfig.json'),
});
