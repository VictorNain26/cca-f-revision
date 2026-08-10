/* Le détecteur de doublons fiche ↔ banque, en fonctions pures.
 *
 * Le problème qu'il traite : une auto-évaluation qui rejoue une question de la
 * banque ne teste plus rien la seconde fois. Le lecteur a déjà vu le corrigé.
 * C'est le plus coûteux sur les douze officielles, dont il n'existe que douze
 * exemplaires.
 *
 * Pourquoi l'empreinte de `questions.mjs` ne suffit pas. Elle ne retient que le
 * contenu des <code> et les valeurs chiffrées — les deux éléments qui survivent
 * à une traduction, ce pour quoi elle avait été taillée. Or la passe de
 * réécriture a modifié exactement ces deux catégories et rien d'autre :
 * `d5-q4` est passée de « 97 % » à « 94 % », situation et options intactes, et
 * son recouvrement mesuré est tombé à 0,00. Sur ce corpus, le maximum que cette
 * empreinte produit est 0,250 pour un plafond à 0,300 : le contrôle ne peut
 * plus se déclencher.
 *
 * Le renversement. On mesure ce que la réécriture paresseuse ne touche PAS.
 * `contentWords` retire les trois catégories qu'elle modifie — contenu des
 * <code>, nombres, mots-outils — et ne garde que le vocabulaire de fond. Deux
 * questions dont seuls les identifiants et les chiffres diffèrent y sortent à
 * un recouvrement proche de 1.
 *
 * La comparaison porte sur le bloc d'options, pas sur la situation. Les options
 * sont la partie qu'on réécrit le moins : elles portent l'arbitrage testé, et
 * c'est lui qu'on ne veut pas voir deux fois. Une situation neuve posée devant
 * les quatre mêmes options reste un doublon pédagogique.
 *
 * Aucune I/O ici : tout se teste sur fixtures. Le module consomme le type
 * Question de questions.mjs, options comprises (`text` et `html`).
 *
 * À FAIRE après la passe de réécriture. `OVERLAP_MAX` reste à 0,30 dans
 * question-contract.mjs alors que le corpus plafonne à 0,250 : le contrôle
 * historique ne peut pas se déclencher. Le descendre maintenant ferait échouer
 * `npm run check` sur les doublons encore présents et bloquerait le chantier.
 * Deux gestes, dans cet ordre : réécrire les paires que ce module signale,
 * puis descendre `OVERLAP_MAX` sous le maximum résiduel et brancher ce
 * contrôle-ci dans la chaîne `check`.
 */
import { overlap } from './questions.mjs';

/* Seuil retenu. Mesuré sur les 24 paires étiquetées de l'inventaire (spec
 * 2026-08-08, « Inventaire task → questions ») : à 0,20 le détecteur retrouve
 * 17 vrais doublons pour 2 fausses alertes. Monter le seuil perd des vrais
 * doublons plus vite qu'il ne gagne en précision — les paires paraphrasées
 * plafonnent bas, cf. la note sur les angles morts en fin de fichier. */
export const THRESHOLD = 0.20;

/* Les douze officielles reproduisent le guide d'examen mot à mot. Elles ne
 * peuvent pas être réécrites : quand l'une d'elles est en cause, c'est la
 * question de fiche qui doit bouger. D'où l'affichage à part.
 * Même liste que `length-tell.mjs` — sa place serait `questions.mjs`, à
 * remonter quand ce fichier-là aura cessé de bouger. */
export const OFFICIAL = new Set(Array.from({ length: 12 }, (_, i) => `pq-q${i + 1}`));

/* Mots-outils anglais : articles, déterminants, prépositions, conjonctions,
 * pronoms, auxiliaires et modaux, plus les adverbes de degré et de liaison qui
 * peuplent toutes les options sans rien en dire. Ce sont les mots qu'une
 * réécriture déplace librement — les garder ferait remonter au-dessus du seuil
 * deux questions qui n'ont en commun que d'être écrites en anglais.
 * La liste est volontairement close et courte : chaque ajout retire du signal.
 * Les termes du domaine (tool, agent, context, prompt, retry…) n'y sont PAS,
 * bien qu'ils soient fréquents — c'est leur cooccurrence qui identifie une
 * situation, et les écarter reviendrait à rendre le détecteur aveugle. */
