# D4 — Prompt engineering et sorties structurées (20 %)

<!-- src:exam guide domain 4 (the six task statements) ; 05claudeapi L25-L28, L34-L36 ; 09apicomplements L2-L9 ; 01claudecodeinaction L8 ; 06claudecode101 L7 -->

Vingt pour cent du score, six task statements, et le domaine où l'examen cesse
de demander ce qu'est un mécanisme pour demander ce que vous écrivez dans un
prompt, un schéma et un pipeline. Une section par task statement, dans l'ordre
du guide et sous le libellé du guide — pour qu'une question repérée le jour J
corresponde à une section d'ici sans traduction.

<!-- cross-refs:start -->

D0 est supposé acquis. Il a nommé l'anatomie d'un outil — `name`, `description`,
`input_schema` —, le bloc `tool_use` et `stop_reason`. Il s'est arrêté là
délibérément et a renvoyé ici, deux fois : **`tool_choice` et l'usage d'un JSON
Schema pour forcer une charge utile conforme s'enseignent en 4.3**, en entier,
et D1 diffère le même couple au même endroit. Cette dette est payée ci-dessous.

Le guide place les notions voisines ailleurs, et ce cours le respecte. Quelle
formulation fait choisir le bon outil parmi plusieurs semblables relève du tool
design, testé en TS 2.1 et 2.5 ; la boucle agentique qui transforme un bloc
`tool_use` en conversation est le TS 1.1 de D1 ; faire tourner un relecteur dans
un pipeline est le TS 3.6 de D3, qui applique ce que 4.6 explique. Chacune
reçoit ici une phrase et un renvoi, jamais un second développement.

<!-- cross-refs:end -->

## 4.1 — Design prompts with explicit criteria to improve precision and reduce false positives
<!-- ts:4.1 | src:exam guide TS 4.1 (explicit criteria over vague instructions and its comment-versus-code example, why "be conservative" and "only report high-confidence findings" fail against specific categorical criteria, a high false positive rate in one category undermining confidence in the accurate ones; the skills: criteria that say what to report and what to skip rather than confidence-based filtering, temporarily disabling a high false-positive category while its prompt is improved, explicit severity criteria with a concrete code example per level) ; 05claudeapi L25 (replacing a vague request with a direct statement of the task) ; L26 (being specific: listing the guidelines the output must satisfy instead of leaving them to interpretation) -->

Un relecteur automatique signale un pattern le lundi et approuve le même pattern
le jeudi. Rien n'a changé dans le code, rien n'a changé dans le prompt. Ce qui a
changé, c'est que « être prudent sur les migrations risquées » n'a aucun sens
fixe : chaque exécution réinvente le seuil.

Le remède que nomme le guide n'est pas un meilleur adjectif. Ce sont des
**critères catégoriels explicites** : des conditions nommées, chacune vérifiable
à la main. L'exemple du guide lui-même est la paire à mémoriser : « flag
comments only when claimed behavior contradicts actual code behavior », contre
« check that comments are accurate ».

```text
# Vague — la version qui produit un verdict différent à chaque exécution
Check code comments for accuracy. Be conservative — report only
high-confidence findings.

# Critères explicites — la version qui produit deux fois le même verdict
Flag a comment ONLY IF one of these holds:
  1. It describes behaviour that contradicts what the code does.
  2. It refers to a function or variable that does not exist.
  3. A TODO or FIXME refers to a bug already fixed in the code.

DO NOT flag:
  - dated phrasing or style that does not contradict the code;
  - imprecise wording that is still consistent with the code;
  - missing comments (a separate category, reported separately).

For each finding, output: file:line, which condition matched, the quoted
comment, and the code fragment that contradicts it.
```

Les deux moitiés portent autant l'une que l'autre. Des critères qui disent
seulement quoi signaler laissent tout le reste à l'inférence ; c'est la **liste
de ce qu'il faut ignorer** qui empêche un relecteur de dériver vers le style
mineur et les conventions locales.

::: key-concept
**« Be conservative » et « only report high-confidence findings » n'améliorent
pas la précision.** Le guide l'énonce sans réserve, et la raison mérite d'être
tenue : ces instructions demandent au modèle de déplacer un seuil dont vous
n'avez aucune échelle commune. La « confiance » n'est pas une propriété sur
laquelle vous et le modèle vous accordez comme vous vous accordez sur « le
commentaire nomme une fonction qui n'existe pas ».

Un curseur de confiance filtre ; un critère catégoriel décide. Seul le second
produit deux fois la même réponse.
:::

### Des critères de severity qui classent de la même façon

Le troisième skill du guide porte sur la severity, et il demande deux choses :
des critères explicites pour chaque niveau, **et un exemple de code concret par
niveau**. La définition seule laisse « medium » au goût de chacun ; l'exemple
travaillé le fixe.

```text
CRITICAL — échoue à l'exécution pour les utilisateurs.
  Exemple : payment_total = order.get("total") + order["tip"]   # KeyError s'il n'y a pas de tip
HIGH — vulnérabilité de sécurité.
  Exemple : db.execute("SELECT * FROM users WHERE id = " + user_id)
MEDIUM — bug de logique sans panne immédiate.
  Exemple : for i in range(len(items) - 1):   # le dernier élément n'est jamais traité
LOW — qualité de code seulement.
  Exemple : le même bloc de six lignes dupliqué dans trois handlers.
```

### Pourquoi une mauvaise catégorie empoisonne les bonnes

Le point de connaissance du guide sur les faux positifs est une affirmation sur
les gens, pas sur les modèles : **un taux élevé de faux positifs dans une
catégorie érode aussi la confiance des développeurs dans les catégories
justes.** Une fois que le bot a crié au loup trois fois sur des conventions de
nommage, son vrai signalement d'injection SQL est parcouru du même œil.

