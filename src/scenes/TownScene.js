import Phaser from 'phaser';
import {
  BUILDINGS,
  CLUES,
  COLORS,
  FOG_ZONES,
  LIBRARY_DOOR,
  LOT,
  PATHS,
  PATH_WIDTH,
  PLAZA,
  PROPS,
  TOWN_SIZE,
  TOWN_START,
  TREES,
} from '../data/townLayout.js';
import { PHASES } from '../data/phases.js';
import { ART_RESOLUTION, ZOOM } from '../config.js';
import { state } from '../systems/GameState.js';
import { ISO_SIZE, isoCorners, screenToPlane, toIso, toPlane } from '../systems/iso.js';
import Pathfinder from '../systems/Pathfinder.js';
import Player from '../objects/Player.js';
import VirtualJoystick from '../ui/VirtualJoystick.js';
import CafeUI from '../ui/CafeUI.js';

const FADE_TIME = 600;
const PICKUP_REACH = 22; // distancia para recoger un objeto
const QUESTION_OFFSET = 26;
const BUBBLE_OFFSET = 6;
const FOG_DEPTH = 5000; // la niebla se dibuja por encima de todo el barrio
const FOREST_COLOR = 0x4f6b38; // fuera del barrio solo hay bosque

// El barrio por la tarde, en perspectiva isométrica (en diagonal).
// El juego piensa en un plano normal (caminar, chocar, buscar caminos) y solo lo dibuja
// girado; ver src/systems/iso.js. Por ahora todo son bloques de colores provisionales.
export default class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
  }

  preload() {
    for (const b of BUILDINGS) {
      if (b.imagen) this.load.image(`edificio-${b.id}`, `assets/${b.imagen.archivo}`);
    }
  }

  create() {
    const { width, height } = TOWN_SIZE;
    this.physics.world.setBounds(0, 0, width, height);
    this.obstacles = this.physics.add.staticGroup();
    this.obstacleRects = [];
    this.buildings = [];
    this.debugGraphics = this.add.graphics().setDepth(9000).setVisible(false);

    this.drawGround();
    this.createBuildings();
    this.createLot();
    this.createProps();
    this.createTrees();
    this.createFog();
    this.createClues();

    this.player = new Player(this, TOWN_START.x, TOWN_START.y, { project: toIso, screenToPlane });
    this.physics.add.collider(this.player.body, this.obstacles);

    this.pathfinder = new Pathfinder({
      width,
      height,
      cellSize: 8,
      obstacles: this.obstacleRects,
      margin: { x: 5, top: 3, bottom: 3 },
    });

    // Cámara: sigue al personaje sin salirse del barrio
    this.cameras.main.setBounds(0, 0, ISO_SIZE.width, ISO_SIZE.height);
    this.cameras.main.setZoom(ZOOM);
    this.cameras.main.setBackgroundColor(FOREST_COLOR);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.mapView = false;

    this.createLighting();
    this.createControls();

    this.ui = new CafeUI(document.getElementById('ui'));
    this.ui.setYen(state.yen);
    this.ui.setStatus(state.day, PHASES[state.phase]);
    this.ui.showMapButton('🗺️ Mapa', () => this.toggleMap());
    this.currentAction = null;
    this.transitioning = false;
    this.askedAtDoor = true; // acabas de salir por la puerta: no preguntar hasta que te alejes

    this.cameras.main.fadeIn(FADE_TIME, 20, 14, 10);
  }

  // ---------- Dibujo del barrio (provisional) ----------

  // Rombo de un rectángulo del plano, como lista de puntos de pantalla
  diamond(x, y, w, h, raise = 0) {
    const c = isoCorners(x, y, w, h);
    return [c.top, c.right, c.bottom, c.left].map((p) => ({ x: p.x, y: p.y - raise }));
  }

  addObstacle(x, y, w, h) {
    this.obstacleRects.push({ x, y, w, h });
    this.obstacles.add(this.add.zone(x + w / 2, y + h / 2, w, h));
    this.debugGraphics.fillStyle(0xff3366, 0.35).fillPoints(this.diamond(x, y, w, h), true);
  }

  // El suelo (hierba, caminos, plaza) se dibuja una sola vez y se guarda como imagen,
  // para que el juego no tenga que redibujarlo en cada fotograma
  drawGround() {
    const { width, height } = TOWN_SIZE;
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.hierba).fillPoints(this.diamond(0, 0, width, height), true);

    // Un círculo del plano se ve como una elipse aplastada
    const blob = (x, y, radius) => {
      const p = toIso(x, y);
      g.fillEllipse(p.x, p.y, radius * 2 * Math.SQRT2, radius * Math.SQRT2);
    };

    // Manchas de hierba más oscura para que el suelo no sea plano
    const rng = new Phaser.Math.RandomDataGenerator(['barrio']);
    g.fillStyle(COLORS.hierbaOscura, 0.5);
    for (let i = 0; i < 260; i++) blob(rng.between(0, width), rng.between(0, height), rng.between(6, 18));

    // Caminos curvos: un borde algo más oscuro y el camino encima
    for (const [color, extra] of [
      [COLORS.bordeCamino, 4],
      [COLORS.camino, 0],
    ]) {
      g.fillStyle(color);
      for (const points of PATHS) {
        const curve = new Phaser.Curves.Spline(points.map((p) => [p.x, p.y]).flat());
        for (const p of curve.getSpacedPoints(Math.ceil(curve.getLength() / 4))) blob(p.x, p.y, PATH_WIDTH / 2 + extra);
      }
    }

    // Plaza con fuente
    g.fillStyle(COLORS.bordePlaza);
    blob(PLAZA.x, PLAZA.y, PLAZA.radio + 5);
    g.fillStyle(COLORS.plaza);
    blob(PLAZA.x, PLAZA.y, PLAZA.radio);
    g.fillStyle(COLORS.bordePlaza);
    blob(PLAZA.x, PLAZA.y, PLAZA.fuente + 5);
    g.fillStyle(COLORS.agua);
    blob(PLAZA.x, PLAZA.y, PLAZA.fuente);
    g.fillStyle(0xffffff, 0.6);
    blob(PLAZA.x - 3, PLAZA.y - 3, 4);

    if (this.textures.exists('townGround')) this.textures.remove('townGround');
    g.generateTexture('townGround', ISO_SIZE.width, ISO_SIZE.height);
    g.destroy();
    this.add.image(0, 0, 'townGround').setOrigin(0).setDepth(-10);

    const f = PLAZA.fuente;
    this.addObstacle(PLAZA.x - f, PLAZA.y - f, f * 2, f * 2);
  }

  // Un edificio es una caja: dos fachadas visibles (izquierda y derecha) y el tejado encima
  createBuildings() {
    const shade = (color, amount) => Phaser.Display.Color.ValueToColor(color).darken(amount).color;
    const up = (p, dy) => ({ x: p.x, y: p.y - dy });

    for (const b of BUILDINGS) {
      if (b.imagen) {
        // Edificio con dibujo: la imagen se apoya en la esquina delantera de su planta
        const corner = toIso(b.x + b.w, b.y + b.h);
        const view = this.add
          .image(corner.x, corner.y, `edificio-${b.id}`)
          .setOrigin(b.imagen.origen.x, b.imagen.origen.y)
          .setScale(1 / ART_RESOLUTION); // la imagen está a 3 veces la resolución del juego
        this.addObstacle(b.x, b.y, b.w, b.h);
        this.buildings.push({ ...b, graphics: view });
        continue;
      }

      const wallHeight = 32;
      const c = isoCorners(b.x, b.y, b.w, b.h);
      const g = this.add.graphics();

      // Fachada izquierda (la de la puerta) y fachada derecha, algo más oscura
      g.fillStyle(b.pared).fillPoints([c.left, c.bottom, up(c.bottom, wallHeight), up(c.left, wallHeight)], true);
      g.fillStyle(shade(b.pared, 15)).fillPoints([c.bottom, c.right, up(c.right, wallHeight), up(c.bottom, wallHeight)], true);
      // Tejado: el rombo de arriba, un poco más grande que la planta, y una cumbrera
      g.fillStyle(b.techo).fillPoints(this.diamond(b.x - 6, b.y - 6, b.w + 12, b.h + 12, wallHeight), true);
      const ridgeRaise = wallHeight + b.tejado * 0.5;
      g.fillStyle(shade(b.techo, 12)).fillPoints(this.diamond(b.x + b.w * 0.25, b.y + b.h * 0.25, b.w * 0.5, b.h * 0.5, ridgeRaise), true);

      // Puerta y ventanas en la fachada izquierda (la que da al camino)
      const onLeftFace = (from, to, bottom, top, color) => {
        const p1 = toIso(b.x + from, b.y + b.h);
        const p2 = toIso(b.x + to, b.y + b.h);
        g.fillStyle(color).fillPoints([up(p1, bottom), up(p2, bottom), up(p2, top), up(p1, top)], true);
      };
      onLeftFace(b.w / 2 - 9, b.w / 2 + 9, 0, 22, 0x5b3a29);
      onLeftFace(10, 32, 10, 22, 0xf2d38a);
      onLeftFace(b.w - 32, b.w - 10, 10, 22, 0xf2d38a);

      const labelAt = toIso(b.x + b.w / 2, b.y + b.h / 2);
      this.addLabel(labelAt.x, labelAt.y - ridgeRaise - 8, b.nombre);
      this.addObstacle(b.x, b.y, b.w, b.h);
      this.buildings.push({ ...b, graphics: g });
    }
  }

  createLot() {
    const g = this.add.graphics().setDepth(toIso(LOT.x, LOT.y).y);
    g.fillStyle(COLORS.solar, 0.6).fillPoints(this.diamond(LOT.x, LOT.y, LOT.w, LOT.h), true);
    // Valla en los cuatro lados, con una abertura en el lado que da a la plaza
    const gap = { from: LOT.x + LOT.w / 2 - LOT.abertura / 2, to: LOT.x + LOT.w / 2 + LOT.abertura / 2 };
    const fence = (x1, y1, x2, y2) => {
      const a = toIso(x1, y1);
      const b = toIso(x2, y2);
      g.lineStyle(3, COLORS.valla).lineBetween(a.x, a.y - 4, b.x, b.y - 4);
    };
    fence(LOT.x, LOT.y, gap.from, LOT.y);
    fence(gap.to, LOT.y, LOT.x + LOT.w, LOT.y);
    fence(LOT.x + LOT.w, LOT.y, LOT.x + LOT.w, LOT.y + LOT.h);
    fence(LOT.x, LOT.y, LOT.x, LOT.y + LOT.h);
    fence(LOT.x, LOT.y + LOT.h, LOT.x + LOT.w, LOT.y + LOT.h);
    const center = toIso(LOT.x + LOT.w / 2, LOT.y + LOT.h / 2);
    this.addLabel(center.x, center.y, 'Solar vacío');
    const t = 4;
    this.addObstacle(LOT.x, LOT.y - t / 2, gap.from - LOT.x, t);
    this.addObstacle(gap.to, LOT.y - t / 2, LOT.x + LOT.w - gap.to, t);
    this.addObstacle(LOT.x - t / 2, LOT.y, t, LOT.h);
    this.addObstacle(LOT.x + LOT.w - t / 2, LOT.y, t, LOT.h);
    this.addObstacle(LOT.x, LOT.y + LOT.h - t / 2, LOT.w, t);
  }

  createProps() {
    for (const p of PROPS) {
      const base = toIso(p.x + p.w / 2, p.y + p.h / 2);
      const g = this.add.graphics().setDepth(base.y);
      if (p.tipo === 'banco') {
        g.fillStyle(0x6b4a2f).fillRect(base.x - 2, base.y - 6, 4, 6);
        g.fillStyle(0x8a5a3b).fillPoints(this.diamond(p.x, p.y, p.w, p.h, 6), true);
      } else if (p.tipo === 'linterna') {
        g.fillStyle(0x9a9a8a).fillRect(base.x - 5, base.y - 22, 10, 22);
        g.fillStyle(0xf2d38a).fillRect(base.x - 3, base.y - 18, 6, 5);
      } else if (p.tipo === 'farola') {
        g.fillStyle(0x3d3d3d).fillRect(base.x - 2, base.y - 36, 4, 36);
        g.fillStyle(0xf2d38a).fillCircle(base.x, base.y - 38, 5);
      }
      this.addObstacle(p.x, p.y, p.w, p.h);
    }
  }

  // Árboles: una imagen dibujada una sola vez y reutilizada.
  // La copa queda por encima y solo el tronco choca (se puede pasar por detrás).
  addTree(x, y, size = 1) {
    if (!this.textures.exists('townTree')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x6b4a2f).fillRect(21, 46, 6, 14);
      g.fillStyle(0x5c7f3e).fillCircle(24, 34, 18);
      g.fillStyle(0x6f9a4a).fillCircle(19, 29, 11);
      g.generateTexture('townTree', 48, 60);
      g.destroy();
    }
    const p = toIso(x, y);
    this.add.image(p.x, p.y, 'townTree').setOrigin(0.5, 1).setScale(size).setDepth(p.y);
    this.addObstacle(x - 4, y - 4, 8, 6);
  }

  createTrees() {
    for (const t of TREES) this.addTree(t.x, t.y);

    // Bosque en los bordes del barrio
    const { width, height } = TOWN_SIZE;
    const rng = new Phaser.Math.RandomDataGenerator(['bosque']);
    for (let x = 10; x < width; x += 34) {
      this.addTree(x + rng.between(-8, 8), height - 12 - rng.between(0, 30), rng.realInRange(1, 1.4));
    }
    for (let y = 340; y < height - 40; y += 36) {
      this.addTree(18 + rng.between(0, 30), y + rng.between(-8, 8), rng.realInRange(1, 1.4));
      if (y > 900) this.addTree(width - 18 - rng.between(0, 30), y + rng.between(-8, 8), rng.realInRange(1, 1.4));
    }
    // Paredes invisibles detrás del bosque para no salir del barrio
    this.addObstacle(0, height - 20, width, 20);
    this.addObstacle(0, 0, 10, height);
    this.addObstacle(width - 10, 0, 10, height);
  }

  // Niebla: nubes blancas que se mueven despacio y bloquean el paso
  createFog() {
    const cloud = this.makeCloudTexture();
    this.fogParts = [];
    for (const zone of FOG_ZONES) {
      // Base algo más pequeña que la zona: los bordes los forman las nubes, no una línea recta
      const inset = 40;
      const base = this.add.graphics().setDepth(FOG_DEPTH);
      base
        .fillStyle(0xf4f1ec, 0.7)
        .fillPoints(this.diamond(zone.x + inset, zone.y + inset, zone.w - inset * 2, zone.h - inset * 2), true);
      this.fogParts.push(base);

      const rng = new Phaser.Math.RandomDataGenerator([zone.id]);
      const count = Math.ceil((zone.w + zone.h) / 10);
      for (let i = 0; i < count; i++) {
        // Un punto del borde, desplazado un poco hacia dentro para tapar el borde de la base
        const onX = rng.frac() < zone.w / (zone.w + zone.h);
        const depth = rng.between(0, inset + 30);
        const x = onX
          ? zone.x + rng.between(0, zone.w)
          : rng.frac() < 0.5
            ? zone.x + depth
            : zone.x + zone.w - depth;
        const y = onX
          ? rng.frac() < 0.5
            ? zone.y + depth
            : zone.y + zone.h - depth
          : zone.y + rng.between(0, zone.h);
        const p = toIso(x, y);
        const puff = this.add
          .image(p.x, p.y, cloud)
          .setDisplaySize(rng.between(170, 260), rng.between(90, 140))
          .setDepth(FOG_DEPTH)
          .setAlpha(0.9);
        this.tweens.add({
          targets: puff,
          x: p.x + rng.between(-14, 14),
          y: p.y + rng.between(-8, 8),
          duration: rng.between(3000, 6000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.fogParts.push(puff);
      }
      // Se bloquea un poco antes del borde visible
      this.addObstacle(zone.x - 10, zone.y - 10, zone.w + 20, zone.h + 20);
    }
  }

  makeCloudTexture() {
    if (!this.textures.exists('fogCloud')) {
      const tex = this.textures.createCanvas('fogCloud', 64, 64);
      const ctx = tex.getContext();
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(244, 241, 236, 0.95)');
      gradient.addColorStop(1, 'rgba(244, 241, 236, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      tex.refresh();
    }
    return 'fogCloud';
  }

  createClues() {
    this.clues = [];
    for (const clue of CLUES) {
      if (state.inventory.includes(clue.id)) continue;
      const p = toIso(clue.x, clue.y);
      // Farolillo provisional con un brillo que late para llamar la atención
      const shine = this.add.circle(p.x, p.y - 6, 10, 0xffe9a8, 0.5).setDepth(p.y - 1);
      this.tweens.add({ targets: shine, scale: 1.5, alpha: 0.1, duration: 900, yoyo: true, repeat: -1 });
      const body = this.add.graphics().setDepth(p.y);
      body.fillStyle(0xe8dcc0).fillRect(p.x - 4, p.y - 11, 8, 10);
      body.fillStyle(0x8a5a3b).fillRect(p.x - 5, p.y - 12, 10, 2).fillRect(p.x - 5, p.y - 1, 10, 2);
      this.clues.push({ ...clue, parts: [shine, body] });
    }
  }

  addLabel(x, y, text) {
    this.add
      .text(x, y, text, { fontFamily: 'Nunito, sans-serif', fontSize: '10px', color: '#3d2e22', resolution: 3 })
      .setOrigin(0.5, 1)
      .setDepth(8000)
      .setAlpha(0.8);
  }

  // Luz de la tarde sobre todo el barrio
  createLighting() {
    const phase = PHASES[state.phase];
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xffffff),
      Phaser.Display.Color.ValueToColor(phase.tinte),
      100,
      phase.fuerza * 100,
    );
    this.add
      .rectangle(0, 0, ISO_SIZE.width, ISO_SIZE.height, Phaser.Display.Color.GetColor(color.r, color.g, color.b))
      .setOrigin(0)
      .setDepth(8500)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  // En perspectiva isométrica, un edificio tapa al personaje solo si este está detrás.
  // Delante = al sur o al este de su planta (los lados de las fachadas visibles).
  sortBuildings() {
    const depth = this.player.sprite.depth;
    for (const b of this.buildings) {
      const inFront = this.player.x >= b.x + b.w || this.player.y >= b.y + b.h;
      b.graphics.setDepth(inFront ? depth - 1 : depth + 1);
    }
  }

  // ---------- Controles ----------

  createControls() {
    this.joystick = new VirtualJoystick(this);

    // PC: clic para caminar hasta ese punto del barrio
    this.input.on('pointerdown', (pointer) => {
      if (pointer.wasTouch || this.isBusy()) return;
      const target = toPlane(pointer.worldX, pointer.worldY);
      const path = this.pathfinder.findPath(this.player.x, this.player.y, target.x, target.y);
      this.player.walkTo(path);
    });

    this.keys = this.input.keyboard.addKeys('up,down,left,right,w,a,s,d');
    const pressAction = () => {
      if (this.transitioning) return;
      if (this.mapView) {
        this.toggleMap();
        return;
      }
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
    this.input.keyboard.on('keydown-M', () => this.toggleMap());

    this.debugGraphics.setVisible(new URLSearchParams(window.location.search).has('debug'));
    this.input.keyboard.on('keydown-D', (event) => {
      if (event.shiftKey) this.debugGraphics.setVisible(!this.debugGraphics.visible);
    });
  }

  isBusy() {
    return this.ui.isChoiceOpen() || this.transitioning || this.mapView;
  }

  // Vista de lejos: la cámara se aleja para ver todo el barrio
  toggleMap() {
    if (this.transitioning || this.ui.isChoiceOpen()) return;
    const camera = this.cameras.main;
    this.mapView = !this.mapView;
    this.player.stop();
    if (this.mapView) {
      this.ui.hideBubble();
      camera.stopFollow();
      camera.removeBounds(); // para poder centrar el barrio entero en la pantalla
      const zoom = Math.min(this.scale.width / ISO_SIZE.width, this.scale.height / ISO_SIZE.height);
      camera.pan(ISO_SIZE.width / 2, ISO_SIZE.height / 2, 500, 'Sine.easeInOut');
      camera.zoomTo(zoom, 500, 'Sine.easeInOut');
      this.ui.showMapButton('✖ Volver', () => this.toggleMap());
      this.setAction(null);
      this.ui.showHint('Así se ve el barrio de lejos. La niebla oculta lo que aún no recuerdas.');
    } else {
      const target = this.player.sprite;
      camera.zoomTo(ZOOM, 500, 'Sine.easeInOut');
      camera.pan(target.x, target.y, 500, 'Sine.easeInOut', false, (_cam, progress) => {
        if (progress === 1) {
          camera.setBounds(0, 0, ISO_SIZE.width, ISO_SIZE.height);
          camera.startFollow(target, true, 0.12, 0.12);
        }
      });
      this.ui.showMapButton('🗺️ Mapa', () => this.toggleMap());
    }
  }

  // Convierte un punto del plano en posición de la vista de 640 x 360 (para bocadillos)
  toScreen(x, y) {
    const p = toIso(x, y);
    const view = this.cameras.main.worldView;
    const scale = this.cameras.main.zoom / ZOOM;
    return { x: (p.x - view.x) * scale, y: (p.y - view.y) * scale };
  }

  setAction(label, callback) {
    this.currentAction = label ? callback : null;
    this.ui.showAction(label, callback);
  }

  // ---------- Interacciones ----------

  nearestClue() {
    return this.clues.find(
      (c) => Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) <= PICKUP_REACH,
    );
  }

  pickUp(clue) {
    this.player.stop();
    state.inventory.push(clue.id);
    for (const part of clue.parts) part.destroy();
    Phaser.Utils.Array.Remove(this.clues, clue);
    const pos = this.toScreen(this.player.x, this.player.y);
    this.ui.showBubble(pos.x, pos.y + BUBBLE_OFFSET, `🏮 ${clue.nombre}`, clue.texto);
  }

  // Al pararte en la puerta de la librería, pregunta qué quieres hacer
  updateDoorQuestion() {
    const atDoor =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, LIBRARY_DOOR.x, LIBRARY_DOOR.y) <= LIBRARY_DOOR.radio;
    if (!atDoor) {
      this.askedAtDoor = false;
      return;
    }
    // Solo pregunta cuando te paras en la puerta (no al pasar por delante)
    if (this.askedAtDoor || this.ui.isBubbleOpen() || this.player.isMoving()) return;
    this.askedAtDoor = true;
    this.player.stop();
    this.setAction(null);
    const pos = this.toScreen(this.player.x, this.player.y);
    this.ui.showChoice(pos.x, pos.y - QUESTION_OFFSET, '¿Volver a la librería?', [
      { label: '🏠 Entrar', principal: true, onClick: () => this.goToLibrary('tarde') },
      { label: '🌙 Abrir de noche', principal: true, onClick: () => this.goToLibrary('noche') },
      { label: 'No', onClick: () => {} },
    ]);
  }

  goToLibrary(phase) {
    this.transitioning = true;
    this.player.stop();
    this.setAction(null);
    this.ui.showHint(null);
    this.ui.showMapButton(null);
    this.cameras.main.fadeOut(FADE_TIME, 20, 14, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (phase === 'tarde') this.scene.start('LibraryScene', { fromTown: true, phase: 'tarde' });
      else this.scene.start('LibraryScene', { phase: 'noche' });
    });
  }

  update() {
    if (this.isBusy()) {
      this.player.stop();
      return;
    }
    this.player.update(this.keys, this.joystick);
    this.sortBuildings();
    // Si echas a andar, el mensaje del objeto encontrado se cierra solo
    if (this.ui.isBubbleOpen() && this.player.isMoving()) this.ui.hideBubble();

    const clue = this.ui.isBubbleOpen() ? null : this.nearestClue();
    this.setAction(clue ? '✋ Recoger' : null, () => clue && this.pickUp(clue));

    if (this.ui.isBubbleOpen()) this.ui.showHint(null);
    else if (CLUES.some((c) => !state.inventory.includes(c.id))) {
      this.ui.showHint('Explora el barrio… quizá haya algo junto a la niebla');
    } else {
      this.ui.showHint('Vuelve a la puerta de la librería cuando quieras');
    }

    this.updateDoorQuestion();
  }
}
