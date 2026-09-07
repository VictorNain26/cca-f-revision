#!/usr/bin/env node
/* Contrôle des auto-évaluations : on exécute quiz.js sur chaque page dans un
 * DOM, puis on vérifie ce que le lecteur voit avant d'avoir répondu.
 * Le défaut historique que ce contrôle attrape : quiz.js déplaçait l'énoncé
 * entier dans le bloc verrouillé, ne laissant que les réponses visibles.
 * Il garde aussi l'identité des questions : l'état du lecteur est stocké par
 * `id` (cca-quiz-state-v2) et la file « à revoir » de l'accueil fabrique ses
 * liens depuis cet id. Un id vide ou dupliqué rend l'entrée déjà stockée chez
 * un lecteur inatteignable, et check-links.mjs ne peut pas le voir : il ne
 * vérifie que les ancres écrites dans le dépôt, pas celles construites en JS.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const quizJs = fs.readFileSync(path.join(ROOT, 'quiz.js'), 'utf8');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();

let total = 0;
let problems = 0;

for (const page of pages) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), 'utf8'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.ResizeObserver = class { observe() {} };
  window.eval(quizJs);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const quizzes = [...window.document.querySelectorAll('details[data-quiz-processed="1"]')];
  if (!quizzes.length) continue;

  let bad = 0;
  const seen = new Set();
  for (const quiz of quizzes) {
    const label = quiz.querySelector('summary')?.textContent.slice(0, 60) ?? '?';
    const holder = quiz.querySelector(':scope > div');
    const visible = holder ? [...holder.children].filter((el) => !el.classList.contains('answer-reveal')) : [];
    const report = (msg) => { console.log(`  ${msg} — ${page} :: ${label}`); bad++; };

    if (!quiz.id) report('ID MANQUANT');
    else if (seen.has(quiz.id)) report(`ID DUPLIQUÉ (${quiz.id})`);
    else seen.add(quiz.id);

    if (!/Situation|Scenario|Question/i.test(visible.map((el) => el.textContent).join(' '))) report('ÉNONCÉ MANQUANT');
    if (!quiz.querySelector('.choices li')) report('CHOIX MANQUANTS');
    if (!quiz.querySelector('.choices li[data-letter]')) report('LETTRES MANQUANTES');
    if (visible.some((el) => el.classList.contains('correct'))) report('RÉPONSE FUITÉE');
    if (!quiz.querySelector('.answer-reveal .correct')) report('AUCUNE BONNE RÉPONSE');

    // Contrat de question : l'identité de l'option est son data-opt et sa
    // lettre vient de sa position. Le corrigé et chaque explication doivent
    // porter la lettre courante, sinon un réordonnancement ultérieur les
    // ferait désigner la mauvaise option.
    const lis = [...quiz.querySelectorAll('.choices li')];
    const letters = lis.map((li) => li.dataset.letter).join('');
    if (letters !== 'ABCDE'.slice(0, lis.length)) report(`LETTRES NON POSITIONNELLES (${letters})`);
    if (lis.some((li) => !li.dataset.opt)) report('DATA-OPT PERDU AU RENDU');
    const correct = quiz.querySelector('.answer-reveal .correct');
    if (correct && !/\b[A-E]\)/.test(correct.textContent || '')) report('CORRIGÉ SANS LETTRE');
    for (const li of quiz.querySelectorAll('.answer-reveal li[data-opt]')) {
      if (!/^\s*[A-E]\)/.test(li.textContent || '')) report(`EXPLICATION SANS LETTRE (${li.dataset.opt})`);
    }
  }

  total += quizzes.length;
  problems += bad;
  console.log(`${page.padEnd(42)} ${String(quizzes.length).padStart(3)} quiz — ${bad} problème(s)`);
}

console.log(`\nAuto-évaluations : ${total} quiz, ${problems} problème(s)`);
process.exit(problems ? 1 : 0);
