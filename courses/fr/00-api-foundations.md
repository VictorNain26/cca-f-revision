# D0 — Fondamentaux de l'API

<!-- src:05claudeapi L3, L5, L6, L8, L34-L38 ; exam guide appendix (Claude API, Context window management) -->

Voici les prérequis que le guide d'examen suppose acquis. Rien ici n'est un task
statement à part entière : le guide teste ce que vous *construisez* par-dessus.
À lire une fois, puis passer à D1.

Chaque section s'arrête là où commence un task statement. Quand une notion
appartient à un autre domaine, vous en avez la définition en une phrase et un
renvoi, jamais un lien nu.

Le guide décide aussi de ce qui n'est *pas* ici. Son hors-périmètre écarte
l'architecture interne de Claude, les spécificités de la tokenisation, les
modèles d'embedding, le streaming et l'authentification à l'API — le cycle de vie
d'une requête s'arrête donc à la forme de l'appel et n'entre jamais dans le
modèle. Ce que le guide laisse de côté, le corpus le consigne avec son motif
dans `courses/out-of-scope.md`.

## Anatomie d'une requête Messages API
<!-- src:05claudeapi L3, L5 ; exam guide appendix (Claude API — max_tokens, system prompts) -->
<!-- owns:messages-api -->

Un seul appel porte tout : `client.messages.create()`. Il n'y a pas de session à
ouvrir ni quoi que ce soit à fermer.

| Champ | Obligatoire | Rôle |
|---|---|---|
| `model` | oui | Le modèle Claude qui répond à la requête |
| `messages` | oui | L'historique de conversation que vous envoyez, du plus ancien au plus récent |
| `max_tokens` | oui | Plafond du nombre de tokens que la réponse peut contenir |
| `system` | non | Instructions permanentes, hors de la conversation |
| `tools` | non | Les schémas des outils que le modèle peut appeler — conçus en D2.1 |
| `tool_choice` | non | Décide si le modèle peut répondre en prose ou doit appeler un outil — développé en D4.3 |
| `temperature` | non | Le degré d'aléatoire dans la sélection des tokens, de 0 à 1 |

Deux d'entre eux sont assez souvent mal compris pour mériter d'être énoncés clairement.

`max_tokens` est une limite de sécurité, pas une cible. Réglez-le à 1000 et
Claude s'arrête après 1000 tokens même s'il avait encore quelque chose à dire ;
il ne cherche jamais à atteindre ce nombre. Il borne la sortie, pas la requête
que vous envoyez.

`system` est un voisin de `messages`, pas l'un d'eux. Tous les autres champs de
cette liste sont des voisins aussi : `tools` et `tool_choice` se placent au
premier niveau du corps de la requête, jamais à l'intérieur d'un message.

```json
{
  "model": "claude-sonnet-5",
  "max_tokens": 1024,
  "system": "Tu es un assistant spécialisé en analyse financière. Réponds de manière concise.",
  "messages": [
    { "role": "user", "content": "Quel est le chiffre d'affaires de l'entreprise X au T3 ?" }
  ]
}
```

::: key-concept
`system` se place à côté de `messages`, jamais dedans. Glisser les instructions
permanentes en premier message `user` est l'erreur de forme la plus courante sur
ce point d'entrée, et elle change le poids que le modèle leur accorde.
:::

Les identifiants exacts de modèles ne sont pas matière d'examen. `temperature`
non plus — le guide ne la nomme jamais et aucun task statement n'en dépend ; la
ligne est là pour que vous reconnaissiez le champ dans un corps de requête qu'on
vous présente, pas pour l'apprendre par cœur.

**À tester** — les questions d'auto-évaluation de cette page.

## Rôles, tours de parole et API sans état
<!-- src:05claudeapi L5, L6 ; exam guide TS 1.1, TS 1.3 -->
<!-- owns:message-roles -->

`messages` est une liste de dictionnaires, chacun avec un `role` et un `content`.
Il y a deux rôles :

| Rôle | Qui l'écrit |
|---|---|
| `user` | Vous — ce que vous envoyez à Claude |
| `assistant` | Claude — ce qu'il a généré |

Une conversation alterne entre les deux : tour user, tour assistant, tour user.

