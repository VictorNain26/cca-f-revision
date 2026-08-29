# D0 — API foundations

<!-- src:05claudeapi L2-14 and L30-42, building_claude_api module 1 -->

These are the prerequisites the exam guide assumes you already have. Nothing
here is a task statement of its own: the guide tests what you *build* on top of
this. Read it once, then move to D1.

Each section stops where a task statement starts. Where a notion belongs to
another domain, you get one sentence of definition and a pointer, never a bare
link.

## Anatomy of a Messages API request
<!-- src:05claudeapi L3, L5, L8, L10 ; building_claude_api module 1 -->
<!-- owns:messages-api -->

A request goes out from your own server, never from the browser or the mobile
app. The API key authenticates the request; a key shipped in client code can be
extracted by anyone and used to make requests on your account. So the client
talks to your server, and your server talks to the Anthropic API with the key
kept on the server side.

The full round trip has five steps: client to your server, your server to the
Anthropic API, model processing, response back to your server, response back to
the client. Your server can call the API through an official SDK — Python,
TypeScript, JavaScript, Go, Ruby — or over plain HTTP.

The call itself is `client.messages.create()`, and it carries these fields:

| Field | Required | What it does |
|---|---|---|
| `model` | yes | Which Claude model answers the request |
| `messages` | yes | The conversation history you are sending, oldest first |
| `max_tokens` | yes | Ceiling on how many tokens the response may contain |
| `system` | no | Instructions that sit outside the conversation |
| `temperature` | no | How much randomness enters token selection, from 0 to 1 |

Two of these are read wrong often enough to be worth stating plainly.

`max_tokens` is a safety limit, not a target. Set it to 1000 and Claude stops
after 1000 tokens even if it had more to say; it never tries to reach the
number. It bounds the output, not the request you send.

`temperature` moves probability mass between candidate tokens. Near 0 the model
is close to deterministic and almost always takes the highest-probability
token; near 1 the probabilities spread out and the output varies more. The
course groups the useful ranges as: 0.0–0.3 for factual answers, coding help,
data extraction and moderation; 0.4–0.7 for summarization, teaching material
and problem-solving; 0.8–1.0 for brainstorming, creative writing and marketing
copy. Temperature changes probabilities — it does not guarantee that two calls
differ.

Between the request and the response, the model runs four internal stages:
**tokenization** (the input is cut into tokens — words, word pieces, symbols),
**embedding** (each token becomes a list of numbers covering that token's
possible meanings), **contextualization** (each embedding is adjusted by its
neighbours so the right meaning wins) and **generation** (an output layer scores
each possible next token, one is sampled from probability plus controlled
randomness, and the whole process repeats for the token after it).

The response object carries the generated message, a `usage` count of input and
output tokens, and a `stop_reason`.

**To test** — the self-assessment questions of `D0_API_Fundamentals.html`.

## Roles and the shape of a turn
<!-- src:05claudeapi L5, L6 ; building_claude_api module 1 -->
<!-- owns:message-roles -->

`messages` is a list of dictionaries, each with a `role` and a `content`. There
are two roles:

| Role | Who writes it |
|---|---|
| `user` | You — what you send to Claude |
| `assistant` | Claude — what it generated, or what you prefill on its behalf |

A conversation alternates between the two: user turn, assistant turn, user turn.

**The API stores nothing.** Every request is independent and carries no memory
of the ones before it. Ask "What is quantum computing?", get an answer, then
send "Write another sentence" on its own, and the model has no idea what it is
being asked to extend — it will write a sentence about something else entirely.

Multi-turn conversation is therefore work you do, not a service the API renders:

1. Send the first user message.
2. Append Claude's reply to your list as an `assistant` message.
3. Append the follow-up as a `user` message.
4. Send the whole list again.

Everything that must still be visible on turn five has to be in the array you
send on turn five. This is the rule behind most "the model forgot" bugs, and it
applies to tool results exactly as it applies to text.

