/* Tests de l'indice de longueur, sur fixtures construites à la main.
 * Le corpus n'est pas un oracle : il bouge à chaque correction, et un test qui
 * le prend pour référence mesure l'état du jour, pas la fonction.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { wordCount, optionWords, ratio, blindScore, OFFICIAL, CEILING } from './length-tell.mjs';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

// Fixture minimale au format questions.mjs : lengths donne le nombre de mots
// de chaque option, answer les lettres correctes.
const q = (lengths, answer) => ({
  id: 'fx-q1',
  answer,
  options: lengths.map((n, index) => ({
    opt: LETTERS[index].toLowerCase(),
    letterInText: LETTERS[index],
    index,
    text: `${LETTERS[index]}) ${words(n)}`,
  })),
});

test('wordCount ignore le préfixe de lettre', () => {
  assert.equal(wordCount('A) one two three'), 3);
  assert.equal(wordCount('one two three'), 3);
  assert.equal(wordCount('  C)   spaced   out  '), 2);
  assert.equal(wordCount(''), 0);
});

test('clé deux fois plus longue que ses distracteurs — ratio 2', () => {
  const question = q([20, 10, 10, 10], ['a']);
  assert.deepEqual(optionWords(question), { keys: [20], distractors: [10, 10, 10] });
  assert.equal(ratio(question), 2);
});

test('question équilibrée — ratio 1', () => {
  const question = q([12, 12, 12, 12], ['a']);
  assert.equal(ratio(question), 1);
});

test('question à réponses multiples — les clés se moyennent entre elles', () => {
  const question = q([10, 14, 6, 6], ['a', 'b']);
  assert.deepEqual(optionWords(question), { keys: [10, 14], distractors: [6, 6] });
  assert.equal(ratio(question), 2); // moyenne 12 / moyenne 6
});

test('ratio indéfini quand il manque une clé ou un distracteur', () => {
  assert.ok(Number.isNaN(ratio(q([10, 10, 10, 10], []))));
  assert.ok(Number.isNaN(ratio(q([10, 10, 10, 10], ['a', 'b', 'c', 'd']))));
});

test('égalité de longueur : la première option du document l’emporte', () => {
  // A et B sont à égalité au sommet. La stratégie prend A dans les deux cas.
  assert.equal(blindScore([q([15, 15, 5, 5], ['a'])]).hits, 1);
  assert.equal(blindScore([q([15, 15, 5, 5], ['b'])]).hits, 0);
});

test('blindScore compte sur un jeu de trois questions à réponse unique', () => {
  const questions = [
    q([20, 8, 8, 8], ['a']), // la plus longue est la clé      -> touche
    q([8, 8, 8, 20], ['b']), // la plus longue est D, clé en B -> raté
    q([9, 30, 9, 9], ['b']), // la plus longue est la clé      -> touche
    q([30, 30, 5, 5], ['a', 'b']), // multi-réponses            -> hors calcul
  ];
  assert.deepEqual(blindScore(questions), {
    hits: 2,
    total: 3,
    rate: 2 / 3,
    chance: 0.25,
  });
});

test('blindScore sur un corpus vide ne divise pas par zéro', () => {
  assert.deepEqual(blindScore([]), { hits: 0, total: 0, rate: 0, chance: 0 });
});

test('les douze questions officielles sont intouchables', () => {
  assert.equal(OFFICIAL.size, 12);
  assert.ok(OFFICIAL.has('pq-q1'));
  assert.ok(OFFICIAL.has('pq-q12'));
  assert.ok(!OFFICIAL.has('pq-q13'));
  assert.equal(CEILING, 1.35);
});
