import { INGREDIENTS } from '../data/cafe.js';

// Reglas de la cafetería: nombre de la bebida, puntuación y recompensa.
// Aquí no se puede fallar: siempre se gana algo, aunque menos si no aciertas.

const BASES = [
  { id: 'cafe', nombre: 'Café', genero: 'm' },
  { id: 'te', nombre: 'Té verde', genero: 'm' },
  { id: 'leche', nombre: 'Leche', genero: 'f' },
  { id: 'miel', nombre: 'Agua con miel', genero: 'f' },
];

const lower = (id) => INGREDIENTS.find((i) => i.id === id).nombre.toLowerCase();

// Ej.: ['cafe', 'leche', 'hielo'] → "Café con leche frío"
export function drinkName(ingredients) {
  const base = BASES.find((b) => ingredients.includes(b.id)) ?? { id: 'hielo', nombre: 'Agua', genero: 'f' };
  const extras = ingredients.filter((i) => i !== base.id && i !== 'hielo').map(lower);
  let name = base.nombre;
  if (extras.length) name += ' con ' + extras.join(' y ');
  if (ingredients.includes('hielo')) name += base.genero === 'f' ? ' fría' : ' frío';
  return name;
}

// 2 = bebida perfecta, 1 = se acerca, 0 = no era lo que buscaba
export function scoreDrink(ingredients, wanted) {
  const hasAll = wanted.quiere.every((i) => ingredients.includes(i));
  const hasSome = wanted.quiere.some((i) => ingredients.includes(i));
  const hasAvoided = wanted.evita.some((i) => ingredients.includes(i));
  if (hasAll && !hasAvoided) return 2;
  if (hasSome) return 1;
  return 0;
}

export function serveResult(customer, ingredients, book) {
  const drinkScore = scoreDrink(ingredients, customer.bebida);
  const bookOk = book.etiqueta === customer.libro;
  const total = drinkScore + (bookOk ? 1 : 0); // de 0 a 3

  const yenes = [50, 70, 100, 130][total];
  // Cada reacción es una lista de frases (páginas del bocadillo)
  const reacciones = [
    ['No era exactamente lo que buscaba…', 'Pero gracias por el detalle.'],
    ['Mmm, no está mal.', 'Gracias por escucharme.'],
    ['¡Qué bien!', 'Casi, casi lo que necesitaba.'],
    customer.gracias,
  ];
  return { total, yenes, reaccion: reacciones[total] };
}
