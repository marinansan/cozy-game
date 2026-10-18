import { BOOKS, FOODS, INGREDIENTS } from '../data/cafe.js';
import { drinkName } from '../systems/cafe.js';
import './ui.css';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;
const MAX_INGREDIENTS = 3;
const MIN_INGREDIENTS = 2;
const TYPE_SPEED = 28; // milisegundos por letra

// Interfaz HTML de la cafetería: yenes, pistas, botón de acción,
// bocadillos de diálogo y el panel para preparar la bebida y elegir el libro.
export default class CafeUI {
  constructor(root) {
    this.root = root;
    this.root.innerHTML = '';

    this.hud = this.add('div', 'hud');
    this.status = this.add('div', 'hud estado');
    this.hint = this.add('div', 'pista');
    this.action = this.add('button', 'accion interactivo');
    this.mapButton = this.add('button', 'boton-mapa interactivo');
    this.hint.hidden = true;
    this.action.hidden = true;
    this.mapButton.hidden = true;
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

  setStatus(day, phase) {
    this.status.textContent = `Día ${day} · ${phase.icono} ${phase.nombre}`;
  }

  // Cartel grande en el centro al cambiar de fase ("Día 2 · Mañana")
  showTitle(text) {
    const el = this.add('div', 'titulo');
    el.textContent = text;
    setTimeout(() => el.remove(), 2200);
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

  // Botón para ver el barrio de lejos (solo en el barrio)
  showMapButton(label, onClick) {
    this.mapButton.hidden = !label;
    if (label) {
      this.mapButton.textContent = label;
      this.mapButton.onclick = onClick;
    }
  }

  isActionVisible() {
    return !this.action.hidden;
  }

  // Bocadillo de diálogo por páginas: el texto se escribe letra a letra
  // y se pasa a la siguiente frase tocando el bocadillo (o con E / espacio).
  // Tocar en la última frase cierra el bocadillo.
  // onFinished se llama cuando se ha mostrado la última página.
  showBubble(x, y, name, pages, onFinished) {
    this.hideBubble();
    this.bubble = this.add('div', 'bocadillo interactivo');
    const nameEl = this.add('span', 'nombre', this.bubble);
    nameEl.textContent = name;
    const textEl = this.add('span', 'texto', this.bubble);
    const arrow = this.add('span', 'flecha', this.bubble);
    arrow.textContent = '▼';
    this.place(this.bubble, x, y);

    this.dialogue = { pages, page: 0, textEl, arrow, timer: null, typing: false, onFinished };
    this.bubble.onclick = () => this.advanceBubble();
    this.typePage();
  }

  typePage() {
    const d = this.dialogue;
    const text = d.pages[d.page];
    let shown = 0;
    d.typing = true;
    d.arrow.hidden = true;
    d.textEl.textContent = '';
    clearInterval(d.timer);
    d.timer = setInterval(() => {
      shown++;
      d.textEl.textContent = text.slice(0, shown);
      if (shown >= text.length) this.finishTyping();
    }, TYPE_SPEED);
  }

  finishTyping() {
    const d = this.dialogue;
    clearInterval(d.timer);
    d.typing = false;
    d.textEl.textContent = d.pages[d.page];
    const isLast = d.page === d.pages.length - 1;
    d.arrow.hidden = false; // en la última frase, tocar cierra el bocadillo
    if (isLast && d.onFinished) {
      const done = d.onFinished;
      d.onFinished = null;
      done();
    }
  }

  // Devuelve true si el bocadillo ha usado la pulsación
  advanceBubble() {
    const d = this.dialogue;
    if (!this.bubble || !d) return false;
    if (d.typing) {
      this.finishTyping();
      return true;
    }
    if (d.page < d.pages.length - 1) {
      d.page++;
      this.typePage();
      return true;
    }
    // Última frase ya leída: se cierra el bocadillo
    this.hideBubble();
    return true;
  }

  // Pregunta con botones (p. ej. "¿Cerrar la tienda?" Sí / No), por encima del punto indicado
  showChoice(x, y, text, options) {
    this.hideChoice();
    this.choice = this.add('div', 'bocadillo arriba eleccion interactivo');
    this.add('span', 'texto', this.choice).textContent = text;
    const buttons = this.add('div', 'botones', this.choice);
    for (const option of options) {
      const button = this.add('button', option.principal ? 'boton' : 'boton secundario', buttons);
      button.textContent = option.label;
      button.onclick = (event) => {
        event.stopPropagation();
        this.hideChoice();
        option.onClick();
      };
    }
    this.choiceOptions = options;
    this.place(this.choice, x, y);
  }

  isChoiceOpen() {
    return Boolean(this.choice);
  }

  // Teclado: la primera opción (Sí) o la última (No)
  pickChoice(index) {
    const option = this.choiceOptions?.at(index);
    if (!option) return;
    this.hideChoice();
    option.onClick();
  }

  hideChoice() {
    this.choice?.remove();
    this.choice = null;
    this.choiceOptions = null;
  }

  isBubbleOpen() {
    return Boolean(this.bubble);
  }

  hideBubble() {
    if (this.dialogue) clearInterval(this.dialogue.timer);
    this.dialogue = null;
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

  // Abre el panel de atención con los pasos que necesite el cliente
  // (bebida, comida y/o libro). Al terminar llama a onDone({ bebida, comida, libro }).
  openServe(customer, onDone) {
    this.panel = this.add('div', 'fondo-panel interactivo');
    const card = this.add('div', 'panel', this.panel);
    const served = {};
    const steps = [];
    if (customer.pide.bebida) {
      steps.push((next) =>
        this.showDrinkStep(card, customer, (ingredients) => {
          served.bebida = ingredients;
          this.showPreparing(card, ingredients, next);
        }),
      );
    }
    if (customer.pide.comida) {
      steps.push((next) =>
        this.showFoodStep(card, customer, (food) => {
          served.comida = food;
          next();
        }),
      );
    }
    if (customer.pide.libro) {
      steps.push((next) =>
        this.showBookStep(card, customer, (book) => {
          served.libro = book;
          next();
        }),
      );
    }
    const run = (index) => {
      if (index < steps.length) {
        steps[index](() => run(index + 1));
        return;
      }
      this.panel.remove();
      this.panel = null;
      onDone(served);
    };
    run(0);
  }

  header(card, title, customer) {
    card.innerHTML = '';
    const h = this.add('h2', '', card);
    h.textContent = title;
    const quote = this.add('p', 'pedido', card);
    quote.textContent = `${customer.nombre}: «${customer.pedido.join(' ')}»`;
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

  showFoodStep(card, customer, next) {
    this.header(card, '🍙 Elige algo de comer', customer);
    const options = this.add('div', 'opciones', card);
    for (const food of FOODS) {
      const option = this.add('button', 'opcion', options);
      option.innerHTML = `<span class="icono">${food.icono}</span>${food.nombre}`;
      option.onclick = () => next(food.id);
    }
  }

  showBookStep(card, customer, next) {
    this.header(card, '📚 Recomienda un libro', customer);
    const options = this.add('div', 'opciones', card);
    for (const book of BOOKS) {
      const option = this.add('button', 'opcion libro', options);
      option.innerHTML = `<span class="etiqueta">${book.etiqueta}</span><strong>${book.titulo}</strong><small>${book.descripcion}</small>`;
      option.onclick = () => next(book);
    }
  }
}
