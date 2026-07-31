# Refonte pédagogique des chapitres D0–D5 — Plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUISE — `superpowers:subagent-driven-development` (recommandée) ou `superpowers:executing-plans` pour exécuter tâche par tâche. Les étapes utilisent la syntaxe `- [ ]` pour le suivi.

**Objectif :** rééquilibrer la structure interne des six fiches de domaine pour que chaque section portant un task statement respecte le contrat en quatre garanties, sans toucher à l'alignement au guide déjà validé.

**Architecture :** un script de contrôle sans dépendances (`tools/check-chapters.mjs`) matérialise le contrat et sert de test. On l'écrit d'abord, on constate qu'il échoue sur les sections identifiées dans le spec, puis on corrige fiche par fiche jusqu'à ce qu'il passe. Chaque fiche est un commit indépendant.

**Stack :** Node.js (script de contrôle, sans dépendance), HTML statique, Python 3 disponible pour les mesures ponctuelles. La suite jsdom existante (`scratchpad/test3.mjs`) sert de filet final sur les quiz.

**Spec de référence :** `specs/2026-07-31-refonte-pedagogique-chapitres-design.md`

## Contraintes globales

- **Le guide fait loi.** Aucune modification ne doit contredire CCAR-F v1.0. Là où la doc actuelle diverge, la réponse du guide reste en tête et la divergence en encadré.
- **Structure constante.** Une section ↔ un task statement, ordre suivant la numérotation du guide, D0 reste une fiche séparée.
- **Contrat de section :** toute section portant une task garantit un problème posé en situation, au moins un exemple concret (artefact copiable — code, config ou payload ; un tableau ne compte pas), un réflexe d'examen, et les distracteurs nommés. Ordre et forme libres.
- **D0 :** la garantie « exemple concret » s'applique ; les trois autres sont facultatives.
- **Français orthographiquement correct**, tous diacritiques inclus. Termes techniques et identifiants en anglais.
- **Aucune modification** de `Practice_Questions.html`, des auto-évaluations, ou de D2.
- **Ancres :** les sommaires internes (`<li><a href="#sN">`) doivent rester cohérents avec les `id="sN"`. Aucune page ne référence les ancres `#sN` d'une autre page — vérifié au design.
- **Commits :** conventional commits, en anglais, scope `cca-revision`. Stager fichier par fichier, jamais `git add .`.

---

### Task 1 : Script de contrôle du contrat de section

**Fichiers :**
- Créer : `tools/check-chapters.mjs`

**Interfaces :**
- Produit : un exécutable `node tools/check-chapters.mjs` qui sort le code 1 si une section portant une task viole le contrat, 0 sinon. Les tâches 2 à 6 s'appuient dessus comme critère d'acceptation.

- [ ] **Étape 1 : écrire le script de contrôle**

Créer `tools/check-chapters.mjs` :

