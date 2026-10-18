import Phaser from 'phaser';

// Escena principal: por ahora solo un saludo para comprobar que todo funciona.
export default class LibraryScene extends Phaser.Scene {
  constructor() {
    super('LibraryScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 10, 'Hola, librería', {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#5b3a29',
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(width / 2, height / 2 + 30, 'Toca la pantalla', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#8a6a55',
      })
      .setOrigin(0.5);

    // Comprobación de que el toque (móvil) y el clic (PC) funcionan
    this.input.on('pointerdown', (pointer) => {
      hint.setText('¡Hola! 👋');
      const dot = this.add.circle(pointer.x, pointer.y, 6, 0xe0a458);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 3,
        duration: 600,
        onComplete: () => dot.destroy(),
      });
    });
  }
}
