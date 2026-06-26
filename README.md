# CCA-F Revision Corpus

Corpus complet de révision pour la certification **Claude Certified Architect — Foundations** (CCA-F), lancée par Anthropic en mars 2026.

**🌐 Site en ligne : https://victornain26.github.io/cca-f-revision/**

## Format de l'examen

| Paramètre | Valeur |
|---|---|
| Questions | 60 QCM scénarisés (4 scénarios × 15) |
| Durée | 90 minutes |
| Score de passage | **720 / 1000** *(confirmé)* |
| Scénarios | 4 tirés au sort sur les 6 du pool |
| Plateforme | Proctored via **ProctorFree** *(confirmé)* |
| Tentatives | **Une seule** *(confirmé)* |
| Practice Exam | Officielle dans Skilljar — **viser > 900/1000** = meilleur prédicteur de réussite |

## Couverture du corpus — 100 % du référentiel officiel

| Domaine | Poids | Sujets clés |
|---|---|---|
| **D1** Architecture & Orchestration | 27 % | Workflows vs agents, agentic loop (cycle OTAR), hub-and-spoke, hooks SDK, failure recovery, HITL, sessions |
| **D2** Tool Design & MCP | 18 % | Descriptions, erreurs structurées, tool_choice, primitives MCP, JSON Schema, authentification, cookbook serveur |
| **D3** Claude Code Configuration | 20 % | CLAUDE.md, settings.json, permissions Bash, skills, hooks Claude Code, custom agents, CI/CD GitHub Actions |
| **D4** Prompt Engineering | 20 % | Critères explicites, few-shot, JSON Schema, retry-with-feedback Pydantic, Batch API, PRECISE, CoT, prompt injection |
| **D5** Context & Reliability | 15 % | Case facts, prompt caching cache_control, token budgeting, escalation, multi-agent errors, provenance, memory tool |

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
| `Practice_Questions.html` | 78 QCM corrigés (12 expliqués + 66 sur les 6 scénarios) |
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
