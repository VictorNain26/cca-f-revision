# D2 — Tool design and MCP integration (18 %)

<!-- src:exam guide domain 2 (the five task statements) ; 02mcp L2-L3, L5, L9-L10, L14 ; 09apicomplements L5 ; modelcontextprotocol.io Server/Tools ; code.claude.com/docs/en/mcp -->

Eighteen per cent of the score, five task statements, and the domain where the
exam stops asking what an agent can call and starts asking what you put in front
of it: the wording of a description, the shape of an error, the size of a tool
set, the file a server is declared in. One section per task statement, in the
guide's own order and under the guide's own wording, so that a question spotted
on exam day maps to a section here without translation.

<!-- cross-refs:start -->

D0 and D1 are assumed, and both of them defer to this course. D0 named the
anatomy of a tool — `name`, `description`, `input_schema` — and said twice that
**which wording makes the model pick the right tool among several similar ones
is developed in D2.1**, once for the `tools` field and once for the system
prompt keyword that drags a tool onto every turn. D1 deferred the shape of an
error payload to **D2.2** and the scoping of tools across agents to **D2.3**.
Those three debts are paid below.

The guide places neighbouring notions elsewhere, and this course honours that.
`tool_choice` is tested in TS 2.3 *and* in TS 4.3, and D4 owns it: 2.3 states
what it guarantees for tool distribution and points there for the field itself.
The propagation of an error between a subagent and its coordinator is TS 5.3;
this course owns the **shape** of the error, D5 owns what the coordinator does
with it. And what makes a description *load* into a Claude Code session — the
`.claude/agents/` files, `allowedTools`, the settings — is domain 3.

<!-- cross-refs:end -->

## 2.1 — Design effective tool interfaces with clear descriptions and boundaries
<!-- ts:2.1 | src:exam guide TS 2.1 (tool descriptions as the primary mechanism LLMs use for tool selection and minimal descriptions leading to unreliable selection among similar tools, the importance of input formats, example queries, edge cases and boundary explanations, ambiguous or overlapping descriptions causing misrouting with the analyze_content against analyze_document example, and the impact of system prompt wording where keyword-sensitive instructions create unintended tool associations; the skills: descriptions that differentiate purpose, expected inputs, outputs and when to use one tool versus a similar alternative, renaming analyze_content to extract_web_results with a web-specific description, splitting a generic analyze_document into extract_data_points, summarize_content and verify_claim_against_source, and reviewing system prompts for keyword-sensitive instructions that might override well-written tool descriptions) ; 09apicomplements L5 (the description as the single most determining factor of tool performance, the 3-4 sentence minimum and the five things it must cover, grouping related operations behind an action parameter, namespacing a tool with its service name, returning signal only, the optional input_examples field including a call with an optional parameter omitted, and the tool name pattern ^[a-zA-Z0-9_-]{1,64}$) ; 02mcp L5 (defining a tool with the FastMCP @mcp.tool decorator, name and description carried by the decorator and per-parameter descriptions by Pydantic Field, the SDK generating the schema from the type hints) -->

Two tools, both correctly implemented, both connected, both tested. And the
agent keeps calling the wrong one. Nothing is broken — the model chose from the
only thing it had, and what it had was two sentences that said the same thing.

That is the guide's first knowledge point, and it is the sentence the whole
domain rests on: **tool descriptions are the primary mechanism an LLM uses for
tool selection, and minimal descriptions lead to unreliable selection among
similar tools.** The model does not read your implementation. It reads `name`,
`description` and `input_schema`, and it decides.

The guide's own pair is the one to memorise, because it is deliberately banal:

```json
{ "name": "analyze_content",  "description": "Analyzes content and extracts key information." }
{ "name": "analyze_document", "description": "Analyzes documents and extracts key information." }
```

Nothing here is wrong. Both are true. And there is no property in either
sentence that lets a model prefer one over the other, so the routing decision
falls back to whatever the phrasing of the request happens to echo.

### What a description has to carry

The guide names four things that belong in it — **input formats, example
queries, edge cases, and boundary explanations** — and the API documentation
puts a floor under the volume: aim for **three to four sentences minimum**,
covering what the tool does, when to use it and when *not* to, what each
parameter means, what it returns, and its limitations.

```json
{
  "name": "extract_web_results",
  "description": "Extracts the ranked result list from a fetched search-engine
    results page: title, URL, snippet and rank for each entry. Use this AFTER a
    page has been retrieved, and only on a SERP — for the body text of an
    ordinary article or a PDF, use extract_data_points instead. Returns an empty
    list, not an error, when the page carries no results. Does not follow the
    result links.",
  "input_schema": {
    "type": "object",
    "properties": {
      "html": { "type": "string", "description": "Raw HTML of the results page" },
      "max_results": { "type": "integer", "description": "Cap on entries returned; default 10" }
    },
    "required": ["html"]
  },
  "input_examples": [
    { "html": "<html>…</html>", "max_results": 25 },
    { "html": "<html>…</html>" }
  ]
}
```

