# D1 — Architecture et orchestration des agents (27 %)

<!-- src:exam guide domain 1 (the seven task statements) ; 08agentsdk L2-L11, L14, L15 ; 03subagents L1-L4 -->

Le domaine le plus lourd de l'examen : sept task statements, 27 % de la note. Une
section par task statement, dans l'ordre du guide et sous le libellé du guide —
pour qu'une question repérée le jour J renvoie ici sans traduction.

<!-- cross-refs:start -->

D0 est supposé acquis. Ce cours commence là où D0 s'arrête : D0 a nommé
`stop_reason` et dit ce que vaut chaque valeur ; D1 transforme cette vérification
en boucle, puis en système d'agents autour d'elle.

Le guide place les notions voisines ailleurs, et ce cours le respecte.
`tool_choice` et les JSON Schemas sont testés en TS 2.3 et TS 4.3 ; les réponses
d'erreur structurées en TS 2.2 et TS 5.3 ; les fichiers `.claude/agents/` et la
commande `/agents` relèvent de la configuration Claude Code, testée au domaine 3.
Chacune reçoit ici une phrase et un renvoi, jamais un second développement.

<!-- cross-refs:end -->

## 1.1 — Design and implement agentic loops for autonomous task execution
<!-- ts:1.1 | src:08agentsdk L2 (the five-step cycle, the stop_reason table, several tool_use blocks in one reply and their results returned in one user message, the three named anti-patterns, model-driven vs pre-configured decision tree), L3 (maxTurns and maxBudgetUsd as bounds) ; exam guide TS 1.1 -->
<!-- owns:agentic-loop -->

Un seul appel à la Messages API produit une réponse. Une vraie tâche — retrouver
le client, consulter la commande, décider d'un remboursement — demande plusieurs
actions, chacune choisie à la lumière de ce que la précédente a retourné.
L'**agentic loop** est ce mécanisme : requête, réponse, exécution d'outil,
nouvelle requête, jusqu'à ce que le modèle signale qu'il a terminé.

Le cycle, en cinq étapes :

1. Vous envoyez une requête avec l'historique de conversation et le paramètre `tools`.

2. Claude répond. La réponse peut porter du texte, un ou plusieurs blocs `tool_use`, ou les deux.

3. Votre code exécute chaque outil demandé et collecte les résultats.

4. Vous ajoutez à l'historique la réponse de l'assistant **et** les blocs `tool_result`.

5. Vous renvoyez tout l'historique. On recommence jusqu'à ce que `stop_reason` soit terminal.


`stop_reason` est le champ de la réponse qui dit pourquoi la génération s'est
arrêtée ; l'ensemble de ses valeurs est catalogué en D0. Deux seulement pilotent
cette boucle :

| `stop_reason` | Ce que fait votre code |
|---|---|
| `"tool_use"` | Exécuter les outils demandés, ajouter leurs résultats, itérer |
| `"end_turn"` | Le modèle n'a plus rien à demander — sortir de la boucle |

```python
while True:
    response = client.messages.create(
        model="claude-sonnet-5",
        messages=messages,
        tools=tools,
    )
    # Toute la réponse repart : blocs de texte et blocs tool_use ensemble.
    messages.append({"role": "assistant", "content": response.content})

    if response.stop_reason != "tool_use":
        break                      # terminal — D0 catalogue les autres valeurs

    tool_results = execute_tools(response.content)
    messages.append({"role": "user", "content": tool_results})
```

Deux lignes portent tout le task statement. Le `break` s'appuie sur
`stop_reason`, sur rien d'autre. Et le second `append` est ce qui fait de
l'itération suivante une étape de *raisonnement* plutôt qu'une répétition : les
résultats d'outils entrent dans l'historique de conversation, donc le prochain
choix d'outil se fait à la lumière de ce que le dernier a retourné. Une boucle
qui exécute les outils sans jamais ajouter leurs résultats repose éternellement
la même question.

### Plusieurs appels dans une même réponse

Une même réponse peut aussi porter **plusieurs** blocs `tool_use` — deux
recherches que le modèle veut mener ensemble, par exemple. Exécutez-les toutes,
puis renvoyez chaque `tool_result` dans un *seul* message `user`, un bloc par
appel. C'est le mécanisme par lequel un coordinateur lance plusieurs subagents à
la fois, développé en 1.3.

::: key-concept
La boucle est **model-driven** : Claude lit le contexte accumulé et décide quel
outil vient ensuite. C'est ce qui sépare un agent d'un workflow. Un
**pre-configured decision tree** — votre code fixant à l'avance la séquence
`read_schema → plan_changes → apply_migration` — est de l'ingénierie légitime,
mais il ne traitera jamais que les cas prévus par qui l'a écrit. Le guide teste
votre capacité à distinguer les deux et à choisir selon la prévisibilité de la
tâche.
:::

