/* Le contrat de forme des quiz d'auto-évaluation de courses/quizzes/*.json.
 * Ce module remplace le rôle que jouait tools/lib/quizzes.test.mjs : ce
 * dernier comparait D0.json au HTML de D0_API_Fundamentals.html, mais cette
 * page est désormais elle-même générée depuis D0.json (tools/render-courses.mjs)
 * — le test comparait le JSON à un rendu de lui-même, aucune de ses assertions
 * ne pouvait plus échouer.
 *
 * La fidélité de l'extraction HTML → JSON reste, elle, prouvée par le diff de
 * la branche qui l'a introduite : le bloc des six <details> est resté du
 * contexte inchangé, le round-trip est donc identique à l'octet. Ce qui reste
 * à garantir, y compris pour les questions qui naîtront directement en JSON
 * sans original HTML à comparer (lots suivants), c'est la forme : quatre
 * options a-d, une réponse parmi elles, des distracteurs couvrant exactement
 * les trois autres lettres, des id uniques et une task qui existe dans la
 * banque de questions.
 */

/* Quatre options a-d dans le cas général ; cinq a-e quand l'énoncé demande
 * plusieurs bonnes réponses (« Select the 2 correct answers »), forme déjà
 * présente dans les auto-évaluations manuscrites et gérée par quiz.js, qui lit
 * data-answer comme une liste de lettres séparées par des espaces. Un contrat
 * figé sur quatre options aurait obligé à réécrire ces questions pour les
 * faire entrer dans le corpus — c'est-à-dire à changer le contenu pour
 * satisfaire l'outil. */
const OPTION_LETTERS = ['a', 'b', 'c', 'd', 'e'];
const MIN_OPTIONS = 4;

/* data-answer porte une lettre, ou plusieurs séparées par des espaces. Source
 * unique de cette lecture : le contrôle et le rendu (tools/lib/page.mjs)
 * doivent découper la chaîne de la même façon, sinon un quiz validé ici peut
 * se rendre avec le mauvais jeu de distracteurs. */
export function answerLetters(answer) {
  return String(answer ?? '').trim().split(/\s+/).filter(Boolean);
}

/* bankTasks est optionnel : tools/lib/page.mjs appelle ce contrat avant de
 * rendre une page, sans avoir chargé Practice_Questions.html — il ne peut
 * garantir que la forme, pas l'existence de la task dans la banque. Le
 * contrôle du corpus (tools/check-courses.mjs, et le test ci-contre) passe
 * bankTasks pour couvrir aussi ce cas. */
export function checkQuizContract(quizzes, { bankTasks } = {}) {
  const problems = [];
  const seenIds = new Map();

  for (const q of quizzes) {
    const label = q.id ?? '(id absent)';
    const say = (msg) => problems.push(`${label} — ${msg}`);

    if (!q.id) {
      say('id absent');
    } else if (seenIds.has(q.id)) {
      say(`id dupliqué, déjà utilisé par ${seenIds.get(q.id)}`);
    } else {
      seenIds.set(q.id, label);
    }

    const optionKeys = Object.keys(q.options ?? {}).sort();
    const expectedOptions = OPTION_LETTERS.slice(0, Math.max(optionKeys.length, MIN_OPTIONS));
    if (optionKeys.length < MIN_OPTIONS || optionKeys.join(',') !== expectedOptions.join(',')) {
      say(`options ${JSON.stringify(optionKeys)}, attendu un préfixe contigu de ${JSON.stringify(OPTION_LETTERS)} d'au moins ${MIN_OPTIONS} lettres`);
    }

    const answers = answerLetters(q.answer);
    if (!answers.length || answers.some((letter) => !optionKeys.includes(letter))) {
      say(`answer « ${q.answer} » ne désigne aucune option`);
    }

    const expectedDistractors = optionKeys.filter((letter) => !answers.includes(letter)).sort();
    const distractorKeys = Object.keys(q.distractors ?? {}).sort();
    if (distractorKeys.join(',') !== expectedDistractors.join(',')) {
      say(`distracteurs ${JSON.stringify(distractorKeys)}, attendu ${JSON.stringify(expectedDistractors)}`);
    }

    if (bankTasks && !bankTasks.has(q.task)) {
      say(`task « ${q.task} » absente de la banque de questions (Practice_Questions.html)`);
    }
  }

  return problems;
}
