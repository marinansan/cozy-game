import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas para que funcione en GitHub Pages (marinansan.github.io/cozy-game/)
  base: './',
  build: {
    // Phaser ocupa ~1.2 MB; es normal y no hace falta avisar
    chunkSizeWarningLimit: 1600,
  },
});
