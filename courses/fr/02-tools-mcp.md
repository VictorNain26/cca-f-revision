# D2 — Conception d'outils et intégration MCP (18 %)

<!-- src:exam guide domain 2 (the five task statements) ; 02mcp L2-L3, L5, L9-L10, L14 ; 09apicomplements L5 ; modelcontextprotocol.io Server/Tools ; code.claude.com/docs/en/mcp -->

Dix-huit pour cent du score, cinq task statements, et le domaine où l'examen
cesse de demander ce qu'un agent peut appeler pour demander ce que vous placez
devant lui : le libellé d'une description, la forme d'une erreur, la taille d'un
jeu d'outils, le fichier où un serveur est déclaré. Une section par task
statement, dans l'ordre du guide et sous le libellé du guide — pour qu'une
question repérée le jour J corresponde à une section d'ici sans traduction.

D0 et D1 sont supposés acquis, et tous deux renvoient ici. D0 a nommé l'anatomie
d'un outil — `name`, `description`, `input_schema` — et a dit deux fois que
**c'est en D2.1 que se développe la question du libellé qui fait choisir au
modèle le bon outil parmi plusieurs similaires**, une fois pour le champ
`tools`, une fois pour le mot-clé du system prompt qui tire un outil sur chaque
tour. D1 a renvoyé la forme d'une charge utile d'erreur en **D2.2** et le
cadrage des outils entre agents en **D2.3**. Ces trois dettes sont réglées
ci-dessous.

Le guide place ailleurs les notions voisines, et ce cours le respecte.
`tool_choice` est testé en TS 2.3 *et* en TS 4.3, et c'est D4 qui le possède :
2.3 énonce ce qu'il garantit pour la distribution d'outils et renvoie là-bas pour
le champ lui-même. La propagation d'une erreur entre un subagent et son
coordinateur relève du TS 5.3 ; ce cours possède la **forme** de l'erreur, D5
possède ce que le coordinateur en fait. Et ce qui fait *charger* une description
dans une session Claude Code — les fichiers `.claude/agents/`, `allowedTools`,
les settings — relève du domaine 3.

## 2.1 — Concevoir des interfaces d'outils claires, avec des descriptions et des frontières nettes
<!-- ts:2.1 | src:exam guide TS 2.1 (tool descriptions as the primary mechanism LLMs use for tool selection and minimal descriptions leading to unreliable selection among similar tools, the importance of input formats, example queries, edge cases and boundary explanations, ambiguous or overlapping descriptions causing misrouting with the analyze_content against analyze_document example, and the impact of system prompt wording where keyword-sensitive instructions create unintended tool associations; the skills: descriptions that differentiate purpose, expected inputs, outputs and when to use one tool versus a similar alternative, renaming analyze_content to extract_web_results with a web-specific description, splitting a generic analyze_document into extract_data_points, summarize_content and verify_claim_against_source, and reviewing system prompts for keyword-sensitive instructions that might override well-written tool descriptions) ; 09apicomplements L5 (the description as the single most determining factor of tool performance, the 3-4 sentence minimum and the five things it must cover, grouping related operations behind an action parameter, namespacing a tool with its service name, returning signal only, the optional input_examples field including a call with an optional parameter omitted, and the tool name pattern ^[a-zA-Z0-9_-]{1,64}$) ; 02mcp L5 (defining a tool with the FastMCP @mcp.tool decorator, name and description carried by the decorator and per-parameter descriptions by Pydantic Field, the SDK generating the schema from the type hints) -->

Deux outils, tous deux correctement implémentés, tous deux connectés, tous deux
testés. Et l'agent continue d'appeler le mauvais. Rien n'est cassé — le modèle a
choisi à partir de la seule chose dont il disposait, et cette chose était deux
phrases qui disaient la même chose.

C'est le premier point de connaissance du guide, et c'est la phrase sur laquelle
tout le domaine repose : **les descriptions d'outils sont le mécanisme principal
qu'un LLM utilise pour sélectionner un outil, et des descriptions minimales
conduisent à une sélection peu fiable parmi des outils similaires.** Le modèle ne
lit pas votre implémentation. Il lit `name`, `description` et `input_schema`, et
il décide.

La paire du guide lui-même est celle à mémoriser, parce qu'elle est
délibérément banale :

```json
{ "name": "analyze_content",  "description": "Analyzes content and extracts key information." }
{ "name": "analyze_document", "description": "Analyzes documents and extracts key information." }
```

Rien ici n'est faux. Les deux phrases sont vraies. Et aucune propriété de l'une
ou de l'autre ne permet à un modèle de préférer celle-ci à celle-là : la décision
de routage retombe alors sur ce que la formulation de la requête fait résonner.

### Ce qu'une description doit porter

Le guide nomme quatre choses qui y ont leur place — **les formats d'entrée, des
exemples de requêtes, les cas limites et l'explication des frontières** — et la
documentation de l'API pose un plancher de volume : viser **trois à quatre
phrases au minimum**, couvrant ce que fait l'outil, quand l'utiliser et quand ne
*pas* l'utiliser, ce que signifie chaque paramètre, ce qu'il retourne, et ses
limites.

```json
{
  "name": "extract_web_results",
  "description": "Extracts the ranked result list from a fetched search-engine
    results page: title, URL, snippet and rank for each entry. Use this AFTER a
    page has been retrieved, and only on a SERP — for the body text of an
    ordinary article or a PDF, use extract_data_points instead. Returns an empty
    list, not an error, when the page carries no results. Does not follow the
    result links.",
  "input_schema": {
    "type": "object",
    "properties": {
      "html": { "type": "string", "description": "Raw HTML of the results page" },
      "max_results": { "type": "integer", "description": "Cap on entries returned; default 10" }
    },
    "required": ["html"]
  },
  "input_examples": [
    { "html": "<html>…</html>", "max_results": 25 },
    { "html": "<html>…</html>" }
  ]
}
```

Deux détails de ce bloc coûtent peu et sont souvent négligés. `input_examples`
montre des appels types **dont un où le paramètre optionnel est omis**, et c'est
ainsi que le modèle apprend que l'omettre est légitime plutôt qu'un oubli. Et la
clause négative — « pour un article ordinaire, utiliser `extract_data_points` à
la place » — est l'explication de frontière : elle nomme l'outil voisin, si bien
que c'est la description qui lève l'ambiguïté au lieu de la laisser à la requête.

::: key-concept
**La frontière appartient à la description des deux outils, pas de l'un des
deux.** Enrichir un seul côté laisse l'autre tout aussi attirant pour les mêmes
requêtes, et le misrouting change simplement de sens. Une paire d'outils se
désambiguïse en tant que paire.
:::

