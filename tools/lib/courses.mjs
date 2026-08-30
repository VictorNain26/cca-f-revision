/* Référentiel et parsing du corpus de cours.
 * Le défaut que ce module sert à attraper : le guide d'examen se recoupe
 * lui-même — les erreurs structurées sont enseignées en TS 2.2 et en TS 5.3,
 * l'isolation des subagents en TS 1.3 et TS 5.4. Une déduplication qui ne
 * compare que les sources PDF laisse donc passer la redite. La table
 * OWNED_CONCEPTS attribue chaque notion transverse à un seul cours ; le
 * marqueur <!-- owns:… --> matérialise cette attribution dans le Markdown.
 *
 * Cette table est la source unique : courses/README.md y renvoie sans la
 * recopier, pour ne pas rejouer le défaut de la navbar en onze exemplaires.
 */

/* Les 30 task statements du guide CCAR-F v1.0, par domaine. */
export const TASK_STATEMENTS = [
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7',
  '2.1', '2.2', '2.3', '2.4', '2.5',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6',
  '4.1', '4.2', '4.3', '4.4', '4.5', '4.6',
  '5.1', '5.2', '5.3', '5.4', '5.5', '5.6',
];

/* Notion transverse → domaine propriétaire. Partout ailleurs, un renvoi
 * portant la définition en une phrase, jamais un lien nu. */
export const OWNED_CONCEPTS = {
  'messages-api': '0',
  'message-roles': '0',
  'agentic-loop': '1',
  'subagent-isolation': '1',
  'hooks': '1',
  'task-decomposition': '1',
  'structured-errors': '2',
  'mcp-resources': '2',
  'claude-md': '3',
  'skills': '3',
  'plan-mode': '3',
  'tool-choice': '4',
  'stop-reason': '0',
  'content-blocks': '0',
  'context-window': '0',
};

const HEADING = /^## (.+)$/;
const META = /<!--\s*(?:ts:([0-5]\.\d)\s*\|\s*)?src:(.+?)\s*-->/;
const OWNS = /<!--\s*owns:([a-z0-9-]+)\s*-->/g;

/* Détection tolérante des marqueurs owns mal formés : « own: » (faute de
 * frappe sur owns), un espace entre le « : » et le slug, une casse ou un
 * caractère hors [a-z0-9-]. [^\s>]* évite de déborder sur un marqueur voisin
 * en s'arrêtant à la première espace ou au « > » de fermeture. Un marqueur
 * qui matche la forme tolérante mais pas la forme stricte est un défaut de
 * frappe silencieux : sans cette détection, il équivaut à l'absence pure et
 * simple du marqueur, alors que toute la convention anti-redite en dépend. */
const OWNS_LOOSE = /<!--\s*own(?:s)?\s*:\s*[^\s>]*\s*-->/gi;
const OWNS_STRICT_FULL = /^<!--\s*owns:([a-z0-9-]+)\s*-->$/;

/* Découpe un cours en sections de niveau 2 et lit leurs métadonnées.
 * Les métadonnées d'une section sont cherchées entre son titre et le titre
 * suivant, pas seulement sur la ligne d'après : la ligne owns est facultative
 * et peut être séparée de la ligne src. */
export function parseCourse(markdown) {
  const lines = markdown.split('\n');
  const starts = [];
  lines.forEach((line, i) => {
    if (HEADING.test(line)) starts.push(i);
  });

  const sections = starts.map((start, idx) => {
    const end = starts[idx + 1] ?? lines.length;
    const body = lines.slice(start + 1, end).join('\n');
    const meta = body.match(META);
    return {
      level: 2,
      title: lines[start].match(HEADING)[1].trim(),
      ts: meta?.[1] ?? null,
      src: meta?.[2]?.trim() ?? null,
      owns: [...body.matchAll(OWNS)].map((m) => m[1]),
      ownsMalformed: [...body.matchAll(OWNS_LOOSE)]
        .map((m) => m[0])
        .filter((text) => !OWNS_STRICT_FULL.test(text)),
      line: start + 1,
    };
  });

  return { sections };
}

/* Les data-task cités par la banque de questions. Lecture par expression
 * régulière plutôt que par jsdom : on ne cherche qu'un attribut, et le
 * contrôle doit rester rapide. */
