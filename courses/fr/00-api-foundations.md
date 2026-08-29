# D0 — Fondamentaux de l'API

<!-- src:05claudeapi L2-14 and L30-42, building_claude_api module 1 -->

Voici les prérequis que le guide d'examen suppose acquis. Rien ici n'est un task
statement à part entière : le guide teste ce que vous *construisez* par-dessus.
À lire une fois, puis passer à D1.

Chaque section s'arrête là où commence un task statement. Quand une notion
appartient à un autre domaine, vous en avez la définition en une phrase et un
renvoi, jamais un lien nu.

## Anatomie d'une requête Messages API
<!-- src:05claudeapi L3, L5, L8, L10 ; building_claude_api module 1 -->
<!-- owns:messages-api -->

Une requête part de votre propre serveur, jamais du navigateur ni de
l'application mobile. La clé d'API authentifie la requête ; une clé livrée dans
du code client peut être extraite par n'importe qui et utilisée sur votre
compte. Le client parle donc à votre serveur, et votre serveur parle à l'API
Anthropic avec la clé gardée côté serveur.

L'aller-retour complet compte cinq étapes : le client vers votre serveur, votre
serveur vers l'API Anthropic, le traitement par le modèle, la réponse vers votre
serveur, la réponse vers le client. Votre serveur peut appeler l'API via un SDK
officiel — Python, TypeScript, JavaScript, Go, Ruby — ou en HTTP direct.

L'appel lui-même est `client.messages.create()`, et il porte ces champs :

| Champ | Requis | Rôle |
|---|---|---|
| `model` | oui | Le modèle Claude qui répond à la requête |
| `messages` | oui | L'historique de conversation que vous envoyez, du plus ancien au plus récent |
| `max_tokens` | oui | Plafond du nombre de tokens que la réponse peut contenir |
| `system` | non | Des instructions qui se tiennent en dehors de la conversation |
| `temperature` | non | La part d'aléatoire dans la sélection des tokens, de 0 à 1 |

Deux d'entre eux sont assez souvent mal lus pour mériter d'être énoncés
clairement.

`max_tokens` est une limite de sécurité, pas une cible. Fixez-le à 1000 et
Claude s'arrête après 1000 tokens même s'il avait encore à dire ; il ne cherche
jamais à l'atteindre. Il borne la sortie, pas la requête que vous envoyez.

`temperature` déplace la masse de probabilité entre les tokens candidats. Près
de 0, le modèle est quasi déterministe et prend presque toujours le token le
plus probable ; près de 1, les probabilités s'étalent et la sortie varie
davantage. Le cours regroupe les plages utiles ainsi : 0.0–0.3 pour les réponses
factuelles, l'aide au code, l'extraction de données et la modération ; 0.4–0.7
pour le résumé, le matériel pédagogique et la résolution de problèmes ; 0.8–1.0
pour le brainstorming, l'écriture créative et le texte marketing. La temperature
modifie les probabilités — elle ne garantit pas que deux appels diffèrent.

Entre la requête et la réponse, le modèle enchaîne quatre étapes internes : la
**tokenization** (l'entrée est découpée en tokens — mots, fragments de mots,
symboles), l'**embedding** (chaque token devient une liste de nombres couvrant
les sens qu'il peut prendre), la **contextualization** (chaque embedding est
ajusté par ses voisins pour que le bon sens l'emporte) et la **generation** (une
couche de sortie note chaque token suivant possible, l'un est tiré à partir des
probabilités et d'un aléa contrôlé, et tout le processus recommence pour le
token d'après).

L'objet de réponse porte le message généré, un décompte `usage` des tokens
d'entrée et de sortie, et un `stop_reason`.

**À tester** — les questions d'auto-évaluation de `D0_API_Fundamentals.html`.

## Les rôles et la forme d'un tour
<!-- src:05claudeapi L5, L6 ; building_claude_api module 1 -->
<!-- owns:message-roles -->

`messages` est une liste de dictionnaires, chacun avec un `role` et un
`content`. Il y a deux rôles :

| Rôle | Qui l'écrit |
|---|---|
| `user` | Vous — ce que vous envoyez à Claude |
| `assistant` | Claude — ce qu'il a généré, ou ce que vous préremplissez en son nom |

Une conversation alterne entre les deux : tour user, tour assistant, tour user.

