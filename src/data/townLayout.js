// Distribución del pueblo (provisional, con bloques de colores hasta tener el arte).
// Basada en el boceto gat/overview/mapa-boceto-v6.png.
//
// Todas las medidas son del "plano": x hacia la derecha (este), y hacia abajo (sur).
// Vista cenital 3/4: el plano se dibuja tal cual, con el norte arriba. De los edificios
// se ve la fachada sur, por eso sus puertas dan al sur.
//
// El pueblo crece alrededor del río (con un paseo en cada orilla y varios puentes)
// y de la calle antigua, que sube del puente rojo al santuario. Al norte está la montaña;
// al sur, la vía del tren y el bosque, donde termina el mapa.

export const TOWN_SIZE = { width: 1680, height: 1260 };

// Zonas del pueblo (formas irregulares: lista de puntos). La zona 0 está abierta al empezar;
// las demás están cubiertas de niebla hasta que se recupera el recuerdo indicado en "abre"
// (id de un espíritu de src/data/spirits.js). El número es el orden en que se abren.
export const ZONES = [
  {
    id: 0,
    nombre: 'La estación y tu librería',
    abierta: true,
    puntos: [[560, 800], [800, 760], [1060, 830], [1260, 900], [1300, 1110], [560, 1110]],
  },
  {
    id: 1,
    nombre: 'El paseo del río',
    abre: 'okiku',
    puntos: [[380, 330], [690, 320], [640, 450], [760, 560], [1000, 600], [1080, 700], [1060, 830], [800, 760], [560, 800], [500, 640], [470, 450]],
  },
  { id: 2, nombre: 'La calle antigua', puntos: [[690, 320], [1000, 320], [1000, 600], [760, 560], [640, 450]] },
  {
    id: 3,
    nombre: 'La charca y la escuela',
    puntos: [[1000, 320], [1620, 320], [1620, 1010], [1260, 900], [1060, 830], [1080, 700], [1000, 600]],
  },
  { id: 4, nombre: 'El cementerio', puntos: [[60, 350], [380, 330], [470, 450], [500, 640], [60, 640]] },
  { id: 5, nombre: 'Los campos', puntos: [[60, 640], [500, 640], [560, 800], [560, 1110], [60, 1150]] },
  { id: 6, nombre: 'El santuario', puntos: [[620, 0], [1260, 0], [1260, 300], [620, 320]] },
];

// Al salir de la librería apareces aquí, delante de su puerta
export const TOWN_START = { x: 895, y: 954 };

// Puerta de la librería: al pararte aquí pregunta si quieres entrar
export const LIBRARY_DOOR = { x: 895, y: 948, radio: 20 };

export const COLORS = {
  hierba: 0x8fae5d,
  hierbaOscura: 0x7a9a4f,
  montana: 0x5f8241,
  claro: 0x7f9e55,
  acantilado: 0xb0703c,
  camino: 0xd9b98a,
  bordeCamino: 0xc4a172,
  paseo: 0xd9c9a8,
  muro: 0x9a948a,
  agua: 0x7fb8c8,
  madera: 0x9a6a42,
  piedra: 0xb8b2a6,
  rojo: 0xc0463a,
  via: 0x7a5a4a,
  traviesa: 0x5a4034,
  cultivo: 0x9cc48a,
  tierra: 0x8a6a3a,
  jardin: 0x7fae5a,
  cementerio: 0xa9b08e,
  patio: 0xc9dba0,
};

// La montaña ocupa todo lo que queda al norte de su pie (una curva). No se puede subir,
// salvo por las escaleras del santuario. En ella hay claros donde sí se puede caminar.
export const MOUNTAIN = {
  pie: [[0, 330], [200, 350], [380, 300], [560, 330], [680, 310], [800, 330], [930, 300], [1100, 330], [1300, 290], [1500, 320], [1680, 290]],
  claros: [
    { x: 650, y: 70, w: 270, h: 250 }, // el santuario y el gran árbol
    { x: 900, y: 185, w: 180, h: 28 }, // sendero escondido hacia el farolero
    { x: 1070, y: 125, w: 160, h: 120 }, // la casa del farolero, tras la arboleda
  ],
};

// Escaleras del santuario, que suben la ladera hacia el norte
export const STAIRS = { x: 770, y: 150, w: 40, h: 195 };

// El camino de los farolillos (el del festival): del puente rojo al santuario.
// Cada recuerdo recuperado enciende uno, empezando por el del puente.
export const LANTERNS = [
  { x: 930, y: 600 },
  { x: 925, y: 535 },
  { x: 890, y: 465 },
  { x: 858, y: 405 },
  { x: 826, y: 345 },
  { x: 826, y: 280 },
  { x: 826, y: 200 },
];

// El gran árbol dormido, junto al santuario
export const GREAT_TREE = { x: 880, y: 150 };