Two details of that block are cheap and often skipped. `input_examples` shows
typical calls **including one with the optional parameter omitted**, which is
how the model learns that omitting it is legitimate rather than an oversight.
And the negative clause — "for an ordinary article, use `extract_data_points`
instead" — is the boundary explanation: it names the sibling tool, so the
description does the disambiguation instead of leaving it to the request.

::: key-concept
**The boundary belongs in the description of both tools, not one of them.**
Enriching a single side leaves the other just as attractive for the same
requests, and the misrouting simply reverses direction. A pair of tools is
disambiguated as a pair.
:::

### The three repairs, and which symptom calls for which

The guide's skills are three distinct moves. Reading the scenario for which one
it describes is most of the work on this task statement.

| Symptom in the scenario | Move | The guide's example |
|---|---|---|
| Two tools whose descriptions overlap semantically | **Rename and rewrite** so the name and the sentence state what is really returned | `analyze_content` → `extract_web_results`, with a web-specific description |
| One generic tool used far outside its intended scope | **Replace with a constrained tool** whose contract rejects the misuse | `fetch_url` → `load_document`, developed in 2.3 |
| One catch-all tool doing three unrelated jobs | **Split into purpose-specific tools** with defined input/output contracts | `analyze_document` → `extract_data_points`, `summarize_content`, `verify_claim_against_source` |

The split deserves a second look, because it is the one that looks like extra
work. A tool named `analyze_document` has no output contract: "analysis" can be
a summary, a table of figures, or a verdict on a claim, and the model picks by
guessing. Three tools with three names each carry an implicit promise about
what comes back, and the promise is what makes the selection decidable.

Splitting is not free, and 2.3 is the counterweight: a tool set that grows past
four or five degrades selection for a different reason. Split a tool because its
jobs have different output contracts, not because more tools are tidier.

### Naming, so the name works with the description

Two habits from the API documentation, both mechanical:

- **Namespace with the service.** `github_list_prs`, `slack_send_message`. A
  bare `search` in a session holding four servers is an invitation to misroute.
- **Group related operations behind an `action` parameter** rather than
  shipping `create_pr`, `review_pr` and `merge_pr` as three tools. The same
  economy the tool-count rule of 2.3 asks for, applied at design time.

The name itself must match `^[a-zA-Z0-9_-]{1,64}$`, which allows letters,
digits, underscore and hyphen, up to sixty-four characters.

::: key-concept
**Return signal, not filler.** A tool that answers with a wall of boilerplate
spends the agent's context on text no decision depends on. Return semantic
identifiers — UUIDs, slugs, names — and let a follow-up call fetch the rest.
Trimming verbose tool output is D5's territory; choosing what a tool returns in
the first place is a design decision, and it is made here.
:::

### The system prompt can override a good description

This is the guide's fourth knowledge point and the one people miss, because the
tool definitions are where they are looking. **A keyword-sensitive instruction in
the system prompt creates unintended tool associations.**

```text
# System prompt
You are a support assistant. ALWAYS verify the customer's identity before
answering anything.
```

Nothing in that sentence names a tool. But "verify the customer" matches
`get_customer` closely enough, and "always" carries further than any per-turn
wording, so the model now calls `get_customer` on turns where identity is not in
question, including "what are your opening hours". The tool descriptions are
fine. The instruction above them is what routed the turn.

The guide's skill is a review, not a rewrite: **read the system prompt for
keyword-sensitive instructions that might override well-written tool
descriptions.** The fix is to scope the absolute — "verify the customer's
identity before disclosing order or account data" — so the keyword stops
attaching to every turn.

::: exam-tip
Read the scenario for what it says is *poor*, because the guide's three repairs
map onto three different complaints.

"The two descriptions are nearly identical" → rename the overlapping tool and
rewrite both descriptions. "One tool is asked to do three unrelated things" →
split it. "An instruction in the system prompt says *always*" → the root cause
is the prompt, not the descriptions.

The distractors here are all plausible engineering, and each one leaves the
ambiguity in place. Adding few-shot routing examples to the system prompt pays
tokens on every single turn and never touches the sentences the model actually
selects on. Building a routing layer that classifies the request before any tool
is offered replaces the natural-language understanding the model already has
with a component you now maintain. Merging the two tools into one generic
`lookup_entity` is a defensible architecture and a very large step when the
immediate defect is two thin sentences. And enriching only one of the two
descriptions leaves the other just as attractive, so the misrouting persists in
the other direction.
:::

::: anti-pattern
**Writing the description for a human reader.** "Analyzes documents" tells a
colleague enough because the colleague will read the code. The model will not.

**Letting the schema carry the meaning alone.** A parameter named `mode` with an
`enum` of five values and no per-value description is a decision the model has
to make with no information. Field descriptions are part of the tool's
description surface. With the MCP Python SDK they come from
`Field(description=…)` on each parameter, and the SDK builds the schema from the
type hints around them.
:::

**To test** — bank questions tagged `data-task="2.1"`.