C'est ce qui rend le remède du guide contre-intuitif et digne d'être retenu :
**désactiver temporairement la catégorie à fort taux de faux positifs**, laisser
tourner les catégories précises, améliorer le prompt de celle qui est
désactivée, et la réactiver une fois ses critères devenus spécifiques. Relire
moins, volontairement, c'est ainsi que le reste de la sortie continue d'être lu.

::: exam-tip
Deux signatures, deux réponses.

Des verdicts qui varient d'une exécution à l'autre sur une entrée identique →
remplacer l'adjectif par des conditions nommées. Des développeurs qui ignorent
l'outil → chercher l'unique catégorie bruyante et la couper le temps de
réécrire son prompt.

Les distracteurs sont les suites plausibles, et chacun laisse le critère
indéfini. Ajouter « be conservative », « only high-confidence findings » ou un
seuil numérique de confiance règle un curseur que personne n'a calibré. Lancer
le contrôle deux fois et garder ce sur quoi les deux exécutions s'accordent
intersecte deux verdicts instables et supprime de vrais signalements. Restreindre
le périmètre à moins de fichiers réduit le volume sans rendre cohérente une
seule des décisions restantes. Et passer à un modèle plus gros répond à un
problème de spécification par de la capacité.
:::

::: anti-pattern
**Couper tout le relecteur parce qu'une catégorie est bruyante.** Le geste du
guide est chirurgical : les catégories justes gardent leur valeur et continuent
d'être lues. Le silence vous coûte les signalements qui étaient corrects.

**Écrire des critères que vous ne pouvez pas vérifier.** « Signaler tout ce qui
pourrait dérouter un futur mainteneur » n'est catégorique que par la forme. Si
vous ne pouvez pas trancher vous-même à partir de la règle, le modèle non plus.
:::

**À tester** — les questions de la banque étiquetées `data-task="4.1"`.

## 4.2 — Apply few-shot prompting to improve output consistency and quality
<!-- ts:4.2 | src:exam guide TS 4.2 (few-shot examples as the most effective technique when detailed instructions alone still produce inconsistent output, their role in demonstrating ambiguous-case handling, generalisation to novel patterns rather than matching pre-specified cases, hallucination reduction in extraction with informal measurements and varied document structures; the skills: 2-4 targeted examples showing why one action was chosen over plausible alternatives, examples demonstrating the location/issue/severity/suggested-fix output format, examples distinguishing acceptable code patterns from genuine issues, examples covering inline citations versus bibliographies, examples addressing empty or null extraction of required fields) ; 05claudeapi L28 (one-shot and multi-shot prompting, examples for corner cases and complex output formats, sample_input and ideal_output wrapped in XML tags, and explaining why an example output is good rather than only showing it) ; L27 (XML tags as delimiters for interpolated content, descriptive tag names over generic ones) -->

Les critères explicites règlent ce qu'il faut signaler, et ils laissent une
seconde défaillance intacte : les critères sont écrits, ils sont détaillés, et
la sortie revient malgré tout sous une forme différente à chaque exécution, ou
revient vide sur le cas que personne n'avait pensé à énumérer.

La réponse du guide est sans ambiguïté, et c'est la formule à reconnaître dans
une option : **les few-shot examples sont la technique la plus efficace pour une
sortie cohérente et actionnable quand des instructions détaillées produisent
encore des résultats inconsistants.** Un exemple, c'est du one-shot prompting ;
plusieurs, du multi-shot.

Deux à quatre, c'est le compte du guide lui-même, et les exemples sont ciblés :
ils montrent les cas **ambigus**, pas les faciles. Chacun porte le raisonnement
qui explique pourquoi cette action a été choisie plutôt qu'une alternative
plausible, parce que c'est le raisonnement qui se transfère.

```text
<examples>
  <example>
    <request>My order is broken</request>
    <action>get_customer, puis lookup_order, puis vérifier le statut</action>
    <rationale>« Broken » peut désigner un article endommagé comme une
    livraison ratée. Les détails tranchent : les recueillir avant de router
    vers quoi que ce soit.</rationale>
  </example>
  <example>
    <request>Get me a manager</request>
    <action>escalate_to_human, immédiatement</action>
    <rationale>Le client demande explicitement une personne. Tenter d'abord
    une résolution passe outre une préférence énoncée.</rationale>
  </example>
</examples>
```

Les balises XML sont une habitude du cours et elles se justifient ici : les
exemples sont du contenu interpolé posé à côté des instructions, et des
délimiteurs descriptifs — `<sample_input>`, `<ideal_output>`, `<examples>` —
sont ce qui empêche le modèle de lire un exemple comme une requête.

::: key-concept
**Les exemples généralisent ; les listes énumèrent.** Le guide écrit que les
few-shot examples permettent au modèle de « generalize judgment to novel
patterns rather than matching only pre-specified cases », et c'est toute la
raison pour laquelle ils battent un règlement plus long. Deux exemples de mesure
informelle — « two handfuls », « a splash » — enseignent la conversion ; une
table de correspondance des formulations informelles couvre exactement celles
qui y figurent, et l'import suivant en apporte une nouvelle.

C'est aussi pourquoi le raisonnement compte plus que la réponse. Un exemple qui
ne montre que la sortie enseigne une correspondance. Un exemple qui montre
pourquoi enseigne une règle.
:::

### Les quatre rôles que le guide leur donne

| Rôle | Ce que les exemples montrent |
|---|---|
| Cas ambigus | Quelle action a été prise, et pourquoi pas l'alternative plausible |
| Format de sortie | Un enregistrement rempli : location, issue, severity, suggested fix |
| Acceptable contre vrai problème | Un pattern à ne pas signaler, à côté d'un pattern à signaler |
| Structures de documents variées | Le même fait extrait d'une citation inline puis d'une entrée bibliographique |

