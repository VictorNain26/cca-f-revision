/* Assemblage de la page complète du site à partir d'un cours rendu.
 * Le défaut que ce module sert à attraper : tools/lib/render.mjs ne produit
 * que des fragments de section (voir sa note d'en-tête) — sans un point unique
 * qui pose le chrome (doctype, head, navbar, TOC, numérotation « N. », quiz,
 * doc-nav), chaque page finirait par réimplémenter le gabarit à la main,
 * exactement le défaut que le lot corrige. renderPage() est ce point unique,
 * pour les deux langues : elle ne fait varier que lang, le titre, les chemins
 * d'assets (racine vs en/) et le contenu — jamais la structure.
 *
 * La navbar elle-même reste la responsabilité de tools/lib/nav.mjs (source
 * unique déjà éprouvée par check-nav.mjs) : ce module la réutilise plutôt que
 * de la dupliquer, y compris pour la version anglaise (chemins préfixés
 * « ../ ») et le sélecteur de langue.
 */
import { renderNav } from './nav.mjs';
import { renderCourse } from './render.mjs';
import { answerLetters, checkQuizContract } from './quiz-contract.mjs';

/* Un cours publié = son fichier Markdown (même nom en courses/en/ et
 * courses/fr/), son code de domaine et le nom de fichier HTML sous lequel le
 * site le sert déjà. Table unique, lue à la fois par tools/render-courses.mjs
 * (qui écrit les pages) et tools/check-courses.mjs (qui vérifie qu'elles n'ont
 * pas divergé de leur rendu) — pour que les deux ne puissent pas dériver l'un
 * de l'autre sur la liste des cours publiés. Grandit au fil des domaines
 * livrés ; ne prétend pas deviner les noms des cours pas encore écrits. */
export const PUBLISHED_COURSES = [
  { file: '00-api-foundations.md', domain: 'D0', slug: 'D0_API_Fundamentals.html' },
  { file: '01-orchestration.md', domain: 'D1', slug: 'D1_Architecture_Orchestration_27pct.html' },
  { file: '02-tools-mcp.md', domain: 'D2', slug: 'D2_Tool_Design_MCP_18pct.html' },
  { file: '03-claude-code-config.md', domain: 'D3', slug: 'D3_Claude_Code_Config_20pct.html' },
  { file: '04-prompt-engineering.md', domain: 'D4', slug: 'D4_Prompt_Engineering_20pct.html' },
  { file: '05-context-reliability.md', domain: 'D5', slug: 'D5_Context_Fiabilite_15pct.html' },
];

/* Compose les deux pages HTML (fr, en) d'un cours publié à partir de ses deux
 * sources Markdown déjà lues — sans jamais toucher au disque : c'est ce qui
 * permet à check-courses.mjs de réutiliser cette même fonction pour comparer
 * un rendu en mémoire aux pages committées, sans écrire nulle part. */
export function renderCoursePages({ enMarkdown, frMarkdown, quizzes, slug, nav }) {
  return {
    frHtml: renderPage({ course: renderCourse(frMarkdown), quizzes, lang: 'fr', slug, nav }),
    enHtml: renderPage({ course: renderCourse(enMarkdown), quizzes, lang: 'en', slug, nav }),
  };
}

const STRINGS = {
  fr: {
    toc: 'Table des matières',
    quizHeading: "Questions d'auto-évaluation",
    sectionQuiz: 'Teste-toi sur cette section',
    toTest: (task) => `Toutes les questions de la banque sur ${task}`,
    crossRefs: 'Ce que ce cours possède, ce qu’il renvoie ailleurs',
    skip: 'Aller au contenu',
    backToTop: 'Retour en haut',
    prevLabel: 'Précédent',
    nextLabel: 'Suivant',
    footer: (title) => `CCA Révision — ${title} · 2026`,
  },
  en: {
    toc: 'Table of contents',
    quizHeading: 'Self-assessment questions',
    sectionQuiz: 'Test yourself on this section',
    toTest: (task) => `All bank questions on ${task}`,
    crossRefs: 'What this course owns, what it defers elsewhere',
    skip: 'Skip to content',
    backToTop: 'Back to top',
    prevLabel: 'Previous',
    nextLabel: 'Next',
    footer: (title) => `CCA Revision — ${title} · 2026`,
  },
};

/* Une question descend dans sa section quand — et seulement quand — une seule
 * section porte sa task. D0 est le cas qui impose la prudence : deux de ses
 * sections portent `data-task="2.1"` et deux de ses questions aussi, si bien
 * qu'un rattachement naïf publierait les mêmes id deux fois. quiz.js compte les
 * <details> pour son score : un doublon fausserait le total autant que la note.
 * Les questions non placées ne disparaissent pas, elles retombent dans le bloc
 * terminal. */
