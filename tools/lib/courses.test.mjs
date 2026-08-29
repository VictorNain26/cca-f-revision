import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseCourse,
  TASK_STATEMENTS,
  OWNED_CONCEPTS,
  readBankTasks,
  sourceFilesInPo,
  checkCorpus,
  readPo4aMasters,
  reconcileCourseFiles,
  diffRenderedFiles,
  diffRenderedPages,
  courseIdFromFilename,
  readDelivered,
  parsePoEntries,
  checkInvariantMarkers,
  auditCorpus,
  checkCatalogueCoverage,
  checkPo4aOptions,
  checkTranslationCompleteness,
  checkPublishedCoursesReconciliation,
  checkEnglishPagesReconciliation,
  checkNoLeakedMetadata,
  checkTaskReferenceDrift,
} from './courses.mjs';
import { readTranslations } from './nav.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('TASK_STATEMENTS couvre les 30 task statements du guide', () => {
  assert.equal(TASK_STATEMENTS.length, 30);
  assert.ok(TASK_STATEMENTS.includes('1.1'));
  assert.ok(TASK_STATEMENTS.includes('5.6'));
  assert.equal(new Set(TASK_STATEMENTS).size, 30, 'aucun doublon');
});

test('parseCourse lit le titre, ts, src et owns d une section', () => {
  const md = [
    '# D1 — Orchestration',
    '',
    '## 1.1 — Design and implement agentic loops',
    '<!-- ts:1.1 | src:08agentsdk §2-3 -->',
    '<!-- owns:agentic-loop -->',
    '',
    'Prose.',
  ].join('\n');
  const { sections } = parseCourse(md);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, '1.1 — Design and implement agentic loops');
  assert.equal(sections[0].ts, '1.1');
  assert.equal(sections[0].src, '08agentsdk §2-3');
  assert.deepEqual(sections[0].owns, ['agentic-loop']);
});

test('parseCourse accepte une section sans ts (cas D0)', () => {
  const md = ['## Anatomy of a request', '<!-- src:05claudeapi L5 -->', '', 'Prose.'].join('\n');
  const { sections } = parseCourse(md);
  assert.equal(sections[0].ts, null);
  assert.equal(sections[0].src, '05claudeapi L5');
});

test('parseCourse signale une section sans métadonnées', () => {
  const { sections } = parseCourse('## Orpheline\n\nProse.');
  assert.equal(sections[0].src, null);
  assert.equal(sections[0].ts, null, 'ts doit valoir null, pas undefined');
  assert.deepEqual(sections[0].owns, [], 'owns doit valoir [], pas undefined');
});

test('parseCourse ignore le titre de niveau 1', () => {
  const { sections } = parseCourse('# Titre\n\n## Une\n<!-- src:x -->\n');
  assert.equal(sections.length, 1);
});

test('OWNED_CONCEPTS déclare des propriétaires de domaine valides', () => {
  const owners = Object.values(OWNED_CONCEPTS);
  assert.ok(owners.length >= 8);
  for (const owner of owners) {
    assert.match(owner, /^[0-5]$/, `propriétaire invalide : ${owner}`);
  }
});

test('sourceFilesInPo ventile les entrées par fichier source', () => {
  const po = [
    '#: courses/en/00-api-foundations.md:12',
    'msgid "A"',
    'msgstr ""',
    '',
    '#: courses/en/01-orchestration.md:4',
    '#: courses/en/01-orchestration.md:9',
    'msgid "B"',
    'msgstr ""',
  ].join('\n');
  assert.deepEqual(
    [...sourceFilesInPo(po)].sort(),
    ['courses/en/00-api-foundations.md', 'courses/en/01-orchestration.md'],
  );
});

test('sourceFilesInPo lit plusieurs références sur une même ligne #:', () => {
  const po = [
    '#: courses/en/00-api-foundations.md:12 courses/en/01-orchestration.md:3',
    'msgid "C"',
    'msgstr ""',
  ].join('\n');
  assert.deepEqual(
    [...sourceFilesInPo(po)].sort(),
    ['courses/en/00-api-foundations.md', 'courses/en/01-orchestration.md'],
  );
});

test('readBankTasks lit les data-task de la vraie banque', () => {
  const html = fs.readFileSync(path.join(ROOT, 'Practice_Questions.html'), 'utf8');
  const tasks = readBankTasks(html);
  assert.ok(tasks.has('1.1'), 'la banque doit couvrir 1.1');
  assert.ok(tasks.has('5.6'), 'la banque doit couvrir 5.6');
});

test('chaque task statement du référentiel a au moins une question en banque', () => {
  const html = fs.readFileSync(path.join(ROOT, 'Practice_Questions.html'), 'utf8');
  const tasks = readBankTasks(html);
  const missing = TASK_STATEMENTS.filter((ts) => !tasks.has(ts));
  assert.deepEqual(missing, [], `task statements sans question : ${missing.join(', ')}`);
});