export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'always',
  'am', 'an', 'and', 'another', 'any', 'anything', 'are', 'as', 'at', 'back',
  'be', 'because', 'been', 'before', 'being', 'below', 'best', 'both', 'but',
  'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'done', 'down',
  'during', 'each', 'either', 'else', 'enough', 'even', 'ever', 'every',
  'few', 'for', 'from', 'further', 'get', 'gets', 'give', 'gives', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'his', 'how',
  'however', 'if', 'in', 'instead', 'into', 'is', 'it', 'its', 'itself',
  'just', 'keep', 'keeps', 'least', 'less', 'let', 'like', 'made', 'make',
  'makes', 'many', 'may', 'me', 'might', 'more', 'most', 'much', 'must', 'my',
  'neither', 'never', 'new', 'no', 'nor', 'not', 'nothing', 'now', 'of', 'off',
  'on', 'once', 'one', 'only', 'onto', 'or', 'other', 'others', 'otherwise',
  'our', 'ours', 'out', 'over', 'own', 'per', 'put', 'rather', 'really',
  'same', 'she', 'should', 'since', 'so', 'some', 'still', 'such', 'take',
  'takes', 'than', 'that', 'the', 'their', 'theirs', 'them', 'then', 'there',
  'therefore', 'these', 'they', 'this', 'those', 'though', 'through', 'thus',
  'to', 'too', 'under', 'until', 'up', 'upon', 'us', 'use', 'used', 'uses',
  'very', 'via', 'was', 'we', 'well', 'were', 'what', 'when', 'where',
  'whether', 'which', 'while', 'who', 'whom', 'whose', 'why', 'will', 'with',
  'within', 'without', 'would', 'yet', 'you', 'your', 'yours',
]);

/* Un <code> et son contenu partent ensemble. Il faut la balise pour cela : dans
 * ce corpus les identifiants sont souvent des mots anglais ordinaires
 * (`tools`, `description`, `content`) qu'aucune heuristique de forme ne
 * distinguerait de la prose une fois le balisage perdu. */
const CODE_EL_RE = /<code\b[^>]*>[\s\S]*?<\/code>/gi;
const TAG_RE = /<[^>]*>/g;
const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/* Le pluriel est du bruit de surface : « one tool » et « several tools »
 * parlent du même objet. On coupe le -s final (pas le -ss : « process »,
 * « access » restent entiers). Réversible et appliqué des deux côtés, donc
 * sans effet sur la symétrie de l'indice. */