function placeQuizzes(sections, quizzes) {
  const owner = new Map();
  for (const section of sections) {
    if (!section.task) continue;
    owner.set(section.task, owner.has(section.task) ? null : section.id);
  }

  const bySection = new Map();
  const leftover = [];
  for (const quiz of quizzes) {
    const id = owner.get(quiz.task);
    if (!id) {
      leftover.push(quiz);
      continue;
    }
    if (!bySection.has(id)) bySection.set(id, []);
    bySection.get(id).push(quiz);
  }

  /* Le risque n'est pas de perdre une question — chaque quiz est poussé dans
   * exactement une branche — mais d'en publier une DEUX fois : deux <details> de
   * même id cassent l'ancre, et quiz.js compte les blocs pour son score, donc un
   * doublon fausse le total autant que la note. C'est cela qu'on mesure. */
  const rendered = [...[...bySection.values()].flat(), ...leftover].map((q) => q.id);
  if (new Set(rendered).size !== quizzes.length) {
    throw new Error(`placeQuizzes : ${new Set(rendered).size} id distinct(s) rendu(s) pour ${quizzes.length} question(s) chargée(s)`);
  }
  return { bySection, leftover };
}

/* Les lettres d'une question viennent de ses propres options, jamais d'une
 * liste figée : une question à réponses multiples en porte cinq (a-e). Le
 * contrat (tools/lib/quiz-contract.mjs) a déjà garanti que ces clés forment un
 * préfixe contigu de a-e, donc l'ordre alphabétique est l'ordre d'affichage. */
const lettersOf = (q) => Object.keys(q.options).sort();

/* Un chemin d'asset (styles.css, nav.js…) est relatif à la racine du site ;
 * la page anglaise vit sous en/, donc chaque chemin y remonte d'un niveau. */
function assetPath(name, lang) {
  return lang === 'en' ? `../${name}` : name;
}

/* Le sommaire de la fiche de titre : « (27 %) » n'a de sens que dans la
 * navbar globale, pas dans le prev/next d'une page qui parle déjà du domaine
 * suivant. */
const stripWeight = (title) => (title || '').replace(/\s*\(\d+\s*%\)\s*$/, '').trim();

/* Exporté pour tools/lib/practice.mjs : la page des QCM rend les mêmes blocs
 * <details> que les fiches de domaine, et un second rendu qui divergerait de
 * celui-ci rejouerait le défaut de la navbar en onze exemplaires. */
/* « Q1 (D5) — Assay settings… » : sur une fiche de domaine la parenthèse répète
 * le code du domaine, que la page annonce déjà dans son titre et sa navbar.
 *
 * Elle ne le répète pas toujours : les sept questions de D2 portent un nom de
 * scénario — Logistics, Field Service, Site Reliability — que la page D2
 * n'affiche nulle part, et les effacer perdrait le cadre de la question. D'où la
 * comparaison au domaine plutôt qu'un retrait aveugle de toute parenthèse.
 *
 * La page des QCM est le cas inverse : la parenthèse y nomme le scénario, et
 * chaque question vit déjà sous le titre de ce scénario. C'est ce que demande
 * stripScenario.
 *
 * Le retrait est fait au rendu et pas dans le JSON : report-duplicates.mjs,
 * report-length-tell.mjs et l'export Academy lisent ces `summary`.
 * quiz.js exige que le libellé commence par Qn pour en faire sa pastille — le
 * numéro est donc conservé, seule la parenthèse et son tiret partent. */
function trimSummaryTag(summary, domain, stripScenario) {
  const m = summary.match(/^(Q\d+)\s+\(([^)]*)\)\s*—\s*/);
  if (!m) return summary;
  if (!stripScenario && m[2] !== domain) return summary;
  return `${m[1]} ${summary.slice(m[0].length)}`;
}

export function renderQuiz(q, { stripScenario = false } = {}) {
  const letters = lettersOf(q);
  const answers = new Set(answerLetters(q.answer));
  const options = letters
    .map((letter) => `<p data-opt="${letter}">${letter.toUpperCase()}) ${q.options[letter]}</p>`)
    .join('\n');
  const distractors = letters
    .filter((letter) => !answers.has(letter))
    .map((letter) => `<li data-opt="${letter}">${q.distractors[letter]}</li>`)
    .join('\n');
  const answerWord = answers.size > 1 ? 'Answers' : 'Answer';

  return [
    /* alsoTasks porte la couverture secondaire d'une question qui répond à deux
     * task statements. La table de couverture la compte déjà ; sans elle ici, le
     * filtre par task de practice.js afficherait moins de questions que la table
     * n'en annonce pour la même task. */
    `<details id="${q.id}" data-domain="${q.domain}" data-task="${q.task}"${q.alsoTasks?.length ? ` data-also-tasks="${q.alsoTasks.join(' ')}"` : ''}>`,
    `<summary>${trimSummaryTag(q.summary, q.domain, stripScenario)}</summary>`,
    '<div>',
    `<p><strong>Scenario:</strong> ${q.scenario}</p>`,
    `<p><strong>Question:</strong> ${q.question}</p>`,
    options,
    '<hr>',
    `<p class="correct" data-answer="${q.answer}">${answerWord}: ${q.answerLabel}</p>`,
    `<p><strong>Why:</strong> ${q.why}</p>`,
    '<p class="incorrect"><strong>Why the others are wrong:</strong></p>',
    '<ul>',
    distractors,
    '</ul>',
    '</div>',
    '</details>',
  ].join('\n');
}

