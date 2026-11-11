import { cat } from './cat.js';

// Whack-a-Mouse — an 8-bit style game. The cat's paw is the hammer.
// Everything is drawn on a 256x240 canvas (NES resolution) and scaled up with crisp pixels.

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const W = 256;
const BASE_H = 240;
let H = BASE_H; // grows taller in portrait full screen so the game fills a phone
const GAME_LENGTH = 60; // seconds
const FONT = '"Press Start 2P", monospace';

// NES-flavoured palette
const C = {
  black: '#000000',
  white: '#fcfcfc',
  lgray: '#bcbcbc',
  gray: '#7c7c7c',
  dgray: '#4c4c4c',
  pink: '#f8b8d0',
  rose: '#e45c8c',
  gold: '#f8b800',
  dgold: '#ac7c00',
  orange: '#fca044',
  dorange: '#c84c0c',
  cream: '#fce0a8',
  green: '#00a800',
  lgreen: '#58d854',
  dgreen: '#005800',
  dirt: '#ac7c00',
  ddirt: '#503000',
  red: '#e40058',
  sky: '#3cbcfc',
};

// ---------- sprites (16x16, drawn at 2x). Left halves get mirrored. ----------
const mirror = (half) => half.map((r) => r + [...r].reverse().join(''));

const MOUSE_HALF = [
  '.kkk....',
  'kpppk...',
  'kpppkkkk',
  'kppkgggg',
  '.kkggggg',
  '.kgggggg',
  '.kggkwgg',
  '.kggkkgg',
  '.kgggggg',
  'ww.kgggp',
  '..wkgggg',
  '.kgggggk',
  '.kgggggw',
  '.kgggggg',
  'kggggggg',
  'kggggggg',
];
const DAZED_HALF = MOUSE_HALF.map((r, i) => ({ 5: '.kggkgkg', 6: '.kgggkgg', 7: '.kggkgkg' })[i] ?? r);

const MOUSE = mirror(MOUSE_HALF);
const MOUSE_DAZED = mirror(DAZED_HALF);
const GREY_PAL = { k: C.black, g: C.lgray, p: C.pink, w: C.white };
const GOLD_PAL = { k: C.ddirt, g: C.gold, p: C.rose, w: C.white };

function drawSprite(rows, x, y, scale, pal) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const col = pal[row[c]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

// ---------- pixel primitives ----------
function disc(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

const halfWidth = (rx, ry, y) => (Math.abs(y) > ry ? -1 : Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry))));

function ellipse(cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = halfWidth(rx, ry, y);
    ctx.fillRect(cx - w, cy + y, w * 2, 1);
  }
}

// lower half of an elliptical ring (the hole's front lip)
function lowerRing(cx, cy, rx, ry, thick, color) {
  ctx.fillStyle = color;
  for (let y = 0; y <= ry + thick; y++) {
    const wo = halfWidth(rx + thick, ry + thick, y);
    const wi = halfWidth(rx, ry, y);
    if (wi < 0) {
      ctx.fillRect(cx - wo, cy + y, wo * 2, 1);
    } else {
      ctx.fillRect(cx - wo, cy + y, wo - wi, 1);
      ctx.fillRect(cx + wi, cy + y, wo - wi, 1);
    }
  }
}