## 2.2 — Implement structured error responses for MCP tools
<!-- ts:2.2 | src:exam guide TS 2.2 (the MCP isError flag pattern for communicating tool failures back to the agent, the distinction between transient, validation, business and permission errors, why uniform "Operation failed" responses prevent appropriate recovery decisions, and the difference between retryable and non-retryable errors with structured metadata preventing wasted retries; the skills: returning errorCategory, isRetryable and human-readable descriptions, retriable: false plus customer-friendly explanations for business rule violations, local error recovery inside subagents propagating to the coordinator only what cannot be resolved locally along with partial results and what was attempted, and distinguishing access failures from valid empty results) ; 09apicomplements L5 (is_error in a tool_result block and the explicit statement that errorCategory, isRetryable and a human-readable description are an application-level convention placed in the content, not fields of the protocol) ; 02mcp L5 (an MCP tool raising ValueError when the requested document id is absent, error handling integrating with ordinary Python exceptions) ; modelcontextprotocol.io, Server/Tools (the two error mechanisms: protocol errors reported as standard JSON-RPC errors for an unknown tool, invalid arguments or a server fault, against tool execution errors reported inside a successful result with isError true — API failures, invalid input data and business rule violations — and content as an array of content blocks) -->
<!-- owns:structured-errors -->

A tool fails. The agent now has to decide one thing: call it again, change the
arguments, tell the user, or hand over to a human. Every one of those decisions
is made from the payload the tool returned — and this is what the payload
usually says:

```json
{ "isError": true, "content": [{ "type": "text", "text": "Operation failed" }] }
```

The guide's knowledge point is the consequence: **uniform error responses
prevent the agent from making appropriate recovery decisions.** The agent will
still do *something*. It will retry a permission denial four times, or give up
on a timeout that would have cleared on the second attempt, because nothing in
the payload distinguishes them.

`isError` is the flag MCP gives you: it tells the agent the call failed rather
than returning data. Everything that makes the failure actionable is what you
put beside it.

```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "{\"errorCategory\": \"transient\", \"isRetryable\": true, \"description\": \"Order service timed out after 5s. Retry in a few seconds.\", \"attempted_query\": \"order_id=12345\"}"
  }]
}
```

::: key-concept
**`errorCategory`, `isRetryable` and the human-readable description are not
fields of the MCP protocol.** They are an application-level convention, and they
live inside the text of the content block, as prose or as stringified JSON. What
the protocol gives you is `isError`; the structure is yours to impose, and the
guide tests you on imposing it consistently.

Two points of form that go with it. `content` is an **array of content blocks**,
never a bare string and never an object. The structured metadata therefore has
to live inside a block, which is exactly why it is encoded as text. And the same
convention on the Claude API side is a `tool_result` block carrying
`is_error: true`, whose `content` is what the model reads to decide what to do
next. Same discipline, different envelope.

Last, a spelling detail worth neutralising before it costs you a point: **the
guide itself writes both `isRetryable` and `retriable`**, two bullets apart in
the same "Skills in" block. It uses `isRetryable` for the general boolean and
`retriable: false` for business rule violations. Neither is a normalised field,
so neither can be the trapped one: they are application conventions carried in
the error content, like `errorCategory`. An option using one spelling is not
wrong because it did not use the other.
:::

### Two error mechanisms, and only one of them is yours

Before the categories, a frontier the protocol draws and a distractor loves.
MCP reports failures in **two different places**, and they are not
interchangeable.

| Mechanism | Reported as | Covers |
|---|---|---|
| **Protocol error** | A standard JSON-RPC error — the call itself did not go through | Unknown tool, invalid arguments, server fault |
| **Tool execution error** | A **successful result** carrying `isError: true` | API failure, invalid input data, business rule violation |

Read the second row twice, because it is counter-intuitive and it is the whole
of this task statement. **A violated business rule is not a protocol error.**
The call reached the tool, the tool ran, and it decided the operation must not
happen. The answer therefore comes back as a normal result whose `isError` is
true and whose content the agent can read. A booking outside the 90-day horizon
is not a malformed request; it is a request the tool understood and refused.

That is why everything below is about the *content* of a result rather than
about error codes. The protocol errors are the transport's business and there
is nothing for you to design in them. The execution errors are yours, and the
agent's recovery decision is made entirely out of what you put in them.

### The four categories, and the decision each one enables

| `errorCategory` | Examples | `isRetryable` | What the agent should do |
|---|---|---|---|
| `transient` | Timeout, 503, network failure | `true` | Retry locally; propagate only if it keeps failing |
| `validation` | Invalid input, required field missing | `true`, once the input is fixed | Correct the arguments and call again |
| `business` | Policy violation, threshold exceeded | `false` | Explain to the user; offer an alternative |
| `permission` | Access denied, insufficient privilege | `false` | Escalate to a human; retrying changes nothing |

The two right-hand columns are the whole point. Retryability is a claim about
whether repeating the call can succeed, and it is knowable at the tool, not at
the agent. **Structured metadata prevents wasted retry attempts**. That is the
guide's phrasing, and the waste is billed per attempt.

The row that is misread most often is `validation`. It is retryable, and its
retry is not a repetition: the agent repairs its own arguments and calls again.
Filing it beside `permission` because "the call failed for a reason the tool
gave" costs you a recovery the agent could have made alone.

### Business errors need a sentence a customer can hear

The guide asks for two things on a business rule violation: **`retriable: false`
and a customer-friendly explanation**. The second is not decoration. The agent
is going to relay this to somebody, and "BOOKING_RULE_4171" relays badly.