/* La navbar de la version anglaise réutilise renderNav() de nav.mjs — la
 * source unique — plutôt que de réimplémenter son échappement ou sa logique
 * de page courante : chaque href de LINKS et le lien « home » remontent
 * simplement d'un niveau avant d'y être passés. */
function buildNavbar({ links, lang, slug }) {
  if (lang !== 'en') return renderNav(links, slug);
  const prefixed = links.map(([href, label, title]) => [`../${href}`, label, title]);
  return renderNav(prefixed, `../${slug}`, '../index.html');
}

/* Le sélecteur de langue vit hors du bloc <nav class="navbar"> pour ne pas
 * entrer dans le périmètre que check-nav.mjs compare au rendu de nav.js — il
 * ne scanne que la racine du dépôt, jamais en/. */
function buildLangSwitch({ translations, lang, slug }) {
  if (lang === 'en') {
    const entry = Object.entries(translations).find(([, en]) => en === `en/${slug}`);
    if (!entry) return '';
    return `\n<div class="lang-switch">\n  <a href="../${entry[0]}">FR</a>\n</div>`;
  }
  const en = translations[slug];
  if (!en) return '';
  return `\n<div class="lang-switch">\n  <a href="${en}">EN</a>\n</div>`;
}

/* prev/next dérivés de l'ordre des LINKS de la navbar : la page qui précède
 * et celle qui suit slug dans ce même ordre. Une page sans voisin (bornes de
 * la liste, ou lien PDF) n'affiche simplement pas le lien correspondant. */
function buildDocNav({ links, lang, slug, strings }) {
  const idx = links.findIndex(([href]) => href === slug);
  const render = (item, cls, label) => {
    if (!item || item[0].endsWith('.pdf')) return '';
    const [href, linkLabel, title] = item;
    const displayTitle = stripWeight(title) || linkLabel;
    return `  <a class="${cls}" href="${assetPath(href, lang)}"><span class="label">${label}</span><span class="title">${displayTitle}</span></a>`;
  };
  return [
    render(links[idx - 1], 'prev', strings.prevLabel),
    render(links[idx + 1], 'next', strings.nextLabel),
  ].filter(Boolean).join('\n');
}

/* Assemble la page complète : { course, quizzes, lang, slug, nav }.
 * course vient de renderCourse() (tools/lib/render.mjs) : { title, sections,
 * toc }. quizzes vient de loadJsonQuizzes() (tools/lib/quizzes.mjs) : un
 * tableau, dans l'ordre d'affichage. nav porte les données lues depuis
 * nav.js : { links, translations } (readLinks/readTranslations de
 * tools/lib/nav.mjs) — jamais un HTML déjà construit, pour que ce module
 * reste l'unique endroit qui sait combiner navbar, sélecteur de langue et
 * doc-nav. */