export function readBankTasks(html) {
  return new Set([...html.matchAll(/data-task="([^"]+)"/g)].map((m) => m[1]));
}

/* Les fichiers sources cités par les commentaires « #: » d'un catalogue PO.
 * msgattrib conserve ces commentaires quand il filtre : c'est ce qui permet de
 * dire *quel cours* a une traduction périmée, plutôt que d'en donner un total
 * qu'on ne saurait pas où corriger.
 *
 * gettext regroupe plusieurs références sur une même ligne « #: » tant
 * qu'elles tiennent sous sa colonne de repli ; une regex ancrée qui ne
 * capture que la première réf de la ligne en perdrait silencieusement les
 * suivantes dès qu'un cours partage une chaîne avec un autre. */
export function sourceFilesInPo(poText) {
  const files = new Set();
  for (const line of poText.matchAll(/^#:\s+(.*)$/gm)) {
    for (const ref of line[1].trim().split(/\s+/)) {
      const file = ref.split(':')[0];
      if (file) files.add(file);
    }
  }
  return files;
}

const REFERENCED_TASK = /data-task="([^"]+)"/g;

/* Vérifie ce qui est mécaniquement vérifiable : présence des métadonnées,
 * couverture des task statements pour les cours annoncés livrés, unicité et
 * bonne attribution des notions, validité des renvois vers la banque.
 *
 * Tout ce que cette fonction produit est une observation, jamais un verdict :
 * ce sont les conventions de rédaction du corpus, celles qui ont le plus de
 * raisons de bouger. Les voir listées suffit à les tenir ; les rendre
 * bloquantes obligerait à refondre le dispositif avant d'avoir le droit
 * d'essayer un autre découpage.
 *
 * Angle mort assumé : rien ici ne juge la justesse du contenu. Un cours faux
 * mais bien formé passe. Et un cours qui redéveloppe une notion sans poser le
 * marqueur owns passe aussi — le marqueur rend la convention falsifiable, il
 * ne la fait pas respecter. */
export function checkCorpus({ courses, bankTasks }) {
  const notices = [];
  const claimed = new Map();
  /* Un domaine peut être scindé sur plusieurs fichiers (01a, 01b) : la
   * couverture des task statements se compare par domaine, pas par fichier,
   * sinon chaque fichier se voit réclamer les sept task statements du domaine
   * en entier. */
  const coveredByDomain = new Map();
  const filesByDomain = new Map();

  for (const course of courses) {
    const { sections } = parseCourse(course.markdown);
    const seenTs = new Map();

    for (const s of sections) {
      if (!s.src) {
        notices.push(`${course.file}:${s.line} — section « ${s.title} » sans src : un <!-- src:référence --> rend l'affirmation traçable`);
      }

      if (s.ts) {
        if (seenTs.has(s.ts)) {
          notices.push(`${course.file}:${s.line} — task statement ${s.ts} déjà couvert par la section à la ligne ${seenTs.get(s.ts)}`);
        } else {
          seenTs.set(s.ts, s.line);
        }
      }

      for (const bad of s.ownsMalformed) {
        notices.push(`${course.file}:${s.line} — marqueur owns malformé « ${bad} », attendu <!-- owns:slug-en-minuscules -->`);
      }

      for (const concept of s.owns) {
        const owner = OWNED_CONCEPTS[concept];
        if (owner === undefined) {
          notices.push(`${course.file}:${s.line} — notion inconnue « ${concept} », absente de OWNED_CONCEPTS`);
          continue;
        }
        if (owner !== course.id) {
          notices.push(`${course.file}:${s.line} — « ${concept} » appartient au domaine ${owner}, revendiqué par le domaine ${course.id}`);
        }
        const claim = `${course.file}:${s.line}`;
        if (claimed.has(concept)) {
          notices.push(`${claim} — « ${concept} » déjà revendiqué par ${claimed.get(concept)}`);
        } else {
          claimed.set(concept, claim);
        }
      }
    }

    const covered = coveredByDomain.get(course.id) ?? new Set();
    for (const s of sections) if (s.ts) covered.add(s.ts);
    coveredByDomain.set(course.id, covered);

    const files = filesByDomain.get(course.id) ?? [];
    files.push(course.file);
    filesByDomain.set(course.id, files);

    for (const m of course.markdown.matchAll(REFERENCED_TASK)) {
      const ts = m[1];
      if (!bankTasks.has(ts)) {
        const line = course.markdown.slice(0, m.index).split('\n').length;
        notices.push(`${course.file}:${line} — renvoi vers data-task="${ts}", absent de la banque`);
      }
    }
  }

  for (const [id, covered] of coveredByDomain) {
    const expected = TASK_STATEMENTS.filter((ts) => ts.startsWith(`${id}.`));
    const missing = expected.filter((ts) => !covered.has(ts));
    if (missing.length) {
      const files = filesByDomain.get(id).join(', ');
      notices.push(`${files} — task statements sans section : ${missing.join(', ')}`);
    }
  }

  return { notices };
}

