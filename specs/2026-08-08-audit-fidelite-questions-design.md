# Audit de fidélité des 157 questions

**Date** : 8 août 2026
**Statut** : design validé, prêt pour le plan d'implémentation
**Périmètre** : les 45 auto-évaluations des fiches `D0`–`D5` et les 112 QCM de `Practice_Questions.html`

## Contexte

Le corpus couvre les 30 task statements et ses faits techniques ont été alignés sur le guide CCAR-F v1.0. Ce qui n'a jamais été audité, c'est la **matière des questions elles-mêmes** : leur langue, leur exactitude, et leur indépendance les unes des autres.

Six mesures cadrent le problème.

**Les auto-évaluations sont en français.** Les 45 quiz des fiches `D0`–`D5` le sont intégralement — énoncé, options, marqueur `Réponse :`, explication. Seules les 112 questions de `Practice_Questions.html` sont en anglais. L'examen se passe en anglais : une auto-évaluation en français n'entraîne pas la lecture des énoncés et des distracteurs tels qu'ils se présenteront.

**Un quiz sur deux rejoue une question de la banque.** Sur les 45 auto-évaluations, **18** recouvrent un QCM de la banque à 0,50 ou plus, et **6** de plus se situent entre 0,30 et 0,49. Le plafond retenu étant 0,30, ce sont **24 questions de fiche** qui dépassent le seuil et doivent être réécrites. Mesure faite sur l'empreinte des identifiants de code et des valeurs chiffrées — les deux éléments qui survivent à une traduction. Le corpus annonce 157 questions ; il en compte **133** distinctes.

> Ces valeurs ont été recalculées après l'implémentation du module d'index. Les premières mesures du design utilisaient une empreinte qui laissait tomber le signe `%` : les fiches françaises écrivant « 12 % » avec une espace, leur pourcentage n'entrait pas dans l'empreinte. L'empreinte retenue normalise « 12 % » et « 12% » vers le même token, ce qui est la condition pour apparier une fiche française et son jumeau anglais.

**Quatre des douze questions officielles sont déjà servies en fiche.** Q1, Q6, Q10 et Q11 du guide apparaissent en auto-évaluation avant d'être rencontrées dans la banque. Il n'existe que douze questions officielles : ce sont les items les plus précieux du corpus, et ils ne testent plus rien une fois vus.

**Aucune question ne porte d'identifiant.** Les 112 `<details>` de la banque n'ont pas d'attribut `id`. `quiz.js` dérive donc leur identité d'un hash des soixante premiers caractères du `<summary>` (`quizId()`). Toute reformulation d'intitulé détruit l'historique de réponses associé.

**Le domaine n'est pas déclaré, il est deviné.** 106 des 112 questions de la banque citent un task statement dans leur explication (« This is Task 1.4 »), ce qui rend leur domaine dérivable. Six ne citent rien : Q12, Q32, Q46, Q53, Q91, Q112.

**Et aucune auto-évaluation n'en cite.** Les 45 quiz des fiches ne référencent aucun task statement — 0 sur 45, sur les six fiches. Leur `(D1)` en intitulé donne le domaine, jamais la task. Le rattachement existe donc dans l'intention, nulle part dans le balisage. Au total, **51 questions** attendent une attribution de task, pas six.

**Les explications désignent les options par leur lettre.** Exemple, banque Q1 : « B) and C) both rely on probabilistic LLM compliance ». Cette formulation lie l'explication à la position de l'option. Elle empêche tout réordonnancement ultérieur des choix, et elle traite deux distracteurs en une phrase là où le corpus en analyse habituellement un par un.

## Décisions de cadrage

**1. Le contenu avant le moteur.** L'ajout d'un mode examen chronométré, du mélange des options et du rejeu des erreurs constitue un second chantier, spécifié séparément. Il vient après, pour deux raisons : un examen blanc bâti sur des réponses non vérifiées entraîne les mauvais réflexes, et le rejeu des erreurs vit sur un historique que la réécriture des énoncés invalide.

**2. Une seule passe sur chaque question.** Traduction, vérification factuelle, réécriture des doublons, pose des identifiants stables et préparation au mélange se font dans le même geste. Chaque élément pris isolément justifierait une passe complète sur 157 questions ; les cumuler en une seule est le seul arbitrage qui rend le chantier tenable.

