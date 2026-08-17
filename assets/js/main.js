/* =====================================================================
   GISELLE MARTINS · interações
   Reveal (IntersectionObserver) + navbar + menu mobile + loader + tilt.
   JS apenas para motion — o restante é CSS puro.

   Removidos nesta versão, e por quê:
   · atraso artificial de 1,1s no loader — 2,1s de tela em branco na
     primeira visita, sem função;
   · Lenis (CDN externo) — `scroll-behavior: smooth` do CSS já resolve,
     sem request de terceiros nem inércia de rolagem;
   · cursor customizado — escondia o cursor nativo e apagava a affordance
     de clicável; sem cursor nenhum se o JS falhasse;
   · botões magnéticos — o CTA fugia do ponteiro em até 35%.
   ===================================================================== */
(() => {
  'use strict';
  const isTouch = window.matchMedia('(hover: none)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Limitador único de rAF para scroll e mousemove. Sem ele cada evento
     escrevia `transform` na hora — e scroll e mouse disparam bem mais que
     60x/s, obrigando o navegador a recalcular estilo em todos. */
  const raf = (fn) => {
    let queued = false, last;
    return (...args) => {
      last = args;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(...last); });
    };
  };

  /* ---------- LOADER (sem atraso artificial, à prova de falhas) ---------- */
  const hideLoader = () => {
    const loader = document.querySelector('.loader');
    if (loader) loader.classList.add('done');
  };
  if (document.readyState !== 'loading') hideLoader();
  else document.addEventListener('DOMContentLoaded', hideLoader);
  setTimeout(hideLoader, 2500); // rede de segurança

  /* ---------- ÂNCORAS ----------
     O deslocamento da navbar fixa vem de `scroll-margin-top` no CSS. */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
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
    if (burger) { burger.classList.remove('active'); burger.setAttribute('aria-expanded', 'false'); }
    document.body.classList.remove('menu-open');
  }
  if (burger && menu) {
    burger.setAttribute('aria-expanded', 'false');
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.classList.toggle('active', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- REVEAL (IntersectionObserver) ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .reveal-line').forEach((el) => io.observe(el));

  if (reduce) { document.querySelectorAll('.reveal, .reveal-line').forEach((el) => el.classList.add('in')); }

  /* ---------- PARALLAX (data-parallax) ---------- */
  if (!reduce) {
    const layers = [...document.querySelectorAll('[data-parallax]')];
    if (layers.length) {
      const onParallax = raf(() => {
        const y = window.scrollY;
        layers.forEach((l) => {
          const speed = parseFloat(l.dataset.parallax) || 0.2;
          l.style.transform = `translate3d(0, ${y * speed}px, 0)`;
        });
      });
      window.addEventListener('scroll', onParallax, { passive: true });
      onParallax();
    }
  }

  /* ---------- TILT 3D (data-tilt) ---------- */
  if (!isTouch && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const max = 9;
      /* rect medido no mouseenter, não a cada mousemove — ler
         getBoundingClientRect no meio do movimento força layout sincrônico. */
      let r = null;
      card.addEventListener('mouseenter', () => { r = card.getBoundingClientRect(); });
      card.addEventListener('mousemove', raf((e) => {
        if (!r) r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * max}deg) rotateX(${(0.5 - py) * max}deg) translateY(-6px)`;
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
      }));
      card.addEventListener('mouseleave', () => { card.style.transform = ''; r = null; });
    });
  }

  /* ---------- HERO PARALLAX (mouse) ---------- */
  if (!isTouch && !reduce) {
    const portrait = document.querySelector('.hero__portrait');
    document.querySelector('.hero')?.addEventListener('mousemove', raf((e) => {
      const cx = (e.clientX / innerWidth - 0.5);
      const cy = (e.clientY / innerHeight - 0.5);
      if (portrait) portrait.style.transform = `translate(${cx * 14}px, ${cy * 14}px)`;
    }));
  }

  /* ---------- ANO RODAPÉ ---------- */
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
