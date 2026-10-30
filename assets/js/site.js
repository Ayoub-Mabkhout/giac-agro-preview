(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window */ } },
  };

  /* menus */
  const subs = $$('.has-sub > button');
  const closeSubs = (except) => subs.forEach((b) => {
    if (b === except) return;
    b.setAttribute('aria-expanded', 'false');
    b.nextElementSibling.hidden = true;
  });
  subs.forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = b.getAttribute('aria-expanded') === 'true';
      closeSubs(b);
      b.setAttribute('aria-expanded', String(!open));
      b.nextElementSibling.hidden = open;
    });
    b.parentElement.addEventListener('mouseenter', () => {
      if (!matchMedia('(hover: hover)').matches) return;
      closeSubs(b);
      b.setAttribute('aria-expanded', 'true');
      b.nextElementSibling.hidden = false;
    });
    b.parentElement.addEventListener('mouseleave', () => {
      if (!matchMedia('(hover: hover)').matches) return;
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.hidden = true;
    });
  });
  document.addEventListener('click', () => closeSubs());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSubs(); toggleDrawer(false); } });

  const menuBtn = $('.tile-menu');
  const drawer = $('#drawer');
  const label = menuBtn ? menuBtn.textContent : '';
  const closeLabel = document.documentElement.lang === 'ar' ? 'إغلاق' : 'Fermer';
  function toggleDrawer(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? closeLabel : label;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn?.addEventListener('click', () => toggleDrawer(drawer.hidden));
  $$('#drawer a').forEach((a) => a.addEventListener('click', () => toggleDrawer(false)));

  /* entrances */
  const groups = [['.wall > *', '.wall'], ['.rates tbody tr', '.rates'], ['.close-strip img', '.close-strip']];
  groups.forEach(([sel]) => $$(sel).forEach((el, i) => el.style.setProperty('--n', i)));
    $$('.flow > :not(ul):not(ol), .check li, .plain li, .vows li, .med-grid li, .logos li, .route li li, .pay li, .mg-b, .mg-c, .mg-d, .mast-title > *, .coords > *, .cert > *, .band > *, .nextband > *, .foot-row > *, .sim-form > *, .sim-result > *, .sim-dossier > *, .med-filters > *, .docs article').forEach((el) => el.setAttribute('data-rise', ''));
  $$('[data-rise]').forEach((el) => {
    const peers = [...el.parentElement.children].filter((x) => x.hasAttribute('data-rise'));
    el.style.setProperty('--d', `${Math.min(peers.indexOf(el), 5) * 70}ms`);
  });
  const io = new IntersectionObserver((list) => list.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    io.unobserve(en.target);
    if (en.target.matches('[data-count-to]')) countUp(en.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-rise], .wall, .rates, .iso-cert, .close-strip, .panel, .study, .story-y, [data-count-to]').forEach((el) => io.observe(el));

  setTimeout(() => {
    $$('.shutter').forEach((el) => el.classList.add('is-in'));
  }, 60);

  function countUp(el) {
    if (reduce) return;
    const to = +el.dataset.countTo;
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const t0 = performance.now();
    const dur = 1100;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* scroll stages: the hero doors, and the studies rail on wide screens */
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const rail = $('[data-rail]');
  const wide = matchMedia('(min-width: 900px)');
  const track = rail && $('.rail-track', rail);
  function sizeRail() {
    if (!rail) return;
    const on = wide.matches && !reduce;
    rail.classList.toggle('pinned', on);
    rail.style.height = '';
    if (!on) return;
    const dist = Math.max(0, track.scrollWidth - innerWidth);
    rail.style.setProperty('--dist', `${dist}px`);
    rail.style.height = `${innerHeight + dist}px`;
  }
  function frame() {
    if (rail && rail.classList.contains('pinned')) {
      const r = rail.getBoundingClientRect();
      rail.style.setProperty('--p', clamp(-r.top / (rail.offsetHeight - innerHeight)).toFixed(4));
    }
  }
  sizeRail();
  let ticking = false;
  const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sizeRail(); frame(); });
  addEventListener('load', () => { sizeRail(); frame(); });
  frame();

  /* phones: the bar leaves on the way down, and the action dock steps aside near its target */
  const bar = $('.bar');
  const dock = $('.dock');
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (Math.abs(y - last) < 6) return;
    bar.classList.toggle('away', y > last && y > 120 && !wide.matches && drawer.hidden);
    last = y;
  }, { passive: true });
  if (dock) {
    const seen = new Set();
    const hide = new IntersectionObserver((list) => {
      list.forEach((en) => (en.isIntersecting ? seen.add(en.target) : seen.delete(en.target)));
      dock.classList.toggle('away', seen.size > 0);
    }, { threshold: 0.05 });
    $$('.sim, .foot, .close').forEach((el) => hide.observe(el));
  }

  /* map */
  $$('[data-map]').forEach((fig) => {
    const cap = $('figcaption', fig);
    const paths = $$('path', fig);
    const show = (p) => { paths.forEach((x) => x.classList.toggle('on', x === p)); cap.textContent = p.dataset.name; };
    paths.forEach((p) => {
      ['mouseenter', 'focus', 'click'].forEach((ev) => p.addEventListener(ev, () => show(p)));
      p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(p); } });
    });
  });

  /* simulator */
  const simData = $('#sim-data');
  const form = $('[data-sim]');
  if (simData && form) {
    const S = JSON.parse(simData.textContent);
    const root = form.closest('.sim');
    const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
    const money = (n) => `${fmt(n)} ${S.unit}`;
    const study = $('#study', root);
    const cost = $('#cost', root);
    const range = $('#costr', root);
    const unit = $('[data-cost-unit]', root);
    const fullList = $('[data-pieces]', root);
    const count = $('[data-count]', root);
    const barEl = $('[data-bar]', root);
    barEl.innerHTML = '<b></b>'.repeat(48);
    const grains = $$('b', barEl);
    const groupsBy = { entreprise: ['diag', 'if', 'ifd'], organisation: ['sas', 'ifs'] };
    const state = () => ({
      profile: form.elements.profile.value,
      tfp: form.elements.tfp.value === '1',
      branch: +form.elements.branch.value,
      study: study.value,
      cost: Math.max(0, +cost.value.replace(/\D/g, '') || 0),
      prior: root.querySelector('[name=prior]')?.checked,
      tiers: root.querySelector('[name=tiers]')?.checked,
    });
    function fillStudies(profile) {
      study.innerHTML = groupsBy[profile].map((k) => `<option value="${k}">${S.studies[k][0]}</option>`).join('');
      const big = profile === 'organisation';
      range.max = big ? 2000000 : 300000;
      range.min = big ? 100000 : 10000;
      range.step = big ? 25000 : 5000;
      cost.step = range.step;
      range.value = big ? 800000 : 120000;
      cost.value = fmt(+range.value);
    }
    const pieceKey = (st) => `giac-sim-${st.profile}`;
    function renderPieces(st) {
      if (!fullList) return;
      const P = S.pieceData;
      let items = st.profile === 'entreprise' ? [...P.entreprise] : [...P.organisation];
      if (st.profile === 'entreprise' && st.prior) items.splice(7, 0, P.g06);
      if (st.profile === 'entreprise' && st.tiers) items = items.concat(P.tiers);
      const saved = JSON.parse(store.get(pieceKey(st)) || '{}');
      fullList.innerHTML = items.map(([c, t]) => {
        const k = c + t.slice(0, 24);
        return `<li><label><input type="checkbox" data-p="${k.replace(/"/g, '')}"${saved[k.replace(/"/g, '')] ? ' checked' : ''}><span class="box" aria-hidden="true"></span><span class="lbl">${c ? `<bdi class="code">${c}</bdi>` : ''}${t}</span></label></li>`;
      }).join('');
      const tally = () => {
        const b = $$('input', fullList);
        count.textContent = `${b.filter((x) => x.checked).length} / ${b.length} ${S.done}`;
      };
      tally();
      fullList.onchange = (e) => {
        const s = JSON.parse(store.get(pieceKey(st)) || '{}');
        s[e.target.dataset.p] = e.target.checked;
        store.set(pieceKey(st), JSON.stringify(s));
        tally();
      };
    }
    function render() {
      const st = state();
      const [, rate, cap, tax] = S.studies[st.study];
      $$('[data-for]', root).forEach((el) => { el.hidden = el.dataset.for !== st.profile; });
      unit.textContent = `${S.unit} ${tax}`;
      if (+range.value !== st.cost) range.value = Math.min(st.cost, +range.max);
      const out = $('[data-result]', root);
      const stop = $('[data-stop]', root);
      const blocked = st.profile === 'entreprise' && (!st.tfp ? S.outTfp : st.branch === S.branches.length - 1 ? S.outBranch : '');
      out.hidden = !!blocked;
      stop.hidden = !blocked;
      stop.textContent = blocked || '';
      const giac = Math.min(st.cost * rate, cap);
      const rest = st.cost - giac;
      $('[data-giac]', root).textContent = fmt(giac);
      $('[data-giac2]', root).textContent = blocked ? '' : money(giac);
      $('[data-rest]', root).textContent = money(rest);
      $('[data-rate]', root).textContent = `${Math.round(rate * 100)}${document.documentElement.lang === 'ar' ? '٪' : ' %'}`;
      $('[data-fees]', root).textContent = st.profile === 'entreprise' ? S.feesV : S.none;
      $('[data-cot-line]', root).hidden = st.profile !== 'entreprise';
      const lit = st.cost ? Math.round((giac / st.cost) * grains.length) : 0;
      grains.forEach((g, i) => g.classList.toggle('on', i < lit));
      const capEl = $('[data-cap]', root);
      capEl.hidden = !(st.cost * rate > cap);
      capEl.textContent = S.capped.replace('{cap}', `${money(cap)} ${tax}`);
      const sched = $('[data-sched]', root);
      sched.hidden = st.profile !== 'organisation';
      if (!sched.hidden) sched.innerHTML = [0.2, 0.3, 0.3, 0.2].map((x, i) => `<li><strong>${fmt(giac * x)}</strong>${S.schedL[i]}</li>`).join('');
      renderPieces(st);
      const stamp = $('[data-stamp]', root);
      if (stamp && !reduce) { stamp.classList.remove('hit'); void stamp.getBoundingClientRect(); stamp.classList.add('hit'); }
    }
    fillStudies('entreprise');
    form.addEventListener('change', (e) => {
      if (e.target.name === 'profile') fillStudies(e.target.value);
      render();
    });
    root.addEventListener('change', (e) => { if (e.target.name === 'prior' || e.target.name === 'tiers') render(); });
    form.addEventListener('submit', (e) => e.preventDefault());
    cost.addEventListener('input', () => { const c = +cost.value.replace(/\D/g, '') || 0; cost.value = c ? fmt(c) : ''; render(); });
    range.addEventListener('input', () => { cost.value = fmt(+range.value); render(); });
    $('[data-print]', root)?.addEventListener('click', () => window.print());
    render();
  }

  /* checklists remember their state on this device */
  $$('[data-check]').forEach((list) => {
    $$('input', list).forEach((box) => {
      const k = `giac-${box.dataset.k}`;
      box.checked = store.get(k) === '1';
      box.addEventListener('change', () => store.set(k, box.checked ? '1' : '0'));
    });
  });

  /* gallery */
  const buttons = $$('[data-filter]');
  buttons.forEach((b) => b.addEventListener('click', () => {
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('.med-grid li').forEach((li) => { li.hidden = b.dataset.filter !== 'all' && li.dataset.kind !== b.dataset.filter; });
  }));
  const lb = $('#lightbox');
  const shots = $$('[data-lb]');
  if (lb && shots.length) {
    const img = $('img', lb);
    let at = 0;
    const visible = () => shots.filter((a) => !a.closest('li').hidden);
    const show = (a) => {
      const list = visible();
      at = list.indexOf(a);
      img.src = a.href;
      img.alt = $('img', a).alt;
      if (!lb.open) lb.showModal();
    };
    const step = (d) => { const l = visible(); show(l[(at + d + l.length) % l.length]); };
    shots.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); show(a); }));
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    $('.lb-prev', lb).addEventListener('click', () => step(-1));
    $('.lb-next', lb).addEventListener('click', () => step(1));
    lb.addEventListener('keydown', (e) => {
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
      if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
    });
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  }

  /* contact: no server yet, so the form writes the e-mail for the visitor */
  $$('[data-mail]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(f);
    const body = `${d.get('message')}\n\n${d.get('name')}\n${d.get('email')}`;
    location.href = `mailto:${f.dataset.mail}?subject=${encodeURIComponent(d.get('subject'))}&body=${encodeURIComponent(body)}`;
  }));

  /* map embed loads on request */
  $$('[data-embed]').forEach((box) => $('button', box)?.addEventListener('click', () => {
    box.innerHTML = `<iframe src="${box.dataset.embed}" title="${box.dataset.title}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }));
})();
