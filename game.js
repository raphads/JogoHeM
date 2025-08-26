// game.js - Versão corrigida H vs M
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

const menu = qs('#menu');
const rules = qs('#rules');
const gameScreen = qs('#gameScreen');
const canvas = qs('#board');
const ctx = canvas.getContext('2d');

let grid = 10;
let cell = canvas.width / grid;

// estado do jogo
let state = {
  H: { A:10, B:1, V:2 },
  M1: { A:1, B:1, V:1 },
  M2: { A:1, B:10, V:1 },
  T:  { A:5, B:5 },
  P:  { active:false, A:10, B:5, value:5 },
  D:  { active:false, A:1, B:10, duration:3 },
  Rlimit: 0,
  R: 0,
  diagonalRemaining: 0
};

function toXY(A,B){
  return { x: (B-1)*cell, y: (A-1)*cell };
}

qs('#btnRules').onclick = () => { menu.classList.add('hidden'); rules.classList.remove('hidden'); };
qs('#btnBack').onclick = () => { rules.classList.add('hidden'); menu.classList.remove('hidden'); };
qs('#btnQuit').onclick = () => { gameScreen.classList.add('hidden'); menu.classList.remove('hidden'); };

qs('#toggleP').onchange = e => qs('#powerSettings').style.display = e.target.checked ? 'block' : 'none';

qs('#btnStart').onclick = () => {
  // read inputs
  state.H.A = Number(qs('#h_a').value);
  state.H.B = Number(qs('#h_b').value);
  state.H.V = Number(qs('#v_h').value);

  state.M1.A = Number(qs('#m1_a').value);
  state.M1.B = Number(qs('#m1_b').value);
  state.M1.V = Number(qs('#v_m1').value);

  state.M2.A = Number(qs('#m2_a').value);
  state.M2.B = Number(qs('#m2_b').value);
  state.M2.V = Number(qs('#v_m2').value);

  state.T.A = Number(qs('#t_a').value);
  state.T.B = Number(qs('#t_b').value);

  state.Rlimit = Number(qs('#r_limit').value);

  // power ups
  let useP = qs('#toggleP').checked;
  let useD = qs('#toggleD').checked;
  state.P.active = useP;
  state.D.active = useD;
  if(useP){
    state.P.A = Number(qs('#p_a').value);
    state.P.B = Number(qs('#p_b').value);
    state.P.value = Number(qs('#p_value').value);
  }
  if(useD){
    state.D.A = Number(qs('#d_a').value);
    state.D.B = Number(qs('#d_b').value);
    state.D.duration = Number(qs('#d_duration').value);
  }

  state.R = 0;
  state.diagonalRemaining = 0;

  menu.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  draw();
};

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // grid
  ctx.strokeStyle = '#ccc';
  for(let i=0;i<=grid;i++){
    ctx.beginPath();
    ctx.moveTo(i*cell,0);
    ctx.lineTo(i*cell,canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,i*cell);
    ctx.lineTo(canvas.width,i*cell);
    ctx.stroke();
  }

  // T
  let tpos = toXY(state.T.A,state.T.B);
  ctx.fillStyle = 'gold';
  ctx.fillRect(tpos.x+2, tpos.y+2, cell-4, cell-4);

  // P
  if(state.P.active){
    let ppos = toXY(state.P.A,state.P.B);
    ctx.fillStyle = 'limegreen';
    ctx.fillRect(ppos.x+6, ppos.y+6, cell-12, cell-12);
  }

  // D
  if(state.D.active){
    let dpos = toXY(state.D.A,state.D.B);
    ctx.fillStyle = 'cyan';
    ctx.fillRect(dpos.x+6, dpos.y+6, cell-12, cell-12);
  }

  // Monstros
  ctx.fillStyle = 'crimson';
  [state.M1, state.M2].forEach(m=>{
    let p = toXY(m.A,m.B);
    ctx.fillRect(p.x+4, p.y+4, cell-8, cell-8);
  });

  // Heroi
  ctx.fillStyle = 'royalblue';
  let h = toXY(state.H.A,state.H.B);
  ctx.fillRect(h.x+4, h.y+4, cell-8, cell-8);

  qs('#turn').textContent = state.R;
}

