// Distribución de la librería sobre la imagen de fondo (640x360 píxeles).
// Cada obstáculo es un rectángulo invisible { x, y, w, h } que el personaje no puede atravesar.
// Para verlos en el juego, pulsa Mayús + D o añade ?debug a la dirección.

export const LIBRARY_BACKGROUND = 'libreria';

export const PLAYER_START = { x: 320, y: 270 };

// Puerta de entrada (los clientes aparecen y se van por aquí)
export const DOOR = { x: 260, y: 342 };

// Zona detrás del mostrador: desde aquí se puede atender.
// Se entra por el hueco del extremo derecho de la barra.
export const BARISTA_ZONE = { x: 362, y: 80, w: 201, h: 26 };

// Puntos donde se puede interactuar (el botón aparece al acercarse)
export const SIGN_SPOT = { x: 260, y: 312, radio: 28 }; // cartel de abierto / cerrado, junto a la puerta
export const STAIRS_SPOT = { x: 352, y: 124, radio: 20 }; // cortina del fondo: sube a casa a dormir

// Lámparas que se encienden de noche { x, y, radio }
export const LAMPS = [
  { x: 102, y: 58, radio: 45 }, // lámpara de la ventana
  { x: 465, y: 50, radio: 50 }, // lámpara del mostrador
  { x: 283, y: 86, radio: 22 }, // farolillo de las estanterías
  { x: 328, y: 80, radio: 22 }, // farolillo junto al cuadro
  { x: 44, y: 232, radio: 26 }, // farolillo de la pared izquierda
  { x: 605, y: 275, radio: 26 }, // farolillo de la pared derecha
];

// Sitio delante del mostrador donde se pide (solo una persona cada vez, sin colas)
export const COUNTER_SPOT = { x: 405, y: 174 };

// Sitios delante de las estanterías donde los clientes miran libros
export const BROWSE_SPOTS = [
  { x: 180, y: 128 },
  { x: 240, y: 128 },
  { x: 300, y: 126 },
  { x: 112, y: 200 },
  { x: 460, y: 215 },
  { x: 135, y: 268 },
];

// Asientos: x, y = dónde se sienta · llegada = punto libre desde el que se acerca a la silla
export const SEATS = [
  { x: 218, y: 200, llegada: { x: 205, y: 200 } },
  { x: 218, y: 228, llegada: { x: 205, y: 228 } },
  { x: 303, y: 200, llegada: { x: 318, y: 200 } },
  { x: 303, y: 228, llegada: { x: 318, y: 228 } },
  { x: 376, y: 262, llegada: { x: 356, y: 262 } },
  { x: 436, y: 262, llegada: { x: 454, y: 262 } },
  { x: 145, y: 158, llegada: { x: 172, y: 165 } },
];

export const LIBRARY_OBSTACLES = [
  // Paredes
  { x: 0, y: 0, w: 62, h: 360, nombre: 'pared izquierda' },
  { x: 563, y: 0, w: 77, h: 360, nombre: 'pared derecha' },
  { x: 0, y: 320, w: 233, h: 40, nombre: 'pared inferior izquierda' },
  { x: 286, y: 320, w: 354, h: 40, nombre: 'pared inferior derecha' },
  { x: 233, y: 348, w: 53, h: 12, nombre: 'umbral de la puerta' },

  // Fondo de la sala
  { x: 62, y: 0, w: 76, h: 130, nombre: 'banco de la ventana' },
  { x: 138, y: 0, w: 224, h: 118, nombre: 'estanterías del fondo' },
  { x: 362, y: 0, w: 201, h: 86, nombre: 'muebles detrás del mostrador' },
  { x: 362, y: 100, w: 175, h: 65, nombre: 'mostrador de la cafetería' },
  { x: 440, y: 140, w: 55, h: 35, nombre: 'taburetes' },

  // Muebles
  { x: 78, y: 128, w: 85, h: 50, nombre: 'mesa redonda izquierda' },
  { x: 62, y: 160, w: 42, h: 80, nombre: 'expositor izquierdo' },
  { x: 212, y: 178, w: 98, h: 80, nombre: 'mesa grande' },
  { x: 362, y: 230, w: 85, h: 52, nombre: 'mesa redonda derecha' },
  { x: 472, y: 190, w: 58, h: 110, nombre: 'expositor derecho' },
  { x: 548, y: 245, w: 35, h: 65, nombre: 'planta derecha' },
  { x: 55, y: 262, w: 40, h: 58, nombre: 'planta inferior izquierda' },
  { x: 90, y: 275, w: 90, h: 45, nombre: 'estantería baja' },
  { x: 195, y: 295, w: 25, h: 25, nombre: 'planta junto a la puerta (izq.)' },
  { x: 296, y: 295, w: 25, h: 25, nombre: 'planta junto a la puerta (der.)' },
];
