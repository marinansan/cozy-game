// Busca un camino por una cuadrícula evitando obstáculos (algoritmo A*).
// Lo usa el personaje para caminar hasta el punto que tocas sin atravesar muebles.

const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export default class Pathfinder {
  // margin: espacio que ocupa el personaje alrededor de su punto central
  constructor({ width, height, cellSize, obstacles, margin }) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.walkable = [];

    for (let row = 0; row < this.rows; row++) {
      this.walkable[row] = [];
      for (let col = 0; col < this.cols; col++) {
        const cx = col * cellSize + cellSize / 2;
        const cy = row * cellSize + cellSize / 2;
        this.walkable[row][col] = !obstacles.some(
          (o) =>
            cx > o.x - margin.x &&
            cx < o.x + o.w + margin.x &&
            cy > o.y - margin.top &&
            cy < o.y + o.h + margin.bottom,
        );
      }
    }
  }

  isWalkable(col, row) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols && this.walkable[row][col];
  }

  toCell(x, y) {
    return { col: Math.floor(x / this.cellSize), row: Math.floor(y / this.cellSize) };
  }

  toPoint({ col, row }) {
    return { x: col * this.cellSize + this.cellSize / 2, y: row * this.cellSize + this.cellSize / 2 };
  }

  // Si tocas encima de un mueble, busca la casilla libre más cercana
  nearestWalkable(cell) {
    if (this.isWalkable(cell.col, cell.row)) return cell;
    for (let radius = 1; radius < Math.max(this.cols, this.rows); radius++) {
      let best = null;
      let bestDistance = Infinity;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
          const col = cell.col + dc;
          const row = cell.row + dr;
          const distance = dc * dc + dr * dr;
          if (this.isWalkable(col, row) && distance < bestDistance) {
            best = { col, row };
            bestDistance = distance;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  // Devuelve la lista de puntos por los que pasar, o null si no hay camino
  findPath(fromX, fromY, toX, toY) {
    const start = this.nearestWalkable(this.toCell(fromX, fromY));
    const goal = this.nearestWalkable(this.toCell(toX, toY));
    if (!start || !goal) return null;

    const key = (c) => c.row * this.cols + c.col;
    const heuristic = (c) => Math.hypot(c.col - goal.col, c.row - goal.row);
    const open = [start];
    const cameFrom = new Map();
    const cost = new Map([[key(start), 0]]);
    const score = new Map([[key(start), heuristic(start)]]);

    while (open.length) {
      open.sort((a, b) => score.get(key(a)) - score.get(key(b)));
      const current = open.shift();

      if (current.col === goal.col && current.row === goal.row) {
        const cells = [current];
        while (cameFrom.has(key(cells[0]))) cells.unshift(cameFrom.get(key(cells[0])));
        return this.simplify(cells).map((c) => this.toPoint(c));
      }

      for (const [dc, dr] of DIRECTIONS) {
        const next = { col: current.col + dc, row: current.row + dr };
        if (!this.isWalkable(next.col, next.row)) continue;
        // Evita "cortar esquinas" en diagonal pegado a un mueble
        if (dc && dr && (!this.isWalkable(current.col + dc, current.row) || !this.isWalkable(current.col, current.row + dr))) continue;

        const newCost = cost.get(key(current)) + Math.hypot(dc, dr);
        if (newCost < (cost.get(key(next)) ?? Infinity)) {
          cameFrom.set(key(next), current);
          cost.set(key(next), newCost);
          score.set(key(next), newCost + heuristic(next));
          if (!open.some((c) => c.col === next.col && c.row === next.row)) open.push(next);
        }
      }
    }
    return null;
  }

  // Quita los puntos intermedios que van en línea recta, para que el paseo sea más suave
  simplify(cells) {
    if (cells.length < 3) return cells.slice(1);
    const result = [];
    for (let i = 1; i < cells.length - 1; i++) {
      const prev = cells[i - 1];
      const curr = cells[i];
      const next = cells[i + 1];
      if (curr.col - prev.col !== next.col - curr.col || curr.row - prev.row !== next.row - curr.row) {
        result.push(curr);
      }
    }
    result.push(cells[cells.length - 1]);
    return result;
  }
}
