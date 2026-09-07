# D3 — Configuration et workflows de Claude Code (20 %)

<!-- src:exam guide domain 3 (the six task statements) ; exam guide TS 5.4 (/compact listed among its skills, which is where this course points for it) ; 01claudecodeinaction L1-L3, L6-L8 ; 04agentskills L1-L6 ; 06claudecode101 L4-L9, L12 ; code.claude.com/docs (memory, skills, sub-agents, headless, cli-reference) for the facts no lesson carries -->

Vingt pour cent de la note, six task statements, et un sujet trompeusement
anodin : des fichiers dans un dépôt. Une section par task statement, dans
l'ordre du guide et sous le libellé du guide, pour qu'une question repérée le
jour J renvoie ici sans traduction.

<!-- cross-refs:start -->

D0 et D1 sont supposés acquis. D1 a enseigné la mécanique *interne* d'un agent :
la boucle, les subagents, les hooks comme callbacks du SDK, les sessions. D3 est
la couche au-dessus : les fichiers et les flags qui configurent un Claude Code
en marche, et les habitudes de travail qui décident si une session se passe
bien.

Le guide place les notions voisines ailleurs, et ce cours le respecte. Le
mécanisme des hooks — événements, `permissionDecision`, `updatedInput` — est
testé en TS 1.5 ; l'isolation de contexte des subagents en TS 1.2 et 1.3 ; les
sessions, `--resume` et `fork_session` en TS 1.7 ; la fenêtre de contexte en D0,
et sa gestion en D5 — `/compact` compris, que le guide range parmi les skills du
TS 5.4, d'où le renvoi vers **D5.4**. Chacune reçoit ici une phrase et un renvoi,
jamais un second développement. Ce que D1 a explicitement renvoyé à ce cours —
les définitions de subagents sous `.claude/agents/`, et les hooks comme *endroit
où poser une règle* plutôt que comme API — atterrit en 3.2.

<!-- cross-refs:end -->

## 3.1 — Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization
<!-- ts:3.1 | src:exam guide TS 3.1 (the three levels, user-level not shared by version control, @import, .claude/rules/ as the modular alternative, /memory) ; 06claudecode101 L8 (what CLAUDE.md solves, its contents are appended to the prompt, project versus user, @path references) ; 01claudecodeinaction L2 (CLAUDE.md is guidance and not enforced configuration, every line competes with every other, imports expand inline and do not reduce context, specific and checkable rules, naming the replacement, the emphasis budget, hard rules belong in a hook) ; code.claude.com/docs/en/memory (four-hop import depth, .claude/rules/ layout, what /memory lists and what /context confirms) -->
<!-- owns:claude-md -->

Ouvrez Claude Code dans un dépôt qu'il n'a jamais vu et il part de rien : il doit
redécouvrir la commande de build, le lanceur de tests, où vivent les handlers, ce
qui a été tenté le mois dernier. **CLAUDE.md** est le fichier qui arrête cette
redécouverte. C'est du Markdown, Claude Code le lit au début de chaque session,
et son contenu est ajouté à votre prompt.

Reste à savoir lequel. Le guide teste trois niveaux, et ils diffèrent sur un seul
axe : **qui les reçoit**.

| Niveau | Emplacement | Partagé avec |
|---|---|---|
| User | `~/.claude/CLAUDE.md` | Vous seul, sur tous vos projets — ne passe **jamais** par le versionnage |
| Project | `./CLAUDE.md` ou `./.claude/CLAUDE.md` | Toute l'équipe, par le dépôt |
| Directory | `CLAUDE.md` dans un sous-répertoire | Toute l'équipe ; chargé quand Claude travaille dans ce sous-répertoire |

Cette troisième colonne est tout le task statement. Un fichier de niveau user vit
dans un répertoire personnel. Committer le dépôt ne l'emporte pas ; cloner le
dépôt ne le produit pas. Il n'atteint une seconde machine que si quelque chose l'y
recopie.

::: exam-tip
La signature d'un défaut de hiérarchie, c'est **« ça marche pour tout le monde
sauf pour le dernier arrivé »**, ou sauf pour la machine reconstruite depuis une
image, ou sauf en CI. Une instruction que les anciens appliquent et que le
dernier embauché n'a jamais reçue vit au niveau user. Le correctif est de la
déplacer au niveau projet et de la committer.

Les distracteurs nomment des choses réelles et n'expliquent rien. Une version
différente de Claude Code ne supprimerait pas une instruction ciblée. Un
CLAUDE.md devenu trop long dégrade l'adhérence *pour toute l'équipe*, pas pour
un seul poste. Faire recopier le fichier à la main par chacun reproduit
manuellement ce que le commit fait déjà, et redivergera au premier changement.
:::

### Garder le fichier modulaire

Deux mécanismes, et le guide nomme les deux.

**`@import`.** Un chemin précédé de `@`, n'importe où dans le fichier, y attire un
autre fichier. Les chemins relatifs sont résolus par rapport au fichier qui
contient l'import, pas au répertoire de travail, et les imports s'imbriquent
jusqu'à une profondeur maximale de quatre niveaux.

```markdown
# packages/api/CLAUDE.md

Ce package possède la surface REST publique.

@../../standards/http-errors.md
@../../standards/database-migrations.md
```

C'est la compétence énoncée par le guide : dans un monorepo, le mainteneur importe
dans le CLAUDE.md de chaque package les standards dont ce package a réellement
besoin, au lieu de charger tous les standards partout.

**`.claude/rules/`.** Au lieu d'un seul fichier qui grossit, un fichier par sujet :

