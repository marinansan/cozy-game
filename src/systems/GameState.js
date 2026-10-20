// Estado del juego compartido entre escenas (librería, barrio…).
// Más adelante se podrá guardar y cargar para continuar la partida.
export const state = {
  yen: 0,
  day: 1,
  phase: 'manana', // manana · tarde · noche
  neighborhoodStage: 0, // crecerá al recuperar recuerdos (pasos 5 y 6)
  inventory: [], // objetos encontrados (ids de src/data/townLayout.js)
  spirits: {}, // estado de cada espíritu: 'escuchado' | 'resuelto' (ver src/data/spirits.js)
  memories: 0, // recuerdos recuperados
  revealedZones: [], // zonas del barrio cuya niebla ya se ha retirado (para no repetir la animación)
  lanternsLit: 0, // farolillos de las escaleras que ya se han visto encenderse
};