```javascript
#!/usr/bin/env node
/* Contrôle du contrat de section des fiches de domaine.
 * Une section portant un task statement doit garantir :
 *   - un exemple concret (bloc <pre>)
 *   - un réflexe d'examen (bloc .exam-tip)
 *   - des distracteurs nommés (bloc .anti-pattern, ou .exam-tip mentionnant un distracteur)
 * D0 ne porte aucune task : seule la garantie « exemple concret » s'y applique.
 * Sans dépendance : le corpus est du HTML statique régulier.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WEIGHTS = { D1: 27, D2: 18, D3: 20, D4: 20, D5: 15 };

const files = fs.readdirSync(ROOT).filter((f) => /^D[0-5]_.*\.html$/.test(f)).sort();
const failures = [];
const measures = [];

for (const file of files) {
  const code = file.slice(0, 2);
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  // Découpage en sections sur les en-têtes <h2 id="sN">
  const parts = html.split(/<div class="section-header[^"]*"><h2 id="s\d+"/).slice(1);
  let contentWords = 0;

  for (const part of parts) {
    const title = part.split('</h2>')[0].replace(/<[^>]+>/g, '').trim();
    const isTaskSection = /\(Task \d\.\d/.test(title);
    const isQuizSection = /auto-.?valuation|Questions d'auto/i.test(title);
    const isSynthesis = /Synth.se/i.test(title);

    const words = part.replace(/<(pre|script)[^>]*>[\s\S]*?<\/\1>/g, ' ')
                      .replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    if (!isQuizSection) contentWords += words;

    const hasExample = /<pre[\s>]/.test(part);
    const hasExamTip = /class="exam-tip"/.test(part);
    const hasDistractors = /class="anti-pattern"/.test(part) ||
                           /distracteur|anti-pattern|pi.ge/i.test(part);

    if (code === 'D0' && !isQuizSection && !hasExample) {
      failures.push(`${code} — « ${title} » : aucun exemple concret`);
    }
    if (isTaskSection) {
      if (!hasExample) failures.push(`${code} — « ${title} » : aucun exemple concret`);
      if (!hasExamTip) failures.push(`${code} — « ${title} » : aucun réflexe d'examen`);
      if (!hasDistractors) failures.push(`${code} — « ${title} » : aucun distracteur nommé`);
    }
    if (!isTaskSection && !isQuizSection && !isSynthesis && words > 250) {
      failures.push(`${code} — « ${title} » : ${words} mots hors task statement (plafond 250)`);
    }
  }

  // Cohérence sommaire / ancres
  const ids = [...html.matchAll(/<h2 id="(s\d+)"/g)].map((m) => m[1]);
  const toc = [...html.matchAll(/<li><a href="#(s\d+)"/g)].map((m) => m[1]);
  for (const t of toc) if (!ids.includes(t)) failures.push(`${code} — sommaire pointe #${t}, absent de la page`);
  for (const i of ids) if (!toc.includes(i)) failures.push(`${code} — section #${i} absente du sommaire`);

  const w = WEIGHTS[code];
  measures.push({ code, words: contentWords, perPoint: w ? Math.round(contentWords / w) : null });
}

console.log('Volume de contenu (hors auto-évaluations) :');
for (const m of measures) {
  console.log(`  ${m.code}  ${String(m.words).padStart(5)} mots` +
              (m.perPoint ? `  ${String(m.perPoint).padStart(4)} mots/point` : '   (prérequis)'));
}

if (failures.length === 0) {
  console.log('\nContrat de section : OK');
  process.exit(0);
}
console.log(`\nContrat de section : ${failures.length} violation(s)`);
for (const f of failures) console.log('  -', f);
process.exit(1);
```

- [ ] **Étape 2 : lancer le script et constater les échecs attendus**

Commande : `node tools/check-chapters.mjs`

Attendu : code de sortie **1**, avec au minimum ces violations, qui sont celles que le spec a identifiées :
- `D3 — « 3. Les règles conditionnelles par chemin (Task 3.3) » : aucun réflexe d'examen`
- `D3 — « 4. Planning mode vs. direct exécution (Task 3.4) » : aucun exemple concret`
- `D4 — « 3. Les sorties structurées avec tool_use et JSON Schema (Task 4.3) » : aucun exemple concret`
- `D0` : cinq sections sans exemple (§3 à §7)
- `D1 — « 1. Workflows vs. agents : le cadrage (hors task statements) »` : dépassement du plafond de 250 mots

Si le script ne signale pas ces cas, c'est le script qui est faux — le corriger avant d'aller plus loin.

- [ ] **Étape 3 : commiter le script**

```bash
git add tools/check-chapters.mjs
git commit -m "test(cca-revision): add section contract checker for domain chapters"
```

---

### Task 2 : D3 — développer les deux tasks atrophiées

**Fichiers :**
- Modifier : `D3_Claude_Code_Config_20pct.html` (§3, §4, §7, §8, sommaire)

