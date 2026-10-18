// Joystick táctil flotante: aparece donde apoyas el dedo y el personaje
// se desliza en la dirección hacia la que arrastras. Al levantar el dedo, se para.
//
// Se dibuja en HTML (encima del juego) para que siempre tenga el mismo tamaño
// en la pantalla, sin importar el zoom de la cámara.

const RADIUS = 44; // distancia máxima del mando respecto al centro, en píxeles de pantalla
const DEAD_ZONE = 6; // movimientos más pequeños se ignoran

export default class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.pointerId = null;
    this.origin = { x: 0, y: 0 };
    this.direction = { x: 0, y: 0 }; // de -1 a 1 en cada eje

    this.base = document.createElement('div');
    this.knob = document.createElement('div');
    for (const [el, size, alpha] of [
      [this.base, RADIUS * 2, 0.18],
      [this.knob, 36, 0.55],
    ]) {
      Object.assign(el.style, {
        position: 'fixed',
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `${-size / 2}px`,
        marginTop: `${-size / 2}px`,
        borderRadius: '50%',
        background: `rgba(244, 233, 216, ${alpha})`,
        border: '2px solid rgba(244, 233, 216, 0.5)',
        pointerEvents: 'none',
        zIndex: 20,
        display: 'none',
      });
      document.body.appendChild(el);
    }
    // Al cambiar de escena, se quitan de la página
    scene.events.once('shutdown', () => {
      this.base.remove();
      this.knob.remove();
    });

    scene.input.on('pointerdown', (pointer) => {
      if (!pointer.wasTouch || this.pointerId !== null) return;
      this.pointerId = pointer.id;
      this.origin = this.toPage(pointer);
      this.place(this.base, this.origin);
      this.place(this.knob, this.origin);
    });

    scene.input.on('pointermove', (pointer) => {
      if (pointer.id !== this.pointerId) return;
      const current = this.toPage(pointer);
      let dx = current.x - this.origin.x;
      let dy = current.y - this.origin.y;
      const distance = Math.hypot(dx, dy);
      if (distance > RADIUS) {
        dx = (dx / distance) * RADIUS;
        dy = (dy / distance) * RADIUS;
      }
      this.place(this.knob, { x: this.origin.x + dx, y: this.origin.y + dy });
      this.direction = distance < DEAD_ZONE ? { x: 0, y: 0 } : { x: dx / RADIUS, y: dy / RADIUS };
    });

    const release = (pointer) => {
      if (pointer.id !== this.pointerId) return;
      this.pointerId = null;
      this.direction = { x: 0, y: 0 };
      this.base.style.display = 'none';
      this.knob.style.display = 'none';
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  // Posición del dedo en la página (píxeles de pantalla)
  toPage(pointer) {
    const rect = this.scene.game.canvas.getBoundingClientRect();
    return {
      x: rect.left + (pointer.x / this.scene.scale.width) * rect.width,
      y: rect.top + (pointer.y / this.scene.scale.height) * rect.height,
    };
  }

  place(el, { x, y }) {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = 'block';
  }

  isActive() {
    return this.direction.x !== 0 || this.direction.y !== 0;
  }
}
