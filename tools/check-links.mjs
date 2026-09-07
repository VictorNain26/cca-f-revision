#!/usr/bin/env node
/* Contrôle des liens internes et des ancres. Bloque sur un lien mort — un clic
 * qui échoue pour le lecteur. La couverture des 30 task statements du guide
 * CCAR-F v1.0 est affichée à côté, sans effet sur le verdict : elle décrit
 * l'avancement du corpus, pas un défaut du site.
 * Couvre les .html et .md de la racine, et les .md de courses/ (récursif) :
 * un lien Markdown relatif doit résoudre vers un fichier du dépôt, une ancre
 * doit correspondre à un id="" si la cible est HTML, ou à un titre si la
 * cible est Markdown.
 * Sans dépendance. Requiert Node >= 20.11 (pour import.meta.dirname).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
// Récursif sous courses/ (courses/en/, courses/fr/, et tout sous-répertoire
// futur) : un lien croisé entre cours vit dans courses/en/ ou courses/fr/,
// jamais à plat dans courses/.
const coursesDir = path.join(ROOT, 'courses');
const mdFiles = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.md')),
  ...(fs.existsSync(coursesDir)
    ? fs.readdirSync(coursesDir, { recursive: true }).filter((f) => f.endsWith('.md')).map((f) => path.join('courses', f))
    : []),
].sort();

function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

// Cache paresseux : ancres disponibles dans un fichier cible, identifié par
// son chemin relatif au dépôt (id="" pour le HTML, titres slugifiés pour le
// Markdown).
/* Une chaîne de requête n'est pas un chemin : Practice_Questions.html?task=5.1
 * désigne le même fichier, filtré par practice.js. Sans ce découpage, le
 * contrôle cherchait « Practice_Questions.html?task=5.1 » sur le disque et
 * déclarait 35 cibles absentes. */
function splitHref(href) {
  const [path_, fragment] = href.split('#');
  return [path_.split('?')[0], fragment];
}

const anchorsCache = new Map();
function anchorsOf(relPath) {
  if (anchorsCache.has(relPath)) return anchorsCache.get(relPath);
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    anchorsCache.set(relPath, new Set());
    return anchorsCache.get(relPath);
  }
  const src = fs.readFileSync(abs, 'utf8');
  const anchors = relPath.endsWith('.md')
    ? new Set([...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slugify(m[1])))
    : new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  anchorsCache.set(relPath, anchors);
  return anchors;
}

let broken = 0;
for (const page of pages) {
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const [, href] of src.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#$)/.test(href)) continue;
    const [file, fragment] = splitHref(href);
    if (file && !fs.existsSync(path.join(ROOT, decodeURIComponent(file)))) {
      console.log(`${page} — cible absente : ${href}`);
      broken++;
      continue;
    }
    if (fragment && !anchorsOf(file || page)?.has(fragment)) {
      console.log(`${page} — ancre absente : ${href}`);
      broken++;
    }
  }
}

for (const mdFile of mdFiles) {
  const abs = path.join(ROOT, mdFile);
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  const dir = path.dirname(mdFile);
  lines.forEach((line, index) => {
    for (const [, href] of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      if (/^(https?:|mailto:|#$)/.test(href)) continue;
      const [file, fragment] = splitHref(href);
      const targetRel = file ? path.normalize(path.join(dir, decodeURIComponent(file))) : mdFile;
      if (file && !fs.existsSync(path.join(ROOT, targetRel))) {
        console.log(`${mdFile}:${index + 1} — cible absente : ${href}`);
        broken++;
        continue;
      }
      if (fragment && !anchorsOf(targetRel)?.has(fragment)) {
        console.log(`${mdFile}:${index + 1} — ancre absente : ${href}`);
        broken++;
      }
    }
  });
}

console.log(`Liens internes : ${broken} cassé(s).`);

// Guide CCAR-F v1.0 : D1 = 1.1-1.7, D2 = 2.1-2.5, D3 = 3.1-3.6, D4 = 4.1-4.6, D5 = 5.1-5.6.
const TASKS_PER_DOMAIN = { 1: 7, 2: 5, 3: 6, 4: 6, 5: 6 };
const covered = new Set();
for (const page of pages) {
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const [, domain, task] of src.matchAll(/\b([1-5])\.([1-9])\b/g)) covered.add(`${domain}.${task}`);
}

const missing = Object.entries(TASKS_PER_DOMAIN).flatMap(([domain, count]) =>
  Array.from({ length: count }, (_, i) => `${domain}.${i + 1}`).filter((t) => !covered.has(t))
);
const total = Object.values(TASKS_PER_DOMAIN).reduce((a, b) => a + b, 0);
/* La couverture des task statements est une observation : elle décrit
 * l'avancement du corpus, pas une casse du site. Un lien mort, lui, bloque —
 * c'est un clic qui échoue pour le lecteur. */
console.log(
  `Task statements : ${total - missing.length}/${total}` +
  (missing.length ? ` — sans mention, pour information : ${missing.join(', ')}` : '')
);

process.exit(broken ? 1 : 0);
