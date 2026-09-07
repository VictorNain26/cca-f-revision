# D5 — Gestion du contexte et fiabilité (15 %)

<!-- src:exam guide domain 5 (the six task statements) ; 08agentsdk L4, L8, L11, L12, L14 ; 03subagents L1, L4 ; 06claudecode101 L6 ; 05claudeapi L16-L17, L20-L21 -->

Quinze pour cent du score, six task statements, et le domaine qui pose une
question différente des quatre précédents. D1 à D4 demandent comment construire
la chose : la boucle, les outils, la configuration, le prompt. D5 demande ce qui
est encore vrai après deux heures de fonctionnement : quels chiffres ont survécu
au résumeur, de quel échec de subagent le coordinateur a seulement entendu
parler, quelle affirmation du rapport final se laisse encore remonter jusqu'à la
page dont elle vient.

Une section par task statement, dans l'ordre du guide et sous le libellé du
guide, pour qu'une question rencontrée le jour J corresponde à une section d'ici
sans traduction.


<!-- cross-refs:start -->

Quatre cours renvoient à celui-ci, et les quatre dettes sont réglées
ci-dessous. **D0** a nommé les trois modes de défaillance d'une fenêtre de
contexte pleine — lost-in-the-middle, accumulation, compression progressive — et
s'est arrêté là : les parades sont en 5.1. **D1** a dit quand une règle exige une
application programmatique et a renvoyé la question de *quand escalader tout
court* en 5.2. **D2** a enseigné la forme d'une charge utile d'erreur —
`isError`, la catégorie, le drapeau de reprise, l'enveloppe des résultats
partiels — et a renvoyé ce que le coordinateur *fait* de cette enveloppe en 5.3.
**D3** a renvoyé `/compact` à ce domaine ; il relève de **5.4**, là où le guide
le place parmi les skills de l'exploration de grandes codebases.

Le trafic va aussi dans l'autre sens, et ce cours le respecte. L'anatomie de la
fenêtre de contexte appartient à D0. L'isolation d'un subagent et ce dont il
hérite relèvent des TS 1.2 et 1.3. Le mécanisme des hooks — les événements,
`PostToolUse`, `updatedToolOutput` — relève du TS 1.5. Les sessions, `--resume`
et `fork_session` relèvent du TS 1.7. La passation structurée à un humain relève
du TS 1.4. Chacune reçoit ici une phrase et un renvoi, jamais un second
développement.

<!-- cross-refs:end -->

## 5.1 — Manage conversation context to preserve critical information across long interactions
<!-- ts:5.1 | src:exam guide TS 5.1 (the knowledge: progressive summarization condensing numerical values, percentages, dates and customer-stated expectations into vague summaries; the lost-in-the-middle effect, where models process the beginning and end of long inputs reliably but may omit findings from middle sections; how tool results accumulate and consume tokens disproportionately to their relevance, with the 40+ fields per order lookup when only 5 are relevant; the importance of passing complete conversation history in subsequent API requests. The skills: extracting transactional facts — amounts, dates, order numbers, statuses — into a persistent case facts block included in each prompt outside summarized history; extracting and persisting structured issue data into a separate context layer for multi-issue sessions; trimming verbose tool outputs to only relevant fields before they accumulate; placing key findings summaries at the beginning of aggregated inputs and organizing detailed results with explicit section headers; requiring subagents to include metadata — dates, source locations, methodological context — in structured outputs; modifying upstream agents to return structured data — key facts, citations, relevance scores — instead of verbose content and reasoning chains when downstream agents have limited context budgets) ; 08agentsdk L11 (updatedToolOutput replaces a tool's output before Claude sees it, for any tool and in both SDKs — L11 documents that field for normalising heterogeneous formats under TS 1.5, and applying it to trimming is this course's deduction, not the source's: the guide's trimming skill names no mechanism) ; 06claudecode101 L6 (everything that enters the context window: prompts, file reads, tool calls and their results; automatic compaction summarises and can lose details) -->

Il y a vingt tours, le client a dit que la commande était à 89,99 $ et qu'il
voulait un remboursement intégral plutôt qu'un remplacement. L'historique a été
résumé deux fois depuis, et ce que le modèle lit désormais est *« un prix
promotionnel a été évoqué »*. Rien n'a échoué. Le résumeur a fait exactement ce
que font les résumeurs : il a gardé la forme de la conversation et laissé tomber
les détails précis.

C'est le premier des trois risques que le guide nomme, et les trois méritent
d'être tenus comme un ensemble parce que chacun a sa parade, et répondre avec la
mauvaise parade est la façon dont on rate ce task statement.

| Mode de défaillance | Ce qu'il détruit | La parade que ce task statement demande |
|---|---|---|
| **Compression progressive** | Valeurs numériques, pourcentages, dates, attentes formulées par le client | Un bloc de faits du dossier qui ne passe jamais par le résumeur |
| **Lost in the middle** | Les découvertes enfouies au milieu d'une entrée longue — le début et la fin sont lus de façon fiable | Les découvertes clés en tête, des en-têtes de section explicites sur le détail |
| **Accumulation des résultats d'outils** | Rien, mais elle consomme des tokens sans commune mesure avec sa pertinence | Réduire la sortie aux champs pertinents avant qu'elle n'entre dans le contexte |

D0 possède l'anatomie derrière ce tableau : pourquoi chaque requête renvoie tout
l'historique, et pourquoi un résultat d'outil est un coût récurrent et non
ponctuel. L'un des points de connaissance du guide pour ce task statement relève
de cette anatomie et mérite d'être redit en une ligne : **l'historique complet
de la conversation doit être passé dans chaque requête API suivante**, parce que
l'API ne stocke rien entre les appels et qu'un historique tronqué est un modèle
qui a réellement oublié.

### Le bloc de faits du dossier

La parade est structurelle, et tout son intérêt tient à *l'endroit* où elle vit.

```text
=== CASE FACTS (mis à jour à chaque nouveau fait établi) ===
Customer ID : CUST-12345
Order ID    : ORD-67890
Order date  : 2025-01-15
Amount      : $89.99
Issue       : Article arrivé endommagé
Request     : Remboursement intégral, remplacement refusé
Status      : En attente d'approbation
===

[l'historique de conversation résumé suit]
```

Le bloc est reconstruit dans **chaque** prompt et il se tient **en dehors** de
l'historique résumé. Le résumeur peut comprimer la conversation autant qu'il
veut ; ce n'est pas cela qu'il comprime. Les faits à extraire sont les faits
transactionnels que le guide nomme — montants, dates, numéros de commande,
statuts — parce que ce sont précisément les tokens qu'un résumé remplace par un
adjectif.

::: key-concept
**Une garantie structurelle, pas une demande.** Demander au résumeur de
« préserver tous les nombres et toutes les dates » vise le bon symptôme et repose
sur une conformité probabiliste, à chaque résumé et pour chaque fait. Garder les
faits hors de la région résumée ne repose sur rien : ils sont dans le prompt
parce que vous les y avez mis ce tour-ci.
:::

Pour une session qui couvre **plusieurs problèmes à la fois**, le guide demande
le même geste un cran plus haut : des données de problème structurées — numéros
de commande, montants, statuts — tenues dans une **couche de contexte séparée**,
pas dans un paragraphe de prose.

```json
{
  "case_facts": { "customer_id": "CUST-12345", "tier": "gold" },
  "issues": [
    { "id": "I-1", "order_id": "ORD-67890", "amount": "$89.99",
      "type": "damaged_item",  "status": "refund_pending" },
    { "id": "I-2", "order_id": "ORD-71204", "amount": "$24.50",
      "type": "late_delivery", "status": "credit_offered" },
    { "id": "I-3", "order_id": "ORD-71204", "amount": null,
      "type": "address_change", "status": "resolved" }
  ]
}
```

Trois problèmes, trois statuts, un seul client. Un récapitulatif en prose du même
matériau perd quel montant appartient à quelle commande dès la première
compression. Décomposer la *demande* en investigations parallèles relève du
TS 1.4 et vit en D1 ; ce que ce task statement ajoute, c'est la couche dans
laquelle leurs résultats sont réécrits.

