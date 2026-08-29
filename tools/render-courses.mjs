#!/usr/bin/env node
/* Régénère les pages du site à partir du corpus Markdown de courses/.
 * Le défaut que ce runner attrape : avant lui, la fiche publiée
 * (D0_API_Fundamentals.html) et le cours Markdown équivalent pouvaient
 * diverger sans qu'aucun contrôle ne le voie — deux sources de vérité pour le
 * même contenu. Après ce runner, le HTML publié est un produit dérivé du
 * Markdown ; toute correction passe par courses/, jamais par le HTML.
 *
 * Seuls les cours cochés dans courses/README.md sont régénérés : un cours non
 * livré n'a pas de fiche à publier. Seul D0 y est coché à ce jour.
 * Requiert Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PUBLISHED_COURSES, renderCoursePages } from './lib/page.mjs';
import { readLinks, readTranslations } from './lib/nav.mjs';
import { loadJsonQuizzes } from './lib/quizzes.mjs';
import { readDelivered } from './lib/courses.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

const links = readLinks(path.join(ROOT, 'nav.js'));
const translations = readTranslations(path.join(ROOT, 'nav.js'));
const nav = { links, translations };

const readmeText = fs.readFileSync(path.join(ROOT, 'courses', 'README.md'), 'utf8');
const { delivered, recognized } = readDelivered(readmeText);
if (!recognized) {
  console.error('courses/README.md — tableau de livraison introuvable, rien à régénérer.');
  process.exit(1);
}

let written = 0;
for (const course of PUBLISHED_COURSES) {
  const domainDigit = course.domain.replace(/^D/, '');
  if (!delivered.includes(domainDigit)) continue;

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

console.log(`\n${written} page(s) écrite(s).`);
