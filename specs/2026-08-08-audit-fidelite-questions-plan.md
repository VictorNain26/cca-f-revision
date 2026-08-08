# Plan d'implémentation — audit de fidélité des 157 questions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre les 157 questions du corpus sous un contrat vérifiable — anglais, exactitude recoupée, identité stable, contenu réordonnançable — sans toucher au caractère statique du site.

**Architecture:** Le HTML reste la source de vérité. Un module d'index (`tools/lib/questions.mjs`) parse les pages en enregistrements de questions ; un module de règles pures (`tools/lib/question-contract.mjs`) les valide ; un CLI (`tools/check-questions.mjs`) les enchaîne et sort en échec. Le contrôle démarre en **mode progressif** — seule une question portant un `id` est soumise au contrat — puis passe en **mode strict** au dernier commit. `quiz.js` supporte les deux formats pendant la migration.

**Tech Stack:** Node ≥ 20.11, ESM, `jsdom` (devDependency existante), `node:test` (intégré, aucune dépendance nouvelle).

**Spec:** `specs/2026-08-08-audit-fidelite-questions-design.md`

## Global Constraints

Ces contraintes s'appliquent implicitement à **chaque** tâche.

- **Aucune dépendance runtime.** Le site reste du HTML statique, sans étape de build. `jsdom` et `node:test` ne servent qu'aux contrôles.
- **Node ≥ 20.11** (`import.meta.dirname`).
- **Bloc quiz intégralement en anglais américain.** La prose pédagogique des fiches reste en français.
- **Le guide fait loi contre la doc à jour** sur les quatre divergences connues : outil `Task` (non `Agent`), slash commands et skills distincts, `allowed-tools` restreint l'accès, sorties structurées via `tool_use` + JSON Schema. Ne jamais « corriger » ces réponses vers la doc courante.
- **Les 12 questions officielles** (`pq-q1` à `pq-q12`) : énoncés, options et réponses **mot à mot**. Seule l'explication est restructurée.
- **Seuil de recouvrement fiches ↔ banque : indice de Jaccard < 0,30**, calculé sur l'empreinte = identifiants de `<code>` en minuscules ∪ valeurs chiffrées (pourcentages compris), tokens de longueur > 1.
- **`data-answer` est la source unique** de la bonne réponse. Aucune lettre en dur dans le paragraphe « Answer: ».
- **Schéma d'`id`** : `pq-qN` pour `Practice_Questions.html`, `dN-qM` pour les fiches (`d0-q1`, `d5-q9`).
- **Nombre d'options : 4 ou 5.**
- **`npm run check` vert à chaque commit.**
- **Commits** : conventional commits en anglais, scope `cca-revision`. Stager les fichiers **explicitement**, jamais `git add .`. Ajouter le trailer `Co-Authored-By: Claude <noreply@anthropic.com>` à la main — `attribution.commit` ne s'applique pas quand le message passe par `git commit -F`.
- **Branche** : `chore/question-fidelity-audit`.

## File Structure

**Créés**

| Fichier | Responsabilité |
|---|---|
| `tools/lib/questions.mjs` | Parse une page en enregistrements de questions ; empreinte et recouvrement. Aucune règle métier. |
| `tools/lib/questions.test.mjs` | Tests du parsing et du recouvrement, sur fixtures HTML en ligne. |
| `tools/lib/question-contract.mjs` | Les règles, en fonctions pures. Aucune I/O. |
| `tools/lib/question-contract.test.mjs` | Tests des règles : une fixture par violation. |
| `tools/check-questions.mjs` | CLI : charge le corpus, applique les règles, imprime, sort en échec. |
| `specs/2026-08-08-question-audit-log.md` | Journal de vérification — N1, N2 et toute question modifiée. |

**Modifiés**

| Fichier | Changement |
|---|---|
| `quiz.js` | Lettre dérivée de la position ; `data-answer` source unique ; réinjection dans l'explication et le corrigé ; tolérance au format ancien. |
| `tools/check-quizzes.mjs` | Assertions couvrant les deux formats, puis le seul format cible. |
| `tools/check-diacritics.mjs` | Exclusion par bloc quiz au lieu du nom de fichier. |
| `package.json` | `check:questions` dans la chaîne, script `test`. |
| `README.md` | Le nouveau gate dans le tableau des contrôles. |
| `D0`–`D5`, `Practice_Questions.html` | Le contenu des 157 questions. |

**Non modifié** : `home-progress.js` — ses `TOTALS` restent 6/8/7/8/7/9/112, et le nouveau contrôle les verrouille.

---

### Task 1: Module d'index des questions

**Files:**
- Create: `tools/lib/questions.mjs`
- Test: `tools/lib/questions.test.mjs`
- Modify: `package.json` (script `test`)

**Interfaces:**
- Consumes: rien.
- Produces: `ROOT`, `pagePrefix(file) → string`, `fingerprint(el) → Set<string>`, `overlap(Set, Set) → number`, `parseQuestions(html, file) → Question[]`, `loadCorpus() → Question[]`.
- `Question` = `{ file, prefix, id: string|null, migrated: boolean, qnum: number, label: string, domain: string|null, task: string|null, citedTask: string|null, options: {opt: string|null, letterInText: string|null, index: number}[], answer: string[], answerText: string, explanations: string[], fp: Set<string> }`

- [ ] **Step 1: Écrire les tests qui échouent**

```javascript
// tools/lib/questions.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions, overlap, pagePrefix } from './questions.mjs';

const MIGRATED = `<details id="pq-q1" data-domain="D1" data-task="1.4">
<summary>Q1 (Customer Support) — Deterministic tool ordering</summary>
<div>
  <p><strong>Scenario:</strong> in 12% of cases the agent skips <code>get_customer</code>.</p>
  <p data-opt="a">A) Add a programmatic prerequisite.</p>
  <p data-opt="b">B) Enhance the system prompt.</p>
  <p data-opt="c">C) Add few-shot examples.</p>
  <p data-opt="d">D) Implement a routing classifier.</p>
  <hr>
  <p class="correct" data-answer="a">Answer: add a programmatic prerequisite</p>
  <p class="incorrect"><strong>Why the others are wrong:</strong></p>
  <ul><li data-opt="b">Probabilistic.</li><li data-opt="c">Steers only.</li><li data-opt="d">Availability, not ordering.</li></ul>
</div></details>`;

const LEGACY = `<details>
<summary>Q9 (D2) — Un intitulé français</summary>
<div>
  <p><strong>Situation :</strong> trois formats de date.</p>
  <p>A) Première option.</p>
  <p>B) Deuxième option.</p>
  <p>C) Troisième option.</p>
  <p>D) Quatrième option.</p>
  <hr>
  <p class="correct">Réponse : B) Deuxième option</p>