function text(str, x, y, color, { size = 8, align = 'left', shadow = C.black } = {}) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(str, x + 1, y + 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- sound (tiny square-wave synth) ----------
let actx = null;
let muted = false;

function tone(freq, dur, { type = 'square', vol = 0.06, slide, delay = 0 } = {}) {
  if (muted) return;
  try {
    actx ??= new AudioContext();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}

const arp = (notes, step, opts) => notes.forEach((f, i) => tone(f, step * 0.95, { ...opts, delay: i * step }));

const sfx = {
  pop: () => tone(500, 0.06, { type: 'triangle', vol: 0.08, slide: 900 }),
  bonk: () => {
    tone(320, 0.12, { vol: 0.08, slide: 70 });
    tone(1900, 0.07, { vol: 0.03, slide: 2600, delay: 0.05 });
  },
  gold: () => arp([784, 988, 1175, 1568], 0.06),
  whiff: () => tone(220, 0.06, { type: 'triangle', vol: 0.06, slide: 110 }),
  start: () => arp([523, 659, 784, 1047, 784, 1047], 0.09),
  tick: () => tone(1000, 0.04, { vol: 0.04 }),
  over: () => arp([784, 659, 523, 392, 330], 0.16, { type: 'triangle', vol: 0.1 }),
};

// ---------- world ----------
const HOLE_RX = 22;
const HOLE_RY = 7;
const holes = [];
for (let r = 0; r < 3; r++) {
  for (const x of [56, 128, 200]) holes.push({ x, y: 0, row: r, state: 'empty', rise: 0, t: 0, gold: false });
}
// spread the 3 rows of holes over the playing field (below the 28px score bar)
function layoutHoles() {
  const rows = H === BASE_H ? [100, 152, 204] : [0.3, 0.58, 0.86].map((f) => Math.round(28 + (H - 28) * f));
  for (const h of holes) h.y = rows[h.row];
}
layoutHoles();

// stable grass speckles (seeded so they don't shimmer)
const MAX_H = 440;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tufts = Array.from({ length: 90 }, () => ({ x: Math.floor(rand() * W), y: 30 + Math.floor(rand() * (MAX_H - 30)) }));
const flowers = Array.from({ length: 10 }, () => ({ x: Math.floor(rand() * W), y: 34 + Math.floor(rand() * (MAX_H - 40)), c: rand() < 0.5 ? C.white : C.gold }));

const paw = { x: W / 2, y: H / 2, visible: false, down: 0 };
let state = 'loading'; // loading | title | playing | over
let score = 0;
let combo = 0;
let timeLeft = GAME_LENGTH;
let spawnTimer = 0;
let lastTick = 0;
let overAt = 0;
let shake = 0;
let popups = [];
let hiScore = 0;
let newHi = false;
let clock = 0;

try {
  hiScore = Number(localStorage.getItem('catonthehat:whack-hi')) || 0;
} catch {}

function startGame() {
  score = 0;
  combo = 0;
  timeLeft = GAME_LENGTH;
  spawnTimer = 0.6;
  lastTick = Math.ceil(GAME_LENGTH);
  popups = [];
  newHi = false;
  for (const h of holes) Object.assign(h, { state: 'empty', rise: 0, t: 0 });
  state = 'playing';
  sfx.start();
}

function endGame() {
  state = 'over';
  overAt = clock;
  if (score > hiScore) {
    hiScore = score;
    newHi = true;
    try {
      localStorage.setItem('catonthehat:whack-hi', String(hiScore));
    } catch {}
  }
  sfx.over();
}

function spawnMouse(progress) {
  const empty = holes.filter((h) => h.state === 'empty');
  const active = holes.length - empty.length;
  const maxActive = 2 + Math.floor(progress * 3);
  if (!empty.length || active >= maxActive) return;
  const h = empty[Math.floor(Math.random() * empty.length)];
  h.gold = Math.random() < 0.12;
  h.state = 'rising';
  h.rise = 0;
  h.t = lerp(1.3, 0.6, progress) * (h.gold ? 0.6 : 1);
  sfx.pop();
}

function whack() {
  paw.down = 0.12;
  if (state === 'title') {
    if (isTouch) enterFullscreen();
    return startGame();
  }
  if (state === 'over') {
    if (clock - overAt > 1) startGame();
    return;
  }
  if (state !== 'playing') return;

  for (const h of holes) {
    if ((h.state !== 'up' && h.state !== 'rising') || h.rise < 0.3) continue;
    const top = h.y - h.rise * 30;
    const slop = isTouch ? 7 : 0; // fingers are less precise than a mouse
    if (Math.abs(paw.x - h.x) <= 17 + slop && paw.y >= top - 4 - slop && paw.y <= h.y + HOLE_RY + 2 + slop) {
      combo++;
      const pts = (h.gold ? 50 : 10) + Math.min(combo - 1, 8) * 5;
      score += pts;
      popups.push({ x: h.x, y: top - 6, text: `+${pts}`, t: 0.8, color: h.gold ? C.gold : C.white });
      if (combo >= 3) popups.push({ x: h.x, y: top - 16, text: `${combo} COMBO`, t: 0.8, color: C.orange });
      h.state = 'bonked';
      h.t = 0.45;
      shake = 0.1;
      h.gold ? (sfx.bonk(), sfx.gold()) : sfx.bonk();
      return;
    }
  }
  combo = 0;
  sfx.whiff();
}

// ---------- update ----------
function update(dt) {
  clock += dt;
  paw.down = Math.max(0, paw.down - dt);
  shake = Math.max(0, shake - dt);
  popups = popups.filter((p) => (p.t -= dt) > 0);
  for (const p of popups) p.y -= dt * 18;

  if (state === 'title') {
    // a demo mouse bobs in and out of the middle hole
    const h = holes[4];
    h.rise = Math.max(0, Math.sin(clock * 2.2));
    h.state = h.rise > 0 ? 'up' : 'empty';
    return;
  }
  if (state !== 'playing') return;

  timeLeft -= dt;
  const secs = Math.ceil(timeLeft);
  if (secs < lastTick) {
    lastTick = secs;
    if (secs <= 10 && secs > 0) sfx.tick();
  }
  if (timeLeft <= 0) {
    timeLeft = 0;
    for (const h of holes) if (h.state !== 'empty' && h.state !== 'bonked') h.state = 'sinking';
    return endGame();
  }

  const progress = 1 - timeLeft / GAME_LENGTH;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnMouse(progress);
    spawnTimer = lerp(0.85, 0.35, progress) * (0.7 + Math.random() * 0.6);
  }

  for (const h of holes) {
    switch (h.state) {
      case 'rising':
        h.rise = Math.min(1, h.rise + dt * 7);
        if (h.rise === 1) h.state = 'up';
        break;
      case 'up':
        h.t -= dt;
        if (h.t <= 0) {
          h.state = 'sinking';
          combo = 0;
        }
        break;
      case 'bonked':
        h.t -= dt;
        if (h.t <= 0) h.state = 'sinking';
        break;
      case 'sinking':
        h.rise = Math.max(0, h.rise - dt * 6);
        if (h.rise === 0) h.state = 'empty';
        break;
    }
  }
}

// ---------- render ----------
function drawField() {
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.lgreen;
  for (const t of tufts) {
    ctx.fillRect(t.x, t.y, 1, 2);
    ctx.fillRect(t.x + 2, t.y, 1, 2);
    ctx.fillRect(t.x + 1, t.y + 1, 1, 2);
  }
  for (const f of flowers) {
    ctx.fillStyle = f.c;
    ctx.fillRect(f.x - 1, f.y, 3, 1);
    ctx.fillRect(f.x, f.y - 1, 1, 3);
    ctx.fillStyle = C.dorange;
    ctx.fillRect(f.x, f.y, 1, 1);
  }
}

function drawHole(h) {
  // dirt mound + dark opening
  ellipse(h.x, h.y + 1, HOLE_RX + 5, HOLE_RY + 5, C.ddirt);
  ellipse(h.x, h.y, HOLE_RX + 3, HOLE_RY + 3, C.dirt);
  ellipse(h.x, h.y, HOLE_RX, HOLE_RY, C.black);

  if (h.rise > 0) {
    const bob = h.state === 'up' ? Math.round(Math.sin(clock * 10 + h.x) * 0.8) : 0;
    const top = Math.round(h.y - h.rise * 30) + bob;
    ctx.save();
    ctx.beginPath();
    ctx.rect(h.x - 20, 0, 40, h.y + HOLE_RY);
    ctx.clip();
    drawSprite(h.state === 'bonked' ? MOUSE_DAZED : MOUSE, h.x - 16, top, 2, h.gold ? GOLD_PAL : GREY_PAL);
    ctx.restore();

    if (h.state === 'bonked') {
      // stars circling the dazed mouse
      for (let i = 0; i < 3; i++) {
        const a = clock * 9 + (i * Math.PI * 2) / 3;
        const sx = Math.round(h.x + Math.cos(a) * 12);
        const sy = Math.round(top - 3 + Math.sin(a) * 3);
        ctx.fillStyle = C.gold;
        ctx.fillRect(sx - 1, sy, 3, 1);
        ctx.fillRect(sx, sy - 1, 1, 3);
      }
    }
  }

  // front lip covers the mouse's lower body
  lowerRing(h.x, h.y, HOLE_RX, HOLE_RY, 3, C.dirt);
}

function drawPaw() {
  if (!paw.visible) return;
  const down = paw.down > 0;
  const px = Math.round(paw.x);
  const py = Math.round(paw.y - (down ? 0 : 12));

  // shadow where the paw will land
  if (!down) ellipse(px, Math.round(paw.y) + 2, 9, 3, 'rgba(0,0,0,0.35)');

  // short furry forearm with tabby stripes
  const armEnd = py + 30;
  ctx.fillStyle = C.dorange;
  ctx.fillRect(px - 9, py, 18, armEnd - py + 1);
  ctx.fillStyle = C.orange;
  ctx.fillRect(px - 8, py, 16, armEnd - py);
  for (const nx of [-7, -2, 3]) ctx.fillRect(px + nx, armEnd, 4, 2); // fluffy tufts
  ctx.fillStyle = C.dorange;
  for (let y = py + 13; y < armEnd - 2; y += 7) {
    ctx.fillRect(px - 8, y, 5, 2);
    ctx.fillRect(px + 4, y, 5, 2);
  }

  // palm + toes
  const toes = [[-9, -7], [-4, -11], [4, -11], [9, -7]];
  disc(px, py, 10, C.dorange);
  for (const [tx, ty] of toes) disc(px + tx, py + ty, 5, C.dorange);
  disc(px, py, 9, C.orange);
  for (const [tx, ty] of toes) disc(px + tx, py + ty, 4, C.orange);
  for (const [tx, ty] of toes) disc(px + tx, py + ty - 1, 2, C.pink);
  disc(px, py + 1, 4, C.pink);
  ctx.fillStyle = C.rose;
  ctx.fillRect(px - 2, py + 4, 5, 1);

  if (down) {
    ctx.fillStyle = C.white;
    for (const [dx, dy] of [[-18, -4], [18, -4], [-14, -16], [14, -16], [0, -22]]) {
      ctx.fillRect(px + dx - 1, py + dy, 3, 1);
      ctx.fillRect(px + dx, py + dy - 1, 1, 3);
    }
  }
}

function drawHud() {
  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, W, 26);
  ctx.fillStyle = C.dgray;
  ctx.fillRect(0, 26, W, 2);
  text('SCORE', 8, 4, C.lgray, { shadow: null });
  text(pad(score, 6), 8, 14, C.white, { shadow: null });
  text('TIME', 128, 4, C.lgray, { align: 'center', shadow: null });
  const hurry = timeLeft <= 10 && state === 'playing';
  const blinkOff = hurry && Math.floor(clock * 4) % 2 === 0;
  text(pad(Math.ceil(timeLeft), 2), 128, 14, hurry ? (blinkOff ? C.black : C.red) : C.white, { align: 'center', shadow: null });
  text('HI', 248, 4, C.lgray, { align: 'right', shadow: null });
  text(pad(hiScore, 6), 248, 14, C.gold, { align: 'right', shadow: null });
}