test('parseCourse capture plusieurs marqueurs owns dans une même section', () => {
  const md = [
    '## 2.2 — Structured errors',
    '<!-- ts:2.2 | src:02mcp -->',
    '<!-- owns:structured-errors -->',
    '<!-- owns:mcp-resources -->',
    '',
    'Prose.',
  ].join('\n');
  const { sections } = parseCourse(md);
  assert.deepEqual(sections[0].owns, ['structured-errors', 'mcp-resources']);
  assert.deepEqual(sections[0].ownsMalformed, [], 'des marqueurs valides ne sont pas malformés');
});

test('parseCourse signale un marqueur owns malformé : faute de frappe « own »', () => {
  const md = ['## Une', '<!-- src:x -->', '<!-- own:agentic-loop -->', '', 'Prose.'].join('\n');
  const { sections } = parseCourse(md);
  assert.deepEqual(sections[0].owns, [], 'la forme fautive ne doit pas être acceptée comme owns valide');
  assert.deepEqual(sections[0].ownsMalformed, ['<!-- own:agentic-loop -->']);
});

test('parseCourse signale un marqueur owns malformé : espace après le deux-points', () => {
  const md = ['## Une', '<!-- src:x -->', '<!-- owns: agentic-loop -->', '', 'Prose.'].join('\n');
  const { sections } = parseCourse(md);
  assert.deepEqual(sections[0].owns, []);
  assert.deepEqual(sections[0].ownsMalformed, ['<!-- owns: agentic-loop -->']);
});

test('parseCourse signale un marqueur owns malformé : casse et caractères hors [a-z0-9-]', () => {
  const md = ['## Une', '<!-- src:x -->', '<!-- owns:Agentic_Loop -->', '', 'Prose.'].join('\n');
  const { sections } = parseCourse(md);
  assert.deepEqual(sections[0].owns, []);
  assert.deepEqual(sections[0].ownsMalformed, ['<!-- owns:Agentic_Loop -->']);
});

const section = (ts, src, owns) =>
  `## ${ts ?? 'Sans numéro'} — titre\n<!-- ${ts ? `ts:${ts} | ` : ''}src:${src} -->\n` +
  (owns ? `<!-- owns:${owns} -->\n` : '') + '\nProse.\n';

test('checkCorpus signale une section sans src', () => {
  const courses = [{ id: '0', file: 'courses/en/00.md', markdown: '## Orpheline\n\nProse.\n' }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(), delivered: [] });
  assert.ok(problems.some((p) => p.includes('sans src')), problems.join('\n'));
});

test('checkCorpus signale un task statement manquant sur un cours livré', () => {
  const courses = [{ id: '1', file: 'courses/en/01.md', markdown: section('1.1', 'x') }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['1.1']), delivered: ['1'] });
  assert.ok(problems.some((p) => p.includes('1.2')), 'doit lister les TS du domaine 1 absents');
});

test('checkCorpus agrège la couverture des task statements sur les fichiers d un même domaine', () => {
  const courses = [
    { id: '1', file: 'courses/en/01a.md', markdown: section('1.1', 'x') + '\n' + section('1.2', 'x') + '\n' + section('1.3', 'x') + '\n' + section('1.4', 'x') },
    { id: '1', file: 'courses/en/01b.md', markdown: section('1.5', 'x') + '\n' + section('1.6', 'x') + '\n' + section('1.7', 'x') },
  ];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(), delivered: ['1'] });
  assert.deepEqual(problems, [], 'les deux fichiers se partagent les sept task statements du domaine 1');
});

test('checkCorpus ne réclame aucun task statement à D0', () => {
  const courses = [{ id: '0', file: 'courses/en/00.md', markdown: section(null, 'x', 'messages-api') }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(), delivered: ['0'] });
  assert.deepEqual(problems, []);
});

test('checkCorpus signale une notion revendiquée deux fois dans le même domaine', () => {
  const courses = [{
    id: '1',
    file: 'a.md',
    markdown: section('1.1', 'x', 'agentic-loop') + '\n' + section('1.2', 'y', 'agentic-loop'),
  }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['1.1', '1.2']), delivered: [] });
  assert.ok(problems.some((p) => p.includes('déjà revendiqué')), problems.join('\n'));
  assert.ok(!problems.some((p) => p.includes('appartient au domaine')), 'même domaine : pas de mauvaise attribution');
});

test('checkCorpus signale une notion revendiquée par le mauvais cours', () => {
  const courses = [{ id: '2', file: 'b.md', markdown: section('2.1', 'x', 'agentic-loop') }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['2.1']), delivered: [] });
  assert.ok(problems.some((p) => p.includes('appartient au domaine 1')), problems.join('\n'));
});

test('checkCorpus signale une notion inconnue, absente de OWNED_CONCEPTS', () => {
  const courses = [{ id: '1', file: 'a.md', markdown: section('1.1', 'x', 'notion-inexistante') }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['1.1']), delivered: [] });
  assert.ok(problems.some((p) => p.includes('notion inconnue')), problems.join('\n'));
});

