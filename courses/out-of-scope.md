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
| `05claudeapi` L12 et L15-23 | streaming, workflow d'évaluation | Hors périmètre — **sauf** les jeux de validation étiquetés et la mesure par segment, qui servent TS 5.5 et sont donc enseignés. L'appendice du guide écarte explicitement « Streaming API implementation or server-sent events ». |
| `05claudeapi` L3 et L10, `building_claude_api` module 1 | les 4 stades internes de génération (tokenisation, embedding, contextualisation, génération), la température | L'appendice du guide les écarte sur trois lignes : « Claude's internal architecture, training process, or model weights », « Token counting algorithms or tokenization specifics », « Embedding models or vector database implementation details ». La température n'est nommée nulle part dans le guide et aucun task statement n'en dépend : D0 la garde en ligne de tableau pour qu'on reconnaisse le champ, sans la développer. |
| `05claudeapi` L2, `building_claude_api` module 1 | familles de modèles Opus / Sonnet / Haiku et règle de sélection | Le guide ne nomme jamais les familles, et son hors-périmètre écarte « Performance benchmarking or model comparison metrics ». Aucun task statement ne s'appuie dessus, aucune question du corpus ne la couvre. Seul reste le champ `model` dans l'anatomie de la requête, les identifiants exacts n'étant pas matière d'examen. |
| `05claudeapi` L3 | flux client → serveur → API en cinq étapes, sécurisation côté serveur | Hors périmètre explicite : « Claude API authentication, billing, or account management » et « OAuth, API key rotation, or authentication protocol details ». |
| `05claudeapi` L4 | obtention de la clé API (console, `Create Key`) | Hors périmètre explicite, même motif : la création de la clé n'est qu'un sous-ensemble de la gestion de compte que l'appendice écarte. |
| `05claudeapi` L13 | pré-remplissage du message assistant + `stop_sequences` pour obtenir une sortie structurée | **Déduction, pas une citation de l'appendice** — contrairement aux autres lignes de ce tableau : l'appendice n'écarte nulle part le pré-remplissage par son nom. Le guide attend `tool_use` + JSON Schema en TS 4.3 ; enseigner le pré-remplissage comme voie concurrente vers la sortie structurée conduirait donc à répondre faux à l'examen. D0 ne garde `stop_sequence` que comme valeur de `stop_reason`. |

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
