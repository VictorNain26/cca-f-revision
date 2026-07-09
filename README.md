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
| Practice Exam | Officielle — **viser > 900/1000** = meilleur prédicteur de réussite |

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
| `D0_API_Fundamentals.html` | Prérequis API (à lire avant les domaines) |
| `D1_Architecture_Orchestration_27pct.html` | Domaine 1 (le plus lourd) |
| `D2_Tool_Design_MCP_18pct.html` | Domaine 2 |
| `D3_Claude_Code_Config_20pct.html` | Domaine 3 |
| `D4_Prompt_Engineering_20pct.html` | Domaine 4 |
| `D5_Context_Fiabilite_15pct.html` | Domaine 5 |
| `Scenarios_Exam.html` | Les 6 scénarios + tableau croisé scénario × domaine |
| `Practice_Questions.html` | Questions d'entraînement corrigées (questions expliquées en détail + questions sur les 6 scénarios) |
| `Exam_Strategy.html` | Cheat sheet jour J, méthodologie QCM, 5 arbres de décision |
| `styles.css` | Design system unifié partagé par tous les documents |

## Méthode d'utilisation

1. **Diagnostic** — QCM tous scénarios confondus, fiches fermées → repère tes domaines faibles.
2. **Par domaine** (ordre poids × faiblesse) — teste-toi d'abord, puis lis pour combler, explique chaque distracteur.
3. **Simulation** — examens blancs en conditions + la Practice Exam officielle (vise > 900/1000).
4. **Dernière ligne droite** — relis seulement ton journal d'erreurs + le Cheat Sheet.

> **Principe** : active recall > relecture passive. Faire les QCM, expliquer pourquoi chaque distracteur est faux. La compréhension émerge de la formulation, pas de la lecture.

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

Ce corpus est basé sur le guide officiel CCA-F d'Anthropic et complété par les ressources publiques de la communauté (AI.cc, DEV Community, Medium, Claude Certified Architects). Il couvre 100 % du référentiel des 5 domaines et des 6 scénarios.

---

*Corpus complet de préparation CCA-F · Aligné sur le guide officiel CCAR-F v1.0 (juillet 2026).*