test('checkCorpus signale un marqueur owns malformé (intégration)', () => {
  const md = section('1.1', 'x').replace('\n\nProse.', '\n<!-- owns: agentic-loop -->\n\nProse.');
  const courses = [{ id: '1', file: 'a.md', markdown: md }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['1.1']), delivered: [] });
  assert.ok(problems.some((p) => p.includes('marqueur owns malformé')), problems.join('\n'));
});

test('checkCorpus signale un task statement dupliqué dans un même cours', () => {
  const courses = [{ id: '1', file: 'a.md', markdown: section('1.1', 'x') + '\n' + section('1.1', 'y') }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['1.1']), delivered: [] });
  assert.ok(problems.some((p) => p.includes('1.1') && p.includes('déjà couvert')), problems.join('\n'));
});

test('checkCorpus signale un renvoi vers un data-task absent de la banque', () => {
  const courses = [{
    id: '1', file: 'a.md',
    markdown: section('1.1', 'x') + '\n**To test** — `data-task="9.9"`\n',
  }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['1.1']), delivered: [] });
  assert.ok(problems.some((p) => p.includes('9.9')), problems.join('\n'));
});

test('checkCorpus accepte un corpus sain', () => {
  const courses = [{
    id: '1', file: 'a.md',
    markdown: section('1.1', 'x', 'agentic-loop') + '\n**To test** — `data-task="1.1"`\n',
  }];
  const { problems } = checkCorpus({ courses, bankTasks: new Set(['1.1']), delivered: [] });
  assert.deepEqual(problems, []);
});

test('readPo4aMasters lit les masters déclarés dans po4a.conf', () => {
  const conf = [
    '[po4a_langs] fr',
    '[po4a_paths] courses/po/courses.pot $lang:courses/po/$lang.po',
    '',
    '[type: text] courses/en/00-api-foundations.md $lang:courses/fr/00-api-foundations.md opt:"-o markdown"',
  ].join('\n');
  assert.deepEqual(readPo4aMasters(conf), [
    { master: 'courses/en/00-api-foundations.md', target: 'courses/fr/00-api-foundations.md' },
  ]);
});

test('reconcileCourseFiles signale un fichier anglais non déclaré dans la conf', () => {
  const { problems } = reconcileCourseFiles({
    masters: [],
    enFiles: ['courses/en/00-api-foundations.md'],
    frFiles: [],
  });
  assert.ok(problems.some((p) => p.includes('non déclaré')), problems.join('\n'));
});

test('reconcileCourseFiles signale un français sans anglais correspondant', () => {
  const { problems } = reconcileCourseFiles({
    masters: [{ master: 'courses/en/00.md', target: 'courses/fr/00.md' }],
    enFiles: ['courses/en/00.md'],
    frFiles: ['courses/fr/00.md', 'courses/fr/orphelin.md'],
  });
  assert.ok(problems.some((p) => p.includes('orphelin.md') && p.includes('sans anglais')), problems.join('\n'));
});

test('reconcileCourseFiles signale un master déclaré sans fichier', () => {
  const { problems } = reconcileCourseFiles({
    masters: [{ master: 'courses/en/99-disparu.md', target: 'courses/fr/99-disparu.md' }],
    enFiles: [],
    frFiles: [],
  });
  assert.ok(problems.some((p) => p.includes('99-disparu.md') && p.includes('absent')), problems.join('\n'));
});

test('reconcileCourseFiles accepte un corpus cohérent', () => {
  const { problems } = reconcileCourseFiles({
    masters: [{ master: 'courses/en/00.md', target: 'courses/fr/00.md' }],
    enFiles: ['courses/en/00.md'],
    frFiles: ['courses/fr/00.md'],
  });
  assert.deepEqual(problems, []);
});

test('diffRenderedFiles signale un fichier produit par le rendu isolé mais absent de courses/fr/', () => {
  const { problems } = diffRenderedFiles({}, { 'courses/fr/00.md': 'contenu' });
  assert.ok(problems.some((p) => p.includes('absent de courses/fr/')), problems.join('\n'));
});

test('diffRenderedFiles signale un fichier de courses/fr/ que le rendu isolé ne produit plus', () => {
  const { problems } = diffRenderedFiles({ 'courses/fr/00.md': 'contenu' }, {});
  assert.ok(problems.some((p) => p.includes('non produit par le rendu isolé')), problems.join('\n'));
});

test('diffRenderedFiles signale un contenu divergent', () => {
  const { problems } = diffRenderedFiles({ 'courses/fr/00.md': 'a' }, { 'courses/fr/00.md': 'b' });
  assert.ok(problems.some((p) => p.includes('diverge du rendu de po4a')), problems.join('\n'));
});

