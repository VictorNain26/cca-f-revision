#!/usr/bin/env node
/* Régénère les pages du site à partir du corpus Markdown de courses/.
 * Le défaut que ce runner attrape : avant lui, la fiche publiée
 * (D0_API_Fundamentals.html) et le cours Markdown équivalent pouvaient
 * diverger sans qu'aucun contrôle ne le voie — deux sources de vérité pour le
 * même contenu. Après ce runner, le HTML publié est un produit dérivé du
 * Markdown ; toute correction passe par courses/, jamais par le HTML.
 *
 * La liste des cours à rendre est PUBLISHED_COURSES (tools/lib/page.mjs), lue
 * aussi par tools/check-courses.mjs : une seule liste, donc pas de second
 * endroit à tenir d'accord avec elle.
 * Requiert Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PUBLISHED_COURSES, renderCoursePages } from './lib/page.mjs';
import { renderPracticePage } from './lib/practice.mjs';
import { readLinks, readTranslations } from './lib/nav.mjs';
import { loadJsonQuizzes } from './lib/quizzes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

const links = readLinks(path.join(ROOT, 'nav.js'));
const translations = readTranslations(path.join(ROOT, 'nav.js'));
const nav = { links, translations };

let written = 0;
for (const course of PUBLISHED_COURSES) {
  const enPath = path.join(ROOT, 'courses', 'en', course.file);
  const frPath = path.join(ROOT, 'courses', 'fr', course.file);
  const quizPath = path.join(ROOT, 'courses', 'quizzes', `${course.domain}.json`);

  const enMarkdown = fs.readFileSync(enPath, 'utf8');
  const frMarkdown = fs.readFileSync(frPath, 'utf8');
  const quizzes = fs.existsSync(quizPath) ? loadJsonQuizzes(course.domain) : [];

  const { frHtml, enHtml } = renderCoursePages({ enMarkdown, frMarkdown, quizzes, slug: course.slug, nav });

  fs.writeFileSync(path.join(ROOT, course.slug), frHtml);
  written++;

  const enDir = path.join(ROOT, 'en');
  fs.mkdirSync(enDir, { recursive: true });
  fs.writeFileSync(path.join(enDir, course.slug), enHtml);
  written++;

  console.log(`${course.domain} — ${course.slug} et en/${course.slug} régénérées (${quizzes.length} quiz)`);
}

/* Practice_Questions.html suit la même règle que les fiches : le HTML publié
 * est un produit dérivé, la correction passe par la source. Ses deux sources
 * sont la prose (courses/practice/page.md) et les questions
 * (courses/quizzes/PQ.json). */
const practice = renderPracticePage({
  markdown: fs.readFileSync(path.join(ROOT, 'courses', 'practice', 'page.md'), 'utf8'),
  quizzes: JSON.parse(fs.readFileSync(path.join(ROOT, 'courses', 'quizzes', 'PQ.json'), 'utf8')),
  nav,
});
if (practice.problems.length) {
  for (const p of practice.problems) console.error(`  - ${p}`);
  console.error('Practice_Questions.html non régénérée : corriger les problèmes ci-dessus.');
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, 'Practice_Questions.html'), practice.html);
written++;
console.log(`QCM — Practice_Questions.html régénérée (${JSON.parse(fs.readFileSync(path.join(ROOT, 'courses', 'quizzes', 'PQ.json'), 'utf8')).length} questions)`);

console.log(`\n${written} page(s) écrite(s).`);
