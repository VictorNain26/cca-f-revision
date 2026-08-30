#!/usr/bin/env node
/* Contrôle de l'export vers l'academy.
 *
 * Le défaut que ce contrôle attrape : migration/ est committé pour que le
 * dossier se transmette tel quel à un intégrateur, sans qu'il ait à installer
 * Node ni à lancer un script. Committer un produit dérivé rouvre exactement le
 * défaut que le reste du dépôt a fermé — une copie qui vieillit en silence
 * pendant que sa source bouge. Ce contrôle refuse cet écart.
 *
 * Il vérifie aussi la substance de l'export, parce qu'un fichier bien formé
 * mais vide se transmettrait tout aussi bien : chaque question doit désigner
 * autant d'options attendues que son drapeau l'annonce, chaque option doit
 * porter son commentaire, chaque leçon doit avoir un corps et aucune
 * métadonnée de traçabilité ne doit avoir survécu au découpage.
 *
 * Le rendu de comparaison se fait dans un répertoire temporaire : ce contrôle
 * ne modifie jamais migration/.
 * Requiert Node >= 20.11.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'migration');
const problems = [];

const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { recursive: true })
        .map((f) => path.join(dir, f))
        .filter((f) => fs.statSync(f).isFile())
    : [];

/* Fraîcheur : régénérer à côté, comparer fichier à fichier. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-export-'));
try {
  execFileSync('node', [path.join(ROOT, 'tools', 'export-academy.mjs'), '--out', tmp, '--quiet'], { stdio: 'pipe' });

  const rel = (base) => (f) => path.relative(base, f);
  const committed = new Set(walk(OUT).map(rel(OUT)).filter((f) => f !== 'README.md'));
  const rendered = new Set(walk(tmp).map(rel(tmp)));

  for (const f of rendered) {
    if (!committed.has(f)) {
      problems.push(`migration/${f} — produit par l'export mais absent du dépôt : lancer npm run export:academy et committer`);
    } else if (fs.readFileSync(path.join(OUT, f), 'utf8') !== fs.readFileSync(path.join(tmp, f), 'utf8')) {
      problems.push(`migration/${f} — diverge de son export : éditer courses/, pas migration/`);
    }
  }
  for (const f of committed) {
    if (!rendered.has(f)) problems.push(`migration/${f} — présent dans le dépôt mais plus produit par l'export : le retirer`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* Substance : ce qu'un intégrateur recevrait. */
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));

if (fs.existsSync(path.join(OUT, 'questions.json'))) {
  const qs = readJson('questions.json');
  for (const q of qs) {
    const expected = q.options.filter((o) => o.expected).length;
    if (expected === 0) problems.push(`${q.sourceId} — aucune option attendue : la question serait incorrigeable`);
    if (q.multipleAnswers ? expected < 2 : expected !== 1) {
      problems.push(`${q.sourceId} — ${expected} option(s) attendue(s) pour multipleAnswers=${q.multipleAnswers}`);
    }
    if (!q.domain || !q.subCompetency) problems.push(`${q.sourceId} — domaine ou sous-compétence absent : le tirage pondéré ne saurait pas où la ranger`);
    for (const o of q.options) {
      if (!o.text) problems.push(`${q.sourceId}/${o.key} — option sans texte`);
      if (!o.comment) problems.push(`${q.sourceId}/${o.key} — option sans commentaire : c'est ce que l'academy affiche sous chaque choix`);
    }
  }
}

if (fs.existsSync(path.join(OUT, 'blueprint.json'))) {
  const total = readJson('blueprint.json').domains.reduce((s, d) => s + d.weight, 0);
  if (total !== 100) problems.push(`blueprint.json — les poids totalisent ${total} % et non 100 : le tirage pondéré serait faux`);
}

