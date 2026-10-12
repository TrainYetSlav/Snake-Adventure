(() => {
  'use strict';

  const { ClassicGame, DIRECTIONS } = globalThis.ClassicSnake;
  const game = new ClassicGame();
  const board = document.querySelector('#board');
  const context = board.getContext('2d');
  const cellSize = board.width / game.size;
  const stepMs = 125;
  const elements = Object.fromEntries([
    'status', 'food-count', 'length', 'pause', 'restart', 'overlay',
    'overlay-label', 'overlay-title', 'overlay-text', 'overlay-action', 'announcement',
  ].map((id) => [id, document.getElementById(id)]));
  let accumulator = 0;
  let lastTimestamp = null;
  let frameId = null;
  let lastUiState = '';

  function roundedRectangle(x, y, width, height, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
  }

  function draw() {
    context.fillStyle = '#1b2a1f';
    context.fillRect(0, 0, board.width, board.height);
    for (let y = 0; y < game.size; y += 1) {
      for (let x = 0; x < game.size; x += 1) {
        if (game.isWall({ x, y })) {
          roundedRectangle(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2, 2, '#88704f');
          context.fillStyle = '#aa8c65';
          context.fillRect(x * cellSize + 3, y * cellSize + 3, cellSize - 6, 2);
        } else {
          context.fillStyle = (x + y) % 2 === 0 ? '#1c2c20' : '#203024';
          context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
    if (game.food) {
      const x = (game.food.x + .5) * cellSize;
      const y = (game.food.y + .5) * cellSize;
      context.fillStyle = '#ef8a60';
      context.beginPath();
      context.arc(x, y + 1, cellSize * .29, 0, Math.PI * 2);
      context.fill();
      roundedRectangle(x, y - cellSize * .4, 3, 5, 1, '#c5dd84');
      context.fillStyle = '#ffd3a5';
      context.beginPath();
      context.arc(x - 2, y - 1, 2, 0, Math.PI * 2);
      context.fill();
    }
    game.snake.forEach((cell, index) => {
      const x = cell.x * cellSize;
      const y = cell.y * cellSize;
      roundedRectangle(x + 2, y + 2, cellSize - 4, cellSize - 4, 5,
        index === 0 ? '#c1f18b' : index % 2 === 0 ? '#88bd57' : '#97cf60');
      if (index === 0) {
        const facing = DIRECTIONS[game.direction];
        const perpendicular = { x: -facing.y, y: facing.x };
        for (const offset of [-1, 1]) {
          context.fillStyle = '#23341b';
          context.beginPath();
          context.arc(x + cellSize / 2 + facing.x * 5 + perpendicular.x * offset * 4,
            y + cellSize / 2 + facing.y * 5 + perpendicular.y * offset * 4, 2, 0, Math.PI * 2);
          context.fill();
        }
      }
    });
  }

  function syncUi() {
    const signature = `${game.status}:${game.foodEaten}:${game.snake.length}`;
    if (lastUiState === signature) return;
    lastUiState = signature;
    elements['food-count'].textContent = game.foodEaten;
    elements.length.textContent = game.snake.length;
    elements.status.textContent = {
      ready: 'Sẵn sàng', running: 'Đang chơi', paused: 'Tạm dừng', gameover: 'Kết thúc', won: 'Hoàn thành',
    }[game.status];
    elements.pause.disabled = !['running', 'paused'].includes(game.status);
    elements.pause.textContent = game.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
    elements.overlay.hidden = game.status === 'running';
    const messages = {
      ready: ['CLASSIC MODE', 'Sẵn sàng săn mồi?', 'Điều khiển rắn trong sân. Đụng tường hoặc thân rắn sẽ kết thúc lượt chơi.', 'Bắt đầu chơi'],
      paused: ['TẠM DỪNG', 'Nghỉ một chút.', 'Nhấn Space hoặc Tiếp tục để trở lại lượt chơi.', 'Tiếp tục'],
      gameover: ['GAME OVER', game.reason === 'wall' ? 'Bạn đã chạm tường.' : 'Bạn đã chạm thân rắn.', `Bạn ăn được ${game.foodEaten} mồi. Thử thêm một lượt nhé.`, 'Chơi lại'],
      won: ['HOÀN THÀNH', 'Bạn đã phủ kín sân!', `Ăn được ${game.foodEaten} mồi và lấp đầy mọi ô trống.`, 'Chơi lại'],
    };
    if (messages[game.status]) {
      const [label, title, text, action] = messages[game.status];
      elements['overlay-label'].textContent = label;
      elements['overlay-title'].textContent = title;
      elements['overlay-text'].textContent = text;
      elements['overlay-action'].textContent = `${action} →`;
      elements.announcement.textContent = `${title} ${text}`;
      // Keep terminal actions reachable without stealing focus during normal movement.
      if (['gameover', 'won'].includes(game.status)) elements['overlay-action'].focus({ preventScroll: true });
    }
  }

  function render() { draw(); syncUi(); }

  function stopClock() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    accumulator = 0;
    lastTimestamp = null;
  }

  function frame(timestamp) {
    frameId = null;
    if (game.status !== 'running') return;
    if (lastTimestamp !== null) {
      // Discard long stalls so resuming a frozen browser cannot instantly kill the snake.
      const elapsed = timestamp - lastTimestamp;
      if (elapsed < 500) accumulator += elapsed;
      else accumulator = 0;
    }
    lastTimestamp = timestamp;
    while (accumulator >= stepMs && game.status === 'running') {
      game.tick();
      accumulator -= stepMs;
    }
    render();
    if (game.status === 'running') frameId = requestAnimationFrame(frame);
    else stopClock();
  }

  function runClock() {
    stopClock();
    render();
    frameId = requestAnimationFrame(frame);
    board.focus({ preventScroll: true });
  }

  function restart() { game.reset(); game.start(); runClock(); }

  function togglePause() {
    game.togglePause();
    if (game.status === 'running') runClock();
    else { stopClock(); render(); }
  }

  elements['overlay-action'].addEventListener('click', () => {
    if (game.status === 'ready') { game.start(); runClock(); }
    else if (game.status === 'paused') togglePause();
    else restart();
  });
  elements.restart.addEventListener('click', restart);
  elements.pause.addEventListener('click', togglePause);
  document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('click', () => { game.queueTurn(button.dataset.direction); board.focus({ preventScroll: true }); });
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = {
      ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left',
      w: 'up', d: 'right', s: 'down', a: 'left',
    }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (direction) {
      event.preventDefault();
      if (!event.repeat) game.queueTurn(direction);
    } else if ((event.code === 'Space' || event.key === 'Escape' || event.key.toLowerCase() === 'p') && ['running', 'paused'].includes(game.status)) {
      // Let Space activate a focused button using its native browser behavior.
      if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (!event.repeat) togglePause();
    } else if (event.key === 'Enter' && game.status === 'ready' && event.target === board) {
      event.preventDefault(); game.start(); runClock();
    }
  });

  let touchStart = null;
  board.addEventListener('pointerdown', (event) => { touchStart = { x: event.clientX, y: event.clientY }; });
  board.addEventListener('pointerup', (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return;
    game.queueTurn(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  });
  board.addEventListener('pointercancel', () => { touchStart = null; });

  function pauseWhenAway() {
    if (game.status === 'running') togglePause();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseWhenAway(); });
  window.addEventListener('blur', pauseWhenAway);
  render();
})();