**L'API ne stocke rien.** Chaque requête est indépendante et ne garde aucune
mémoire des précédentes. Demandez « Qu'est-ce que l'informatique quantique ? »,
obtenez une réponse, puis envoyez « Écris une phrase de plus » toute seule : le
modèle n'a aucune idée de ce qu'on lui demande de prolonger — il écrira une
phrase sur tout autre chose.

La conversation multi-tours est donc un travail que vous faites, pas un service
que l'API rend :

1. Envoyer le premier message user.

2. Ajouter la réponse de Claude à votre liste comme message `assistant`.

3. Ajouter la relance comme message `user`.

4. Renvoyer la liste entière.


Tout ce qui doit encore être visible au cinquième tour doit se trouver dans le
tableau que vous envoyez au cinquième tour. C'est la règle derrière la plupart
des bugs « le modèle a oublié », et elle vaut pour les tool results exactement
comme pour le texte.

Les messages assistant ne sont pas seulement la sortie de Claude. Vous pouvez en
ajouter un vous-même pour préremplir le début de la réponse : le modèle traite
ce texte comme quelque chose qu'il a déjà écrit et continue à partir du dernier
caractère. Le préfixe est le vôtre, pas celui du modèle : l'API ne renvoie que
ce qui vient après, si bien qu'un tour prérempli doit être reconcaténé au texte
généré pour être complet. Combiné aux `stop_sequences` — des chaînes qui mettent
fin à la génération dès qu'elles apparaissent, et qui ne figurent pas dans la
sortie — le prefill donne une sortie structurée propre. Demandez du JSON,
préremplissez le tour assistant avec le délimiteur ouvrant d'un bloc de code
JSON et fixez le délimiteur fermant comme stop sequence : ce qui revient est le
JSON seul, sans préambule et sans délimiteurs à retirer.

**À tester** — les questions de la banque marquées `data-task="1.3"`.

## Les blocs de contenu
<!-- src:05claudeapi L5, L12, L34, L35, L36, L37 ; building_claude_api module 3 -->
<!-- owns:content-blocks -->

Le `content` d'une réponse n'est jamais une simple chaîne — c'est une **liste de
blocs**, chacun avec son type. Lire une réponse comme du texte ne marche que
parce que vous avez lu cette liste par son index : `message.content[0].text` est
le texte du premier bloc, pas le message. Les deux sens ne sont pas
symétriques : une requête accepte l'une ou l'autre forme, une chaîne simple ou
une liste de blocs, et tous les exemples du cours source envoient une chaîne.

| Type de bloc | Sens | Contenu |
|---|---|---|
| `text` | dans les deux sens | De la prose, à lire par l'utilisateur |
| `tool_use` | de l'assistant | Le nom de l'outil et les arguments choisis par le modèle |
| `tool_result` | de vous, dans un message `user` | La sortie de l'outil que vous avez exécuté |

Une seule réponse assistant porte couramment plusieurs blocs à la fois — un bloc
`text` qui explique ce que le modèle s'apprête à faire, plus un bloc `tool_use`
qui le demande. D'où la règle, dans les conversations avec outils : ajouter
**tout** `response.content` à l'historique, pas seulement le texte que vous avez
affiché — laisser tomber le bloc `tool_use` casse l'appariement dont dépend la
requête suivante.

Un bloc `tool_result` porte trois champs : `tool_use_id`, qui reprend l'id du
bloc `tool_use` auquel il répond ; `content`, la sortie de la fonction
sérialisée en chaîne ; et `is_error`, un booléen. Il repart dans un message
`user`, aux côtés de l'historique complet — et les schémas d'outils d'origine
doivent toujours être déclarés sur cette requête, même si plus aucun appel n'est
attendu.

Les outils eux-mêmes sont déclarés en JSON Schema, un par outil, en trois
parties : `name`, l'identifiant ; `description`, ce que fait l'outil, quand
l'utiliser et ce qu'il retourne ; et `input_schema`, un JSON Schema pour les
arguments. Voilà l'anatomie. **Quelle formulation de description fait choisir au
modèle le bon outil parmi plusieurs outils voisins relève du tool design,
développé en D2.1** — une description d'une ligne, c'est ce qui rend deux outils
voisins indiscernables.