Les deux derniers sont ceux qu'on oublie, et chacun répond à une défaillance
précise.

**Acceptable contre vrai problème** est le levier anti-faux-positifs de 4.1 vu
de l'autre côté : plutôt que d'énumérer tous les patterns bénins, en montrer un
bénin et un vrai, et laisser la distinction se généraliser.

```json
{"location": "src/auth/login.ts:42",
 "issue": "Injection SQL dans le paramètre username",
 "severity": "critical",
 "suggested_fix": "Utiliser une requête paramétrée"}
```

**Les structures de documents variées** sont le cas d'extraction du guide. Un
taux rapporté par `the rate is 42% (Smith, 2023)` et le même taux rapporté par
`The rate is 42%. [1]` avec une bibliographie en fin de document sont un seul
fait sous deux formes, et un modèle à qui on n'a montré que la première renvoie
`null` sur la seconde. Le guide nomme ce symptôme directement : les exemples
sont ce qui traite l'**extraction vide ou nulle de champs requis** sur des
documents dont le format varie.

::: exam-tip
Deux signaux dans l'énoncé, réunis, désignent cette réponse : **les instructions
sont déjà détaillées** et la sortie reste inconsistante, et le modèle doit
trancher des cas que personne n'a listés à l'avance. Le few-shot est le seul
levier qui enseigne une distinction au lieu d'énumérer des instances.

Les distracteurs sont tous des suites qui sonnent raisonnable. Réécrire les
instructions plus fermement répète ce que l'énoncé dit avoir déjà échoué.
Maintenir une liste blanche ou une table de correspondance des patterns acceptés
couvre ce qui y figure et rien d'autre, et l'énoncé dit en général que de
nouvelles formulations continuent d'arriver. Post-traiter la sortie avec un
filtre ne peut pas reconstruire une décision que le modèle n'a jamais prise.
Baisser la sensibilité supprime les vrais positifs au même rythme que les faux.
Et écarter les entrées difficiles vers un traitement manuel achète la
correction en refusant de faire le travail.
:::

::: anti-pattern
**Vingt exemples du cas facile.** La variable n'est pas le volume, c'est le
ciblage. Deux à quatre exemples visant les cas réellement ambigus l'emportent
sur une page d'exemples que le modèle traite déjà.

**Des exemples qui montrent la sortie sans le raisonnement.** Ils fixent le
format et n'enseignent rien de transférable : la première formulation inédite
ramène au point de départ.
:::

**À tester** — les questions de la banque étiquetées `data-task="4.2"`.

## 4.3 — Enforce structured output using tool use and JSON schemas
<!-- ts:4.3 | src:exam guide TS 4.3 (tool use with JSON schemas as the most reliable approach to guaranteed schema-compliant output and the elimination of JSON syntax errors, the distinction between tool_choice "auto", "any" and a forced named tool, strict schemas not preventing semantic errors, required versus optional fields and the enum plus "other" and detail-string pattern; the skills: defining an extraction tool and reading the structured data from the tool_use response, "any" when several extraction schemas exist and the document type is unknown, forcing extract_metadata before enrichment steps, nullable fields so the model does not fabricate values, "unclear" enum values, and format normalization rules in the prompt alongside a strict output schema) ; 09apicomplements L5 (the four tool_choice values including "none", the absence of a natural-language explanation before the call under "any" or a forced tool, and manual extended thinking supporting only auto and none) ; L3 (the supported JSON Schema subset and the constraints silently dropped, nullable written as type: ["string", "null"], the enum plus "other" escape hatch, structured outputs being incompatible with message prefilling) ; L2 (field nuance: output_config.format and strict tool use exist on the platform today) ; 05claudeapi L34 (a tool is name, description and input_schema) ; L35 (the tool_use block carries an id, the tool name and the input dictionary) -->
<!-- owns:tool-choice -->

Demandez du JSON en prose et vous obtenez du JSON la plupart du temps : une
virgule en trop ici, un bloc de code entouré de backticks là, un champ renommé
au troisième document. La réponse du guide est un mécanisme plutôt qu'une
formulation, et il l'énonce sans nuance : **le tool use avec des JSON Schemas
est l'approche la plus fiable pour une sortie structurée garantie conforme au
schéma, et il élimine les erreurs de syntaxe JSON.**

Le geste est une petite inversion. Vous déclarez un outil dont l'`input_schema`
est la forme que vous voulez *en sortie*, vous forcez le modèle à l'appeler, et
vous lisez l'extraction dans l'`input` de l'appel. **L'outil n'est jamais
exécuté.** Il n'a d'autre raison d'être que d'être un schéma que le modèle doit
remplir.

```json
{
  "tools": [{
    "name": "extract_invoice",
    "description": "Enregistre les champs extraits d'un document de facture.",
    "input_schema": {
      "type": "object",
      "properties": {
        "invoice_number": { "type": "string" },
        "issue_date":     { "type": "string", "description": "ISO 8601, YYYY-MM-DD" },
        "total":          { "type": "number" },
        "company_name":   { "type": ["string", "null"] },
        "document_kind":  { "enum": ["invoice", "credit_note", "other", "unclear"] },
        "kind_detail":    { "type": ["string", "null"] }
      },
      "required": ["invoice_number", "total", "document_kind"]
    }
  }],
  "tool_choice": { "type": "tool", "name": "extract_invoice" }
}
```

La réponse porte `stop_reason: "tool_use"` et un bloc `tool_use` dont l'`input`
*est* votre enregistrement. Aucune prose à parser, aucune passe de réparation :

