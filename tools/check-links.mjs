#!/usr/bin/env node
/* Contrôle des liens internes, des ancres, et de la couverture des 30 task
 * statements du guide CCAR-F v1.0.
 * Sans dépendance. Requiert Node >= 20.11 (pour import.meta.dirname).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();

const idsOf = new Map(
  pages.map((page) => [
    page,
    new Set([...fs.readFileSync(path.join(ROOT, page), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])),
  ])
);

let broken = 0;
for (const page of pages) {
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const [, href] of src.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#$)/.test(href)) continue;
    const [file, fragment] = href.split('#');
    if (file && !fs.existsSync(path.join(ROOT, decodeURIComponent(file)))) {
      console.log(`${page} — cible absente : ${href}`);
      broken++;
      continue;
    }
    if (fragment && !idsOf.get(file || page)?.has(fragment)) {
      console.log(`${page} — ancre absente : ${href}`);
      broken++;
    }
  }
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
console.log(
  `Task statements : ${total - missing.length}/${total}` + (missing.length ? ` — manquants : ${missing.join(', ')}` : '')
);

process.exit(broken || missing.length ? 1 : 0);
