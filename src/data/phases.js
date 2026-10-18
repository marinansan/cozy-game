// Fases del día. El tiempo no corre solo: cada fase termina cuando el jugador decide.
// tinte: color que se mezcla con la escena (0xffffff = sin cambio) · fuerza: de 0 a 1

export const PHASES = {
  manana: { nombre: 'Mañana', icono: '🌅', tinte: 0xfff4e0, fuerza: 0.15, luces: false },
  tarde: { nombre: 'Tarde', icono: '🌇', tinte: 0xffb36b, fuerza: 0.45, luces: false },
  noche: { nombre: 'Noche', icono: '🌙', tinte: 0x34407a, fuerza: 0.75, luces: true },
};

export const PHASE_ORDER = ['manana', 'tarde', 'noche'];
