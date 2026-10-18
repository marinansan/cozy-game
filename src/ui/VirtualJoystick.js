// Joystick táctil flotante: aparece donde apoyas el dedo y el personaje
// se desliza en la dirección hacia la que arrastras. Al levantar el dedo, se para.

const RADIUS = 24; // distancia máxima del mando respecto al centro
const DEAD_ZONE = 3; // movimientos más pequeños se ignoran

export default class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.pointerId = null;
    this.origin = { x: 0, y: 0 };
    this.direction = { x: 0, y: 0 }; // de -1 a 1 en cada eje

    this.base = scene.add.circle(0, 0, RADIUS, 0xf4e9d8, 0.18).setStrokeStyle(1, 0xf4e9d8, 0.5);
    this.knob = scene.add.circle(0, 0, 9, 0xf4e9d8, 0.55);
    this.base.setDepth(100).setVisible(false);
    this.knob.setDepth(101).setVisible(false);

    scene.input.on('pointerdown', (pointer) => {
      if (!pointer.wasTouch || this.pointerId !== null) return;
      this.pointerId = pointer.id;
      this.origin = { x: pointer.x, y: pointer.y };
      this.base.setPosition(pointer.x, pointer.y).setVisible(true);
      this.knob.setPosition(pointer.x, pointer.y).setVisible(true);
    });

    scene.input.on('pointermove', (pointer) => {
      if (pointer.id !== this.pointerId) return;
      let dx = pointer.x - this.origin.x;
      let dy = pointer.y - this.origin.y;
      const distance = Math.hypot(dx, dy);
      if (distance > RADIUS) {
        dx = (dx / distance) * RADIUS;
        dy = (dy / distance) * RADIUS;
      }
      this.knob.setPosition(this.origin.x + dx, this.origin.y + dy);
      this.direction = distance < DEAD_ZONE ? { x: 0, y: 0 } : { x: dx / RADIUS, y: dy / RADIUS };
    });

    const release = (pointer) => {
      if (pointer.id !== this.pointerId) return;
      this.pointerId = null;
      this.direction = { x: 0, y: 0 };
      this.base.setVisible(false);
      this.knob.setVisible(false);
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  isActive() {
    return this.direction.x !== 0 || this.direction.y !== 0;
  }
}