::: anti-pattern
Le guide nomme trois mauvaises façons de piloter la boucle, et ce sont les
distracteurs de ce task statement :

- **Parser le texte de l'assistant** à la recherche de « task completed » ou
  « I'm done ». Le langage naturel n'est pas un signal ; Claude peut écrire
  « done » alors qu'un bloc `tool_use` est encore en attente dans la même réponse.
- **Utiliser un plafond d'itérations arbitraire** (`max_iterations = 5`) comme
  mécanisme d'arrêt principal. Un plafond est un garde-fou contre un agent qui
  s'emballe, pas un constat sur l'achèvement du travail — il interrompt des
  exécutions légitimes.
- **Vérifier la présence de texte** comme indicateur de complétion. Texte et
  `tool_use` voyagent dans la même réponse ; la présence de l'un ne dit rien de
  l'autre.
:::

### Les plafonds sont des garde-fous, pas des conditions d'arrêt

Les plafonds ont leur place, tant qu'ils restent des plafonds. L'Agent SDK expose
`max_turns` / `maxTurns` (allers-retours agentiques) et `max_budget_usd` /
`maxBudgetUsd` (dépense) ; les deux sont sans limite par défaut, et poser un
budget est un bon défaut de production sur un prompt ouvert. Ni l'un ni l'autre
n'est une condition de terminaison, et le SDK marque une exécution qui en a
atteint un comme un subtype d'erreur, pas comme un succès.

::: exam-tip
Dès qu'une question demande comment décider si la boucle continue ou s'arrête, la
réponse est `stop_reason`, et précisément `"tool_use"` contre `"end_turn"`. Toute
alternative plausible dans la liste d'options — parsing de texte, plafond
d'itérations, test de présence d'un bloc de texte — est l'un des trois
anti-patterns ci-dessus, déguisé.
:::

**À tester** — les questions de la banque étiquetées `data-task="1.1"`.

## 1.2 — Orchestrate multi-agent systems with coordinator-subagent patterns
<!-- ts:1.2 | src:08agentsdk L4 (hub-and-spoke as a design choice, the coordinator's role, the narrow-decomposition risk), L14 (iterative refinement, scope partitioning, local recovery before propagation) ; 03subagents L1 (context isolation, the summary that comes back), L4 (the decision rule: does the intermediate work matter to the caller) ; exam guide TS 1.2 -->

Avant l'architecture, la décision. Un subagent tourne dans sa propre fenêtre de
contexte, fait son travail et ne renvoie qu'un résumé ; les lectures, recherches
et appels d'outils intermédiaires sont jetés avec lui. Ce compromis tient en une
question : **le travail intermédiaire intéresse-t-il l'appelant ?** Si seule la
réponse compte, déléguez. S'il faut voir et réagir à chaque étape, gardez la main
dans le thread principal.

### La forme hub-and-spoke

Quand une tâche est vraiment trop large pour un seul agent — un rapport de
recherche qui demande recherche web, analyse documentaire et synthèse — on
obtient une architecture **hub-and-spoke** : un coordinateur (le hub) pilote
plusieurs subagents spécialisés (les spokes), et *tout* le trafic passe par le hub.

```text
              Coordinateur (hub)
             /        |         \
   subagent recherche  analyse    synthèse
        (web)        (documents)  (rapport)

   chaque résultat, chaque erreur, chaque retry
   passe hub ↔ spoke — jamais spoke ↔ spoke
```

Rien dans le SDK n'impose cette forme. C'est un choix de conception, et le guide
en nomme les trois motifs : l'**observabilité** (un seul endroit voit toute
l'exécution), la **cohérence du traitement d'erreur** (une politique, pas une par
agent) et le **contrôle du flux d'information** (le hub décide de ce que chaque
spoke apprend).

### Ce dont le coordinateur a la charge

Le travail du coordinateur, tel que le guide l'énonce :

| Responsabilité | Ce que cela veut dire en pratique |
|---|---|
| Task decomposition | Découper la demande en sous-tâches qui, ensemble, la couvrent |
| Délégation dynamique | Choisir les subagents dont une requête donnée a réellement besoin, plutôt que de router chaque requête à travers tout le pipeline |
| Agrégation des résultats | Collecter les sorties des spokes et assembler la réponse |
| Gestion d'erreur | Décider de réessayer, d'adapter la requête, ou de continuer avec des résultats partiels |

### Deux savoir-faire sur lesquels portent les questions

Deux compétences méritent d'être énoncées à part, parce que ce sont elles que les
questions de scénario mettent en jeu.

**Partitionner le périmètre avant de déléguer.** Donnez à chaque subagent de
recherche un sous-thème distinct ou un type de source distinct. Des briefs qui se
recouvrent produisent du travail dupliqué et, pire, des angles morts corrélés.