```json
{ "type": "tool_use", "id": "toolu_01A", "name": "extract_invoice",
  "input": { "invoice_number": "INV-2024-0912", "issue_date": "2024-09-12",
             "total": 1249.90, "company_name": null,
             "document_kind": "invoice", "kind_detail": null } }
```

### Le paramètre `tool_choice`

C'est le champ que D0 et D1 ont tous deux différé jusqu'ici. Il décide si
l'appel d'un outil est facultatif, obligatoire, ou obligatoire et nommé.

| Valeur | Comportement | À choisir quand |
|---|---|---|
| `{"type": "auto"}` | Défaut. Le modèle décide, et peut répondre en texte | L'outil n'est pas toujours pertinent |
| `{"type": "any"}` | Le modèle **doit** appeler un outil, et choisit lequel | Plusieurs schémas d'extraction existent et vous ignorez le type de document |
| `{"type": "tool", "name": "extract_metadata"}` | Le modèle doit appeler **cet** outil | Un schéma est obligatoire, ou une extraction doit précéder les autres |
| `{"type": "none"}` | Aucun outil ne peut être appelé | Vous voulez de la prose alors que des outils sont déclarés |

Les deux usages que le guide nomme méritent d'être mémorisés comme des
scénarios, parce que c'est ainsi qu'ils sont examinés. **`any`** est la réponse
quand un pipeline reçoit factures, bons de commande et bons de livraison par la
même porte : vous avez un schéma pour chacun, vous ne pouvez pas dire à l'avance
lequel s'applique, et ce que vous ne pouvez pas vous permettre est une réponse
conversationnelle au lieu d'un appel. **Un outil forcé par son nom** est la
réponse quand l'ordre compte : `extract_metadata` doit tourner en premier, et
les étapes d'enrichissement viennent aux tours suivants.

::: key-concept
Un comportement de terrain qui découle du fait de forcer l'appel : sous `any` ou
sous un outil forcé, le modèle ne produit pas d'explication en langage naturel
avant l'appel. Si vous voulez à la fois le raisonnement et l'appel, restez en
`auto` et demandez l'outil dans le prompt : « use the `extract_invoice` tool in
your response ».

Seconde contrainte, même famille : avec l'extended thinking activé manuellement,
seuls `auto` et `none` sont supportés.
:::

### Concevoir le schéma pour qu'il n'invite pas à l'invention

Un schéma est un contrat, et un contrat mal rédigé fait de la fabrication la
réponse conforme.

| Règle | Écrite comme | Pourquoi |
|---|---|---|
| Optionnel veut dire optionnel | Laisser le champ hors de `required` | Un champ requis que la source ne porte pas force le modèle à choisir entre casser le schéma et inventer une valeur |
| Nullable | `"type": ["string", "null"]` | L'absence a besoin d'une représentation, sinon un don revient avec un prix plausible |
| `enum` + `"other"` + détail | `"enum": [..., "other"]` plus un champ de texte libre | Un enum fermé produit une catégorie fausse plutôt que l'aveu qu'aucune ne convient |
| `"unclear"` | Une valeur d'enum à part entière | Permet au modèle de dire que le document ne tranche pas |

Le dernier skill du guide sur ce task statement est facile à sauter et peu
coûteux à appliquer : **les règles de normalisation de format vont dans le
prompt, à côté du schéma strict.** Le schéma dit qu'un champ est une chaîne ;
seul le prompt peut dire laquelle.

```text
Normaliser avant de remplir le schéma :
  dates        → ISO 8601 (YYYY-MM-DD) ; résoudre « yesterday » en date absolue
  montants     → valeur numérique plus un code ISO 4217 séparé ; « five bucks » → 5, USD
  pourcentages → fraction décimale ; « half » → 0.5
  absent       → null, jamais un espace réservé, jamais une supposition
```

::: key-concept
**Le guide fait loi ici.** Son TS 4.3 teste le `tool_use` avec un JSON Schema et
`tool_choice`. Si une option nomme `output_config.format` ou
`client.messages.parse()`, ce n'est pas la réponse attendue à cet examen. Le
même verdict frappe le préremplissage du message assistant couplé à une stop
sequence : le cours API l'enseigne comme voie vers la sortie structurée, et la
liste hors-scope de ce corpus l'écarte au motif de ce task statement. Cette
section est la promesse que cette entrée engage. Il est de surcroît incompatible
avec le mécanisme plus récent décrit ci-dessous : les deux ne se combinent donc
jamais en pratique non plus.

Nuance de terrain, pour ne pas être surpris en production : la plateforme porte
désormais un mécanisme dédié de sorties JSON (`output_config.format`, et
`messages.parse()` avec un modèle Pydantic dans le SDK Python) qui contraint le
texte de la réponse, plus `strict: true` sur un outil, qui contraint les
arguments d'outil par un échantillonnage contraint par grammaire plutôt que par
adhérence. Même but, surfaces plus récentes, absentes du guide.

Sur cette voie stricte, la plateforme n'accepte qu'un sous-ensemble de JSON
Schema, et ce qu'il faut en rapporter au tool use ordinaire est le mode de
défaillance : des contraintes comme `minimum`, `maxLength` et `pattern` sont
retirées en silence plutôt que refusées. Une borne que vous avez écrite n'est
pas une borne appliquée. Si un nombre doit rester dans un intervalle, c'est
votre code qui le vérifie, et c'est 4.4.
:::

::: exam-tip
Trois formulations, trois réponses. « Garantir une charge utile conforme au
schéma » → `tool_use` avec un JSON Schema. « Le type de document est inconnu et
plusieurs schémas existent » → `tool_choice: {"type": "any"}`. « Cette
extraction doit tourner avant les étapes d'enrichissement » → forcer l'outil par
son nom.