### Réduire la sortie des outils avant qu'elle ne s'accumule

Le chiffre du guide lui-même : une consultation de commande retourne **plus de
40 champs quand 5 sont pertinents** pour la tâche en cours. Ces 40 champs ne
sont pas seulement présents une fois ; ils sont renvoyés à chaque requête
suivante pour tout le reste de la session.

```text
lookup_order(ORD-67890) →
  order_id, status, total, items, return_eligible        ← les 5 qui décident
  warehouse_route, carrier_scac, pick_wave, audit_flags,
  promo_ledger, tax_jurisdiction, … (35 autres)          ← payés à chaque tour suivant
```

Le skill consiste à réduire **avant** que le résultat n'entre dans le contexte,
c'est-à-dire entre le retour de l'outil et la lecture du modèle. **Le guide ne
nomme aucun mécanisme pour cela** : il énonce le skill et s'arrête là. Un
mécanisme se tient exactement dans cette fenêtre : un hook `PostToolUse`, dont
l'`updatedToolOutput` remplace la sortie d'un outil avant que Claude ne la voie.
La documentation du SDK présente ce champ pour un autre usage — normaliser des
formats hétérogènes, ce qui relève du TS 1.5 — et rien dans ce champ n'est
propre à la normalisation, donc il sert aussi celui-ci. La déduction est celle
de ce cours ; le champ et son moment d'exécution sont ceux de la documentation.

```python
async def trim_order_lookup(input_data, tool_use_id, context):
    if input_data["tool_name"] != "lookup_order":
        return {}
    full = input_data["tool_response"]
    keep = ("order_id", "status", "total", "items", "return_eligible")
    return {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "updatedToolOutput": {k: full[k] for k in keep if k in full},
        }
    }
```

La machinerie des hooks elle-même — les événements, les matchers, le contrat de
callback — relève du TS 1.5 et appartient à D1. Ce qui le rend adapté ici, c'est
l'ordre : `PostToolUse` s'exécute après le retour de l'outil et avant que le
modèle ne lise le résultat, ce qui est la seule fenêtre où réduire fait gagner
quelque chose. Un hook `PreToolUse` est trop tôt — le résultat n'existe pas
encore — et réduire après coup coûte les tokens que l'on cherchait à économiser.

Choisir ce qu'un outil retourne *en premier lieu* est une décision de conception
d'outil et appartient à D2.1, qui énonce la règle ainsi : **retourner du signal,
pas du remplissage**. Ce task statement est la réparation quand l'outil n'est pas
le vôtre.

### La position : ce qui va en tête, ce qui va au milieu

Pour une entrée agrégée longue — les découvertes de plusieurs subagents, un lot
de contenus de fichiers, une revue multi-documents — le guide demande deux
choses : un **résumé des découvertes clés au début**, et des **en-têtes de section
explicites** qui organisent les résultats détaillés.

```text
=== DÉCOUVERTES CLÉS ===
1. auth.ts — l'expiration du token n'est jamais vérifiée sur le chemin de refresh (critique)
2. database.ts — trois requêtes construites par concaténation de chaînes (critique)
3. upload.ts — le content-type est cru sur parole depuis le client (majeur)

=== RÉSULTATS DÉTAILLÉS ===
== auth.ts ==
…quarante lignes de détail…
== database.ts ==
…soixante lignes de détail…
== upload.ts ==
…trente lignes de détail…

=== ACTIONS REQUISES ===
Corriger auth.ts et database.ts avant le merge ; upload.ts peut suivre.
```

Le résumé en tête n'est pas une politesse envers un lecteur humain. C'est la
position où le modèle lit de façon fiable, et cela signifie que les découvertes
critiques sont lues même si une section du milieu ne l'est pas. Les en-têtes font
la seconde moitié du travail : ils donnent au milieu une structure par laquelle
être retrouvé, au lieu d'un mur plat où un paragraphe ressemble à tous les
autres.

### Ce que les agents en amont doivent envoyer en aval

Deux des skills du guide portent sur le format de sortie de l'*autre* agent, et
tous deux s'appliquent quand un agent en aval a un budget de contexte limité.

- **Exiger des métadonnées dans les sorties des subagents** — dates, localisations
  des sources, contexte méthodologique — pour que la synthèse en aval soit exacte
  et pas seulement fluide. Ce à quoi servent ces métadonnées relève du TS 5.6.

- **Modifier les agents en amont pour qu'ils retournent des données structurées** —
  faits clés, citations, scores de pertinence — au lieu de contenu verbeux et de
  chaînes de raisonnement.


```json
{
  "key_facts": [
    { "fact": "La fenêtre de retour est de 30 jours après livraison",
      "source": "policy/returns.md#L42", "as_of": "2025-01-04",
      "relevance": 0.95 }
  ],
  "citations": ["policy/returns.md", "policy/exceptions.md"],
  "coverage": ["retours standard"],
  "gaps": ["alignement sur les prix concurrents"]
}
```

Notez ce qui n'est *pas* dans cette charge utile : le raisonnement qui l'a
produite. Un agent en aval au budget serré a besoin des conclusions et de leur
provenance, pas du chemin qui y a mené.

::: exam-tip
Lisez le scénario pour savoir lequel des trois modes de défaillance il décrit,
parce que chacun a une réponse et que les deux autres sont fausses ici.

« Un montant exact évoqué plus tôt revient maintenant de façon vague » →
compression progressive → bloc de faits du dossier hors de l'historique résumé.
« Une découverte du milieu d'un long rapport a été ignorée » → position → résumé
en tête, en-têtes de section sur le détail. « La fenêtre se remplit de sorties
d'outils » → accumulation → réduire aux champs pertinents.

Les distracteurs du premier cas sont tous des tentatives de faire bien se tenir
la compression. **Passer à un modèle à fenêtre de contexte plus large** repousse
la limite sans rien protéger : une conversation assez longue atteint aussi la
nouvelle limite, et la même compression détruit les mêmes faits. **Compacter
moins souvent** est la même esquive formulée côté fréquence : cela change quand
les nombres sont détruits, pas si. **Demander au résumeur de garder chaque
nombre et chaque date** est le plus tentant parce qu'il nomme le bon symptôme,
et c'est une demande plutôt qu'une garantie.
:::

::: anti-pattern
**Jeter les tours les plus anciens pour faire de la place.** L'API ne stocke
rien : une requête qui embarque un historique tronqué est une requête où ces
tours n'ont jamais eu lieu. Faire glisser une fenêtre sur les messages n'est pas
de la gestion de contexte ; c'est de l'amnésie silencieuse, sans trace de ce qui
a été perdu.

**Résumer le résumé.** Chaque passe comprime ce que la passe précédente avait
gardé, et les détails précis partent en premier. Deux générations plus tard,
« le client a signalé un article endommagé à 89,99 $ le 15 janvier et a refusé un
remplacement » devient « le client avait un problème avec une commande ».
:::

**À tester** — les questions de la banque étiquetées `data-task="5.1"`.

## 5.2 — Design effective escalation and ambiguity resolution patterns
<!-- ts:5.2 | src:exam guide TS 5.2, written from the guide alone — no course PDF in the corpus covers escalation (the knowledge: appropriate escalation triggers, namely customer requests for a human, policy exceptions or gaps rather than merely complex cases, and inability to make meaningful progress; the distinction between escalating immediately when a customer explicitly demands it and offering to resolve when the issue is straightforward; why sentiment-based escalation and self-reported confidence scores are unreliable proxies for actual case complexity; how multiple customer matches require clarification through additional identifiers rather than heuristic selection. The skills: adding explicit escalation criteria with few-shot examples to the system prompt demonstrating when to escalate versus resolve autonomously; honoring explicit customer requests for human agents immediately without first attempting investigation; acknowledging frustration while offering resolution when the issue is within the agent's capability, escalating only if the customer reiterates their preference; escalating when policy is ambiguous or silent on the customer's specific request, with competitor price matching against a policy that only addresses own-site adjustments as the example; instructing the agent to ask for additional identifiers when tool results return multiple matches rather than selecting based on heuristics) -->

