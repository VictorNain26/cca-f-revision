/* L'indice de longueur, en fonctions pures.
 * Dans ce corpus la bonne réponse est plus longue que ses distracteurs : un
 * candidat qui coche l'option la plus longue sans rien lire franchit le seuil
 * de l'examen. C'est un signal de forme, absent le jour J, qui gonfle le score
 * d'entraînement. Ce module le mesure ; il ne corrige rien.
 *
 * Les fonctions consomment le type Question de questions.mjs, enrichi d'un
 * champ `text` par option — le texte brut du <p>, préfixe « A) » compris. La
 * lecture du DOM reste au CLI : ici, aucune I/O, tout est testable sur
 * fixtures.
 */

// Le préfixe « A) » est un artefact de présentation, pas du contenu : il pèse
// autant sur les quatre options et ne dit rien de leur longueur relative.
const OPTION_PREFIX_RE = /^\s*[A-E]\)\s*/;

export const CEILING = 1.35;

// Les douze questions officielles reproduisent mot à mot le guide d'examen.
// Leur indice de longueur est celui de la source : le corriger falsifierait la
// référence. Mesurées et affichées, jamais comptées dans le verdict.
export const OFFICIAL = new Set(
  Array.from({ length: 12 }, (_, i) => `pq-q${i + 1}`)
);

export const wordCount = (text) =>
  (text ?? '')
    .replace(OPTION_PREFIX_RE, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

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

/* Stratégie aveugle : cocher l'option la plus longue sans lire l'énoncé.
 * Départage des égalités : la première option la plus longue dans l'ordre du
 * document. Choix déterministe et reproductible — un tirage au sort rendrait la
 * mesure non comparable d'une exécution à l'autre, donc inutilisable comme
 * repère de progression. Il est aussi favorable au corpus : sur une égalité, le
 * candidat réel devrait deviner, ici on lui accorde la lettre la plus haute.
 * Seules les questions à réponse unique comptent — la stratégie ne sait pas
 * combien de cases cocher.
 */
export const blindScore = (questions) => {
  const single = (questions ?? []).filter((q) => (q.answer ?? []).length === 1);
  let hits = 0;
  let chanceSum = 0;

  for (const q of single) {
    const counts = q.options.map((o) => wordCount(o.text));
    let best = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
    if (optKey(q.options[best]) === q.answer[0]) hits++;
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