```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "{\"errorCategory\": \"business\", \"retriable\": false, \"description\": \"Appointments cannot be booked more than 90 days ahead. The earliest available slot inside that window is 12 March.\", \"policy\": \"booking_horizon_90d\"}"
  }]
}
```

The machine-readable code stays, for logs and for routing. The sentence beside
it is what lets the agent answer the customer without inventing the rule.

### An access failure is not an empty result

The guide's last skill on this task statement is a distinction, and it is the
one that produces silent wrong answers rather than loud ones.

| | What happened | Correct payload |
|---|---|---|
| **Access failure** | The query never ran — timeout, 503, refused connection | `isError: true`, category `transient`, `isRetryable: true` |
| **Valid empty result** | The query ran and matched nothing | **Not an error.** A success carrying an empty list |

Collapse them and you get one of two defects. Report the empty result as an
error and the agent retries a question that has already been answered. Report
the timeout as an empty result and the agent concludes, in good faith, that
there is nothing to find, and the gap never appears in the final answer.

```json
// Not an error: the catalogue was searched, and it holds no match.
{ "isError": false, "content": [{ "type": "text",
  "text": "{\"results\": [], \"searched\": \"parts_catalog\", \"query\": \"part_no=88-2210\"}" }] }
```

### Local recovery, and what crosses the boundary

The guide asks for **local error recovery within subagents**: a subagent handles
its own transient failures and propagates to the coordinator only what it cannot
resolve locally, **together with its partial results and what it attempted**.

```json
{
  "status": "partial",
  "completed": ["order_lookup", "customer_profile"],
  "failed": [{
    "step": "shipping_status",
    "errorCategory": "permission",
    "isRetryable": false,
    "attempted": "carrier_api.track(tracking_id=1Z999) — 3 attempts, 403 each time",
    "description": "The carrier account has no tracking scope. A human must grant it."
  }]
}
```

Three properties make that payload useful upstream: the partial results survive,
the failed step names its category so the coordinator does not re-attempt a
permission denial, and `attempted` says what was already tried so the retry
budget is not spent twice on the same call.

::: key-concept
**Where this course stops.** The *shape* of the error — the flag, the category,
the retryability, the customer-facing sentence, the partial-result envelope — is
tested here, in TS 2.2. What a coordinator does when that envelope arrives —
continuing on partial results, annotating the final output with what stayed
uncovered, deciding when to escalate — is error propagation across agents, tested
in TS 5.3 and developed in D5. D1's TS 1.2 already stated the routing rule and
pointed here for the payload.
:::

::: exam-tip
The generic `"Operation failed"` payload is the anti-pattern the task statement
is built around, and the question usually asks *why* it blocks the agent rather
than what to replace it with. The answer names a decision the agent can no
longer make: whether the call is worth repeating, and whether it actually
received nothing or never got through.

The distractors soften the defect rather than repairing it. Saying a timeout is
"a delay, not a real failure" and clearing the flag hides the failure entirely.
Calling the payload malformed misreads the defect: it parses and reaches the
agent intact; it is empty of decision metadata, not broken. Blaming the message
for being too short for a human aims at the wrong reader. And claiming the four
categories come from the MCP specification inverts the actual arrangement:
`isError` is the protocol's, the categories are yours.
:::

::: anti-pattern
**Raising a raw exception and letting the framework stringify it.** A Python
`ValueError` surfaced through the SDK becomes a message, and a message with no
category is a `"Operation failed"` with more words. Catch it, classify it, and
return the structured payload.

**Propagating every transient failure to the coordinator.** It converts a retry
the subagent could have done silently into a round trip, and the coordinator has
less context to decide with than the subagent that made the call.
:::

**To test** — bank questions tagged `data-task="2.2"`.

