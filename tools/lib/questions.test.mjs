import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions, overlap, pagePrefix } from './questions.mjs';

const MIGRATED = `<details id="pq-q1" data-domain="D1" data-task="1.4">
<summary>Q1 (Customer Support) — Deterministic tool ordering</summary>
<div>
  <p><strong>Scenario:</strong> in 12% of cases the agent skips <code>get_customer</code>.</p>
  <p data-opt="a">A) Add a programmatic prerequisite.</p>
  <p data-opt="b">B) Enhance the system prompt.</p>
  <p data-opt="c">C) Add few-shot examples.</p>
  <p data-opt="d">D) Implement a routing classifier.</p>
  <hr>
  <p class="correct" data-answer="a">Answer: add a programmatic prerequisite</p>
  <p class="incorrect"><strong>Why the others are wrong:</strong></p>
  <ul><li data-opt="b">Probabilistic.</li><li data-opt="c">Steers only.</li><li data-opt="d">Availability, not ordering.</li></ul>
</div></details>`;

const LEGACY = `<details>
<summary>Q9 (D2) — Un intitulé français</summary>
<div>
  <p><strong>Situation :</strong> trois formats de date.</p>
  <p>A) Première option.</p>
  <p>B) Deuxième option.</p>
  <p>C) Troisième option.</p>
  <p>D) Quatrième option.</p>
  <hr>
  <p class="correct">Réponse : B) Deuxième option</p>
</div></details>`;

test('pagePrefix distingue la banque des fiches', () => {
  assert.equal(pagePrefix('Practice_Questions.html'), 'pq');
  assert.equal(pagePrefix('D3_Claude_Code_Config_20pct.html'), 'd3');
});

test('parseQuestions lit le contrat complet', () => {
  const [q] = parseQuestions(MIGRATED, 'Practice_Questions.html');
  assert.equal(q.id, 'pq-q1');
  assert.equal(q.migrated, true);
  assert.equal(q.qnum, 1);
  assert.equal(q.domain, 'D1');
  assert.equal(q.task, '1.4');
  assert.equal(q.options.length, 4);
  assert.deepEqual(q.options.map((o) => o.opt), ['a', 'b', 'c', 'd']);
  assert.deepEqual(q.options.map((o) => o.letterInText), ['A', 'B', 'C', 'D']);
  assert.deepEqual(q.answer, ['a']);
  assert.deepEqual(q.explanations, ['b', 'c', 'd']);
  assert.ok(!q.prose.includes('get_customer'));
});

test('parseQuestions tolère une question non migrée', () => {
  const [q] = parseQuestions(LEGACY, 'D2_Tool_Design_MCP_18pct.html');
  assert.equal(q.id, null);
  assert.equal(q.migrated, false);
  assert.equal(q.task, null);
  assert.equal(q.options.length, 4);
  assert.deepEqual(q.options.map((o) => o.opt), [null, null, null, null]);
  assert.deepEqual(q.answer, []);
});

test('parseQuestions relève la task citée en prose', () => {
  const html = MIGRATED.replace('Probabilistic.', 'Probabilistic. This is Task 1.4.');
  assert.equal(parseQuestions(html, 'Practice_Questions.html')[0].citedTask, '1.4');
});

test("parseQuestions ignore un <details> qui n'est pas un quiz", () => {
  const html = '<details><summary>Aide-mémoire</summary><div><p>Texte.</p></div></details>';
  assert.deepEqual(parseQuestions(html, 'Exam_Strategy.html'), []);
});

test("l'empreinte retient le code et les nombres", () => {
  const [q] = parseQuestions(MIGRATED, 'Practice_Questions.html');
  assert.ok(q.fp.has('get_customer'));
  assert.ok(q.fp.has('12%'));
});

test('overlap est un indice de Jaccard', () => {
  assert.equal(overlap(new Set(['a', 'b']), new Set(['a', 'b'])), 1);
  assert.equal(overlap(new Set(['a']), new Set(['b'])), 0);
  assert.equal(overlap(new Set(['a', 'b', 'c']), new Set(['a', 'b', 'd'])), 0.5);
  assert.equal(overlap(new Set(), new Set(['a'])), 0);
});
