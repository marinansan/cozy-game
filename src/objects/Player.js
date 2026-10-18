import Phaser from 'phaser';
import { createFigure } from './figure.js';

const SPEED = 80; // píxeles por segundo

// El personaje del jugador. Por ahora es una figura sencilla de colores;
// cuando tengamos el sprite, solo habrá que cambiar el dibujo.
export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.path = [];

    // Cuerpo invisible a la altura de los pies: es lo que choca con los muebles
    this.body = scene.add.zone(x, y, 10, 6);
    scene.physics.add.existing(this.body);
    this.body.body.setCollideWorldBounds(true);

    // Dibujo provisional
    this.sprite = createFigure(scene, x, y, { cuerpo: 0x6b8f71, pelo: 0x5b3a29 });
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
      body.setVelocity(joystick.direction.x * SPEED, joystick.direction.y * SPEED);
    } else if (keyboard.lengthSq() > 0) {
      // PC: el teclado cancela el paseo por clic
      this.path = [];
      body.setVelocity(keyboard.x, keyboard.y);
      body.velocity.normalize().scale(SPEED);
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

    this.sprite.setPosition(Math.round(this.body.x), Math.round(this.body.y));
    this.sprite.setDepth(this.body.y); // quien está más abajo se dibuja delante
  }
}