Les distracteurs sont constants d'une question à l'autre. `tool_choice: "auto"`
laisse le modèle libre de répondre en prose : l'extraction cesse d'être
garantie. C'est la mauvaise réponse la plus proche, celle qu'il faut guetter.
Décrire le schéma dans le prompt et demander du JSON réintroduit exactement les
erreurs de syntaxe que le mécanisme supprime. Réparer la sortie à l'expression
régulière après coup traite le symptôme et déplace la fragilité dans votre code.
Et augmenter `max_tokens` répond à un problème de forme par de la longueur.
:::

::: anti-pattern
**Croire que le schéma a validé le contenu.** Un appel forcé garantit la *forme*
de la charge utile et rien de la vérité de ses valeurs : des lignes qui ne
s'additionnent pas au total, une date dans le mauvais champ, un montant qui n'a
jamais figuré dans le document. Le guide le dit explicitement, et c'est 4.4 qui
s'en occupe.

**Marquer tous les champs `required` pour obtenir un type propre en aval.** La
propreté s'achète avec des valeurs inventées, ce qui est le défaut le plus cher.
:::

**À tester** — les questions de la banque étiquetées `data-task="4.3"`.

## 4.4 — Implement validation, retry, and feedback loops for extraction quality
<!-- ts:4.4 | src:exam guide TS 4.4 (retry with error feedback, appending the specific validation errors to the prompt on retry; the limits of retry when the information is simply absent from the source; detected_pattern fields for systematic analysis of dismissal patterns; semantic validation errors against the schema syntax errors eliminated by tool use; the skills: follow-up requests carrying the original document, the failed extraction and the specific validation errors, telling an ineffective retry from a resolvable one, adding detected_pattern to structured findings, and extracting calculated_total beside stated_total with a conflict_detected boolean) ; 09apicomplements L4 (the four-step validation-retry loop, format errors resolvable by retry versus information absent from the source, a refusal returning HTTP 200 with stop_reason "refusal", and field-level confidence routing low-confidence extractions to human review) ; 05claudeapi L36 (a tool_result block carries tool_use_id, content and is_error, and travels in a user message) ; exam guide appendix (Pydantic: schema validation, semantic validation errors, validation-retry loops) -->

La charge utile est conforme et les valeurs sont fausses. Forcer un appel par un
JSON Schema garantit la forme de l'enregistrement et rien de ce qu'il contient :
`total` vaut 150 alors que les lignes totalisent 145 ; un nom de fournisseur se
trouve dans le champ client. Rien dans le schéma ne peut le voir, parce que rien
dans le schéma ne connaît l'arithmétique.

Le mécanisme est une boucle, et le guide en teste les quatre étapes :

1. Le modèle produit une extraction.

2. Votre code la valide, d'abord avec JSON Schema pour la structure, puis avec des
   règles métier pour le sens. Pydantic est l'outil que l'annexe nomme, et il fait
   les deux : types et champs requis dans le modèle, règles inter-champs dans un
   validateur.

3. En cas d'échec, vous envoyez une requête de suivi portant **trois choses** : le
   document d'origine, l'extraction ratée, et l'erreur de validation
   **précise**.

4. Vous suivez quelles erreurs les retries corrigent réellement.


L'étape 3 est tout le « retry with error feedback », et son adjectif en est la
substance. « Il y a une erreur, réessaie » relance les mêmes dés. L'erreur doit
nommer le champ et l'écart.

```python
try:
    invoice = Invoice.model_validate(tool_use.input)   # types, puis @model_validator
    return invoice
except ValidationError as e:
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": [{
        "type": "tool_result",
        "tool_use_id": tool_use.id,
        "is_error": True,
        "content": (
            "total is 150.00 but the line_items sum to 145.00. "
            "Re-read the line items and resubmit; do not adjust total to fit."
        ),
    }]})
```

La requête de suivi emprunte la conversation ordinaire : le message assistant
qui porte le bloc `tool_use` retourne dans l'historique, et la réponse qui lui
est faite est un bloc `tool_result` portant le même `tool_use_id`, avec
`is_error: true`. Le document est déjà dans l'historique : le modèle voit donc
les trois ingrédients du guide d'un seul coup.

### Quand un retry ne peut pas marcher

C'est le jugement autour duquel ce task statement est bâti, et c'est une
question sur le **document source**, jamais sur le nombre de tentatives.

| Le retry corrige | Le retry ne peut rien |
|---|---|
| Erreurs de format — une date écrite `09/12/24` là où le schéma veut de l'ISO 8601 | L'information n'est pas dans le document du tout |
| Erreurs structurelles — une valeur dans le mauvais champ, une liste là où un objet est attendu | Le chiffre vit dans une annexe ou un document externe que vous n'avez pas fourni |
| Incohérences arithmétiques que le document lui-même permet de trancher | |

La colonne de gauche partage une propriété : le modèle avait l'information et
l'a mal mise en forme. Lui renvoyer l'erreur exacte suffit. La colonne de droite
partage la propriété inverse, et un retry n'y peut produire qu'une invention
plus assurée. La réponse est un champ nullable et un `null`, qui est la règle de
conception de 4.3 revenue en décision opérationnelle.

### Deux champs qui rendent le pipeline auto-diagnostique

Le guide nomme les deux, et tous deux sont des ajouts peu coûteux à un schéma.

**`stated_total` à côté de `calculated_total`, plus `conflict_detected`.** Faire
extraire au modèle le chiffre que le document déclare *et* la somme qu'il
calcule depuis les lignes, puis signaler le désaccord au lieu d'en choisir un en
silence. Le conflit survit jusque dans votre code, où un humain peut arbitrer.

```json
{"stated_total": 150.00, "calculated_total": 145.00,
 "conflict_detected": true, "line_items": [ … ]}
```

