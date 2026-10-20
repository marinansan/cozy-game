// Distribución del pueblo (provisional, con bloques de colores hasta tener el arte).
// Basada en el boceto gat/overview/mapa-boceto.png.
//
// Todas las medidas son del "plano": x hacia la derecha (este), y hacia abajo (sur).
// El juego lo dibuja girado en diagonal (perspectiva isométrica, ver src/systems/iso.js).
// Recuerda: las fachadas que se ven son las del sur (y mayor) y las del este (x mayor),
// por eso las puertas de los edificios dan al sur, hacia la calle.

export const TOWN_SIZE = { width: 1680, height: 1200 };

// Zonas del pueblo. La zona 0 está abierta al empezar; las demás están cubiertas de niebla
// hasta que se recupera el recuerdo indicado en "abre" (id de un espíritu de src/data/spirits.js).
export const ZONES = [
  { id: 0, nombre: 'Estación y calle', x: 504, y: 450, w: 672, h: 462, abierta: true },
  { id: 1, nombre: 'El río y el taller de Okiku', x: 360, y: 240, w: 816, h: 210, abre: 'okiku' },
  { id: 2, nombre: 'Barrio oeste', x: 48, y: 450, w: 456, h: 702 },
  { id: '2b', nombre: 'Huertos del sur', x: 504, y: 912, w: 672, h: 240 },
  { id: 3, nombre: 'Barrio este', x: 1176, y: 520, w: 456, h: 632 },
  { id: 4, nombre: 'El puente de piedra', x: 1176, y: 240, w: 456, h: 280 },
  { id: 5, nombre: 'El santuario', x: 672, y: 36, w: 648, h: 204 },
];

// Bosque: zonas sin acceso, llenas de árboles. Rodea el pueblo y cierra los bordes del mapa.
// delante: el bosque del sur y del este se dibuja por delante del personaje (lo tapa al acercarse).
export const FOREST = [
  { x: 0, y: 0, w: 360, h: 450 }, // noroeste
  { x: 360, y: 0, w: 312, h: 240 }, // norte, junto al santuario
  { x: 672, y: 0, w: 648, h: 36 }, // detrás del santuario
  { x: 1320, y: 0, w: 360, h: 240 }, // noreste
  { x: 0, y: 450, w: 48, h: 750 }, // borde oeste
  { x: 1632, y: 240, w: 48, h: 960, delante: true }, // borde este
  { x: 48, y: 1152, w: 1584, h: 48, delante: true }, // borde sur
];

// Al salir de la librería apareces aquí, delante de su puerta (en la calle principal)
export const TOWN_START = { x: 829, y: 786 };

// Puerta de la librería: al pararte aquí pregunta si quieres entrar
export const LIBRARY_DOOR = { x: 829, y: 782, radio: 20 };

export const COLORS = {
  hierba: 0x8fae5d,
  hierbaOscura: 0x7a9a4f,
  camino: 0xd9b98a,
  bordeCamino: 0xc4a172,
  agua: 0x7fb8c8,
  orilla: 0x6f9a6a,
  madera: 0x9a6a42,
  piedra: 0xb8b2a6,
  via: 0x7a5a4a,
  traviesa: 0x5a4034,
  arrozal: 0x9cc48a,
  huerto: 0x8a6a3a,
  solar: 0xa8925f,
  valla: 0x7a5a3a,
  colina: 0x7f9e55,
};

// Caminos: listas de puntos (rectos o con curvas suaves)
export const PATHS = [
  // Calle principal, de oeste a este
  [
    { x: 96, y: 790 },
    { x: 1584, y: 790 },
  ],
  // Calle del norte, junto a la estación (al otro lado de la vía)
  [
    { x: 150, y: 580 },
    { x: 1560, y: 580 },
  ],
  // Pasos a nivel: unen las dos calles cruzando la vía
  [
    { x: 648, y: 790 },
    { x: 648, y: 580 },
  ],
  [
    { x: 1224, y: 790 },
    { x: 1224, y: 580 },
  ],
  // De la calle del norte al puente de madera y al pie de las escaleras del santuario
  [
    { x: 960, y: 580 },
    { x: 968, y: 500 },
    { x: 945, y: 458 },
    { x: 880, y: 448 },
    { x: 845, y: 430 },
    { x: 840, y: 310 },
  ],
  // Orilla norte del río: del puente de madera al taller de Okiku
  [
    { x: 840, y: 340 },
    { x: 700, y: 336 },
    { x: 535, y: 334 },
  ],
  // Hacia el este: puente de piedra y subida a la casa del farolero
  [
    { x: 1224, y: 580 },
    { x: 1290, y: 545 },
    { x: 1347, y: 505 },
    { x: 1347, y: 420 },
    { x: 1300, y: 330 },
    { x: 1210, y: 220 },
    { x: 1170, y: 150 },
  ],
  [
    { x: 1347, y: 420 },
    { x: 1505, y: 335 },
  ],
  // Callejones hacia el sur
  [
    { x: 360, y: 790 },
    { x: 360, y: 1080 },
  ],
  [
    { x: 840, y: 790 },
    { x: 840, y: 1080 },
  ],
  [
    { x: 1320, y: 790 },
    { x: 1320, y: 1080 },
  ],
];

