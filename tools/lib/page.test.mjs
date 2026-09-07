import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage, renderQuiz } from './page.mjs';

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

test('renderPage rend les cinq options et le pluriel « Answers » d\'une question à réponses multiples', () => {
  const multi = {
    ...quiz,
    id: 'd1-q7',
    options: { a: 'A) …', b: 'B) …', c: 'C) …', d: 'D) …', e: 'E) …' },
    answer: 'a b',
    distractors: { c: 'faux', d: 'faux', e: 'faux' },
  };
  const html = renderPage({ course, quizzes: [multi], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<p data-opt="e">E\) E\) …<\/p>/);
  assert.match(html, /<p class="correct" data-answer="a b">Answers: la bonne réponse<\/p>/);
  // Les deux bonnes réponses sortent du bloc des distracteurs, les trois autres y restent.
  assert.doesNotMatch(html, /<li data-opt="a">/);
  assert.doesNotMatch(html, /<li data-opt="b">/);
  assert.match(html, /<li data-opt="e">faux<\/li>/);
});

test('renderPage refuse un quiz dont la réponse ne désigne aucune option', () => {
  const badQuiz = { ...quiz, answer: 'z' };
  assert.throws(
    () => renderPage({ course, quizzes: [badQuiz], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav }),
    /hors contrat/,
  );
});

/* Rattachement des questions à leur section. La règle est prudente à dessein :
 * deux sections de D0 portent la même task 2.1, et deux questions la portent
 * aussi — placer sans arbitrer publierait les mêmes id deux fois, ce que
 * quiz.js compte et affiche. */
const sectioned = {
  title: 'D — un cours',
  lead: '',
  crossRefs: '',
  sections: [
    { id: 's1', heading: 'Une', task: '1.1', html: '<p>A.</p>' },
    { id: 's2', heading: 'Deux', task: '1.2', html: '<p>B.</p>' },
  ],
  toc: [{ id: 's1', heading: 'Une' }, { id: 's2', heading: 'Deux' }],
};
const q = (id, task) => ({ ...quiz, id, task, summary: `${id} — titre` });

test('renderPage place chaque question dans la section qui porte sa task', () => {
  const html = renderPage({ course: sectioned, quizzes: [q('x-q1', '1.2'), q('x-q2', '1.1')], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  const s1 = html.indexOf('id="s1"');
  const s2 = html.indexOf('id="s2"');
  assert.ok(s1 < html.indexOf('x-q2') && html.indexOf('x-q2') < s2, 'x-q2 doit être dans la section s1');
  assert.ok(s2 < html.indexOf('x-q1'), 'x-q1 doit être dans la section s2');
});

test('renderPage ne place pas une question dont la task désigne deux sections', () => {
  const ambigu = { ...sectioned, sections: [
    { id: 's1', heading: 'Une', task: '2.1', html: '<p>A.</p>' },
    { id: 's2', heading: 'Deux', task: '2.1', html: '<p>B.</p>' },
  ] };
  const html = renderPage({ course: ambigu, quizzes: [q('x-q1', '2.1')], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.equal(html.split('id="x-q1"').length - 1, 1, 'la question ne doit être rendue qu’une fois');
  assert.ok(html.indexOf('x-q1') > html.indexOf('id="s2"'), 'elle doit retomber dans le bloc terminal');
});

test('renderPage rend toutes les questions, placées ou non', () => {
  const html = renderPage({ course: sectioned, quizzes: [q('x-q1', '1.1'), q('x-q2', '9.9')], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /id="x-q1"/);
  assert.match(html, /id="x-q2"/);
});

test('renderPage réémet la ligne « À tester » en lien vers la banque filtrée', () => {
  const html = renderPage({ course: sectioned, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<p class="to-test"><a href="Practice_Questions\.html\?task=1\.1"/);
});

test('renderPage fait remonter le lien de banque d’un niveau sur la page anglaise', () => {
  const html = renderPage({ course: sectioned, quizzes: [], lang: 'en', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /href="\.\.\/Practice_Questions\.html\?task=1\.1"/);
});

test('renderPage rend les renvois inter-cours hors du bandeau, mais visibles', () => {
  const html = renderPage({ course: { ...sectioned, lead: '<p>Le cadrage.</p>', crossRefs: '<p>D1 renvoie ici.</p>' }, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  const bandeau = html.slice(html.indexOf('header-bar'), html.indexOf('</div>', html.indexOf('header-bar')));
  assert.match(bandeau, /Le cadrage\./);
  assert.doesNotMatch(bandeau, /D1 renvoie ici/);
  /* Ouvert : replié, le bloc enterrait 8 pointeurs « TS x.y » qui n'existent
     * nulle part ailleurs dans leur cours. Le défaut à corriger était l'aplat
     * saturé du bandeau, pas la présence du texte. */
  assert.match(html, /<details class="cross-refs" open>/);
});

test('renderPage pose un point d’ancrage de contenu et son lien d’évitement', () => {
  const html = renderPage({ course: sectioned, quizzes: [], lang: 'fr', slug: 'D0_API_Fundamentals.html', nav });
  assert.match(html, /<a class="skip-link" href="#content">/);
  assert.match(html, /<main id="content">/);
});

test('renderQuiz garde le numéro, dont quiz.js fait sa pastille', () => {
  const html = renderQuiz({ ...quiz, summary: 'Q25 (Customer Support) — Handing off' }, { stripScenario: true });
  assert.match(html, /<summary>Q25 Handing off<\/summary>/);
});

test('renderQuiz laisse intact un libellé sans parenthèse', () => {
  assert.match(renderQuiz({ ...quiz, summary: 'Q7 Un titre nu' }), /<summary>Q7 Un titre nu<\/summary>/);
});

test('renderQuiz retire la parenthèse quand elle répète le domaine de la page', () => {
  const html = renderQuiz({ ...quiz, domain: 'D5', summary: 'Q1 (D5) — Assay settings' });
  assert.match(html, /<summary>Q1 Assay settings<\/summary>/);
});

/* Les sept questions de D2 nomment un scénario que la page D2 n'affiche nulle
 * part : le retrait aveugle leur faisait perdre le cadre de l'énoncé. */
test('renderQuiz garde la parenthèse quand elle ne répète pas le domaine', () => {
  const html = renderQuiz({ ...quiz, domain: 'D2', summary: 'Q1 (Logistics) — Two descriptions alike' });
  assert.match(html, /<summary>Q1 \(Logistics\) — Two descriptions alike<\/summary>/);
});

test('renderQuiz retire le scénario quand la page le porte déjà en titre', () => {
  const html = renderQuiz({ ...quiz, domain: 'D1', summary: 'Q1 (Customer Support) — Deterministic tool ordering' }, { stripScenario: true });
  assert.match(html, /<summary>Q1 Deterministic tool ordering<\/summary>/);
});
