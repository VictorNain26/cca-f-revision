import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseQuestions, loadCorpus, ROOT } from './questions.mjs';
import {
  checkQuestion, FRENCH_MARKERS,
  checkIds, checkOverlap, checkTaskCoverage, checkTotals, checkCorpus, expectedTasks,
} from './question-contract.mjs';

const build = (over = {}) => {
  const opts = over.options ?? ['a', 'b', 'c', 'd'];
  const body = opts.map((o, i) => `<p data-opt="${o}">${'ABCDE'[i]}) Option ${o}.</p>`).join('\n');
  const expl = (over.explanations ?? ['b', 'c', 'd']).map((o) => `<li data-opt="${o}">Wrong.</li>`).join('');
  return `<details id="${over.id ?? 'pq-q1'}" data-domain="${over.domain ?? 'D1'}" data-task="${over.task ?? '1.4'}">
<summary>Q1 (Customer Support) — ${over.title ?? 'Deterministic tool ordering'}</summary>
<div>
  <p><strong>Scenario:</strong> ${over.scenario ?? 'The agent skips a verification step.'}</p>
  ${body}
  <hr>
  <p class="correct" data-answer="${over.answer ?? 'a'}">${over.answerText ?? 'Answer: add a prerequisite'}</p>
  <ul>${expl}</ul>
</div></details>`;
};

/* Deux vues : `signalled` réunit tout ce que le contrat remarque, `blocking`
 * ne garde que ce qui casserait la correction du quiz. Un test qui affirme
 * « signalé » ne dit rien de la sévérité — c'est `blocking` qui atteste la
 * frontière entre le bug et la convention de rédaction. */
const report = (html, file = 'Practice_Questions.html') => checkQuestion(parseQuestions(html, file)[0]);
const signalled = (html, file = 'Practice_Questions.html') => {
  const r = report(html, file);
  return [...r.problems, ...r.notices];
};
const blocking = (html, file = 'Practice_Questions.html') => report(html, file).problems;

test('une question conforme ne produit aucune remarque', () => {
  assert.deepEqual(signalled(build()), []);
});

test('un id hors schéma est signalé', () => {
  assert.match(signalled(build({ id: 'question-1' })).join(' '), /id/);
});

test("un id de fiche sur la page de la banque est signalé", () => {
  assert.match(signalled(build({ id: 'd1-q1' })).join(' '), /id/);
});

test('un domaine incohérent avec la fiche est signalé', () => {
  const html = build({ id: 'd1-q1', domain: 'D2' });
  assert.match(signalled(html, 'D1_Architecture_Orchestration_27pct.html').join(' '), /domaine/i);
});

test('une task absente est signalée', () => {
  const html = build().replace(' data-task="1.4"', '');
  assert.match(signalled(html).join(' '), /task/i);
});

test('une task contredisant la prose est signalée', () => {
  const html = build({ scenario: 'A gate. This is Task 2.1.' });
  assert.match(signalled(html).join(' '), /2\.1/);
});

test('trois options sont signalées', () => {
  assert.match(signalled(build({ options: ['a', 'b', 'c'], explanations: ['b', 'c'] })).join(' '), /options/i);
});

test('un data-opt hors séquence est refusé', () => {
  const html = build().replace('data-opt="c"', 'data-opt="x"');
  assert.match(signalled(html).join(' '), /data-opt/);
});

test('une lettre de texte désaccordée du data-opt est refusée', () => {
  const html = build().replace('<p data-opt="b">B)', '<p data-opt="b">D)');
  assert.match(signalled(html).join(' '), /lettre/i);
});

test('un data-answer pointant une option inexistante est refusé', () => {
  assert.match(signalled(build({ answer: 'e' })).join(' '), /data-answer/);
});

test('une lettre en dur dans le corrigé est signalée', () => {
  assert.match(signalled(build({ answerText: 'Answer: A) add a prerequisite' })).join(' '), /lettre en dur/i);
});

test('une explication qui manque un distracteur est signalée', () => {
  assert.match(signalled(build({ explanations: ['b', 'c'] })).join(' '), /distracteur/i);
});

test('une explication visant la bonne réponse est refusée', () => {
  assert.match(signalled(build({ explanations: ['a', 'b', 'c', 'd'] })).join(' '), /bonne r/i);
});

test('du français dans un bloc quiz est signalé', () => {
  assert.match(signalled(build({ scenario: "L'agent saute une étape de vérification." })).join(' '), /fran/i);
});