Une politique d'escalade échoue dans deux directions, et les deux coûtent cher.
Escaladez trop volontiers et une file se remplit de cas que l'agent aurait pu
clore. Escaladez trop rarement et l'agent s'acharne sur un cas qu'il n'a jamais
été équipé pour résoudre, produisant une mauvaise réponse ou un client épuisé. Le
task statement porte sur l'endroit où passe la ligne, et — c'est la partie qui est
testée — sur les signaux autorisés à la déplacer.

### Les déclencheurs que le guide accepte

| Situation | Ce que fait l'agent |
|---|---|
| Le client demande explicitement un humain | Escalader **immédiatement**, sans tenter d'investiguer d'abord |
| La politique est muette ou ambiguë sur cette demande précise — une lacune ou une exception | Escalader : personne n'a délégué cette décision à l'agent |
| L'agent ne parvient plus à progresser réellement | Escalader après une tentative raisonnable |
| Une consultation retourne **plusieurs correspondances** pour le client | Ne pas escalader et ne pas deviner : demander un identifiant supplémentaire |

Deux de ces quatre méritent leur propre phrase, parce que le libellé du guide est
précis et que les quasi-réponses sont la matière des distracteurs.

**Une lacune de politique n'est pas la même chose qu'un cas complexe.**
L'exemple du guide lui-même : le client demande l'alignement sur le prix d'un
concurrent, et la politique tarifaire ne traite que les ajustements de prix sur
votre propre site. La demande n'est pas difficile, puisque aligner un prix,
c'est un appel d'outil. Elle est *non tranchée*. Rien dans la politique ne
l'autorise et rien ne l'interdit, donc l'accorder serait l'agent en train
d'inventer la politique commerciale. C'est cela, le déclencheur, et « le cas
était complexe » ne l'est pas.

**Plusieurs correspondances sont une ambiguïté, pas une escalade.** Trois
sociétés partagent un nom commercial ; la parade est de demander un numéro de
contrat ou un domaine de facturation. Choisir le compte le plus récemment actif
est une heuristique déguisée en raisonnement, et agir sur le contrat de la
mauvaise société est exactement l'échec que les vérifications d'identité existent
pour empêcher.

### Les déclencheurs que le guide rejette

| Proxy | Pourquoi il échoue |
|---|---|
| **Le sentiment** — escalader quand le message se lit comme de la colère | L'humeur ne corrèle pas avec la complexité du cas. Un client furieux peut avoir un problème d'un seul appel d'outil, et un client courtois un problème insoluble |
| **La confiance auto-déclarée** — le modèle note sa propre certitude et escalade sous un seuil | La note est l'introspection du modèle sur un cas qu'il a peut-être mal lu, et elle est la plus haute exactement là où il se trompe avec assurance |

La confiance auto-déclarée revient en 5.5 comme une partie de la *bonne* réponse,
sous une autre forme et pour un autre usage. La distinction y est posée, et il
vaut la peine de lire les deux sections l'une contre l'autre une fois.

::: key-concept
**Trois déclencheurs, et une ambiguïté n'en fait pas partie.** Le guide accepte
qu'un client demande un humain, qu'il y ait une lacune ou une exception dans la
politique, et l'incapacité à progresser réellement : les trois sont vérifiables
sans interroger le modèle. Le ton et la confiance auto-déclarée sont rejetés
parce qu'ils estiment la difficulté d'un cas, et la difficulté n'a jamais été un
déclencheur ; l'exemple de l'alignement de prix tient en un appel d'outil, et il
escalade parce que la politique n'a rien tranché. Une consultation qui retourne
plusieurs correspondances est le cas à garder à part : elle appelle un
identifiant discriminant, pas un humain.
:::

### Les trois comportements, et celui qui est testé

Le guide sépare l'escalade immédiate de la proposition de résoudre, et la
séparation tient à ce que le client a réellement dit.

```text
# Demande explicite d'un humain
« Je veux parler à un responsable. »
→ appeler escalate_to_human() maintenant. Pas d'investigation d'abord.

# Frustration, aucune demande d'humain
« C'est scandaleux, je suis très mécontent ! »
→ reconnaître la frustration, proposer la résolution que vous pouvez donner,
  escalader seulement si le client réitère sa préférence pour un humain.

# Problème simple, dans le périmètre d'autorité de l'agent
« Mon colis a trois jours de retard. »
→ le résoudre. Proposer une passation que personne n'a demandée transforme un
  cas clôturable en file d'attente.
```

Le cas du milieu est celui autour duquel l'examen construit ses scénarios, parce
qu'il ressemble au premier. « C'est scandaleux » est un énoncé de ressenti, pas
une demande d'humain. Le reconnaître coûte une phrase ; escalader dessus coûte
l'après-midi d'un être humain et laisse le client attendre un correctif que
l'agent pouvait appliquer tout de suite. Et la porte de sortie est dans la même
règle : si le client *réitère*, il a maintenant demandé, et le premier déclencheur
s'applique.

### Comment la politique entre dans l'agent

Le premier skill du guide nomme les deux moitiés et aucune ne fonctionne seule :
des **critères d'escalade explicites** *avec* des **exemples few-shot** dans le
system prompt.

```text
# Critères d'escalade
Escalader immédiatement quand le client demande un humain, quelle qu'en soit la
formulation.
Escalader quand cette politique ne couvre pas la demande, y compris les demandes
qu'elle n'autorise ni n'interdit.
Escalader quand trois tentatives de résolution n'ont produit aucun progrès.
Ne jamais escalader sur le ton seul. Ne jamais deviner entre plusieurs comptes
correspondants — demander un numéro de contrat ou un domaine de facturation.

# Exemples
Client : « Passez-moi un responsable. »
Action : escalate_to_human(reason="explicit request")
Pourquoi : demande explicite d'un humain. Ne pas investiguer d'abord.

Client : « C'est scandaleux, j'attends depuis une semaine ! »
Action : reconnaître, puis proposer le geste commercial de livraison auquel vous
         êtes autorisé.
Pourquoi : la frustration n'est pas une demande d'humain. N'escalader que s'il en
           demande ensuite un.

Client : « Alignez-vous sur le prix trouvé chez un concurrent. »
Action : escalate_to_human(reason="policy gap: competitor pricing")
Pourquoi : la politique ne couvre que nos propres ajustements de prix. Le silence
           n'est pas une autorisation.
```

Les critères portent la règle ; les exemples portent son application aux cas où
la règle est ambiguë, ce qui est toute la raison pour laquelle un critère avait
besoin d'exemples. Les critères seuls laissent « est-ce une lacune de
politique ? » à trancher de nouveau à chaque tour. Les exemples seuls
généralisent de trois cas vers une politique que personne n'a écrite.

Quand l'agent escalade effectivement en cours de traitement, ce qu'il remet à
l'humain — identité du client, cause racine, montant, action recommandée, dans un
résumé qui tient sans le transcript — est la **passation structurée**, testée au
TS 1.4 et développée en D1.4.

::: exam-tip
Le scénario vous dit quel déclencheur s'est allumé ; la formulation du message
du client est toute la question.

« Je veux un responsable » → escalader maintenant, et *pas* « investiguer
d'abord, puis escalader si besoin ». Cette réponse a l'air consciencieuse et
elle fait attendre, à travers une investigation qu'il n'a pas voulue, un client
qui a déjà demandé. « C'est scandaleux » → reconnaître, résoudre, escalader sur
réitération. « La politique ne traite pas ce cas » → escalader, et non
« appliquer la règle analogue la plus proche ». « Trois clients correspondent »
→ demander un autre identifiant, et non « prendre le plus probable ».

Les mauvaises réponses récurrentes sont celles qui sonnent comme de la mesure :
un score de sentiment, un seuil de confiance auto-déclarée, un classifieur
entraîné qui exigerait des données d'escalade étiquetées dont personne ne
dispose. Chacune remplace une règle énoncée par une règle inférée.
:::

