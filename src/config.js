// Resolución del juego.
//
// El juego "piensa" en una vista de 640 x 360 (todas las posiciones de los datos
// están en estas unidades), pero dibuja más grande para que las imágenes conserven
// su detalle. La cámara aplica ese aumento (ZOOM).
//
// El aumento se adapta a la pantalla: x3 (1920 x 1080) en pantallas grandes o móviles
// con mucha densidad de píxeles, x2 (1280 x 720) en pantallas más pequeñas.
// Así no se gasta potencia en píxeles que no se ven.
export const VIEW = { width: 640, height: 360 };

function pickZoom() {
  const ratio = window.devicePixelRatio || 1;
  const physical = Math.min((window.innerWidth * ratio) / VIEW.width, (window.innerHeight * ratio) / VIEW.height);
  return Math.max(2, Math.min(3, Math.ceil(physical - 0.25)));
}

export const ZOOM = pickZoom();
export const RENDER = { width: VIEW.width * ZOOM, height: VIEW.height * ZOOM };

// Las imágenes de arte se preparan a 3 píxeles por unidad del juego
// y se muestran con setScale(1 / ART_RESOLUTION).
export const ART_RESOLUTION = 3;
