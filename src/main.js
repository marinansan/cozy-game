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

// Acceso para pruebas desde la consola del navegador
window.__game = game;
