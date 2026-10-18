import Phaser from 'phaser';
import LibraryScene from './scenes/LibraryScene.js';

// Resolución base del juego (16:9, horizontal). Phaser la escala para
// que encaje en cualquier pantalla, de PC o de móvil.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  backgroundColor: '#1e1b18',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [LibraryScene],
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
  ui.style.setProperty('--u', `${rect.height / config.height}px`);
}
game.events.once('ready', syncUi);
game.scale.on('resize', () => requestAnimationFrame(syncUi));
window.addEventListener('resize', () => requestAnimationFrame(syncUi));

// Acceso para pruebas desde la consola del navegador
window.__game = game;
