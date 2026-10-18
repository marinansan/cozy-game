// Distribución del barrio (provisional, con bloques de colores hasta tener el arte).
// Medidas en píxeles del juego. La pantalla muestra 640 x 360; el barrio es más grande
// y la cámara sigue al personaje.
//
// Composición inspirada en las referencias: plaza central con fuente, caminos curvos
// hacia cada lugar, edificios con forma propia y un borde natural (bosque y niebla).

export const TOWN_SIZE = { width: 1600, height: 1200 };

// Al salir de la librería apareces aquí, delante de su puerta
export const TOWN_START = { x: 800, y: 1080 };

// Puerta de la librería: al acercarte pregunta si quieres entrar
export const LIBRARY_DOOR = { x: 800, y: 1072, radio: 22 };

export const COLORS = {
  hierba: 0x8fae5d,
  hierbaOscura: 0x7a9a4f,
  camino: 0xd9b98a,
  bordeCamino: 0xc4a172,
  plaza: 0xd8cbb0,
  bordePlaza: 0xb8a98c,
  agua: 0x7fc8c0,
  solar: 0xa8925f,
  valla: 0x7a5a3a,
};

// Plaza central con fuente (la fuente no se puede atravesar)
export const PLAZA = { x: 800, y: 620, radio: 95, fuente: 26 };

// Caminos: listas de puntos por los que pasa una curva suave
export const PATHS = [
  // De la librería a la plaza (rodea la librería por la izquierda)
  [
    { x: 800, y: 1062 },
    { x: 790, y: 1100 },
    { x: 700, y: 1105 },
    { x: 640, y: 1040 },
    { x: 650, y: 920 },
    { x: 720, y: 790 },
    { x: 770, y: 705 },
  ],
  // De la plaza hacia el este (se pierde en la niebla)
  [
    { x: 890, y: 630 },
    { x: 1000, y: 660 },
    { x: 1110, y: 700 },
    { x: 1260, y: 720 },
  ],
  // De la plaza hacia el norte (se pierde en la niebla)
  [
    { x: 800, y: 525 },
    { x: 820, y: 440 },
    { x: 860, y: 360 },
    { x: 880, y: 260 },
  ],
  // De la plaza a la casa antigua del oeste
  [
    { x: 710, y: 600 },
    { x: 600, y: 560 },
    { x: 470, y: 520 },
    { x: 330, y: 500 },
  ],
  // Ramal hacia la casa del suroeste
  [
    { x: 650, y: 1000 },
    { x: 540, y: 1050 },
    { x: 390, y: 1050 },
  ],
  // De la plaza al solar vallado
  [
    { x: 860, y: 700 },
    { x: 930, y: 790 },
    { x: 1045, y: 850 },
  ],
];

export const PATH_WIDTH = 26;

// Edificios: x, y, ancho, alto = la planta (lo que choca); tejado = altura del tejado por encima.
// Si pasas por detrás, el edificio te tapa.
//
// imagen (opcional): dibujo del edificio en lugar de la caja de colores.
// - archivo: en public/assets/
// - origen: punto de la imagen (de 0 a 1) que coincide con la esquina delantera de la base
//   (la de abajo del rombo); así la imagen queda bien apoyada sobre el suelo.
export const BUILDINGS = [
  {
    id: 'libreria',
    nombre: 'Librería',
    x: 774,
    y: 982,
    w: 58,
    h: 78,
    tejado: 50,
    pared: 0xc9a27a,
    techo: 0x4a3b5c,
    imagen: { archivo: 'libreria-exterior.png', origen: { x: 0.4866, y: 0.9658 } },
  },
  { id: 'casaOeste', nombre: 'Casa antigua', x: 250, y: 430, w: 120, h: 50, tejado: 45, pared: 0xb89a7a, techo: 0x5a4a4a },
  { id: 'casaSuroeste', nombre: 'Casa antigua', x: 330, y: 980, w: 110, h: 50, tejado: 40, pared: 0xb08f6e, techo: 0x56463f },
  { id: 'bloque', nombre: 'Bloque moderno a medio construir', x: 1260, y: 990, w: 190, h: 110, tejado: 60, pared: 0x9a9a9a, techo: 0x7d7d7d },
];

// Solar vallado: aquí se podrá construir más adelante (abertura en la valla arriba)
export const LOT = { x: 960, y: 860, w: 170, h: 120, abertura: 40 };

// Objetos pequeños: bancos, linterna de piedra, farolas…
export const PROPS = [
  { tipo: 'banco', x: 690, y: 548, w: 30, h: 8 },
  { tipo: 'banco', x: 880, y: 548, w: 30, h: 8 },
  { tipo: 'linterna', x: 900, y: 1040, w: 12, h: 12 },
  { tipo: 'farola', x: 700, y: 690, w: 6, h: 6 },
  { tipo: 'farola', x: 900, y: 690, w: 6, h: 6 },
];

// Árboles sueltos por el barrio (además del bosque del borde, que se genera solo)
export const TREES = [
  { x: 560, y: 700 },
  { x: 600, y: 830 },
  { x: 980, y: 520 },
  { x: 1050, y: 570 },
  { x: 450, y: 700 },
  { x: 500, y: 900 },
  { x: 1160, y: 940 },
  { x: 250, y: 700 },
  { x: 310, y: 820 },
  { x: 180, y: 600 },
  { x: 560, y: 460 },
  { x: 1180, y: 560 },
];

// Niebla del olvido: zonas que no se pueden cruzar hasta recuperar recuerdos
export const FOG_ZONES = [
  { id: 'norte', x: 0, y: 0, w: 1600, h: 330 },
  { id: 'este', x: 1230, y: 330, w: 370, h: 560 },
];

// Objetos-pista que se pueden encontrar por el barrio
export const CLUES = [
  {
    id: 'farolillo',
    nombre: 'Farolillo de papel apagado',
    x: 1192,
    y: 745,
    texto: [
      'Has encontrado un farolillo de papel, apagado y un poco roto.',
      'Huele a lavanda… y tiene un nombre escrito a mano, casi borrado.',
      '¿De quién será?',
    ],
  },
];