function panel(y, h) {
  ctx.fillStyle = C.black;
  ctx.fillRect(24, y, W - 48, h);
  ctx.fillStyle = C.white;
  ctx.fillRect(26, y + 2, W - 52, 1);
  ctx.fillRect(26, y + h - 3, W - 52, 1);
  ctx.fillRect(26, y + 2, 1, h - 4);
  ctx.fillRect(W - 27, y + 2, 1, h - 4);
}

function drawTitle() {
  panel(36, 50);
  text('WHACK-A-MOUSE', W / 2, 48, C.orange, { size: 12, align: 'center', shadow: C.dorange });
  text('A CAT PAW ADVENTURE', W / 2, 68, C.lgray, { align: 'center', shadow: null });
  if (Math.floor(clock * 2) % 2 === 0) text(isTouch ? 'TAP TO START' : 'CLICK TO START', W / 2, Math.round((holes[3].y + holes[6].y) / 2) - 4, C.white, { align: 'center' });
  text('GOLD MICE = 50 PTS', W / 2, H - 18, C.gold, { align: 'center' });
}

function drawGameOver() {
  panel(56, 92);
  text("TIME'S UP!", W / 2, 68, C.orange, { size: 12, align: 'center', shadow: C.dorange });
  text('SCORE', W / 2, 92, C.lgray, { align: 'center', shadow: null });
  text(pad(score, 6), W / 2, 104, C.white, { size: 12, align: 'center', shadow: null });
  if (newHi && Math.floor(clock * 4) % 2 === 0) text('NEW HI-SCORE!', W / 2, 122, C.gold, { align: 'center', shadow: null });
  if (clock - overAt > 1 && Math.floor(clock * 2) % 2 === 0) {
    text(isTouch ? 'TAP TO PLAY AGAIN' : 'CLICK TO PLAY AGAIN', W / 2, 134, C.white, { align: 'center', shadow: null });
  }
}

