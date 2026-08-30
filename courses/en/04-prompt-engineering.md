# D4 — Prompt engineering and structured output (20 %)

<!-- src:exam guide domain 4 (the six task statements) ; 05claudeapi L25-L28, L34-L36 ; 09apicomplements L2-L9 ; 01claudecodeinaction L8 ; 06claudecode101 L7 -->

Twenty per cent of the score, six task statements, and the domain where the exam
stops asking what a mechanism is and starts asking what you write into a prompt,
a schema and a pipeline. One section per task statement, in the guide's own order
and under the guide's own wording — so that a question spotted on exam day maps
to a section here without translation.

D0 is assumed. It named the anatomy of a tool — `name`, `description`,
`input_schema` — the `tool_use` block, and `stop_reason`. It deliberately stopped
there and pointed here, twice: **`tool_choice` and the use of a JSON schema to
force a conforming payload are taught in 4.3**, in full, and D1 defers the same
pair to the same place. That debt is paid below.

The guide places neighbouring notions elsewhere, and this course honours that.
Which wording makes a model pick the right tool among several similar ones is
tool design, tested in TS 2.1 and 2.5; the agentic loop that turns one
`tool_use` block into a conversation is D1's TS 1.1; running a reviewer inside a
pipeline is D3's TS 3.6, which applies what 4.6 explains. Each of those gets a
sentence and a pointer here, never a second development.

## 4.1 — Design prompts with explicit criteria to improve precision and reduce false positives
<!-- ts:4.1 | src:exam guide TS 4.1 (explicit criteria over vague instructions and its comment-versus-code example, why "be conservative" and "only report high-confidence findings" fail against specific categorical criteria, a high false positive rate in one category undermining confidence in the accurate ones; the skills: criteria that say what to report and what to skip rather than confidence-based filtering, temporarily disabling a high false-positive category while its prompt is improved, explicit severity criteria with a concrete code example per level) ; 05claudeapi L25 (replacing a vague request with a direct statement of the task) ; L26 (being specific: listing the guidelines the output must satisfy instead of leaving them to interpretation) -->

An automated reviewer flags a pattern on Monday and approves the same pattern on
Thursday. Nothing changed in the code, and nothing changed in the prompt. What
changed is that "be careful about risky migrations" has no fixed meaning, so
every run reinvents the threshold.

The remedy the guide names is not a better adjective. It is **explicit
categorical criteria**: named conditions, each one something you could check by
hand. The guide's own example is the pair to memorise — "flag comments only when
claimed behavior contradicts actual code behavior", against "check that comments
are accurate".

```text
# Vague — the version that produces a different verdict every run
Check code comments for accuracy. Be conservative — report only
high-confidence findings.

# Explicit criteria — the version that produces the same verdict twice
Flag a comment ONLY IF one of these holds:
  1. It describes behaviour that contradicts what the code does.
  2. It refers to a function or variable that does not exist.
  3. A TODO or FIXME refers to a bug already fixed in the code.

DO NOT flag:
  - dated phrasing or style that does not contradict the code;
  - imprecise wording that is still consistent with the code;
  - missing comments (a separate category, reported separately).

For each finding, output: file:line, which condition matched, the quoted
comment, and the code fragment that contradicts it.
```

The two halves are equally load-bearing. Criteria that only say what to report
leave everything else to inference; the **skip list** is what stops a reviewer
from drifting into minor style and local convention.

::: key-concept
**"Be conservative" and "only report high-confidence findings" do not improve
precision.** The guide states it flatly, and the reason is worth holding: those
instructions ask the model to move a threshold it has no shared scale for.
"Confidence" is not a property you and the model agree on the way you agree on
"the comment names a function that does not exist".

A confidence dial filters; a categorical criterion decides. Only the second one
produces the same answer twice.
:::

### Severity that classifies consistently

The guide's third skill is severity, and it asks for two things: explicit
criteria for each level, **and a concrete code example per level**. The
definition alone leaves "medium" to taste; the worked example fixes it.

```text
CRITICAL — fails at runtime for users.
  Example: payment_total = order.get("total") + order["tip"]   # KeyError when no tip
HIGH — security vulnerability.
  Example: db.execute("SELECT * FROM users WHERE id = " + user_id)
MEDIUM — logic bug with no immediate outage.
  Example: for i in range(len(items) - 1):   # last item never processed
LOW — code quality only.
  Example: the same six-line block duplicated in three handlers.
```

### Why one bad category poisons the good ones

