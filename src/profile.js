import { cat } from './cat.js';
import { initCursor } from './cursor.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(`catonthehat:${key}`));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(`catonthehat:${key}`, JSON.stringify(value));
  } catch {}
}

// ---------- content ----------
document.title = `Meet ${cat.name}`;
$$('[data-name]').forEach((el) => (el.textContent = cat.name));
$('[data-tagline]').textContent = cat.tagline;
$('[data-bio]').textContent = cat.bio;

$('#details').innerHTML = cat.details.map((d) => `<div><dt>${d.label}</dt><dd>${d.value}</dd></div>`).join('');

$('#traits').innerHTML = cat.traits
  .map(
    (t) => `
  <div class="trait">
    <div class="trait-head"><span>${t.label}</span><span class="trait-val">${t.value}%</span></div>
    <div class="meter"><div class="meter-fill" style="--v:${t.value}%"></div></div>
  </div>`,
  )
  .join('');

// fill the meters when they scroll into view
const meterObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('filled')),
  { threshold: 0.4 },
);
meterObserver.observe($('#traits'));

// ---------- sound ----------
let actx = null;
function audio() {
  try {
    actx ??= new AudioContext();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch {
    return null;
  }
}

function purr() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const osc = a.createOscillator();
  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 55;
  lfo.frequency.value = 24; // the rumble of a purr
  lfoGain.gain.value = 0.5;
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  const amp = a.createGain();
  amp.gain.value = 0.5;
  lfo.connect(lfoGain).connect(amp.gain);
  osc.connect(filter).connect(amp).connect(gain).connect(a.destination);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 1.35);
  lfo.stop(t + 1.35);
}

function chirp(freqs, step = 0.07, type = 'triangle') {
  const a = audio();
  if (!a) return;
  freqs.forEach((f, i) => {
    const t = a.currentTime + i * step;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.4);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + step * 1.5);
  });
}

// ---------- floating bits (hearts, fish, confetti) ----------
function floaty(char, x, y, { cls = 'floaty', dx = (Math.random() - 0.5) * 120, dy = -90 - Math.random() * 80, rot = (Math.random() - 0.5) * 60 } = {}) {
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = char;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--dx', `${dx}px`);
  el.style.setProperty('--dy', `${dy}px`);
  el.style.setProperty('--rot', `${rot}deg`);
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove());
}

// ---------- hero cat: pets, treats, eyes that follow the mouse ----------
const heroCat = $('#heroCat');
const catSvg = $('.cat-art');
const bubble = $('#bubble');
const counts = {
  pets: load('pets', 0),
  treats: load('treats', 0),
  cheers: load('cheers', 0),
  swats: load('swats', 0),
  bellyRubs: load('bellyRubs', 0),
  trust: load('bellyTrust', 0), // treats given since the last belly rub
};

// Treats build trust: the belly-rub chance climbs from 10% to 95% at 10 treats.
// A belly rub uses the trust up, so it's a reward, not a permanent unlock.
const BELLY_RUB_BASE = 0.1;
const BELLY_RUB_MAX = 0.95;
const TREATS_FOR_MAX = 10;
const bellyChance = () =>
  BELLY_RUB_BASE + ((BELLY_RUB_MAX - BELLY_RUB_BASE) * Math.min(counts.trust, TREATS_FOR_MAX)) / TREATS_FOR_MAX;
let happyTimer = 0;
let bubbleTimer = 0;

function renderCounts() {
  $('#petCount').textContent = counts.pets;
  $('#treatCount').textContent = counts.treats;
  $('#cheerCount').textContent = counts.cheers;
  $('#swatCount').textContent = counts.swats;
  renderTrust();
}

function renderTrust() {
  const pct = Math.round(bellyChance() * 100);
  const left = TREATS_FOR_MAX - Math.min(counts.trust, TREATS_FOR_MAX);
  $('#trustPct').textContent = `${pct}%`;
  $('#trustFill').style.width = `${pct}%`;
  $('#trustHint').textContent =
    left > 0
      ? `Treats build trust. ${left} more ${left === 1 ? 'treat' : 'treats'} for a ${Math.round(BELLY_RUB_MAX * 100)}% chance.`
      : `Maximum trust! Go for the belly.`;
  $('.trust').classList.toggle('maxed', left === 0);
}
renderCounts();

