#!/usr/bin/env node
/* Contrôle de la navbar : le HTML statique de chaque page doit être le rendu
 * exact de la liste LINKS de nav.js.
 * Le défaut que ce contrôle attrape : la navbar existait en onze exemplaires
 * (nav.js plus une copie par page) et elles avaient divergé — un lien du guide
 * corrigé dans une seule, un titre de page resté périmé dans une autre.
 * `--fix` réécrit les pages depuis nav.js. Sans dépendance, Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readLinks, renderNav, extractNav } from './lib/nav.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const fix = process.argv.includes('--fix');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const links = readLinks(path.join(ROOT, 'nav.js'));

let stale = 0;
for (const page of pages) {
  const file = path.join(ROOT, page);
  const html = fs.readFileSync(file, 'utf8');
  const found = extractNav(html);
  if (!found) {
    console.log(`${page} — pas de <nav class="navbar">`);
    stale++;
    continue;
  }
  const expected = renderNav(links, page);
  if (found.block === expected) continue;

  stale++;
  if (fix) {
    fs.writeFileSync(file, html.slice(0, found.start) + expected + html.slice(found.end));
    console.log(`${page} — navbar réécrite depuis nav.js`);
  } else {
    console.log(`${page} — navbar désynchronisée de nav.js`);
  }
}

const verdict = fix ? 'réécrite(s)' : 'désynchronisée(s)';
console.log(`Navbar : ${stale} page(s) ${verdict} sur ${pages.length}.`);
process.exit(!fix && stale ? 1 : 0);
