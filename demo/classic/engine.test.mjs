import test from 'node:test';
import assert from 'node:assert/strict';
import './engine.js';

const { ClassicGame } = globalThis.ClassicSnake;

test('the border is a continuous wall around all four sides', () => {
  const game = new ClassicGame();
  for (let coordinate = 0; coordinate < game.size; coordinate += 1) {
    assert.equal(game.isWall({ x: coordinate, y: 0 }), true);
    assert.equal(game.isWall({ x: coordinate, y: game.size - 1 }), true);
    assert.equal(game.isWall({ x: 0, y: coordinate }), true);
    assert.equal(game.isWall({ x: game.size - 1, y: coordinate }), true);
  }
  assert.equal(game.isWall({ x: 1, y: 1 }), false);
  assert.equal(game.isWall({ x: 22, y: 22 }), false);
});

test('eating grows the snake and places new food outside walls and body', () => {
  const game = new ClassicGame({ random: () => .5 });
  game.start();
  for (let tick = 0; tick < 4; tick += 1) game.tick();
  assert.equal(game.foodEaten, 1);
  assert.equal(game.snake.length, 4);
  assert.equal(game.isWall(game.food), false);
  assert.equal(game.snake.some((cell) => cell.x === game.food.x && cell.y === game.food.y), false);
});

test('hitting each wall ends the run without moving into the wall', () => {
  for (const [direction, head] of [
    ['right', { x: 22, y: 12 }], ['left', { x: 1, y: 12 }],
    ['up', { x: 12, y: 1 }], ['down', { x: 12, y: 22 }],
  ]) {
    const game = new ClassicGame();
    game.snake = [head];
    game.direction = direction;
    game.start();
    game.tick();
    assert.equal(game.status, 'gameover');
    assert.equal(game.reason, 'wall');
    assert.deepEqual(game.snake[0], head);
  }
});

test('rapid turns preserve order and never allow a reverse direction', () => {
  const game = new ClassicGame();
  game.start();
  assert.equal(game.queueTurn('left'), false);
  assert.equal(game.queueTurn('up'), true);
  assert.equal(game.queueTurn('down'), false);
  assert.equal(game.queueTurn('left'), true);
  assert.equal(game.queueTurn('down'), false);
  game.tick();
  assert.equal(game.direction, 'up');
  game.tick();
  assert.equal(game.direction, 'left');
  assert.equal(game.status, 'running');
});

test('body collisions end the run while moving into a departing tail remains legal', () => {
  const game = new ClassicGame();
  game.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }];
  game.direction = 'right';
  game.start();
  game.tick();
  assert.equal(game.status, 'running');
  assert.deepEqual(game.snake[0], { x: 6, y: 5 });

  const collision = new ClassicGame();
  collision.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 5 }];
  collision.direction = 'right';
  collision.start();
  collision.tick();
  assert.equal(collision.status, 'gameover');
  assert.equal(collision.reason, 'body');
});

test('pause freezes movement and restart restores the initial state', () => {
  const game = new ClassicGame();
  game.start();
  game.tick();
  game.queueTurn('up');
  game.togglePause();
  const snake = structuredClone(game.snake);
  game.tick();
  assert.deepEqual(game.snake, snake);
  assert.equal(game.queueTurn('left'), false);
  assert.deepEqual(game.turns, []);
  game.togglePause();
  game.tick();
  assert.notDeepEqual(game.snake, snake);
  game.reset();
  assert.equal(game.status, 'ready');
  assert.equal(game.foodEaten, 0);
  assert.equal(game.snake.length, 3);
});

test('filling the last free cell wins instead of looping forever while placing food', () => {
  const game = new ClassicGame({ size: 8 });
  game.snake = [{ x: 5, y: 1 }];
  for (let y = 1; y <= 6; y += 1) {
    for (let x = 1; x <= 6; x += 1) {
      if (y === 1 && (x === 5 || x === 6)) continue;
      game.snake.push({ x, y });
    }
  }
  game.food = { x: 6, y: 1 };
  game.start();
  game.tick();
  assert.equal(game.status, 'won');
  assert.equal(game.food, null);
  assert.equal(game.snake.length, 36);
});
