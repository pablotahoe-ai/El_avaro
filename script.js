// ============================================================
//  CONSTANTES
// ============================================================
const PIPS = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const ICO = ['🔴','🔵','🟡','🟢','🟠','🟣'];
const DN  = ['Jugador 1','Jugador 2','Jugador 3','Jugador 4','Jugador 5','Jugador 6'];
const PC  = ['#c0392b','#2471a3','#b7950b','#1e8449','#ca6f1e','#7d3c98'];

// ============================================================
//  ESTADO GLOBAL
// ============================================================
const G = {
  p:      [],     // nombres de jugadores
  s:      [],     // puntajes totales
  cur:    0,      // índice jugador actual
  tmp:    0,      // puntaje temporal del turno
  roll:   false,  // animación en curso
  on:     false,  // partida activa
  forced: false   // obligado a seguir tirando (se pasó de 100)
};

let sel = 2; // cantidad de jugadores seleccionados

// ============================================================
//  AUDIO (Web Audio API, sin archivos externos)
// ============================================================
let _a = null;
function ac() {
  if (!_a) _a = new (window.AudioContext || window.webkitAudioContext)();
  return _a;
}

function playClack() {
  try {
    const c = ac();
    [0, 80, 150].forEach(d => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      const t = c.currentTime + d / 1000;
      o.frequency.setValueAtTime(160 + Math.random() * 210, t);
      o.frequency.exponentialRampToValueAtTime(80, t + .09);
      g.gain.setValueAtTime(.11, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .09);
      o.start(t); o.stop(t + .1);
    });
  } catch(e) {}
}

function playBad() {
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, c.currentTime + .5);
    g.gain.setValueAtTime(.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .5);
    o.start(); o.stop(c.currentTime + .55);
  } catch(e) {}
}

function playWin() {
  try {
    const c = ac();
    [261, 330, 392, 523, 659, 784].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'triangle';
      const t = c.currentTime + i * .1;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(.14, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .28);
      o.start(t); o.stop(t + .3);
    });
  } catch(e) {}
}

// ============================================================
//  DIBUJADO DE DADOS
// ============================================================
function drawDie(el, v, red) {
  el.innerHTML = '';
  const L = PIPS[v] || [];
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.className = 'pc';
    if (L.includes(i)) {
      const p = document.createElement('div');
      p.className = red ? 'pip r' : 'pip';
      c.appendChild(p);
    }
    el.appendChild(c);
  }
}

// ============================================================
//  SETUP — PANTALLA INICIAL
// ============================================================
function mkNames(n) {
  const w = document.getElementById('NW');
  w.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const r = document.createElement('div');
    r.className = 'nr';
    r.innerHTML = `<span class="em">${ICO[i]}</span><input id="nm${i}" type="text" placeholder="${DN[i]}" maxlength="14">`;
    w.appendChild(r);
  }
}
mkNames(2);

document.querySelectorAll('.cb').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.cb').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    sel = +b.dataset.c;
    mkNames(sel);
  };
});

document.getElementById('GO').onclick = () => {
  const names = [];
  for (let i = 0; i < sel; i++) {
    const v = document.getElementById('nm' + i).value.trim();
    names.push(v || DN[i]);
  }
  G.p = names;
  G.s = new Array(sel).fill(0);
  G.cur = 0; G.tmp = 0; G.on = true; G.roll = false; G.forced = false;

  document.getElementById('S').style.display = 'none';
  document.getElementById('G').style.display = 'block';

  // Dados con valores iniciales
  drawDie(document.getElementById('D1'), r6(), false);
  drawDie(document.getElementById('D2'), r6(), false);
  draw();
};

// ============================================================
//  EVENTOS DE JUEGO
// ============================================================
document.getElementById('DT').onclick  = doRoll;
document.getElementById('RB').onclick  = doRoll;
document.getElementById('HB').onclick  = doHold;
document.getElementById('RST').onclick = toSetup;

// ============================================================
//  TIRAR DADOS
// ============================================================
function doRoll() {
  if (!G.on || G.roll) return;
  G.roll = true;
  setBtns(false, false);
  document.getElementById('DT').classList.add('disabled');

  const d1 = r6(), d2 = r6();
  const e1 = document.getElementById('D1'), e2 = document.getElementById('D2');

  // Animación de giro con valores aleatorios
  e1.classList.add('spinning'); e2.classList.add('spinning');
  playClack();

  let n = 0;
  const iv = setInterval(() => {
    drawDie(e1, r6(), false);
    drawDie(e2, r6(), false);
    if (++n >= 6) clearInterval(iv);
  }, 80);

  setTimeout(() => {
    e1.classList.remove('spinning');
    e2.classList.remove('spinning');
    drawDie(e1, d1, d1 === 1);
    drawDie(e2, d2, d2 === 1);
    document.getElementById('DT').classList.remove('disabled');
    G.roll = false;
    processRoll(d1, d2);
  }, 560);
}