function render() {
  ctx.save();
  if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
  drawField();
  for (const h of holes) drawHole(h);
  for (const p of popups) text(p.text, Math.round(p.x), Math.round(p.y), p.color, { align: 'center' });
  ctx.restore();

  drawHud();
  if (state === 'title') drawTitle();
  if (state === 'over') drawGameOver();
  if (state === 'loading') text('LOADING...', W / 2, H / 2, C.white, { align: 'center' });
  if (muted) text('MUTE', W - 6, 32, C.lgray, { align: 'right' });
  drawPaw();
}

// ---------- input & layout ----------
function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  paw.x = ((e.clientX - r.left) / r.width) * W;
  paw.y = ((e.clientY - r.top) / r.height) * H;
  paw.visible = true;
}

canvas.addEventListener('pointermove', toCanvas);
canvas.addEventListener('pointerdown', (e) => {
  toCanvas(e);
  whack();
});
canvas.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') paw.visible = false;
});
addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') muted = !muted;
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  if ((e.key === 'Enter' || e.key === ' ') && state !== 'playing') {
    e.preventDefault();
    whack();
  }
});

// ---------- sizing & full screen ----------
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.documentElement.classList.add('touch');
const fsBtn = document.getElementById('fsBtn');
const fsExit = document.getElementById('fsExit');
const root = document.documentElement;
const canNativeFs = !!(root.requestFullscreen || root.webkitRequestFullscreen);
const nativeFsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