Un champ mérite d'être nommé ici parce qu'il apparaît dans les corps de requête
que vous serez amené à lire : `tool_choice` indique au modèle s'il peut répondre
en prose ou s'il doit appeler un outil. **Ses modes et ce que chacun interdit
sont développés en D4.3.**

**À tester** — les questions de la banque marquées `data-task="2.1"`.

## `stop_reason`
<!-- src:05claudeapi L3, L13, L38 (tool_use) ; building_claude_api modules 1 and 3 ; Anthropic docs, Handling stop reasons (values, stop_details, pause_turn default iteration limit of 10) ; exam guide TS 1.1 -->
<!-- owns:stop-reason -->

Après chaque token, le modèle vérifie s'il doit continuer. Quand il s'arrête, la
réponse dit pourquoi dans `stop_reason` — et c'est ce champ, pas la présence
d'un bloc `text`, qui vous dit si une réponse est terminée.

| Valeur | Ce qui a mis fin à la génération |
|---|---|
| `end_turn` | Le modèle est arrivé à une fin naturelle et n'avait plus rien à dire |
| `max_tokens` | Le budget de sortie que vous aviez fixé s'est épuisé en cours de génération |
| `stop_sequence` | Une de vos chaînes `stop_sequences` est apparue |
| `tool_use` | Le modèle appelle un outil et attend que vous l'exécutiez |
| `pause_turn` | Une boucle d'outil serveur a atteint sa limite d'itérations (10 par défaut) |
| `refusal` | Le modèle a refusé pour des raisons de politique de sécurité |
| `model_context_window_exceeded` | La réponse a rempli la context window |

`stop_details` vaut `null` pour toutes les valeurs sauf `refusal`, où il porte
la catégorie de politique. `model_context_window_exceeded` est la valeur
récente : elle existe à partir de Claude 4.5, là où les modèles antérieurs
renvoyaient une erreur de validation, et le comportement s'active explicitement
via la beta `model-context-window-exceeded-2025-08-26`.

La distinction qui compte en production : `end_turn` est la seule valeur qui
signifie *terminé*. Une réponse avec `stop_reason: "max_tokens"` porte un bloc
`text` comme n'importe quelle autre, mais elle a été coupée en pleine phrase —
un code d'affichage qui teste la présence de texte au lieu de lire `stop_reason`
présentera un brouillon tronqué comme un texte fini.

`tool_use` est la valeur sur laquelle un client agit plutôt qu'il ne l'affiche :
le modèle a demandé quelque chose, et le tour n'est pas fini tant que vous
n'avez pas exécuté l'outil et renvoyé le résultat. **Transformer cette
vérification en boucle — appeler, inspecter `stop_reason`, exécuter, ajouter à
l'historique, rappeler jusqu'à ce que la valeur ne soit plus `tool_use` — c'est
l'agentic loop, développée en D1.1.** D0 s'arrête à nommer le signal.

Où porter l'effort : le guide ne demande jamais que de distinguer `"tool_use"`
de `"end_turn"` — c'est cette paire qui pilote la boucle, et c'est tout ce que
teste le TS 1.1. Les cinq autres valeurs sont du contexte utile plutôt que de la
matière d'examen, à une exception près : `max_tokens` est un distracteur
classique, parce qu'une réponse tronquée ressemble exactement à une réponse
finie tant qu'on ne lit pas le champ.

**À tester** — les questions d'auto-évaluation de `D0_API_Fundamentals.html`.

## Les system prompts
<!-- src:05claudeapi L8 ; building_claude_api module 1 -->

Le paramètre `system` est une simple chaîne passée à côté de `messages`, et il
se tient **en dehors** de la conversation : ce n'est pas un tour, il n'a pas de
rôle, et ce n'est pas quelque chose à quoi le modèle répond. Il façonne
*comment* Claude répond, pas *ce qu'il répond*.

Prenez l'exemple d'un tuteur de maths. Sans system prompt, « Comment résoudre
5x + 2 = 3 pour x ? » donne aussitôt une solution complète pas à pas — correcte,
et inutile pour enseigner. Avec :

```
Tu es un tuteur de maths patient.
Ne réponds pas directement aux questions de l'élève.
Guide-le vers la solution, étape par étape.
```

la même question revient sous la forme « Quelle serait, selon toi, une bonne
première étape pour isoler x ? ». Même modèle, même tour user ; c'est
l'instruction permanente qui a changé le comportement.

