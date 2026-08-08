/* Les règles du contrat de question, en fonctions pures.
 * Le contrôle porte sur la structure, jamais sur la justesse d'une réponse :
 * celle-ci se recoupe à la main contre le guide et la doc, et se consigne au
 * journal. Ce qui est automatisable ici, c'est l'oubli.
 * Détection du français : liste de mots-outils dont la forme n'existe pas en
 * anglais, plus les caractères accentués. Même parti pris que
 * check-diacritics.mjs — peu de faux positifs, liste incomplète par
 * construction, qui se complète quand une coquille passe.
 */
const LETTERS = ['a', 'b', 'c', 'd', 'e'];

export const FRENCH_MARKERS =
  /\b(?:le|la|les|des|une|dans|pour|qui|que|pas|avec|sur|est|sont|leur|leurs|cette|ces|donc|mais|aux|par|du|ses|elle|ils|elles|nous|vous|plus|tout|toute|toutes|tous|alors|ainsi|entre|sans|sous|chaque|quand|lorsque|parce|afin|selon|vers|depuis|jusqu|ou|où)\b/i;

const ACCENTS = /[àâäçéèêëîïôöùûüÿœæ]/i;

const proseOf = (q) => q.prose;

export const checkQuestion = (q) => {
  const out = [];
  const say = (msg) => out.push(`${q.file} :: ${q.label.slice(0, 52)} — ${msg}`);

  // id
  if (!q.id || !new RegExp(`^${q.prefix}-q\\d+$`).test(q.id)) {
    say(`id « ${q.id ?? '(absent)'} » hors schéma, attendu ${q.prefix}-q<n>`);
  }

  // domaine
  if (!q.domain || !/^D[0-5]$/.test(q.domain)) {
    say(`domaine « ${q.domain ?? '(absent)'} » invalide`);
  } else if (q.prefix !== 'pq' && q.domain.toLowerCase() !== q.prefix) {
    say(`domaine ${q.domain} incohérent avec la fiche ${q.prefix.toUpperCase()}`);
  }

  // task
  if (!q.task || !/^\d\.\d+$/.test(q.task)) {
    say(`task « ${q.task ?? '(absente)'} » invalide`);
  } else if (q.citedTask && q.citedTask !== q.task) {
    say(`data-task ${q.task} contredit la task ${q.citedTask} citée en prose`);
  }

  // options
  if (q.options.length < 4 || q.options.length > 5) {
    say(`${q.options.length} options, attendu 4 ou 5`);
  }
  const expected = LETTERS.slice(0, q.options.length);
  const actual = q.options.map((o) => o.opt);
  if (actual.join(',') !== expected.join(',')) {
    say(`data-opt ${JSON.stringify(actual)}, attendu ${JSON.stringify(expected)}`);
  }
  for (const o of q.options) {
    if (o.opt && o.letterInText && o.letterInText.toLowerCase() !== o.opt) {
      say(`lettre « ${o.letterInText}) » désaccordée du data-opt « ${o.opt} »`);
    }
  }

  // réponse
  const known = new Set(actual.filter(Boolean));
  if (q.answer.length === 0) {
    say('data-answer absent');
  }
  for (const a of q.answer) {
    if (!known.has(a)) say(`data-answer « ${a} » ne désigne aucune option`);
  }
  if (/\b[A-E]\)/.test(q.answerText)) {
    say(`lettre en dur dans le corrigé : « ${q.answerText.slice(0, 40)} »`);
  }

  // explications
  const wrong = [...known].filter((o) => !q.answer.includes(o)).sort();
  const explained = [...new Set(q.explanations)].sort();
  for (const e of explained) {
    if (!known.has(e)) say(`explication « ${e} » ne désigne aucune option`);
    else if (q.answer.includes(e)) say(`explication visant la bonne réponse « ${e} »`);
  }
  const missing = wrong.filter((o) => !explained.includes(o));
  if (missing.length) say(`distracteur(s) sans explication : ${missing.join(', ')}`);

  // langue
  const prose = proseOf(q);
  if (FRENCH_MARKERS.test(prose) || ACCENTS.test(prose)) {
    say(`français dans le bloc quiz : « ${prose.slice(0, 50)} »`);
  }

  return out;
};