/* Les masters déclarés dans courses/po4a.conf : une ligne par fichier source,
 * de la forme `[type: text] <master> $lang:<cible> opt:"..."`. $lang est
 * remplacé par la seule langue déclarée dans ce projet (fr) — po4a_langs
 * n'en déclare qu'une, pas besoin de généraliser tant que le lot 2 ne
 * l'exige pas. */
const MASTER_LINE = /^\[type:\s*\S+\]\s+(\S+)\s+\$lang:(\S+)/gm;

export function readPo4aMasters(confText) {
  return [...confText.matchAll(MASTER_LINE)].map((m) => ({
    master: m[1],
    target: m[2].replace('$lang', 'fr'),
  }));
}

/* Réconcilie ce que courses/po4a.conf déclare avec ce qui existe réellement
 * sur disque, avant toute comparaison de contenu. La comparaison de contenu
 * seule est aveugle à trois dérives : un courses/fr/XX.md absent (po4a le
 * crée pendant le contrôle, rien à comparer), un .md français orphelin sans
 * source anglaise (po4a n'y touche jamais), un cours retiré de po4a.conf
 * dont le français reste committé (comparé à lui-même). Chacune ne laisse
 * aucune trace dans un avant/après de contenu — seule la présence des
 * fichiers, croisée avec la conf, la révèle. */
export function reconcileCourseFiles({ masters, enFiles, frFiles }) {
  const problems = [];
  const masterPaths = new Set(masters.map((m) => m.master));
  const targetPaths = new Set(masters.map((m) => m.target));

  for (const en of enFiles) {
    if (!masterPaths.has(en)) {
      problems.push(`${en} — fichier anglais non déclaré dans courses/po4a.conf : ajouter une ligne [type: text]`);
    }
  }
  for (const fr of frFiles) {
    if (!targetPaths.has(fr)) {
      problems.push(`${fr} — traduction sans anglais correspondant dans courses/po4a.conf : fichier orphelin, le supprimer ou restaurer son master`);
    }
  }
  for (const m of masters) {
    if (!enFiles.includes(m.master)) {
      problems.push(`${m.master} — master déclaré dans courses/po4a.conf mais absent de courses/en/ : créer le fichier ou retirer la ligne de la conf`);
    }
  }

  return { problems };
}

/* Compare courses/fr/ committé au rendu produit par po4a dans une copie
 * isolée (voir tools/check-courses.mjs) — jamais un avant/après du dépôt
 * lui-même, qui n'est plus jamais réécrit. Comparer seulement les clés déjà
 * présentes dans le committé laisserait passer un fichier que le rendu isolé
 * produit sans committé correspondant : il n'a pas de valeur « avant » à
 * comparer, donc aucune divergence de contenu à signaler, alors que son
 * absence est déjà la preuve d'une dérive (committer le rendu, ou retirer le
 * master). Symétriquement pour un fichier committé que le rendu isolé ne
 * produit plus. */
export function diffRenderedFiles(before, after) {
  const problems = [];
  const files = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const file of files) {
    if (!(file in before)) {
      problems.push(`${file} — produit par le rendu isolé mais absent de courses/fr/ : committer le rendu ou retirer le master de courses/po4a.conf`);
    } else if (!(file in after)) {
      problems.push(`${file} — présent dans courses/fr/ mais non produit par le rendu isolé : vérifier courses/po4a.conf et courses/po/fr.po`);
    } else if (before[file] !== after[file]) {
      problems.push(`${file} — diverge du rendu de po4a : éditer courses/po/fr.po, pas courses/fr/`);
    }
  }

  return { problems };
}

/* Même mécanique que diffRenderedFiles ci-dessus, appliquée aux pages HTML
 * publiées (D0_API_Fundamentals.html, en/D0_API_Fundamentals.html…) plutôt
 * qu'aux fichiers courses/fr/*.md. Le défaut attrapé : une coquille corrigée
 * à la main dans la page plutôt que dans courses/en/ — perdue sans avis au
 * prochain `npm run render:courses`, exactement le défaut que la navbar
 * dupliquée en onze exemplaires a déjà coûté à ce dépôt. */
