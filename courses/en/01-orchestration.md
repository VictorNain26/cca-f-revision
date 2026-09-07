# D1 — Agentic architecture and orchestration (27 %)

<!-- src:exam guide domain 1 (the seven task statements) ; 08agentsdk L2-L11, L14, L15 ; 03subagents L1-L4 -->

The heaviest domain of the exam: seven task statements, 27 % of the score. One
section per task statement, in the guide's own order and under the guide's own
wording — so that a question spotted on exam day maps to a section here
without translation.

<!-- cross-refs:start -->

D0 is assumed. This course starts where D0 stopped: D0 named `stop_reason` and
said what each value means; D1 turns that check into a loop, then into a system
of agents around it.

The guide places neighbouring notions elsewhere, and this course honours that.
`tool_choice` and JSON Schemas are tested in TS 2.3 and TS 4.3; structured error
responses in TS 2.2 and TS 5.3; the `.claude/agents/` files and the `/agents`
command are Claude Code configuration, tested in domain 3. Each of those gets a
sentence and a pointer here, never a second development.

<!-- cross-refs:end -->

## 1.1 — Design and implement agentic loops for autonomous task execution
<!-- ts:1.1 | src:08agentsdk L2 (the five-step cycle, the stop_reason table, several tool_use blocks in one reply and their results returned in one user message, the three named anti-patterns, model-driven vs pre-configured decision tree), L3 (maxTurns and maxBudgetUsd as bounds) ; exam guide TS 1.1 -->
<!-- owns:agentic-loop -->

A single Messages API call produces one answer. A real task — find the
customer, look up the order, decide on a refund — needs several actions, each
chosen in the light of what the previous one returned. The **agentic loop** is
the mechanism: request, response, tool execution, new request, until the model
says it is done.

The cycle, five steps:

1. You send a request with the conversation history and the `tools` parameter.
2. Claude answers. The reply may hold text, one or more `tool_use` blocks, or both.
3. Your code executes each requested tool and collects the results.
4. You append the assistant reply **and** the `tool_result` blocks to the history.
5. You send the whole history again. Repeat until `stop_reason` is terminal.

`stop_reason` is the field on the response that says why generation stopped;
its full set of values is catalogued in D0. Only two of them drive this loop:

| `stop_reason` | What your code does |
|---|---|
| `"tool_use"` | Execute the requested tools, append their results, iterate |
| `"end_turn"` | The model has nothing more to ask for — leave the loop |

```python
while True:
    response = client.messages.create(
        model="claude-sonnet-5",
        messages=messages,
        tools=tools,
    )
    # The whole reply goes back, text blocks and tool_use blocks together.
    messages.append({"role": "assistant", "content": response.content})

    if response.stop_reason != "tool_use":
        break                      # terminal — D0 catalogues the other values

    tool_results = execute_tools(response.content)
    messages.append({"role": "user", "content": tool_results})
```

Two lines carry the whole task statement. The `break` is on `stop_reason`, on
nothing else. And the second `append` is what makes the next iteration a
*reasoning* step rather than a repetition: tool results enter the conversation
history, so the model's next choice of tool is made in the light of what the
last one returned. A loop that runs the tools but never appends their results
asks the same question forever.

### Several calls in one reply

One reply can also carry **several** `tool_use` blocks at once — two lookups the
model wants done together, for instance. Run them all, then send every
`tool_result` back in a *single* `user` message, one block per call. That is the
same mechanism a coordinator uses to start several subagents at once, developed
in 1.3.

::: key-concept
The loop is **model-driven**: Claude reads the accumulated context and decides
which tool comes next. That is what separates an agent from a workflow. A
**pre-configured decision tree** — your code fixing the sequence
`read_schema → plan_changes → apply_migration` in advance — is legitimate
engineering, but it can only ever handle the cases whoever wrote it foresaw.
The guide tests your ability to tell the two apart and to pick by how
predictable the task is.
:::

::: anti-pattern
The guide names three wrong ways to drive the loop, and they are the
distractors on this task statement:

- **Parsing the assistant's text** for "task completed" or "I'm done". Natural
  language is not a signal; Claude can write "done" while a `tool_use` block is
  still pending in the same reply.
