<!-- title:Questions d'entraînement CCA-F -->
# Practice Questions — CCA-F

112 QCM corrigés · **énoncés, options et corrigés en anglais**, comme à l'examen · les 6 scénarios officiels et les 30 task statements sont couverts

::: key-concept
**Pourquoi cette page est en anglais.** L'examen CCAR-F est administré en anglais. Traduire l'entraînement, c'est s'entraîner à un exercice que vous ne passerez pas : le jour J, le coût de lecture porte sur des formulations anglaises précises — *most effective first step*, *root cause*, *deterministic*, *proportionate* — qui portent à elles seules la moitié de la discrimination entre options. Les commentaires de méthode restent en français.
:::

## Méthode et distracteurs récurrents
<!-- id:methode -->

::: key-concept
### Comment lire un item

1. **Lire le scénario avant les options.** Formulez mentalement votre réponse, puis cherchez-la dans la liste. Lire les options d'abord, c'est se laisser guider par le distracteur le plus séduisant.
2. **Repérer le qualificateur de la question.** *Most effective*, *first step*, *root cause*, *most maintainable* : ces mots tranchent entre deux options toutes deux « correctes ». Une solution juste mais disproportionnée perd contre une solution juste et proportionnée quand la question dit *first step*.
3. **Compter les réponses attendues.** Chaque item indique combien en sélectionner.
4. **Ne jamais laisser blanc** — il n'y a pas de pénalité.

### Les sept distracteurs qui reviennent

| Formulation type | Pourquoi c'est faux |
|---|---|
| « Strengthen the system prompt to state that X is mandatory » | Une consigne en langage naturel a un taux d'échec non nul. Dès qu'il y a une conséquence financière ou réglementaire, la réponse est un *programmatic enforcement* (hook, gate de prérequis). |
| « Deploy a classifier trained on historical data » | Sur-ingénierie : on ajoute de l'infrastructure et un besoin de données annotées avant d'avoir essayé la correction proportionnée. |
| « Have the model self-report a confidence score, then route below a threshold » | Proxy non calibré : le modèle est confiant précisément là où il se trompe. Attention — *field-level* confidence calibrée sur un jeu étiqueté est, elle, la bonne réponse pour router une relecture. |
| « Detect customer frustration and escalate on negative sentiment » | Le sentiment ne corrèle pas avec la complexité du cas. |
| « Terminate the workflow when a subagent fails » | On perd les résultats partiels. La réponse est la dégradation gracieuse avec annotation des lacunes. |
| « Switch to a model with a larger context window » | Une fenêtre plus grande ne corrige ni la dilution d'attention, ni la dégradation de contexte, ni le *lost-in-the-middle*. |
| « Move the blocking check to the Message Batches API » | Jusqu'à 24 h de traitement, aucune garantie de latence : incompatible avec un workflow bloquant. |
:::

## Questions officielles du guide (Q1–Q12)
<!-- id:officielles -->

::: exam-tip
**Note de fidélité :** ces douze items reproduisent les questions d'exemple du guide officiel — énoncés, options et bonnes réponses. Leurs bonnes réponses sont majoritairement « A » : c'est un artefact du guide, pas un biais de conception. Ne devinez jamais à la lettre, travaillez le raisonnement.
:::

### Scenario: Customer Support Resolution Agent
<!-- questions:1-3 -->

### Scenario: Code Generation with Claude Code
<!-- questions:4-6 -->

### Scenario: Multi-Agent Research System
<!-- questions:7-9 -->

### Scenario: Claude Code for Continuous Integration
<!-- questions:10-12 -->

## Scénario 1 — Customer Support Resolution Agent (Q13–Q28)
<!-- id:support -->

::: exam-tip
**Contexte du scénario.** Agent de résolution support bâti sur le Claude Agent SDK. Il traite des demandes à forte ambiguïté — retours, litiges de facturation, problèmes de compte — via des outils MCP (<code>get_customer</code>, <code>lookup_order</code>, <code>process_refund</code>, <code>escalate_to_human</code>). Objectif : 80 % de résolution au premier contact, tout en sachant quand escalader. Domaines dominants : D1, D2, D5.
:::
<!-- questions:13-28 -->

## Scénario 2 — Code Generation with Claude Code (Q29–Q42)
<!-- id:codegen -->

::: exam-tip
**Contexte du scénario.** Votre équipe utilise Claude Code pour la génération, le refactoring, le débogage et la documentation. Il faut l'intégrer au workflow de développement : slash commands personnalisées, configurations <code>CLAUDE.md</code>, et savoir quand utiliser le plan mode plutôt que l'exécution directe. Domaines dominants : D3, D5.
:::
<!-- questions:29-42 -->

## Scénario 3 — Multi-Agent Research System (Q43–Q58)
<!-- id:research -->

::: exam-tip
**Contexte du scénario.** Système de recherche multi-agents sur le Claude Agent SDK. Un coordinateur délègue à des subagents spécialisés : recherche web, analyse de documents, synthèse, génération de rapport. Le système produit des rapports complets et sourcés. Domaines dominants : D1, D2, D5.
:::
<!-- questions:43-58 -->

## Scénario 4 — Developer Productivity with Claude (Q59–Q72)
<!-- id:devtools -->