**L'API ne stocke rien.** Chaque requête est indépendante et ne garde aucune
mémoire des précédentes. Demandez « Qu'est-ce que l'informatique quantique ? »,
obtenez une réponse, puis envoyez « Écris une autre phrase » sans rien d'autre :
le modèle n'a aucune idée de ce qu'on lui demande de prolonger — il écrira une
phrase sur tout autre chose.

La conversation multi-tours est donc un travail que vous faites, pas un service
que l'API rend : envoyer le premier message user, ajouter la réponse de Claude à
votre liste comme message `assistant`, ajouter la relance comme message `user`,
et renvoyer la liste entière.

```json
"messages": [
  { "role": "user",      "content": "Définis l'informatique quantique en une phrase" },
  { "role": "assistant", "content": "L'informatique quantique exploite des états quantiques pour traiter l'information." },
  { "role": "user",      "content": "Écris une autre phrase" }
]
```

C'est uniquement parce que les deux premiers tours sont encore dans le tableau
que « Écris une autre phrase » veut dire quelque chose au troisième.

::: exam-tip
Tout ce qui doit encore être visible au cinquième tour doit se trouver dans le
tableau que vous envoyez au cinquième tour. C'est la règle derrière la plupart
des bugs « le modèle a oublié », et elle vaut pour les résultats d'outils
exactement comme pour le texte. C'est la même règle qui impose de passer
explicitement son contexte à un subagent lancé — il n'hérite de rien.
:::

::: anti-pattern
N'envoyer que le dernier message en s'attendant à ce que les tours précédents
soient encore là. Rien n'expire côté serveur, parce que rien n'y est stocké ;
reconstruire l'historique est le travail de l'appelant, à chaque requête.
:::

**À tester** — les questions de la banque étiquetées `data-task="1.3"`.

## Les blocs de contenu
<!-- src:05claudeapi L35, L36, L38 ; exam guide TS 1.1 (tool results appended to history) -->
<!-- owns:content-blocks -->

Le `content` d'une réponse n'est jamais une simple chaîne — c'est une **liste de
blocs**, chacun avec son type. Lire une réponse comme du texte ne marche que
parce que vous avez indexé cette liste : `message.content[0].text` est le texte
du premier bloc, pas celui du message. Les deux sens ne sont pas symétriques :
une requête accepte l'une ou l'autre forme, une chaîne simple ou une liste de
blocs.

| Type de bloc | Sens | Contenu |
|---|---|---|
| `text` | dans les deux sens | De la prose, à lire par l'utilisateur |
| `tool_use` | de l'assistant | Le nom de l'outil et les arguments choisis par le modèle |
| `tool_result` | de vous, dans un message `user` | La sortie de l'outil que vous avez exécuté |

Une seule réponse d'assistant porte couramment plusieurs blocs à la fois — un
bloc texte qui explique ce que le modèle s'apprête à faire, plus un bloc
`tool_use` qui le demande. Un bloc `tool_result` porte trois champs :
`tool_use_id`, qui correspond à l'id du bloc `tool_use` auquel il répond ;
`content`, la sortie de la fonction sérialisée en chaîne ; et `is_error`, un
booléen. Il repart dans un message `user`, accompagné de l'historique complet.

```json
{ "role": "assistant", "content": [
    { "type": "text", "text": "Je consulte la commande." },
    { "type": "tool_use", "id": "toolu_01X", "name": "lookup_order",
      "input": { "order_id": "ORD-67890" } }
]},
{ "role": "user", "content": [
    { "type": "tool_result", "tool_use_id": "toolu_01X",
      "content": "{ \"status\": \"shipped\", \"total\": 42.90 }",
      "is_error": false }
]}
```

Entre ces deux messages, c'est **votre code** qui a exécuté `lookup_order`. Le
modèle n'exécute jamais rien ; il émet une demande structurée et attend.

::: anti-pattern
N'ajouter que le texte affiché et laisser tomber le bloc `tool_use`. C'est
l'appariement avec `tool_result` dont dépend la requête suivante : l'historique
devient impossible à traiter. Ajoutez **tout** `response.content`, et gardez les
schémas d'outils d'origine sur la requête de suivi même si aucun autre appel
n'est attendu.
:::

