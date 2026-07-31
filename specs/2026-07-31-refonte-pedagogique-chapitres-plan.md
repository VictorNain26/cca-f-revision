# Refonte pédagogique des chapitres D0–D5 — Plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUISE — `superpowers:subagent-driven-development`. Les étapes utilisent la syntaxe `- [ ]`.

**Objectif :** amener les six fiches de domaine au contrat de section en quatre garanties, sans toucher à l'alignement au guide déjà validé.

**Architecture :** `tools/check-chapters.mjs` matérialise le contrat et sert de test. Il échoue sur le corpus actuel avec **37 violations**. Chaque tâche en éteint un lot, fiche par fiche, et se termine sur un contrôle qui ne signale plus rien pour cette fiche. Chaque fiche est un commit.

**Stack :** Node.js sans dépendance, HTML statique. Suite jsdom existante en filet final sur les quiz.

**Spec :** `specs/2026-07-31-refonte-pedagogique-chapitres-design.md`

## Historique de révision

Le périmètre initial ne couvrait que 11 des 33 violations alors détectées. Le contrat, écrit après le cadrage du chantier, s'est révélé plus exigeant que le chantier lui-même — notamment sur D2, que le spec excluait au motif que chaque section portait déjà un exemple, ce qui ne répond qu'à une garantie sur quatre. Périmètre élargi sur décision de l'utilisateur. La revue de la tâche 1 a ensuite fait resserrer la détection des distracteurs — un simple mot « anti-pattern » dans la prose suffisait à passer le contrôle — ce qui a porté le total de 33 à **37**.

## Contraintes globales