The guide's knowledge point on false positives is a claim about people, not about
models: **a high false positive rate in one category undermines developer
confidence in the accurate categories too.** Once the bot has cried wolf about
naming conventions three times, its genuine SQL-injection finding is skimmed with
the same eye.

That is what makes the guide's remedy counter-intuitive and worth remembering:
**temporarily disable the high false-positive category**, keep the precise ones
running, improve the prompt for the disabled one, and re-enable it once its
criteria are specific. Reviewing less, on purpose, is how the remaining output
keeps being read.

::: exam-tip
Two signatures, two answers.

Verdicts that vary run to run on identical input → replace the adjective with
named conditions. Developers ignoring the tool → look for the one noisy category
and turn it off while its prompt is rewritten.

The distractors are the plausible next moves, and each one leaves the criterion
undefined. Adding "be conservative", "only high-confidence findings" or a
numeric confidence threshold tunes a dial nobody has calibrated. Running the
check twice and keeping what both runs agree on intersects two unstable verdicts
and drops genuine findings. Narrowing the scope to fewer files reduces the volume
without making a single remaining decision consistent. And switching to a larger
model answers a specification problem with capacity.
:::

::: anti-pattern
**Turning the whole reviewer off because one category is noisy.** The guide's
move is surgical: the accurate categories keep their value and keep being read.
Silence costs you the findings that were correct.

**Writing criteria you cannot check.** "Flag anything that could confuse a future
maintainer" is a categorical sentence in shape only. If you cannot decide the
verdict yourself from the rule, neither can the model.
:::

**To test** — bank questions tagged `data-task="4.1"`.

## 4.2 — Apply few-shot prompting to improve output consistency and quality
<!-- ts:4.2 | src:exam guide TS 4.2 (few-shot examples as the most effective technique when detailed instructions alone still produce inconsistent output, their role in demonstrating ambiguous-case handling, generalisation to novel patterns rather than matching pre-specified cases, hallucination reduction in extraction with informal measurements and varied document structures; the skills: 2-4 targeted examples showing why one action was chosen over plausible alternatives, examples demonstrating the location/issue/severity/suggested-fix output format, examples distinguishing acceptable code patterns from genuine issues, examples covering inline citations versus bibliographies, examples addressing empty or null extraction of required fields) ; 05claudeapi L28 (one-shot and multi-shot prompting, examples for corner cases and complex output formats, sample_input and ideal_output wrapped in XML tags, and explaining why an example output is good rather than only showing it) ; L27 (XML tags as delimiters for interpolated content, descriptive tag names over generic ones) -->

4.1 fixed what to report. It does not fix a second failure: the criteria are
written, they are detailed, and the output still comes back in a different shape
every run — or comes back empty on the case nobody thought to list.

The guide's answer is unambiguous, and it is the phrase to recognise in an
option: **few-shot examples are the most effective technique for consistently
formatted, actionable output when detailed instructions alone produce
inconsistent results.** One example is one-shot prompting; several is multi-shot.

Two to four is the guide's own count, and the examples are targeted — they show
the **ambiguous** cases, not the easy ones. Each carries the reasoning for why
that action was chosen over a plausible alternative, because the reasoning is
what transfers.

```text
<examples>
  <example>
    <request>My order is broken</request>
    <action>get_customer, then lookup_order, then check status</action>
    <rationale>"Broken" may mean damaged goods or a failed delivery. The
    details decide, so gather them before routing anywhere.</rationale>
  </example>
  <example>
    <request>Get me a manager</request>
    <action>escalate_to_human, immediately</action>
    <rationale>The customer asked for a person explicitly. Attempting a
    resolution first overrides a stated preference.</rationale>
  </example>
</examples>
```

The XML tags are the course's habit and they earn their place here: examples are
interpolated content sitting next to instructions, and descriptive delimiters —
`<sample_input>`, `<ideal_output>`, `<examples>` — are what keeps the model from
reading an example as a request.

::: key-concept
**Examples generalise; lists enumerate.** The guide's wording is that few-shot
examples let the model "generalize judgment to novel patterns rather than
matching only pre-specified cases", and that is the whole reason they beat a
longer rulebook. Two examples of an informal measurement — "two handfuls",
"a splash" — teach the conversion; a lookup table of informal phrases covers
exactly the phrases in it, and the next import brings a new one.

This is also why the rationale matters more than the answer. An example that
shows only the output teaches a mapping. An example that shows why teaches a
rule.
:::

### The four jobs the guide gives them