```text
.claude/
├── CLAUDE.md            # ce qui est vrai de tout le projet
└── rules/
    ├── testing.md
    ├── api-conventions.md
    └── deployment.md
```

Les règles sans scoping par chemin se chargent au démarrage, au même rang que
`.claude/CLAUDE.md`. Ajouter un champ `paths` à une règle la rend
conditionnelle. C'est le TS 3.3, plus bas, et c'est la seule chose qui réduise
vraiment ce qui se charge.

::: anti-pattern
**Prendre `@import` pour réduire le contexte.** Les fichiers importés sont
expansés en place au démarrage, exactement là où vous les avez référencés. Les
imports achètent de l'*organisation*, pas un contexte plus petit : chaque octet se
charge quand même. Une question qui demande comment empêcher des conventions non
pertinentes de consommer la fenêtre demande des règles scopées par chemin (3.3), et
`@import` est le distracteur posé à côté d'elles.
:::

### Pourquoi le fichier cesse de fonctionner

CLAUDE.md est de la **guidance, pas de la configuration appliquée de force**.
Chaque ligne entre en concurrence avec toutes les autres pour l'attention : plus le
fichier grossit, moins une règle donnée est suivie de façon fiable. Ce n'est pas un
défaut à contourner, c'est la propriété qui dicte votre façon d'écrire.

Trois habitudes en découlent, et elles méritent d'être connues parce qu'elles
donnent aussi la forme des mauvaises réponses :

- **Spécifique et vérifiable.** « Placer les nouvelles routes API dans
  `src/api/handlers`, une par fichier », pas « suivre les bonnes pratiques pour
  les routes API ». Si vous ne pouvez pas vérifier qu'une règle a été suivie,
  Claude non plus.

- **Nommer le remplacement.** « Utiliser des exports nommés, pas des exports par
  défaut » ferme la question ; « ne pas utiliser d'exports par défaut » la laisse
  ouverte.

- **L'emphase est un budget.** `IMPORTANT` et `YOU MUST` élèvent la priorité d'une
  règle, mais seulement par rapport aux règles plus discrètes autour d'elle. Si
  chaque ligne crie, plus aucune ne se distingue.


Et la règle qui n'a pas sa place dans ce fichier du tout : ce qui ne doit
*jamais* arriver. « Ne jamais pousser sur `main` » écrit dans CLAUDE.md est un
espoir. Un hook est du code qui s'exécute en un point fixe et peut refuser
l'action. Le mécanisme est le TS 1.5 de D1 ; savoir où va telle règle est le
3.2, plus bas.

::: key-concept
`/memory` est la commande de diagnostic de ce task statement : elle liste les
emplacements de vos fichiers mémoire aux portées user et project et permet de
les ouvrir, ce qui est la manière de vérifier si l'instruction que vous cherchez
est là où vous le croyez.

**Le guide fait loi ici.** Sa compétence dit « using the `/memory` command to
verify which memory files are loaded and diagnose inconsistent behavior across
sessions », et la réponse est `/memory`. Nuance terrain, pour ne pas être
surpris devant un terminal : la documentation actuelle scinde le travail,
`/memory` listant et ouvrant les fichiers, `/context` rapportant lesquels ont
réellement été chargés dans la session en cours.
:::

**À tester** — les questions de la banque étiquetées `data-task="3.1"`.

## 3.2 — Create and configure custom slash commands and skills
<!-- ts:3.2 | src:exam guide TS 3.2 (project versus user scope for commands, SKILL.md frontmatter with context: fork, allowed-tools and argument-hint, personal variants under a different name, choosing skills against CLAUDE.md) ; 04agentskills L1 (a skill is a folder with SKILL.md, the description drives matching, personal versus project locations, load-on-demand against CLAUDE.md and slash commands), L2 (only names and descriptions load at startup, the Enterprise > Personal > Project > Plugins priority), L3 (required and optional frontmatter fields, allowed-tools, progressive disclosure, scripts run without being read), L4 (skills against CLAUDE.md, subagents, hooks and MCP), L5 (project skills shared through git, the subagent skills field, built-in agents cannot reach skills), L6 (a shadowed personal skill, rename as the usual fix) ; 01claudecodeinaction L3 (the verification skill, a skill folder carries reference files and scripts, which instruction surface owns which rule), L5 (exit 2 is the blocking code and stderr goes back to Claude as context; exit 1 feels like an error and does not block), L8 (a stop hook exiting 2 feeds the failure straight back to Claude) ; 06claudecode101 L9 (/agents and subagent definition files), L12 (a Claude Code hook is declared in settings and receives the tool name and input as JSON on stdin; exit 0 proceeds, exit 2 blocks and feeds stderr back, any other code blocks nothing) ; code.claude.com/docs/en/skills (context: fork, argument-hint, allowed-tools as pre-approval, .claude/commands/) -->
<!-- owns:skills -->

Quand vous avez tapé deux fois la même instruction en plusieurs étapes, elle doit
cesser d'être quelque chose que vous tapez. Le guide retient deux mécanismes pour
cela, et les traite comme distincts.

| | Slash command | Skill |
|---|---|---|
| Vit dans | `.claude/commands/review.md` | `.claude/skills/review/SKILL.md` |
| Invoqué | Explicitement, `/review` | Explicitement, ou automatiquement quand Claude apparie votre demande à sa `description` |
| Porte | Un prompt | Un dossier : instructions, fichiers de référence, scripts |
| Configurable | — | Frontmatter : `context`, `allowed-tools`, `argument-hint`, et d'autres |

Les deux existent en deux portées, et le partage est le même qu'en 3.1 :

