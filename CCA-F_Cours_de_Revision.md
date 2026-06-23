# Claude Certified Architect – Foundations (CCA-F) — Cours de révision unique

> **Support unique.** Ce document remplace la navigation entre fiches : méthode, format de l'examen,
> contenu des 5 domaines (à jour 2026), pièges, stratégie et plan de révision sont ici, alignés.
> Ta banque d'entraînement reste `Practice_Questions.html` (78 questions) — le cours sert à *comprendre*,
> la banque à *te tester*.
>
> **Sources** : guide d'examen officiel (`Certification Exam Guide.pdf`), FAQ officielle (vérifiée),
> doc officielle `code.claude.com/docs` et `platform.claude.com/docs` (points techniques recoupés en juin 2026),
> et la science de l'apprentissage (Dunlosky 2013 & al.). Tout point non vérifié est marqué comme tel.

---

# PARTIE 0 — L'examen et comment le préparer

## 0.1 Format de l'examen (vérifié)

**Confirmé par le guide officiel :**
- QCM à **choix unique** : 1 bonne réponse, 3 distracteurs. Pas de pénalité au hasard → **ne laisse aucune
  question vide**.
- Questions **scénarisées** : **4 scénarios tirés au sort sur 6** (voir Partie 1).
- 5 domaines pondérés : **D1 27 % · D2 18 % · D3 20 % · D4 20 % · D5 15 %**.

**Confirmé par la FAQ officielle (verbatim) :**
- **Score de passage : 720** (échelle /1000).
- Examen **proctored** via **ProctorFree**.
- **Une seule tentative autorisée** → marge de sécurité obligatoire, pas de « je retenterai ».
- **Tarif 99 $**, accès réservé aux **partenaires** (Anthropic Partner Network).
- Prérequis officiels : avoir complété les cours **200-level** de l'Academy et avoir **construit** avec
  Agent SDK, Claude Code, API et MCP.
- **Practice Exam officielle** disponible : la FAQ dit qu'un **score > 900/1000 à la Practice est le meilleur
  prédicteur de réussite**. → C'est ta ressource n°1 et ton indicateur Go/No-go (voir 0.4).

**Non confirmé** (ni guide ni FAQ ne le disent) : nombre exact de questions (~60 ?), durée (120 min ?),
caractère *closed-book / sans IA*. « Proctored » est sûr ; le reste est à vérifier sur le portail. Ne le
tiens pas pour acquis.

## 0.2 Méthode de révision (evidence-based) — les 5 règles

La recherche sur l'apprentissage est tranchée. Applique ces 5 règles ; le reste est du détail.

1. **Se tester, pas relire.** Le *retrieval practice* (se réinterroger de mémoire) est la technique à plus
   haut rendement ; relire/surligner crée une **illusion de maîtrise** (utilité faible). → Tes sessions
   commencent par des questions **fiches fermées**, on ne rouvre les fiches qu'au débrief.
   *(Dunlosky et al. 2013 ; Roediger & Karpicke 2006.)*
2. **Débriefer chaque distracteur.** Pour un QCM de jugement, savoir *pourquoi les 3 mauvaises options sont
   fausses* vaut autant que la bonne réponse. C'est le cœur de l'examen. *(Little et al. 2012.)*
3. **Feedback systématique + hypercorrection.** Ne laisse jamais une erreur sans correction. Les erreurs
   commises **avec assurance (confiance 4-5)** sont les plus rentables à corriger. *(Butler & Roediger 2008 ;
   Metcalfe 2017.)*
4. **Espacer et entrelacer.** Revois chaque domaine **tous les 2-3 jours** (pas en un seul bloc), et **mélange
   les domaines** dans une même semaine : ça entraîne à *discriminer quel scénario tu as*. *(Cepeda et al.
   2008 ; Rohrer & Taylor 2007.)*
5. **Allouer au poids × ta faiblesse.** Priorité aux domaines **lourds ET faibles**. D1 (27 %) d'office ;
   ne néglige jamais D5 (15 %) — ce sont des points faciles.

Budget : **~1,5-2 h/jour de pratique réellement active** (au-delà, rendement décroissant). En pratique active
on apprend plus *tout en ayant l'impression d'apprendre moins* — ne te fie pas à ce ressenti. *(Deslauriers
et al. 2019.)*

## 0.3 La boucle quotidienne + le journal d'erreurs

**Chaque session (~90 min)** suit 4 temps :
1. **Échauffement (~10 min)** — de mémoire, reprends 3-5 erreurs de la veille (espacement).
2. **Pratique (~40 min)** — questions du domaine du jour, **chrono, fiches fermées**. Pour chaque question :
   lis l'énoncé, **formule ta réponse AVANT de regarder les options**, puis élimine.
3. **Débrief (~30 min)** — le moment où tu apprends. Remplis le journal d'erreurs (ci-dessous).
4. **Consolidation (~10 min)** — reformule de mémoire la règle/l'arbre de décision en jeu.

**Journal d'erreurs** (ton vrai plan de révision — à J-1 tu ne reliras que lui) :

| # Q | Domaine | Ma rép. | Bonne rép. | Pourquoi MON choix est faux | Pourquoi chaque autre distracteur est faux | Règle à retenir | Confiance 1-5 |
|---|---|---|---|---|---|---|---|

## 0.4 Plan sur 12 jours (compresse si tu as moins de temps)

- **J-12 — Diagnostic.** ~25-30 questions tous scénarios confondus (chrono, fiches fermées). Note ton **score
  par domaine** → fixe tes priorités. Ouvre le journal d'erreurs.
- **J-11 → J-5 — Pratique entrelacée**, 1 domaine « primaire » par jour dans l'ordre **poids × faiblesse**
  (par défaut D1 → D3 → D4 → D2 → D5, puis 2 jours sur tes 2 domaines les plus faibles). Échauffement =
  retrieval d'un domaine déjà vu.
