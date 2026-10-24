import Phaser from 'phaser';
import {
  BRIDGES,
  BUILDINGS,
  CEMETERY,
  CLUES,
  COLORS,
  FOREST,
  GARDENS,
  GREAT_TREE,
  LANTERNS,
  LIBRARY_DOOR,
  MOUNTAIN,
  PATHS,
  PATH_WIDTH,
  PLOTS,
  POND,
  PROPS,
  RAILWAY,
  RIVER,
  SCHOOL_YARD,
  STAIRS,
  TOWN_SIZE,
  TOWN_START,
  TREES,
  ZONES,
} from '../data/townLayout.js';
import { PHASES } from '../data/phases.js';
import { ART_RESOLUTION, ZOOM } from '../config.js';
import { state } from '../systems/GameState.js';
import Pathfinder from '../systems/Pathfinder.js';
import Player from '../objects/Player.js';
import VirtualJoystick from '../ui/VirtualJoystick.js';
import CafeUI from '../ui/CafeUI.js';

const FADE_TIME = 600;
const PICKUP_REACH = 22; // distancia para recoger un objeto
const QUESTION_OFFSET = 26;
const BUBBLE_OFFSET = 6;
const FOG_DEPTH = 5000; // la niebla se dibuja por encima de todo el pueblo
const LIGHT_DEPTH = 8600; // el brillo de los farolillos, por encima de la luz de la tarde
const FOREST_COLOR = 0x4f6b38; // fuera del pueblo solo hay bosque
const LANTERN_LIGHT = 0xffc46b;
const FOG_CELL = 20; // la niebla bloquea el paso en casillas de este tamaño

// Curva suave que pasa por una lista de puntos [x, y], como lista de puntos { x, y }
const curve = (points, step = 4) => {
  const spline = new Phaser.Curves.Spline(points.flat());
  return spline.getSpacedPoints(Math.ceil(spline.getLength() / step));
};

// Altura (y) de una curva en una x dada, sabiendo que la curva va de oeste a este
const yAt = (points, x) => {
  const i = points.findIndex((p) => p.x >= x);
  if (i <= 0) return points[i === 0 ? 0 : points.length - 1].y;
  const a = points[i - 1];
  const b = points[i];
  return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
};

