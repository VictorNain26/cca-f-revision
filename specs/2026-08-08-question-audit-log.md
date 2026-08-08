# Journal de vérification — audit des 157 questions

Consigne les questions de niveau **N1** (les 12 officielles, fidélité mot à mot au
guide), de niveau **N2** (une source opposable existe) et **toute question modifiée**.
Les questions N3 laissées inchangées n'y figurent pas : un journal où soixante
lignes diraient « cohérent » ne prouverait rien.

Colonne *Verdict* : `conforme`, `corrigé`, `réécrit` (doublon), `task attribuée`,
`hors référentiel`.

| id | Niveau | Verdict | Source ou justification |
|---|---|---|---|
| `pq-q1` | N1 | conforme | Question officielle Q1 du guide CCAR-F v1.0, énoncé et options inchangés. Explication restructurée en un `<li>` par distracteur, sans modification du fond. |
| `pq-q25` | N3 | conforme | Énoncé, options et raisonnement inchangés ; mise en conformité structurelle uniquement (id, `data-opt`, `data-answer`, retrait des lettres en dur). |
| `pq-q26` | N3 | conforme | Énoncé, options et raisonnement inchangés ; mise en conformité structurelle uniquement (id, `data-opt`, `data-answer`, retrait des lettres en dur). |
| `d1-q1` | N3 | réécrit | Recouvrait `pq-q1` à 0,67 (identifiants `get_customer`/`lookup_order`/`process_refund`, valeur `12%` partagés). Réécrite en variante provisioning (`verify_role`/`grant_access`/`revoke_access`, `8%`) testant le même arbitrage garantie déterministe vs conformité probabiliste ; recouvrement max mesuré contre la banque : 0,14. |
| `pq-q13` | N3 | conforme | Énoncé, options et raisonnement inchangés ; mise en conformité structurelle uniquement (id, `data-opt`, `data-answer`, retrait des lettres en dur). |
| `pq-q14` | N3 | conforme | Énoncé, options et raisonnement inchangés ; mise en conformité structurelle uniquement (id, `data-opt`, `data-answer`, retrait des lettres en dur). |
| `d0-q1` | N3 | réécrit | Recouvrait `pq-q13` à 0,56 (mêmes valeurs `stop_reason`/`"tool_use"`/`"end_turn"` et le même cadrage « quelle condition pilote la boucle »). Réécrite en anglais sur l'angle du mécanisme lui-même — la signification de `"max_tokens"` par opposition à `"end_turn"`, `"refusal"` et `"pause_turn"`, toutes déjà documentées dans le tableau D0 §3 — plutôt que la condition d'arrêt de la boucle, qui reste le terrain de `pq-q13`. `data-task="1.1"` posé par décision de cadrage : D0 est un prérequis sans task statement propre, la question déclare donc la task qu'elle prépare (aucune règle du contrat ne l'interdit, la cohérence vérifiée restant `d0-*` → `D0`). Recouvrement max mesuré contre la banque : 0,15 (contre `pq-q13`). |
| `d1-q4` | N3 | réécrit | Recouvrait `pq-q13` à 0,33 (même champ `stop_reason` et même trio de distracteurs — text parsing, plafond d'itérations, présence de texte). Réécrite en anglais sur l'angle du contrôle de flux et de son anti-pattern propre à D1 — un orchestrateur qui pré-calcule la séquence d'outils (arbre de décision codé en dur) au lieu de laisser le modèle décider tour par tour — sans nommer `stop_reason` ni ses valeurs. Recouvrement max mesuré contre la banque : 0,10 (contre `pq-q13`). Recouvrement contre `d0-q1` : 0,00 (aucun identifiant de code ni valeur chiffrée commun — `read_schema`/`plan_changes`/`apply_migration`/`tool_result` d'un côté, `stop_reason`/`"max_tokens"`/`"end_turn"`/`"refusal"`/`"pause_turn"`/`stop_details`/`content` de l'autre). |
