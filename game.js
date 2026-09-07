// game.js - H vs M (Versão 2.0)
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

const menu = qs('#menu');
const rules = qs('#rules');
const gameScreen = qs('#gameScreen');
const canvas = qs('#board');
const ctx = canvas.getContext('2d');

let grid = 10;
let cell = canvas.width / grid;

let state = {
  gridSize: 10,
  H: { A: 10, B: 1, V: 2 },
  monsters: [],
  T: { A: 5, B: 5 },
  P: { active: false, A: 10, B: 5, value: 5 },
  D: { active: false, A: 1, B: 10, duration: 3 },
  I: { active: false, A: 5, B: 1, duration: 3 },
  wallDensity: 10,
  pacmanEdges: true,
  walls: new Set(),
  Rlimit: 0,
  R: 0,
  diagonalRemaining: 0,
  invincibleRemaining: 0
};

// Converte coordenadas A (linha) e B (coluna) para X e Y do Canvas
function toXY(A, B) {
  return { x: (B - 1) * cell, y: (A - 1) * cell };
}

function keyStr(A, B) {
  return `${A},${B}`;
}

// Atualiza a quantidade de monstros na tela de configurações
function updateMonsterInputs() {
  const count = parseInt(qs('#monsterCount').value);
  const container = qs('#monsterConfigs');
  container.innerHTML = '';

  for (let i = 1; i <= count; i++) {
    const defaultA = i <= 2 ? 1 : Math.min(grid, i * 2);
    const defaultB = i === 1 ? 1 : (i === 2 ? grid : Math.max(1, grid - i));
    
    const div = document.createElement('div');
    div.className = 'monster-row';
    div.innerHTML = `
      <strong>M${i}:</strong> 
      A <input id="m${i}_a" type="number" min="1" max="${grid}" value="${defaultA}"/> 
      B <input id="m${i}_b" type="number" min="1" max="${grid}" value="${defaultB}"/> 
      V <input id="v_m${i}" type="number" min="1" value="1"/>
    `;
    container.appendChild(div);
  }
}

// Gera paredes aleatórias sem sobrepor posições essenciais
function generateWalls() {
  state.walls.clear();
  if (state.wallDensity <= 0) return;

  const totalCells = grid * grid;
  const targetWalls = Math.floor(totalCells * (state.wallDensity / 100));

  const reserved = new Set([
    keyStr(state.H.A, state.H.B),
    keyStr(state.T.A, state.T.B)
  ]);

  state.monsters.forEach(m => reserved.add(keyStr(m.A, m.B)));
  if (state.P.active) reserved.add(keyStr(state.P.A, state.P.B));
  if (state.D.active) reserved.add(keyStr(state.D.A, state.D.B));
  if (state.I.active) reserved.add(keyStr(state.I.A, state.I.B));

  let attempts = 0;
  while (state.walls.size < targetWalls && attempts < totalCells * 3) {
    attempts++;
    const randA = Math.floor(Math.random() * grid) + 1;
    const randB = Math.floor(Math.random() * grid) + 1;
    const key = keyStr(randA, randB);

    if (!reserved.has(key)) {
      state.walls.add(key);
    }
  }
}

function isWall(A, B) {
  return state.walls.has(keyStr(A, B));
}

// Aplica movimento com suporte ao Pac-Man Wrap
function calculateNextPos(currA, currB, dA, dB) {
  let nextA = currA + (dA !== 0 ? Math.sign(dA) : 0);
  let nextB = currB + (dB !== 0 ? Math.sign(dB) : 0);

  if (state.pacmanEdges) {
    if (nextA < 1) nextA = grid;
    else if (nextA > grid) nextA = 1;

    if (nextB < 1) nextB = grid;
    else if (nextB > grid) nextB = 1;
  } else {
    nextA = Math.max(1, Math.min(grid, nextA));
    nextB = Math.max(1, Math.min(grid, nextB));
  }

  return { A: nextA, B: nextB };
}

