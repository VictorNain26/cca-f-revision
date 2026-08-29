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
 * Angle mort assumé : rien ici ne juge la justesse du contenu. Un cours faux
 * mais bien formé passe. Et un cours qui redéveloppe une notion sans poser le
 * marqueur owns passe aussi — le marqueur rend la convention falsifiable, il
 * ne la fait pas respecter. */
export function checkCorpus({ courses, bankTasks, delivered }) {
  const problems = [];
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
        problems.push(`${course.file}:${s.line} — section « ${s.title} » sans src : ajouter <!-- src:référence -->, affirmation non traçable`);
      }

      if (s.ts) {
        if (seenTs.has(s.ts)) {
          problems.push(`${course.file}:${s.line} — task statement ${s.ts} déjà couvert par la section à la ligne ${seenTs.get(s.ts)} : une section par task statement`);
        } else {
          seenTs.set(s.ts, s.line);
        }
      }

      for (const bad of s.ownsMalformed) {
        problems.push(`${course.file}:${s.line} — marqueur owns malformé « ${bad} », attendu <!-- owns:slug-en-minuscules -->`);
      }

      for (const concept of s.owns) {
        const owner = OWNED_CONCEPTS[concept];
        if (owner === undefined) {
          problems.push(`${course.file}:${s.line} — notion inconnue « ${concept} », absente de OWNED_CONCEPTS : l'y ajouter ou corriger le marqueur owns`);
          continue;
        }
        if (owner !== course.id) {
          problems.push(`${course.file}:${s.line} — « ${concept} » appartient au domaine ${owner}, revendiqué par le domaine ${course.id} : retirer le marqueur owns ou déplacer la section dans le domaine ${owner}`);
        }
        const claim = `${course.file}:${s.line}`;
        if (claimed.has(concept)) {
          problems.push(`${claim} — « ${concept} » déjà revendiqué par ${claimed.get(concept)} : ne garder le marqueur owns qu'à un seul endroit`);
        } else {
          claimed.set(concept, claim);
        }
      }
    }

    if (delivered.includes(course.id)) {
      const covered = coveredByDomain.get(course.id) ?? new Set();
      for (const s of sections) if (s.ts) covered.add(s.ts);
      coveredByDomain.set(course.id, covered);

      const files = filesByDomain.get(course.id) ?? [];
      files.push(course.file);
      filesByDomain.set(course.id, files);
    }

    for (const m of course.markdown.matchAll(REFERENCED_TASK)) {
      const ts = m[1];
      if (!bankTasks.has(ts)) {
        const line = course.markdown.slice(0, m.index).split('\n').length;
        problems.push(`${course.file}:${line} — renvoi vers data-task="${ts}", absent de la banque : corriger la référence ou l'ajouter à Practice_Questions.html`);
      }
    }
  }

  for (const [id, covered] of coveredByDomain) {
    const expected = TASK_STATEMENTS.filter((ts) => ts.startsWith(`${id}.`));
    const missing = expected.filter((ts) => !covered.has(ts));
    if (missing.length) {
      const files = filesByDomain.get(id).join(', ');
      problems.push(`${files} — task statements sans section : ${missing.join(', ')} : ajouter une section <!-- ts:... --> pour chacun`);
    }
  }

  return { problems };
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

const FILENAME_ID = /^\d?(\d)-/;

/* Le domaine d'un cours vient du préfixe numérique de son nom de fichier,
 * zero-paddé sur deux chiffres (00-…, 01-…, 05-…) pour trier correctement à
 * plat dans un répertoire. f.slice(0, 1) accepterait n'importe quel premier
 * caractère — annexe.md donnerait un id 'a' qui ne correspond à aucun
 * domaine et passerait en silence dans toute comparaison avec delivered ou
 * course.id — et capturerait, pour 01-…, le zéro de padding plutôt que le
 * chiffre du domaine. Le premier chiffre est donc optionnel et non capturé
 * (\d?), seul le dernier avant le tiret l'est : ça reste correct aussi bien
 * pour un futur nom sans padding que pour le padding à deux chiffres réel.
 * null distingue explicitement « pas de domaine reconnaissable ». */
export function courseIdFromFilename(filename) {
  return filename.match(FILENAME_ID)?.[1] ?? null;
}

const DELIVERY_ROW = /^\|\s*(✅|)\s*\|\s*D(\d)\s*\|/gm;

/* Les cours annoncés livrés dans courses/README.md, repérés par une case
 * cochée en début de ligne de tableau : | ✅ | D1 | … Une ligne sans coche
 * compte comme non livrée mais valide le format de tableau reconnu ;
 * `recognized` distingue un texte qui ne contient aucune ligne de tableau
 * (le format a dérivé, la Task 6 a changé l'ordre des colonnes) d'un corpus
 * où rien n'est encore livré. Sans cette distinction les deux retournent []
 * en silence, alors que le premier cas doit lever un problème : c'est le
 * garde-fou qui protège le reste du dispositif contre lui-même. */
