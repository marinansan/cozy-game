import Phaser from 'phaser';
import { LIBRARY_BACKGROUND, LIBRARY_OBSTACLES, PLAYER_START } from '../data/libraryLayout.js';
import Pathfinder from '../systems/Pathfinder.js';
import Player from '../objects/Player.js';
import VirtualJoystick from '../ui/VirtualJoystick.js';

// Interior de la librería-cafetería: el personaje camina por ella.
export default class LibraryScene extends Phaser.Scene {
  constructor() {
    super('LibraryScene');
  }

  preload() {
    this.load.image(LIBRARY_BACKGROUND, 'assets/libreria.png');
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(0, 0, LIBRARY_BACKGROUND).setOrigin(0);

    // Muebles y paredes: rectángulos invisibles que bloquean el paso
    this.obstacles = this.physics.add.staticGroup();
    this.debugGraphics = this.add.graphics().setDepth(10).setVisible(false);
    for (const o of LIBRARY_OBSTACLES) {
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      this.obstacles.add(zone);
      this.debugGraphics.fillStyle(0xff3366, 0.35).fillRect(o.x, o.y, o.w, o.h);
    }

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player.body, this.obstacles);

    this.pathfinder = new Pathfinder({
      width,
      height,
      cellSize: 4,
      obstacles: LIBRARY_OBSTACLES,
      margin: { x: 5, top: 3, bottom: 3 },
    });

    // Móvil: arrastrar el dedo para deslizar al personaje (joystick flotante)
    this.joystick = new VirtualJoystick(this);

    // PC: hacer clic para caminar hasta ese punto
    this.input.on('pointerdown', (pointer) => {
      if (pointer.wasTouch) return;
      const path = this.pathfinder.findPath(this.player.body.x, this.player.body.y, pointer.x, pointer.y);
      this.player.walkTo(path);
      this.showTapMarker(pointer.x, pointer.y);
    });

    this.keys = this.input.keyboard.addKeys('up,down,left,right,w,a,s,d');

    // Modo depuración: muestra los obstáculos (Mayús + D o ?debug en la dirección)
    this.debugGraphics.setVisible(new URLSearchParams(window.location.search).has('debug'));
    this.input.keyboard.on('keydown-D', (event) => {
      if (event.shiftKey) this.debugGraphics.setVisible(!this.debugGraphics.visible);
    });
  }

  showTapMarker(x, y) {
    const marker = this.add.circle(x, y, 3, 0xf4e9d8, 0.9).setDepth(5);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 2.5,
      duration: 400,
      onComplete: () => marker.destroy(),
    });
  }

  update() {
    this.player.update(this.keys, this.joystick);
  }
}
