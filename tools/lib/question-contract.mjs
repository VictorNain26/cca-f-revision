/* Les règles du contrat de question, en fonctions pures.
 *
 * Deux niveaux, parce qu'ils ne coûtent pas la même chose au lecteur du site :
 *
 *   - problems : ce sans quoi le quiz se corrige mal. quiz.js lit data-opt
 *     pour construire les choix, data-answer pour désigner la clé, et les
 *     li[data-opt] pour rattacher chaque explication à son option (voir
 *     quiz.js). Un data-answer qui ne désigne aucune option, une lettre du
 *     texte désaccordée de son data-opt, une explication braquée sur la bonne
 *     réponse : le lecteur voit une correction fausse. C'est un bug, pas un
 *     désaccord de style.
 *
 *   - notices : tout ce qui relève de la tenue éditoriale — schéma d'id,
 *     métadonnées de classement, nombre d'options, langue, explication
 *     manquante sur un distracteur. Affiché, jamais bloquant : ces règles
 *     décrivent la façon de rédiger d'aujourd'hui, et une exploration a le
 *     droit de s'en écarter le temps de voir ce que ça donne.
 *
 * Le contrôle n'a jamais jugé la justesse d'une réponse : elle se recoupe à la
 * main contre le guide et la doc.
 *
 * Détection du français : liste de mots-outils dont la forme n'existe pas en
 * anglais, plus les caractères accentués. Liste incomplète par construction,
 * validée contre les questions anglaises du corpus — « plus », mot anglais
 * ordinaire, en a été retiré après un faux positif.
 */
import { overlap } from './questions.mjs';

const LETTERS = ['a', 'b', 'c', 'd', 'e'];

export const FRENCH_MARKERS =
  /\b(?:le|la|les|des|une|dans|pour|qui|que|pas|avec|sur|est|sont|leur|leurs|cette|ces|donc|mais|aux|par|du|ses|elle|ils|elles|nous|vous|tout|toute|toutes|tous|alors|ainsi|entre|sans|sous|chaque|quand|lorsque|parce|afin|selon|vers|depuis|jusqu|ou|où)\b/i;

const ACCENTS = /[àâäçéèêëîïôöùûüÿœæ]/i;

const proseOf = (q) => q.prose;

export const checkQuestion = (q) => {
  const problems = [];
  const notices = [];
  const at = (msg) => `${q.file} :: ${q.label.slice(0, 52)} — ${msg}`;
  const broken = (msg) => problems.push(at(msg));
  const note = (msg) => notices.push(at(msg));

  // id
  if (!q.id || !new RegExp(`^${q.prefix}-q\\d+$`).test(q.id)) {
    note(`id « ${q.id ?? '(absent)'} » hors schéma, attendu ${q.prefix}-q<n>`);
  }

  // domaine
  if (!q.domain || !/^D[0-5]$/.test(q.domain)) {
    note(`domaine « ${q.domain ?? '(absent)'} » invalide`);
  } else if (q.prefix !== 'pq' && q.domain.toLowerCase() !== q.prefix) {
    note(`domaine ${q.domain} incohérent avec la fiche ${q.prefix.toUpperCase()}`);
  }

  // task
  if (!q.task || !/^\d\.\d+$/.test(q.task)) {
    note(`task « ${q.task ?? '(absente)'} » invalide`);
  } else if (q.citedTask && q.citedTask !== q.task) {
    note(`data-task ${q.task} contredit la task ${q.citedTask} citée en prose`);
  }

  // options : quiz.js ne sait construire les choix que depuis les data-opt.
  if (q.options.length < 4 || q.options.length > 5) {
    note(`${q.options.length} options, attendu 4 ou 5`);
  }
  const expected = LETTERS.slice(0, q.options.length);
  const actual = q.options.map((o) => o.opt);
  if (actual.join(',') !== expected.join(',')) {
    broken(`data-opt ${JSON.stringify(actual)}, attendu ${JSON.stringify(expected)}`);
  }
  for (const o of q.options) {
    if (o.opt && o.letterInText && o.letterInText.toLowerCase() !== o.opt) {
      broken(`lettre « ${o.letterInText}) » désaccordée du data-opt « ${o.opt} »`);
    }
  }

  // réponse
  const known = new Set(actual.filter(Boolean));
  if (q.answer.length === 0) {
    broken('data-answer absent');
  }
  for (const a of q.answer) {
    if (!known.has(a)) broken(`data-answer « ${a} » ne désigne aucune option`);
  }
  if (/\b[A-E]\)/.test(q.answerText)) {
    note(`lettre en dur dans le corrigé : « ${q.answerText.slice(0, 40)} »`);
  }

  // explications
  const wrong = [...known].filter((o) => !q.answer.includes(o)).sort();
  const explained = [...new Set(q.explanations)].sort();
  for (const e of explained) {
    if (!known.has(e)) broken(`explication « ${e} » ne désigne aucune option`);
    else if (q.answer.includes(e)) broken(`explication visant la bonne réponse « ${e} »`);
  }
  const missing = wrong.filter((o) => !explained.includes(o));
  if (missing.length) note(`distracteur(s) sans explication : ${missing.join(', ')}`);

  // langue
  const prose = proseOf(q);
  if (FRENCH_MARKERS.test(prose) || ACCENTS.test(prose)) {
    note(`français dans le bloc quiz : « ${prose.slice(0, 50)} »`);
  }

  return { problems, notices };
};

