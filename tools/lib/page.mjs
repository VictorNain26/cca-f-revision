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
    backToTop: 'Retour en haut',
    prevLabel: 'Précédent',
    nextLabel: 'Suivant',
    footer: (title) => `CCA Révision — ${title} · 2026`,
  },
  en: {
    toc: 'Table of contents',
    quizHeading: 'Self-assessment questions',
    backToTop: 'Back to top',
    prevLabel: 'Previous',
    nextLabel: 'Next',
    footer: (title) => `CCA Revision — ${title} · 2026`,
  },
};

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
export function renderQuiz(q) {
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
    `<details id="${q.id}" data-domain="${q.domain}" data-task="${q.task}">`,
    `<summary>${q.summary}</summary>`,
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
  const quizSectionNumber = course.toc.length + 1;
  const quizSectionId = `s${quizSectionNumber}`;

  const tocItems = [
    ...course.toc.map((s) => `<li><a href="#${s.id}">${s.heading}</a></li>`),
    `<li><a href="#${quizSectionId}">${strings.quizHeading}</a></li>`,
  ].join('\n');

  const sectionsHtml = course.sections
    .map((s, i) => `<div class="section-header"><h2 id="${s.id}">${i + 1}. ${s.heading}</h2></div>\n\n${s.html}`)
    .join('\n\n');

  const quizzesHtml = quizzes.map(renderQuiz).join('\n\n');
  const quizSectionHtml = `<div class="section-header"><h2 id="${quizSectionId}" class="page-break">${quizSectionNumber}. ${strings.quizHeading}</h2></div>\n\n${quizzesHtml}`;

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


${navbarHtml}${langSwitchHtml}

<div class="header-bar">
<h1>${course.title}</h1>
${course.lead ? `${course.lead}\n` : ''}</div>

<div class="toc">
<strong>${strings.toc}</strong>
<ol>
${tocItems}
</ol>
</div>

${sectionsHtml}

${quizSectionHtml}

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
