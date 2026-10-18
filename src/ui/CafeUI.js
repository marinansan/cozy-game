import { BOOKS, INGREDIENTS } from '../data/cafe.js';
import { drinkName } from '../systems/cafe.js';
import './ui.css';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;
const MAX_INGREDIENTS = 3;
const MIN_INGREDIENTS = 2;

// Interfaz HTML de la cafetería: yenes, pistas, botón de acción,
// bocadillos de diálogo y el panel para preparar la bebida y elegir el libro.
export default class CafeUI {
  constructor(root) {
    this.root = root;
    this.root.innerHTML = '';

    this.hud = this.add('div', 'hud');
    this.hint = this.add('div', 'pista');
    this.action = this.add('button', 'accion interactivo');
    this.hint.hidden = true;
    this.action.hidden = true;
    this.bubble = null;
    this.panel = null;
    this.setYen(0);
  }

  add(tag, className, parent = this.root) {
    const el = document.createElement(tag);
    el.className = className;
    parent.appendChild(el);
    return el;
  }

  // Convierte coordenadas del juego en posición dentro de la interfaz
  place(el, x, y) {
    el.style.left = `${(x / GAME_WIDTH) * 100}%`;
    el.style.top = `${(y / GAME_HEIGHT) * 100}%`;
  }

  setYen(amount, animate = false) {
    this.hud.textContent = `💴 ${amount} ¥`;
    if (animate) {
      this.hud.classList.remove('salto');
      void this.hud.offsetWidth; // reinicia la animación
      this.hud.classList.add('salto');
    }
  }

  showHint(text) {
    this.hint.hidden = !text;
    if (text) this.hint.textContent = text;
  }

  showAction(label, onClick) {
    this.action.hidden = !label;
    if (label) {
      this.action.textContent = label;
      this.action.onclick = onClick;
    }
  }

  isActionVisible() {
    return !this.action.hidden;
  }

  showBubble(x, y, name, text) {
    this.hideBubble();
    this.bubble = this.add('div', 'bocadillo');
    const nameEl = this.add('span', 'nombre', this.bubble);
    nameEl.textContent = name;
    this.bubble.append(text);
    this.place(this.bubble, x, y);
  }

  hideBubble() {
    this.bubble?.remove();
    this.bubble = null;
  }

  floatText(x, y, text) {
    const el = this.add('div', 'flotante');
    el.textContent = text;
    this.place(el, x, y);
    setTimeout(() => el.remove(), 1500);
  }

  isPanelOpen() {
    return this.panel !== null;
  }

  // Abre el panel de atención. Al terminar llama a onDone(ingredientes, libro).
  openServe(customer, onDone) {
    this.panel = this.add('div', 'fondo-panel interactivo');
    const card = this.add('div', 'panel', this.panel);
    this.showDrinkStep(card, customer, (ingredients) => {
      this.showPreparing(card, ingredients, () => {
        this.showBookStep(card, customer, ingredients, (book) => {
          this.panel.remove();
          this.panel = null;
          onDone(ingredients, book);
        });
      });
    });
  }

  header(card, title, customer) {
    card.innerHTML = '';
    const h = this.add('h2', '', card);
    h.textContent = title;
    const quote = this.add('p', 'pedido', card);
    quote.textContent = `${customer.nombre}: «${customer.pedido}»`;
  }

  showDrinkStep(card, customer, next) {
    this.header(card, '☕ Prepara la bebida', customer);
    const chosen = [];
    const options = this.add('div', 'opciones', card);
    const footer = this.add('div', 'pie', card);
    const summary = this.add('span', 'resumen', footer);
    const button = this.add('button', 'boton', footer);
    button.textContent = 'Preparar';

    const refresh = () => {
      summary.textContent = chosen.length
        ? drinkName(chosen)
        : `Elige de ${MIN_INGREDIENTS} a ${MAX_INGREDIENTS} ingredientes`;
      button.disabled = chosen.length < MIN_INGREDIENTS;
    };

    for (const ingredient of INGREDIENTS) {
      const option = this.add('button', 'opcion', options);
      option.innerHTML = `<span class="icono">${ingredient.icono}</span>${ingredient.nombre}`;
      option.onclick = () => {
        const index = chosen.indexOf(ingredient.id);
        if (index >= 0) chosen.splice(index, 1);
        else if (chosen.length < MAX_INGREDIENTS) chosen.push(ingredient.id);
        option.classList.toggle('elegida', chosen.includes(ingredient.id));
        refresh();
      };
    }
    button.onclick = () => next([...chosen]);
    refresh();
  }

  showPreparing(card, ingredients, next) {
    card.innerHTML = '';
    const box = this.add('div', 'preparando', card);
    const icons = ingredients.map((id) => INGREDIENTS.find((i) => i.id === id).icono).join('');
    box.innerHTML = `<span class="icono">${icons}</span>Preparando ${drinkName(ingredients).toLowerCase()}…`;
    setTimeout(next, 1100);
  }

  showBookStep(card, customer, ingredients, next) {
    this.header(card, `📚 Elige un libro para acompañar: ${drinkName(ingredients).toLowerCase()}`, customer);
    const options = this.add('div', 'opciones', card);
    for (const book of BOOKS) {
      const option = this.add('button', 'opcion libro', options);
      option.innerHTML = `<span class="etiqueta">${book.etiqueta}</span><strong>${book.titulo}</strong><small>${book.descripcion}</small>`;
      option.onclick = () => next(book);
    }
  }
}