</div></details>`;

test('pagePrefix distingue la banque des fiches', () => {
  assert.equal(pagePrefix('Practice_Questions.html'), 'pq');
  assert.equal(pagePrefix('D3_Claude_Code_Config_20pct.html'), 'd3');
});

test('parseQuestions lit le contrat complet', () => {
  const [q] = parseQuestions(MIGRATED, 'Practice_Questions.html');
  assert.equal(q.id, 'pq-q1');
  assert.equal(q.migrated, true);
  assert.equal(q.qnum, 1);
  assert.equal(q.domain, 'D1');
  assert.equal(q.task, '1.4');
  assert.equal(q.options.length, 4);
  assert.deepEqual(q.options.map((o) => o.opt), ['a', 'b', 'c', 'd']);
  assert.deepEqual(q.options.map((o) => o.letterInText), ['A', 'B', 'C', 'D']);
  assert.deepEqual(q.answer, ['a']);
  assert.deepEqual(q.explanations, ['b', 'c', 'd']);
});

test('parseQuestions tolère une question non migrée', () => {
  const [q] = parseQuestions(LEGACY, 'D2_Tool_Design_MCP_18pct.html');
  assert.equal(q.id, null);
  assert.equal(q.migrated, false);
  assert.equal(q.task, null);
  assert.equal(q.options.length, 4);
  assert.deepEqual(q.options.map((o) => o.opt), [null, null, null, null]);
  assert.deepEqual(q.answer, []);
});

test('parseQuestions relève la task citée en prose', () => {
  const html = MIGRATED.replace('Probabilistic.', 'Probabilistic. This is Task 1.4.');
  assert.equal(parseQuestions(html, 'Practice_Questions.html')[0].citedTask, '1.4');
});

test("parseQuestions ignore un <details> qui n'est pas un quiz", () => {
  const html = '<details><summary>Aide-mémoire</summary><div><p>Texte.</p></div></details>';
  assert.deepEqual(parseQuestions(html, 'Exam_Strategy.html'), []);
});

test("l'empreinte retient le code et les nombres", () => {
  const [q] = parseQuestions(MIGRATED, 'Practice_Questions.html');
  assert.ok(q.fp.has('get_customer'));
  assert.ok(q.fp.has('12%'));
});

test('overlap est un indice de Jaccard', () => {
  assert.equal(overlap(new Set(['a', 'b']), new Set(['a', 'b'])), 1);
  assert.equal(overlap(new Set(['a']), new Set(['b'])), 0);
  assert.equal(overlap(new Set(['a', 'b', 'c']), new Set(['a', 'b', 'd'])), 0.5);
  assert.equal(overlap(new Set(), new Set(['a'])), 0);
});
```

- [ ] **Step 2: Ajouter le script de test et vérifier l'échec**

Dans `package.json`, ajouter à `scripts` : `"test": "node --test tools/**/*.test.mjs"`

Le glob est nécessaire : sur Node 24, `node --test tools/` traite `tools` comme un fichier de test et échoue. C'est le test runner de Node qui interprète le motif, pas le shell.

Run: `npm test`
Expected: FAIL — `Cannot find module` sur `./questions.mjs`.

- [ ] **Step 3: Écrire le module**

```javascript
// tools/lib/questions.mjs
/* Index des questions du corpus.
 * Une question est un <details> dont le <summary> commence par « Qn » — même
 * détection que quiz.js, pour que le contrôle voie exactement ce que le lecteur
 * voit. Le module ne porte aucune règle : il décrit, il ne juge pas.
 * L'empreinte ne retient que les identifiants de code et les valeurs chiffrées,
 * les deux seuls éléments qui survivent à une traduction — c'est ce qui permet
 * d'apparier une question française et sa version anglaise.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

const OPTION_RE = /^\s*([A-E])\)/;
const QUIZ_SUMMARY_RE = /^Q\s*\d+/i;

export const pagePrefix = (file) =>
  file === 'Practice_Questions.html' ? 'pq' : file.slice(0, 2).toLowerCase();

export const fingerprint = (el) => {
  const text = el.textContent || '';
  const code = [...el.querySelectorAll('code')].map((c) => (c.textContent || '').trim().toLowerCase());
  // Pas de \b final : « % » et l'espace qui le précède sont tous deux des
  // non-mots, donc un \b après %? ferait échouer la capture du signe. Le \s*
  // normalise le « 12 % » des fiches françaises et le « 12% » de la banque
  // anglaise vers un même token — condition de l'appariement interlangue.
  const nums = (text.match(/\b\d+(?:[.,]\d+)?\s*%?/g) || []).map((s) => s.replace(/\s+/g, ''));
  return new Set([...code, ...nums].filter((t) => t.length > 1));
};

export const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

export const parseQuestions = (html, file) => {
  const doc = new JSDOM(html).window.document;
  const prefix = pagePrefix(file);

  return [...doc.querySelectorAll('details')]
    .filter((d) => QUIZ_SUMMARY_RE.test((d.querySelector(':scope > summary')?.textContent || '').trim()))
    .map((d) => {
      const label = (d.querySelector(':scope > summary')?.textContent || '').trim();
      const tagged = [...d.querySelectorAll('p[data-opt]')];
      const optionEls = tagged.length
        ? tagged
        : [...d.querySelectorAll('p')].filter((p) => OPTION_RE.test(p.textContent || ''));
      const correct = d.querySelector('p.correct');

      return {
        file,
        prefix,
        id: d.id || null,
        migrated: Boolean(d.id),
        qnum: Number((label.match(/^Q\s*(\d+)/i) || [, 0])[1]),
        label,
        domain: d.dataset.domain || null,
        task: d.dataset.task || null,
        citedTask: ((d.textContent || '').match(/\bTask\s+(\d\.\d+)\b/) || [, null])[1],
        options: optionEls.map((p, index) => ({
          opt: p.dataset.opt ?? null,
          letterInText: ((p.textContent || '').match(OPTION_RE) || [, null])[1],
          index,
        })),
        answer: (correct?.dataset.answer || '').split(/\s+/).filter(Boolean),
        answerText: (correct?.textContent || '').trim(),
        explanations: [...d.querySelectorAll('li[data-opt]')].map((li) => li.dataset.opt),
        fp: fingerprint(d),
      };
    });
};

export const loadCorpus = () =>
  fs.readdirSync(ROOT)
    .filter((f) => /^(D\d_.*|Practice_Questions)\.html$/.test(f))
    .sort()
    .flatMap((f) => parseQuestions(fs.readFileSync(path.join(ROOT, f), 'utf8'), f));
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npm test`
Expected: PASS — 7 tests.

- [ ] **Step 5: Vérifier l'index sur le corpus réel**

Run: `node -e "import('./tools/lib/questions.mjs').then(m => { const c = m.loadCorpus(); console.log(c.length, c.filter(q => q.migrated).length); })"`
Expected: `157 0` — les 157 questions vues, aucune encore migrée.

- [ ] **Step 6: Commit**

```bash
git add tools/lib/questions.mjs tools/lib/questions.test.mjs package.json
git commit -F - <<'EOF'
build(cca-revision): index the corpus questions behind a tested module

The 157 questions were only ever reachable by ad-hoc greps. A shared index
parses them into records - id, declared domain and task, options, answer,
explanation targets - and computes the code-and-number fingerprint that pairs a
French self-assessment with its English twin in the bank.

Introduces node --test as the test runner: it ships with Node, so the
zero-dependency property holds.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 2: Règles du contrat, par question

**Files:**
- Create: `tools/lib/question-contract.mjs`
- Test: `tools/lib/question-contract.test.mjs`

**Interfaces:**
- Consumes: `Question` de Task 1.
- Produces: `checkQuestion(q) → string[]` (violations, vide si conforme), `FRENCH_MARKERS: RegExp`.

- [ ] **Step 1: Écrire les tests qui échouent**

```javascript
// tools/lib/question-contract.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions } from './questions.mjs';
import { checkQuestion } from './question-contract.mjs';

const build = (over = {}) => {
  const opts = over.options ?? ['a', 'b', 'c', 'd'];
  const body = opts.map((o, i) => `<p data-opt="${o}">${'ABCDE'[i]}) Option ${o}.</p>`).join('\n');
  const expl = (over.explanations ?? ['b', 'c', 'd']).map((o) => `<li data-opt="${o}">Wrong.</li>`).join('');
  return `<details id="${over.id ?? 'pq-q1'}" data-domain="${over.domain ?? 'D1'}" data-task="${over.task ?? '1.4'}">
<summary>Q1 (Customer Support) — ${over.title ?? 'Deterministic tool ordering'}</summary>
<div>
  <p><strong>Scenario:</strong> ${over.scenario ?? 'The agent skips a verification step.'}</p>
  ${body}
  <hr>
  <p class="correct" data-answer="${over.answer ?? 'a'}">${over.answerText ?? 'Answer: add a prerequisite'}</p>
  <ul>${expl}</ul>
</div></details>`;
};

