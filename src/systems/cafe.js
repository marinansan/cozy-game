import { FOODS, INGREDIENTS } from '../data/cafe.js';

// Reglas de la cafetería: nombre de la bebida, puntuación y recompensa.
// Aquí no se puede fallar: siempre se gana algo, aunque menos si no aciertas.

const BASES = [
  { id: 'cafe', nombre: 'Café', genero: 'm' },
  { id: 'te', nombre: 'Té verde', genero: 'm' },
  { id: 'leche', nombre: 'Leche', genero: 'f' },
  { id: 'miel', nombre: 'Agua con miel', genero: 'f' },
];

const YEN_PER_ITEM = 45; // lo que paga por cada cosa que pide, si aciertas del todo

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

// 1 = bebida perfecta, 0.5 = se acerca, 0 = no era lo que buscaba
export function scoreDrink(ingredients, wanted) {
  const hasAll = wanted.quiere.every((i) => ingredients.includes(i));
  const hasSome = wanted.quiere.some((i) => ingredients.includes(i));
  const hasAvoided = wanted.evita.some((i) => ingredients.includes(i));
  if (hasAll && !hasAvoided) return 1;
  if (hasSome) return 0.5;
  return 0;
}

// served = { bebida?: [ingredientes], comida?: id, libro?: libro }
export function serveResult(customer, served) {
  const scores = [];
  if (customer.pide.bebida) scores.push(scoreDrink(served.bebida, customer.pide.bebida));
  if (customer.pide.comida) scores.push(FOODS.find((f) => f.id === served.comida).etiqueta === customer.pide.comida ? 1 : 0);
  if (customer.pide.libro) scores.push(served.libro.etiqueta === customer.pide.libro ? 1 : 0);

  const ratio = scores.reduce((a, b) => a + b, 0) / scores.length; // de 0 a 1
  const yenes = Math.round((YEN_PER_ITEM * scores.length * (0.4 + 0.6 * ratio)) / 5) * 5;

  // Cada reacción es una lista de frases (páginas del bocadillo)
  let reaccion;
  if (ratio === 1) reaccion = customer.gracias;
  else if (ratio >= 0.5) reaccion = ['¡Qué bien!', 'Casi, casi lo que necesitaba.'];
  else if (ratio > 0) reaccion = ['Mmm, no está mal.', 'Gracias por escucharme.'];
  else reaccion = ['No era exactamente lo que buscaba…', 'Pero gracias por el detalle.'];

  return { ratio, yenes, reaccion };
}
