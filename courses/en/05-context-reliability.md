# D5 — Context management and reliability (15 %)

<!-- src:exam guide domain 5 (the six task statements) ; 08agentsdk L4, L8, L11, L12, L14 ; 03subagents L1, L4 ; 06claudecode101 L6 ; 05claudeapi L16-L17, L20-L21 -->

Fifteen per cent of the score, six task statements, and the domain that asks a
different question from the four before it. D1 to D4 ask how to build the
thing: the loop, the tools, the configuration, the prompt. D5 asks what is
still true after the thing has been running for two hours: which numbers
survived the summariser, which subagent's failure the coordinator ever heard
about, which claim in the final report can still be traced to the page it came
from.

One section per task statement, in the guide's own order and under the guide's
own wording, so that a question met on exam day maps to a section here without
translation.


<!-- cross-refs:start -->

Four courses defer to this one, and the four debts are paid below. **D0** named
the three failure modes of a full context window — lost-in-the-middle,
accumulation, progressive summarization — and went no further: the remedies are
5.1. **D1** stated when a rule needs programmatic enforcement and sent the
question of *when to escalate at all* to 5.2. **D2** taught the shape of an
error payload — `isError`, the category, the retry flag, the partial-result
envelope — and sent what a coordinator *does* with that envelope to 5.3. **D3**
sent `/compact` to this domain; it belongs to **5.4**, where the guide places it
among the skills of large-codebase exploration.

The traffic runs the other way too, and this course honours it. The anatomy of
the context window is D0's. Subagent isolation and what a subagent inherits are
TS 1.2 and 1.3. The hook mechanism — events, `PostToolUse`, `updatedToolOutput`
— is TS 1.5. Sessions, `--resume` and `fork_session` are TS 1.7. The structured
human handoff is TS 1.4. Each of those gets a sentence and a pointer here, never
a second development.

<!-- cross-refs:end -->

## 5.1 — Manage conversation context to preserve critical information across long interactions
<!-- ts:5.1 | src:exam guide TS 5.1 (the knowledge: progressive summarization condensing numerical values, percentages, dates and customer-stated expectations into vague summaries; the lost-in-the-middle effect, where models process the beginning and end of long inputs reliably but may omit findings from middle sections; how tool results accumulate and consume tokens disproportionately to their relevance, with the 40+ fields per order lookup when only 5 are relevant; the importance of passing complete conversation history in subsequent API requests. The skills: extracting transactional facts — amounts, dates, order numbers, statuses — into a persistent case facts block included in each prompt outside summarized history; extracting and persisting structured issue data into a separate context layer for multi-issue sessions; trimming verbose tool outputs to only relevant fields before they accumulate; placing key findings summaries at the beginning of aggregated inputs and organizing detailed results with explicit section headers; requiring subagents to include metadata — dates, source locations, methodological context — in structured outputs; modifying upstream agents to return structured data — key facts, citations, relevance scores — instead of verbose content and reasoning chains when downstream agents have limited context budgets) ; 08agentsdk L11 (updatedToolOutput replaces a tool's output before Claude sees it, for any tool and in both SDKs — L11 documents that field for normalising heterogeneous formats under TS 1.5, and applying it to trimming is this course's deduction, not the source's: the guide's trimming skill names no mechanism) ; 06claudecode101 L6 (everything that enters the context window: prompts, file reads, tool calls and their results; automatic compaction summarises and can lose details) -->

Twenty turns ago the customer said the order was $89.99 and that they wanted a
full refund rather than a replacement. The history has since been summarised
twice, and what the model now reads is *"a promotional pricing was discussed"*.
Nothing failed. The summariser did exactly what summarisers do: it kept the
shape of the conversation and dropped the specifics.

That is the first of the guide's three named risks, and the three are worth
holding as a set because each has its own remedy, and answering with the wrong
remedy is how this task statement is failed.

| Failure mode | What it destroys | The remedy this task statement asks for |
|---|---|---|
| **Progressive summarization** | Numerical values, percentages, dates, customer-stated expectations | A case facts block that never travels through the summariser |
| **Lost in the middle** | Findings buried in the middle of a long input — the beginning and the end are read reliably | Key findings at the top, explicit section headers over the detail |
| **Tool result accumulation** | Nothing, but it consumes tokens out of all proportion to relevance | Trim the output to the relevant fields before it enters the context |

D0 owns the anatomy behind that table: why every request resends the whole
history, and why a tool result is a recurring cost rather than a one-off. One
of the guide's knowledge points for this task statement belongs to that anatomy
and is worth restating in one line: **complete conversation history must be
passed in each subsequent API request**, because the API stores nothing between
calls and a truncated history is a model that has genuinely forgotten.

### The case facts block

The remedy is structural, and its whole point is *where* it lives.

```text
=== CASE FACTS (updated as each new fact is established) ===
Customer ID : CUST-12345
Order ID    : ORD-67890
Order date  : 2025-01-15
Amount      : $89.99
Issue       : Item arrived damaged
Request     : Full refund, replacement declined
Status      : Awaiting approval
===

[summarised conversation history follows]
```

The block is rebuilt into **every** prompt and it sits **outside** the
summarised history. The summariser can compress the conversation as hard as it
likes; it is not compressing this. The facts to extract are the transactional
ones the guide names — amounts, dates, order numbers, statuses — because those
are precisely the tokens a summary replaces with an adjective.

::: key-concept
**A structural guarantee, not a request.** Instructing the summariser to
"preserve all numbers and dates" targets the right symptom and relies on
probabilistic compliance, once per summary and once per fact. Keeping the facts
out of the summarised region relies on nothing: they are in the prompt because
you put them there this turn.
:::

For a session covering **several issues at once**, the guide asks for the same
move one level up: structured issue data — order IDs, amounts, statuses — kept
in a **separate context layer**, not a paragraph of prose.

