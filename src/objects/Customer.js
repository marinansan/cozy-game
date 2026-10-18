import { createFigure } from './figure.js';

const SPEED = 55; // píxeles por segundo

// Un cliente que entra por la puerta, camina hasta el mostrador y se va.
export default class Customer {
  constructor(scene, data, x, y) {
    this.scene = scene;
    this.data = data;
    this.sprite = createFigure(scene, x, y, data.colores);
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  // Recorre los puntos del camino uno detrás de otro
  walk(points, onArrive) {
    if (!points || !points.length) {
      onArrive?.();
      return;
    }
    const [next, ...rest] = points;
    const distance = Math.hypot(next.x - this.sprite.x, next.y - this.sprite.y);
    this.scene.tweens.add({
      targets: this.sprite,
      x: next.x,
      y: next.y,
      duration: (distance / SPEED) * 1000,
      onUpdate: () => this.sprite.setDepth(this.sprite.y),
      onComplete: () => this.walk(rest, onArrive),
    });
  }

  destroy() {
    this.sprite.destroy();
  }
}