const violations = (html, file = 'Practice_Questions.html') => checkQuestion(parseQuestions(html, file)[0]);

test('une question conforme ne produit aucune violation', () => {
  assert.deepEqual(violations(build()), []);
});

test('un id hors schéma est refusé', () => {
  assert.match(violations(build({ id: 'question-1' })).join(' '), /id/);
});

test("un id de fiche sur la page de la banque est refusé", () => {
  assert.match(violations(build({ id: 'd1-q1' })).join(' '), /id/);
});

test('un domaine incohérent avec la fiche est refusé', () => {
  const html = build({ id: 'd1-q1', domain: 'D2' });
  assert.match(violations(html, 'D1_Architecture_Orchestration_27pct.html').join(' '), /domaine/i);
});

test('une task absente est refusée', () => {
  const html = build().replace(' data-task="1.4"', '');
  assert.match(violations(html).join(' '), /task/i);
});

test('une task contredisant la prose est refusée', () => {
  const html = build({ scenario: 'A gate. This is Task 2.1.' });
  assert.match(violations(html).join(' '), /2\.1/);
});

test('trois options sont refusées', () => {
  assert.match(violations(build({ options: ['a', 'b', 'c'], explanations: ['b', 'c'] })).join(' '), /options/i);
});

test('un data-opt hors séquence est refusé', () => {
  const html = build().replace('data-opt="c"', 'data-opt="x"');
  assert.match(violations(html).join(' '), /data-opt/);
});

test('une lettre de texte désaccordée du data-opt est refusée', () => {
  const html = build().replace('<p data-opt="b">B)', '<p data-opt="b">D)');
  assert.match(violations(html).join(' '), /lettre/i);
});

test('un data-answer pointant une option inexistante est refusé', () => {
  assert.match(violations(build({ answer: 'e' })).join(' '), /data-answer/);
});

test('une lettre en dur dans le corrigé est refusée', () => {
  assert.match(violations(build({ answerText: 'Answer: A) add a prerequisite' })).join(' '), /lettre en dur/i);
});

test('une explication qui manque un distracteur est refusée', () => {
  assert.match(violations(build({ explanations: ['b', 'c'] })).join(' '), /distracteur/i);
});

test('une explication visant la bonne réponse est refusée', () => {
  assert.match(violations(build({ explanations: ['a', 'b', 'c', 'd'] })).join(' '), /bonne r/i);
});

test('du français dans un bloc quiz est refusé', () => {
  assert.match(violations(build({ scenario: "L'agent saute une étape de vérification." })).join(' '), /fran/i);
});

test('un accent isolé suffit à signaler du français', () => {
  assert.match(violations(build({ title: 'Séquencement des outils' })).join(' '), /fran/i);
});

test('du français dans un <code> ne compte pas', () => {
  const html = build({ scenario: 'The tool <code>calculer_le_prix</code> returns a total.' });
  assert.deepEqual(violations(html), []);
});