**Interfaces :**
- Consomme : `node tools/check-chapters.mjs` de la tâche 1.
- Produit : D3 sans violation du contrat. La numérotation passe de 9 à 8 sections (§7 replié), les `id` suivants sont décalés et le sommaire mis à jour.

- [ ] **Étape 1 : développer §3 — règles par chemin (Task 3.3)**

État actuel : 127 mots, un exemple, pas de réflexe d'examen, pas de distracteurs.

Conserver le problème posé et l'exemple `testing.md` existants. Ajouter, après l'exemple :

Une explication de l'anatomie du frontmatter — le champ `paths` accepte une liste de globs, le fichier ne se charge que lorsque le fichier édité correspond à l'un d'eux, et le corps du fichier est injecté tel quel dans le contexte.

Un second exemple montrant le scoping par répertoire plutôt que par type de fichier, pour que le lecteur voie les deux usages :

```html
<pre># .claude/rules/terraform.md
---
paths: ["terraform/**/*"]
---
Toute ressource porte les tags obligatoires : owner, cost-center, environment.
Les backends d'état sont déclarés en S3 avec verrouillage DynamoDB.</pre>
```

Un encadré `exam-tip` portant le réflexe et les distracteurs :

```html
<div class="exam-tip">
<strong>Réflexe d'examen :</strong> quand un scénario dit que des conventions doivent s'appliquer à des fichiers <em>dispersés dans l'arborescence</em> — les tests co-localisés en sont l'exemple canonique — la réponse est <code>.claude/rules/</code> avec un glob dans le frontmatter. Les trois distracteurs habituels : un <code>CLAUDE.md</code> par sous-répertoire (ne couvre pas les fichiers dispersés, il est lié au dossier), tout consolider dans le <code>CLAUDE.md</code> racine sous des titres de section (repose sur l'inférence du modèle, pas sur un appariement explicite), et créer un skill par type de code (un skill s'invoque, or l'énoncé demande une application <em>automatique</em>).
</div>
```

- [ ] **Étape 2 : développer §4 — plan mode (Task 3.4)**

État actuel : 162 mots, aucun exemple, pas de réflexe d'examen.

Conserver le problème posé et le tableau comparatif. Supprimer la phrase « <strong>Plan = largeur</strong> … <strong>Thinking = profondeur</strong> » : l'extended thinking est explicitement hors scope.

Ajouter un bloc de cas contrastés tirés du guide, qui sert d'exemple concret :

```html
<pre>Plan mode
  Restructurer un monolithe en microservices
    → décisions de frontières de service, dizaines de fichiers
  Migrer une bibliothèque sur 45+ fichiers
    → périmètre large, approches concurrentes
  Choisir entre deux approches d'intégration
    → prérequis d'infrastructure différents

Exécution directe
  Corriger une déréférence null localisée par une stack trace
    → un fichier, une garde, périmètre déjà établi
  Ajouter une validation de date à un endpoint
    → changement compris, sans arbitrage</pre>
```

Développer le subagent `Explore` : il isole la sortie verbeuse d'une phase de découverte et ne remonte qu'un résumé, ce qui évite d'épuiser le contexte principal sur une tâche multi-phases.

Ajouter la combinaison plan puis exécution : instruire en plan mode, puis appliquer en exécution directe, est le pattern courant sur les migrations.

Ajouter l'encadré de réflexe :

```html
<div class="exam-tip">
<strong>Réflexe d'examen :</strong> la complexité est <em>énoncée dans le scénario</em>, elle n'est pas à deviner. « Dizaines de fichiers », « décisions d'architecture », « plusieurs approches valides » → plan mode. « Une stack trace claire », « un seul fichier », « changement bien compris » → exécution directe. Le distracteur le plus courant propose de commencer en exécution directe et de basculer en plan mode <em>si</em> la complexité se révèle : il ignore que l'énoncé l'a déjà établie. Deux autres distracteurs classiques : appliquer le plan mode à tout par principe de prudence, et donner des instructions exhaustives en exécution directe — ce qui suppose de connaître la bonne structure avant d'avoir exploré le code.
</div>
```