// Distancia de un punto a un segmento
const distanceToSegment = (p, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Phaser.Math.Clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

// El pueblo por la tarde, en vista cenital 3/4 (como la librería y Stardew Valley):
// el suelo se ve desde arriba y los edificios muestran su fachada sur y el tejado.
// Por ahora casi todo son bloques de colores provisionales.
//
// El pueblo está dividido en zonas (src/data/townLayout.js). Las zonas cerradas están
// cubiertas de niebla; al recuperar su recuerdo, la niebla se retira con una animación
// la próxima vez que sales, y se enciende un farolillo del camino del festival.
export default class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
  }

  preload() {
    this.load.image('sueloHierba', 'assets/suelo-hierba.png');
    this.load.image('sueloBosque', 'assets/suelo-bosque.png');
    for (const b of BUILDINGS) {
      if (b.imagen) this.load.image(`edificio-${b.id}`, `assets/${b.imagen.archivo}`);
    }
  }

  create() {
    const { width, height } = TOWN_SIZE;
    this.physics.world.setBounds(0, 0, width, height);
    this.obstacles = this.physics.add.staticGroup();
    this.obstacleRects = [];
    this.debugGraphics = this.add.graphics().setDepth(9000).setVisible(false);

    // Una zona está abierta desde el principio o cuando se ha recuperado su recuerdo.
    // Si se acaba de abrir, todavía tiene niebla: se retira con la animación al entrar.
    this.zones = ZONES.map((zone) => {
      const polygon = new Phaser.Geom.Polygon(zone.puntos.flat());
      return {
        ...zone,
        polygon,
        bounds: Phaser.Geom.Polygon.GetAABB(polygon),
        open: Boolean(zone.abierta) || state.spirits[zone.abre] === 'resuelto',
        hidden: [], // cosas que no se ven hasta que se retira la niebla (los carteles)
      };
    });
    for (const zone of this.zones) zone.foggy = !zone.open || (!zone.abierta && !state.revealedZones.includes(zone.id));

    this.mountainFoot = curve(MOUNTAIN.pie);
    this.riverPoints = curve(RIVER.puntos);
    this.railPoints = curve(RAILWAY.puntos);

    this.drawGround();
    this.createGroundObstacles();
    this.createBuildings();
    this.createCemetery();
    this.createProps();
    this.createShrine();
    this.createTrees();
    this.createFog();
    this.createClues();

    this.player = new Player(this, TOWN_START.x, TOWN_START.y);
    this.physics.add.collider(this.player.body, this.obstacles);
    this.buildPathfinder();

    // Cámara: sigue al personaje sin salirse del pueblo
    this.cameras.main.setBounds(0, 0, width, height);
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

  // ---------- Ayudas ----------

  // Las cuatro esquinas de un rectángulo, "raise" píxeles más arriba (para tejados, asientos…)
  corners(x, y, w, h, raise = 0) {
    return [
      { x, y: y - raise },
      { x: x + w, y: y - raise },
      { x: x + w, y: y + h - raise },
      { x, y: y + h - raise },
    ];
  }

  addObstacle(x, y, w, h) {
    const rect = { x, y, w, h };
    rect.zone = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.obstacleRects.push(rect);
    this.obstacles.add(rect.zone);
    this.debugGraphics.fillStyle(0xff3366, 0.35).fillRect(x, y, w, h);
    return rect;
  }

  removeObstacle(rect) {
    Phaser.Utils.Array.Remove(this.obstacleRects, rect);
    this.obstacles.remove(rect.zone, true, true);
  }

  zoneAt(x, y) {
    return this.zones.find((z) => Phaser.Geom.Polygon.Contains(z.polygon, x, y));
  }

  // Bloquea las casillas de una forma (la charca, la niebla de una zona…). Las casillas
  // seguidas de una misma fila se juntan en un solo obstáculo.
  blockShape(contains, bounds, cell) {
    const rects = [];
    for (let y = Math.floor(bounds.y / cell) * cell; y < bounds.bottom; y += cell) {
      let runStart = null;
      for (let x = Math.floor(bounds.x / cell) * cell; x <= bounds.right + cell; x += cell) {
        const inside = x <= bounds.right && contains(x + cell / 2, y + cell / 2);
        if (inside && runStart === null) runStart = x;
        if (!inside && runStart !== null) {
          rects.push(this.addObstacle(runStart, y, x - runStart, cell));
          runStart = null;
        }
      }
    }
    return rects;
  }

  isInClearing(x, y, margin = 0) {
    return [...MOUNTAIN.claros, STAIRS].some(
      (c) => x >= c.x - margin && x <= c.x + c.w + margin && y >= c.y - margin && y <= c.y + c.h + margin,
    );
  }

  // Puntos del paseo de una orilla (side = -1 norte, 1 sur), desde que el río sale de la montaña
  walkwayPoints(side) {
    const pts = this.riverPoints;
    return pts
      .map((p, i) => {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { x: p.x - ((b.y - a.y) / len) * RIVER.paseo * side, y: p.y + ((b.x - a.x) / len) * RIVER.paseo * side };
      })
      .filter((p) => p.y > yAt(this.mountainFoot, p.x) + 30);
  }

  // ---------- Dibujo del pueblo (provisional) ----------

  // El suelo se dibuja una sola vez y se guarda como imagen,
  // para que el juego no tenga que redibujarlo en cada fotograma
  drawGround() {
    const { width, height } = TOWN_SIZE;
    const g = this.make.graphics({ add: false });
    const fillRect = (color, r, alpha = 1) => g.fillStyle(color, alpha).fillRect(r.x, r.y, r.w, r.h);
    const line = (color, thickness, x1, y1, x2, y2, alpha = 1) => g.lineStyle(thickness, color, alpha).lineBetween(x1, y1, x2, y2);
    const band = (points, color, radius) => {
      g.fillStyle(color);
      for (const p of points) g.fillCircle(p.x, p.y, radius);
    };

    const rng = new Phaser.Math.RandomDataGenerator(['pueblo']);
    this.paintGroundTextures();

    // El pie de la montaña: una pared de tierra
    band(this.mountainFoot, COLORS.acantilado, 11);
    for (const p of this.mountainFoot.filter((_, i) => i % 6 === 0)) line(0x8f5a30, 2, p.x, p.y - 7, p.x, p.y + 7);

    // Cultivos, huertos y jardines
    for (const plot of PLOTS) {
      fillRect(COLORS.bordeCamino, { x: plot.x - 3, y: plot.y - 3, w: plot.w + 6, h: plot.h + 6 });
      fillRect(plot.tipo === 'cultivo' ? COLORS.cultivo : COLORS.tierra, plot);
      for (let y = plot.y + 8; y < plot.y + plot.h - 4; y += 10) line(plot.tipo === 'cultivo' ? 0x6f9a4a : 0x6b4f2a, 2, plot.x + 4, y, plot.x + plot.w - 4, y, 0.8);
    }
    for (const garden of GARDENS) {
      fillRect(COLORS.jardin, garden);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(rng.pick([0xf4c6d0, 0xf2d38a, 0xffffff])).fillCircle(garden.x + 5 + i * 5, garden.y + 8 + (i % 2) * 11, 2);
      }
    }
    fillRect(COLORS.patio, SCHOOL_YARD);

    // La charca, con su orilla
    const pondCurve = curve([...POND.puntos, POND.puntos[0]], 6);
    band(pondCurve, COLORS.muro, 8);
    g.fillStyle(COLORS.agua).fillPoints(pondCurve, true);
    this.pond = new Phaser.Geom.Polygon(pondCurve);

    // El río: muros de piedra, el agua y algún reflejo; y un paseo en cada orilla
    const walkways = [this.walkwayPoints(-1), this.walkwayPoints(1)];
    for (const side of walkways) band(side, COLORS.paseo, RIVER.anchoPaseo / 2);
    band(this.riverPoints, COLORS.muro, RIVER.muro / 2);
    band(this.riverPoints, COLORS.agua, RIVER.ancho / 2);
    g.fillStyle(0xffffff, 0.25);
    this.riverPoints.forEach((p, i) => i % 9 === 0 && g.fillCircle(p.x + 6, p.y + ((i * 7) % 20) - 10, 3));
    // Cascada: donde el río cae desde la montaña
    const fall = this.riverPoints.find((p) => p.y >= yAt(this.mountainFoot, p.x) - 6);
    g.fillStyle(0xe2f2f5).fillRect(fall.x - 22, fall.y - 26, 44, 34);

    // Caminos: un borde algo más oscuro y el camino encima
    for (const [color, extra] of [
      [COLORS.bordeCamino, 3],
      [COLORS.camino, 0],
    ]) {
      for (const path of PATHS) band(curve(path), color, PATH_WIDTH / 2 + extra);
    }

    // La vía del tren: lecho de piedras, traviesas y dos raíles
    const half = RAILWAY.ancho / 2;
    band(this.railPoints, COLORS.piedra, half);
    for (const p of this.railPoints.filter((_, i) => i % 3 === 0)) g.fillStyle(COLORS.traviesa).fillRect(p.x - 2, p.y - half + 3, 4, RAILWAY.ancho - 6);
    for (const offset of [-7, 7]) band(this.railPoints.map((p) => ({ x: p.x, y: p.y + offset })), COLORS.via, 1.2);

    // Puentes de un paseo al otro: tablones o losas, con barandilla a los lados
    for (const bridge of BRIDGES) {
      const [ax, ay] = bridge.desde;
      const [bx, by] = bridge.hasta;
      const color = { madera: COLORS.madera, piedra: COLORS.piedra, rojo: COLORS.rojo }[bridge.material];
      line(color, 26, ax, ay, bx, by);
      const len = Math.hypot(bx - ax, by - ay);
      const nx = (-(by - ay) / len) * 13;
      const ny = ((bx - ax) / len) * 13;
      const rail = bridge.material === 'piedra' ? 0x8a847a : 0x5a3f2c;
      line(rail, 3, ax + nx, ay + ny, bx + nx, by + ny);
      line(rail, 3, ax - nx, ay - ny, bx - nx, by - ny);
    }

    // Escaleras del santuario: escalones de piedra subiendo hacia el norte
    fillRect(0x9a948a, { x: STAIRS.x - 3, y: STAIRS.y, w: STAIRS.w + 6, h: STAIRS.h });
    fillRect(COLORS.piedra, STAIRS);
    for (let y = STAIRS.y + 6; y < STAIRS.y + STAIRS.h; y += 7) line(0x8a847a, 1, STAIRS.x, y, STAIRS.x + STAIRS.w, y);

    // Suelo del cementerio
    fillRect(COLORS.cementerio, CEMETERY);

    this.ground.draw(g);
    g.destroy();

    this.addLabel(PLOTS[0].x + PLOTS[0].w / 2, PLOTS[0].y + PLOTS[0].h / 2 + 5, 0, PLOTS[0].nombre);
  }

  // Las texturas del suelo (pixel art que se repite): hierba en el pueblo y suelo de bosque
  // en la montaña, en los bordes y al otro lado de la vía. Se pintan una sola vez.
  paintGroundTextures() {
    const { width, height } = TOWN_SIZE;
    for (const key of ['sueloHierba', 'sueloBosque']) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.ground = this.add.renderTexture(0, 0, width, height).setOrigin(0).setDepth(-10);
    this.ground.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); // píxeles nítidos al acercar la cámara
    const tiled = (key, x, y, w, h) => this.make.tileSprite({ x, y, width: w, height: h, key, add: false }).setOrigin(0).setTilePosition(x, y);

    // Primero todo de bosque; después se recorta la parte del pueblo y se pinta de hierba
    const forest = tiled('sueloBosque', 0, 0, width, height);
    const grass = this.make.renderTexture({ x: 0, y: 0, width, height }, false).setOrigin(0);
    grass.draw(tiled('sueloHierba', 0, 0, width, height));
    // Lo que no es pueblo se borra de la capa de hierba
    const outside = this.make.graphics({ add: false });
    outside.fillStyle(0xffffff).fillPoints([{ x: 0, y: 0 }, { x: width, y: 0 }, ...[...this.mountainFoot].reverse()], true);
    outside.fillPoints([...this.railPoints, { x: width, y: height }, { x: 0, y: height }], true);
    for (const f of FOREST) outside.fillRect(f.x, f.y, f.w, f.h);
    grass.erase(outside);
    // …y en los claros de la montaña vuelve a haber hierba
    for (const c of MOUNTAIN.claros) grass.draw(tiled('sueloHierba', c.x, c.y, c.w, c.h));

    this.ground.draw([forest, grass]);
    for (const obj of [forest, grass, outside]) obj.destroy();
  }

  // Lo que no se puede pisar del suelo: la montaña (salvo los claros y las escaleras),
  // el agua (salvo los puentes), la charca, la vía y el bosque de los bordes
  createGroundObstacles() {
    const slice = 8;
    for (let x = 0; x < TOWN_SIZE.width; x += slice) {
      // Montaña: desde arriba hasta su pie, menos los claros que cruzan esta columna
      const xc = x + slice / 2;
      let blocked = [[0, yAt(this.mountainFoot, xc) + 6]];
      for (const c of [...MOUNTAIN.claros, STAIRS].filter((r) => xc >= r.x && xc <= r.x + r.w)) {
        blocked = blocked.flatMap(([from, to]) =>
          [
            [from, Math.min(to, c.y)],
            [Math.max(from, c.y + c.h), to],
          ].filter(([a, b]) => b - a > 1),
        );
      }
      for (const [from, to] of blocked) this.addObstacle(x, from, slice, to - from);

      // La vía y todo lo que queda al sur (el bosque)
      const railTop = yAt(this.railPoints, xc) - RAILWAY.ancho / 2;
      this.addObstacle(x, railTop, slice, TOWN_SIZE.height - railTop);
    }

    // El agua del río, en pedacitos a lo largo de su curva; los puentes quedan libres
    const bridges = BRIDGES.map((b) => ({ a: { x: b.desde[0], y: b.desde[1] }, b: { x: b.hasta[0], y: b.hasta[1] } }));
    const piece = RIVER.ancho - 6;
    this.riverPoints.forEach((p, i) => {
      if (i % 2) return;
      if (bridges.some((br) => distanceToSegment(p, br.a, br.b) < piece / 2 + 12)) return;
      this.addObstacle(p.x - piece / 2, p.y - piece / 2, piece, piece);
    });

    this.blockShape((x, y) => Phaser.Geom.Polygon.Contains(this.pond, x, y), Phaser.Geom.Polygon.GetAABB(this.pond), 10);
    for (const f of FOREST) this.addObstacle(f.x, f.y, f.w, f.h);
  }

  // Vista en 3/4: de cada edificio se ve la fachada sur (con la puerta) y el tejado desde arriba.
  // La planta (x, y, ancho, alto) es lo que choca; el tejado se dibuja por encima de ella,
  // así que si pasas por detrás (al norte), el edificio te tapa.
  createBuildings() {
    const shade = (color, amount) => Phaser.Display.Color.ValueToColor(color).darken(amount).color;
    const light = (color, amount) => Phaser.Display.Color.ValueToColor(color).lighten(amount).color;
    const rng = new Phaser.Math.RandomDataGenerator(['casas']);
    const walls = [0xb89a7a, 0xc4a07a, 0xa88a6a, 0xcfb48e, 0xb08f6e];
    const roofs = [0x56463f, 0x5a4a4a, 0x4a4250, 0x6a5040, 0x4f4a3f];

    for (const b of BUILDINGS) {
      const front = b.y + b.h; // borde sur de la planta, donde está la puerta
      if (b.imagen) {
        // Edificio con dibujo: la imagen se apoya en el centro del borde sur de su planta
        this.add
          .image(b.x + b.w / 2, front, `edificio-${b.id}`)
          .setOrigin(b.imagen.origen.x, b.imagen.origen.y)
          .setScale(1 / ART_RESOLUTION) // la imagen está a 3 veces la resolución del juego
          .setDepth(front);
        this.addObstacle(b.x, b.y, b.w, b.h);
        continue;
      }

      const wallColor = b.pared ?? rng.pick(walls);
      const roofColor = b.techo ?? rng.pick(roofs);
      const wall = b.tipo === 'casa' ? 26 : 30; // altura de la fachada
      const g = this.add.graphics().setDepth(front);
      const wallTop = front - wall;

      // Fachada con zócalo oscuro
      g.fillStyle(wallColor).fillRect(b.x, wallTop, b.w, wall);
      g.fillStyle(shade(wallColor, 18)).fillRect(b.x, front - 4, b.w, 4);
      // Puerta y ventanas (encendidas si alguien vive dentro); las tiendas tienen cortina noren
      const window = b.tipo === 'casa' && !b.habitada ? 0x6b6258 : 0xf2d38a;
      g.fillStyle(0x5b3a29).fillRect(b.x + b.w / 2 - 8, front - 20, 16, 20);
      if (b.tipo === 'tienda') g.fillStyle(0x3f5a8a).fillRect(b.x + b.w / 2 - 12, front - 22, 24, 8);
      g.fillStyle(window).fillRect(b.x + 6, front - 19, 12, 9).fillRect(b.x + b.w - 18, front - 19, 12, 9);
      // Tejado visto desde arriba: dos aguas (la de delante más clara), alero y cumbrera
      const roofTop = b.y - wall;
      const roofBottom = wallTop + 5;
      const ridge = roofTop + (roofBottom - roofTop) * 0.45;
      g.fillStyle(shade(roofColor, 8)).fillRect(b.x - 5, roofTop, b.w + 10, ridge - roofTop);
      g.fillStyle(light(roofColor, 6)).fillRect(b.x - 5, ridge, b.w + 10, roofBottom - ridge);
      g.fillStyle(shade(roofColor, 20)).fillRect(b.x - 5, ridge - 2, b.w + 10, 3).fillRect(b.x - 5, roofBottom - 2, b.w + 10, 2);
      g.fillStyle(0x000000, 0.18).fillRect(b.x, roofBottom, b.w, 4); // sombra del alero

      if (b.nombre) this.addLabel(b.x + b.w / 2, b.y + b.h / 2, b.h / 2 + wall + 4, b.nombre);
      this.addObstacle(b.x, b.y, b.w, b.h);
    }
  }

  // El cementerio: un murete bajo con la entrada al sur y unas pocas lápidas
  createCemetery() {
    const c = CEMETERY;
    const g = this.add.graphics().setDepth(c.y + c.h);
    const gate = { from: c.x + c.w / 2 - 14, to: c.x + c.w / 2 + 14 };
    g.fillStyle(0x8a847a).fillRect(c.x, c.y - 4, c.w, 4).fillRect(c.x, c.y, 4, c.h).fillRect(c.x + c.w - 4, c.y, 4, c.h);
    g.fillRect(c.x, c.y + c.h - 4, gate.from - c.x, 4).fillRect(gate.to, c.y + c.h - 4, c.x + c.w - gate.to, 4);
    this.addObstacle(c.x, c.y - 4, c.w, 4);
    this.addObstacle(c.x, c.y, 4, c.h);
    this.addObstacle(c.x + c.w - 4, c.y, 4, c.h);
    this.addObstacle(c.x, c.y + c.h - 4, gate.from - c.x, 4);
    this.addObstacle(gate.to, c.y + c.h - 4, c.x + c.w - gate.to, 4);
    for (let x = c.x + 14; x < c.x + c.w - 14; x += 22) {
      for (const y of [c.y + 22, c.y + 46]) {
        const stone = this.add.graphics().setDepth(y);
        stone.fillStyle(0x8a847a).fillRect(x, y - 14, 8, 14);
        stone.fillStyle(0xa8a296).fillRect(x + 1, y - 13, 6, 3);
        this.addObstacle(x, y - 4, 8, 4);
      }
    }
    this.addLabel(c.x + c.w / 2, c.y + c.h, -14, 'Cementerio');
  }

  createProps() {
    for (const p of PROPS) {
      const base = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
      const g = this.add.graphics().setDepth(base.y);
      if (p.tipo === 'banco') {
        g.fillStyle(0x6b4a2f).fillRect(p.x + 2, p.y, 3, 8).fillRect(p.x + p.w - 5, p.y, 3, 8);
        g.fillStyle(0x8a5a3b).fillRect(p.x, p.y - 4, p.w, 6);
      } else if (p.tipo === 'linterna') {
        g.fillStyle(0x9a9a8a).fillRect(base.x - 5, base.y - 22, 10, 22);
        g.fillStyle(0xf2d38a).fillRect(base.x - 3, base.y - 18, 6, 5);
      } else if (p.tipo === 'farola') {
        g.fillStyle(0x3d3d3d).fillRect(base.x - 2, base.y - 36, 4, 36);
        g.fillStyle(0xf2d38a).fillCircle(base.x, base.y - 38, 5);
      } else if (p.tipo === 'molino') {
        g.fillStyle(0x7a5a3a).fillRect(p.x, p.y + 8, p.w, p.h - 8);
        g.lineStyle(4, 0x6b4a2f).strokeCircle(base.x, p.y + 4, 18);
        for (let a = 0; a < Math.PI; a += Math.PI / 4) {
          g.lineBetween(base.x - Math.cos(a) * 18, p.y + 4 - Math.sin(a) * 18, base.x + Math.cos(a) * 18, p.y + 4 + Math.sin(a) * 18);
        }
      } else if (p.tipo === 'columpio') {
        g.fillStyle(0x6b4a2f).fillRect(p.x, p.y - 28, 3, 32).fillRect(p.x + p.w - 3, p.y - 28, 3, 32).fillRect(p.x, p.y - 30, p.w, 3);
        g.lineStyle(1, 0x3d3d3d).lineBetween(p.x + 12, p.y - 28, p.x + 12, p.y - 6).lineBetween(p.x + 18, p.y - 28, p.x + 18, p.y - 6);
        g.fillStyle(0x8a5a3b).fillRect(p.x + 10, p.y - 6, 10, 3);
      }
      this.addObstacle(p.x, p.y, p.w, p.h);
    }
    // Embarcadero de la charca (se puede pisar)
    const pier = POND.embarcadero;
    this.add.graphics().setDepth(-5).fillStyle(COLORS.madera).fillRect(pier.x, pier.y, pier.w, pier.h);
  }

  // El santuario: torii al pie de las escaleras, el camino de los farolillos y el gran árbol
  createShrine() {
    // Torii: dos postes rojos y dos travesaños. Se pasa por debajo.
    const postY = STAIRS.y + STAIRS.h + 4;
    const left = STAIRS.x - 4;
    const right = STAIRS.x + STAIRS.w + 4;
    const torii = this.add.graphics().setDepth(postY);
    const height = 40;
    torii.fillStyle(COLORS.rojo).fillRect(left - 2, postY - height, 4, height).fillRect(right - 2, postY - height, 4, height);
    torii.fillRect(left - 3, postY - height + 8, right - left + 6, 3);
    torii.fillStyle(0x3f3a3a).fillRect(left - 8, postY - height - 3, right - left + 16, 4);
    this.addObstacle(left - 2, postY - 2, 4, 4);
    this.addObstacle(right - 2, postY - 2, 4, 4);

    // Farolillos del camino del festival: se enciende uno por cada recuerdo recuperado
    this.lanterns = LANTERNS.map((spot, i) => {
      const g = this.add.graphics().setDepth(spot.y);
      g.fillStyle(0x8a847a).fillRect(spot.x - 2, spot.y - 16, 4, 16);
      g.fillStyle(0x6b4a2f).fillRect(spot.x - 5, spot.y - 26, 10, 2);
      const paper = this.add.rectangle(spot.x, spot.y - 20, 8, 8, 0xd8ccb0).setDepth(spot.y);
      const glow = this.add
        .image(spot.x, spot.y - 20, this.glowTexture())
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
    this.add.image(GREAT_TREE.x, GREAT_TREE.y, 'greatTree').setOrigin(0.5, 1).setDepth(GREAT_TREE.y);
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

  // Árboles: una imagen dibujada una sola vez y reutilizada (verde o cerezo en flor).
  // La copa queda por encima y solo el tronco choca (se puede pasar por detrás).
  treeTexture(blossom = false) {
    const key = blossom ? 'townCherry' : 'townTree';
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x6b4a2f).fillRect(21, 46, 6, 14);
      g.fillStyle(blossom ? 0xe8a6b8 : 0x5c7f3e).fillCircle(24, 34, 18);
      g.fillStyle(blossom ? 0xf6cbd6 : 0x6f9a4a).fillCircle(19, 29, 11);
      g.generateTexture(key, 48, 60);
      g.destroy();
    }
    return key;
  }

  addTree(x, y, { size = 1, solid = true, blossom = false } = {}) {
    this.add.image(x, y, this.treeTexture(blossom)).setOrigin(0.5, 1).setScale(size).setDepth(y);
    if (solid) this.addObstacle(x - 4, y - 4, 8, 6);
  }

  createTrees() {
    for (const t of TREES) this.addTree(t.x, t.y, { blossom: t.cerezo });

    // El bosque de la montaña, de los bordes y del otro lado de la vía.
    // Son cientos de árboles, así que los del interior se pintan una sola vez sobre el suelo;
    // los del borde que da al pueblo son árboles sueltos, para que tapen al personaje.
    const rng = new Phaser.Math.RandomDataGenerator(['bosque']);
    const step = 34;
    const baked = [];
    const { width, height } = TOWN_SIZE;
    const nearRiver = (x, y) => this.riverPoints.some((p) => Math.abs(p.x - x) < 40 && Math.abs(p.y - y) < 40);
    for (let y = 12; y < height + 20; y += step) {
      for (let x = 12; x < width; x += step) {
        const tx = x + rng.between(-10, 10);
        const ty = y + rng.between(-10, 10);
        const size = rng.realInRange(1, 1.4);
        const foot = yAt(this.mountainFoot, tx);
        const rail = yAt(this.railPoints, tx);
        const inMountain = ty < foot - 8 && !this.isInClearing(tx, ty, 6);
        const pastRail = ty > rail + 24;
        const inForest = FOREST.some((f) => tx > f.x && tx < f.x + f.w && ty > f.y && ty < f.y + f.h);
        if (!(inMountain || pastRail || inForest) || nearRiver(tx, ty)) continue;

        const edge = (inMountain && (foot - ty < 50 || this.isInClearing(tx, ty, 44))) || pastRail || inForest;
        if (edge) this.addTree(tx, ty, { size, solid: false });
        else baked.push(this.make.image({ key: this.treeTexture(), add: false }).setOrigin(0.5, 1).setPosition(tx, ty).setScale(size));
      }
    }
    this.ground.draw(baked.sort((a, b) => a.y - b.y));
    for (const tree of baked) tree.destroy();
  }

  // Niebla: una capa de nubes blancas por cada zona cerrada, que bloquea el paso
  createFog() {
    for (const zone of this.zones) {
      zone.fogParts = [];
      zone.fogObstacles = [];
      if (!zone.foggy) continue;
      this.createZoneFog(zone);
      zone.fogObstacles = this.blockShape((x, y) => this.zoneAt(x, y) === zone, zone.bounds, FOG_CELL);
    }
  }

  // Las nubes de una zona se pintan una sola vez en una imagen (que se mece despacio),
  // y unas pocas nubes sueltas se mueven por encima para darle vida.
  // Junto a una zona abierta, las nubes se quedan algo más adentro para no taparla;
  // junto a otra zona con niebla, llegan hasta el borde para que no quede una raya sin niebla.
  createZoneFog(zone) {
    const cloud = this.makeCloudTexture();
    const margin = 100;
    const { x: left0, y: top0, width: w0, height: h0 } = zone.bounds;
    const left = left0 - margin;
    const top = top0 - margin;
    const rng = new Phaser.Math.RandomDataGenerator([String(zone.id)]);
    const foggyAt = (x, y) => Boolean(this.zoneAt(x, y)?.foggy);
    const clearAround = (x, y, r) =>
      [0, 1, 2, 3, 4, 5, 6, 7].every((k) => foggyAt(x + Math.cos((k * Math.PI) / 4) * r, y + Math.sin((k * Math.PI) / 4) * r));

    const puffs = [];
    for (let y = top0; y < top0 + h0; y += 40) {
      for (let x = left0; x < left0 + w0; x += 40) {
        const px = x + rng.between(-10, 10);
        const py = y + rng.between(-10, 10);
        if (this.zoneAt(px, py) !== zone) continue;
        // Nube grande lejos de las zonas abiertas, pequeña cerca de ellas
        const size = clearAround(px, py, 55) ? rng.between(130, 170) : clearAround(px, py, 28) ? rng.between(60, 80) : 0;
        if (!size) continue;
        puffs.push(
          this.make
            .image({ key: cloud, add: false })
            .setPosition(px - left, py - top)
            .setDisplaySize(size, size * 0.85)
            .setAlpha(0.95),
        );
      }
    }
    const width = w0 + margin * 2;
    const height = h0 + margin * 2;
    const layer = this.add.renderTexture(left + width / 2, top + height / 2, width, height).setDepth(FOG_DEPTH);
    layer.draw(puffs);
    for (const p of puffs) p.destroy();
    this.tweens.add({ targets: layer, x: layer.x + 8, y: layer.y + 4, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    zone.fogParts.push(layer);

    // Nubes sueltas que se mueven despacio por dentro de la zona
    for (let i = 0; i < 20 && zone.fogParts.length < 6; i++) {
      const x = left0 + rng.between(0, w0);
      const y = top0 + rng.between(0, h0);
      if (this.zoneAt(x, y) !== zone || !clearAround(x, y, 70)) continue;
      const drifting = this.add.image(x, y, cloud).setDisplaySize(rng.between(130, 170), rng.between(100, 130)).setAlpha(0.6).setDepth(FOG_DEPTH);
      this.tweens.add({
        targets: drifting,
        x: x + rng.between(-30, 30),
        y: y + rng.between(-15, 15),
        duration: rng.between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      zone.fogParts.push(drifting);
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
      // Farolillo provisional con un brillo que late para llamar la atención
      const shine = this.add.circle(clue.x, clue.y - 6, 10, 0xffe9a8, 0.5).setDepth(clue.y - 1);
      this.tweens.add({ targets: shine, scale: 1.5, alpha: 0.1, duration: 900, yoyo: true, repeat: -1 });
      const body = this.add.graphics().setDepth(clue.y);
      body.fillStyle(0xe8dcc0).fillRect(clue.x - 4, clue.y - 11, 8, 10);
      body.fillStyle(0x8a5a3b).fillRect(clue.x - 5, clue.y - 12, 10, 2).fillRect(clue.x - 5, clue.y - 1, 10, 2);
      this.clues.push({ ...clue, parts: [shine, body] });
    }
  }

  // Cartel con el nombre de un sitio, sobre el punto (x, y) y "raise" píxeles más arriba.
  // Los carteles de las zonas con niebla no se ven hasta que la niebla se retira.
  addLabel(x, y, raise, text) {
    const label = this.add
      .text(x, y - raise, text, { fontFamily: 'Nunito, sans-serif', fontSize: '10px', color: '#3d2e22', resolution: 3 })
      .setOrigin(0.5, 1)
      .setDepth(8000)
      .setAlpha(0.8);
    const zone = this.zoneAt(x, y);
    if (zone?.foggy) {
      label.setAlpha(0);
      zone.hidden.push(label);
    }
  }

  // Luz de la tarde sobre todo el pueblo
  createLighting() {
    const phase = PHASES[state.phase];
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xffffff),
      Phaser.Display.Color.ValueToColor(phase.tinte),
      100,
      (phase.fuerzaExterior ?? phase.fuerza) * 100,
    );
    this.add
      .rectangle(0, 0, TOWN_SIZE.width, TOWN_SIZE.height, Phaser.Display.Color.GetColor(color.r, color.g, color.b))
      .setOrigin(0)
      .setDepth(8500)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
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
      steps.push((next) => this.moveCamera({ x: zone.bounds.centerX, y: zone.bounds.centerY }, ZOOM * 0.6, 1800, next));
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
      steps.push((next) => this.moveCamera({ x: spot.x, y: spot.y - 20 }, ZOOM, 1400, next));
      steps.push((next) => {
        this.lightLantern(this.lanterns[i], true);
        this.ui.showTitle('🏮 Se ha encendido un farolillo');
        this.time.delayedCall(2000, next);
      });
    }
    state.lanternsLit = Math.max(state.lanternsLit, state.memories);

    steps.push((next) => this.moveCamera(this.player.sprite, ZOOM, 1400, next));
    steps.push(() => {
      camera.setBounds(0, 0, TOWN_SIZE.width, TOWN_SIZE.height);
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
    const center = { x: zone.bounds.centerX, y: zone.bounds.centerY };
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
      const x = zone.bounds.x + rng.between(0, zone.bounds.width);
      const y = zone.bounds.y + rng.between(0, zone.bounds.height);
      if (!Phaser.Geom.Polygon.Contains(zone.polygon, x, y)) continue;
      const angle = Math.atan2(y - center.y, x - center.x);
      const wisp = this.add
        .image(x, y, this.makeCloudTexture())
        .setDisplaySize(rng.between(140, 220), rng.between(110, 160))
        .setDepth(FOG_DEPTH + 1)
        .setAlpha(0);
      this.tweens.chain({
        targets: wisp,
        tweens: [
          { alpha: 0.85, duration: 500, delay: rng.between(0, 600) },
          {
            alpha: 0,
            x: x + Math.cos(angle) * 140,
            y: y + Math.sin(angle) * 140,
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
      for (const rect of zone.fogObstacles) this.removeObstacle(rect);
      zone.fogObstacles = [];
      // La niebla de las zonas vecinas se recoge un poco, para no tapar la que se ha abierto
      for (const other of this.zones.filter((z) => z.foggy)) {
        const old = other.fogParts;
        other.fogParts = [];
        this.createZoneFog(other);
        for (const part of other.fogParts) {
          const alpha = part.alpha;
          part.setAlpha(0);
          this.tweens.add({ targets: part, alpha, duration: 800 });
        }
        for (const part of old) {
          this.tweens.killTweensOf(part);
          this.tweens.add({ targets: part, alpha: 0, duration: 800, onComplete: () => part.destroy() });
        }
      }
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
      const path = this.pathfinder.findPath(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
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
      const zoom = Math.min(this.scale.width / TOWN_SIZE.width, this.scale.height / TOWN_SIZE.height);
      camera.pan(TOWN_SIZE.width / 2, TOWN_SIZE.height / 2, 500, 'Sine.easeInOut');
      camera.zoomTo(zoom, 500, 'Sine.easeInOut');
      this.ui.showMapButton('✖ Volver', () => this.toggleMap());
      this.setAction(null);
      this.ui.showHint('Así se ve el pueblo de lejos. La niebla oculta lo que aún no recuerdas.');
    } else {
      const target = this.player.sprite;
      camera.zoomTo(ZOOM, 500, 'Sine.easeInOut');
      camera.pan(target.x, target.y, 500, 'Sine.easeInOut', false, (_cam, progress) => {
        if (progress === 1) {
          camera.setBounds(0, 0, TOWN_SIZE.width, TOWN_SIZE.height);
          camera.startFollow(target, true, 0.12, 0.12);
        }
      });
      this.ui.showMapButton('🗺️ Mapa', () => this.toggleMap());
    }
  }

  // Convierte un punto del plano en posición de la vista de 640 x 360 (para bocadillos)
  toScreen(x, y) {
    const view = this.cameras.main.worldView;
    const scale = this.cameras.main.zoom / ZOOM;
    return { x: (x - view.x) * scale, y: (y - view.y) * scale };
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
    if (state.spirits.okiku === 'resuelto') return 'La niebla se ha retirado del río. Pasea por la orilla y cruza el puente rojo.';
    return 'Vuelve a la puerta de la librería cuando quieras';
  }

  update() {
    if (this.isBusy()) {
      this.player.stop();
      return;
    }
    this.player.update(this.keys, this.joystick);
    // Si echas a andar, el mensaje del objeto encontrado se cierra solo
    if (this.ui.isBubbleOpen() && this.player.isMoving()) this.ui.hideBubble();

    const clue = this.ui.isBubbleOpen() ? null : this.nearestClue();
    this.setAction(clue ? '✋ Recoger' : null, () => clue && this.pickUp(clue));
    this.ui.showHint(this.ui.isBubbleOpen() ? null : this.currentHint());

    this.updateDoorQuestion();
  }
}
