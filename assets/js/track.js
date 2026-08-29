/* =====================================================================
   GISELLE MARTINS · medição de conversão (GA4)
   Um único listener delegado cobre o site inteiro, inclusive elementos
   inseridos depois. Cada evento existe para responder uma pergunta de
   negócio: nada de evento decorativo.

   Eventos: wa_click · email_click · instagram_click · phone_reveal
            scroll_50 · scroll_90 · faq_open
   ===================================================================== */
(() => {
  'use strict';
  if (typeof window.gtag !== 'function') return;

  const device = matchMedia('(max-width: 720px)').matches ? 'mobile' : 'desktop';

  /* cta_location: preferimos o data-cta-loc explícito; o fallback existe
     para links soltos que nunca receberam o atributo. */
  const location_of = (a) => {
    const explicit = a.closest('[data-cta-loc]');
    if (explicit) return explicit.dataset.ctaLoc;
    if (a.classList.contains('wa-float')) return 'float';
    if (a.classList.contains('nav__cta')) return 'nav';
    if (a.closest('.mobile-menu')) return 'menu_mobile';
    if (a.closest('.hero')) return 'hero';
    if (a.closest('.cta')) return 'cta_final';
    if (a.closest('.article-cta')) return 'artigo';
    if (a.closest('.footer')) return 'rodape';
    return 'outro';
  };

  const send = (name, a, extra) => window.gtag('event', name, Object.assign({
    cta_location: location_of(a),
    cta_text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 60),
    page_path: window.location.pathname,
    device
  }, extra));

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.includes('wa.me') || href.includes('api.whatsapp.com')) send('wa_click', a);
    else if (href.startsWith('mailto:')) send('email_click', a);
    else if (href.startsWith('tel:')) send('phone_reveal', a);
    else if (href.includes('instagram.com')) send('instagram_click', a);
  }, true);

  /* profundidade de leitura: proxy de qualidade de tráfego */
  const marks = { 50: false, 90: false };
  const onScroll = () => {
    const h = document.body.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    const pct = (window.scrollY / h) * 100;
    for (const m of [50, 90]) {
      if (!marks[m] && pct >= m) {
        marks[m] = true;
        window.gtag('event', 'scroll_' + m, { page_path: window.location.pathname, device });
      }
    }
    if (marks[50] && marks[90]) window.removeEventListener('scroll', onScroll);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* qual objeção o visitante foi checar antes de decidir */
  document.querySelectorAll('.faq details').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      window.gtag('event', 'faq_open', {
        faq_question: (d.querySelector('summary')?.innerText || '').trim().slice(0, 80),
        page_path: window.location.pathname,
        device
      });
    });
  });
})();