### Les trois réparations, et le symptôme qui appelle chacune

Les compétences du guide sont trois gestes distincts. Lire l'énoncé pour savoir
lequel il décrit est l'essentiel du travail sur ce task statement.

| Symptôme dans l'énoncé | Geste | L'exemple du guide |
|---|---|---|
| Deux outils dont les descriptions se recouvrent sémantiquement | **Renommer et réécrire** pour que le nom et la phrase disent ce qui est réellement retourné | `analyze_content` → `extract_web_results`, avec une description spécifique au web |
| Un outil générique employé bien au-delà de son périmètre | **Remplacer par un outil contraint** dont le contrat rejette le mésusage | `fetch_url` → `load_document`, développé en 2.3 |
| Un outil fourre-tout qui fait trois métiers sans rapport | **Diviser en outils spécialisés** aux contrats d'entrée/sortie définis | `analyze_document` → `extract_data_points`, `summarize_content`, `verify_claim_against_source` |

La division mérite un second regard, parce que c'est celle qui ressemble à du
travail en plus. Un outil nommé `analyze_document` n'a aucun contrat de sortie :
« analyser » peut vouloir dire un résumé, un tableau de chiffres ou un verdict
sur une affirmation, et le modèle choisit en devinant. Trois outils aux trois
noms portent chacun une promesse implicite sur ce qui revient, et c'est cette
promesse qui rend la sélection décidable.

Diviser n'est pas gratuit, et 2.3 est le contrepoids : un jeu d'outils qui
dépasse quatre ou cinq dégrade la sélection pour une autre raison. On divise un
outil parce que ses métiers ont des contrats de sortie différents, pas parce que
plus d'outils fait plus rangé.

### Nommer, pour que le nom travaille avec la description

Deux habitudes venues de la documentation de l'API, toutes deux mécaniques :

- **Namespacer avec le service.** `github_list_prs`, `slack_send_message`. Un
  `search` nu dans une session qui tient quatre serveurs est une invitation au
  misrouting.

- **Regrouper les opérations liées derrière un paramètre `action`** plutôt que
  de livrer `create_pr`, `review_pr` et `merge_pr` en trois outils. La même
  économie que réclame la règle de comptage de 2.3, appliquée dès la conception.


Le nom lui-même doit respecter `^[a-zA-Z0-9_-]{1,64}$` — lettres, chiffres,
tiret bas et tiret, jusqu'à soixante-quatre caractères.

::: key-concept
**Retourner du signal, pas du remplissage.** Un outil qui répond par un mur de
texte convenu dépense le contexte de l'agent en lignes dont aucune décision ne
dépend. Retournez des identifiants sémantiques — UUID, slugs, noms — et laissez
un appel de suivi aller chercher le reste. Rogner une sortie d'outil verbeuse est
le territoire de D5 ; choisir ce qu'un outil retourne au départ est une décision
de conception, et elle se prend ici.
:::

### Le system prompt peut l'emporter sur une bonne description

C'est le quatrième point de connaissance du guide et celui qu'on manque, parce
que c'est du côté des définitions d'outils qu'on regarde. **Une instruction
sensible aux mots-clés dans le system prompt crée des associations d'outils non
voulues.**

```text
# Le system prompt
You are a support assistant. ALWAYS verify the customer's identity before
answering anything.
```

Rien dans cette phrase ne nomme un outil. Mais « verify the customer » ressemble
assez à `get_customer`, et « always » porte plus loin que n'importe quelle
formulation propre à un tour : le modèle appelle désormais `get_customer` sur
des tours où l'identité n'est pas en jeu — y compris « quels sont vos horaires
d'ouverture ». Les descriptions d'outils sont bonnes. C'est l'instruction
au-dessus d'elles qui a routé le tour.

La compétence du guide est une relecture, pas une réécriture : **relire le
system prompt pour y trouver les instructions sensibles aux mots-clés qui
pourraient l'emporter sur des descriptions d'outils bien écrites.** Le correctif
consiste à cadrer l'absolu — « vérifier l'identité du client avant de divulguer
des données de commande ou de compte » — pour que le mot-clé cesse de s'attacher
à chaque tour.

::: exam-tip
Lisez l'énoncé pour ce qu'il dit être *pauvre*, car les trois réparations du
guide répondent à trois plaintes différentes.

« Les deux descriptions sont presque identiques » → renommer l'outil qui
recouvre et réécrire les deux descriptions. « On demande à un outil trois choses
sans rapport » → le diviser. « Une instruction du system prompt dit *toujours* »
→ la cause racine est le prompt, pas les descriptions.

Les distracteurs ici sont tous de l'ingénierie plausible, et chacun laisse
l'ambiguïté en place. Ajouter des exemples de routage few-shot au system prompt
coûte des tokens à chaque tour et ne touche jamais aux phrases sur lesquelles le
modèle sélectionne vraiment. Construire une couche de routage qui classe la
requête avant qu'aucun outil ne soit proposé remplace la compréhension du langage
naturel que le modèle a déjà par un composant que vous maintenez désormais.
Fusionner les deux outils en un `lookup_entity` générique est une architecture
défendable et un très grand pas quand le défaut immédiat tient à deux phrases
maigres. Et n'enrichir qu'une des deux descriptions laisse l'autre tout aussi
attirante : le misrouting persiste dans l'autre sens.
:::

::: anti-pattern
**Écrire la description pour un lecteur humain.** « Analyzes documents » en dit
assez à un collègue, parce que le collègue ira lire le code. Le modèle, non.

**Laisser le schéma porter le sens à lui seul.** Un paramètre nommé `mode` avec
un `enum` de cinq valeurs et aucune description par valeur est une décision que
le modèle doit prendre sans information. Les descriptions de champs font partie
de la surface descriptive de l'outil — avec le SDK Python MCP elles viennent du
`Field(description=…)` posé sur chaque paramètre, et le SDK construit le schéma
à partir des annotations de type qui les entourent.
:::

**À tester** — les questions de la banque étiquetées `data-task="2.1"`.