test('une question à réponses multiples est acceptée', () => {
  const html = build({ answer: 'b d', explanations: ['a', 'c'], answerText: 'Answers: two guarantees' });
  assert.deepEqual(violations(html), []);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Cannot find module` sur `./question-contract.mjs`.

- [ ] **Step 3: Écrire les règles**

```javascript
// tools/lib/question-contract.mjs
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

const proseOf = (q) => `${q.label} ${q.answerText}`;

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
```

> **Note d'implémentation.** `proseOf` ne regarde que l'intitulé et le corrigé, parce que `parseQuestions` ne conserve pas le texte des options ni du scénario. Le test « du français dans un bloc quiz est refusé » porte sur le scénario : ajouter à `parseQuestions` un champ `prose` = texte du `<details>` **privé du contenu des `<code>`**, et faire porter `proseOf` sur ce champ. Le faire dans cette tâche, en complétant Task 1 :
>
> ```javascript
> // dans parseQuestions, avant le return de l'objet
> const stripped = d.cloneNode(true);
> for (const c of stripped.querySelectorAll('code')) c.remove();
> // puis dans l'objet retourné :
> prose: (stripped.textContent || '').replace(/\s+/g, ' ').trim(),
> ```
>
> et `proseOf = (q) => q.prose`. Ajouter l'assertion correspondante au test de Task 1 :
> `assert.ok(!parseQuestions(MIGRATED, 'Practice_Questions.html')[0].prose.includes('get_customer'));`

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npm test`
Expected: PASS — les 17 tests de contrat plus les 8 de l'index.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/question-contract.mjs tools/lib/question-contract.test.mjs tools/lib/questions.mjs tools/lib/questions.test.mjs
git commit -F - <<'EOF'
build(cca-revision): encode the question contract as tested rules

Fifteen structural rules, one fixture each: id scheme, declared domain against
the sheet hosting the question, declared task against the one cited in prose,
option count, data-opt sequence, the text letter agreeing with its data-opt,
data-answer pointing at a real option, no hardcoded letter in the answer
paragraph, one explanation per distractor and none for the correct option, and
no French left in a quiz block.

A validator whose rules are never exercised is a validator that silently stops
firing - check-chapters.mjs already carried one such false negative.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 3: Règles de corpus et CLI en mode progressif

**Files:**
- Create: `tools/check-questions.mjs`
- Modify: `tools/lib/question-contract.mjs`, `tools/lib/question-contract.test.mjs`, `package.json`, `README.md`

**Interfaces:**
- Consumes: `checkQuestion` (Task 2), `loadCorpus`, `overlap` (Task 1).
- Produces: `checkCorpus(questions, { strict, declaredTotals }) → string[]`. CLI : `node tools/check-questions.mjs [--strict]`.

- [ ] **Step 1: Écrire les tests qui échouent**

```javascript
// à ajouter dans tools/lib/question-contract.test.mjs
import { checkCorpus } from './question-contract.mjs';

const q = (over) => ({
  file: 'Practice_Questions.html', prefix: 'pq', id: 'pq-q1', migrated: true,
  qnum: 1, label: 'Q1 — T', domain: 'D1', task: '1.4', citedTask: null,
  options: [], answer: [], answerText: '', explanations: [], prose: '',
  fp: new Set(['x']), ...over,
});

test('deux id identiques sont refusés', () => {
  const found = checkCorpus([q({}), q({ label: 'Q2 — U' })], { declaredTotals: {} });
  assert.match(found.join(' '), /pq-q1/);
});

test('un recouvrement fiche/banque au-dessus du seuil est refusé', () => {
  const bank = q({ fp: new Set(['get_customer', '12%', 'lookup_order']) });
  const sheet = q({
    file: 'D1_Architecture_Orchestration_27pct.html', prefix: 'd1', id: 'd1-q1',
    fp: new Set(['get_customer', '12%', 'lookup_order']),
  });
  assert.match(checkCorpus([bank, sheet], { declaredTotals: {} }).join(' '), /recouvrement/i);
});

test('un recouvrement sous le seuil passe', () => {
  const bank = q({ fp: new Set(['get_customer', '12%']) });
  const sheet = q({
    file: 'D1_Architecture_Orchestration_27pct.html', prefix: 'd1', id: 'd1-q1',
    fp: new Set(['grant_access', 'verify_role', '8%', 'provisioning']),
  });
  assert.deepEqual(checkCorpus([bank, sheet], { declaredTotals: {} }), []);
});

test('une question non migrée est ignorée en mode progressif', () => {
  const bad = q({ id: null, migrated: false, domain: null, task: null });
  assert.deepEqual(checkCorpus([bad], { declaredTotals: {} }), []);
});

test('une question non migrée est refusée en mode strict', () => {
  const bad = q({ id: null, migrated: false, domain: null, task: null });
  assert.match(checkCorpus([bad], { strict: true, declaredTotals: {} }).join(' '), /non migr/i);
});

test('un TOTALS désaccordé du compte réel est refusé', () => {
  const found = checkCorpus([q({})], { declaredTotals: { Practice_Questions: 112 } });
  assert.match(found.join(' '), /TOTALS/);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test`
Expected: FAIL — `checkCorpus is not a function`.

- [ ] **Step 3: Écrire `checkCorpus`**

```javascript
// à ajouter dans tools/lib/question-contract.mjs
import { overlap } from './questions.mjs';

export const OVERLAP_MAX = 0.30;

export const checkCorpus = (questions, { strict = false, declaredTotals = {} } = {}) => {
  const out = [];
  const say = (msg) => out.push(msg);

  // Identité
  const seen = new Map();
  for (const q of questions) {
    if (!q.id) continue;
    if (seen.has(q.id)) say(`id dupliqué « ${q.id} » : ${seen.get(q.id)} et ${q.label.slice(0, 40)}`);
    else seen.set(q.id, q.label.slice(0, 40));
  }

  // Contrat, sur les questions migrées seulement tant qu'on n'est pas en strict
  for (const q of questions) {
    if (q.migrated) out.push(...checkQuestion(q));
    else if (strict) say(`${q.file} :: ${q.label.slice(0, 52)} — non migrée (mode strict)`);
  }

  // Recouvrement fiche <-> banque. Une fiche migrée a été réécrite : elle ne
  // doit plus rejouer une question de la banque, migrée ou non.
  const bank = questions.filter((x) => x.prefix === 'pq');
  for (const s of questions) {
    if (s.prefix === 'pq' || !s.migrated) continue;
    for (const b of bank) {
      const v = overlap(s.fp, b.fp);
      if (v >= OVERLAP_MAX) {
        say(`recouvrement ${v.toFixed(2)} entre ${s.id} et ${b.id ?? 'Q' + b.qnum} (plafond ${OVERLAP_MAX})`);
      }
    }
  }

  // Couverture des 30 task statements, sur la task déclarée ou citée
  const covered = new Set(questions.map((x) => x.task ?? x.citedTask).filter(Boolean));
  const expectedTasks = { 1: 7, 2: 5, 3: 6, 4: 6, 5: 6 };
  for (const [domain, count] of Object.entries(expectedTasks)) {
    for (let n = 1; n <= count; n++) {
      if (!covered.has(`${domain}.${n}`)) say(`task ${domain}.${n} sans aucune question`);
    }
  }

  // TOTALS de home-progress.js
  const realTotals = {};
  for (const q of questions) {
    const key = q.file.replace(/\.html$/, '');
    realTotals[key] = (realTotals[key] || 0) + 1;
  }
  for (const [key, declared] of Object.entries(declaredTotals)) {
    if (realTotals[key] !== undefined && realTotals[key] !== declared) {
      say(`TOTALS.${key} = ${declared}, compte réel ${realTotals[key]}`);
    }
  }

  return out;
};
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Écrire le CLI**

```javascript
#!/usr/bin/env node
/* Contrôle du contrat de question sur les 157 questions du corpus.
 *
 * Deux modes, parce qu'un gate rouge pendant trente commits ne protège plus
 * rien — on prend l'habitude de ne plus le lire :
 *   - progressif (défaut) : une question portant un id est soumise au contrat
 *     entier, une question sans id est ignorée. Migrer une question la place
 *     sous contrôle définitivement.
 *   - strict (--strict) : un id est exigé sur les 157. Le commit qui bascule en
 *     strict est celui qui atteste l'achèvement de l'audit.
 *
 * Le compteur de questions migrées est l'avancement réel du chantier, mesuré et
 * non déclaré.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, ROOT } from './lib/questions.mjs';
import { checkCorpus } from './lib/question-contract.mjs';

const strict = process.argv.includes('--strict');

const declaredTotals = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'home-progress.js'), 'utf8');
  const block = src.match(/const TOTALS = \{([\s\S]*?)\};/);
  if (!block) return {};
  return Object.fromEntries(
    [...block[1].matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );
})();

const questions = loadCorpus();
const failures = checkCorpus(questions, { strict, declaredTotals });

const migrated = questions.filter((q) => q.migrated).length;
console.log(`Contrat de question — mode ${strict ? 'strict' : 'progressif'}`);
console.log(`  ${migrated} / ${questions.length} questions migrées`);

if (failures.length === 0) {
  console.log('Contrat de question : OK');
  process.exit(0);
}
console.log(`Contrat de question : ${failures.length} violation(s)`);
for (const f of failures) console.log('  -', f);
process.exit(1);
```

- [ ] **Step 6: Brancher le contrôle et vérifier qu'il passe sur l'état actuel**

Dans `package.json` : ajouter `"check:questions": "node tools/check-questions.mjs"` et l'insérer dans la chaîne `check`, après `check:chapters`.

Run: `npm run check:questions`
Expected: PASS — `0 / 157 questions migrées`, `Contrat de question : OK`. Rien n'est migré, donc rien n'est jugé.

Run: `node tools/check-questions.mjs --strict`
Expected: FAIL — 157 violations « non migrée (mode strict) ». C'est la preuve que le mode strict mord.

- [ ] **Step 7: Documenter le gate**

Ajouter au tableau des contrôles du `README.md`, après la ligne `check:chapters` :

```markdown
| `check:questions` | Le contrat des 157 questions : identifiant stable, domaine et task déclarés, options tagguées, une explication par distracteur, aucun français résiduel, aucun doublon fiche ↔ banque. Progressif pendant la migration — seules les questions déjà migrées sont jugées. |
```

- [ ] **Step 8: Commit**

```bash
git add tools/check-questions.mjs tools/lib/question-contract.mjs tools/lib/question-contract.test.mjs package.json README.md
git commit -F - <<'EOF'
build(cca-revision): gate the question contract, progressively

Corpus-level rules on top of the per-question ones: unique ids, sheet-to-bank
overlap under the 0.30 Jaccard ceiling, all 30 task statements still covered,
and home-progress.js TOTALS matching the real per-page count - the hardcoded
value that silently stops a domain from ever reaching "Terminé" when it drifts.

The gate runs progressive by default: a question carrying an id is held to the
full contract, one without is ignored. Migrating a question puts it under
control for good, so no commit can regress what is already done, and npm run
check stays green through the whole audit instead of sitting red for thirty
commits.

Verified both ways: green on the current corpus at 0/157 migrated, and 157
failures under --strict.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 4: `quiz.js` — deux formats, lettre dérivée de la position

**Files:**
- Modify: `quiz.js:14` (LETTERS), `quiz.js:100-112` (`findCorrect`), `quiz.js:262-305` (`extractChoicesFromBody`), `quiz.js:307-393` (`processQuiz`)
- Modify: `tools/check-quizzes.mjs:33-44`

**Interfaces:**
- Consumes: le contrat de question (Task 2) tel qu'il apparaît dans le HTML.
- Produces: rendu identique pour une question non migrée ; pour une question migrée, `li[data-opt]` et `li[data-letter]` posés depuis la position, lettre injectée dans le corrigé et devant chaque `<li>` d'explication.

**Rappel de rendu** : la lettre d'une option est affichée par CSS (`styles.css:720` — `.choices li::before { content: attr(data-letter) }`). Il n'y a donc **rien à injecter dans le texte des options** : poser `data-letter` suffit. En revanche `.answer-correct::before` est déjà pris par le badge ✓ (`styles.css:934`), donc la lettre du corrigé et celles des explications s'injectent dans le texte.

- [ ] **Step 1: Écrire l'assertion qui échoue dans `check-quizzes.mjs`**

Ajouter dans la boucle de contrôle, après la ligne `if (!quiz.querySelector('.answer-reveal .correct')) report('AUCUNE BONNE RÉPONSE');` :

```javascript
    // Contrat de question : sur une question migrée, l'identité de l'option est
    // son data-opt et sa lettre vient de sa position. Le corrigé et chaque
    // explication doivent porter la lettre courante, sinon un réordonnancement
    // ultérieur les ferait désigner la mauvaise option.
    if (quiz.id) {
      const lis = [...quiz.querySelectorAll('.choices li')];
      const letters = lis.map((li) => li.dataset.letter).join('');
      if (letters !== 'ABCDE'.slice(0, lis.length)) report(`LETTRES NON POSITIONNELLES (${letters})`);
      if (lis.some((li) => !li.dataset.opt)) report('DATA-OPT PERDU AU RENDU');
      const correct = quiz.querySelector('.answer-reveal .correct');
      if (correct && !/\b[A-E]\)/.test(correct.textContent || '')) report('CORRIGÉ SANS LETTRE');
      for (const li of quiz.querySelectorAll('.answer-reveal li[data-opt]')) {
        if (!/^\s*[A-E]\)/.test(li.textContent || '')) report(`EXPLICATION SANS LETTRE (${li.dataset.opt})`);
      }
    }
```

- [ ] **Step 2: Migrer une seule question pour armer l'assertion**

Dans `Practice_Questions.html`, sur la question Q1 uniquement, appliquer le contrat : `id="pq-q1" data-domain="D1" data-task="1.4"` sur le `<details>`, `data-opt` sur les quatre `<p>` d'options, `data-answer="a"` sur `<p class="correct">` et retrait de `A) ` de son texte, un `<li data-opt="…">` par distracteur sans lettre en dur.

Run: `npm run check:quizzes`
Expected: FAIL — `LETTRES NON POSITIONNELLES`, `DATA-OPT PERDU AU RENDU`, `CORRIGÉ SANS LETTRE`, `EXPLICATION SANS LETTRE` sur `Practice_Questions.html :: Q1`.

- [ ] **Step 3: Faire porter les `data-opt` jusqu'au `<li>` de choix**

Dans `quiz.js`, `splitChoicesInSummary` ne voit que du HTML de `<summary>` : les options migrées vivent dans le corps, donc seul `extractChoicesFromBody` est concerné. Remplacer sa première branche (`if (choicesPs.length >= 2)`) par :

```javascript
    if (choicesPs.length >= 2) {
      const ul = document.createElement('ul');
      ul.className = 'choices';
      choicesPs.forEach((p, index) => {
        const li = document.createElement('li');
        // L'identité d'une option est son data-opt ; sa lettre est sa position.
        // Sans data-opt (question non encore migrée), on retombe sur la lettre
        // lue dans le texte, qui est alors la seule identité disponible.
        const letterInText = ((p.textContent || '').match(/^\s*([A-E])\)/) || [, null])[1];
        if (p.dataset.opt) li.dataset.opt = p.dataset.opt;
        li.dataset.letter = p.dataset.opt ? LETTERS[index] : letterInText;
        li.innerHTML = p.innerHTML.replace(/^\s*[A-E]\)\s*/, '').replace(/[.,]\s*$/, '');
        ul.appendChild(li);
      });
      choicesPs[0].parentNode.replaceChild(ul, choicesPs[0]);
      for (let k = 1; k < choicesPs.length; k++) choicesPs[k].remove();
      return;
    }
