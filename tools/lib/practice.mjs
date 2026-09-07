/* Rendu de Practice_Questions.html à partir de ses deux sources.
 *
 * Le défaut que ce module corrige : la page portait 112 questions en HTML
 * écrit à la main — 232 Ko, le plus gros fichier du dépôt — alors que les 45
 * questions des fiches de domaine vivaient déjà en JSON et se rendaient par
 * renderQuiz(). Corriger une option demandait donc d'éditer du balisage, avec
 * le risque d'un data-opt oublié qu'aucune relecture ne voit.
 *
 * Deux sources, chacune dans son registre :
 *   - courses/practice/page.md   : la prose française (méthode, distracteurs,
 *     libellés de couverture), en Markdown comme les cours
 *   - courses/quizzes/PQ.json    : les 112 questions, au schéma des quiz de
 *     domaine, rendues par le renderQuiz() de page.mjs — un seul rendu de
 *     question dans tout le dépôt
 *
 * Le Markdown place les questions par des marqueurs <!-- questions:13-28 -->
 * plutôt que de les contenir : la prose dit où, le JSON dit quoi.
 */
import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import { renderNav } from './nav.mjs';
import { renderQuiz } from './page.mjs';
import { checkQuizContract } from './quiz-contract.mjs';

const md = new MarkdownIt({ html: true, typographer: false });
for (const name of ['exam-tip', 'key-concept', 'anti-pattern']) md.use(container, name);

const TITLE = /^<!--\s*title:(.+?)\s*-->$/m;
const SECTION_ID = /^<!--\s*id:([a-z0-9-]+)\s*-->$/m;
const PLACEHOLDER = /^<!--\s*(questions:(\d+)-(\d+)|coverage-table)\s*-->[ \t]*$/gm;
const ANY_MARKER = /^<!--\s*(?:title|id):[^>]*-->[ \t]*\n?/gm;

/* Un marqueur mal orthographié (« question:13-28 », « id: methode ») ne
 * ressemble à rien pour le renderer : la section perdrait ses questions ou son
 * ancre en silence. La forme tolérante les rattrape pour les nommer, comme
 * courses.mjs le fait pour les marqueurs owns. */
const LOOSE_MARKER = /^<!--\s*(?:titles?|ids?|questions?|coverage[a-z-]*)\s*[:.]?[^>]*-->[ \t]*$/gim;

const isKnownMarker = (line) =>
  TITLE.test(line) || SECTION_ID.test(line) || new RegExp(PLACEHOLDER.source, 'm').test(line);

/* La table de couverture est calculée, jamais recopiée. Elle l'était : cinq
 * des trente lignes avaient dérivé des data-task réels au moment de la
 * migration — non par erreur, mais parce qu'une question peut couvrir deux
 * task statements et que le seul data-task ne peut pas le dire. D'où
 * alsoTasks, qui porte cette couverture secondaire dans le JSON. */
export function coverageRows(quizzes) {
  const byTask = new Map();
  for (const q of quizzes) {
    const num = Number(q.id.replace(/^pq-q/, ''));
    for (const task of [q.task, ...(q.alsoTasks || [])]) {
      if (!byTask.has(task)) byTask.set(task, []);
      byTask.get(task).push(num);
    }
  }
  for (const list of byTask.values()) list.sort((a, b) => a - b);
  return byTask;
}

/* La table du Markdown ne porte que Task et Sujet — l'éditorial. La colonne
 * Questions est ajoutée ici depuis le JSON, si bien qu'ajouter une question
 * met la table à jour sans que personne y touche. */
function renderCoverageTable(labelTable, quizzes) {
  const rows = coverageRows(quizzes);
  const problems = [];

  const lines = labelTable.trim().split('\n');
  const out = ['| Task | Sujet | Questions |', '|---|---|---|'];
  for (const line of lines.slice(2)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const task = (cells[0] || '').replace(/\*\*/g, '');
    if (!/^\d\.\d$/.test(task)) {
      problems.push(`courses/practice/page.md — ligne de couverture « ${line.trim().slice(0, 60)} » : task illisible`);
      continue;
    }
    const questions = rows.get(task);
    if (!questions) {
      problems.push(`courses/practice/page.md — task ${task} listé dans la table de couverture mais aucune question ne le porte`);
    }
    out.push(`| **${task}** | ${cells[1]} | ${(questions || []).map((n) => `Q${n}`).join(', ') || '—'} |`);
  }

  for (const task of [...rows.keys()].sort()) {
    if (!lines.some((l) => l.includes(`**${task}**`))) {
      problems.push(`courses/practice/page.md — des questions portent la task ${task}, absente de la table de couverture`);
    }
  }

  return { html: md.render(out.join('\n')).trim(), problems };
}

/* Découpe le corps d'une section sur ses marqueurs de placement : la prose
 * entre deux marqueurs est rendue par markdown-it, chaque marqueur devient le
 * bloc qu'il désigne. Rendre le corps d'un seul tenant puis substituer ne
 * marcherait pas — markdown-it enveloppe un commentaire isolé dans son propre
 * bloc HTML, et les <details> se retrouveraient imbriqués dedans. */