// Desenha a interface do jogo
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = grid >= 50 ? 0.3 : (grid >= 20 ? 0.5 : 1);
  for (let i = 0; i <= grid; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(canvas.width, i * cell);
    ctx.stroke();
  }

  // Paredes / Obstáculos
  ctx.fillStyle = '#475569';
  state.walls.forEach(key => {
    const [wA, wB] = key.split(',').map(Number);
    const p = toXY(wA, wB);
    ctx.fillRect(p.x + 1, p.y + 1, cell - 2, cell - 2);
  });

  // Tesouro (T)
  let tpos = toXY(state.T.A, state.T.B);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(tpos.x + 2, tpos.y + 2, cell - 4, cell - 4);

  // Power-Up P (Velocidade)
  if (state.P.active) {
    let ppos = toXY(state.P.A, state.P.B);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(ppos.x + 3, ppos.y + 3, cell - 6, cell - 6);
  }

  // Power-Up D (Diagonal)
  if (state.D.active) {
    let dpos = toXY(state.D.A, state.D.B);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(dpos.x + 3, dpos.y + 3, cell - 6, cell - 6);
  }

  // Power-Up I (Invencibilidade)
  if (state.I.active) {
    let ipos = toXY(state.I.A, state.I.B);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(ipos.x + 3, ipos.y + 3, cell - 6, cell - 6);
  }

  // Monstros
  ctx.fillStyle = '#ef4444';
  state.monsters.forEach(m => {
    let p = toXY(m.A, m.B);
    ctx.fillRect(p.x + 2, p.y + 2, cell - 4, cell - 4);
  });

  // Herói
  ctx.fillStyle = state.invincibleRemaining > 0 ? '#ec4899' : '#3b82f6';
  let h = toXY(state.H.A, state.H.B);
  ctx.fillRect(h.x + 2, h.y + 2, cell - 4, cell - 4);

  // HUD
  qs('#turn').textContent = state.R;
  qs('#invState').textContent = state.invincibleRemaining > 0 ? `${state.invincibleRemaining} turnos` : 'Inativo';
  qs('#diagState').textContent = state.diagonalRemaining > 0 ? `${state.diagonalRemaining} turnos` : 'Inativo';
}

function moveHero(dA, dB) {
  const steps = state.H.V;

  for (let i = 0; i < steps; i++) {
    if (Math.abs(dA) !== 0 && Math.abs(dB) !== 0 && state.diagonalRemaining <= 0) {
      break;
    }

    const next = calculateNextPos(state.H.A, state.H.B, dA, dB);

    // Bloqueio de parede
    if (isWall(next.A, next.B)) break;

    state.H.A = next.A;
    state.H.B = next.B;

    // Tesouro alcançado
    if (state.H.A === state.T.A && state.H.B === state.T.B) break;

    // Coletas de Power-ups
    if (state.P.active && state.H.A === state.P.A && state.H.B === state.P.B) {
      state.H.V += state.P.value;
      state.P.active = false;
    }
    if (state.D.active && state.H.A === state.D.A && state.H.B === state.D.B) {
      state.diagonalRemaining = state.D.duration;
      state.D.active = false;
    }
    if (state.I.active && state.H.A === state.I.A && state.H.B === state.I.B) {
      state.invincibleRemaining = state.I.duration;
      state.I.active = false;
    }
  }

  state.R += 1;

  // Movimento dos monstros
  state.monsters.forEach(m => moveMonster(m));

  // Redução de duração dos efeitos
  if (state.diagonalRemaining > 0) state.diagonalRemaining--;
  if (state.invincibleRemaining > 0) state.invincibleRemaining--;

  const res = checkVictory();
  draw();

  if (res) {
    setTimeout(() => {
      alert(res);
      gameScreen.classList.add('hidden');
      menu.classList.remove('hidden');
    }, 50);
  }
}

// Distância considerando ou não o Wrap Pac-Man
function getDist(a1, b1, a2, b2) {
  let diffA = Math.abs(a1 - a2);
  let diffB = Math.abs(b1 - b2);

  if (state.pacmanEdges) {
    diffA = Math.min(diffA, grid - diffA);
    diffB = Math.min(diffB, grid - diffB);
  }

  return diffA + diffB;
}

function moveMonster(mon) {
  for (let step = 0; step < mon.V; step++) {
    let dA = state.H.A - mon.A;
    let dB = state.H.B - mon.B;

    // Tratamento de pacman para direção dos monstros
    if (state.pacmanEdges) {
      if (Math.abs(dA) > grid / 2) dA = -Math.sign(dA) * (grid - Math.abs(dA));
      if (Math.abs(dB) > grid / 2) dB = -Math.sign(dB) * (grid - Math.abs(dB));
    }

    let candidates = [
      { dA: 1, dB: 0 }, { dA: -1, dB: 0 },
      { dA: 0, dB: 1 }, { dA: 0, dB: -1 }
    ];

    if (state.diagonalRemaining > 0 && dA !== 0 && dB !== 0) {
      candidates.push({ dA: Math.sign(dA), dB: Math.sign(dB) });
    }

    let best = [];
    let bestDist = 1e9;

    for (let c of candidates) {
      const next = calculateNextPos(mon.A, mon.B, c.dA, c.dB);

      if (isWall(next.A, next.B)) continue;

      let dist = getDist(state.H.A, state.H.B, next.A, next.B);

      if (dist < bestDist) {
        bestDist = dist;
        best = [next];
      } else if (dist === bestDist) {
        best.push(next);
      }
    }

    if (best.length > 0) {
      const pick = best[Math.floor(Math.random() * best.length)];
      mon.A = pick.A;
      mon.B = pick.B;
    } else break;
  }
}