/* Seuil retenu sur l'empreinte fp (code + valeurs chiffrées, cf. questions.mjs).
 * Mesuré sur le corpus : le recouvrement maximum entre une question de fiche et
 * une question de banque est 0,2222 (3 paires, ex. d2-q6/pq-q64 sur
 * ".mcp.json" + "~/.claude.json" — du vocabulaire de config partagé, pas un
 * doublon). 0,20 échouerait donc sur du faux positif ; 0,25 laisse ~0,03 de
 * marge au-dessus du maximum mesuré. */
export const OVERLAP_MAX = 0.25;

/* Identité : deux questions ne peuvent pas partager un id. Bloquant, parce que
 * quiz.js range la progression du lecteur sous cet id (localStorage) — deux
 * questions homonymes se répondent l'une pour l'autre. */
export const checkIds = (questions) => {
  const out = [];
  const seen = new Map();
  for (const q of questions) {
    if (!q.id) continue;
    if (seen.has(q.id)) out.push(`id dupliqué « ${q.id} » : ${seen.get(q.id)} et ${q.label.slice(0, 40)}`);
    else seen.set(q.id, q.label.slice(0, 40));
  }
  return out;
};

// Recouvrement fiche <-> banque : une fiche réécrite ne devrait plus rejouer
// une question de la banque. Observation — le jugement de « c'est le même
// exercice » ne se délègue pas à un seuil.
export const checkOverlap = (questions) => {
  const out = [];
  const bank = questions.filter((x) => x.prefix === 'pq');
  for (const s of questions) {
    if (s.prefix === 'pq' || !s.migrated) continue;
    for (const b of bank) {
      const v = overlap(s.fp, b.fp);
      if (v >= OVERLAP_MAX) {
        out.push(`recouvrement ${v.toFixed(2)} entre ${s.id} et ${b.id ?? 'Q' + b.qnum} (plafond ${OVERLAP_MAX})`);
      }
    }
  }
  return out;
};

export const expectedTasks = { 1: 7, 2: 5, 3: 6, 4: 6, 5: 6 };

// Couverture des 30 task statements. Observation : un trou de couverture est
// une information utile, pas une raison de refuser un commit.
export const checkTaskCoverage = (questions) => {
  const out = [];
  const covered = new Set(questions.map((x) => x.task ?? x.citedTask).filter(Boolean));
  for (const [domain, count] of Object.entries(expectedTasks)) {
    for (let n = 1; n <= count; n++) {
      if (!covered.has(`${domain}.${n}`)) out.push(`task ${domain}.${n} sans aucune question`);
    }
  }
  return out;
};

/* TOTALS de home-progress.js, contre le compte réel par page. Bloquant : le
 * profil par domaine de la page d'accueil divise par ces totaux — faux, il
 * affiche au lecteur un pourcentage de progression faux. */
export const checkTotals = (questions, declaredTotals) => {
  const out = [];
  const realTotals = {};
  for (const q of questions) {
    const key = q.file.replace(/\.html$/, '');
    realTotals[key] = (realTotals[key] || 0) + 1;
  }
  for (const [key, declared] of Object.entries(declaredTotals)) {
    if (realTotals[key] !== undefined && realTotals[key] !== declared) {
      out.push(`TOTALS.${key} = ${declared}, compte réel ${realTotals[key]}`);
    }
  }
  return out;
};

export const checkCorpus = (questions, { declaredTotals = {} } = {}) => {
  const perQuestion = questions.filter((q) => q.migrated).map(checkQuestion);
  return {
    problems: [
      ...checkIds(questions),
      ...perQuestion.flatMap((r) => r.problems),
      ...checkTotals(questions, declaredTotals),
    ],
    notices: [
      ...perQuestion.flatMap((r) => r.notices),
      ...checkOverlap(questions),
      ...checkTaskCoverage(questions),
    ],
  };
};
