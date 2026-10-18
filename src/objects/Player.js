import Phaser from 'phaser';
import { createFigure } from './figure.js';

const SPEED = 80; // píxeles por segundo

// El personaje del jugador. Por ahora es una figura sencilla de colores;
// cuando tengamos el sprite, solo habrá que cambiar el dibujo.
//
// options (para escenas en perspectiva isométrica, como el barrio):
// - project(x, y): dónde se dibuja en pantalla un punto del plano
// - screenToPlane(dx, dy): convierte una dirección de pantalla (flecha, joystick) en dirección del plano
export default class Player {
  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.path = [];
    this.project = options.project ?? ((px, py) => ({ x: px, y: py }));
    this.screenToPlane = options.screenToPlane ?? ((dx, dy) => ({ x: dx, y: dy }));

    // Cuerpo invisible a la altura de los pies: es lo que choca con los muebles
    this.body = scene.add.zone(x, y, 10, 6);
    scene.physics.add.existing(this.body);
    this.body.body.setCollideWorldBounds(true);

    // Dibujo provisional
    const start = this.project(x, y);
    this.sprite = createFigure(scene, start.x, start.y, { cuerpo: 0x6b8f71, pelo: 0x5b3a29 });
  }

  walkTo(points) {
    this.path = points ?? [];
  }

  get x() {
    return this.body.x;
  }

  get y() {
    return this.body.y;
  }

  // ¿Se está moviendo ahora mismo?
  isMoving() {
    return this.body.body.velocity.lengthSq() > 1 || this.path.length > 0;
  }

  stop() {
    this.path = [];
    this.body.body.setVelocity(0, 0);
  }

  update(keys, joystick) {
    const body = this.body.body;
    const keyboard = new Phaser.Math.Vector2(
      (keys.right.isDown || keys.d.isDown ? 1 : 0) - (keys.left.isDown || keys.a.isDown ? 1 : 0),
      (keys.down.isDown || keys.s.isDown ? 1 : 0) - (keys.up.isDown || keys.w.isDown ? 1 : 0),
    );

    if (joystick.isActive()) {
      // Móvil: cuanto más arrastras el dedo, más rápido camina (hasta la velocidad máxima)
      this.path = [];
      const v = this.screenToPlane(joystick.direction.x * SPEED, joystick.direction.y * SPEED);
      body.setVelocity(v.x, v.y);
    } else if (keyboard.lengthSq() > 0) {
      // PC: el teclado cancela el paseo por clic
      this.path = [];
      keyboard.normalize().scale(SPEED);
      const v = this.screenToPlane(keyboard.x, keyboard.y);
      body.setVelocity(v.x, v.y);
    } else if (this.path.length) {
      const target = this.path[0];
      const distance = Phaser.Math.Distance.Between(this.body.x, this.body.y, target.x, target.y);
      if (distance < 2) {
        this.path.shift();
        if (!this.path.length) body.setVelocity(0, 0);
      } else {
        this.scene.physics.moveTo(this.body, target.x, target.y, SPEED);
      }
    } else {
      body.setVelocity(0, 0);
    }

    const screen = this.project(this.body.x, this.body.y);
    this.sprite.setPosition(Math.round(screen.x), Math.round(screen.y));
    this.sprite.setDepth(screen.y); // quien está más abajo en la pantalla se dibuja delante
  }
}