**`detected_pattern` sur chaque signalement.** Un pipeline de revue de code qui
enregistre quelle construction a déclenché chaque signalement transforme les
rejets en données : quand les développeurs rejettent des signalements, vous
pouvez grouper les rejets par pattern et voir qu'une construction produit
l'essentiel du bruit, précisément la catégorie que 4.1 vous dit de désactiver et
de réécrire.

```json
{"location": "src/auth/login.ts:42",
 "issue": "Déréférencement null possible",
 "severity": "medium",
 "detected_pattern": "pas d'optional chaining sur user.profile.email",
 "suggested_fix": "user?.profile?.email"}
```

::: key-concept
Deux signaux d'échec que votre code de validation ne doit pas confondre avec une
mauvaise extraction. `stop_reason: "refusal"` signifie que le modèle a refusé
pour des raisons de sécurité, et cela revient avec un **HTTP 200**, si bien
qu'un code qui ne vérifie que le statut traite un refus comme un succès et parse
une réponse non conforme. `stop_reason: "max_tokens"` signifie que la sortie a
été coupée en cours de génération ; le retry est alors un budget plus grand, pas
un meilleur prompt. L'ensemble complet des valeurs de `stop_reason` appartient à
D0.

Le dernier étage du pattern, et un skill du guide : faire produire au modèle une
confidence par champ, router les extractions à faible confiance vers une
relecture humaine, et mesurer la précision par type de document et par champ.
Une précision globale acceptable peut masquer un type de document raté
systématiquement.
:::

::: exam-tip
Lisez où se trouve l'information manquante. « La valeur n'apparaît nulle part
dans le document » ou « ce chiffre est dans le contrat, qui n'a pas été fourni »
→ le retry est inutile ; rendez le champ nullable et enregistrez le manque. « La
date est revenue au mauvais format », « les valeurs ne s'additionnent pas » → le
retry fonctionne, à condition que le retour nomme le champ et l'écart.

Les distracteurs des questions de validation sont de bonnes pratiques voisines
appliquées à la mauvaise défaillance. Plus de few-shot examples améliorent
l'extraction en amont et ne font rien contre un échec de validation à
l'exécution. Un schéma plus strict supprime les charges utiles malformées, pas
les désaccords entre champs. Un parseur de post-traitement maison réimplémente
ce que le validateur fait déjà. Augmenter `max_tokens` borne la longueur, pas la
justesse. Et réessayer avec le même prompt, plus fort, est la condition témoin.
:::

::: anti-pattern
**Réessayer sans l'erreur.** Renvoyer le document en espérant est une loterie,
et elle est facturée au ticket.

**Laisser le validateur réparer la valeur en silence.** Écraser `total` par la
somme calculée rend le pipeline vert et détruit le signal disant que le document
ou l'extraction était faux. Signalez le conflit ; tranchez-le ailleurs.
:::

**À tester** — les questions de la banque étiquetées `data-task="4.4"`.

## 4.5 — Design efficient batch processing strategies
<!-- ts:4.5 | src:exam guide TS 4.5 (the Message Batches API with its 50 % cost saving, up to 24-hour processing window and absence of a latency SLA; batch as appropriate for non-blocking latency-tolerant workloads and inappropriate for blocking ones such as pre-merge checks; no multi-turn tool calling within a single request, meaning tools cannot be executed mid-request and their results returned; custom_id for correlating request and response pairs; the skills: matching the API to the latency requirement, calculating submission frequency from an SLA such as 4-hour windows for a 30-hour commitment against 24-hour processing, resubmitting only the failures identified by custom_id with modifications such as chunking oversized documents, and refining prompts on a sample before processing large volumes) ; 09apicomplements L6 (the request shape: custom_id and params on each request) ; L7 (the four result types with only succeeded billed, results returned unordered so custom_id is the only reliable pairing, and invalid_request_error requiring a corrected body before resubmission where a server error can be retried as is) ; L8 (100 000 requests or 256 MB per batch, results retrievable for 29 days, one failed request not affecting the others, and the synchronous-only parameters a batch refuses: stream, speed, store, previous_thread_event_id, cache_hint, context_hint, max_tokens: 0) ; L9 (dry-running a single request through the Messages API before launching the batch) -->

La Message Batches API traite de gros volumes de requêtes Messages API de façon
asynchrone. Trois propriétés décident de toutes les questions à son sujet :

| Propriété | Valeur |
|---|---|
| Coût | **50 % de remise** sur les tarifs standards |
| Fenêtre de traitement | Jusqu'à **24 heures** ; la plupart des lots finissent en moins d'une heure |
| SLA de latence | **Aucun** |
| Corrélation | `custom_id`, posé par vous sur chaque requête |
| Ordre des résultats | Non garanti |
| Tool calling multi-tours dans une requête | Non supporté |

La troisième ligne est celle qui décide de la compatibilité, et c'est celle que
les distracteurs attaquent. « La plupart des lots finissent en moins d'une
heure » est une observation sur les files d'attente ; les vingt-quatre heures
bornent la durée que le traitement *peut* prendre. Ni l'une ni l'autre n'est une
promesse sur une soumission donnée.

```json
POST /v1/messages/batches
{ "requests": [
    { "custom_id": "invoice-10231",
      "params": { "model": "claude-sonnet-5", "max_tokens": 1024,
                  "messages": [{ "role": "user", "content": "Extract: …" }] } },
    { "custom_id": "invoice-10232",
      "params": { "model": "claude-sonnet-5", "max_tokens": 1024,
                  "messages": [{ "role": "user", "content": "Extract: …" }] } }
] }
```

```json
// Les résultats reviennent sans ordre ; apparier par custom_id, jamais par position.
{ "custom_id": "invoice-10232", "result": { "type": "succeeded", "message": { … } } }
{ "custom_id": "invoice-10231", "result": { "type": "errored",  "error": { … } } }
// → ne resoumettre que invoice-10231.
```