```json
{
  "case_facts": { "customer_id": "CUST-12345", "tier": "gold" },
  "issues": [
    { "id": "I-1", "order_id": "ORD-67890", "amount": "$89.99",
      "type": "damaged_item",  "status": "refund_pending" },
    { "id": "I-2", "order_id": "ORD-71204", "amount": "$24.50",
      "type": "late_delivery", "status": "credit_offered" },
    { "id": "I-3", "order_id": "ORD-71204", "amount": null,
      "type": "address_change", "status": "resolved" }
  ]
}
```

Three issues, three statuses, one shared customer. A prose recap of the same
material loses which amount belongs to which order the first time it is
compressed. Decomposing the *request* into parallel investigations is TS 1.4 and
lives in D1; what this task statement adds is the layer their results are
written back into.

### Trimming tool output before it accumulates

The guide's own figure: an order lookup returns **40+ fields when 5 are
relevant** to the task at hand. Those 40 fields are not merely present once;
they are resent on every subsequent request for the rest of the session.

```text
lookup_order(ORD-67890) →
  order_id, status, total, items, return_eligible        ← the 5 that decide
  warehouse_route, carrier_scac, pick_wave, audit_flags,
  promo_ledger, tax_jurisdiction, … (35 more)            ← paid for on every later turn
```

The skill is to trim **before** the result enters the context, which means
between the tool returning and the model reading. **The guide names no mechanism
for it**: it states the skill and stops. One mechanism sits exactly in that
window: a `PostToolUse` hook, whose `updatedToolOutput` replaces a tool's output
before Claude sees it. The SDK documents that field for a different job —
normalising heterogeneous formats, which is TS 1.5 — and nothing about it is
specific to normalisation, so it serves this one too. The deduction is this
course's; the field and its timing are the documentation's.

```python
async def trim_order_lookup(input_data, tool_use_id, context):
    if input_data["tool_name"] != "lookup_order":
        return {}
    full = input_data["tool_response"]
    keep = ("order_id", "status", "total", "items", "return_eligible")
    return {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "updatedToolOutput": {k: full[k] for k in keep if k in full},
        }
    }
```

The hook machinery itself — events, matchers, the callback contract — is TS 1.5
and belongs to D1. What makes it fit here is the ordering: `PostToolUse` runs
after the tool has returned and before the model reads the result, which is the
only window in which trimming saves anything. A `PreToolUse` hook is too early —
the result does not exist yet — and trimming after the fact costs the tokens you
were trying to save.

Choosing what a tool returns *in the first place* is a tool-design decision and
belongs to D2.1, which states the rule as **return signal, not filler**. This
task statement is the repair when the tool is not yours to change.

### Position: what goes at the top, what goes in the middle

For a long aggregated input — several subagents' findings, a batch of file
contents, a multi-document review — the guide asks for two things: a **key
findings summary at the beginning**, and **explicit section headers** organising
the detailed results.

```text
=== KEY FINDINGS ===
1. auth.ts — token expiry never checked on the refresh path (critical)
2. database.ts — three queries built by string concatenation (critical)
3. upload.ts — content-type trusted from the client (major)

=== DETAILED RESULTS ===
== auth.ts ==
…forty lines of detail…
== database.ts ==
…sixty lines of detail…
== upload.ts ==
…thirty lines of detail…

=== REQUIRED ACTIONS ===
Fix auth.ts and database.ts before merge; upload.ts may follow.
```

The summary at the top is not a courtesy to a human reader. It is the position
where the model reads reliably, and it means the critical findings are read even
if a section in the middle is not. The headers do the second half of the job:
they give the middle a structure to be found by, instead of a flat wall in which
one paragraph looks like any other.

### What upstream agents should send downstream

Two of the guide's skills are about the *other* agent's output format, and both
apply when a downstream agent has a limited context budget.

- **Require metadata in subagent outputs** — dates, source locations,
  methodological context — so downstream synthesis is accurate rather than
  merely fluent. What that metadata is for is TS 5.6.
- **Modify upstream agents to return structured data** — key facts, citations,
  relevance scores — instead of verbose content and reasoning chains.

```json
{
  "key_facts": [
    { "fact": "Refund window is 30 days from delivery",
      "source": "policy/returns.md#L42", "as_of": "2025-01-04",
      "relevance": 0.95 }
  ],
  "citations": ["policy/returns.md", "policy/exceptions.md"],
  "coverage": ["standard returns"],
  "gaps": ["competitor price matching"]
}
```

Note what is *not* in that payload: the reasoning that produced it. A downstream
agent with a tight budget needs the conclusions and their provenance, not the
path taken to them.

::: exam-tip
Read the scenario for which of the three failure modes it describes, because
each has one answer and the other two are wrong here.

"An exact amount discussed earlier now comes back vague" → progressive
summarization → case facts block outside the summarised history. "A finding
from the middle of a long report was ignored" → position → summary at the top,
section headers over the detail. "The window fills with tool output" →
accumulation → trim to the relevant fields.

The distractors on the first one are all attempts to make summarisation behave.
**Moving to a model with a larger context window** pushes the limit back without
protecting anything: a long enough conversation reaches the new limit too, and
the same compression destroys the same facts. **Compacting less often** is the
same evasion phrased as frequency: it changes when the numbers are destroyed,
not whether. **Asking the summariser to keep every number and date** is the most
tempting because it names the right symptom, and it is a request rather than a
guarantee.
:::

::: anti-pattern
**Dropping the oldest turns to make room.** The API stores nothing, so a request
that ships a truncated history is a request in which those turns never happened.
Sliding a window over the messages is not context management; it is silent
amnesia with no record of what was lost.

**Summarising the summary.** Each pass compresses what the previous pass kept,
and the specifics go first. Two generations in, "the customer reported a $89.99
damaged item on 15 January and declined a replacement" is "the customer had an
issue with an order".
:::

**To test** — bank questions tagged `data-task="5.1"`.

