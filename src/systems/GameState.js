// Estado del juego compartido entre escenas (librería, barrio…).
// Más adelante se podrá guardar y cargar para continuar la partida.
export const state = {
  yen: 0,
  day: 1,
  phase: 'manana', // manana · tarde · noche
  neighborhoodStage: 0, // crecerá al recuperar recuerdos (pasos 5 y 6)
  inventory: [], // objetos encontrados (ids de src/data/townLayout.js)
};
