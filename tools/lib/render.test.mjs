import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCourse } from './render.mjs';

test('renderCourse découpe le cours en sections de niveau 2', () => {
  const md = '# Titre\n\nIntro.\n\n## Première\n\nA.\n\n## Deuxième\n\nB.\n';
  const { title, sections } = renderCourse(md);
  assert.equal(title, 'Titre');
  assert.equal(sections.length, 2);
  assert.equal(sections[0].heading, 'Première');
  assert.match(sections[0].html, /<p>A\.<\/p>/);
});

test('renderCourse numérote les ancres comme le site', () => {
  const { sections, toc } = renderCourse('## Une\n\nA.\n\n## Deux\n\nB.\n');
  assert.deepEqual(sections.map((s) => s.id), ['s1', 's2']);
  assert.deepEqual(toc, [{ id: 's1', heading: 'Une' }, { id: 's2', heading: 'Deux' }]);
});

test('renderCourse préserve le code inline des titres', () => {
  const { toc } = renderCourse('## Le champ `stop_reason`\n\nA.\n');
  assert.match(toc[0].heading, /<code>stop_reason<\/code>/);
});

test('renderCourse rend les tableaux', () => {
  const { sections } = renderCourse('## T\n\n| A | B |\n|---|---|\n| 1 | 2 |\n');
  assert.match(sections[0].html, /<table>/);
  assert.match(sections[0].html, /<td>1<\/td>/);
});

test('renderCourse traduit ::: exam-tip en encadré du site', () => {
  const { sections } = renderCourse('## T\n\n::: exam-tip\nCeci est testé.\n:::\n');
  assert.match(sections[0].html, /<div class="exam-tip">/);
  assert.match(sections[0].html, /Ceci est testé\./);
});

test('renderCourse traduit ::: key-concept en encadré du site', () => {
  const { sections } = renderCourse('## T\n\n::: key-concept\nCeci est un concept clé.\n:::\n');
  assert.match(sections[0].html, /<div class="key-concept">/);
  assert.match(sections[0].html, /Ceci est un concept clé\./);
});

test('renderCourse traduit ::: anti-pattern en encadré du site', () => {
  const { sections } = renderCourse('## T\n\n::: anti-pattern\nCeci est un anti-pattern.\n:::\n');
  assert.match(sections[0].html, /<div class="anti-pattern">/);
  assert.match(sections[0].html, /Ceci est un anti-pattern\./);
});

test('renderCourse ignore les commentaires de métadonnées', () => {
  const { sections } = renderCourse('## T\n<!-- src:x -->\n<!-- owns:y -->\n\nProse.\n');
  assert.doesNotMatch(sections[0].html, /src:x/);
  assert.doesNotMatch(sections[0].html, /owns:y/);
});

test('renderCourse ignore un commentaire de métadonnées replié sur deux lignes', () => {
  const { sections } = renderCourse('## T\n<!-- src:x\n     y -->\n\nProse.\n');
  assert.doesNotMatch(sections[0].html, /src:x/);
  assert.match(sections[0].html, /<p>Prose\.<\/p>/);
});

test('renderCourse conserve le contenu placé avant le premier ## dans lead', () => {
  const { lead } = renderCourse('# Titre\n\nIntro un.\n\nIntro deux.\n\n## Première\n\nA.\n');
  assert.match(lead, /<p>Intro un\.<\/p>/);
  assert.match(lead, /<p>Intro deux\.<\/p>/);
});

test('renderCourse rend lead vide quand rien ne précède le premier ##', () => {
  const { lead } = renderCourse('## Une\n\nA.\n');
  assert.equal(lead, '');
});