::: anti-pattern
**Investiguer d'abord alors qu'un humain a été explicitement demandé.** Le libellé
du guide est « immédiatement, sans tenter d'investiguer d'abord ». Une
investigation consciencieuse avant d'honorer la demande reste un refus de
l'honorer.

**Escalader parce que le cas est complexe.** La complexité n'est pas sur la
liste. Le silence de la politique, si. Un agent qui escalade sur la difficulté
escalade sur son propre malaise, ce qui est le proxy de la confiance en soi sous
un autre chapeau.
:::

**À tester** — les questions de la banque étiquetées `data-task="5.2"`.

## 5.3 — Implement error propagation strategies across multi-agent systems
<!-- ts:5.3 | src:exam guide TS 5.3 (the knowledge: structured error context — failure type, attempted query, partial results, alternative approaches — as what enables intelligent coordinator recovery decisions; the distinction between access failures needing retry decisions and valid empty results; why generic error statuses such as "search unavailable" hide valuable context from the coordinator; why silently suppressing errors by returning empty results as success and terminating entire workflows on a single failure are both anti-patterns. The skills: returning structured error context to enable coordinator recovery; distinguishing access failures from valid empty results in error reporting; having subagents implement local recovery for transient failures and only propagate what they cannot resolve, including what was attempted and partial results; structuring synthesis output with coverage annotations indicating which findings are well-supported and which topic areas have gaps due to unavailable sources) ; 08agentsdk L14 (local recovery in the subagent for transient failures and propagation to the coordinator of what cannot be resolved locally, with partial results and what was attempted; the coordinator continuing on partial results and annotating uncovered areas; the access-failure against valid-empty-result distinction) ; 08agentsdk L4 (an API error that interrupts a subagent — a rate limit, for instance — is never delivered as its result) -->

Un subagent de recherche tombe en timeout sur sa troisième requête. Ce que le
coordinateur fait ensuite — réessayer, resserrer la requête, tenter une autre
source, ou continuer en notant la lacune — dépend entièrement de ce qui est
revenu. Si ce qui est revenu est `"search unavailable"`, chacune de ces options
est une devinette.

C'est le task statement en une phrase : **la charge utile d'erreur est l'entrée
de décision du coordinateur**, et une erreur qui ne porte aucun contexte lui a
retiré la capacité de récupérer intelligemment tout en ayant l'air d'une
ingénierie saine.

### Les quatre choses que porte une erreur propagée

Le guide les nomme, et les quatre correspondent une à une à des décisions :

```json
{
  "status": "partial_failure",
  "failure_type": "timeout",
  "attempted_query": "AI impact on music industry 2024",
  "partial_results": [
    { "title": "AI Music Generation Report", "url": "https://…", "relevance": 0.8 }
  ],
  "alternative_approaches": [
    "Requête plus resserrée : 'AI music composition tools'",
    "Autre type de source : publications d'associations professionnelles"
  ],
  "coverage_impact": "Non couvert : l'effet de l'IA sur les workflows de production musicale"
}
```

- `failure_type` — cet appel vaut-il seulement la peine d'être réessayé ?

- `attempted_query` — pour que le budget de reprise ne soit pas dépensé deux fois
  sur le même appel.

- `partial_results` — ce qui existe déjà et ne doit pas être jeté.

- `alternative_approaches` — ce qui, selon le subagent qui y était, pourrait marcher à
  la place.


Réduisez ces quatre-là à `{"status": "error", "message": "search unavailable"}` et
le coordinateur réessaie à l'aveugle, relance une requête déjà lancée, jette des
découvertes qu'il détenait déjà, et ne peut pas dire au lecteur quelle part du
sujet est restée non couverte.

::: key-concept
**Deux cours, une erreur, deux moitiés.** D2.2 possède la *forme* d'une erreur
d'outil — le drapeau MCP `isError`, `errorCategory`, `isRetryable`, la phrase
adressée au client — et énonce le fait qui compte pour les deux : ces noms de
champs sont une convention applicative placée dans le contenu du résultat, pas des
champs du protocole MCP. Cette section-ci possède la suite : ce qu'un subagent
propage vers le haut, et ce que le coordinateur en fait.
:::

### Un échec d'accès n'est pas un résultat vide

La distinction que le guide énonce le plus nettement, et celle qu'un scénario
cachera derrière une formule commune comme « pas de données » :

| Cas de figure | Ce que cela signifie | Le geste du coordinateur |
|---|---|---|
| Timeout de connexion, erreur de passerelle, échec d'authentification | **Échec d'accès** — la question n'a jamais reçu de réponse | Décider d'un retry ; si cela persiste, propager et annoter |
| `0 results` pour une requête qui a bien tourné | **Résultat vide valide** — la question a reçu une réponse, et la réponse est « aucun » | L'accepter comme une découverte, et l'enregistrer comme couverture |

Les deux sont opposées par le sens et identiques d'apparence dès lors que les
deux sont rapportées comme « pas de données ». Les rapporter de la même façon
est la manière dont un coordinateur conclut qu'un ingénieur n'a aucune
certification alors que le système de badges a simplement omis de répondre : une
découverte fausse, produite avec pleine confiance, à partir d'une erreur qui n'a
jamais été remontée.

### Récupérer localement, propager ce que vous ne pouvez pas résoudre

Le partage des rôles du guide : **les subagents implémentent la récupération
locale des échecs transitoires, et ne propagent que ce qu'ils ne peuvent pas
résoudre**, avec ce qui a été tenté et les résultats partiels éventuels
attachés.

```python
async def search_topic(query: str):
    partial, attempts = [], []
    for attempt in range(3):
        try:
            return {"status": "ok", "results": await search(query)}
        except TransientError as e:              # récupéré localement, jamais propagé
            attempts.append({"query": query, "error": str(e)})
            await backoff(attempt)
        except QuotaExceeded as e:               # ne peut pas être résolu ici
            return {
                "status": "partial_failure",
                "failure_type": "quota_exceeded",
                "attempted_query": query,
                "attempts": attempts,
                "partial_results": partial,
                "alternative_approaches": ["Utiliser le corpus en cache pour ce sous-thème"],
            }
    return {
        "status": "partial_failure",
        "failure_type": "timeout",
        "attempted_query": query,
        "attempts": attempts,
        "partial_results": partial,
        "alternative_approaches": ["Requête resserrée", "Autre type de source"],
    }
```

Deux moitiés, et l'examen teste la frontière entre elles. Réessayer une erreur
réseau transitoire à l'intérieur du subagent est juste ; un coordinateur n'a pas
besoin d'arbitrer un hoquet. Réessayer avec un backoff exponentiel *puis*
rapporter `"search unavailable"` est l'anti-pattern déguisé en bonne
ingénierie : la récupération était bonne, le rapport a détruit tout ce dont le
coordinateur avait besoin.

Une conséquence à connaître, parce qu'elle met en échec tout le dispositif : une
erreur d'API qui interrompt un subagent — une limite de débit, par exemple —
**n'est jamais délivrée comme résultat de ce subagent**. Il n'y a rien à
structurer, puisque rien ne revient. Les découvertes qu'un subagent avait
accumulées avant d'être coupé ne survivent que si elles ont été écrites quelque
part hors de son contexte ; le scratchpad et les fichiers d'état de 5.4 sont ce
quelque part.

### Les trois anti-patterns que le guide nomme

| Anti-pattern | Ce qu'il coûte au coordinateur | À la place |
|---|---|---|
| **Statut générique** — `"search unavailable"` | Toute décision de récupération, puisque aucune des quatre entrées n'a survécu | Retourner le type d'échec, la requête tentée, les résultats partiels, les alternatives |
| **Suppression silencieuse** — attraper l'erreur et retourner un résultat vide en succès | Le coordinateur conclut « rien n'existe » là où l'accès a échoué, et aucune récupération n'est même tentée | Distinguer l'échec d'accès du résultat vide valide |
| **Abandonner tout le workflow** sur un seul échec | Tous les résultats de toutes les autres branches, jetés pour une branche en défaut | Continuer sur les résultats partiels, annoter la lacune |

