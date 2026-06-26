/* Sommaire flottant qui suit le scroll.
   - grand écran : rail latéral fixe (à gauche, dans la marge) avec scroll-spy
   - petit écran : bouton « Sommaire » flottant qui ouvre le panneau
   Construit à partir des <h2 id="…"> de la page — aucun markup à ajouter. */
(() => {
  'use strict';

  const headings = [...document.querySelectorAll('h2[id]')];
  if (headings.length < 2) return;

  // --- rail ---
  const rail = document.createElement('nav');
  rail.className = 'toc-rail';
  rail.setAttribute('aria-label', 'Sommaire de la page');

  const title = document.createElement('div');
  title.className = 'toc-rail-title';
  title.textContent = 'Sommaire';
  rail.appendChild(title);

  const links = new Map();
  for (const h of headings) {
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = (h.textContent || '').replace(/\s+/g, ' ').trim();
    rail.appendChild(a);
    links.set(h.id, a);
  }
  document.body.appendChild(rail);

  // --- bouton flottant (mobile) ---
  const fab = document.createElement('button');
  fab.className = 'toc-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Afficher le sommaire');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<span aria-hidden="true">☰</span> Sommaire';
  fab.addEventListener('click', () => {
    const open = rail.classList.toggle('is-open');
    fab.setAttribute('aria-expanded', String(open));
  });
  document.body.appendChild(fab);

  rail.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      rail.classList.remove('is-open');
      fab.setAttribute('aria-expanded', 'false');
    }
  });

  // --- scroll-spy : surligne la section courante ---
  let active = null;
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const a = links.get(en.target.id);
      if (!a || a === active) continue;
      if (active) active.classList.remove('active');
      a.classList.add('active');
      active = a;
    }
  }, { rootMargin: '-78px 0px -72% 0px', threshold: 0 });

  for (const h of headings) spy.observe(h);
})();