```

Le filtre `choicesPs` doit aussi accepter une option migrée dont le texte n'aurait plus de préfixe : remplacer

```javascript
    const choicesPs = ps.filter((p) => /^\s*[A-E]\)/.test(p.textContent || ''));
```

par

```javascript
    const choicesPs = ps.filter((p) => p.dataset.opt || /^\s*[A-E]\)/.test(p.textContent || ''));
```

- [ ] **Step 4: Lire la bonne réponse dans `data-answer`**

Dans `findCorrect`, avant toute lecture de texte :

```javascript
  const findCorrect = (detailsEl) => {
    const correctP = detailsEl.querySelector('p.correct');
    // data-answer est la source unique dès qu'il existe : le contrat retire la
    // lettre du texte du corrigé, donc le parsing ci-dessous n'y trouverait
    // plus rien. Le fallback ne sert qu'aux questions pas encore migrées.
    if (correctP?.dataset.answer) {
      const opts = correctP.dataset.answer.split(/\s+/).filter(Boolean);
      const letters = opts
        .map((o) => detailsEl.querySelector(`.choices li[data-opt="${o}"]`)?.dataset.letter)
        .filter(Boolean);
      return { letters, multi: letters.length > 1, opts };
    }
    // … corps existant inchangé, en conservant `let correctP` sous un autre nom
  };
```

> Renommer la variable locale existante en `labelledP` pour ne pas redéclarer `correctP`, et retourner `{ letters, multi, opts: [] }` dans la branche héritée.

`findCorrect` est appelé **avant** que les `<li>` existent (`processQuiz` step 1). Déplacer son appel après la construction du `ul.choices`, c'est-à-dire juste avant `decorateQTag(summary)`, et vérifier que `wrapAnswerInReveal` reste appelé après.

- [ ] **Step 5: Injecter les lettres dans le corrigé et les explications**

Dans `processQuiz`, après `const revealEl = wrapAnswerInReveal(detailsEl);` :

```javascript
    // Le corrigé et les explications ne portent plus de lettre en dur : elle
    // est réinjectée depuis la position courante des options. Le badge ✓ occupe
    // déjà ::before sur .answer-correct, d'où l'injection dans le texte.
    if (detailsEl.id && correct.letters.length) {
      const correctP = detailsEl.querySelector('.correct');
      if (correctP && !/\b[A-E]\)/.test(correctP.textContent || '')) {
        correctP.innerHTML = correctP.innerHTML.replace(
          /(Answers?\s*:\s*)/i,
          `$1${correct.letters.join(', ')}) `
        );
      }
      for (const li of detailsEl.querySelectorAll('li[data-opt]')) {
        const letter = detailsEl.querySelector(`.choices li[data-opt="${li.dataset.opt}"]`)?.dataset.letter;
        if (letter && !/^\s*[A-E]\)/.test(li.textContent || '')) {
          li.innerHTML = `${letter}) ${li.innerHTML}`;
        }
      }
    }
