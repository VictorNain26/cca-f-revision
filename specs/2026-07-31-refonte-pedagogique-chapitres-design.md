# Refonte pédagogique des chapitres D0–D5

**Date** : 31 juillet 2026
**Statut** : design validé, prêt pour le plan d'implémentation
**Périmètre** : les six fiches de domaine (`D0_API_Fundamentals.html` à `D5_Context_Fiabilite_15pct.html`)

## Contexte

Le corpus est aligné sur le guide CCAR-F v1.0 : les 30 task statements sont couverts, les faits techniques sont vérifiés, les auto-évaluations couvrent leurs propres tasks. Ce qui n'a jamais été travaillé, c'est la **structure interne** des chapitres — ordre des sections, longueur relative, densité d'exemples.

Trois mesures cadrent le problème.

**Le volume ne suit pas le poids à l'examen.** En mots de contenu par point de pondération, hors auto-évaluations :

| Fiche | Poids | Mots de contenu | Mots par point |
|---|---|---|---|
| D1 | 27 % | 3 307 | 122 |
| D2 | 18 % | 2 383 | 132 |
| D3 | 20 % | 2 201 | **110** |
| D4 | 20 % | 2 304 | 115 |
| D5 | 15 % | 2 957 | **197** |

**Les déséquilibres internes touchent des tasks testées.** Dans D3, les deux sections les plus courtes sont §3 (règles par chemin, 127 mots) et §4 (plan mode, 162 mots) — les deux tasks qui font l'objet d'une question d'exemple officielle du guide. La section §2 du même chapitre fait 638 mots. Dans D1, la section 1 (hors task statements) fait 495 mots et ouvre le chapitre le plus lourd, soit plus que la décomposition (318) et les sessions (248) réunies.

**La densité d'exemples est erratique.** D4 §2 : 5 exemples pour 239 mots. D4 §3 : aucun exemple pour 437 mots, sur la task la plus lourde du domaine. Dans D0, cinq sections consécutives n'ont aucun exemple. Deux sections sont des moignons : D4 §7 (63 mots) et D3 §7 (110 mots).

## Décisions de cadrage

Trois arbitrages ont été tranchés avant le design.

**1. Structure constante.** La correspondance « une section ↔ un task statement » est conservée, l'ordre suit la numérotation du guide, D0 reste une fiche séparée. C'est la propriété distinctive du corpus face aux cours Anthropic : partir d'un pourcentage faible sur le rapport de score et retrouver la section correspondante immédiatement. Les problèmes mesurés se corrigent entièrement dans ce cadre.

**2. Rééquilibrage piloté par la qualité, pas par un budget.** On coupe ce qui est redondant ou hors référentiel parce que c'est redondant ou hors référentiel ; on développe ce qui est testé et maigre parce que c'est testé et maigre. Le total atterrit où il atterrit.

> La proportionnalité au poids est un **signal de diagnostic**, pas une **cible**. Elle a permis de repérer que D3 §3 et §4 étaient atrophiées. Elle ne justifie pas de couper dans D5 : aucun cours de l'Anthropic Partner Academy ne couvre l'escalation, la propagation d'erreurs, la provenance ni la calibration de confiance. Pour ce domaine, la fiche est la seule préparation existante, sur les concepts les moins intuitifs du référentiel. Sa densité est légitime.

**3. Squelette souple.** Aucun enchaînement imposé. Chaque section portant une task garantit quatre éléments, dans l'ordre et la forme qui conviennent au sujet. Une décision binaire comme la task 3.4 se traite mieux par un tableau contrasté que par un déroulé narratif.

## Le contrat de section

Toute section portant un task statement garantit :

| Garantie | Critère de contrôle |
|---|---|
| **Un problème posé en situation** | Le mécanisme est introduit par un cas qui échoue sans lui, pas par une définition |
| **Au moins un exemple concret** | Un artefact copiable : code, fragment de configuration, ou payload. Un tableau de comparaison ne compte pas |
| **Un réflexe d'examen** | Une formulation explicite de ce qui fait choisir la bonne option sous pression |
| **Les distracteurs nommés** | Les mauvaises réponses plausibles sont citées, avec la raison pour laquelle elles séduisent |

Les sections qui ne portent pas de task — cadrage D1 §1, synthèses, arbres de décision — en sont exemptées. En contrepartie elles doivent rester courtes : elles ne rapportent aucun point.

**Cas particulier de D0.** Ses sections ne portent aucun numéro de task, puisque la fiche est un prérequis et non un domaine. Elles ne sont pas exemptées pour autant : elles exposent les mécanismes sur lesquels les cinq domaines s'appuient (`stop_reason`, `tool_use`, `tool_choice`, system prompt, context window), et c'est là que se joue la compréhension qui rend les autres fiches lisibles. La garantie **« au moins un exemple concret »** s'applique donc pleinement à D0. Les trois autres garanties y sont facultatives : le réflexe d'examen et les distracteurs appartiennent aux fiches de domaine, qui traitent les situations testées.

## Le chantier

### Coupes

Chacune se justifie seule, indépendamment de tout budget.