- **J-4 — Mock complet n°1** en conditions (4 scénarios, chrono). Idéalement la **Practice Exam officielle**.
  Débrief complet.
- **J-3 — Réparation ciblée** : re-teste *uniquement* tes erreurs ; drille les **arbres de décision** (§0.5).
- **J-2 — Mock complet n°2** en conditions. Décide ton **Go/No-go**.
- **J-1 — Taper** : relis **seulement** journal d'erreurs + cheat sheets + 7 distracteurs. **Aucun nouveau
  contenu. Dors** (le sommeil consolide).
- **J-0** : échauffement léger (survol du journal), puis stratégie de passage (§0.5).

**Go / No-go (à J-2) :**
- ✅ **Prêt (critère officiel)** : **> 900/1000 à la Practice Exam**. À défaut d'accès : ≥ **85 %** sur un
  mock neuf, aucun domaine < ~75 %, et tu sais **nommer le pattern/arbre** derrière chaque bonne réponse.
- ⚠️ **Limite** : 75-85 %, ou un domaine lourd (D1/D3/D4) faible → concentre J-3/J-2 dessus.
- ❌ **Illusion de maîtrise** : tu « reconnais » les réponses déjà vues mais chutes sur des formulations
  neuves → tu mémorises au lieu de comprendre. Repasse en mode « je formule ma réponse avant les options ».

## 0.5 Stratégie de passage (jour J)

**Méthode QCM en 4 temps, pour chaque question :**
1. **Lis le scénario et repère ce qui est demandé** (cause racine ? meilleur premier pas ? trade-off ?).
2. **Formule ta réponse avant de lire les options.**
3. **Élimine** avec les 7 patterns de distracteurs ci-dessous.
4. **Tranche.** Ne change ta réponse **que si tu as une raison précise** (mot-clé manqué, info oubliée) —
   en moyenne les changements *raisonnés* vont d'incorrect → correct, mais ne change pas par simple doute.
   *(Kruger et al. 2005.)*

**Les 7 patterns de distracteurs à éliminer en 5 secondes** (tirés des 12 questions corrigées du guide) :
1. **L'over-engineering** : classifier ML, modèle entraîné, infra custom, routing layer… quand une solution
   simple existe. Presque toujours faux comme *premier* pas. *(Q2, Q3, Q9, Q11.)*
2. **Le prompt là où il faut du déterministe** : « renforcer le system prompt / ajouter des instructions »
   quand la règle métier exige une garantie (argent, vérif d'identité) → c'est un **hook / prérequis
   programmatique** qu'il faut. *(Q1.)*
3. **La confiance auto-rapportée / le sentiment** comme proxy de complexité : self-reported confidence,
   sentiment analysis → non fiables. *(Q3.)*
4. **Blâmer l'agent aval** qui fonctionne correctement alors que la cause est en amont (coordinateur,
   décomposition). *(Q7.)*
5. **Le « plus gros modèle / plus grand contexte » comme solution de qualité d'attention** : non, il faut
   **découper** (per-file + integration pass). *(Q12.)*
6. **Supprimer/masquer l'erreur** : retourner un résultat vide « comme un succès », ou tuer tout le workflow
   sur une seule panne → deux anti-patterns. *(Q8.)*
7. **Les absolus** (« always / never ») et les options qui changent le *sujet* du problème (ex. résoudre la
   disponibilité d'outil alors que le problème est l'*ordre* des appels). *(Q1 option D.)*

**Réflexe transverse** : la bonne réponse vise presque toujours **la cause racine** et la solution
**proportionnée** (le bon *premier pas*), pas la plus sophistiquée.

---

# PARTIE 1 — Les 6 scénarios (le cadre des questions)

Chaque question est rattachée à un scénario de production. **4 sur 6** tombent le jour J.

