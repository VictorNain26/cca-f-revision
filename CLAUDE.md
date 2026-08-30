# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce qu'est ce dépôt

Corpus de révision pour la certification **CCAR-F** (Claude Certified Architect — Foundations), publié en HTML statique sur GitHub Pages (branche `main`, racine). Pas de build de site, pas de serveur, pas de framework : les `.html` de la racine *sont* le site. `package.json` n'outille que les contrôles, les rapports et la génération des pages de cours.

Deux autorités : le **guide d'examen** (`anthropic_courses/CCA-F_Exam_Guide_v1.0.pdf`, CCAR-F v1.0, juillet 2026) définit le périmètre testé ; la **doc Anthropic** (`code.claude.com/docs`, `platform.claude.com/docs`) tranche l'exactitude technique. Le guide fige l'outillage à juillet 2026 et la doc a bougé depuis — sur quatre points (slash commands vs skills, outil `Task`/`Agent`, `allowed-tools`, sortie structurée), la réponse attendue à l'examen est celle du guide. Le README et `Exam_Strategy.html` détaillent lesquels ; un écart trouvé ailleurs vaut la peine d'être signalé avant d'être corrigé dans un sens ou dans l'autre.

## S'orienter

```bash
npm install && sudo apt install -y po4a   # une fois

npm run check                # ce qui bloque : casse et dérive
npm run report               # ce qui informe : longueur, doublons, diacritiques
npm test                     # suite unitaire des outils
node --test tools/lib/courses.test.mjs    # un seul fichier

npm run build:courses        # courses/en/ + po/fr.po → courses/fr/  (po4a)
npm run render:courses       # corpus courses/ → pages HTML publiées
npm run fix:nav              # réécrit la navbar de chaque page depuis nav.js
npm run test:mutation        # lent ; utile après une refonte de tools/lib/courses.mjs
```

## Où vit quoi

Le dépôt tient plusieurs contenus sous forme de **source et de rendu**. Éditer le rendu marche jusqu'à la prochaine régénération, puis le travail disparaît — `check:courses` et `check:nav` sont là pour le dire avant.

```
courses/en/NN-*.md   (seule source rédigée, en anglais)
   ├─ po4a ──────────────→ courses/po/fr.po ──→ courses/fr/NN-*.md
   └─ render-courses.mjs → D0_API_Fundamentals.html … D5_*.html   (fr)
      + courses/quizzes/D*.json  et en/D0_API_Fundamentals.html … (en)

courses/practice/page.md   (prose française)
   + courses/quizzes/PQ.json  (112 questions)
   └─ render-courses.mjs → Practice_Questions.html
```

- Un cours se corrige dans `courses/en/*.md`, puis `build:courses` + `render:courses`.
- Le français d'un cours se corrige dans `courses/po/fr.po` (`courses/fr/` est écrasé).
- Une question d'auto-évaluation se corrige dans `courses/quizzes/D*.json` (le `<details>` de la page est écrasé).
- Un QCM de la banque se corrige dans `courses/quizzes/PQ.json`, sa prose dans `courses/practice/page.md`. Le Markdown place les questions par des marqueurs `<!-- questions:13-28 -->` : la prose dit *où*, le JSON dit *quoi*. La table de couverture est calculée depuis les `data-task` (plus le champ `alsoTasks`, pour une question qui en couvre deux) — ne pas la recopier à la main, elle avait dérivé sur 5 des 30 lignes avant d'être générée.
- `index.html`, `Scenarios_Exam.html` et `Exam_Strategy.html` sont écrits à la main : ils n'ont pas de source ailleurs.

Autres sources uniques : `nav.js` (`LINKS`, `TRANSLATIONS`) pour la navbar de toutes les pages, `tools/lib/page.mjs` (`PUBLISHED_COURSES`) pour la liste des cours rendus, `home-progress.js` (`TOTALS`) pour les totaux du profil par domaine.

## Deux niveaux de contrôle

La séparation est délibérée et vaut comme repère quand on ajoute un contrôle :

- **Bloquant** — ce qui constate une casse : un lien mort, un script absent, un quiz qui se corrige mal, un fichier qui a dérivé de la source dont il est le rendu. Un fait vérifiable, pas un avis.
- **Observation** — ce qui mesure ou arbitre le contenu : conventions de rédaction du corpus (`src`, `owns`, une section par task statement), fraîcheur des traductions, indice de longueur, ressemblance entre questions, orthographe. C'est affiché, ça ne décide pas. Ces règles ont vocation à bouger, et les rendre bloquantes obligerait à finir une refonte avant d'avoir le droit de l'essayer.

Un contrôle qui refuse un commit sur une question de goût finit par se contourner ou se désactiver ; la mesure garde plus de valeur que le verdict. Les rapports documentent chacun leur angle mort — une sortie vide n'y est pas une preuve d'absence de défaut.

## Habitudes observées ici

Ce sont les usages du dépôt, pas des obligations : s'en écarter avec une raison est normal.

- Les en-têtes de module dans `tools/` nomment **le défaut réel que le module attrape**, et ses angles morts connus, plutôt que de décrire son fonctionnement.
- Prose et commentaires en français ; contenu de cours et de quiz en anglais, langue de l'examen ; code et messages de commit en anglais.
- Le dépôt est privé ; les PDF sources sont gitignorés sauf le guide officiel, que la page d'accueil sert en téléchargement.