function renderBody(body, quizzes, byNumber) {
  const problems = [];
  const parts = [];
  let last = 0;

  for (const m of body.matchAll(PLACEHOLDER)) {
    const prose = body.slice(last, m.index);
    if (prose.trim()) parts.push(md.render(prose).trim());
    last = m.index + m[0].length;

    if (m[1] === 'coverage-table') {
      /* La table des libellés suit immédiatement le marqueur : c'est le reste
       * de la section, il n'y a rien après elle. */
      const table = body.slice(last);
      const { html, problems: p } = renderCoverageTable(table, quizzes);
      parts.push(html);
      problems.push(...p);
      last = body.length;
      continue;
    }

    const [from, to] = [Number(m[2]), Number(m[3])];
    const block = [];
    for (let n = from; n <= to; n++) {
      const q = byNumber.get(n);
      if (!q) {
        problems.push(`courses/practice/page.md — <!-- questions:${from}-${to} --> réclame Q${n}, absente de courses/quizzes/PQ.json`);
        continue;
      }
      block.push(renderQuiz(q, { stripScenario: true }));
    }
    parts.push(block.join('\n\n'));
  }

  const tail = body.slice(last);
  if (tail.trim()) parts.push(md.render(tail).trim());
  return { html: parts.filter(Boolean).join('\n\n'), problems };
}

export function renderPracticePage({ markdown, quizzes, nav }) {
  /* Même garde que renderPage : un quiz hors contrat écrirait « undefined »
   * dans la page publiée sans que rien le signale. */
  const contractProblems = checkQuizContract(quizzes);
  if (contractProblems.length) {
    throw new Error(`renderPracticePage refuse de publier des quiz hors contrat :\n${contractProblems.join('\n')}`);
  }

  const problems = [];
  for (const line of markdown.split('\n')) {
    if (LOOSE_MARKER.test(line) && !isKnownMarker(line)) {
      problems.push(`courses/practice/page.md — marqueur non reconnu « ${line.trim()} » : attendu <!-- id:slug -->, <!-- questions:n-m --> ou <!-- coverage-table -->`);
    }
    LOOSE_MARKER.lastIndex = 0;
  }

  const pageTitle = markdown.match(TITLE)?.[1];
  if (!pageTitle) problems.push('courses/practice/page.md — <!-- title:… --> absent : le titre de l’onglet ne peut pas être deviné');

  const byNumber = new Map(quizzes.map((q) => [Number(q.id.replace(/^pq-q/, '')), q]));

  const [head, ...rawSections] = markdown.replace(TITLE, '').split(/^## /m);

  const h1 = head.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '';

  /* Le chapeau vit dans la header-bar avec le titre, ce qui le suit (l'encadré
   * « pourquoi cette page est en anglais ») vit entre la header-bar et la
   * table des matières. La frontière est le premier bloc :::, pas un compte de
   * paragraphes — un chapeau de deux phrases ne doit pas déplacer l'encadré. */
  const headBody = head.replace(/^#\s+.+$/m, '');
  const fence = headBody.search(/^:::/m);
  const lead = renderBody(fence === -1 ? headBody : headBody.slice(0, fence), quizzes, byNumber);
  const intro = renderBody(fence === -1 ? '' : headBody.slice(fence), quizzes, byNumber);
  problems.push(...lead.problems, ...intro.problems);

  const sections = rawSections.map((raw) => {
    const [headingLine, ...rest] = raw.split('\n');
    const bodyRaw = rest.join('\n');
    const id = bodyRaw.match(SECTION_ID)?.[1];
    if (!id) problems.push(`courses/practice/page.md — section « ${headingLine.trim()} » sans <!-- id:slug --> : son ancre serait instable`);
    const body = renderBody(bodyRaw.replace(ANY_MARKER, ''), quizzes, byNumber);
    problems.push(...body.problems);
    return { id: id ?? '', heading: md.renderInline(headingLine.trim()), html: body.html };
  });

  const tocItems = sections.map((s) => `<li><a href="#${s.id}">${s.heading}</a></li>`).join('\n');
  const sectionsHtml = sections
    .map((s, i) => `<div class="section-header"><h2 id="${s.id}">${i + 1}. ${s.heading}</h2></div>\n\n${s.html}`)
    .join('\n\n');

  const links = nav.links;
  const slug = 'Practice_Questions.html';
  const idx = links.findIndex(([href]) => href === slug);
  const docNavLink = (item, cls, label) => {
    if (!item || item[0].endsWith('.pdf')) return '';
    const [href, linkLabel, title] = item;
    const displayTitle = (title || '').replace(/\s*\(\d+\s*%\)\s*$/, '').trim() || linkLabel;
    return `  <a class="${cls}" href="${href}"><span class="label">${label}</span><span class="title">${displayTitle}</span></a>`;
  };
  const docNavHtml = [
    docNavLink(links[idx - 1], 'prev', 'Précédent'),
    docNavLink(links[idx + 1], 'next', 'Suivant'),
  ].filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle ?? h1}</title>
<link rel="stylesheet" href="styles.css">
<script src="nav.js" defer></script>
<script src="quiz.js" defer></script>
<script>(function(){try{var t=localStorage.getItem('cca-theme');if(!t)t=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
<script src="theme.js" defer></script>
<script src="toc.js" defer></script>
<script src="site.js" defer></script>
<script src="practice.js" defer></script>
</head>
<body id="top">

<a class="skip-link" href="#content">Aller au contenu</a>

${renderNav(links, slug)}

<main id="content">

<div class="header-bar">
<h1>${h1}</h1>
${lead.html}
</div>

${intro.html}

<div class="toc">
<strong>Table des matières</strong>
<ol>
${tocItems}
</ol>
</div>

${sectionsHtml}

</main>

<nav class="doc-nav">
${docNavHtml}
</nav>

<hr>
<p style="text-align:center;color:#888;font-size:9pt;">
CCA Révision — Practice Questions · ${quizzes.length} items · Source : guide officiel CCAR-F v1.0 · 2026
</p>


<a href="#top" class="back-to-top" aria-label="Retour en haut" id="back-to-top">↑</a>

</body>
</html>
`;

  return { html, problems };
}
