# CCA-F Revision Corpus

Corpus complet de révision pour la certification **Claude Certified Architect — Foundations** (code **CCAR-F**), aligné sur le guide officiel v1.0 (juillet 2026).

**🌐 Site en ligne : https://victornain26.github.io/cca-f-revision/**

## Format de l'examen

| Paramètre | Valeur |
|---|---|
| Code d'examen | **CCAR-F** |
| Questions | **60** QCM scénarisés (4 scénarios tirés d'une banque de 6) |
| Durée | **120 minutes** |
| Score de passage | **720 / 1000** (échelle 100–1000) |
| Frais | **125 $ US** (par tentative) |
| Type d'items | QCM — chaque item indique le nombre de réponses à sélectionner |
| Scénarios | **6 au total**, **4 tirés au sort** sur le pool |
| Plateforme | Proctored via **Pearson VUE** — test center ou OnVUE |
| Tentatives | Jusqu'à **4 tentatives par période glissante de 12 mois**, délais de repassage **14 / 30 / 90 jours** après échecs successifs |
| Recertification | Validité **12 mois** — renouvellement gratuit (évaluation non proctorée, Anthropic Partner Academy) |

## Couverture du corpus — 100 % du référentiel officiel

| Domaine | Poids | Sujets clés |
|---|---|---|
| **D1** Architecture & Orchestration | 27 % | Workflows vs agents, agentic loop (stop_reason), hub-and-spoke, hooks SDK, sessions |
| **D2** Tool Design & MCP | 18 % | Descriptions différenciantes, erreurs structurées (isError), tool_choice, restriction d'outils, primitives MCP |
| **D3** Claude Code Configuration | 20 % | CLAUDE.md, .claude/rules/ (glob), slash commands et skills, plan mode, CI/CD (mode headless) |
| **D4** Prompt Engineering | 20 % | Critères explicites, few-shot, tool_use + JSON Schema, validation-retry (Pydantic), Message Batches API, revue multi-passes |
| **D5** Context & Reliability | 15 % | Case facts, summarization, escalation, propagation d'erreurs, délégation de subagents, provenance |

## Contenu du corpus

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil avec navigation et vue d'ensemble |
| `D0_API_Fundamentals.html` | Prérequis API (à lire avant les domaines) — 6 questions d'auto-évaluation |
| `D1_Architecture_Orchestration_27pct.html` | Domaine 1 (le plus lourd) — 8 questions d'auto-évaluation |
| `D2_Tool_Design_MCP_18pct.html` | Domaine 2 — 7 questions d'auto-évaluation |
| `D3_Claude_Code_Config_20pct.html` | Domaine 3 — 8 questions d'auto-évaluation |
| `D4_Prompt_Engineering_20pct.html` | Domaine 4 — 7 questions d'auto-évaluation |
| `D5_Context_Fiabilite_15pct.html` | Domaine 5 — 9 questions d'auto-évaluation |
| `Scenarios_Exam.html` | Les 6 scénarios + tableau croisé scénario × domaine |
| `Practice_Questions.html` | 112 QCM corrigés, **énoncés et corrigés en anglais** (langue de l'examen) — 12 questions officielles + 100 items couvrant les 6 scénarios et les 30 task statements. Page générée : sources dans `courses/practice/page.md` (prose) et `courses/quizzes/PQ.json` (questions) |
| `Exam_Strategy.html` | Cheat sheet jour J, méthodologie QCM, 5 arbres de décision |
| `styles.css` | Design system unifié partagé par tous les documents |
| `courses/` | Corpus de cours dédupliqué, anglais + français généré par po4a — voir [courses/README.md](courses/README.md) |

## Méthode d'utilisation

1. **Diagnostic** — réponds aux auto-évaluations des 5 fiches de domaine, fiches fermées. Le **profil par domaine** sur l'accueil se remplit et classe les domaines par rentabilité (poids à l'examen × ce qu'il te reste à combler).
2. **Par domaine**, dans l'ordre donné par le profil — teste-toi d'abord, puis lis pour combler, explique chaque distracteur.
3. **Volume** — les 112 QCM corrigés, dont les 12 exemples officiels du guide. Go/no-go : ≥ 85 % au 2e passage, aucun domaine sous 75 %.
4. **Dernière ligne droite** — relis seulement ton journal d'erreurs + le Cheat Sheet.

> **Principe** : active recall > relecture passive. Faire les QCM, expliquer pourquoi chaque distracteur est faux. La compréhension émerge de la formulation, pas de la lecture.

## Le guide fait loi

Le **guide d'examen** (CCAR-F v1.0, juillet 2026) définit le périmètre ; la **doc Anthropic** fait autorité sur l'exactitude technique. Les **prep courses** de l'Anthropic Partner Academy ne sont ni l'un ni l'autre — ils débordent largement du programme (RAG, embeddings, streaming, prompt caching, Bedrock, Vertex sont tous hors scope). L'accueil détaille quoi suivre et quoi sauter dans chacun.

Le guide fige l'état de l'outillage en juillet 2026 et la doc a bougé depuis. Sur quatre points, réviser sur la doc à jour conduit à répondre faux — voir [Exam_Strategy.html](Exam_Strategy.html) :

| Sujet | À répondre (guide) | Doc actuelle |
|---|---|---|
| Slash commands / skills | Deux mécanismes distincts, `.claude/commands/` pour l'équipe | Fusionnés : les deux produisent la même commande |
| Spawn de subagents | Outil `Task`, `allowedTools` doit contenir `"Task"` | Renommé `Agent` en Claude Code v2.1.63 |
| `allowed-tools` dans un skill | Restreint l'accès aux outils | Décrit comme une pré-approbation de permissions |
| Sortie structurée | `tool_use` + JSON Schema | Structured Outputs natifs (`output_config.format`) |

## Contrôles et rapports

Le site publié reste du HTML statique ; `package.json` ne sert qu'à outiller les
contrôles et les rapports.

```bash
npm install                # une fois — jsdom, markdown-it, markdown-it-container
sudo apt install -y po4a   # une fois — dépendance système, pour le corpus de cours

npm run check              # les six contrôles, échec au premier problème
npm run report             # les trois rapports, jamais de verdict
npm test                   # la suite unitaire des outils

npm run fix:nav            # réécrit la navbar des pages depuis nav.js
npm run build:courses      # régénère courses/fr/ depuis courses/en/ + courses/po/fr.po
npm run render:courses     # régénère les pages HTML publiées depuis le corpus de cours
```

### Ce qui bloque

Un contrôle échoue quand quelque chose est **cassé pour le lecteur** ou qu'un
fichier a **dérivé de la source dont il est le rendu**. Ce sont des faits
constatables, pas des jugements sur le contenu.

| Contrôle | Ce qu'il constate |
|---|---|
| `check:questions` | Ce sans quoi `quiz.js` corrige mal : `data-opt` absents ou désordonnés, lettre du texte désaccordée de son `data-opt`, `data-answer` qui ne désigne aucune option, explication braquée sur la bonne réponse, id dupliqué (deux questions partageraient la même case de progression), `TOTALS` de `home-progress.js` en désaccord avec le compte réel. Le reste du contrat — schéma d'id, métadonnées de classement, langue, distracteur sans explication, couverture des task statements — est affiché en observations. |
| `check:nav` | Le bloc `<nav class="navbar">` de chaque page est le rendu exact de la liste `LINKS` de `nav.js`. Le HTML statique est matérialisé plutôt que supprimé : il évite le flash de navigation vide et sert le mode sans JS. `npm run fix:nav` réécrit les pages. **Le défaut qu'il attrape** : la navbar existait en onze exemplaires et ils avaient divergé. |
| `check:links` | Aucun lien ni ancre interne cassé. La couverture des 30 task statements est affichée à côté, sans effet sur le verdict. |
| `check:quizzes` | `quiz.js` exécuté sur chaque page : l'énoncé et les choix sont visibles, la réponse ne fuite pas avant la révélation. |
| `check:runtime` | Chaque page chargée dans un DOM : tous ses `<script src>` existent et s'exécutent sans erreur, le bouton de retour en haut réagit au défilement. **Angle mort** : jsdom n'implémente ni `IntersectionObserver` ni `ResizeObserver`, remplacés par des stubs inertes. |
| `check:courses` | La chaîne de rendu, à chaque maillon : `courses/fr/` est le rendu exact de `courses/en/` + `po/fr.po`, chaque page HTML publiée — les douze fiches et `Practice_Questions.html` — est le rendu exact de ses sources par `npm run render:courses`, aucun fichier orphelin ou oublié dans `po4a.conf`, aucun segment anglais absent du catalogue, aucun renvoi `data-task` que l'appariement flou de po4a aurait fait dériver vers un autre task statement, aucun commentaire de traçabilité qui fuit dans le HTML. Les conventions de rédaction du corpus — marqueurs `src` et `owns`, une section par task statement, fraîcheur des traductions — sont affichées en observations. **Angle mort** : rien ici ne juge la justesse du contenu. |

### Ce qui informe

Ces trois-là mesurent le contenu. La mesure vaut, le verdict non : chacun a un
angle mort connu, et un seuil qui refuse un commit fait corriger la mesure
plutôt que le défaut.

| Rapport | Ce qu'il mesure, et ce qu'il ne voit pas |
|---|---|
| `report:length` | L'indice de longueur : le taux de réussite du meilleur candidat aveugle — « toujours cocher la k-ième option la plus longue », pour tout k, en mots comme en caractères. Le ratio clé/distracteurs par question et la concentration des égalités s'affichent en diagnostic. **Angle mort** : la mesure ne connaît que la longueur. Un distracteur rallongé de mots vides passe pour un équilibrage, et une option courte mais seule à répondre vraiment à la question reste devinable pour une raison invisible ici. Les 12 officielles `pq-q1..pq-q12` sont mesurées à part — un indice qui y apparaît doit être recoupé contre le PDF avant d'être imputé à l'examen : `pq-q10` sortait à 2,294 sur deux distracteurs que le corpus avait tronqués, contre 1,083 sur le texte du guide. |
| `report:dupes` | Le recouvrement fiche ↔ banque : indice de Jaccard sur les mots de contenu, `<code>`, nombres et mots-outils retirés. **Angle mort** : aucune mesure lexicale n'attrape un isomorphisme de structure. Deux questions dont les quatre options se correspondent une à une mais sont intégralement reformulées sortent sous le seuil — le rapport chiffre deux cas connus. Une sortie vide n'est pas une preuve d'absence de doublon. |
| `report:diacritics` | Les mots français écrits sans leurs accents, sur la prose hors blocs de quiz (rédigés en anglais). **Angle mort** : la liste de mots est incomplète par construction et porte au moins un faux positif assumé (<code>anticipe</code>, présent de l'indicatif, dont la forme accentuée existe aussi — c'est le participe passé). |

Une CI GitHub Actions (`.github/workflows/check.yml`) rejoue `npm test` puis
`npm run check` sur chaque push vers `main` et chaque pull request, et affiche
`npm run report` sans en faire dépendre le résultat.

`npm run test:mutation` neutralise, un à la fois, chaque `problems.push(`,
chaque `notices.push(` et chaque garde `if (…) continue;` de
`tools/lib/courses.mjs`, relance `npm test`
contre la copie mutée, et signale toute mutation qu'aucun test n'a détectée :
c'est soit du code mort, soit un test manquant. Il relance la suite complète une
fois par point de mutation — trop lent pour la boucle courte, utile après une
modification de fond de ce module.

## Déploiement

Hébergé sur GitHub Pages depuis ce repo (branche `main`, racine).

```bash
# Mise à jour après modifications locales (stager les fichiers explicitement) :
git add <fichiers-modifiés>
git commit -m "Description des changements"
git push

# GitHub Pages se rebuild automatiquement en 1-2 min.
```

> ⚠️ Le dépôt est **privé** : l'URL publique GitHub Pages ne sert le site que si Pages est activé pour un dépôt privé (plan GitHub compatible). Pour partager, inviter des collaborateurs sur le dépôt privé.

## Sources

Le corpus est aligné sur le **guide officiel CCA-F d'Anthropic** (CCAR-F v1.0), qui définit seul le périmètre testé. Les faits techniques (flags CLI, champs de frontmatter, portées de configuration, Message Batches API) sont vérifiés contre la **documentation Anthropic officielle** — `code.claude.com/docs` et `platform.claude.com/docs`.

Couverture : les **30 task statements** des 5 domaines et les **6 scénarios**. Aucun sujet listé hors-scope par le guide n'est enseigné comme matière ; les rares mentions servent de distracteurs corrigés ou figurent dans la liste explicite « ne révise pas ça ».

---

*Corpus complet de préparation CCA-F · Aligné sur le guide officiel CCAR-F v1.0 (juillet 2026).*
