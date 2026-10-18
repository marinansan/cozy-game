import Phaser from 'phaser';
import { BROWSE_SPOTS, COUNTER_SPOT, DOOR, SEATS } from '../data/libraryLayout.js';
import { CUSTOMERS, NEIGHBORHOOD_STAGES, VISITORS } from '../data/cafe.js';
import Customer from '../objects/Customer.js';

// El ritmo de llegada y cuánta gente viene dependen de la etapa del barrio (src/data/cafe.js)
const COUNTER_REST = { min: 4000, max: 8000 }; // pausa tras atender antes de que llegue otra persona al mostrador
const BROWSE_TIME = { min: 4000, max: 8000 }; // tiempo mirando una estantería
const SEATED_TIME = { min: 35000, max: 60000 }; // tiempo sentado leyendo o tomando algo

const between = ({ min, max }) => Phaser.Math.Between(min, max);

// Gestiona a todas las personas de la librería durante la mañana.
//
// Clientes (piden algo):
//   mostrador:  entering → wantsTalk (!) → talking → waitingServe → serving → reacting → (seated) → leaving
//   estantería: entering → browsing → wantsTalk (!) → …igual que arriba
// Visitantes (solo dan ambiente): entering → browsing → (otra estantería) → seated → leaving
//
// En el mostrador solo hay una persona cada vez: nunca se forma cola.
export default class CustomerManager {
  constructor(scene, pathfinder) {
    this.scene = scene;
    this.pathfinder = pathfinder;
    this.people = [];
    this.atCounter = null; // la persona que va al mostrador o está en él
    this.counterFreeAt = 0; // momento a partir del cual puede venir alguien nuevo al mostrador
    this.browseTaken = new Set(); // índices de BROWSE_SPOTS ocupados
    this.seatTaken = new Set(); // índices de SEATS ocupados
    this.todayCustomers = [];
    this.todayVisitors = [];
    this.arrivalTimer = null;
  }

  // ---------- Día ----------

  // stage: etapa del barrio (0 = inicio de la historia)
  startDay(stage = 0) {
    this.stage = NEIGHBORHOOD_STAGES[Math.min(stage, NEIGHBORHOOD_STAGES.length - 1)];
    this.todayCustomers = Phaser.Utils.Array.Shuffle([...CUSTOMERS]).slice(0, this.stage.clientes);
    this.todayVisitors = Phaser.Utils.Array.Shuffle([...VISITORS]).slice(0, this.stage.visitantes);
    this.counterFreeAt = 0;
    this.scheduleArrival(1500);
  }

  stopDay() {
    this.arrivalTimer?.remove();
    this.arrivalTimer = null;
    this.todayCustomers = [];
    this.todayVisitors = [];
  }

  isEmpty() {
    return this.people.length === 0;
  }

  // Se puede cerrar si nadie está esperando a que le atiendas
  // (quien está sentado o curioseando se marcha al cerrar)
  canClose() {
    const busy = ['wantsTalk', 'talking', 'waitingServe', 'serving', 'reacting'];
    return !this.people.some((p) => busy.includes(p.state));
  }

  // Al cerrar la tienda, todo el mundo se ha ido (ocurre durante el fundido)
  clearAll() {
    for (const person of this.people) person.destroy();
    this.people = [];
    this.atCounter = null;
    this.browseTaken.clear();
    this.seatTaken.clear();
  }

  moreToday() {
    return this.todayCustomers.length > 0 || this.todayVisitors.length > 0;
  }

  scheduleArrival(delay = between(this.stage.llegadaCada) * 1000) {
    this.arrivalTimer?.remove();
    this.arrivalTimer = this.scene.time.delayedCall(delay, () => this.tryArrival());
  }

  // Decide quién entra ahora (si hay sitio) y programa la siguiente llegada
  tryArrival() {
    if (!this.moreToday()) return;
    if (this.people.length < this.stage.maxDentro) {
      const next = this.pickNextArrival();
      if (next) this.arrive(next.data, next.isVisitor);
    }
    if (this.moreToday()) this.scheduleArrival();
  }

  pickNextArrival() {
    const counterFree = !this.atCounter && this.scene.time.now >= this.counterFreeAt;
    const shelfFree = this.browseTaken.size < BROWSE_SPOTS.length;

    // Clientes que pueden entrar ahora mismo
    const customerIndex = this.todayCustomers.findIndex((data) =>
      data.espera === 'mostrador' ? counterFree : shelfFree,
    );
    // De vez en cuando entra un visitante de ambiente en lugar de un cliente
    const visitorReady = this.todayVisitors.length > 0 && shelfFree;
    const preferVisitor = visitorReady && (customerIndex < 0 || Math.random() < 0.3);

    if (preferVisitor) return { data: this.todayVisitors.shift(), isVisitor: true };
    if (customerIndex >= 0) return { data: this.todayCustomers.splice(customerIndex, 1)[0], isVisitor: false };
    return null;
  }

  arrive(data, isVisitor) {
    const person = new Customer(this.scene, data, DOOR.x, DOOR.y);
    person.isVisitor = isVisitor;
    this.people.push(person);

    if (!isVisitor && data.espera === 'mostrador') {
      this.atCounter = person;
      this.walkTo(person, COUNTER_SPOT, () => this.wantsToTalk(person));
    } else {
      this.goBrowse(person);
    }
  }

