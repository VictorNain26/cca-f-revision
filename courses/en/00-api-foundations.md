# D0 — API foundations

<!-- src:05claudeapi L3, L5, L6, L8, L34-L38 ; exam guide appendix (Claude API, Context window management) -->

These are the prerequisites the exam guide assumes you already have. Nothing
here is a task statement of its own: the guide tests what you *build* on top of
this. Read it once, then move to D1.

Each section stops where a task statement starts. Where a notion belongs to
another domain, you get one sentence of definition and a pointer, never a bare
link.

The guide also decides what is *not* here. Its out-of-scope list rules out
Claude's internal architecture, tokenization specifics, embedding models,
streaming, and API authentication — so the request lifecycle stops at the shape
of the call, and never goes inside the model. What the guide leaves out, the
corpus records with its motive in `courses/out-of-scope.md`.

## Anatomy of a Messages API request
<!-- src:05claudeapi L3, L5 ; exam guide appendix (Claude API — max_tokens, system prompts) -->
<!-- owns:messages-api -->

One call carries everything: `client.messages.create()`. There is no session to
open and nothing to close.

| Field | Required | What it does |
|---|---|---|
| `model` | yes | Which Claude model answers the request |
| `messages` | yes | The conversation history you are sending, oldest first |
| `max_tokens` | yes | Ceiling on how many tokens the response may contain |
| `system` | no | Standing instructions, outside the conversation |
| `tools` | no | The tool schemas the model may call — designed in D2.1 |
| `tool_choice` | no | Whether the model may answer in prose or must call a tool — developed in D4.3 |
| `temperature` | no | How much randomness enters token selection, from 0 to 1 |

Two of these are read wrong often enough to be worth stating plainly.

`max_tokens` is a safety limit, not a target. Set it to 1000 and Claude stops
after 1000 tokens even if it had more to say; it never tries to reach the
number. It bounds the output, not the request you send.

`system` is a sibling of `messages`, not one of them. Every other field on this
list is a sibling too: `tools` and `tool_choice` sit at the top level of the
body, never inside a message.

```json
{
  "model": "claude-sonnet-5",
  "max_tokens": 1024,
  "system": "You are a financial analysis assistant. Answer concisely.",
  "messages": [
    { "role": "user", "content": "What was company X's revenue in Q3?" }
  ]
}
```

::: key-concept
`system` sits beside `messages`, never inside it. Sliding the standing
instructions in as a first `user` message is the most common shape error on
this endpoint, and it changes how the model weighs them.
:::

Exact model identifiers are not exam material. `temperature` is not either —
the guide never names it, and no task statement turns on it; the row is here so
you recognize the field in a request body you are handed, not to be memorized.

**To test** — the self-assessment questions of this page.

## Roles, turns, and a stateless API
<!-- src:05claudeapi L5, L6 ; exam guide TS 1.1, TS 1.3 -->
<!-- owns:message-roles -->

`messages` is a list of dictionaries, each with a `role` and a `content`. There
are two roles:

| Role | Who writes it |
|---|---|
| `user` | You — what you send to Claude |
| `assistant` | Claude — what it generated |

A conversation alternates between the two: user turn, assistant turn, user turn.

**The API stores nothing.** Every request is independent and carries no memory
of the ones before it. Ask "What is quantum computing?", get an answer, then
send "Write another sentence" on its own, and the model has no idea what it is
being asked to extend — it will write a sentence about something else entirely.

Multi-turn conversation is therefore work you do, not a service the API renders:
send the first user message, append Claude's reply to your list as an
`assistant` message, append the follow-up as a `user` message, and send the
whole list again.

```json
"messages": [
  { "role": "user",      "content": "Define quantum computing in one sentence" },
  { "role": "assistant", "content": "Quantum computing uses quantum states to process information." },
  { "role": "user",      "content": "Write another sentence" }
]
```

Only because the first two turns are still in the array does "Write another
sentence" mean anything on the third.

::: exam-tip
Everything that must still be visible on turn five has to be in the array you
send on turn five. This is the rule behind most "the model forgot" bugs, and it
applies to tool results exactly as it applies to text. The same rule is why a
spawned subagent has to be handed its context explicitly — it inherits nothing.
:::