function checkVictory() {
  const isInvincible = state.invincibleRemaining > 0;

  // Checagem de captura por monstro
  for (let m of state.monsters) {
    const dist = getDist(m.A, m.B, state.H.A, state.H.B);
    if (dist <= 1 && !isInvincible) {
      return "Monstro venceu!";
    }
  }

  // Herói no tesouro
  if (state.H.A === state.T.A && state.H.B === state.T.B) {
    if (!isInvincible) {
      for (let m of state.monsters) {
        const dist = getDist(m.A, m.B, state.H.A, state.H.B);
        if (dist <= 1) return "Monstro venceu!";
      }
    }
    return "Herói venceu!";
  }

  if (state.Rlimit > 0 && state.R >= state.Rlimit) return "Empate (Limite de turnos alcançado)";
  return null;
}

// Eventos e Inicialização
qs('#mapSize').addEventListener('change', (ev) => {
  grid = parseInt(ev.target.value);
  cell = canvas.width / grid;
  qsa('.dynamic-max').forEach(inp => inp.max = grid);
  updateMonsterInputs();
});

qs('#monsterCount').addEventListener('change', updateMonsterInputs);

qs('#btnStart').addEventListener('click', () => {
  grid = parseInt(qs('#mapSize').value);
  cell = canvas.width / grid;

  state.gridSize = grid;
  state.H = { A: parseInt(qs('#h_a').value), B: parseInt(qs('#h_b').value), V: parseInt(qs('#v_h').value) };
  state.T = { A: parseInt(qs('#t_a').value), B: parseInt(qs('#t_b').value) };

  const mCount = parseInt(qs('#monsterCount').value);
  state.monsters = [];
  for (let i = 1; i <= mCount; i++) {
    state.monsters.push({
      A: parseInt(qs(`#m${i}_a`).value),
      B: parseInt(qs(`#m${i}_b`).value),
      V: parseInt(qs(`#v_m${i}`).value)
    });
  }

  state.P = {
    active: qs('#toggleP').checked,
    A: parseInt(qs('#p_a').value),
    B: parseInt(qs('#p_b').value),
    value: parseInt(qs('#p_value').value)
  };

  state.D = {
    active: qs('#toggleD').checked,
    A: parseInt(qs('#d_a').value),
    B: parseInt(qs('#d_b').value),
    duration: parseInt(qs('#d_duration').value)
  };

  state.I = {
    active: qs('#toggleI').checked,
    A: parseInt(qs('#i_a').value),
    B: parseInt(qs('#i_b').value),
    duration: parseInt(qs('#i_duration').value)
  };

  state.wallDensity = parseInt(qs('#wallDensity').value);
  state.pacmanEdges = qs('#togglePacman').checked;

  state.Rlimit = parseInt(qs('#r_limit').value);
  state.R = 0;
  state.diagonalRemaining = 0;
  state.invincibleRemaining = 0;

  generateWalls();

  menu.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  draw();
});

qs('#btnRules').addEventListener('click', () => {
  menu.classList.add('hidden');
  rules.classList.remove('hidden');
});

qs('#btnBack').addEventListener('click', () => {
  rules.classList.add('hidden');
  menu.classList.remove('hidden');
});

qs('#btnQuit').addEventListener('click', () => {
  gameScreen.classList.add('hidden');
  menu.classList.remove('hidden');
});

// Controles Teclado
window.addEventListener('keydown', (ev) => {
  if (gameScreen.classList.contains('hidden')) return;

  const key = ev.key.toLowerCase();

  if (key === 'arrowup' || key === 'w') moveHero(-1, 0);
  else if (key === 'arrowdown' || key === 's') moveHero(1, 0);
  else if (key === 'arrowleft' || key === 'a') moveHero(0, -1);
  else if (key === 'arrowright' || key === 'd') moveHero(0, 1);
  else if (key === 'q' || key === '7') moveHero(-1, -1);
  else if (key === 'e' || key === '9') moveHero(-1, 1);
  else if (key === 'z' || key === '1') moveHero(1, -1);
  else if (key === 'c' || key === '3') moveHero(1, 1);
});

// Setup Inicial
updateMonsterInputs();