// El río baja de la montaña (con una cascada al llegar al pueblo) y cruza en diagonal.
// Va entre muros de piedra, con un paseo en cada orilla.
export const RIVER = {
  puntos: [[330, 0], [390, 170], [470, 330], [580, 460], [720, 560], [880, 640], [1060, 700], [1240, 760], [1420, 850], [1580, 930], [1680, 960]],
  ancho: 52,
  muro: 72, // ancho total con los muros de piedra
  paseo: 56, // distancia del centro del río al centro de cada paseo
  anchoPaseo: 22,
};

// Puentes de una orilla a otra (de un paseo al otro)
export const BRIDGES = [
  { desde: [581, 382], hasta: [499, 458], material: 'madera' },
  { desde: [725, 497], hasta: [666, 592], material: 'piedra' },
  { desde: [901, 588], hasta: [859, 692], material: 'rojo' }, // el puente rojo, el principal
  { desde: [1167, 675], hasta: [1133, 782], material: 'madera' },
  { desde: [1445, 800], hasta: [1395, 900], material: 'piedra' },
];

// La charca, con un embarcadero
export const POND = {
  puntos: [[1180, 430], [1360, 420], [1420, 520], [1300, 600], [1170, 560]],
  embarcadero: { x: 1340, y: 596, w: 60, h: 12 },
};

// La vía del tren cruza el sur del pueblo; al otro lado solo hay bosque
export const RAILWAY = { puntos: [[0, 1130], [500, 1150], [1000, 1140], [1680, 1110]], ancho: 26 };

// Bosque en los bordes oeste y este (el norte es la montaña y el sur queda tras la vía)
export const FOREST = [
  { x: 0, y: 300, w: 60, h: 960 },
  { x: 1620, y: 280, w: 60, h: 980 },
];

// Caminos de tierra (listas de puntos, con curvas suaves)
export const PATHS = [
  // La calle antigua: del puente rojo al torii
  [[901, 588], [900, 540], [860, 440], [810, 370], [790, 345]],
  // Del puente rojo a la calle del sur, pasando junto a la librería
  [[859, 692], [880, 790], [965, 860], [965, 990]],
  // Calle del sur, junto a la estación
  [[560, 990], [950, 990], [1300, 975], [1520, 930]],
  [[895, 950], [895, 990]],
  // Al este, hacia la charca y la escuela
  [[930, 520], [1100, 520], [1200, 470]],
  [[1100, 520], [1150, 650], [1167, 675]],
  [[1420, 600], [1480, 640]],
  // Del puente de madera al cementerio
  [[499, 458], [470, 520], [360, 560], [230, 530], [210, 495]],
  // A los campos
  [[560, 990], [470, 1000], [300, 1060], [200, 1080]],
  [[470, 1000], [470, 700], [520, 640], [563, 598]],
];

export const PATH_WIDTH = 28;

// Edificios: x, y, ancho, alto = la planta (lo que choca). La puerta está en la fachada sur.
// tipo: 'casa' (vivienda), 'tienda' o 'especial'. Si pasas por detrás, el edificio te tapa.
// habitada: alguien vive aquí desde el principio. jardin: tiene un jardín al lado.
//
// imagen (opcional): dibujo del edificio en lugar de la caja de colores, en vista 3/4.
// - archivo: en public/assets/ (dibujado a 3 veces la resolución del juego)
// - origen: punto de la imagen (de 0 a 1) que coincide con el centro del borde sur de la planta
//   (el pie de la fachada); así la imagen queda bien apoyada sobre el suelo.
//   Ejemplo: imagen: { archivo: 'libreria-exterior.png', origen: { x: 0.5, y: 0.95 } }
const casa = (x, y, extra = {}) => ({ tipo: 'casa', nombre: null, x, y, w: 56, h: 34, ...extra });
export const BUILDINGS = [
  // Zona 0: la estación y tu librería (aquí aún vive algo de gente)
  { id: 'libreria', tipo: 'especial', nombre: 'Librería', x: 860, y: 885, w: 70, h: 52, pared: 0xc9a27a, techo: 0x4a3b5c },
  { id: 'estacion', tipo: 'especial', nombre: 'Estación', x: 860, y: 1050, w: 190, h: 40, pared: 0xd9b37a, techo: 0x6b4a3a },
  { id: 'ultramarinos', tipo: 'tienda', nombre: 'Ultramarinos', x: 1010, y: 895, w: 76, h: 44 },
  casa(700, 1000, { habitada: true }),
  casa(1110, 1010, { habitada: true }),
  casa(620, 905, { habitada: true, jardin: true }),
  casa(1200, 1050, { habitada: true }),
  // Zona 1: el paseo del río
  { id: 'taller', tipo: 'especial', nombre: 'Taller de farolillos', x: 660, y: 665, w: 90, h: 40, pared: 0xd9a06a, techo: 0x5a3f36 },
  { id: 'dulces', tipo: 'tienda', nombre: 'Dulces', x: 995, y: 795, w: 60, h: 36 },
  casa(616, 366),
  casa(467, 525),
  casa(535, 581),
  // Zona 2: la calle antigua
  { id: 'sake', tipo: 'tienda', nombre: 'Sake', x: 780, y: 480, w: 60, h: 36 },
  { id: 'tofu', tipo: 'tienda', nombre: 'Tofu', x: 940, y: 450, w: 60, h: 36 },
  casa(664, 405),
  casa(730, 385),
  casa(920, 370),
  // Zona 3: la charca y la escuela
  { id: 'escuela', tipo: 'especial', nombre: 'Escuela', x: 1480, y: 555, w: 120, h: 50, pared: 0xd9c9a8, techo: 0x5a4a4a },
  { id: 'te', tipo: 'tienda', nombre: 'Casa de té', x: 1063, y: 588, w: 60, h: 36 },
  { id: 'fideos', tipo: 'tienda', nombre: 'Fideos', x: 1392, y: 720, w: 60, h: 36 },
  { id: 'sento', tipo: 'especial', nombre: 'Sentō', x: 1130, y: 845, w: 90, h: 40, pared: 0x9ab0c0, techo: 0x3f4a5a },
  casa(1060, 380, { jardin: true }),
  casa(1180, 345),
  casa(1480, 380, { jardin: true }),
  casa(1540, 465),
  casa(1040, 470, { jardin: true }),
  casa(1223, 640),
  casa(1311, 678),
  casa(1539, 796, { jardin: true }),
  casa(1240, 874),
  casa(1310, 913, { jardin: true }),
  casa(1440, 990),
  casa(1512, 1024),
  // Zona 4: el cementerio
  casa(310, 450),
  casa(90, 540, { jardin: true }),
  casa(240, 560),
  // Zona 5: los campos
  { id: 'granja', tipo: 'casa', nombre: 'Granja', x: 120, y: 1060, w: 70, h: 40 },
  // Zona 6: el santuario y, escondida, la casa del farolero
  { id: 'santuario', tipo: 'especial', nombre: 'Santuario', x: 730, y: 80, w: 120, h: 50, pared: 0xb04a3a, techo: 0x3f3a3a },
  { id: 'farolero', tipo: 'especial', nombre: 'Casa del farolero', x: 1110, y: 160, w: 90, h: 44, pared: 0x8a6a52, techo: 0x4a3b36 },
];

