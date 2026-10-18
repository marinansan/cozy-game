import Phaser from 'phaser';

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

    // Dibujo provisional: sombra, cuerpo y cabeza
    this.sprite = scene.add.container(x, y, [
      scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.25),
      scene.add.rectangle(0, -7, 10, 12, 0x6b8f71).setStrokeStyle(1, 0x3d5443),
      scene.add.circle(0, -16, 5, 0xf2d3b3).setStrokeStyle(1, 0x8a6a55),
      scene.add.rectangle(0, -20, 11, 4, 0x5b3a29),
    ]);
  }

  walkTo(points) {
    this.path = points ?? [];
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
  }
}
