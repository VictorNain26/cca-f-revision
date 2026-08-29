#!/usr/bin/env node
/* Vérifie que chaque garde de courses.mjs est tenu par au moins un test.
 * Le défaut attrapé : un test qui ne peut pas échouer. Deux d'entre eux ont
 * passé la revue de la Task 2 avant d'être trouvés à la main — celui-ci les
 * aurait nommés.
 * Neutralise un problems.push() à la fois, relance la suite, et signale toute
 * mutation que les tests laissent passer : c'est soit du code mort, soit un
 * test manquant. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const TARGET = path.join(ROOT, 'tools', 'lib', 'courses.mjs');
const original = fs.readFileSync(TARGET, 'utf8');
const lines = original.split('\n');

/* Deux opérateurs, parce que les défauts trouvés sur ce lot sont de deux
 * natures : un garde qui ne signale plus, et un filtre qui ne filtre plus.
 * Le second est celui qui a laissé passer un quatrième test increvable —
 * une garde « if (…) continue; » qu'aucune fixture n'exerçait. */
const survivors = [];
const sites = lines.flatMap((l, i) => {
  if (l.includes('problems.push(')) return [{ i, kind: 'garde' }];
  if (/^\s*if \(.+\)\s*continue;\s*$/.test(l)) return [{ i, kind: 'filtre' }];
  return [];
});

for (const { i, kind } of sites) {
  const mutated = [...lines];
  mutated[i] = kind === 'garde'
    ? mutated[i].replace('problems.push(', 'void (')
    : '';
  fs.writeFileSync(TARGET, mutated.join('\n'));
  try {
    execFileSync('node', ['--test', 'tools/lib/courses.test.mjs'], { cwd: ROOT, stdio: 'pipe' });
    survivors.push(`${path.relative(ROOT, TARGET)}:${i + 1} (${kind}) — ${lines[i].trim().slice(0, 70)}`);
  } catch {
    /* la suite a échoué : la mutation est détectée, c'est le comportement voulu */
  } finally {
    fs.writeFileSync(TARGET, original);
  }
}

for (const s of survivors) console.log(`Non testé : ${s}`);
console.log(`Mutation : ${survivors.length} point(s) non testé(s) sur ${sites.length}.`);
process.exit(survivors.length ? 1 : 0);