```

> `querySelectorAll('li[data-opt]')` sur `detailsEl` attraperait aussi les `<li>` de choix, qui portent désormais `data-opt`. Les exclure : `detailsEl.querySelectorAll('li[data-opt]:not(.choices li)')`.

- [ ] **Step 6: Vérifier que tout passe**

Run: `npm run check`
Expected: PASS — `1 / 157 questions migrées`, `Contrat de question : OK`, `157 quiz, 0 problème(s)`.

- [ ] **Step 7: Vérifier la falsifiabilité du gate**

Retirer `data-opt="c"` de la troisième option de `pq-q1`.
Run: `npm run check:questions`
Expected: FAIL — `data-opt ["a","b",null,"d"]`.
Rétablir l'attribut, re-run, attendu PASS.

- [ ] **Step 8: Contrôle manuel**

Ouvrir `Practice_Questions.html` dans un navigateur. Sur Q1 : les quatre options affichent A/B/C/D, un clic révèle le corrigé qui affiche « Answer: A) … », et chaque explication porte sa lettre. Ouvrir `D1_…html` : une question non migrée se comporte exactement comme avant.

- [ ] **Step 9: Commit**

```bash
git add quiz.js tools/check-quizzes.mjs Practice_Questions.html
git commit -F - <<'EOF'
feat(cca-revision): derive option letters from position, not from text

An option's identity becomes its data-opt and its letter becomes its position,
so the content can be reordered later without rewriting a single explanation.
data-answer turns into the single source of truth for the correct answer:
findCorrect used to parse it out of the answer paragraph, which the contract now
strips of its hardcoded letter. The letter is reinjected at render time into the
answer paragraph and in front of every explanation - CSS could not do it there,
the ✓ badge already owns ::before on .answer-correct.

Questions without data-opt keep the previous behaviour untouched, so the 156 not
yet migrated go on working while both formats coexist.

Migrates Practice_Questions Q1 as the first case, and check-quizzes.mjs now
fails on a migrated question whose letters are not positional - verified by
removing a data-opt and watching the gate catch it.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 5: `check-diacritics.mjs` conscient des blocs quiz

**Files:**
- Modify: `tools/check-diacritics.mjs:17` (en-tête), `:77-96` (sélection et boucle)

**Interfaces:**
- Consumes: rien.
- Produces: un contrôle qui saute les lignes internes à un `<details>` de quiz et couvre désormais la prose française de `Practice_Questions.html`.

- [ ] **Step 1: Constater le trou actuel**

Run: `node -e "const s=require('fs').readFileSync('Practice_Questions.html','utf8'); console.log(/Note de fid.lit/.test(s), /M.thode et distracteurs/.test(s));"`
Expected: `true true` — cette prose est française et n'est jamais contrôlée, le fichier étant exclu en entier.

- [ ] **Step 2: Rendre le contrôle conscient des blocs**

Remplacer la sélection des fichiers :

```javascript
const files = fs
  .readdirSync(ROOT)
  .filter((f) => /\.(html|md|js|css)$/.test(f) && f !== 'Practice_Questions.html')
  .sort();
```

par :

```javascript
const files = fs.readdirSync(ROOT).filter((f) => /\.(html|md|js|css)$/.test(f)).sort();
```

et l'intérieur de la boucle par :

```javascript
for (const file of files) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
  // Les blocs quiz sont rédigés en anglais : hors périmètre. On les suit par
  // profondeur d'ouverture plutôt que d'exclure des fichiers entiers, sinon la
  // prose française de Practice_Questions.html — ses titres de section et sa
  // note de fidélité — n'est jamais contrôlée.
  let depth = 0;
  lines.forEach((line, index) => {
    const opens = (line.match(/<details\b/g) || []).length;
    const closes = (line.match(/<\/details>/g) || []).length;
    const insideBefore = depth > 0;
    depth += opens - closes;
    if (insideBefore || opens > 0) return;

    const prose = line
      .replace(/<code>[\s\S]*?<\/code>/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/\b[\w./-]+\.(html|js|css|md|json|mjs|py|pdf)\b/g, ' ');
    for (const [word, pattern] of WORDS) {
      if (!pattern.test(prose)) continue;
      console.log(`${file}:${index + 1} — « ${word} » : ${line.trim().replace(/\s+/g, ' ').slice(0, 110)}`);
      hits++;
    }
  });
}
```

Mettre à jour la ligne 17 de l'en-tête : remplacer « `Practice_Questions.html` est rédigé en anglais : hors périmètre. » par « Les blocs `<details>` de quiz sont rédigés en anglais : hors périmètre. La prose qui les entoure est contrôlée, y compris dans `Practice_Questions.html`. »

- [ ] **Step 3: Vérifier**

Run: `npm run check:diacritics`
Expected: PASS — `0 occurrence(s)`. Si des occurrences apparaissent dans la prose de `Practice_Questions.html`, ce sont de vraies coquilles jamais détectées : les corriger dans ce commit.

- [ ] **Step 4: Vérifier la falsifiabilité**

Dans `Practice_Questions.html`, remplacer temporairement « Note de fidélité » par « Note de fidelite ».
Run: `npm run check:diacritics`
Expected: FAIL sur `Practice_Questions.html`. Rétablir.

- [ ] **Step 5: Commit**

```bash
git add tools/check-diacritics.mjs
git commit -F - <<'EOF'
fix(cca-revision): check diacritics per block instead of per file

Practice_Questions.html was excluded wholesale because its questions are in
English, which also exempted the French prose wrapping them - ten section
headings and the fidelity note were never checked. The scan now tracks
<details> depth and skips quiz blocks only, so every French sentence in the
corpus is covered and English quiz text still is not.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 6: Ouvrir le journal de vérification

**Files:**
- Create: `specs/2026-08-08-question-audit-log.md`

**Interfaces:**
- Consumes: rien.
- Produces: le format de ligne que chaque tâche d'audit vient remplir.

- [ ] **Step 1: Créer le journal avec sa première entrée réelle**

```markdown
# Journal de vérification — audit des 157 questions

Consigne les questions de niveau **N1** (les 12 officielles, fidélité mot à mot au
guide), de niveau **N2** (une source opposable existe) et **toute question modifiée**.
Les questions N3 laissées inchangées n'y figurent pas : un journal où soixante
lignes diraient « cohérent » ne prouverait rien.

Colonne *Verdict* : `conforme`, `corrigé`, `réécrit` (doublon), `task attribuée`,
`hors référentiel`.

| id | Niveau | Verdict | Source ou justification |
|---|---|---|---|
| `pq-q1` | N1 | conforme | Question officielle Q1 du guide CCAR-F v1.0, énoncé et options inchangés. Explication restructurée en un `<li>` par distracteur, sans modification du fond. |
```

- [ ] **Step 2: Commit**

```bash
git add specs/2026-08-08-question-audit-log.md
git commit -F - <<'EOF'
docs(cca-revision): open the question audit verification log

Records N1 and N2 questions plus every modified one, with the source that
settles each correction. N3 judgment questions left untouched stay out: sixty
lines saying "coherent" would be evidence of nothing.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Task 7: Audit de la task 1.4 — le gabarit

**Files:**
- Modify: `Practice_Questions.html` (`pq-q25`, `pq-q26`), `D1_Architecture_Orchestration_27pct.html` (`d1-q1`), `specs/2026-08-08-question-audit-log.md`

**Interfaces:**
- Consumes: le contrat (Task 2), le gate progressif (Task 3), `quiz.js` bi-format (Task 4).
- Produces: le gabarit que les tasks 1.1 à 5.6 reproduisent. `pq-q1` est déjà fait (Task 4).

**Inventaire de la task 1.4** — banque `Q1` (officielle, faite), `Q25`, `Q26` ; fiche `D1 Q1`, qui recouvre `Q1` à **0,67** et doit être réécrite.

- [ ] **Step 1: Migrer `Q25` et `Q26` de la banque**

Pour chacune : poser `id="pq-q25"` / `pq-q26`, `data-domain="D1"`, `data-task="1.4"` ; `data-opt` sur chaque option ; `data-answer` sur `p.correct` et retrait de sa lettre en dur ; un `<li data-opt>` par distracteur, lettre retirée du texte, en dégroupant les explications qui traitaient deux options en une phrase. Les énoncés étant déjà en anglais, seule l'explication bouge.