function say(text) {
  bubble.textContent = text;
  bubble.classList.remove('show');
  void bubble.offsetWidth;
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 1800);
}

function makeHappy(cls, ms = 1300) {
  heroCat.classList.add('happy', cls);
  clearTimeout(happyTimer);
  happyTimer = setTimeout(() => heroCat.classList.remove('happy', 'nom', 'petted'), ms);
}

// ---------- the belly trap ----------
// Like most cats: the belly looks soft and inviting, and touching it is a terrible idea.
let angryUntil = 0;
let angryTimer = 0;

function hiss() {
  const a = audio();
  if (!a) return;
  const len = 0.7;
  const buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const hp = a.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(hp).connect(g).connect(a.destination);
  src.start(t);
}

function scratchMarks(x, y) {
  const el = document.createElement('div');
  el.className = 'scratch';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = '<i></i><i></i><i></i>';
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove());
}

function getMad(x, y) {
  heroCat.classList.remove('happy', 'nom', 'petted', 'angry');
  void heroCat.offsetWidth; // restart the animations
  heroCat.classList.add('angry');
  angryUntil = performance.now() + 2600;
  clearTimeout(angryTimer);
  angryTimer = setTimeout(() => heroCat.classList.remove('angry'), 2600);

  counts.swats++;
  save('swats', counts.swats);
  renderCounts();
  hiss();
  say(pick(['HISSSS!', 'NOT the belly!', 'How DARE you.', 'It was a trap.', 'Bitey time.', 'Absolutely not.']));
  setTimeout(() => scratchMarks(x, y), 220);
  for (let i = 0; i < 3; i++) floaty('💢', x, y, { dy: -60 - Math.random() * 60 });
  if (counts.swats === 1) toast(`Rookie mistake. ${cat.name} does not do belly rubs.`);
}

function rareBellyRub(x, y) {
  const bribed = counts.trust > 0;
  counts.bellyRubs++;
  save('bellyRubs', counts.bellyRubs);
  counts.trust = 0; // the trust is spent
  save('bellyTrust', 0);
  renderCounts();
  makeHappy('petted', 2200);
  purr();
  setTimeout(purr, 900);
  if (bribed) {
    say(pick(['Purrrr… worth the fish.', 'You may proceed.', 'Okay, you earned this.']));
    toast(`🌟 ${cat.name} allowed a belly rub! The treats worked. (${counts.bellyRubs} so far)`);
  } else {
    say(pick(['…fine. Just this once.', 'Okay… maybe a little.', 'Tell no one.']));
    toast(`🌟 RARE! ${cat.name} allowed a belly rub! (${counts.bellyRubs} so far)`);
  }
  for (let i = 0; i < 10; i++) floaty(pick(['🌟', '✨', '💖']), x, y, { dx: (Math.random() - 0.5) * 220 });
}

// a fluffy, spiky outline that shows when the cat puffs up
{
  const pts = [];
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = i % 2 ? 1.17 : 1.0;
    pts.push(`${(160 + Math.cos(a) * 96 * k).toFixed(1)},${(262 + Math.sin(a) * 86 * k).toFixed(1)}`);
  }
  $('.fluff', catSvg).setAttribute('d', `M${pts.join(' L')} Z`);
}

heroCat.addEventListener('click', (e) => {
  const x = e.clientX || heroCat.getBoundingClientRect().left + 160;
  const y = e.clientY || heroCat.getBoundingClientRect().top + 120;

  if (performance.now() < angryUntil) {
    say(pick(['I said NO.', 'Still mad.', 'Go away.', '*glares*']));
    return;
  }
  if (e.target.closest('.belly')) {
    if (Math.random() < bellyChance()) rareBellyRub(x, y);
    else getMad(x, y);
    return;
  }

  counts.pets++;
  save('pets', counts.pets);
  renderCounts();
  makeHappy('petted');
  purr();
  say(pick(['Purrrrr…', 'Mrrp!', 'More please', 'Purr purr purr', 'Behind the ears!', '♥']));
  for (let i = 0; i < 6; i++) floaty(pick(['❤️', '💕', '💖', '🧡']), x, y);
  if (counts.pets % 25 === 0) toast(`${counts.pets} pets! ${cat.name} is very happy.`);
});