## 5.2 — Design effective escalation and ambiguity resolution patterns
<!-- ts:5.2 | src:exam guide TS 5.2, written from the guide alone — no course PDF in the corpus covers escalation (the knowledge: appropriate escalation triggers, namely customer requests for a human, policy exceptions or gaps rather than merely complex cases, and inability to make meaningful progress; the distinction between escalating immediately when a customer explicitly demands it and offering to resolve when the issue is straightforward; why sentiment-based escalation and self-reported confidence scores are unreliable proxies for actual case complexity; how multiple customer matches require clarification through additional identifiers rather than heuristic selection. The skills: adding explicit escalation criteria with few-shot examples to the system prompt demonstrating when to escalate versus resolve autonomously; honoring explicit customer requests for human agents immediately without first attempting investigation; acknowledging frustration while offering resolution when the issue is within the agent's capability, escalating only if the customer reiterates their preference; escalating when policy is ambiguous or silent on the customer's specific request, with competitor price matching against a policy that only addresses own-site adjustments as the example; instructing the agent to ask for additional identifiers when tool results return multiple matches rather than selecting based on heuristics) -->

An escalation policy fails in two directions, and both are expensive. Escalate
too readily and a queue fills with cases the agent could have closed. Escalate
too rarely and the agent grinds at a case it was never equipped to resolve,
producing a wrong answer or an exhausted customer. The task statement is about
where the line goes, and — this is the part that is tested — about which signals
are allowed to move it.

### The triggers the guide accepts

| Situation | What the agent does |
|---|---|
| The customer explicitly asks for a human | Escalate **immediately**, without first attempting to investigate |
| Policy is silent or ambiguous on this specific request — a gap or an exception | Escalate: nobody delegated that decision to the agent |
| The agent cannot make meaningful progress | Escalate after a reasonable attempt |
| A lookup returns **multiple matches** for the customer | Do not escalate and do not guess: ask for an additional identifier |

Two of those four deserve their own sentence, because the wording of the guide
is precise and the near-misses are what the distractors are made of.

**A policy gap is not the same thing as a complex case.** The guide's own
example: the customer asks for a competitor's price to be matched, and the
pricing policy addresses only price adjustments on your own site. The request is
not difficult, since matching a price is one tool call. It is *undecided*.
Nothing in the policy authorises it and nothing forbids it, so granting it would
be the agent inventing commercial policy. That is the trigger, and "the case was
complex" is not.

**Multiple matches are an ambiguity, not an escalation.** Three companies share
a trading name; the fix is to ask for a contract number or a billing domain.
Selecting the most recently active account is a heuristic dressed as reasoning,
and acting on the wrong company's contract is exactly the failure identity
checks exist to prevent.

### The triggers the guide rejects

| Proxy | Why it fails |
|---|---|
| **Sentiment** — escalate when the message reads as angry | Mood does not correlate with case complexity. A furious customer may have a one-tool-call problem, and a polite one may have an unresolvable one |
| **Self-reported confidence** — the model rates its own certainty and escalates below a threshold | The rating is the model's introspection about a case it may have misread, and it is highest exactly where it is confidently wrong |

Self-reported confidence returns in 5.5 as part of the *correct* answer, in a
different form and for a different job. The distinction is set out there, and it
is worth reading the two sections against each other once.

### The three behaviours, and the one that is tested

The guide separates escalating immediately from offering to resolve, and the
separation turns on what the customer actually said.

```text
# Explicit request for a human
"I want to speak to a manager."
→ call escalate_to_human() now. No investigation first.

# Frustration, no request for a human
"This is outrageous, I'm very unhappy!"
→ acknowledge the frustration, offer the resolution you are able to give,
  escalate only if the customer reiterates a preference for a person.

# Straightforward issue, within the agent's authority
"My package is three days late."
→ resolve it. Offering a handoff nobody asked for turns a closable case
  into a queue.
```

The middle case is the one the exam builds scenarios around, because it looks
like the first. "This is outrageous" is a statement of feeling, not a request
for a person. Acknowledging it costs one sentence; escalating on it costs a
human being's afternoon and leaves the customer waiting for a fix the agent
could have applied immediately. And the escape hatch is in the same rule: if the
customer *reiterates*, they have now asked, and the first trigger applies.

### How the policy gets into the agent

The guide's first skill names both halves and neither works alone: **explicit
escalation criteria** *with* **few-shot examples** in the system prompt.

```text
# Escalation criteria
Escalate immediately when the customer asks for a human, in any wording.
Escalate when this policy does not cover the request, including requests it
neither permits nor forbids.
Escalate when three resolution attempts have produced no progress.
Never escalate on tone alone. Never guess between multiple account matches —
ask for a contract number or a billing domain.

# Examples
Customer: "Get me a manager."
Action:   escalate_to_human(reason="explicit request")
Why:      explicit request for a person. Do not investigate first.

Customer: "This is outrageous, I've been waiting a week!"
Action:   acknowledge, then offer the delivery credit you are authorised for.
Why:      frustration is not a request for a person. Escalate only if they
          then ask for one.

Customer: "Match the price I found on a competitor's site."
Action:   escalate_to_human(reason="policy gap: competitor pricing")
Why:      the policy covers our own price adjustments only. Silence is not
          permission.
```

The criteria carry the rule; the examples carry its application to the cases
where the rule is ambiguous, which is the whole reason a criterion needed
examples. Criteria alone leave "is this a policy gap?" to be re-decided each
turn. Examples alone generalise from three cases to a policy nobody wrote.

When the agent does escalate mid-process, what it hands to the human — customer
identity, root cause, amount, recommended action, in a summary that stands
without the transcript — is the **structured handoff**, tested in TS 1.4 and
developed in D1.4.

::: exam-tip
The scenario tells you which trigger fired; the wording of the customer's
message is the whole question.

"I want a manager" → escalate now, and *not* "investigate first, then escalate
if needed". That answer sounds diligent and it makes a customer who has already
asked wait through an investigation they did not want. "This is outrageous" →
acknowledge, resolve, escalate on reiteration. "The policy does not address
this" → escalate, and not "apply the closest analogous rule". "Three customers
match" → ask for another identifier, and not "pick the most likely".

The recurring wrong answers are the ones that sound like measurement:
sentiment scoring, a self-rated confidence threshold, a trained classifier that
would need labelled escalation data nobody has. Each replaces a stated rule
with an inferred one.
:::

::: anti-pattern
**Investigating first when a human was explicitly requested.** The guide's
wording is "immediately without first attempting investigation". A diligent
investigation before honouring the request is still a refusal to honour it.

