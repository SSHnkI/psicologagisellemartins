/* =====================================================================
   GISELLE MARTINS · interações
   Lenis (smooth scroll) + IntersectionObserver reveal + cursor +
   parallax + tilt 3D + magnetic + navbar + menu mobile + loader
   JS apenas para motion — o restante é CSS puro.
   ===================================================================== */
(() => {
  'use strict';
  const isTouch = window.matchMedia('(hover: none)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- LOADER ---------- */
  window.addEventListener('load', () => {
    const loader = document.querySelector('.loader');
    if (loader) setTimeout(() => loader.classList.add('done'), 1700);
  });

  /* ---------- LENIS SMOOTH SCROLL ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ---------- ÂNCORAS ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(el, { offset: -70 });
      else el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- NAVBAR ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 40); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- MENU MOBILE ---------- */
  const burger = document.querySelector('.nav__burger');
  const menu = document.querySelector('.mobile-menu');
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('open');
    burger && burger.classList.remove('active');
    document.body.classList.remove('menu-open');
  }
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.classList.toggle('active', open);
      document.body.classList.toggle('menu-open', open);
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  }

  /* ---------- REVEAL (IntersectionObserver) ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .reveal-line').forEach((el) => io.observe(el));

  if (reduce) { document.querySelectorAll('.reveal, .reveal-line').forEach((el) => el.classList.add('in')); }

  /* ---------- CURSOR CUSTOMIZADO ---------- */
  if (!isTouch && !reduce) {
    const cursor = document.querySelector('.cursor');
    const dot = document.querySelector('.cursor__dot');
    const ring = document.querySelector('.cursor__ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (dot) { dot.style.left = mx + 'px'; dot.style.top = my + 'px'; }
    });
    const animRing = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      if (ring) { ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
      requestAnimationFrame(animRing);
    };
    animRing();
    document.querySelectorAll('a, button, .card-3d, .topic, .need, .step, .faq summary').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor && cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('is-hover'));
    });
  }

  /* ---------- PARALLAX (data-parallax) ---------- */
  if (!reduce) {
    const layers = [...document.querySelectorAll('[data-parallax]')];
    if (layers.length) {
      const onParallax = () => {
        const y = window.scrollY;
        layers.forEach((l) => {
          const speed = parseFloat(l.dataset.parallax) || 0.2;
          l.style.transform = `translate3d(0, ${y * speed}px, 0)`;
        });
      };
      window.addEventListener('scroll', onParallax, { passive: true });
      onParallax();
    }
  }

  /* ---------- TILT 3D (data-tilt) ---------- */
  if (!isTouch && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const max = 9;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * max}deg) rotateX(${(0.5 - py) * max}deg) translateY(-6px)`;
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- BOTÕES MAGNÉTICOS (data-magnetic) ---------- */
  if (!isTouch && !reduce) {
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- HERO PARALLAX (mouse) ---------- */
  if (!isTouch && !reduce) {
    const heroLayer = document.querySelector('.hero__layer');
    const portrait = document.querySelector('.hero__portrait');
    document.querySelector('.hero')?.addEventListener('mousemove', (e) => {
      const cx = (e.clientX / innerWidth - 0.5);
      const cy = (e.clientY / innerHeight - 0.5);
      if (heroLayer) heroLayer.style.transform = `scale(1.1) translate(${cx * -18}px, ${cy * -18}px)`;
      if (portrait) portrait.style.transform = `translate(${cx * 14}px, ${cy * 14}px)`;
    });
  }

  /* ---------- ANO RODAPÉ ---------- */
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
