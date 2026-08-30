#!/usr/bin/env node
/* Exporte le corpus vers le modèle de contenu de l'Academy Growth Wave.
 *
 * Pourquoi cet exporteur existe : l'academy héberge déjà un parcours CCDF et
 * réserve un emplacement « Architect — Foundations (CCAF) » marqué à venir.
 * Son modèle est celui de ce corpus, à un renommage près — parcours, modules
 * tagués par domaine, leçons chronométrées, banque de questions tirée au poids
 * du blueprint, examen blanc au seuil 720/1000. Migrer n'est donc pas une
 * réécriture : c'est une projection, et c'est ce que ce script fait.
 *
 * Il ne publie rien et n'appelle aucune API. Il écrit dans migration/ des
 * fichiers neutres, documentés, que l'intégrateur de l'academy mappe sur le
 * schéma réel de sa base. Les correspondances incertaines sont signalées dans
 * migration/README.md plutôt que devinées ici.
 *
 * Requiert Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
/* --out permet à tools/check-academy-export.mjs de rendre dans une copie
 * isolée et de la comparer à ce qui est committé, sans jamais toucher au
 * dossier qu'il surveille — même discipline que check-courses.mjs. */
const outArg = process.argv.indexOf('--out');
const OUT = outArg !== -1 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'migration');
const quiet = process.argv.includes('--quiet');

/* Le blueprint CCAR-F : cinq domaines et leurs poids, tels que le guide les
 * fixe. C'est ce que l'academy appelle la pondération du blueprint, et ce qui
 * décide du tirage d'une session d'entraînement. */
const BLUEPRINT = [
  { code: 'D1', title: 'Agentic Architecture & Orchestration', weight: 27, taskStatements: 7 },
  { code: 'D2', title: 'Tool Design & MCP Integration', weight: 18, taskStatements: 5 },
  { code: 'D3', title: 'Claude Code Configuration & Workflows', weight: 20, taskStatements: 6 },
  { code: 'D4', title: 'Prompt Engineering & Structured Output', weight: 20, taskStatements: 6 },
  { code: 'D5', title: 'Context Management & Reliability', weight: 15, taskStatements: 6 },
];

/* Un cours du corpus devient un module de l'academy. D0 n'est pas un domaine
 * du blueprint : il porte les prérequis API que le guide suppose acquis, et
 * correspond à l'étape « Prise en main » du parcours CCDF plutôt qu'à un
 * module noté. Son poids est donc nul et ses leçons ne portent pas de tag de
 * domaine. */
const MODULES = [
  { id: 'M0', file: '00-api-foundations.md', domain: null, title: 'API Foundations', subtitle: 'Les prérequis que le guide suppose acquis', prerequisite: true },
  { id: 'M1', file: '01-orchestration.md', domain: 'D1', title: 'Agentic Architecture & Orchestration', subtitle: 'Le domaine le plus lourd de l’examen' },
  { id: 'M2', file: '02-tools-mcp.md', domain: 'D2', title: 'Tool Design & MCP Integration', subtitle: 'Ce que le modèle lit pour choisir un outil' },
  { id: 'M3', file: '03-claude-code-config.md', domain: 'D3', title: 'Claude Code Configuration & Workflows', subtitle: 'Les fichiers qui pilotent l’outil' },
  { id: 'M4', file: '04-prompt-engineering.md', domain: 'D4', title: 'Prompt Engineering & Structured Output', subtitle: 'Du critère explicite au schéma contraint' },
  { id: 'M5', file: '05-context-reliability.md', domain: 'D5', title: 'Context Management & Reliability', subtitle: 'Ce qui survit à une longue session' },
];

const WORDS_PER_MINUTE = 150;

const stripMeta = (md) => md.replace(/^[ \t]*<!--[\s\S]*?-->[ \t]*\n?/gm, '');

/* Découpe un cours en leçons sur ses titres de niveau 2, en gardant le
 * marqueur ts: quand la section en porte un : c'est le task statement du
 * guide, et c'est lui qui devient la sous-compétence côté academy. */