- [ ] **Étape 3 : replier §7 dans la synthèse §8**

Le tableau comparatif de §7 (CLAUDE.md / Skills / Slash commands / Hooks / Subagents / Serveurs MCP) a de la valeur : il est **déplacé**, pas supprimé.

1. Couper le `<div class="section-header"><h2 id="s7">…</h2></div>` et sa phrase d'introduction.
2. Déplacer le `<table>` et la note de renvoi vers D1 dans la section synthèse, sous un `<h3>Quelle fonctionnalité utiliser</h3>`.
3. Renuméroter : l'ancienne §8 (synthèse) devient `id="s7"`, l'ancienne §9 (auto-évaluation) devient `id="s8"`, et les titres visibles passent de « 8. » et « 9. » à « 7. » et « 8. ».
4. Mettre à jour le sommaire : retirer l'entrée « Arbre de décision », et vérifier que les `href="#sN"` restants pointent vers les nouveaux `id`.

- [ ] **Étape 4 : lancer le contrôle**

Commande : `node tools/check-chapters.mjs`

Attendu : plus aucune violation portant le préfixe `D3`. Les violations `D0`, `D1` et `D4` subsistent — elles sont traitées par les tâches suivantes.

- [ ] **Étape 5 : commiter**

```bash
git add D3_Claude_Code_Config_20pct.html
git commit -m "docs(cca-revision): develop path rules and plan mode sections in D3"
```

---

### Task 3 : D4 — donner un exemple à la task la plus lourde

**Fichiers :**
- Modifier : `D4_Prompt_Engineering_20pct.html` (§3, §7, §8, §9, sommaire)

**Interfaces :**
- Produit : D4 sans violation. La numérotation passe de 9 à 8 sections (§7 supprimé).

- [ ] **Étape 1 : ajouter l'exemple concret à §3 (Task 4.3)**

L'encadré `key-concept` réécrit lors de l'alignement au guide reste en place. Insérer juste après, avant le tableau `tool_choice`, la définition d'outil complète :

```html
<pre>{
  "tools": [{
    "name": "extract_invoice",
    "description": "Records the fields extracted from an invoice document.",
    "input_schema": {
      "type": "object",
      "properties": {
        "invoice_number": { "type": "string" },
        "issue_date":     { "type": "string", "description": "ISO 8601" },
        "total":          { "type": "number" },
        "company_name":   { "type": ["string", "null"] }
      },
      "required": ["invoice_number", "total"]
    }
  }],
  "tool_choice": { "type": "tool", "name": "extract_invoice" }
}

// La réponse contient un bloc tool_use dont `input` est l'extraction :
{
  "stop_reason": "tool_use",
  "content": [{
    "type": "tool_use",
    "name": "extract_invoice",
    "input": { "invoice_number": "INV-2024-0912", "issue_date": "2024-09-12",
               "total": 1249.90, "company_name": null }
  }]
}</pre>
```

Ajouter une phrase de liaison : le schéma de sortie voulu se déclare comme l'`input_schema` d'un outil, et l'extraction se lit dans le champ `input` du bloc `tool_use` retourné — on n'exécute jamais l'outil.

- [ ] **Étape 2 : supprimer §7 et le remplacer par un renvoi en tête de fiche**

1. Supprimer entièrement le `<div class="section-header"><h2 id="s7">7. Fondamentaux d'API — note de structure</h2></div>` et son paragraphe.
2. Insérer le renvoi juste après le `<div class="toc">`, avant la section 1 :

