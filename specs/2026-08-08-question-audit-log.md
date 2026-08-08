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