Un outil se déclare en JSON Schema, en trois parties : `name`, `description` — ce
que fait l'outil, quand l'utiliser, ce qu'il retourne — et `input_schema` pour
les arguments. Voilà l'anatomie, et elle s'arrête là. **Savoir quelle formulation
fait choisir au modèle le bon outil parmi plusieurs voisins relève de la conception
d'outils, développée en D2.1** ; **se servir d'un schéma pour forcer une charge
utile conforme est la sortie structurée, développée en D4.3.**

**À tester** — les questions de la banque étiquetées `data-task="2.1"`.

## Le champ `stop_reason`
<!-- src:05claudeapi L3, L38 ; Anthropic docs, Stop reasons and fallback (seven values, stop_details null except refusal, pause_turn default limit of 10 iterations, model_context_window_exceeded beta header) ; exam guide TS 1.1 -->
<!-- owns:stop-reason -->

Quand le modèle s'arrête, la réponse dit pourquoi dans `stop_reason` — et c'est
ce champ, pas la présence d'un bloc texte, qui vous dit si une réponse est
terminée.

| Valeur | Ce qui a mis fin à la génération |
|---|---|
| `end_turn` | Le modèle est arrivé à une fin naturelle et n'avait rien à ajouter |
| `max_tokens` | Le budget de sortie que vous avez fixé s'est épuisé en cours de génération |
| `stop_sequence` | L'une de vos chaînes `stop_sequences` est apparue |
| `tool_use` | Le modèle appelle l'un de vos outils et attend que vous l'exécutiez |
| `pause_turn` | Une boucle d'outil serveur a atteint sa limite d'itérations, 10 par requête par défaut |
| `refusal` | Le modèle a refusé pour des raisons de politique de sécurité |
| `model_context_window_exceeded` | La réponse a rempli la fenêtre de contexte du modèle |

`stop_details` vaut `null` pour toutes les valeurs sauf `refusal`, où il porte la
catégorie de politique concernée. `model_context_window_exceeded` est la plus
récente : Sonnet 4.5 et les modèles plus récents la renvoient sans en-tête beta,
et les modèles antérieurs ont besoin de l'en-tête
`model-context-window-exceeded-2025-08-26` pour l'activer.

```json
{
  "id": "msg_01ABC",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Je consulte la commande." },
    { "type": "tool_use", "id": "toolu_01X", "name": "lookup_order",
      "input": { "order_id": "ORD-67890" } }
  ],
  "stop_reason": "tool_use",
  "stop_details": null
}
```

Cette réponse porte du texte *et* une demande d'outil — c'est précisément
pourquoi la présence de texte ne peut pas servir de signal de fin.

::: exam-tip
`end_turn` est la seule valeur qui signifie *terminé*. Une réponse avec
`stop_reason: "max_tokens"` porte un bloc texte comme n'importe quelle autre,
mais elle a été coupée en pleine phrase — un code d'affichage qui teste la
présence de texte au lieu de lire `stop_reason` présentera un brouillon tronqué
comme un texte fini. C'est le distracteur classique sur ce champ.
:::

Deux valeurs méritent d'être distinguées même si une seule paire est testée. Une
réponse qui attend **votre** outil dit toujours `tool_use`, et vous la poursuivez
en envoyant des blocs `tool_result`. `pause_turn` concerne un outil **serveur** à
court d'itérations, et vous la poursuivez en renvoyant le contenu de l'assistant
tel quel.

Le guide ne vous demande jamais que de distinguer `tool_use` de `end_turn` —
c'est cette paire qui pilote la boucle, et c'est tout ce que teste TS 1.1.
**Transformer cette vérification en boucle — appeler, inspecter `stop_reason`,
exécuter, ajouter, rappeler — est la boucle agentique, développée en D1.1.** D0
s'arrête à nommer le signal.

**À tester** — les questions de la banque étiquetées `data-task="1.1"`.

## Les system prompts
<!-- src:05claudeapi L8 ; exam guide appendix (Claude API — system prompts), TS 2.1 -->

Le paramètre `system` est une simple chaîne passée à côté de `messages`, et il se
place **hors** de la conversation : ce n'est pas un tour, il n'a pas de rôle, et
ce n'est pas quelque chose à quoi le modèle répond. Il façonne *comment* Claude
répond, pas *ce qu'*il répond.

Prenez l'exemple d'un tuteur de maths. Sans system prompt, « Comment résoudre
5x + 2 = 3 pour x ? » donne aussitôt une solution complète pas à pas — correcte,
et inutile pour enseigner. Avec :

