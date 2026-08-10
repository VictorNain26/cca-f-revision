/* Tests de l'indice de longueur, sur fixtures construites à la main.
 * Le corpus n'est pas un oracle : il bouge à chaque correction, et un test qui
 * le prend pour référence mesure l'état du jour, pas la fonction.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  wordCount,
  charCount,
  optionWords,
  ratio,
  blindScore,
  blindProfile,
  rankProfile,
  rankStrategy,
  bestStrategy,
  blindBounds,
  blindHits,
  tieConcentration,
  HEURISTICS,
  METRICS,
  OFFICIAL,
  CEILING,
  MAX_BLIND_RATE,
  MIN_RANK_SAMPLE,
} from './length-tell.mjs';

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

/* Fixture à texte libre : chaque option porte son texte tel quel, ce que la
 * fixture par nombre de mots ne permet pas — les mots y font tous deux
 * caractères, donc mots et caractères y sont proportionnels. */
const qText = (texts, answer, id = 'fx-t1') => ({
  id,
  answer,
  options: texts.map((text, index) => ({
    opt: LETTERS[index].toLowerCase(),
    letterInText: LETTERS[index],
    index,
    text: `${LETTERS[index]}) ${text}`,
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

test('charCount mesure le texte visible, préfixe exclu et espaces normalisés', () => {
  assert.equal(charCount('A) one two'), 7);
  assert.equal(charCount('  C)   spaced   out  '), 10); // « spaced out »
  assert.equal(charCount(''), 0);
});

/* Le cas que l'ancienne mesure ratait : quatre options de trois mots chacune,
 * dont la clé pèse quatre fois plus de caractères. Le compteur de mots ne voit
 * plus rien, l'œil du candidat voit tout. */
const DIVERGENT = qText(
  [
    'one two six',
    'orchestration deterministic instrumentation',
    'two six ten',
    'six ten one',
  ],
  ['b']
);

test('mots et caractères divergent : le compteur de mots est aveugle, pas celui de caractères', () => {
  assert.deepEqual(DIVERGENT.options.map((o) => wordCount(o.text)), [3, 3, 3, 3]);
  assert.equal(blindScore([DIVERGENT], 'longest-words').rate, 0);
  assert.equal(blindScore([DIVERGENT], 'longest-chars').rate, 1);
  assert.equal(bestStrategy([DIVERGENT]).id, 'longest-chars');
});

test('le profil rend les quatre heuristiques, dans l’ordre déclaré', () => {
  const profile = blindProfile([DIVERGENT]);
  assert.deepEqual(profile.map((h) => h.id), HEURISTICS.map((h) => h.id));
  assert.deepEqual(profile.map((h) => h.rate), [0, 1, 0, 0]);
});

test('sur-correction : une clé systématiquement la plus courte est tout aussi devinable', () => {
  const questions = [q([5, 20, 20, 20], ['a']), q([6, 30, 30, 30], ['a'])];
  const profile = Object.fromEntries(blindProfile(questions).map((h) => [h.id, h.rate]));
  assert.equal(profile['longest-words'], 0);
  assert.equal(profile['shortest-words'], 1);
  assert.equal(bestStrategy(questions).id, 'shortest-words');
});

test('la plus courte départage aussi par la première option du document', () => {
  assert.equal(blindScore([q([5, 5, 20, 20], ['a'])], 'shortest-words').hits, 1);
  assert.equal(blindScore([q([5, 5, 20, 20], ['b'])], 'shortest-words').hits, 0);
});

test('bestStrategy départage les taux égaux par l’ordre de génération', () => {
  // Clé la plus longue en mots comme en caractères : les deux premières
  // heuristiques sont à 100 %, la première déclarée l'emporte.
  const questions = [q([20, 8, 8, 8], ['a'])];
  const profile = blindProfile(questions);
  assert.equal(profile[0].rate, 1);
  assert.equal(profile[1].rate, 1);
  assert.equal(bestStrategy(questions).id, 'longest-words');
});

test('l’encadrement chiffre ce que doit le résultat au départage des égalités', () => {
  // Une seule question, quatre options à égalité en mots, clé en B : ratée par
  // convention, mais elle serait touchée si l'égalité comptait comme gagnée.
  const bounds = blindBounds([DIVERGENT], 'longest-words');
  assert.deepEqual(bounds, { total: 1, rate: 0, floor: 0, ceil: 1 });
  // En caractères la clé est seule au sommet : le résultat ne doit rien à la
  // convention, les trois valeurs coïncident.
  assert.deepEqual(blindBounds([DIVERGENT], 'longest-chars'), { total: 1, rate: 1, floor: 1, ceil: 1 });
});

test('concentration des égalités : signature de l’alignement sur le compteur', () => {
  const questions = [
    q([15, 15, 5, 5], ['a']), // égalité au sommet, clé dedans
    q([15, 15, 5, 5], ['b']), // égalité au sommet, clé dedans
    q([15, 15, 5, 5], ['c']), // égalité au sommet, clé hors égalité
    q([20, 8, 8, 8], ['a']), // pas d'égalité au sommet -> hors décompte
  ];
  assert.deepEqual(tieConcentration(questions, 'longest-words'), {
    ties: 3,
    withKey: 2,
    rate: 2 / 3,
  });
});

test('concentration des égalités : zéro égalité ne divise pas par zéro', () => {
  assert.deepEqual(tieConcentration([q([20, 8, 7, 6], ['a'])], 'longest-words'), {
    ties: 0,
    withKey: 0,
    rate: 0,
  });
});

test('blindHits liste les questions touchées, marge décroissante', () => {
  const questions = [
    qText(['aa', 'bbbbbbbbbb', 'cc', 'dd'], ['b'], 'fx-wide'), // clé +8 caractères
    qText(['aaaa', 'bb', 'cc', 'dd'], ['a'], 'fx-narrow'), // clé +2 caractères
    qText(['aa', 'bb', 'cccccc', 'dd'], ['a'], 'fx-miss'), // clé non touchée
    qText(['aa', 'aa', 'bb', 'bb'], ['a'], 'fx-tie'), // touchée par départage
  ];
  const hits = blindHits(questions, 'longest-chars');
  assert.deepEqual(hits.map((h) => [h.question.id, h.margin]), [
    ['fx-wide', 8],
    ['fx-narrow', 2],
    ['fx-tie', 0], // marge nulle : la touche ne tient qu'à la convention
  ]);
});

test('le seuil du verdict laisse une marge au-dessus du hasard sans être laxiste', () => {
  assert.equal(MAX_BLIND_RATE, 0.35);
  assert.ok(MAX_BLIND_RATE > 0.25);
  assert.ok(MAX_BLIND_RATE < 0.5);
});

/* Le contournement que la mesure par extrémités laissait passer : la clé est
 * systématiquement la DEUXIÈME plus longue, en mots comme en caractères. Aucune
 * heuristique d'extrémité ne la voit, un candidat la coche à tous les coups.
 * L'effectif est celui du plancher, pour que les rangs portent le verdict. */
const rank2Corpus = (n = MIN_RANK_SAMPLE) =>
  Array.from({ length: n }, (_, i) => ({ ...q([9, 7, 5, 3], ['b']), id: `fx-r2-${i}` }));

test('clé systématiquement deuxième : les extrémités sont aveugles', () => {
  const questions = rank2Corpus();
  for (const h of blindProfile(questions)) {
    assert.equal(h.rate, 0, `${h.id} devrait être à zéro`);
  }
});

test('clé systématiquement deuxième : la mesure de rang la débusque à 100 %', () => {
  const questions = rank2Corpus();
  const rates = Object.fromEntries(rankProfile(questions).map((s) => [s.id, s.rate]));
  assert.deepEqual(rates, {
    'rank1-words': 0,
    'rank2-words': 1,
    'rank3-words': 0,
    'rank4-words': 0,
    'rank1-chars': 0,
    'rank2-chars': 1,
    'rank3-chars': 0,
    'rank4-chars': 0,
  });
  const best = bestStrategy(questions);
  assert.equal(best.id, 'rank2-words');
  assert.equal(best.rate, 1);
  assert.ok(best.rate > MAX_BLIND_RATE, 'le verdict doit tomber sur ce corpus');
});

test('sous le plancher d’effectif, un rang est mesuré mais ne décide pas', () => {
  const questions = rank2Corpus(MIN_RANK_SAMPLE - 1);
  const ranks = rankProfile(questions);
  assert.ok(ranks.every((s) => !s.eligible));
  assert.equal(ranks.find((s) => s.id === 'rank2-words').rate, 1); // mesuré quand même
  // Le verdict retombe sur les extrémités, toutes à zéro ici : l'échantillon
  // ne permet pas de conclure, la mesure ne bluffe pas.
  assert.equal(bestStrategy(questions).rate, 0);
  assert.equal(rankProfile(rank2Corpus()).every((s) => s.eligible), true);
});

test('rankProfile couvre tous les rangs existants, par métrique puis par rang', () => {
  const rows = rankProfile(rank2Corpus());
  assert.deepEqual(
    rows.map((s) => s.id),
    METRICS.flatMap((m) => [1, 2, 3, 4].map((k) => `rank${k}-${m}`))
  );
  assert.deepEqual(rows.map((s) => s.total), Array(8).fill(MIN_RANK_SAMPLE));
});

test('un rang n’existe que sur les questions offrant assez d’options', () => {
  // Trois options seulement : le rang 4 ne s'applique à aucune question.
  const narrow = { ...q([9, 7, 5], ['a']), id: 'fx-narrow-3' };
  assert.equal(blindScore([narrow], rankStrategy(3, 'words')).total, 1);
  assert.equal(blindScore([narrow], rankStrategy(4, 'words')).total, 0);
  assert.equal(blindScore([narrow], rankStrategy(4, 'words')).rate, 0);
  // Le corpus mixte ne mesure le rang 4 que sur la question à quatre options.
  const wide = { ...q([9, 7, 5, 3], ['d']), id: 'fx-wide-4' };
  const r4 = blindScore([narrow, wide], rankStrategy(4, 'words'));
  assert.deepEqual([r4.hits, r4.total], [1, 1]);
});

test('rang 1 et rang n reproduisent les extrémités, aux ex æquo près', () => {
  // Sans égalité, les deux conventions coïncident.
  const clean = q([9, 7, 5, 3], ['a']);
  assert.equal(blindScore([clean], rankStrategy(1, 'words')).hits, blindScore([clean], 'longest-words').hits);
  // Sur une égalité en bas de tableau elles divergent, et c'est documenté :
  // l'extrémité prend la première option du document, le rang 4 la dernière.
  const tiedBottom = q([20, 20, 5, 5], ['c']);
  assert.equal(blindScore([tiedBottom], 'shortest-words').hits, 1);
  assert.equal(blindScore([tiedBottom], rankStrategy(4, 'words')).hits, 0);
});

test('les marges se calculent aussi pour un rang intermédiaire', () => {
  const questions = [
    qText(['aaaaaaaaaa', 'bbbbbb', 'cc', 'd'], ['b'], 'fx-mid'), // clé 2e, marge 4
    qText(['aaaaaaaaaa', 'bbbbbbbbb', 'cc', 'd'], ['b'], 'fx-tight'), // clé 2e, marge 1
  ];
  assert.deepEqual(
    blindHits(questions, rankStrategy(2, 'chars')).map((h) => [h.question.id, h.margin]),
    [['fx-mid', 4], ['fx-tight', 1]]
  );
});