| Job | What the examples show |
|---|---|
| Ambiguous cases | Which action was taken, and why not the plausible alternative |
| Output format | One filled-in record: location, issue, severity, suggested fix |
| Acceptable versus genuine | A pattern that must not be flagged, beside one that must |
| Varied document structures | The same fact extracted from an inline citation and from a bibliography entry |

The last two are the ones people forget, and each answers a specific failure.

**Acceptable versus genuine** is the false-positive lever of 4.1 seen from the
other side: rather than enumerating every benign pattern, show one benign and one
genuine, and let the distinction generalise.

```json
{"location": "src/auth/login.ts:42",
 "issue": "SQL injection in the username parameter",
 "severity": "critical",
 "suggested_fix": "Use a parameterised query"}
```

**Varied document structures** is the guide's extraction case. A rate reported as
`the rate is 42% (Smith, 2023)` and the same rate reported as `The rate is 42%.
[1]` with a bibliography at the end are one fact in two shapes, and a model shown
only the first returns `null` on the second. The guide names that symptom
directly: examples are what addresses **empty or null extraction of required
fields** on documents whose format varies.

::: exam-tip
Two signals in the scenario, together, name this answer: **the instructions are
already detailed** and the output is still inconsistent, and the model has to
decide cases nobody listed in advance. Few-shot is the only lever that teaches a
distinction instead of enumerating instances.

The distractors are all reasonable-sounding next moves. Rewriting the
instructions more firmly repeats what the scenario says has already failed.
Maintaining a whitelist or lookup table of accepted patterns covers what is in
it and nothing else, and the scenario usually says new phrasings keep arriving.
Post-processing the output with a filter cannot reconstruct a decision the model
never made. Lowering sensitivity suppresses true positives at the same rate as
false ones. And rejecting the hard inputs for manual handling buys correctness by
refusing to do the work.
:::

::: anti-pattern
**Twenty examples of the easy case.** Volume is not the variable; targeting is.
Two to four examples aimed at the cases that are actually ambiguous outperform a
page of examples the model already handles.

**Examples that show the output without the reasoning.** They pin the format and
teach nothing transferable, so the first unseen phrasing lands back where it
started.
:::

**To test** — bank questions tagged `data-task="4.2"`.

## 4.3 — Enforce structured output using tool use and JSON schemas
<!-- ts:4.3 | src:exam guide TS 4.3 (tool use with JSON schemas as the most reliable approach to guaranteed schema-compliant output and the elimination of JSON syntax errors, the distinction between tool_choice "auto", "any" and a forced named tool, strict schemas not preventing semantic errors, required versus optional fields and the enum plus "other" and detail-string pattern; the skills: defining an extraction tool and reading the structured data from the tool_use response, "any" when several extraction schemas exist and the document type is unknown, forcing extract_metadata before enrichment steps, nullable fields so the model does not fabricate values, "unclear" enum values, and format normalization rules in the prompt alongside a strict output schema) ; 09apicomplements L5 (the four tool_choice values including "none", the absence of a natural-language explanation before the call under "any" or a forced tool, and manual extended thinking supporting only auto and none) ; L3 (the supported JSON Schema subset and the constraints silently dropped, nullable written as type: ["string", "null"], the enum plus "other" escape hatch, structured outputs being incompatible with message prefilling) ; L2 (field nuance: output_config.format and strict tool use exist on the platform today) ; 05claudeapi L34 (a tool is name, description and input_schema) ; L35 (the tool_use block carries an id, the tool name and the input dictionary) -->
<!-- owns:tool-choice -->

Ask for JSON in prose and you get JSON most of the time: a trailing comma here,
a fenced code block there, a field renamed on the third document. The guide's
answer is a mechanism rather than a phrasing, and it states it without hedging —
**tool use with JSON schemas is the most reliable approach for guaranteed
schema-compliant structured output, and it eliminates JSON syntax errors.**

The move is a small inversion. You declare a tool whose `input_schema` is the
shape you want *out*, you force the model to call it, and you read the extraction
from the call's `input`. **The tool is never executed.** Its whole purpose is to
be a schema the model must fill.

```json
{
  "tools": [{
    "name": "extract_invoice",
    "description": "Records the fields extracted from an invoice document.",
    "input_schema": {
      "type": "object",
      "properties": {
        "invoice_number": { "type": "string" },
        "issue_date":     { "type": "string", "description": "ISO 8601, YYYY-MM-DD" },
        "total":          { "type": "number" },
        "company_name":   { "type": ["string", "null"] },
        "document_kind":  { "enum": ["invoice", "credit_note", "other", "unclear"] },
        "kind_detail":    { "type": ["string", "null"] }
      },
      "required": ["invoice_number", "total", "document_kind"]
    }
  }],
  "tool_choice": { "type": "tool", "name": "extract_invoice" }
}
```