- **Using an arbitrary iteration cap** (`max_iterations = 5`) as the primary
  stopping mechanism. A cap is a guardrail against a runaway agent, not a
  statement about whether the work is finished — it cuts legitimate runs short.
- **Checking for text content** as a completion indicator. Text and `tool_use`
  travel in the same reply; the presence of one says nothing about the other.
:::

### Caps are guardrails, not stop conditions

Caps do have a place, as long as they stay caps. The Agent SDK exposes
`max_turns` / `maxTurns` (agentic round-trips) and `max_budget_usd` /
`maxBudgetUsd` (spend); both default to no limit, and a budget is a sound
production default on an open-ended prompt. Neither is a termination condition,
and the SDK marks a run that hit one as an error subtype rather than a success.

::: exam-tip
Whenever a question asks how to decide that the loop should continue or stop,
the answer is `stop_reason`, and specifically `"tool_use"` versus `"end_turn"`.
Every plausible-looking alternative in the option list — text parsing, an
iteration ceiling, a check for a text block — is one of the three anti-patterns
above, dressed up.
:::

**To test** — bank questions tagged `data-task="1.1"`.

## 1.2 — Orchestrate multi-agent systems with coordinator-subagent patterns
<!-- ts:1.2 | src:08agentsdk L4 (hub-and-spoke as a design choice, the coordinator's role, the narrow-decomposition risk), L14 (iterative refinement, scope partitioning, local recovery before propagation) ; 03subagents L1 (context isolation, the summary that comes back), L4 (the decision rule: does the intermediate work matter to the caller) ; exam guide TS 1.2 -->

Before the architecture, the decision. A subagent runs in its own context
window, does its work, and returns only a summary; the intermediate reads,
searches and tool calls are discarded with it. That trade has one question:
**does the intermediate work matter to the caller?** If you only need the
answer, delegate. If you need to see and react to each step, keep it in the
main thread.

### The hub-and-spoke shape

When a task is genuinely too broad for one agent — a research brief needing web
search, document analysis and synthesis — you get a **hub-and-spoke**
architecture: one coordinator (the hub) drives several specialized subagents
(the spokes), and *all* traffic goes through the hub.

```text
                Coordinator (hub)
              /         |         \
     search subagent  analysis   synthesis
        (web)        (documents)  (report)

     every result, every error, every retry
     travels hub ↔ spoke — never spoke ↔ spoke
```

Nothing in the SDK forces that shape. It is a design choice, and the guide
names its three motives: **observability** (one place sees the whole run),
**consistent error handling** (one policy, not one per agent), and **controlled
information flow** (the hub decides what each spoke is told).

### What the coordinator owns

The coordinator's job, as the guide states it:

| Responsibility | What it means in practice |
|---|---|
| Task decomposition | Cut the request into subtasks that jointly cover it |
| Dynamic delegation | Select which subagents a given query actually needs, rather than routing every query through the full pipeline |
| Result aggregation | Collect the spokes' outputs and assemble the answer |
| Error handling | Decide to retry, adapt the request, or continue with partial results |

### Two skills the questions turn on

Two skills are worth stating on their own because they are what the scenario
questions turn on.

**Partition the scope before delegating.** Give each search subagent a distinct
subtopic or a distinct source type. Overlapping briefs produce duplicated work
and, worse, correlated blind spots.

**Refine iteratively.** The coordinator reads the synthesis output, looks for
gaps, re-delegates to the search and analysis subagents with *targeted*
queries, and re-invokes synthesis until coverage is sufficient. This is a
quality loop sitting above the execution loop of 1.1, and it is the guide's
named remedy for incomplete coverage.

::: key-concept
Subagents start from an **isolated context**: they do not inherit the
coordinator's conversation history, and they share no memory between
invocations. Everything a spoke needs travels in the prompt the hub writes for
it — the mechanics are TS 1.3, below.
:::

### Decomposition that is too narrow

The risk the guide names by name is **overly narrow decomposition by the
coordinator**. Asked for a brief on "AI impact on creative industries", a
coordinator splits it into "AI in digital art", "AI in graphic design" and "AI
in photography". Each subagent executes its brief correctly. The report covers
visual art only; music, literature and film are simply absent. Nothing failed
downstream — the assignment was already incomplete.

::: exam-tip
When every subagent did what it was asked and the final report still misses
whole areas of the topic, the defect is the **coordinator's decomposition**,
not any spoke. The distractors will accuse a real component — search queries
too narrow, no gap detection in synthesis, relevance criteria too strict in
analysis — and they are seductive because they name something that exists. The
scenario has already told you each agent executed its assignment correctly.
What was done badly is the assigning.
:::

::: anti-pattern
Letting one subagent hand its output straight to another to save a hop. It
looks efficient and it breaks the three things the hub was for: no single place
sees the run, error handling stops being uniform, and nobody controls what the
second agent was actually told.

Routing every query through the full pipeline is the mirror mistake: the
coordinator is supposed to *analyze the query* and invoke only the subagents it
needs.
:::

### Errors travel through the hub too

Errors travel the same way. The expected pattern is **local recovery first**:
the subagent handles transient failures itself and propagates to the
coordinator only what it cannot resolve, together with its partial results and
what it already tried. The coordinator continues on partial results and
annotates the final output with what stayed uncovered. **The shape of those
error payloads — categories, retryability, business versus permission failures
— is structured error design, developed in D2.2.**

**To test** — bank questions tagged `data-task="1.2"`.

## 1.3 — Configure subagent invocation, context passing, and spawning
<!-- ts:1.3 | src:08agentsdk L2 (parallel spawning: several calls emitted in one response, not one per turn), L4 (the receives/does-not-receive table, what it implies for context passing and attribution metadata), L5 (AgentDefinition fields, the tool-restriction table, Agent in allowedTools for auto-approval), L13 (default permission mode: without a canUseTool callback an unapproved call is refused), L15 §1 (the Task → Agent rename, and what the exam expects) ; 03subagents L2 (the config fields), L3 (the description's double role, output format as a stopping point, limiting tool access) ; exam guide TS 1.3 -->
<!-- owns:subagent-isolation -->

The mechanism is a tool. A coordinator spawns a subagent by calling the
**`Task` tool**, and its `allowedTools` must include `"Task"` for those
invocations to be auto-approved. Leave it out and the call falls back to the
permission flow: under the default mode, with no `canUseTool` callback to answer
it, it is refused. The coordinator does not delegate, whatever its prompt says.

::: exam-tip
Recent SDK versions renamed this tool from `Task` to `Agent`, and current code
emits `Agent` in `tool_use` blocks. The exam guide v1.0 still says `Task`, and
names including `"Task"` in `allowedTools` as the requirement. On the exam,
`Task` is the expected answer. In real code, write `Agent` and test for both
names when you detect an invocation.
:::

### What crosses, and what does not

What a subagent gets, and what it does not, is the single most tested fact of
this domain:

| The subagent receives | The subagent does not receive |
|---|---|
| Its own system prompt, from its agent definition | The parent's conversation history and tool results |
| The prompt string of the spawning call | The parent's system prompt |
| Its tool definitions — inherited, or the subset it was given | Any memory of a previous invocation of itself |

The consequence is decisive: **the only content that crosses from parent to
subagent is the prompt string of the spawning call.** File paths, error
messages, prior search results, decisions already taken — if they are not in
that string, the subagent does not have them.

```text
Bad   Task: "Analyse the document."
      → which document? no prior findings, no expected output shape.

Good  Task: "Analyse the document below and return the clause table.
             DOCUMENT (source: vendor-contract-2026.pdf, pages 4-9):
               <full text>
             PRIOR FINDINGS (from the search subagent):
               - claim: 'net-45 payment terms'
                 source_url: https://…  retrieved: 2026-08-14
             OUTPUT FORMAT: one row per clause — clause_type, text, page."
```

Note what the good version does beyond being long. It uses a **structured
format that separates content from metadata** — source URL, document name, page
number, retrieval date live in their own fields, not woven into prose. That is
what preserves attribution all the way to the final report, and the guide names
it as a skill of this task statement.

### Parallelism: one reply, several calls

Parallelism comes from **one response, several calls**. A coordinator that
emits three `Task` calls in a single reply gets three subagents running at the
same time; the same three calls spread over three consecutive turns run one
after another. This is the same mechanism as parallel tool use in 1.1 — several
`tool_use` blocks in one assistant message — applied to the `Task` tool.

```python
agents = {
    "code-reviewer": AgentDefinition(
        description="Expert code review specialist. Use for quality, security "
                    "and maintainability reviews. Tell the agent precisely "
                    "which files to review.",
        prompt="You are a code review specialist…\n"
               "Return: 1. Summary  2. Critical issues  3. Major issues  "
               "4. Minor issues  5. Approval status  6. Obstacles encountered",
        tools=["Read", "Grep", "Glob"],
        model="sonnet",
    ),
}
```

### The four fields of an agent definition

Four fields, four decisions:

| Field | Required | What it decides |
|---|---|---|
| `description` | yes | When the coordinator launches this subagent — **and** what it writes in the delegation prompt |
| `prompt` | yes | The subagent's system prompt: its role, its method, its output format |
| `tools` | no | The tools it may use; omitted, it inherits everything available to subagents |
| `model` | no | `opus`, `sonnet`, `haiku`, `inherit`, or a full model id |

The `description` has that double role and it is easy to miss. The name and
description of every available subagent are placed in the main agent's system
prompt, so they decide *when* delegation happens; the main agent then uses the
description as guidance while writing the input prompt, so they also shape
*what the subagent is told to do*. A description that says "you must tell the
agent precisely which files to review" produces delegation prompts that list
files. A vague description produces vague delegations.

Two more design levers. The first comes from the Subagents course; the second
is the fourth skill the guide lists under this task statement:

- **Define an output format in the system prompt.** It gives the subagent a
  checklist, so it knows when it is finished; without one, subagents struggle
  to decide when enough research is enough and run far longer than needed. An
  "Obstacles encountered" section is worth adding on purpose: workarounds and
  environment quirks the subagent discovered otherwise die with its context and
  have to be rediscovered by the main thread.
- **Write coordinator prompts as goals and quality criteria, not procedures.**
  "The brief must cover at least five sectors with dated sources" leaves the
  subagent free to adapt; a step-by-step script does not.

### Restricting a subagent's tools

Tool restrictions belong here too — the guide lists them among this task
statement's knowledge. A read-only research subagent gets `Read`, `Grep`,
`Glob`; a reviewer adds `Bash` to run `git diff`; only an agent whose job is to
change code gets `Edit` and `Write`. A tool you leave out is not in the
subagent's session at all: no permission prompt, no error, the agent simply
works without it. **Why a large tool set degrades selection reliability, and
how to scope tools across agents, is tool distribution, developed in D2.3.**

::: anti-pattern
Three moves that look like fixes and are not:

- **Enlarging the subagent's context window** when it produced a thin answer.
  Nothing was passed to it; the size of an empty window changes nothing.
- **Spawning across successive turns** and calling it parallel. Consecutive
  turns are sequential execution with extra round-trips.
- **Counting on inheritance** — "the subagent will see what the coordinator
  found". Isolation is the defining property of a subagent, not a limitation to
  work around.
:::

**Forking a session to give two subagents a shared analysis baseline is session
management, developed in 1.7 below.** **Defining subagents as markdown files
under `.claude/agents/`, and the `/agents` command that creates them, is Claude
Code configuration, developed in domain 3.**

**To test** — bank questions tagged `data-task="1.3"`.

## 1.4 — Implement multi-step workflows with enforcement and handoff patterns
<!-- ts:1.4 | src:08agentsdk L10 (why a hook rather than an instruction, the get_customer / process_refund gate), L14 (structured human handoff, decomposing a multi-concern request) ; exam guide TS 1.4 -->

Some orderings must hold every time. Verify the customer's identity before
processing a refund; check drug interactions before dispensing. You can write
that in the system prompt — and a prompt instruction is a request the model
usually honours. The guide's formulation is blunt: **when deterministic
compliance is required, prompt instructions alone have a non-zero failure
rate.** Over thousands of interactions, that remainder is refunds paid to the
wrong customer.

### The prerequisite gate

**Programmatic enforcement** closes it by making the violation impossible in
code rather than improbable in prose. The concrete shape is a **prerequisite
gate**: a downstream tool call is blocked until an upstream step has returned.

```python
async def require_verified_customer(input_data, tool_use_id, context):
    if input_data["tool_name"] != "process_refund":
        return {}
    if not session_state.get("verified_customer_id"):
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason":
                "Call get_customer first: process_refund requires a verified "
                "customer ID for this session.",
        }}
    return {}
```

`process_refund` cannot run until `get_customer` has returned a verified id.
Not "is unlikely to" — cannot. The reason string matters as much as the block:
the model reads it, so it retries the right thing instead of retrying blindly.
**The hook API itself — events, matchers, decision fields — is TS 1.5, below.**

### The multi-concern request

A second pattern of this task statement is the **multi-concern request**. A
customer writes: "I want a refund on order #1234 *and* the delivery address
changed on order #5678." Handling that sequentially and answering in two
disconnected blocks is the failure. The expected move is to decompose it into
distinct items, investigate each in parallel against the *shared* customer
context, then synthesize one unified resolution.

### The structured handoff

The third is the **structured handoff**. When the agent escalates mid-process,
the human who takes over has no access to the conversation transcript. The
summary therefore has to stand alone:

```json
{
  "customer_id": "CUST-12345",
  "order_id": "ORD-67890",
  "issue_summary": "Refund request for damaged item",
  "root_cause": "Item arrived damaged; photos attached",
  "actions_taken": [
    "Identity verified via get_customer",
    "Order confirmed via lookup_order",
    "Replacement offered — customer insists on refund"
  ],
  "refund_amount": "$89.99",
  "recommended_action": "Approve full refund",
  "escalation_reason": "Customer asked to speak with a manager"
}
```

Customer identity, root cause, amount, recommended action: the four the guide
names. A handoff that assumes the human will read the conversation is a failed
handoff.

::: anti-pattern
The distractors on enforcement questions are the measures that genuinely lower
the failure rate without ever reaching zero:

- Strengthening the system prompt — "verification is mandatory".
- Adding few-shot examples showing the verification tool called first.
- Auditing transactions afterwards to catch violations.
- Deploying a routing classifier that only enables the relevant tool subset.

The first three lower the rate; the question asked for a guarantee, and an
audit finds the violation after the money is gone. The fourth addresses which
tools are *available*, not the order in which they are called — a different
problem.
:::

::: exam-tip
The rule to carry in: **financial, legal or safety consequences → programmatic
enforcement.** Preferences, tone and formatting → prompt instructions. If the
scenario contains the word "guarantee", or describes an irreversible action,
no amount of prompt engineering is the answer.
:::

**When to escalate at all — the criteria, honouring a customer's stated
preference, spotting a policy gap — is escalation decision-making, developed in
D5.2.**

**To test** — bank questions tagged `data-task="1.4"`.

## 1.5 — Apply Agent SDK hooks for tool call interception and data normalization
<!-- ts:1.5 | src:08agentsdk L9 (what a hook is, the event table, matchers, callback outputs, deny > defer > ask > allow), L10 (PreToolUse: permissionDecision, permissionDecisionReason, updatedInput), L11 (PostToolUse: updatedToolOutput and additionalContext, the heterogeneous-format case) ; exam guide TS 1.5 -->
<!-- owns:hooks -->

A **hook** is a callback of yours that the SDK runs when an agent event fires.
It executes in your application process, not in the agent's context window — so
it costs no tokens, and it is ordinary code with ordinary guarantees.

Two events carry this task statement:

| Event | Fires | Can it still change the outcome? |
|---|---|---|
| `PreToolUse` | A tool call has been requested, before it runs | Yes — allow, deny, or rewrite the input |
| `PostToolUse` | The tool has returned, before the model reads the result | The call already happened; you can replace what the model reads |

### `PreToolUse` — making something impossible

`PreToolUse` is the enforcement primitive. Its callback returns a
`hookSpecificOutput` carrying `permissionDecision` (`"allow"`, `"deny"`,
`"ask"`, `"defer"`), a `permissionDecisionReason` the model reads, and
optionally `updatedInput` to rewrite the call rather than refuse it.

```python
async def cap_refunds(input_data, tool_use_id, context):
    if input_data["tool_name"] != "process_refund":
        return {}
    if input_data["tool_input"].get("amount", 0) > 500:
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason":
                "Refunds above $500 require a human approver. "
                "Call escalate_to_human with the case summary instead.",
        }}
    return {}
```

The block is half the work; the reason redirects the agent to the alternative
workflow instead of leaving it to guess. When several hooks and permission
rules disagree, the SDK resolves them by precedence — `deny` beats `defer`
beats `ask` beats `allow` — so a single `deny` is enough.

### `PostToolUse` — changing what the model reads

`PostToolUse` is the normalization primitive. Its `updatedToolOutput` field
replaces the tool's output before Claude sees it; `additionalContext` adds to
it instead.

```python
async def normalize_dates(input_data, tool_use_id, context):
    if input_data["tool_name"] not in ORDER_TOOLS:
        return {}
    raw = json.loads(input_data["tool_response"]["content"])
    return {"hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "updatedToolOutput": json.dumps({
            **raw,
            "shipped_at": to_iso8601(raw["shipped_at"]),   # 1743800400 → "2025-04-04"
            "status": STATUS_NAMES[raw["status"]],          # 2 → "shipped"
        }),
    }}
```

That is the guide's case, literally: several MCP tools return dates as Unix
timestamps, others as ISO 8601, statuses as numeric codes. Mapping them is a
fixed table, not a judgement call — so it belongs in code that runs on every
result, not in a prompt asking the model to cope with three formats.

::: key-concept
The choice between a hook and a prompt instruction is the same choice as in
1.4, one level down:

| | Hook | Prompt instruction |
|---|---|---|
| Guarantee | Deterministic — it is code that runs | Probabilistic — no guarantee |
| Use for | Business rules, financial and regulatory limits | Preferences, tone, formatting |
| Example | Block refunds above $500 | "Try to resolve the issue before escalating" |
:::

::: anti-pattern
Reaching for `PostToolUse` to stop something. It fires after the tool has run —
the refund is paid, the rows are deleted. Blocking is `PreToolUse`.

The mirror error is a `PreToolUse` block used to fix a *reading* problem. If a
tool returns an overloaded field the model misinterprets, blocking the
downstream call suppresses the correct calls too; the fix is to rewrite the
result on the way back so the ambiguity never reaches the model.
:::

::: exam-tip
Two questions separate the two hooks cleanly. *Must something not happen?* →
`PreToolUse`. *Must the model read something different from what the tool
returned?* → `PostToolUse`. Distractors will place the right mechanism at the
wrong point in the loop.
:::

**Claude Code's own configuration-level hooks, declared in settings rather than
in SDK code, are developed in domain 3.**

**To test** — bank questions tagged `data-task="1.5"`.

## 1.6 — Design task decomposition strategies for complex workflows
<!-- ts:1.6 | src:08agentsdk L14 (fixed pipeline versus dynamic decomposition, predictability as the criterion, the per-file plus cross-file review, the legacy-test-coverage example) ; exam guide TS 1.6 -->
<!-- owns:task-decomposition -->

Not every task splits the same way, and picking the wrong regime costs you
either rigidity or chaos. There are two.

**Fixed sequential pipeline — prompt chaining.** Every step is decided in
advance and runs in order. Use it when the structure of the task is
predictable, the steps are all known, and you want stable, comparable results
run after run.

**Dynamic adaptive decomposition.** Subtasks emerge from what the previous step
found. Use it for open-ended investigation, where the scope is unknown at the
start.

::: key-concept
The criterion is **predictability, not size**. A twelve-file pull request has a
known, enumerable set of targets and takes a fixed pipeline. A one-file bug of
unknown origin does not.
:::

### The guide's two examples

The guide's own example of prompt chaining is the multi-aspect code review. A
single pass over a large diff produces uneven output: detailed comments on some
files, superficial on others, and contradictions between them. Split it:

```text
Pass 1 — per file, one focused analysis each
         → local bugs, quality issues, vulnerabilities
Pass 2 — one cross-file integration pass over the results of pass 1
         → inconsistent types, circular dependencies, broken data flow

Splitting this way is what avoids attention dilution on a large review.
```

The guide's example of adaptive decomposition is "add comprehensive tests to a
legacy codebase". You cannot list the subtasks up front, because they are what
you are about to discover:

```text
1. Map the structure                (Glob, Grep)
2. Discover: 3 modules untested, 2 partially covered
3. Prioritize by impact             → payments module first (high risk)
4. Surprise: an unmocked external API dependency
5. Adapt the plan                   → build the mock, then write the tests
```

Map structure, identify high-impact areas, produce a prioritized plan that
adapts as dependencies surface — that is the guide's wording, and step 4 is the
whole point: the plan changed because of what step 1 found.

::: anti-pattern
Three mismatches, and they are exactly the distractors:

- A **fixed pipeline on unknown scope** — it demands the list of steps before
  you start, which is precisely what you do not have.
- A **multi-pass review offered for an open-ended investigation** — it is built
  for a bounded, enumerable set of targets like the files of a PR.
- A **single exhaustive prompt** meant to cover everything at once — it assumes
  you already know the scope.

And the fourth, quieter one: adaptive decomposition on frozen targets. It buys
nothing once the targets never vary, and it makes successive runs harder to
compare.
:::

::: exam-tip
Read the scenario for one thing: **is the list of targets knowable before the
first call?** Yes → prompt chaining. No → dynamic decomposition. Words like
"the same six adapters, every quarter" point one way; "nobody knows how many
stages it has" points the other.
:::

**To test** — bank questions tagged `data-task="1.6"`.

## 1.7 — Manage session state, resumption, and forking
<!-- ts:1.7 | src:08agentsdk L8 (what a session is, continue vs resume vs fork, capturing the session id, when to resume and when to start fresh), L15 §2 (fork combines with resume and branches history, not the filesystem), §3 (named resumption in the guide versus session ids in the SDK) ; exam guide TS 1.7 -->

A **session** is the conversation history the SDK accumulates while the agent
works — your prompt, every tool call, every result, every reply — written to
disk automatically. Long investigations span several working sessions, and
between them files change and stored tool results go stale.

Three operations, three different jobs:

| Operation | What it does |
|---|---|
| `--resume <session-name>` | Continues one specific prior conversation, by name |
| `fork_session` | Creates an independent branch from an existing session's history; the original is untouched and the fork gets its own id |
| Fresh session + injected summary | Starts empty and receives, in the prompt, a structured summary of what still holds |

```python
# Fork the analysis baseline to explore a second approach.
async for message in query(
    prompt="Instead of Redux, outline how the Context API would work here",
    options=ClaudeAgentOptions(
        resume=session_id,      # fork always branches an existing session
        fork_session=True,
        max_turns=5,
    ),
):
    if isinstance(message, ResultMessage):
        forked_id = message.session_id     # distinct from session_id
```

### Two facts about forking

Two facts about forking that questions turn on. It always combines with
resumption — you fork *an existing session*, never out of nothing. And it
branches the **conversation history, not the filesystem**: two forked agents
editing files in the same directory are editing the same files.

### Choosing between the three

Choosing between the three is the skill the guide tests:

| Situation | Choice |
|---|---|
| Prior context still valid, files unchanged | `--resume` |
| A few specific files changed, the rest still holds | `--resume`, **naming the changed files** so the agent re-analyses those rather than re-exploring everything |
| Tool results are stale — files changed extensively or unverifiably | New session, seeded with a structured summary |
| Comparing two approaches from a shared analysis baseline | `fork_session` |

The third row is the guide's own judgement call, and it is counter-intuitive
enough to be tested: **starting a new session with a structured summary is more
reliable than resuming with stale tool results.** A resumed session carries
recorded responses that describe a system that no longer exists, and the agent
reasons on them as if they were current. A written summary carries the
conclusions that survived and leaves the dead payloads behind.

::: anti-pattern
Three moves the distractors put in place of the three answers above:

- **Resuming without saying what changed.** The agent keeps a false picture of
  the files and reasons on dead tool results — the very failure resumption was
  supposed to avoid.
- **Re-exploring everything from scratch** when only three files moved. It
  throws away work that is still valid.
- **Forking to compare an old and a new version of a file.** A fork explores
  divergent *approaches* from a shared baseline; it does not reconcile a disk
  state.
:::

::: exam-tip
Three situations, three answers, and the distractors trade them around. Context
mostly valid → `--resume` plus a list of the changed files. Tool results
largely stale → fresh session with an injected summary. Two approaches to
compare → `fork_session`. Note also that the guide says `--resume
<session-name>` while the SDK documents `resume` taking a session id; the
concept — resuming a *named* investigation across working sessions — is what is
tested, not the syntax.
:::

**To test** — bank questions tagged `data-task="1.7"`.
