/* L'indice de longueur, en fonctions pures.
 * Dans ce corpus la bonne réponse était plus longue que ses distracteurs : un
 * candidat qui coche l'option la plus longue sans rien lire franchissait le
 * seuil de l'examen. C'est un signal de forme, absent le jour J, qui gonfle le
 * score d'entraînement. Ce module le mesure ; il ne corrige rien.
 *
 * La mesure généralise la stratégie aveugle plutôt que d'en énumérer quelques
 * variantes, et c'est délibéré : chaque version antérieure a été contournée par
 * une correction qui visait le compteur.
 *   - Une première passe avait aligné la clé au mot près sur le distracteur le
 *     plus long : le compteur de mots ne discriminait plus, l'indice restait
 *     lisible à l'œil (la clé restait la plus longue en caractères).
 *   - Mesurer « la plus longue » et « la plus courte » sous les deux métriques
 *     aurait laissé un trou évident : une correction plaçant systématiquement
 *     la clé en DEUXIÈME position de longueur sortait à zéro sur les quatre
 *     heuristiques tout en restant parfaitement devinable.
 * D'où la forme retenue : « toujours cocher la k-ième option la plus longue »,
 * pour tout k et sous chaque métrique. Le verdict porte sur la meilleure de ces
 * stratégies — littéralement, le score du meilleur candidat qui ne lit rien et
 * ne regarde que la longueur. Aucun rang n'est privilégié, donc aucun rang
 * n'offre de refuge : la cible ne peut être atteinte qu'en rendant la longueur
 * non informative. Les quatre heuristiques d'extrémité restent exportées comme
 * lignes de diagnostic, parce qu'elles se lisent d'un coup d'œil.
 *
 * `tieConcentration` complète le dispositif. Quand la clé se retrouve à égalité
 * au sommet dans la quasi-totalité des égalités du corpus, ce n'est pas du
 * hasard : c'est la signature d'une optimisation contre l'instrument, la clé
 * ayant été poussée jusqu'à toucher le maximum sans le dépasser. Une part
 * élevée (le corpus a connu 33 égalités sur 37 contenant la clé) se lit comme
 * un avertissement sur la mesure elle-même, pas comme un résultat.
 *
 * Les fonctions consomment le type Question de questions.mjs, enrichi d'un
 * champ `text` par option — le texte brut du <p>, préfixe « A) » compris. La
 * lecture du DOM reste au CLI : ici, aucune I/O, tout est testable sur
 * fixtures.
 */

// Le préfixe « A) » est un artefact de présentation, pas du contenu : il pèse
// autant sur les quatre options et ne dit rien de leur longueur relative.
const OPTION_PREFIX_RE = /^\s*[A-E]\)\s*/;

// Plafond de ratio clé/distracteurs par question. Diagnostic seul : il repère
// une question isolément déséquilibrée, mais une question peut le respecter et
// rester parfaitement devinable. Il ne porte plus le verdict.
export const CEILING = 1.35;

// Le verdict. Le hasard est à 25 % sur quatre options ; 35 % laisse une marge
// de tolérance statistique sans laisser passer un indice exploitable — à ce
// niveau, la stratégie aveugle reste très en dessous des 72 % de l'examen.
export const MAX_BLIND_RATE = 0.35;

/* Effectif minimal pour qu'une stratégie de rang porte le verdict. Un rang k
 * n'existe que sur les questions à au moins k options : dans un corpus à
 * quatre options, un rang 5 se mesurerait sur une poignée de questions et
 * afficherait un taux ininterprétable. À n = 30, l'erreur-type d'un taux autour
 * du hasard vaut environ 8 points — l'écart de 10 points entre 25 % et le seuil
 * tient à peine dans une erreur-type. En dessous, le taux ne distingue pas un
 * indice exploitable d'un bruit d'échantillonnage : mesuré et affiché, jamais
 * décisif. */
export const MIN_RANK_SAMPLE = 30;

// Les douze questions officielles reproduisent mot à mot le guide d'examen.
// Leur indice de longueur est celui de la source : le corriger falsifierait la
// référence. Mesurées et affichées, jamais comptées dans le verdict.
export const OFFICIAL = new Set(
  Array.from({ length: 12 }, (_, i) => `pq-q${i + 1}`)
);

const stripped = (text) => (text ?? '').replace(OPTION_PREFIX_RE, '').replace(/\s+/g, ' ').trim();

export const wordCount = (text) => stripped(text).split(/\s+/).filter(Boolean).length;

// Longueur visuelle, espaces compris : c'est le pavé de texte que l'œil compare
// d'une option à l'autre. Deux options de même nombre de mots peuvent différer
// du simple au double en caractères — la métrique que l'alignement au mot près
// laissait intacte.
export const charCount = (text) => stripped(text).length;

const MEASURES = { words: wordCount, chars: charCount };

export const METRICS = ['words', 'chars'];

const metricLabel = (metric) => (metric === 'words' ? 'mots' : 'caractères');
const ordinal = (k) => (k === 1 ? '1re' : `${k}e`);