```html
<p class="exam-tip">Les fondamentaux de l'API — structure de requête, rôles de messages, system prompt, <code>max_tokens</code>, <code>stop_reason</code>, <code>tool_use</code> et <code>tool_choice</code> — sont traités dans <a href="D0_API_Fundamentals.html">D0</a>. Cette fiche suppose ces mécanismes acquis et se concentre sur les techniques de prompt engineering.</p>
```

3. Renuméroter §8 → `id="s7"` et §9 → `id="s8"`, avec les titres visibles « 7. » et « 8. ».
4. Mettre à jour le sommaire : retirer l'entrée « Fondamentaux d'API — note de structure », corriger les ancres.

- [ ] **Étape 3 : lancer le contrôle**

Commande : `node tools/check-chapters.mjs`

Attendu : plus aucune violation `D3` ni `D4`.

- [ ] **Étape 4 : commiter**

```bash
git add D4_Prompt_Engineering_20pct.html
git commit -m "docs(cca-revision): add worked tool_use example to D4 structured output"
```

---

### Task 4 : D1 — réduire le hors-scope et dédupliquer la boucle

**Fichiers :**
- Modifier : `D1_Architecture_Orchestration_27pct.html` (§1, §2)

**Interfaces :**
- Consomme : D0 §3 conserve le tableau des valeurs de `stop_reason` — vérifier sa présence avant de le retirer de D1.
- Produit : §1 sous le plafond de 250 mots ; §2 sans le tableau dupliqué.

- [ ] **Étape 1 : réduire §1 à ~180 mots**

Conserver : le paragraphe de problème, le tableau workflows/agents, l'encadré « Règle de décision ».

Remplacer la section « Les cinq workflow patterns » — encadré d'avertissement, phrase d'introduction et tableau des cinq lignes — par une seule phrase :

```html
<p>L'essai Anthropic <em>« Building effective agents »</em> nomme cinq patterns de workflow (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer). Le référentiel n'en retient que deux stratégies de décomposition, traitées en <a href="#s4">section 4</a>, et le pattern coordinateur-subagents, traité en <a href="#s3">section 3</a> : les autres noms ne sont pas matière d'examen.</p>
```

Supprimer entièrement le bloc `anti-pattern` « Trois anti-patterns de subagents » : c'est de la matière de cours. Conserver le paragraphe « Quand les subagents sont utiles » qui le précède — deux lignes qui cadrent utilement la délégation.

- [ ] **Étape 2 : dédupliquer `stop_reason` entre D0 §3 et D1 §2**

Dans D1 §2, supprimer le `<table>` des valeurs de `stop_reason` (quatre lignes : `tool_use`, `end_turn`, `max_tokens`, `pause_turn`) et son paragraphe d'introduction « À chaque itération, votre code envoie l'historique complet… ».

Le remplacer par :

```html
<p>Chaque réponse porte un champ <code>stop_reason</code> — les valeurs et leur signification sont détaillées en <a href="D0_API_Fundamentals.html#s3">D0 §3</a>. Ce qui nous occupe ici, c'est ce que votre code en fait : deux valeurs suffisent à piloter la boucle.</p>
<pre>stop_reason == "tool_use"  → exécuter les outils, ajouter les tool_result
                              à l'historique, relancer une itération
stop_reason == "end_turn"  → la tâche est terminée, sortir de la boucle</pre>
```

Conserver le tableau des quatre phases, l'exemple de code Python, le bloc anti-patterns et l'encadré d'examen : ils sont propres à la boucle, pas au champ.

- [ ] **Étape 3 : lancer le contrôle**

Commande : `node tools/check-chapters.mjs`

Attendu : plus aucune violation `D1`, `D3` ni `D4`. Le volume de D1 doit avoir baissé d'environ 400 mots.

- [ ] **Étape 4 : commiter**

```bash
git add D1_Architecture_Orchestration_27pct.html
git commit -m "docs(cca-revision): trim out-of-scope framing and stop_reason duplication in D1"
```

---

### Task 5 : D0 — un exemple par section

