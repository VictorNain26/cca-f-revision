#!/usr/bin/env node
/* Contrôle du chrome exécuté : chaque page est chargée dans un DOM, tous ses
 * <script src> doivent exister et s'exécuter sans erreur, et le bouton de retour
 * en haut doit réagir au défilement.
 * Le défaut que ce contrôle attrape : un fichier de script déplacé ou renommé,
 * ou un comportement extrait d'un bloc inline vers un fichier jamais chargé —
 * les deux passent silencieusement tous les autres contrôles.
 * Ne dit rien du contenu de la navbar : le HTML statique étant le rendu exact de
 * nav.js, on ne peut pas distinguer ici un nav.js qui s'est exécuté d'un nav.js
 * qui n'a rien fait. C'est check-nav.mjs qui garde la navbar.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const SCROLL_REVEAL = 900; // au-delà du seuil de 600 px codé dans site.js

/* jsdom n'implémente ni IntersectionObserver ni ResizeObserver, dont toc.js dépend.
 * Les stubs complètent l'environnement pour que le reste du chrome s'exécute ; ils
 * sont inertes, donc ce contrôle ne dit rien de ce qui repose sur leurs callbacks. */
const installObserverStubs = (window) => {
  class InertObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  window.IntersectionObserver = InertObserver;
  window.ResizeObserver = InertObserver;
};

let failed = 0;
for (const page of pages) {
  const problems = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => problems.push(`erreur JS : ${e.message}`));

  const dom = await JSDOM.fromFile(path.join(ROOT, page), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse: installObserverStubs,
  });
  await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
  const { window } = dom;
  const doc = window.document;

  for (const el of doc.querySelectorAll('script[src]')) {
    const src = el.getAttribute('src');
    if (!fs.existsSync(path.join(ROOT, src))) problems.push(`script absent : ${src}`);
  }

  const btn = doc.getElementById('back-to-top');
  if (!btn) {
    problems.push('bouton de retour en haut absent du balisage');
  } else {
    window.scrollY = SCROLL_REVEAL;
    window.dispatchEvent(new window.Event('scroll'));
    if (!btn.classList.contains('visible')) problems.push('bouton de retour en haut inerte au défilement');
  }

  window.close();
  if (problems.length) failed++;
  console.log(`${page.padEnd(42)} ${problems.length ? problems.join(' · ') : 'OK'}`);
}

console.log(`Chrome exécuté : ${pages.length - failed}/${pages.length} page(s) saine(s).`);
process.exit(failed ? 1 : 0);