## 2.2 — Implémenter des réponses d'erreur structurées pour les outils MCP
<!-- ts:2.2 | src:exam guide TS 2.2 (the MCP isError flag pattern for communicating tool failures back to the agent, the distinction between transient, validation, business and permission errors, why uniform "Operation failed" responses prevent appropriate recovery decisions, and the difference between retryable and non-retryable errors with structured metadata preventing wasted retries; the skills: returning errorCategory, isRetryable and human-readable descriptions, retriable: false plus customer-friendly explanations for business rule violations, local error recovery inside subagents propagating to the coordinator only what cannot be resolved locally along with partial results and what was attempted, and distinguishing access failures from valid empty results) ; 09apicomplements L5 (is_error in a tool_result block and the explicit statement that errorCategory, isRetryable and a human-readable description are an application-level convention placed in the content, not fields of the protocol) ; 02mcp L5 (an MCP tool raising ValueError when the requested document id is absent, error handling integrating with ordinary Python exceptions) ; modelcontextprotocol.io, Server/Tools (the two error mechanisms: protocol errors reported as standard JSON-RPC errors for an unknown tool, invalid arguments or a server fault, against tool execution errors reported inside a successful result with isError true — API failures, invalid input data and business rule violations — and content as an array of content blocks) -->
<!-- owns:structured-errors -->

Un outil échoue. L'agent doit maintenant décider une chose : le rappeler,
changer les arguments, prévenir l'utilisateur, ou passer la main à un humain.
Chacune de ces décisions se prend à partir de la charge utile que l'outil a
retournée — et voici ce que cette charge utile dit d'habitude :

```json
{ "isError": true, "content": [{ "type": "text", "text": "Operation failed" }] }
```

Le point de connaissance du guide en est la conséquence : **des réponses
d'erreur uniformes empêchent l'agent de prendre les décisions de récupération
appropriées.** L'agent fera quand même *quelque chose*. Il réessaiera quatre fois
un refus de permission, ou renoncera sur un timeout qui se serait dissipé à la
deuxième tentative, parce que rien dans la charge utile ne les distingue.

`isError` est le drapeau que MCP vous donne — il dit à l'agent que l'appel a
échoué au lieu de retourner des données. Tout ce qui rend cet échec actionnable,
c'est vous qui le posez à côté.

```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "{\"errorCategory\": \"transient\", \"isRetryable\": true, \"description\": \"Order service timed out after 5s. Retry in a few seconds.\", \"attempted_query\": \"order_id=12345\"}"
  }]
}
```

::: key-concept
**`errorCategory`, `isRetryable` et la description lisible par un humain ne
sont pas des champs du protocole MCP.** Ce sont une convention applicative, et
elles vivent à l'intérieur du texte du bloc de contenu — en prose ou en JSON
sérialisé. Ce que le protocole vous donne, c'est `isError` ; la structure, c'est
à vous de l'imposer, et le guide vous teste sur le fait de l'imposer de manière
cohérente.

Deux points de forme qui vont avec. `content` est un **tableau de blocs de
contenu**, jamais une chaîne nue ni un objet — les métadonnées structurées
doivent donc vivre à l'intérieur d'un bloc, ce qui est précisément pourquoi on
les encode en texte. Et la même convention côté API Claude est un bloc
`tool_result` portant `is_error: true`, dont le `content` est ce que le modèle
lit pour décider de la suite. Même discipline, enveloppe différente.

Enfin, un détail d'orthographe qu'il vaut mieux neutraliser avant qu'il ne vous
coûte un point : **le guide lui-même écrit à la fois `isRetryable` et
`retriable`**, à deux puces d'intervalle dans le même bloc « Skills in » —
`isRetryable` pour le booléen général, `retriable: false` pour les violations de
règle métier. Aucune des deux n'est un champ normalisé, donc aucune ne peut être
celle qui piège : ce sont des conventions applicatives portées dans le contenu de
l'erreur, comme `errorCategory`. Une option qui emploie une graphie n'est pas
fausse parce qu'elle n'a pas employé l'autre.
:::

### Deux mécanismes d'erreur, et un seul est le vôtre

Avant les catégories, une frontière que le protocole trace et dont un
distracteur raffole. MCP signale les échecs à **deux endroits différents**, et ils
ne sont pas interchangeables.

| Mécanisme | Signalé comme | Couvre |
|---|---|---|
| **Erreur de protocole** | Une erreur JSON-RPC standard — l'appel lui-même n'est pas passé | Outil inconnu, arguments invalides, panne du serveur |
| **Erreur d'exécution d'outil** | Un **résultat réussi** portant `isError: true` | Échec d'API, données d'entrée invalides, violation de règle métier |

Relisez la seconde ligne deux fois, parce qu'elle est contre-intuitive et
qu'elle est tout ce task statement. **Une règle métier violée n'est pas une
erreur de protocole.** L'appel est parvenu à l'outil, l'outil a tourné, et il a
décidé que l'opération ne devait pas avoir lieu — la réponse revient donc comme
un résultat normal dont `isError` vaut vrai et dont l'agent peut lire le contenu.
Une réservation au-delà de l'horizon de 90 jours n'est pas une requête malformée :
c'est une requête que l'outil a comprise et refusée.

C'est pourquoi tout ce qui suit porte sur le *contenu* d'un résultat plutôt que
sur des codes d'erreur. Les erreurs de protocole sont l'affaire du transport et
vous n'avez rien à y concevoir. Les erreurs d'exécution sont les vôtres, et la
décision de récupération de l'agent se prend entièrement à partir de ce que vous
y mettez.

### Les quatre catégories, et la décision que chacune rend possible

| `errorCategory` | Exemples | `isRetryable` | Ce que l'agent doit faire |
|---|---|---|---|
| `transient` | Timeout, 503, panne réseau | `true` | Réessayer localement ; ne propager que si l'échec persiste |
| `validation` | Entrée invalide, champ requis manquant | `true`, une fois l'entrée corrigée | Corriger les arguments et rappeler |
| `business` | Violation de politique, seuil dépassé | `false` | Expliquer à l'utilisateur ; proposer une alternative |
| `permission` | Accès refusé, privilège insuffisant | `false` | Escalader vers un humain ; réessayer ne change rien |

Les deux colonnes de droite sont tout l'enjeu. La retryabilité est une
affirmation sur la possibilité qu'une répétition de l'appel réussisse, et elle est
connaissable au niveau de l'outil, pas au niveau de l'agent. **Des métadonnées
structurées évitent les tentatives de retry gaspillées** — c'est la formulation
du guide, et le gaspillage se facture à la tentative.

La ligne la plus mal lue est `validation`. Elle est retryable, et son retry
n'est pas une répétition : l'agent répare ses propres arguments et rappelle. La
classer à côté de `permission` parce que « l'appel a échoué pour une raison que
l'outil a donnée » vous coûte une récupération que l'agent pouvait faire seul.

### Les erreurs métier réclament une phrase qu'un client peut entendre

Le guide demande deux choses sur une violation de règle métier : **`retriable:
false` et une explication compréhensible par le client**. La seconde n'est pas de
l'ornement. L'agent va relayer cela à quelqu'un, et « BOOKING_RULE_4171 » se
relaie mal.