test('diffRenderedFiles accepte un rendu identique', () => {
  const { problems } = diffRenderedFiles({ 'courses/fr/00.md': 'a' }, { 'courses/fr/00.md': 'a' });
  assert.deepEqual(problems, []);
});

test('diffRenderedPages signale une page produite par le rendu mais absente du dépôt', () => {
  const { problems } = diffRenderedPages({}, { 'D0_API_Fundamentals.html': '<html></html>' });
  assert.ok(problems.some((p) => p.includes('absent du dépôt')), problems.join('\n'));
});

test('diffRenderedPages signale une page du dépôt que le rendu ne produit plus', () => {
  const { problems } = diffRenderedPages({ 'D0_API_Fundamentals.html': '<html></html>' }, {});
  assert.ok(problems.some((p) => p.includes('non produit par le rendu')), problems.join('\n'));
});

test('diffRenderedPages signale une page française éditée à la main, en pointant les deux sources possibles', () => {
  const { problems } = diffRenderedPages(
    { 'D0_API_Fundamentals.html': '<p>a</p>' },
    { 'D0_API_Fundamentals.html': '<p>b</p>' },
  );
  assert.ok(problems.some((p) => p.includes('D0_API_Fundamentals.html') && p.includes('éditer courses/en/ ou courses/po/fr.po, pas la page')), problems.join('\n'));
});

test('diffRenderedPages signale une page anglaise éditée à la main, en pointant courses/en/ seul', () => {
  const { problems } = diffRenderedPages(
    { 'en/D0_API_Fundamentals.html': '<p>a</p>' },
    { 'en/D0_API_Fundamentals.html': '<p>b</p>' },
  );
  assert.ok(problems.some((p) => p.includes('en/D0_API_Fundamentals.html') && p.includes('éditer courses/en/, pas la page')), problems.join('\n'));
  assert.ok(problems.every((p) => !p.includes('courses/po/fr.po')), problems.join('\n'));
});

test('diffRenderedPages accepte une page identique à son rendu', () => {
  const { problems } = diffRenderedPages(
    { 'en/D0_API_Fundamentals.html': '<p>a</p>' },
    { 'en/D0_API_Fundamentals.html': '<p>a</p>' },
  );
  assert.deepEqual(problems, []);
});

test('courseIdFromFilename extrait le domaine du préfixe numérique', () => {
  assert.equal(courseIdFromFilename('00-api-foundations.md'), '0');
  assert.equal(courseIdFromFilename('01-orchestration.md'), '1');
});

test('courseIdFromFilename retourne null pour un nom hors convention', () => {
  assert.equal(courseIdFromFilename('annexe.md'), null);
});

test('readDelivered lit les cours cochés dans le tableau', () => {
  const readme = ['| Statut | Domaine |', '|---|---|', '| ✅ | D0 |', '|  | D1 |'].join('\n');
  const { delivered, recognized } = readDelivered(readme);
  assert.deepEqual(delivered, ['0']);
  assert.equal(recognized, true);
});

test('readDelivered signale un tableau non reconnu plutôt que de retourner [] en silence', () => {
  const { delivered, recognized } = readDelivered('Rien de tel ici.');
  assert.deepEqual(delivered, []);
  assert.equal(recognized, false);
});

const PO_HEADER = 'msgid ""\nmsgstr ""\n"Language: fr\\n"\n';

test('parsePoEntries lit les commentaires de traducteur, pas les extraits, et repère la bonne ligne', () => {
  const po = PO_HEADER + [
    '',
    '# invariant: identifiant technique',
    '#. type: Title ##',
    '#: courses/en/00.md:12',
    'msgid "stop_reason"',
    'msgstr "stop_reason"',
  ].join('\n');
  const [entry] = parsePoEntries(po);
  assert.deepEqual(entry.translatorComments, ['invariant: identifiant technique']);
  assert.equal(entry.msgid, 'stop_reason');
  assert.equal(entry.msgstr, 'stop_reason');
  // Bloc marqué : l'entrée démarre sur la ligne du commentaire de traducteur
  // (en tête de bloc, cf. finding 2), pas sur celle de « #. type: ».
  assert.equal(entry.line, 5);
});

test('parsePoEntries recolle les chaînes repliées sur plusieurs lignes', () => {
  const po = PO_HEADER + [
    '',
    'msgid ""',
    '"première partie "',
    '"seconde partie"',
    'msgstr ""',
    '"traduite"',
  ].join('\n');
  const [entry] = parsePoEntries(po);
  assert.equal(entry.msgid, 'première partie seconde partie');
  assert.equal(entry.msgstr, 'traduite');
  // Bloc sans commentaire : l'entrée démarre sur la ligne du msgid lui-même.
  assert.equal(entry.line, 5);
});

test('parsePoEntries ignore l en-tête du catalogue', () => {
  assert.deepEqual(parsePoEntries(PO_HEADER), []);
});

