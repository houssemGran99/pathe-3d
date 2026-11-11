import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Standalone build of the <seatview-preview> web component, served from a CDN as a final bundle.
 * Output: dist/sdk/seatview.js (entry: element + React) and dist/sdk/chunks/* (3D engine, loaded on demand).
 *
 * This is an app build with a JS entry rather than Vite "library mode", because library mode does not
 * minify ES output (it expects a consumer bundler); here the browser loads the files directly.
 * It runs after the site build so the SDK is deployed alongside the site under /sdk/.
 */
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  publicDir: false,
  build: {
    outDir: 'dist/sdk',
    emptyOutDir: false,
    target: 'es2022',
    modulePreload: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: { seatview: 'src/web-component/index.ts' },
      preserveEntrySignatures: 'strict',
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'chunks/[name]-[hash][extname]',
      },
    },
  },
});
