# Corpus de cours CCA-F

Six cours dédupliqués, tirés des 15 PDF de `anthropic_courses/` et cadrés par le
guide officiel CCAR-F v1.0. Périmètre strict : ce que le guide ne teste pas
n'est pas enseigné — voir [out-of-scope.md](out-of-scope.md).

## Comment ça marche

`courses/en/` est **la seule source rédigée**. La traduction vit dans
`courses/po/fr.po` ; `courses/fr/` en est le rendu, produit par po4a et **jamais
édité à la main** — une correction française passe par le `.po`.

```bash
sudo apt install -y po4a   # une fois
npm run build:courses        # régénère courses/fr/ depuis courses/en/ + po/fr.po
npm run render:courses       # régénère les pages HTML publiées
npm run check:courses        # vérifie que rien n'a dérivé de sa source
```

`npm run build:courses` régénère aussi `courses/po/courses.pot` — intégralement
dérivable de `courses/en/`, donc **non suivi par git** (`courses/.gitignore`).
Ne pas s'étonner de le voir apparaître localement ni tenter de le committer.

## La banque de QCM

`courses/practice/page.md` porte la prose française de `Practice_Questions.html`,
`courses/quizzes/PQ.json` ses 112 questions — même schéma que les quiz de
domaine, même renderer. La page est un produit dérivé : `check:courses` refuse
qu'elle diverge de ses sources.

## Les six cours

| Cours | Poids | Task statements |
|---|---|---|
| D0 | — | prérequis, aucun |
| D1 | 27 % | 1.1 – 1.7 |
| D2 | 18 % | 2.1 – 2.5 |
| D3 | 20 % | 3.1 – 3.6 |
| D4 | 20 % | 4.1 – 4.6 |
| D5 | 15 % | 5.1 – 5.6 |

La liste des cours rendus en pages HTML est `PUBLISHED_COURSES`
(`tools/lib/page.mjs`), lue par le renderer et par son contrôle. Ce tableau-ci
décrit, il n'engage rien : il a longtemps porté des cases à cocher dont
`check:courses` tirait un contrat de complétude, ce qui obligeait à finir un
cours avant d'avoir le droit de le committer.

## Une notion, un propriétaire

Le guide se recoupe lui-même — les erreurs structurées sont testées en TS 2.2
*et* en TS 5.3. Chaque notion transverse est donc attribuée à un seul cours ;
ailleurs, un renvoi qui porte la définition en une phrase avant le lien.

La table d'attribution vit dans `tools/lib/courses.mjs` (`OWNED_CONCEPTS`) et
n'est pas recopiée ici : deux copies divergent toujours. `check:courses` la
confronte aux marqueurs `<!-- owns:… -->` et affiche les écarts sans bloquer —
c'est un découpage éditorial, il a le droit d'être remis en question.

## Notions déplacées

`out-of-scope.md` liste ce que le corpus écarte volontairement. Rien ne
listait, jusqu'ici, ce qui est écarté d'un cours *avec renvoi* vers un lot
ultérieur — une notion qui n'apparaît dans aucune fiche de domaine tant que
son cours cible n'est pas écrit, invisible pour qui rédigera ce cours-là.

| Notion | Domaine cible | D'où elle vient | Reprise |
|---|---|---|---|
| Les agents préfèrent les outils intégrés à ceux exposés par MCP ; il faut renforcer les descriptions des outils MCP pour rivaliser | D2 | Écartée de D0 lors de la rédaction du socle API : hors périmètre des prérequis. | ✅ D2 § 2.4. Le guide la porte dans les *Skills* du **TS 2.4**, pas du TS 2.5 comme l'annonçait cette ligne. |