**Raffiner par itération.** Le coordinateur lit la sortie de synthèse, y cherche
les manques, re-délègue aux subagents de recherche et d'analyse avec des requêtes
*ciblées*, et relance la synthèse jusqu'à couverture suffisante. C'est une boucle
de qualité posée au-dessus de la boucle d'exécution de 1.1, et c'est le remède
que le guide nomme contre une couverture incomplète.

::: key-concept
Les subagents démarrent d'un **contexte isolé** : ils n'héritent pas de
l'historique de conversation du coordinateur et ne partagent aucune mémoire d'une
invocation à l'autre. Tout ce dont un spoke a besoin voyage dans le prompt que le
hub écrit pour lui — la mécanique est en TS 1.3, ci-dessous.
:::

### Une décomposition trop étroite

Le risque que le guide nomme explicitement est une **décomposition trop étroite
par le coordinateur**. Chargé d'un rapport sur « AI impact on creative
industries », un coordinateur le découpe en « AI in digital art », « AI in
graphic design » et « AI in photography ». Chaque subagent exécute correctement
son brief. Le rapport ne couvre que l'art visuel ; la musique, la littérature et
le cinéma sont simplement absents. Rien n'a échoué en aval — l'assignation était
déjà incomplète.

::: exam-tip
Quand chaque subagent a fait ce qu'on lui demandait et que le rapport final rate
encore des pans entiers du sujet, le défaut est la **décomposition du
coordinateur**, pas un spoke. Les distracteurs incrimineront un composant réel —
requêtes de recherche trop étroites, absence de détection de lacunes dans la
synthèse, critères de pertinence trop stricts dans l'analyse — et ils séduisent
parce qu'ils nomment quelque chose qui existe. L'énoncé vous a déjà dit que
chaque agent avait correctement exécuté son assignation. Ce qui a été mal fait,
c'est l'assignation.
:::

::: anti-pattern
Laisser un subagent passer sa sortie directement à un autre pour économiser un
saut. Cela paraît efficace et cela casse les trois raisons d'être du hub : plus
aucun endroit ne voit l'exécution entière, le traitement d'erreur cesse d'être
uniforme, et personne ne contrôle ce que le second agent a réellement reçu.

Router chaque requête à travers tout le pipeline est l'erreur symétrique : le
coordinateur est censé *analyser la requête* et n'invoquer que les subagents
nécessaires.
:::

### Les erreurs passent aussi par le hub

Les erreurs voyagent de la même façon. Le pattern attendu est la **récupération
locale d'abord** : le subagent traite lui-même les échecs transitoires et ne
propage au coordinateur que ce qu'il ne peut pas résoudre, accompagné de ses
résultats partiels et de ce qu'il a déjà tenté. Le coordinateur continue avec des
résultats partiels et annote la sortie finale de ce qui est resté non couvert.
**La forme de ces réponses d'erreur — catégories, caractère réessayable, échec
métier contre échec de permission — relève de la conception des erreurs
structurées, développée en D2.2.**

**À tester** — les questions de la banque étiquetées `data-task="1.2"`.