**3. Le guide fait loi, même contre la doc à jour.** Là où le guide et la documentation Anthropic actuelle divergent, la réponse attendue reste celle du guide. Les quatre points concernés sont déjà recensés dans `Exam_Strategy.html#guide-vs-doc` : outil `Task` renommé `Agent`, slash commands et skills fusionnés, `allowed-tools` redocumenté en pré-approbation, sorties structurées natives. Un audit conduit naïvement contre la doc courante « corrigerait » ces quatre réponses et détruirait ce que le corpus fait de mieux.

**4. Le biais de lettre ne se corrige pas dans le contenu.** La banque répond A dans 34 cas sur 112, soit 30 %. Réordonner les options pour rééquilibrer obligerait à réécrire toutes les explications qui les désignent, avec un risque d'erreur élevé pour un gain nul : le mélange à l'exécution, prévu au chantier suivant, traite le problème à la racine. Cette passe se contente de rendre le contenu **mélangeable**.

## Le contrat de question

Toute question, de fiche comme de banque, prend cette forme :

```html
<details id="pq-q1" data-domain="D1" data-task="1.4">
<summary>Q1 (Customer Support) — Deterministic tool ordering</summary>
<div>
  <p><strong>Scenario:</strong> Production data shows that in 12% of cases…</p>
  <p><strong>Question:</strong> What change would most effectively address this?</p>
  <p data-opt="a">A) Add a programmatic prerequisite that blocks…</p>
  <p data-opt="b">B) Enhance the system prompt to state…</p>
  <p data-opt="c">C) Add few-shot examples showing…</p>
  <p data-opt="d">D) Implement a routing classifier…</p>
  <hr>
  <p class="correct" data-answer="a">Answer: add a programmatic prerequisite</p>
  <p><strong>Why:</strong> when a specific tool sequence is required…</p>
  <p class="incorrect"><strong>Why the others are wrong:</strong></p>
  <ul>
    <li data-opt="b">Relies on probabilistic LLM compliance…</li>
    <li data-opt="c">Same limit: few-shot examples steer, they do not constrain…</li>
    <li data-opt="d">Addresses tool <em>availability</em>, not tool <em>ordering</em>…</li>
  </ul>
</div>
</details>
```

| Garantie | Raison |
|---|---|
| `id` unique et global — `pq-qN` pour la banque, `dN-qM` pour les fiches | Identité qui survit à une reformulation, et qui distingue les pages pour un tirage inter-fichiers |
| `data-domain` et `data-task` déclarés, à valeur unique | Rend explicite ce qui n'était dérivable qu'en lisant la prose. Aucune question de la banque ne relève de deux domaines à la fois, la mesure le confirme : un seul task statement par question |
| `data-answer` listant les options correctes, séparées par une espace | Devient la **source unique** de la bonne réponse. Les 4 questions à réponses multiples s'expriment dans le même contrat : `data-answer="b d"` |
| Aucune lettre en dur dans le paragraphe « Answer: » | Même raison que pour les `<li>` : après réordonnancement, « Answer: A) » désignerait la mauvaise option. La lettre est réinjectée à l'affichage |
| `data-opt` sur chaque option | Ancre l'identité d'une option indépendamment de sa lettre |
| `data-opt` sur chaque `<li>` d'explication, lettre absente du texte | L'explication reste attachée à son option après réordonnancement ; un `<li>` par distracteur au lieu d'une phrase groupée |
| Bloc quiz intégralement en anglais américain | Langue de l'examen, sur l'ensemble du bloc — la prose pédagogique de la fiche reste en français |

Les 12 questions officielles conservent leurs énoncés, options et réponses **mot à mot**. Seule leur explication est restructurée selon le contrat.

### Conséquence assumée

Poser les `id` change les clés de stockage utilisées par `quiz.js`, qui privilégie `details.id` quand il existe. La progression enregistrée localement est donc réinitialisée une fois. C'est le bon moment : la réécriture des énoncés l'invalide de toute façon.

## Le protocole d'audit

Trois niveaux, selon le risque et selon qu'une source existe.