**Escalating because the case is complex.** Complexity is not on the list.
Policy silence is. An agent that escalates on difficulty escalates on its own
discomfort, which is the self-confidence proxy wearing a different hat.
:::

**To test** — bank questions tagged `data-task="5.2"`.

## 5.3 — Implement error propagation strategies across multi-agent systems
<!-- ts:5.3 | src:exam guide TS 5.3 (the knowledge: structured error context — failure type, attempted query, partial results, alternative approaches — as what enables intelligent coordinator recovery decisions; the distinction between access failures needing retry decisions and valid empty results; why generic error statuses such as "search unavailable" hide valuable context from the coordinator; why silently suppressing errors by returning empty results as success and terminating entire workflows on a single failure are both anti-patterns. The skills: returning structured error context to enable coordinator recovery; distinguishing access failures from valid empty results in error reporting; having subagents implement local recovery for transient failures and only propagate what they cannot resolve, including what was attempted and partial results; structuring synthesis output with coverage annotations indicating which findings are well-supported and which topic areas have gaps due to unavailable sources) ; 08agentsdk L14 (local recovery in the subagent for transient failures and propagation to the coordinator of what cannot be resolved locally, with partial results and what was attempted; the coordinator continuing on partial results and annotating uncovered areas; the access-failure against valid-empty-result distinction) ; 08agentsdk L4 (an API error that interrupts a subagent — a rate limit, for instance — is never delivered as its result) -->

A research subagent times out on its third query. What the coordinator does next
— retry, narrow the query, try another source, or continue and note the gap —
depends entirely on what came back. If what came back is `"search
unavailable"`, every one of those options is a guess.

That is the task statement in a sentence: **the error payload is the
coordinator's decision input**, and an error that carries no context has removed
the coordinator's ability to recover intelligently while looking like sound
engineering.

### The four things a propagated error carries

The guide names them, and the four map one-to-one onto decisions:

```json
{
  "status": "partial_failure",
  "failure_type": "timeout",
  "attempted_query": "AI impact on music industry 2024",
  "partial_results": [
    { "title": "AI Music Generation Report", "url": "https://…", "relevance": 0.8 }
  ],
  "alternative_approaches": [
    "Narrower query: 'AI music composition tools'",
    "Different source type: industry association publications"
  ],
  "coverage_impact": "Not covered: AI's effect on music production workflows"
}
```

- `failure_type` — is this worth retrying at all?
- `attempted_query` — so the retry budget is not spent twice on the same call.
- `partial_results` — what already exists and must not be thrown away.
- `alternative_approaches` — what the subagent, which was there, thinks might
  work instead.

Strip those four to `{"status": "error", "message": "search unavailable"}` and
the coordinator retries blindly, re-runs a query that already ran, discards
findings it already had, and cannot tell the reader which part of the topic went
uncovered.

::: key-concept
**Two courses, one error, two halves.** D2.2 owns the *shape* of a tool error —
the MCP `isError` flag, `errorCategory`, `isRetryable`, the customer-facing
sentence — and states the fact that matters for both: those field names are an
application-level convention placed in the content of the result, not fields of
the MCP protocol. This section owns what happens next: what a subagent
propagates upward, and what the coordinator does with it.
:::

### Access failure is not an empty result

The single distinction the guide states most sharply, and the one a scenario
will hide behind a shared phrase like "no data":

| Outcome | What it means | Coordinator's move |
|---|---|---|
| Connection timeout, gateway error, auth failure | **Access failure** — the question was never answered | Decide on a retry; if it persists, propagate and annotate |
| `0 results` from a query that ran | **Valid empty result** — the question was answered, and the answer is "none" | Accept it as a finding, and record it as coverage |

The two are opposite in meaning and identical in appearance once both are
reported as "no data". Reporting them the same way is how a coordinator
concludes that an engineer holds no certification when the badge system merely
failed to answer: a wrong finding, produced with full confidence, from an
error that was never surfaced.

### Recover locally, propagate what you cannot resolve

The guide's division of labour: **subagents implement local recovery for
transient failures, and propagate only what they cannot resolve**, with what
was attempted and any partial results attached.

```python
async def search_topic(query: str):
    partial, attempts = [], []
    for attempt in range(3):
        try:
            return {"status": "ok", "results": await search(query)}
        except TransientError as e:              # recovered locally, never propagated
            attempts.append({"query": query, "error": str(e)})
            await backoff(attempt)
        except QuotaExceeded as e:               # cannot be resolved here
            return {
                "status": "partial_failure",
                "failure_type": "quota_exceeded",
                "attempted_query": query,
                "attempts": attempts,
                "partial_results": partial,
                "alternative_approaches": ["Use the cached corpus for this subtopic"],
            }
    return {
        "status": "partial_failure",
        "failure_type": "timeout",
        "attempted_query": query,
        "attempts": attempts,
        "partial_results": partial,
        "alternative_approaches": ["Narrower query", "Alternative source type"],
    }
```

Two halves, and the exam tests the boundary between them. Retrying a transient
network error inside the subagent is right; a coordinator does not need to
arbitrate a blip. Retrying with exponential backoff and *then* reporting
`"search unavailable"` is the anti-pattern wearing good engineering: the
recovery was fine, the report destroyed everything the coordinator needed.

One consequence worth knowing, because it defeats the whole scheme: an API
error that interrupts a subagent — a rate limit, for instance — **is never
delivered as that subagent's result**. There is nothing to structure, because
nothing comes back. Findings a subagent accumulated before it was cut off
survive only if they were written somewhere outside its context; the scratchpad
and state files of 5.4 are that somewhere.

### The three anti-patterns the guide names

| Anti-pattern | What it costs the coordinator | Instead |
|---|---|---|
| **Generic status** — `"search unavailable"` | Every recovery decision, since none of the four inputs survived | Return failure type, attempted query, partial results, alternatives |
| **Silent suppression** — catching the error and returning an empty result as success | The coordinator concludes "nothing exists" where access failed, and no recovery is even attempted | Distinguish access failure from valid empty result |
| **Aborting the whole workflow** on a single failure | Every result from every other branch, thrown away for one bad branch | Continue on partial results, annotate the gap |

