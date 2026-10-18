import Phaser from 'phaser';
import { BROWSE_SPOTS, DOOR, QUEUE_SPOTS, SEATS } from '../data/libraryLayout.js';
import { CUSTOMERS, CUSTOMERS_PER_DAY, MAX_CUSTOMERS_INSIDE } from '../data/cafe.js';
import Customer from '../objects/Customer.js';

const SPAWN_EVERY = { min: 5000, max: 9000 }; // milisegundos entre llegadas
const BROWSE_TIME = { min: 3500, max: 7000 }; // tiempo mirando libros antes de llamarte
const SEATED_TIME = { min: 20000, max: 35000 }; // tiempo sentado tomando algo

const between = ({ min, max }) => Phaser.Math.Between(min, max);

// Estados de un cliente:
// entering → (cola) inLine → wantsTalk (!) → talking → waitingServe → serving → reacting
//          → (estantería) browsing → wantsTalk (!) → …
// después de reaccionar: seated (si se queda) → leaving
export default class CustomerManager {
  constructor(scene, pathfinder) {
    this.scene = scene;
    this.pathfinder = pathfinder;
    this.customers = [];
    this.queue = []; // clientes en la cola del mostrador, el primero es quien pide
    this.browseTaken = new Set(); // índices de BROWSE_SPOTS ocupados
    this.seatTaken = new Set(); // índices de SEATS ocupados
    this.todayList = [];
    this.spawnTimer = null;
  }

  // ---------- Día ----------

  startDay() {
    // La lista del día: los clientes en orden aleatorio
    this.todayList = Phaser.Utils.Array.Shuffle([...CUSTOMERS]).slice(0, CUSTOMERS_PER_DAY);
    this.scheduleSpawn(1500);
  }

  stopDay() {
    this.spawnTimer?.remove();
    this.spawnTimer = null;
    this.todayList = [];
  }

  isEmpty() {
    return this.customers.length === 0;
  }

  moreToday() {
    return this.todayList.length > 0;
  }

  scheduleSpawn(delay = between(SPAWN_EVERY)) {
    this.spawnTimer?.remove();
    this.spawnTimer = this.scene.time.delayedCall(delay, () => this.trySpawn());
  }

  trySpawn() {
    if (!this.moreToday()) return;
    const index = this.todayList.findIndex((data) => this.hasRoomFor(data));
    if (this.customers.length < MAX_CUSTOMERS_INSIDE && index >= 0) {
      const [data] = this.todayList.splice(index, 1);
      this.spawn(data);
    }
    if (this.moreToday()) this.scheduleSpawn();
  }

  hasRoomFor(data) {
    if (data.espera === 'mostrador') return this.queue.length < QUEUE_SPOTS.length;
    return this.browseTaken.size < BROWSE_SPOTS.length;
  }

  spawn(data) {
    const customer = new Customer(this.scene, data, DOOR.x, DOOR.y);
    this.customers.push(customer);
    if (data.espera === 'mostrador') {
      this.queue.push(customer);
      this.walkToQueueSpot(customer);
    } else {
      const free = BROWSE_SPOTS.map((_, i) => i).filter((i) => !this.browseTaken.has(i));
      const spotIndex = Phaser.Utils.Array.GetRandom(free);
      this.browseTaken.add(spotIndex);
      customer.browseSpot = spotIndex;
      this.walkTo(customer, BROWSE_SPOTS[spotIndex], () => {
        customer.state = 'browsing';
        this.scene.time.delayedCall(between(BROWSE_TIME), () => this.wantsToTalk(customer));
      });
    }
  }

  walkTo(customer, target, onArrive) {
    const path = this.pathfinder.findPath(customer.x, customer.y, target.x, target.y);
    customer.walk(path, onArrive);
  }

  // ---------- Cola del mostrador ----------

  walkToQueueSpot(customer) {
    const position = this.queue.indexOf(customer);
    this.walkTo(customer, QUEUE_SPOTS[position], () => {
      if (this.queue[0] === customer) this.wantsToTalk(customer);
      else customer.state = 'inLine';
    });
  }

