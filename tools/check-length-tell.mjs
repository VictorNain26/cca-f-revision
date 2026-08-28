#!/usr/bin/env node
/* Mesure de l'indice de longueur sur le corpus.
 *
 * Deux modes, comme le contrat de question :
 *   - rapport (défaut) : mesure et affiche, sort toujours 0. Le corpus est en
 *     cours de correction ; un gate rouge pendant trente commits n'est plus lu.
 *   - --enforce : échoue si la meilleure stratégie aveugle dépasse
 *     MAX_BLIND_RATE. Le verdict porte sur ce taux, pas sur le ratio par
 *     question : une passe de correction peut ramener toutes les questions sous
 *     le plafond de ratio en alignant la clé sur le distracteur le plus long,
 *     sans que le corpus soit moins devinable. Le plafond de ratio reste
 *     affiché, en diagnostic.
 *
 * Les douze questions officielles sont mesurées et affichées à part, hors
 * verdict : leurs options ne sont pas réécrivables sans trahir le guide. Hors
 * verdict ne veut pas dire hors de notre fait — un indice qui y apparaît peut
 * venir de la transcription, et se recoupe contre le PDF avant d'être imputé à
 * l'examen.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { loadCorpus, ROOT } from './lib/questions.mjs';
import {
  bestStrategy,
  blindBounds,
  blindHits,
  blindProfile,
  rankProfile,
  ratio,
  tieConcentration,
  CEILING,
  HEURISTICS,
  MAX_BLIND_RATE,
  METRICS,
  MIN_RANK_SAMPLE,
  OFFICIAL,
} from './lib/length-tell.mjs';

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
const name = (q) => q.id ?? `${q.file} Q${q.qnum}`;
// Trois décimales : à deux, une question à 1.353 s'affiche « 1.35 » et se lit
// comme un faux positif contre un plafond affiché 1.35.
const fmt = (q) => `${name(q)} — ratio ${ratio(q).toFixed(3)} (${q.label.slice(0, 44)})`;
const cell = (s) =>
  `${String(s.hits).padStart(3)}/${String(s.total).padEnd(3)} = ${pct(s.rate).padStart(7)}` +
  (s.eligible ? '  ' : ' !');

const official = questions.filter((q) => OFFICIAL.has(q.id));
const audited = questions.filter((q) => !OFFICIAL.has(q.id));

const ratios = audited.map(ratio).filter(Number.isFinite);
const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
const over = audited.filter((q) => ratio(q) > CEILING).sort((a, b) => ratio(b) - ratio(a));
const officialOver = official.filter((q) => ratio(q) > CEILING).sort((a, b) => ratio(b) - ratio(a));

const ranks = rankProfile(audited);
const extremes = blindProfile(audited);
const best = bestStrategy(audited);
const hits = blindHits(audited, best);
const thin = ranks.filter((s) => !s.eligible);

console.log(`Indice de longueur — mode ${enforce ? 'enforce' : 'rapport'}`);
console.log(`  ${questions.length} questions, dont ${official.length} officielles hors verdict`);
console.log(`  ${extremes[0].total} questions à réponse unique mesurables, hasard ${pct(extremes[0].chance)}`);

console.log(`\n  « Toujours cocher la k-ième option la plus longue » — le verdict porte sur la meilleure.`);
console.log(`  Effectif affiché à côté du taux : un rang k n'existe que sur les questions à k options ou plus.`);
const lastRank = ranks.length / METRICS.length;
console.log(`    ${'rang'.padEnd(18)}${METRICS.map((m) => (m === 'words' ? 'mots' : 'caractères').padEnd(20)).join('')}`);
for (let rank = 1; rank <= lastRank; rank++) {
  const row = METRICS.map((m) => ranks.find((s) => s.rank === rank && s.metric === m));
  const flag = row.some((s) => s.id === best?.id) ? '<- meilleure' : '';
  const tag = rank === 1 ? ' (la + longue)' : rank === lastRank ? ' (la + courte)' : '';
  console.log(`    ${`k=${rank}${tag}`.padEnd(18)}${row.map((s) => cell(s).padEnd(20)).join('')}${flag}`);
}
if (thin.length) {
  console.log(
    `    ! ${thin.length} rang(s) sous l'effectif minimal de ${MIN_RANK_SAMPLE} questions : ` +
    `${thin.map((s) => s.id).join(', ')}.\n` +
    `      Mesurés et affichés, écartés du verdict — à cet effectif le taux ne distingue pas un\n` +
    `      indice d'un bruit d'échantillonnage.`
  );
}
console.log(`  Seuil d'échec : ${pct(MAX_BLIND_RATE)}`);

console.log(`\n  Extrémités, en diagnostic — mêmes stratégies, départage des ex æquo par la première`);
console.log(`  option du document aux deux bouts. L'encadrement fait varier ce seul départage :`);
console.log(`  borne basse = toute égalité comptée ratée, borne haute = toute égalité comptée gagnée.`);
for (const h of extremes) {
  const band = blindBounds(audited, h);
  console.log(
    `    ${h.label.padEnd(38)} ${String(h.hits).padStart(3)}/${h.total} = ${pct(h.rate).padStart(7)}` +
    `   [${pct(band.floor)} .. ${pct(band.ceil)}]`
  );
}

console.log(`\n  Concentration des égalités — la clé est-elle ex æquo avec l'option cochée ?`);
for (const h of HEURISTICS.filter((x) => x.pick === 'longest')) {
  const tie = tieConcentration(audited, h);
  console.log(
    `    ${h.metric === 'words' ? 'en mots  ' : 'en caract'} : ${tie.withKey}/${tie.ties} égalités contiennent la clé` +
    ` = ${pct(tie.rate)}`
  );
}
console.log(`    Une part élevée signale une optimisation contre le compteur, pas un équilibrage.`);

console.log(`\n  Diagnostic — ratio moyen clé/distracteurs : ${meanRatio.toFixed(2)} (plafond par question ${CEILING})`);
console.log(`  ${over.length} question(s) au-dessus du plafond :`);
for (const q of over) console.log('    -', fmt(q));

console.log(`\n  ${hits.length} question(s) devinables par « ${best.label} », les 15 pires marges :`);
console.log(`  (marge = de combien il faudrait modifier la clé pour lui faire perdre son rang)`);
for (const { question, margin } of hits.slice(0, 15)) {
  console.log(`    - ${name(question)} — ${margin} ${best.metric === 'words' ? 'mots' : 'car.'} (${question.label.slice(0, 44)})`);
}

console.log(`\n  Officielles pq-q1..pq-q12 — hors verdict : leurs options ne se réécrivent pas sans`);
console.log(`  trahir le guide. Ce n'est pas une attestation que l'indice mesuré ici soit celui du`);
console.log(`  guide : la transcription peut l'avoir introduit — pq-q10 sortait à 2.294 sur deux`);
console.log(`  options tronquées, 1.083 sur le texte du guide. Recouper contre le PDF avant`);
console.log(`  d'imputer un indice à l'examen.`);
for (const s of rankProfile(official)) {
  console.log(`    ${s.label.padEnd(38)} ${cell(s)}`);
}
console.log(`  ${officialOver.length} au-dessus du plafond de ratio, pour information seulement :`);
for (const q of officialOver) console.log('    -', fmt(q));

if (!enforce) {
  console.log('\nIndice de longueur : rapport seul, aucun verdict.');
  process.exit(0);
}
if (!best || best.rate <= MAX_BLIND_RATE) {
  console.log(`\nIndice de longueur : OK — meilleure stratégie aveugle ${pct(best?.rate ?? 0)} ≤ ${pct(MAX_BLIND_RATE)}`);
  process.exit(0);
}
console.log(
  `\nIndice de longueur : « ${best.label} » réussit ${best.hits}/${best.total} = ${pct(best.rate)},` +
  ` au-dessus du seuil de ${pct(MAX_BLIND_RATE)}`
);
process.exit(1);