/* Chaque page publiée a ses propres sources, et le message doit nommer les
 * bonnes : envoyer vers courses/en/ quelqu'un qui vient de corriger une option
 * de QCM lui fait chercher dans le mauvais fichier. */
const SOURCES_OF = (file) => {
  if (file === 'Practice_Questions.html') return 'courses/practice/page.md ou courses/quizzes/PQ.json';
  if (file.startsWith('en/')) return 'courses/en/';
  return 'courses/en/ ou courses/po/fr.po';
};

export function diffRenderedPages(before, after) {
  const problems = [];
  const files = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const file of files) {
    if (!(file in before)) {
      problems.push(`${file} — produit par le rendu mais absent du dépôt : lancer npm run render:courses et committer la page`);
    } else if (!(file in after)) {
      problems.push(`${file} — présent dans le dépôt mais non produit par le rendu : entrée retirée de PUBLISHED_COURSES (tools/lib/page.mjs) ?`);
    } else if (before[file] !== after[file]) {
      problems.push(`${file} — diverge de son rendu : éditer ${SOURCES_OF(file)}, pas la page`);
    }
  }

  return { problems };
}

const FILENAME_ID = /^\d?(\d)-/;

/* Le domaine d'un cours vient du préfixe numérique de son nom de fichier,
 * zero-paddé sur deux chiffres (00-…, 01-…, 05-…) pour trier correctement à
 * plat dans un répertoire. f.slice(0, 1) accepterait n'importe quel premier
 * caractère — annexe.md donnerait un id 'a' qui ne correspond à aucun
 * domaine et passerait en silence dans toute comparaison avec course.id —
 * et capturerait, pour 01-…, le zéro de padding plutôt que le
 * chiffre du domaine. Le premier chiffre est donc optionnel et non capturé
 * (\d?), seul le dernier avant le tiret l'est : ça reste correct aussi bien
 * pour un futur nom sans padding que pour le padding à deux chiffres réel.
 * null distingue explicitement « pas de domaine reconnaissable ». */
export function courseIdFromFilename(filename) {
  return filename.match(FILENAME_ID)?.[1] ?? null;
}

/* Un catalogue PO, entrée par entrée, avec ses commentaires de traducteur.
 * Le défaut que ce parsing sert à attraper : une entrée dont le msgstr répète
 * le msgid est indistinguable d'une prose oubliée en anglais — c'est arrivé sur
 * six titres de section, contrôle vert. La distinction ne peut venir que d'une
 * déclaration explicite du traducteur.
 *
 * Le commentaire de traducteur (« # texte ») est le seul canal qui survit :
 * po4a réécrit à chaque build les commentaires extraits (« #. »), les
 * références (« #: ») et les drapeaux (« #, »), mais préserve celui-là — à
 * condition qu'il soit en tête de bloc, avant « #. type: » : c'est l'ordre
 * dans lequel po4a réémet ses propres commentaires (Po.pm), donc le seul qui
 * fasse du fichier un point fixe une fois la source anglaise modifiée. Posé
 * ailleurs dans le bloc, il migre à la prochaine régénération et produit un
 * diff sans contenu changé. */
const PO_STRING = /^"(.*)"$/;