Infinite retries inside a subagent are a real defect — latency and wasted
budget — but they are not on the guide's list of three. Do not count them as
one.

### Coverage annotations in the synthesis

The last skill closes the loop. A synthesis built from incomplete inputs must
say so, in the output, section by section: **which findings are well-supported,
and which topic areas have gaps because a source was unavailable.**

```text
AI in the creative industries

Visual art — FULL COVERAGE
  Three independent sources, no conflicts.

Music — PARTIAL COVERAGE
  Search subagent timed out on production workflows; composition and
  distribution covered. Treat production figures as unverified.

Literature — NOT COVERED
  Publisher database unreachable (auth failure, 3 attempts). No findings.
```

A report that reads as complete while resting on two of three branches is worse
than a report that reads as partial, because only one of the two can be acted
on safely.

::: exam-tip
Ask what the coordinator can still decide after reading the payload. That is the
whole question, and it sorts the options quickly.

The distractors are the ones that look responsible. **Exponential backoff, then
a generic status** — the retry logic is judged, the report is what is tested.
**Catching the timeout and returning an empty success** — the workflow does not
break, and the coordinator draws a false conclusion. **Propagating to a global
handler that terminates the run** — clean, and it discards every other branch's
results. **Aggregating failures into an overall coverage percentage** — a
readable metric that destroys the exact distinction the domain is testing, since
an access failure and a valid empty result become indistinguishable once
averaged.
:::

::: anti-pattern
**Reporting an unanswered lookup as a finding.** "No certification on file" and
"the certification system did not answer" become the same sentence, and the
second one has now produced a conclusion about a person.

**Letting partial results die with the subagent's context.** They were paid for.
If they are not in the payload or in a file, they no longer exist.
:::

**To test** — bank questions tagged `data-task="5.3"`.

## 5.4 — Manage context effectively in large codebase exploration
<!-- ts:5.4 | src:exam guide TS 5.4 (the knowledge: context degradation in extended sessions, where models start giving inconsistent answers and referencing "typical patterns" rather than specific classes discovered earlier; the role of scratchpad files for persisting key findings across context boundaries; subagent delegation for isolating verbose exploration output while the main agent coordinates high-level understanding; structured state persistence for crash recovery, where each agent exports state to a known location and the coordinator loads a manifest on resume. The skills: spawning subagents to investigate specific questions such as "find all test files" or "trace refund flow dependencies" while the main agent preserves high-level coordination; having agents maintain scratchpad files recording key findings and referencing them for subsequent questions; summarizing key findings from one exploration phase before spawning sub-agents for the next phase and injecting summaries into initial context; designing crash recovery using structured agent state exports — manifests — that the coordinator loads on resume and injects into agent prompts; using /compact to reduce context usage during extended exploration sessions when context fills with verbose discovery output) ; 06claudecode101 L6 (automatic compaction near the limit and its risk of losing details, /compact compacting everything up to that point, /clear starting from scratch, /context reporting what fills the window, subagents running with a separate context window and returning only a summary) ; 03subagents L1 (each subagent runs in its own context window, intermediate reads and searches stay isolated, only a summary returns, the whole subagent conversation is then discarded, and the trade-off is lost visibility into how it got there), L4 (research and exploration as the case subagents are for, the decision rule "does the intermediate work matter", and the pipeline anti-pattern when each step depends on the previous step's discoveries) ; 08agentsdk L8 (starting a fresh session with a structured summary injected is more robust than resuming with stale tool results; capturing the results you need as application state and passing them into a new session's prompt) -->

Two hours into an audit of a legacy inventory module, the agent is asked how
stock reconciliation is triggered and answers that "reconciliation jobs usually
follow the observer pattern" — although it read `StockLedgerSync` and traced its
three callers an hour earlier.

That sentence is the diagnostic. The guide describes the symptom precisely:
**inconsistent answers, and references to "typical patterns" rather than the
specific classes discovered earlier**. The model has stopped answering from the
codebase and started answering from the general case, because the specifics are
no longer usable in its context. No instruction fixes that. You cannot ask an
agent to remember something it no longer holds.

### Scratchpad files

The first remedy is a file. The agent writes its key findings down, and rereads
them when a later question needs them.

```text
investigation-scratchpad.md

Key findings
- StockLedgerSync — src/inventory/sync.ts, extends BaseReconciler
- reconcile() is called from three places: AdminPanel, NightlyCron, WebhookHandler
- The external WarehouseAPI is rate-limited to 100 req/min
- Migration 47 added ledger_reason NOT NULL — 2024-12-01

Open questions
- Does WebhookHandler retry on 429? (not yet read)
```

The file is not a transcript. Archiving the raw conversation to disk moves the
same 120 turns somewhere else and leaves the findings just as buried as they
were. A scratchpad holds what someone has already boiled down, which is exactly
the form in which a later reread is worth its tokens.

The same file earns its keep a second time, and 5.3 named the case: findings a
subagent accumulated before it failed survive in the scratchpad even when its
context does not.

### Subagent delegation

The second remedy is not to put the verbose material in the main context at all.
A subagent runs in **its own context window**; its file reads, searches and
tool calls stay there, and only its summary returns. The rest of its
conversation is discarded.

```text
Main agent:  "Trace every dependency of the refund flow and report the modules
              it touches, one line each."
Explore subagent (own context): reads 15 files, runs 6 greps, follows 3 imports
Returns:     "refund flow → PaymentProcessor, LedgerWriter, NotificationQueue;
              external: StripeGateway. Entry point: RefundController.submit()."

Main context cost: two lines instead of fifteen files.
```

The guide's examples of what to delegate are narrow, answerable questions —
"find all test files", "trace refund flow dependencies" — while the **main agent
preserves high-level coordination**. The decision rule from D1's territory
applies unchanged: delegate when you need the result and not the journey; keep
it in the main thread when each step depends on what the previous step found,
because the handoff is where that dependency breaks.

