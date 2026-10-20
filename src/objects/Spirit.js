import { createFigure } from './figure.js';

const SPEED = 35; // los espíritus se mueven más despacio que la gente
const DEPTH = 650; // por encima de la luz de la noche, para que brillen
const ALPHA = 0.75; // translúcidos

// Un espíritu: figura translúcida que flota, con un halo de luz lavanda.
// Aparece y se desvanece poco a poco. Puede mostrar el "!" cuando quiere hablar.
export default class Spirit {
  constructor(scene, data, x, y) {
    this.scene = scene;
    this.data = data;
    this.state = 'arriving';

    // El halo y la figura flotan dentro de un contenedor que se mueve por la librería
    const halo = scene.add.image(0, -12, 'glow').setDisplaySize(46, 52).setTint(0xc4b0ff).setAlpha(0.7);
    halo.setBlendMode('ADD');
    const figure = createFigure(scene, 0, 0, data.colores);
    figure.list[0].setVisible(false); // sin sombra: no toca el suelo
    this.float = scene.add.container(0, 0, [halo, figure]);
    this.sprite = scene.add.container(x, y, [this.float]).setDepth(DEPTH).setAlpha(0);

    this.floatTween = scene.tweens.add({
      targets: this.float,
      y: -3,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.haloTween = scene.tweens.add({
      targets: halo,
      alpha: 0.4,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.alert = this.createAlert();
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  // Bocadillo pequeño con "!" encima de la cabeza
  createAlert() {
    const scene = this.scene;
    const icon = scene.add.container(0, 0, [
      scene.add.rectangle(0, 0, 9, 11, 0xfffaf2).setStrokeStyle(1, 0x4a3426),
      scene.add.triangle(0, 7, -2, 0, 2, 0, 0, 3, 0xfffaf2),
      scene.add.rectangle(0, -2, 2, 5, 0x8a6bd1),
      scene.add.rectangle(0, 3, 2, 2, 0x8a6bd1),
    ]);
    this.alertTween = scene.tweens.add({ targets: icon, y: -2, duration: 400, yoyo: true, repeat: -1 });
    return scene.add.container(0, 0, [icon]).setDepth(DEPTH + 1).setVisible(false);
  }

  showAlert(visible) {
    this.alert.setVisible(visible);
  }

  appear(onDone) {
    this.scene.tweens.add({ targets: this.sprite, alpha: ALPHA, duration: 1200, onComplete: () => onDone?.() });
  }

  // Se desvanece subiendo un poco, y desaparece
  vanish(onDone) {
    this.showAlert(false);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      y: this.sprite.y - 12,
      duration: 1800,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy();
        onDone?.();
      },
    });
  }

  // Flota de un punto a otro del camino
  walk(points, onArrive) {
    // Solo se cancela el movimiento anterior (no la animación de aparecer)
    this.moveTween?.remove();
    this.walkSteps(points ?? [], onArrive);
  }

  walkSteps(points, onArrive) {
    if (!points.length) {
      onArrive?.();
      return;
    }
    const [next, ...rest] = points;
    const distance = Math.hypot(next.x - this.sprite.x, next.y - this.sprite.y);
    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: next.x,
      y: next.y,
      duration: Math.max(1, (distance / SPEED) * 1000),
      onComplete: () => this.walkSteps(rest, onArrive),
    });
  }

  update() {
    this.alert.setPosition(this.sprite.x, this.sprite.y - 34);
  }

  destroy() {
    if (!this.sprite.active) return;
    this.scene.tweens.killTweensOf(this.sprite);
    this.floatTween.remove();
    this.haloTween.remove();
    this.alertTween.remove();
    this.alert.destroy();
    this.sprite.destroy();
  }
}
