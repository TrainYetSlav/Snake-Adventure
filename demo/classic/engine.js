(() => {
  'use strict';

  const DIRECTIONS = Object.freeze({
    up: { x: 0, y: -1 }, right: { x: 1, y: 0 },
    down: { x: 0, y: 1 }, left: { x: -1, y: 0 },
  });
  const sameCell = (first, second) => first.x === second.x && first.y === second.y;

  class ClassicGame {
    constructor({ size = 24, random = Math.random } = {}) {
      if (!Number.isInteger(size) || size < 8) throw new Error('Board size must be an integer of at least 8.');
      this.size = size;
      this.random = random;
      this.reset();
    }

    reset() {
      const middle = Math.floor(this.size / 2);
      this.snake = [{ x: middle, y: middle }, { x: middle - 1, y: middle }, { x: middle - 2, y: middle }];
      this.direction = 'right';
      this.turns = [];
      this.foodEaten = 0;
      this.reason = null;
      this.status = 'ready';
      // Place the first food directly ahead to make the growth rule easy to try.
      this.food = { x: Math.min(middle + 4, this.size - 2), y: middle };
    }

    start() {
      if (this.status === 'ready') this.status = 'running';
    }

    togglePause() {
      if (this.status === 'running') this.status = 'paused';
      else if (this.status === 'paused') this.status = 'running';
      this.turns = [];
    }

    queueTurn(direction) {
      if (this.status !== 'running' || !DIRECTIONS[direction] || this.turns.length >= 2) return false;
      const previous = DIRECTIONS[this.turns.at(-1) ?? this.direction];
      const next = DIRECTIONS[direction];
      if ((previous.x === next.x && previous.y === next.y) || (previous.x === -next.x && previous.y === -next.y)) return false;
      this.turns.push(direction);
      return true;
    }

    isWall(cell) {
      return cell.x <= 0 || cell.y <= 0 || cell.x >= this.size - 1 || cell.y >= this.size - 1;
    }

    spawnFood() {
      const occupied = new Set(this.snake.map((cell) => `${cell.x},${cell.y}`));
      const available = [];
      for (let y = 1; y < this.size - 1; y += 1) {
        for (let x = 1; x < this.size - 1; x += 1) {
          if (!occupied.has(`${x},${y}`)) available.push({ x, y });
        }
      }
      if (!available.length) return null;
      return available[Math.min(available.length - 1, Math.max(0, Math.floor(this.random() * available.length)))];
    }

    tick() {
      if (this.status !== 'running') return;
      if (this.turns.length) this.direction = this.turns.shift();
      const vector = DIRECTIONS[this.direction];
      const head = { x: this.snake[0].x + vector.x, y: this.snake[0].y + vector.y };
      const eating = this.food !== null && sameCell(head, this.food);

      // The last tail cell is free on this tick unless the snake grows.
      const occupiedBody = eating ? this.snake : this.snake.slice(0, -1);
      if (this.isWall(head) || occupiedBody.some((cell) => sameCell(cell, head))) {
        this.status = 'gameover';
        this.reason = this.isWall(head) ? 'wall' : 'body';
        this.turns = [];
        return;
      }
      this.snake.unshift(head);
      if (eating) {
        this.foodEaten += 1;
        this.food = this.spawnFood();
        if (this.food === null) this.status = 'won';
      } else {
        this.snake.pop();
      }
    }
  }

  // A small browser namespace also lets Node tests exercise the same engine.
  globalThis.ClassicSnake = Object.freeze({ ClassicGame, DIRECTIONS });
})();