$('#treatBtn').addEventListener('click', () => {
  const from = $('#treatBtn').getBoundingClientRect();
  const to = catSvg.getBoundingClientRect();
  const mouthX = to.left + to.width * 0.5;
  const mouthY = to.top + to.height * 0.45;
  const wasAngry = performance.now() < angryUntil;
  if (wasAngry) {
    angryUntil = 0;
    clearTimeout(angryTimer);
    heroCat.classList.remove('angry');
  }
  heroCat.classList.add('open-mouth');
  floaty('🐟', from.left + from.width / 2, from.top, {
    cls: 'floaty fish',
    dx: mouthX - (from.left + from.width / 2),
    dy: mouthY - from.top,
    rot: 360,
  });
  setTimeout(() => {
    heroCat.classList.remove('open-mouth');
    counts.treats++;
    save('treats', counts.treats);
    const wasMaxed = counts.trust >= TREATS_FOR_MAX;
    counts.trust = Math.min(counts.trust + 1, TREATS_FOR_MAX);
    save('bellyTrust', counts.trust);
    renderCounts();
    makeHappy('nom', 900);
    chirp([660, 880, 990]);
    if (!wasMaxed && counts.trust === TREATS_FOR_MAX) {
      say('…okay. You may touch the belly.');
      toast(`${cat.name} trusts you! Belly rub chance: ${Math.round(BELLY_RUB_MAX * 100)}%`);
    } else {
      say(wasAngry ? '…okay. You are forgiven.' : pick(['Nom nom nom!', 'Delicious!', 'Another one?', 'Yum!', 'Fish o’clock!']));
    }
  }, 650);
});

// eyes follow the cursor
const pupils = $$('.pupil', catSvg);
addEventListener('pointermove', (e) => {
  const r = catSvg.getBoundingClientRect();
  const sx = 320 / r.width;
  const sy = 360 / r.height;
  const px = (e.clientX - r.left) * sx;
  const py = (e.clientY - r.top) * sy;
  for (const p of pupils) {
    const cx = +p.dataset.cx;
    const cy = +p.dataset.cy;
    const a = Math.atan2(py - cy, px - cx);
    const d = Math.min(1, Math.hypot(px - cx, py - cy) / 150);
    p.setAttribute('transform', `translate(${Math.cos(a) * 9 * d} ${Math.sin(a) * 6 * d})`);
  }
});

// ---------- gallery + lightbox ----------
const likes = load('likes', {});
const photosEl = $('#photos');
photosEl.innerHTML = cat.photos
  .map(
    (p, i) => `
  <figure class="photo" style="--tilt:${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg">
    <img src="${p.src}" alt="${p.caption}" loading="lazy" data-index="${i}" />
    <figcaption>
      <span>${p.caption}</span>
      <button class="like ${likes[p.src] ? 'liked' : ''}" data-src="${p.src}" aria-label="Like this photo">
        <span class="heart">♥</span><span class="like-count">${likes[p.src] || 0}</span>
      </button>
    </figcaption>
  </figure>`,
  )
  .join('');

photosEl.addEventListener('click', (e) => {
  const like = e.target.closest('.like');
  if (like) {
    const src = like.dataset.src;
    likes[src] = (likes[src] || 0) + 1;
    save('likes', likes);
    like.classList.add('liked');
    like.querySelector('.like-count').textContent = likes[src];
    like.classList.remove('pulse');
    void like.offsetWidth;
    like.classList.add('pulse');
    const r = like.getBoundingClientRect();
    for (let i = 0; i < 4; i++) floaty('♥', r.left + 12, r.top, { cls: 'floaty heart-float' });
    chirp([880, 1320], 0.05);
    return;
  }
  const img = e.target.closest('img');
  if (img) openLightbox(+img.dataset.index);
});

