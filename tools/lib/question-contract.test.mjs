import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions } from './questions.mjs';
import { checkQuestion } from './question-contract.mjs';

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

const violations = (html, file = 'Practice_Questions.html') => checkQuestion(parseQuestions(html, file)[0]);

test('une question conforme ne produit aucune violation', () => {
  assert.deepEqual(violations(build()), []);
});

test('un id hors schéma est refusé', () => {
  assert.match(violations(build({ id: 'question-1' })).join(' '), /id/);
});

test("un id de fiche sur la page de la banque est refusé", () => {
  assert.match(violations(build({ id: 'd1-q1' })).join(' '), /id/);
});

test('un domaine incohérent avec la fiche est refusé', () => {
  const html = build({ id: 'd1-q1', domain: 'D2' });
  assert.match(violations(html, 'D1_Architecture_Orchestration_27pct.html').join(' '), /domaine/i);
});

test('une task absente est refusée', () => {
  const html = build().replace(' data-task="1.4"', '');
  assert.match(violations(html).join(' '), /task/i);
});

test('une task contredisant la prose est refusée', () => {
  const html = build({ scenario: 'A gate. This is Task 2.1.' });
  assert.match(violations(html).join(' '), /2\.1/);
});

test('trois options sont refusées', () => {
  assert.match(violations(build({ options: ['a', 'b', 'c'], explanations: ['b', 'c'] })).join(' '), /options/i);
});

test('un data-opt hors séquence est refusé', () => {
  const html = build().replace('data-opt="c"', 'data-opt="x"');
  assert.match(violations(html).join(' '), /data-opt/);
});

test('une lettre de texte désaccordée du data-opt est refusée', () => {
  const html = build().replace('<p data-opt="b">B)', '<p data-opt="b">D)');
  assert.match(violations(html).join(' '), /lettre/i);
});

test('un data-answer pointant une option inexistante est refusé', () => {
  assert.match(violations(build({ answer: 'e' })).join(' '), /data-answer/);
});

test('une lettre en dur dans le corrigé est refusée', () => {
  assert.match(violations(build({ answerText: 'Answer: A) add a prerequisite' })).join(' '), /lettre en dur/i);
});

test('une explication qui manque un distracteur est refusée', () => {
  assert.match(violations(build({ explanations: ['b', 'c'] })).join(' '), /distracteur/i);
});

test('une explication visant la bonne réponse est refusée', () => {
  assert.match(violations(build({ explanations: ['a', 'b', 'c', 'd'] })).join(' '), /bonne r/i);
});

test('du français dans un bloc quiz est refusé', () => {
  assert.match(violations(build({ scenario: "L'agent saute une étape de vérification." })).join(' '), /fran/i);
});

test('un accent isolé suffit à signaler du français', () => {
  assert.match(violations(build({ title: 'Séquencement des outils' })).join(' '), /fran/i);
});

test('du français dans un <code> ne compte pas', () => {
  const html = build({ scenario: 'The tool <code>calculer_le_prix</code> returns a total.' });
  assert.deepEqual(violations(html), []);
});

test('une question à réponses multiples est acceptée', () => {
  const html = build({ answer: 'b d', explanations: ['a', 'c'], answerText: 'Answers: two guarantees' });
  assert.deepEqual(violations(html), []);
});