Les retries infinis dans un subagent sont un vrai défaut — latence et budget
gaspillé — mais ils ne figurent pas sur la liste des trois du guide. Ne les
comptez pas parmi eux.

### Les annotations de couverture dans la synthèse

Le dernier skill boucle la boucle. Une synthèse construite à partir d'entrées
incomplètes doit le dire, dans la sortie, section par section : **quelles
découvertes sont bien étayées, et quels domaines du sujet ont des lacunes parce
qu'une source était indisponible.**

```text
L'IA dans les industries créatives

Art visuel — COUVERTURE COMPLÈTE
  Trois sources indépendantes, aucun conflit.

Musique — COUVERTURE PARTIELLE
  Le subagent de recherche est tombé en timeout sur les workflows de production ;
  la composition et la distribution sont couvertes. Traiter les chiffres de
  production comme non vérifiés.

Littérature — NON COUVERT
  Base de données des éditeurs injoignable (échec d'authentification, 3
  tentatives). Aucune découverte.
```

Un rapport qui se lit comme complet alors qu'il repose sur deux branches sur
trois est pire qu'un rapport qui se lit comme partiel, parce que sur les deux, un
seul peut être suivi sans risque.

::: exam-tip
Demandez-vous ce que le coordinateur peut encore décider après avoir lu la charge
utile. C'est toute la question, et elle trie les options rapidement.

Les distracteurs sont ceux qui ont l'air responsables. **Backoff exponentiel, puis
statut générique** — c'est la logique de reprise que l'on juge, alors que c'est le
rapport qui est testé. **Attraper le timeout et retourner un succès vide** — le
workflow ne casse pas, et le coordinateur tire une conclusion fausse. **Propager
à un handler global qui termine l'exécution** — net, et cela jette les résultats
de toutes les autres branches. **Agréger les échecs en un pourcentage de
couverture global** — une métrique lisible qui détruit exactement la distinction
que le domaine teste, puisqu'un échec d'accès et un résultat vide valide
deviennent indiscernables une fois moyennés.
:::

::: anti-pattern
**Rapporter une consultation restée sans réponse comme une découverte.**
« Aucune certification au dossier » et « le système de certification n'a pas
répondu » deviennent la même phrase, et la seconde vient de produire une
conclusion sur une personne.

**Laisser les résultats partiels mourir avec le contexte du subagent.** Ils ont
été payés. S'ils ne sont ni dans la charge utile ni dans un fichier, ils
n'existent plus.
:::

**À tester** — les questions de la banque étiquetées `data-task="5.3"`.

## 5.4 — Manage context effectively in large codebase exploration
<!-- ts:5.4 | src:exam guide TS 5.4 (the knowledge: context degradation in extended sessions, where models start giving inconsistent answers and referencing "typical patterns" rather than specific classes discovered earlier; the role of scratchpad files for persisting key findings across context boundaries; subagent delegation for isolating verbose exploration output while the main agent coordinates high-level understanding; structured state persistence for crash recovery, where each agent exports state to a known location and the coordinator loads a manifest on resume. The skills: spawning subagents to investigate specific questions such as "find all test files" or "trace refund flow dependencies" while the main agent preserves high-level coordination; having agents maintain scratchpad files recording key findings and referencing them for subsequent questions; summarizing key findings from one exploration phase before spawning sub-agents for the next phase and injecting summaries into initial context; designing crash recovery using structured agent state exports — manifests — that the coordinator loads on resume and injects into agent prompts; using /compact to reduce context usage during extended exploration sessions when context fills with verbose discovery output) ; 06claudecode101 L6 (automatic compaction near the limit and its risk of losing details, /compact compacting everything up to that point, /clear starting from scratch, /context reporting what fills the window, subagents running with a separate context window and returning only a summary) ; 03subagents L1 (each subagent runs in its own context window, intermediate reads and searches stay isolated, only a summary returns, the whole subagent conversation is then discarded, and the trade-off is lost visibility into how it got there), L4 (research and exploration as the case subagents are for, the decision rule "does the intermediate work matter", and the pipeline anti-pattern when each step depends on the previous step's discoveries) ; 08agentsdk L8 (starting a fresh session with a structured summary injected is more robust than resuming with stale tool results; capturing the results you need as application state and passing them into a new session's prompt) -->

Deux heures après le début d'un audit d'un module d'inventaire legacy, on demande
à l'agent comment la réconciliation de stock est déclenchée et il répond que « les
jobs de réconciliation suivent en général le pattern observateur » — alors qu'il a
lu `StockLedgerSync` et tracé ses trois appelants une heure plus tôt.

Cette phrase est le diagnostic. Le guide décrit le symptôme avec précision :
**des réponses incohérentes, et des références à des « patterns typiques »
plutôt qu'aux classes précises découvertes plus tôt**. Le modèle a cessé de
répondre depuis la codebase et s'est mis à répondre depuis le cas général, parce
que les éléments précis ne sont plus exploitables dans son contexte. Aucune
instruction ne corrige cela. On ne peut pas demander à un agent de se souvenir
de ce qu'il ne détient plus.

### Les fichiers scratchpad

La première parade est un fichier. L'agent y consigne ses découvertes clés, et les
relit quand une question ultérieure en a besoin.

```text
investigation-scratchpad.md

Découvertes clés
- StockLedgerSync — src/inventory/sync.ts, hérite de BaseReconciler
- reconcile() est appelé depuis trois endroits : AdminPanel, NightlyCron, WebhookHandler
- L'API externe WarehouseAPI est limitée à 100 req/min
- La migration 47 a ajouté ledger_reason NOT NULL — 2024-12-01

Questions ouvertes
- WebhookHandler réessaie-t-il sur un 429 ? (pas encore lu)
```

Le fichier n'est pas un transcript. Archiver la conversation brute sur disque
déplace les mêmes 120 tours ailleurs et laisse les découvertes tout aussi
enfouies qu'avant. Un scratchpad contient ce que quelqu'un a déjà distillé, ce qui
est exactement la forme sous laquelle une relecture ultérieure vaut ses tokens.

Le même fichier gagne sa place une seconde fois, et 5.3 a nommé le cas : les
découvertes qu'un subagent avait accumulées avant d'échouer survivent dans le
scratchpad quand son contexte, lui, ne survit pas.

### La délégation aux subagents

La seconde parade consiste à ne pas mettre du tout le matériau verbeux dans le
contexte principal. Un subagent tourne dans **sa propre fenêtre de contexte** ;
ses lectures de fichiers, ses recherches et ses appels d'outils y restent, et
seul son résumé revient. Le reste de sa conversation est jeté.

```text
Agent principal : « Trace toutes les dépendances du flux de remboursement et
                   rapporte les modules qu'il touche, une ligne chacun. »
Subagent Explore (contexte propre) : lit 15 fichiers, lance 6 greps, suit 3 imports
Retourne : « flux de remboursement → PaymentProcessor, LedgerWriter,
            NotificationQueue ; externe : StripeGateway. Point d'entrée :
            RefundController.submit(). »

Coût pour le contexte principal : deux lignes au lieu de quinze fichiers.
```

Les exemples du guide sur ce qu'il faut déléguer sont des questions étroites et
répondables — « trouver tous les fichiers de test », « tracer les dépendances du
flux de remboursement » — pendant que l'**agent principal préserve la
coordination de haut niveau**. La règle de décision, qui relève du territoire de
D1, s'applique inchangée : déléguer quand vous voulez le résultat et non le
trajet ; garder dans le thread principal quand chaque étape dépend de ce que
l'étape précédente a trouvé, parce que la passation est l'endroit où cette
dépendance casse.

**Et résumez entre les phases.** Le skill est facile à sauter et le guide
l'énonce explicitement : avant de lancer les subagents de la phase suivante,
résumer les découvertes clés de la phase en cours et **injecter ce résumé dans
leur contexte initial**. Un subagent n'hérite de rien (TS 1.3) : ni de
l'historique du parent, ni des découvertes de la phase précédente. Sans le
résumé injecté, la phase deux redécouvre ce que la phase un savait déjà, ou
pire, la contredit sans le savoir.