if (fs.existsSync(path.join(OUT, 'modules.json'))) {
  for (const m of readJson('modules.json')) {
    for (const l of m.lessons) {
      for (const lang of ['en', 'fr']) {
        const p = path.join(OUT, l.path[lang]);
        if (!fs.existsSync(p)) { problems.push(`${l.path[lang]} — déclarée par modules.json, absente du disque`); continue; }
        const body = fs.readFileSync(p, 'utf8').split('---').slice(2).join('---').trim();
        if (body.split(/\s+/).filter(Boolean).length < 40) problems.push(`${l.path[lang]} — corps quasi vide`);
        if (body.includes('<!--')) problems.push(`${l.path[lang]} — commentaire de traçabilité non retiré, il partirait chez l'intégrateur`);
      }
    }
  }
}

/* Le manifeste est le point d'entrée d'un intégrateur automatique : ses
 * compteurs sont ce contre quoi il revérifiera son import. Faux, ils
 * valideraient une perte. Ils sont donc recalculés ici depuis les fichiers
 * livrés, sans faire confiance à ce que l'export a écrit. */
if (fs.existsSync(path.join(OUT, 'manifest.json'))) {
  const man = readJson('manifest.json');
  const qs = readJson('questions.json');
  const mods = readJson('modules.json');
  const real = {
    questions: qs.length,
    multipleAnswerQuestions: qs.filter((q) => q.multipleAnswers).length,
    modules: mods.length,
    lessons: mods.reduce((s, m) => s + m.lessonCount, 0),
    lessonFiles: walk(path.join(OUT, 'lessons')).length,
    domainWeightTotal: readJson('blueprint.json').domains.reduce((s, d) => s + d.weight, 0),
  };
  const claimed = {
    questions: man.invariants.questions,
    multipleAnswerQuestions: man.invariants.multipleAnswerQuestions.count,
    modules: man.invariants.modules,
    lessons: man.invariants.lessons,
    lessonFiles: man.invariants.lessonFiles,
    domainWeightTotal: man.invariants.domainWeightTotal,
  };
  for (const [k, v] of Object.entries(claimed)) {
    if (v !== real[k]) problems.push(`manifest.json — invariant « ${k} » annonce ${v}, le dossier en porte ${real[k]} : un intégrateur validerait une perte`);
  }
  for (const f of Object.keys(man.files)) {
    const target = f.endsWith('/') ? path.join(OUT, f) : path.join(OUT, f);
    if (!fs.existsSync(target)) problems.push(`manifest.json — annonce « ${f} », absent du dossier`);
  }
} else {
  problems.push('migration/manifest.json — absent : un intégrateur automatique n’a pas de point d’entrée');
}

/* Autonomie : migration/ se transmet seul, sans le dépôt qui l'a produit. Une
 * leçon qui cite un fichier de ce dépôt — `courses/out-of-scope.md`,
 * Practice_Questions.html — enverrait le lecteur de l'academy vers un chemin
 * qui n'existe pas chez lui. Le cas s'est produit sur une leçon de M4.
 * L'exception est le contenu enseigné : D3 montre des chemins d'@import dans
 * un exemple de CLAUDE.md, ils sont le sujet et non une référence. */
const REPO_PATHS = /`?(?:courses\/(?:en|fr|po|quizzes)\/|courses\/(?:README|out-of-scope)\.md|tools\/|(?:Practice_Questions|Exam_Strategy|Scenarios_Exam|index)\.html)/;
for (const f of walk(path.join(OUT, 'lessons'))) {
  const text = fs.readFileSync(f, 'utf8');
  for (const [i, line] of text.split('\n').entries()) {
    if (line.trimStart().startsWith('@')) continue;   // exemple d'@import enseigné en M3
    const m = line.match(REPO_PATHS);
    if (m) problems.push(`${path.relative(ROOT, f)}:${i + 1} — cite « ${m[0].replace(/`/g, '')} », un chemin de ce dépôt : reformuler dans courses/ pour que la leçon se tienne seule`);
  }
}

for (const p of problems) console.log('  -', p);
console.log(`Export academy : ${problems.length} problème(s).`);
process.exit(problems.length ? 1 : 0);