Run: `npm run check`
Expected: PASS — `3 / 157 questions migrées`.

- [ ] **Step 2: Réécrire `D1 Q1` en variante, en anglais**

La question de fiche rejoue `Q1` (officielle). Écrire une situation neuve testant le même arbitrage — garantie déterministe contre conformité probabiliste — et poser `id="d1-q1"`, `data-domain="D1"`, `data-task="1.4"`.

Contrainte vérifiée par le gate : recouvrement < 0,30 avec **toute** question de la banque. Donc ni `get_customer`, ni `lookup_order`, ni `process_refund`, ni `12%`.

```html
<details id="d1-q1" data-domain="D1" data-task="1.4">
<summary>Q1 (D1) — A privilege granted before the role is known</summary>
<div>
<p><strong>Scenario:</strong> An access-provisioning agent reaches your directory through MCP tools (<code>verify_role</code>, <code>grant_access</code>, <code>revoke_access</code>). In 8% of tickets it calls <code>grant_access</code> using only the role the requester claims in the ticket text, and auditors have found permissions granted to people who never held the role.</p>
<p><strong>Question:</strong> What change most reliably prevents the ungrounded grants?</p>
<p data-opt="a">A) Block <code>grant_access</code> in code until <code>verify_role</code> has returned a role for that user.</p>
<p data-opt="b">B) State in the system prompt that role verification is mandatory before granting anything.</p>
<p data-opt="c">C) Add few-shot examples showing the agent verifying the role first, even when the ticket names it.</p>
<p data-opt="d">D) Reduce the agent's tool set to <code>verify_role</code> until the ticket is triaged.</p>
<hr>
<p class="correct" data-answer="a">Answer: block the downstream call until verification has returned</p>
<p><strong>Why:</strong> a required ordering that protects a security boundary needs a deterministic guarantee. A prerequisite enforced in code cannot be talked out of, which is what an 8% residual failure rate on privilege grants demands.</p>
<p class="incorrect"><strong>Why the others are wrong:</strong></p>
<ul>
<li data-opt="b">Improves compliance without guaranteeing it — the residual rate stays non-zero across thousands of tickets.</li>
<li data-opt="c">Same limit: examples steer the model, they do not constrain it.</li>
<li data-opt="d">Addresses which tools are <em>available</em>, not the <em>order</em> they are called in. The agent already has the right tools.</li>
</ul>
</div>
</details>
```

- [ ] **Step 3: Vérifier que le doublon a disparu**

Run: `npm run check:questions`
Expected: PASS — `4 / 157 questions migrées`, aucun `recouvrement`.

Pour lire la marge obtenue :
`node -e "import('./tools/lib/questions.mjs').then(async m => { const c = m.loadCorpus(); const s = c.find(q => q.id === 'd1-q1'); const worst = Math.max(...c.filter(q => q.prefix === 'pq').map(q => m.overlap(s.fp, q.fp))); console.log('recouvrement max', worst.toFixed(2)); })"`
Expected: une valeur < 0,30.

- [ ] **Step 4: Journal**

Ajouter trois lignes : `pq-q25` et `pq-q26` (N3, verdict `conforme` ou `corrigé` selon la relecture), et `d1-q1` avec verdict `réécrit` et pour justification le recouvrement 0,67 mesuré contre `pq-q1`.

- [ ] **Step 5: Vérifier l'ensemble**

Run: `npm run check && npm test`
Expected: PASS des deux.

- [ ] **Step 6: Commit**