**And summarise between phases.** The skill is easy to skip and the guide states
it explicitly: before spawning the subagents of the next phase, summarise the
key findings of the current one and **inject that summary into their initial
context**. A subagent inherits nothing (TS 1.3): no parent history, no earlier
phase's findings. Without the injected summary, phase two rediscovers what phase
one already knew, or worse, contradicts it without knowing.

### `/compact`, and what it does not promise

This is the pointer D3 owed to this domain, and the guide places it here: **use
`/compact` to reduce context usage during extended exploration sessions when
context fills with verbose discovery output.**

| Command | What it does |
|---|---|
| `/compact` | Compacts everything up to that point: summarises what matters, drops unnecessary tool results |
| `/clear` | Starts from scratch, with no memory of the session — for a new feature, not for continuing this one |
| `/context` | Reports the current context size and which categories are filling it |

Claude Code also compacts automatically as the window approaches its limit. Both
paths carry the same caveat, and it is the reason `/compact` never stands alone
as an answer: **compaction can lose details**. It buys room; it does not promise
that any particular line survives. A constraint that must hold at turn 200 — an
erratum, a rail nobody may touch — belongs in a pinned block or a scratchpad,
outside what compaction may rewrite. Compaction for budget, persistence for what
must not be diluted: two problems, two mechanisms, and a question that describes
both is asking for both.

### Crash recovery: state exports and a manifest

For a long multi-agent workflow, the guide asks for something stronger than
notes: **each agent exports its state to a known location, and the coordinator
loads a manifest on resume** and injects it into agent prompts.

```json
// agent-state/web-search.json
{
  "status": "completed",
  "queries_executed": ["AI music 2024", "AI music composition"],
  "results_count": 12,
  "key_findings": ["AI-generated music grew 300% on streaming platforms in 2024"],
  "coverage": ["composition", "production"],
  "gaps": ["distribution", "licensing"]
}
```

```json
// agent-state/manifest.json
{
  "web-search":   "completed",
  "doc-analysis": "in_progress",
  "synthesis":    "not_started"
}
```

On restart the coordinator reads the manifest, sees that search is done and
analysis was interrupted, and resumes without re-running finished work. The
manifest carries the workflow's state; each agent's file carries its findings,
its coverage and its gaps.

This is a different mechanism from a scratchpad, and confusing them is a cheap
mistake: a scratchpad counteracts *degradation* inside one agent's session, a
manifest survives a *crash* across a workflow. The SDK documentation points the
same way for sessions in general, where capturing the results you need as
application state and passing them into a fresh session's prompt is more robust
than resuming a session whose tool results have gone stale. Session resumption
itself, `--resume` and `fork_session`, is TS 1.7 and lives in D1.

::: key-concept
**Four mechanisms, four different jobs.** Delegation keeps verbose output from
ever entering the main context. A scratchpad brings distilled findings back
after the context can no longer hold them. `/compact` buys budget and guarantees
nothing in particular. A state manifest survives a process that died. A scenario
usually describes one of the four; the wrong answers are the other three.
:::

::: exam-tip
"The agent cites typical patterns instead of the classes it read" is the
signature phrase for context degradation, and the answer is a scratchpad it
rereads, delegation of verbose discovery, or both.

The distractors each target the symptom. **Restarting in a clean session**
removes the degradation by discarding the investigation, and the same long
session reproduces it because nothing was persisted. **Raising `max_tokens`**
confuses two budgets: that parameter bounds the length of the generated answer,
not what the agent still holds on input. **Telling the agent to focus on the
real code and cite its sources** describes the symptom back to it, and no
instruction restores information that is no longer usable.
:::

::: anti-pattern
**Delegating a step whose intermediate work you need.** A test-runner subagent
that returns "tests failed" hides the output you need to debug, and a sequential
pipeline where each agent depends on the last one's discoveries loses
information at every handoff. Isolation is only free when the journey is
genuinely uninteresting.

**Treating `/compact` as the whole answer.** It is on the guide's list of skills
for this task statement, and it is the one that guarantees nothing about a
specific fact.
:::

**To test** — bank questions tagged `data-task="5.4"`.

## 5.5 — Design human review workflows and confidence calibration
<!-- ts:5.5 | src:exam guide TS 5.5, whose two central notions have no course source in this corpus — stratified random sampling and field-level confidence calibration are written from the guide alone (the knowledge: the risk that aggregate accuracy metrics such as 97% overall may mask poor performance on specific document types or fields; stratified random sampling for measuring error rates in high-confidence extractions and detecting novel error patterns; field-level confidence scores calibrated using labeled validation sets for routing review attention; the importance of validating accuracy by document type and field segment before automating high-confidence extractions. The skills: implementing stratified random sampling of high-confidence extractions for ongoing error rate measurement and novel pattern detection; analyzing accuracy by document type and field to verify consistent performance across all segments before reducing human review; having models output field-level confidence scores then calibrating review thresholds using labeled validation sets; routing extractions with low model confidence or ambiguous or contradictory source documents to human review, prioritizing limited reviewer capacity) ; 05claudeapi L16 (measuring a prompt against expected answers rather than testing it once or twice, and why limited testing breaks on inputs nobody anticipated), L17 (the eval workflow: a dataset of representative inputs, run, grade, and the average score across the dataset as the headline metric), L20 (code, model and human graders, and what each is suited to) — these lessons supply the labeled-dataset and grading machinery only -->

An extraction pipeline reports **97 % accuracy overall**, and the operations
team proposes switching off the human check on high-confidence extractions.
Dig into the number and scanned invoices run at 60 %, while the VAT number field
is wrong 40 % of the time.

Nothing about the 97 % is false. It is an average over a population, and an
average conceals structure by construction, which is the guide's first
knowledge point and the trap the whole task statement is built on.

This task statement asks two separate questions, and mixing them up is how its
distractors work:

- **How do you measure what the error rate really is?** → stratified random
  sampling, and accuracy broken down by document type and by field.
- **Where do you spend a review capacity that will always be smaller than the
  volume?** → field-level confidence scores, with thresholds calibrated on a
  labeled validation set.