function fit() {
  const full = document.body.classList.contains('fs');
  // Portrait phone in full screen: make the field taller instead of leaving black bars.
  const tallH = full && innerHeight > innerWidth * 1.15 ? Math.min(MAX_H, Math.round((W * innerHeight) / innerWidth)) : BASE_H;
  if (tallH !== H) {
    H = tallH;
    canvas.height = H;
    layoutHoles();
  }
  const vw = full ? innerWidth : innerWidth - (innerWidth <= 600 ? 26 : 48);
  const vh = full ? innerHeight : innerHeight - (innerWidth <= 600 ? 80 : 100);
  const avail = Math.max(0.5, Math.min(vw / W, vh / H));
  // Prefer a size where every game pixel covers a whole number of physical screen pixels (extra crisp).
  // On high-res phone screens the difference is invisible, so fill the space instead.
  const dpr = devicePixelRatio || 1;
  const snapped = Math.max(1, Math.floor(avail * dpr)) / dpr;
  const scale = dpr < 2 || snapped >= avail * 0.94 ? snapped : avail;
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}

function enterFullscreen() {
  document.body.classList.add('fs');
  if (canNativeFs && !nativeFsElement()) {
    const req = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
    try {
      req({ navigationUI: 'hide' })?.catch?.(() => {});
    } catch {}
  }
  fit();
}

function exitFullscreen() {
  document.body.classList.remove('fs');
  if (nativeFsElement()) (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
  fit();
}

const toggleFullscreen = () => (document.body.classList.contains('fs') ? exitFullscreen() : enterFullscreen());

fsBtn.addEventListener('click', enterFullscreen);
fsExit.addEventListener('click', exitFullscreen);
// leaving the browser's full screen (Esc key, back gesture) also leaves our full-screen layout
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(ev, () => {
    if (!nativeFsElement()) document.body.classList.remove('fs');
    fit();
  });
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 250));
fit();

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// wait for the pixel font (but don't hang if offline)
Promise.race([document.fonts.load(`8px ${FONT}`), new Promise((r) => setTimeout(r, 1500))]).finally(() => {
  state = 'title';
});
requestAnimationFrame(frame);

// link back to the cat's profile, by name
const back = document.getElementById('backLink');
if (back) back.textContent = `← Back to ${cat.name}'s page`;
