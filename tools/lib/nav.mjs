/* Source unique de la navbar : la liste LINKS de nav.js.
 * Le HTML statique des pages en est le rendu matérialisé — il évite le flash de
 * navigation vide que produirait un nav.js en defer seul, et sert le mode sans JS.
 * check-nav.mjs vérifie que les deux ne divergent pas.
 *
 * TRANSLATIONS (même mécanique de lecture que LINKS) porte le sélecteur de
 * langue : chaque page française déclarée y pointe vers son jumeau anglais.
 * Lu depuis nav.js plutôt que dupliqué, pour la même raison que LINKS.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const NAV_OPEN = '<nav class="navbar">';
export const NAV_CLOSE = '</nav>';

/* Identique à esc() dans nav.js : l'apostrophe n'est délibérément pas échappée,
 * le HTML statique doit reproduire ce que nav.js produit à l'exécution. */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function readLinks(navJsPath) {
  const src = fs.readFileSync(navJsPath, 'utf8');
  const match = src.match(/const LINKS = (\[[\s\S]*?\n {2}\]);/);
  if (!match) throw new Error(`${path.basename(navJsPath)} : littéral LINKS introuvable`);
  return vm.runInNewContext(match[1]);
}

export function readTranslations(navJsPath) {
  const src = fs.readFileSync(navJsPath, 'utf8');
  const match = src.match(/const TRANSLATIONS = (\{[\s\S]*?\n {2}\});/);
  if (!match) throw new Error(`${path.basename(navJsPath)} : littéral TRANSLATIONS introuvable`);
  return vm.runInNewContext(`(${match[1]})`);
}

/* homeHref est paramétrable (défaut 'index.html', le seul cas que check-nav.mjs
 * exerce) pour que la page anglaise, servie depuis en/, puisse remonter d'un
 * niveau sans dupliquer cette fonction. */
export function renderNav(links, currentPage, homeHref = 'index.html') {
  const home = `<a class="home" href="${homeHref}">CCA-F</a>`;
  const lines = links.map(([href, label, title]) => {
    const cur = href === currentPage ? ' class="current"' : '';
    const t = title ? ` title="${esc(title)}"` : '';
    const ext = href.endsWith('.pdf') ? ' target="_blank" rel="noopener"' : '';
    return `  <a${cur} href="${href}"${t}${ext}>${label}</a>`;
  });
  return [NAV_OPEN, `  ${home}`, ...lines, NAV_CLOSE].join('\n');
}

export function extractNav(html) {
  const start = html.indexOf(NAV_OPEN);
  if (start === -1) return null;
  const end = html.indexOf(NAV_CLOSE, start);
  if (end === -1) return null;
  return { start, end: end + NAV_CLOSE.length, block: html.slice(start, end + NAV_CLOSE.length) };
}
