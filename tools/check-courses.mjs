#!/usr/bin/env node
/* Contrôle du corpus de cours : la version française doit être le rendu exact
 * de la source anglaise et de po/fr.po — comme la navbar est le rendu exact
 * de nav.js. Les pages HTML publiées (D0_API_Fundamentals.html,
 * en/D0_API_Fundamentals.html…) doivent elles-mêmes être le rendu exact de ce
 * corpus par tools/render-courses.mjs — même garantie, un niveau plus loin.
 * Le défaut que ce contrôle attrape : une traduction corrigée directement dans
 * courses/fr/ (perdue au prochain build), un segment anglais absent du
 * catalogue (l'anglais modifié sans rejouer build:courses, --no-update ne
 * laissant ni entrée fuzzy ni entrée vide à signaler), un renvoi data-task que
 * l'appariement flou de po4a a fait dériver vers un autre task statement, un
 * fichier oublié dans courses/po4a.conf ou orphelin sur le disque, une page
 * HTML éditée à la main plutôt que dans sa source — perdue sans avis au
 * prochain `npm run render:courses`.
 *
 * Ce qui relève des conventions de rédaction du corpus — marqueurs src et
 * owns, une section par task statement, fraîcheur des traductions — est
 * affiché en observations et ne décide de rien : ces conventions ont vocation
 * à bouger, et un verdict rouge sur elles empêcherait d'essayer un autre
 * découpage avant de l'avoir vu à l'œuvre.
 * Le rendu de comparaison se fait dans une copie temporaire isolée (courses/)
 * ou entièrement en mémoire (pages HTML, dont le rendu n'écrit jamais sur
 * disque) : ce contrôle ne modifie jamais l'arborescence qu'il surveille.
 * Sans dépendance hors jsdom déjà présent. Node >= 20.11.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  readBankTasks,
  sourceFilesInPo,
  readPo4aMasters,
  courseIdFromFilename,
  parsePoEntries,
  auditCorpus,
  checkCatalogueCoverage,
  checkPo4aOptions,
  diffRenderedPages,
  checkNoLeakedMetadata,
} from './lib/courses.mjs';
import { PUBLISHED_COURSES, renderCoursePages } from './lib/page.mjs';
import { renderPracticePage } from './lib/practice.mjs';
import { readLinks, readTranslations } from './lib/nav.mjs';
import { loadJsonQuizzes } from './lib/quizzes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const COURSES = path.join(ROOT, 'courses');
const TESTED_PO4A = '0.69';

/* Empreinte de courses/ et des pages publiées à la racine et dans en/ (chemin,
 * taille, mtime), prise avant tout travail et revérifiée juste avant la
 * sortie. Aucune assertion de test ne peut garder cette propriété sans faire
 * dépendre npm test de po4a : c'est donc au contrôle lui-même d'attester
 * qu'il n'a pas touché à l'arborescence qu'il surveille — exactement la
 * garantie que le défaut d'origine violait. Étendue aux pages générées : ce
 * contrôle a désormais autorité sur elles aussi (diffRenderedPages,
 * checkNoLeakedMetadata), le garde « le contrôle n'écrit rien » doit couvrir
 * ce qu'il surveille, pas seulement son point de départ historique. Un écart
 * est signalé comme n'importe quel autre problème, pas juste loggé. */
function fingerprintCourses() {
  const publishedPages = [
    ...PUBLISHED_COURSES.flatMap((c) => [path.join(ROOT, c.slug), path.join(ROOT, 'en', c.slug)]),
    path.join(ROOT, 'Practice_Questions.html'),
  ];
  const coursesFiles = fs.readdirSync(COURSES, { recursive: true }).map((f) => path.join(COURSES, f));

  return [...coursesFiles, ...publishedPages]
    .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile())
    .sort()
    .map((f) => {
      const st = fs.statSync(f);
      return `${path.relative(ROOT, f)}:${st.size}:${st.mtimeMs}`;
    })
    .join('\n');
}
const fingerprintBefore = fingerprintCourses();

const problems = [];

