// Datos de la cafetería: ingredientes, comida, libros y clientes.
// Para añadir un cliente nuevo basta con copiar uno de la lista y cambiar sus datos.

export const INGREDIENTS = [
  { id: 'te', nombre: 'Té verde', icono: '🍵' },
  { id: 'cafe', nombre: 'Café', icono: '☕' },
  { id: 'leche', nombre: 'Leche', icono: '🥛' },
  { id: 'miel', nombre: 'Miel', icono: '🍯' },
  { id: 'hielo', nombre: 'Hielo', icono: '🧊' },
];

export const FOODS = [
  { id: 'dorayaki', nombre: 'Dorayaki', icono: '🥞', etiqueta: 'dulce' },
  { id: 'matcha', nombre: 'Tarta de matcha', icono: '🍰', etiqueta: 'dulce' },
  { id: 'onigiri', nombre: 'Onigiri', icono: '🍙', etiqueta: 'salado' },
  { id: 'tamago', nombre: 'Sándwich de tamago', icono: '🥪', etiqueta: 'salado' },
];

export const BOOKS = [
  {
    id: 'caqui',
    titulo: 'La casa del caqui',
    etiqueta: 'nostalgia',
    descripcion: 'Una familia vuelve cada otoño a la casa de los abuelos.',
  },
  {
    id: 'niebla',
    titulo: 'Más allá del mar de niebla',
    etiqueta: 'aventura',
    descripcion: 'Una cartógrafa navega hacia islas que no salen en los mapas.',
  },
  {
    id: 'tazas',
    titulo: 'Tazas para días grises',
    etiqueta: 'consuelo',
    descripcion: 'Pequeñas historias de gente que vuelve a sonreír.',
  },
];

// Cada cliente:
// - espera: 'mostrador' (pide en la barra) o 'estanteria' (mira libros y te llama con un "!")
// - pide: lo que necesita. Puede llevar bebida, comida y/o libro:
//     bebida: { quiere: ingredientes que debe llevar, evita: ingredientes que no le gustan }
//     comida: 'dulce' o 'salado'
//     libro: etiqueta del libro (nostalgia, aventura, consuelo)
// - seQueda: true si después se sienta un rato en una mesa
// - pedido y gracias: cada frase de la lista es una página del bocadillo
export const CUSTOMERS = [
  {
    nombre: 'Kenji',
    colores: { cuerpo: 0x4f5d75, pelo: 0x2b2b2b },
    espera: 'mostrador',
    pide: { bebida: { quiere: ['cafe'], evita: ['miel', 'leche'] } },
    seQueda: false,
    pedido: ['Buenos días…', 'Un café solo, bien cargado, por favor.', 'Hoy tengo reunión a primera hora.'],
    gracias: ['Perfecto, justo así.', '¡Deséame suerte!'],
  },
  {
    nombre: 'Señora Hana',
    colores: { cuerpo: 0x9b6a8f, pelo: 0xd9d4cc },
    espera: 'mostrador',
    pide: { bebida: { quiere: ['te', 'miel'], evita: ['hielo', 'cafe'] }, comida: 'dulce' },
    seQueda: true,
    pedido: [
      'Uf, qué frío hace hoy…',
      '¿Me pones un té calentito con algo dulce?',
      'Y algo de comer para acompañar. Me sentaré un ratito.',
    ],
    gracias: ['Esto sabe a las tardes en casa de mi madre…', 'Gracias, cielo.'],
  },
  {
    nombre: 'Yui',
    colores: { cuerpo: 0xe0a458, pelo: 0x5b3a29 },
    espera: 'estanteria',
    pide: { libro: 'consuelo' },
    seQueda: false,
    pedido: [
      'Perdona, ¿me ayudas?',
      'Hoy me han dado unas notas horribles…',
      '¿Tienes algún libro que me anime un poco?',
    ],
    gracias: ['Este parece perfecto.', 'Creo que me va a hacer mucho bien.'],
  },
  {
    nombre: 'Señor Mori',
    colores: { cuerpo: 0x7a6a4f, pelo: 0xbfbfbf },
    espera: 'estanteria',
    pide: { libro: 'nostalgia' },
    seQueda: false,
    pedido: [
      'Ah, hola, joven.',
      'Busco algo que me recuerde a cuando era niño…',
      'A los veranos en el pueblo de mis abuelos.',
    ],
    gracias: ['Oh… sí, sí. Esto es justo lo que buscaba.', 'Muchas gracias.'],
  },
  {
    nombre: 'Sora',
    colores: { cuerpo: 0x5f9ea0, pelo: 0x3b2a20 },
    espera: 'mostrador',
    pide: { bebida: { quiere: ['leche', 'hielo'], evita: ['cafe'] }, libro: 'aventura' },
    seQueda: true,
    pedido: [
      '¡Hola! ¡Qué calor hace fuera!',
      '¿Me pones algo fresquito con leche?',
      'Y un libro de aventuras para leer aquí un rato.',
    ],
    gracias: ['¡Qué rico!', 'Me quedo leyendo un poco, ¿vale?'],
  },
  {
    nombre: 'Riku',
    colores: { cuerpo: 0xc0504d, pelo: 0x1f1f1f },
    espera: 'mostrador',
    pide: { comida: 'salado' },
    seQueda: true,
    pedido: ['¡Tengo un hambre…!', '¿Tienes algo salado para comer?', 'Me lo tomo aquí sentado.'],
    gracias: ['¡Mmm, buenísimo!', 'Gracias.'],
  },
];

// Visitantes de ambiente: no piden nada, solo dan vida a la librería.
// Entran, curiosean en las estanterías, se sientan un rato y se van.
export const VISITORS = [
  { nombre: 'Estudiante', colores: { cuerpo: 0x8fa36b, pelo: 0x2b2018 } },
  { nombre: 'Señora con sombrero', colores: { cuerpo: 0xb07a5a, pelo: 0x6b4a3a } },
  { nombre: 'Chico con auriculares', colores: { cuerpo: 0x5a6b8f, pelo: 0x1f1a17 } },
];

// Cuánta gente viene cada mañana según lo que ha crecido el barrio.
// Al principio de la historia la librería está casi vacía; con cada etapa llega más vida.
// - clientes: personas que piden algo (con "!")
// - visitantes: personas que solo curiosean y se sientan (sin interacción)
// - maxDentro: cuántas personas puede haber a la vez
// - llegadaCada: segundos aproximados entre una llegada y la siguiente
export const NEIGHBORHOOD_STAGES = [
  { clientes: 2, visitantes: 1, maxDentro: 3, llegadaCada: { min: 15, max: 25 } }, // etapa 0: inicio de la historia
  { clientes: 3, visitantes: 1, maxDentro: 4, llegadaCada: { min: 12, max: 20 } },
  { clientes: 4, visitantes: 2, maxDentro: 5, llegadaCada: { min: 9, max: 15 } },
  { clientes: 6, visitantes: 3, maxDentro: 6, llegadaCada: { min: 6, max: 10 } },
];