```bash
git add Practice_Questions.html D1_Architecture_Orchestration_27pct.html specs/2026-08-08-question-audit-log.md
git commit -F - <<'EOF'
refactor(cca-revision): bring task 1.4 under the question contract

Migrates the bank's prerequisite-gate questions and rewrites the D1
self-assessment, which replayed official Q1 at 0.67 overlap - the learner met
the guide's own question in a sheet before ever reaching it in the bank, and
only twelve official questions exist.

The variant keeps the arbitration under test, deterministic guarantee against
probabilistic compliance, on a provisioning scenario that shares no identifier
or figure with the bank. Grouped explanations are split one per distractor,
which the reordering support requires and which analyses them better anyway.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

### Tasks 8 à 36: Les 29 task statements restants

Chaque task statement suit **exactement** le gabarit de Task 7. Un commit par task statement, `npm run check` vert à chacun.

**Procédure, par task statement :**

1. Lister ses questions dans l'inventaire ci-dessous.
2. **N1** — si la banque contient une officielle (`Q1`–`Q12`) : énoncé, options et réponse **inchangés**, comparés mot à mot au guide. Seule l'explication est restructurée.
3. **N2** — pour chaque question dont la bonne réponse dépend d'un flag CLI, d'un champ de frontmatter, d'une portée de configuration, d'un paramètre d'API, d'un nom d'outil ou d'une limite chiffrée : recouper contre `code.claude.com/docs` ou `platform.claude.com/docs`, consigner URL et champ. **Appliquer la contrainte globale « le guide fait loi »** sur les quatre divergences connues.
4. **N3** — pour le reste : une seule réponse défendable comme la meilleure, chaque distracteur faux pour une raison nommable, aucune paire simultanément correcte, énoncé auto-suffisant.
5. Appliquer le contrat à chaque question : `id`, `data-domain`, `data-task`, `data-opt`, `data-answer`, un `<li data-opt>` par distracteur.
6. Traduire en anglais américain toute question de fiche.
7. Réécrire en variante toute question de fiche marquée comme doublon.
8. Attribuer un `data-task` aux questions qui n'en citent aucune — les 45 de fiches et `pq-q12`, `pq-q32`, `pq-q46`, `pq-q53`, `pq-q91`, `pq-q112`. Pour une fiche, la task attribuée appartient à cette fiche et correspond à la section que le quiz teste.
9. Journal, puis `npm run check`, puis commit.

**Inventaire task → questions**

| Task | Banque | Fiche | Doublon à réécrire |
|---|---|---|---|
| 1.1 | Q13 Q14 | — | D0 Q1 ↔ Q13 (0,56), D1 Q4 ↔ Q13 (0,33) |
| 1.2 | Q7 Q48 Q49 Q50 Q51 | — | — |
| 1.3 | Q43 Q44 Q45 Q47 Q111 | — | D1 Q7 ↔ Q43 (0,50) |
| 1.4 | Q1 Q25 Q26 | D1 Q1 | **fait en Task 7** |
| 1.5 | Q15 Q16 | — | D1 Q8 ↔ Q15 (0,63) |
| 1.6 | Q101 Q102 | — | — |
| 1.7 | Q52 Q71 Q72 | — | D1 Q5 ↔ Q52 (0,67), D5 Q7 ↔ Q72 (0,33) |
| 2.1 | Q2 Q27 Q103 Q104 | — | D0 Q4 ↔ Q27 (0,80), D2 Q1 ↔ Q104 (0,50), D2 Q4 ↔ Q27 (0,30) |
| 2.2 | Q17 Q18 | — | — |
| 2.3 | Q9 Q28 Q69 Q70 | — | D2 Q2 ↔ Q70 (0,67) |
| 2.4 | Q64 Q65 Q66 Q67 Q68 | — | D2 Q6 ↔ Q64 (0,75) |
| 2.5 | Q59 Q60 Q61 Q62 Q63 | — | D2 Q7 ↔ Q61 (0,56) |
| 3.1 | Q29 Q30 Q31 | — | — |
| 3.2 | Q4 Q33 Q34 Q35 Q36 Q37 | — | D3 Q2 ↔ Q6 (0,50) |
| 3.3 | Q6 | — | — |
| 3.4 | Q5 Q38 Q39 | — | D3 Q7 ↔ Q38 (0,50) |
| 3.5 | Q40 Q41 Q42 Q85 | — | — |
| 3.6 | Q10 Q73 Q74 Q76 Q77 | — | D3 Q4 ↔ Q10 (0,60), D3 Q5 ↔ Q73 (0,40) |
| 4.1 | Q78 Q79 Q80 | — | — |
| 4.2 | Q81 Q82 Q98 | — | — |
| 4.3 | Q87 Q88 Q89 Q90 Q92 | — | D4 Q4 ↔ Q88 (0,75), D0 Q6 ↔ Q88 (0,50) |
| 4.4 | Q83 Q93 Q94 Q95 | — | — |
| 4.5 | Q11 Q86 Q96 Q97 | — | D4 Q2 ↔ Q11 (0,75), D4 Q6 ↔ Q11 (0,50) |
| 4.6 | Q75 Q84 | — | — |
| 5.1 | Q19 Q20 Q99 Q107 | — | — |
| 5.2 | Q3 Q21 Q22 Q23 Q24 Q110 | — | — |
| 5.3 | Q8 Q54 Q55 | — | D5 Q3 ↔ Q54 (0,67) |
| 5.4 | Q105 Q106 | — | — |
| 5.5 | Q100 Q109 | — | D5 Q4 ↔ Q100 (0,40) |
| 5.6 | Q56 Q57 Q58 Q108 | — | D5 Q5 ↔ Q57 (0,40) |

La colonne *Fiche* est vide partout sauf 1.4 parce **qu'aucune auto-évaluation ne déclare sa task** : les 45 se répartissent au fil des tasks pendant l'étape 8. La colonne *Doublon* en localise déjà 24 sur 45 — 18 paires à 0,50 ou plus, et 6 entre 0,30 et 0,49, toutes au-dessus du plafond que le gate applique. Les 21 restantes se rattachent pendant l'étape 8, et le total des lignes *Fiche* devra faire 45 à la fin du chantier.

Les six paires du second groupe sont plus faciles à traiter que les premières : le recouvrement y tient souvent à deux ou trois valeurs chiffrées partagées, non à la situation entière. Vérifier avant de réécrire — si la situation est réellement différente, il suffit de changer les chiffres.

> **Quatre questions de banque sont visées deux fois.** `Q11` par `D4 Q2` et `D4 Q6` ; `Q88` par `D4 Q4` et `D0 Q6` ; `Q13` par `D0 Q1` et `D1 Q4` ; `Q27` par `D0 Q4` et `D2 Q4`. Leurs variantes doivent diverger de la banque **et l'une de l'autre** : traiter chaque paire dans le même commit, le gate ne comparant pas fiche à fiche.

- [ ] Task 1.1 · [ ] 1.2 · [ ] 1.3 · [ ] 1.5 · [ ] 1.6 · [ ] 1.7
- [ ] Task 2.1 · [ ] 2.2 · [ ] 2.3 · [ ] 2.4 · [ ] 2.5
- [ ] Task 3.1 · [ ] 3.2 · [ ] 3.3 · [ ] 3.4 · [ ] 3.5 · [ ] 3.6
- [ ] Task 4.1 · [ ] 4.2 · [ ] 4.3 · [ ] 4.4 · [ ] 4.5 · [ ] 4.6
- [ ] Task 5.1 · [ ] 5.2 · [ ] 5.3 · [ ] 5.4 · [ ] 5.5 · [ ] 5.6

---

### Task 37: Bascule en mode strict

**Files:**
- Modify: `package.json`, `quiz.js`, `tools/check-quizzes.mjs`, `README.md`

- [ ] **Step 1: Vérifier que les 157 sont migrées**

Run: `npm run check:questions`
Expected: `157 / 157 questions migrées`, `Contrat de question : OK`.

- [ ] **Step 2: Passer le gate en strict**

Dans `package.json` : `"check:questions": "node tools/check-questions.mjs --strict"`.

Run: `npm run check`
Expected: PASS.

- [ ] **Step 3: Retirer le fallback hérité de `quiz.js`**

Dans `findCorrect`, supprimer la branche qui parse `Réponse :` / `Answer:` et le repli sur `LETTERS` lu dans le texte : `data-answer` est désormais garanti sur les 157. Dans `extractChoicesFromBody`, `p.dataset.opt` est garanti, donc `letterInText` disparaît.

Dans `check-quizzes.mjs`, retirer la garde `if (quiz.id)` : elle vaut pour toutes les questions.

- [ ] **Step 4: Vérifier**

Run: `npm run check && npm test`
Expected: PASS des deux.

- [ ] **Step 5: Mettre le README à jour**

Dans le tableau des contrôles, retirer « Progressif pendant la migration — seules les questions déjà migrées sont jugées. » Corriger la ligne de `Practice_Questions.html` du tableau *Contenu du corpus* : les 157 questions sont en anglais, et les auto-évaluations ne sont plus décrites comme françaises.

- [ ] **Step 6: Commit**

```bash
git add package.json quiz.js tools/check-quizzes.mjs README.md
git commit -F - <<'EOF'
build(cca-revision): hold all 157 questions to the contract

Every question now carries an id, a declared domain and task, tagged options and
a data-answer, so the gate switches to strict: a question without an id is a
failure rather than something not yet reached.

Drops the legacy paths that existed only for the migration - findCorrect no
longer parses the answer out of prose, and check-quizzes no longer guards its
assertions behind the presence of an id.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

---

## Self-Review

**Couverture de la spec.** Contrat de question → Tasks 2, 4, 7. Protocole N1/N2/N3 → Tasks 6, 7, 8-36 étape 3-4. 51 attributions de task → Task 8-36 étape 8. Réécriture des 19 doublons → colonne *Doublon* de l'inventaire, Task 7 pour le gabarit. `check-questions.mjs` deux modes → Tasks 3 et 37. `check-diacritics.mjs` par bloc → Task 5. `check-quizzes.mjs` deux formats → Tasks 4 et 37. Quatre changements de `quiz.js` → Task 4 (étapes 3-5) et Task 37 (étape 3). Journal → Task 6. Vérification manuelle navigateur → Task 4 étape 8. Falsifiabilité du gate → Task 3 étape 6, Task 4 étape 7, Task 5 étape 4.

**Trou assumé.** Les 29 task statements de Tasks 8-36 ne portent pas de code : leur contenu est éditorial et dépend de ce que l'audit trouvera. Task 7 sert de gabarit complet et exécutable ; la procédure en neuf étapes et l'inventaire nominatif remplacent le code qu'on ne peut pas préécrire. Un plan qui prétendrait contenir les 157 questions auditées serait un plan inventé.

**Cohérence des noms.** `parseQuestions` / `loadCorpus` / `overlap` / `pagePrefix` (Task 1) sont consommés sous ces noms exacts en Tasks 2, 3 et 7. `checkQuestion` (Task 2) est appelé par `checkCorpus` (Task 3). Le champ `prose` est ajouté en Task 2 avec sa mise à jour du test de Task 1 explicitée. `OVERLAP_MAX` est défini une fois, en Task 3.

**Point de vigilance pour l'exécutant.** Task 4 étape 4 déplace l'appel de `findCorrect` dans `processQuiz` : il doit passer **après** la construction du `ul.choices` — `findCorrect` résout désormais `data-answer` en lettre via `.choices li[data-opt]`, qui n'existe pas avant. C'est la seule modification d'ordre d'exécution du plan, et la seule capable de casser silencieusement les 157 questions d'un coup.