The reply carries `stop_reason: "tool_use"` and a `tool_use` block whose `input`
*is* your record — no parsing of prose, no repair pass:

```json
{ "type": "tool_use", "id": "toolu_01A", "name": "extract_invoice",
  "input": { "invoice_number": "INV-2024-0912", "issue_date": "2024-09-12",
             "total": 1249.90, "company_name": null,
             "document_kind": "invoice", "kind_detail": null } }
```

### `tool_choice`

This is the field D0 and D1 both deferred here. It decides whether calling a
tool is optional, mandatory, or mandatory and named.

| Value | Behaviour | Reach for it when |
|---|---|---|
| `{"type": "auto"}` | Default. The model decides, and may answer in text | The tool is not always relevant |
| `{"type": "any"}` | The model **must** call a tool, and picks which | Several extraction schemas exist and you do not know the document type |
| `{"type": "tool", "name": "extract_metadata"}` | The model must call **that** tool | One schema is mandatory, or one extraction must run before the rest |
| `{"type": "none"}` | No tool may be called | You want prose even though tools are declared |

The two uses the guide names are worth memorising as scenarios, because that is
how they are examined. **`any`** is the answer when a pipeline receives invoices,
purchase orders and delivery notes through the same door: you have a schema for
each, you cannot say in advance which applies, and what you cannot afford is a
conversational reply instead of a call. **A forced named tool** is the answer
when order matters — `extract_metadata` must run first, and the enrichment steps
come in later turns.

::: key-concept
Field behaviour that follows from forcing a call: under `any` or a forced tool,
the model does not produce a natural-language explanation before the call. If you
want both the reasoning and the call, stay on `auto` and ask for the tool in the
prompt — "use the `extract_invoice` tool in your response".

Second constraint, same family: with manually enabled extended thinking, only
`auto` and `none` are supported.
:::

### Designing the schema so it does not invite invention

A schema is a contract, and a badly drawn contract makes fabrication the
compliant answer.

| Rule | Written as | Why |
|---|---|---|
| Optional means optional | Leave the field out of `required` | A required field the source does not carry forces the model to choose between breaking the schema and inventing a value |
| Nullable | `"type": ["string", "null"]` | Absence needs a representation, otherwise a gift certificate comes back with a plausible price |
| `enum` + `"other"` + detail | `"enum": [..., "other"]` plus a free-text field | A closed enum produces a wrong category rather than an admission that none fits |
| `"unclear"` | An enum value of its own | Lets the model say the document does not settle it |

The guide's last skill on this task statement is easy to skip and cheap to
apply: **format normalization rules go in the prompt, next to the strict
schema.** The schema says a field is a string; only the prompt can say which
string.

```text
Normalise before you fill the schema:
  dates       → ISO 8601 (YYYY-MM-DD); resolve "yesterday" to an absolute date
  money       → numeric amount plus a separate ISO 4217 code; "five bucks" → 5, USD
  percentages → decimal fraction; "half" → 0.5
  absent      → null, never a placeholder, never a guess
```

::: key-concept
**The guide is the law here.** Its TS 4.3 tests `tool_use` with a JSON schema and
`tool_choice`. If an option names `output_config.format` or
`client.messages.parse()`, it is not the expected answer on this exam. The same
verdict falls on message prefilling paired with a stop sequence: the API course
teaches it as a route to structured output, and this corpus's out-of-scope list
sets it aside on the strength of this task statement — this section is the
promise that entry makes. It is also incompatible with the newer mechanism below, so
the two are never combined in practice either.

Field nuance, so you are not surprised in production: the platform now carries a
dedicated JSON-outputs mechanism (`output_config.format`, and `messages.parse()`
with a Pydantic model in the Python SDK) that constrains the response text, plus
`strict: true` on a tool, which constrains tool arguments by grammar-constrained
sampling rather than by adherence. Same goal, newer surfaces, absent from the
guide.

On that strict path the platform accepts only a subset of JSON Schema, and the
part worth carrying back to ordinary tool use is the failure mode: constraints
like `minimum`, `maxLength` and `pattern` are dropped silently rather than
rejected. A bound you wrote is not a bound that was enforced. If a number has to
stay in range, your code checks it — which is 4.4.
:::

::: exam-tip
Three phrasings, three answers. "Guarantee a schema-conformant payload" →
`tool_use` with a JSON schema. "The document type is unknown and several schemas
exist" → `tool_choice: {"type": "any"}`. "This extraction must run before the
enrichment steps" → force it by name.

