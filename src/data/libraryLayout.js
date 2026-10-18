// Distribución de la librería sobre la imagen de fondo (640x360 píxeles).
// Cada obstáculo es un rectángulo invisible { x, y, w, h } que el personaje no puede atravesar.
// Para verlos en el juego, pulsa Mayús + D o añade ?debug a la dirección.

export const LIBRARY_BACKGROUND = 'libreria';

export const PLAYER_START = { x: 260, y: 300 };

// Puerta de entrada (los clientes aparecen y se van por aquí)
export const DOOR = { x: 260, y: 342 };

// Zona detrás del mostrador: desde aquí se puede atender.
// Se entra por el hueco del extremo derecho de la barra.
export const BARISTA_ZONE = { x: 362, y: 80, w: 201, h: 26 };

// Sitio donde espera el cliente, delante del mostrador
export const CUSTOMER_SPOT = { x: 405, y: 174 };

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