- **Le guide fait loi.** Aucune modification ne doit contredire CCAR-F v1.0. Là où la doc actuelle diverge, la réponse du guide reste en tête, la divergence en encadré.
- **Structure constante.** Une section ↔ un task statement, ordre suivant la numérotation du guide, D0 reste séparée.
- **Contrat de section :** toute section portant une task garantit un problème posé en situation, au moins un exemple concret (artefact copiable — un tableau ne compte pas), un réflexe d'examen, et les distracteurs nommés. Ordre et forme libres.
- **D0 :** seule la garantie « exemple concret » s'applique.
- **Un réflexe d'examen** dit ce qui fait choisir la bonne option sous pression, pas ce que le mécanisme fait. « Utilisez `.claude/rules/` » n'est pas un réflexe ; « quand l'énoncé dit que les fichiers sont dispersés dans l'arborescence, c'est `.claude/rules/` » en est un.
- **Des distracteurs nommés** citent les mauvaises réponses plausibles *et* la raison pour laquelle elles séduisent. Une simple mention du mot « anti-pattern » ne suffit pas.
- **Aucune invention.** Les réflexes et distracteurs se tirent du guide (task statements, questions d'exemple) ou des faits déjà établis dans le corpus. En cas de doute sur un fait technique, le signaler dans le rapport plutôt que d'affirmer.
- **Français orthographiquement correct**, tous diacritiques. Identifiants et termes techniques en anglais.
- **Interdit de modifier** `Practice_Questions.html` et les sections d'auto-évaluation.
- **Ancres :** sommaires internes cohérents avec les `id="sN"`. Aucune page ne référence les ancres d'une autre page.
- **Commits :** conventional commits en anglais, scope `cca-revision`. Stager fichier par fichier, jamais `git add .` ni `-A`.

**Critère d'acceptation universel :** `node tools/check-chapters.mjs` ne signale plus aucune violation pour la fiche traitée.

---

### Task 1 : Script de contrôle — FAIT

Livré en `62c4577`, corrigé ensuite pour l'extraction des titres. Le script mesure les volumes et contrôle les quatre garanties, la cohérence sommaire/ancres, et le plafond de 250 mots des sections hors task (D0 exemptée).

---

### Task 2 : D3 — six sections à compléter, §7 replié

**Fichiers :** modifier `D3_Claude_Code_Config_20pct.html`

**Violations à éteindre :** §1 réflexe ; §2 distracteurs ; §3 réflexe + distracteurs ; §4 exemple + réflexe + distracteurs ; §5 distracteurs ; §6 réflexe.

- [ ] **Étape 1 : développer §3 — règles par chemin (Task 3.3)**

Conserver le problème posé et l'exemple `testing.md`. Ajouter l'anatomie du frontmatter (`paths` accepte une liste de globs ; le fichier ne se charge que si le fichier édité correspond ; le corps est injecté tel quel), puis un second exemple scopé par répertoire :

```html
<pre># .claude/rules/terraform.md
---
paths: ["terraform/**/*"]
---
Toute ressource porte les tags obligatoires : owner, cost-center, environment.
Les backends d'état sont déclarés en S3 avec verrouillage DynamoDB.</pre>
```

Puis l'encadré :

```html
<div class="exam-tip">
<strong>Réflexe d'examen :</strong> quand un scénario dit que des conventions doivent s'appliquer à des fichiers <em>dispersés dans l'arborescence</em> — les tests co-localisés en sont l'exemple canonique — la réponse est <code>.claude/rules/</code> avec un glob dans le frontmatter. Trois distracteurs reviennent : un <code>CLAUDE.md</code> par sous-répertoire, qui séduit parce qu'il est « plus local » mais reste lié au dossier et ne suit pas les fichiers dispersés ; tout consolider dans le <code>CLAUDE.md</code> racine sous des titres de section, qui repose sur l'inférence du modèle au lieu d'un appariement explicite ; et un skill par type de code, qui échoue sur le mot <em>automatiquement</em> de l'énoncé, puisqu'un skill s'invoque.
</div>
```

- [ ] **Étape 2 : développer §4 — plan mode (Task 3.4)**

Conserver le problème posé et le tableau. **Supprimer** la phrase « Plan = largeur … Thinking = profondeur » : l'extended thinking est hors scope. Ajouter les cas contrastés du guide comme exemple concret :

```html
<pre>Plan mode
  Restructurer un monolithe en microservices
    → frontières de service à décider, dizaines de fichiers
  Migrer une bibliothèque sur 45+ fichiers
    → périmètre large, approches concurrentes
  Choisir entre deux approches d'intégration
    → prérequis d'infrastructure différents

Exécution directe
  Corriger une déréférence null localisée par une stack trace
    → un fichier, une garde, périmètre déjà établi
  Ajouter une validation de date à un endpoint
    → changement compris, aucun arbitrage</pre>
```

Développer le subagent `Explore` (isole la découverte verbeuse, ne remonte qu'un résumé) et la combinaison plan puis exécution. Puis :

```html
<div class="exam-tip">
<strong>Réflexe d'examen :</strong> la complexité est <em>énoncée dans le scénario</em>, elle ne se devine pas. « Dizaines de fichiers », « décisions d'architecture », « plusieurs approches valides » → plan mode. « Stack trace claire », « un seul fichier », « changement bien compris » → exécution directe. Le distracteur le plus fin propose de commencer en exécution directe et de basculer en plan mode <em>si</em> la complexité se révèle : il séduit parce qu'il a l'air prudent, mais il ignore que l'énoncé a déjà établi la complexité. Deux autres : appliquer le plan mode partout par principe, et donner des instructions exhaustives en exécution directe — ce qui suppose de connaître la bonne structure avant d'avoir exploré le code.
</div>
```

- [ ] **Étape 3 : combler les quatre autres sections**

| Section | Manque | Substance à écrire |
|---|---|---|
| §1 (Task 3.1) | réflexe | Le signe distinctif d'un problème de hiérarchie : « ça marche pour tout le monde sauf le nouvel arrivant » → les instructions sont au niveau user, jamais partagées par le VCS. `/memory` sert à le confirmer. Distracteurs : version de Claude Code différente, fichier trop long, demander à chacun de recopier le fichier |
| §2 (Task 3.2) | distracteurs | Pour une commande partagée à l'équipe, la réponse du guide est `.claude/commands/`. Distracteurs : `~/.claude/commands/` (personnel, non versionné), `CLAUDE.md` (instructions, pas définitions de commande), un tableau `commands` dans un `.claude/config.json` (mécanisme inexistant). Pour un skill verbeux : `context: fork` ; distracteurs `allowed-tools` (restreint les outils, pas la destination de la sortie) et une consigne « sois concis » |
| §5 (Task 3.5) | distracteurs | Contre des exemples entrée/sortie : réécrire la consigne encore plus précisément (déjà tenté et échoué), demander au modèle d'expliquer son interprétation à chaque exécution (négociation au lieu de spécification), découper en une commande par champ |
| §6 (Task 3.6) | réflexe | `-p` pour le mode non interactif, `--output-format json` avec `--json-schema` pour des findings parsables, `CLAUDE.md` pour le contexte projet en CI, une instance indépendante pour la revue. Distracteurs : variable `CLAUDE_HEADLESS`, flag `--batch` (les deux inexistants), redirection de stdin, et parser la prose à coups de regex |

- [ ] **Étape 4 : replier §7 dans la synthèse**

Le tableau comparatif de §7 (CLAUDE.md / Skills / Slash commands / Hooks / Subagents / MCP) est **déplacé, pas supprimé**. Retirer l'en-tête de section et sa phrase d'introduction ; déplacer le `<table>` et la note de renvoi vers D1 dans la synthèse, sous un `<h3>Quelle fonctionnalité utiliser</h3>`. Renuméroter §8 → `id="s7"` et §9 → `id="s8"`, titres visibles « 7. » et « 8. ». Retirer l'entrée du sommaire et corriger les ancres.

- [ ] **Étape 5 : contrôler**

`node tools/check-chapters.mjs` — attendu : plus aucune ligne `D3`.

- [ ] **Étape 6 : commiter**

```bash
git add D3_Claude_Code_Config_20pct.html
git commit -m "docs(cca-revision): complete the section contract across D3"
```

---

### Task 3 : D4 — cinq sections à compléter, §7 supprimé

**Fichiers :** modifier `D4_Prompt_Engineering_20pct.html`

**Violations :** §1 exemple ; §2 réflexe + distracteurs ; §3 exemple + distracteurs ; §5 exemple + distracteurs ; §6 exemple + réflexe.

- [ ] **Étape 1 : §3 — l'exemple travaillé (Task 4.3)**

Après l'encadré `key-concept` existant, avant le tableau `tool_choice` :

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

// La réponse porte un bloc tool_use dont `input` EST l'extraction :
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

Phrase de liaison : le schéma de sortie voulu se déclare comme l'`input_schema` d'un outil, et l'extraction se lit dans le champ `input` du bloc retourné — l'outil n'est jamais exécuté.

Distracteurs à ajouter : `output_config.format` (méthode de la doc actuelle, absente du guide), `tool_choice: "auto"` (le modèle peut répondre en texte), demander du JSON en prose avec un schéma strict dans le prompt (réintroduit les erreurs de syntaxe), réparer la sortie à la regex.

- [ ] **Étape 2 : combler les quatre autres sections**

| Section | Manque | Substance à écrire |
|---|---|---|
| §1 (Task 4.1) | exemple | Un `<pre>` opposant le prompt vague (« Check code comments for accuracy. Be conservative. ») au prompt à critères explicites déjà rédigé dans l'encadré, sous forme de texte de prompt copiable |
| §2 (Task 4.2) | réflexe + distracteurs | Le few-shot est la réponse quand des instructions déjà détaillées produisent une sortie inconsistante, et quand le modèle doit généraliser à des cas non listés. Distracteurs : réécrire les instructions plus fermement, maintenir une liste blanche (ne couvre que ce qui y figure), post-traiter la sortie (ne reconstruit pas ce qui n'a pas été produit), baisser la sensibilité (supprime les vrais positifs au même rythme) |
| §5 (Task 4.5) | exemple + distracteurs | Une requête batch avec `custom_id`, et le calcul de SLA : fenêtre de traitement 24 h, engagement 30 h → soumission toutes les 6 h au maximum. Distracteurs : basculer un contrôle bloquant pré-merge sur le Batches API (séduit par les 50 % d'économie, mais aucune garantie de latence) ; le rendre acceptable par du polling (« souvent plus rapide » n'est pas une garantie) ; tout garder en synchrone pour éviter les problèmes d'ordre (méprise — `custom_id` corrèle les réponses) ; batch avec repli temporisé vers le synchrone (double chemin de code pour un problème qui disparaît en appariant chaque API à sa charge) |
| §6 (Task 4.6) | exemple + réflexe | Un `<pre>` montrant le découpage en passes (par fichier, puis intégration). Réflexe : l'incohérence entre fichiers vient de la dilution d'attention, pas d'un manque de contexte. Distracteurs : un modèle à fenêtre plus large (confond capacité et attention), le vote de consensus sur trois passes (supprime les vrais bugs détectés une seule fois), demander aux développeurs de découper leurs PR (déplace la charge sans améliorer le système) |

- [ ] **Étape 3 : supprimer §7, renvoi en tête**

Supprimer l'en-tête `<h2 id="s7">7. Fondamentaux d'API — note de structure</h2>` et son paragraphe. Insérer après le `<div class="toc">` :

```html
<p class="exam-tip">Les fondamentaux de l'API — structure de requête, rôles de messages, system prompt, <code>max_tokens</code>, <code>stop_reason</code>, <code>tool_use</code> et <code>tool_choice</code> — sont traités dans <a href="D0_API_Fundamentals.html">D0</a>. Cette fiche les suppose acquis.</p>
```

Renuméroter §8 → `id="s7"`, §9 → `id="s8"`, titres « 7. » et « 8. », corriger le sommaire.

- [ ] **Étape 4 : contrôler puis commiter**

`node tools/check-chapters.mjs` — attendu : plus aucune ligne `D4`.

```bash
git add D4_Prompt_Engineering_20pct.html
git commit -m "docs(cca-revision): complete the section contract across D4"
```

---

### Task 4 : D1 — réduire §1, dédupliquer, compléter cinq sections

**Fichiers :** modifier `D1_Architecture_Orchestration_27pct.html`

**Violations :** §1 plafond 250 mots ; §3 réflexe ; §4 distracteurs ; §5 réflexe ; §6 distracteurs ; §7 réflexe + distracteurs.

- [ ] **Étape 1 : réduire §1 sous 250 mots**

Conserver le paragraphe de problème, le tableau workflows/agents, l'encadré « Règle de décision ». Remplacer l'encadré d'avertissement, la phrase d'introduction et le tableau des cinq patterns par :

```html
<p>L'essai Anthropic <em>« Building effective agents »</em> nomme cinq patterns de workflow (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer). Le référentiel n'en retient que deux stratégies de décomposition, traitées en <a href="#s4">section 4</a>, et le pattern coordinateur-subagents, traité en <a href="#s3">section 3</a> : les autres noms ne sont pas matière d'examen.</p>
```

Supprimer le bloc `anti-pattern` « Trois anti-patterns de subagents » (matière de cours). Conserver le paragraphe « Quand les subagents sont utiles » qui le précède.

- [ ] **Étape 2 : dédupliquer `stop_reason` avec D0 §3**

Dans §2, supprimer le `<table>` des valeurs et son paragraphe d'introduction. Remplacer par :

```html
<p>Chaque réponse porte un champ <code>stop_reason</code> — les valeurs et leur signification sont détaillées en <a href="D0_API_Fundamentals.html#s3">D0 §3</a>. Ici, ce qui compte est ce que votre code en fait : deux valeurs suffisent à piloter la boucle.</p>
<pre>stop_reason == "tool_use"  → exécuter les outils, ajouter les tool_result
                              à l'historique, relancer une itération
stop_reason == "end_turn"  → la tâche est terminée, sortir de la boucle</pre>
```

Conserver le tableau des quatre phases, l'exemple Python, le bloc anti-patterns et l'encadré d'examen.

- [ ] **Étape 3 : combler les cinq sections**

| Section | Manque | Substance à écrire |
|---|---|---|
| §3 (Task 1.2) | réflexe | Quand chaque subagent réussit sa mission mais que le rapport final rate des pans entiers du sujet, la cause est la décomposition du coordinateur, pas les agents en aval. Distracteurs : incriminer les requêtes de l'agent de recherche, l'absence de détection de lacunes chez l'agent de synthèse, ou des critères de pertinence trop stricts chez l'agent d'analyse — tous séduisent parce qu'ils désignent un agent réel, mais l'énoncé précise que chacun a correctement exécuté ce qui lui était assigné |
| §4 (Task 1.6) | distracteurs | Contre le bon choix de décomposition : la revue multi-passes (conçue pour un périmètre borné comme une PR, pas pour une investigation ouverte), un prompt exhaustif unique (suppose de connaître le périmètre), un pipeline fixe sur un périmètre inconnu (exige la liste des étapes à l'avance) |
| §5 (Task 1.3) | réflexe | Trois faits décident : `allowedTools` doit contenir `"Task"` ; les subagents n'héritent d'aucun contexte, tout passe par le prompt ; le parallélisme s'obtient par plusieurs appels `Task` dans **une seule** réponse. Distracteurs : agrandir la fenêtre de contexte du subagent (rien n'a été transmis, la taille n'y change rien), laisser les subagents s'appeler entre eux (casse le hub-and-spoke), émettre les appels sur des tours successifs (c'est le séquentiel avec des étapes en plus) |
| §6 (Task 1.4 & 1.5) | distracteurs | Contre l'enforcement programmatique : renforcer le system prompt, ajouter des few-shot examples, auditer après coup, déployer un classifieur de routage. Les trois premiers séduisent parce qu'ils réduisent le taux d'échec — mais l'énoncé demande une garantie, et un audit détecte après que l'argent est parti. Le quatrième traite la disponibilité des outils, pas leur ordre d'appel |
| §7 (Task 1.7) | réflexe + distracteurs | `--resume` quand le contexte antérieur reste majoritairement valide, en nommant les fichiers modifiés pour une ré-analyse ciblée ; session neuve avec résumé injecté quand les tool results sont largement périmés ; `fork_session` pour explorer deux approches depuis une base commune. Distracteurs : tout ré-explorer de zéro (jette le travail valide), reprendre sans signaler les changements (l'agent garde une vue fausse des fichiers), forker pour comparer l'ancienne et la nouvelle version d'un fichier (le fork explore des approches, il ne réconcilie pas un état disque) |

- [ ] **Étape 4 : contrôler puis commiter**

`node tools/check-chapters.mjs` — attendu : plus aucune ligne `D1`. Le volume de D1 doit avoir baissé d'environ 400 mots sur §1, avant les ajouts.

```bash
git add D1_Architecture_Orchestration_27pct.html
git commit -m "docs(cca-revision): trim framing and complete the section contract across D1"
```

---

### Task 5 : D0 — un exemple par section

**Fichiers :** modifier `D0_API_Fundamentals.html`

**Violations :** §3, §4, §5, §6, §7 sans exemple.

- [ ] **Étape 1 : §3 — fragment de réponse**

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

Phrase associée : la réponse porte du texte **et** une demande d'outil — c'est précisément pourquoi la présence de texte ne peut pas servir de signal de fin.

- [ ] **Étape 2 : §4 — opposition correcte / incorrecte**

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

- [ ] **Étape 3 : §5 — accumulation chiffrée**

```html
<pre>lookup_order → 42 champs retournés, 5 utiles pour l'éligibilité au retour
  order_id, status, total, items, return_eligible          ← utiles
  warehouse_route, carrier_scac, pick_wave, audit_flags,
  promo_ledger, tax_jurisdiction, … (37 autres)            ← inutiles ici

3 commandes consultées = 126 champs en contexte, dont 15 servent.</pre>
```

- [ ] **Étape 4 : §6 — les trois temps du mécanisme**

Un bloc montrant successivement la définition de l'outil, le bloc `tool_use` émis par le modèle, puis le `tool_result` renvoyé par le code appelant. Phrase associée : c'est votre code qui exécute, jamais le modèle.

- [ ] **Étape 5 : §7 — un appel par valeur**

```html
<pre>{ "tool_choice": { "type": "auto" } }                            // le modèle décide
{ "tool_choice": { "type": "any" } }                             // un outil, au choix du modèle
{ "tool_choice": { "type": "tool", "name": "extract_invoice" } } // cet outil précisément
{ "tool_choice": { "type": "none" } }                            // aucun outil</pre>
```

- [ ] **Étape 6 : contrôler puis commiter**

`node tools/check-chapters.mjs` — attendu : plus aucune ligne `D0`.

```bash
git add D0_API_Fundamentals.html
git commit -m "docs(cca-revision): add a worked example to every D0 section"
```

---

### Task 6 : D5 — dédupliquer le §1, nommer les distracteurs

**Fichiers :** modifier `D5_Context_Fiabilite_15pct.html`

**Violations :** §1 distracteurs ; §3 distracteurs ; §4 distracteurs ; §5 distracteurs.

- [ ] **Étape 1 : dédupliquer §1 avec D0 §5**

Remplacer le paragraphe d'introduction et les trois énoncés de problème par :

```html
<p>Les trois menaces qui pèsent sur un contexte long — compression progressive qui dilue les valeurs exactes, effet <code>lost-in-the-middle</code>, accumulation des <code>tool results</code> — sont posées en <a href="D0_API_Fundamentals.html#s5">D0 §5</a>. Cette section traite ce que le référentiel teste réellement : <strong>les parades</strong>.</p>
```

Conserver intégralement les solutions sous leurs sous-titres : bloc `case facts`, ordonnancement début/fin, trimming par hook `PostToolUse`. Chaque solution garde une phrase rappelant le problème qu'elle traite.

- [ ] **Étape 2 : nommer les distracteurs de §1 et §4**

| Section | Substance |
|---|---|
| §1 (Task 5.1) | Contre le bloc `case facts` : agrandir la fenêtre de contexte et espacer les `/compact` séduisent parce qu'ils repoussent l'échéance, mais la conversation finit par dépasser la nouvelle limite ; demander au résumeur de préserver les nombres repose sur une conformité probabiliste, à chaque résumé et pour chaque fait |
| §3 (Task 5.3) | Contre le contexte d'erreur structuré : un statut générique après retries internes cache au coordinateur ce dont il a besoin pour décider ; un résultat vide marqué comme succès est une suppression silencieuse ; terminer tout le workflow sur une branche perd les résultats déjà obtenus ; agréger en un pourcentage de couverture détruit la distinction entre échec d'accès et résultat vide valide |
| §4 (Task 5.4) | Contre scratchpad et délégation : repartir de zéro jette le travail valide et reproduira la dégradation ; augmenter `max_tokens` borne la réponse, pas ce que l'agent a retenu ; demander à l'agent de « mieux se concentrer » ne restaure aucune information devenue inexploitable |
| §5 (Task 5.5) | Contre la confiance par champ calibrée : un score global par document agrège les champs sûrs et douteux ; l'échantillonnage aléatoire est le bon outil pour *mesurer* un taux d'erreur, pas pour *allouer* une capacité de relecture ; l'auto-notation de 1 à 10 est non calibrée ; ne relire que les types de documents ayant généré des réclamations est un signal retardé et biaisé |

- [ ] **Étape 3 : contrôler puis commiter**

`node tools/check-chapters.mjs` — attendu : plus aucune ligne `D5`.

```bash
git add D5_Context_Fiabilite_15pct.html
git commit -m "docs(cca-revision): dedupe context window section and name distractors in D5"
```

---

### Task 7 : D2 — nommer les distracteurs

**Fichiers :** modifier `D2_Tool_Design_MCP_18pct.html`

**Violations :** §1 distracteurs ; §3 distracteurs ; §5 distracteurs.

D2 était hors périmètre du spec initial au motif que chaque section portait déjà un exemple. Le contrat en demande quatre.

- [ ] **Étape 1 : §1 (Task 2.1)**

Ajouter les distracteurs de la conception de descriptions : ajouter des few-shot examples au system prompt (coûte des tokens sans lever l'ambiguïté des descriptions) ; construire une couche de routage qui analyse l'entrée avant chaque tour (sur-ingénierie, court-circuite la compréhension du langage naturel) ; fusionner les deux outils en un `lookup_entity` générique (choix d'architecture défendable, mais bien plus lourd qu'un « premier pas » quand le problème immédiat est la pauvreté des descriptions) ; n'enrichir que l'une des deux descriptions (l'autre reste aussi attirante pour les mêmes requêtes).

- [ ] **Étape 2 : §3 (Task 2.3)**

Ajouter les distracteurs de la distribution d'outils et de `tool_choice` : fusionner les outils en un outil générique à paramètre `mode` (déplace la décision dans un argument, où la description ne peut plus la guider) ; régler `tool_choice: "any"` pour corriger un mauvais choix d'outil (garantit qu'un outil est appelé, pas que ce soit le bon) ; réécrire les descriptions encore une fois quand le vrai problème est le **nombre** d'outils ; donner tous les outils à un agent « au cas où », alors qu'un agent doté d'outils hors de sa spécialité les emploie à mauvais escient.

- [ ] **Étape 3 : §5 (Task 2.5)**

Ajouter les distracteurs des outils built-in : confondre `Grep` (contenu) et `Glob` (chemins) — le piège tient à ce que les deux « cherchent » ; relancer `Edit` avec la même ancre ambiguë, alors que l'outil est déterministe et échouera à l'identique ; lire tous les fichiers d'emblée au lieu d'explorer par `Grep` puis `Read` ; passer par `Bash` et `find` là où `Glob` répond directement.

- [ ] **Étape 4 : contrôler puis commiter**

`node tools/check-chapters.mjs` — attendu : **`Contrat de section : OK`**, code de sortie 0.

```bash
git add D2_Tool_Design_MCP_18pct.html
git commit -m "docs(cca-revision): name the distractors in D2 tool distribution and built-in tools"
```

---

### Task 8 : Vérification finale et publication

- [ ] **Étape 1 :** `node tools/check-chapters.mjs` → `Contrat de section : OK`. Relever le tableau mots/point et le comparer aux valeurs d'origine (D1 122, D2 154, D3 126, D4 133, D5 227).
- [ ] **Étape 2 :** suite jsdom sur les sept pages → 157 quiz, 0 problème. Contrôle des liens et ancres → 0 cassé.
- [ ] **Étape 3 :** balayage des diacritiques sur les neuf pages françaises → 0 occurrence.
- [ ] **Étape 4 :** couverture des 30 task statements inchangée (D1 1.1–1.7, D2 2.1–2.5, D3 3.1–3.6, D4 4.1–4.6, D5 5.1–5.6).
- [ ] **Étape 5 :** merger `chore/chapter-pedagogy-rework` dans `main`, pousser, confirmer le working tree propre.

## Auto-revue du plan

**Couverture.** Les 37 violations sont réparties : D0 5 (Task 5), D1 7 (Task 4), D2 3 (Task 7), D3 9 (Task 2), D4 9 (Task 3), D5 4 (Task 6). Total 37. Les deux coupes structurelles (D3 §7 replié, D4 §7 supprimé) et les deux déduplications (D0 §3 ↔ D1 §2, D0 §5 ↔ D5 §1) sont chacune rattachées à une tâche.

**Ordre.** D1 §2 et D5 §1 renvoient vers D0 §3 et D0 §5, qui existent déjà et ne changent pas d'`id` en Task 5 — l'ordre des tâches est donc sans contrainte. Les renumérotations d'ancres sont internes à D3 et D4.

**Pas de placeholder.** Chaque manque a sa substance écrite. Les blocs HTML volumineux sont donnés verbatim ; les ajouts d'une à trois phrases sont spécifiés par leur contenu et non par leur forme, la forme étant laissée libre par le contrat.