const lb = $('#lightbox');
let lbIndex = 0;
function showPhoto(i) {
  lbIndex = (i + cat.photos.length) % cat.photos.length;
  const p = cat.photos[lbIndex];
  $('#lbImg').src = p.src;
  $('#lbImg').alt = p.caption;
  $('#lbCap').textContent = `${p.caption}  ·  ${lbIndex + 1} / ${cat.photos.length}`;
}
function openLightbox(i) {
  showPhoto(i);
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add('open'));
}
function closeLightbox() {
  lb.classList.remove('open');
  setTimeout(() => (lb.hidden = true), 200);
}
$('.lb-close').addEventListener('click', closeLightbox);
$('.lb-prev').addEventListener('click', () => showPhoto(lbIndex - 1));
$('.lb-next').addEventListener('click', () => showPhoto(lbIndex + 1));
lb.addEventListener('click', (e) => e.target === lb && closeLightbox());
addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') showPhoto(lbIndex - 1);
  if (e.key === 'ArrowRight') showPhoto(lbIndex + 1);
});

// ---------- fun facts (flip cards) ----------
$('#factCards').innerHTML = cat.facts
  .map(
    (f, i) => `
  <button class="fact" aria-label="Flip fact card: ${f.title}">
    <span class="fact-inner">
      <span class="fact-front"><span class="fact-icon">${f.icon}</span><span class="fact-title">${f.title}</span><span class="fact-hint">Tap to flip</span></span>
      <span class="fact-back"><span class="fact-num">Fact #${i + 1}</span>${f.fact}</span>
    </span>
  </button>`,
  )
  .join('');
$('#factCards').addEventListener('click', (e) => {
  const card = e.target.closest('.fact');
  if (!card) return;
  card.classList.toggle('flipped');
  chirp(card.classList.contains('flipped') ? [520, 780] : [780, 520], 0.06);
});

// ---------- potty training ----------
const potty = cat.pottyTraining;
const RINGS = [{ rx: 96, ry: 104 }, { rx: 72, ry: 78 }, { rx: 50, ry: 55 }, { rx: 28, ry: 31 }];
// litter speckles (stable)
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const speckles = Array.from({ length: 70 }, () => {
  const a = rnd() * Math.PI * 2;
  const r = Math.sqrt(rnd()) * 0.95;
  return { x: 150 + Math.cos(a) * 96 * r, y: 195 + Math.sin(a) * 104 * r };
});

