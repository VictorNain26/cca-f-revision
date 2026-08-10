import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlap, parseQuestions } from './questions.mjs';
import {
  applyExemptions,
  contentWords,
  optionEcho,
  suspects,
  validateExemptions,
  THRESHOLD,
} from './duplicates.mjs';

/* Le cas d5-q4 : la question de banque et sa reprise en auto-évaluation ne
 * diffèrent que par les identifiants de code et les valeurs chiffrées — « 97 % »
 * devient « 94 % », `confidence_score` devient `confidence_level`. Situation et
 * options sont mot pour mot les mêmes. C'est exactement la forme qu'a prise la
 * passe de réécriture, et c'est le trou de l'empreinte historique. */
const BANK_LAZY = `<details id="pq-q42" data-domain="D5" data-task="5.5">
<summary>Q42 (Document Extraction) — Routing the uncertain invoices</summary>
<div>
  <p><strong>Scenario:</strong> the extraction pipeline reports 97% aggregate accuracy on supplier invoices, and the finance team wants a review policy.</p>
  <p data-opt="a">A) Route every invoice whose <code>confidence_score</code> falls under 97% to a human reviewer.</p>
  <p data-opt="b">B) Trust the aggregate figure and sample 25 invoices each morning.</p>
  <p data-opt="c">C) Ask the model to rate its own extraction and review whatever it rates poorly.</p>
  <p data-opt="d">D) Raise the temperature until the extraction pipeline stops hedging on faint scans.</p>
  <hr>
  <p class="correct" data-answer="a">Answer: route the uncertain invoices to a reviewer</p>
  <ul><li data-opt="b">Aggregate.</li><li data-opt="c">Uncalibrated.</li><li data-opt="d">Unrelated.</li></ul>
</div></details>`;

const SHEET_LAZY = `<details id="d5-q4" data-domain="D5" data-task="5.5">
<summary>Q4 (D5) — Routing the uncertain invoices</summary>
<div>
  <p><strong>Scenario:</strong> the extraction pipeline reports 94% aggregate accuracy on supplier invoices, and the finance team wants a review policy.</p>
  <p data-opt="a">A) Route every invoice whose <code>confidence_level</code> falls under 94% to a human reviewer.</p>
  <p data-opt="b">B) Trust the aggregate figure and sample 30 invoices each morning.</p>
  <p data-opt="c">C) Ask the model to rate its own extraction and review whatever it rates poorly.</p>
  <p data-opt="d">D) Raise the temperature until the extraction pipeline stops hedging on faint scans.</p>
  <hr>
  <p class="correct" data-answer="a">Answer: route the uncertain invoices to a reviewer</p>
  <ul><li data-opt="b">Aggregate.</li><li data-opt="c">Uncalibrated.</li><li data-opt="d">Unrelated.</li></ul>
</div></details>`;

/* Le cas d4-q7 : même data-task que la banque, situation réellement autre. Une
 * réécriture qui a fait son travail. Le détecteur doit la laisser tranquille,
 * sans quoi il n'apprend rien à personne. */
const SHEET_REWRITTEN = `<details id="d4-q7" data-domain="D5" data-task="5.5">
<summary>Q7 (D5) — A citation nobody can trace back</summary>
<div>
  <p><strong>Scenario:</strong> a legal assistant quotes clause numbers that appear nowhere in the filed contract, and counsel only notices at the hearing.</p>
  <p data-opt="a">A) Require every quoted clause to carry the span of source text it was lifted from.</p>
  <p data-opt="b">B) Append a warning telling counsel to double-check anything that looks unusual.</p>
  <p data-opt="c">C) Lower the temperature so the assistant invents fewer clause numbers.</p>
  <p data-opt="d">D) Ask a second assistant whether the first one sounds confident enough.</p>
  <hr>
  <p class="correct" data-answer="a">Answer: demand the source span alongside the quote</p>
  <ul><li data-opt="b">Shifts the work.</li><li data-opt="c">Probabilistic.</li><li data-opt="d">No ground truth.</li></ul>
</div></details>`;

const OFFICIAL_TWIN = `<details id="pq-q6" data-domain="D5" data-task="5.5">
<summary>Q6 (Document Extraction) — Routing the uncertain invoices</summary>
<div>
  <p><strong>Scenario:</strong> the extraction pipeline reports 91% aggregate accuracy on supplier invoices, and the finance team wants a review policy.</p>
  <p data-opt="a">A) Route every invoice whose <code>score</code> falls under 91% to a human reviewer.</p>
  <p data-opt="b">B) Trust the aggregate figure and sample 40 invoices each morning.</p>
  <p data-opt="c">C) Ask the model to rate its own extraction and review whatever it rates poorly.</p>
  <p data-opt="d">D) Raise the temperature until the extraction pipeline stops hedging on faint scans.</p>
  <hr>
  <p class="correct" data-answer="a">Answer: route the uncertain invoices to a reviewer</p>
  <ul><li data-opt="b">Aggregate.</li><li data-opt="c">Uncalibrated.</li><li data-opt="d">Unrelated.</li></ul>
</div></details>`;

