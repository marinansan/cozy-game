import Phaser from 'phaser';
import LibraryScene from './scenes/LibraryScene.js';

// Resolución base del juego (16:9, horizontal). Phaser la escala para
// que encaje en cualquier pantalla, de PC o de móvil.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  backgroundColor: '#f4e9d8',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LibraryScene],
};

new Phaser.Game(config);