/* Une stratégie de rang : « toujours cocher la k-ième option la plus longue ».
 * k = 1 est « la plus longue », k = nombre d'options est « la plus courte ». */
export const rankStrategy = (rank, metric) => ({
  id: `rank${rank}-${metric}`,
  kind: 'rank',
  rank,
  metric,
  label: `la ${ordinal(rank)} plus longue en ${metricLabel(metric)}`,
});

/* Les quatre stratégies d'extrémité, conservées pour l'affichage : elles se
 * lisent sans référence à un rang. Leur départage des égalités diffère de celui
 * des rangs (voir `selection`), ce qui les rend très légèrement distinctes des
 * rangs 1 et n — l'écart ne porte que sur les ex æquo. L'ordre est significatif :
 * il départage `bestStrategy` à taux égal. */
export const HEURISTICS = [
  { id: 'longest-words', kind: 'extreme', metric: 'words', pick: 'longest', label: 'toujours la plus longue en mots' },
  { id: 'longest-chars', kind: 'extreme', metric: 'chars', pick: 'longest', label: 'toujours la plus longue en caractères' },
  { id: 'shortest-words', kind: 'extreme', metric: 'words', pick: 'shortest', label: 'toujours la plus courte en mots' },
  { id: 'shortest-chars', kind: 'extreme', metric: 'chars', pick: 'shortest', label: 'toujours la plus courte en caractères' },
];

const byId = new Map(HEURISTICS.map((h) => [h.id, h]));
const resolve = (s) => (typeof s === 'string' ? byId.get(s) : s) ?? HEURISTICS[0];

// La lettre de l'option : le data-opt fait foi, la lettre en dur dépanne les
// questions non encore migrées.
const optKey = (o) => o.opt ?? o.letterInText?.toLowerCase() ?? null;

export const optionWords = (question) => {
  const answer = new Set(question.answer ?? []);
  const keys = [];
  const distractors = [];
  for (const o of question.options ?? []) {
    const n = wordCount(o.text);
    (answer.has(optKey(o)) ? keys : distractors).push(n);
  }
  return { keys, distractors };
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// NaN quand le rapport n'a pas de sens (aucune clé, ou aucun distracteur) :
// une valeur absente vaut mieux qu'un zéro qui se moyennerait comme un chiffre.
export const ratio = (question) => {
  const { keys, distractors } = optionWords(question);
  if (!keys.length || !distractors.length) return NaN;
  return mean(keys) / mean(distractors);
};

// Seules les questions à réponse unique comptent — la stratégie aveugle ne sait
// pas combien de cases cocher. Une stratégie de rang k ne s'applique en outre
// qu'aux questions offrant au moins k options.
const applies = (question, strategy) =>
  (question.answer ?? []).length === 1 &&
  (strategy.kind !== 'rank' || (question.options?.length ?? 0) >= strategy.rank);

const scope = (questions, strategy) => (questions ?? []).filter((q) => applies(q, strategy));

/* L'option que la stratégie coche, et toutes celles qui lui sont ex æquo sous
 * la métrique.
 *
 * Départage des égalités, déterministe et reproductible — un tirage au sort
 * rendrait la mesure incomparable d'une exécution à l'autre, donc inutilisable
 * comme repère de progression :
 *   - rang k : tri par longueur décroissante, l'ordre du document départageant
 *     les ex æquo, puis on prend le k-ième. Sur une égalité, le rang haut
 *     revient donc à la première option du document et le rang bas à la
 *     dernière.
 *   - extrémité : la première option extrême dans l'ordre du document, aux deux
 *     bouts. Convention favorable au corpus du côté « la plus courte », où elle
 *     diffère du rang n.
 * `blindBounds` chiffre ce que le résultat doit à cette convention.
 */
const selection = (question, strategy) => {
  const size = MEASURES[strategy.metric];
  const values = question.options.map((o) => size(o.text));

  let value;
  let picked;
  if (strategy.kind === 'rank') {
    const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v || a.i - b.i);
    ({ v: value, i: picked } = order[strategy.rank - 1]);
  } else {
    const wins = strategy.pick === 'shortest' ? (a, b) => a < b : (a, b) => a > b;
    value = values[0];
    for (const v of values) if (wins(v, value)) value = v;
    picked = values.indexOf(value);
  }

  const tied = values.flatMap((v, i) => (v === value ? [i] : []));
  return {
    picked,
    tied,
    hit: optKey(question.options[picked]) === question.answer[0],
    keyAmong: tied.some((i) => optKey(question.options[i]) === question.answer[0]),
  };
};

/* Stratégie aveugle : cocher une option sur son seul rang de longueur, sans
 * lire l'énoncé. `total` est l'effectif sur lequel la stratégie est définie, et
 * il doit être lu avec le taux : un rang mesuré sur trois questions ne dit
 * rien. */
export const blindScore = (questions, strategy = HEURISTICS[0]) => {
  const s = resolve(strategy);
  const single = scope(questions, s);
  let hits = 0;
  let chanceSum = 0;

  for (const q of single) {
    if (selection(q, s).hit) hits++;
    chanceSum += q.options.length ? 1 / q.options.length : 0;
  }

  const total = single.length;
  return {
    hits,
    total,
    rate: total ? hits / total : 0,
    chance: total ? chanceSum / total : 0,
  };
};

