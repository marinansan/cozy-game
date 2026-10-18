import { createFigure } from './figure.js';

const SPEED = 55; // píxeles por segundo

// Iconos de ambiente dibujados con píxeles: [x, y, ancho, alto, color]
const EMOTES = {
  taza: [
    [-3, -2, 6, 5, 0xfffaf2],
    [3, -1, 2, 3, 0xfffaf2],
    [-2, -1, 4, 1, 0x8a5a3b],
    [-1, -5, 1, 2, 0xd9d4cc],
    [1, -6, 1, 2, 0xd9d4cc],
  ],
  libro: [
    [-4, -3, 4, 6, 0x6b8f71],
    [0, -3, 4, 6, 0x6b8f71],
    [-3, -2, 3, 4, 0xfffaf2],
    [0, -2, 3, 4, 0xfffaf2],
  ],
  nota: [
    [1, -5, 1, 7, 0xc4b0ff],
    [-2, 0, 3, 3, 0xc4b0ff],
    [2, -5, 2, 2, 0xc4b0ff],
  ],
  corazon: [
    [-3, -3, 2, 2, 0xe07a8f],
    [1, -3, 2, 2, 0xe07a8f],
    [-3, -2, 6, 2, 0xe07a8f],
    [-2, 0, 4, 1, 0xe07a8f],
    [-1, 1, 2, 1, 0xe07a8f],
  ],
};

// Un cliente: entra por la puerta, camina por la librería, puede mostrar
// una señal "!" cuando quiere hablar contigo, sentarse y marcharse.
export default class Customer {
  constructor(scene, data, x, y) {
    this.scene = scene;
    this.data = data;
    this.state = 'entering';
    this.sprite = createFigure(scene, x, y, data.colores);
    this.sprite.setDepth(y);
    this.alert = this.createAlert();
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  // Bocadillo pequeño con "!" encima de la cabeza (dibujado con píxeles)
  createAlert() {
    const scene = this.scene;
    const icon = scene.add.container(0, 0, [
      scene.add.rectangle(0, 0, 9, 11, 0xfffaf2).setStrokeStyle(1, 0x4a3426),
      scene.add.triangle(0, 7, -2, 0, 2, 0, 0, 3, 0xfffaf2),
      scene.add.rectangle(0, -2, 2, 5, 0xe07a3f),
      scene.add.rectangle(0, 3, 2, 2, 0xe07a3f),
    ]);
    // El icono sube y baja suavemente dentro de un contenedor que sigue al cliente
    this.alertTween = scene.tweens.add({ targets: icon, y: -2, duration: 400, yoyo: true, repeat: -1 });
    return scene.add.container(0, 0, [icon]).setDepth(600).setVisible(false);
  }

  showAlert(visible) {
    this.alert.setVisible(visible);
  }

  // Muestra un icono pequeño sobre la cabeza que sube y se desvanece
  showEmote(kind) {
    const pixels = EMOTES[kind].map(([x, y, w, h, color]) =>
      this.scene.add.rectangle(x, y, w, h, color).setOrigin(0),
    );
    const emote = this.scene.add.container(this.x + 6, this.y - 26, pixels).setDepth(600).setAlpha(0);
    this.scene.tweens.add({
      targets: emote,
      y: emote.y - 6,
      alpha: { from: 0, to: 1 },
      duration: 500,
      hold: 1200,
      yoyo: true,
      onComplete: () => emote.destroy(),
    });
  }

  // Gestos de ambiente cuando está quieto: respirar (sentado) o curiosear (en las estanterías)
  startIdle(kind) {
    this.stopIdle();
    if (kind === 'sentado') {
      this.idleTween = this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 1.06,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.idleTween = this.scene.tweens.add({
        targets: this.sprite,
        x: this.sprite.x + 2,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        hold: 900,
        repeatDelay: 1200,
        ease: 'Sine.easeInOut',
      });
    }
  }

  stopIdle() {
    if (!this.idleTween) return;
    this.idleTween.remove();
    this.idleTween = null;
    this.sprite.setScale(1);
  }

  // Recorre los puntos del camino uno detrás de otro
  walk(points, onArrive) {
    this.stopIdle();
    this.scene.tweens.killTweensOf(this.sprite);
    this.walkSteps(points ?? [], onArrive);
  }

  walkSteps(points, onArrive) {
    if (!points.length) {
      onArrive?.();
      return;
    }
    const [next, ...rest] = points;
    const distance = Math.hypot(next.x - this.sprite.x, next.y - this.sprite.y);
    this.scene.tweens.add({
      targets: this.sprite,
      x: next.x,
      y: next.y,
      duration: Math.max(1, (distance / SPEED) * 1000),
      onUpdate: () => this.sprite.setDepth(this.sprite.y),
      onComplete: () => this.walkSteps(rest, onArrive),
    });
  }

  update() {
    // La señal "!" sigue al cliente
    this.alert.setPosition(this.sprite.x, this.sprite.y - 30);
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.alertTween.remove();
    this.alert.destroy();
    this.sprite.destroy();
  }
}