**N1 — les 12 questions officielles.** Comparaison mot à mot avec le texte du guide : énoncé, options, réponse. Aucune reformulation, même pour améliorer l'anglais — leur valeur est leur fidélité. La méthode d'extraction du PDF sera choisie et validée par un aller-retour au moment de l'implémentation, pas supposée.

**N2 — les questions à fait vérifiable.** Repérées par le type de fait dont dépend la bonne réponse : flag CLI, champ de frontmatter, portée ou précédence de configuration, paramètre ou champ d'API, nom d'outil, limite chiffrée. Chacune recoupée contre `code.claude.com/docs` ou `platform.claude.com/docs`, avec URL et champ cités dans le journal et dans le message de commit. La décision de cadrage 3 s'applique intégralement ici.

**N3 — les questions de jugement architectural.** Aucune source à opposer, donc quatre critères de cohérence interne :

- une seule réponse défendable comme *la meilleure*, pas seulement comme acceptable ;
- chaque distracteur faux pour une raison nommable, et séduisant pour une raison identifiable ;
- aucune paire d'options simultanément correcte ;
- énoncé auto-suffisant : tout ce qui est nécessaire pour trancher y figure.

**Les 51 questions sans task citée.** Six de la banque — Q12, Q32, Q46, Q53, Q91, Q112 — et la totalité des 45 auto-évaluations. Le contrat exige un `data-task` : il est donc attribué par jugement, en rattachant la question au task dont elle teste réellement le réflexe. Cette attribution est une décision, pas une lecture — elle figure au journal avec sa justification.

Pour les 45 auto-évaluations, le jugement est cadré : la task attribuée doit appartenir à la fiche qui héberge le quiz, et les sections de cette fiche portent déjà leur numéro de task dans leur titre. L'attribution consiste donc à rattacher chaque quiz à la section qu'il teste, ce qui vérifie au passage l'affirmation jamais contrôlée selon laquelle chaque fiche évalue ses propres tasks.

Si une question ne se rattache à aucun task, c'est qu'elle est hors référentiel, et le journal doit le dire plutôt que de forcer un rattachement.

**Journal de vérification.** Un fichier listant les questions de niveau N1 et N2 ainsi que toute question modifiée : id, niveau, verdict, source. Les questions N3 inchangées n'y figurent pas — un journal de 157 lignes dont soixante diraient « cohérent » n'aurait aucune valeur de preuve.

## La réécriture des 24 doublons

Règle : même task statement, même principe discriminant, situation métier différente.

La contrainte est vérifiable automatiquement. L'empreinte d'une question est l'ensemble de ses identifiants de code (contenu des `<code>`, en minuscules) et de ses valeurs chiffrées, pourcentages compris — les deux seuls éléments qui survivent à une traduction. Le recouvrement entre deux questions est l'indice de Jaccard de leurs empreintes : intersection sur union. La variante doit tomber **sous 0,30** face à chaque question de la banque. Les 12 officielles restent exclusives à la banque.

Les variantes de fiche restent plus courtes que celles de la banque : une auto-évaluation diagnostique, elle n'entraîne pas.

Exemple, pour la task 1.4 :

| Emplacement | Situation |
|---|---|
| Banque, Q1 (officielle, intacte) | `get_customer` sauté avant `lookup_order`, 12 % de comptes mal identifiés |
| Fiche D1 (réécrite) | `grant_access` appelé avant `verify_role` dans 8 % des tickets de provisioning |

Même arbitrage — garantie déterministe contre conformité probabiliste — sans réponse brûlée.

## Les filets automatiques

### Contrôle neuf : `check-questions.mjs`

Il reconstruit un index des 157 questions en mémoire à chaque exécution, sans artefact généré à maintenir.

| Vérifie | Attrape |
|---|---|
| `id` unique, préfixe conforme au fichier | Collision, copier-coller |
| `data-domain` et `data-task` présents, et cohérents avec la task citée en prose quand elle l'est | Tag qui dérive du contenu |
| `data-opt` sur chaque option ; chaque `<li>` d'explication pointe une option existante | Explication orpheline après réécriture |
| `data-answer` référence des `data-opt` existants, et le paragraphe « Answer: » ne contient aucune lettre en dur | Deux sources de vérité pour la bonne réponse, qui divergeront |
| Nombre d'options entre 4 et 5 | Question tronquée |
| Absence de français dans les blocs quiz — mots-outils et diacritiques, hors `<code>` | Traduction oubliée |
| Recouvrement fiches ↔ banque sous 0,30 | Doublon recréé |
| Les 30 task statements couverts | Régression de couverture |
| `TOTALS` de `home-progress.js` égal au compte réel par page | La valeur codée en dur qui, si elle dérive, empêche un domaine d'atteindre « Terminé » |