### `/compact`, et ce qu'il ne promet pas

C'est le renvoi que D3 devait à ce domaine, et le guide le place ici : **utiliser
`/compact` pour réduire l'usage du contexte pendant les sessions d'exploration
prolongées, quand le contexte se remplit de sorties de découverte verbeuses.**

| Commande | Ce qu'elle fait |
|---|---|
| `/compact` | Compacte tout jusqu'à ce point : résume ce qui compte, retire les résultats d'outils inutiles |
| `/clear` | Repart de zéro, sans mémoire de la session — pour une nouvelle fonctionnalité, pas pour continuer celle-ci |
| `/context` | Indique la taille actuelle du contexte et les catégories qui le remplissent |

Claude Code compacte aussi automatiquement à mesure que la fenêtre approche de sa
limite. Les deux chemins portent la même réserve, et c'est la raison pour laquelle
`/compact` ne tient jamais seul comme réponse : **la compaction peut perdre des
détails**. Elle achète de la place ; elle ne promet pas qu'une ligne donnée
survive. Une contrainte qui doit tenir au tour 200 — un erratum, un rail auquel
personne ne doit toucher — a sa place dans un bloc épinglé ou un scratchpad, hors
de ce que la compaction peut réécrire. La compaction pour le budget, la
persistance pour ce qui ne doit pas être dilué : deux problèmes, deux mécanismes,
et une question qui décrit les deux demande les deux.

### Reprise après crash : exports d'état et manifeste

Pour un workflow multi-agents long, le guide demande quelque chose de plus fort
que des notes : **chaque agent exporte son état vers un emplacement connu, et le
coordinateur charge un manifeste à la reprise** et l'injecte dans les prompts des
agents.

```json
// agent-state/web-search.json
{
  "status": "completed",
  "queries_executed": ["AI music 2024", "AI music composition"],
  "results_count": 12,
  "key_findings": ["La musique générée par IA a crû de 300 % sur les plateformes de streaming en 2024"],
  "coverage": ["composition", "production"],
  "gaps": ["distribution", "licensing"]
}
```

```json
// agent-state/manifest.json
{
  "web-search":   "completed",
  "doc-analysis": "in_progress",
  "synthesis":    "not_started"
}
```

Au redémarrage, le coordinateur lit le manifeste, constate que la recherche est
terminée et que l'analyse a été interrompue, et reprend sans relancer le travail
déjà fait. Le manifeste porte l'état du workflow ; le fichier de chaque agent
porte ses découvertes, sa couverture et ses lacunes.

C'est un mécanisme différent du scratchpad, et les confondre est une erreur bon
marché : un scratchpad contrecarre la *dégradation* à l'intérieur de la session
d'un agent, un manifeste survit à un *crash* à l'échelle d'un workflow. La
documentation du SDK pointe dans le même sens pour les sessions en général, où
capturer les résultats dont vous avez besoin comme état applicatif et les passer
dans le prompt d'une session neuve est plus robuste que de reprendre une session
dont les résultats d'outils ont vieilli. La reprise de session elle-même,
`--resume` et `fork_session`, relève du TS 1.7 et vit en D1.

::: key-concept
**Quatre mécanismes, quatre rôles différents.** La délégation empêche la sortie
verbeuse d'entrer dans le contexte principal. Un scratchpad ramène des
découvertes distillées une fois que le contexte ne peut plus les tenir. `/compact`
achète du budget et ne garantit rien en particulier. Un manifeste d'état survit à
un processus mort. Un scénario décrit en général l'un des quatre ; les mauvaises
réponses sont les trois autres.
:::

::: exam-tip
« L'agent cite des patterns typiques au lieu des classes qu'il a lues » est la
formule signature de la dégradation du contexte, et la réponse est un scratchpad
qu'il relit, la délégation de la découverte verbeuse, ou les deux.

Les distracteurs visent chacun le symptôme. **Redémarrer dans une session
propre** supprime la dégradation en jetant l'investigation, et la même session
longue la reproduit puisque rien n'a été rendu persistant. **Augmenter
`max_tokens`** confond deux budgets : ce paramètre borne la longueur de la
réponse générée, pas ce que l'agent détient encore en entrée. **Dire à l'agent
de se concentrer sur le code réel et de citer ses sources** lui décrit le
symptôme, et aucune instruction ne restaure une information qui n'est plus
exploitable.
:::

::: anti-pattern
**Déléguer une étape dont le travail intermédiaire vous est nécessaire.** Un
subagent lanceur de tests qui retourne « les tests ont échoué » cache la sortie
dont vous avez besoin pour déboguer, et un pipeline séquentiel où chaque agent
dépend des découvertes du précédent perd de l'information à chaque passation.
L'isolation n'est gratuite que quand le trajet n'a vraiment aucun intérêt.

**Traiter `/compact` comme la réponse entière.** Il est bien sur la liste des
skills de ce task statement, et c'est celui qui ne garantit rien sur un fait
donné.
:::

**À tester** — les questions de la banque étiquetées `data-task="5.4"`.

## 5.5 — Design human review workflows and confidence calibration
<!-- ts:5.5 | src:exam guide TS 5.5, whose two central notions have no course source in this corpus — stratified random sampling and field-level confidence calibration are written from the guide alone (the knowledge: the risk that aggregate accuracy metrics such as 97% overall may mask poor performance on specific document types or fields; stratified random sampling for measuring error rates in high-confidence extractions and detecting novel error patterns; field-level confidence scores calibrated using labeled validation sets for routing review attention; the importance of validating accuracy by document type and field segment before automating high-confidence extractions. The skills: implementing stratified random sampling of high-confidence extractions for ongoing error rate measurement and novel pattern detection; analyzing accuracy by document type and field to verify consistent performance across all segments before reducing human review; having models output field-level confidence scores then calibrating review thresholds using labeled validation sets; routing extractions with low model confidence or ambiguous or contradictory source documents to human review, prioritizing limited reviewer capacity) ; 05claudeapi L16 (measuring a prompt against expected answers rather than testing it once or twice, and why limited testing breaks on inputs nobody anticipated), L17 (the eval workflow: a dataset of representative inputs, run, grade, and the average score across the dataset as the headline metric), L20 (code, model and human graders, and what each is suited to) — these lessons supply the labeled-dataset and grading machinery only -->

Un pipeline d'extraction affiche **97 % d'exactitude globale**, et l'équipe des
opérations propose de couper la relecture humaine sur les extractions à haute
confiance. Creusez le chiffre : les factures scannées sont à 60 %, tandis que le
champ du numéro de TVA est faux 40 % du temps.

Rien dans ces 97 % n'est faux. C'est une moyenne sur une population, et une
moyenne masque la structure par construction, ce qui est le premier point de
connaissance du guide et le piège sur lequel tout ce task statement est bâti.

Ce task statement pose deux questions séparées, et les confondre est la façon dont
ses distracteurs fonctionnent :

- **Comment mesurez-vous le taux d'erreur réel ?** → l'échantillonnage aléatoire
  stratifié, et l'exactitude ventilée par type de document et par champ.

- **Où dépensez-vous une capacité de relecture qui sera toujours plus petite que le
  volume ?** → des scores de confiance par champ, avec des seuils calibrés sur un
  jeu de validation étiqueté.


### Mesurer : des segments, pas une moyenne

Avant de réduire la relecture humaine, le guide demande une exactitude **analysée
par type de document et par champ**, et une constance vérifiée **sur tous les
segments**.

```text
Global : 97,0 %          ← le chiffre qui a autorisé la proposition

Par type de document          Par champ
  PDF natif        99,1 %       invoice_number  98,7 %
  photographié     94,2 %       total           97,9 %
  scanné           60,3 %  ←    date            96,4 %
  manuscrit        71,8 %  ←    vat_number      59,8 %  ←
```

