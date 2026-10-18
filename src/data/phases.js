// Fases del día. El tiempo no corre solo: cada fase termina cuando el jugador decide.
// tinte: color que se mezcla con la escena (0xffffff = sin cambio) · fuerza: de 0 a 1
// luces: color de las lámparas encendidas (null = apagadas)
// ambiente: luz de color que se suma a la escena (null = ninguna) · brillo: de 0 a 1

export const PHASES = {
  manana: { nombre: 'Mañana', icono: '🌅', tinte: 0xfff4e0, fuerza: 0.15, luces: null, ambiente: null },
  tarde: { nombre: 'Tarde', icono: '🌇', tinte: 0xffb36b, fuerza: 0.45, luces: null, ambiente: null },
  // Noche mágica: ambiente azul y morado, lámparas en lavanda
  noche: { nombre: 'Noche', icono: '🌙', tinte: 0x3a3a9e, fuerza: 0.78, luces: 0xc4b0ff, ambiente: 0x3a2f8a, brillo: 0.3 },
};

export const PHASE_ORDER = ['manana', 'tarde', 'noche'];
