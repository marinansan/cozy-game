import Phaser from 'phaser';
import {
  BARISTA_ZONE,
  CUSTOMER_SPOT,
  DOOR,
  LIBRARY_BACKGROUND,
  LIBRARY_OBSTACLES,
  PLAYER_START,
} from '../data/libraryLayout.js';
import { CUSTOMERS } from '../data/cafe.js';
import { serveResult } from '../systems/cafe.js';
import Pathfinder from '../systems/Pathfinder.js';
import Player from '../objects/Player.js';
import Customer from '../objects/Customer.js';
import VirtualJoystick from '../ui/VirtualJoystick.js';
import CafeUI from '../ui/CafeUI.js';

const BUBBLE_OFFSET = 6; // el bocadillo aparece debajo del cliente, para no tapar el mostrador
const FLOAT_OFFSET = 24; // el texto de yenes sale por encima de la cabeza
const NEXT_CUSTOMER_DELAY = 2000; // milisegundos entre un cliente y el siguiente

// Interior de la librería-cafetería: el personaje camina por ella y atiende a los clientes.
export default class LibraryScene extends Phaser.Scene {
  constructor() {
    super('LibraryScene');
  }

  preload() {
    this.load.image(LIBRARY_BACKGROUND, 'assets/libreria.png');
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(0, 0, LIBRARY_BACKGROUND).setOrigin(0).setDepth(-1);

    // Muebles y paredes: rectángulos invisibles que bloquean el paso
    this.obstacles = this.physics.add.staticGroup();
    this.debugGraphics = this.add.graphics().setDepth(1000).setVisible(false);
    for (const o of LIBRARY_OBSTACLES) {
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      this.obstacles.add(zone);
      this.debugGraphics.fillStyle(0xff3366, 0.35).fillRect(o.x, o.y, o.w, o.h);
    }
    const z = BARISTA_ZONE;
    this.debugGraphics.fillStyle(0x33ccff, 0.35).fillRect(z.x, z.y, z.w, z.h);

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
      if (pointer.wasTouch || this.ui.isPanelOpen()) return;
      const path = this.pathfinder.findPath(this.player.x, this.player.y, pointer.x, pointer.y);
      this.player.walkTo(path);
      this.showTapMarker(pointer.x, pointer.y);
    });

    this.keys = this.input.keyboard.addKeys('up,down,left,right,w,a,s,d');

    // PC: tecla E o espacio para atender
    const pressAction = () => {
      if (this.ui.isPanelOpen()) return;
      if (this.ui.advanceBubble()) return;
      if (this.ui.isActionVisible()) this.startServing();
    };
    this.input.keyboard.on('keydown-E', pressAction);
    this.input.keyboard.on('keydown-SPACE', pressAction);

    // Modo depuración: muestra los obstáculos (Mayús + D o ?debug en la dirección)
    this.debugGraphics.setVisible(new URLSearchParams(window.location.search).has('debug'));
    this.input.keyboard.on('keydown-D', (event) => {
      if (event.shiftKey) this.debugGraphics.setVisible(!this.debugGraphics.visible);
    });

    // Cafetería
    this.ui = new CafeUI(document.getElementById('ui'));
    this.yen = 0;
    this.customerIndex = 0;
    this.customer = null;
    this.customerState = 'none'; // none · walking · talking · waiting · serving · leaving
    this.time.delayedCall(1200, () => this.spawnCustomer());
  }

  isBehindCounter() {
    const z = BARISTA_ZONE;
    return Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(z.x, z.y, z.w, z.h), this.player.x, this.player.y);
  }

  spawnCustomer() {
    if (this.customerIndex >= CUSTOMERS.length) {
      this.ui.showHint('Por hoy no vienen más clientes 🌙');
      return;
    }
    const data = CUSTOMERS[this.customerIndex++];
    this.customer = new Customer(this, data, DOOR.x, DOOR.y);
    this.customerState = 'walking';
    const path = this.pathfinder.findPath(DOOR.x, DOOR.y, CUSTOMER_SPOT.x, CUSTOMER_SPOT.y);
    this.customer.walk(path, () => {
      // Cuenta lo que necesita; cuando termina de hablar, ya se le puede atender
      this.customerState = 'talking';
      this.ui.showBubble(this.customer.x, this.customer.y + BUBBLE_OFFSET, data.nombre, data.pedido, () => {
        this.customerState = 'waiting';
      });
    });
  }

  startServing() {
    if (this.customerState !== 'waiting') return;
    this.customerState = 'serving';
    this.player.stop();
    this.ui.showAction(null);
    this.ui.showHint(null);
    this.ui.hideBubble();

    const customer = this.customer;
    this.ui.openServe(customer.data, (ingredients, book) => {
      const result = serveResult(customer.data, ingredients, book);
      this.yen += result.yenes;
      this.ui.setYen(this.yen, true);
      this.ui.floatText(customer.x, customer.y - FLOAT_OFFSET, `+${result.yenes} ¥`);
      // Se despide cuando has leído toda su reacción (y un momento después)
      this.ui.showBubble(customer.x, customer.y + BUBBLE_OFFSET, customer.data.nombre, result.reaccion, () => {
        this.time.delayedCall(2500, () => this.customerLeaves());
      });
    });
  }

  customerLeaves() {
    this.ui.hideBubble();
    this.customerState = 'leaving';
    const customer = this.customer;
    const path = this.pathfinder.findPath(customer.x, customer.y, DOOR.x, DOOR.y);
    customer.walk(path, () => {
      customer.destroy();
      this.customer = null;
      this.customerState = 'none';
      this.time.delayedCall(NEXT_CUSTOMER_DELAY, () => this.spawnCustomer());
    });
  }

  showTapMarker(x, y) {
    const marker = this.add.circle(x, y, 3, 0xf4e9d8, 0.9).setDepth(1000);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 2.5,
      duration: 400,
      onComplete: () => marker.destroy(),
    });
  }

  update() {
    if (this.ui.isPanelOpen()) {
      this.player.stop();
      return;
    }
    this.player.update(this.keys, this.joystick);

    // ¿Puede atender? Solo si hay un cliente esperando y estás detrás del mostrador
    if (this.customerState === 'waiting') {
      const ready = this.isBehindCounter();
      this.ui.showAction(ready ? '☕ Atender' : null, () => this.startServing());
      this.ui.showHint(ready ? null : 'Ve detrás del mostrador para atender (entrada por la derecha)');
    }
  }
}