| Cible | État | Action |
|---|---|---|
| **D1 §1** | 495 mots, hors référentiel, en ouverture du chapitre le plus lourd | Réduire à ~180 mots. La règle de décision workflow/agent reste — elle cadre le domaine. Les cinq workflow patterns deviennent une phrase avec renvoi. Les trois anti-patterns de subagents sortent : matière de cours |
| **D0 §3 ↔ D1 §2** | Deux exposés de `stop_reason` aux cadrages légèrement divergents | Trancher la propriété : **D0 possède le champ** (valeurs, sens), **D1 possède la boucle** (contrôle de flux, anti-patterns). D1 perd le tableau des valeurs, conserve un renvoi vers D0 |
| **D0 §5 ↔ D5 §1** | Les trois problèmes du context window exposés deux fois | **D0 possède les problèmes** (c'est le prérequis), **D5 possède les solutions**. D5 §1 perd la ré-exposition, conserve `case facts`, le trimming des tool results et le reste |
| **D4 §7** | 63 mots, « Fondamentaux d'API — note de structure » | Supprimer, remplacer par un renvoi vers D0 en tête de fiche |
| **D3 §7** | 110 mots, « Arbre de décision » | **Déplacer** le tableau comparatif (CLAUDE.md / Skills / Slash commands / Hooks / Subagents / MCP) dans la synthèse §8 sous son propre sous-titre. La prose fait 82 mots, mais le tableau à six lignes a de la valeur : il est déplacé, pas supprimé |

Deux récits légèrement différents du même mécanisme sont une source d'hésitation le jour de l'examen. C'est la raison des deux déduplications, pas l'économie de mots.

### Développements

Jusqu'au niveau qu'exige la question qui les teste, sans quota.

| Cible | État | Contenu à ajouter |
|---|---|---|
| **D3 §3** — règles par chemin (Task 3.3) | 127 mots | Anatomie du frontmatter YAML, un glob travaillé de bout en bout, l'arbitrage explicite contre le `CLAUDE.md` de répertoire, le réflexe d'examen |
| **D3 §4** — plan mode (Task 3.4) | 162 mots | Les cas contrastés que le guide fournit : restructuration en microservices, migration de bibliothèque sur 45+ fichiers, correctif d'un fichier avec stack trace. Plus le subagent `Explore` et la combinaison plan puis exécution directe |
| **D4 §3** — sorties structurées (Task 4.3) | 437 mots, zéro exemple | Une définition d'outil complète, le `tool_choice` qui force son appel, la lecture du bloc `tool_use` en retour |
| **D0 §3** — `stop_reason` | Aucun exemple | Un fragment de réponse API montrant le champ dans son contexte |
| **D0 §4** — system prompt | Aucun exemple | L'opposition côte à côte : system prompt bien placé contre system prompt glissé en premier message `user` |
| **D0 §5** — context window | Aucun exemple | Une illustration chiffrée de l'accumulation des tool results — la section conserve les trois problèmes, dont D0 devient propriétaire |
| **D0 §6** — `tool_use` | Aucun exemple | La paire requête/réponse complète : définition d'outil, bloc `tool_use` émis, `tool_result` renvoyé |
| **D0 §7** — `tool_choice` | Aucun exemple | Un appel minimal par valeur du paramètre |

D5 n'est pas touché en volume, hors la déduplication du §1.

## Vérification

1. **Script de contrôle du contrat** — pour chaque section portant une task, vérifier la présence des quatre garanties et sortir la liste des manquants. Même principe que le filet qui a validé les 157 QCM.
2. **Remesure mots par point de pondération**, pour constater le rééquilibrage.
3. **Suite jsdom existante** — les quiz de toutes les pages continuent de se noter correctement, énoncé visible, réponse masquée avant clic.
4. **Contrôle des liens et ancres** — les fusions de sections (D3 §7 replié, D4 §7 supprimé) décalent la numérotation `#sN`. Vérification faite au moment du design : **aucune page ne référence une ancre `#sN` d'une autre page**, le risque est donc circonscrit aux sommaires internes, qui seront mis à jour dans le même geste. Le contrôle automatique reste en place pour le confirmer après coup.
5. **Couverture** — aucun task statement ne perd de contenu au passage. Le mapping section → task reste complet pour les 30 tasks.

## Ordre d'exécution

1. **D3** — retour le plus fort : 20 % de l'examen, la fiche la plus maigre par point, et ses deux tasks atrophiées sont celles que le guide teste dans ses exemples officiels.
2. **D4** — la task la plus lourde du domaine est sans exemple.
3. **D1** — coupe du hors-scope en ouverture, déduplication de la boucle agentique.
4. **D0** — densité d'exemples, et réception des deux arbitrages de propriété.
5. **D5** — déduplication du §1 seule.

D2 n'est pas au programme de ce chantier : sa répartition interne est équilibrée et chaque section porte déjà un exemple.

## Ce que ce chantier ne fait pas

- Aucune modification du QCM (`Practice_Questions.html`) ni des auto-évaluations : elles ont été traitées et validées.
- Aucun changement de l'ordre des sections ni des frontières de chapitres.
- Aucune réécriture de D2.
- Aucune correction factuelle : l'alignement au guide a été fait et poussé.