::: exam-tip
**Contexte du scénario.** Outils de productivité développeur sur le Claude Agent SDK. L'agent aide les ingénieurs à explorer des codebases inconnues, comprendre des systèmes legacy, générer du boilerplate et automatiser des tâches répétitives. Il utilise les outils built-in (<code>Read</code>, <code>Write</code>, <code>Bash</code>, <code>Grep</code>, <code>Glob</code>) et s'intègre à des serveurs MCP. Domaines dominants : D2, D3, D1.
:::
<!-- questions:59-72 -->

## Scénario 5 — Claude Code for Continuous Integration (Q73–Q86)
<!-- id:ci -->

::: exam-tip
**Contexte du scénario.** Claude Code intégré au pipeline CI/CD : revues de code automatisées, génération de cas de test, feedback sur les pull requests. Il faut concevoir des prompts qui produisent un feedback actionnable et minimisent les faux positifs. Domaines dominants : D3, D4.
:::
<!-- questions:73-86 -->

## Scénario 6 — Structured Data Extraction (Q87–Q100)
<!-- id:extraction -->

::: exam-tip
**Contexte du scénario.** Système d'extraction de données structurées : extraction depuis des documents non structurés, validation par JSON Schema, maintien d'une haute exactitude. Il doit traiter les cas limites proprement et s'intégrer aux systèmes en aval. Domaines dominants : D4, D5.
:::
<!-- questions:87-100 -->

## Questions transversales et multi-réponses (Q101–Q112)
<!-- id:transverse -->

::: exam-tip
**Ce que couvre cette section.** Les concepts qui traversent plusieurs scénarios — stratégies de décomposition, découpage d'outils, reprise après crash, rendu de synthèse — puis quatre items **multi-réponses**. À l'examen, chaque item indique combien de réponses sélectionner ; ici c'est écrit dans l'intitulé.
:::
<!-- questions:101-112 -->

## Couverture — les 30 task statements
<!-- id:couverture -->

Chaque task statement du guide est couvert par au moins un item. Utilisez ce tableau pour cibler une révision : si un domaine ressort faible sur votre rapport de score, reprenez d'abord ses questions.

<!-- coverage-table -->
| Task | Sujet |
|---|---|
| **1.1** | Boucle agentique, <code>stop_reason</code>, historique |
| **1.2** | Coordinateur-subagents, hub-and-spoke, décomposition, raffinement itératif |
| **1.3** | Outil <code>Task</code>, passage de contexte explicite, parallélisme |
| **1.4** | Prérequis programmatiques, handoff structuré, requêtes multi-sujets |
| **1.5** | Hooks : normalisation <code>PostToolUse</code>, interception d'appels |
| **1.6** | Prompt chaining contre décomposition dynamique |
| **1.7** | Sessions : <code>--resume</code>, <code>fork_session</code>, reprise ou session neuve |
| **2.1** | Descriptions d'outils, découpage, renommage, system prompt keyword-sensitive |
| **2.2** | Erreurs structurées MCP, catégories, <code>isRetryable</code> |
| **2.3** | Distribution d'outils, <code>tool_choice</code>, outils contraints |
| **2.4** | Serveurs MCP : portées, <code>${VAR}</code>, resources, community contre custom |
| **2.5** | Outils built-in : <code>Grep</code>, <code>Glob</code>, <code>Read</code>/<code>Write</code>/<code>Edit</code> |
| **3.1** | Hiérarchie <code>CLAUDE.md</code>, <code>@import</code>, <code>/memory</code>, <code>.claude/rules/</code> |
| **3.2** | Slash commands et skills : portées, <code>context: fork</code>, <code>allowed-tools</code>, <code>argument-hint</code> |
| **3.3** | Règles par chemin, patterns glob |
| **3.4** | Plan mode contre exécution directe, subagent <code>Explore</code> |
| **3.5** | Raffinement itératif : exemples, TDD, pattern interview, groupement des correctifs |
| **3.6** | CI/CD : <code>-p</code>, <code>--output-format json</code>, contexte <code>CLAUDE.md</code>, isolation de session |
| **4.1** | Critères explicites, faux positifs, sévérité |
| **4.2** | Few-shot : format, cas ambigus, généralisation, variété structurelle |
| **4.3** | <code>tool_use</code> + JSON Schema, nullable, enums, normalisation de format |
| **4.4** | Validation, retry avec feedback, limites du retry, <code>detected_pattern</code> |
| **4.5** | Message Batches API : pertinence, <code>custom_id</code>, calcul de SLA |
| **4.6** | Revue indépendante, multi-passes, routage par confiance |
| **5.1** | <code>Case facts</code>, trimming des tool results, lost-in-the-middle, données structurées en amont |
| **5.2** | Escalation : déclencheurs fiables et non fiables, correspondances multiples |
| **5.3** | Propagation d'erreurs, échec d'accès contre résultat vide, coverage annotations |
| **5.4** | Grandes codebases : scratchpad, <code>/compact</code>, manifeste de reprise |
| **5.5** | Revue humaine, échantillonnage stratifié, confiance par champ calibrée |
| **5.6** | Provenance, conflits de sources, dates, rendu par type de contenu |