The distractors are consistent across questions. `tool_choice: "auto"` leaves the
model free to answer in prose, so the extraction stops being guaranteed — it is
the closest wrong answer and the one to read for. Describing the schema in the
prompt and asking for JSON reintroduces exactly the syntax errors the mechanism
removes. Repairing the output with a regular expression afterwards treats the
symptom and moves the fragility into your code. And raising `max_tokens` answers
a shape problem with length.
:::

::: anti-pattern
**Believing the schema validated the content.** A forced call guarantees the
*shape* of the payload and nothing about the truth of its values: line items that
do not sum to the total, a date in the wrong field, an amount that never appeared
in the document. The guide says so explicitly, and 4.4 is where that is handled.

**Marking every field `required` for a tidy downstream type.** The tidiness is
bought with invented values, which is the more expensive defect.
:::

**To test** — bank questions tagged `data-task="4.3"`.

## 4.4 — Implement validation, retry, and feedback loops for extraction quality
<!-- ts:4.4 | src:exam guide TS 4.4 (retry with error feedback, appending the specific validation errors to the prompt on retry; the limits of retry when the information is simply absent from the source; detected_pattern fields for systematic analysis of dismissal patterns; semantic validation errors against the schema syntax errors eliminated by tool use; the skills: follow-up requests carrying the original document, the failed extraction and the specific validation errors, telling an ineffective retry from a resolvable one, adding detected_pattern to structured findings, and extracting calculated_total beside stated_total with a conflict_detected boolean) ; 09apicomplements L4 (the four-step validation-retry loop, format errors resolvable by retry versus information absent from the source, a refusal returning HTTP 200 with stop_reason "refusal", and field-level confidence routing low-confidence extractions to human review) ; 05claudeapi L36 (a tool_result block carries tool_use_id, content and is_error, and travels in a user message) ; exam guide appendix (Pydantic: schema validation, semantic validation errors, validation-retry loops) -->

4.3 ended on the sentence this task statement starts from: the payload conforms
and the values are wrong. `total` reads 150 while the line items sum to 145; a
supplier name sits in the customer field. Nothing in the schema can see it,
because nothing in the schema knows arithmetic.

The mechanism is a loop, and the guide tests its four steps:

1. The model produces an extraction.
2. Your code validates it — JSON Schema for structure, then business rules for
   meaning. Pydantic is the appendix's named tool, and it does both: types and
   required fields in the model, cross-field rules in a validator.
3. On failure, you send a follow-up request carrying **three things**: the
   original document, the failed extraction, and the **specific** validation
   error.
4. You track which errors retries actually fix.

Step 3 is the whole of "retry with error feedback", and its adjective is the
substance. "There is an error, try again" re-rolls the same dice. The error has
to name the field and the gap.

```python
try:
    invoice = Invoice.model_validate(tool_use.input)   # types, then @model_validator
    return invoice
except ValidationError as e:
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": [{
        "type": "tool_result",
        "tool_use_id": tool_use.id,
        "is_error": True,
        "content": (
            "total is 150.00 but the line_items sum to 145.00. "
            "Re-read the line items and resubmit; do not adjust total to fit."
        ),
    }]})
```

The follow-up rides the ordinary conversation: the assistant message holding the
`tool_use` block goes back in the history, and the answer to it is a
`tool_result` block carrying the same `tool_use_id`, with `is_error: true`. The
document is already in the history, so the model sees all three of the guide's
ingredients at once.

### When a retry cannot work

This is the judgement the task statement is built around, and it is a question
about the **source document**, never about the number of attempts.

| Retry will fix it | Retry cannot fix it |
|---|---|
| Format errors — a date written `09/12/24` where the schema wants ISO 8601 | The information is not in the document at all |
| Structural errors — a value in the wrong field, a list where an object belongs | The figure lives in an appendix or an external document you did not provide |
| Arithmetic inconsistencies the document itself can settle | |

The left column shares one property: the model had the information and shaped it
badly. Feeding back the exact error is enough. The right column shares the
opposite one, and a retry there can only produce a more confident invention. The
answer is a nullable field and a `null` — 4.3's design rule, arriving as an
operational decision.

### Two fields that make the pipeline self-diagnosing

The guide names both, and both are cheap additions to a schema.

**`stated_total` beside `calculated_total`, plus `conflict_detected`.** Have the
model extract the figure the document declares *and* the sum it computes from the
lines, then flag the disagreement instead of silently picking one. The conflict
survives into your code, where a human can arbitrate.