Voilà à quoi sert un system prompt : assignez un rôle, et le modèle répond comme
le ferait quelqu'un dans ce rôle ; énoncez des contraintes durables, et elles
tiennent sur tous les tours sans être répétées dans chaque tour user. C'est
aussi ce qui maintient le cap sur une longue conversation.

Une note pratique : l'API n'accepte pas `system=None`, donc un helper de chat
réutilisable ne doit ajouter la clé que lorsqu'un prompt a réellement été
fourni.

Une instruction system porte aussi plus loin que n'importe quelle formulation
d'un tour — assez loin pour qu'un seul mot-clé oriente le modèle contre des
instructions plus spécifiques reçues ailleurs. **Comment la formulation d'un
system prompt finit par l'emporter sur des descriptions d'outils bien écrites
est développé en D2.1.**

**À tester** — les questions d'auto-évaluation de `D0_API_Fundamentals.html`.

## La context window
<!-- src:05claudeapi L6 ; building_claude_api modules 3 and 4 -->
<!-- owns:context-window -->

Mettez bout à bout les deux faits précédents. L'API ne garde aucun état, donc
chaque requête embarque tout l'historique ; et chaque requête a un budget de
tokens fini. L'historique n'est donc pas gratuit — c'est un coût récurrent qui
croît avec la conversation, de façon monotone, tant que vous n'y faites rien.

Ce qui s'accumule, à chaque requête :

| Ce que vous renvoyez | Pourquoi c'est là |
|---|---|
| Le prompt `system` | Il tient d'un tour à l'autre parce que vous le renvoyez, pas parce qu'il est stocké |
| Chaque tour `user` et `assistant` passé | Rien n'est stocké côté serveur |
| Chaque bloc `tool_use` et `tool_result` | Les retirer casse l'appariement |
| Les schémas d'outils complets | Requis à chaque requête, même quand aucun appel ne suit |

Les tool results sont la part que l'on sous-estime. Un outil qui retourne un
gros document met ce document dans l'historique pour tout le reste de
l'exécution, et vous le payez à chaque tour suivant — et pas une fois pour
toutes.

Envoyer directement un gros document est l'approche la plus simple, et c'est
parfois la bonne : aucun prétraitement, rien à construire. Ses coûts sont un
plafond de tokens strict, un prix élevé par appel et un traitement lent. Au-delà
d'une certaine taille, on cesse d'envoyer le document pour n'envoyer que les
parties qui comptent.

Une context window pleine amène ses propres modes de défaillance — ce qui est
enfoui au milieu du contexte a tendance à être manqué, l'historique s'accumule
jusqu'à étouffer la tâche, et le résumer échange du détail contre de la place.
**Les nommer est tout ce que fait D0 : les traiter, et maintenir une longue
exécution dans son budget, est développé en D5.1.** Le retrieval et le chunking
ne sont pas la réponse que le guide attend — il les met hors périmètre, et ce
corpus aussi. L'essentiel ici, c'est seulement que la fenêtre est finie, que
c'est l'historique qui la remplit, et que les deux découlent de l'absence
d'état.

**À tester** — les questions d'auto-évaluation de `D0_API_Fundamentals.html`.

## Choisir un modèle
<!-- src:building_claude_api module 1 -->

Trois familles, trois compromis :

| Famille | Points forts | Coûts |
|---|---|---|
| Opus | Le plus intelligent : raisonnement profond, planification multi-étapes | Prix élevé, latence élevée |
| Sonnet | Équilibré : bonne intelligence, vitesse correcte, solide en code | Raisonnable sur les trois plans |
| Haiku | Le plus rapide et le moins cher : interaction temps réel, traitement à gros volume | Pas de raisonnement avancé |

La règle de sélection s'énonce comme une priorité, pas comme un classement :

- l'intelligence est la priorité → **Opus**

- la vitesse est la priorité → **Haiku**

- des exigences équilibrées → **Sonnet**


Sonnet est le meilleur choix dans la plupart des cas pratiques. Et le choix se
fait par tâche, pas par application : les applications réelles utilisent
couramment plusieurs modèles, en routant chaque travail vers la famille que sa
priorité désigne.

**À tester** — rien pour l'instant : aucune question du corpus ne porte sur le
choix du modèle.
