import Phaser from 'phaser';
import {
  BRIDGES,
  BUILDINGS,
  CLUES,
  COLORS,
  CROSSINGS,
  FIELDS,
  FOREST,
  GREAT_TREE,
  LANTERNS,
  LIBRARY_DOOR,
  LOTS,
  PATHS,
  PATH_WIDTH,
  PROPS,
  RAILWAY,
  RIVER,
  STAIRS,
  TOWN_SIZE,
  TOWN_START,
  TREES,
  ZONES,
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
const LIGHT_DEPTH = 8600; // el brillo de los farolillos, por encima de la luz de la tarde
const FOREST_COLOR = 0x4f6b38; // fuera del barrio solo hay bosque
const LANTERN_LIGHT = 0xffc46b;

// El barrio por la tarde, en perspectiva isométrica (en diagonal).
// El juego piensa en un plano normal (caminar, chocar, buscar caminos) y solo lo dibuja
// girado; ver src/systems/iso.js. Por ahora todo son bloques de colores provisionales.
//
// El pueblo está dividido en zonas (src/data/townLayout.js). Las zonas cerradas están
// cubiertas de niebla; al recuperar su recuerdo, la niebla se retira con una animación
// la próxima vez que sales al barrio, y se enciende un farolillo de las escaleras.
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

    // Una zona está abierta desde el principio o cuando se ha recuperado su recuerdo.
    // Si se acaba de abrir, todavía tiene niebla: se retira con la animación al entrar.
    this.zones = ZONES.map((zone) => ({
      ...zone,
      open: Boolean(zone.abierta) || state.spirits[zone.abre] === 'resuelto',
      hidden: [], // cosas que no se ven hasta que se retira la niebla (los carteles)
    }));
    for (const zone of this.zones) zone.foggy = !zone.open || (!zone.abierta && !state.revealedZones.includes(zone.id));

    this.createRiverPath();
    this.drawGround();
    this.createGroundObstacles();
    this.createBuildings();
    this.createLots();
    this.createProps();
    this.createShrine();
    this.createTrees();
    this.createFog();
    this.createClues();

    this.player = new Player(this, TOWN_START.x, TOWN_START.y, { project: toIso, screenToPlane });
    this.physics.add.collider(this.player.body, this.obstacles);
    this.buildPathfinder();

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

    // ¿Hay niebla que retirar o farolillos que encender desde la última visita?
    const toReveal = this.zones.filter((z) => z.open && z.foggy);
    if (toReveal.length || state.lanternsLit < state.memories) this.playReveal(toReveal);
  }

  buildPathfinder() {
    this.pathfinder = new Pathfinder({
      width: TOWN_SIZE.width,
      height: TOWN_SIZE.height,
      cellSize: 8,
      obstacles: this.obstacleRects,
      margin: { x: 5, top: 3, bottom: 3 },
    });
  }

  // ---------- Dibujo del barrio (provisional) ----------

  // Rombo de un rectángulo del plano, como lista de puntos de pantalla
  diamond(x, y, w, h, raise = 0) {
    const c = isoCorners(x, y, w, h);
    return [c.top, c.right, c.bottom, c.left].map((p) => ({ x: p.x, y: p.y - raise }));
  }

  addObstacle(x, y, w, h) {
    const rect = { x, y, w, h };
    rect.zone = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.obstacleRects.push(rect);
    this.obstacles.add(rect.zone);
    this.debugGraphics.fillStyle(0xff3366, 0.35).fillPoints(this.diamond(x, y, w, h), true);
    return rect;
  }

  removeObstacle(rect) {
    Phaser.Utils.Array.Remove(this.obstacleRects, rect);
    this.obstacles.remove(rect.zone, true, true);
  }

  zoneAt(x, y) {
    return this.zones.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  }

  // El río es una curva suave; para saber por dónde pasa en cada punto se guarda
  // una lista de puntos de su centro, ordenados de oeste a este
  createRiverPath() {
    const curve = new Phaser.Curves.Spline(RIVER.puntos.map((p) => [p.x, p.y]).flat());
    this.riverPoints = curve.getSpacedPoints(Math.ceil(curve.getLength() / 4));
  }

  riverYAt(x) {
    const points = this.riverPoints;
    const i = points.findIndex((p) => p.x >= x);
    if (i <= 0) return points[i === 0 ? 0 : points.length - 1].y;
    const a = points[i - 1];
    const b = points[i];
    return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }

  // El suelo (hierba, caminos, río, vía, campos) se dibuja una sola vez y se guarda
  // como imagen, para que el juego no tenga que redibujarlo en cada fotograma
  drawGround() {
    const { width, height } = TOWN_SIZE;
    const g = this.make.graphics({ add: false });
    const fillRect = (color, x, y, w, h, alpha = 1) => g.fillStyle(color, alpha).fillPoints(this.diamond(x, y, w, h), true);
    const line = (color, thickness, x1, y1, x2, y2, alpha = 1) => {
      const a = toIso(x1, y1);
      const b = toIso(x2, y2);
      g.lineStyle(thickness, color, alpha).lineBetween(a.x, a.y, b.x, b.y);
    };
    // Un círculo del plano se ve como una elipse aplastada
    const blob = (x, y, radius) => {
      const p = toIso(x, y);
      g.fillEllipse(p.x, p.y, radius * 2 * Math.SQRT2, radius * Math.SQRT2);
    };

    fillRect(COLORS.hierba, 0, 0, width, height);
    // La colina del santuario, algo más verde
    const shrine = ZONES.find((z) => z.id === 5);
    fillRect(COLORS.colina, shrine.x, 0, shrine.w, shrine.y + shrine.h);

    // Manchas de hierba más oscura para que el suelo no sea plano
    const rng = new Phaser.Math.RandomDataGenerator(['barrio']);
    g.fillStyle(COLORS.hierbaOscura, 0.5);
    for (let i = 0; i < 420; i++) blob(rng.between(0, width), rng.between(0, height), rng.between(6, 18));

    // Arrozales (con surcos de agua) y huertos (con hileras de plantas)
    for (const f of FIELDS) {
      const rice = f.tipo === 'arrozal';
      fillRect(COLORS.bordeCamino, f.x - 3, f.y - 3, f.w + 6, f.h + 6);
      fillRect(rice ? COLORS.arrozal : COLORS.huerto, f.x, f.y, f.w, f.h);
      for (let y = f.y + 8; y < f.y + f.h - 4; y += rice ? 10 : 12) {
        line(rice ? 0x7fae78 : 0x6f9a4a, rice ? 1 : 3, f.x + 4, y, f.x + f.w - 4, y, 0.9);
      }
    }

    // El río: una orilla de hierba oscura y el agua encima, con algún reflejo
    const half = RIVER.ancho / 2;
    g.fillStyle(COLORS.orilla);
    for (const p of this.riverPoints) blob(p.x, p.y, half + 6);
    g.fillStyle(COLORS.agua);
    for (const p of this.riverPoints) blob(p.x, p.y, half);
    g.fillStyle(0xffffff, 0.25);
    this.riverPoints.forEach((p, i) => i % 9 === 0 && blob(p.x + 6, p.y + ((i * 7) % 20) - 10, 3));

    // Caminos: un borde algo más oscuro y el camino encima
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

    // La vía del tren: lecho de piedras, traviesas y dos raíles
    const top = RAILWAY.y - RAILWAY.alto / 2;
    fillRect(COLORS.piedra, 0, top, width, RAILWAY.alto);
    for (let x = 2; x < width; x += 10) fillRect(COLORS.traviesa, x, top + 3, 4, RAILWAY.alto - 6);
    line(COLORS.via, 2, 0, top + 9, width, top + 9);
    line(COLORS.via, 2, 0, top + RAILWAY.alto - 9, width, top + RAILWAY.alto - 9);
    // Pasos a nivel: tablones sobre la vía con franjas blancas en los bordes
    for (const c of CROSSINGS) {
      fillRect(COLORS.camino, c.x, top, c.w, RAILWAY.alto);
      for (let y = top + 2; y < top + RAILWAY.alto; y += 6) line(COLORS.bordeCamino, 1, c.x, y, c.x + c.w, y);
      for (let y = top; y < top + RAILWAY.alto; y += 8) {
        fillRect(0xf4f1ec, c.x - 2, y, 4, 4);
        fillRect(0xf4f1ec, c.x + c.w - 2, y, 4, 4);
      }
    }

    // Puentes: tablones de madera o losas de piedra, con barandilla a los lados
    for (const b of BRIDGES) {
      const wood = b.material === 'madera';
      fillRect(wood ? COLORS.madera : COLORS.piedra, b.x, b.y, b.w, b.h);
      for (let y = b.y + 4; y < b.y + b.h; y += wood ? 6 : 12) line(wood ? 0x7a5234 : 0x9a948a, 1, b.x, y, b.x + b.w, y);
      line(wood ? 0x6b4a2f : 0x8a847a, 3, b.x + 2, b.y, b.x + 2, b.y + b.h);
      line(wood ? 0x6b4a2f : 0x8a847a, 3, b.x + b.w - 2, b.y, b.x + b.w - 2, b.y + b.h);
    }

    // Escaleras del santuario: escalones de piedra subiendo hacia el norte
    fillRect(0x9a948a, STAIRS.x - 3, STAIRS.y, STAIRS.w + 6, STAIRS.h);
    fillRect(COLORS.piedra, STAIRS.x, STAIRS.y, STAIRS.w, STAIRS.h);
    for (let y = STAIRS.y + 6; y < STAIRS.y + STAIRS.h; y += 7) line(0x8a847a, 1, STAIRS.x, y, STAIRS.x + STAIRS.w, y);

    // Tierra de los solares vacíos
    for (const lot of LOTS) fillRect(COLORS.solar, lot.x, lot.y, lot.w, lot.h, 0.6);

    this.ground = this.add.renderTexture(0, 0, ISO_SIZE.width, ISO_SIZE.height).setOrigin(0).setDepth(-10);
    this.ground.draw(g);
    g.destroy();
  }

  // Lo que no se puede pisar del suelo: el agua (salvo los puentes), la vía (salvo los
  // pasos a nivel), los campos y el bosque
  createGroundObstacles() {
    const slice = 8;
    const half = RIVER.ancho / 2 - 4; // se puede llegar hasta la orilla
    for (let x = 0; x < TOWN_SIZE.width; x += slice) {
      const onBridge = BRIDGES.some((b) => x + slice > b.x && x < b.x + b.w);
      if (!onBridge) this.addObstacle(x, this.riverYAt(x + slice / 2) - half, slice, half * 2);
    }

    const top = RAILWAY.y - RAILWAY.alto / 2;
    let from = 0;
    for (const c of [...CROSSINGS].sort((a, b) => a.x - b.x)) {
      this.addObstacle(from, top, c.x - from, RAILWAY.alto);
      from = c.x + c.w;
    }
    this.addObstacle(from, top, TOWN_SIZE.width - from, RAILWAY.alto);

    for (const f of FIELDS) this.addObstacle(f.x, f.y, f.w, f.h);
    for (const f of FOREST) this.addObstacle(f.x, f.y, f.w, f.h);
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

      this.addLabel(b.x + b.w / 2, b.y + b.h / 2, ridgeRaise + 8, b.nombre);
      this.addObstacle(b.x, b.y, b.w, b.h);
      this.buildings.push({ ...b, graphics: g });
    }
  }

  // Solares vallados, con una abertura en la valla del norte
  createLots() {
    const t = 4;
    for (const lot of LOTS) {
      const g = this.add.graphics().setDepth(toIso(lot.x + lot.w / 2, lot.y + lot.h / 2).y);
      const gap = { from: lot.x + lot.w / 2 - lot.abertura / 2, to: lot.x + lot.w / 2 + lot.abertura / 2 };
      const fence = (x1, y1, x2, y2) => {
        const a = toIso(x1, y1);
        const b = toIso(x2, y2);
        g.lineStyle(3, COLORS.valla).lineBetween(a.x, a.y - 4, b.x, b.y - 4);
      };
      fence(lot.x, lot.y, gap.from, lot.y);
      fence(gap.to, lot.y, lot.x + lot.w, lot.y);
      fence(lot.x + lot.w, lot.y, lot.x + lot.w, lot.y + lot.h);
      fence(lot.x, lot.y, lot.x, lot.y + lot.h);
      fence(lot.x, lot.y + lot.h, lot.x + lot.w, lot.y + lot.h);
      this.addLabel(lot.x + lot.w / 2, lot.y + lot.h / 2, 0, 'Solar vacío');
      this.addObstacle(lot.x, lot.y - t / 2, gap.from - lot.x, t);
      this.addObstacle(gap.to, lot.y - t / 2, lot.x + lot.w - gap.to, t);
      this.addObstacle(lot.x - t / 2, lot.y, t, lot.h);
      this.addObstacle(lot.x + lot.w - t / 2, lot.y, t, lot.h);
      this.addObstacle(lot.x, lot.y + lot.h - t / 2, lot.w, t);
    }
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

    // Señales de los pasos a nivel: un poste con la cruz blanca y roja
    const top = RAILWAY.y - RAILWAY.alto / 2;
    for (const c of CROSSINGS) {
      for (const spot of [
        { x: c.x - 8, y: top - 10 },
        { x: c.x + c.w + 4, y: top + RAILWAY.alto + 6 },
      ]) {
        const base = toIso(spot.x + 2, spot.y + 2);
        const g = this.add.graphics().setDepth(base.y);
        g.fillStyle(0x3d3d3d).fillRect(base.x - 1, base.y - 30, 2, 30);
        g.lineStyle(3, 0xf4f1ec).lineBetween(base.x - 7, base.y - 33, base.x + 7, base.y - 23);
        g.lineBetween(base.x - 7, base.y - 23, base.x + 7, base.y - 33);
        g.fillStyle(0xc0463a).fillCircle(base.x - 4, base.y - 17, 2).fillCircle(base.x + 4, base.y - 17, 2);
        this.addObstacle(spot.x, spot.y, 4, 4);
      }
    }
  }

  // El santuario: torii al pie de las escaleras, farolillos a los lados y el gran árbol dormido
  createShrine() {
    // Torii: dos postes rojos y dos travesaños. Se pasa por debajo.
    const postY = STAIRS.y + STAIRS.h + 8;
    const left = toIso(STAIRS.x - 4, postY);
    const right = toIso(STAIRS.x + STAIRS.w + 4, postY);
    const torii = this.add.graphics().setDepth(Math.max(left.y, right.y));
    const height = 40;
    torii.fillStyle(0xc0463a).fillRect(left.x - 2, left.y - height, 4, height).fillRect(right.x - 2, right.y - height, 4, height);
    torii.lineStyle(3, 0xc0463a).lineBetween(left.x - 3, left.y - height + 9, right.x + 3, right.y - height + 9);
    torii.lineStyle(4, 0x3f3a3a).lineBetween(left.x - 8, left.y - height - 2, right.x + 8, right.y - height - 2);
    this.addObstacle(STAIRS.x - 6, postY - 2, 4, 4);
    this.addObstacle(STAIRS.x + STAIRS.w + 2, postY - 2, 4, 4);

    // Farolillos de las escaleras: se encienden uno por cada recuerdo recuperado
    this.lanterns = LANTERNS.map((spot, i) => {
      const base = toIso(spot.x, spot.y);
      const g = this.add.graphics().setDepth(base.y);
      g.fillStyle(0x8a847a).fillRect(base.x - 2, base.y - 16, 4, 16);
      g.fillStyle(0x6b4a2f).fillRect(base.x - 5, base.y - 26, 10, 2);
      const paper = this.add.rectangle(base.x, base.y - 20, 8, 8, 0xd8ccb0).setDepth(base.y);
      const glow = this.add
        .image(base.x, base.y - 20, this.glowTexture())
        .setDisplaySize(56, 56)
        .setTint(LANTERN_LIGHT)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(LIGHT_DEPTH)
        .setAlpha(0);
      this.addObstacle(spot.x - 3, spot.y - 3, 6, 6);
      const lantern = { paper, glow };
      if (i < Math.min(state.lanternsLit, state.memories)) this.lightLantern(lantern, false);
      return lantern;
    });

    // El gran árbol: enorme, con las hojas pálidas porque su espíritu duerme
    if (!this.textures.exists('greatTree')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x5a3f2c).fillRect(52, 92, 16, 48);
      g.fillStyle(0x5a3f2c).fillTriangle(40, 140, 60, 110, 80, 140);
      g.fillStyle(0x9aa58a).fillCircle(60, 60, 44).fillCircle(30, 78, 28).fillCircle(90, 78, 28);
      g.fillStyle(0xb4bca2).fillCircle(48, 46, 22).fillCircle(78, 56, 16);
      g.generateTexture('greatTree', 120, 140);
      g.destroy();
    }
    const p = toIso(GREAT_TREE.x, GREAT_TREE.y);
    this.add.image(p.x, p.y, 'greatTree').setOrigin(0.5, 1).setDepth(p.y);
    this.addObstacle(GREAT_TREE.x - 10, GREAT_TREE.y - 8, 20, 12);
    this.addLabel(GREAT_TREE.x, GREAT_TREE.y, 150, 'El gran árbol');
  }

  lightLantern(lantern, animate) {
    lantern.paper.setFillStyle(0xffe2a0);
    const pulse = () =>
      this.tweens.add({ targets: lantern.glow, alpha: 0.55, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (!animate) {
      lantern.glow.setAlpha(0.8);
      pulse();
      return;
    }
    lantern.glow.setScale(0.1);
    this.tweens.add({
      targets: lantern.glow,
      alpha: 0.8,
      scale: 56 / 64,
      duration: 1200,
      ease: 'Back.easeOut',
      onComplete: pulse,
    });
  }

  // Textura de brillo suave (la misma que usa la librería)
  glowTexture() {
    if (!this.textures.exists('glow')) {
      const glow = this.textures.createCanvas('glow', 64, 64);
      const ctx = glow.getContext();
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      glow.refresh();
    }
    return 'glow';
  }

  // Árboles: una imagen dibujada una sola vez y reutilizada.
  // La copa queda por encima y solo el tronco choca (se puede pasar por detrás).
  treeTexture() {
    if (!this.textures.exists('townTree')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x6b4a2f).fillRect(21, 46, 6, 14);
      g.fillStyle(0x5c7f3e).fillCircle(24, 34, 18);
      g.fillStyle(0x6f9a4a).fillCircle(19, 29, 11);
      g.generateTexture('townTree', 48, 60);
      g.destroy();
    }
    return 'townTree';
  }

  addTree(x, y) {
    const p = toIso(x, y);
    this.add.image(p.x, p.y, this.treeTexture()).setOrigin(0.5, 1).setDepth(p.y);
    this.addObstacle(x - 4, y - 4, 8, 6);
  }

  createTrees() {
    for (const t of TREES) this.addTree(t.x, t.y);

    // El bosque: árboles apretados dentro de cada zona de bosque (que ya bloquea el paso).
    // Son cientos, así que se pintan una sola vez: los de detrás del personaje sobre el suelo
    // y los de delante (sur y este) en otra imagen que queda por encima de él.
    const rng = new Phaser.Math.RandomDataGenerator(['bosque']);
    const step = 34;
    const back = [];
    const front = [];
    for (const f of FOREST) {
      for (let y = f.y + 12; y < f.y + f.h; y += step) {
        for (let x = f.x + 12; x < f.x + f.w; x += step) {
          const tx = x + rng.between(-10, 10);
          const ty = y + rng.between(-10, 10);
          if (Math.abs(ty - this.riverYAt(tx)) < RIVER.ancho / 2 + 10) continue; // no hay árboles en el agua
          const p = toIso(tx, ty);
          const tree = this.make.image({ key: this.treeTexture(), add: false }).setOrigin(0.5, 1).setPosition(p.x, p.y);
          tree.setScale(rng.realInRange(1, 1.4));
          (f.delante ? front : back).push(tree);
        }
      }
    }
    const byDepth = (a, b) => a.y - b.y;
    this.ground.draw(back.sort(byDepth));
    // La capa de delante solo ocupa el rectángulo de sus árboles (no toda la pantalla)
    const bounds = front.map((t) => t.getBounds()).reduce((a, b) => Phaser.Geom.Rectangle.Union(a, b));
    const frontLayer = this.add.renderTexture(bounds.x, bounds.y, bounds.width, bounds.height).setOrigin(0).setDepth(FOG_DEPTH - 1);
    for (const tree of front) tree.setPosition(tree.x - bounds.x, tree.y - bounds.y);
    frontLayer.draw(front.sort(byDepth));
    for (const tree of [...back, ...front]) tree.destroy();
  }

  // Niebla: una capa de nubes blancas por cada zona cerrada, que bloquea el paso.
  // Las nubes se pintan una sola vez en una imagen por zona (que se mece despacio),
  // y unas pocas nubes sueltas se mueven por encima para darle vida.
  createFog() {
    const cloud = this.makeCloudTexture();
    const inset = 40;
    const margin = 140;
    for (const zone of this.zones) {
      zone.fogParts = [];
      if (!zone.foggy) continue;

      const c = isoCorners(zone.x, zone.y, zone.w, zone.h);
      const left = c.left.x - margin;
      const top = c.top.y - margin;
      const width = c.right.x - c.left.x + margin * 2;
      const height = c.bottom.y - c.top.y + margin * 2;
      const local = (p) => ({ x: p.x - left, y: p.y - top });

      // Base algo más pequeña que la zona: los bordes los forman las nubes, no una línea recta
      const base = this.make.graphics({ add: false });
      base
        .fillStyle(0xf4f1ec, 0.8)
        .fillPoints(this.diamond(zone.x + inset, zone.y + inset, zone.w - inset * 2, zone.h - inset * 2).map(local), true);

      const rng = new Phaser.Math.RandomDataGenerator([String(zone.id)]);
      const edgePoint = () => {
        // Un punto del borde, desplazado un poco hacia dentro para tapar el borde de la base
        const onX = rng.frac() < zone.w / (zone.w + zone.h);
        const depth = rng.between(0, inset + 30);
        const x = onX ? zone.x + rng.between(0, zone.w) : rng.frac() < 0.5 ? zone.x + depth : zone.x + zone.w - depth;
        const y = onX ? (rng.frac() < 0.5 ? zone.y + depth : zone.y + zone.h - depth) : zone.y + rng.between(0, zone.h);
        return toIso(x, y);
      };
      const puff = (p, alpha) =>
        this.make
          .image({ key: cloud, add: false })
          .setPosition(p.x, p.y)
          .setDisplaySize(rng.between(170, 260), rng.between(90, 140))
          .setAlpha(alpha);

      const puffs = [];
      for (let i = 0; i < Math.ceil((zone.w + zone.h) / 10); i++) puffs.push(puff(local(edgePoint()), 0.9));
      for (let i = 0; i < Math.ceil((zone.w * zone.h) / 9000); i++) {
        const p = toIso(zone.x + rng.between(inset, zone.w - inset), zone.y + rng.between(inset, zone.h - inset));
        puffs.push(puff(local(p), 0.5));
      }
      const layer = this.add
        .renderTexture(left + width / 2, top + height / 2, width, height)
        .setDepth(FOG_DEPTH)
        .setAlpha(0.95);
      layer.draw([base, ...puffs]);
      base.destroy();
      for (const p of puffs) p.destroy();
      this.tweens.add({ targets: layer, x: layer.x + 10, y: layer.y + 5, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      zone.fogParts.push(layer);

      // Nubes sueltas que se mueven por el borde
      for (let i = 0; i < 6; i++) {
        const p = edgePoint();
        const drifting = puff(p, 0.7).setDepth(FOG_DEPTH);
        this.add.existing(drifting);
        this.tweens.add({
          targets: drifting,
          x: p.x + rng.between(-30, 30),
          y: p.y + rng.between(-15, 15),
          duration: rng.between(4000, 7000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        zone.fogParts.push(drifting);
      }
      // Se bloquea un poco antes del borde visible
      zone.fogObstacle = this.addObstacle(zone.x - 10, zone.y - 10, zone.w + 20, zone.h + 20);
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

  // Cartel con el nombre de un sitio, sobre el punto (x, y) del plano y "raise" píxeles más arriba.
  // Los carteles de las zonas con niebla no se ven hasta que la niebla se retira.
  addLabel(x, y, raise, text) {
    const p = toIso(x, y);
    const label = this.add
      .text(p.x, p.y - raise, text, { fontFamily: 'Nunito, sans-serif', fontSize: '10px', color: '#3d2e22', resolution: 3 })
      .setOrigin(0.5, 1)
      .setDepth(8000)
      .setAlpha(0.8);
    const zone = this.zoneAt(x, y);
    if (zone?.foggy) {
      label.setAlpha(0);
      zone.hidden.push(label);
    }
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

  // ---------- La niebla se retira ----------

  // La cámara viaja a cada zona recién abierta, la niebla se disipa, se encienden los
  // farolillos nuevos y la cámara vuelve contigo
  playReveal(zones) {
    this.transitioning = true;
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.removeBounds(); // para poder centrar la cámara en cualquier zona
    const steps = [];

    for (const zone of zones) {
      const center = toIso(zone.x + zone.w / 2, zone.y + zone.h / 2);
      steps.push((next) => this.moveCamera(center, ZOOM * 0.6, 1800, next));
      steps.push((next) => {
        this.ui.showTitle('🌫️ La niebla se retira…');
        this.clearFog(zone, next);
      });
      steps.push((next) => {
        this.ui.showTitle(`✨ ${zone.nombre}`);
        this.time.delayedCall(1600, next);
      });
    }

    for (let i = state.lanternsLit; i < Math.min(state.memories, this.lanterns.length); i++) {
      const spot = LANTERNS[i];
      const p = toIso(spot.x, spot.y);
      steps.push((next) => this.moveCamera({ x: p.x, y: p.y - 20 }, ZOOM, 1400, next));
      steps.push((next) => {
        this.lightLantern(this.lanterns[i], true);
        this.ui.showTitle('🏮 Se ha encendido un farolillo');
        this.time.delayedCall(2000, next);
      });
    }
    state.lanternsLit = Math.max(state.lanternsLit, state.memories);

    steps.push((next) => this.moveCamera(this.player.sprite, ZOOM, 1400, next));
    steps.push(() => {
      camera.setBounds(0, 0, ISO_SIZE.width, ISO_SIZE.height);
      camera.startFollow(this.player.sprite, true, 0.12, 0.12);
      this.transitioning = false;
    });

    const run = (i) => steps[i]?.(() => run(i + 1));
    this.time.delayedCall(FADE_TIME + 500, () => run(0));
  }

  moveCamera(target, zoom, duration, onDone) {
    const camera = this.cameras.main;
    camera.zoomTo(zoom, duration, 'Sine.easeInOut');
    camera.pan(target.x, target.y, duration, 'Sine.easeInOut', true, (_cam, progress) => {
      if (progress === 1) onDone();
    });
  }

  clearFog(zone, onDone) {
    const center = toIso(zone.x + zone.w / 2, zone.y + zone.h / 2);
    const duration = 2600;
    for (const part of zone.fogParts) {
      this.tweens.killTweensOf(part);
      this.tweens.add({
        targets: part,
        alpha: 0,
        scaleX: part.scaleX * 1.15,
        scaleY: part.scaleY * 1.15,
        duration,
        ease: 'Sine.easeIn',
        onComplete: () => part.destroy(),
      });
    }
    // Jirones de niebla que se separan y se alejan del centro mientras se desvanecen
    const rng = new Phaser.Math.RandomDataGenerator([`jirones-${zone.id}`]);
    for (let i = 0; i < 28; i++) {
      const p = toIso(zone.x + rng.between(0, zone.w), zone.y + rng.between(0, zone.h));
      const angle = Math.atan2(p.y - center.y, p.x - center.x);
      const wisp = this.add
        .image(p.x, p.y, this.makeCloudTexture())
        .setDisplaySize(rng.between(150, 240), rng.between(80, 120))
        .setDepth(FOG_DEPTH + 1)
        .setAlpha(0);
      this.tweens.chain({
        targets: wisp,
        tweens: [
          { alpha: 0.85, duration: 500, delay: rng.between(0, 600) },
          {
            alpha: 0,
            x: p.x + Math.cos(angle) * 160,
            y: p.y + Math.sin(angle) * 80,
            duration: rng.between(1800, 2600),
            ease: 'Sine.easeOut',
          },
        ],
        onComplete: () => wisp.destroy(),
      });
    }
    this.tweens.add({ targets: zone.hidden, alpha: 0.8, delay: duration * 0.6, duration: 800 });
    this.time.delayedCall(duration + 600, () => {
      zone.fogParts = [];
      zone.foggy = false;
      if (zone.fogObstacle) this.removeObstacle(zone.fogObstacle);
      zone.fogObstacle = null;
      this.buildPathfinder();
      if (!state.revealedZones.includes(zone.id)) state.revealedZones.push(zone.id);
      onDone();
    });
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
      this.ui.showHint('Así se ve el pueblo de lejos. La niebla oculta lo que aún no recuerdas.');
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
    this.ui.showBubble(pos.x, pos.y + BUBBLE_OFFSET, `${clue.icono} ${clue.nombre}`, clue.texto);
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

  currentHint() {
    if (state.spirits.okiku === 'escuchado' && !state.inventory.includes('farolillo')) {
      return 'El espíritu buscaba algo pequeño de papel que daba luz… ¿junto a la niebla?';
    }
    if (CLUES.some((c) => !state.inventory.includes(c.id))) return 'Explora el pueblo… quizá haya algo junto a la niebla';
    if (state.spirits.okiku === 'resuelto') return 'La niebla se ha retirado del río. Cruza el puente y explora la orilla.';
    return 'Vuelve a la puerta de la librería cuando quieras';
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
    this.ui.showHint(this.ui.isBubbleOpen() ? null : this.currentHint());

    this.updateDoorQuestion();
  }
}
