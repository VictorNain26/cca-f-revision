/* Extraction des quiz d'auto-évaluation depuis le HTML source vers des
 * données. Le défaut que ce module sert à attraper : les six quiz de
 * D0_API_Fundamentals.html sont aujourd'hui du HTML manuscrit, dupliqué en
 * silence si on veut un jour la même question dans la page anglaise — toute
 * dérive entre les deux copies passerait inaperçue. En lisant le <details>
 * source avec jsdom et en le rangeant dans un objet plat, ce module rend le
 * contenu comparable et injectable sans jamais le réécrire.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

const OPTION_LETTERS = ['a', 'b', 'c', 'd'];

/* Le préfixe « A) » est un artefact de présentation : il ouvre les options à
 * l'identique et n'appartient pas à leur contenu, ni au scénario ou à la
 * question qui n'en portent pas. Seul le HTML inline (<code>, <strong>) est
 * conservé — c'est le contenu déjà écrit, pas une reformulation. */
const normalizeHtml = (html) =>
  (html || '').replace(/^\s*[A-E]\)\s*/, '').replace(/\s+/g, ' ').trim();

/* Un <details> de quiz au format D0_API_Fundamentals.html : summary, un
 * <p><strong>Scenario:</strong>…</p>, un <p><strong>Question:</strong>…</p>,
 * quatre <p data-opt>, un <p class="correct" data-answer>, un
 * <p><strong>Why:</strong>…</p> et une <ul> de <li data-opt> pour les
 * distracteurs. */
export const parseQuiz = (details) => {
  const domain = details.dataset.domain || null;
  const task = details.dataset.task || null;
  const summary = (details.querySelector(':scope > summary')?.textContent || '').trim();

  const paragraphs = [...details.querySelectorAll(':scope > div > p')];
  const scenarioP = paragraphs.find((p) => /^\s*<strong>Scenario:<\/strong>/.test(p.innerHTML));
  const questionP = paragraphs.find((p) => /^\s*<strong>Question:<\/strong>/.test(p.innerHTML));
  const whyP = paragraphs.find((p) => /^\s*<strong>Why:<\/strong>/.test(p.innerHTML));

  const stripLabel = (p, label) =>
    p ? normalizeHtml(p.innerHTML.replace(new RegExp(`^\\s*<strong>${label}:<\\/strong>\\s*`), '')) : '';

  const optionEls = OPTION_LETTERS.map((letter) =>
    details.querySelector(`:scope > div > p[data-opt="${letter}"]`));
  const options = {};
  for (const [index, letter] of OPTION_LETTERS.entries()) {
    options[letter] = normalizeHtml(optionEls[index]?.innerHTML);
  }

  const correctP = details.querySelector(':scope > div > p.correct[data-answer]');
  const answer = correctP?.dataset.answer || null;
  const answerLabel = (correctP?.textContent || '').replace(/^Answer:\s*/, '').trim();

  const distractorLis = [...details.querySelectorAll(':scope > div ul li[data-opt]')];
  const distractors = {};
  for (const li of distractorLis) {
    distractors[li.dataset.opt] = normalizeHtml(li.innerHTML);
  }

  return {
    id: details.id || null,
    domain,
    task,
    summary,
    scenario: stripLabel(scenarioP, 'Scenario'),
    question: stripLabel(questionP, 'Question'),
    options,
    answer,
    answerLabel,
    why: stripLabel(whyP, 'Why'),
    distractors,
  };
};

export const parseQuizzesFromHtml = (html) => {
  const doc = new JSDOM(html).window.document;
  return [...doc.querySelectorAll('details[id^="d0-q"]')].map(parseQuiz);
};

export const loadHtmlQuizzes = (file = 'D0_API_Fundamentals.html') =>
  parseQuizzesFromHtml(fs.readFileSync(path.join(ROOT, file), 'utf8'));

export const loadJsonQuizzes = (domain = 'D0') =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'courses', 'quizzes', `${domain}.json`), 'utf8'));