## 2.3 — Distribute tools appropriately across agents and configure tool choice
<!-- ts:2.3 | src:exam guide TS 2.3 (giving an agent access to too many tools — 18 instead of 4-5 — degrading tool selection reliability by increasing decision complexity, agents with tools outside their specialization tending to misuse them such as a synthesis agent attempting web searches, scoped tool access with limited cross-role tools for specific high-frequency needs, and the tool_choice options "auto", "any" and forced selection; the skills: restricting each subagent's tool set to its role, replacing fetch_url with a load_document that validates document URLs, providing a scoped verify_fact for the synthesis agent while routing complex cases through the coordinator, forcing extract_metadata before the enrichment tools and processing subsequent steps in follow-up turns, and setting tool_choice "any" to guarantee a tool call rather than conversational text) ; 09apicomplements L5 (the two uses the guide names for tool_choice: forcing a named tool first then handling later steps in follow-up turns, and "any" to guarantee a call instead of conversational text) -->

Every tool you add to an agent is a branch it has to evaluate on every turn.
The guide puts a number on where that stops working: **giving an agent access to
too many tools — 18 instead of 4-5 — degrades tool selection reliability by
increasing decision complexity.**

This is D1's debt, and it is worth being precise about what it claims. Nothing
degrades in the model; what degrades is the decision. Eighteen descriptions,
some of them adjacent, produce a selection problem that no individual
description can solve, which is why 2.1's remedy is the wrong answer here, and
why reading the scenario matters more than knowing both remedies.

::: exam-tip
The two task statements share a symptom — the wrong tool gets called — and split
on the evidence the scenario gives you.

"Descriptions are minimal", "the two read alike" → this is 2.1: rewrite, rename,
split. "The agent has eighteen tools", "it holds tools from three different
roles" → this is 2.3: cut the set down to the role.

Rewriting descriptions when the scenario counted the tools is the distractor
that catches people who learned only one of the two answers.
:::

### Scoped tool access

The second knowledge point explains what goes wrong beyond the count: **agents
with tools outside their specialization tend to misuse them**. The guide's own
case is a synthesis agent attempting web searches. The tool is there, the turn
is hard, and reaching for it is a locally sensible move that produces work
nobody asked for.

So each subagent gets the tools its role needs, and no others:

| Subagent | Tools | Deliberately absent |
|---|---|---|
| Web research | `web_search`, `load_document` | Anything that writes |
| Document analysis | `load_document`, `extract_data_points`, `summarize_content` | `web_search` — not its role |
| Synthesis | `read_findings`, `write_report`, `verify_fact` | `web_search` — see below |

A tool you leave out is not in the agent's session at all. There is no prompt to
ignore and no refusal to log: the agent simply works without it. That is what
makes the omission stronger than the instruction.

### Constrain the tool rather than instruct around it

The guide's second skill is a substitution: **replace `fetch_url` with
`load_document`, which validates that the URL points at a document.** The
scenario behind it is a document-analysis subagent that, holding a tool able to
retrieve any URL, ends up downloading search-engine result pages instead of
documents.

```json
{
  "name": "load_document",
  "description": "Fetches a document by URL and returns its text. Accepts PDF,
    DOCX, TXT and Markdown URLs only; rejects any other URL with a validation
    error. Use this to read a document you already have the address of — it does
    not search, and it does not follow links inside the document.",
  "input_schema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "Direct URL to a .pdf, .docx, .txt or .md file" }
    },
    "required": ["url"]
  }
}
```

::: key-concept
**A constraint at the interface beats a constraint in the prompt.** "Only fetch
documents" is an instruction the model weighs against everything else in its
context. A tool that rejects a non-document URL is a contract: the wrong call
stops being discouraged and starts being impossible, and it returns a
`validation` error the agent can act on, which is 2.2 arriving as a design
consequence.
:::

### Cross-role tools, scoped rather than opened

Strict scoping has a cost, and the guide names the case: the synthesis agent
needs to check a single claim constantly. Sending each check back through the
coordinator — which invokes the web research agent, waits, and relays the answer
— pays two or three round trips for what is usually a date or a name.

The guide's answer is neither "give it web search" nor "keep sending it back".
It is **a limited cross-role tool for a specific high-frequency need**:

```json
{
  "name": "verify_fact",
  "description": "Verifies one specific claim against a named source document
    and returns a confidence level (high/medium/low) with the supporting
    excerpt. Use this only to check a claim you can already state and whose
    source you can already name — for open-ended research, route the request
    through the coordinator to the web research agent.",
  "input_schema": {
    "type": "object",
    "properties": {
      "claim":     { "type": "string", "description": "The single claim to verify" },
      "source_id": { "type": "string", "description": "Id of the source document to check against" }
    },
    "required": ["claim", "source_id"]
  }
}
```

Two properties make it a scoped cross-role tool rather than a hole in the
scoping. It is narrower in capability than the tool it replaces: it checks a
claim against a named source, it does not search. And its description states
where its remit ends, so **the complex cases keep going through the
coordinator**. The high-frequency simple case gets a direct path; the rest keeps
the architecture.

### `tool_choice`, and what it guarantees here

`tool_choice` is the request field that decides whether calling a tool is
optional, mandatory, or mandatory and named. **The field itself — all four
values, their behaviour under extended thinking, and their use for structured
output — is taught in D4.3, which owns it.** What belongs to this task statement
is the two uses the guide names, and one thing it does not fix.

| Guide's use | Value | Why |
|---|---|---|
| Guarantee a tool call rather than conversational text | `{"type": "any"}` | The model must call *a* tool; it still picks which |
| Force a specific tool to run first | `{"type": "tool", "name": "extract_metadata"}` | Pins that exact tool for the turn; the enrichment steps run in follow-up turns |

```json
{
  "tools": [ /* extract_metadata, enrich_entities, score_relevance */ ],
  "tool_choice": { "type": "tool", "name": "extract_metadata" }
}
```

Note what the forced call buys and what it does not. It fixes the **first**
action of the turn. Sequencing the rest is a matter of processing the result and
issuing another request. The ordering lives in your loop, not in a single
parameter.

::: exam-tip
`tool_choice: {"type": "any"}` guarantees that a tool is called. It does not
guarantee that the *right* one is called, and it says nothing about the shape of
what comes back. An option offering it as the cure for a misrouting scenario is
answering a selection problem with a compulsion.

Forced selection is the answer when the scenario names an order: "the screening
must run before anything else", "metadata must be extracted before enrichment".
A sentence in the tool description saying it should always run first stays
probabilistic where the parameter is deterministic.
:::

::: anti-pattern
**Giving an agent every tool "just in case".** It buys nothing the agent needed
and costs the selection reliability of everything it did need, plus the misuse
the guide predicts for tools outside the role.

**Merging tools into one generic entry point with a `mode` parameter to get the
count down.** The count falls and the decision does not disappear: it moves into
an argument, where the tool descriptions can no longer guide it.

**Batching the synthesis agent's checks and sending them to the coordinator at
the end of the pass.** It removes the round trips and it also means the synthesis
was written before anything in it was verified.
:::

**To test** — bank questions tagged `data-task="2.3"`.

## 2.4 — Integrate MCP servers into Claude Code and agent workflows
<!-- ts:2.4 | src:exam guide TS 2.4 (project-level .mcp.json for shared team tooling against user-level ~/.claude.json for personal or experimental servers, environment variable expansion such as ${GITHUB_TOKEN} for credential management without committing secrets, tools from all configured MCP servers being discovered at connection time and available simultaneously, and MCP resources as a mechanism for exposing content catalogs such as issue summaries, documentation hierarchies and database schemas to reduce exploratory tool calls; the skills: configuring shared servers in project-scoped .mcp.json with environment variable expansion for authentication tokens, configuring personal servers in user-scoped ~/.claude.json, enhancing MCP tool descriptions to explain capabilities and outputs in detail so the agent stops preferring built-in tools like Grep, choosing existing community MCP servers over custom implementations for standard integrations such as Jira while reserving custom servers for team-specific workflows, and exposing content catalogs as MCP resources) ; 02mcp L2 (MCP as a communication layer that shifts tool definition and execution from your server to dedicated MCP servers, the GitHub example, anyone being able to author a server and service providers often publishing official ones, and the distinction from tool use — MCP supplies the schemas and functions, tool use is how Claude calls them), L3 (the client as the bridge, ListToolsRequest/ListToolsResult and CallToolRequest/CallToolResult, and the twelve-step flow in which tools are listed before the query reaches Claude), L9 (resources as read handlers analogous to HTTP GET, direct resources with static URIs against templated resources whose URI parameters become keyword arguments, and mime_type as the hint to the client), L10 (resource content injected straight into the prompt so no tool call is needed to fetch it), L14 (tools are model-controlled, resources are app-controlled, prompts are user-controlled) ; code.claude.com/docs/en/mcp (the .mcp.json body: mcpServers with command, args, env and the type field "stdio" or "http" ; claude mcp add --scope user writing to ~/.claude.json ; expansion of ${VAR} and ${VAR:-default} in command, args, env, url and headers ; an undefined variable with no default warning yet loading the server with the unexpanded ${VAR} text) -->
<!-- owns:mcp-resources -->

Everything this task statement configures is a connection to an MCP server.
**MCP shifts the burden of tool definition and execution off your application
and onto dedicated servers.** Without it, exposing GitHub to Claude means you
author, test and maintain a schema and a function for every repository, pull
request and issue operation you want. With it, you connect to a GitHub MCP
server that already carries them.

That is also the answer to the question the course flags as a common confusion:
**MCP and tool use are not the same thing.** Tool use is how Claude calls a
tool. MCP is where the tool came from: someone else already wrote it.

### The two scopes

A server is declared at one of two scopes, and the choice turns on a single
question: does the whole team need it?

| Scope | File | Shared? | For |
|---|---|---|---|
| **Project** | `.mcp.json` at the repository root | Yes — tracked in version control, present after a clone | Team tooling: Jira, GitHub, the internal knowledge base |
| **User** | `~/.claude.json` | No — local to the machine | Personal or experimental servers: your notes, a prototype |

`claude mcp add --scope user` writes to that second file: the command and its
effect are the same fact seen from two sides, and the guide's wording and the
tool's behaviour agree here.

They coexist. **Tools from all configured MCP servers are discovered at
connection time and are available to the agent simultaneously**, whatever scope
declared them. Putting a personal server in `~/.claude.json` does not cut you
off from the project servers. You get the union.

That discovery-at-connection-time property is worth holding as a mechanism and
not just a fact. The client asks each server what it provides — a
`ListToolsRequest`, answered with a `ListToolsResult` — and the collected tool
definitions are what accompanies the user's query to Claude. Nothing is
discovered lazily mid-turn: a server that failed to start simply has no tools in
the set, and the agent works without them exactly as if you had never declared
it.

### Secrets, by environment variable expansion

`.mcp.json` is tracked. Tokens are not. The guide's mechanism is **environment
variable expansion**:

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

`${GITHUB_TOKEN}` resolves at launch from the developer's own environment. The
file can be committed and shared; each teammate supplies their own credential,
and the repository never carries one. `type` says how the server is reached:
`"stdio"` for a process launched by `command`, `"http"` for one reached at a
`url`.

Two properties of the expansion are worth carrying. It accepts a **default**,
written `${VAR:-default}`, so an optional setting can ship with a value while a
credential stays mandatory. And it applies to more than `env`: `command`,
`args`, `env`, `url` and `headers` all go through it, which is what lets a
server's address or its authorisation header be per-developer too.

```json
"env": {
  "GITHUB_TOKEN": "${GITHUB_TOKEN}",
  "GITHUB_API_URL": "${GITHUB_API_URL:-https://api.github.com}"
}
```

::: key-concept
**An undefined variable does not stop the server from loading.** With no value
in the environment and no default, Claude Code warns and then starts the server
anyway, passing the literal text `${GITHUB_TOKEN}` through. Nothing fails at
configuration time; the server comes up and every call it makes is
unauthenticated.

That is the operational trap behind this mechanism, and it is why the symptom
to recognise is a *working* configuration whose tools all return authentication
errors. The fix is in the developer's environment, not in `.mcp.json`.
:::

::: anti-pattern
**A token written in clear in a tracked `.mcp.json`.** Deleting it later does not
help: git history keeps it. The credential has to be treated as compromised and
rotated. `${VAR}` or the untracked `~/.claude.json` are the two legitimate
places.

**A personal, machine-specific server added to the tracked `.mcp.json`**,
pointing at an absolute path under one person's home directory or at a binary
nobody else has. Every clone inherits a server that cannot start. It belongs in
`~/.claude.json`, where it still loads for its author and reaches nobody else.
:::

### Resources, and why they exist beside tools

MCP servers expose three primitives, and the guide is explicit about which two
it tests. Its appendix names **MCP tools and MCP resources**; the in-scope list
says "MCP tool and resource design". Prompts are listed here so you recognise
them as a distractor.

| Primitive | Controlled by | Purpose | Reach for it when |
|---|---|---|---|
| **Tools** | The model | Give Claude a capability it can invoke | Claude has to *do* something |
| **Resources** | The application | Expose readable data | Your application needs data for its interface or its prompt |
| **Prompts** | The user | Predefined workflows behind a slash command or a button | Not tested by this exam |

A resource is closer to an HTTP `GET` handler than to a tool: a URI comes in,
data goes out, and **your application decides when to read it**. The model does
not call it. A direct resource has a static URI; a templated one carries
parameters in the URI, which the SDK parses and hands to your function as
keyword arguments.

```python
@mcp.resource("docs://documents", mime_type="application/json")
def list_docs() -> list[str]:
    return list(docs.keys())            # the catalogue

@mcp.resource("docs://documents/{doc_id}", mime_type="text/plain")
def fetch_doc(doc_id: str) -> str:      # one entry, by URI parameter
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")
    return docs[doc_id]
```

::: key-concept
**Resources as content catalogs.** This is the guide's own framing and the reason
resources are tested at all: exposing a catalogue — issue summaries, a
documentation hierarchy, a database schema — **reduces exploratory tool calls.**

Without it, an agent asked about a table it has never seen spends three or four
calls discovering that the table exists, then its columns, then its keys. With
the schema exposed as a resource, the application reads it once and puts it in
the prompt, and the first call the agent makes is the one that does the work.
`mime_type` tells the client how to parse what comes back: `application/json`
for structured data, `text/plain` for text.

The division of labour is the thing to remember: **tools serve the model,
resources serve your application, prompts serve your users.**
:::

### When the agent ignores your MCP tool and uses `Grep` instead

You connect a server exposing a code-search tool far more capable than `Grep` —
it understands structure, follows imports, returns context. The agent keeps
calling `Grep`. The server is up, the tool is listed: this is not a configuration
fault.

The cause is 2.1's, seen from the integration side. Built-in tools ship with
detailed, well-tested descriptions. Many MCP tools carry one line generated from
a function name. Faced with `"Search files"` on one side and `Grep`'s full
description on the other, the model picks the one it understands.

The guide's skill is the repair: **enhance the MCP tool's description to explain
its capabilities and outputs in detail**, so it stops losing the comparison.

```text
# Before — loses to Grep every time
Search files.

# After — states capability, output, and what the built-in cannot do
Searches the indexed codebase semantically. Given a symbol or a natural-language
description, returns the definition site, every caller with its file and line,
and the import chain that connects them. Unlike a textual search, it resolves
re-exports and aliases, so a function reached through a wrapper module is still
found. Use it to trace how a symbol is used across the repository; use Grep for
a literal string you can spell exactly.
```

::: exam-tip
When a scenario describes an agent preferring a built-in tool over a more
capable MCP one, the answer is to repair the description, which is the cheapest
lever and the one that addresses the cause.

It is not to remove or disable the built-in tool, which takes away a capability
that is legitimately useful for literal searches. It is not to add an
instruction to the system prompt telling the agent to prefer the MCP tool, which
is 2.1's keyword-sensitivity trap turned into policy. And it is not to build a
routing layer in front of the tools, which replaces a two-sentence fix with a
component to maintain.
:::

### Community server or custom server

The last skill is a build-or-adopt decision with a default: **use an existing
community MCP server for standard integrations** — Jira, GitHub, Slack — and
**reserve a custom server for workflows specific to your team** that nobody else
has implemented. Anyone can author a server, and service providers often publish
official ones, so the standard integration you are about to write probably
exists, maintained, with its schemas already tested.

::: anti-pattern
**Writing a custom Jira server because the community one lacks one field.**
You have adopted a maintenance burden for a delta. The exam's own framing is
that custom servers are for what is genuinely team-specific.

**Duplicating a built-in capability in an MCP server.** If `Grep` already
answers the need, a server that greps is a second way to do one thing. It also
buys the selection problem of 2.3, for free.
:::

**To test** — bank questions tagged `data-task="2.4"`.

## 2.5 — Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively
<!-- ts:2.5 | src:exam guide TS 2.5 (Grep for content search over file contents such as function names, error messages or import statements, Glob for file path pattern matching, Read and Write for full file operations against Edit for targeted modifications using unique text matching, and using Read plus Write as the fallback when Edit fails on a non-unique text match; the skills: selecting Grep to find all callers of a function or locate error messages, selecting Glob for naming patterns such as **/*.test.tsx, using Read then Write when Edit cannot find unique anchor text, building codebase understanding incrementally by starting with Grep to find entry points then using Read to follow imports and trace flows rather than reading all files upfront, and tracing function usage across wrapper modules by first identifying all exported names then searching for each name across the codebase) -->

The six built-in tools are the ones an agent already has before any MCP server is
connected, and the guide tests one thing about them: picking the right one. Two
pairs account for most of the questions.

| Task | Tool | Example |
|---|---|---|
| Find files by name or path pattern | **Glob** | `**/*.test.tsx`, `src/components/**/*.ts` |
| Search inside file contents | **Grep** | A function name, an error message, an import statement |
| Load a whole file | **Read** | Read a module before changing it |
| Create a file, or rewrite one whole | **Write** | A new file; a full replacement |
| Change part of an existing file | **Edit** | Replace a snippet identified by a unique text match |
| Run a shell command | **Bash** | `git`, `npm`, tests, a build |

**Grep against Glob** is the first pair, and the trap is that both are described
as "searching". Glob never opens a file: it matches paths. Grep never cares about
the filename: it matches contents. "Find every test file for the checkout flow"
is Glob. "Find every caller of `applyDiscount`" is Grep.

### When `Edit` fails, `Read` + `Write` is the documented fallback

`Edit` works by matching text that must be **unique in the file**. When the
anchor appears more than once, the edit is refused, and the refusal is
deliberate: the tool cannot know which occurrence you meant.

The guide names the fallback: **`Read` the file in full, amend the content, and
`Write` it back.**

```text
# runbooks/db-failover.yaml — the line "owner: unassigned" appears 23 times.
Edit(old_string="owner: unassigned", new_string="owner: sre-oncall")
  → refused: the anchor is not unique.

# Fallback
Read("runbooks/db-failover.yaml")        # the whole file, with its structure
→ amend step 14 only
Write("runbooks/db-failover.yaml", …)    # the amended file, written whole
```

The reason this works where `Edit` could not is that the full content carries the
position the anchor could not express: step 14 is identifiable in context even
though its text is identical to twenty-two others.

::: anti-pattern
**Retrying `Edit` with the same anchor.** The matching is deterministic; a
non-unique match does not become unique on a second attempt.

**Replacing every occurrence** to get past the failure. It changes twenty-three
lines when one was in scope, and it looks like success.
:::

### Building understanding incrementally

The guide's strategy for an unfamiliar codebase is explicit, and its value is as
much about context as about correctness: **start with Grep to find entry points,
then Read to follow imports and trace flows, rather than reading all files
upfront.**

```text
1. Grep "createCheckoutSession"    → the definition, and three call sites
2. Read src/checkout/session.ts    → what it does, and what it imports
3. Grep "from './session'"         → who consumes it
4. Read the consumers              → how it is used
5. Repeat until the flow is complete
```

Reading everything first fills the context window with files that turn out to be
irrelevant, and the relevant ones then compete for attention with them. Each
Grep in the loop above is a filter that decides what is worth a Read.

### Tracing a function through wrapper modules

The last skill is a specific failure of the naive approach, and it is worth
knowing as a procedure. A single `Grep` for a function name misses every call
made through an alias or a re-export.

```text
# Misses the indirect callers
Grep "analyzeDocument"

# Two passes, as the guide describes
1. Grep "export.*analyzeDocument"   → find every exported name for it
     export { analyzeDocument }
     export { analyzeDocument as analyze }
     export { analyzeDocument as docAnalyze }
2. Grep each of those names          → analyzeDocument, analyze, docAnalyze
                                     → now every caller is found
```

The order is the substance: **first identify all the exported names, then search
for each name across the codebase.** Searching for the original name alone
answers a narrower question than the one that was asked.

::: exam-tip
Three phrasings, three answers. "Find files matching a naming pattern" → Glob.
"Find where this function is called" → Grep. "`Edit` failed because the text is
not unique" → Read then Write.

The distractors are near neighbours. Glob offered for a content search and Grep
for a filename pattern are the two halves of the same confusion. `Bash` with
`find` or `grep` reaches the answer through a shell dependency where a built-in
tool answers directly. Reading every file up front is offered as thoroughness
and is context exhaustion. And handing the task back to a human, when the
documented fallback exists, buys nothing.
:::

**To test** — bank questions tagged `data-task="2.5"`.