`custom_id` n'est pas décoratif. Comme les résultats ne sont pas ordonnés, c'est
le seul moyen fiable de dire quelle réponse appartient à quel document, et c'est
aussi ce qui rend possible la resoumission sélective.

### Quelle charge va où

| Charge de travail | API | Pourquoi |
|---|---|---|
| Contrôle pré-merge, un développeur attend | Synchrone | Bloquant ; vingt-quatre heures n'est pas une réponse possible |
| Revue de code interactive | Synchrone | Réponse immédiate exigée |
| Rapport de dette technique nocturne | Batch | Attendu pour le matin ; moitié prix |
| Audit de sécurité hebdomadaire | Batch | Tolérant à la latence, gros volume |
| Génération de tests nocturne | Batch | Non bloquant par construction |

Le critère tient en une question : **est-ce que quelqu'un attend ?** Les
économies ne promeuvent jamais un workflow bloquant vers le batch.

::: key-concept
**Une requête de batch achète une passe et une réponse.** Vous pouvez déclarer
des outils et envoyer un historique multi-tours, mais rien n'exécute un outil au
milieu d'une requête de batch pour en rendre le résultat au modèle pour un tour
de plus. Toute étape dont la conception exige que le modèle demande un fichier,
le reçoive et continue n'y entre pas. Aucun polling n'y change rien, parce que
la limite est structurelle et non temporelle.

C'est le fait derrière toute une famille de questions : une boucle agentique
relève de l'API synchrone, et le TS 1.1 de D1 est l'endroit où cette boucle est
enseignée.
:::

### Cadence de soumission sous SLA

Le guide vous demande d'en calculer une. L'arithmétique d'abord : avec un
engagement de **30 heures** et un traitement qui peut prendre jusqu'à **24
heures**, une soumission peut attendre au plus `30 − 24 = 6` heures en file
avant d'être envoyée.

Six heures est le plafond, pas la réponse. Un lot soumis pile à la sixième heure
et traité à la limite consomme tout le budget, sans rien laisser pour un
document échoué qu'il faut resoumettre. **L'exemple du guide lui-même répond des
fenêtres de 4 heures pour un SLA de 30 heures**, le plafond moins une marge.

Remarquez quel nombre est entré dans ce calcul. La plupart des lots finissent en
moins d'une heure, et cette observation n'a pas sa place dans l'arithmétique :
on dimensionne sur les **24 heures que la plateforme borne**, jamais sur
l'heure que vous constatez d'ordinaire.

::: exam-tip
Le piège des questions de cadence est le nombre arithmétiquement exact. Six
heures est un calcul juste et une mauvaise réponse opérationnelle, et c'est ce
qui le rend attirant. Calculez `engagement − plafond de traitement` pour trouver
le plafond, puis prenez l'option en dessous.
:::

### La gestion des échecs

Quatre types de résultat reviennent : `succeeded`, `errored`, `canceled`,
`expired`, et seul `succeeded` est facturé. Une requête échouée n'affecte pas
les autres.

- **Identifier les échecs par leur `custom_id`** et ne resoumettre que ceux-là.
  Relancer tout le lot repaie tout ce qui avait fonctionné.

- **Resoumettre avec une modification, pas à l'identique**, quand la cause est
  dans la requête : un document qui a dépassé la limite de contexte repart
  découpé. Une `invalid_request_error` signifie que le corps doit être corrigé
  avant d'être renvoyé ; une erreur serveur peut être retentée telle quelle.

- **Affiner le prompt sur un échantillon d'abord.** Faire un dry run d'une requête
  représentative par l'API Messages synchrone, obtenir la bonne extraction, et
  seulement ensuite soumettre les mille ; sinon vous découvrez un défaut de prompt
  après avoir payé pour chaque document du lot.


Deux nombres opérationnels à retenir : un lot porte jusqu'à 100 000 requêtes ou
256 Mo, la première limite atteinte s'appliquant, et les résultats restent
récupérables 29 jours. Et une courte liste de paramètres qu'un lot refuse, tous
pour la même raison, puisque ce sont des réglages propres au synchrone :
`stream: true` (les résultats reviennent sous forme de fichiers), `speed`,
`store` et `previous_thread_event_id`, `cache_hint` et `context_hint`, et
`max_tokens: 0`.

::: anti-pattern
**Basculer un contrôle bloquant sur le batch pour la remise.** L'économie est
réelle, le développeur attend toujours, et aucune latence n'est promise. Un
distracteur adoucit souvent la chose avec du polling de statut ; le polling lit
un état, il ne crée pas une garantie.

**Apparier les réponses aux requêtes par position.** Les résultats ne sont pas
ordonnés. Un code qui zippe deux listes attribuera les extractions de travers en
silence, et le défaut se manifeste comme des données subtilement fausses plutôt
que comme une erreur.
:::

**À tester** — les questions de la banque étiquetées `data-task="4.5"`.

