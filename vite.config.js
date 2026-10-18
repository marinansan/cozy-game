import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas para que el juego funcione en cualquier web donde se publique
  base: './',
  build: {
    // Phaser ocupa ~1.2 MB; es normal y no hace falta avisar
    chunkSizeWarningLimit: 1600,
  },
});