**Fichiers :**
- Modifier : `D0_API_Fundamentals.html` (§3, §4, §5, §6, §7)

**Interfaces :**
- Produit : D0 sans violation. D0 §3 et §5 deviennent les propriétaires respectifs de `stop_reason` et des trois problèmes du context window.

- [ ] **Étape 1 : §3 — fragment de réponse API**

Après le tableau des valeurs, ajouter :

```html
<pre>{
  "id": "msg_01ABC",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Je consulte la commande." },
    { "type": "tool_use", "id": "toolu_01X", "name": "lookup_order",
      "input": { "order_id": "ORD-67890" } }
  ],
  "stop_reason": "tool_use"
}</pre>
```

Ajouter une phrase : la réponse contient à la fois du texte et une demande d'outil — c'est précisément pourquoi la présence de texte ne peut pas servir de signal de fin.

- [ ] **Étape 2 : §4 — opposition correcte / incorrecte**

Après l'anti-pattern existant, ajouter :

```html
<pre>// Correct — system au même niveau que messages
{
  "system": "Tu es un assistant de support. Vérifie l'identité avant tout remboursement.",
  "messages": [{ "role": "user", "content": "Je veux un remboursement" }]
}

// Incorrect — le system prompt glissé en premier message user
{
  "messages": [
    { "role": "user", "content": "Tu es un assistant de support. Vérifie…" },
    { "role": "user", "content": "Je veux un remboursement" }
  ]
}</pre>
```

- [ ] **Étape 3 : §5 — illustration chiffrée de l'accumulation**

Après le paragraphe sur l'accumulation des tool results, ajouter :

```html
<pre>lookup_order → 42 champs retournés, 5 utiles pour l'éligibilité au retour
  order_id, status, total, items, return_eligible          ← utiles
  warehouse_route, carrier_scac, pick_wave, audit_flags,
  promo_ledger, tax_jurisdiction, … (37 autres)            ← inutiles ici

3 commandes consultées = 126 champs en contexte, dont 15 servent.</pre>
```

- [ ] **Étape 4 : §6 — paire requête / réponse complète**

Après le tableau d'anatomie, ajouter un bloc montrant la définition de l'outil, le bloc `tool_use` émis par le modèle, puis le `tool_result` renvoyé par le code — les trois temps du mécanisme, avec une phrase rappelant que c'est le code appelant qui exécute, jamais le modèle.

- [ ] **Étape 5 : §7 — un appel minimal par valeur**

Après le tableau des valeurs, ajouter :

```html
<pre>{ "tool_choice": { "type": "auto" } }                          // le modèle décide
{ "tool_choice": { "type": "any" } }                           // un outil, au choix du modèle
{ "tool_choice": { "type": "tool", "name": "extract_invoice" } } // cet outil précisément
{ "tool_choice": { "type": "none" } }                          // aucun outil</pre>
```

- [ ] **Étape 6 : lancer le contrôle**

Commande : `node tools/check-chapters.mjs`

Attendu : plus aucune violation, tous domaines confondus, sauf éventuellement D5 §1 si sa ré-exposition dépasse un plafond — traité en tâche 6.

- [ ] **Étape 7 : commiter**

```bash
git add D0_API_Fundamentals.html
git commit -m "docs(cca-revision): add a worked example to every D0 section"
```

---

### Task 6 : D5 — dédupliquer le §1

**Fichiers :**
- Modifier : `D5_Context_Fiabilite_15pct.html` (§1)

**Interfaces :**
- Consomme : D0 §5 possède désormais les trois problèmes du context window, avec son illustration chiffrée (tâche 5).

- [ ] **Étape 1 : remplacer la ré-exposition des problèmes par un renvoi**

Dans §1, les trois sous-titres « 1. La perte lors de la compression progressive », « 2. L'effet lost-in-the-middle » et « 3. L'accumulation des tool results » réexpliquent ce que D0 §5 pose déjà.