## 4.6 — Design multi-instance and multi-pass review architectures
<!-- ts:4.6 | src:exam guide TS 4.6 (a model retaining its reasoning context from generation and being less likely to question its own decisions in the same session, independent review instances without prior reasoning context outperforming self-review instructions or extended thinking at catching subtle issues, and multi-pass review splitting a large review into per-file local passes plus cross-file integration passes to avoid attention dilution and contradictory findings; the skills: using a second independent Claude instance to review generated code without the generator's reasoning context, splitting large multi-file reviews into per-file passes plus separate integration passes for cross-file data flow, and running verification passes where the model self-reports confidence alongside each finding to enable calibrated review routing) ; 01claudecodeinaction L8 (opening a fresh session or subagent that reviews the changed code with no memory of how it was built, catching what the original run talked itself past) ; 06claudecode101 L7 (a code-reviewer subagent runs in its own context window with fresh eyes, is restricted to read-only tools, and is checked into the repository so the whole team uses the same reviewer) -->

Demandez à la session qui vient d'écrire le code de le relire, et elle trouvera
peu de chose. Non par négligence, mais à cause de ce qu'elle porte : **le modèle
conserve son contexte de raisonnement issu de la génération, ce qui le rend
moins susceptible de questionner ses propres décisions dans la même session.**
Il a déjà envisagé l'alternative et l'a rejetée. La relecture confirme ; elle ne
teste pas.

Le remède du guide est architectural plutôt qu'instructionnel, et la comparaison
qu'il pose est le point important : **une instance de revue indépendante, sans
contexte de raisonnement préalable, attrape mieux les problèmes subtils qu'une
instruction d'auto-relecture ou que l'extended thinking.** Demander au modèle
d'être critique envers lui-même, ou lui donner plus de place pour délibérer,
opèrent tous deux à l'intérieur de la trace qui a produit le biais.

« Indépendante » a un sens opérationnel : une session distincte, ou un subagent,
qui reçoit l'artefact et les critères et **pas** la conversation qui les a
produits. Dans Claude Code, c'est un subagent relecteur, qui tourne dans sa
propre fenêtre de contexte, restreint à des outils en lecture seule, et
versionné dans le dépôt pour que l'équipe partage un seul relecteur. Le TS 3.6
de D3 met la même instance dans un pipeline ; ce qui relève d'ici, c'est
pourquoi l'instance doit en être une autre.

### Découper une revue trop grande pour une seule passe

Une pull request qui touche trente fichiers, relue en une seule passe, produit
une sortie inconsistante : un pattern signalé dans un fichier et approuvé dans
un autre, des signalements qui s'épuisent vers la fin. La cause que le guide
nomme est la **dilution de l'attention**, et le remède est de rétrécir chaque
passe plutôt que d'élargir le contexte.

| Passe | Périmètre | Ce qu'elle trouve |
|---|---|---|
| Per-file | Un fichier à la fois | Bugs locaux, problèmes de sécurité, qualité |
| Intégration | Signatures et sites d'appel sur l'ensemble modifié | Types incohérents aux frontières de modules, dépendances circulaires, flux de données cassés |

```bash
# Passe 1 — local, une invocation par fichier.
for file in $(git diff --name-only main...HEAD); do
  review --scope="$file" \
         --prompt="Local issues only: bugs, security, quality in THIS file."
done

# Passe 2 — intégration, une invocation sur l'ensemble modifié.
review --scope="$(git diff --name-only main...HEAD)" \
       --prompt="Cross-file only: type mismatches across module boundaries,
                 circular dependencies, broken data flow. Ignore local issues."
```

Découper une tâche en passes ciblées, c'est la décomposition de tâches de D1
(TS 1.6) appliquée à la revue ; ce qui est spécifique ici, c'est la *coupe*,
local contre inter-fichiers, parce que ce sont les deux choses qu'une passe
indifférenciée fait le plus mal.

### La confidence, auto-reportée

Le troisième skill est une passe de vérification où le modèle reporte une
confidence à côté de chaque signalement. La valeur n'est pas le nombre lui-même
mais le routage qu'il permet : les signalements à forte confidence vont
directement au développeur, ceux à faible confidence vers une vérification
humaine, et le seuil bouge à mesure que vous observez quelle bande vaut d'être
lue.

```json
{"file": "src/billing/refund.ts", "line": 88,
 "issue": "Le remboursement peut dépasser le montant initial si un remboursement partiel le précède",
 "confidence": 0.42,
 "detected_pattern": "pas de contrôle du cumul des remboursements avant la soustraction"}
```

Deux précautions gardent cela honnête. Une confidence reportée depuis
l'intérieur du contexte de génération hérite de l'angle mort de ce contexte,
donc la passe de vérification vaut d'être exécutée dans l'instance indépendante.
Et un nombre auto-reporté est un signal de routage, pas une mesure : ce qui en
fait une mesure, c'est de le comparer à des signalements dont vous connaissez
déjà le verdict.

::: exam-tip
Trois symptômes, trois réponses. Du code généré relu comme propre par la session
qui l'a écrit → une seconde instance qui n'a pas vu la génération. Des
signalements contradictoires d'un fichier à l'autre dans une grande revue →
découper en passes per-file plus une passe d'intégration ; nommer la cause
« dilution de l'attention », pas « manque de contexte ». Trop de signalements
pour que des humains les trient → une confidence auto-reportée par signalement,
utilisée pour router.

Les distracteurs séduisent parce que chacun nomme une capacité réelle. Passer à
un modèle à fenêtre de contexte plus large répond à la dilution par de la
capacité, en confondant ce qui peut être tenu et la régularité avec laquelle
c'est lu. Demander à la même session de « relire son travail de façon critique »
ou y activer l'extended thinking restent tous deux à l'intérieur de la trace qui
a causé le biais. Le guide écarte précisément ces deux-là par leur nom. Trois
passes complètes avec vote de consensus sonne rigoureux et jette tout vrai bug
qu'une seule passe a vu. Et demander aux développeurs de découper leurs pull
requests déplace le travail sur des personnes sans changer le système.
:::

::: anti-pattern
**Donner au relecteur la trace de génération « pour le contexte ».** C'est la
seule chose qui ne doit pas voyager : cette trace est le raisonnement que vous
voulez que le relecteur ne partage pas. Passez l'artefact et les critères.

**Relire le diff dans la session qui l'a généré pour économiser un appel.**
L'économie est réelle et la revue vaut moins que l'appel qu'elle a économisé.
:::

**À tester** — les questions de la banque étiquetées `data-task="4.6"`.
