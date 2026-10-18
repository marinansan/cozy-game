import Phaser from 'phaser';
import {
  BARISTA_ZONE,
  LAMPS,
  LIBRARY_BACKGROUND,
  LIBRARY_OBSTACLES,
  PLAYER_START,
  SIGN_SPOT,
  STAIRS_SPOT,
} from '../data/libraryLayout.js';
import { PHASES } from '../data/phases.js';
import { serveResult } from '../systems/cafe.js';
import Pathfinder from '../systems/Pathfinder.js';
import CustomerManager from '../systems/CustomerManager.js';
import Player from '../objects/Player.js';
import VirtualJoystick from '../ui/VirtualJoystick.js';
import CafeUI from '../ui/CafeUI.js';

const BUBBLE_OFFSET = 6; // el bocadillo aparece debajo del cliente
const FLOAT_OFFSET = 24; // el texto de yenes sale por encima de la cabeza
const QUESTION_OFFSET = 26; // la pregunta (Sí / No) sale por encima del personaje
const TALK_REACH = 30; // distancia para hablar con alguien en las estanterías
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
    this.customers = new CustomerManager(this, this.pathfinder);
    this.yen = 0;
    this.day = 1;
    this.currentAction = null;
    this.transitioning = false;
    this.askedAt = null; // punto donde ya se ha hecho la pregunta (para no repetirla)

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

    // Luz de ambiente que se suma por encima (de noche, un brillo azul y morado)
    this.ambient = this.add
      .rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0)
      .setDepth(500)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);

    // Textura de brillo suave, de centro claro a bordes transparentes (el color lo pone cada fase)
    const glow = this.textures.createCanvas('glow', 64, 64);
    const ctx = glow.getContext();
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
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
      if (pointer.wasTouch || this.isBusy()) return;
      const path = this.pathfinder.findPath(this.player.x, this.player.y, pointer.x, pointer.y);
      this.player.walkTo(path);
      this.showTapMarker(pointer.x, pointer.y);
    });

    this.keys = this.input.keyboard.addKeys('up,down,left,right,w,a,s,d');

    // PC: E o espacio para avanzar el diálogo, responder "Sí" o usar el botón de acción
    const pressAction = () => {
      if (this.ui.isPanelOpen() || this.transitioning) return;
      if (this.ui.isChoiceOpen()) {
        this.ui.pickChoice(0);
        return;
      }
      if (this.ui.advanceBubble()) return;
      this.currentAction?.();
    };
    this.input.keyboard.on('keydown-E', pressAction);
    this.input.keyboard.on('keydown-SPACE', pressAction);
    this.input.keyboard.on('keydown-ESC', () => this.ui.isChoiceOpen() && this.ui.pickChoice(-1));

    // Modo depuración: muestra obstáculos y zonas (Mayús + D o ?debug en la dirección)
    this.debugGraphics.setVisible(new URLSearchParams(window.location.search).has('debug'));
    this.input.keyboard.on('keydown-D', (event) => {
      if (event.shiftKey) this.debugGraphics.setVisible(!this.debugGraphics.visible);
    });
  }

  // Mientras hay un menú, una pregunta o un fundido, el personaje no se mueve
  isBusy() {
    return this.ui.isPanelOpen() || this.ui.isChoiceOpen() || this.transitioning;
  }

  // ---------- Fases del día ----------

  startPhase(phaseId) {
    const phase = PHASES[phaseId];
    this.phase = phaseId;
    this.askedAt = null;
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
    this.ambient.setFillStyle(phase.ambiente ?? 0x000000).setAlpha(phase.ambiente ? phase.brillo : 0);
    for (const lamp of this.lamps) {
      lamp.setAlpha(phase.luces ? 0.6 : 0);
      if (phase.luces) lamp.setTint(phase.luces);
    }

    if (phaseId === 'manana') this.customers.startDay();
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

  // Al llegar a la puerta o a la cortina, un bocadillo pregunta si quieres pasar de fase.
  // Si dices que no, no vuelve a preguntar hasta que te alejes y vuelvas.
  updateQuestions() {
    const spot = this.phase === 'noche' ? STAIRS_SPOT : SIGN_SPOT;
    const near = this.isNear(spot);
    if (!near) {
      if (this.askedAt === spot) this.askedAt = null;
      return;
    }
    if (this.askedAt === spot || this.ui.isBubbleOpen()) return;

    let question;
    let onYes;
    if (this.phase === 'manana') {
      if (!this.customers.isEmpty()) return; // no se cierra con clientes dentro
      question = this.customers.moreToday()
        ? 'Aún pueden venir clientes… ¿Cerrar la tienda igualmente?'
        : '¿Quieres cerrar la tienda por hoy?';
      onYes = () => {
        this.customers.stopDay();
        this.goToPhase('tarde');
      };
    } else if (this.phase === 'tarde') {
      question = '¿Abrir la librería esta noche?';
      onYes = () => this.goToPhase('noche');
    } else {
      question = '¿Subir a casa a dormir?';
      onYes = () =>
        this.goToPhase('manana', () => {
          this.day++;
          this.player.body.body.reset(STAIRS_SPOT.x, STAIRS_SPOT.y + 6);
        });
    }

    this.askedAt = spot;
    this.player.stop();
    this.setAction(null);
    this.ui.showChoice(this.player.x, this.player.y - QUESTION_OFFSET, question, [
      { label: 'Sí', principal: true, onClick: onYes },
      { label: 'No', onClick: () => {} },
    ]);
  }

  // ---------- Clientes ----------

  isBehindCounter() {
    const z = BARISTA_ZONE;
    return Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(z.x, z.y, z.w, z.h), this.player.x, this.player.y);
  }

  isNear(spot) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y) <= spot.radio;
  }

  talkTo(customer) {
    this.player.stop();
    this.customers.startTalking(customer);
    this.ui.showBubble(customer.x, customer.y + BUBBLE_OFFSET, customer.data.nombre, customer.data.pedido, () =>
      this.customers.finishTalking(customer),
    );
  }

  serve(customer) {
    this.player.stop();
    this.setAction(null);
    this.ui.showHint(null);
    this.ui.hideBubble();
    this.customers.startServing(customer);

    this.ui.openServe(customer.data, (served) => {
      const result = serveResult(customer.data, served);
      this.yen += result.yenes;
      this.ui.setYen(this.yen, true);
      this.ui.floatText(customer.x, customer.y - FLOAT_OFFSET, `+${result.yenes} ¥`);
      this.customers.served(customer);
      // Cuando has leído su reacción, se sienta o se marcha
      this.ui.showBubble(customer.x, customer.y + BUBBLE_OFFSET, customer.data.nombre, result.reaccion, () => {
        this.time.delayedCall(1500, () => {
          this.ui.hideBubble();
          this.customers.afterReaction(customer);
        });
      });
    });
  }

  // ---------- Acción disponible y pistas ----------

  setAction(label, callback) {
    this.currentAction = label ? callback : null;
    this.ui.showAction(label, callback);
  }

  updateActionAndHint() {
    if (this.phase !== 'manana') {
      this.setAction(null);
      this.ui.showHint(
        this.phase === 'tarde'
          ? 'Tarde: pronto podrás salir al barrio. Ve a la puerta para abrir de noche'
          : 'Noche: pronto llegarán los espíritus. Ve a la cortina del fondo para dormir',
      );
      return;
    }

    // Mañana: hablar o atender a la persona más cercana que lo necesite
    const interaction = this.ui.isBubbleOpen()
      ? null
      : this.customers.nearestInteraction(this.player, this.isBehindCounter(), TALK_REACH);
    if (interaction) {
      const { customer, kind } = interaction;
      const atCounter = customer.data.espera === 'mostrador';
      const label = kind === 'talk' ? '💬 Hablar' : atCounter ? '☕ Atender' : '📚 Recomendar';
      this.setAction(label, () => (kind === 'talk' ? this.talkTo(customer) : this.serve(customer)));
    } else {
      this.setAction(null);
    }

    const pending = this.customers.pending();
    if (this.ui.isBubbleOpen() || interaction) this.ui.showHint(null);
    else if (pending.counter && !this.isBehindCounter()) this.ui.showHint('Hay alguien esperando en el mostrador (entra por la derecha)');
    else if (pending.shelves) this.ui.showHint('Alguien te llama ❗ en las estanterías');
    else if (!this.customers.moreToday() && this.customers.isEmpty()) this.ui.showHint('Ya no vienen más clientes. Ve a la puerta para cerrar 🪧');
    else this.ui.showHint(null);
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
    this.customers.update();
    if (this.isBusy()) {
      this.player.stop();
      if (this.ui.isChoiceOpen()) this.setAction(null);
      return;
    }
    this.player.update(this.keys, this.joystick);
    this.updateActionAndHint();
    this.updateQuestions();
  }
}