| Portée | Commands | Skills | Partagé avec |
|---|---|---|---|
| Projet | `.claude/commands/` | `.claude/skills/` | L'équipe, par le versionnage |
| Personnel | `~/.claude/commands/` | `~/.claude/skills/` | Vous seul |

::: exam-tip
Dès que l'énoncé dit qu'une commande doit être disponible pour tout le monde après
un clone, la réponse du guide est `.claude/commands/`. Trois mauvaises réponses
sont disponibles : `~/.claude/commands/`, qui produit une commande fonctionnelle
qu'aucun collègue ne voit jamais ; le CLAUDE.md, qui porte des instructions
permanentes et non des définitions invocables ; et un tableau `commands` déclaré
dans un `.claude/config.json`, qui ressemble à une configuration d'outil et ne
désigne rien qui existe.
:::

### Le frontmatter que le guide teste

Un skill est un répertoire contenant un `SKILL.md` : frontmatter YAML, puis la
procédure.

```markdown
---
name: dependency-audit
description: Audite les dépendances tierces à la recherche de paquets inutilisés,
  obsolètes ou dupliqués. À utiliser lors d'une revue de dépendances ou avant une
  livraison.
context: fork
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[package-manager] — npm, pnpm ou cargo"
---

1. Lire le lockfile et lister chaque dépendance directe.
2. Chercher chacune dans les sources et signaler celles qui ne sont jamais importées.
3. Rapporter les paquets inutilisés, obsolètes et dupliqués en trois tableaux.
```

La `description` est le champ dont tout dépend : Claude ne charge au démarrage que
les noms et les descriptions, et apparie sémantiquement votre demande à ces
descriptions. Un skill qui ne se déclenche jamais a presque toujours une
description qui ne recoupe pas votre façon réelle de formuler vos demandes.

Trois champs facultatifs portent ce task statement.

**`context: fork`** exécute le skill dans un contexte de subagent isolé. Le contenu
du skill devient le prompt qui pilote ce subagent ; il n'hérite pas de votre
conversation, et ce qui revient à la session principale est le résultat plutôt que
toute la trace. C'est la réponse chaque fois que le *volume de sortie* d'un skill
est le problème : une analyse de codebase qui imprime chaque chemin inspecté, un
brainstorming qui explore cinq options que vous n'avez pas retenues.

**`allowed-tools`** restreint l'accès aux outils pendant l'exécution du skill,
par exemple limiter un skill aux opérations d'écriture de fichiers pour qu'il ne
puisse rien faire de destructeur. C'est la formulation du guide, et c'est elle
qu'il faut répondre. Nuance terrain, pour votre propre machine : la
documentation actuelle décrit ce champ comme une *pré-approbation* des outils
listés pour le tour d'invocation, de sorte que Claude peut les employer sans
demander, plutôt que comme un retrait des autres ; le champ qui retire
réellement un outil du lot est `disallowed-tools`.

**`argument-hint`** est l'indice affiché à l'autocomplétion, de sorte qu'un
développeur qui invoque le skill sans argument se voit dire quel paramètre il
attend.

::: exam-tip
Un skill s'exécute, produit un mur de sortie, et la session qui suit a
visiblement perdu le fil. La réponse est `context: fork`. Deux options voisines
sont plausibles et aucune ne déplace la sortie. `allowed-tools` change ce que le
skill peut *faire*, pas l'endroit où atterrit ce qu'il écrit. Et une consigne
« sois concis » ajoutée au corps du skill demande au modèle d'écrire moins au
lieu d'écrire ailleurs. Réduite ou non, la sortie arrive toujours dans la
session principale.
:::

### Les variantes personnelles, et pourquoi le nom compte

Les skills de même nom sont départagés par leur source, et un skill personnel
l'emporte sur un skill projet. Clonez un dépôt qui livre
`.claude/skills/review/`, gardez votre propre `~/.claude/skills/review/`, et
`/review` exécute le vôtre, silencieusement, sur votre machine seulement.

::: key-concept
L'instruction du guide est de donner à une variante personnelle **un nom
différent** : `~/.claude/skills/review-strict/` plutôt qu'un second `review`.
Reprendre le nom de l'équipe ne modifie pas leur configuration, mais cela signifie
que vos collègues et vous exécutez des procédures différentes sous une même
commande, et que rien dans aucune des deux installations ne le dit. Renommer est
aussi le correctif habituel quand un de vos skills est masqué et que vous ne
comprenez pas pourquoi il ne se déclenche jamais.
:::

### Quelle surface possède quelle règle

La dernière compétence du guide sur ce task statement est le choix entre un skill
et CLAUDE.md. Le tableau complet mérite d'être gardé en tête, parce que les
mauvaises
réponses sur ce sujet sont toujours *un autre mécanisme réel* :

| Surface | Se charge | Se déclenche sur | À utiliser pour |
|---|---|---|---|
| CLAUDE.md | Chaque session, toujours | Rien — il est simplement présent | Les standards universels : nommage, structure, « toujours faire X » |
| Skill | À la demande | Un `/nom` explicite, ou un appariement sémantique sur sa description | Les procédures et le matériel de référence propres à une tâche |
| Slash command | À l'invocation | Un `/nom` explicite | Un prompt répétable |
| Hook | — | Un événement du cycle de vie | Une règle que Claude ne doit pas pouvoir sauter |
| Subagent | À la délégation | Une délégation explicite | Un travail à faire dans un contexte isolé |

La frontière entre les deux premiers est celle du guide : **standards universels
toujours chargés contre workflows propres à une tâche chargés à la demande**. Une
procédure détaillée placée dans CLAUDE.md paie son coût en tokens dans chaque
conversation, y compris celles qui n'ont rien à voir avec elle.

