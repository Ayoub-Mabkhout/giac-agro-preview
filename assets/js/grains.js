/* 1,100 grains, one per member company. Each home page section holds its own field of grains,
   which fall into shape once when the section comes into view. Scrolling stays entirely native. */
(() => {
  const sections = [...document.querySelectorAll('[data-gs]')];
  if (!sections.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = document.documentElement.dir === 'rtl';
  const N = 1100;
  const logoSvg = document.getElementById('gs-logo');
  const mapSvg = document.getElementById('gs-map');
  const logoParts = [...logoSvg.querySelectorAll('path')].map((p) => ({ path: new Path2D(p.getAttribute('d')), fill: p.getAttribute('fill') }));
  const regions = [...mapSvg.querySelectorAll('path')].map((p) => ({ path: new Path2D(p.getAttribute('d')), name: p.dataset.name, south: !!p.dataset.south }));
  const mapW = +mapSvg.dataset.w;
  const mapH = +mapSvg.dataset.h;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const smooth = (v) => v * v * (3 - 2 * v);
  const fitBox = (box, ar) => { let w = box.w; let h = w / ar; if (h > box.h) { h = box.h; w = h * ar; } return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }; };

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

  function stage(sec) {
    const kind = sec.dataset.gs;
    const cv = sec.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const tx = sec.querySelector('.gs-tx');
    const label = sec.querySelector('[data-region]');
    const fallback = label ? label.textContent : '';
    const count = kind === 'bars' ? JSON.parse(sec.dataset.bars).reduce((a, b) => a + b.v, 0) : N;
    const X = new Float32Array(count); const Y = new Float32Array(count); const S = new Float32Array(count);
    const A = new Float32Array(count).fill(1); const R = new Float32Array(count); const G = new Float32Array(count); const B = new Float32Array(count);
    const BX = new Float32Array(count); const BY = new Float32Array(count); const REG = new Int16Array(count).fill(-1);
    const SX = new Float32Array(count); const SY = new Float32Array(count); const OX = new Float32Array(count); const OY = new Float32Array(count);
    const PX = new Float32Array(count); const PY = new Float32Array(count);
    const r1 = new Float32Array(count).map(() => Math.random()); const r2 = new Float32Array(count).map(() => Math.random());
    let W = 0; let H = 0; let phone = false; let bars = null; let scaled = []; let hot = -1; let pointer = { x: 0, y: 0, on: false };
    let visible = false; let t0 = 0; let awake = 0; let running = false;

    function box() {
      const t = tx.getBoundingClientRect(); const s = sec.getBoundingClientRect();
      if (phone) return { x: 18, y: 18, w: W - 36, h: Math.max(180, t.top - s.top - 30) };
      return { x: rtl ? W * 0.03 : W * 0.47, y: H * 0.08, w: W * 0.5, h: H * 0.84 };
    }

    function logo() {
      const f = fitBox(box(), 916 / 389); const k = 2;
      const pts = sample(916 * k, 389 * k, (g) => { g.scale(k, k); logoParts.forEach((p) => { g.fillStyle = p.fill; g.fill(p.path, 'evenodd'); }); }, N);
      const s = f.w / (916 * k);
      pts.forEach((p, i) => { X[i] = f.x + p.x * s; Y[i] = f.y + p.y * s; R[i] = p.r; G[i] = p.g; B[i] = p.b; S[i] = phone ? 1.55 : 2.5; });
    }

    function field() {
      const t = tx.getBoundingClientRect(); const s = sec.getBoundingClientRect();
      const horizon = t.bottom - s.top + (phone ? 70 : 90);
      const gold = [[231, 185, 60], [242, 205, 96], [214, 158, 46], [244, 170, 60]];
      for (let i = 0; i < N; i++) {
        const d = r2[i] ** 1.6;
        const baseY = horizon + (H * 1.03 - horizon) * d;
        const tall = (phone ? 50 : 56) + d * (phone ? 84 : 110);
        BX[i] = r1[i] * (W + 80) - 40; BY[i] = baseY; X[i] = BX[i]; Y[i] = baseY - tall;
        const c = gold[i % 4]; R[i] = c[0]; G[i] = c[1]; B[i] = c[2];
        S[i] = (phone ? 1.4 : 1.8) + d * (phone ? 2.6 : 3.6);
      }
    }

    function map() {
      const f = fitBox(box(), mapW / mapH); const s = f.w / mapW;
      scaled = regions.map((r) => { const p = new Path2D(); p.addPath(r.path, new DOMMatrix([s, 0, 0, s, f.x, f.y])); return p; });
      const pts = sample(Math.round(mapW), Math.round(mapH), (g) => { regions.forEach((r, i) => { g.fillStyle = `rgb(${(i + 1) * 20},0,0)`; g.fill(r.path); }); }, N, (r) => {
        const idx = Math.round(r / 20) - 1;
        return idx >= 0 && idx < regions.length && (!regions[idx].south || Math.random() < 0.34);
      });
      pts.forEach((p, i) => { X[i] = f.x + p.x * s; Y[i] = f.y + p.y * s; REG[i] = Math.round(p.r / 20) - 1; R[i] = 196; G[i] = 214; B[i] = 245; S[i] = phone ? 1.5 : 2.5; });
    }

    function columns() {
      const data = JSON.parse(sec.dataset.bars); const b = box();
      const n = data.length; const gap = b.w * 0.035; const colW = (b.w - gap * (n - 1)) / n;
      const top = b.y + (phone ? 28 : 44); const bottom = b.y + b.h - (phone ? 22 : 28);
      const max = Math.max(...data.map((d) => d.v));
      const cell = Math.sqrt((colW * (bottom - top)) / max);
      const cols = Math.max(4, Math.floor(colW / cell));
      const dx = colW / cols; const dy = (bottom - top) / Math.ceil(max / cols);
      bars = { items: [], y: bottom };
      let idx = 0;
      data.forEach((d, c) => {
        const x0 = b.x + c * (colW + gap); const last = c === n - 1;
        for (let k = 0; k < d.v; k++, idx++) {
          X[idx] = x0 + (k % cols) * dx + dx / 2; Y[idx] = bottom - Math.floor(k / cols) * dy - dy / 2;
          R[idx] = last ? 244 : 8; G[idx] = last ? 88 : 27; B[idx] = last ? 26 : 62;
          S[idx] = Math.max(1.5, Math.min(dx, dy) * 0.36);
        }
        bars.items.push({ x: x0, v: d.v, y: d.y, top: bottom - Math.ceil(d.v / cols) * dy });
      });
    }

    function build() {
      const b = sec.getBoundingClientRect();
      W = b.width; H = b.height; phone = W < 900;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ({ logo, field, map, bars: columns })[kind]();
      for (let i = 0; i < count; i++) { SX[i] = X[i] + (r1[i] - 0.5) * W * 0.5; SY[i] = -30 - r2[i] * H * 0.9; }
    }

    function draw(now) {
      const time = now / 1000;
      const age = reduce ? 9 : (now - t0) / 1000;
      const settled = age > 2.1;
      const reach = phone ? 70 : 110;
      ctx.clearRect(0, 0, W, H);
      const wheat = kind === 'field';
      if (wheat) { ctx.strokeStyle = 'rgb(205,165,70)'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); }
      for (let i = 0; i < count; i++) {
        const q = settled ? 1 : smooth(clamp(age / 1.5 - r1[i] * 0.4));
        let x = SX[i] + (X[i] - SX[i]) * q;
        const y = SY[i] + (Y[i] - SY[i]) * q;
        if (wheat) {
          const d = (BY[i] - H * 0.4) / (H * 0.6);
          const sway = reduce ? 0 : (Math.sin(time * 1.5 + BX[i] * 0.011 + BY[i] * 0.02) * 0.6 + Math.sin(time * 0.7 + BX[i] * 0.004) * 0.4) * (7 + 16 * d);
          x += sway * q;
          ctx.moveTo(BX[i], BY[i]);
          ctx.quadraticCurveTo(BX[i] + sway * 0.2, (BY[i] + y) / 2, x, y);
        }
        const dx = x + OX[i] - pointer.x; const dy = y + OY[i] - pointer.y; const dd = dx * dx + dy * dy;
        if (pointer.on && dd < reach * reach) {
          const dist = Math.sqrt(dd) || 1; const f = (1 - dist / reach) * 7;
          OX[i] += (dx / dist) * f; OY[i] += (dy / dist) * f;
        }
        OX[i] *= 0.91; OY[i] *= 0.91;
        PX[i] = x + OX[i]; PY[i] = y + OY[i];
      }
      if (wheat) { ctx.stroke(); ctx.globalAlpha = 1; }
      for (let i = 0; i < count; i++) {
        if (A[i] < 0.02) continue;
        const lit = hot >= 0 && REG[i] === hot;
        ctx.globalAlpha = A[i];
        ctx.fillStyle = lit ? 'rgb(255,225,86)' : `rgb(${R[i] | 0},${G[i] | 0},${B[i] | 0})`;
        ctx.beginPath();
        ctx.ellipse(PX[i], PY[i], S[i] * 1.45, S[i], r1[i] * 6.28, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (bars) {
        ctx.globalAlpha = smooth(clamp((age - 1.1) / 0.6));
        ctx.fillStyle = '#081B3E'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        bars.items.forEach((b) => {
          ctx.font = `400 ${phone ? 26 : 40}px Fraunces, Georgia, serif`; ctx.fillText(b.v, b.x + 1, b.top - 8);
          ctx.font = `500 ${phone ? 14 : 16}px 'Hanken Grotesk', system-ui, sans-serif`; ctx.fillText(b.y, b.x + 1, bars.y + (phone ? 20 : 26));
        });
        ctx.globalAlpha = 1;
      }
      return settled;
    }

    function loop(now) {
      if (!visible) { running = false; return; }
      const settled = draw(now);
      if (awake > 0) awake--;
      if (settled && !pointer.on && awake === 0 && kind !== 'field') { running = false; return; }
      requestAnimationFrame(loop);
    }
    const wake = () => { awake = 50; if (!running && visible && !reduce) { running = true; requestAnimationFrame(loop); } };

    const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    function hit(x, y) {
      if (kind !== 'map') return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const was = hot; hot = scaled.findIndex((p) => ctx.isPointInPath(p, x, y));
      ctx.restore();
      if (hot !== was && label) label.textContent = hot >= 0 ? regions[hot].name : fallback;
      if (reduce && hot !== was) draw(performance.now());
    }
    const move = (e) => { const [x, y] = local(e); pointer = { x, y, on: !reduce }; hit(x, y); wake(); };
    const off = () => { pointer.on = false; wake(); };
    sec.addEventListener('pointermove', move, { passive: true });
    sec.addEventListener('pointerdown', move, { passive: true });
    sec.addEventListener('pointerleave', off);
    sec.addEventListener('pointerup', off);
    sec.addEventListener('pointercancel', off);

    let started = false;
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (!visible) return;
      if (!started) { started = true; t0 = performance.now(); }
      if (reduce) draw(performance.now()); else wake();
    }, { threshold: 0.25 }).observe(sec);

    return { rebuild() { build(); if (started) { awake = 2; if (reduce) draw(performance.now()); else wake(); } }, build };
  }

  sections.forEach((s) => s.classList.add('live'));
  const stages = sections.map(stage);
  let lastW = 0; let lastH = 0; let timer = 0;
  addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 130) return;
      lastW = innerWidth; lastH = innerHeight;
      stages.forEach((s) => s.rebuild());
    }, 180);
  });
  (document.fonts?.ready || Promise.resolve()).then(() => {
    lastW = innerWidth; lastH = innerHeight;
    stages.forEach((s) => s.build());
  });
})();
