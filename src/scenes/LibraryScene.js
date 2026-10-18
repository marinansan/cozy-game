import Phaser from 'phaser';
import {
  BARISTA_ZONE,
  CUSTOMER_SPOT,
  DOOR,
  LAMPS,
  LIBRARY_BACKGROUND,
  LIBRARY_OBSTACLES,
  PLAYER_START,
  SIGN_SPOT,
  STAIRS_SPOT,
} from '../data/libraryLayout.js';
import { CUSTOMERS } from '../data/cafe.js';
import { PHASES } from '../data/phases.js';
import { serveResult } from '../systems/cafe.js';
import Pathfinder from '../systems/Pathfinder.js';
import Player from '../objects/Player.js';
import Customer from '../objects/Customer.js';
import VirtualJoystick from '../ui/VirtualJoystick.js';
import CafeUI from '../ui/CafeUI.js';

const BUBBLE_OFFSET = 6; // el bocadillo aparece debajo del cliente, para no tapar el mostrador
const FLOAT_OFFSET = 24; // el texto de yenes sale por encima de la cabeza
const NEXT_CUSTOMER_DELAY = 2000; // milisegundos entre un cliente y el siguiente
const FADE_TIME = 600; // milisegundos del fundido entre fases

// Interior de la librería-cafetería: el personaje camina por ella, atiende a los clientes
// y el día pasa por tres fases (mañana, tarde y noche) cuando el jugador decide.
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

    this.createObstacles();

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player.body, this.obstacles);

    this.pathfinder = new Pathfinder({
      width,
      height,
      cellSize: 4,
      obstacles: LIBRARY_OBSTACLES,
      margin: { x: 5, top: 3, bottom: 3 },
    });

    this.createLighting();
    this.createControls();

    this.ui = new CafeUI(document.getElementById('ui'));
    this.yen = 0;
    this.day = 1;
    this.customer = null;
    this.customerState = 'none'; // none · walking · talking · waiting · serving · leaving
    this.spawnTimer = null;
    this.currentAction = null;
    this.transitioning = false;

    this.startPhase('manana');
  }

  // Muebles y paredes: rectángulos invisibles que bloquean el paso
  createObstacles() {
    this.obstacles = this.physics.add.staticGroup();
    this.debugGraphics = this.add.graphics().setDepth(1000).setVisible(false);
    for (const o of LIBRARY_OBSTACLES) {
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      this.obstacles.add(zone);
      this.debugGraphics.fillStyle(0xff3366, 0.35).fillRect(o.x, o.y, o.w, o.h);
    }
    const z = BARISTA_ZONE;
    this.debugGraphics.fillStyle(0x33ccff, 0.35).fillRect(z.x, z.y, z.w, z.h);
    for (const spot of [SIGN_SPOT, STAIRS_SPOT]) {
      this.debugGraphics.lineStyle(1, 0xffff66, 0.9).strokeCircle(spot.x, spot.y, spot.radio);
    }
  }

  // Color de cada fase (una capa que tiñe la escena) y lámparas que brillan de noche
  createLighting() {
    const { width, height } = this.scale;
    this.tint = this.add
      .rectangle(0, 0, width, height, 0xffffff)
      .setOrigin(0)
      .setDepth(500)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Textura de brillo suave, de centro claro a bordes transparentes
    const glow = this.textures.createCanvas('glow', 64, 64);
    const ctx = glow.getContext();
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 200, 120, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    glow.refresh();

    this.lamps = LAMPS.map((lamp) =>
      this.add
        .image(lamp.x, lamp.y, 'glow')
        .setDisplaySize(lamp.radio * 2, lamp.radio * 2)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(501)
        .setAlpha(0),
    );
  }

  createControls() {
    // Móvil: arrastrar el dedo para deslizar al personaje (joystick flotante)
    this.joystick = new VirtualJoystick(this);

    // PC: hacer clic para caminar hasta ese punto
    this.input.on('pointerdown', (pointer) => {
      if (pointer.wasTouch || this.ui.isPanelOpen() || this.transitioning) return;
      const path = this.pathfinder.findPath(this.player.x, this.player.y, pointer.x, pointer.y);
      this.player.walkTo(path);
      this.showTapMarker(pointer.x, pointer.y);
    });

    this.keys = this.input.keyboard.addKeys('up,down,left,right,w,a,s,d');

    // PC: E o espacio para avanzar el diálogo o usar el botón de acción
    const pressAction = () => {
      if (this.ui.isPanelOpen() || this.transitioning) return;
      if (this.ui.advanceBubble()) return;
      this.currentAction?.();
    };
    this.input.keyboard.on('keydown-E', pressAction);
    this.input.keyboard.on('keydown-SPACE', pressAction);

    // Modo depuración: muestra obstáculos y zonas (Mayús + D o ?debug en la dirección)
    this.debugGraphics.setVisible(new URLSearchParams(window.location.search).has('debug'));
    this.input.keyboard.on('keydown-D', (event) => {
      if (event.shiftKey) this.debugGraphics.setVisible(!this.debugGraphics.visible);
    });
  }

  // ---------- Fases del día ----------

  startPhase(phaseId) {
    const phase = PHASES[phaseId];
    this.phase = phaseId;
    this.ui.setStatus(this.day, phase);
    this.ui.showTitle(phaseId === 'manana' ? `Día ${this.day} · ${phase.icono} ${phase.nombre}` : `${phase.icono} ${phase.nombre}`);

    // Mezcla el tinte con blanco según la fuerza de la fase
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xffffff),
      Phaser.Display.Color.ValueToColor(phase.tinte),
      100,
      phase.fuerza * 100,
    );
    this.tint.setFillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
    for (const lamp of this.lamps) lamp.setAlpha(phase.luces ? 0.55 : 0);

    if (phaseId === 'manana') {
      this.customerIndex = 0;
      this.spawnTimer = this.time.delayedCall(1500, () => this.spawnCustomer());
    }
  }

  // Fundido a negro, cambio de fase y vuelta a la luz
  goToPhase(phaseId, onMiddle) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.stop();
    this.setAction(null);
    this.ui.showHint(null);
    this.ui.hideBubble();
    this.cameras.main.fadeOut(FADE_TIME, 20, 14, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      onMiddle?.();
      this.startPhase(phaseId);
      this.cameras.main.fadeIn(FADE_TIME, 20, 14, 10);
      this.cameras.main.once('camerafadeincomplete', () => {
        this.transitioning = false;
      });
    });
  }

  closeShop() {
    this.spawnTimer?.remove();
    this.goToPhase('tarde');
  }

  openAtNight() {
    this.goToPhase('noche');
  }

  sleep() {
    this.goToPhase('manana', () => {
      this.day++;
      this.player.body.body.reset(STAIRS_SPOT.x, STAIRS_SPOT.y + 6);
    });
  }

  // ---------- Clientes ----------

  isBehindCounter() {
    const z = BARISTA_ZONE;
    return Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(z.x, z.y, z.w, z.h), this.player.x, this.player.y);
  }

  isNear(spot) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y) <= spot.radio;
  }

  moreCustomersToday() {
    return this.customerIndex < CUSTOMERS.length;
  }

  spawnCustomer() {
    if (this.phase !== 'manana' || !this.moreCustomersToday()) return;
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
    this.setAction(null);
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
      this.spawnTimer = this.time.delayedCall(NEXT_CUSTOMER_DELAY, () => this.spawnCustomer());
    });
  }

  // ---------- Acción disponible y pistas ----------

  setAction(label, callback) {
    this.currentAction = label ? callback : null;
    this.ui.showAction(label, callback);
  }

  // Decide qué botón y qué pista mostrar según la fase y dónde estás
  updateActionAndHint() {
    if (this.phase === 'manana') {
      if (this.customerState === 'waiting') {
        const ready = this.isBehindCounter();
        this.setAction(ready ? '☕ Atender' : null, () => this.startServing());
        this.ui.showHint(ready ? null : 'Ve detrás del mostrador para atender (entrada por la derecha)');
        return;
      }
      const shopEmpty = this.customerState === 'none';
      this.setAction(shopEmpty && this.isNear(SIGN_SPOT) ? '🪧 Cerrar la tienda' : null, () => this.closeShop());
      if (shopEmpty && !this.moreCustomersToday()) {
        this.ui.showHint('Ya no vienen más clientes. Ve a la puerta para cerrar la tienda 🪧');
      } else {
        this.ui.showHint(null);
      }
    } else if (this.phase === 'tarde') {
      this.setAction(this.isNear(SIGN_SPOT) ? '🌙 Abrir de noche' : null, () => this.openAtNight());
      this.ui.showHint('Tarde: pronto podrás salir al barrio. Ve a la puerta para abrir de noche');
    } else if (this.phase === 'noche') {
      this.setAction(this.isNear(STAIRS_SPOT) ? '🛏️ Dormir' : null, () => this.sleep());
      this.ui.showHint('Noche: pronto llegarán los espíritus. Sube a casa por la cortina del fondo para dormir');
    }
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
    if (this.ui.isPanelOpen() || this.transitioning) {
      this.player.stop();
      return;
    }
    this.player.update(this.keys, this.joystick);
    this.updateActionAndHint();
  }
}