/* Le plus grand nombre d'options rencontré : au-delà, aucun rang n'existe. */
const widest = (questions) =>
  (questions ?? []).reduce((n, q) => ((q.answer ?? []).length === 1 ? Math.max(n, q.options?.length ?? 0) : n), 0);

/* Toutes les stratégies de rang que le corpus permet de mesurer, par métrique
 * puis par rang croissant. `eligible` dit si l'effectif autorise un verdict. */
export const rankProfile = (questions) => {
  const rows = [];
  const ranks = widest(questions);
  for (const metric of METRICS) {
    for (let rank = 1; rank <= ranks; rank++) {
      const strategy = rankStrategy(rank, metric);
      const score = blindScore(questions, strategy);
      rows.push({ ...strategy, ...score, eligible: score.total >= MIN_RANK_SAMPLE });
    }
  }
  return rows;
};

/* Les quatre extrémités, dans l'ordre de HEURISTICS. Diagnostic. */
export const blindProfile = (questions) =>
  HEURISTICS.map((h) => ({ ...h, ...blindScore(questions, h), eligible: true }));

/* Le verdict : le meilleur score qu'un candidat obtient sans rien lire, tous
 * rangs et toutes métriques confondus. Les rangs sous l'effectif minimal sont
 * écartés — ils sont affichés, jamais décisifs. Les extrémités entrent aussi
 * dans la comparaison : leur départage diffère de celui des rangs, elles
 * pourraient donc, sur des ex æquo, faire mieux qu'eux. À taux égal, l'ordre
 * de génération l'emporte (rangs par métrique puis par rang, extrémités
 * ensuite) — déterministe. */
export const bestStrategy = (questions) => {
  const pool = [...rankProfile(questions), ...blindProfile(questions)].filter((s) => s.eligible);
  if (!pool.length) return null;
  return pool.reduce((best, s) => (s.rate > best.rate ? s : best), pool[0]);
};

/* Encadrement du taux quand on fait varier la seule convention de départage :
 * `floor` n'accorde la touche que si la clé est seule à sa longueur (toute
 * égalité est un raté), `ceil` l'accorde dès que la clé est parmi les ex æquo.
 * L'écart entre les deux mesure la part du résultat qui tient à la convention
 * plutôt qu'au contenu ; large, il invite à lire `tieConcentration` avant le
 * taux. */
export const blindBounds = (questions, strategy = HEURISTICS[0]) => {
  const s = resolve(strategy);
  const single = scope(questions, s);
  let floor = 0;
  let ceil = 0;

  for (const q of single) {
    const { tied, keyAmong } = selection(q, s);
    if (keyAmong) {
      ceil++;
      if (tied.length === 1) floor++;
    }
  }

  const total = single.length;
  return {
    total,
    rate: blindScore(single, s).rate,
    floor: total ? floor / total : 0,
    ceil: total ? ceil / total : 0,
  };
};

/* Les questions que la stratégie touche, de la plus flagrante à la plus
 * marginale. `margin` est la distance de la clé à l'option la plus proche sous
 * la métrique : c'est de combien il faudrait la modifier pour lui faire perdre
 * son rang. 0 signale une touche gagnée par le seul départage, une valeur
 * élevée un indice visible à l'œil nu. C'est la liste de travail du correcteur.
 * Tri déterministe : marge décroissante, puis identifiant. */
export const blindHits = (questions, strategy = HEURISTICS[0]) => {
  const s = resolve(strategy);
  const size = MEASURES[s.metric];
  const hits = [];

  for (const q of scope(questions, s)) {
    const { picked, hit } = selection(q, s);
    if (!hit) continue;
    const key = size(q.options[picked].text);
    const gaps = q.options
      .filter((_, i) => i !== picked)
      .map((o) => Math.abs(key - size(o.text)));
    hits.push({ question: q, margin: gaps.length ? Math.min(...gaps) : 0 });
  }

  return hits.sort((a, b) => b.margin - a.margin || String(a.question.id).localeCompare(String(b.question.id)));
};

/* Concentration des égalités : parmi les questions dont l'option cochée est ex
 * æquo avec au moins une autre, la part de celles où la clé est du nombre. Le
 * hasard placerait la clé dans une minorité d'entre elles ; une part proche de
 * 1 signale que les options ont été alignées SUR le compteur, pas équilibrées
 * entre elles. C'est l'indicateur qui a manqué la première fois. */
export const tieConcentration = (questions, strategy = HEURISTICS[0]) => {
  const s = resolve(strategy);
  let ties = 0;
  let withKey = 0;

  for (const q of scope(questions, s)) {
    const { tied, keyAmong } = selection(q, s);
    if (tied.length < 2) continue;
    ties++;
    if (keyAmong) withKey++;
  }

  return { ties, withKey, rate: ties ? withKey / ties : 0 };
};
