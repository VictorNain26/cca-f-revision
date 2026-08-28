import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readLinks, renderNav, extractNav } from './nav.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('readLinks lit le littéral LINKS du vrai nav.js', () => {
  const links = readLinks(path.join(ROOT, 'nav.js'));
  assert.ok(links.length >= 2, 'LINKS ne doit pas être vide');
  for (const entry of links) {
    assert.equal(entry.length, 3, `entrée mal formée : ${JSON.stringify(entry)}`);
  }
  assert.ok(
    links.some(([href]) => href.endsWith('.pdf')),
    'le guide PDF doit figurer dans LINKS'
  );
});

test('readLinks échoue bruyamment si le littéral est introuvable', () => {
  assert.throws(() => readLinks(path.join(ROOT, 'quiz.js')), /LINKS introuvable/);
});

test('renderNav marque la page courante et elle seule', () => {
  const links = [['index.html', 'Accueil', ''], ['a.html', 'A', '']];
  const html = renderNav(links, 'a.html');
  assert.match(html, /<a class="current" href="a\.html">A<\/a>/);
  assert.match(html, /<a href="index\.html">Accueil<\/a>/);
  assert.equal(html.match(/class="current"/g).length, 1);
});

test('renderNav ouvre les PDF dans un onglet, pas les pages', () => {
  const html = renderNav([['g.pdf', 'Guide', ''], ['a.html', 'A', '']], 'a.html');
  assert.match(html, /href="g\.pdf" target="_blank" rel="noopener"/);
  assert.doesNotMatch(html, /href="a\.html"[^>]*target/);
});

test("renderNav échappe comme esc() de nav.js : pas l'apostrophe", () => {
  const html = renderNav([['a.html', 'A', `Tom & "Jerry" <b> l'API`]], 'x.html');
  assert.match(html, /title="Tom &amp; &quot;Jerry&quot; &lt;b> l'API"/);
});

test('extractNav délimite le bloc et permet de le remplacer', () => {
  const html = `<body>\n<nav class="navbar">\n  <a href="a.html">A</a>\n</nav>\n<main>x</main>\n</body>`;
  const found = extractNav(html);
  assert.match(found.block, /^<nav class="navbar">/);
  assert.match(found.block, /<\/nav>$/);
  const replaced = html.slice(0, found.start) + '<nav class="navbar"></nav>' + html.slice(found.end);
  assert.equal(replaced, `<body>\n<nav class="navbar"></nav>\n<main>x</main>\n</body>`);
});

test('extractNav rend null quand la page n\'a pas de navbar', () => {
  assert.equal(extractNav('<body><main>x</main></body>'), null);
});