  walkTo(person, target, onArrive) {
    const path = this.pathfinder.findPath(person.x, person.y, target.x, target.y);
    person.walk(path, onArrive);
  }

  // ---------- Estanterías ----------

  freeBrowseSpot(exceptIndex) {
    const free = BROWSE_SPOTS.map((_, i) => i).filter((i) => !this.browseTaken.has(i) && i !== exceptIndex);
    return free.length ? Phaser.Utils.Array.GetRandom(free) : null;
  }

  releaseBrowseSpot(person) {
    if (person.browseSpot === undefined) return;
    this.browseTaken.delete(person.browseSpot);
    person.browseSpot = undefined;
  }

  // Va a una estantería libre y mira libros un rato.
  // Los clientes después te llaman con "!"; los visitantes pasan a otra estantería o se sientan.
  goBrowse(person, visitsLeft = Phaser.Math.Between(1, 2)) {
    const spotIndex = this.freeBrowseSpot(person.browseSpot);
    this.releaseBrowseSpot(person);
    if (spotIndex === null) {
      this.afterBrowsing(person);
      return;
    }
    this.browseTaken.add(spotIndex);
    person.browseSpot = spotIndex;
    person.state = 'entering';
    this.walkTo(person, BROWSE_SPOTS[spotIndex], () => {
      person.state = 'browsing';
      person.startIdle('mirando');
      this.scene.time.delayedCall(between(BROWSE_TIME), () => {
        if (person.state !== 'browsing') return;
        if (!person.isVisitor) this.wantsToTalk(person);
        else if (visitsLeft > 1) this.goBrowse(person, visitsLeft - 1);
        else this.afterBrowsing(person);
      });
    });
  }

  // Un visitante, después de curiosear, se sienta a leer o se va
  afterBrowsing(person) {
    this.releaseBrowseSpot(person);
    if (!this.trySitDown(person)) this.leave(person);
  }

  // ---------- Conversación y servicio ----------

  wantsToTalk(person) {
    // Solo si todavía está esperando (no si ya le han atendido o se ha ido)
    if (!['entering', 'browsing'].includes(person.state)) return;
    person.state = 'wantsTalk';
    person.showAlert(true);
  }

  startTalking(person) {
    person.state = 'talking';
    person.showAlert(false);
  }

  finishTalking(person) {
    person.state = 'waitingServe';
  }

  startServing(person) {
    person.state = 'serving';
  }

  served(person) {
    person.state = 'reacting';
  }

  // Después de reaccionar se sienta (si se queda) o se marcha
  afterReaction(person) {
    if (this.atCounter === person) {
      this.atCounter = null;
      this.counterFreeAt = this.scene.time.now + between(COUNTER_REST);
    }
    this.releaseBrowseSpot(person);
    if (!(person.data.seQueda && this.trySitDown(person))) this.leave(person);
  }

  // ---------- Mesas ----------

  trySitDown(person) {
    const free = SEATS.map((_, i) => i).filter((i) => !this.seatTaken.has(i));
    if (!free.length) return false;
    const seatIndex = Phaser.Utils.Array.GetRandom(free);
    const seat = SEATS[seatIndex];
    this.seatTaken.add(seatIndex);
    person.state = 'toSeat';
    this.walkTo(person, seat.llegada, () => {
      person.walk([{ x: seat.x, y: seat.y }], () => {
        person.state = 'seated';
        person.startIdle('sentado');
        this.scene.time.delayedCall(between(SEATED_TIME), () => {
          // Se levanta: vuelve al punto libre junto a la silla y se marcha
          person.state = 'standing';
          person.walk([seat.llegada], () => {
            this.seatTaken.delete(seatIndex);
            this.leave(person);
          });
        });
      });
    });
    return true;
  }

  leave(person) {
    person.state = 'leaving';
    person.showAlert(false);
    this.walkTo(person, DOOR, () => {
      person.destroy();
      Phaser.Utils.Array.Remove(this.people, person);
    });
  }

  // ---------- Interacciones disponibles para el jugador ----------

  // Devuelve la interacción más cercana { customer, kind: 'talk' | 'serve' } o null
  nearestInteraction(player, isBehindCounter, reach) {
    let best = null;
    let bestDistance = Infinity;
    for (const person of this.people) {
      if (person.state !== 'wantsTalk' && person.state !== 'waitingServe') continue;
      const distance = Phaser.Math.Distance.Between(player.x, player.y, person.x, person.y);
      const canReach = person === this.atCounter ? isBehindCounter : distance <= reach;
      if (canReach && distance < bestDistance) {
        best = { customer: person, kind: person.state === 'wantsTalk' ? 'talk' : 'serve' };
        bestDistance = distance;
      }
    }
    return best;
  }

  // ¿Hay alguien esperando en el mostrador o llamándote con "!"?
  pending() {
    const waiting = (p) => ['wantsTalk', 'waitingServe'].includes(p.state);
    return {
      counter: Boolean(this.atCounter && waiting(this.atCounter)),
      shelves: this.people.some((p) => p !== this.atCounter && waiting(p)),
    };
  }

  update() {
    for (const person of this.people) person.update();
  }
}