function drawTrainer(stage) {
  const last = potty.stages.length - 1;
  const g = $('#trainer');
  if (stage >= last) {
    // no trainer at all, just a proud cat on the seat
    g.innerHTML = `
      <text x="150" y="215" text-anchor="middle" font-size="64">🏆</text>`;
    return;
  }
  // stage 0 = no hole; each later stage removes the next ring from the inside out
  const hole = stage === 0 ? null : RINGS[RINGS.length - stage];
  const ringsLeft = RINGS.slice(0, RINGS.length - stage);
  g.innerHTML = `
    <ellipse cx="150" cy="195" rx="98" ry="106" fill="#e7d3a8" />
    ${speckles.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="2" fill="#c9b07a" />`).join('')}
    ${hole ? `<ellipse cx="150" cy="195" rx="${hole.rx}" ry="${hole.ry}" fill="#7cc4ea" /><ellipse cx="150" cy="200" rx="${hole.rx * 0.6}" ry="${hole.ry * 0.6}" fill="#5fb2df" opacity="0.6" />` : ''}
    ${ringsLeft.map((r, i) => `<ellipse cx="150" cy="195" rx="${r.rx}" ry="${r.ry}" fill="none" stroke="${['#8c6ad8', '#52b788', '#f4a259', '#e86a8a'][i]}" stroke-width="7" />`).join('')}
  `;
}

let shownStage = potty.currentStage;
const lastStage = potty.stages.length - 1;

function showStage(i) {
  shownStage = i;
  const s = potty.stages[i];
  drawTrainer(i);
  $('#pottyTitle').textContent = `Stage ${i + 1}: ${s.title}`;
  $('#pottyDetail').textContent = s.detail;
  const badge = $('#pottyBadge');
  const cur = potty.currentStage;
  badge.textContent = i === cur ? `${cat.name} is here!` : i < cur ? 'Completed ✓' : 'Coming soon';
  badge.className = `badge ${i === cur ? 'now' : i < cur ? 'done' : 'todo'}`;
  $$('#pottySteps .step').forEach((el, j) => el.classList.toggle('selected', j === i));

  // the how-to for this stage
  $('#pottyTime').textContent = s.time ?? '';
  $('#pottyHow').innerHTML = (s.steps ?? []).map((t) => `<li>${t}</li>`).join('');
  $('#pottyReady').textContent = s.readyWhen ?? '';
  $('#pottyPrev').disabled = i === 0;
  $('#pottyNext').disabled = i === lastStage;
  const guide = $('.stage-guide');
  guide.classList.remove('swap');
  void guide.offsetWidth;
  guide.classList.add('swap');
}

$('#pottySteps').innerHTML = potty.stages
  .map((s, i) => {
    const st = i < potty.currentStage ? 'done' : i === potty.currentStage ? 'now' : 'todo';
    return `<li><button class="step ${st}" data-i="${i}">
      <span class="dot">${st === 'done' ? '✓' : i + 1}</span>
      <span class="step-text"><span>${s.title}</span>${s.time ? `<small>⏱ ${s.time}</small>` : ''}</span>
      ${st === 'now' ? '<span class="here">🐾 here</span>' : ''}
    </button></li>`;
  })
  .join('');
$('#pottySteps').addEventListener('click', (e) => {
  const b = e.target.closest('.step');
  if (b) showStage(+b.dataset.i);
});
$('#pottyPrev').addEventListener('click', () => shownStage > 0 && showStage(shownStage - 1));
$('#pottyNext').addEventListener('click', () => shownStage < lastStage && showStage(shownStage + 1));
$('#pottyBefore').innerHTML = (potty.beforeYouStart ?? []).map((t) => `<li>${t}</li>`).join('');
$('#pottyGood').innerHTML = (potty.goodToKnow ?? []).map((t) => `<li>${t}</li>`).join('');
showStage(potty.currentStage);

$('#cheerBtn').addEventListener('click', (e) => {
  counts.cheers++;
  save('cheers', counts.cheers);
  renderCounts();
  chirp([523, 659, 784, 1047], 0.08, 'square');
  const r = e.currentTarget.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    floaty(pick(['🎉', '✨', '🧻', '⭐', '🎊']), r.left + r.width / 2, r.top, {
      dx: (Math.random() - 0.5) * 300,
      dy: -120 - Math.random() * 160,
      rot: (Math.random() - 0.5) * 360,
    });
  }
  toast(pick([`Go ${cat.name}, go!`, 'You can do it!', 'Aim true, little one!', 'Potty champion in training!']));
});

// ---------- arcade hi-score ----------
$('#arcadeHi').textContent = String(Number(load('whack-hi', 0)) || 0).padStart(6, '0');

// ---------- toast ----------
const toastEl = $('#toast');
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
}

// ---------- mouse cursor + edge paw ----------
const cursor = initCursor({ onScore: (s) => ($('#caughtCount').textContent = s.caught) });
$('#caughtCount').textContent = cursor.score.caught;

const toggle = $('#pawToggle');
let pawOn = load('paw-on', true);
function applyPaw() {
  cursor.setEnabled(pawOn);
  toggle.textContent = `Paw traps: ${pawOn ? 'ON' : 'OFF'}`;
  toggle.setAttribute('aria-pressed', String(pawOn));
  toggle.classList.toggle('off', !pawOn);
}
toggle.addEventListener('click', () => {
  pawOn = !pawOn;
  save('paw-on', pawOn);
  applyPaw();
});
applyPaw();

// gentle idle chatter from the hero cat
setInterval(() => {
  if (document.hidden || Math.random() < 0.5) return;
  say(pick(['Meow?', 'Is it dinner yet?', 'Pet me', '*stretches*', 'I see that mouse…', 'Mrrrow']));
}, 9000);