La frontière avec le hook est d'une autre nature. CLAUDE.md et les skills sont des
instructions que Claude suit ; un hook est du code qui s'exécute. Si sauter la
règle est inacceptable, elle ne relève pas du suivi d'instructions.

Les événements, et `PreToolUse` comme primitive d'application, sont le TS 1.5 de
D1 et ne sont pas réenseignés ici. Ce qui diffère de ce côté de la frontière,
c'est *la façon dont un hook dit non*. Un hook Claude Code est une commande
déclarée dans les settings : il répond donc par un **code de sortie**, `2`
bloque, et ce qu'il a écrit sur la sortie d'erreur est renvoyé à Claude comme
motif. Un hook de l'Agent SDK est un callback dans votre processus et répond par
un `permissionDecision` en JSON. Même événement, même intention, deux
conventions. Et `exit 1` est le piège côté Claude Code : il a l'air d'un échec
et ne bloque rien.

```bash
# .claude/hooks/protect-main.sh — refuser un push sur main, à chaque fois.
# Un hook PreToolUse reçoit le nom de l'outil et son entrée en JSON sur stdin.
if grep -qE 'git +push.*\bmain\b'; then
  echo "Pousser sur main est interdit ; ouvrez une pull request." >&2
  exit 2          # 2 bloque et explique. 0 laisse passer. 1 ne fait ni l'un ni l'autre.
fi
```

Les subagents sont l'autre voisin. Ils se définissent comme des fichiers Markdown à
frontmatter YAML sous `.claude/agents/`, et `/agents` en crée un de façon
interactive. Deux faits appartiennent à ce task statement plutôt qu'à D1 : un
subagent n'hérite pas de vos skills, et un subagent personnalisé ne charge que les
skills que nomme son champ de frontmatter `skills`.

```markdown
---
name: accessibility-reviewer
description: Relit les changements frontend à la recherche de régressions d'accessibilité.
tools: Read, Grep, Glob
skills: accessibility-audit, contrast-check
---

Relire le diff à la recherche de violations WCAG. Rapporter les constats ; ne jamais éditer de fichier.
```

Le reste — pourquoi le contexte isolé d'un subagent est le point, et ce qui doit
voyager dans le prompt à cause de cela — est le TS 1.2 et le TS 1.3 de D1.

::: anti-pattern
**Mettre une longue procédure dans CLAUDE.md pour qu'elle soit « toujours
disponible ».** Elle est toujours *chargée*, ce qui n'est pas le même bénéfice et
constitue un coût permanent. Une checklist de revue de PR n'a rien à faire en
contexte pendant que vous déboguez.

**Prendre un hook pour empaqueter un workflow.** Un hook réagit à un événement
d'outil ; ce n'est pas quelque chose qu'un développeur choisit de lancer. Si
l'énoncé dit qu'une personne l'invoque, le hook n'est pas la réponse.
:::

**À tester** — les questions de la banque étiquetées `data-task="3.2"`.