const singular = (w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/* Les mots de contenu d'un fragment. Accepte du texte brut comme du HTML : le
 * balisage, quand il est là, est ce qui permet d'isoler les <code>.
 * Retire, dans l'ordre : le contenu des <code>, le reste du balisage, tout
 * token contenant un chiffre, les mots-outils, et les tokens de moins de trois
 * lettres. */
export const contentWords = (source) => {
  const plain = String(source ?? '')
    .replace(CODE_EL_RE, ' ')
    .replace(TAG_RE, ' ')
    .replace(/&(#?\w+);/g, (m, name) => ENTITY[name.toLowerCase()] ?? ' ')
    .toLowerCase();

  const words = new Set();
  for (const raw of plain.split(/[^a-z0-9_'-]+/)) {
    const token = raw.replace(/^[''-]+|[''-]+$/g, '');
    if (!token || /\d/.test(token) || token.length < 3) continue;
    const word = singular(token);
    if (!STOP_WORDS.has(word) && !STOP_WORDS.has(token)) words.add(word);
  }
  return words;
};

/* Le bloc d'options d'une question, balisage compris. `html` est la vue utile ;
 * `text` sert de repli pour un fixture écrit à la main sans balisage. */
export const optionBlock = (q) =>
  (q.options ?? []).map((o) => o.html || o.text || '').join(' ');

// L'écho d'options : indice de Jaccard des mots de contenu des deux blocs.
export const optionEcho = (a, b) => overlap(contentWords(optionBlock(a)), contentWords(optionBlock(b)));

/* Les paires fiche ↔ banque au-dessus du seuil, les plus fortes d'abord.
 *
 * `sameTaskOnly` par défaut : 23 des 24 doublons connus portent la même
 * data-task, et la restriction ramène l'espace de recherche de 5 040 paires à
 * 174. On échange une perte quasi nulle contre un rapport qu'on peut lire en
 * entier — un rapport qu'on ne lit pas ne protège rien. Le mode complet reste
 * accessible pour une passe manuelle. */
export const suspects = (questions, { threshold = THRESHOLD, sameTaskOnly = true } = {}) => {
  const bank = questions.filter((q) => q.prefix === 'pq');
  const sheets = questions.filter((q) => q.prefix !== 'pq');
  const out = [];
  let compared = 0;

  for (const sheet of sheets) {
    for (const b of bank) {
      if (sameTaskOnly && (!sheet.task || sheet.task !== b.task)) continue;
      compared++;
      const score = optionEcho(sheet, b);
      if (score < threshold) continue;
      out.push({
        sheet: sheet.id,
        bank: b.id,
        key: `${sheet.id}|${b.id}`,
        score,
        task: b.task,
        official: OFFICIAL.has(b.id),
        sheetLabel: sheet.label,
        bankLabel: b.label,
      });
    }
  }

  out.sort((x, y) => y.score - x.score || x.key.localeCompare(y.key));
  out.compared = compared;
  return out;
};

/* Exemptions. Une paire peut être un faux positif — même task, vocabulaire de
 * domaine partagé, situations sans rapport. On l'écarte nommément, jamais en
 * baissant le seuil : baisser le seuil écarte aussi les paires qu'on n'a pas
 * regardées.
 * La justification est obligatoire et contrôlée par le contrôle lui-même. Une
 * exemption sans motif est un doublon qu'on a fait taire, et rien dans le
 * dépôt ne dirait plus lequel. */
const MIN_REASON = 20;

export const validateExemptions = (exemptions = []) => {
  const out = [];
  const seen = new Set();
  for (const [i, e] of exemptions.entries()) {
    const at = e?.sheet && e?.bank ? `${e.sheet}/${e.bank}` : `exemption #${i + 1}`;
    if (!e?.sheet || !e?.bank) {
      out.push(`${at} : paire incomplète, attendu { sheet, bank, why }`);
      continue;
    }
    const why = typeof e.why === 'string' ? e.why.trim() : '';
    if (!why) out.push(`${at} : exemption sans justification`);
    else if (why.length < MIN_REASON) {
      out.push(`${at} : justification « ${why} » trop courte (${why.length} < ${MIN_REASON} caractères)`);
    }
    const key = `${e.sheet}|${e.bank}`;
    if (seen.has(key)) out.push(`${at} : exemption en double`);
    seen.add(key);
  }
  return out;
};

/* Sépare les paires exemptées du reste, et signale les exemptions qui ne
 * correspondent plus à rien : une fois la question réécrite, l'exemption doit
 * disparaître avec elle, sinon elle couvrira un jour un vrai doublon. */
export const applyExemptions = (pairs, exemptions = []) => {
  const byKey = new Map(exemptions.map((e) => [`${e.sheet}|${e.bank}`, e]));
  const reported = [];
  const exempted = [];
  for (const p of pairs) {
    const e = byKey.get(p.key);
    if (e) exempted.push({ ...p, why: e.why });
    else reported.push(p);
  }
  const stale = exemptions.filter((e) => !pairs.some((p) => p.key === `${e.sheet}|${e.bank}`));
  return { reported, exempted, stale };
};
