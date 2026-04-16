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
  p:      [],
  s:      [],
  cur:    0,
  tmp:    0,
  roll:   false,
  on:     false,
  forced: false
};

let sel = 2;

// ============================================================
//  AUDIO
// ============================================================
let _a = null;
function ac() {
  if (!_a) _a = new (window.AudioContext || window.webkitAudioContext)();
  return _a;
}

// Sonido realista de dados: ruido filtrado con múltiples golpes
function playDiceRoll() {
  try {
    const c = ac();
    const sr = c.sampleRate;

    // Crear buffer de ruido blanco
    const bufLen = sr * 0.4;
    const buf = c.createBuffer(1, bufLen, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    // Múltiples golpes que simulan los dados rebotando
    const hits = [0, 0.07, 0.14, 0.21, 0.29];
    hits.forEach((delay, idx) => {
      const src = c.createBufferSource();
      src.buffer = buf;

      // Filtro para sonar como plástico/madera
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + Math.random() * 600;
      bp.Q.value = 1.2;

      // Filtro de agudos para el "clic"
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 800;

      const g = c.createGain();
      const t = c.currentTime + delay;
      const vol = (0.35 - idx * 0.05) * (1 + Math.random() * 0.2);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      src.connect(bp);
      bp.connect(hp);
      hp.connect(g);
      g.connect(c.destination);
      src.start(t);
      src.stop(t + 0.1);
    });

    // Sonido de arrastre/rodado al final
    const src2 = c.createBufferSource();
    const buf2 = c.createBuffer(1, sr * 0.25, sr);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < buf2.length; i++) d2[i] = (Math.random() * 2 - 1) * 0.3;
    src2.buffer = buf2;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const g2 = c.createGain();
    const t2 = c.currentTime + 0.08;
    g2.gain.setValueAtTime(0.12, t2);
    g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.22);
    src2.connect(lp); lp.connect(g2); g2.connect(c.destination);
    src2.start(t2); src2.stop(t2 + 0.25);

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
    [261, 330, 392, 523, 659, 784, 1046].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'triangle';
      const t = c.currentTime + i * .1;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(.15, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .35);
      o.start(t); o.stop(t + .4);
    });
  } catch(e) {}
}

// ============================================================
//  FUEGOS ARTIFICIALES
// ============================================================
let fwAnim = null;

function launchFireworks() {
  const canvas = document.getElementById('fw-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const particles = [];
  const colors = ['#f4d03f','#e74c3c','#2ecc71','#3498db','#9b59b6','#e67e22','#1abc9c','#fff'];

  function burst(x, y) {
    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 / 28) * i;
      const speed = 1.5 + Math.random() * 2.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.022 + Math.random() * 0.018,
        r: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  // Crear varias explosiones
  const launches = [
    { x: 0.2, y: 0.3, delay: 0 },
    { x: 0.8, y: 0.25, delay: 200 },
    { x: 0.5, y: 0.15, delay: 400 },
    { x: 0.15, y: 0.55, delay: 600 },
    { x: 0.85, y: 0.5, delay: 800 },
    { x: 0.5, y: 0.4, delay: 1000 },
  ];

  launches.forEach(l => {
    setTimeout(() => {
      burst(canvas.width * l.x, canvas.height * l.y);
    }, l.delay);
  });

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // gravedad
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    fwAnim = requestAnimationFrame(animate);
  }

  animate();

  // Parar después de 3.5 segundos
  setTimeout(() => {
    if (fwAnim) cancelAnimationFrame(fwAnim);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 3500);
}

// ============================================================
//  DIBUJAR DADOS
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
//  PANTALLA DE REGLAS
// ============================================================
document.getElementById('rules-btn').onclick = () => {
  document.getElementById('rules-screen').style.display = 'none';
  document.getElementById('S').style.display = 'block';
};

// ============================================================
//  SETUP
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

  drawDie(document.getElementById('D1'), r6(), false);
  drawDie(document.getElementById('D2'), r6(), false);
  draw();
};

// ============================================================
//  BARRA ESPACIADORA
// ============================================================
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && G.on) {
    e.preventDefault();
    doRoll();
  }
});

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

  e1.classList.add('spinning'); e2.classList.add('spinning');
  playDiceRoll();

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
      G.forced = true;
      draw();
      showToast(`¡Te pasarías a ${total}! Seguí tirando hasta sacar un 1.`);
      setBtns(true, false);

    } else if (total === 100) {
      // ¡Ganó automáticamente!
      G.tmp += sum;
      G.s[G.cur] = 100;
      G.on = false; G.tmp = 0; G.forced = false;
      draw();
      playWin();
      setTimeout(() => {
        showM('🏆', `¡${G.p[G.cur]} ganó!`,
          '¡Llegó exactamente a 100 puntos! 🎉',
          [{ l: '🎮 Nueva partida', f: toSetup }]
        );
        launchFireworks();
      }, 350);

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
  G.s[G.cur] += G.tmp;
  G.tmp = 0; G.forced = false;
  nextTurn();
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
  document.getElementById('CN').textContent       = G.p[G.cur];
  document.getElementById('CN').style.color       = col;
  document.getElementById('PB').style.borderColor = col + '99';
  document.getElementById('RB').style.background  = col;
  document.getElementById('TV').textContent = G.tmp;
  document.getElementById('NV').textContent = Math.max(0, 100 - G.s[G.cur] - G.tmp);
  document.getElementById('FM').textContent = G.forced ? '⚠️ ¡Pasaste 100! Tirá hasta sacar un 1' : '';

  if (G.on) document.getElementById('HB').disabled = G.tmp === 0 || G.forced;

  const c = document.getElementById('SR2');
  c.innerHTML = '';
  G.p.forEach((n, i) => {
    const row = document.createElement('div');
    row.className = 'srow';
    if (i === G.cur) row.style.background = PC[i] + '22';
    row.innerHTML = `
      <span class="snm"><span class="sdot" style="background:${PC[i]}"></span>${n}</span>
      <div class="sbw"><div class="sbb" style="width:${Math.min(G.s[i], 100)}%;background:${PC[i]}"></div></div>
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

function closeM() {
  document.getElementById('MW').classList.remove('open');
  if (fwAnim) { cancelAnimationFrame(fwAnim); fwAnim = null; }
  const canvas = document.getElementById('fw-canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function toSetup() {
  closeM();
  G.on = false;
  document.getElementById('G').style.display = 'none';
  document.getElementById('S').style.display = 'block';
  mkNames(sel);
}