```
Tu es un tuteur de maths patient.
Ne réponds pas directement aux questions de l'élève.
Guide-le vers la solution, étape par étape.
```

la même question revient en « Quelle serait selon toi une bonne première étape
pour isoler x ? ». Même modèle, même tour user ; c'est l'instruction permanente
qui a changé le comportement.

Voilà à quoi sert un system prompt : assigner un rôle, et le modèle répond comme
quelqu'un dans ce rôle le ferait ; énoncer des contraintes durables, et elles
tiennent à tous les tours sans être répétées. Elles tiennent parce que vous les
renvoyez à chaque requête, pas parce que l'API s'en souvient — et vous les payez
à chaque fois.

::: anti-pattern
Mettre le system prompt en premier message `user`. Il se lit alors comme du
contexte conversationnel plutôt que comme une instruction permanente, et il
entre en concurrence avec les tours qui l'entourent au lieu de les surplomber.
:::

::: exam-tip
Une instruction system porte plus loin que n'importe quelle formulation à
l'échelle d'un tour — assez loin pour qu'un seul mot-clé absolu prenne le pas sur
des descriptions d'outils par ailleurs bien écrites. « Vérifie toujours
l'identité du client » fera appeler l'outil le plus proche sémantiquement à chaque
tour. **Comment cette instruction prend le pas, et comment la formuler autrement,
est développé en D2.1.**
:::

Une note pratique : l'API n'accepte pas `system=None`, donc une fonction de chat
réutilisable ne doit ajouter la clé que si un prompt a réellement été fourni.

**À tester** — les questions de la banque étiquetées `data-task="2.1"`.

## La fenêtre de contexte
<!-- src:05claudeapi L6, L36 ; exam guide appendix (Context window management), TS 5.1 -->
<!-- owns:context-window -->

Mettez bout à bout les deux faits précédents. L'API ne garde aucun état, donc
chaque requête embarque l'historique entier ; et chaque requête a un budget de
tokens fini. L'historique n'est donc pas gratuit — c'est un coût récurrent qui
croît avec la conversation, de façon monotone, sauf si vous y faites quelque
chose.

Ce qui s'accumule, à chaque requête :

| Ce que vous renvoyez | Pourquoi c'est là |
|---|---|
| Le prompt `system` | Il tient d'un tour à l'autre parce que vous le renvoyez, pas parce qu'il est stocké |
| Chaque tour `user` et `assistant` passé | Rien n'est stocké côté serveur |
| Chaque bloc `tool_use` et `tool_result` | Les enlever casse l'appariement |
| Les schémas d'outils complets | Obligatoires à chaque requête, même quand aucun appel ne suit |

Les résultats d'outils sont la part qu'on sous-estime. Un outil qui retourne un
gros enregistrement met cet enregistrement dans l'historique pour tout le reste
de l'exécution, et vous le payez à chaque tour suivant — pas une seule fois.

```
lookup_order → 42 champs retournés, 5 utiles pour l'éligibilité au retour
  order_id, status, total, items, return_eligible          ← utiles
  warehouse_route, carrier_scac, pick_wave, audit_flags,
  promo_ledger, tax_jurisdiction, … (37 autres)            ← poids mort ici

3 commandes consultées = 126 champs renvoyés à chaque tour suivant, 15 le méritent.
```

Le guide nomme trois modes de défaillance d'une fenêtre pleine, et D0 va
exactement aussi loin que les nommer : **lost-in-the-middle**, où un élément
enfoui au milieu d'un long contexte passe inaperçu alors que le début et la fin
sont lus de façon fiable ; **l'accumulation**, la croissance montrée ci-dessus ;
et la **progressive summarization**, où comprimer l'historique pour faire de la
place sacrifie d'abord les nombres, les dates et les détails précis.

::: exam-tip
Reconnaissez ici les trois modes de défaillance ; les remèdes ne sont pas ceux de
D0. **Élaguer les sorties d'outils verbeuses, extraire des faits structurés et
ordonner l'entrée selon la position sont développés en D5.1.** Le retrieval et le
chunking ne sont pas la réponse attendue par le guide — il les met hors
périmètre, et ce corpus aussi.
:::

**À tester** — les questions de la banque étiquetées `data-task="5.1"`.
