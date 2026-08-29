import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkQuizContract } from './quiz-contract.mjs';
import { readBankTasks } from './courses.mjs';
import { ROOT, loadJsonQuizzes } from './quizzes.mjs';

const build = (over = {}) => ({
  id: 'd0-q1',
  domain: 'D0',
  task: '1.1',
  summary: 'Q1',
  scenario: 'A scenario.',
  question: 'A question?',
  options: { a: 'A.', b: 'B.', c: 'C.', d: 'D.' },
  answer: 'b',
  answerLabel: 'B.',
  why: 'Because.',
  distractors: { a: 'wrong', c: 'wrong', d: 'wrong' },
  ...over,
});

test('un quiz conforme ne produit aucune violation', () => {
  assert.deepEqual(checkQuizContract([build()]), []);
});

test('des options hors a-d sont refusées', () => {
  const q = build({ options: { a: 'A.', b: 'B.', c: 'C.' } });
  assert.match(checkQuizContract([q]).join(' '), /options/);
});

test('une réponse hors des clés d\'options est refusée', () => {
  const q = build({ answer: 'z' });
  assert.match(checkQuizContract([q]).join(' '), /answer/);
});

test('des distracteurs qui ne couvrent pas exactement les trois autres lettres sont refusés', () => {
  const q = build({ distractors: { a: 'wrong', c: 'wrong' } });
  assert.match(checkQuizContract([q]).join(' '), /distracteurs/);
});

test('un distracteur qui inclut la bonne réponse est refusé', () => {
  const q = build({ distractors: { a: 'wrong', b: 'wrong', c: 'wrong' } });
  assert.match(checkQuizContract([q]).join(' '), /distracteurs/);
});

test('un id dupliqué est refusé', () => {
  const problems = checkQuizContract([build(), build()]);
  assert.match(problems.join(' '), /dupliqué/);
});

test('une task absente de la banque est refusée quand bankTasks est fourni', () => {
  const q = build({ task: '9.9' });
  const problems = checkQuizContract([q], { bankTasks: new Set(['1.1']) });
  assert.match(problems.join(' '), /banque de questions/);
});

test('sans bankTasks, la task n\'est pas vérifiée', () => {
  const q = build({ task: '9.9' });
  assert.deepEqual(checkQuizContract([q]), []);
});

test('courses/quizzes/*.json respecte le contrat sur le corpus réel', () => {
  const bankTasks = readBankTasks(fs.readFileSync(path.join(ROOT, 'Practice_Questions.html'), 'utf8'));
  const quizzesDir = path.join(ROOT, 'courses', 'quizzes');
  const files = fs.readdirSync(quizzesDir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'aucun fichier courses/quizzes/*.json trouvé');

  for (const file of files) {
    const domain = file.replace(/\.json$/, '');
    const quizzes = loadJsonQuizzes(domain);
    assert.deepEqual(checkQuizContract(quizzes, { bankTasks }), [], `${file} hors contrat`);
  }
});
