/* Tests de tools/lib/practice.mjs.
 * Ce qu'ils protègent : la page des QCM est désormais un produit dérivé de
 * courses/practice/page.md et courses/quizzes/PQ.json. Un marqueur mal lu, une
 * table de couverture recopiée au lieu d'être calculée, un bloc de questions
 * silencieusement vide — chacun rendrait une page plausible et fausse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { coverageRows, renderPracticePage } from './practice.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const nav = { links: [['index.html', 'Accueil', ''], ['Practice_Questions.html', 'QCM', 'Les QCM'], ['Scenarios_Exam.html', 'Scénarios', 'Les 6 scénarios']] };

const question = (n, over = {}) => ({
  id: `pq-q${n}`,
  domain: 'D1',
  task: '1.1',
  summary: `Q${n} (Test) — un titre`,
  scenario: 'Un scénario.',
  question: 'Une question ?',
  options: { a: 'Première option.', b: 'Deuxième option.', c: 'Troisième option.', d: 'Quatrième option.' },
  answer: 'a',
  answerLabel: 'la première',
  why: 'parce que.',
  distractors: { b: 'Non.', c: 'Non plus.', d: 'Toujours pas.' },
  ...over,
});

const page = (body) => `<!-- title:Titre d'onglet -->\n\n# Titre affiché\n\nLe chapeau.\n\n${body}`;

const render = (markdown, quizzes) => renderPracticePage({ markdown, quizzes, nav });
const doc = (html) => new JSDOM(html).window.document;

test('les questions sont insérées là où le marqueur les place', () => {
  const { html, problems } = render(
    page('## Section\n<!-- id:sec -->\n\nAvant.\n\n<!-- questions:1-2 -->\n\nAprès.\n'),
    [question(1), question(2)],
  );
  assert.deepEqual(problems, []);
  const d = doc(html);
  assert.deepEqual([...d.querySelectorAll('details')].map((x) => x.id), ['pq-q1', 'pq-q2']);
  const text = d.body.textContent;
  assert.ok(text.indexOf('Avant.') < text.indexOf('Q1'), 'la prose qui précède reste avant');
  assert.ok(text.indexOf('Q2') < text.indexOf('Après.'), 'la prose qui suit reste après');
});

/* Le <details> ne doit pas finir imbriqué dans le bloc HTML que markdown-it
 * fabrique autour d'un commentaire isolé : quiz.js interroge `details > div`
 * et `details > summary` en enfants directs. */
test('un bloc de questions est frère de la prose, pas imbriqué dedans', () => {
  const { html } = render(page('## S\n<!-- id:s -->\n\nProse.\n\n<!-- questions:1-1 -->\n'), [question(1)]);
  const details = doc(html).querySelector('details');
  assert.equal(details.parentElement.tagName, 'MAIN');
  assert.ok(details.querySelector(':scope > summary'));
  assert.ok(details.querySelector(':scope > div'));
});

test('un marqueur qui réclame une question absente est signalé, pas ignoré', () => {
  const { problems } = render(page('## S\n<!-- id:s -->\n\n<!-- questions:1-3 -->\n'), [question(1)]);
  assert.equal(problems.length, 2);
  assert.match(problems.join(' '), /Q2/);
  assert.match(problems.join(' '), /Q3/);
});

test('une section sans marqueur id est signalée', () => {
  const { problems } = render(page('## Sans ancre\n\nProse.\n'), []);
  assert.match(problems.join(' '), /sans <!-- id:slug -->/);
});

test('un titre d’onglet absent est signalé', () => {
  const { problems } = renderPracticePage({ markdown: '# Titre\n\n## S\n<!-- id:s -->\n', quizzes: [], nav });
  assert.match(problems.join(' '), /title/);
});

/* Un marqueur mal orthographié équivaut sinon à son absence : la section perd
 * ses questions et la page se rend quand même. */
test('un marqueur mal orthographié est nommé plutôt que traité comme absent', () => {
  const { problems } = render(page('## S\n<!-- id:s -->\n\n<!-- question:1-1 -->\n'), [question(1)]);
  assert.match(problems.join(' '), /marqueur non reconnu/);
});

test('la table de couverture est calculée depuis les data-task', () => {
  const rows = coverageRows([question(1, { task: '1.1' }), question(2, { task: '1.2' }), question(3, { task: '1.1' })]);
  assert.deepEqual(rows.get('1.1'), [1, 3]);
  assert.deepEqual(rows.get('1.2'), [2]);
});

/* La raison d'être d'alsoTasks : cinq questions du corpus couvrent deux task
 * statements, et le seul data-task ne peut pas le dire. Sans ce champ, la
 * table perdrait l'information qu'elle portait à la main. */
test('alsoTasks fait apparaître une question sous ses deux task statements', () => {
  const rows = coverageRows([question(7, { task: '1.4', alsoTasks: ['1.5'] })]);
  assert.deepEqual(rows.get('1.4'), [7]);
  assert.deepEqual(rows.get('1.5'), [7]);
});

test('la colonne Questions est ajoutée à la table de libellés du Markdown', () => {
  const { html, problems } = render(
    page('## Couverture\n<!-- id:cov -->\n\n<!-- coverage-table -->\n| Task | Sujet |\n|---|---|\n| **1.1** | La boucle |\n'),
    [question(1, { task: '1.1' }), question(2, { task: '1.1' })],
  );
  assert.deepEqual(problems, []);
  const cells = [...doc(html).querySelectorAll('table tr')].map((r) => [...r.children].map((c) => c.textContent.trim()));
  assert.deepEqual(cells[0], ['Task', 'Sujet', 'Questions']);
  assert.deepEqual(cells[1], ['1.1', 'La boucle', 'Q1, Q2']);
});

test('une task portée par une question mais absente de la table est signalée', () => {
  const { problems } = render(
    page('## Couverture\n<!-- id:cov -->\n\n<!-- coverage-table -->\n| Task | Sujet |\n|---|---|\n| **1.1** | La boucle |\n'),
    [question(1, { task: '2.2' })],
  );
  assert.match(problems.join(' '), /2\.2/);
});

test('une task listée dans la table que plus aucune question ne porte est signalée', () => {
  const { problems } = render(
    page('## Couverture\n<!-- id:cov -->\n\n<!-- coverage-table -->\n| Task | Sujet |\n|---|---|\n| **9.9** | Disparue |\n'),
    [question(1, { task: '9.9' }), question(2, { task: '1.1' })].slice(1),
  );
  assert.match(problems.join(' '), /9\.9/);
});

/* Même garde que renderPage : sans elle, un quiz hors contrat écrit
 * « undefined » dans la page publiée sans que rien le signale. */
test('un quiz hors contrat fait échouer le rendu plutôt que publier undefined', () => {
  const bad = question(1);
  delete bad.distractors.b;
  assert.throws(() => render(page('## S\n<!-- id:s -->\n\n<!-- questions:1-1 -->\n'), [bad]), /hors contrat/);
});

test('le corpus réel se rend sans problème et porte ses 112 questions', () => {
  const markdown = fs.readFileSync(path.join(ROOT, 'courses', 'practice', 'page.md'), 'utf8');
  const quizzes = JSON.parse(fs.readFileSync(path.join(ROOT, 'courses', 'quizzes', 'PQ.json'), 'utf8'));
  const links = JSON.parse(JSON.stringify(nav.links));
  const { html, problems } = renderPracticePage({ markdown, quizzes, nav: { links } });
  assert.deepEqual(problems, []);
  assert.equal(doc(html).querySelectorAll('details').length, 112);
});