// Parcelas de cultivo (se pueden pisar). La pequeña junto a la librería es la tuya:
// ahí empezarás a cultivar. Los campos grandes están al oeste.
export const PLOTS = [
  { id: 'huerto-libreria', nombre: 'Tu huerto', tipo: 'tierra', x: 782, y: 900, w: 66, h: 46 },
  ...[90, 185, 280, 375].flatMap((x, col) =>
    [720, 810, 900].map((y, row) => ({ tipo: (col + row) % 2 ? 'tierra' : 'cultivo', x, y, w: 85, h: 80 })),
  ),
];

// Jardines de las casas (con flores; se pueden pisar)
export const GARDENS = BUILDINGS.filter((b) => b.jardin).map((b) => ({ x: b.x + b.w + 6, y: b.y + 4, w: 36, h: 28 }));

// El cementerio: pequeño y tranquilo, entre las casas al pie de la montaña
export const CEMETERY = { x: 150, y: 420, w: 120, h: 70 };

// Patio de la escuela (con columpios)
export const SCHOOL_YARD = { x: 1480, y: 625, w: 120, h: 60 };

// Objetos pequeños: bancos, linternas de piedra, farolas, molino…
export const PROPS = [
  { tipo: 'banco', x: 1060, y: 960, w: 30, h: 8 },
  { tipo: 'banco', x: 1240, y: 590, w: 30, h: 8 },
  { tipo: 'linterna', x: 940, y: 950, w: 12, h: 12 },
  { tipo: 'farola', x: 820, y: 1000, w: 6, h: 6 },
  { tipo: 'farola', x: 1150, y: 990, w: 6, h: 6 },
  { tipo: 'molino', x: 480, y: 1060, w: 36, h: 36 },
  { tipo: 'columpio', x: 1520, y: 645, w: 40, h: 10 },
];

// Árboles sueltos por el pueblo (cerezo = rosa)
export const TREES = [
  { x: 1150, y: 420, cerezo: true },
  { x: 1440, y: 470, cerezo: true },
  { x: 1160, y: 615, cerezo: true },
  { x: 760, y: 830, cerezo: true },
  { x: 600, y: 1080 },
  { x: 1150, y: 1100 },
  { x: 380, y: 1050 },
  { x: 1380, y: 1060 },
  { x: 560, y: 830 },
  { x: 140, y: 410 },
  { x: 285, y: 420 },
  { x: 1000, y: 360 },
  { x: 640, y: 520 },
];

// Objetos-pista que se pueden encontrar por el pueblo
export const CLUES = [
  {
    id: 'farolillo',
    nombre: 'Farolillo de papel apagado',
    icono: '🏮',
    x: 700,
    y: 840,
    texto: [
      'Has encontrado un farolillo de papel, apagado y un poco roto.',
      'Huele a lavanda… y tiene un nombre escrito a mano, casi borrado.',
      '¿De quién será?',
    ],
  },
];