| # | Scénario | Domaines primaires |
|---|---|---|
| 1 | **Customer Support Resolution Agent** (returns, billing, refunds ; outils MCP `get_customer`, `lookup_order`, `process_refund`, `escalate_to_human` ; cible 80 % first-contact) | D1, D2, D5 |
| 2 | **Code Generation avec Claude Code** (génération, refactor, debug, doc ; slash commands, CLAUDE.md, plan mode vs direct) | D3, D5 |
| 3 | **Multi-Agent Research System** (coordinateur → web search / doc analysis / synthesis / report ; rapports cités) | D1, D2, D5 |
| 4 | **Developer Productivity** (explorer codebases, legacy, boilerplate ; built-in tools Read/Write/Bash/Grep/Glob + MCP) | D2, D3, D1 |
| 5 | **Claude Code en CI/CD** (revues auto, génération de tests, feedback PR ; minimiser les faux positifs) | D3, D4 |
| 6 | **Structured Data Extraction** (extraire de l'unstructured, valider via JSON schema, edge cases) | D4, D5 |

**Comment t'en servir** : pour chaque scénario, sache *quels leviers* il met en jeu. Ex. Scénario 1 → règle
métier critique ⇒ **hook/prérequis** (pas prompt) ; escalation ⇒ **critères explicites + few-shot**. Scénario
3 → couverture incomplète ⇒ **décomposition du coordinateur**. Scénario 6 → champs absents ⇒ **nullable**
(pas de fabrication).

# PARTIE 2 — Le contenu par domaine

> Format de chaque section : **mental model** → **à maîtriser** (les compétences testées, distillées) →
> **distracteurs du domaine** → **auto-test**. Les ajouts récents et corrections sont balisés
> **➕ in-scope** (manquait, à connaître) et **⚠️ à jour 2026** (le cours imprimé est périmé sur ce point).

## D0 — Fondations API (non pondéré, mais socle de D2/D4)

**Mental model.** L'API est **stateless** : à chaque appel tu renvoies *tout* l'historique. Claude ne se
« souvient » de rien entre deux requêtes.

**À maîtriser :**
- **Requête** : `model`, `max_tokens`, `messages` (rôles `user`/`assistant` qui **alternent**), `system`
  (champ **top-level**, ce n'est *pas* un rôle), `temperature` (0-1 ; **bas = factuel/extraction**, haut =
  créatif). ➕ `temperature` et le caractère **stateless** sont souvent testés en fondation.
- **`stop_reason`** : `end_turn` (fini), `tool_use` (Claude veut un outil), `max_tokens`, `stop_sequence`.
  C'est le pivot de la boucle agentique (D1).
- **Définition d'outil** : `name`, **`description`** (le levier n°1 de sélection — cf. D2), `input_schema`
  (JSON Schema).
- **`tool_choice`** : `auto` (le modèle *peut* répondre en texte), `any` (il *doit* appeler un outil, lequel
  au choix), `{"type":"tool","name":"…"}` (outil **forcé**).
- **Structured output** : `tool_use` + JSON Schema = l'approche la **plus fiable** (élimine les erreurs de
  *syntaxe*, **pas** les erreurs *sémantiques* : un total qui ne s'additionne pas reste possible). Champs
  **nullable** quand l'info peut être absente → empêche la fabrication de valeurs.
- **Familles de modèles** : Opus (intelligence) / Sonnet (équilibre) / Haiku (vitesse) — critère de sélection.

## D1 — Agentic Architecture & Orchestration (27 % — le plus lourd)

**Mental model.** Une boucle pilotée par le **modèle** (il raisonne sur le prochain outil), pas un arbre de
décision pré-câblé. En multi-agent : **hub-and-spoke**, le coordinateur est le seul point de passage.

**À maîtriser :**
- **Boucle agentique (1.1)** : envoyer → inspecter `stop_reason` → si `tool_use` : exécuter le(s) outil(s),
  **append le `tool_result` à l'historique**, ré-appeler → si `end_turn` : terminer. **Anti-patterns à
  rejeter** (souvent la bonne réponse = « ne fais pas ça ») : parser le langage naturel pour décider
  d'arrêter, utiliser un **cap d'itérations** comme mécanisme d'arrêt principal, ou vérifier la présence de
  texte assistant comme signal de complétion.
- **Hub-and-spoke (1.2)** : le coordinateur gère **toute** la communication, les erreurs, le routage. Les
  **subagents ont un contexte isolé** : ils **n'héritent pas** de l'historique. Le coordinateur décompose,
  délègue, agrège, et **choisit dynamiquement** quels subagents lancer (pas toujours toute la pipeline).
  **Risque clé** : décomposition trop étroite → couverture incomplète (c'est la cause racine de Q7, pas un
  bug des agents aval). Partitionner le scope (éviter les doublons), boucles de **raffinement itératif**
  (détecter les gaps, re-déléguer, re-synthétiser).
- **Spawn & contexte (1.3)** : outil de spawn de subagents (le coordinateur doit l'avoir dans `allowedTools`).
  **⚠️ Nom de l'outil** : le **guide d'examen dit `Task`** → **c'est la réponse attendue à l'examen**. La doc
  Agent SDK *actuelle* l'appelle **`Agent`** (`allowedTools: ["Agent"]`). Si une question oppose les deux, **suis
  le guide (`Task`)**.
  **Le contexte doit être passé explicitement dans le prompt** du subagent. `AgentDefinition` = description +
  system prompt + restrictions d'outils par type. **Parallélisme** : émettre **plusieurs `Task` dans une
  seule réponse**. Prompts coordinateur = **objectifs + critères de qualité**, pas une procédure pas-à-pas.
- **Enforcement & handoff (1.4)** : **enforcement programmatique** (hooks, prerequisite gates) vs **guidance
  par prompt**. Quand la conformité doit être **déterministe** (vérifier l'identité avant un remboursement),
  le prompt seul a un **taux d'échec non nul** → bloquer programmatiquement. Handoff structuré (customer ID,
  cause racine, montant, action recommandée) car l'humain **n'a pas le transcript**.
- **Hooks Agent SDK (1.5)** : `PostToolUse` pour **normaliser** des résultats hétérogènes (timestamps Unix /
  ISO 8601 / codes numériques) *avant* que le modèle les traite ; **interception d'appel** pour **bloquer**
  une action qui viole une règle (refund > 500 $) et **rediriger** vers l'escalation. **Hook = garantie ;
  prompt = probabiliste.**
- **Décomposition (1.6)** : pipeline séquentiel fixe (**prompt chaining**) pour des revues multi-aspects
  prévisibles ; **décomposition dynamique** pour l'investigation ouverte. Grosse revue → **per-file** +
  **cross-file integration pass** (évite la dilution d'attention).
- **Sessions (1.7)** : `--resume <session-name>` ; `fork_session` pour explorer des branches divergentes
  depuis une baseline partagée ; informer la session reprise des **fichiers modifiés** ; **repartir d'un
  résumé structuré** > reprendre avec des tool results périmés.

**Distracteurs du domaine** : cap d'itérations / parsing de texte (loop) ; **blâmer l'agent aval** alors que
la cause est le coordinateur ; donner trop d'outils à un subagent ; **prompt au lieu de hook** pour une règle
critique.

**Auto-test :**
1. *L'agent refund appelle parfois `process_refund` sans avoir vérifié le client. Fix le plus efficace ?*
   → **Prérequis programmatique** qui bloque `process_refund` tant que `get_customer` n'a pas renvoyé un ID
   vérifié (pas « renforcer le prompt »). *Pourquoi : règle critique = déterministe.*
2. *Le rapport multi-agent ne couvre qu'une partie du sujet, chaque subagent réussit sa tâche. Cause ?*
   → **Décomposition trop étroite du coordinateur.** *Pourquoi : les agents aval font correctement ce qu'on
   leur a assigné.*
3. *Comment lancer 3 subagents en parallèle ?* → **Émettre 3 appels `Task` dans une seule réponse** du
   coordinateur (et `"Task"` dans `allowedTools`).

## D2 — Tool Design & MCP Integration (18 %)

**Mental model.** La **description d'outil** est le principal levier de sélection du modèle. Donne à chaque
agent **peu d'outils, bien décrits, dans son périmètre**.

**À maîtriser :**
- **Descriptions (2.1)** : descriptions minimales → mauvaise sélection entre outils similaires. Inclure
  formats d'entrée, exemples, edge cases, frontières (« quand utiliser ceci *vs* l'alternative »). Corriger
  l'ambiguïté en **renommant** (`analyze_content` → `extract_web_results`) ou en **scindant** un outil
  générique (`analyze_document` → `extract_data_points` / `summarize_content` / `verify_claim_against_source`).
  Attention aux instructions **keyword-sensitive** du system prompt qui écrasent une bonne description.
- **Erreurs structurées MCP (2.2)** : flag **`isError`**. 4 catégories : **transient** (timeout/indispo),
  **validation** (input invalide), **business** (violation policy), **permission**. Retourner
  **`errorCategory` + `isRetryable` (bool) + description lisible**. `retriable:false` + explication
  *customer-friendly* pour les violations métier. **Récupération locale** dans le subagent pour le transient ;
  ne propager au coordinateur que l'irrécupérable **avec résultats partiels + ce qui a été tenté**.
  Distinguer **échec d'accès** (décision de retry) vs **résultat vide valide** (succès, 0 match).
- **Distribution & `tool_choice` (2.3)** : **trop d'outils** (18 au lieu de 4-5) dégrade la sélection ;
  outils hors-spécialité → mésusage. **Scoped access** : les outils du rôle + quelques cross-role à haute
  fréquence (ex. `verify_fact` pour le synthesis agent, le reste passe par le coordinateur). `tool_choice:
  any` pour **garantir un appel d'outil** (pas de texte) ; **forcé** pour qu'un outil précis tourne d'abord
  (ex. `extract_metadata` avant l'enrichissement).
- **MCP dans Claude Code (2.4)** : **`.mcp.json`** (projet, partagé via VCS) vs **`~/.claude.json`** (user,
  perso/expérimental). **Expansion `${VAR}`** pour les credentials sans commit. Tous les outils des serveurs
  configurés sont **découverts à la connexion** et dispos simultanément. **MCP resources** = exposer des
  **catalogues de contenu** (issues, doc, schémas DB) pour **réduire les appels exploratoires**. Enrichir les
  descriptions des outils MCP pour qu'ils ne soient pas délaissés au profit des built-in. Préférer un
  **serveur communautaire** éprouvé (Jira) au custom pour du standard.
- **Built-in tools (2.5)** : **Grep** (contenu : fonctions, messages d'erreur, imports) ; **Glob** (chemins :
  `**/*.test.tsx`) ; **Read/Write** (fichier entier) ; **Edit** (modif ciblée par texte **unique**) — si Edit
  échoue (texte non unique) → **Read + Write** en fallback. Comprendre un codebase **incrémentalement**
  (Grep les entry points → Read suit les imports), pas tout lire d'emblée.
- **3 primitives MCP** : **tools** (contrôlés par le **modèle**) ; **resources** (contrôlés par
  l'**application**, URIs — catalogues) ; **prompts** (contrôlés par l'**utilisateur**, façon slash commands).

**⚠️ à jour 2026 :** l'auto-approbation d'outils MCP dans Claude Code suit le format **`mcp__<server>__<tool>`**
(minuscules, double underscore, **par outil**) — *vérifié en doc*. Le PDF de cours écrit `MCP__[server]` (faux).
Transports MCP canoniques : **stdio** et **HTTP** (les « WebSockets » du cours sont un exemple générique).
**➕ in-scope :** côté API, le bloc `tool_result` porte un champ **`is_error`** (à ne pas confondre avec le
`isError` MCP — même idée, niveaux différents).

**Distracteurs du domaine** : **consolider deux outils en un** présenté comme « premier pas » (souvent
over-engineering) ; **few-shot** pour corriger une mauvaise *description* (ajoute des tokens sans traiter la
cause) ; donner **tous les web tools** au synthesis agent (over-provision) ; **statut d'erreur générique**.

**Auto-test :**
1. *Deux outils aux descriptions minimales (« Retrieves customer information » / « …order details ») sont
   mal sélectionnés. Premier pas le plus efficace ?* → **Étendre les descriptions** (formats, exemples,
   frontières), pas du few-shot ni un routing layer.
2. *Un subagent web search timeout. Quelle remontée d'erreur ?* → **Contexte d'erreur structuré** (type
   d'échec, requête tentée, résultats partiels, alternatives), pas un statut générique ni tuer le workflow.
3. *Synthesis agent qui fait 85 % de vérifs simples + 15 % complexes, 40 % de latence en plus via le
   coordinateur. Quoi ?* → Lui donner un **outil scoped `verify_fact`** pour le cas simple, garder le
   coordinateur pour le complexe (principe de moindre privilège).

## D3 — Claude Code Configuration & Workflows (20 %)

**Mental model.** La bonne config est **scopée au bon niveau** (user/projet/répertoire/path) et **chargée au
bon moment** (toujours vs on-demand vs conditionnel). Pour les garanties, un **hook** ; pour les conventions,
une **règle** ; pour les workflows à la demande, une **skill**.

**À maîtriser :**
- **Hiérarchie CLAUDE.md (3.1)** : le guide cite **user / projet / répertoire** ; la doc complète liste **4
  niveaux concaténés** (pas d'override), du plus large au plus spécifique : **managed/policy** (system-wide) →
  **user** (`~/.claude/CLAUDE.md`, non partagé via VCS) → **projet** (`CLAUDE.md` racine ou `.claude/CLAUDE.md`)
  → **local** (`CLAUDE.local.md`). Les `CLAUDE.md` de **sous-répertoire** se chargent **on-demand**. **`@import`**
  pour modulariser.
  **`.claude/rules/`** pour des règles thématiques. **`/memory`** pour vérifier ce qui est chargé et diagnostiquer
  un comportement incohérent. *Diagnostic type : un nouvel équipier ne reçoit pas les instructions → elles sont
  en **user-level** au lieu de **projet**.*
- **Commands & skills (3.2)** : **`.claude/commands/`** (projet, partagé via VCS) vs **`~/.claude/commands/`**
  (perso). **Skills** dans `.claude/skills/` avec `SKILL.md` ; frontmatter : **`context: fork`** (exécute en
  sous-agent isolé → n'encombre pas la conversation), **`allowed-tools`** (restreint les outils), **`argument-hint`**.
  Skill perso = `~/.claude/skills/` avec un **nom différent** pour ne pas affecter l'équipe. **Skill = invocation
  on-demand** ; **CLAUDE.md = standards toujours chargés.**
- **Path-specific rules (3.3)** : `.claude/rules/` avec **YAML frontmatter `paths:`** (globs, ex.
  `["terraform/**/*"]`, `["**/*.test.tsx"]`). Charge **seulement** quand on édite un fichier qui matche →
  réduit le contexte/les tokens. **Avantage glob vs CLAUDE.md de sous-dossier** quand la convention s'applique à
  des fichiers **dispersés** (tests partout dans le repo).
- **Plan mode vs direct (3.4)** : **plan mode** = grosse tâche, multi-fichiers, plusieurs approches valides,
  décisions d'archi (migration de lib sur 45+ fichiers, monolithe→microservices). **Direct** = changement simple
  et bien scopé (fix une fonction). **Explore subagent** pour isoler une découverte verbeuse. On combine souvent :
  plan pour l'investigation, direct pour l'implémentation.
- **Raffinement itératif (3.5)** : **exemples I/O concrets** > prose (2-3 paires). **Test-driven** : écrire les
  tests d'abord, itérer en partageant les échecs. **Interview pattern** : faire poser des questions à Claude pour
  faire émerger les considérations cachées. Problèmes qui **interagissent** → tout dans un message ; **indépendants**
  → séquentiel.
- **CI/CD (3.6)** : **`-p` / `--print`** = mode non-interactif (sinon le job *hang*). **`--output-format json`**
  + **`--json-schema`** pour des findings machine-parsables (commentaires PR auto). **CLAUDE.md** porte le contexte
  projet (standards de test, fixtures, critères de revue). **Isolation de session** : une instance **indépendante**
  review mieux que celle qui a généré le code.

**➕ in-scope — HOOKS (le plus gros manque, vérifié en doc) :**
- Clé de config **`"hooks"`** (minuscule) ; les **événements sont en PascalCase**. Pour l'examen, retiens surtout
  **`PreToolUse`**, **`PostToolUse`**, **`Stop`**, **`SessionStart`**, **`UserPromptSubmit`** (la doc en liste bien
  d'autres).
- **Codes de sortie** : **`exit 0`** = OK ; **`exit 2`** = **bloquer** (le **stderr** est renvoyé à Claude comme
  feedback) ; autre code = non bloquant. **`PreToolUse` peut bloquer un appel d'outil ; `PostToolUse` non.**
- Le hook reçoit un **objet JSON sur stdin** : `hook_event_name`, `tool_name`, `tool_input`, etc.
- **`matcher`** : filtre quels outils déclenchent le hook (`"Bash"`, `"Edit|Write"`, regex ; `mcp__server__.*`
  pour les outils MCP). Certains events (`UserPromptSubmit`, `Stop`…) **n'ont pas de matcher** (tirent toujours).
- **`/hooks`** = menu **en lecture seule** ; pour ajouter/modifier, on **édite le JSON** (ou on demande à Claude).

**➕ in-scope — SKILLS (du cours *Agent Skills*) :**
- Frontmatter `SKILL.md` : pour l'examen, retiens **`context: fork`** (isole en sous-agent), **`allowed-tools`**,
  **`argument-hint`** (les champs cités par le guide). Doc actuelle : **`name`** = *display name* **optionnel**
  (défaut = **nom du dossier**, qui sert de nom de commande) ; **`description`** = champ **le plus critique** pour
  le déclenchement (`description` + `when_to_use` tronqués à **1 536 car.**) ; champs **`model`** (`inherit` ou
  valeur de `/model`) et `effort` existent aussi.
- **Progressive disclosure** : `SKILL.md` **≤ ~500 lignes** ; sous-dossiers `scripts/`, `references/`, `assets/` ;
  charger un fichier de référence **seulement si nécessaire**. **Les scripts sont exécutés sans charger leur
  contenu** — seule leur **sortie** consomme des tokens (lien direct avec D5).
- **Priorité en cas de conflit de nom** : **Entreprise > Personnel > Projet** (> *bundled*). Les **plugins sont
  namespacés** (`plugin:skill`) → ils n'entrent **pas** en conflit (donc pas « en bas » d'une chaîne linéaire).
- **Déploiement** : Git (équipe), Plugin + marketplace (communauté), **Managed Settings** (entreprise, priorité
  max ; `strictKnownMarketplaces` pour restreindre les marketplaces).
- Les **agents intégrés (Explore/Plan/Verify) n'accèdent pas aux skills**. Debug : `claude --debug`, et un
  *validator* de skills. *(Valeurs chiffrées issues du cours — apprends-les pour l'examen, à reconfirmer en doc live.)*

**⚠️ à jour 2026 (le cours imprimé est périmé — pièges classiques) :**
- C'est **`CLAUDE.md`** (majuscules), pas « Claude.md ».
- Hooks : clé **`"hooks"`** + events **PascalCase** (`PreToolUse`) — *pas* `preToolUse` (camelCase du cours = faux,
  *vérifié en doc*).
- Arguments de slash command : **`$ARGUMENTS`** (tous) ; positionnels **0-based** → **`$0` = 1er argument**,
  `$1` = 2e (ou `$ARGUMENTS[N]`) ; args **nommés** via frontmatter `arguments:`. *(Pas « $arguments » ; et `$1`
  n'est PAS le premier argument.)*
- Hiérarchie mémoire (doc) = **managed → user → projet → local**, concaténés ; le cours dit « Project / Local /
  Machine » (périmé). Pour l'examen, la taxonomie du guide est **user / projet / répertoire**.
- Commands & skills sont **découvertes dynamiquement** (le « redémarrer Claude après création » du cours est
  obsolète).
- Plan Mode s'active via **Shift+Tab** (×2) ; le « Thinking mode » (profondeur, mots-clés type *think*) est distinct.

**Distracteurs du domaine** : **CLAUDE.md de sous-dossier** pour une convention transversale (préférer
`.claude/rules/` + glob) ; **tout entasser dans un CLAUDE.md racine** en comptant sur l'inférence ; une **skill**
pour appliquer *automatiquement* une convention (skill = on-demand, pas auto) ; **`CLAUDE_HEADLESS` / `--batch`**
(flags inexistants) au lieu de **`-p`**.

**Auto-test :**
1. *Commande `/review` dispo pour tous au clone du repo. Où ?* → **`.claude/commands/`** dans le repo (pas
   `~/.claude/commands/`, ni CLAUDE.md, ni un `config.json` inexistant).
2. *Conventions de test pour des fichiers `*.test.tsx` dispersés, appliquées automatiquement. Quoi ?* →
   **`.claude/rules/` avec glob `**/*.test.tsx`** (pas un CLAUDE.md de sous-dossier, pas une skill « auto »).
3. *Le job CI `claude "…"` hang. Fix ?* → **`-p` / `--print`** (pas `CLAUDE_HEADLESS`, pas `--batch`).

## D4 — Prompt Engineering & Structured Output (20 %)

**Mental model.** Les **critères explicites** et les **exemples** battent les instructions vagues ; pour une
sortie structurée fiable, **`tool_use` + JSON Schema**. Un retry n'aide que si l'info **existe** dans la source.

**À maîtriser :**
- **Critères explicites (4.1)** : des critères **catégoriels précis** (« flag un commentaire seulement si le
  comportement décrit contredit le code ») battent « sois conservateur » / « seulement high-confidence ». Les
  **faux positifs** détruisent la confiance dev. Définir des **niveaux de sévérité avec exemples de code**. On
  peut **désactiver temporairement** une catégorie à fort taux de faux positifs le temps d'améliorer son prompt.
- **Few-shot (4.2)** : la technique **la plus efficace** pour une sortie **consistante/actionnable** quand les
  instructions seules ne suffisent pas. **2-4 exemples ciblés** sur les cas **ambigus**, montrant *pourquoi* on a
  choisi telle action. Réduit l'hallucination en extraction (formats variés) et fait **généraliser** (pas juste
  matcher des cas pré-spécifiés).
- **Structured output via `tool_use` (4.3)** : **le plus fiable** (élimine les erreurs de **syntaxe**, **pas** les
  **sémantiques**). `tool_choice` : `auto` / `any` (garantit un appel) / **forcé** (un outil précis d'abord).
  Champs **optionnels/nullable** quand l'info peut manquer → **empêche la fabrication**. **Enum** avec `"other"`
  + detail, ou `"unclear"` pour l'ambigu. Mettre les **règles de normalisation** dans le prompt **à côté** du
  schéma strict.
- **Validation & retry (4.4)** : **retry-with-error-feedback** (renvoyer le document + l'extraction ratée + les
  erreurs de validation précises). **Limite** : le retry est **inutile si l'info est absente** de la source (vs
  une erreur de format/structure, elle, corrigible). `detected_pattern` pour analyser les faux positifs.
  **Self-correction** : extraire `calculated_total` à côté de `stated_total` pour repérer les écarts ;
  `conflict_detected` (bool) pour les sources incohérentes.
- **Batch (4.5)** : **Message Batches API** = **~50 % moins cher**, fenêtre **jusqu'à 24 h**, **pas de SLA de
  latence**. Adapté au **non-bloquant** (rapports overnight, audits hebdo) ; **inadapté au bloquant** (pre-merge).
  **Pas de tool calling multi-turn** dans un batch. **`custom_id`** pour corréler requête/réponse et **resoumettre
  seulement les échecs**. Affiner le prompt sur un **échantillon** avant le gros batch.
- **Multi-pass review (4.6)** : la **self-review est limitée** (le modèle garde son contexte de génération). Une
  **instance indépendante** attrape mieux les subtilités que « relis-toi » ou l'extended thinking. **Per-file +
  cross-file** pour éviter dilution et contradictions.

**⚠️ ne pas confondre :** un **« outil batch »** (un *schéma d'outil* prenant une liste, pour paralléliser des
appels en **un seul message**) **≠** la **Message Batches API** (50 % moins cher, 24 h, `custom_id`). Le cours
mélange les deux.

**Distracteurs du domaine** : « be conservative » / filtrage par confidence ; **self-reported confidence** pour
router ; **plus gros modèle / plus grand contexte** au lieu de **découper** ; **consensus 2/3 runs** (supprime de
vrais bugs) ; **batch pour un check bloquant**.

**Auto-test :**
1. *Extraction où un champ peut être absent du document. Comment éviter l'invention ?* → Champ **nullable** dans
   le schéma (le modèle renvoie `null` plutôt que de fabriquer).
2. *Pre-merge check bloquant + rapport de dette overnight. Passer les deux en Batch API pour économiser ?* →
   **Non** : batch **uniquement** pour le rapport overnight ; le pre-merge reste **synchrone**.
3. *Revue de 14 fichiers : feedback incohérent/contradictoire. Quoi ?* → **Découper** (per-file + integration
   pass), pas « un plus gros modèle ».

## D5 — Context Management & Reliability (15 %)

**Mental model.** Le contexte est une **ressource rare et faillible** : les chiffres se perdent au résumé, le
milieu se perd (« lost in the middle »), les tool results gonflent. On **extrait, on structure, on persiste**.

**À maîtriser :**
- **Préserver le contexte (5.1)** : risque de la **summarization progressive** (elle écrase chiffres, %, dates,
  attentes client). Effet **« lost in the middle »** (début/fin fiables, milieu omis). Les **tool results
  s'accumulent** (40+ champs alors que 5 sont utiles). **Skills** : extraire les **« case facts »** (montants,
  dates, n° de commande, statuts) dans un **bloc persistant inclus à chaque prompt**, *hors* résumé ; **trimmer**
  les tool outputs aux champs utiles ; placer le **résumé des findings en début** + **headers explicites** (mitige
  l'effet de position) ; faire renvoyer aux subagents des **données structurées** (faits clés, citations) plutôt
  que du verbeux quand le budget aval est limité.
- **Escalation & ambiguïté (5.2)** : **triggers** = demande **explicite** d'un humain, **gap/exception de policy**
  (pas juste « cas complexe »), **incapacité à progresser**. Escalader **immédiatement** sur demande explicite ;
  **proposer de résoudre** si le cas est simple. **Sentiment** et **confidence auto-rapportée** = mauvais proxys de
  complexité. **Plusieurs matches** → **demander un identifiant** (pas d'heuristique).
- **Propagation d'erreur multi-agent (5.3)** : **contexte d'erreur structuré** (type d'échec, requête tentée,
  résultats partiels, alternatives). Distinguer **échec d'accès** vs **résultat vide valide**. Statut générique
  (« search unavailable ») = cache le contexte au coordinateur. **Anti-patterns** : supprimer silencieusement
  (vide = succès) ; tuer **tout** le workflow sur une seule panne. Synthèse avec **annotations de couverture**
  (bien supporté vs gaps par source indisponible).
- **Grand codebase (5.4)** : **dégradation en session longue** (réponses incohérentes, références à des « patterns
  typiques » au lieu des classes vues). **Scratchpad files** pour persister les findings. **Délégation subagent**
  pour isoler le verbeux. **Crash recovery** par **manifest** d'état structuré. **`/compact`** pour réduire le
  contexte quand il se remplit de découverte verbeuse.
- **Human review & calibration (5.5)** : les **métriques agrégées (97 %)** masquent de mauvaises perfs **par type
  de doc / par champ**. **Stratified random sampling**. **Confidence field-level** calibrée sur un **validation
  set** labellisé. **Valider par type de doc et par champ** avant d'automatiser.
- **Provenance (5.6)** : l'**attribution se perd** au résumé. Imposer des **claim-source mappings** préservés et
  fusionnés à la synthèse. Stats **conflictuelles** → **annoter avec attribution** (ne pas choisir arbitrairement).
  Exiger les **dates** de publication/collecte (pour ne pas confondre écart **temporel** et contradiction).

**⚠️ à jour 2026 :** prompt caching = **2 TTL — 5 min (défaut) + 1 h (option `ttl:"1h"`)** ; le cours « 1 h max »
est **faux** (*vérifié en doc*). Seuil min cacheable ≈ **1024 tokens** (Sonnet/Opus), **2048** (Haiku). *Mais* les
**détails internes du caching sont hors-scope** (cf. Partie 3) : connaître son existence suffit.

**Distracteurs du domaine** : **sentiment / confidence** pour escalader ou router ; **choisir une valeur** entre
deux stats conflictuelles ; **summarization agressive** qui perd les chiffres ; statut d'erreur **générique**.

**Auto-test :**
1. *Le client dit « je veux parler à un humain ». Quoi ?* → **Escalader immédiatement** (sans tenter d'enquêter
   d'abord).
2. *`lookup_customer` renvoie plusieurs correspondances. Quoi ?* → **Demander un identifiant supplémentaire** (pas
   d'heuristique de sélection).
3. *Agent de support qui perd les montants/dates au fil d'une longue conversation. Fix ?* → **Bloc « case facts »
   persistant** (chiffres/dates/statuts) inclus à chaque prompt, hors résumé.

# PARTIE 3 — Hors-scope, pièges, à vérifier, sources

## 3.1 ⛔ Hors-scope officiel — NE révise PAS ça

Le guide d'examen liste explicitement ce qui **ne tombe pas**. Tes PDF de cours (surtout *Building with the
Claude API*) couvrent **beaucoup** de ces sujets — ne perds pas ton temps dessus :

- Fine-tuning / entraînement de modèles ; architecture interne, poids, processus d'entraînement de Claude ;
  Constitutional AI, RLHF, safety training.
- **Embeddings & vector databases** (donc tout le **module RAG** : chunking, Voyage AI, BM25, RRF, reranking,
  contextual retrieval → **hors-scope**).
- **Computer use** (automatisation navigateur/desktop).
- **Vision / analyse d'images** (et par extension les détails images/PDF/citations du cours API).
- **Streaming API** (implémentation, server-sent events) → les noms d'événements de streaming = hors-scope.
- Déploiement/hébergement de serveurs MCP (infra, réseau, conteneurs) ; configs cloud (AWS Bedrock, GCP Vertex,
  Azure) → les cours Bedrock/Vertex sont hors-scope.
- Auth API, billing, gestion de compte ; OAuth, rotation de clés.
- Rate limiting, quotas, **calcul de pricing** ; **tokenization / token counting**.
- **Détails internes du prompt caching** (au-delà de *savoir que ça existe*).
- Benchmarking / comparaison de modèles.

**Conséquence** : dans tes PDF de cours, **saute** les modules RAG, computer use, vision, streaming, code
execution/Files API, Bedrock/Vertex. Ils ne rapportent aucun point.

## 3.2 Récap des pièges « cours daté → réalité » (niveau de certitude)

| Sujet | Ce que le PDF de cours dit | Réalité à retenir | Vérifié ? |
|---|---|---|---|
| Fichier mémoire | `Claude.md` | **`CLAUDE.md`** (majuscules) | Connu/évident |
| Clé hooks | `preToolUse` (camelCase) | clé **`"hooks"`** + events **PascalCase** (`PreToolUse`) | ✅ doc |
| Types de hooks | 2 (pre/post) | bien plus (`Stop`, `SessionStart`, `UserPromptSubmit`…) | ✅ doc |
| Exit codes hook | 0/2 | **0** OK, **2** bloque (stderr→Claude), autre = non bloquant | ✅ doc |
| Auto-approve MCP | `MCP__[server]` | **`mcp__<server>__<tool>`** (minuscule, par outil) | ✅ doc |
| Prompt caching TTL | « 1 h max » | **5 min (défaut) + 1 h (option)** ; min ≈1024 (Sonnet/Opus), 2048 (Haiku) | ✅ doc |
| Args slash command | `$arguments`, `$1`=1er arg | **`$ARGUMENTS`** ; positionnels **0-based** (`$0`=1er) ; args nommés | ✅ doc |
| Hiérarchie mémoire | Project / Local / Machine | **managed → user → projet → local** (concaténés) | ✅ doc |
| SDK | « Claude Code SDK », `allowTools` | **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) ; `allowedTools` | ✅ doc |
| Outil subagent (SDK) | — | **guide : `Task`** (réponse examen) ; **doc actuelle : `Agent`** | ✅ doc |
| Skills `description` | « ≤ 1024 » | tronquée à **1 536 car.** (avec `when_to_use`) | ✅ doc |
| Skills `name` | « ≤ 64, = dossier » | *display name* **optionnel** (défaut = dossier) | ✅ doc |
| SKILL.md taille | — | **≤ ~500 lignes** (recommandation) | ✅ doc |

Tous ces points sont désormais **recoupés en doc officielle**. Règle d'or quand le **guide d'examen** et la doc
**divergent** (ex. `Task` vs `Agent`, taxonomie mémoire) : **à l'examen, réponds selon le guide** ; la colonne
« réalité » est pour ta culture et le cas où une question porte explicitement sur la version actuelle.

## 3.3 ✅ Ce que TU dois vérifier toi-même (je n'ai pas accès au portail partenaire)

Je ne peux pas me logger sur Skilljar (login partenaire). À faire de ton côté :

1. **Le blueprint exact**, dans le **CCA-F Exam Guide** sur le portail : **nombre de questions**, **durée**,
   et si c'est **closed-book / IA interdite** (la FAQ confirme seulement « proctored ProctorFree »).
2. **La Practice Exam officielle** : y accéder dans Skilljar et **viser > 900/1000** — c'est l'indicateur de
   readiness officiel.
3. **Ton éligibilité** : prérequis = **cours 200-level complétés** + accès partenaire actif (email pro partenaire).
4. **La validité du certificat** (durée) : non mentionnée dans la FAQ — à vérifier si ça t'importe.
*(Côté **contenu**, plus rien à vérifier de ton côté : tous les points techniques du cours sont recoupés en doc
officielle — voir le tableau §3.2. Ne restent que les 4 infos « portail » ci-dessus.)*

## 3.4 Sources

**Officiel Anthropic** (vérifié)
- `Claude Certified Architect – Foundations — Certification Exam Guide.pdf` (domaines, task statements, 12
  questions corrigées, in/out-of-scope, recommandations).
- FAQ officielle CCA-F (score 720, proctored ProctorFree, 1 tentative, 99 $, Practice Exam > 900, prérequis).
- Doc : hooks `code.claude.com/docs/en/hooks` ; mémoire/CLAUDE.md `code.claude.com/docs/en/memory` ; Agent SDK
  `code.claude.com/docs/en/agent-sdk/overview` ; tool use `platform.claude.com/docs/en/build-with-claude/tool-use` ;
  prompt caching + batch `platform.claude.com/docs/en/build-with-claude/...`.
- Cours Academy (Skilljar) : *Building with the Claude API*, *Claude Code in Action*, *Introduction to MCP*,
  *Introduction to subagents*, *Introduction to agent skills* — croisés avec tes PDF du dossier `anthropic courses`.

**Science de l'apprentissage**
- Dunlosky et al. 2013 (classement d'utilité des techniques) ; Roediger & Karpicke 2006 (testing effect) ;
  Cepeda et al. 2006/2008 (spacing) ; Rohrer & Taylor 2007 (interleaving) ; Butler & Roediger 2008 (feedback) ;
  Metcalfe 2017 (hypercorrection) ; Kruger et al. 2005 (changement de réponse) ; Deslauriers et al. 2019 (illusion
  d'apprentissage en cours actif).

---
*Cours établi à partir du guide d'examen officiel + FAQ + **doc officielle (tous les points techniques recoupés
en juin 2026)** + analyse des PDF du dossier `anthropic courses`. Seules restent à vérifier de ton côté les 4
infos « portail » du §3.3 (blueprint exact + Practice Exam), inaccessibles sans login partenaire.*