::: anti-pattern
Sending only the latest message and expecting the earlier turns to still be
there. Nothing expires server-side, because nothing is stored server-side;
rebuilding the history is the caller's job, on every single request.
:::

**To test** — bank questions tagged `data-task="1.3"`.

## Content blocks
<!-- src:05claudeapi L35, L36, L38 ; exam guide TS 1.1 (tool results appended to history) -->
<!-- owns:content-blocks -->

A reply's `content` is never a bare string — it is a **list of blocks**, each
with its own type. Reading a reply as text works only because you indexed into
that list: `message.content[0].text` is the first block's text, not the message.
The two directions are not symmetrical: a request accepts either form, a plain
string or a list of blocks.

| Block type | Direction | Carries |
|---|---|---|
| `text` | both ways | Prose, for the user to read |
| `tool_use` | from the assistant | The tool name and the arguments the model chose |
| `tool_result` | from you, in a `user` message | The output of the tool you ran |

A single assistant reply routinely holds several blocks at once — a text block
explaining what it is about to do, plus a `tool_use` block requesting it. A
`tool_result` block carries three fields: `tool_use_id`, matching the id of the
`tool_use` block it answers; `content`, the function output serialized as a
string; and `is_error`, a boolean. It travels back inside a `user` message,
alongside the complete history.

```json
{ "role": "assistant", "content": [
    { "type": "text", "text": "Let me look that order up." },
    { "type": "tool_use", "id": "toolu_01X", "name": "lookup_order",
      "input": { "order_id": "ORD-67890" } }
]},
{ "role": "user", "content": [
    { "type": "tool_result", "tool_use_id": "toolu_01X",
      "content": "{ \"status\": \"shipped\", \"total\": 42.90 }",
      "is_error": false }
]}
```

Between those two messages, **your code** ran `lookup_order`. The model never
executes anything; it emits a structured request and waits.

::: anti-pattern
Appending only the text you displayed and dropping the `tool_use` block. The
pairing with `tool_result` is what the next request depends on, so the history
becomes unanswerable. Append **all** of `response.content`, and keep the
original tool schemas on the follow-up request even when no further call is
expected.
:::

A tool is declared as a JSON schema with three parts: `name`, `description` —
what the tool does, when to use it, what it returns — and `input_schema` for the
arguments. That is the anatomy, and it stops there. **Which wording makes the
model pick the right tool among several similar ones is tool design, developed
in D2.1**; **using a schema to force a conforming payload is structured output,
developed in D4.3.**

**To test** — bank questions tagged `data-task="2.1"`.

## `stop_reason`
<!-- src:05claudeapi L3, L38 ; Anthropic docs, Stop reasons and fallback (seven values, stop_details null except refusal, pause_turn default limit of 10 iterations, model_context_window_exceeded beta header) ; exam guide TS 1.1 -->
<!-- owns:stop-reason -->

When the model stops, the response says why in `stop_reason` — and that field,
not the presence of a text block, is what tells you whether a reply is finished.

| Value | What ended generation |
|---|---|
| `end_turn` | The model reached a natural end and had nothing more to say |
| `max_tokens` | The output budget you set ran out mid-generation |
| `stop_sequence` | One of your `stop_sequences` strings appeared |
| `tool_use` | The model is calling one of your tools and is waiting for you to run it |
| `pause_turn` | A server-tool loop hit its iteration limit, 10 per request by default |
| `refusal` | The model declined for safety-policy reasons |
| `model_context_window_exceeded` | The response filled the model's context window |

`stop_details` is `null` for every value but `refusal`, where it carries the
policy category. `model_context_window_exceeded` is the recent one: Sonnet 4.5
and newer models return it without a beta header, and earlier models need the
`model-context-window-exceeded-2025-08-26` header to enable it.

```json
{
  "id": "msg_01ABC",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Let me look that order up." },
    { "type": "tool_use", "id": "toolu_01X", "name": "lookup_order",
      "input": { "order_id": "ORD-67890" } }
  ],
  "stop_reason": "tool_use",
  "stop_details": null
}
```

That response carries text *and* a tool request — which is exactly why the
presence of text cannot serve as a completion signal.