export const PATH_WIDTH = 30;

// El río cruza el pueblo de oeste a este (curva suave por estos puntos)
export const RIVER = {
  puntos: [
    { x: 0, y: 360 },
    { x: 300, y: 396 },
    { x: 540, y: 432 },
    { x: 780, y: 420 },
    { x: 1020, y: 396 },
    { x: 1260, y: 432 },
    { x: 1500, y: 504 },
    { x: 1680, y: 540 },
  ],
  ancho: 52,
};

// Puentes: por aquí se puede cruzar el río
export const BRIDGES = [
  { id: 'madera', x: 816, y: 380, w: 48, h: 72, material: 'madera' },
  { id: 'piedra', x: 1322, y: 420, w: 50, h: 82, material: 'piedra' },
];

// La vía del tren cruza el pueblo de oeste a este; solo se cruza por los pasos a nivel
export const RAILWAY = { y: 624, alto: 32 };
export const CROSSINGS = [
  { x: 624, w: 48 },
  { x: 1200, w: 48 },
];

// Escaleras del santuario (subiendo hacia el norte) y sus farolillos.
// Cada recuerdo recuperado enciende un farolillo, empezando por el de abajo.
export const STAIRS = { x: 820, y: 130, w: 40, h: 170 };
export const LANTERNS = [
  { x: 810, y: 292 },
  { x: 870, y: 292 },
  { x: 810, y: 250 },
  { x: 870, y: 250 },
  { x: 810, y: 208 },
  { x: 870, y: 208 },
  { x: 810, y: 166 },
];

// El gran árbol dormido, junto al santuario
export const GREAT_TREE = { x: 1010, y: 120 };

// Edificios: x, y, ancho, alto = la planta (lo que choca); tejado = altura del tejado por encima.
// La puerta está en la fachada sur. Si pasas por detrás, el edificio te tapa.
//
// imagen (opcional): dibujo del edificio en lugar de la caja de colores.
// - archivo: en public/assets/
// - origen: punto de la imagen (de 0 a 1) que coincide con la esquina delantera de la base
//   (la de abajo del rombo); así la imagen queda bien apoyada sobre el suelo.
export const BUILDINGS = [
  // Zona 0
  {
    id: 'libreria',
    nombre: 'Librería',
    x: 800,
    y: 690,
    w: 58,
    h: 78,
    tejado: 50,
    pared: 0xc9a27a,
    techo: 0x4a3b5c,
    imagen: { archivo: 'libreria-exterior.png', origen: { x: 0.4608, y: 0.8102 } },
  },
  { id: 'estacion', nombre: 'Estación', x: 744, y: 470, w: 192, h: 90, tejado: 30, pared: 0xd9b37a, techo: 0x6b4a3a },
  { id: 'ultramarinos', nombre: 'Ultramarinos', x: 1000, y: 690, w: 70, h: 60, tejado: 34, pared: 0xc4a07a, techo: 0x56463f },
  { id: 'casa0', nombre: 'Casa', x: 590, y: 696, w: 64, h: 54, tejado: 32, pared: 0xb89a7a, techo: 0x5a4a4a },
  // Zona 1
  { id: 'taller', nombre: 'Taller de farolillos', x: 480, y: 262, w: 110, h: 58, tejado: 36, pared: 0xc08a5a, techo: 0x5a3f36 },
  // Zona 2
  { id: 'tofu', nombre: 'Tofu', x: 380, y: 690, w: 70, h: 60, tejado: 34, pared: 0xcfb48e, techo: 0x56463f },
  { id: 'casa2a', nombre: 'Casa', x: 170, y: 690, w: 70, h: 56, tejado: 32, pared: 0xb08f6e, techo: 0x56463f },
  { id: 'casa2b', nombre: 'Casa', x: 200, y: 500, w: 70, h: 56, tejado: 32, pared: 0xb89a7a, techo: 0x5a4a4a },
  // Zona 3
  { id: 'dulces', nombre: 'Dulces', x: 1290, y: 690, w: 70, h: 60, tejado: 34, pared: 0xd4a88a, techo: 0x6a3f3f },
  { id: 'sento', nombre: 'Sentō', x: 1420, y: 680, w: 120, h: 70, tejado: 40, pared: 0x9ab0c0, techo: 0x3f4a5a },
  { id: 'casa3', nombre: 'Casa', x: 1400, y: 500, w: 70, h: 56, tejado: 32, pared: 0xb08f6e, techo: 0x56463f },
  // Zona 4
  { id: 'casa4', nombre: 'Casa', x: 1460, y: 262, w: 90, h: 60, tejado: 34, pared: 0xb89a7a, techo: 0x5a4a4a },
  // Zona 5
  { id: 'santuario', nombre: 'Santuario', x: 780, y: 60, w: 120, h: 70, tejado: 44, pared: 0xb04a3a, techo: 0x3f3a3a },
  { id: 'farolero', nombre: 'Casa del farolero', x: 1110, y: 80, w: 100, h: 60, tejado: 36, pared: 0x8a6a52, techo: 0x4a3b36 },
];

