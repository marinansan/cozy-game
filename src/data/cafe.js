// Datos de la cafetería: ingredientes, libros y clientes.
// Para añadir un cliente nuevo basta con copiar uno de la lista y cambiar sus datos.

export const INGREDIENTS = [
  { id: 'te', nombre: 'Té verde', icono: '🍵' },
  { id: 'cafe', nombre: 'Café', icono: '☕' },
  { id: 'leche', nombre: 'Leche', icono: '🥛' },
  { id: 'miel', nombre: 'Miel', icono: '🍯' },
  { id: 'hielo', nombre: 'Hielo', icono: '🧊' },
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

// bebida.quiere: ingredientes que debe llevar · bebida.evita: ingredientes que no le gustan
// libro: etiqueta del libro que necesita
// pedido y gracias: cada frase de la lista es una página del bocadillo
export const CUSTOMERS = [
  {
    nombre: 'Señora Hana',
    colores: { cuerpo: 0x9b6a8f, pelo: 0xd9d4cc },
    pedido: [
      'Uf, qué frío hace hoy…',
      '¿Me pones un té calentito con algo dulce?',
      'Y algo para leer que me haga sentir en casa.',
    ],
    bebida: { quiere: ['te', 'miel'], evita: ['hielo', 'cafe'] },
    libro: 'nostalgia',
    gracias: ['Esto sabe a las tardes en casa de mi madre…', 'Gracias, cielo.'],
  },
  {
    nombre: 'Kenji',
    colores: { cuerpo: 0x4f5d75, pelo: 0x2b2b2b },
    pedido: [
      'Llevo toda la noche con un informe…',
      'Necesito algo fuerte y nada dulce.',
      'Y un libro que me lleve muy lejos de la oficina.',
    ],
    bebida: { quiere: ['cafe'], evita: ['miel', 'leche'] },
    libro: 'aventura',
    gracias: ['Justo lo que necesitaba.', 'Por un rato me olvidaré del informe.'],
  },
  {
    nombre: 'Yui',
    colores: { cuerpo: 0xe0a458, pelo: 0x5b3a29 },
    pedido: [
      '¡Qué calor!',
      '¿Tienes algo fresquito con leche?',
      'Hoy me han dado unas notas horribles… necesito algo que me anime.',
    ],
    bebida: { quiere: ['leche', 'hielo'], evita: ['cafe'] },
    libro: 'consuelo',
    gracias: ['¡Qué rico!', 'Y este libro… creo que me va a hacer mucho bien.'],
  },
];