  leaveQueue(customer) {
    const index = this.queue.indexOf(customer);
    if (index < 0) return;
    this.queue.splice(index, 1);
    // Los que esperaban avanzan un puesto
    for (const other of this.queue) {
      if (other.state === 'inLine' || other.state === 'entering') {
        other.state = 'entering';
        this.walkToQueueSpot(other);
      }
    }
  }

  // ---------- Conversación y servicio ----------

  wantsToTalk(customer) {
    // Solo si todavía está esperando (no si ya le han atendido o se ha ido)
    if (!['entering', 'inLine', 'browsing'].includes(customer.state)) return;
    customer.state = 'wantsTalk';
    customer.showAlert(true);
  }

  // Lo llama la escena al pulsar "Hablar"; onFinished cuando ha leído todo el pedido
  startTalking(customer) {
    customer.state = 'talking';
    customer.showAlert(false);
  }

  finishTalking(customer) {
    customer.state = 'waitingServe';
  }

  startServing(customer) {
    customer.state = 'serving';
  }

  // Después de servir reacciona; cuando termina deja la cola y se sienta o se va
  served(customer) {
    customer.state = 'reacting';
  }

  afterReaction(customer) {
    this.leaveQueue(customer);
    if (customer.browseSpot !== undefined) {
      this.browseTaken.delete(customer.browseSpot);
      customer.browseSpot = undefined;
    }
    const free = SEATS.map((_, i) => i).filter((i) => !this.seatTaken.has(i));
    if (customer.data.seQueda && free.length) {
      this.sitDown(customer, Phaser.Utils.Array.GetRandom(free));
    } else {
      this.leave(customer);
    }
  }

  sitDown(customer, seatIndex) {
    const seat = SEATS[seatIndex];
    this.seatTaken.add(seatIndex);
    customer.seat = seatIndex;
    customer.state = 'toSeat';
    this.walkTo(customer, seat.llegada, () => {
      customer.walk([{ x: seat.x, y: seat.y }], () => {
        customer.state = 'seated';
        this.scene.time.delayedCall(between(SEATED_TIME), () => {
          // Se levanta: vuelve al punto libre junto a la silla y se marcha
          customer.walk([seat.llegada], () => {
            this.seatTaken.delete(seatIndex);
            this.leave(customer);
          });
        });
      });
    });
  }

  leave(customer) {
    customer.state = 'leaving';
    customer.showAlert(false);
    this.walkTo(customer, DOOR, () => {
      customer.destroy();
      Phaser.Utils.Array.Remove(this.customers, customer);
    });
  }

  // ---------- Interacciones disponibles para el jugador ----------

  // Devuelve la interacción más cercana { customer, kind: 'talk' | 'serve' } o null
  nearestInteraction(player, isBehindCounter, reach) {
    let best = null;
    let bestDistance = Infinity;
    for (const customer of this.customers) {
      if (customer.state !== 'wantsTalk' && customer.state !== 'waitingServe') continue;
      const atCounter = this.queue[0] === customer;
      const distance = Phaser.Math.Distance.Between(player.x, player.y, customer.x, customer.y);
      const canReach = atCounter ? isBehindCounter : distance <= reach;
      if (canReach && distance < bestDistance) {
        best = { customer, kind: customer.state === 'wantsTalk' ? 'talk' : 'serve' };
        bestDistance = distance;
      }
    }
    return best;
  }

  // ¿Hay alguien esperando en el mostrador o llamándote con "!"?
  pending() {
    return {
      counter: this.queue[0] && ['wantsTalk', 'waitingServe'].includes(this.queue[0].state),
      shelves: this.customers.some((c) => !this.queue.includes(c) && ['wantsTalk', 'waitingServe'].includes(c.state)),
    };
  }

  update() {
    for (const customer of this.customers) customer.update();
  }
}
