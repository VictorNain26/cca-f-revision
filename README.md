# CCA-F Revision Corpus

Corpus complet de révision pour la certification **Claude Certified Architect — Foundations** (CCA-F), lancée par Anthropic en mars 2026.

**🌐 Site en ligne : https://victornain26.github.io/cca-f-revision/**

## Format de l'examen

| Paramètre | Valeur |
|---|---|
| Questions | 60 QCM scénarisés (4 scénarios × 15) *(communément rapporté, non confirmé officiellement)* |
| Durée | 90 minutes *(non confirmée officiellement)* |
| Score de passage | **720 / 1000** *(confirmé, échelle 100–1000)* |
| Pénalité | **Aucune** pour réponse fausse *(pas de pénalité au guessing)* |
| Scénarios | **6 au total**, **4 tirés au sort** sur le pool |
| Plateforme | Proctored via **Pearson VUE** — test center ou OnVUE *(migration 2026)* |
| Tentatives | Jusqu'à **4 tentatives par période glissante de 12 mois**, délais de repassage **14 / 30 / 90 jours** après échecs successifs |
| Recertification | Validité **12 mois** — badge délivré via **Credly** |
| Practice Exam | Officielle — **viser > 900/1000** = meilleur prédicteur de réussite |

## Couverture du corpus — 100 % du référentiel officiel

| Domaine | Poids | Sujets clés |
|---|---|---|
| **D1** Architecture & Orchestration | 27 % | Workflows vs agents, agentic loop (cycle OTAR), hub-and-spoke, hooks SDK, sessions |
| **D2** Tool Design & MCP | 18 % | Descriptions, erreurs structurées, tool_choice, primitives MCP, JSON Schema |
| **D3** Claude Code Configuration | 20 % | CLAUDE.md, settings.json, permissions Bash, skills, hooks Claude Code, CI/CD GitHub Actions |
| **D4** Prompt Engineering | 20 % | Critères explicites, few-shot, JSON Schema, retry-with-feedback Pydantic, Batch API, PRECISE, CoT |
| **D5** Context & Reliability | 15 % | Case facts, token budgeting, escalation, multi-agent errors, provenance |

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
| `Exam_Strategy.html` | Cheat sheet jour J, méthodologie QCM, 6 arbres de décision |
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

*Corpus complet de préparation CCA-F · Mis à jour juin 2026.*
