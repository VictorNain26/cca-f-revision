# Migration du corpus CCA-F vers l'Academy Growth Wave

**Ce dossier se suffit à lui-même** : les quatre fichiers et les 72 leçons qu'il
contient ne dépendent d'aucun autre. Il peut être transmis seul, par archive ou
par partage de dossier.

Il est produit automatiquement à partir du corpus CCA-F (dépôt
`cca-f-revision`) et n'est jamais édité à la main : toute correction se fait
dans le corpus, qui régénère ce dossier. Un contrôle du dépôt d'origine refuse
qu'il vieillisse par rapport à sa source, et vérifie qu'aucune leçon ne cite un
chemin qui n'existerait pas ici.

## Ce que l'academy fait déjà

Observé en naviguant le parcours **CCDF** (Claude Certified Developer
Foundations), qui est en production. Le constat qui décide de tout : l'academy
n'est pas un LMS générique à plier à nos besoins — son modèle est déjà celui de
ce corpus.

| L'academy a | Ce corpus a |
|---|---|
| Un parcours par certification, dont un emplacement **« Architect — Foundations (CCAF) » marqué à venir** | Le corpus CCA-F, complet |
| Des modules M1…M5, **tagués par domaine** (M1 porte « D5 D2 »), avec durée, nombre de leçons et part des points | Six cours, un par domaine, avec les poids du guide |
| Trois volets par module : **Cours / Révision / Entraînement** | Les cours, et 157 questions |
| Des leçons numérotées (`/learn/courses/M1/S01`) avec titre, sous-titre, durée en minutes, et un **sélecteur FR/EN** | 36 sections, bilingues par po4a |
| Une banque de questions tirée **au poids du blueprint**, en mode *Explications* (correction immédiate) ou *Examen* | 157 questions pondérées, chacune avec l'explication de chaque distracteur |
| Un **examen blanc** de 53 questions en 120 min, chronométré côté serveur, **seuil 720/1000** | Le format réel : 60 items, 120 min, seuil 720 |
| Un rapport de **réussite par domaine** avec poids, items et taux | Le profil par domaine pondéré de la page d'accueil |

L'examen blanc du CCDF est bloqué avec ce motif, affiché à l'écran : *« L'examen
blanc ouvrira quand la banque de questions sera au niveau de l'examen réel. »*
La banque est donc le goulot d'étranglement de l'academy — et c'est
précisément ce que ce corpus apporte.

## La correspondance

```
courses/en/NN-*.md  ──►  module (M0…M5), une section ## = une leçon SNN
courses/po/fr.po    ──►  la variante FR de chaque leçon (le sélecteur existe déjà)
courses/quizzes/*   ──►  banque de questions, domaine + sous-compétence
data-task 1.1…5.6   ──►  sous-compétence (l'academy en affiche déjà : « 2 sous-competences »)
poids du guide      ──►  pondération du blueprint, qui pilote le tirage
```

`D0` devient `M0` et n'est pas un domaine du blueprint : il porte les prérequis
API que le guide suppose acquis. Il correspond à l'étape « Prise en main » du
parcours CCDF, pas à un module noté — d'où `weight: 0` et `prerequisite: true`.

## Ce que l'export produit

| Fichier | Contenu |
|---|---|
| `blueprint.json` | La certification, le format d'examen, les 5 domaines et leurs poids |
| `modules.json` | 6 modules, 36 leçons, durées estimées, titres FR et EN, chemins |
| `lessons/<M>/<lang>/<S>.md` | 72 fichiers : le Markdown de chaque leçon, frontmatter compris |
| `questions.json` | Les 157 questions, options portant chacune son commentaire |

Le frontmatter d'une leçon porte `module`, `lesson`, `order`, `lang`, `title`,
`domain`, `taskStatement` et `estimatedMinutes` — les métadonnées que l'academy
affiche déjà sur ses propres leçons.

Une question sort sous la forme que l'academy rend à l'écran : un tableau
d'options, chacune avec son `comment`, celles attendues portant
`expected: true`.

Les titres de leçon sont identiques en FR et en EN sur 25 des 36 : ce sont les
libellés des task statements, que le guide fixe en anglais et que le corpus
laisse invariants **à dessein**, pour qu'une question repérée le jour J renvoie
à sa leçon sans traduction. Les onze autres — les prérequis de M0, qui ne sont
pas des task statements — sont traduits.

## Cinq points à trancher avec l'intégrateur

Ce sont les seules inconnues, et aucune n'est bloquante. Je ne les ai pas
devinées faute d'accès au schéma réel.

1. **Le format de fichier source.** Les leçons du CCDF affichent
   `Source: raw/m1/S01`, donc l'academy lit des fichiers, pas une base éditée
   au WYSIWYG. Reste à savoir si c'est du Markdown, du MDX ou du JSON. L'export
   produit du Markdown avec frontmatter : le pivot le moins coûteux à convertir.

2. **Le `stem` d'une question.** Les questions du CCDF sont directes ; celles du
   CCA-F sont des **scénarios**, et le scénario porte la moitié de l'exercice.
   L'export le sort dans un champ `stem` distinct plutôt que de le fondre dans
   l'intitulé, pour que l'academy décide de le rendre au-dessus de la question.
   S'il n'y a pas de champ pour lui, concaténer `stem` + `question` — ne jamais
   le supprimer.

3. **Le HTML inline, dans les questions seulement.** Les leçons sont du
   Markdown pur (zéro balise). Les énoncés de questions, eux, portent 458
   `<code>` autour des identifiants, 27 `<em>`, et quatre paires `<request>` /
   `<rationale>` dans des exemples few-shot. Si l'academy attend du Markdown,
   `<code>x</code>` → `` `x` `` et `<em>x</em>` → `*x*` se scriptent en deux
   lignes ; les deux balises inventées se rendent telles quelles ou en bloc de
   code.

4. **Les encadrés.** Les cours utilisent trois conteneurs — `exam-tip`,
   `key-concept`, `anti-pattern` — qui portent une intention pédagogique, pas
   une décoration. L'academy a au moins un encadré (le disclaimer). Il faut lui
   en donner trois, ou les rendre en citation avec un intitulé en gras.

5. **Les réponses multiples.** Dix questions attendent deux réponses
   (`multipleAnswers: true`) : quatre dans la banque, six dans les
   auto-évaluations de module. Le CCDF n'en montre aucune. Si le moteur ne les
   gère pas, ces dix sortent de la banque plutôt que d'être transformées en
   questions à réponse unique, ce qui les rendrait fausses — l'examen réel en
   pose, et chaque item y annonce combien de réponses cocher.

## Ce qui ne migre pas, et n'a pas à migrer

Le site statique porte des comportements que l'academy a déjà, mieux : le
verrouillage du corrigé, la progression, le profil pondéré, le tirage. Rien à
transporter — c'est du code, et l'academy a le sien.

Ce qui ne se retrouve nulle part en face, en revanche, mérite d'être signalé
avant de fermer le site : la page **Stratégie** (méthodologie QCM, sept patterns
de distracteurs, arbres de décision, cheat sheet), la page **Scénarios** avec
son tableau croisé, et la liste **hors-scope** qui dit ce qu'il ne faut pas
réviser. Ce sont des documents, pas des leçons ; ils tiendraient dans la section
« Ressources » de l'academy, qui est justement marquée à venir.