```json
{"stated_total": 150.00, "calculated_total": 145.00,
 "conflict_detected": true, "line_items": [ … ]}
```

**`detected_pattern` on every finding.** A code-review pipeline that records
which construct triggered each finding turns dismissals into data: when
developers reject findings, you can group the rejections by pattern and see that
one construct produces most of the noise — which is precisely the category 4.1
tells you to disable and rewrite.

```json
{"location": "src/auth/login.ts:42",
 "issue": "Possible null dereference",
 "severity": "medium",
 "detected_pattern": "no optional chaining on user.profile.email",
 "suggested_fix": "user?.profile?.email"}
```

::: key-concept
Two failure signals your validation code should not confuse with a bad
extraction. `stop_reason: "refusal"` means the model declined on safety grounds —
and it comes back with **HTTP 200**, so code that only checks the status treats a
refusal as a success and parses a non-conforming reply. `stop_reason:
"max_tokens"` means the output was cut off mid-generation; the retry there is a
larger budget, not a better prompt. The full set of `stop_reason` values is D0's.

The last floor of the pattern, and a guide skill: have the model report a
confidence per field, route low-confidence extractions to human review, and
measure accuracy by document type and by field. An acceptable overall accuracy
can hide one document type that fails systematically.
:::

::: exam-tip
Read for where the missing information is. "The value appears nowhere in the
document" or "that figure is in the contract, which was not provided" → the retry
is pointless; make the field nullable and record the gap. "The date came back in
the wrong format", "the values do not sum" → the retry works, provided the
feedback names the field and the discrepancy.

The distractors on validation questions are neighbouring good practices applied
to the wrong failure. More few-shot examples improve the extraction upstream and
do nothing about a runtime validation failure. A stricter schema removes
malformed payloads, not disagreements between fields. A custom post-processing
parser reimplements what the validator already does. Raising `max_tokens` bounds
length, not correctness. And retrying with the same prompt, harder, is the
control condition.
:::

::: anti-pattern
**Retrying without the error.** Resending the document and hoping is a lottery,
and it is billed per ticket.

**Letting the validator repair the value quietly.** Overwriting `total` with the
computed sum makes the pipeline green and destroys the signal that the document
or the extraction was wrong. Flag the conflict; decide it elsewhere.
:::

**To test** — bank questions tagged `data-task="4.4"`.

## 4.5 — Design efficient batch processing strategies
<!-- ts:4.5 | src:exam guide TS 4.5 (the Message Batches API with its 50 % cost saving, up to 24-hour processing window and absence of a latency SLA; batch as appropriate for non-blocking latency-tolerant workloads and inappropriate for blocking ones such as pre-merge checks; no multi-turn tool calling within a single request, meaning tools cannot be executed mid-request and their results returned; custom_id for correlating request and response pairs; the skills: matching the API to the latency requirement, calculating submission frequency from an SLA such as 4-hour windows for a 30-hour commitment against 24-hour processing, resubmitting only the failures identified by custom_id with modifications such as chunking oversized documents, and refining prompts on a sample before processing large volumes) ; 09apicomplements L6 (the request shape: custom_id and params on each request) ; L7 (the four result types with only succeeded billed, results returned unordered so custom_id is the only reliable pairing, and invalid_request_error requiring a corrected body before resubmission where a server error can be retried as is) ; L8 (100 000 requests or 256 MB per batch, results retrievable for 29 days, one failed request not affecting the others, and the synchronous-only parameters a batch refuses: stream, speed, store, previous_thread_event_id, cache_hint, context_hint, max_tokens: 0) ; L9 (dry-running a single request through the Messages API before launching the batch) -->

The Message Batches API processes large volumes of Messages API requests
asynchronously. Three properties decide every question about it:

| Property | Value |
|---|---|
| Cost | **50 % off** standard rates |
| Processing window | Up to **24 hours**; most batches finish in under an hour |
| Latency SLA | **None** |
| Correlation | `custom_id`, set by you on each request |
| Results order | Not guaranteed |
| Multi-turn tool calling in one request | Not supported |

The third row is the one that decides fit, and it is the one distractors attack.
"Most batches finish within the hour" is an observation about queues; the
twenty-four hours bound how long processing *may* run. Neither is a promise about
any single submission.

```json
POST /v1/messages/batches
{ "requests": [
    { "custom_id": "invoice-10231",
      "params": { "model": "claude-sonnet-5", "max_tokens": 1024,
                  "messages": [{ "role": "user", "content": "Extract: …" }] } },
    { "custom_id": "invoice-10232",
      "params": { "model": "claude-sonnet-5", "max_tokens": 1024,
                  "messages": [{ "role": "user", "content": "Extract: …" }] } }
] }
```