Deux segments portent presque toute l'erreur, et les deux sont invisibles dans le
chiffre de tête. L'ordre compte autant que l'analyse : **valider par segment avant
d'automatiser**, pas après. Automatiser d'abord et mesurer ensuite, c'est faire
arriver la mesure par les réclamations clients.

L'**échantillonnage aléatoire stratifié** est ce qui garde la mesure honnête une
fois l'automatisation en marche. L'échantillon est tiré **à l'intérieur de
chaque segment** plutôt que sur la population entière, parce qu'un tirage
aléatoire simple dans une population dominée par les PDF natifs ne contiendra
presque aucun formulaire manuscrit, précisément le segment qui échoue. Le guide
lui donne deux rôles : mesurer le **taux d'erreur des extractions à haute
confiance**, et **détecter les patterns d'erreur nouveaux**, ceux qu'aucune
règle existante n'attrape, et qui par définition ne peuvent pas être trouvés en
regardant là où l'on sait déjà regarder.

```text
Volume quotidien 9 000 → tirer 40 dans chaque strate, pas 200 sur l'ensemble
  PDF natif      6 300 → 40 tirés
  photographié   1 900 → 40 tirés
  scanné           600 → 40 tirés   ← environ 13 dans un tirage à plat
  manuscrit        200 → 40 tirés   ← environ 4
```

### Router : la confiance par champ, calibrée

La seconde question porte sur une file d'attente. Deux relecteurs ne peuvent pas
lire neuf mille extractions ; la question est donc de savoir lesquelles ils lisent.

La réponse du guide est un score de confiance **par champ**, pas par document.

```json
{
  "invoice_number": { "value": "INV-2024-0912", "confidence": 0.98 },
  "total":          { "value": 1249.90,         "confidence": 0.95 },
  "vat_number":     { "value": "FR32-XXXXX",    "confidence": 0.41 }
}
```

Seul `vat_number` part vers un humain. Un score unique pour le document ferait une
moyenne de 0,78 sur les trois, et soit mettrait en file un document dont les deux
autres champs n'ont jamais fait de doute, soit — avec un seuil à 0,75 — laisserait
passer l'ensemble avec un mauvais numéro de TVA dedans. C'est de nouveau le
problème des 97 %, transposé de la mesure au routage.

**Et le seuil se calibre, il ne se choisit pas.** Un score de confiance brut ne
veut rien dire tant qu'il n'a pas été confronté à la vérité terrain : prendre un
**jeu de validation étiqueté**, mesurer le taux d'erreur réel à chaque niveau de
confiance, et poser le seuil là où le risque résiduel devient acceptable. Sans
cela, `confidence > 0.9` est un nombre dont l'allure a plu à quelqu'un.

```text
Jeu de validation étiqueté — 2 000 champs vérifiés à la main
  confiance ≥ 0,95   taux d'erreur 0,4 %    → automatiser
  0,85 – 0,95        taux d'erreur 3,1 %    → automatiser si 3 % est tolérable ici
  0,70 – 0,85        taux d'erreur 11 %     → relire
  < 0,70             taux d'erreur 34 %     → relire
```

Le matériau d'évaluation de ce corpus fournit la machinerie autour de ce jeu et
rien de plus : un jeu de données d'entrées représentatives, des correcteurs — code,
modèle ou humain — et un score moyen comme métrique de tête. Construire le jeu
étiqueté et y passer un correcteur, c'est le même workflow. La stratification et
la calibration par champ ci-dessus viennent du guide.

Deux choses passent en priorité dans la file de relecture, et le guide nomme les
deux : la **faible confiance du modèle**, et les **documents sources ambigus ou
contradictoires**, c'est-à-dire deux totaux qui divergent, une date illisible,
un champ raturé. La seconde ne dépend pas du tout de l'avis du modèle ; c'est
une propriété de l'entrée.

::: key-concept
**Les deux visages de la confiance, et pourquoi ce n'est pas une contradiction.**
En 5.2, un score de confiance auto-déclaré est un déclencheur d'escalade peu
fiable. Ici, un score de confiance est le bon mécanisme de routage. Trois
différences les séparent : la **granularité** — par champ, pas par cas ; la
**calibration** — contre des données étiquetées à la main, pas contre
l'introspection du modèle ; et l'**usage** — ordonner une file de relecture, pas
prendre la décision à la place de l'humain. Une option qui mentionne la confiance
n'est donc ni automatiquement juste ni automatiquement fausse. Lisez laquelle des
deux elle propose.
:::

::: exam-tip
« 97 % au global » dans un scénario est l'indice, et la réponse est toujours :
ventiler par type de document et par champ, et confirmer la constance dans
chaque segment *avant* de réduire la relecture.

Les distracteurs se rangent en deux familles. Contre la mesure : **comparer les
trimestres jusqu'à ce que l'agrégat paraisse stable** — quatre trimestres d'un
agrégat ne révèlent aucune structure ; **ne relire que les types de documents
qui ont déjà produit des réclamations** — un signal tardif, puisque l'erreur est
arrivée chez le client, et biaisé, puisque seules les erreurs visibles
reviennent.

Contre le routage : **un score de confiance par document**, qui est de nouveau
le problème de l'agrégat ; **le modèle qui note sa propre certitude de 1 à 10**,
qui est la version non calibrée et ne correspond à aucun taux d'erreur connu ;
**échantillonner une part fixe au hasard et relire celle-là**, ce qui est une
confusion d'usage, puisque l'échantillonnage stratifié mesure un taux d'erreur
et détecte des patterns nouveaux, et n'alloue pas une capacité rare là où est le
risque.
:::

::: anti-pattern
**Automatiser d'abord, mesurer ensuite.** Le libellé du guide est « avant
d'automatiser les extractions à haute confiance ». Un pipeline dont l'exactitude
par segment est découverte après le retrait de la relecture humaine mesure avec la
production.

**Un seuil de confiance jamais confronté à des données étiquetées.** Le nombre est
arbitraire, et le taux d'automatisation qu'il produit est une coïncidence.
:::

**À tester** — les questions de la banque étiquetées `data-task="5.5"`.

## 5.6 — Preserve information provenance and handle uncertainty in multi-source synthesis
<!-- ts:5.6 | src:exam guide TS 5.6, written from the guide alone apart from the subagent-output mechanism (the knowledge: how source attribution is lost during summarization steps when findings are compressed without preserving claim-source mappings; the importance of structured claim-source mappings that the synthesis agent must preserve and merge when combining findings; how to handle conflicting statistics from credible sources by annotating conflicts with source attribution rather than arbitrarily selecting one value; temporal data, where publication or collection dates in structured outputs prevent temporal differences from being misinterpreted as contradictions. The skills: requiring subagents to output structured claim-source mappings — source URLs, document names, relevant excerpts — that downstream agents preserve through synthesis; structuring reports with explicit sections distinguishing well-established findings from contested ones, preserving original source characterizations and methodological context; completing document analysis with conflicting values included and explicitly annotated, letting the coordinator decide how to reconcile before passing to synthesis; requiring subagents to include publication or data collection dates in structured outputs; rendering different content types appropriately in synthesis outputs — financial data as tables, news as prose, technical findings as structured lists — rather than converting everything to a uniform format) ; 08agentsdk L4 (the only content passed from parent to subagent is the prompt string of the Agent call, so anything the subagent must return has to be required there; a structured format separating content from metadata — source URL, document name, page number, publication date — is what preserves attribution through synthesis) -->

Le rapport final dit : *« Le marché de la musique IA est estimé à 3,2 milliards
de dollars. »* D'où cela vient-il ? Quel rapport, de quelle année, mesurant quoi ?
Personne ne peut plus le dire — et un décideur qui ne peut pas vérifier un chiffre
ne peut pas l'utiliser.

Le diagnostic du guide est précis sur *l'endroit* où l'attribution s'est perdue :
**elle disparaît pendant les étapes de résumé, quand les découvertes sont
comprimées sans que les mappings affirmation-source soient préservés.** Pas
pendant la collecte. Le subagent de recherche avait l'URL. Quelque part entre lui
et le lecteur, une étape a comprimé la découverte et n'a gardé que la phrase.