### Measuring: segments, not an average

Before reducing human review, the guide asks for accuracy **analysed by document
type and by field**, and for consistency to be verified **across all segments**.

```text
Overall: 97.0 %          ← the number that authorised the proposal

By document type              By field
  digital PDF      99.1 %      invoice_number  98.7 %
  photographed     94.2 %      total           97.9 %
  scanned          60.3 %  ←   date            96.4 %
  handwritten      71.8 %  ←   vat_number      59.8 %  ←
```

Two segments carry almost all the error, and both are invisible in the headline.
The order matters as much as the analysis: **validate by segment before
automating**, not after. Automating first and measuring later means the
measurement arrives through customer complaints.

**Stratified random sampling** is what keeps the measurement honest once
automation is running. A sample is drawn **within each segment** rather than
across the population, because a plain random sample of a population dominated
by digital PDFs will contain almost no handwritten forms, the very segment that
fails. The guide gives it two jobs: measuring the **error rate in
high-confidence extractions**, and **detecting novel error patterns**, the
failures no existing rule catches, which by definition cannot be found by
looking where you already know to look.

```text
Daily volume 9,000 → sample 40 from each stratum, not 200 from the whole
  digital PDF   6,300 → 40 sampled
  photographed  1,900 → 40 sampled
  scanned         600 → 40 sampled   ← would be ~13 in a flat sample
  handwritten     200 → 40 sampled   ← would be ~4
```

### Routing: field-level confidence, calibrated

The second question is about a queue. Two reviewers cannot read nine thousand
extractions, so the question is which ones they read.

The guide's answer is a confidence score **per field**, not per document.

```json
{
  "invoice_number": { "value": "INV-2024-0912", "confidence": 0.98 },
  "total":          { "value": 1249.90,         "confidence": 0.95 },
  "vat_number":     { "value": "FR32-XXXXX",    "confidence": 0.41 }
}
```

Only `vat_number` goes to a human. A single score for the document would average
0.78 across the three, and either queue a document whose two other fields were
never in doubt, or — with a threshold at 0.75 — pass the whole thing through
with a bad VAT number inside it. That is the 97 % problem again, transposed from
measurement to routing.

**And the threshold is calibrated, not chosen.** A raw confidence score means
nothing until it has been confronted with ground truth: take a **labeled
validation set**, measure the actual error rate at each confidence level, and
put the cut-off where the residual risk becomes acceptable. Without that,
`confidence > 0.9` is a number someone liked the look of.

```text
Labeled validation set — 2,000 hand-checked fields
  confidence ≥ 0.95   error rate 0.4 %    → automate
  0.85 – 0.95         error rate 3.1 %    → automate if 3 % is tolerable here
  0.70 – 0.85         error rate 11 %     → review
  < 0.70              error rate 34 %     → review
```

The eval material in this corpus supplies the machinery around that set and no
more: a dataset of representative inputs, graders — code, model or human — and
an average score as the headline metric. Building the labeled set and running a
grader over it is the same workflow. The stratification and the per-field
calibration above come from the guide.

Two things get priority in the review queue, and the guide names both: **low
model confidence**, and **ambiguous or contradictory source documents**, meaning
two totals that disagree, an illegible date, a struck-through field. The second
does not depend on the model's opinion at all; it is a property of the input.

::: key-concept
**The two faces of confidence, and why they are not a contradiction.** In 5.2, a
self-rated confidence score is an unreliable escalation trigger. Here, a
confidence score is the correct routing mechanism. Three differences separate
them: **granularity** — per field, not per case; **calibration** — against
hand-labeled data, not the model's introspection; and **use** — ordering a
review queue, not making the decision in the human's place. An option that
mentions confidence is therefore neither automatically right nor automatically
wrong. Read which of the two it is offering.
:::

::: exam-tip
"97 % overall" in a scenario is the tell, and the answer is always: break it
down by document type and by field, and confirm consistency in every segment
*before* reducing review.

The distractors sort into two families. Against measurement: **comparing
quarters until the aggregate looks stable** — four quarters of an aggregate
reveal no structure at all; **reviewing only the document types that already
generated complaints** — a signal that is late, since the error has reached the
customer, and biased, since only visible errors come back.

Against routing: **one confidence score per document**, which is the aggregate
problem again; **the model rating its own certainty from 1 to 10**, which is the
uncalibrated version and matches no known error rate; **sampling a fixed share
at random and reviewing those**, which is a use confusion, since stratified
sampling measures an error rate and detects new patterns, and does not allocate
scarce capacity to where the risk is.
:::

::: anti-pattern
**Automating first, measuring afterwards.** The guide's wording is "before
automating high-confidence extractions". A pipeline whose segment accuracy is
discovered after the human check was removed is measuring with production.

**A confidence threshold that was never confronted with labeled data.** The
number is arbitrary, and the automation rate it produces is a coincidence.
:::

**To test** — bank questions tagged `data-task="5.5"`.

## 5.6 — Preserve information provenance and handle uncertainty in multi-source synthesis
<!-- ts:5.6 | src:exam guide TS 5.6, written from the guide alone apart from the subagent-output mechanism (the knowledge: how source attribution is lost during summarization steps when findings are compressed without preserving claim-source mappings; the importance of structured claim-source mappings that the synthesis agent must preserve and merge when combining findings; how to handle conflicting statistics from credible sources by annotating conflicts with source attribution rather than arbitrarily selecting one value; temporal data, where publication or collection dates in structured outputs prevent temporal differences from being misinterpreted as contradictions. The skills: requiring subagents to output structured claim-source mappings — source URLs, document names, relevant excerpts — that downstream agents preserve through synthesis; structuring reports with explicit sections distinguishing well-established findings from contested ones, preserving original source characterizations and methodological context; completing document analysis with conflicting values included and explicitly annotated, letting the coordinator decide how to reconcile before passing to synthesis; requiring subagents to include publication or data collection dates in structured outputs; rendering different content types appropriately in synthesis outputs — financial data as tables, news as prose, technical findings as structured lists — rather than converting everything to a uniform format) ; 08agentsdk L4 (the only content passed from parent to subagent is the prompt string of the Agent call, so anything the subagent must return has to be required there; a structured format separating content from metadata — source URL, document name, page number, publication date — is what preserves attribution through synthesis) -->