// ============================================================
//  PROCESAR RESULTADO
// ============================================================
function processRoll(d1, d2) {
  const both = d1 === 1 && d2 === 1;
  const one  = (d1 === 1) !== (d2 === 1);
  const e1   = document.getElementById('D1');
  const e2   = document.getElementById('D2');

  if (both) {
    // Doble 1 → pierde todo, popup
    playBad();
    e1.classList.add('shaking'); e2.classList.add('shaking');
    setTimeout(() => { e1.classList.remove('shaking'); e2.classList.remove('shaking'); }, 600);
    G.s[G.cur] = 0; G.tmp = 0; G.forced = false;
    draw();
    showM('💀', '¡Doble 1!',
      `${G.p[G.cur]} vuelve a cero y pasa el turno.`,
      [{ l: 'Entendido', f: nextTurn }]
    );

  } else if (one) {
    // Un solo 1 → pierde turno, sin popup
    playBad();
    const bad = d1 === 1 ? e1 : e2;
    bad.classList.add('shaking');
    setTimeout(() => bad.classList.remove('shaking'), 600);
    G.tmp = 0; G.forced = false;
    draw();
    showToast(`¡Salió un 1! Turno de ${G.p[(G.cur + 1) % G.p.length]}`);
    setTimeout(nextTurn, 1600);

  } else {
    const sum   = d1 + d2;
    const total = G.s[G.cur] + G.tmp + sum;

    if (total > 100) {
      // Se pasó de 100 → obligado a seguir tirando hasta sacar un 1
      G.forced = true;
      draw();
      showToast(`¡Te pasarías a ${total}! Seguí tirando hasta sacar un 1.`);
      setBtns(true, false);
    } else {
      G.tmp += sum;
      draw();
      setBtns(true, G.tmp > 0 && !G.forced);
    }
  }
}

// ============================================================
//  PLANTARSE
// ============================================================
function doHold() {
  if (!G.on || G.roll || G.forced) return;
  const ns = G.s[G.cur] + G.tmp;

  if (ns === 100) {
    G.s[G.cur] = 100; G.on = false; G.tmp = 0; G.forced = false;
    draw();
    playWin();
    setTimeout(() => {
      showM('🏆', `¡${G.p[G.cur]} ganó!`,
        '¡Llegó exactamente a 100 puntos! 🎉',
        [{ l: '🎮 Nueva partida', f: toSetup }]
      );
    }, 400);
  } else {
    G.s[G.cur] += G.tmp;
    G.tmp = 0; G.forced = false;
    nextTurn();
  }
}

// ============================================================
//  SIGUIENTE TURNO
// ============================================================
function nextTurn() {
  closeM();
  G.cur    = (G.cur + 1) % G.p.length;
  G.tmp    = 0;
  G.forced = false;
  setBtns(true, false);
  draw();
}

// ============================================================
//  ACTUALIZAR INTERFAZ
// ============================================================
function draw() {
  const col = PC[G.cur];
  document.getElementById('CN').textContent  = G.p[G.cur];
  document.getElementById('CN').style.color  = col;
  document.getElementById('PB').style.borderColor = col + '99';
  document.getElementById('RB').style.background  = col;
  document.getElementById('TV').textContent  = G.tmp;
  document.getElementById('NV').textContent  = Math.max(0, 100 - G.s[G.cur] - G.tmp);
  document.getElementById('FM').textContent  = G.forced ? '⚠️ ¡Pasaste 100! Tirá hasta sacar un 1' : '';

  if (G.on) document.getElementById('HB').disabled = G.tmp === 0 || G.forced;

  // Scoreboard
  const c = document.getElementById('SR2');
  c.innerHTML = '';
  G.p.forEach((n, i) => {
    const row = document.createElement('div');
    row.className = 'srow';
    if (i === G.cur) row.style.background = PC[i] + '22';
    row.innerHTML = `
      <span class="snm">
        <span class="sdot" style="background:${PC[i]}"></span>${n}
      </span>
      <div class="sbw">
        <div class="sbb" style="width:${Math.min(G.s[i], 100)}%;background:${PC[i]}"></div>
      </div>
      <span class="ssc">${G.s[i]}</span>
    `;
    c.appendChild(row);
  });
}

// ============================================================
//  HELPERS
// ============================================================
function setBtns(r, h) {
  document.getElementById('RB').disabled = !r;
  document.getElementById('HB').disabled = !h;
}

function r6() { return Math.ceil(Math.random() * 6); }

let tTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  if (tTimer) clearTimeout(tTimer);
  tTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function showM(ico, ttl, txt, btns) {
  document.getElementById('MI').textContent = ico;
  document.getElementById('MT').textContent = ttl;
  document.getElementById('MX').textContent = txt;
  const w = document.getElementById('MB'); w.innerHTML = '';
  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.className   = 'mp';
    btn.textContent = b.l;
    btn.onclick     = b.f;
    w.appendChild(btn);
  });
  document.getElementById('MW').classList.add('open');
}

function closeM() { document.getElementById('MW').classList.remove('open'); }

function toSetup() {
  closeM();
  G.on = false;
  document.getElementById('G').style.display = 'none';
  document.getElementById('S').style.display = 'block';
  mkNames(sel);
}