function lessons(markdown) {
  const src = markdown.split(/^## /m);
  return src.slice(1).map((raw, index) => {
    const [headingLine, ...rest] = raw.split('\n');
    const body = rest.join('\n');
    const ts = body.match(/<!--\s*ts:([0-5]\.\d)/)?.[1] ?? null;
    const content = stripMeta(body).trim();
    const words = content.split(/\s+/).filter(Boolean).length;
    return {
      order: index + 1,
      id: `S${String(index + 1).padStart(2, '0')}`,
      title: headingLine.trim(),
      taskStatement: ts,
      estimatedMinutes: Math.max(2, Math.round(words / WORDS_PER_MINUTE)),
      words,
      content,
    };
  });
}

/* Une question du corpus devient une question de l'academy. La forme observée
 * sur le parcours CCDF est un tableau d'options portant chacune son propre
 * commentaire, une seule marquée attendue — ce que ce corpus tient déjà sous
 * `answer`, `why` et `distractors`.
 *
 * `scenario` n'a pas d'équivalent visible côté academy : les questions du CCDF
 * y sont directes. Il est donc émis dans un champ `stem` distinct plutôt que
 * fondu dans l'intitulé, pour que l'intégrateur décide s'il le rend au-dessus
 * de la question ou le concatène. Le perdre serait perdre la moitié de
 * l'exercice : les questions du CCA-F sont des scénarios. */
function toAcademyQuestion(q) {
  const answers = new Set(q.answer.split(/\s+/).filter(Boolean));
  return {
    sourceId: q.id,
    domain: q.domain,
    subCompetency: q.task,
    alsoCovers: q.alsoTasks ?? undefined,
    multipleAnswers: answers.size > 1,
    stem: q.scenario,
    question: q.question,
    options: Object.entries(q.options).map(([letter, text]) => ({
      key: letter,
      text,
      expected: answers.has(letter),
      comment: answers.has(letter) ? q.why : q.distractors[letter],
    })),
  };
}

fs.mkdirSync(path.join(OUT, 'lessons'), { recursive: true });

// --- blueprint ------------------------------------------------------------
fs.writeFileSync(
  path.join(OUT, 'blueprint.json'),
  JSON.stringify({
    certification: { code: 'CCAR-F', title: 'Claude Certified Architect — Foundations', guideVersion: '1.0 (juillet 2026)' },
    exam: { items: 60, minutes: 120, passingScore: 720, scale: [100, 1000], scenarios: { total: 6, drawn: 4 } },
    domains: BLUEPRINT,
  }, null, 2) + '\n',
);

// --- modules et leçons ----------------------------------------------------
const manifest = [];
for (const m of MODULES) {
  const en = fs.readFileSync(path.join(ROOT, 'courses', 'en', m.file), 'utf8');
  const fr = fs.readFileSync(path.join(ROOT, 'courses', 'fr', m.file), 'utf8');
  const [le, lf] = [lessons(en), lessons(fr)];

  if (le.length !== lf.length) {
    console.error(`${m.id} — ${le.length} leçons en anglais contre ${lf.length} en français : le rendu po4a a dérivé, corriger avant d'exporter.`);
    process.exit(1);
  }

  for (const [i, lesson] of le.entries()) {
    for (const [lang, l] of [['en', lesson], ['fr', lf[i]]]) {
      const dir = path.join(OUT, 'lessons', m.id, lang);
      fs.mkdirSync(dir, { recursive: true });
      const front = [
        '---',
        `module: ${m.id}`,
        `lesson: ${l.id}`,
        `order: ${l.order}`,
        `lang: ${lang}`,
        `title: ${JSON.stringify(l.title)}`,
        m.domain ? `domain: ${m.domain}` : 'domain: null',
        `taskStatement: ${l.taskStatement ?? 'null'}`,
        `estimatedMinutes: ${l.estimatedMinutes}`,
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(dir, `${l.id}.md`), front + l.content + '\n');
    }
  }

  manifest.push({
    id: m.id,
    domain: m.domain,
    weight: m.domain ? BLUEPRINT.find((d) => d.code === m.domain).weight : 0,
    prerequisite: m.prerequisite ?? false,
    title: m.title,
    subtitle: m.subtitle,
    lessonCount: le.length,
    estimatedMinutes: le.reduce((s, l) => s + l.estimatedMinutes, 0),
    lessons: le.map((l, i) => ({
      id: l.id, order: l.order, taskStatement: l.taskStatement, estimatedMinutes: l.estimatedMinutes,
      title: { en: l.title, fr: lf[i].title },
      path: { en: `lessons/${m.id}/en/${l.id}.md`, fr: `lessons/${m.id}/fr/${l.id}.md` },
    })),
  });
}
fs.writeFileSync(path.join(OUT, 'modules.json'), JSON.stringify(manifest, null, 2) + '\n');

// --- banque de questions --------------------------------------------------
const bank = [];
for (const f of ['PQ', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5']) {
  const qs = JSON.parse(fs.readFileSync(path.join(ROOT, 'courses', 'quizzes', `${f}.json`), 'utf8'));
  for (const q of qs) bank.push({ ...toAcademyQuestion(q), pool: f === 'PQ' ? 'bank' : 'module-check' });
}
fs.writeFileSync(path.join(OUT, 'questions.json'), JSON.stringify(bank, null, 2) + '\n');

const byDomain = {};
for (const q of bank) byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;

if (!quiet) console.log(`migration/blueprint.json  — ${BLUEPRINT.length} domaines`);
if (!quiet) console.log(`migration/modules.json    — ${manifest.length} modules, ${manifest.reduce((s, m) => s + m.lessonCount, 0)} leçons`);
if (!quiet) console.log(`migration/lessons/        — ${manifest.reduce((s, m) => s + m.lessonCount, 0) * 2} fichiers (fr + en)`);
if (!quiet) console.log(`migration/questions.json  — ${bank.length} questions :`);
if (!quiet) for (const [d, n] of Object.entries(byDomain).sort()) console.log(`    ${d} : ${n}`);