// move H de acordo com V
function moveHero(dA, dB){
  // calcula passos = V
  const steps = state.H.V;
  for(let i=0;i<steps;i++){
    let nextA = state.H.A + (dA !== 0 ? Math.sign(dA) : 0);
    let nextB = state.H.B + (dB !== 0 ? Math.sign(dB) : 0);

    // diagonal check
    if(Math.abs(dA) !== 0 && Math.abs(dB) !== 0 && state.diagonalRemaining <= 0) break;

    state.H.A = Math.max(1, Math.min(10, nextA));
    state.H.B = Math.max(1, Math.min(10, nextB));

    // pickup P
    if(state.P.active && state.H.A === state.P.A && state.H.B === state.P.B){
      state.H.V += state.P.value;
      state.P.active = false;
    }
    // pickup D
    if(state.D.active && state.H.A === state.D.A && state.H.B === state.D.B){
      state.diagonalRemaining = state.D.duration;
      state.D.active = false;
    }
  }

  // M move
  state.R += 1;
  moveMonster(state.M1);
  moveMonster(state.M2);

  if(state.diagonalRemaining > 0) state.diagonalRemaining--;

  const res = checkVictory();
  draw();
  if(res){
    setTimeout(()=>{ alert(res); gameScreen.classList.add('hidden'); menu.classList.remove('hidden'); }, 40);
  }
}

// monster movement (igual)
function moveMonster(mon){
  for(let step=0;step<mon.V;step++){
    let dA = state.H.A - mon.A;
    let dB = state.H.B - mon.B;
    const absA = Math.abs(dA), absB = Math.abs(dB);

    let options = [];
    if(dA > 0) options.push({A: mon.A+1, B: mon.B});
    if(dA < 0) options.push({A: mon.A-1, B: mon.B});
    if(dB > 0) options.push({A: mon.A, B: mon.B+1});
    if(dB < 0) options.push({A: mon.A, B: mon.B-1});
    if(state.diagonalRemaining > 0 && dA !== 0 && dB !== 0){
      options.push({A: mon.A + Math.sign(dA), B: mon.B + Math.sign(dB)});
    }

    let best = [];
    let bestDist = 1e9;
    for(let opt of options){
      let a = Math.max(1, Math.min(10, opt.A));
      let b = Math.max(1, Math.min(10, opt.B));
      let dist = Math.abs(state.H.A - a) + Math.abs(state.H.B - b);
      if(dist < bestDist){
        bestDist = dist;
        best = [{A:a,B:b}];
      } else if(dist === bestDist){
        best.push({A:a,B:b});
      }
    }

    if(best.length > 0){
      const pick = best[Math.floor(Math.random()*best.length)];
      mon.A = pick.A;
      mon.B = pick.B;
    } else break;
  }
}

// check victory
function checkVictory(){
  for(let m of [state.M1, state.M2]){
    const dist = Math.abs(m.A - state.H.A) + Math.abs(m.B - state.H.B);
    if(dist <= 1) return "Monstro venceu!";
  }
  if(state.H.A === state.T.A && state.H.B === state.T.B){
    return "Herói venceu!";
  }
  if(state.Rlimit > 0 && state.R > state.Rlimit) return "Empate (R limite)";
  return null;
}

// keyboard
window.addEventListener('keydown', (ev)=>{
  if(menu.classList.contains('hidden') && gameScreen.classList.contains('hidden')) return;
  if(gameScreen.classList.contains('hidden')) return;

  const key = ev.key.toLowerCase();
  if(key === 'arrowup' || key === 'w'){ moveHero(-1,0); }
  else if(key === 'arrowdown' || key === 's'){ moveHero(1,0); }
  else if(key === 'arrowleft' || key === 'a'){ moveHero(0,-1); }
  else if(key === 'arrowright' || key === 'd'){ moveHero(0,1); }
});

draw();