export function parsePoEntries(poText) {
  const entries = [];
  let cur = null;
  let field = null;
  let lineNo = 0;

  const newEntry = () => ({ translatorComments: [], msgid: '', msgstr: '', line: lineNo });
  const flush = () => {
    if (cur && cur.msgid !== '') entries.push(cur);
    cur = null;
    field = null;
  };

  for (const raw of poText.split('\n')) {
    lineNo++;
    const line = raw.trim();

    if (line === '') { flush(); continue; }

    /* Deux blocs collés sans ligne vide (rare mais valide en PO) : une
     * entrée déjà complète (msgid rempli) suivie d'un commentaire ou d'un
     * nouveau msgid démarre la suivante. Sans ce garde, le second bloc
     * hérite silencieusement des commentaires — et donc du marqueur
     * invariant — du premier. */
    if ((line.startsWith('#') || line.startsWith('msgid ')) && cur && cur.msgid !== '') flush();

    if (line.startsWith('#')) {
      /* « # » seul est le commentaire du traducteur ; « #. », « #: », « #, »
       * et « #| » appartiennent à l'outillage et sont régénérés. */
      if (!cur) cur = newEntry();
      if (/^#[.:,|]/.test(line)) continue;
      cur.translatorComments.push(line.replace(/^#\s?/, ''));
      continue;
    }

    if (!cur) cur = newEntry();

    if (line.startsWith('msgid ')) {
      field = 'msgid';
      cur.msgid = line.slice(6).match(PO_STRING)?.[1] ?? '';
    } else if (line.startsWith('msgstr ')) {
      field = 'msgstr';
      cur.msgstr = line.slice(7).match(PO_STRING)?.[1] ?? '';
    } else if (field) {
      const part = line.match(PO_STRING)?.[1];
      if (part !== undefined) cur[field] += part;
    }
  }
  flush();
  return entries;
}

/* Marqueur strict : « invariant: » collé, une raison non vide après. Marqueur
 * tolérant : la même intention avec la ponctuation française naturelle dans
 * un fichier tout en français (espace avant le deux-points), avec ou sans
 * raison. Un commentaire qui matche le tolérant mais pas le strict est une
 * faute de frappe silencieuse : sans la distinguer de « pas de marqueur du
 * tout », le message dirait « ajoutez un commentaire » à quelqu'un qui en a
 * déjà écrit un. Et un « invariant: » sans rien derrière n'est pas la même
 * faute qu'un « invariant : » mal ponctué : l'un manque une raison, l'autre
 * une correction typographique — deux messages différents, sinon celui qui
 * lit « deux-points collé au mot » sur un deux-points déjà collé ne sait pas
 * quoi corriger. */
const INVARIANT_STRICT = /^invariant:\s*\S/;
const INVARIANT_NO_REASON = /^invariant\s*:\s*$/i;
const INVARIANT_LOOSE_WITH_REASON = /^invariant\s*:\s*\S/i;

const truncate = (s) => (s.length > 60 ? `${s.slice(0, 60)}…` : s);
const norm = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

/* Une entrée dont la traduction répète la source doit dire pourquoi.
 * Sans cette déclaration, « traduit à l'identique » et « pas encore traduit »
 * rendent le même texte et passent le même contrôle.
 *
 * expectedCount est obligatoire, pas une option qu'on oublie de brancher :
 * un compte indépendant (les lignes « #. » du catalogue, hors filtrage) que
 * l'appelant doit fournir explicitement. Si parsePoEntries régressait au
 * point de renvoyer [], la boucle ne produirait aucun problème et le
 * contrôle serait vert par accident — retirer le câblage dans l'appelant
 * ferait alors échouer chaque appel avec un TypeError, pas disparaître en
 * silence : un paramètre que l'appelant ne peut pas omettre.
 *
 * Le garde-fou de compte est le seul problème bloquant que cette fonction
 * produit — il dit que le contrôle lui-même n'est plus fiable. Les quatre cas
 * de marqueur sont des observations : « déclarer pourquoi une traduction
 * recopie sa source » est une convention de rédaction, et l'anglais qui
 * fuirait réellement dans une page française est attrapé, lui, par
 * checkCatalogueCoverage. */
export function checkInvariantMarkers(entries, { poPath = 'courses/po/fr.po', expectedCount } = {}) {
  if (!Number.isInteger(expectedCount)) {
    throw new TypeError("checkInvariantMarkers requiert expectedCount : un compte indépendant du nombre d'entrées attendu, pour qu'un débranchement du garde-fou anti-extinction lève une erreur plutôt que de désactiver le contrôle en silence.");
  }

  const problems = [];
  const notices = [];

  if (entries.length !== expectedCount) {
    problems.push(`${poPath} — ${entries.length} entrée(s) lue(s) par parsePoEntries contre ${expectedCount} attendue(s) (compte indépendant) : le parseur a peut-être régressé, ce contrôle n'est plus fiable tant que l'écart n'est pas expliqué.`);
  }

  for (const e of entries) {
    if (norm(e.msgstr) === '') continue;

    const strict = e.translatorComments.some((c) => INVARIANT_STRICT.test(c));
    const noReason = e.translatorComments.some((c) => INVARIANT_NO_REASON.test(c));
    const looseWithReason = e.translatorComments.some((c) => INVARIANT_LOOSE_WITH_REASON.test(c));
    const malformedPunctuation = looseWithReason && !strict;
    const identical = norm(e.msgid) === norm(e.msgstr);

    if (noReason) {
      notices.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : marqueur « invariant: » sans raison, compléter « # invariant: <raison> ».`);
      continue;
    }
    if (malformedPunctuation) {
      notices.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : marqueur « invariant » mal formé, orthographe attendue « # invariant: <raison> » (deux-points collé au mot, une espace puis la raison).`);
      continue;
    }
    if (identical && !strict) {
      notices.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : la traduction répète la source. Si c'est voulu, ajouter un commentaire « # invariant: <raison> » en tête du bloc, avant « #. type: » ; sinon, traduire.`);
    }
    if (!identical && strict) {
      notices.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : marqueur « invariant: » sur une entrée qui n'est plus une recopie, le retirer.`);
    }
  }
  return { problems, notices };
}

/* Le catalogue est-il en phase avec la source anglaise ?
 * Le défaut attrapé, reproduit sur le dépôt réel : un paragraphe anglais
 * modifié sans rejouer build:courses laisse un segment que fr.po ne contient
 * pas. po4a retombe alors sur l'anglais dans le rendu français, et comme
 * --no-update interdit de toucher au catalogue, il n'y a ni entrée fuzzy ni
 * entrée vide à signaler : sans cette vérification, le contrôle est vert avec
 * de la prose anglaise dans le fichier français.
 *
 * Le sens de l'inclusion compte : tout segment de la source doit exister dans
 * le catalogue. L'inverse est licite — une entrée que la source n'a plus est
 * un vestige, pas une dérive. */
export function checkCatalogueCoverage({ potEntries, poEntries }) {
  const known = new Set(poEntries.map((e) => e.msgid));
  const problems = [];
  for (const e of potEntries) {
    if (e.msgid === '' || known.has(e.msgid)) continue;
    problems.push(`courses/po/fr.po — le segment « ${truncate(e.msgid)} » existe dans la source mais pas dans le catalogue : lancer « npm run build:courses », puis traduire les entrées ajoutées.`);
  }
  return { problems };
}

/* Les deux options dont dépend build:courses, qui rend en place dans le dépôt
 * (contrairement au contrôle, qui rend dans une copie isolée et est
 * fail-closed sur ces options : sans elles, courses/fr/ y est simplement vide
 * ou incomplet au départ, donc chaque fichier attendu ressort comme absent du
 * rendu isolé — vérifié en pratique, --keep 0 seul y produit bien la cible).
 *
 * --keep 0 vit dans [options] de courses/po4a.conf : sans lui, po4a supprime
 * la cible sous 80 % de traduction. --force n'y vit délibérément pas : posé
 * dans [options], il ferait réécrire courses.pot à chaque build même sans
 * rien à régénérer — l'idempotence que ce garde protège justement. --force
 * est donc passé en argument explicite, et sa propriété vit désormais dans le
 * script build:courses de package.json plutôt que dans la conf : sans lui,
 * po4a ne régénère pas un document traduit plus récent que ses sources, sur
 * un clone frais où les horodatages sont égaux. Ces deux endroits sont le
 * point de défaillance unique du build en place ; ils ne doivent pas pouvoir
 * disparaître en silence. */
export function checkPo4aOptions({ confText, buildScript }) {
  const line = confText.split('\n').filter((l) => l.startsWith('[options]')).join(' ');
  const problems = [];
  if (!/--force\b/.test(buildScript ?? '')) problems.push('package.json — le script build:courses doit porter --force, sans quoi po4a ne régénère pas un rendu plus récent que sa source sur un clone frais (npm run build:courses).');
  if (!/--keep\s+0\b/.test(line)) problems.push('courses/po4a.conf — la ligne [options] doit porter --keep 0, sans quoi po4a supprime la traduction sous 80 % de complétude (npm run build:courses).');
  return { problems };
}

/* Les pages anglaises publiées sous en/ ne sont atteignables que par le
 * sélecteur de langue, dont la source unique est le littéral TRANSLATIONS de
 * nav.js (lu par readTranslations). Le défaut que ce contrôle attrape s'est
 * produit : D3 puis D4 ont été rendues dans en/ sans y être déclarées, donc
 * publiées et inaccessibles — aucun lien du site n'y menait, et aucun
 * contrôle ne pouvait le voir puisque check-links ne suit que les liens qui
 * existent. C'est la même classe de défaut que la navbar recopiée dans chaque
 * page : une liste tenue à la main qui diverge de la réalité du disque.
 *
 * Les deux sens comptent, et ils échouent différemment : une page sans entrée
 * est du contenu injoignable, une entrée sans page est un lien mort dans le
 * sélecteur. */
export function checkEnglishPagesReconciliation({ enPages, translations }) {
  const problems = [];
  const declared = new Map(Object.entries(translations).map(([fr, en]) => [en, fr]));

  for (const page of enPages) {
    if (!declared.has(`en/${page}`)) {
      problems.push(`en/${page} — page anglaise publiée mais absente de TRANSLATIONS (nav.js) : aucun sélecteur de langue n'y mène, elle est inaccessible depuis le site`);
    }
  }
  for (const [en, fr] of declared) {
    if (!enPages.includes(en.replace(/^en\//, ''))) {
      problems.push(`nav.js — TRANSLATIONS déclare « ${fr} » → « ${en} », qui n'existe pas sur le disque : le sélecteur de langue pointe vers une page absente`);
    }
  }

  return { problems };
}

/* Un commentaire de traçabilité (<!-- src:… --> ou <!-- owns:… -->) qui fuit
 * dans une page publiée est un artefact interne visible du lecteur — le
 * stripping de tools/lib/render.mjs a échoué. Vérifié sur les pages telles
 * que rendues en mémoire par tools/check-courses.mjs, pas seulement sur un
 * fragment synthétique de test unitaire : une regex peut être correcte sur
 * un cas construit et échouer sur un vrai retour à la ligne du corpus. */
export function checkNoLeakedMetadata(pages) {
  const problems = [];
  for (const [file, html] of Object.entries(pages)) {
    if (/\bsrc:|\bowns:/.test(html)) {
      problems.push(`${file} — un commentaire de traçabilité (src:/owns:) a fui dans le HTML publié : vérifier le stripping de tools/lib/render.mjs`);
    }
  }
  return { problems };
}

/* Fraîcheur des traductions. Une entrée fuzzy (traduction périmée par une
 * modification de l'anglais) et une entrée vide sont toutes deux des
 * observations : réécrire un cours anglais sans retraduire dans le même
 * souffle est un mouvement légitime, et po4a retombe sur l'anglais en
 * attendant. Ce qui reste bloquant, c'est le renvoi devenu faux
 * (checkTaskReferenceDrift) — là le lecteur français est envoyé vers le
 * mauvais task statement, ce n'est plus un retard mais une erreur. */
export function checkTranslationCompleteness({ fuzzyFiles, untranslatedFiles, fuzzyCount, untranslatedCount }) {
  const notices = [];

  for (const file of fuzzyFiles) {
    notices.push(`${file} — traduction périmée dans fr.po après modification de l'anglais (${fuzzyCount} entrée(s) fuzzy au total) : relire et retraduire dans courses/po/fr.po.`);
  }

  for (const file of untranslatedFiles) {
    notices.push(`${file} — traduction incomplète (${untranslatedCount} entrée(s) non traduite(s) au total), retombe sur l'anglais.`);
  }

  return { notices };
}

/* po4a pré-remplit une entrée neuve avec la traduction de l'entrée existante
 * la plus proche (appariement flou de msgmerge), et la marque « fuzzy ». Sur
 * une ligne aussi répétitive que « **To test** — bank questions tagged
 * `data-task="X.Y"`. », la plus proche est celle d'un AUTRE task statement :
 * la traduction proposée renvoie alors le lecteur vers les questions d'un
 * autre domaine. Quinze cas sur les deux premiers cours, tous rattrapés à la
 * relecture — c'est-à-dire par la vigilance, sur un dépôt outillé.
 *
 * Retirer l'appariement flou (--no-fuzzy-matching) fermerait le défaut et
 * coûterait plus qu'il ne rapporte : c'est lui qui retrouve une traduction
 * quand on retouche un paragraphe existant, ce qui arrive à chaque cycle de
 * correction. Le contrôle vise donc le cas exact, où l'erreur est mécanique
 * et non une affaire de jugement : un renvoi vers un task statement dans la
 * traduction qui ne correspond pas à celui de la source.
 *
 * Comparaison par ensembles, pas par listes : une traduction peut légitimement
 * réordonner deux renvois dans une phrase. Ce qu'aucune traduction ne peut
 * faire, c'est citer un numéro que la source ne cite pas, ou en perdre un. */
/* parsePoEntries conserve l'échappement PO : dans le catalogue, un renvoi
 * s'écrit data-task=\"3.1\" et non data-task="3.1". La barre oblique inverse
 * est donc optionnelle ici — sans elle, le contrôle ne matcherait jamais rien
 * et serait vert sur tout, y compris sur les quinze cas qu'il doit attraper. */
const PO_TASK_REF = /data-task=\\?"([0-5]\.\d)\\?"/g;

const taskRefsIn = (text) => new Set([...text.matchAll(PO_TASK_REF)].map((m) => m[1]));

export function checkTaskReferenceDrift(entries, { poPath = 'courses/po/fr.po' } = {}) {
  const problems = [];

  const sorted = (set) => [...set].sort().join(', ');
  const say = (set) => (set.size ? `data-task ${sorted(set)}` : 'aucun data-task');

  for (const e of entries) {
    if (norm(e.msgstr) === '') continue;

    /* Aucun filtre sur une source sans renvoi : le cas « la source n'en cite
     * aucun, la traduction en cite un » est la même faute vue de l'autre
     * côté — po4a a rempli un paragraphe neuf avec la traduction d'une ligne
     * « À tester » voisine. L'écarter laisserait passer la moitié du défaut. */
    const source = taskRefsIn(e.msgid);
    const target = taskRefsIn(e.msgstr);
    if (sorted(source) === sorted(target)) continue;

    problems.push(`${poPath}:${e.line} — la traduction renvoie vers ${say(target)} là où la source renvoie vers ${say(source)} : appariement flou de po4a sur une entrée voisine, relire l'entrée et corriger le renvoi plutôt que retirer le drapeau fuzzy.`);
  }

  return { problems };
}

/* L'ordre est la substance : le snapshot « avant » (frBefore) doit être pris
 * avant la régénération par po4a, sinon diffRenderedFiles compare le rendu à
 * lui-même et toute dérive passe en silence. Cette fonction ne fait aucune
 * I/O — ni lecture de fichier, ni appel à po4a — pour que cet ordre soit
 * testable sans disque ni binaire externe. expectedPoEntryCount est transmis
 * tel quel à checkInvariantMarkers, qui refuse de s'exécuter sans lui.
 *
 * fuzzyFiles, untranslatedFiles, fuzzyCount et untranslatedCount n'ont
 * volontairement aucune valeur par défaut : une première version les rendait
 * optionnels, ce qui aurait désactivé le contrôle de fraîcheur des
 * traductions en silence si un appelant oubliait de les câbler — exactement
 * la classe de défaut qu'expectedPoEntryCount (ci-dessus) a été rendu
 * obligatoire pour fermer. Omettre l'un d'eux doit lever une erreur, pas
 * rendre le contrôle vert par accident. */
export function auditCorpus({
  courses, bankTasks, poEntries, expectedPoEntryCount, masters, frBefore, frAfter,
  fuzzyFiles, untranslatedFiles, fuzzyCount, untranslatedCount, enPages, translations,
}) {
  for (const [name, value] of [
    ['fuzzyFiles', fuzzyFiles],
    ['untranslatedFiles', untranslatedFiles],
    ['fuzzyCount', fuzzyCount],
    ['untranslatedCount', untranslatedCount],
    ['enPages', enPages],
    ['translations', translations],
  ]) {
    if (value === undefined) {
      throw new TypeError(`auditCorpus requiert ${name} : le débrancher désactiverait le contrôle de fraîcheur des traductions en silence plutôt que de le faire échouer bruyamment.`);
    }
  }

  const completeness = checkTranslationCompleteness({ fuzzyFiles, untranslatedFiles, fuzzyCount, untranslatedCount });
  const invariants = checkInvariantMarkers(poEntries, { expectedCount: expectedPoEntryCount });
  const structure = checkCorpus({ courses, bankTasks });

  return {
    problems: [
      ...reconcileCourseFiles({
        masters,
        enFiles: courses.map((c) => c.file),
        frFiles: Object.keys(frBefore),
      }).problems,
      ...diffRenderedFiles(frBefore, frAfter).problems,
      ...invariants.problems,
      ...checkTaskReferenceDrift(poEntries).problems,
      ...checkEnglishPagesReconciliation({ enPages, translations }).problems,
    ],
    notices: [
      ...structure.notices,
      ...invariants.notices,
      ...completeness.notices,
    ],
  };
}
