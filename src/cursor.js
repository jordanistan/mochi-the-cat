// The cursor becomes a mouse. Linger near a screen edge and a cat paw reaches in to grab it.

const TAU = Math.PI * 2;
const NOSE = { x: 62, y: 18 }; // mouse sprite hotspot
const PALM = { x: 945, y: 60 }; // paw sprite anchor (palm centre)
const PEEK_TIME = 0.35; // seconds the paw peeks in before lunging
const TRIGGER_DELAY = 0.3; // seconds the mouse must linger near an edge
const GIVE_UP_DELAY = 0.45; // seconds the paw keeps reaching after the mouse flees
const STORE_KEY = 'catonthehat:score';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapAngle = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
const ease = (rate, dt) => 1 - Math.exp(-rate * dt);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const MOUSE_SVG = `
<svg class="mouse-svg" viewBox="0 0 64 36" width="64" height="36">
  <path class="tail" d="M16,22 C8,25 6,10 0,14" stroke="#e8a0b0" stroke-width="2.5" fill="none" stroke-linecap="round" />
  <ellipse class="foot f1" cx="24" cy="29" rx="4" ry="2.5" fill="#e8a0b0" />
  <ellipse class="foot f2" cx="38" cy="29" rx="4" ry="2.5" fill="#e8a0b0" />
  <ellipse cx="30" cy="20" rx="16" ry="10" fill="#a7adb5" />
  <path d="M36,11 Q52,9 62,18 Q52,28 36,27 Z" fill="#a7adb5" />
  <circle cx="42" cy="10" r="6.5" fill="#a7adb5" />
  <circle cx="42" cy="10" r="4" fill="#f2b8c6" />
  <circle cx="51" cy="15.5" r="2" fill="#1f1f1f" />
  <circle cx="51.6" cy="14.9" r="0.6" fill="#fff" />
  <path d="M57,19 L50,24 M57,19 L49,20" stroke="#555" stroke-width="0.8" />
  <circle class="nose" cx="61" cy="18" r="2.4" fill="#e8738f" />
</svg>`;

// Paw drawn pointing right; the long arm trails off to the left (off-screen).
const toeAngles = [-54, -18, 18, 54].map((d) => (d * Math.PI) / 180);
const toes = toeAngles.map((a) => ({ x: PALM.x + 40 * Math.cos(a), y: PALM.y + 40 * Math.sin(a), a }));
const PAW_SVG = `
<svg class="paw-svg" viewBox="0 0 1000 120" width="1000" height="120">
  <rect x="0" y="26" width="950" height="68" rx="34" fill="#f4a259" />
  ${[640, 700, 760, 820, 880]
    .map((x) => `<path d="M${x},28 q10,14 0,24 M${x},92 q10,-14 0,-24" stroke="#d9762b" stroke-width="8" stroke-linecap="round" fill="none" />`)
    .join('')}
  <circle cx="${PALM.x}" cy="${PALM.y}" r="44" fill="#f4a259" />
  <g class="toes">
    ${toes
      .map(
        (t) => `
      <path class="claw" d="M${t.x + 12 * Math.cos(t.a) - 3},${t.y + 12 * Math.sin(t.a)} L${t.x + 26 * Math.cos(t.a)},${t.y + 26 * Math.sin(t.a)} L${t.x + 12 * Math.cos(t.a) + 3},${t.y + 12 * Math.sin(t.a) + 3} Z" fill="#fffaf0" stroke="#d8cbb8" stroke-width="1" />
      <circle cx="${t.x}" cy="${t.y}" r="16" fill="#f4a259" />
      <ellipse class="bean" cx="${t.x + 3 * Math.cos(t.a)}" cy="${t.y + 3 * Math.sin(t.a)}" rx="8" ry="7" fill="#f7a3b5" />`,
      )
      .join('')}
  </g>
  <path class="bean" d="M${PALM.x - 28},${PALM.y} q2,-26 22,-24 q14,2 14,24 q0,22 -14,24 q-20,2 -22,-24 Z" fill="#f7a3b5" />
</svg>`;