## 1.3 — Configure subagent invocation, context passing, and spawning
<!-- ts:1.3 | src:08agentsdk L2 (parallel spawning: several calls emitted in one response, not one per turn), L4 (the receives/does-not-receive table, what it implies for context passing and attribution metadata), L5 (AgentDefinition fields, the tool-restriction table, Agent in allowedTools for auto-approval), L13 (default permission mode: without a canUseTool callback an unapproved call is refused), L15 §1 (the Task → Agent rename, and what the exam expects) ; 03subagents L2 (the config fields), L3 (the description's double role, output format as a stopping point, limiting tool access) ; exam guide TS 1.3 -->
<!-- owns:subagent-isolation -->

Le mécanisme est un outil. Un coordinateur lance un subagent en appelant
l'**outil `Task`**, et son `allowedTools` doit inclure `"Task"` pour que ces
invocations soient auto-approuvées. Omettez-le et l'appel retombe dans le flux de
permission : en mode par défaut, sans callback `canUseTool` pour y répondre, il
est refusé. Le coordinateur ne délègue pas, quoi que dise son prompt.

::: exam-tip
Les versions récentes du SDK ont renommé cet outil de `Task` en `Agent`, et le
code actuel émet `Agent` dans les blocs `tool_use`. Le guide d'examen v1.0 dit
encore `Task`, et pose l'inclusion de `"Task"` dans `allowedTools` comme
l'exigence. À l'examen, `Task` est la réponse attendue. En vrai code, écrivez
`Agent` et testez les deux noms quand vous détectez une invocation.
:::

### Ce qui franchit la frontière, et ce qui ne la franchit pas

Ce qu'un subagent reçoit, et ce qu'il ne reçoit pas, est le fait le plus testé de
ce domaine :

| Le subagent reçoit | Le subagent ne reçoit pas |
|---|---|
| Son propre system prompt, issu de sa définition d'agent | L'historique de conversation du parent et ses résultats d'outils |
| La chaîne de prompt de l'appel qui le lance | Le system prompt du parent |
| Ses définitions d'outils — héritées, ou le sous-ensemble qu'on lui a donné | Le moindre souvenir d'une invocation précédente de lui-même |

La conséquence est décisive : **le seul contenu qui passe du parent au subagent
est la chaîne de prompt de l'appel qui le lance.** Chemins de fichiers, messages
d'erreur, résultats de recherche antérieurs, décisions déjà prises — s'ils ne
sont pas dans cette chaîne, le subagent ne les a pas.

```text
Mauvais  Task: « Analyse le document. »
         → quel document ? aucun résultat antérieur, aucun format de sortie attendu.

Bon      Task: « Analyse le document ci-dessous et renvoie le tableau des clauses.
              DOCUMENT (source: vendor-contract-2026.pdf, pages 4-9) :
                <texte intégral>
              RÉSULTATS ANTÉRIEURS (du subagent de recherche) :
                - claim: 'net-45 payment terms'
                  source_url: https://…  retrieved: 2026-08-14
              FORMAT DE SORTIE : une ligne par clause — clause_type, text, page. »
```

Notez ce que la bonne version fait au-delà d'être longue. Elle emploie un
**format structuré qui sépare le contenu des métadonnées** — URL source, nom du
document, numéro de page, date de collecte vivent dans leurs propres champs, pas
fondus dans la prose. C'est ce qui préserve l'attribution jusqu'au rapport final,
et le guide le nomme parmi les skills de ce task statement.

### Parallélisme : une réponse, plusieurs appels

Le parallélisme vient d'**une réponse, plusieurs appels**. Un coordinateur qui
émet trois appels `Task` dans une seule réponse obtient trois subagents qui
tournent en même temps ; les mêmes trois appels répartis sur trois tours
consécutifs s'exécutent l'un après l'autre. C'est le même mécanisme que les
appels d'outils parallèles de 1.1 — plusieurs blocs `tool_use` dans un même
message assistant — appliqué à l'outil `Task`.

```python
agents = {
    "code-reviewer": AgentDefinition(
        description="Spécialiste de la revue de code. À utiliser pour la "
                    "qualité, la sécurité et la maintenabilité. Indique à "
                    "l'agent précisément quels fichiers relire.",
        prompt="Tu es un spécialiste de la revue de code…\n"
               "Rends : 1. Résumé  2. Problèmes critiques  3. Problèmes majeurs  "
               "4. Problèmes mineurs  5. Verdict  6. Obstacles rencontrés",
        tools=["Read", "Grep", "Glob"],
        model="sonnet",
    ),
}
```

### Les quatre champs d'une définition de subagent

Quatre champs, quatre décisions :

| Champ | Obligatoire | Ce qu'il décide |
|---|---|---|
| `description` | oui | Quand le coordinateur lance ce subagent — **et** ce qu'il écrit dans le prompt de délégation |
| `prompt` | oui | Le system prompt du subagent : son rôle, sa méthode, son format de sortie |
| `tools` | non | Les outils qu'il peut utiliser ; omis, il hérite de tout ce qui est disponible aux subagents |
| `model` | non | `opus`, `sonnet`, `haiku`, `inherit`, ou un identifiant de modèle complet |

La `description` a ce double rôle, et il est facile de le manquer. Le nom et la
description de chaque subagent disponible sont placés dans le system prompt de
l'agent principal : ils décident donc *quand* la délégation a lieu ; l'agent
principal se sert ensuite de la description comme guide pour rédiger le prompt
d'entrée, si bien qu'elle façonne aussi *ce qu'on dit au subagent de faire*. Une
description qui dit « vous devez indiquer à l'agent précisément quels fichiers
relire » produit des prompts de délégation qui listent des fichiers. Une
description vague produit des délégations vagues.

Deux autres leviers de conception. Le premier vient du cours Subagents ; le
second est le quatrième skill que le guide liste sous ce task statement :

- **Définissez un format de sortie dans le system prompt.** Il donne au subagent
  une liste à remplir, donc il sait quand il a fini ; sans lui, les subagents
  peinent à décider quand la recherche a assez duré et tournent bien plus longtemps
  que nécessaire. Une section « Obstacles rencontrés » vaut d'être ajoutée exprès :
  les contournements et bizarreries d'environnement découverts par le subagent
  meurent sinon avec son contexte, et le thread principal doit les redécouvrir.

- **Rédigez les prompts de coordinateur en objectifs et critères de qualité, pas en
  procédures.** « Le rapport doit couvrir au moins cinq secteurs avec des sources
  datées » laisse le subagent libre de s'adapter ; un script pas-à-pas non.


### Restreindre les outils d'un subagent

Les restrictions d'outils relèvent aussi d'ici — le guide les liste parmi les
connaissances de ce task statement. Un subagent de recherche en lecture seule
reçoit `Read`, `Grep`, `Glob` ; un relecteur y ajoute `Bash` pour lancer
`git diff` ; seul un agent dont le métier est de modifier du code reçoit `Edit`
et `Write`. Un outil que vous laissez de côté n'est pas du tout dans la session
du subagent : ni prompt de permission, ni erreur, l'agent travaille simplement
sans. **Pourquoi une grande surface d'outils dégrade la fiabilité de sélection,
et comment répartir les outils entre agents, relève de la distribution des
outils, développée en D2.3.**

::: anti-pattern
Trois gestes qui ressemblent à des correctifs et n'en sont pas :

- **Agrandir la fenêtre de contexte du subagent** quand il a rendu une réponse
  maigre. On ne lui a rien transmis ; la taille d'une fenêtre vide n'y change rien.
- **Lancer sur des tours successifs** en appelant cela du parallélisme. Des tours
  consécutifs, c'est de l'exécution séquentielle avec des allers-retours en plus.
- **Compter sur l'héritage** — « le subagent verra ce que le coordinateur a
  trouvé ». L'isolation est la propriété qui définit un subagent, pas une
  limitation à contourner.
:::

**Forker une session pour donner à deux subagents une base d'analyse commune
relève de la gestion des sessions, développée en 1.7 ci-dessous.** **Définir des
subagents comme fichiers markdown sous `.claude/agents/`, et la commande
`/agents` qui les crée, relève de la configuration Claude Code, développée au
domaine 3.**

**À tester** — les questions de la banque étiquetées `data-task="1.3"`.

## 1.4 — Implement multi-step workflows with enforcement and handoff patterns
<!-- ts:1.4 | src:08agentsdk L10 (why a hook rather than an instruction, the get_customer / process_refund gate), L14 (structured human handoff, decomposing a multi-concern request) ; exam guide TS 1.4 -->

Certains ordonnancements doivent tenir à chaque fois. Vérifier l'identité du
client avant de traiter un remboursement ; contrôler les interactions
médicamenteuses avant de délivrer. Vous pouvez l'écrire dans le system prompt —
et une instruction de prompt est une demande que le modèle honore généralement.
La formulation du guide est nette : **quand une conformité déterministe est
requise, les instructions de prompt seules ont un taux d'échec non nul.** Sur des
milliers d'interactions, ce reliquat, ce sont des remboursements versés au
mauvais client.

### Le gate de prérequis

Le **programmatic enforcement** referme cet écart en rendant la violation
impossible par le code plutôt qu'improbable par la prose. Sa forme concrète est
un **prerequisite gate** : un appel d'outil en aval est bloqué tant qu'une étape
amont n'a pas retourné.

```python
async def require_verified_customer(input_data, tool_use_id, context):
    if input_data["tool_name"] != "process_refund":
        return {}
    if not session_state.get("verified_customer_id"):
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason":
                "Appelez d'abord get_customer : process_refund exige un ID "
                "client vérifié pour cette session.",
        }}
    return {}
```

`process_refund` ne peut pas s'exécuter tant que `get_customer` n'a pas retourné
un identifiant vérifié. Pas « a peu de chances de » — ne peut pas. La chaîne de
raison compte autant que le blocage : le modèle la lit, donc il réessaie la bonne
chose au lieu de réessayer à l'aveugle. **L'API des hooks elle-même — événements,
matchers, champs de décision — est en TS 1.5, ci-dessous.**

### La demande à plusieurs objets

Un second pattern de ce task statement est la **demande multi-sujets**. Un client
écrit : « Je veux un remboursement sur la commande #1234 *et* l'adresse de
livraison a changé sur la commande #5678. » Traiter cela séquentiellement et
répondre en deux blocs déconnectés est l'échec. Le geste attendu : décomposer en
items distincts, investiguer chacun en parallèle sur le contexte client
*partagé*, puis synthétiser une résolution unifiée.

### Le handoff structuré

Le troisième est le **structured handoff**. Quand l'agent escalade en cours de
traitement, l'humain qui reprend n'a pas accès au transcript de la conversation.
Le résumé doit donc se tenir seul :

```json
{
  "customer_id": "CUST-12345",
  "order_id": "ORD-67890",
  "issue_summary": "Demande de remboursement pour article endommagé",
  "root_cause": "Article arrivé endommagé ; photos jointes",
  "actions_taken": [
    "Identité vérifiée via get_customer",
    "Commande confirmée via lookup_order",
    "Remplacement proposé — le client insiste pour un remboursement"
  ],
  "refund_amount": "$89.99",
  "recommended_action": "Approuver le remboursement intégral",
  "escalation_reason": "Le client a demandé à parler à un responsable"
}
```

Identité du client, cause racine, montant, action recommandée : les quatre que le
guide nomme. Un handoff qui suppose que l'humain lira la conversation est un
handoff raté.

::: anti-pattern
Les distracteurs des questions d'enforcement sont les mesures qui font réellement
baisser le taux d'échec sans jamais atteindre zéro :

- Renforcer le system prompt — « la vérification est obligatoire ».
- Ajouter des few-shot examples montrant l'outil de vérification appelé en premier.
- Auditer les transactions après coup pour repérer les violations.
- Déployer un classifieur de routage qui n'active que le sous-ensemble d'outils
  pertinent.

Les trois premiers font baisser le taux ; la question demandait une garantie, et
un audit trouve la violation une fois l'argent parti. Le quatrième traite les
outils *disponibles*, pas l'ordre dans lequel ils sont appelés — un autre problème.
:::

::: exam-tip
La règle à emporter : **conséquences financières, légales ou de sécurité →
programmatic enforcement.** Préférences, ton et mise en forme → instructions de
prompt. Si l'énoncé contient le mot « garantie », ou décrit une action
irréversible, aucune dose de prompt engineering n'est la réponse.
:::

**Quand escalader — les critères, le respect d'une préférence explicite du
client, la détection d'un trou dans la politique — relève de la décision
d'escalade, développée en D5.2.**

**À tester** — les questions de la banque étiquetées `data-task="1.4"`.

## 1.5 — Apply Agent SDK hooks for tool call interception and data normalization
<!-- ts:1.5 | src:08agentsdk L9 (what a hook is, the event table, matchers, callback outputs, deny > defer > ask > allow), L10 (PreToolUse: permissionDecision, permissionDecisionReason, updatedInput), L11 (PostToolUse: updatedToolOutput and additionalContext, the heterogeneous-format case) ; exam guide TS 1.5 -->
<!-- owns:hooks -->

Un **hook** est une fonction de rappel à vous que le SDK exécute quand un
événement de l'agent se déclenche. Elle tourne dans le process de votre
application, pas dans la fenêtre de contexte de l'agent — elle ne coûte donc
aucun token, et c'est du code ordinaire avec des garanties ordinaires.

Deux événements portent ce task statement :

| Événement | Se déclenche | Peut-il encore changer l'issue ? |
|---|---|---|
| `PreToolUse` | Un appel d'outil est demandé, avant qu'il ne s'exécute | Oui — autoriser, refuser, ou réécrire l'entrée |
| `PostToolUse` | L'outil a retourné, avant que le modèle ne lise le résultat | L'appel a déjà eu lieu ; vous pouvez remplacer ce que le modèle lit |

### `PreToolUse` — rendre une action impossible

`PreToolUse` est le primitif d'application de règles. Son callback retourne un
`hookSpecificOutput` portant `permissionDecision` (`"allow"`, `"deny"`, `"ask"`,
`"defer"`), un `permissionDecisionReason` que le modèle lit, et éventuellement
`updatedInput` pour réécrire l'appel plutôt que le refuser.

```python
async def cap_refunds(input_data, tool_use_id, context):
    if input_data["tool_name"] != "process_refund":
        return {}
    if input_data["tool_input"].get("amount", 0) > 500:
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason":
                "Un remboursement au-dessus de 500 $ exige un validateur "
                "humain. Appelez escalate_to_human avec le résumé du dossier.",
        }}
    return {}
```

Le blocage est la moitié du travail ; la raison redirige l'agent vers le workflow
alternatif au lieu de le laisser deviner. Quand plusieurs hooks et règles de
permission divergent, le SDK tranche par priorité — `deny` l'emporte sur `defer`,
qui l'emporte sur `ask`, qui l'emporte sur `allow` — donc un seul `deny` suffit.

### `PostToolUse` — changer ce que le modèle lit

`PostToolUse` est le primitif de normalisation. Son champ `updatedToolOutput`
remplace la sortie de l'outil avant que Claude ne la voie ; `additionalContext`
la complète sans la remplacer.

```python
async def normalize_dates(input_data, tool_use_id, context):
    if input_data["tool_name"] not in ORDER_TOOLS:
        return {}
    raw = json.loads(input_data["tool_response"]["content"])
    return {"hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "updatedToolOutput": json.dumps({
            **raw,
            "shipped_at": to_iso8601(raw["shipped_at"]),   # 1743800400 → "2025-04-04"
            "status": STATUS_NAMES[raw["status"]],          # 2 → "shipped"
        }),
    }}
```

C'est le cas du guide, littéralement : plusieurs outils MCP renvoient des dates
en timestamps Unix, d'autres en ISO 8601, des statuts en codes numériques. Les
faire correspondre est une table fixe, pas un jugement — cela relève donc d'un
code qui tourne sur chaque résultat, pas d'un prompt qui demande au modèle de
composer avec trois formats.

::: key-concept
Le choix entre un hook et une instruction de prompt est le même qu'en 1.4, un
niveau plus bas :

| | Hook | Instruction de prompt |
|---|---|---|
| Garantie | Déterministe — c'est du code qui s'exécute | Probabiliste — aucune garantie |
| À utiliser pour | Règles métier, plafonds financiers et réglementaires | Préférences, ton, mise en forme |
| Exemple | Bloquer les remboursements au-dessus de 500 $ | « Essaie de résoudre le problème avant d'escalader » |
:::

::: anti-pattern
Recourir à `PostToolUse` pour empêcher quelque chose. Il se déclenche après
l'exécution de l'outil — le remboursement est versé, les lignes sont supprimées.
Bloquer, c'est `PreToolUse`.

L'erreur miroir est un blocage `PreToolUse` employé pour corriger un problème de
*lecture*. Si un outil renvoie un champ surchargé que le modèle interprète mal,
bloquer l'appel en aval supprime aussi les appels corrects ; le correctif est de
réécrire le résultat au retour, pour que l'ambiguïté n'atteigne jamais le modèle.
:::

::: exam-tip
Deux questions séparent proprement les deux hooks. *Faut-il que quelque chose
n'arrive pas ?* → `PreToolUse`. *Faut-il que le modèle lise autre chose que ce
que l'outil a retourné ?* → `PostToolUse`. Les distracteurs placeront le bon
mécanisme au mauvais endroit de la boucle.
:::

**Les hooks de Claude Code au niveau configuration, déclarés dans les settings
plutôt que dans du code SDK, sont développés au domaine 3.**

**À tester** — les questions de la banque étiquetées `data-task="1.5"`.

## 1.6 — Design task decomposition strategies for complex workflows
<!-- ts:1.6 | src:08agentsdk L14 (fixed pipeline versus dynamic decomposition, predictability as the criterion, the per-file plus cross-file review, the legacy-test-coverage example) ; exam guide TS 1.6 -->
<!-- owns:task-decomposition -->

Toutes les tâches ne se découpent pas de la même façon, et se tromper de régime
coûte soit de la rigidité, soit du chaos. Il y en a deux.

**Pipeline séquentiel fixe — prompt chaining.** Chaque étape est décidée à
l'avance et s'exécute dans l'ordre. À utiliser quand la structure de la tâche est
prévisible, que toutes les étapes sont connues et que vous voulez des résultats
stables et comparables d'une exécution à l'autre.

**Décomposition dynamique adaptative.** Les sous-tâches émergent de ce que
l'étape précédente a trouvé. À utiliser pour l'investigation ouverte, quand le
périmètre est inconnu au départ.

::: key-concept
Le critère est la **prévisibilité, pas la taille**. Une pull request de douze
fichiers a un ensemble de cibles connu et énumérable : pipeline fixe. Un bug d'un
seul fichier dont on ignore l'origine, non.
:::

### Les deux exemples du guide

L'exemple de prompt chaining du guide lui-même est la revue de code
multi-aspects. Une passe unique sur un gros diff produit une sortie inégale :
commentaires détaillés sur certains fichiers, superficiels sur d'autres, et
contradictions entre eux. Découpez :

```text
Passe 1 — par fichier, une analyse ciblée chacun
          → bugs locaux, problèmes de qualité, vulnérabilités
Passe 2 — une passe d'intégration inter-fichiers sur les résultats de la passe 1
          → types incohérents, dépendances circulaires, flux de données cassés

Découper ainsi est ce qui évite la dilution de l'attention sur une grosse revue.
```

L'exemple de décomposition adaptative du guide est « ajouter une couverture de
tests complète à un codebase legacy ». Vous ne pouvez pas lister les sous-tâches
d'avance, parce qu'elles sont précisément ce que vous allez découvrir :

```text
1. Cartographier la structure         (Glob, Grep)
2. Découverte : 3 modules sans tests, 2 partiellement couverts
3. Prioriser par impact               → le module de paiements d'abord (risque élevé)
4. Surprise : une dépendance vers une API externe non mockée
5. Adapter le plan                    → construire le mock, puis écrire les tests
```

Cartographier la structure, identifier les zones à fort impact, produire un plan
priorisé qui s'adapte à mesure que les dépendances apparaissent — c'est la
formulation du guide, et l'étape 4 est tout l'enjeu : le plan a changé à cause de
ce que l'étape 1 a trouvé.

::: anti-pattern
Trois mauvais appariements, et ce sont exactement les distracteurs :

- Un **pipeline fixe sur un périmètre inconnu** — il exige la liste des étapes
  avant de commencer, ce qui est précisément ce dont vous ne disposez pas.
- Une **revue multi-passes proposée pour une investigation ouverte** — elle est
  conçue pour un ensemble de cibles borné et énumérable, comme les fichiers d'une PR.
- Un **prompt exhaustif unique** censé tout couvrir d'un coup — il suppose que
  vous connaissez déjà le périmètre.

Et le quatrième, plus discret : la décomposition adaptative sur des cibles
figées. Elle n'apporte rien dès lors que les cibles ne varient jamais, et elle
rend les exécutions successives plus difficiles à comparer.
:::

::: exam-tip
Lisez l'énoncé pour une seule chose : **la liste des cibles est-elle connaissable
avant le premier appel ?** Oui → prompt chaining. Non → décomposition dynamique.
Des formules comme « les mêmes six adaptateurs, chaque trimestre » pointent d'un
côté ; « personne ne sait combien d'étages il comporte » pointe de l'autre.
:::

**À tester** — les questions de la banque étiquetées `data-task="1.6"`.

## 1.7 — Manage session state, resumption, and forking
<!-- ts:1.7 | src:08agentsdk L8 (what a session is, continue vs resume vs fork, capturing the session id, when to resume and when to start fresh), L15 §2 (fork combines with resume and branches history, not the filesystem), §3 (named resumption in the guide versus session ids in the SDK) ; exam guide TS 1.7 -->

Une **session** est l'historique de conversation que le SDK accumule pendant le
travail de l'agent — votre prompt, chaque appel d'outil, chaque résultat, chaque
réponse — écrit sur disque automatiquement. Les longues investigations s'étalent
sur plusieurs sessions de travail, et entre-temps les fichiers changent et les
résultats d'outils enregistrés se périment.

Trois opérations, trois métiers différents :

| Opération | Ce qu'elle fait |
|---|---|
| `--resume <session-name>` | Continue une conversation antérieure précise, par son nom |
| `fork_session` | Crée une branche indépendante à partir de l'historique d'une session existante ; l'originale reste intacte et le fork obtient son propre id |
| Session neuve + résumé injecté | Démarre à vide et reçoit, dans le prompt, un résumé structuré de ce qui tient encore |

```python
# Forker la base d'analyse pour explorer une seconde approche.
async for message in query(
    prompt="Plutôt que Redux, décris comment la Context API fonctionnerait ici",
    options=ClaudeAgentOptions(
        resume=session_id,      # un fork branche toujours une session existante
        fork_session=True,
        max_turns=5,
    ),
):
    if isinstance(message, ResultMessage):
        forked_id = message.session_id     # distinct de session_id
```

### Deux faits sur le fork

Deux faits sur le fork sur lesquels les questions se jouent. Il se combine
toujours à la reprise — on forke *une session existante*, jamais à partir de
rien. Et il branche l'**historique de conversation, pas le système de fichiers** :
deux agents forkés qui modifient des fichiers dans le même répertoire modifient
les mêmes fichiers.

### Choisir entre les trois

Choisir entre les trois est la compétence que le guide teste :

| Situation | Choix |
|---|---|
| Le contexte antérieur est encore valide, fichiers inchangés | `--resume` |
| Quelques fichiers précis ont changé, le reste tient encore | `--resume`, en **nommant les fichiers modifiés** pour que l'agent les ré-analyse plutôt que de tout ré-explorer |
| Les résultats d'outils sont périmés — fichiers modifiés largement ou de façon incertaine | Session neuve, amorcée par un résumé structuré |
| Comparer deux approches depuis une base d'analyse commune | `fork_session` |

La troisième ligne est le jugement du guide lui-même, et il est assez
contre-intuitif pour être testé : **démarrer une session neuve avec un résumé
structuré est plus fiable que reprendre avec des résultats d'outils périmés.**
Une session reprise transporte des réponses enregistrées qui décrivent un système
qui n'existe plus, et l'agent raisonne dessus comme si elles étaient à jour. Un
résumé écrit emporte les conclusions qui ont survécu et laisse derrière les
payloads morts.

::: anti-pattern
Trois gestes que les distracteurs proposent à la place des trois réponses ci-dessus :

- **Reprendre sans dire ce qui a changé.** L'agent garde une image fausse des
  fichiers et raisonne sur des résultats d'outils morts — précisément l'échec que
  la reprise devait éviter.
- **Tout ré-explorer de zéro** alors que seuls trois fichiers ont bougé. C'est
  jeter du travail encore valide.
- **Forker pour comparer une ancienne et une nouvelle version d'un fichier.** Un
  fork explore des *approches* divergentes depuis une base commune ; il ne
  réconcilie pas un état disque.
:::

::: exam-tip
Trois situations, trois réponses, et les distracteurs les permutent. Contexte
majoritairement valide → `--resume` accompagné de la liste des fichiers modifiés.
Résultats d'outils largement périmés → session neuve avec un résumé injecté. Deux
approches à comparer → `fork_session`. Notez aussi que le guide écrit `--resume
<session-name>` alors que le SDK documente `resume` prenant un session ID ; c'est
le concept — reprendre une investigation *nommée* à travers plusieurs sessions de
travail — qui est testé, pas la syntaxe.
:::

**À tester** — les questions de la banque étiquetées `data-task="1.7"`.
