/* Sommaire flottant qui suit le scroll.
   - grand écran : rail latéral fixe (à gauche, dans la marge) avec scroll-spy
   - petit écran : bouton « Sommaire » flottant qui ouvre le panneau
   Construit à partir des <h2 id="…"> de la page — aucun markup à ajouter. */
(() => {
  'use strict';

  const headings = [...document.querySelectorAll('h2[id]')];
  if (headings.length < 2) return;

  // Le chrome suit la langue de la page : les pages en/ sont servies en anglais.
  const LABELS = {
    fr: { toc: 'Sommaire', railLabel: 'Sommaire de la page', close: 'Fermer le sommaire', open: 'Afficher le sommaire' },
    en: { toc: 'Contents', railLabel: 'Page contents', close: 'Close contents', open: 'Show contents' },
  };
  const t = LABELS[(document.documentElement.lang || 'fr').slice(0, 2).toLowerCase()] || LABELS.fr;

  // --- rail ---
  const rail = document.createElement('nav');
  rail.id = 'toc-rail';
  rail.className = 'toc-rail';
  rail.setAttribute('aria-label', t.railLabel);

  // En-tête visible uniquement en bottom-sheet mobile : poignée, titre, fermeture.
  const sheetHead = document.createElement('div');
  sheetHead.className = 'toc-sheet-head';
  sheetHead.innerHTML =
    '<span class="toc-grip" aria-hidden="true"></span>' +
    `<span class="toc-sheet-title">${t.toc}</span>`;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toc-close';
  closeBtn.setAttribute('aria-label', t.close);
  closeBtn.innerHTML = '<span aria-hidden="true">✕</span>';
  sheetHead.appendChild(closeBtn);
  rail.appendChild(sheetHead);

  const title = document.createElement('div');
  title.className = 'toc-rail-title';
  title.textContent = t.toc;
  rail.appendChild(title);

  const links = new Map();
  for (const h of headings) {
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = (h.textContent || '').replace(/\s+/g, ' ').trim();
    rail.appendChild(a);
    links.set(h.id, a);
  }
  // Le rail est visuellement en haut à gauche : en fin de <body> il tombait
  // après le pied de page dans l'ordre de tabulation (WCAG 2.4.3). Il se place
  // juste après la navbar, avant le contenu.
  const navbar = document.querySelector('nav.navbar');
  if (navbar) navbar.after(rail);
  else document.body.prepend(rail);

  // --- bouton flottant + bottom-sheet (mobile) ---
  const fab = document.createElement('button');
  fab.className = 'toc-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', t.open);
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'toc-rail');
  fab.innerHTML = `<span aria-hidden="true">☰</span> ${t.toc}`;
  document.body.appendChild(fab);

  const backdrop = document.createElement('div');
  backdrop.className = 'toc-backdrop';
  document.body.appendChild(backdrop);

  const isOpen = () => rail.classList.contains('is-open');
  const openSheet = () => {
    rail.classList.add('is-open');
    document.body.classList.add('toc-open');
    // Le panneau ne devient une boîte de dialogue modale qu'ouvert : sur grand
    // écran le même élément est un simple point de repère de navigation.
    rail.setAttribute('role', 'dialog');
    rail.setAttribute('aria-modal', 'true');
    fab.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  };
  const closeSheet = ({ returnFocus = true } = {}) => {
    rail.classList.remove('is-open');
    document.body.classList.remove('toc-open');
    rail.removeAttribute('role');
    rail.removeAttribute('aria-modal');
    fab.setAttribute('aria-expanded', 'false');
    if (returnFocus) fab.focus();
  };

  fab.addEventListener('click', () => (isOpen() ? closeSheet() : openSheet()));
  closeBtn.addEventListener('click', () => closeSheet());
  backdrop.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key !== 'Tab') return;
    // Piège de focus : sans lui, la tabulation sort du panneau modal et parcourt
    // la page masquée par le backdrop.
    const focusables = [closeBtn, ...rail.querySelectorAll('a[href]')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!rail.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
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