**Deux modes, parce qu'un gate rouge pendant trente commits ne protège rien.** Le contrôle exige `data-opt` sur toutes les options : appliqué d'emblée à l'ensemble du corpus, il resterait en échec pendant toute la durée du chantier, et on prendrait l'habitude de le voir rouge — c'est-à-dire de ne plus le lire.

- **Mode progressif**, pendant le chantier : une question **qui porte un `id`** doit satisfaire le contrat en entier ; une question sans `id` est ignorée. Migrer une question la place sous contrôle définitivement, et aucune régression n'est possible sur ce qui est déjà migré.
- **Mode strict**, à la fin : le contrôle exige un `id` sur les 157 questions. Le passage en strict est un commit à lui seul, et c'est lui qui atteste l'achèvement du chantier.

Le compteur de questions migrées est affiché à chaque exécution — c'est l'avancement réel du chantier, mesuré et non déclaré.

### Contrôle modifié : `check-diacritics.mjs`

Il exclut aujourd'hui `Practice_Questions.html` par son nom (ligne 79). Il doit exclure **les blocs quiz** et non plus des fichiers entiers.

Le gain n'est pas d'éviter des faux positifs sur l'anglais — la liste ne contient que des formes qui n'existent pas en anglais. Le gain est que la **prose française de `Practice_Questions.html` échappe aujourd'hui entièrement au contrôle** : ses dix titres de section et son paragraphe « Note de fidélité » sont en français et ne sont jamais vérifiés. Le contrôle reste ligne à ligne, pour conserver le report `fichier:ligne` ; l'appartenance d'une ligne à un bloc quiz se suit par profondeur d'ouverture de `<details>`.

### Modifications de `quiz.js`

Quatre, pas une :

1. **La lettre d'une option est dérivée de sa position**, au lieu d'être lue dans le texte.
2. **La même lettre est réinjectée** devant le `<li>` d'explication portant le même `data-opt`, et devant le paragraphe « Answer: ».
3. **La bonne réponse est lue dans `data-answer`.** `findCorrect()` la parse aujourd'hui depuis le texte du marqueur (`quiz.js:100`). Le contrat retirant la lettre de ce texte, le parsing devient inopérant : `data-answer` devient la source unique. Le fallback sur `Réponse :` / `Answer:` disparaît une fois les 157 questions migrées.
4. **Les questions non encore migrées continuent de fonctionner.** Pendant les 30 tasks, la banque contient un mélange de questions conformes au contrat et de questions à l'ancien format. `quiz.js` détecte la présence de `data-opt` et retombe sur le comportement actuel en son absence. Sans cela, chaque commit intermédiaire casserait les pages non encore traitées.

Le contenu devient réordonnançable sans que le réordonnancement soit implémenté. C'est la frontière tenue entre ce chantier et le suivant.

Le point 4 est temporaire par construction. Sa suppression, une fois les 157 questions migrées, est la dernière étape du chantier — et c'est `check-questions.mjs` passé en mode strict qui autorise cette suppression.

### Contrôle existant : `check-quizzes.mjs`

Il vérifie aujourd'hui que l'énoncé et les choix sont visibles et que la réponse ne fuite pas avant révélation. Ses assertions doivent couvrir les deux formats pendant la migration, puis le seul format cible à la fin. C'est lui qui prouve que le point 4 ci-dessus fonctionne réellement.

## Vérification

1. `npm run check` vert à chaque commit, les quatre contrôles existants plus le nouveau en mode progressif. Le dernier commit du chantier fait passer `check-questions.mjs` en mode strict et doit être vert lui aussi.
2. Contrôle manuel dans le navigateur sur une fiche et sur la banque : énoncé visible, options cliquables, lettre correcte devant chaque option, devant chaque explication et dans le corrigé, réponse masquée avant le clic. Vérifié sur une page migrée **et** sur une page non migrée, tant que les deux coexistent.
3. Remesure du recouvrement fiches ↔ banque après réécriture des 24 variantes : plus aucun couple au-dessus de 0,30.
4. Recomptage du nombre de questions distinctes : 157 attendues.