## 3.3 — Apply path-specific rules for conditional convention loading
<!-- ts:3.3 | src:exam guide TS 3.3 (rules files with a YAML paths field of glob patterns, loading only when editing matching files to cut irrelevant context and tokens, the advantage of globs over directory-level CLAUDE.md for conventions spanning several directories, the paths: ["terraform/**/*"] and **/*.test.tsx examples) ; code.claude.com/docs/en/memory#path-specific-rules (the paths frontmatter, the glob table, rules without paths loading unconditionally, the read-time trigger, ~/.claude/rules/) -->

Découper CLAUDE.md en fichiers `.claude/rules/` rend les instructions
maintenables, et charge exactement autant de tokens qu'avant : c'est le problème
que le 3.1 a laissé ouvert. C'est l'ajout d'un champ `paths` à une règle qui
rend le chargement conditionnel.

```markdown
---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Conventions de test

- Un `describe` par symbole exporté, des phrases `it` au présent.
- Construire les fixtures avec les factories de `test/factories` ; jamais de littéral en ligne.
- Ne jamais mocker la base — utiliser la base de test de `test/db.ts`.
```

`paths` prend une liste de glob patterns. Le corps de la règle n'entre en contexte
que lorsque Claude travaille sur un fichier qui correspond à l'un d'eux ; le reste
du temps il ne coûte rien. Un fichier de règle sans champ `paths` se charge
inconditionnellement, comme le CLAUDE.md du projet.

Les globs sont ordinaires :

| Pattern | Correspond à |
|---|---|
| `**/*.ts` | Tous les fichiers TypeScript, dans n'importe quel répertoire |
| `src/**/*` | Tout ce qui est sous `src/` |
| `*.md` | Les fichiers Markdown à la racine du projet seulement |
| `terraform/**/*` | Tout ce qui est sous `terraform/` |

### Pourquoi pas un CLAUDE.md dans le sous-répertoire

Les deux mécanismes scopent des instructions. Ils les scopent selon des choses
différentes, et le guide teste cette différence.

Un CLAUDE.md de sous-répertoire est attaché à un **lieu**. C'est la bonne réponse
quand la convention est réellement locale : tout ce qui est sous `terraform/` obéit
à ces règles de tagging, et rien en dehors.

Une règle scopée par chemin est attachée à un **motif**. C'est la bonne réponse
quand les fichiers qui partagent une convention ne partagent pas de répertoire.
Le cas canonique est celui des fichiers de test, colocalisés avec le code qu'ils
couvrent et donc dispersés dans tout l'arbre. Écrire un CLAUDE.md dans chacun de
quarante répertoires pour y dire les mêmes trois choses sur les tests est
impossible à maintenir, et un unique CLAUDE.md racine qui les dit coûte à chaque
session qui n'ouvre jamais un test.

::: exam-tip
Lisez l'énoncé pour une seule chose : **où vivent les fichiers ?**

« Fichiers de test colocalisés dans tout le codebase », « fichiers Terraform sous
`infra/<produit>/` dans une douzaine de dossiers », « scripts de migration
dispersés entre les services » → règle scopée par chemin avec un glob. « Tout ce
qui est dans ce package » → un CLAUDE.md de répertoire se défend.

Trois mauvaises réponses sont disponibles ici. Un CLAUDE.md par sous-répertoire,
séduisant parce qu'il paraît plus local, mais lié au dossier et incapable de
suivre un type de fichier. Tout consolider dans le CLAUDE.md racine sous des
titres de section, ce qui remplace un appariement explicite par l'inférence du
modèle et charge tout de même l'ensemble. Et un skill par type de fichier, qui
échoue sur le mot *automatiquement* de l'énoncé : un skill s'invoque ou
s'apparie à une demande, pas au fichier en cours d'édition.
:::

::: key-concept
**Le guide fait loi ici.** Il écrit que les règles scopées par chemin se
chargent « when editing matching files ». Si une option porte le mot *édition*,
c'est celle-là. Nuance terrain, pour votre propre machine : la documentation
actuelle dit que les règles scopées par chemin se déclenchent quand Claude *lit*
un fichier correspondant au motif, donc en pratique la règle est déjà en
contexte avant votre première modification. Même mécanisme, mêmes `paths`, mêmes
globs ; seul le déclencheur diffère.
:::

::: anti-pattern
**Se servir du scoping par chemin pour faire appliquer quelque chose.** Une
règle qui se charge reste une règle que Claude lit, avec les propriétés
d'adhérence de n'importe quelle instruction. « Toute ressource Terraform doit
porter un tag `cost_center` » comme règle scopée par chemin oriente l'écriture ;
elle ne garantit pas le résultat. Si l'exigence est un verrou, c'est un hook ou
un contrôle en CI. Les deux sont complémentaires, pas alternatifs : la règle
fait juste la plupart du temps, le verrou attrape le reste.
:::

**À tester** — les questions de la banque étiquetées `data-task="3.3"`.

## 3.4 — Determine when to use plan mode vs direct execution
<!-- ts:3.4 | src:exam guide TS 3.4 (plan mode for large-scale changes, several valid approaches, architectural decisions and multi-file modifications; direct execution for simple well-scoped changes; plan mode as safe exploration before committing; the Explore subagent for verbose discovery; the microservice, 45-file migration and integration-choice examples against the single-file stack trace and the date validation; combining planning with direct execution) ; 06claudecode101 L4 (plan mode uses read-only tools, analyses the codebase, asks clarifying questions and returns a plan), L5 (explore → plan → code → commit, plan mode is where course-correction is cheap, the explore subagent can run outside plan mode), L6 (subagents run in a separate context window and return only a summary), L9 (subagent isolation and the returned summary) ; 01claudecodeinaction L1 (scope the work before Claude starts, read the plan rather than skim it, iterating on a plan beats cleaning up after a run), L4 (plan is a permission mode: reads only, proposes without editing) ; code.claude.com/docs/en/permission-modes (entering plan mode with Shift+Tab, prefixing a single prompt with /plan, or --permission-mode plan from the CLI) ; code.claude.com/docs/en/sub-agents (Explore is read-only, Write and Edit denied) -->
<!-- owns:plan-mode -->

Le **plan mode** est un mode de permission dans lequel Claude lit, cherche et
lance des commandes en lecture seule, pose ses questions de clarification, et
renvoie un plan, sans rien modifier. L'**exécution directe** est le mode
ordinaire : vous décrivez le changement et Claude le fait.

```bash
# Y entrer pour toute une session…
claude --permission-mode plan "Restructurer le monolithe de facturation en services"

# …ou presser Shift+Tab pour y basculer en cours de session, /plan pour un seul prompt.
```

Le choix ne porte pas sur la prudence, il porte sur **l'endroit où sont les
décisions**.

| L'énoncé dit | Mode | Parce que |
|---|---|---|
| « Des dizaines de fichiers », « 45+ fichiers » | Plan | Le rayon d'impact doit être cartographié avant d'être créé |
| « Plusieurs approches valides », « des prérequis d'infrastructure différents » | Plan | Il faut trancher, et trancher après avoir écrit veut dire réécrire |
| « Frontières de service », « restructuration » | Plan | Les décisions d'architecture se propagent |
| « Une stack trace claire », « une seule fonction » | Direct | Le périmètre est déjà établi |
| « Ajouter une validation de date » | Direct | Changement compris, rien à arbitrer |

Le plan mode gagne son coût pour une raison : itérer sur un plan est bien moins
cher que laisser une exécution avoir lieu puis nettoyer derrière. L'endroit où
corriger le tir est avant qu'une ligne soit écrite. Et quand le plan revient,
lisez-le au lieu de le parcourir : un plan non lu est une approbation que vous
n'avez pas réellement donnée.

### Le subagent Explore

Un subagent s'exécute dans sa propre fenêtre de contexte et renvoie un résumé ; les
lectures, les recherches et les impasses restent avec lui. Cette isolation est le
sujet de D1 (TS 1.2 et 1.3). Ce qui relève d'ici, c'est ce que le guide lui demande
dans ce task statement.

**Explore** est le subagent intégré, en lecture seule, dédié à la découverte.
Claude lui délègue la recherche ou la compréhension d'un codebase sans le modifier,
et seul son résumé atteint la conversation principale. C'est la réponse chaque fois
qu'une tâche en plusieurs phases épuise sa fenêtre pendant la phase de
*découverte* : le coût de l'exploration est payé dans un contexte que vous allez
jeter, et la fenêtre principale reste disponible pour planifier puis implémenter.

Il n'est pas lié au plan mode. Vous pouvez demander une exploration via le subagent
hors plan mode quand tout ce que vous voulez est un résumé du fonctionnement de
quelque chose.

::: key-concept
**Le plan mode décide, `Explore` garde la fenêtre dégagée, et le guide combine
les deux.** Ils répondent à deux pénuries différentes : le plan mode quand
quelque chose doit être tranché avant toute modification de fichier, `Explore`
quand une phase de découverte remplit la fenêtre de lectures dont vous n'aurez
plus jamais besoin. Aucun n'implique l'autre, et aucun n'exclut l'autre : une
tâche en plusieurs phases qu'il faut à la fois cadrer *et* qui manque de place
pendant la découverte prend les deux, et c'est la combinaison que le guide
nomme. Les distracteurs répondent à la seule pénurie de contexte, par compaction
ou par redémarrage, et laissent la décision en suspens.
:::

### La combinaison sur laquelle le guide interroge

Le plan mode et l'exécution directe ne sont pas une allégeance définitive. La
forme courante est les deux, dans l'ordre : planifier la migration de
bibliothèque, approuver le plan, puis l'exécuter directement. Le plan approuvé
devient le périmètre de la phase d'écriture. L'arbitrage a eu lieu avant qu'un
fichier change.

::: exam-tip
La complexité est **énoncée dans le scénario** ; elle ne se devine jamais.
Comptez les signaux : plusieurs fichiers, des approches concurrentes, des
frontières à tracer → plan mode. Une stack trace, un seul fichier, un changement
que tout le monde comprend déjà → exécution directe.

Le distracteur le plus fin propose de commencer en exécution directe et de
basculer en plan mode si cela s'avère compliqué. Il a l'air prudent et il ignore
que l'énoncé a déjà établi la complexité : vous iriez découvrir, à vos frais, ce
qu'on vous a dit. Deux plus grossiers : le plan mode partout par principe, qui
dépense de la délibération sur une correction d'une ligne ; et donner des
instructions exhaustives d'emblée en exécution directe, ce qui suppose de
connaître la bonne structure avant que quiconque ait lu le code.
:::

::: anti-pattern
**Traiter le plan mode comme un dispositif de sécurité et l'exécution directe comme
le mode risqué.** Ils répondent à une question sur la *tâche*, pas sur votre
appétit pour le risque. Quand un scénario porte deux tickets, répondre plan mode
pour les deux vous coûte celui qui est tranché : un test en échec qui énonce la
valeur attendue a déjà écrit la réponse que la planification irait chercher.
:::

**À tester** — les questions de la banque étiquetées `data-task="3.4"`.

## 3.5 — Apply iterative refinement techniques for progressive improvement
<!-- ts:3.5 | src:exam guide TS 3.5 (concrete input/output examples as the most effective way to communicate an expected transformation when prose is read inconsistently, test-driven iteration, the interview pattern, one message for interacting problems versus sequential fixes for independent ones, and the associated skills: 2-3 pairs, tests covering expected behaviour, edge cases and performance before implementation, interviewing on cache invalidation and failure modes, a specific test case for a null value in a migration script) ; 06claudecode101 L5 (define an explicit success criterion, give Claude a test suite it can continuously validate against, make sure the tests are a reliable source of truth first) ; 01claudecodeinaction L8 (tests as a gate rather than a promise) -->

Les quatre techniques de ce task statement viennent de la liste du guide
lui-même. Elles répondent à quatre défaillances différentes, et la question
d'examen est toujours *de quelle défaillance il s'agit*.

### Des exemples entrée/sortie concrets

La défaillance : la même consigne en prose produit un résultat différent à chaque
exécution. Le remède que le guide dit le plus efficace n'est pas plus de prose.
C'est deux ou trois paires concrètes montrant la transformation.

```text
Normalise ces fiches client.

  "Dupont,  Marie-Claire"  →  { first: "Marie-Claire", last: "Dupont" }
  "jean pierre MARTIN"     →  { first: "Jean Pierre", last: "Martin" }
  "O'Brien, Sean (Jr.)"    →  { first: "Sean", last: "O'Brien", suffix: "Jr." }
```

Trois paires tranchent ce qu'un paragraphe de définition laissait ouvert : où va la
virgule, ce qu'il advient de la casse, qu'un suffixe reçoit son propre champ. Un
exemple montre le résultat au lieu de le décrire, et les cas limites que vous
choisissez d'y inclure sont exactement ceux qui vous inquiétaient.

::: exam-tip
Quand l'énoncé dit qu'une instruction écrite a été réécrite une ou deux fois et que
la sortie varie encore, la réponse est les exemples travaillés. Les distracteurs
sont tous des suites plausibles et rejouent tous la défaillance. Réécrire la prose
plus précisément est la démarche qui a déjà échoué deux fois ; plus de mots sur une
ambiguïté ne la tranchent pas. Demander au modèle d'expliquer son interprétation
avant chaque exécution transforme chaque lancement en négociation au lieu de figer
la spécification une fois pour toutes. Découper la transformation en un appel par
champ multiplie les invocations sans jamais définir le terme ambigu. Et un
validateur qui rejette les mauvaises sorties attrape une forme d'erreur et relance
la même demande non contrainte.
:::

### L'itération guidée par les tests

La défaillance : vous ne pouvez pas dire si le code est juste, donc Claude non plus.
Écrivez la suite de tests d'abord — comportement attendu, cas limites, exigences de
performance — puis faites écrire l'implémentation contre elle, puis itérez en
renvoyant les échecs.

```bash
$ pytest tests/test_migration.py
FAILED test_null_effective_date - AssertionError: expected None, got '1970-01-01'
FAILED test_duplicate_account_ids - KeyError: 'legacy_id'
```

Deux conditions font que cela fonctionne au lieu de simplement paraître rigoureux.
Les tests doivent être une **source de vérité fiable** : une suite qui passe sur du
code cassé transforme l'itération en fausse confiance. Et « terminé » doit vouloir
dire que les portes ont été franchies et observées, pas qu'un résumé affirme
qu'elles l'ont été.

La version la plus tranchante qu'en donne le guide concerne les cas limites.
Plutôt que de décrire le problème, fournissez le cas précis : cette entrée,
cette sortie attendue, par exemple la valeur nulle que votre script de migration
traite mal.

### L'interview pattern

La défaillance : la spécification est incomplète et personne ne le sait encore.
Demandez à Claude de vous interroger avant d'implémenter.

```text
Avant d'implémenter le cache de l'API de tarification, pose-moi les questions dont
tu as besoin pour trancher la conception. N'écris pas de code avant mes réponses.

  1. Invalidation par TTL, ou sur événement d'écriture ?
  2. Des données périmées sont-elles acceptables si le cache est injoignable ?
  3. Par locataire ou global ?
  4. Quel volume de lecture doit-il tenir ?
```

Sa valeur, c'est la question 2. Vous n'aviez pas pensé au cache injoignable, et
vous l'auriez découvert en production. Prenez-le dans les domaines peu familiers,
là où les implications ne sont pas évidentes — stratégies d'invalidation de cache,
modes de défaillance — et là où plusieurs approches sont valides et où la bonne
dépend d'un contexte que vous n'avez pas énoncé.

### Un seul message, ou un à la fois

La défaillance : plusieurs problèmes à la fois, et les correctifs se combattent.

| Les problèmes sont | Donner le feedback | Parce que |
|---|---|---|
| Interdépendants — corriger l'un change ce dont les autres ont besoin | **Tous dans un seul message détaillé** | Le modèle doit voir l'interaction pour la réconcilier ; les corriger un par un revient à refaire la première correction |
| Indépendants — chacun se tient seul | **Séquentiellement** | Vous validez chaque étape, et rien de ce que vous approuvez n'est défait par le tour suivant |

Une gestion d'erreurs manquante *et* une validation d'entrée fausse font un seul
message : une réponse unifiée doit les placer ensemble. Renommer une variable et
changer un type de retour font deux conversations.

::: key-concept
**Quatre techniques, quatre défaillances différentes.** Une sortie qui varie
d'une exécution à l'autre est une transformation sous-spécifiée, et la réponse
est les exemples travaillés. Du code que personne ne peut juger est un verrou
manquant, et la réponse est des tests écrits d'abord. Une conception que vous
ne savez pas énoncer est une spécification incomplète, et la réponse est de
laisser Claude vous interroger. Des correctifs qui se défont l'un l'autre sont
une question de feedback, et elle se joue sur l'interdépendance, jamais sur le
nombre de problèmes.
:::

::: anti-pattern
**Regrouper des problèmes indépendants pour économiser des allers-retours.**
C'est plus économe en tokens et cela abandonne la validation pas à pas qui
faisait tout l'intérêt du feedback séquentiel : vous découvrez à la fin lequel
des cinq changements était faux.

**Découper des problèmes interdépendants pour garder le contrôle.** Chaque
correction se fait sans voir les autres, si bien que la seconde démonte la
première. Le critère est l'interdépendance, jamais le nombre de problèmes.
:::

**À tester** — les questions de la banque étiquetées `data-task="3.5"`.

## 3.6 — Integrate Claude Code into CI/CD pipelines
<!-- ts:3.6 | src:exam guide TS 3.6 (the -p / --print flag for non-interactive mode, --output-format json and --json-schema for structured CI output, CLAUDE.md as the mechanism carrying testing standards, fixture conventions and review criteria to a CI-invoked Claude Code, session context isolation for review, including prior findings when re-running a review, providing existing test files, documenting testing standards to reduce low-value test output) ; 01claudecodeinaction L6 (-p as the short form of --print, one-shot with no interactive UI, pairing --output-format json with --json-schema and reading the object from structured_output with jq, capturing session_id for a later --resume, --bare for deterministic CI runs), L8 (a fresh session or subagent with no memory of how the code was built catches what the original run talked itself past) ; 06claudecode101 L7 (a subagent reviewer with fresh eyes and read-only tools, checked into the repo) ; code.claude.com/docs/en/headless (--bare skips auto-discovery of hooks, skills, plugins, MCP servers and CLAUDE.md; without it claude -p loads the same context an interactive session would) -->

Claude Code est interactif par défaut. Invoqué dans une pipeline sans personne
pour répondre à une invite, il attend, et le runner finit par le tuer au timeout
de l'étape. Tout ce task statement découle de là.

### `-p`, et la forme de la sortie

`-p`, écrit en toutes lettres `--print`, exécute Claude Code comme une commande à
un coup : il traite le prompt, écrit le résultat sur la sortie standard, et se
termine. Il lit l'entrée standard et écrit sur la sortie standard, donc il se
branche en pipe comme n'importe quel outil shell.

Cela fait aboutir le job. Obtenir quelque chose que l'*étape suivante* peut
exploiter demande deux flags de plus : `--output-format json` fait de la réponse
une enveloppe JSON, et `--json-schema` contraint la charge utile à un schéma que
vous fournissez. L'objet conforme atterrit dans le champ `structured_output` de
l'enveloppe, à un endroit fixe, si bien que rien en aval n'a de prose à parser.

```yaml
- name: Revue du diff
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    claude -p "Relis $(git diff origin/main...HEAD) à la recherche de failles de sécurité et de bugs." \
      --output-format json \
      --json-schema '{
        "type": "object",
        "properties": {
          "issues": {"type": "array", "items": {
            "type": "object",
            "properties": {
              "severity": {"enum": ["critical", "major", "minor"]},
              "file": {"type": "string"},
              "line": {"type": "integer"},
              "message": {"type": "string"}
            },
            "required": ["severity", "file", "message"]
          }}
        }
      }' \
      | jq '.structured_output.issues' > findings.json
