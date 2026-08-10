#!/usr/bin/env node
/* Mesure de l'indice de longueur sur le corpus.
 *
 * Deux modes, comme le contrat de question :
 *   - rapport (défaut) : mesure et affiche, sort toujours 0. Le corpus est en
 *     cours de correction ; un gate rouge pendant trente commits n'est plus lu.
 *   - --enforce : échoue si une question non officielle dépasse le plafond.
 *     Le commit qui bascule en --enforce atteste la fin de la correction.
 *
 * Les douze questions officielles sont mesurées et affichées à part, hors
 * verdict : leur indice vient du guide, pas de nous.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { loadCorpus, ROOT } from './lib/questions.mjs';
import { blindScore, ratio, CEILING, OFFICIAL } from './lib/length-tell.mjs';

/* questions.mjs indexe la structure des options, pas leur texte. Ce relevé
 * refait donc une passe DOM avec les mêmes sélecteurs, dans le même ordre, et
 * s'apparie par position — même filtre, même document, donc même suite. Si un
 * jour l'index expose le texte, tout ce bloc disparaît. */
const OPTION_RE = /^\s*([A-E])\)/;
const QUIZ_SUMMARY_RE = /^Q\s*\d+/i;

const optionTextsByFile = (html) => {
  const doc = new JSDOM(html).window.document;
  return [...doc.querySelectorAll('details')]
    .filter((d) => QUIZ_SUMMARY_RE.test((d.querySelector(':scope > summary')?.textContent || '').trim()))
    .map((d) => {
      const tagged = [...d.querySelectorAll('p[data-opt]')];
      const els = tagged.length
        ? tagged
        : [...d.querySelectorAll('p')].filter((p) => OPTION_RE.test(p.textContent || ''));
      return els.map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim());
    });
};

const questions = loadCorpus();

const texts = new Map();
for (const file of new Set(questions.map((q) => q.file))) {
  texts.set(file, optionTextsByFile(fs.readFileSync(path.join(ROOT, file), 'utf8')));
}
const cursor = new Map();
for (const q of questions) {
  const i = cursor.get(q.file) ?? 0;
  cursor.set(q.file, i + 1);
  const row = texts.get(q.file)[i] ?? [];
  q.options = q.options.map((o) => ({ ...o, text: row[o.index] ?? '' }));
}

const enforce = process.argv.includes('--enforce');
const pct = (x) => `${(x * 100).toFixed(1)} %`;
// Trois décimales : à deux, une question à 1.353 s'affiche « 1.35 » et se lit
// comme un faux positif contre un plafond affiché 1.35.
const fmt = (q) => `${q.id ?? q.file + ' Q' + q.qnum} — ratio ${ratio(q).toFixed(3)} (${q.label.slice(0, 44)})`;

const official = questions.filter((q) => OFFICIAL.has(q.id));
const audited = questions.filter((q) => !OFFICIAL.has(q.id));

const ratios = audited.map(ratio).filter(Number.isFinite);
const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
const blind = blindScore(questions);
const over = audited.filter((q) => ratio(q) > CEILING).sort((a, b) => ratio(b) - ratio(a));
const officialOver = official.filter((q) => ratio(q) > CEILING).sort((a, b) => ratio(b) - ratio(a));

console.log(`Indice de longueur — mode ${enforce ? 'enforce' : 'rapport'}`);
console.log(`  ${questions.length} questions, dont ${official.length} officielles hors verdict`);
console.log(`  ratio moyen clé/distracteurs : ${meanRatio.toFixed(2)} (plafond par question ${CEILING})`);
console.log(
  `  stratégie aveugle « toujours la plus longue » : ${blind.hits}/${blind.total} = ${pct(blind.rate)}` +
  ` (hasard ${pct(blind.chance)})`
);

console.log(`\n  ${over.length} question(s) au-dessus du plafond :`);
for (const q of over) console.log('    -', fmt(q));

console.log(`\n  Officielles pq-q1..pq-q12 — indice repris du guide d'examen, non corrigible.`);
console.log(`  ${officialOver.length} au-dessus du plafond, pour information seulement :`);
for (const q of officialOver) console.log('    -', fmt(q));

if (!enforce) {
  console.log('\nIndice de longueur : rapport seul, aucun verdict.');
  process.exit(0);
}
if (over.length === 0) {
  console.log('\nIndice de longueur : OK');
  process.exit(0);
}
console.log(`\nIndice de longueur : ${over.length} question(s) au-dessus de ${CEILING}`);
process.exit(1);