```json
// Results come back unordered; pair by custom_id, never by position.
{ "custom_id": "invoice-10232", "result": { "type": "succeeded", "message": { … } } }
{ "custom_id": "invoice-10231", "result": { "type": "errored",  "error": { … } } }
// → resubmit invoice-10231 alone.
```

`custom_id` is not decoration. Because results are unordered, it is the only
reliable way to say which response belongs to which document — which is also what
makes selective resubmission possible.

### Which workload goes where

| Workload | API | Why |
|---|---|---|
| Pre-merge check, a developer waiting | Synchronous | Blocking; twenty-four hours is not a possible answer |
| Interactive code review | Synchronous | Immediate response required |
| Overnight technical-debt report | Batch | Wanted by morning; half price |
| Weekly security audit | Batch | Latency-tolerant, high volume |
| Nightly test generation | Batch | Non-blocking by construction |

The criterion is a single question: **is anyone waiting?** Cost savings never
promote a blocking workflow into a batch.

::: key-concept
**A batch request buys one pass and one answer.** You may declare tools and send
a multi-turn history, but nothing executes a tool in the middle of a batch
request and hands the result back to the model for another turn. Any step whose
design requires the model to ask for a file, receive it, and continue does not
fit — and no amount of polling changes that, because the limitation is structural
rather than temporal.

That is the fact behind an entire family of questions: an agentic loop belongs to
the synchronous API, and D1's TS 1.1 is where that loop is taught.
:::

### Submission cadence under an SLA

The guide asks you to compute one. The arithmetic first: with a **30-hour**
commitment and processing that may take up to **24 hours**, a submission can wait
at most `30 − 24 = 6` hours in the queue before it is sent.

Six hours is the ceiling, not the answer. A batch submitted exactly at the six
hour mark and processed at the cap consumes the entire budget, leaving nothing
for a document that failed and must be resubmitted. **The guide's own example
answers 4-hour windows for a 30-hour SLA** — the ceiling minus a margin.

Note which number entered that calculation. Most batches finish in under an
hour, and that observation has no place in the arithmetic: you size on the
**24 hours the platform bounds**, never on the hour you have been getting.

::: exam-tip
The trap on cadence questions is the arithmetically exact number. Six hours is
correct arithmetic and a wrong operational answer, which is what makes it
attractive. Compute `commitment − processing cap` to find the ceiling, then take
the option below it.
:::

### Handling failures

Four result types come back: `succeeded`, `errored`, `canceled`, `expired`, and
only `succeeded` is billed. One failed request does not affect the others.

- **Identify failures by `custom_id`** and resubmit only those. Re-running the
  whole batch pays again for everything that worked.
- **Resubmit with a modification, not identically**, when the cause is in the
  request: a document that exceeded the context limit goes back as chunks. An
  `invalid_request_error` means the body must be corrected before it is sent
  again; a server error can be retried as it stands.
- **Refine the prompt on a sample first.** Dry-run one representative request
  through the synchronous Messages API, get the extraction right, and only then
  submit the thousand — otherwise you discover a prompt defect after paying for
  every document in the batch.

Two operational numbers worth carrying: a batch holds up to 100 000 requests or
256 MB, whichever comes first, and results stay retrievable for 29 days. And a
short list of parameters a batch refuses, each for the same reason — they are
synchronous-only settings: `stream: true` (results come back as files),
`speed`, `store` and `previous_thread_event_id`, `cache_hint` and
`context_hint`, and `max_tokens: 0`.

::: anti-pattern
**Moving a blocking check to the batch API for the discount.** The saving is
real, the developer is still waiting, and no latency is promised. A distractor
often softens it with status polling; polling reads a state, it does not create a
guarantee.

**Pairing responses to requests by position.** Results are unordered. Code that
zips two lists together will mis-attribute extractions silently, and the defect
surfaces as data that is subtly wrong rather than as an error.
:::

**To test** — bank questions tagged `data-task="4.5"`.

