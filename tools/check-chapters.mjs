#!/usr/bin/env node
/* Contrôle du contrat de section des fiches de domaine.
 * Une section portant un task statement doit garantir :
 *   - un exemple concret (bloc <pre>)
 *   - un réflexe d'examen (bloc .exam-tip)
 *   - des distracteurs nommés (bloc .anti-pattern, ou .exam-tip mentionnant un distracteur)
 * D0 ne porte aucune task : seule la garantie « exemple concret » s'y applique.
 * Sans dépendance : le corpus est du HTML statique régulier.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WEIGHTS = { D1: 27, D2: 18, D3: 20, D4: 20, D5: 15 };

const files = fs.readdirSync(ROOT).filter((f) => /^D[0-5]_.*\.html$/.test(f)).sort();
const failures = [];
const measures = [];

for (const file of files) {
  const code = file.slice(0, 2);
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  // Découpage en sections sur les en-têtes <h2 id="sN">
  const parts = html.split(/<div class="section-header[^"]*"><h2 id="s\d+"/).slice(1);
  let contentWords = 0;

  for (const part of parts) {
    const title = part.split('</h2>')[0].replace(/<[^>]+>/g, '').trim();
    const isTaskSection = /\(Task \d\.\d/.test(title);
    const isQuizSection = /auto-.?valuation|Questions d'auto/i.test(title);
    const isSynthesis = /Synth.se/i.test(title);

    const words = part.replace(/<(pre|script)[^>]*>[\s\S]*?<\/\1>/g, ' ')
                      .replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    if (!isQuizSection) contentWords += words;

    const hasExample = /<pre[\s>]/.test(part);
    const hasExamTip = /class="exam-tip"/.test(part);
    const hasDistractors = /class="anti-pattern"/.test(part) ||
                           /distracteur|anti-pattern|pi.ge/i.test(part);

    if (code === 'D0' && !isQuizSection && !hasExample) {
      failures.push(`${code} — « ${title} » : aucun exemple concret`);
    }
    if (isTaskSection) {
      if (!hasExample) failures.push(`${code} — « ${title} » : aucun exemple concret`);
      if (!hasExamTip) failures.push(`${code} — « ${title} » : aucun réflexe d'examen`);
      if (!hasDistractors) failures.push(`${code} — « ${title} » : aucun distracteur nommé`);
    }
    // Plafond des sections hors task : ne s'applique qu'aux fiches de domaine.
    // D0 est un prérequis — aucune de ses sections ne porte de task, et leur
    // longueur est légitime.
    if (code !== 'D0' && !isTaskSection && !isQuizSection && !isSynthesis && words > 250) {
      failures.push(`${code} — « ${title} » : ${words} mots hors task statement (plafond 250)`);
    }
  }

  // Cohérence sommaire / ancres
  const ids = [...html.matchAll(/<h2 id="(s\d+)"/g)].map((m) => m[1]);
  const toc = [...html.matchAll(/<li><a href="#(s\d+)"/g)].map((m) => m[1]);
  for (const t of toc) if (!ids.includes(t)) failures.push(`${code} — sommaire pointe #${t}, absent de la page`);
  for (const i of ids) if (!toc.includes(i)) failures.push(`${code} — section #${i} absente du sommaire`);

  const w = WEIGHTS[code];
  measures.push({ code, words: contentWords, perPoint: w ? Math.round(contentWords / w) : null });
}

console.log('Volume de contenu (hors auto-évaluations) :');
for (const m of measures) {
  console.log(`  ${m.code}  ${String(m.words).padStart(5)} mots` +
              (m.perPoint ? `  ${String(m.perPoint).padStart(4)} mots/point` : '   (prérequis)'));
}

if (failures.length === 0) {
  console.log('\nContrat de section : OK');
  process.exit(0);
}
console.log(`\nContrat de section : ${failures.length} violation(s)`);
for (const f of failures) console.log('  -', f);
process.exit(1);
