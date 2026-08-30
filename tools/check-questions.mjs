#!/usr/bin/env node
/* Contrôle du contrat de question.
 *
 * Bloquant : ce sans quoi quiz.js corrige mal — data-opt manquants ou
 * désordonnés, lettre du texte désaccordée, data-answer qui ne désigne aucune
 * option, explication braquée sur la bonne réponse, id dupliqué (deux
 * questions se partageraient la même case de progression), TOTALS de
 * home-progress.js en désaccord avec le compte réel.
 *
 * Affiché sans bloquer : la tenue éditoriale — schéma d'id, métadonnées de
 * classement, langue, distracteur sans explication, couverture des task
 * statements, recouvrement fiche ↔ banque. Ce sont des conventions de
 * rédaction, elles ont vocation à bouger ; les voir suffit.
 *
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, ROOT } from './lib/questions.mjs';
import { checkCorpus } from './lib/question-contract.mjs';

const declaredTotals = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'home-progress.js'), 'utf8');
  const block = src.match(/const TOTALS = \{([\s\S]*?)\};/);
  if (!block) return {};
  return Object.fromEntries(
    [...block[1].matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );
})();

const questions = loadCorpus();
const { problems, notices } = checkCorpus(questions, { declaredTotals });

console.log(`Contrat de question — ${questions.length} questions`);

if (notices.length) {
  console.log(`\n  ${notices.length} observation(s), sans effet sur le verdict :`);
  for (const n of notices) console.log('   -', n);
}

if (problems.length === 0) {
  console.log('\nContrat de question : OK');
  process.exit(0);
}
console.log(`\nContrat de question : ${problems.length} question(s) que le quiz corrigerait mal`);
for (const p of problems) console.log('  -', p);
process.exit(1);
