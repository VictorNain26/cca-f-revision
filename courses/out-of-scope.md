# Ce que le corpus n'enseigne pas

Les prep courses de l'Anthropic Partner Academy débordent largement du guide
CCAR-F v1.0. Ce qui suit est écarté volontairement, avec le motif : un sujet
absent de cette liste et absent des cours est un oubli, pas une décision.

## Ce qu'on ne révise pas

| Source | Sujets | Motif |
|---|---|---|
| `07mcpadvanced` — en entier | sampling, roots, notifications, transports | Aucun task statement ne les couvre. TS 2.4 ne teste que `.mcp.json`, l'expansion de variables d'environnement, la découverte des outils et les resources. |
| `05claudeapi` L43-49 | RAG, chunking, embeddings, BM25, pipelines multi-index | Hors périmètre du guide. D0 le dit explicitement dans sa section sur la context window : nommer les modes de défaillance est tout ce qu'il fait, le retrieval n'est pas la réponse attendue. |
| `05claudeapi` L50-57 | extended thinking, vision, PDF, citations, prompt caching, code execution | Hors périmètre du guide. |
| `05claudeapi` L11 et L15-23 | streaming, workflow d'évaluation | Hors périmètre — **sauf** les jeux de validation étiquetés et la mesure par segment, qui servent TS 5.5 et sont donc enseignés. |

Ces sujets peuvent apparaître comme distracteurs corrigés dans la banque de
questions : les reconnaître pour les écarter fait partie de l'examen, les
maîtriser non.

## Le guide fait loi

Le guide fige l'état de l'outillage en juillet 2026 et la doc Anthropic a bougé
depuis. Sur quatre points, réviser sur la doc à jour conduit à répondre faux :
les cours enseignent la version du guide.

| Sujet | À répondre (guide) | Doc actuelle |
|---|---|---|
| Slash commands / skills | Deux mécanismes distincts, `.claude/commands/` pour l'équipe | Fusionnés : les deux produisent la même commande |
| Spawn de subagents | Outil `Task`, `allowedTools` doit contenir `"Task"` | Renommé `Agent` en Claude Code v2.1.63 |
| `allowed-tools` dans un skill | Restreint l'accès aux outils | Décrit comme une pré-approbation de permissions |
| Sortie structurée | `tool_use` + JSON Schema | Structured Outputs natifs (`output_config.format`) |

Le détail de chaque divergence vit dans
[Exam_Strategy.html](../Exam_Strategy.html) ; ce tableau n'est là
que pour rappeler quelle autorité tranche quand les deux se contredisent.
