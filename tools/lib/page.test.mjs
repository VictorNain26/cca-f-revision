import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from './page.mjs';

const links = [
  ['index.html', 'Accueil', ''],
  ['D0_API_Fundamentals.html', 'D0', "D0 — Fondamentaux de l'API"],
  ['D1_Architecture_Orchestration_27pct.html', 'D1', 'D1 — Architecture et orchestration (27 %)'],
];
const translations = { 'D0_API_Fundamentals.html': 'en/D0_API_Fundamentals.html' };
const nav = { links, translations };

const course = {
  title: 'D0 — API foundations',
  lead: '',
  sections: [
    { id: 's1', heading: 'Première', html: '<p>A.</p>' },
    { id: 's2', heading: 'Deuxième', html: '<p>B.</p>' },
  ],
  toc: [
    { id: 's1', heading: 'Première' },
    { id: 's2', heading: 'Deuxième' },
  ],
};

const quiz = {
  id: 'd0-q1',
  domain: 'D0',
  task: '1.1',
  summary: 'Q1 (D0) — un titre',
  scenario: 'Un scénario.',
  question: 'Une question ?',
  options: { a: 'A) …', b: 'B) …', c: 'C) …', d: 'D) …' },
  answer: 'b',
  answerLabel: 'la bonne réponse',
  why: "Parce que.",
  distractors: { a: 'faux', c: 'faux', d: 'faux' },
};

test('renderPage pose lang="fr" pour la version française', () => {
  const html = renderPage({ course, quizzes: [quiz], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<html lang="fr">/);
});

test('renderPage pose lang="en" pour la version anglaise', () => {
  const html = renderPage({ course, quizzes: [quiz], lang: 'en', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<html lang="en">/);
});

test('renderPage tire le <title> du titre du cours', () => {
  const html = renderPage({ course, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<title>D0 — API foundations<\/title>/);
});

test('renderPage charge les six scripts dans le bon ordre', () => {
  const html = renderPage({ course, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  const order = [...html.matchAll(/<script[^>]*>/g)].map((m) => m[0]);
  assert.equal(order.length, 6);
  assert.match(order[0], /nav\.js/);
  assert.match(order[1], /quiz\.js/);
  assert.doesNotMatch(order[2], /src=/); // le script inline du thème
  assert.match(order[3], /theme\.js/);
  assert.match(order[4], /toc\.js/);
  assert.match(order[5], /site\.js/);
});

test('renderPage liste toutes les sections dans la TOC, ancres présentes dans le corps', () => {
  const html = renderPage({ course, quizzes: [quiz], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<li><a href="#s1">Première<\/a><\/li>/);
  assert.match(html, /<li><a href="#s2">Deuxième<\/a><\/li>/);
  assert.match(html, /<li><a href="#s3">Questions d'auto-évaluation<\/a><\/li>/);
  assert.match(html, /<h2 id="s1">1\. Première<\/h2>/);
  assert.match(html, /<h2 id="s2">2\. Deuxième<\/h2>/);
  assert.match(html, /<h2 id="s3"[^>]*>3\. Questions d'auto-évaluation<\/h2>/);
});

test('renderPage produit un <details> par quiz, avec id, data-domain et data-task', () => {
  const html = renderPage({ course, quizzes: [quiz], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<details id="d0-q1" data-domain="D0" data-task="1\.1">/);
});

test('renderPage pointe le sélecteur de langue vers la page jumelle', () => {
  const fr = renderPage({ course, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(fr, /<div class="lang-switch">\s*<a href="en\/D0_API_Fundamentals\.html">EN<\/a>/);

  const en = renderPage({ course, quizzes: [], lang: 'en', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(en, /<div class="lang-switch">\s*<a href="\.\.\/D0_API_Fundamentals\.html">FR<\/a>/);
});

test('renderPage ne pose pas de sélecteur de langue sans jumeau déclaré', () => {
  const html = renderPage({ course, quizzes: [], lang: 'fr', slug: 'D1_Architecture_Orchestration_27pct.html', nav });
  assert.doesNotMatch(html, /lang-switch/);
});

test('renderPage remonte les chemins d\'assets d\'un niveau pour la version anglaise', () => {
  const html = renderPage({ course, quizzes: [], lang: 'en', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /href="\.\.\/styles\.css"/);
  assert.match(html, /src="\.\.\/nav\.js"/);
  assert.match(html, /src="\.\.\/quiz\.js"/);
  assert.match(html, /src="\.\.\/theme\.js"/);
  assert.match(html, /src="\.\.\/toc\.js"/);
  assert.match(html, /src="\.\.\/site\.js"/);
});

test('renderPage garde les chemins d\'assets à la racine pour la version française', () => {
  const html = renderPage({ course, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="nav\.js"/);
  assert.doesNotMatch(html, /\.\.\/styles\.css/);
});

test('renderPage place le lead du cours sous le titre, dans le header-bar', () => {
  const withLead = { ...course, lead: '<p>Intro.</p>' };
  const html = renderPage({ course: withLead, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<h1>D0 — API foundations<\/h1>\n<p>Intro\.<\/p>\n<\/div>/);
});

test('renderPage n\'ajoute rien sous le titre quand le cours n\'a pas de lead', () => {
  const html = renderPage({ course, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<h1>D0 — API foundations<\/h1>\n<\/div>/);
});

test('renderPage refuse un quiz dont la réponse ne désigne aucune option', () => {
  const badQuiz = { ...quiz, answer: 'z' };
  assert.throws(
    () => renderPage({ course, quizzes: [badQuiz], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav }),
    /hors contrat/,
  );
});