Assistant messages are not only Claude's output. You can append one yourself to
prefill the start of the reply: the model treats that text as something it
already wrote and continues from the last character. The prefix is yours, not
the model's: the API returns only what came after it, so a prefilled turn has to
be concatenated back onto the generated text to be complete. Combined with
`stop_sequences` — strings that end generation as soon as they appear, and that
are not included in the output — prefilling gives clean structured output. Ask
for JSON, prefill the assistant turn with an opening JSON code fence and set the
closing fence as the stop sequence: what comes back is the JSON alone, with no
preamble and no fences to strip.

**To test** — bank questions tagged `data-task="1.3"`.

## Content blocks
<!-- src:05claudeapi L5, L12, L34, L35, L36, L37 ; building_claude_api module 3 -->
<!-- owns:content-blocks -->

A reply's `content` is never a bare string — it is a **list of blocks**, each
with its own type. Reading a reply as text works only because you indexed into
that list: `message.content[0].text` is the first block's text, not the message.
The two directions are not symmetrical: a request accepts either form, a plain
string or a list of blocks, and every example in the source course sends a
string.

| Block type | Direction | Carries |
|---|---|---|
| `text` | both ways | Prose, for the user to read |
| `tool_use` | from the assistant | The tool name and the arguments the model chose |
| `tool_result` | from you, in a `user` message | The output of the tool you ran |

A single assistant reply routinely holds several blocks at once — a text block
explaining what it is about to do, plus a `tool_use` block requesting it. This
is why the rule for tool-using conversations is to append **all** of
`response.content` to the history, not just the text you displayed: dropping
the `tool_use` block breaks the pairing that the next request depends on.

A `tool_result` block carries three fields: `tool_use_id`, matching the id of
the `tool_use` block it answers; `content`, the function output serialized as a
string; and `is_error`, a boolean. It travels back inside a `user` message,
alongside the complete history — and the original tool schemas must still be
declared on that request, even if no further tool call is expected.

The tools themselves are declared as JSON schemas, one per tool, with three
parts: `name`, the identifier; `description`, what the tool does, when to use it
and what it returns; and `input_schema`, a JSON schema for the arguments. That
is the anatomy. **Which wording in a description makes the model pick the right
tool among several similar ones is tool design, developed in D2.1** — a
one-line description is what makes two neighbouring tools indistinguishable.

One field is worth naming here because it appears in request bodies you will
read: `tool_choice` tells the model whether it may answer in prose or must call
a tool. **Its modes and what each one forbids are developed in D4.3.**

**To test** — bank questions tagged `data-task="2.1"`.

## `stop_reason`
<!-- src:05claudeapi L3, L13, L38 (tool_use) ; building_claude_api modules 1 and 3 ; Anthropic docs, Handling stop reasons (values, stop_details, pause_turn default iteration limit of 10) ; exam guide TS 1.1 -->
<!-- owns:stop-reason -->

After each token, the model checks whether it should keep going. When it stops,
the response says why in `stop_reason` — and that field, not the presence of a
text block, is what tells you whether a reply is finished.

| Value | What ended generation |
|---|---|
| `end_turn` | The model reached a natural end and had nothing more to say |
| `max_tokens` | The output budget you set ran out mid-generation |
| `stop_sequence` | One of your `stop_sequences` strings appeared |
| `tool_use` | The model is calling a tool and is waiting for you to run it |
| `pause_turn` | A server tool loop hit its iteration limit (10 by default) |
| `refusal` | The model declined for safety-policy reasons |
| `model_context_window_exceeded` | The response filled the context window |

`stop_details` is `null` for every value but `refusal`, where it carries the
policy category. `model_context_window_exceeded` is the recent one: it exists on
Claude 4.5 and later, where earlier models returned a validation error instead,
and the behaviour is opt-in through the `model-context-window-exceeded-2025-08-26`
beta.

