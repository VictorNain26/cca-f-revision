# CCA-F Revision Corpus

Corpus complet de révision pour la certification **Claude Certified Architect — Foundations** (CCA-F) lancée par Anthropic en mars 2026.

## Format de l'examen

- 60 QCM scénarisés
- 120 minutes
- Score de passage : 720/1000
- 4 scénarios tirés au sort sur les 6 du pool
- Plateforme : ProctorFree

## Contenu du corpus

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil avec navigation |
| `D0_API_Fundamentals.html` | Prérequis API (chapitres 1-2 du guide) |
| `D1_Architecture_Orchestration_27pct.html` | Domaine 1 — Architecture et orchestration |
| `D2_Tool_Design_MCP_18pct.html` | Domaine 2 — Tool design et MCP |
| `D3_Claude_Code_Config_20pct.html` | Domaine 3 — Configuration Claude Code |
| `D4_Prompt_Engineering_20pct.html` | Domaine 4 — Prompt engineering et structured output |
| `D5_Context_Fiabilite_15pct.html` | Domaine 5 — Context management et reliability |
| `Practice_Questions.html` | 78 QCM corrigés sur les 6 scénarios |
| `Scenarios_Exam.html` | Vue d'ensemble des 6 scénarios + tableau croisé |
| `Exam_Strategy.html` | Cheat sheet jour J, méthodologie QCM, arbres de décision |
| `styles.css` | Design system unifié |

## Couverture par domaine

| Domaine | Poids | Statut |
|---|---|---|
| D1 Architecture & Orchestration | 27 % | 100 % |
| D2 Tool Design & MCP | 18 % | 100 % |
| D3 Claude Code Configuration | 20 % | 100 % |
| D4 Prompt Engineering | 20 % | 100 % |
| D5 Context Management & Reliability | 15 % | 100 % |
| Practice Questions | — | 6/6 scénarios couverts |

## Comment l'utiliser

1. Ouvrir `index.html` dans un navigateur (ou via GitHub Pages)
2. Suivre le planning de révision (`Exam_Strategy.html` → §1)
3. Active recall : faire les QCM, expliquer chaque distracteur à voix haute
4. Réviser le cheat sheet (`Exam_Strategy.html` → §6) la veille de l'examen

## Déploiement — 3 options

### Option A — Repo public + GitHub Pages (gratuit, le plus simple)

L'URL sera publique mais peu indexée si le nom du repo est obscur.

```bash
# Sur ton ordinateur, dans ce dossier :
git init
git add .
git commit -m "Initial corpus CCA-F"

# Crée un repo PUBLIC sur https://github.com/new (par exemple "cca-f-notes")
git remote add origin https://github.com/<TON_USER>/<NOM_REPO>.git
git branch -M main
git push -u origin main

# Active GitHub Pages :
# Settings → Pages → Source: "Deploy from a branch" → Branch: main / root → Save
# URL finale : https://<TON_USER>.github.io/<NOM_REPO>/
```

### Option B — Repo privé + GitHub Pages (GitHub Pro, 4 $/mois)

Identique à l'option A, mais en créant un repo **privé**. Nécessite GitHub Pro, Team ou Enterprise.

```bash
# Idem que A, mais le repo créé sur github.com est PRIVATE
# Settings → Pages : choisir la branche, Visibility "Private"
# URL finale : https://<TON_USER>.github.io/<NOM_REPO>/ — accessible uniquement à toi connecté
```

### Option C — Repo privé + Cloudflare Pages avec Access (gratuit, plus de setup)

Repo GitHub privé classique, déploiement par Cloudflare Pages, protection par auth Cloudflare Access (jusqu'à 50 utilisateurs gratuits).

```bash
# Étape 1 : pousser le repo privé sur GitHub (idem Option A mais Private)

# Étape 2 : sur https://dash.cloudflare.com → Pages → Create application
#   - Connect to Git → choisir ton repo
#   - Build config : Framework "None", Build command vide, Output "/"
#   - Deploy

# Étape 3 : sur Cloudflare Zero Trust → Access → Applications → Add application
#   - Type: Self-hosted
#   - Domain: <ton-projet>.pages.dev
#   - Policy: ajouter ton email comme accès autorisé
```

URL finale : `https://<TON_PROJET>.pages.dev/` accessible uniquement après login Cloudflare Access.

## Mise à jour

```bash
# Après modifications locales :
git add .
git commit -m "Description des changements"
git push
```

GitHub Pages se met à jour automatiquement en 1-2 minutes après le push.

## Sources

Ce corpus est basé sur le guide officiel CCA-F d'Anthropic et les ressources publiques de la communauté (Medium, DEV, AI.cc, Claude Certified Architects). Il couvre 100 % du référentiel des 5 domaines et des 6 scénarios.

---

*Mai 2026 · Corpus complet pour préparation CCA-F en 2-3 semaines.*