// Solares vallados: aquí se podrá construir más adelante (abertura en la valla del norte)
export const LOTS = [
  { x: 960, y: 830, w: 100, h: 70, abertura: 30 },
  { x: 960, y: 290, w: 90, h: 60, abertura: 30 },
  { x: 380, y: 930, w: 100, h: 70, abertura: 30 },
  { x: 900, y: 960, w: 100, h: 70, abertura: 30 },
  { x: 1380, y: 940, w: 100, h: 70, abertura: 30 },
  { x: 1430, y: 400, w: 80, h: 55, abertura: 26 },
];

// Arrozales y huertos (no se pueden pisar)
export const FIELDS = [
  { tipo: 'arrozal', x: 70, y: 900, w: 120, h: 100 },
  { tipo: 'arrozal', x: 200, y: 900, w: 120, h: 100 },
  { tipo: 'arrozal', x: 70, y: 1010, w: 120, h: 100 },
  { tipo: 'arrozal', x: 200, y: 1010, w: 120, h: 100 },
  { tipo: 'arrozal', x: 1490, y: 900, w: 120, h: 100 },
  { tipo: 'arrozal', x: 1490, y: 1010, w: 120, h: 100 },
  { tipo: 'huerto', x: 600, y: 960, w: 120, h: 70 },
];

// Objetos pequeños: bancos, linternas de piedra, farolas…
export const PROPS = [
  { tipo: 'banco', x: 1060, y: 552, w: 30, h: 8 },
  { tipo: 'banco', x: 700, y: 350, w: 30, h: 8 },
  { tipo: 'linterna', x: 880, y: 760, w: 12, h: 12 },
  { tipo: 'farola', x: 520, y: 812, w: 6, h: 6 },
  { tipo: 'farola', x: 1120, y: 812, w: 6, h: 6 },
];

// Árboles sueltos por el pueblo (el bosque se genera solo dentro de FOREST y en el borde)
export const TREES = [
  { x: 560, y: 880 },
  { x: 1100, y: 880 },
  { x: 120, y: 600 },
  { x: 300, y: 860 },
  { x: 1590, y: 700 },
  { x: 1250, y: 1040 },
  { x: 420, y: 300 },
  { x: 1090, y: 290 },
  { x: 700, y: 1100 },
  { x: 1050, y: 1100 },
  { x: 1600, y: 250 },
  { x: 720, y: 90 },
  { x: 960, y: 60 },
  { x: 1260, y: 120 },
];

// Objetos-pista que se pueden encontrar por el pueblo
export const CLUES = [
  {
    id: 'farolillo',
    nombre: 'Farolillo de papel apagado',
    icono: '🏮',
    x: 560,
    y: 470,
    texto: [
      'Has encontrado un farolillo de papel, apagado y un poco roto.',
      'Huele a lavanda… y tiene un nombre escrito a mano, casi borrado.',
      '¿De quién será?',
    ],
  },
];