test('un accent isolé suffit à signaler du français', () => {
  assert.match(signalled(build({ title: 'Séquencement des outils' })).join(' '), /fran/i);
});

test('du français dans un <code> ne compte pas', () => {
  const html = build({ scenario: 'The tool named <code>où</code> returns a total.' });
  assert.deepEqual(signalled(html), []);
});

test('une question à réponses multiples est acceptée', () => {
  const html = build({ answer: 'b d', explanations: ['a', 'c'], answerText: 'Answers: two guarantees' });
  assert.deepEqual(signalled(html), []);
});

test('la liste française ne contient aucun mot anglais courant', () => {
  assert.ok(!FRENCH_MARKERS.test('criteria plus few-shot examples'));
  assert.ok(!FRENCH_MARKERS.test('the summary is on point'));
  assert.ok(!FRENCH_MARKERS.test('An escalation, or a retry'));
});

const q = (over) => ({
  file: 'Practice_Questions.html', prefix: 'pq', id: 'pq-q1', migrated: true,
  qnum: 1, label: 'Q1 — T', domain: 'D1', task: '1.4', citedTask: null,
  options: [], answer: [], answerText: '', explanations: [], prose: '',
  fp: new Set(['x']), ...over,
});

test('deux id identiques sont refusés', () => {
  const found = checkIds([q({}), q({ label: 'Q2 — U' })]);
  assert.match(found.join(' '), /pq-q1/);
});

test('deux id distincts ne produisent aucune violation', () => {
  assert.deepEqual(checkIds([q({}), q({ id: 'pq-q2', label: 'Q2 — U' })]), []);
});

test('un recouvrement fiche/banque au-dessus du seuil est signalé', () => {
  const bank = q({ fp: new Set(['get_customer', '12%', 'lookup_order']) });
  const sheet = q({
    file: 'D1_Architecture_Orchestration_27pct.html', prefix: 'd1', id: 'd1-q1',
    fp: new Set(['get_customer', '12%', 'lookup_order']),
  });
  assert.match(checkOverlap([bank, sheet]).join(' '), /recouvrement/i);
});

test('un recouvrement sous le seuil passe', () => {
  const bank = q({ fp: new Set(['get_customer', '12%']) });
  const sheet = q({
    file: 'D1_Architecture_Orchestration_27pct.html', prefix: 'd1', id: 'd1-q1',
    fp: new Set(['grant_access', 'verify_role', '8%', 'provisioning']),
  });
  assert.deepEqual(checkOverlap([bank, sheet]), []);
});

test('un tableau vide laisse les 30 tasks sans couverture', () => {
  assert.equal(checkTaskCoverage([]).length, 30);
});

test('les 30 tasks attendues couvertes ne produisent aucune violation', () => {
  const full = Object.entries(expectedTasks).flatMap(([domain, count]) =>
    Array.from({ length: count }, (_, i) => q({ task: `${domain}.${i + 1}` })));
  assert.deepEqual(checkTaskCoverage(full), []);
});

test('un TOTALS désaccordé du compte réel est refusé', () => {
  const found = checkTotals([q({})], { Practice_Questions: 112 });
  assert.match(found.join(' '), /TOTALS/);
});

test('une question sans id est ignorée par le contrat de forme', () => {
  const bad = q({ id: null, migrated: false, domain: null, task: null });
  const found = checkCorpus([bad], { declaredTotals: {} });
  assert.deepEqual(found.problems, []);
});

/* La frontière que cette refonte pose, attestée dans les deux sens : un
 * data-answer qui ne désigne rien fait corriger faux et doit bloquer ; un id
 * hors schéma est une convention de rédaction et ne doit pas. Sans ces deux
 * tests, un glissement d'une catégorie à l'autre passerait inaperçu. */
test('ce qui casse la correction du quiz bloque', () => {
  const html = build().replace('data-answer="a"', 'data-answer="z"');
  assert.match(blocking(html).join(' '), /data-answer/);
});

test("ce qui relève de la tenue éditoriale ne bloque pas", () => {
  const html = build({ id: 'question-1' });
  assert.deepEqual(blocking(html), []);
  assert.match(report(html).notices.join(' '), /id/);
});

test('le corpus réel ne porte aucune question que le quiz corrigerait mal', () => {
  const src = fs.readFileSync(path.join(ROOT, 'home-progress.js'), 'utf8');
  const block = src.match(/const TOTALS = \{([\s\S]*?)\};/);
  const declaredTotals = Object.fromEntries(
    [...block[1].matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );
  assert.deepEqual(checkCorpus(loadCorpus(), { declaredTotals }).problems, []);
});