```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "{\"errorCategory\": \"business\", \"retriable\": false, \"description\": \"Appointments cannot be booked more than 90 days ahead. The earliest available slot inside that window is 12 March.\", \"policy\": \"booking_horizon_90d\"}"
  }]
}
```

Le code lisible par la machine reste, pour les journaux et pour le routage. La
phrase posée à côté est ce qui permet à l'agent de répondre au client sans
inventer la règle.

### Un échec d'accès n'est pas un résultat vide

La dernière compétence du guide sur ce task statement est une distinction, et
c'est celle qui produit des réponses fausses silencieuses plutôt que bruyantes.

| | Ce qui s'est passé | Charge utile correcte |
|---|---|---|
| **Échec d'accès** | La requête n'a jamais tourné — timeout, 503, connexion refusée | `isError: true`, catégorie `transient`, `isRetryable: true` |
| **Résultat vide valide** | La requête a tourné et n'a rien trouvé | **Ce n'est pas une erreur.** Un succès portant une liste vide |

Confondez-les et vous obtenez l'un de deux défauts. Signalez le résultat vide
comme une erreur et l'agent réessaie une question à laquelle il a déjà été
répondu. Signalez le timeout comme un résultat vide et l'agent conclut, de bonne
foi, qu'il n'y a rien à trouver — et le trou n'apparaît jamais dans la réponse
finale.

```json
// Pas une erreur : le catalogue a bien été interrogé, il ne contient aucune correspondance.
{ "isError": false, "content": [{ "type": "text",
  "text": "{\"results\": [], \"searched\": \"parts_catalog\", \"query\": \"part_no=88-2210\"}" }] }
```

### Récupération locale, et ce qui franchit la frontière

Le guide demande une **récupération locale des erreurs à l'intérieur des
subagents** : un subagent traite lui-même ses échecs transient et ne propage au
coordinateur que ce qu'il ne peut pas résoudre localement — **accompagné de ses
résultats partiels et de ce qu'il a tenté**.

```json
{
  "status": "partial",
  "completed": ["order_lookup", "customer_profile"],
  "failed": [{
    "step": "shipping_status",
    "errorCategory": "permission",
    "isRetryable": false,
    "attempted": "carrier_api.track(tracking_id=1Z999) — 3 attempts, 403 each time",
    "description": "The carrier account has no tracking scope. A human must grant it."
  }]
}
```

Trois propriétés rendent cette charge utile exploitable en amont : les résultats
partiels survivent, l'étape en échec nomme sa catégorie pour que le coordinateur
ne retente pas un refus de permission, et `attempted` dit ce qui a déjà été
essayé pour que le budget de retry ne soit pas dépensé deux fois sur le même
appel.

::: key-concept
**Où ce cours s'arrête.** La *forme* de l'erreur — le drapeau, la catégorie, la
retryabilité, la phrase adressée au client, l'enveloppe à résultats partiels —
est testée ici, en TS 2.2. Ce qu'un coordinateur fait quand cette enveloppe lui
arrive — continuer sur des résultats partiels, annoter la sortie finale de ce qui
est resté non couvert, décider quand escalader — relève de la propagation
d'erreurs entre agents, testée en TS 5.3 et développée en D5. Le TS 1.2 de D1
avait déjà posé la règle de routage et renvoyait ici pour la charge utile.
:::

::: exam-tip
La charge utile générique `"Operation failed"` est l'anti-pattern autour duquel
ce task statement est bâti, et la question demande d'ordinaire *pourquoi* elle
bloque l'agent plutôt que par quoi la remplacer. La réponse nomme une décision
que l'agent ne peut plus prendre : l'appel vaut-il d'être répété, et a-t-il
vraiment reçu un résultat vide ou n'est-il jamais passé ?

Les distracteurs adoucissent le défaut au lieu de le réparer. Dire qu'un timeout
est « un délai, pas un vrai échec » et retirer le drapeau masque l'échec
entièrement. Qualifier la charge utile de malformée se trompe de défaut — elle se
parse et parvient intacte à l'agent ; elle est vide de métadonnées de décision,
pas cassée. Reprocher au message d'être trop court pour un humain vise le mauvais
lecteur. Et affirmer que les quatre catégories viennent de la spécification MCP
inverse l'arrangement réel : `isError` appartient au protocole, les catégories
sont les vôtres.
:::

::: anti-pattern
**Lever une exception brute et laisser le framework la sérialiser en chaîne.**
Un `ValueError` Python remonté par le SDK devient un message, et un message sans
catégorie est un `"Operation failed"` avec plus de mots. Attrapez-le, classez-le,
et retournez la charge utile structurée.

**Propager au coordinateur chaque échec transient.** Cela convertit un retry que
le subagent pouvait faire en silence en un aller-retour, et le coordinateur a
moins de contexte pour décider que le subagent qui a passé l'appel.
:::

**À tester** — les questions de la banque étiquetées `data-task="2.2"`.

