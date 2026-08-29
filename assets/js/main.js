/* =====================================================================
   GISELLE MARTINS · interações
   Reveal (IntersectionObserver) + navbar + menu mobile + loader + tilt.
   JS apenas para motion: o restante é CSS puro.

   Removidos nesta versão, e por quê:
   · loader inteiro: tela de bloqueio sobre página estática;
   · Lenis (CDN externo): `scroll-behavior: smooth` do CSS já resolve,
     sem request de terceiros nem inércia de rolagem;
   · cursor customizado: escondia o cursor nativo e apagava a affordance
     de clicável; sem cursor nenhum se o JS falhasse;
   · botões magnéticos: o CTA fugia do ponteiro em até 35%.
   ===================================================================== */
(() => {
  'use strict';
  const isTouch = window.matchMedia('(hover: none)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Limitador único de rAF para scroll e mousemove. Sem ele cada evento
     escrevia `transform` na hora: e scroll e mouse disparam bem mais que
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

  /* LOADER removido: a tela de bloqueio saiu do HTML e do CSS.
     Escondia headline e CTA por até 2,5s na primeira visita. */

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

  /* ---------- NAVBAR: COLAPSO MEDIDO ----------
     Cada página tem um conjunto diferente de links, então nenhum breakpoint
     fixo serve para todas: no index cabiam 5 links em 1166px, em /sobre os
     mesmos 1166px estouravam o botão 44px para fora da viewport.
     Aqui a barra mede a própria largura natural e colapsa para o hamburguer
     quando não cabe: vale para qualquer página, qualquer fonte e qualquer
     zoom. A media query de 1080px continua no CSS como rede de segurança
     para quem estiver sem JS. */
  const navLinks = document.querySelector('.nav__links');
  if (nav && navLinks) {
    const navCta = document.querySelector('.nav__cta');
    const brand = nav.querySelector('.brand');

    const fitCheck = () => {
      // mede sempre no estado expandido, senão os elementos escondidos
      // reportam largura 0 e a barra nunca voltaria a abrir
      nav.classList.remove('nav--compact');
      const cs = getComputedStyle(nav);
      const gap = parseFloat(cs.columnGap) || 0;
      const disponivel = nav.clientWidth
        - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const preciso = brand.offsetWidth + navLinks.scrollWidth
        + (navCta ? navCta.offsetWidth : 0) + gap * 2;
      nav.classList.toggle('nav--compact', preciso > disponivel);
    };

    fitCheck();
    window.addEventListener('resize', raf(fitCheck), { passive: true });
    // as fontes chegam depois do primeiro layout e mudam a largura dos links
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCheck);
  }

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
      /* rect medido no mouseenter, não a cada mousemove: ler
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

  /* ---------- BORDA VIVA NOS CARDS ----------
     Porte vanilla do <BorderGlow /> (React Bits). A matemática é a mesma do
     original: proximidade da borda (0100) + ângulo do cursor a partir do
     centro; o CSS usa os dois numa máscara cônica. O que muda é a entrega 
     sem React, um único listener no documento em vez de um por card. */
  if (!isTouch && !reduce) {
    /* Um listener no documento medindo os 10 cards a cada frame custava
       ~1,2ms por frame só em getBoundingClientRect: e rodava com o ponteiro
       em qualquer lugar da página, inclusive longe de todo card.
       Agora: listener por card, rect medido UMA vez no pointerenter e
       reaproveitado. Zero leitura de layout por frame, zero trabalho quando
       o ponteiro não está sobre um card. Mesmo padrão do tilt logo acima. */
    document.querySelectorAll('.glow-card').forEach((card) => {
      let r = null;
      const move = raf((x, y) => {
        if (!r) return;
        const cx = r.width / 2, cy = r.height / 2;
        const dx = x - r.left - cx, dy = y - r.top - cy;
        // razão entre a distância ao centro e a distância até a borda no
        // mesmo eixo: 0 no centro, 1 exatamente na borda
        const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
        const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
        const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
        let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (deg < 0) deg += 360;
        card.style.setProperty('--edge-proximity', (edge * 100).toFixed(1));
        card.style.setProperty('--cursor-angle', deg.toFixed(1) + 'deg');
      });
      card.addEventListener('pointerenter', () => { r = card.getBoundingClientRect(); });
      card.addEventListener('pointermove', (e) => move(e.clientX, e.clientY), { passive: true });
      card.addEventListener('pointerleave', () => {
        r = null;
        card.style.setProperty('--edge-proximity', '0');
      });
    });
  }

  /* ---------- DOCK DE NAVEGAÇÃO ----------
     Porte vanilla do <Dock /> (React Bits). A ampliação por proximidade do
     ponteiro é a mesma ideia; o spring do `motion` virou uma transition de
     CSS, que o compositor resolve sozinho: sem 60 re-renders por segundo. */
  const dock = document.querySelector('.dock');
  if (dock) {
    const items = [...dock.querySelectorAll('.dock__item')];
    const BASE = 44, MAX = 62, DIST = 130;

    if (!isTouch && !reduce) {
      const magnify = raf((x) => {
        for (const it of items) {
          const r = it.getBoundingClientRect();
          const d = Math.abs(x - (r.left + r.width / 2));
          const k = Math.max(0, 1 - d / DIST);
          it.style.setProperty('--s', (BASE + (MAX - BASE) * k * k).toFixed(1) + 'px');
        }
      });
      dock.addEventListener('pointermove', (e) => magnify(e.clientX), { passive: true });
      dock.addEventListener('pointerleave', () => items.forEach((it) => it.style.removeProperty('--s')));
    }

    /* Aparece depois do hero (no topo o CTA já está à vista) e some enquanto
       a pessoa rola para baixo. Sendo fixo no rodapé e centrado, ele tapava
       justamente os botões "Falar com a Giselle" das seções: que é o que a
       página existe para fazer clicar. Descendo = lendo, dock fora; subindo
       ou parado = procurando, dock volta. */
    const hero = document.querySelector('.hero');
    let pastHero = !hero, lastY = scrollY;

    const sync = () => dock.classList.toggle('on', pastHero && !dock.dataset.hidden);

    if (hero) {
      new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0 })
        .observe(hero);
    }

    /* um único listener de scroll (eram dois): o de "parou de rolar" virou
       um clearTimeout dentro do mesmo callback */
    let idle;
    const onDockScroll = raf(() => {
      const y = scrollY;
      const down = y > lastY + 4;
      const up = y < lastY - 4;
      if (down) dock.dataset.hidden = '1';
      else if (up) delete dock.dataset.hidden;
      if (down || up) { lastY = y; sync(); }
      clearTimeout(idle);
      idle = setTimeout(() => { delete dock.dataset.hidden; sync(); }, 700);
    });
    window.addEventListener('scroll', onDockScroll, { passive: true });
    sync();

    /* marca a seção em que o visitante está: sem isso o dock é decoração */
    /* só âncoras: o último item do dock é o link do WhatsApp, e passar uma
       URL para querySelector estoura SyntaxError */
    const targets = items
      .map((it) => it.getAttribute('href') || '')
      .filter((h) => h.startsWith('#') && h.length > 1)
      .map((h) => document.querySelector(h))
      .filter(Boolean);
    if (targets.length) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          items.forEach((it) => it.removeAttribute('aria-current'));
          const active = items.find((it) => it.getAttribute('href') === '#' + en.target.id);
          if (active) active.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      targets.forEach((t) => spy.observe(t));
    }
  }

  /* ---------- ANO RODAPÉ ---------- */
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