```

`findings.json` est maintenant une liste qu'une étape ultérieure peut poster en
commentaires inline sur la pull request via l'API GitHub. La clé d'API vient des
secrets du dépôt, jamais du fichier de workflow.

### Ce que l'instance CI sait

Un Claude Code invoqué en CI n'a pas d'historique de session et personne à qui
demander. La réponse du guide à cela est **CLAUDE.md** : le fichier projet
versionné est le mécanisme qui porte à l'instance qui tourne dans la pipeline
les standards de test, les conventions de fixtures et les critères de revue.
Documentez quelles fixtures existent et ce qui fait qu'un test vaut la peine
d'être écrit, et la génération de tests cesse de produire des tests de faible
valeur qui recouvrent un terrain que la suite tient déjà, c'est aussi pourquoi
vous mettez les fichiers de test existants en contexte quand vous en demandez de
nouveaux.

::: key-concept
`claude -p` charge le même contexte projet qu'une session interactive, CLAUDE.md
compris. Le mode bare — le flag `--bare` — en est le retrait : il saute
l'auto-découverte des hooks, des skills, des plugins, des serveurs MCP et du
CLAUDE.md pour démarrer plus vite et s'exécuter de façon déterministe.

Soyez précis ici, car une lecture courante de cette paire est fausse : elle
attribue ce saut à `-p` lui-même. La documentation l'attribue à `--bare` et
précise que sans lui, `claude -p` charge le même contexte qu'une session
interactive. Le TS 3.6 du guide lui-même suppose que CLAUDE.md atteint
l'instance CI, ce qu'il ne pourrait pas faire si `-p` le laissait tomber. La
pipeline reçoit votre CLAUDE.md sauf si vous avez demandé le mode bare ; et si
vous l'avez demandé, vous avez aussi renoncé aux standards sur lesquels le guide
vous dit de vous appuyer.
:::

### Relire est le travail d'une seconde instance

La session qui a écrit le code en est le plus mauvais relecteur. Elle porte le
raisonnement qui a produit ce code et remet le moins en question ses propres
décisions, le même biais qu'un auteur relisant son propre texte. La revue tourne
dans une **instance indépendante** : une session séparée, ou un subagent sans
mémoire de la façon dont le code a été construit. Un œil neuf attrape ce que
l'exécution d'origine s'est raconté pour passer outre.

Deux règles opérationnelles complètent le tableau, et toutes deux sont des
compétences du guide :

- **En relançant une revue après de nouveaux commits, passez-lui les constats
  précédents** et demandez à Claude de ne rapporter que ce qui est nouveau ou encore
  non traité. Sinon chaque push soulève de nouveau les mêmes problèmes, la pull
  request se
  remplit de commentaires dupliqués, et les développeurs cessent de les lire.

- **Passez les fichiers de test existants** lors de la génération de tests, pour que
  les nouveaux ne dupliquent pas des scénarios déjà couverts.


::: exam-tip
Quatre associations tranchent la plupart des questions CI. Un job qui se bloque
en attente de saisie → `-p`. Une pipeline qui doit parser des constats →
`--output-format json` avec `--json-schema`. Une instance CI qui ignore les
conventions de test du projet → le CLAUDE.md versionné les lui porte. Relire du
code que Claude vient d'écrire → une instance indépendante.

Les distracteurs viennent de deux familles. **Les mécanismes inventés** : une
variable d'environnement `CLAUDE_HEADLESS`, un flag `--batch`, une option
`--no-tty`. Ils sont plausibles parce que *headless* et *batch* sont bien le
vocabulaire du domaine, et aucun des trois n'existe. Un flag que le binaire ne
connaît pas ne change pas le mode. **Les contournements** : rediriger l'entrée
standard depuis `/dev/null`, qui traite le symptôme sans activer le mode
documenté ; envelopper l'appel dans un `timeout`, qui transforme un long blocage
en un blocage court et ne produit toujours rien ; et parser la prose à coups de
regex, qui déplace la fragilité dans votre propre code au lieu de la supprimer.
:::

::: anti-pattern
**Relancer la revue depuis zéro à chaque push.** Claude n'a pas de mémoire entre
les exécutions, donc il resignale tout ce qu'il avait trouvé la fois précédente.
La pull request accumule les doublons jusqu'à ce que plus personne ne lise le
bot. Le correctif n'est pas de relire moins souvent ; c'est d'inclure les
constats précédents et de demander le delta.

**Laisser le job qui a produit le code le relire aussi, pour économiser une
exécution.** Un job coûte moins que deux, et il achète la revue que le guide
désigne comme la moins efficace : le raisonnement qui a écrit le code est encore
dans la fenêtre. **Pourquoi une instance indépendante attrape ce qu'une
auto-revue manque, et comment découper une grande revue en passes par fichier
puis inter-fichiers, est développé en D4.6.**
:::

**À tester** — les questions de la banque étiquetées `data-task="3.6"`.