test('checkInvariantMarkers exige expectedCount, pour ne pas pouvoir se débrancher en silence', () => {
  const po = PO_HEADER + '\nmsgid "Content blocks"\nmsgstr "Content blocks"\n';
  assert.throws(() => checkInvariantMarkers(parsePoEntries(po)), TypeError);
  assert.throws(() => checkInvariantMarkers(parsePoEntries(po), {}), TypeError);
});

test('checkInvariantMarkers refuse une recopie non déclarée', () => {
  const po = PO_HEADER + '\nmsgid "Content blocks"\nmsgstr "Content blocks"\n';
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Content blocks/);
  assert.match(problems[0], /invariant:/);
});

test('checkInvariantMarkers accepte une recopie déclarée', () => {
  const po = PO_HEADER + '\n# invariant: identifiant technique\nmsgid "stop_reason"\nmsgstr "stop_reason"\n';
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 });
  assert.deepEqual(problems, []);
});

test('checkInvariantMarkers distingue une raison manquante d une ponctuation incorrecte', () => {
  const po = PO_HEADER + '\n# invariant:\nmsgid "Content blocks"\nmsgstr "Content blocks"\n';
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 });
  assert.equal(problems.length, 1, 'un marqueur sans raison ne vaut pas déclaration');
  assert.match(problems[0], /sans raison/);
  assert.doesNotMatch(problems[0], /mal formé/);
});

test('checkInvariantMarkers signale un marqueur devenu inutile', () => {
  const po = PO_HEADER + '\n# invariant: identifiant\nmsgid "Content blocks"\nmsgstr "Blocs de contenu"\n';
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /n'est plus une recopie/);
});

test('checkInvariantMarkers laisse passer une traduction ordinaire', () => {
  const po = PO_HEADER + '\nmsgid "Content blocks"\nmsgstr "Blocs de contenu"\n';
  assert.deepEqual(checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 }).problems, []);
});

test('checkInvariantMarkers ignore une entrée non traduite, même marquée', () => {
  const po = PO_HEADER + '\n# invariant: raison\nmsgid "Content blocks"\nmsgstr ""\n';
  assert.deepEqual(checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 }).problems, []);
});

test('checkInvariantMarkers ignore un msgstr fait uniquement d espaces, marqueur compris', () => {
  // Sans norm() dans la garde de saut : strict vrai, non identique à
  // "Content blocks" → « n'est plus une recopie » à tort. C'est cette
  // branche que le test doit exercer, pas le simple msgstr d'espaces
  // sans marqueur, où aucune branche ne tire de toute façon.
  const po = PO_HEADER + '\n# invariant: raison\nmsgid "Content blocks"\nmsgstr "   "\n';
  assert.deepEqual(checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 }).problems, []);
});

test('checkInvariantMarkers tolère l accent français mais signale un marqueur mal formé', () => {
  const po = PO_HEADER + '\n# invariant : identifiant technique\nmsgid "stop_reason"\nmsgstr "stop_reason"\n';
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /mal formé/);
  assert.doesNotMatch(problems[0], /sans raison/);
});

test('checkInvariantMarkers normalise les espaces avant de comparer', () => {
  const po = PO_HEADER + '\nmsgid "Content blocks"\nmsgstr "Content  blocks "\n';
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 1 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /invariant:/);
});

test('checkInvariantMarkers ne fait fuiter aucun marqueur vers l entrée suivante', () => {
  const po = PO_HEADER + [
    '',
    '# invariant: identifiant technique',
    'msgid "stop_reason"',
    'msgstr "stop_reason"',
    '',
    'msgid "Content blocks"',
    'msgstr "Content blocks"',
  ].join('\n');
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 2 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Content blocks/);
});

test('checkInvariantMarkers signale un parsePoEntries qui a perdu des entrées', () => {
  const po = PO_HEADER + '\nmsgid "Content blocks"\nmsgstr "Blocs de contenu"\n';
  const { problems } = checkInvariantMarkers(parsePoEntries(po), { expectedCount: 5 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /1 entrée/);
  assert.match(problems[0], /5 attendue/);
});

test('parsePoEntries sépare deux entrées collées sans ligne vide', () => {
  const po = PO_HEADER + [
    '',
    '# invariant: identifiant technique',
    'msgid "stop_reason"',
    'msgstr "stop_reason"',
    '#. type: Plain text',
    'msgid "Content blocks"',
    'msgstr "Content blocks"',
  ].join('\n');
  const entries = parsePoEntries(po);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].translatorComments, ['invariant: identifiant technique']);
  assert.deepEqual(entries[1].translatorComments, []);
});