## 4.6 — Design multi-instance and multi-pass review architectures
<!-- ts:4.6 | src:exam guide TS 4.6 (a model retaining its reasoning context from generation and being less likely to question its own decisions in the same session, independent review instances without prior reasoning context outperforming self-review instructions or extended thinking at catching subtle issues, and multi-pass review splitting a large review into per-file local passes plus cross-file integration passes to avoid attention dilution and contradictory findings; the skills: using a second independent Claude instance to review generated code without the generator's reasoning context, splitting large multi-file reviews into per-file passes plus separate integration passes for cross-file data flow, and running verification passes where the model self-reports confidence alongside each finding to enable calibrated review routing) ; 01claudecodeinaction L8 (opening a fresh session or subagent that reviews the changed code with no memory of how it was built, catching what the original run talked itself past) ; 06claudecode101 L7 (a code-reviewer subagent runs in its own context window with fresh eyes, is restricted to read-only tools, and is checked into the repository so the whole team uses the same reviewer) -->

Ask the session that just wrote the code to review it, and it will find little.
Not because it is careless, but because of what it carries: **the model retains
its reasoning context from generation, which makes it less likely to question its
own decisions in the same session.** It already considered the alternative and
rejected it. Re-reading confirms; it does not test.

The guide's remedy is architectural rather than instructional, and the comparison
it draws is the point: **an independent review instance, with no prior reasoning
context, catches subtle issues better than a self-review instruction or extended
thinking.** Telling the model to be critical of itself, or giving it more room to
deliberate, both operate inside the transcript that produced the bias.

"Independent" has an operational meaning: a separate session, or a subagent,
which receives the artifact and the criteria and **not** the conversation that
produced them. In Claude Code that is a reviewer subagent — its own context
window, read-only tools, checked into the repository so the team shares one
reviewer. D3's TS 3.6 puts the same instance in a pipeline; what belongs here is
why the instance has to be a different one.

### Splitting a review that is too large for one pass

A pull request touching thirty files reviewed in a single pass produces
inconsistent output: a pattern flagged in one file and approved in another,
findings that thin out towards the end. The cause the guide names is **attention
dilution**, and the remedy is to shrink each pass rather than to enlarge the
context.

| Pass | Scope | Finds |
|---|---|---|
| Per-file | One file at a time | Local bugs, security issues, quality |
| Integration | Signatures and call sites across the changed set | Type mismatches across module boundaries, circular dependencies, broken data flow |

```bash
# Pass 1 — local, one invocation per file.
for file in $(git diff --name-only main...HEAD); do
  review --scope="$file" \
         --prompt="Local issues only: bugs, security, quality in THIS file."
done

# Pass 2 — integration, one invocation over the changed set.
review --scope="$(git diff --name-only main...HEAD)" \
       --prompt="Cross-file only: type mismatches across module boundaries,
                 circular dependencies, broken data flow. Ignore local issues."
```

Splitting a task into focused passes is D1's task decomposition (TS 1.6) applied to
review; what is specific here is the *cut*, local against cross-file, because
those are the two things one undifferentiated pass does worst.

### Confidence, self-reported

The third skill is a verification pass in which the model reports a confidence
alongside each finding. The value is not the number itself but the routing it
enables: high-confidence findings go straight to the developer, low-confidence
ones to a human check, and the threshold moves as you observe which band is
worth reading.

```json
{"file": "src/billing/refund.ts", "line": 88,
 "issue": "Refund may exceed the original charge when a partial refund precedes it",
 "confidence": 0.42,
 "detected_pattern": "no accumulated-refund check before subtraction"}
```

Two cautions keep this honest. A confidence reported from inside the generating
context inherits that context's blind spot — the verification pass is worth
running in the independent instance. And a self-reported number is a signal for
routing, not a measurement: what turns it into one is comparing it against
findings whose verdict you already know.

::: exam-tip
Three symptoms, three answers. Generated code reviewed clean by the session that
wrote it → a second instance that never saw the generation. Contradictory
findings across files in one large review → split into per-file passes plus an
integration pass; name the cause as attention dilution, not missing context.
Too many findings for humans to triage → a self-reported confidence per finding,
used to route.

The distractors are seductive because each names a real capability. Moving to a
model with a larger context window answers dilution with capacity, confusing how
much can be held with how evenly it is attended to. Instructing the same session
to "review your work critically" or enabling extended thinking on it both stay
inside the transcript that caused the bias — the guide rules out exactly these
two by name. Three full passes with a consensus vote sounds rigorous and
discards every genuine bug that only one pass saw. And asking developers to split
their pull requests moves the work onto people without changing the system.
:::

::: anti-pattern
**Handing the reviewer the generation transcript "for context".** It is the one
thing that must not travel: the transcript is the reasoning you want the reviewer
not to share. Pass the artifact and the criteria.

**Reviewing the diff in the generating session to save a call.** The saving is
real and the review is worth less than the call it saved.
:::

**To test** — bank questions tagged `data-task="4.6"`.
