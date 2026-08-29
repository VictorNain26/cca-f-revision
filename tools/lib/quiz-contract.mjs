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

const OPTION_LETTERS = ['a', 'b', 'c', 'd'];

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
    if (optionKeys.join(',') !== OPTION_LETTERS.join(',')) {
      say(`options ${JSON.stringify(optionKeys)}, attendu ${JSON.stringify(OPTION_LETTERS)}`);
    }

    if (!optionKeys.includes(q.answer)) {
      say(`answer « ${q.answer} » ne désigne aucune option`);
    }

    const expectedDistractors = OPTION_LETTERS.filter((letter) => letter !== q.answer).sort();
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
