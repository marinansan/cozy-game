import Phaser from 'phaser';
import { RENDER, VIEW } from './config.js';
import { state } from './systems/GameState.js';
import LibraryScene from './scenes/LibraryScene.js';
import TownScene from './scenes/TownScene.js';

// El juego dibuja a 1920 x 1080 (horizontal) y Phaser lo escala para que encaje
// en cualquier pantalla, de PC o de móvil. Ver src/config.js.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: RENDER.width,
  height: RENDER.height,
  backgroundColor: '#1e1b18',
  // Suavizado activado: las imágenes de arte ya tienen su propio detalle de píxel
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [LibraryScene, TownScene],
};

const game = new Phaser.Game(config);

// La interfaz HTML (#ui) se coloca justo encima del lienzo del juego
const ui = document.getElementById('ui');
function syncUi() {
  const rect = game.canvas.getBoundingClientRect();
  Object.assign(ui.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  ui.style.setProperty('--u', `${rect.height / VIEW.height}px`);
}
game.events.once('ready', syncUi);
game.scale.on('resize', () => requestAnimationFrame(syncUi));
window.addEventListener('resize', () => requestAnimationFrame(syncUi));

// Acceso para pruebas desde la consola del navegador (estado del juego incluido)
window.__game = game;
window.__state = state;