test('parsePoEntries lit le vrai catalogue courses/po/fr.po au complet', () => {
  const realPo = fs.readFileSync(path.join(ROOT, 'courses', 'po', 'fr.po'), 'utf8');
  const entries = parsePoEntries(realPo);
  // Détecteur de l'invariant que le runner exploite réellement (le compte
  // indépendant de checkInvariantMarkers), pas un nombre en dur qu'il
  // faudrait éditer à chaque cours ajouté.
  assert.equal(entries.length, (realPo.match(/^#\. /gm) ?? []).length);
  // Rattache la position du finding 2 (marqueurs en tête de bloc) au parseur :
  // toutes les recopies déclarées du corpus doivent être lues. Le compte
  // attendu se dérive du fichier — comme l'assertion ci-dessus — plutôt que de
  // vivre en dur : un nombre figé se réécrit à chaque cours livré, et cette
  // réécriture est exactement l'occasion de le mettre au niveau de ce qu'on
  // observe au lieu de ce qu'on attend.
  const declared = (realPo.match(/^# invariant:/gm) ?? []).length;
  assert.ok(declared > 0, 'le catalogue doit déclarer au moins une recopie');
  const invariantEntries = entries.filter((e) => e.translatorComments.some((c) => /^invariant\s*:/i.test(c)));
  assert.equal(invariantEntries.length, declared);
});

test('auditCorpus rassemble les problèmes des quatre vérifications', () => {
  const { problems } = auditCorpus({
    courses: [{ id: '0', file: 'courses/en/00-x.md', markdown: '## Sans src\n\nProse.\n' }],
    bankTasks: new Set(),
    delivered: [],
    poEntries: [{ translatorComments: [], msgid: 'A', msgstr: 'A', line: 3 }],
    expectedPoEntryCount: 1,
    masters: [],
    frBefore: { 'courses/fr/00-x.md': 'ancien' },
    frAfter: { 'courses/fr/00-x.md': 'nouveau' },
    fuzzyFiles: [],
    untranslatedFiles: [],
    fuzzyCount: 0,
    untranslatedCount: 0,
    enPages: [],
    translations: {},
  });
  assert.ok(problems.some((p) => p.includes('sans src')), 'checkCorpus doit contribuer');
  assert.ok(problems.some((p) => p.includes('non déclaré')), 'reconcileCourseFiles doit contribuer');
  assert.ok(problems.some((p) => p.includes('diverge')), 'diffRenderedFiles doit contribuer');
  assert.ok(problems.some((p) => p.includes('répète la source')), 'checkInvariantMarkers doit contribuer');
});

test('auditCorpus voit une dérive du français prise entre le snapshot avant et après', () => {
  const base = {
    courses: [{ id: '0', file: 'courses/en/00.md', markdown: '## Une\n<!-- src:x -->\n\nProse.\n' }],
    bankTasks: new Set(),
    delivered: [],
    poEntries: [],
    expectedPoEntryCount: 0,
    masters: [{ master: 'courses/en/00.md', target: 'courses/fr/00.md' }],
    fuzzyFiles: [],
    untranslatedFiles: [],
    fuzzyCount: 0,
    untranslatedCount: 0,
    enPages: [],
    translations: {},
  };
  const drift = auditCorpus({ ...base, frBefore: { 'courses/fr/00.md': 'x' }, frAfter: { 'courses/fr/00.md': 'y' } });
  const clean = auditCorpus({ ...base, frBefore: { 'courses/fr/00.md': 'x' }, frAfter: { 'courses/fr/00.md': 'x' } });
  assert.equal(drift.problems.length, 1);
  assert.deepEqual(clean.problems, []);
});

test('auditCorpus exige fuzzyFiles, untranslatedFiles, fuzzyCount, untranslatedCount, enPages et translations, pour ne pas pouvoir se débrancher en silence', () => {
  const base = {
    courses: [],
    bankTasks: new Set(),
    delivered: [],
    poEntries: [],
    expectedPoEntryCount: 0,
    masters: [],
    frBefore: {},
    frAfter: {},
    fuzzyFiles: [],
    untranslatedFiles: [],
    fuzzyCount: 0,
    untranslatedCount: 0,
    enPages: [],
    translations: {},
  };
  for (const missing of ['fuzzyFiles', 'untranslatedFiles', 'fuzzyCount', 'untranslatedCount', 'enPages', 'translations']) {
    const { [missing]: _drop, ...rest } = base;
    assert.throws(() => auditCorpus(rest), TypeError, `omettre ${missing} doit lever, pas rendre le contrôle vert par accident`);
  }
});

test('checkCatalogueCoverage signale un segment source absent du catalogue', () => {
  const { problems } = checkCatalogueCoverage({
    potEntries: [{ msgid: 'A', msgstr: '' }, { msgid: 'B nouveau', msgstr: '' }],
    poEntries: [{ msgid: 'A', msgstr: 'a' }],
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /B nouveau/);
  assert.match(problems[0], /build:courses/);
});

test('checkCatalogueCoverage accepte un catalogue à jour', () => {
  const { problems } = checkCatalogueCoverage({
    potEntries: [{ msgid: 'A', msgstr: '' }],
    poEntries: [{ msgid: 'A', msgstr: 'a' }, { msgid: 'ancien', msgstr: 'x' }],
  });
  assert.deepEqual(problems, [], 'une entrée périmée du .po ne doit pas bloquer');
});

test('checkPo4aOptions exige --force dans le script build:courses', () => {
  const { problems } = checkPo4aOptions({ confText: '[options] --keep 0\n[po4a_langs] fr\n', buildScript: 'po4a courses/po4a.conf' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /--force/);
  assert.match(problems[0], /build:courses/);
});

test('checkPo4aOptions exige --keep 0 dans la conf', () => {
  const { problems } = checkPo4aOptions({ confText: '[options]\n', buildScript: 'po4a --force courses/po4a.conf' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /--keep/);
});

test('checkPo4aOptions accepte la configuration attendue', () => {
  assert.deepEqual(
    checkPo4aOptions({ confText: '[options] --keep 0\n', buildScript: 'po4a --force courses/po4a.conf' }).problems,
    [],
  );
});

test('checkTranslationCompleteness bloque une entrée vide sur un cours annoncé livré', () => {
  const { problems, notices } = checkTranslationCompleteness({
    fuzzyFiles: [],
    untranslatedFiles: ['courses/en/01-orchestration.md'],
    delivered: ['1'],
    fuzzyCount: 0,
    untranslatedCount: 3,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /annoncé livré/);
  assert.match(problems[0], /3 entrée/);
  assert.deepEqual(notices, []);
});

test('checkTranslationCompleteness ne bloque pas une entrée vide sur un cours non livré', () => {
  const { problems, notices } = checkTranslationCompleteness({
    fuzzyFiles: [],
    untranslatedFiles: ['courses/en/01-orchestration.md'],
    delivered: [],
    fuzzyCount: 0,
    untranslatedCount: 3,
  });
  assert.deepEqual(problems, []);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /traduction incomplète/);
});

test('checkTranslationCompleteness bloque toujours une entrée fuzzy, livré ou non', () => {
  const { problems } = checkTranslationCompleteness({
    fuzzyFiles: ['courses/en/00-api-foundations.md'],
    untranslatedFiles: [],
    delivered: [],
    fuzzyCount: 2,
    untranslatedCount: 0,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /périmée/);
  assert.match(problems[0], /2 entrée/);
});

test('checkTranslationCompleteness accepte l absence d entrée fuzzy ou vide', () => {
  const { problems, notices } = checkTranslationCompleteness({
    fuzzyFiles: [],
    untranslatedFiles: [],
    delivered: ['0'],
    fuzzyCount: 0,
    untranslatedCount: 0,
  });
  assert.deepEqual(problems, []);
  assert.deepEqual(notices, []);
});

test('checkEnglishPagesReconciliation accepte une page anglaise déclarée dans TRANSLATIONS', () => {
  const { problems } = checkEnglishPagesReconciliation({
    enPages: ['D0_API_Fundamentals.html'],
    translations: { 'D0_API_Fundamentals.html': 'en/D0_API_Fundamentals.html' },
  });
  assert.deepEqual(problems, []);
});

test('checkEnglishPagesReconciliation signale une page publiée sous en/ qu aucune entrée ne rend atteignable', () => {
  const { problems } = checkEnglishPagesReconciliation({
    enPages: ['D0_API_Fundamentals.html', 'D4_Prompt_Engineering_20pct.html'],
    translations: { 'D0_API_Fundamentals.html': 'en/D0_API_Fundamentals.html' },
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /D4_Prompt_Engineering_20pct\.html — page anglaise publiée mais absente de TRANSLATIONS/);
  assert.match(problems[0], /inaccessible/);
});

test('checkEnglishPagesReconciliation signale une entrée TRANSLATIONS sans page sur le disque', () => {
  const { problems } = checkEnglishPagesReconciliation({
    enPages: [],
    translations: { 'D2_Tool_Design_MCP_18pct.html': 'en/D2_Tool_Design_MCP_18pct.html' },
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /nav\.js — TRANSLATIONS déclare/);
  assert.match(problems[0], /n'existe pas sur le disque/);
});

test('nav.js déclare une traduction pour chaque page réellement publiée sous en/', () => {
  const enDir = path.join(ROOT, 'en');
  const enPages = fs.readdirSync(enDir).filter((f) => f.endsWith('.html')).sort();
  const translations = readTranslations(path.join(ROOT, 'nav.js'));
  const { problems } = checkEnglishPagesReconciliation({ enPages, translations });
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('checkPublishedCoursesReconciliation accepte un domaine coché avec son entrée', () => {
  const { problems } = checkPublishedCoursesReconciliation({
    delivered: ['0'],
    publishedCourses: [{ domain: 'D0', file: '00-api-foundations.md', slug: 'D0_API_Fundamentals.html' }],
  });
  assert.deepEqual(problems, []);
});

test('checkPublishedCoursesReconciliation signale un domaine coché sans entrée PUBLISHED_COURSES', () => {
  const { problems } = checkPublishedCoursesReconciliation({ delivered: ['0', '1'], publishedCourses: [] });
  assert.equal(problems.length, 2);
  assert.match(problems.join(' '), /D0 coché livré mais absent/);
  assert.match(problems.join(' '), /D1 coché livré mais absent/);
});

test('checkPublishedCoursesReconciliation signale une entrée PUBLISHED_COURSES dont le domaine n est plus coché', () => {
  const { problems } = checkPublishedCoursesReconciliation({
    delivered: [],
    publishedCourses: [{ domain: 'D0', file: '00-api-foundations.md', slug: 'D0_API_Fundamentals.html' }],
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /D0 présent dans PUBLISHED_COURSES/);
});

test('checkNoLeakedMetadata accepte une page sans commentaire de traçabilité', () => {
  const { problems } = checkNoLeakedMetadata({ 'D0_API_Fundamentals.html': '<p>Prose.</p>' });
  assert.deepEqual(problems, []);
});

test('checkNoLeakedMetadata signale un commentaire src: ou owns: fuité dans la page', () => {
  const { problems } = checkNoLeakedMetadata({
    'D0_API_Fundamentals.html': '<p>Prose.</p>',
    'en/D0_API_Fundamentals.html': '<!-- src:x --><p>Prose.</p>',
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /en\/D0_API_Fundamentals\.html/);
});

test('checkTaskReferenceDrift attrape le mauvais appariement réel de po4a sur D3', () => {
  // Cas réel, deux fois : po4a a pré-rempli la ligne « À tester » de 3.1 avec
  // la traduction de 2.1 (D3), et celle de 1.2 avec celle de 1.6 (D1).
  const po = PO_HEADER
    + '\n#: courses/en/03-claude-code-config.md:144\n'
    + 'msgid "**To test** — bank questions tagged `data-task=\\"3.1\\"`.\\n"\n'
    + 'msgstr "**À tester** — les questions de la banque étiquetées `data-task=\\"2.1\\"`.\\n"\n';
  const { problems } = checkTaskReferenceDrift(parsePoEntries(po));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /3\.1/);
  assert.match(problems[0], /2\.1/);
  assert.match(problems[0], /relire/i);
});

test('checkTaskReferenceDrift accepte une traduction qui cite le même task statement', () => {
  const po = PO_HEADER
    + '\nmsgid "**To test** — bank questions tagged `data-task=\\"3.1\\"`.\\n"\n'
    + 'msgstr "**À tester** — les questions de la banque étiquetées `data-task=\\"3.1\\"`.\\n"\n';
  assert.deepEqual(checkTaskReferenceDrift(parsePoEntries(po)).problems, []);
});

test('checkTaskReferenceDrift ignore une entrée non traduite plutôt que de la compter deux fois', () => {
  const po = PO_HEADER
    + '\nmsgid "**To test** — bank questions tagged `data-task=\\"3.1\\"`.\\n"\nmsgstr ""\n';
  assert.deepEqual(checkTaskReferenceDrift(parsePoEntries(po)).problems, []);
});

test('checkTaskReferenceDrift compare les ensembles, pour une entrée qui cite plusieurs tasks', () => {
  const po = PO_HEADER
    + '\nmsgid "voir data-task=\\"1.2\\" et data-task=\\"1.3\\""\n'
    + 'msgstr "voir data-task=\\"1.3\\" et data-task=\\"1.2\\""\n';
  assert.deepEqual(checkTaskReferenceDrift(parsePoEntries(po)).problems, [],
    'le même ensemble dans un autre ordre reste le bon renvoi');
});

test('checkTaskReferenceDrift signale un renvoi perdu à la traduction', () => {
  const po = PO_HEADER
    + '\nmsgid "voir data-task=\\"1.2\\" et data-task=\\"1.3\\""\n'
    + 'msgstr "voir data-task=\\"1.2\\""\n';
  const { problems } = checkTaskReferenceDrift(parsePoEntries(po));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /1\.3/);
});

test('checkTaskReferenceDrift signale un renvoi que la source ne portait pas', () => {
  // L autre moitié du défaut : po4a remplit un paragraphe neuf, qui ne cite
  // aucun task statement, avec la traduction d une ligne « À tester » voisine.
  const po = PO_HEADER
    + '\nmsgid "Une phrase de prose sans renvoi."\n'
    + 'msgstr "**À tester** — les questions étiquetées `data-task=\\"1.6\\"`."\n';
  const { problems } = checkTaskReferenceDrift(parsePoEntries(po));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /1\.6/);
  assert.match(problems[0], /aucun data-task/);
});

test('checkTaskReferenceDrift laisse passer une entrée sans renvoi de part et d autre', () => {
  const po = PO_HEADER + '\nmsgid "Une phrase de prose."\nmsgstr "Une phrase de prose traduite."\n';
  assert.deepEqual(checkTaskReferenceDrift(parsePoEntries(po)).problems, []);
});
