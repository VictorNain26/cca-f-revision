#!/usr/bin/env node
/* Rapport des doublons fiche ↔ banque sur le corpus.
 *
 * Deux modes, comme les autres contrôles du dépôt :
 *   - rapport (défaut) : mesure, affiche, sort 0. Les doublons sont là, la
 *     réécriture est en cours ; un gate rouge pendant trente commits n'est plus
 *     lu.
 *   - --enforce : échoue s'il reste une paire au-dessus du seuil, exemptions
 *     déduites. C'est le commit qui bascule ce contrôle dans `npm run check`
 *     qui attestera la fin de la passe de réécriture.
 *
 * Une exemption mal formée fait échouer les DEUX modes. Ce n'est pas un
 * constat sur le corpus mais une erreur dans le contrôle lui-même : une
 * exemption sans justification est un doublon qu'on a fait taire, et plus rien
 * dans le dépôt ne dirait lequel ni pourquoi.
 *
 * Les paires impliquant une officielle (pq-q1..pq-q12) sont affichées à part.
 * Ces douze questions reproduisent le guide mot à mot et il n'en existe que
 * douze : elles ne peuvent pas être réécrites, donc c'est toujours la question
 * de fiche qui doit bouger. Une officielle rejouée en auto-évaluation est le
 * seul cas où le lecteur perd un exemplaire irremplaçable.
 *
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import { loadCorpus } from './lib/questions.mjs';
import {
  applyExemptions,
  suspects,
  validateExemptions,
  THRESHOLD,
} from './lib/duplicates.mjs';

/* Faux positifs constatés à la main. Chaque ligne porte son motif : c'est la
 * seule trace que quelqu'un a ouvert les deux questions et tranché.
 * Une exemption est un constat daté, pas une dispense : quand la question de
 * fiche est réécrite, l'exemption part avec elle — le contrôle signale celles
 * qui ne correspondent plus à rien.
 *
 * Vide aujourd'hui : les deux qui y figuraient (d3-q7 ↔ pq-q39, d5-q7 ↔ pq-q24)
 * étaient sorties du relevé au seuil courant, donc elles ne dispensaient plus
 * de rien et masquaient la prochaine vraie. Elles ont été retirées, pas
 * oubliées : le constat est daté dans l'historique git. */
const EXEMPTIONS = [];

const enforce = process.argv.includes('--enforce');

const invalid = validateExemptions(EXEMPTIONS);
if (invalid.length) {
  console.log(`Doublons : ${invalid.length} exemption(s) invalide(s), contrôle refusé`);
  for (const e of invalid) console.log('  -', e);
  process.exit(1);
}

const questions = loadCorpus();
const pairs = suspects(questions);
const { reported, exempted, stale } = applyExemptions(pairs, EXEMPTIONS);

const official = reported.filter((p) => p.official);
const rest = reported.filter((p) => !p.official);

const line = (p) =>
  `    ${p.score.toFixed(3)}  ${p.sheet.padEnd(6)} ↔ ${p.bank.padEnd(7)} [task ${p.task}]\n` +
  `             ${p.sheetLabel.slice(0, 62)}\n` +
  `             ${p.bankLabel.slice(0, 62)}`;

const sheets = questions.filter((q) => q.prefix !== 'pq').length;

console.log(`Doublons fiche ↔ banque — mode ${enforce ? 'enforce' : 'rapport'}`);
console.log(`  ${questions.length} questions : ${sheets} auto-évaluations contre ${questions.length - sheets} de banque`);
console.log(`  ${pairs.compared} paires comparées (même data-task), seuil ${THRESHOLD.toFixed(2)}`);
console.log(`  Mesure : indice de Jaccard des mots de contenu du bloc d'options — contenu des`);
console.log(`  <code>, nombres et mots-outils retirés, c'est-à-dire tout ce qu'une réécriture`);
console.log(`  paresseuse modifie. Ce qui reste est ce qu'elle a laissé intact.`);

console.log(`\n  Paires impliquant une officielle (pq-q1..pq-q12) — ${official.length} :`);
console.log(`  Non réécrivables, il n'en existe que douze. C'est la fiche qui doit bouger.`);
for (const p of official) console.log(line(p));
if (!official.length) console.log('    (aucune)');

console.log(`\n  Autres paires au-dessus du seuil — ${rest.length} :`);
for (const p of rest) console.log(line(p));
if (!rest.length) console.log('    (aucune)');

if (exempted.length) {
  console.log(`\n  Exemptions appliquées — ${exempted.length} :`);
  for (const p of exempted) console.log(`    ${p.score.toFixed(3)}  ${p.sheet} ↔ ${p.bank} — ${p.why}`);
}
if (stale.length) {
  console.log(`\n  Exemptions sans effet — ${stale.length} :`);
  console.log(`  La paire ne ressort plus au seuil courant. À retirer, ou à garder en mémoire du`);
  console.log(`  jugement si le seuil doit bouger — mais pas à laisser dormir indéfiniment.`);
  for (const e of stale) console.log(`    ${e.sheet} ↔ ${e.bank} — ${e.why}`);
}

console.log(
  `\n  Angle mort connu, mesuré : une paire dont les quatre options se correspondent une à` +
  `\n  une mais sont intégralement paraphrasées passe sous le seuil. pq-q11 ↔ d4-q2 sort à` +
  `\n  0,095 et pq-q6 ↔ d3-q2 à 0,106, alors que ce sont des doublons pédagogiques francs.` +
  `\n  Aucun indice lexical ne les attrapera : une sortie vide de ce contrôle n'est pas une` +
  `\n  preuve d'absence de doublon.`
);

if (!enforce) {
  console.log('\nDoublons : rapport seul, aucun verdict.');
  process.exit(0);
}
if (!reported.length) {
  console.log('\nDoublons : OK — aucune paire au-dessus du seuil.');
  process.exit(0);
}
console.log(`\nDoublons : ${reported.length} paire(s) au-dessus du seuil, dont ${official.length} sur une officielle`);
process.exit(1);
