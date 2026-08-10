#!/usr/bin/env node
/* Codemod : applique le contrat de question aux items de Practice_Questions.html
 * dont la migration ne demande aucun arbitrage éditorial.
 *
 * Ce qu'il pose : l'id, data-domain / data-task, data-opt sur les options et sur
 * les explications, data-answer sur le corrigé — puis il retire du texte les
 * lettres devenues redondantes, que quiz.js réinjecte depuis la position réelle
 * des options.
 *
 * Il s'abstient dès que la forme s'écarte du gabarit : pas de « Task N.M » citée,
 * corrigé multi-réponses sans libellé, lettres désaccordées de leur rang,
 * explications qui ne couvrent pas exactement les distracteurs (signature d'une
 * explication groupée). Ces cas relèvent d'une réécriture à la main : un codemod
 * qui traite un cas qu'il n'a pas compris est pire qu'un codemod qui s'abstient.
 *
 * L'analyse passe par l'index de lib/questions.mjs, l'écriture par substitution
 * de lignes : re-sérialiser le DOM réécrirait les 2550 lignes du fichier et
 * rendrait la relecture impossible.
 *
 * Idempotent : une question déjà migrée porte un id, et un id fait sortir.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseQuestions, pagePrefix } from './lib/questions.mjs';

const FILE = 'Practice_Questions.html';
const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const BLOCK_RE = /<details\b[^>]*>[\s\S]*?<\/details>/g;

// Une explication qui commence par un mot ordinaire ouvre une phrase une fois sa
// lettre retirée ; on laisse en l'état ce qui ressemble à un identifiant.
const openSentence = (html) =>
  /^[a-z]+\b/.test(html) ? html[0].toUpperCase() + html.slice(1) : html;

const migrateBlock = (block) => {
  const [q] = parseQuestions(block, FILE);
  if (!q) return { status: 'ignored' };
  if (q.migrated) return { status: 'already', label: q.label };

  const refuse = (reason) => ({ status: 'refused', label: q.label, reason });
  const eol = block.includes('\r\n') ? '\r\n' : '\n';
  const lines = block.split(eol);

  if (lines[0] !== '<details>') return refuse(`ouverture « ${lines[0].slice(0, 40)} » hors gabarit`);
  if (!q.citedTask) return refuse('aucune mention « Task N.M » dans la prose');

  // Options : une par ligne, la lettre du texte doit valoir son rang.
  const optionLines = lines.flatMap((l, i) => (/^<p>[A-E]\)/.test(l) ? [i] : []));
  if (optionLines.length !== q.options.length) {
    return refuse(`${q.options.length} option(s) au DOM, ${optionLines.length} en ligne`);
  }
  if (q.options.length < 4 || q.options.length > 5) {
    return refuse(`${q.options.length} options, attendu 4 ou 5`);
  }
  const opts = LETTERS.slice(0, q.options.length);
  const misplaced = q.options.findIndex((o, i) => (o.letterInText || '').toLowerCase() !== opts[i]);
  if (misplaced >= 0) {
    return refuse(`lettre « ${q.options[misplaced].letterInText}) » au rang ${misplaced + 1}`);
  }

  // Corrigé : une seule bonne réponse, désignée par une lettre en tête de libellé.
  const correctLine = lines.findIndex((l) => l.startsWith('<p class="correct">'));
  if (correctLine < 0) return refuse('pas de <p class="correct"> en tête de ligne');
  const correct = lines[correctLine].match(/^<p class="correct">Answer:\s*([A-E])\)\s*(\S.*)<\/p>$/);
  if (!correct) {
    return refuse(`corrigé « ${lines[correctLine].slice(19, 60)} » hors du format « Answer: X) libellé »`);
  }
  const answer = correct[1].toLowerCase();
  if (!opts.includes(answer)) return refuse(`corrigé « ${correct[1]}) » ne désigne aucune option`);

  // Explications : exactement une par distracteur, chacune ouverte par sa lettre.
  const liLines = lines.flatMap((l, i) => (/^<li[ >]/.test(l) ? [i] : []));
  if (liLines.at(-1) - liLines[0] !== liLines.length - 1) {
    return refuse('les <li> d\'explication ne se suivent pas');
  }
  const explanations = liLines.map((i) => lines[i].match(/^<li>([A-E])\)\s*(\S.*)<\/li>$/));
  if (explanations.some((m) => !m)) {
    return refuse('un <li> ne commence pas par une lettre — explication groupée probable');
  }
  const covered = explanations.map((m) => m[1].toLowerCase()).sort();
  const distractors = opts.filter((o) => o !== answer);
  if (covered.join(' ') !== distractors.join(' ')) {
    return refuse(`explications [${covered.join(' ')}] pour les distracteurs [${distractors.join(' ')}]`);
  }

  const domain = `D${q.citedTask[0]}`;
  lines[0] = `<details id="${pagePrefix(FILE)}-q${q.qnum}" data-domain="${domain}" data-task="${q.citedTask}">`;
  optionLines.forEach((i, rank) => {
    lines[i] = lines[i].replace('<p>', `<p data-opt="${opts[rank]}">`);
  });
  lines[correctLine] = `<p class="correct" data-answer="${answer}">Answer: ${correct[2]}</p>`;
  // Les explications se rangent dans l'ordre des options : c'est celui où le
  // lecteur vient de voir les distracteurs.
  const ordered = explanations
    .map((m) => ({ opt: m[1].toLowerCase(), html: m[2] }))
    .sort((a, b) => opts.indexOf(a.opt) - opts.indexOf(b.opt));
  liLines.forEach((i, rank) => {
    const e = ordered[rank];
    lines[i] = `<li data-opt="${e.opt}">${openSentence(e.html)}</li>`;
  });

  return { status: 'migrated', label: q.label, block: lines.join(eol) };
};

const file = path.join(ROOT, FILE);
const source = fs.readFileSync(file, 'utf8');
const report = [];
const output = source.replace(BLOCK_RE, (block) => {
  const result = migrateBlock(block);
  report.push(result);
  return result.block ?? block;
});

const migrated = report.filter((r) => r.status === 'migrated');
const refused = report.filter((r) => r.status === 'refused');
if (output !== source) fs.writeFileSync(file, output);

console.log(`${FILE} : ${migrated.length} question(s) migrée(s), ${refused.length} laissée(s) en l'état`);
console.log(`  déjà sous contrat : ${report.filter((r) => r.status === 'already').length}`);
for (const r of refused) console.log(`  - ${r.label.slice(0, 46)} — ${r.reason}`);