/* La version de po4a est vérifiée en premier : le contrôle de dérive compare un
 * fichier committé au rendu d'un binaire externe. Si la version a changé, on
 * veut que l'échec dise « po4a a changé » et non « le français a dérivé ».
 * LC_ALL=C force la sortie en anglais : "%s version %s.\n" passe par gettext,
 * et sous une locale où le catalogue de po4a traduit "version", la regex ne
 * matcherait plus — l'avertissement reviendrait à chaque run, exactement le
 * faux positif permanent que la correction précédente a réglé pour la
 * ponctuation, pas pour la locale. */
let version = null;
try {
  const out = execFileSync('po4a', ['--version'], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  version = out.match(/version (\d+\.\d+(?:\.\d+)?)/)?.[1];
} catch {
  console.log('po4a introuvable — installer avec : sudo apt install -y po4a');
  process.exit(1);
}
if (version !== TESTED_PO4A) {
  console.log(`Attention : po4a ${version} installé, corpus validé en ${TESTED_PO4A}.`);
  console.log('Une différence de rendu ci-dessous peut venir de la version, pas du contenu.');
}

/* Structure et attribution, sur la source anglaise. */
const enFilenames = fs.readdirSync(path.join(COURSES, 'en')).filter((f) => f.endsWith('.md')).sort();
const courses = [];
for (const f of enFilenames) {
  const id = courseIdFromFilename(f);
  if (id === null) {
    problems.push(`courses/en/${f} — nom de fichier hors convention DD-slug.md, domaine non reconnaissable`);
    continue;
  }
  courses.push({
    id,
    file: `courses/en/${f}`,
    markdown: fs.readFileSync(path.join(COURSES, 'en', f), 'utf8'),
  });
}

const bankTasks = readBankTasks(fs.readFileSync(path.join(ROOT, 'Practice_Questions.html'), 'utf8'));

/* Réconciliation des trois listes (masters déclarés, fichiers anglais,
 * fichiers français) avant toute comparaison de contenu : un fichier créé
 * pendant le contrôle, un français orphelin ou un master sans fichier ne
 * produisent aucune divergence de contenu à comparer — rien à comparer n'est
 * pas la preuve d'un corpus sain. */
const confPath = path.join(COURSES, 'po4a.conf');
const confText = fs.readFileSync(confPath, 'utf8');
const masters = readPo4aMasters(confText);
const frFilenamesBefore = fs.readdirSync(path.join(COURSES, 'fr')).filter((f) => f.endsWith('.md'));
const before = Object.fromEntries(
  frFilenamesBefore.map((f) => [`courses/fr/${f}`, fs.readFileSync(path.join(COURSES, 'fr', f), 'utf8')]),
);

/* Entrées périmées et entrées vides : affichées en observations. Ce qui bloque
 * du côté des traductions, c'est le renvoi devenu faux (checkTaskReferenceDrift).
 *
 * Le filtrage passe par msgattrib plutôt que par une expression régulière sur
 * le .po : un msgstr vide et un msgstr long replié sur plusieurs lignes se
 * ressemblent trop pour qu'un regex les distingue de façon fiable. msgattrib
 * vient de gettext, dont po4a dépend — rien de plus à installer. */
const poPath = path.join(COURSES, 'po', 'fr.po');
function msgattrib(flag) {
  try {
    return execFileSync('msgattrib', [flag, '--no-obsolete', poPath], { encoding: 'utf8' });
  } catch (err) {
    for (const p of problems) console.log(p);
    console.log(`msgattrib ${flag} a échoué : ${err.message}`);
    process.exit(1);
  }
}

/* Chaque entrée po4a est précédée d'un commentaire « #. type: … » ; le seul
 * bloc qui n'en porte pas est l'en-tête du catalogue (toujours fuzzy à
 * l'initialisation depuis le .pot). Compter ces lignes donne le nombre
 * d'entrées réelles sans compter l'en-tête. */
const entryCount = (poText) => [...poText.matchAll(/^#\. /gm)].length;

const fuzzyText = msgattrib('--only-fuzzy');
const fuzzyFiles = sourceFilesInPo(fuzzyText);
const fuzzyCount = entryCount(fuzzyText);

const untranslatedText = msgattrib('--untranslated');
const untranslatedFiles = sourceFilesInPo(untranslatedText);
const untranslatedCount = entryCount(untranslatedText);

/* Compte indépendant des entrées (lignes « #. » du catalogue complet, non
 * filtré par msgattrib) : le garde-fou de checkInvariantMarkers compare ce
 * total à ce que parsePoEntries a lu, pour attraper une régression du
 * parseur qui laisserait le contrôle vert par accident. */
const poText = fs.readFileSync(poPath, 'utf8');
const poEntries = parsePoEntries(poText);
const expectedPoEntryCount = entryCount(poText);

/* Dérive : régénérer et comparer à ce qui est committé — dans une copie
 * isolée, jamais dans le dépôt. --destdir a été essayé et écarté : il produit
 * bien le rendu à côté, mais supprime la cible réelle (D courses/fr/…). Ici,
 * courses/en/, courses/po/ et po4a.conf sont copiés dans un répertoire
 * temporaire, où courses/fr/ est créé puis rendu par po4a — avec `cwd` posé
 * sur la copie, sans quoi les chemins relatifs de la conf visent le vrai
 * dépôt et le modifient. Le contrôle reste ainsi strictement en lecture sur
 * l'arborescence qu'il surveille, y compris sur courses/po/courses.pot que
 * l'ancienne version régénérait en place. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'courses-'));
let after;
let potEntries;
let po4aError = null;
try {
  fs.cpSync(path.join(COURSES, 'en'), path.join(tmp, 'courses', 'en'), { recursive: true });
  fs.cpSync(path.join(COURSES, 'po'), path.join(tmp, 'courses', 'po'), { recursive: true });
  fs.copyFileSync(confPath, path.join(tmp, 'courses', 'po4a.conf'));
  fs.mkdirSync(path.join(tmp, 'courses', 'fr'), { recursive: true });

  try {
    execFileSync('po4a', ['--no-update', '--force', 'courses/po4a.conf'], { cwd: tmp });

    /* La lecture de « after » se fait ici, entre les deux passes po4a, pour
     * ne pas dépendre implicitement de --no-translations sur la seconde :
     * si cette option disparaissait de la ligne ci-dessous, la passe 2
     * réécrirait courses/fr/ dans la copie depuis le catalogue msgmergé et
     * affaiblirait le contrôle en silence. Lire avant plutôt que documenter
     * fait disparaître la dépendance au lieu de la commenter. */
    const frFilenamesAfter = fs.readdirSync(path.join(tmp, 'courses', 'fr')).filter((f) => f.endsWith('.md'));
    after = Object.fromEntries(
      frFilenamesAfter.map((f) => [`courses/fr/${f}`, fs.readFileSync(path.join(tmp, 'courses', 'fr', f), 'utf8')]),
    );

    execFileSync('po4a', ['--no-translations', '--force', 'courses/po4a.conf'], { cwd: tmp });
    const potText = fs.readFileSync(path.join(tmp, 'courses', 'po', 'courses.pot'), 'utf8');
    potEntries = parsePoEntries(potText);
  } catch (err) {
    po4aError = err;
  }
} finally {
  /* Le nettoyage doit survivre à l'échec de po4a : process.exit() ne
   * déroule pas la pile et court-circuiterait ce finally s'il était appelé
   * dans le bloc try ci-dessus. L'erreur est donc mémorisée (po4aError) et
   * la sortie déportée après ce bloc, une fois le répertoire temporaire
   * supprimé dans tous les cas. */
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (po4aError) {
  for (const p of problems) console.log(p);
  console.log(`po4a a échoué : ${po4aError.message}`);
  process.exit(1);
}

const buildScript = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts['build:courses'];

problems.push(...checkCatalogueCoverage({ potEntries, poEntries }).problems);
problems.push(...checkPo4aOptions({ confText, buildScript }).problems);

/* Rendu des pages publiées, en mémoire, à partir de la source anglaise
 * (courses) et du français déjà régénéré ci-dessus dans la copie isolée
 * (`after`) : pas de nouvelle écriture disque, donc pas de risque pour
 * l'empreinte vérifiée en fin de script. Un cours dont la source est absente
 * n'a pas de page à comparer — reconcileCourseFiles l'a déjà signalé. */
const nav = { links: readLinks(path.join(ROOT, 'nav.js')), translations: readTranslations(path.join(ROOT, 'nav.js')) };

/* Les pages anglaises réellement sur le disque, pas celles que PUBLISHED_COURSES
 * annonce : c'est l'écart entre le disque et la liste tenue à la main que
 * checkEnglishPagesReconciliation doit voir. */
const enDir = path.join(ROOT, 'en');
const enPages = fs.existsSync(enDir) ? fs.readdirSync(enDir).filter((f) => f.endsWith('.html')).sort() : [];
const enMarkdownByFile = Object.fromEntries(courses.map((c) => [path.basename(c.file), c.markdown]));
const pagesCommitted = {};
const pagesRendered = {};
for (const course of PUBLISHED_COURSES) {
  const enMarkdown = enMarkdownByFile[course.file];
  const frMarkdown = after[`courses/fr/${course.file}`];
  if (enMarkdown === undefined || frMarkdown === undefined) continue;

  const frPagePath = path.join(ROOT, course.slug);
  const enPagePath = path.join(ROOT, 'en', course.slug);

  const quizPath = path.join(COURSES, 'quizzes', `${course.domain}.json`);
  const quizzes = fs.existsSync(quizPath) ? loadJsonQuizzes(course.domain) : [];
  const { frHtml, enHtml } = renderCoursePages({ enMarkdown, frMarkdown, quizzes, slug: course.slug, nav });
  pagesRendered[course.slug] = frHtml;
  pagesRendered[`en/${course.slug}`] = enHtml;

  if (fs.existsSync(frPagePath)) pagesCommitted[course.slug] = fs.readFileSync(frPagePath, 'utf8');
  if (fs.existsSync(enPagePath)) pagesCommitted[`en/${course.slug}`] = fs.readFileSync(enPagePath, 'utf8');
}
/* Practice_Questions.html entre dans la même comparaison que les fiches : sans
 * elle, la page redeviendrait éditable à la main sans que rien le signale —
 * le défaut exact que sa migration vers courses/practice/ a corrigé. */
const practiceMd = path.join(COURSES, 'practice', 'page.md');
const practiceJson = path.join(COURSES, 'quizzes', 'PQ.json');
if (fs.existsSync(practiceMd) && fs.existsSync(practiceJson)) {
  const practice = renderPracticePage({
    markdown: fs.readFileSync(practiceMd, 'utf8'),
    quizzes: JSON.parse(fs.readFileSync(practiceJson, 'utf8')),
    nav,
  });
  problems.push(...practice.problems);
  pagesRendered['Practice_Questions.html'] = practice.html;
  pagesCommitted['Practice_Questions.html'] = fs.readFileSync(path.join(ROOT, 'Practice_Questions.html'), 'utf8');
} else {
  problems.push('courses/practice/page.md ou courses/quizzes/PQ.json manquant : Practice_Questions.html ne peut pas être comparée à son rendu');
}

problems.push(...diffRenderedPages(pagesCommitted, pagesRendered).problems);
problems.push(...checkNoLeakedMetadata(pagesRendered).problems);

const audit = auditCorpus({
  courses,
  bankTasks,
  poEntries,
  expectedPoEntryCount,
  masters,
  frBefore: before,
  frAfter: after,
  fuzzyFiles,
  untranslatedFiles,
  fuzzyCount,
  untranslatedCount,
  enPages,
  translations: nav.translations,
});
problems.push(...audit.problems);

if (fingerprintCourses() !== fingerprintBefore) {
  problems.push("courses/ — le contrôle a modifié l'arborescence qu'il surveille (empreinte fichier/taille/mtime différente de celle prise au démarrage) : c'est exactement le défaut que cette refonte corrige, investiguer avant de committer quoi que ce soit.");
}

if (audit.notices.length) {
  console.log(`${audit.notices.length} observation(s), sans effet sur le verdict :`);
  for (const n of audit.notices) console.log('  -', n);
  console.log('');
}

for (const p of problems) console.log('  -', p);
console.log(`Corpus de cours : ${problems.length} problème(s) sur ${courses.length} cours.`);
process.exit(problems.length ? 1 : 0);
