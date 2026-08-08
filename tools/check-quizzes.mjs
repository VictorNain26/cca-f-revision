#!/usr/bin/env node
/* Contrôle des auto-évaluations : on exécute quiz.js sur chaque page dans un
 * DOM, puis on vérifie ce que le lecteur voit avant d'avoir répondu.
 * Le défaut historique que ce contrôle attrape : quiz.js déplaçait l'énoncé
 * entier dans le bloc verrouillé, ne laissant que les réponses visibles.
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
  for (const quiz of quizzes) {
    const label = quiz.querySelector('summary')?.textContent.slice(0, 60) ?? '?';
    const holder = quiz.querySelector(':scope > div');
    const visible = holder ? [...holder.children].filter((el) => !el.classList.contains('answer-reveal')) : [];
    const report = (msg) => { console.log(`  ${msg} — ${page} :: ${label}`); bad++; };

    if (!/Situation|Scenario|Question/i.test(visible.map((el) => el.textContent).join(' '))) report('ÉNONCÉ MANQUANT');
    if (!quiz.querySelector('.choices li')) report('CHOIX MANQUANTS');
    if (!quiz.querySelector('.choices li[data-letter]')) report('LETTRES MANQUANTES');
    if (visible.some((el) => el.classList.contains('correct'))) report('RÉPONSE FUITÉE');
    if (!quiz.querySelector('.answer-reveal .correct')) report('AUCUNE BONNE RÉPONSE');
  }

  total += quizzes.length;
  problems += bad;
  console.log(`${page.padEnd(42)} ${String(quizzes.length).padStart(3)} quiz — ${bad} problème(s)`);
}

console.log(`\nAuto-évaluations : ${total} quiz, ${problems} problème(s)`);
process.exit(problems ? 1 : 0);
