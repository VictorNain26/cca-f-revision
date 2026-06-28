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
  rail.id = 'toc-rail';
  rail.className = 'toc-rail';
  rail.setAttribute('aria-label', 'Sommaire de la page');

  // En-tête visible uniquement en bottom-sheet mobile : poignée, titre, fermeture.
  const sheetHead = document.createElement('div');
  sheetHead.className = 'toc-sheet-head';
  sheetHead.innerHTML =
    '<span class="toc-grip" aria-hidden="true"></span>' +
    '<span class="toc-sheet-title">Sommaire</span>';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toc-close';
  closeBtn.setAttribute('aria-label', 'Fermer le sommaire');
  closeBtn.innerHTML = '<span aria-hidden="true">✕</span>';
  sheetHead.appendChild(closeBtn);
  rail.appendChild(sheetHead);

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

  // --- bouton flottant + bottom-sheet (mobile) ---
  const fab = document.createElement('button');
  fab.className = 'toc-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Afficher le sommaire');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'toc-rail');
  fab.innerHTML = '<span aria-hidden="true">☰</span> Sommaire';
  document.body.appendChild(fab);

  const backdrop = document.createElement('div');
  backdrop.className = 'toc-backdrop';
  document.body.appendChild(backdrop);

  const isOpen = () => rail.classList.contains('is-open');
  const openSheet = () => {
    rail.classList.add('is-open');
    document.body.classList.add('toc-open');
    fab.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  };
  const closeSheet = ({ returnFocus = true } = {}) => {
    rail.classList.remove('is-open');
    document.body.classList.remove('toc-open');
    fab.setAttribute('aria-expanded', 'false');
    if (returnFocus) fab.focus();
  };

  fab.addEventListener('click', () => (isOpen() ? closeSheet() : openSheet()));
  closeBtn.addEventListener('click', () => closeSheet());
  backdrop.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeSheet();
  });

  // Clic sur un lien : on ferme sans voler le focus (la navigation prend le relais).
  rail.addEventListener('click', (e) => {
    if (e.target.closest('a') && isOpen()) closeSheet({ returnFocus: false });
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