The distinction that matters in production: `end_turn` is the only value that
means *complete*. A response with `stop_reason: "max_tokens"` holds a text block
like any other, but it was cut off mid-sentence — display code that checks for
text instead of checking `stop_reason` will present a truncated draft as a
finished one.

`tool_use` is the value a client acts on rather than displays: the model has
asked for something, and the turn is not over until you run the tool and send
the result back. **Turning that check into a loop — call, inspect `stop_reason`,
execute, append, call again until the value is no longer `tool_use` — is the
agentic loop, developed in D1.1.** D0 stops at naming the signal.

Where to put your effort: the guide only ever asks you to tell `"tool_use"`
from `"end_turn"` — that pair is what drives the loop, and it is all TS 1.1
tests. The other five are context worth having rather than exam surface, with
one exception: `max_tokens` is a classic distractor, because a truncated reply
looks exactly like a finished one until you read the field.

**To test** — the self-assessment questions of `D0_API_Fundamentals.html`.

## System prompts
<!-- src:05claudeapi L8 ; building_claude_api module 1 -->

The `system` parameter is a plain string passed alongside `messages`, and it
sits **outside** the conversation: it is not a turn, it has no role, and it is
not something the model answers. It shapes *how* Claude responds, not *what*
it responds.

Take a maths tutor. Without a system prompt, "How do I solve 5x + 2 = 3 for x?"
gets a complete step-by-step solution immediately — correct, and useless for
teaching. With:

```
You are a patient math tutor.
Do not directly answer a student's questions.
Guide them to a solution step by step.
```

the same question comes back as "What do you think would be a good first step
to isolate x?". Same model, same user turn; the standing instruction changed the
behaviour.

That is what a system prompt is for: assign a role, and the model answers the
way someone in that role would; state durable constraints, and they hold across
every turn without being restated in each user turn. It is also what keeps a
long conversation on task.

One practical note: the API does not accept `system=None`, so a reusable chat
helper has to add the key only when a prompt was actually given.

A system instruction also carries further than any per-turn wording — far
enough that a single keyword can steer the model against more specific
instructions it was given elsewhere. **How system prompt wording ends up
overriding well-written tool descriptions is developed in D2.1.**

**To test** — the self-assessment questions of `D0_API_Fundamentals.html`.

## The context window
<!-- src:05claudeapi L6 ; building_claude_api modules 3 and 4 -->
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
document puts that document into the history for the rest of the run, and you
pay for it on every subsequent turn — not once.

Sending a large document directly is the simplest approach and it is sometimes
the right one: no preprocessing, nothing to build. Its costs are a hard token
limit, a high price per call and slow processing. Beyond a certain size, you
stop sending the document and start sending only the parts that matter.

A full window brings its own failure modes — material buried mid-context tends
to be missed, history accumulates until it crowds out the task, and summarizing
it trades detail for room. **Naming those failure modes is as far as D0 goes:
handling them, and keeping a long run inside its budget, is developed in D5.1.**
Retrieval and chunking are not the answer the guide asks for — it puts them out
of scope, and so does this corpus. The point here is only that the window is
finite, that the history is what fills it, and that both are consequences of
statelessness.

**To test** — the self-assessment questions of `D0_API_Fundamentals.html`.

## Choosing a model
<!-- src:building_claude_api module 1 -->

Three families, three trade-offs:

| Family | Strengths | Costs |
|---|---|---|
| Opus | The most intelligent: deep reasoning, multi-step planning | High price, high latency |
| Sonnet | Balanced: good intelligence, decent speed, solid at coding | Reasonable on all three |
| Haiku | Fastest and cheapest: real-time interaction, high-volume processing | No advanced reasoning |

The selection rule is stated as a priority, not as a ranking:

- intelligence is the priority → **Opus**
- speed is the priority → **Haiku**
- balanced requirements → **Sonnet**

Sonnet is the best choice for most practical cases. And the choice is per task,
not per application: real applications routinely use several models, routing
each job to the family its priority calls for.

**To test** — nothing yet: no question in the corpus covers model selection.