export function initCursor({ onScore } = {}) {
  // Touch screens have no hovering cursor: leave them alone.
  if (matchMedia('(pointer: coarse)').matches) return { setEnabled() {}, score: loadScore() };

  document.documentElement.classList.add('mouse-cursor');

  const mouseEl = document.createElement('div');
  mouseEl.className = 'cursor-mouse';
  mouseEl.setAttribute('aria-hidden', 'true');
  mouseEl.innerHTML = MOUSE_SVG;

  const pawEl = document.createElement('div');
  pawEl.className = 'cursor-paw';
  pawEl.setAttribute('aria-hidden', 'true');
  pawEl.innerHTML = PAW_SVG;

  const glowEl = document.createElement('div');
  glowEl.className = 'edge-glow';
  document.body.append(glowEl, pawEl, mouseEl);

  const toastEl = document.getElementById('toast');
  const score = loadScore();
  let enabled = true;

  const pointer = { x: innerWidth / 2, y: innerHeight / 2, inside: false };
  const mouse = { x: pointer.x, y: pointer.y, angle: 0, targetAngle: 0, state: 'free', movingUntil: 0 };
  const paw = { x: 0, y: 0, bx: 0, by: 0, nx: 0, ny: 0, angle: 0, state: 'hidden', t: 0, giveUp: 0 };
  let edgeTime = 0;
  let cooldown = 0;

  // ---------- helpers ----------
  const edgeZone = () => clamp(Math.min(innerWidth, innerHeight) * 0.09, 50, 90);
  const maxReach = () => edgeZone() * 2.6;

  function nearestEdge(x, y) {
    const edges = [
      { d: x, nx: -1, ny: 0 },
      { d: innerWidth - x, nx: 1, ny: 0 },
      { d: y, nx: 0, ny: -1 },
      { d: innerHeight - y, nx: 0, ny: 1 },
    ];
    return edges.reduce((a, b) => (b.d < a.d ? b : a));
  }

  // how far (x, y) is inside the screen, measured from the paw's home edge
  const depthFromHome = (x, y) =>
    paw.nx < 0 ? x : paw.nx > 0 ? innerWidth - x : paw.ny < 0 ? y : innerHeight - y;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
  }

  function saveScore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(score));
    } catch {}
    onScore?.(score);
  }

  // ---------- input ----------
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.inside = true;
    const hot = e.target instanceof Element && e.target.closest('a, button, [role="button"], .photo img');
    mouseEl.classList.toggle('sniff', !!hot);
  });
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) pointer.inside = false;
  });
  addEventListener('blur', () => (pointer.inside = false));

  // ---------- paw ----------
  function spawnPaw() {
    const e = nearestEdge(pointer.x, pointer.y);
    const slide = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 120);
    const off = 70;
    paw.nx = e.nx;
    paw.ny = e.ny;
    if (e.nx) {
      paw.bx = e.nx < 0 ? -off : innerWidth + off;
      paw.by = clamp(pointer.y + slide, 40, innerHeight - 40);
    } else {
      paw.bx = clamp(pointer.x + slide, 40, innerWidth - 40);
      paw.by = e.ny < 0 ? -off : innerHeight + off;
    }
    paw.x = paw.bx;
    paw.y = paw.by;
    paw.state = 'reaching';
    paw.t = 0;
    paw.giveUp = 0;
    pawEl.classList.add('visible');
    pawEl.classList.remove('grab', 'claws');
  }

  function moveToward(tx, ty, speed, dt) {
    const dx = tx - paw.x;
    const dy = ty - paw.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, speed * dt);
    if (dist > 0.01) {
      paw.x += (dx / dist) * step;
      paw.y += (dy / dist) * step;
    }
    return dist;
  }

  function retract(state) {
    paw.state = state;
    pawEl.classList.remove('claws');
  }

  function updatePaw(dt, now) {
    if (paw.state === 'hidden') return;
    paw.t += dt;

    if (paw.state === 'reaching') {
      const reach = maxReach();
      if (paw.t < PEEK_TIME) {
        // peek in a little, wiggling, before the lunge
        const wiggle = Math.sin(now / 45) * 6;
        moveToward(paw.bx - paw.nx * 110 + paw.ny * wiggle, paw.by - paw.ny * 110 + paw.nx * wiggle, 900, dt);
      } else {
        // lunge at the mouse, but an arm can only reach so far in
        let tx = mouse.x;
        let ty = mouse.y;
        const over = depthFromHome(tx, ty) - reach;
        if (over > 0) {
          tx += paw.nx * over;
          ty += paw.ny * over;
        }
        const speed = Math.min(1300, 500 + (paw.t - PEEK_TIME) * 900);
        moveToward(tx, ty, speed, dt);
      }

      const d = Math.hypot(mouse.x - paw.x, mouse.y - paw.y);
      pawEl.classList.toggle('claws', d < 140);

      if (d < 30) {
        paw.state = 'carrying';
        mouse.state = 'caught';
        pawEl.classList.add('grab');
        pawEl.classList.remove('claws');
        mouseEl.classList.add('caught');
        score.caught++;
        saveScore();
        toast(pick(['Gotcha!', 'Swiped!', 'Mrrrow! Caught!', 'Snack acquired.', 'Got your tail!']));
      } else if (!pointer.inside) {
        score.escaped++;
        saveScore();
        toast('Dove into a mouse hole!');
        retract('retracting');
      } else if (depthFromHome(pointer.x, pointer.y) > reach + 40) {
        paw.giveUp += dt;
        if (paw.giveUp > GIVE_UP_DELAY) {
          score.escaped++;
          saveScore();
          toast(pick(['Escaped!', 'Too quick!', 'The mouse lives!', 'Missed by a whisker!']));
          retract('retracting');
        }
      } else {
        paw.giveUp = 0;
      }
    } else {
      // retracting or carrying: pull the arm back out past the edge
      const d = moveToward(paw.bx + paw.nx * 60, paw.by + paw.ny * 60, paw.state === 'carrying' ? 650 : 900, dt);
      if (d < 2) {
        paw.state = 'hidden';
        pawEl.classList.remove('visible', 'grab', 'claws');
        if (mouse.state === 'caught') respawnMouse();
        cooldown = 1;
      }
    }

    // the arm always points from its home edge toward the paw
    paw.angle = Math.atan2(paw.y - (paw.by + paw.ny * 400), paw.x - (paw.bx + paw.nx * 400));
  }

  // ---------- mouse ----------
  function respawnMouse() {
    mouse.state = 'free';
    mouse.x = pointer.x;
    mouse.y = pointer.y;
    mouseEl.classList.remove('caught', 'pop');
    void mouseEl.offsetWidth;
    mouseEl.classList.add('pop');
  }

  function updateMouse(dt, now) {
    if (mouse.state === 'caught') {
      // pinned under the paw, wriggling
      mouse.x = paw.x + Math.cos(paw.angle) * 6;
      mouse.y = paw.y + Math.sin(paw.angle) * 6;
      mouse.angle = paw.angle + Math.PI;
      return;
    }
    const dx = pointer.x - mouse.x;
    const dy = pointer.y - mouse.y;
    mouse.x = pointer.x;
    mouse.y = pointer.y;
    if (Math.hypot(dx, dy) > 1.5) {
      mouse.targetAngle = Math.atan2(dy, dx);
      mouse.movingUntil = now + 120;
    }
    mouse.angle = wrapAngle(mouse.angle + wrapAngle(mouse.targetAngle - mouse.angle) * ease(14, dt));
  }

  // ---------- render ----------
  function render(now) {
    const facingLeft = Math.cos(mouse.angle) < 0;
    mouseEl.style.transform = `translate(${mouse.x - NOSE.x}px, ${mouse.y - NOSE.y}px) rotate(${mouse.angle}rad) scaleY(${facingLeft ? -1 : 1})`;
    mouseEl.classList.toggle('visible', pointer.inside || mouse.state === 'caught');
    mouseEl.classList.toggle('running', now < mouse.movingUntil && mouse.state === 'free');

    if (paw.state !== 'hidden') {
      pawEl.style.transform = `translate(${paw.x - PALM.x}px, ${paw.y - PALM.y}px) rotate(${paw.angle}rad)`;
    }

    const danger = enabled && pointer.inside && mouse.state === 'free' && nearestEdge(pointer.x, pointer.y).d < edgeZone();
    glowEl.classList.toggle('on', danger);
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    cooldown = Math.max(0, cooldown - dt);
    updateMouse(dt, now);

    if (enabled && paw.state === 'hidden' && mouse.state === 'free' && cooldown === 0 && pointer.inside &&
        nearestEdge(pointer.x, pointer.y).d < edgeZone()) {
      edgeTime += dt;
      if (edgeTime > TRIGGER_DELAY) {
        edgeTime = 0;
        spawnPaw();
      }
    } else {
      edgeTime = 0;
    }

    updatePaw(dt, now);
    render(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    score,
    setEnabled(on) {
      enabled = on;
      if (!on && paw.state === 'reaching') retract('retracting');
    },
  };
}

export function loadScore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Number.isFinite(s.caught) && Number.isFinite(s.escaped)) return s;
  } catch {}
  return { caught: 0, escaped: 0 };
}