## 2.3 — Distribuer les outils entre les agents et configurer le choix d'outil
<!-- ts:2.3 | src:exam guide TS 2.3 (giving an agent access to too many tools — 18 instead of 4-5 — degrading tool selection reliability by increasing decision complexity, agents with tools outside their specialization tending to misuse them such as a synthesis agent attempting web searches, scoped tool access with limited cross-role tools for specific high-frequency needs, and the tool_choice options "auto", "any" and forced selection; the skills: restricting each subagent's tool set to its role, replacing fetch_url with a load_document that validates document URLs, providing a scoped verify_fact for the synthesis agent while routing complex cases through the coordinator, forcing extract_metadata before the enrichment tools and processing subsequent steps in follow-up turns, and setting tool_choice "any" to guarantee a tool call rather than conversational text) ; 09apicomplements L5 (the two uses the guide names for tool_choice: forcing a named tool first then handling later steps in follow-up turns, and "any" to guarantee a call instead of conversational text) -->

Chaque outil que vous ajoutez à un agent est une branche qu'il doit évaluer à
chaque tour. Le guide met un chiffre là où cela cesse de fonctionner : **donner à
un agent l'accès à trop d'outils — 18 au lieu de 4-5 — dégrade la fiabilité de la
sélection d'outil en augmentant la complexité de la décision.**

C'est la dette de D1, et il vaut la peine d'être précis sur ce qu'elle affirme.
Rien ne se dégrade dans le modèle ; ce qui se dégrade, c'est la décision.
Dix-huit descriptions, dont certaines voisines, produisent un problème de
sélection qu'aucune description individuelle ne peut résoudre — ce qui explique
pourquoi le remède de 2.1 est la mauvaise réponse ici, et pourquoi lire l'énoncé
compte plus que connaître les deux remèdes.

::: exam-tip
Les deux task statements partagent un symptôme — le mauvais outil est appelé —
et se séparent sur l'indice que l'énoncé vous donne.

« Les descriptions sont minimales », « les deux se lisent pareil » → c'est 2.1 :
réécrire, renommer, diviser. « L'agent dispose de dix-huit outils », « il porte
des outils de trois rôles différents » → c'est 2.3 : ramener le jeu au rôle.

Réécrire les descriptions alors que l'énoncé a compté les outils est le
distracteur qui attrape ceux qui n'ont appris qu'une des deux réponses.
:::

### L'accès aux outils cadré sur le rôle

Le deuxième point de connaissance explique ce qui se passe mal au-delà du
nombre : **les agents dotés d'outils hors de leur spécialité tendent à en faire un mauvais usage**
— le cas du guide lui-même est un agent de synthèse qui se met à faire des
recherches web. L'outil est là, le tour est difficile, et y recourir est un geste
localement sensé qui produit un travail que personne n'a demandé.

Chaque subagent reçoit donc les outils dont son rôle a besoin, et pas d'autres :

| Subagent | Outils | Volontairement absents |
|---|---|---|
| Recherche web | `web_search`, `load_document` | Tout ce qui écrit |
| Analyse de documents | `load_document`, `extract_data_points`, `summarize_content` | `web_search` — hors de son rôle |
| Synthèse | `read_findings`, `write_report`, `verify_fact` | `web_search` — voir ci-dessous |

Un outil que vous laissez de côté n'est pas dans la session de l'agent du tout.
Il n'y a pas d'instruction à ignorer ni de refus à journaliser : l'agent travaille
simplement sans lui. C'est ce qui rend l'omission plus forte que l'instruction.

### Contraindre l'outil plutôt qu'instruire autour

La deuxième compétence du guide est une substitution : **remplacer `fetch_url`
par `load_document`, qui valide que l'URL pointe vers un document.** Le scénario
qui la motive est un subagent d'analyse de documents qui, disposant d'un outil
capable de récupérer n'importe quelle URL, finit par télécharger des pages de
résultats de moteur de recherche au lieu de documents.

```json
{
  "name": "load_document",
  "description": "Fetches a document by URL and returns its text. Accepts PDF,
    DOCX, TXT and Markdown URLs only; rejects any other URL with a validation
    error. Use this to read a document you already have the address of — it does
    not search, and it does not follow links inside the document.",
  "input_schema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "Direct URL to a .pdf, .docx, .txt or .md file" }
    },
    "required": ["url"]
  }
}
```

::: key-concept
**Une contrainte à l'interface l'emporte sur une contrainte dans le prompt.**
« Ne récupère que des documents » est une instruction que le modèle met en balance
avec tout le reste de son contexte. Un outil qui rejette une URL non documentaire
est un contrat : le mauvais appel cesse d'être découragé et devient impossible, et
il retourne une erreur `validation` sur laquelle l'agent peut agir — soit 2.2 qui
arrive comme conséquence de conception.
:::

### Les outils cross-role, cadrés plutôt qu'ouverts

Le cadrage strict a un coût, et le guide en nomme le cas : l'agent de synthèse a
constamment besoin de vérifier une affirmation ponctuelle. Renvoyer chaque
vérification par le coordinateur — qui invoque l'agent de recherche web, attend,
et relaie la réponse — paie deux ou trois allers-retours pour ce qui est le plus
souvent une date ou un nom.

La réponse du guide n'est ni « donnez-lui la recherche web » ni « continuez à
tout renvoyer ». C'est **un outil cross-role limité, pour un besoin fréquent et
précis** :

```json
{
  "name": "verify_fact",
  "description": "Verifies one specific claim against a named source document
    and returns a confidence level (high/medium/low) with the supporting
    excerpt. Use this only to check a claim you can already state and whose
    source you can already name — for open-ended research, route the request
    through the coordinator to the web research agent.",
  "input_schema": {
    "type": "object",
    "properties": {
      "claim":     { "type": "string", "description": "The single claim to verify" },
      "source_id": { "type": "string", "description": "Id of the source document to check against" }
    },
    "required": ["claim", "source_id"]
  }
}
```

Deux propriétés en font un outil cross-role cadré plutôt qu'un trou dans le
cadrage. Il est plus étroit en capacité que l'outil qu'il remplace — il confronte
une affirmation à une source nommée, il ne cherche pas. Et sa description dit où
s'arrête son mandat, si bien que **les cas complexes continuent de passer par le
coordinateur**. Le cas simple et fréquent obtient un chemin direct ; le reste
préserve l'architecture.

### `tool_choice`, et ce qu'il garantit ici

`tool_choice` est le champ de requête qui décide si appeler un outil est
facultatif, obligatoire, ou obligatoire et nommé. **Le champ lui-même — ses
quatre valeurs, leur comportement sous extended thinking, et leur usage pour la
sortie structurée — est enseigné en D4.3, qui le possède.** Ce qui appartient à ce
task statement, ce sont les deux usages que le guide nomme, et une chose qu'il ne
répare pas.

| Usage du guide | Valeur | Pourquoi |
|---|---|---|
| Garantir un appel d'outil plutôt qu'un texte conversationnel | `{"type": "any"}` | Le modèle doit appeler *un* outil ; il choisit encore lequel |
| Forcer un outil précis à s'exécuter en premier | `{"type": "tool", "name": "extract_metadata"}` | Épingle cet outil-là pour le tour ; les étapes d'enrichissement viennent aux tours suivants |

```json
{
  "tools": [ /* extract_metadata, enrich_entities, score_relevance */ ],
  "tool_choice": { "type": "tool", "name": "extract_metadata" }
}
```

Notez ce que l'appel forcé achète et ce qu'il n'achète pas. Il fixe la
**première** action du tour. Séquencer le reste est affaire de traiter le
résultat et d'émettre une autre requête — l'ordonnancement vit dans votre boucle,
pas dans un paramètre unique.

::: exam-tip
`tool_choice: {"type": "any"}` garantit qu'un outil est appelé. Il ne garantit
pas que ce soit le *bon*, et il ne dit rien de la forme de ce qui revient. Une
option qui le propose comme remède à un scénario de misrouting répond à un
problème de sélection par une contrainte d'appel.

La sélection forcée est la réponse quand l'énoncé nomme un ordre — « le
screening doit tourner avant tout le reste », « les métadonnées doivent être
extraites avant l'enrichissement ». Une phrase dans la description d'outil disant
qu'il doit toujours passer en premier reste probabiliste là où le paramètre est
déterministe.
:::

::: anti-pattern
**Donner tous les outils à un agent « au cas où ».** Cela n'achète rien dont
l'agent avait besoin et cela coûte la fiabilité de sélection de tout ce dont il
avait besoin, plus le mésusage que le guide prédit pour les outils hors du rôle.

**Fusionner les outils en un point d'entrée générique à paramètre `mode` pour
faire baisser le compte.** Le compte baisse et la décision ne disparaît pas :
elle se déplace dans un argument, où les descriptions d'outils ne peuvent plus la
guider.

**Accumuler les vérifications de l'agent de synthèse et les envoyer au
coordinateur en fin de passe.** Cela supprime les allers-retours et cela veut dire
aussi que la synthèse a été écrite avant que quoi que ce soit n'y ait été
vérifié.
:::

**À tester** — les questions de la banque étiquetées `data-task="2.3"`.

## 2.4 — Intégrer des serveurs MCP dans Claude Code et dans les workflows d'agents
<!-- ts:2.4 | src:exam guide TS 2.4 (project-level .mcp.json for shared team tooling against user-level ~/.claude.json for personal or experimental servers, environment variable expansion such as ${GITHUB_TOKEN} for credential management without committing secrets, tools from all configured MCP servers being discovered at connection time and available simultaneously, and MCP resources as a mechanism for exposing content catalogs such as issue summaries, documentation hierarchies and database schemas to reduce exploratory tool calls; the skills: configuring shared servers in project-scoped .mcp.json with environment variable expansion for authentication tokens, configuring personal servers in user-scoped ~/.claude.json, enhancing MCP tool descriptions to explain capabilities and outputs in detail so the agent stops preferring built-in tools like Grep, choosing existing community MCP servers over custom implementations for standard integrations such as Jira while reserving custom servers for team-specific workflows, and exposing content catalogs as MCP resources) ; 02mcp L2 (MCP as a communication layer that shifts tool definition and execution from your server to dedicated MCP servers, the GitHub example, anyone being able to author a server and service providers often publishing official ones, and the distinction from tool use — MCP supplies the schemas and functions, tool use is how Claude calls them), L3 (the client as the bridge, ListToolsRequest/ListToolsResult and CallToolRequest/CallToolResult, and the twelve-step flow in which tools are listed before the query reaches Claude), L9 (resources as read handlers analogous to HTTP GET, direct resources with static URIs against templated resources whose URI parameters become keyword arguments, and mime_type as the hint to the client), L10 (resource content injected straight into the prompt so no tool call is needed to fetch it), L14 (tools are model-controlled, resources are app-controlled, prompts are user-controlled) ; code.claude.com/docs/en/mcp (the .mcp.json body: mcpServers with command, args, env and the type field "stdio" or "http" ; claude mcp add --scope user writing to ~/.claude.json ; expansion of ${VAR} and ${VAR:-default} in command, args, env, url and headers ; an undefined variable with no default warning yet loading the server with the unexpanded ${VAR} text) -->
<!-- owns:mcp-resources -->

Avant la configuration, une phrase sur ce qui est configuré. **MCP déplace la
charge de la définition et de l'exécution des outils hors de votre application,
vers des serveurs dédiés.** Sans lui, exposer GitHub à Claude signifie écrire,
tester et maintenir un schéma et une fonction pour chaque opération sur les
dépôts, les pull requests et les issues que vous voulez couvrir. Avec lui, vous
vous connectez à un serveur MCP GitHub qui les porte déjà.

C'est aussi la réponse à la question que le cours signale comme confusion
courante : **MCP et le tool use ne sont pas la même chose.** Le tool use, c'est la
manière dont Claude appelle un outil. MCP, c'est d'où l'outil vient — quelqu'un
d'autre l'a déjà écrit.

### Les deux portées

Un serveur se déclare à l'une de deux portées, et le choix tient à une seule
question : est-ce que toute l'équipe en a besoin ?

| Portée | Fichier | Partagé ? | Pour |
|---|---|---|---|
| **Projet** | `.mcp.json` à la racine du dépôt | Oui — suivi par le VCS, présent après un clone | Outillage d'équipe : Jira, GitHub, la base de connaissances interne |
| **Utilisateur** | `~/.claude.json` | Non — local à la machine | Serveurs personnels ou expérimentaux : vos notes, un prototype |

`claude mcp add --scope user` écrit dans ce second fichier : la commande et son
effet sont le même fait vu de deux côtés, et sur ce point le libellé du guide et
le comportement de l'outil concordent.

Les deux coexistent. **Les outils de tous les serveurs MCP configurés sont
découverts à la connexion et disponibles simultanément à l'agent**, quelle que
soit la portée qui les a déclarés. Mettre un serveur personnel dans
`~/.claude.json` ne vous coupe pas des serveurs projet — vous avez l'union.

Cette propriété de découverte-à-la-connexion mérite d'être tenue comme un
mécanisme et pas seulement comme un fait. Le client demande à chaque serveur ce
qu'il fournit — un `ListToolsRequest`, auquel répond un `ListToolsResult` — et
les définitions d'outils collectées sont ce qui accompagne la requête de
l'utilisateur jusqu'à Claude. Rien n'est découvert paresseusement en cours de
tour : un serveur qui n'a pas démarré n'a simplement aucun outil dans le jeu, et
l'agent travaille sans eux exactement comme si vous ne l'aviez jamais déclaré.

### Les secrets, par substitution de variables d'environnement

`.mcp.json` est suivi par le VCS. Les tokens, non. Le mécanisme du guide est la
**substitution de variables d'environnement** :

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

`${GITHUB_TOKEN}` se résout au lancement, depuis l'environnement propre au
développeur. Le fichier peut être committé et partagé ; chaque coéquipier fournit
son propre credential, et le dépôt n'en porte jamais aucun. `type` dit comment le
serveur est joint — `"stdio"` pour un processus lancé par `command`, `"http"`
pour un serveur joint à une `url`.

Deux propriétés de la substitution méritent d'être retenues. Elle accepte une
**valeur par défaut**, écrite `${VAR:-default}`, ce qui permet à un réglage
optionnel d'être livré avec une valeur pendant qu'un credential reste
obligatoire. Et elle s'applique à plus que `env` : `command`, `args`, `env`,
`url` et `headers` y passent tous, ce qui permet à l'adresse d'un serveur ou à
son en-tête d'autorisation d'être eux aussi propres à chaque développeur.

```json
"env": {
  "GITHUB_TOKEN": "${GITHUB_TOKEN}",
  "GITHUB_API_URL": "${GITHUB_API_URL:-https://api.github.com}"
}
```

::: key-concept
**Une variable non définie n'empêche pas le serveur de charger.** Sans valeur
dans l'environnement et sans valeur par défaut, Claude Code avertit puis démarre
quand même le serveur, en laissant passer le texte littéral `${GITHUB_TOKEN}`.
Rien n'échoue au moment de la configuration ; le serveur monte et chacun de ses
appels part sans authentification.

C'est le piège d'exploitation de ce mécanisme, et c'est pourquoi le symptôme à
reconnaître est une configuration qui *fonctionne* et dont tous les outils
retournent des erreurs d'authentification. Le correctif est dans l'environnement
du développeur, pas dans `.mcp.json`.
:::

::: anti-pattern
**Un token écrit en clair dans un `.mcp.json` versionné.** Le supprimer plus
tard n'y change rien : l'historique git le garde. Le credential doit être
considéré comme compromis et renouvelé. `${VAR}` ou le `~/.claude.json` non
versionné sont les deux endroits légitimes.

**Un serveur personnel, spécifique à une machine, ajouté au `.mcp.json`
versionné** — un chemin absolu sous le répertoire personnel de quelqu'un, un
binaire que personne d'autre n'a. Chaque clone hérite d'un serveur qui ne peut pas
démarrer. Il a sa place dans `~/.claude.json`, où il charge toujours pour son
auteur et n'atteint personne d'autre.
:::

### Les resources, et pourquoi elles existent à côté des tools

Les serveurs MCP exposent trois primitives, et le guide est explicite sur les
deux qu'il teste. Son annexe nomme **les MCP tools et les MCP resources** ; la
liste in-scope dit « MCP tool and resource design ». Les prompts figurent ici pour
que vous les reconnaissiez comme distracteur.

| Primitive | Contrôlée par | Objectif | Y recourir quand |
|---|---|---|---|
| **Tools** | Le modèle | Donner à Claude une capacité qu'il peut invoquer | Claude doit *faire* quelque chose |
| **Resources** | L'application | Exposer des données en lecture | Votre application a besoin de données pour son interface ou son prompt |
| **Prompts** | L'utilisateur | Des workflows prédéfinis derrière une commande slash ou un bouton | Non testé par cet examen |

Une resource est plus proche d'un handler HTTP `GET` que d'un outil : une URI
entre, des données sortent, et **c'est votre application qui décide quand la
lire** — le modèle ne l'appelle pas. Une resource directe a une URI statique ; une
resource templatée porte des paramètres dans l'URI, que le SDK analyse et passe à
votre fonction en arguments nommés.

```python
@mcp.resource("docs://documents", mime_type="application/json")
def list_docs() -> list[str]:
    return list(docs.keys())            # le catalogue

@mcp.resource("docs://documents/{doc_id}", mime_type="text/plain")
def fetch_doc(doc_id: str) -> str:      # une entrée, par paramètre d'URI
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")
    return docs[doc_id]
```

::: key-concept
**Les resources comme catalogues de contenu.** C'est le cadrage du guide
lui-même et la raison pour laquelle les resources sont testées : exposer un
catalogue — des résumés d'issues, une hiérarchie de documentation, un schéma de
base de données — **réduit les appels d'outils exploratoires.**

Sans cela, un agent interrogé sur une table qu'il n'a jamais vue dépense trois ou
quatre appels à découvrir que la table existe, puis ses colonnes, puis ses clés.
Avec le schéma exposé en resource, l'application le lit une fois et le met dans le
prompt, et le premier appel que fait l'agent est celui qui fait le travail.
`mime_type` dit au client comment parser ce qui revient — `application/json` pour
des données structurées, `text/plain` pour du texte.

La division du travail est la chose à retenir : **les tools servent le modèle,
les resources servent votre application, les prompts servent vos utilisateurs.**
:::

### Quand l'agent ignore votre outil MCP et utilise `Grep`

Vous branchez un serveur exposant un outil de recherche de code bien plus
capable que `Grep` — il comprend la structure, suit les imports, renvoie du
contexte. L'agent continue d'appeler `Grep`. Le serveur tourne, l'outil est
listé : ce n'est pas un défaut de configuration.

La cause est celle de 2.1, vue du côté de l'intégration. Les outils intégrés
arrivent avec des descriptions détaillées et éprouvées. Beaucoup d'outils MCP
portent une ligne générée à partir d'un nom de fonction. Face à `"Search files"`
d'un côté et à la description complète de `Grep` de l'autre, le modèle prend
celle qu'il comprend.

La compétence du guide est la réparation : **enrichir la description de l'outil
MCP pour qu'elle explique ses capacités et ses sorties en détail**, afin qu'elle
cesse de perdre la comparaison.

```text
# Avant — perd contre Grep à tous les coups
Search files.

# Après — énonce la capacité, la sortie, et ce que l'outil intégré ne sait pas faire
Searches the indexed codebase semantically. Given a symbol or a natural-language
description, returns the definition site, every caller with its file and line,
and the import chain that connects them. Unlike a textual search, it resolves
re-exports and aliases, so a function reached through a wrapper module is still
found. Use it to trace how a symbol is used across the repository; use Grep for
a literal string you can spell exactly.
```

::: exam-tip
Quand un énoncé décrit un agent qui préfère un outil intégré à un outil MCP plus
capable, la réponse est de réparer la description — c'est le levier le moins
coûteux et celui qui traite la cause.

Ce n'est pas de retirer ou de désactiver l'outil intégré, ce qui ôte une capacité
légitimement utile pour les recherches littérales. Ce n'est pas d'ajouter au
system prompt une instruction disant à l'agent de préférer l'outil MCP, ce qui est
le piège de sensibilité aux mots-clés de 2.1 érigé en politique. Et ce n'est pas
de construire une couche de routage devant les outils, ce qui remplace un
correctif de deux phrases par un composant à maintenir.
:::

### Serveur communautaire ou serveur sur mesure

La dernière compétence est une décision « acheter ou construire » assortie d'un
défaut : **utiliser un serveur MCP communautaire existant pour les intégrations
standard** — Jira, GitHub, Slack — et **réserver un serveur sur mesure aux
workflows spécifiques à votre équipe** que personne d'autre n'a implémentés.
N'importe qui peut écrire un serveur, et les fournisseurs de services en publient
souvent d'officiels : l'intégration standard que vous vous apprêtez à écrire
existe probablement, maintenue, avec ses schémas déjà éprouvés.

::: anti-pattern
**Écrire un serveur Jira sur mesure parce que celui de la communauté manque un
champ.** Vous avez adopté une charge de maintenance pour un delta. Le cadrage de
l'examen lui-même est que les serveurs sur mesure sont pour ce qui est réellement
spécifique à l'équipe.

**Dupliquer une capacité intégrée dans un serveur MCP.** Si `Grep` répond déjà au
besoin, un serveur qui fait du grep est une deuxième manière de faire une seule chose — et
le problème de sélection de 2.3, offert.
:::

**À tester** — les questions de la banque étiquetées `data-task="2.4"`.

## 2.5 — Sélectionner et employer efficacement les outils intégrés (Read, Write, Edit, Bash, Grep, Glob)
<!-- ts:2.5 | src:exam guide TS 2.5 (Grep for content search over file contents such as function names, error messages or import statements, Glob for file path pattern matching, Read and Write for full file operations against Edit for targeted modifications using unique text matching, and using Read plus Write as the fallback when Edit fails on a non-unique text match; the skills: selecting Grep to find all callers of a function or locate error messages, selecting Glob for naming patterns such as **/*.test.tsx, using Read then Write when Edit cannot find unique anchor text, building codebase understanding incrementally by starting with Grep to find entry points then using Read to follow imports and trace flows rather than reading all files upfront, and tracing function usage across wrapper modules by first identifying all exported names then searching for each name across the codebase) -->

Les six outils intégrés sont ceux dont un agent dispose déjà avant qu'aucun
serveur MCP ne soit connecté, et le guide teste une chose à leur sujet : choisir
le bon. Deux paires font l'essentiel des questions.

| Tâche | Outil | Exemple |
|---|---|---|
| Trouver des fichiers par nom ou motif de chemin | **Glob** | `**/*.test.tsx`, `src/components/**/*.ts` |
| Chercher dans le contenu des fichiers | **Grep** | Un nom de fonction, un message d'erreur, une ligne d'import |
| Charger un fichier entier | **Read** | Lire un module avant de le modifier |
| Créer un fichier, ou en réécrire un entièrement | **Write** | Un nouveau fichier ; un remplacement complet |
| Modifier une partie d'un fichier existant | **Edit** | Remplacer un extrait identifié par une correspondance de texte unique |
| Exécuter une commande shell | **Bash** | `git`, `npm`, les tests, un build |

**Grep contre Glob** est la première paire, et le piège est que les deux sont
décrits comme « cherchant ». Glob n'ouvre jamais un fichier : il fait
correspondre des chemins. Grep se moque du nom de fichier : il fait correspondre
du contenu. « Trouve tous les fichiers de test du parcours de commande », c'est
Glob. « Trouve tous les appelants de `applyDiscount` », c'est Grep.

### Quand `Edit` échoue, `Read` + `Write` est le repli documenté

`Edit` fonctionne en faisant correspondre un texte qui doit être **unique dans
le fichier**. Quand l'ancre apparaît plus d'une fois, la modification est refusée
— délibérément, parce que l'outil ne peut pas savoir de quelle occurrence vous
parliez.

Le guide nomme le repli : **`Read` le fichier en entier, amender le contenu, et
le `Write` en retour.**

```text
# runbooks/db-failover.yaml — la ligne « owner: unassigned » apparaît 23 fois.
Edit(old_string="owner: unassigned", new_string="owner: sre-oncall")
  → refusé : l'ancre n'est pas unique.

# Repli
Read("runbooks/db-failover.yaml")        # le fichier entier, avec sa structure
→ amender la seule étape 14
Write("runbooks/db-failover.yaml", …)    # le fichier amendé, écrit en entier
```

La raison pour laquelle cela marche là où `Edit` ne pouvait pas, c'est que le
contenu complet porte la position que l'ancre ne savait pas exprimer : l'étape 14
est identifiable dans son contexte, même si son texte est identique à celui de
vingt-deux autres.

::: anti-pattern
**Relancer `Edit` avec la même ancre.** La correspondance est déterministe ; une
correspondance non unique ne devient pas unique à la deuxième tentative.

**Remplacer toutes les occurrences** pour passer outre l'échec. Cela change
vingt-trois lignes quand une seule était dans le périmètre, et cela ressemble à
un succès.
:::

### Construire la compréhension par incréments

La stratégie du guide pour un codebase inconnu est explicite, et sa valeur tient
autant au contexte qu'à la justesse : **commencer par Grep pour trouver les points
d'entrée, puis Read pour suivre les imports et tracer les flux, plutôt que de lire
tous les fichiers d'emblée.**

```text
1. Grep "createCheckoutSession"    → la définition, et trois sites d'appel
2. Read src/checkout/session.ts    → ce qu'elle fait, et ce qu'elle importe
3. Grep "from './session'"         → qui la consomme
4. Read les consommateurs          → comment elle est utilisée
5. Répéter jusqu'à ce que le flux soit complet
```

Tout lire d'abord remplit la fenêtre de contexte de fichiers qui se révèlent
sans rapport, et les fichiers pertinents entrent alors en concurrence d'attention
avec eux. Chaque Grep de la boucle ci-dessus est un filtre qui décide de ce qui
mérite un Read.

### Tracer une fonction à travers des modules d'enrobage

La dernière compétence est un échec précis de l'approche naïve, et elle vaut
d'être connue comme procédure. Un seul `Grep` sur un nom de fonction rate tous
les appels passant par un alias ou un ré-export.

```text
# Rate les appelants indirects
Grep "analyzeDocument"

# Deux passes, comme le guide les décrit
1. Grep "export.*analyzeDocument"   → trouver tous ses noms exportés
     export { analyzeDocument }
     export { analyzeDocument as analyze }
     export { analyzeDocument as docAnalyze }
2. Grep chacun de ces noms           → analyzeDocument, analyze, docAnalyze
                                     → tous les appelants sont maintenant trouvés
```

L'ordre est la substance : **identifier d'abord tous les noms exportés, puis
chercher chaque nom à travers le codebase.** Chercher le nom d'origine seul répond
à une question plus étroite que celle qui était posée.

::: exam-tip
Trois formulations, trois réponses. « Trouver des fichiers correspondant à un
motif de nom » → Glob. « Trouver où cette fonction est appelée » → Grep. « `Edit`
a échoué parce que le texte n'est pas unique » → Read puis Write.

Les distracteurs sont des voisins proches. Glob proposé pour une recherche de
contenu et Grep pour un motif de nom de fichier sont les deux moitiés de la même
confusion. `Bash` avec `find` ou `grep` atteint la réponse via une dépendance au
shell là où un outil intégré répond directement. Tout lire d'emblée est présenté
comme de la rigueur et c'est un épuisement du contexte. Et rendre la tâche à un
humain, alors que le repli documenté existe, n'achète rien.
:::

**À tester** — les questions de la banque étiquetées `data-task="2.5"`.