export function readDelivered(readmeText) {
  const rows = [...readmeText.matchAll(DELIVERY_ROW)];
  return {
    delivered: rows.filter((m) => m[1] === '✅').map((m) => m[2]),
    recognized: rows.length > 0,
  };
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
 * silence. Même intention que readDelivered/recognized, portée différemment
 * : là un drapeau dans le retour que l'appelant ne peut pas ignorer, ici un
 * paramètre que l'appelant ne peut pas omettre. */
export function checkInvariantMarkers(entries, { poPath = 'courses/po/fr.po', expectedCount } = {}) {
  if (!Number.isInteger(expectedCount)) {
    throw new TypeError("checkInvariantMarkers requiert expectedCount : un compte indépendant du nombre d'entrées attendu, pour qu'un débranchement du garde-fou anti-extinction lève une erreur plutôt que de désactiver le contrôle en silence.");
  }

  const problems = [];

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
      problems.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : marqueur « invariant: » sans raison, compléter « # invariant: <raison> ».`);
      continue;
    }
    if (malformedPunctuation) {
      problems.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : marqueur « invariant » mal formé, orthographe attendue « # invariant: <raison> » (deux-points collé au mot, une espace puis la raison).`);
      continue;
    }
    if (identical && !strict) {
      problems.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : la traduction répète la source. Si c'est voulu, ajouter un commentaire « # invariant: <raison> » en tête du bloc, avant « #. type: » ; sinon, traduire.`);
    }
    if (!identical && strict) {
      problems.push(`${poPath}:${e.line} — « ${truncate(e.msgid)} » : marqueur « invariant: » sur une entrée qui n'est plus une recopie, le retirer.`);
    }
  }
  return { problems };
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

/* Le cœur de la promesse de courses/README.md (« un cours coché est annoncé
 * complet ») : une entrée fuzzy (traduction périmée par une modification de
 * l'anglais) bloque toujours, quel que soit le statut de livraison — une
 * traduction périmée est fausse, pas seulement incomplète. Une entrée vide
 * ne bloque que pour un cours annoncé livré dans courses/README.md ; sur un
 * cours non livré, po4a retombe sur l'anglais et c'est attendu, donc un
 * avis (notices), pas un problème. */
export function checkTranslationCompleteness({ fuzzyFiles, untranslatedFiles, delivered, fuzzyCount, untranslatedCount }) {
  const problems = [];
  const notices = [];

  for (const file of fuzzyFiles) {
    problems.push(`${file} — traduction périmée dans fr.po après modification de l'anglais (entrée fuzzy) : ${fuzzyCount} entrée(s) fuzzy au total, relire et retraduire dans courses/po/fr.po`);
  }

  for (const file of untranslatedFiles) {
    const id = courseIdFromFilename(file.split('/').pop());
    if (id !== null && delivered.includes(id)) {
      problems.push(`${file} — annoncé livré dans courses/README.md mais sa traduction est incomplète (${untranslatedCount} entrée(s) non traduite(s) au total) : compléter courses/po/fr.po avant de livrer`);
    } else {
      notices.push(`${file} — traduction incomplète (${untranslatedCount} entrée(s) non traduite(s) au total), retombe sur l'anglais (cours non annoncé livré).`);
    }
  }

  return { problems, notices };
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
  courses, bankTasks, delivered, poEntries, expectedPoEntryCount, masters, frBefore, frAfter,
  fuzzyFiles, untranslatedFiles, fuzzyCount, untranslatedCount,
}) {
  for (const [name, value] of [
    ['fuzzyFiles', fuzzyFiles],
    ['untranslatedFiles', untranslatedFiles],
    ['fuzzyCount', fuzzyCount],
    ['untranslatedCount', untranslatedCount],
  ]) {
    if (value === undefined) {
      throw new TypeError(`auditCorpus requiert ${name} : le débrancher désactiverait le contrôle de fraîcheur des traductions en silence plutôt que de le faire échouer bruyamment.`);
    }
  }

  const completeness = checkTranslationCompleteness({ fuzzyFiles, untranslatedFiles, delivered, fuzzyCount, untranslatedCount });
  return {
    problems: [
      ...checkCorpus({ courses, bankTasks, delivered }).problems,
      ...reconcileCourseFiles({
        masters,
        enFiles: courses.map((c) => c.file),
        frFiles: Object.keys(frBefore),
      }).problems,
      ...diffRenderedFiles(frBefore, frAfter).problems,
      ...checkInvariantMarkers(poEntries, { expectedCount: expectedPoEntryCount }).problems,
      ...completeness.problems,
    ],
    notices: completeness.notices,
  };
}
