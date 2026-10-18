// Perspectiva isométrica (2:1) para el barrio.
//
// El juego "piensa" el barrio en un plano normal (x hacia la derecha, y hacia abajo),
// donde se camina, se choca y se buscan caminos. Solo al dibujar se gira en diagonal:
// un cuadrado del plano se ve como un rombo el doble de ancho que de alto.

import { TOWN_SIZE } from '../data/townLayout.js';

// Desplazamiento para que todo el barrio quede en coordenadas positivas de pantalla
const OFFSET_X = TOWN_SIZE.height;
const OFFSET_Y = 0;

// Tamaño del barrio ya dibujado en diagonal
export const ISO_SIZE = {
  width: TOWN_SIZE.width + TOWN_SIZE.height,
  height: (TOWN_SIZE.width + TOWN_SIZE.height) / 2,
};

// Del plano a la pantalla
export function toIso(x, y) {
  return { x: x - y + OFFSET_X, y: (x + y) / 2 + OFFSET_Y };
}

// De la pantalla al plano (p. ej. para saber dónde has hecho clic)
export function toPlane(sx, sy) {
  const dx = sx - OFFSET_X;
  const dy = sy - OFFSET_Y;
  return { x: dy + dx / 2, y: dy - dx / 2 };
}

// Un movimiento en pantalla (flecha o joystick) convertido en movimiento del plano,
// para que "arriba" en la pantalla sea arriba aunque el mundo esté en diagonal.
// Conserva la velocidad en pantalla: igual de rápido en todas las direcciones.
export function screenToPlane(dx, dy) {
  return { x: dy + dx / 2, y: dy - dx / 2 };
}

// Las cuatro esquinas de un rectángulo del plano, en pantalla
// (arriba, derecha, abajo, izquierda del rombo)
export function isoCorners(x, y, w, h) {
  return {
    top: toIso(x, y),
    right: toIso(x + w, y),
    bottom: toIso(x + w, y + h),
    left: toIso(x, y + h),
  };
}