The final report says: *"The AI music market is estimated at $3.2 billion."*
Where does that come from? Which report, from what year, measuring what? Nobody
can tell any more — and a decision-maker who cannot check a number cannot use
it.

The guide's diagnosis is precise about *where* it was lost: **source attribution
disappears during summarization steps, when findings are compressed without
preserving claim-source mappings.** Not during collection. The search subagent
had the URL. Somewhere between it and the reader, a step compressed the finding
and kept only the sentence.

### The claim-source mapping

The remedy is to make the mapping part of the data, so that compression has
nothing to drop without dropping the claim itself.

```json
{
  "claim": "The AI music market reached $3.2B in 2024",
  "source_url": "https://example.com/ai-music-report-2024",
  "source_name": "Global AI Music Report 2024",
  "excerpt": "The AI music market reached $3.2B in 2024",
  "publication_date": "2024-06-15",
  "methodology": "Vendor revenue aggregation, 41 companies"
}
```

Two design points make this survive the pipeline:

- **The subagents produce it, not the synthesis agent.** By the time the
  synthesis agent sees a paragraph of prose, the URL is already gone; it cannot
  reattach what it never received.
- **The synthesis agent must preserve and merge the mappings**, which is a
  requirement stated in its prompt, not a hope. In the Agent SDK the point is
  structural: a subagent inherits nothing except the prompt string of the call
  that launched it, so a format that separates content from metadata — source
  URL, document name, page number, publication date — has to be demanded there
  or it will not happen.

### Conflicting values: annotate, do not choose

Two credible sources give different figures for the same quantity. The guide's
instruction is flat: **annotate the conflict with source attribution rather than
arbitrarily selecting one value.**

```json
{
  "claim": "Share of AI-generated music on streaming",
  "values": [
    { "value": "12%", "source": "Spotify Annual Report",
      "date": "2024-03", "methodology": "Automated classification" },
    { "value": "8%",  "source": "Music Industry Association Survey",
      "date": "2024-07", "methodology": "Survey of 500 labels" }
  ],
  "conflict_detected": true,
  "possible_explanation": "Different methodologies and collection periods"
}
```

The methodologies explain most of the gap: an automated classifier over a
catalogue and a declarative survey of labels are not measuring quite the same
thing. That explanation only exists because the methodology travelled with the
value.

The same rule applies one stage earlier, and the guide states it as a skill for
the analysis agent: **complete the document analysis with both values included
and explicitly annotated, and let the coordinator decide how to reconcile them**
before anything reaches synthesis. An analysis agent that picks a winner has
made a decision that was not its to make, silently, in a step nobody reviews.

### Dates turn a false contradiction into a trend

The guide's fourth knowledge point is the cheapest fix in the domain: require
**publication or data collection dates** in structured outputs.

```text
Without dates: "Source A says 10 %, Source B says 15 %. The sources conflict."
With dates:    "Source A (2023): 10 %. Source B (2024): 15 %.
                Consistent with growth over one year — not a conflict."
```

Same two numbers, opposite reading. Undated figures manufacture contradictions
out of time series, and the report then either flags a conflict that does not
exist or discards a valid measurement to resolve it.

### The shape of the report

Annotating a conflict achieves nothing if the annotation is buried in a wall of
prose. The guide asks for **explicit sections distinguishing well-established
findings from contested ones**, preserving each source's **original
characterization and methodological context** rather than rewriting everyone
into one flattened voice.

```text
WELL-ESTABLISHED FINDINGS
- Generative AI is in production use at all four major labels
  (3 concordant sources: Billboard 2024-05, MIA 2024-07, label filings 2024-Q2)

CONTESTED FINDINGS
- Share of AI-generated music on streaming: 12 % (Spotify, automated
  classification, 2024-03) against 8 % (MIA, declarative survey, 2024-07).
  Methodologies are not comparable; both values are retained.

COVERAGE GAPS
- Distribution and licensing: not covered (search subagent timed out)
```

The third section is 5.3's coverage annotation, arriving in the same document.
Provenance and coverage answer the same reader's question from two directions:
what is this based on, and what is it missing.

### Render each content type in its own form

The last skill is about the output format, and it is the one that catches people
because nothing upstream is broken when it fires. A synthesis agent receives
heterogeneous material and is tempted to pour all of it into one shape, usually
prose, because prose is the default.

| Content type | Rendered as | Why |
|---|---|---|
| Financial data, numeric series | **Tables** | Column-by-column comparison is the reading gesture the data invites; prose makes it impossible |
| News, events, context | **Prose** | Chronology and causation are stated in sentences, not cells |
| Technical findings | **Structured lists** | Each item stands alone and must remain separately citable and checkable |

Twelve quarterly figures inside a paragraph are correct, sourced, and unusable.

::: exam-tip
When a scenario complains that a synthesis report is **hard to use** although
the content is accurate and well-sourced, do not look upstream: the subagents
did their job. The defect is the uniform rendering at the synthesis step, and
the fix is to instruct the synthesis agent to render each content type in its
own form.

When the complaint is that **claims cannot be traced**, look at the summarization
step in the middle, and require structured claim-source mappings that downstream
agents preserve, not a final pass asking the synthesis agent to "add citations",
which is asking it to reconstruct URLs it no longer has.

On conflicting statistics, three wrong answers recur: **keeping the more recent
figure** (recency is an arbitrary tie-break that deletes valid evidence),
**averaging the two** (manufacturing a number no source reports), and **dropping
the statistic** (impoverishing the report instead of qualifying the
uncertainty).
:::

::: anti-pattern
**Letting the synthesis agent be the first place attribution matters.** Every
step before it compressed; the URL was lost long before this one.

**Reconciling a conflict inside a subagent.** The analysis agent's job is to
report both values with their attribution, annotated. Choosing between them is
the coordinator's decision, and it should be visible.
:::

**To test** — bank questions tagged `data-task="5.6"`.