const one = (html, file) => parseQuestions(html, file)[0];
const bank = one(BANK_LAZY, 'Practice_Questions.html');
const sheet = one(SHEET_LAZY, 'D5_Context_Fiabilite_15pct.html');
const rewritten = one(SHEET_REWRITTEN, 'D5_Context_Fiabilite_15pct.html');
const officialTwin = one(OFFICIAL_TWIN, 'Practice_Questions.html');

test('contentWords retire le contenu des <code>, les nombres et les mots-outils', () => {
  const words = contentWords('A) Route the invoice when <code>confidence_score</code> is under 97% to a reviewer.');
  assert.deepEqual([...words].sort(), ['invoice', 'reviewer', 'route']);
});

test('contentWords ramène le pluriel au singulier, sans toucher aux mots en -ss', () => {
  assert.ok(contentWords('several tools').has('tool'));
  assert.ok(contentWords('one tool').has('tool'));
  assert.ok(contentWords('the process').has('process'));
});

test("l'empreinte historique voit 0,00 là où l'écho d'options voit un doublon", () => {
  // La démonstration : ce que l'ancien contrôle laissait passer.
  assert.equal(overlap(bank.fp, sheet.fp), 0);
  assert.ok(
    optionEcho(bank, sheet) >= 0.9,
    `écho d'options attendu >= 0.9, mesuré ${optionEcho(bank, sheet)}`
  );
});

test('une réécriture réelle de même task reste basse', () => {
  const echo = optionEcho(bank, rewritten);
  assert.ok(echo < THRESHOLD, `écho attendu < ${THRESHOLD}, mesuré ${echo}`);
});

test('optionEcho est symétrique', () => {
  assert.equal(optionEcho(bank, sheet), optionEcho(sheet, bank));
});

test('suspects ne retient que les paires fiche ↔ banque au-dessus du seuil', () => {
  const found = suspects([bank, sheet, rewritten]);
  assert.deepEqual(found.map((p) => p.key), ['d5-q4|pq-q42']);
  assert.equal(found.compared, 2);
});

test('suspects signale les paires portant sur une officielle', () => {
  const found = suspects([bank, officialTwin, sheet]);
  assert.deepEqual(
    found.map((p) => [p.bank, p.official]).sort(),
    [['pq-q42', false], ['pq-q6', true]]
  );
});

test('sameTaskOnly restreint l’espace de recherche, et peut être levé', () => {
  const otherTask = { ...bank, id: 'pq-q99', task: '1.1' };
  assert.equal(suspects([otherTask, sheet]).length, 0);
  assert.equal(suspects([otherTask, sheet], { sameTaskOnly: false }).length, 1);
});

test('une exemption sans justification est refusée', () => {
  assert.match(
    validateExemptions([{ sheet: 'd3-q7', bank: 'pq-q39' }]).join(' '),
    /sans justification/
  );
  assert.match(
    validateExemptions([{ sheet: 'd3-q7', bank: 'pq-q39', why: '   ' }]).join(' '),
    /sans justification/
  );
  assert.match(
    validateExemptions([{ sheet: 'd3-q7', bank: 'pq-q39', why: 'faux positif' }]).join(' '),
    /trop courte/
  );
  assert.deepEqual(
    validateExemptions([{ sheet: 'd3-q7', bank: 'pq-q39', why: 'Même task, deux situations sans rapport.' }]),
    []
  );
});

test('applyExemptions écarte la paire exemptée et signale celles sans effet', () => {
  const pairs = suspects([bank, sheet]);
  const why = 'Même task, deux situations sans rapport aucun.';
  const { reported, exempted, stale } = applyExemptions(pairs, [
    { sheet: 'd5-q4', bank: 'pq-q42', why },
    { sheet: 'd0-q1', bank: 'pq-q13', why },
  ]);
  assert.deepEqual(reported, []);
  assert.deepEqual(exempted.map((p) => p.key), ['d5-q4|pq-q42']);
  assert.equal(exempted[0].why, why);
  assert.deepEqual(stale.map((e) => e.sheet), ['d0-q1']);
});