export function renderPage({ course, quizzes, lang, slug, nav }) {
  /* Un quiz hors contrat (option manquante, réponse qui ne désigne aucune
   * option…) écrirait aujourd'hui « undefined » dans la page publiée, sans
   * bruit — voir renderQuiz ci-dessus, qui interpole directement q.options[…]
   * et q.distractors[…]. Refuser de rendre est le seul moyen de le voir avant
   * de le publier. */
  const contractProblems = checkQuizContract(quizzes);
  if (contractProblems.length) {
    throw new Error(`renderPage refuse de publier des quiz hors contrat :\n${contractProblems.join('\n')}`);
  }

  const strings = STRINGS[lang];
  const { bySection, leftover } = placeQuizzes(course.sections, quizzes);
  const quizSectionNumber = course.toc.length + 1;
  const quizSectionId = `s${quizSectionNumber}`;

  const tocItems = [
    ...course.toc.map((s) => `<li><a href="#${s.id}">${s.heading}</a></li>`),
    ...(leftover.length ? [`<li><a href="#${quizSectionId}">${strings.quizHeading}</a></li>`] : []),
  ].join('\n');

  const toTestLine = (task) =>
    `<p class="to-test"><a href="${assetPath('Practice_Questions.html', lang)}?task=${task}">${strings.toTest(task)}</a></p>`;

  /* Fin de section : l'apprenant s'arrête et se teste. C'est la frontière que
   * le segmenting demande — franchie par un acte de rappel, pas par un résumé,
   * puisque sur un QCM c'est discriminer qui coûte, pas se remémorer.
   *
   * L'encadré n'est posé que s'il porte vraiment des questions. Sans ce garde,
   * D0 publiait trois boîtes « Teste-toi sur cette section » vides, liseré
   * compris, qui annonçaient un test et n'en contenaient aucun : ses sections
   * pointent vers des task statements d'autres domaines, que ses propres
   * questions ne couvrent pas. Le renvoi vers la banque, lui, reste utile seul. */
  const sectionQuizHtml = (section) => {
    const own = bySection.get(section.id) || [];
    const toTest = section.task ? toTestLine(section.task) : '';
    if (!own.length) return toTest ? `\n\n${toTest}` : '';
    return [
      '\n\n<div class="section-quiz">',
      `<h3 class="section-quiz-title">${strings.sectionQuiz}</h3>`,
      own.map(renderQuiz).join('\n\n'),
      toTest,
      '</div>',
    ].filter(Boolean).join('\n');
  };

  const sectionsHtml = course.sections
    .map((s, i) => `<div class="section-header"><h2 id="${s.id}">${i + 1}. ${s.heading}</h2></div>\n\n${s.html}${sectionQuizHtml(s)}`)
    .join('\n\n');

  /* Les tasks du bloc terminal n'apparaissent dans aucune section : sans ces
   * renvois, deux questions de D0 (2.3, 4.3) ne menaient à aucune question de
   * banque, alors que le reste du corpus y mène 35 fois. */
  const leftoverLinks = [...new Set(leftover.map((q) => q.task))]
    .filter((task) => task && !course.sections.some((s) => s.task === task))
    .sort()
    .map(toTestLine)
    .join('\n');

  const quizSectionHtml = leftover.length
    ? `${'\n\n'}<div class="section-header"><h2 id="${quizSectionId}" class="page-break">${quizSectionNumber}. ${strings.quizHeading}</h2></div>\n\n${leftover.map(renderQuiz).join('\n\n')}${leftoverLinks ? `\n\n${leftoverLinks}` : ''}`
    : '';

  /* Ouvert par défaut, et c'est une décision mesurée : replié, le bloc enterrait
   * 8 pointeurs « TS x.y » qui n'existent nulle part ailleurs dans leur cours —
   * ces paragraphes nomment ce que le cours ne couvre pas, donc rien d'autre ne
   * les porte, et l'examen note par domaine. Le défaut à corriger était les 323
   * mots posés en aplat saturé dans le bandeau, pas leur présence. */
  const crossRefsHtml = course.crossRefs
    ? `\n<details class="cross-refs" open>\n<summary>${strings.crossRefs}</summary>\n${course.crossRefs}\n</details>\n`
    : '';

  const navbarHtml = buildNavbar({ links: nav.links, lang, slug });
  const langSwitchHtml = buildLangSwitch({ translations: nav.translations, lang, slug });
  const docNavHtml = buildDocNav({ links: nav.links, lang, slug, strings });

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${course.title}</title>
<link rel="stylesheet" href="${assetPath('styles.css', lang)}">
<script src="${assetPath('nav.js', lang)}" defer></script>
<script src="${assetPath('quiz.js', lang)}" defer></script>
<script>(function(){try{var t=localStorage.getItem('cca-theme');if(!t)t=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
<script src="${assetPath('theme.js', lang)}" defer></script>
<script src="${assetPath('toc.js', lang)}" defer></script>
<script src="${assetPath('site.js', lang)}" defer></script>
</head>
<body id="top">

<a class="skip-link" href="#content">${strings.skip}</a>

${navbarHtml}${langSwitchHtml}

<main id="content" tabindex="-1">

<div class="header-bar">
<h1>${course.title}</h1>
${course.lead ? `${course.lead}\n` : ''}</div>

<div class="toc">
<strong>${strings.toc}</strong>
<ol>
${tocItems}
</ol>
</div>
${crossRefsHtml}
${sectionsHtml}${quizSectionHtml}

</main>

<nav class="doc-nav">
${docNavHtml}
</nav>

<hr>
<p style="text-align:center;color:#888;font-size:9pt;">
${strings.footer(course.title)}
</p>


<a href="#top" class="back-to-top" aria-label="${strings.backToTop}" id="back-to-top">↑</a>

</body>
</html>
`;
}