### Le mapping affirmation-source

La parade consiste à faire du mapping une partie de la donnée, pour que la
compression n'ait rien à laisser tomber sans laisser tomber l'affirmation
elle-même.

```json
{
  "claim": "Le marché de la musique IA a atteint 3,2 Mds $ en 2024",
  "source_url": "https://example.com/ai-music-report-2024",
  "source_name": "Global AI Music Report 2024",
  "excerpt": "The AI music market reached $3.2B in 2024",
  "publication_date": "2024-06-15",
  "methodology": "Agrégation des revenus fournisseurs, 41 entreprises"
}
```

Deux points de conception font que cela survit au pipeline :

- **Ce sont les subagents qui le produisent, pas l'agent de synthèse.** Quand
  l'agent de synthèse voit un paragraphe de prose, l'URL a déjà disparu ; il ne peut
  pas rattacher ce qu'il n'a jamais reçu.

- **L'agent de synthèse doit préserver et fusionner les mappings**, ce qui est une
  exigence énoncée dans son prompt, pas un espoir. Dans l'Agent SDK, le point est
  structurel : un subagent n'hérite de rien d'autre que la chaîne de prompt de
  l'appel qui l'a lancé, donc un format qui sépare le contenu des métadonnées — URL
  source, nom du document, numéro de page, date de publication — doit y être exigé,
  sans quoi il n'arrivera pas.


::: key-concept
**La provenance se préserve, elle ne se restaure jamais.** L'URL, la date et la
méthodologie n'existent que dans l'étape qui a lu la source, si bien que tout
remède agissant après la compression demande à un agent de reconstruire ce qu'il
n'a jamais reçu : une passe finale qui « ajoute les citations », un agent de
synthèse chargé d'attacher les sources lui-même. C'est pourquoi l'exigence
retombe sur le prompt du subagent et sur l'obligation de l'agent de synthèse de
faire passer les mappings. Dans un scénario, trouvez l'étape où l'attribution
existait encore ; les mauvaises réponses agissent toutes en aval de celle-ci.
:::

### Valeurs contradictoires : annoter, ne pas choisir

Deux sources crédibles donnent des chiffres différents pour la même grandeur.
L'instruction du guide est nette : **annoter le conflit avec l'attribution des
sources plutôt que de sélectionner arbitrairement une valeur.**

```json
{
  "claim": "Part de la musique générée par IA sur le streaming",
  "values": [
    { "value": "12%", "source": "Spotify Annual Report",
      "date": "2024-03", "methodology": "Classification automatisée" },
    { "value": "8%",  "source": "Music Industry Association Survey",
      "date": "2024-07", "methodology": "Enquête auprès de 500 labels" }
  ],
  "conflict_detected": true,
  "possible_explanation": "Méthodologies et périodes de collecte différentes"
}
```

Les méthodologies expliquent l'essentiel de l'écart : un classifieur automatique
sur un catalogue et une enquête déclarative auprès de labels ne mesurent pas tout
à fait la même chose. Cette explication n'existe que parce que la méthodologie a
voyagé avec la valeur.

La même règle s'applique un étage plus tôt, et le guide l'énonce comme un skill de
l'agent d'analyse : **terminer l'analyse du document avec les deux valeurs
incluses et explicitement annotées, et laisser le coordinateur décider comment les
réconcilier** avant que quoi que ce soit n'atteigne la synthèse. Un agent
d'analyse qui désigne un gagnant a pris une décision qui ne lui revenait pas,
silencieusement, dans une étape que personne ne relit.

### Les dates transforment une fausse contradiction en tendance

Le quatrième point de connaissance du guide est la correction la moins chère du
domaine : exiger les **dates de publication ou de collecte** dans les sorties
structurées.

```text
Sans dates : « La source A dit 10 %, la source B dit 15 %. Les sources se
             contredisent. »
Avec dates : « Source A (2023) : 10 %. Source B (2024) : 15 %.
             Cohérent avec une croissance sur un an — pas une contradiction. »
```

Les deux mêmes chiffres, une lecture inverse. Des chiffres sans date fabriquent
des contradictions à partir de séries temporelles, et le rapport signale alors un
conflit qui n'existe pas, ou jette une mesure valide pour le résoudre.

### La forme du rapport

Annoter un conflit ne sert à rien si l'annotation est enfouie dans un mur de
prose. Le guide demande des **sections explicites qui distinguent les découvertes
bien établies des découvertes contestées**, en conservant la **formulation
d'origine de chaque source et son contexte méthodologique** plutôt qu'en
réécrivant tout le monde dans une voix unique et aplatie.

```text
DÉCOUVERTES BIEN ÉTABLIES
- L'IA générative est utilisée en production chez les quatre majors
  (3 sources concordantes : Billboard 2024-05, MIA 2024-07, dépôts des labels 2024-T2)

DÉCOUVERTES CONTESTÉES
- Part de la musique générée par IA sur le streaming : 12 % (Spotify,
  classification automatisée, 2024-03) contre 8 % (MIA, enquête déclarative,
  2024-07). Les méthodologies ne sont pas comparables ; les deux valeurs sont
  conservées.

LACUNES DE COUVERTURE
- Distribution et licensing : non couverts (timeout du subagent de recherche)
```

La troisième section est l'annotation de couverture de 5.3, arrivant dans le même
document. La provenance et la couverture répondent à la même question du lecteur
par deux côtés : sur quoi ceci repose-t-il, et que lui manque-t-il.

### Rendre chaque type de contenu dans sa forme propre

Le dernier skill porte sur le format de sortie, et c'est celui qui prend les
gens de court parce que rien en amont n'est cassé quand il se déclenche. Un
agent de synthèse reçoit du matériau hétérogène et est tenté de tout couler dans
une seule forme, de la prose en général, parce que la prose est le défaut.

| Type de contenu | Rendu en | Pourquoi |
|---|---|---|
| Données financières, séries chiffrées | **Tableaux** | La comparaison colonne par colonne est le geste de lecture que la donnée appelle ; la prose la rend impossible |
| Actualités, événements, contexte | **Prose** | La chronologie et la causalité se disent en phrases, pas en cellules |
| Résultats techniques | **Listes structurées** | Chaque élément se tient seul et doit rester citable et vérifiable séparément |

Douze valeurs trimestrielles à l'intérieur d'un paragraphe sont justes, sourcées
et inexploitables.

::: exam-tip
Quand un scénario reproche à un rapport de synthèse d'être **difficile à
exploiter** alors que le contenu est exact et bien sourcé, ne cherchez pas en
amont : les subagents ont fait leur travail. Le défaut est le rendu uniforme à
l'étape de synthèse, et la correction consiste à instruire l'agent de synthèse
de rendre chaque type de contenu dans sa forme propre.

Quand le reproche est que les **affirmations ne peuvent pas être tracées**,
regardez l'étape de résumé au milieu, et exigez des mappings affirmation-source
structurés que les agents en aval préservent, pas une passe finale demandant à
l'agent de synthèse d'« ajouter les citations », ce qui revient à lui demander
de reconstituer des URL qu'il n'a plus.

Sur les statistiques contradictoires, trois mauvaises réponses reviennent :
**garder le chiffre le plus récent** (la récence est un départage arbitraire qui
supprime une preuve valide), **faire la moyenne des deux** (fabriquer un nombre
qu'aucune source ne rapporte), et **écarter la statistique** (appauvrir le
rapport au lieu de qualifier l'incertitude).
:::

::: anti-pattern
**Laisser l'agent de synthèse être le premier endroit où l'attribution compte.**
Toutes les étapes avant lui ont comprimé ; l'URL était perdue bien avant celle-ci.

**Réconcilier un conflit à l'intérieur d'un subagent.** Le travail de l'agent
d'analyse est de rapporter les deux valeurs avec leur attribution, annotées.
Choisir entre elles est la décision du coordinateur, et elle devrait être
visible.
:::

**À tester** — les questions de la banque étiquetées `data-task="5.6"`.