## Ordre d'exécution

Par **task statement**, non par fichier. Les 30 tasks deviennent l'unité de travail : on rassemble les questions de fiche et de banque d'une même task et on les traite ensemble.

La raison est concrète : les 19 doublons sont par construction groupés par task. Les traiter ensemble est le seul moyen d'écrire une variante qui ne recrée pas le recouvrement qu'on vient de supprimer, puisqu'on a les deux situations sous les yeux. Fichier par fichier, on réécrirait la question de fiche sans voir celle dont il faut s'éloigner.

Les tasks sont abordées dans l'ordre des domaines, D1 d'abord — 27 % de l'examen. Un commit par task ou par groupe de tasks d'un même domaine, `npm run check` vert à chacun.

L'outillage vient **avant** la première task : le contrôle neuf, les modifications de `check-diacritics.mjs` et `check-quizzes.mjs`, et les quatre changements de `quiz.js`.

Un contrôle qu'on n'a jamais vu échouer ne prouve rien. Mais le faire échouer sur le corpus entier non migré ne prouve rien non plus — seulement que rien n'est encore fait. La démonstration porte donc sur **une seule question migrée d'abord**, celle de la première task : on la rend conforme, on vérifie que le contrôle passe, on casse délibérément un `data-opt`, on vérifie qu'il échoue, on rétablit. Ensuite seulement le chantier avance.

## Ce que ce chantier ne fait pas

- Pas de mode examen, de mélange des options ni de rejeu des erreurs — chantier suivant.
- Pas d'agrandissement de la banque au-delà des 24 réécritures.
- Aucune modification de la prose française des fiches, ni de l'accueil, ni du cheat sheet.
- Aucun rééquilibrage des lettres de réponse — voir décision de cadrage 4.
- Aucune migration du contenu vers un format de données : le HTML reste la source de vérité et le site reste statique, sans étape de build.

## Annexe — mesures conservées pour le chantier suivant

Ces éléments ne sont pas traités ici mais ont été mesurés pendant le design, et la décision qu'ils ont produite doit survivre.

**Les deux contraintes de format de l'examen sont inconciliables sur cette banque.** L'examen tire 4 scénarios sur 6 *et* pondère les domaines (D1 27 %, D2 18 %, D3 20 %, D4 20 %, D5 15 %). Or les scénarios de la banque sont fortement spécialisés :

| Scénario | N | D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|---|---|
| S1 Customer Support | 16 | 6 | 4 | 0 | 0 | 6 |
| S2 Code Generation | 14 | 0 | 0 | 13 | 0 | 0 |
| S3 Multi-Agent Research | 16 | 9 | 0 | 0 | 0 | 5 |
| S4 Developer Productivity | 14 | 2 | 12 | 0 | 0 | 0 |
| S5 CI/CD | 14 | 0 | 0 | 5 | 9 | 0 |
| S6 Structured Extraction | 14 | 0 | 0 | 0 | 11 | 2 |

Selon le tirage des 4 scénarios, le pool contient de 2 à 17 questions D1 et de 0 à 16 questions D2, pour des quotas visés de 16 et 11. Un score sur 1000 et un rapport par domaine calculés là-dessus seraient faux.

**Décision retenue** : le mode examen tirera 60 questions par **quotas de domaine** sur toute la banque — 16 D1, 11 D2, 12 D3, 12 D4, 9 D5 — en abandonnant l'habillage « 4 scénarios ». Chaque quota est couvert par la banque (D1 22, D2 20, D3 22, D4 21, D5 21 disponibles). Les six scénarios apparaîtront naturellement, domaine et scénario étant corrélés.

**Limite à afficher à l'utilisateur** : 60 questions tirées sur 112, deux examens blancs consécutifs partagent environ 32 questions. Le second blanc mesure en partie la mémoire. Cela ne se corrige qu'en agrandissant la banque.

**Second manque de fidélité** : 4 questions sur 112 attendent plusieurs réponses. L'examen en contient davantage.