::: exam-tip
`end_turn` is the only value that means *complete*. A response with
`stop_reason: "max_tokens"` holds a text block like any other, but it was cut
off mid-sentence — display code that checks for text instead of checking
`stop_reason` will present a truncated draft as a finished one. That is the
classic distractor on this field.
:::

Two values are worth telling apart even though only one pair is tested. A reply
waiting on **your** tool always says `tool_use`, and you continue it by sending
`tool_result` blocks. `pause_turn` concerns a **server** tool that ran out of
iterations, and you continue it by sending the assistant content back unchanged.

The guide only ever asks you to tell `tool_use` from `end_turn` — that pair
drives the loop, and it is all TS 1.1 tests. **Turning the check into a loop —
call, inspect `stop_reason`, execute, append, call again — is the agentic loop,
developed in D1.1.** D0 stops at naming the signal.

**To test** — bank questions tagged `data-task="1.1"`.

## System prompts
<!-- src:05claudeapi L8 ; exam guide appendix (Claude API — system prompts), TS 2.1 -->

The `system` parameter is a plain string passed alongside `messages`, and it
sits **outside** the conversation: it is not a turn, it has no role, and it is
not something the model answers. It shapes *how* Claude responds, not *what* it
responds.

Take a maths tutor. Without a system prompt, "How do I solve 5x + 2 = 3 for x?"
gets a complete step-by-step solution immediately — correct, and useless for
teaching. With:

```
You are a patient math tutor.
Do not directly answer a student's questions.
Guide them to a solution step by step.
```

the same question comes back as "What do you think would be a good first step to
isolate x?". Same model, same user turn; the standing instruction changed the
behaviour.

That is what a system prompt is for: assign a role, and the model answers the
way someone in that role would; state durable constraints, and they hold across
every turn without being restated. They hold because you resend them every
request, not because the API remembers them — and you pay for them every time.

::: anti-pattern
Putting the system prompt in as the first `user` message. It then reads as
conversational context rather than a standing instruction, and it competes with
the turns around it instead of sitting above them.
:::

::: exam-tip
A system instruction carries further than any per-turn wording — far enough that
a single absolute keyword can override tool descriptions that are otherwise
well written. "Always verify the customer's identity" will drag the
nearest-matching tool onto every turn. **How that overriding works, and how to
word around it, is developed in D2.1.**
:::

One practical note: the API does not accept `system=None`, so a reusable chat
helper has to add the key only when a prompt was actually given.

**To test** — bank questions tagged `data-task="2.1"`.

## The context window
<!-- src:05claudeapi L6, L36 ; exam guide appendix (Context window management), TS 5.1 -->
<!-- owns:context-window -->

Put the two previous facts together. The API keeps no state, so every request
ships the entire history; and every request has a finite token budget. The
history is therefore not free — it is a recurring cost that grows with the
conversation, monotonically, unless you do something about it.

What accumulates, per request:

| What you resend | Why it is there |
|---|---|
| The `system` prompt | It holds across turns because you resend it, not because it is stored |
| Every past `user` and `assistant` turn | Nothing is stored server-side |
| Every `tool_use` and `tool_result` block | Dropping them breaks the pairing |
| The full tool schemas | Required on every request, even when no call follows |

Tool results are the part people underestimate. A tool that returns a large
record puts that record into the history for the rest of the run, and you pay
for it on every subsequent turn — not once.

```
lookup_order → 42 fields returned, 5 useful for return eligibility
  order_id, status, total, items, return_eligible          ← useful
  warehouse_route, carrier_scac, pick_wave, audit_flags,
  promo_ledger, tax_jurisdiction, … (37 more)              ← dead weight here

3 orders looked up = 126 fields resent on every later turn, 15 of them earning it.
```

The guide names three failure modes of a full window, and D0 goes exactly as far
as naming them: **lost-in-the-middle**, where material buried in the middle of a
long context is missed while the start and the end are read reliably;
**accumulation**, the growth shown above; and **progressive summarization**,
where compressing the history to make room trades away the numbers, dates and
specifics first.

::: exam-tip
Recognize the three failure modes here; the fixes are not D0's. **Trimming
verbose tool outputs, extracting structured facts, and ordering input by
position are developed in D5.1.** Retrieval and chunking are not the answer the
guide asks for — it puts them out of scope, and so does this corpus.
:::

**To test** — bank questions tagged `data-task="5.1"`.