Remplacer le paragraphe d'introduction et les énoncés de problème par :

```html
<p>Les trois menaces qui pèsent sur un contexte long — compression progressive qui dilue les valeurs exactes, effet <code>lost-in-the-middle</code>, accumulation des <code>tool results</code> — sont posées en <a href="D0_API_Fundamentals.html#s5">D0 §5</a>. Cette section traite ce que le référentiel teste réellement : <strong>les parades</strong>.</p>
```

Conserver intégralement, sous leurs sous-titres actuels, les solutions : le bloc `case facts`, l'ordonnancement début/fin contre le `lost-in-the-middle`, et le trimming par hook `PostToolUse`. Chaque solution garde une phrase rappelant le problème qu'elle traite, pour que la section reste lisible seule.

- [ ] **Étape 2 : lancer le contrôle**

Commande : `node tools/check-chapters.mjs`

Attendu : `Contrat de section : OK`, code de sortie 0.

- [ ] **Étape 3 : commiter**

```bash
git add D5_Context_Fiabilite_15pct.html
git commit -m "docs(cca-revision): remove context window duplication between D0 and D5"
```

---

### Task 7 : Vérification finale et publication

**Fichiers :**
- Aucun fichier de contenu modifié, sauf correction issue des contrôles.

- [ ] **Étape 1 : contrat et volumes**

Commande : `node tools/check-chapters.mjs`

Attendu : `Contrat de section : OK`. Relever le tableau des mots par point et le comparer aux valeurs du spec — D3 doit avoir progressé, D1 avoir baissé, D5 avoir légèrement baissé.

- [ ] **Étape 2 : quiz et liens**

Commande : `node <scratchpad>/test3.mjs`

Attendu : les sept pages passent, 157 quiz, 0 problème. Puis le contrôle des liens et ancres sur l'ensemble des pages : 0 lien cassé.

- [ ] **Étape 3 : orthographe**

Relancer le balayage des diacritiques sur les neuf pages françaises. Attendu : 0 occurrence.

- [ ] **Étape 4 : couverture des tasks**

Vérifier que le mapping section → task couvre toujours les 30 task statements : D1 1.1–1.7, D2 2.1–2.5, D3 3.1–3.6, D4 4.1–4.6, D5 5.1–5.6.

- [ ] **Étape 5 : pousser**

```bash
git push origin main
```

Confirmer que le working tree est propre et que la branche est alignée sur `origin/main`.

---

## Auto-revue du plan

**Couverture du spec.** Les cinq coupes du spec sont couvertes : D1 §1 (tâche 4), D0 §3 ↔ D1 §2 (tâches 4 et 5), D0 §5 ↔ D5 §1 (tâches 5 et 6), D4 §7 (tâche 3), D3 §7 (tâche 2). Les quatre développements sont couverts : D3 §3 et §4 (tâche 2), D4 §3 (tâche 3), D0 §3–§7 (tâche 5). Les cinq contrôles de vérification sont couverts par les tâches 1 et 7. D2 est hors périmètre, conformément au spec.

**Écart assumé par rapport au spec.** Le spec qualifiait D3 §7 de moignon à replier. Inspection faite, sa prose fait 82 mots mais son tableau comparatif à six lignes a de la valeur : le plan le **déplace** dans la synthèse au lieu de le supprimer. Le spec sera mis à jour en conséquence.

**Cohérence des noms.** Le script s'appelle `tools/check-chapters.mjs` dans toutes les tâches. Les identifiants d'ancres décalés (D3 §8→§7, §9→§8 ; D4 §8→§7, §9→§8) sont explicités dans les tâches qui les produisent et contrôlés par la vérification sommaire/ancres du script.

**Emplacement des documents.** Le spec et ce plan vivent dans `specs/` et non `docs/superpowers/`, parce que `docs/` est dans le `.gitignore` du dépôt comme matériel de référence non publié.
