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
| `Practice_Questions.html` | 112 QCM corrigés, **énoncés et corrigés en anglais** (langue de l'examen) — 12 questions officielles + 100 items couvrant les 6 scénarios et les 30 task statements |
| `Exam_Strategy.html` | Cheat sheet jour J, méthodologie QCM, 5 arbres de décision |
| `styles.css` | Design system unifié partagé par tous les documents |

## Méthode d'utilisation

1. **Diagnostic** — réponds aux auto-évaluations des 5 fiches de domaine, fiches fermées. Le **profil par domaine** sur l'accueil se remplit et classe les domaines par rentabilité (poids à l'examen × ce qu'il te reste à combler).
2. **Par domaine**, dans l'ordre donné par le profil — teste-toi d'abord, puis lis pour combler, explique chaque distracteur.
3. **Volume** — les 112 QCM corrigés, dont les 12 exemples officiels du guide. Go/no-go : ≥ 85 % au 2e passage, aucun domaine sous 75 %.
4. **Dernière ligne droite** — relis seulement ton journal d'erreurs + le Cheat Sheet.

> **Principe** : active recall > relecture passive. Faire les QCM, expliquer pourquoi chaque distracteur est faux. La compréhension émerge de la formulation, pas de la lecture.

## Le guide fait loi

Le **guide d'examen** (CCAR-F v1.0, juillet 2026) définit le périmètre ; la **doc Anthropic** fait autorité sur l'exactitude technique. Les **prep courses** de l'Anthropic Partner Academy ne sont ni l'un ni l'autre — ils débordent largement du programme (RAG, embeddings, streaming, prompt caching, Bedrock, Vertex sont tous hors scope). L'accueil détaille quoi suivre et quoi sauter dans chacun.

Le guide fige l'état de l'outillage en juillet 2026 et la doc a bougé depuis. Sur quatre points, réviser sur la doc à jour conduit à répondre faux — voir [Le guide fait loi](Exam_Strategy.html#guide-vs-doc) :

| Sujet | À répondre (guide) | Doc actuelle |
|---|---|---|
| Slash commands / skills | Deux mécanismes distincts, `.claude/commands/` pour l'équipe | Fusionnés : les deux produisent la même commande |
| Spawn de subagents | Outil `Task`, `allowedTools` doit contenir `"Task"` | Renommé `Agent` en Claude Code v2.1.63 |
| `allowed-tools` dans un skill | Restreint l'accès aux outils | Décrit comme une pré-approbation de permissions |
| Sortie structurée | `tool_use` + JSON Schema | Structured Outputs natifs (`output_config.format`) |

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
