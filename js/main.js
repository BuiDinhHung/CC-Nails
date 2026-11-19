(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Intro curtain ---------- */
  const intro = $('#intro');
  const start = performance.now();
  const lift = () => {
    if (root.classList.contains('is-ready')) return;
    const wait = reduceMotion ? 0 : Math.max(0, 1250 - (performance.now() - start));
    setTimeout(() => {
      root.classList.add('is-ready');
      setTimeout(() => intro && intro.classList.add('is-gone'), reduceMotion ? 0 : 1200);
    }, wait);
  };
  if (document.readyState === 'complete') lift();
  else window.addEventListener('load', lift);
  setTimeout(lift, 3200); // never keep visitors waiting on a slow image

  /* ---------- Nav state + progress bar ---------- */
  const nav = $('#nav');
  const progress = $('#progress');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = $('#navToggle');
  const menu = $('#mobileMenu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    document.body.style.overflow = open ? 'hidden' : '';
    root.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 800);
    }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 900 && !menu.hidden) setMenu(false); });

  /* ---------- Scroll reveal (text + image wipes) ---------- */
  const reveals = $$('.reveal, .reveal-img');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el, i) => {
      if (el.classList.contains('reveal')) el.style.transitionDelay = `${(i % 4) * 70}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Current section in nav ---------- */
  const links = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ---------- Hero: golden dust particles ---------- */
  const hero = $('.hero');
  const canvas = $('#dust');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, parts = [], running = true, raf;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, w / 16));
      parts = Array.from({ length: n }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.7 + .4,
      vy: -(Math.random() * .35 + .08),
      vx: (Math.random() - .5) * .15,
      a: Math.random() * .6 + .25,
      t: Math.random() * Math.PI * 2,
    });
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx + Math.sin(p.t) * .12; p.y += p.vy; p.t += .015;
        if (p.y < -10) Object.assign(p, spawn(false));
        const alpha = p.a * (.55 + .45 * Math.sin(p.t * 2));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(255, 248, 232, ${alpha})`);
        g.addColorStop(1, 'rgba(255, 248, 232, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener('resize', resize);
    tick();
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) tick();
    }).observe(hero);
  }

  /* ---------- Hero: pointer spotlight + layered parallax ---------- */
  const visual = $('#heroVisual');
  if (finePointer && !reduceMotion && hero) {
    const spot = $('#spot');
    const layers = $$('[data-depth]', visual);
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      spot.style.setProperty('--mx', `${x}px`);
      spot.style.setProperty('--my', `${y}px`);
      const nx = x / r.width - .5, ny = y / r.height - .5;
      layers.forEach((l) => {
        const d = +l.dataset.depth;
        l.style.transform = `translate3d(${(-nx * d).toFixed(1)}px, ${(-ny * d).toFixed(1)}px, 0)`;
      });
    });
    hero.addEventListener('pointerleave', () => layers.forEach((l) => { l.style.transform = ''; }));
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = `translate(${(x * 10).toFixed(1)}px, ${(y * 8).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Services: preview swap ---------- */
  const preview = $('#servicePreview');
  const count = $('#serviceCount');
  const services = $$('.service');
  let current = services[0];
  if (current) current.classList.add('is-active');
  services.forEach((item) => { const img = new Image(); img.src = item.dataset.img; });
  const activate = (item) => {
    if (item === current) return;
    current.classList.remove('is-active');
    item.classList.add('is-active');
    current = item;
    preview.classList.add('is-swapping');
    count.textContent = $('.service__n', item).textContent;
    setTimeout(() => { preview.src = item.dataset.img; preview.classList.remove('is-swapping'); }, reduceMotion ? 0 : 280);
  };
  services.forEach((item) => {
    item.tabIndex = 0;
    item.addEventListener('mouseenter', () => activate(item));
    item.addEventListener('focus', () => activate(item));
  });

  /* ---------- Signature carousel: slow auto-scroll loop, drag, arrows, progress ---------- */
  const track = $('#sigTrack');
  const bar = $('#sigBar');
  if (track) {
    const SPEED = 28; // px per second — calm, slow drift
    const originals = $$('.sig-card', track);
    // clone the cards once so the loop is seamless
    originals.forEach((card) => {
      const c = card.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      $$('img', c).forEach((img) => { img.alt = ''; });
      track.appendChild(c);
    });
    track.classList.add('is-auto');

    const loopWidth = () => track.children[originals.length].offsetLeft - originals[0].offsetLeft;
    const gap = () => parseFloat(getComputedStyle(track).columnGap) || 24;
    const step = () => originals[0].offsetWidth + gap();
    let pos = track.scrollLeft;
    const wrap = () => {
      const L = loopWidth();
      if (L > 0 && track.scrollLeft >= L) { pos = track.scrollLeft - L; track.scrollLeft = pos; }
    };
    const update = () => {
      const L = loopWidth();
      const p = L > 0 ? (track.scrollLeft % L) / L : 0;
      bar.style.setProperty('--p', Math.max(0.04, p).toFixed(4));
    };
    track.addEventListener('scroll', () => { wrap(); update(); }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // pause while the visitor is interacting, off-screen or in a background tab
    let hovering = false, dragging = false, focused = false, visible = true, holdUntil = 0;
    const hold = (ms) => { holdUntil = performance.now() + ms; };
    const resync = () => { pos = track.scrollLeft; };

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(64, now - last); last = now;
      const paused = hovering || dragging || focused || !visible || document.hidden || now < holdUntil;
      if (!paused && !reduceMotion) {
        if (Math.abs(track.scrollLeft - pos) > 2) resync(); // user scrolled natively
        pos += (SPEED * dt) / 1000;
        const L = loopWidth();
        if (L > 0 && pos >= L) pos -= L;
        track.scrollLeft = pos;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; resync(); }).observe(track);
    }
    track.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
    track.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovering = false; resync(); } });
    track.addEventListener('focusin', () => { focused = true; });
    track.addEventListener('focusout', () => { focused = false; resync(); });
    track.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
    track.addEventListener('touchend', () => { dragging = false; hold(2500); setTimeout(resync, 2400); }, { passive: true });

    const nudge = (dir) => {
      hold(1600);
      if (dir < 0 && track.scrollLeft < step()) track.scrollLeft += loopWidth();
      track.scrollBy({ left: dir * step(), behavior: 'smooth' });
      setTimeout(resync, 1500);
    };
    $('#sigPrev').addEventListener('click', () => nudge(-1));
    $('#sigNext').addEventListener('click', () => nudge(1));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
    });

    // mouse drag (touch uses native scrolling)
    let down = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; dragging = true; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) track.classList.add('is-dragging');
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false; dragging = false;
      track.classList.remove('is-dragging');
      resync();
    });
  }

  /* ---------- Gallery: sliding filter pill ---------- */
  const filters = $$('.filter');
  const pill = $('#filterPill');
  const items = $$('.g-item');
  const movePill = (btn) => {
    if (!pill || !btn) return;
    pill.style.left = `${btn.offsetLeft}px`;
    pill.style.top = `${btn.offsetTop}px`;
    pill.style.width = `${btn.offsetWidth}px`;
  };
  movePill($('.filter.is-active'));
  window.addEventListener('resize', () => movePill($('.filter.is-active')));
  document.fonts && document.fonts.ready.then(() => movePill($('.filter.is-active')));
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      movePill(btn);
      let k = 0;
      items.forEach((it) => {
        const show = f === 'all' || it.dataset.cat === f;
        it.classList.toggle('is-hidden', !show);
        it.classList.remove('pop');
        if (show) {
          it.classList.add('is-visible');
          if (!reduceMotion) {
            void it.offsetWidth; // restart animation
            it.style.animationDelay = `${Math.min(k++, 12) * 45}ms`;
            it.classList.add('pop');
          }
        }
      });
    });
  });

  /* ---------- Gallery: 3D tilt + glare ---------- */
  if (finePointer && !reduceMotion) {
    $$('.g-btn').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', `${((x - .5) * 8).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((.5 - y) * 8).toFixed(2)}deg`);
        el.style.setProperty('--px', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--py', `${(y * 100).toFixed(1)}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbCap = $('#lbCap');
  let set = [], index = 0, lastFocus = null;
  const show = (i, dir = 0) => {
    index = (i + set.length) % set.length;
    const btn = set[index];
    lbImg.style.opacity = '0';
    lbImg.style.transform = `translateX(${dir * 30}px)`;
    const src = btn.dataset.full;
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      lbImg.src = src;
      lbImg.alt = $('img', btn).alt;
      lbImg.style.transform = `translateX(${-dir * 30}px)`;
      requestAnimationFrame(() => { lbImg.style.opacity = '1'; lbImg.style.transform = 'none'; });
    };
    pre.src = src;
    lbCap.textContent = `${String(index + 1).padStart(2, '0')} / ${String(set.length).padStart(2, '0')}`;
  };
  const open = (btn) => {
    set = items.filter((it) => !it.classList.contains('is-hidden')).map((it) => $('.g-btn', it));
    lastFocus = btn;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('is-open'));
    show(set.indexOf(btn));
    $('#lbClose').focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; lbImg.src = ''; }, 400);
    if (lastFocus) lastFocus.focus();
  };
  $('#gallery').addEventListener('click', (e) => { const btn = e.target.closest('.g-btn'); if (btn) open(btn); });
  $('#lbClose').addEventListener('click', close);
  $('#lbPrev').addEventListener('click', () => show(index - 1, -1));
  $('#lbNext').addEventListener('click', () => show(index + 1, 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__figure')) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false);
      return;
    }
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1, -1);
    else if (e.key === 'ArrowRight') show(index + 1, 1);
    else if (e.key === 'Tab') {
      const f = $$('button', lb), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    x0 = null;
  });

  /* ---------- Opening hours: today + open/closed (Swiss time) ---------- */
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const mins = (+get('hour') % 24) * 60 + +get('minute');
    $$('.hours').forEach((row) => row.classList.toggle('is-today', row.dataset.days.split(',').includes(String(day))));
    const close = day >= 1 && day <= 5 ? 19 * 60 : day === 6 ? 18 * 60 : 0;
    const isOpen = close > 0 && mins >= 9 * 60 && mins < close;
    const badge = $('#openState');
    badge.textContent = isOpen ? 'Jetzt geöffnet' : 'Geschlossen';
    badge.classList.toggle('is-closed', !isOpen);
    badge.hidden = false;
  } catch (_) { /* older browsers: simply no badge */ }

  /* ---------- Year ---------- */
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
