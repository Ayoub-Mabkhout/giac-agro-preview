/* The home page story: 1,100 grains, one per member company, carried through five shapes.
   Logo → wheat field → map of the twelve regions → the 70 % → the 686 approved requests. */
(() => {
  const root = document.querySelector('[data-gs]');
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const stick = root.querySelector('.gs-stick');
  const steps = [...root.querySelectorAll('.gs-step')];
  const regionLabel = root.querySelector('[data-region]');
  const defaultRegion = regionLabel ? regionLabel.textContent : '';
  const rtl = document.documentElement.dir === 'rtl';
  const N = 1100;
  const CH = 5;
  const BAR_DATA = JSON.parse(root.dataset.bars);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const GROUNDS = [[255, 255, 255], [10, 58, 36], [0, 57, 136], [244, 88, 26], [255, 225, 86]];
  const INK = [hex('#081B3E')];
  const logoSvg = document.getElementById('gs-logo');
  const mapSvg = document.getElementById('gs-map');
  const logoParts = [...logoSvg.querySelectorAll('path')].map((p) => ({ path: new Path2D(p.getAttribute('d')), fill: p.getAttribute('fill') }));
  const regions = [...mapSvg.querySelectorAll('path')].map((p) => ({ path: new Path2D(p.getAttribute('d')), name: p.dataset.name, south: !!p.dataset.south }));
  const mapW = +mapSvg.dataset.w;
  const mapH = +mapSvg.dataset.h;

  const rnd = new Float32Array(N).map(() => Math.random());
  const rnd2 = new Float32Array(N).map(() => Math.random());
  const ox = new Float32Array(N);
  const oy = new Float32Array(N);
  const startX = new Float32Array(N);
  const startY = new Float32Array(N);
  let W = 0; let H = 0; let phone = false; let T = []; let bars = null; let mapBox = null; let scaled = [];
  let prog = 0; let target = 0; let running = true; let hot = -1;
  const pointer = { x: -9999, y: -9999, on: false };
  const t0 = performance.now();

  /* evenly spread points inside a shape: one per grid cell, so thin strokes still read */
  function sample(w, h, draw, count, keep) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    draw(g);
    const d = g.getImageData(0, 0, w, h).data;
    let area = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 128) area++;
    let size = Math.sqrt(area / (count * 1.12));
    const pick = () => {
      const cells = new Map();
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (d[i + 3] <= 128) continue;
          if (keep && !keep(d[i], d[i + 1], d[i + 2])) continue;
          const k = `${Math.floor(x / size)},${Math.floor(y / size)}`;
          const n = (cells.get(k)?.n || 0) + 1;
          if (!cells.has(k) || Math.random() < 1 / n) cells.set(k, { x, y, r: d[i], g: d[i + 1], b: d[i + 2], n });
          else cells.get(k).n = n;
        }
      }
      return [...cells.values()];
    };
    let pts = pick();
    while (pts.length < count && size > 1.5) { size *= 0.93; pts = pick(); }
    pts.sort(() => Math.random() - 0.5);
    while (pts.length < count) { const p = pts[pts.length % Math.max(1, pts.length)]; pts.push({ ...p, x: p.x + Math.random() * 2, y: p.y + Math.random() * 2 }); }
    return pts.slice(0, count);
  }

  const blank = () => ({ x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N).fill(1), r: new Float32Array(N), g: new Float32Array(N), b: new Float32Array(N), s: new Float32Array(N), bx: new Float32Array(N), by: new Float32Array(N), reg: new Int16Array(N).fill(-1) });
  const fitBox = (box, ar) => { let w = box.w; let h = w / ar; if (h > box.h) { h = box.h; w = h * ar; } return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }; };

  function shapeBox() {
    if (phone) return { x: 18, y: H * 0.1, w: W - 36, h: H * 0.42 };
    return rtl ? { x: W * 0.03, y: H * 0.07, w: W * 0.52, h: H * 0.86 } : { x: W * 0.45, y: H * 0.07, w: W * 0.52, h: H * 0.86 };
  }

  function buildLogo() {
    const o = blank();
    const f = fitBox(shapeBox(), 916 / 389);
    const k = 2;
    const pts = sample(916 * k, 389 * k, (g) => { g.scale(k, k); logoParts.forEach((p) => { g.fillStyle = p.fill; g.fill(p.path, 'evenodd'); }); }, N);
    const s = f.w / (916 * k);
    pts.forEach((p, i) => { o.x[i] = f.x + p.x * s; o.y[i] = f.y + p.y * s; o.r[i] = p.r; o.g[i] = p.g; o.b[i] = p.b; o.s[i] = phone ? 1.55 : 2.5; });
    return o;
  }

  function buildField() {
    const o = blank();
    const horizon = H * (phone ? 0.5 : 0.54);
    const gold = [[231, 185, 60], [242, 205, 96], [214, 158, 46], [244, 170, 60]];
    for (let i = 0; i < N; i++) {
      const d = rnd2[i] ** 1.6;
      const baseY = horizon + (H * 1.02 - horizon) * d;
      const tall = (phone ? 54 : 60) + d * (phone ? 110 : 130);
      o.bx[i] = rnd[i] * (W + 80) - 40;
      o.by[i] = baseY;
      o.x[i] = o.bx[i];
      o.y[i] = baseY - tall;
      const c = gold[i % 4];
      o.r[i] = c[0]; o.g[i] = c[1]; o.b[i] = c[2];
      o.s[i] = (phone ? 1.4 : 1.8) + d * (phone ? 2.6 : 3.6);
    }
    return o;
  }

  function buildMap() {
    const o = blank();
    const f = fitBox(shapeBox(), mapW / mapH);
    const s = f.w / mapW;
    mapBox = { ...f, s };
    scaled = regions.map((r) => { const p = new Path2D(); p.addPath(r.path, new DOMMatrix([s, 0, 0, s, f.x, f.y])); return p; });
    const rw = Math.round(mapW); const rh = Math.round(mapH);
    const pts = sample(rw, rh, (g) => { regions.forEach((r, i) => { g.fillStyle = `rgb(${(i + 1) * 20},0,0)`; g.fill(r.path); }); }, N, (r) => {
      const idx = Math.round(r / 20) - 1;
      return idx >= 0 && idx < regions.length && (!regions[idx].south || Math.random() < 0.34);
    });
    pts.forEach((p, i) => { o.x[i] = f.x + p.x * s; o.y[i] = f.y + p.y * s; o.reg[i] = Math.round(p.r / 20) - 1; o.r[i] = 196; o.g[i] = 214; o.b[i] = 245; o.s[i] = phone ? 1.5 : 2.5; });
    return o;
  }

  function buildRate() {
    const o = blank();
    const box = shapeBox();
    const label = '70%';
    const cw = 1100; const chh = 620; const font = 520;
    const main = Math.round(N * 0.7);
    const pts = sample(cw, chh, (g) => { g.fillStyle = '#000'; g.font = `500 ${font}px Newsreader, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, cw / 2, chh / 2); }, main);
    const f = fitBox(box, cw / chh);
    const s = f.w / cw;
    for (let i = 0; i < N; i++) {
      if (i < main) {
        o.x[i] = f.x + pts[i].x * s; o.y[i] = f.y + pts[i].y * s;
        o.r[i] = INK[0][0]; o.g[i] = INK[0][1]; o.b[i] = INK[0][2]; o.s[i] = phone ? 1.8 : 3;
      } else {
        o.x[i] = rnd[i] * W; o.y[i] = rnd2[i] * H;
        o.r[i] = 255; o.g[i] = 255; o.b[i] = 255; o.s[i] = 1.8; o.a[i] = 0.5;
      }
    }
    return o;
  }

  function buildBars() {
    const o = blank();
    const box = shapeBox();
    const total = BAR_DATA.reduce((a, b) => a + b.v, 0);
    const n = BAR_DATA.length;
    const gap = box.w * 0.035;
    const colW = (box.w - gap * (n - 1)) / n;
    const top = box.y + (phone ? 26 : 44);
    const bottom = box.y + box.h;
    const max = Math.max(...BAR_DATA.map((b) => b.v));
    const cell = Math.sqrt((colW * (bottom - top)) / max);
    const cols = Math.max(4, Math.floor(colW / cell));
    const dx = colW / cols;
    const dy = (bottom - top) / Math.ceil(max / cols);
    bars = { items: [], y: bottom };
    let idx = 0;
    BAR_DATA.forEach((b, c) => {
      const x0 = box.x + c * (colW + gap);
      for (let k = 0; k < b.v && idx < N; k++, idx++) {
        const r = Math.floor(k / cols);
        o.x[idx] = x0 + (k % cols) * dx + dx / 2;
        o.y[idx] = bottom - r * dy - dy / 2;
        const last = c === n - 1;
        o.r[idx] = last ? 244 : 8; o.g[idx] = last ? 88 : 27; o.b[idx] = last ? 26 : 62;
        o.s[idx] = Math.max(1.5, Math.min(dx, dy) * 0.36);
      }
      bars.items.push({ x: x0, w: colW, v: b.v, y: b.y, top: bottom - Math.ceil(b.v / cols) * dy });
    });
    for (let i = total; i < N; i++) {
      o.x[i] = rnd[i] * W; o.y[i] = H + 40 + rnd2[i] * 120; o.a[i] = 0;
      o.r[i] = 8; o.g[i] = 27; o.b[i] = 62; o.s[i] = 1.5;
    }
    return o;
  }

  function order(o) {
    const idx = [...Array(N).keys()].sort((a, b) => o.x[a] - o.x[b]);
    const c = blank();
    idx.forEach((from, to) => { for (const k of Object.keys(o)) c[k][to] = o[k][from]; });
    return c;
  }

  function build() {
    const box = stick.getBoundingClientRect();
    W = box.width; H = box.height;
    phone = W < 900;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    T = [buildLogo(), buildField(), buildMap(), buildRate(), buildBars()].map((o, i) => (i === 0 ? o : order(o)));
    const a = order(T[0]); T[0] = a;
    for (let i = 0; i < N; i++) { startX[i] = T[0].x[i] + (rnd[i] - 0.5) * W * 0.5; startY[i] = -40 - rnd2[i] * H * 1.1; }
  }

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (v) => v * v * (3 - 2 * v);
  const hold = (f) => clamp((f - 0.16) / 0.68);

  function readScroll() {
    const r = root.getBoundingClientRect();
    target = clamp(-r.top / (root.offsetHeight - stick.offsetHeight)) * (CH - 1);
  }

  function setChapter() {
    const c = Math.round(prog);
    steps.forEach((s, i) => s.classList.toggle('on', i === c));
    const a = Math.floor(prog); const b = Math.min(CH - 1, a + 1);
    const f = hold(prog - a);
    const m = GROUNDS[a].map((v, i) => Math.round(v + (GROUNDS[b][i] - v) * f));
    stick.style.backgroundColor = `rgb(${m})`;
  }

  function drawBarsLabels(alpha) {
    if (alpha < 0.02 || !bars) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#081B3E';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    bars.items.forEach((b) => {
      ctx.font = `500 ${phone ? 26 : 40}px Newsreader, Georgia, serif`;
      ctx.fillText(b.v, b.x + 1, b.top - 8);
      ctx.font = `400 ${phone ? 15 : 18}px Newsreader, Georgia, serif`;
      ctx.fillText(b.y, b.x + 1, bars.y + (phone ? 20 : 26));
    });
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (running) requestAnimationFrame(frame);
    if (!T.length || !running) return;
    prog += (target - prog) * 0.11;
    if (Math.abs(target - prog) < 0.0004) prog = target;
    setChapter();
    const time = (now - t0) / 1000;
    const intro = smooth(clamp(time / 1.9));
    const a = Math.floor(prog); const b = Math.min(CH - 1, a + 1);
    const f = hold(prog - a);
    const A = T[a]; const B = T[b];
    ctx.clearRect(0, 0, W, H);
    const R = phone ? 70 : 110;
    const fieldW = a === 1 ? 1 - f : a === 0 ? f : 0;

    if (fieldW > 0.02) {
      ctx.strokeStyle = 'rgb(205,165,70)';
      ctx.globalAlpha = 0.5 * fieldW;
      ctx.lineWidth = 1;
      ctx.beginPath();
    }
    const xs = new Float32Array(N); const ys = new Float32Array(N);
    const F = T[1];
    for (let i = 0; i < N; i++) {
      const delay = rnd[i] * 0.32;
      const e = smooth(clamp((f - delay) / 0.68));
      let x = A.x[i] + (B.x[i] - A.x[i]) * e;
      let y = A.y[i] + (B.y[i] - A.y[i]) * e;
      const arc = Math.sin(Math.PI * e);
      x += arc * (rnd2[i] - 0.5) * W * 0.16;
      y += arc * (rnd[i] - 0.5) * H * 0.1;
      if (intro < 1) { const q = smooth(clamp(intro * 1.5 - rnd[i] * 0.5)); x = startX[i] + (x - startX[i]) * q; y = startY[i] + (y - startY[i]) * q; }
      const w = a === 1 ? 1 - e : a === 0 ? e : 0;
      if (w > 0.01) {
        const d = (F.by[i] - H * 0.4) / (H * 0.6);
        const sway = (Math.sin(time * 1.5 + F.bx[i] * 0.011 + F.by[i] * 0.02) * 0.6 + Math.sin(time * 0.7 + F.bx[i] * 0.004) * 0.4) * (7 + 16 * d) * w;
        x += sway;
        if (fieldW > 0.02) {
          ctx.moveTo(F.bx[i], F.by[i]);
          ctx.quadraticCurveTo(F.bx[i] + sway * 0.2, (F.by[i] + y) / 2, x, y);
        }
      }
      const dx = x + ox[i] - pointer.x; const dy = y + oy[i] - pointer.y;
      const dist2 = dx * dx + dy * dy;
      if (pointer.on && dist2 < R * R) {
        const dist = Math.sqrt(dist2) || 1;
        const force = (1 - dist / R) * (phone ? 6 : 7);
        ox[i] += (dx / dist) * force; oy[i] += (dy / dist) * force;
      }
      ox[i] *= 0.91; oy[i] *= 0.91;
      xs[i] = x + ox[i]; ys[i] = y + oy[i];
    }
    if (fieldW > 0.02) { ctx.stroke(); ctx.globalAlpha = 1; }

    for (let i = 0; i < N; i++) {
      const delay = rnd[i] * 0.32;
      const e = smooth(clamp((f - delay) / 0.68));
      const al = A.a[i] + (B.a[i] - A.a[i]) * e;
      if (al < 0.02) continue;
      let r = A.r[i] + (B.r[i] - A.r[i]) * e;
      let g = A.g[i] + (B.g[i] - A.g[i]) * e;
      let bl = A.b[i] + (B.b[i] - A.b[i]) * e;
      const s = A.s[i] + (B.s[i] - A.s[i]) * e;
      if (hot >= 0 && a === 2 && T[2].reg[i] === hot) { r = 255; g = 225; bl = 86; }
      ctx.globalAlpha = al;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${bl | 0})`;
      ctx.beginPath();
      ctx.ellipse(xs[i], ys[i], s * 1.45, s, rnd[i] * 6.28 + time * 0.08, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawBarsLabels(prog > 3 ? smooth(clamp((prog - 3.45) / 0.4)) : 0);
  }

  function hitRegion(x, y) {
    if (Math.abs(prog - 2) > 0.3) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    hot = scaled.findIndex((p) => ctx.isPointInPath(p, x, y));
    ctx.restore();
    if (regionLabel) regionLabel.textContent = hot >= 0 ? regions[hot].name : defaultRegion;
  }

  const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stick.addEventListener('pointermove', (e) => { const [x, y] = local(e); pointer.x = x; pointer.y = y; pointer.on = true; hitRegion(x, y); }, { passive: true });
  stick.addEventListener('pointerdown', (e) => { const [x, y] = local(e); pointer.x = x; pointer.y = y; pointer.on = true; hitRegion(x, y); }, { passive: true });
  stick.addEventListener('pointerleave', () => { pointer.on = false; });
  addEventListener('pointerup', () => { if (phone) pointer.on = false; }, { passive: true });
  addEventListener('pointercancel', () => { pointer.on = false; }, { passive: true });
  addEventListener('scroll', readScroll, { passive: true });

  let lastW = 0; let lastH = 0; let timer = 0;
  addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 130) return;
      lastW = innerWidth; lastH = innerHeight; build(); readScroll();
    }, 180);
  });
  new IntersectionObserver(([en]) => {
    const was = running; running = en.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }).observe(root);

  root.classList.add('live');
  (document.fonts?.ready || Promise.resolve()).then(() => {
    lastW = innerWidth; lastH = innerHeight;
    build(); readScroll(); prog = target;
    requestAnimationFrame(frame);
  });
})();
