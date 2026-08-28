#!/usr/bin/env node
/* Contrôle du contrat de question sur les 157 questions du corpus.
 *
 * Deux modes, parce qu'un gate rouge pendant trente commits ne protège plus
 * rien — on prend l'habitude de ne plus le lire :
 *   - progressif (défaut) : une question portant un id est soumise au contrat
 *     entier, une question sans id est ignorée. Migrer une question la place
 *     sous contrôle définitivement.
 *   - strict (--strict) : un id est exigé sur les 157. Le commit qui bascule en
 *     strict est celui qui atteste l'achèvement de l'audit.
 *
 * Le compteur de questions migrées est l'avancement réel du chantier, mesuré et
 * non déclaré.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, ROOT } from './lib/questions.mjs';
import { checkCorpus } from './lib/question-contract.mjs';

const strict = process.argv.includes('--strict');

const declaredTotals = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'home-progress.js'), 'utf8');
  const block = src.match(/const TOTALS = \{([\s\S]*?)\};/);
  if (!block) return {};
  return Object.fromEntries(
    [...block[1].matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );
})();

const questions = loadCorpus();
const failures = checkCorpus(questions, { strict, declaredTotals });

const migrated = questions.filter((q) => q.migrated).length;
console.log(`Contrat de question — mode ${strict ? 'strict' : 'progressif'}`);
console.log(`  ${migrated} / ${questions.length} questions migrées`);

if (failures.length === 0) {
  console.log('Contrat de question : OK');
  process.exit(0);
}
console.log(`Contrat de question : ${failures.length} violation(s)`);
for (const f of failures) console.log('  -', f);
process.exit(1);
