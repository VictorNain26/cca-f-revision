# D3 — Claude Code configuration and workflows (20 %)

<!-- src:exam guide domain 3 (the six task statements) ; exam guide TS 5.4 (/compact listed among its skills, which is where this course points for it) ; 01claudecodeinaction L1-L3, L6-L8 ; 04agentskills L1-L6 ; 06claudecode101 L4-L9, L12 ; code.claude.com/docs (memory, skills, sub-agents, headless, cli-reference) for the facts no lesson carries -->

Twenty per cent of the score, six task statements, and a subject that looks
deceptively soft: files in a repository. One section per task statement, in the
guide's own order and under the guide's own wording, so that a question spotted
on exam day maps to a section here without translation.

<!-- cross-refs:start -->

D0 and D1 are assumed. D1 taught the machinery *inside* an agent: the loop,
subagents, hooks as SDK callbacks, sessions. D3 is the layer above it: the files
and flags that configure a running Claude Code, and the working habits that
decide whether a session goes well.

The guide places neighbouring notions elsewhere, and this course honours that.
The hook mechanism — events, `permissionDecision`, `updatedInput` — is tested in
TS 1.5; subagent context isolation in TS 1.2 and 1.3; sessions, `--resume` and
`fork_session` in TS 1.7; the context window in D0, and its management in D5 —
`/compact` included, which the guide lists among the skills of TS 5.4, so the
pointer is **D5.4**. Each of those gets a sentence and a pointer here, never a
second development. What D1 explicitly deferred to this course — subagent
definitions under `.claude/agents/`, and hooks as a *place to put a rule* rather
than as an API — lands in 3.2.

<!-- cross-refs:end -->

## 3.1 — Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization
<!-- ts:3.1 | src:exam guide TS 3.1 (the three levels, user-level not shared by version control, @import, .claude/rules/ as the modular alternative, /memory) ; 06claudecode101 L8 (what CLAUDE.md solves, its contents are appended to the prompt, project versus user, @path references) ; 01claudecodeinaction L2 (CLAUDE.md is guidance and not enforced configuration, every line competes with every other, imports expand inline and do not reduce context, specific and checkable rules, naming the replacement, the emphasis budget, hard rules belong in a hook) ; code.claude.com/docs/en/memory (four-hop import depth, .claude/rules/ layout, what /memory lists and what /context confirms) -->
<!-- owns:claude-md -->

Open Claude Code in a repository it has never seen and it starts from nothing:
it must rediscover the build command, the test runner, where handlers live, what
was tried last month. **CLAUDE.md** is the file that stops the rediscovery. It
is Markdown, Claude Code reads it at the start of every session, and its
contents are appended to your prompt.

Which file, though. The guide tests three levels, and they differ on exactly one
axis: **who receives them**.

| Level | Location | Shared with |
|---|---|---|
| User | `~/.claude/CLAUDE.md` | Just you, across all your projects — **never** travels through version control |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | The whole team, through the repository |
| Directory | `CLAUDE.md` in a subdirectory | The whole team; loaded when Claude works in that subdirectory |

That third column is the entire task statement. A user-level file lives in a
home directory. Committing the repository does not carry it; cloning the
repository does not produce it. It reaches a second machine only if something
copies it there.

::: exam-tip
The signature of a hierarchy fault is **"it works for everyone except the newest
person"**, or except the machine rebuilt from an image, or except CI. An
instruction the veterans apply and the last arrival never received is sitting at
user level. The fix is to move it to the project level and commit it.

The distractors name real things and explain nothing. A different Claude Code
version would not remove one targeted instruction. A CLAUDE.md that has grown
too long degrades adherence *for the whole team*, not for one workstation. Having
everyone copy the file by hand reproduces manually what committing already does,
and diverges again at the first edit.
:::

### Keeping the file modular

Two mechanisms, and the guide names both.

**`@import`.** A path preceded by `@`, anywhere in the file, pulls another file
in. Relative paths resolve against the file containing the import, not the
working directory, and imports may nest to a maximum depth of four hops.

```markdown
# packages/api/CLAUDE.md

This package owns the public REST surface.

@../../standards/http-errors.md
@../../standards/database-migrations.md
```

This is the guide's own skill: a monorepo maintainer imports into each package's
CLAUDE.md the standards that package actually needs, instead of loading every
standard everywhere.

**`.claude/rules/`.** Instead of one growing file, one file per topic:

```text
.claude/
├── CLAUDE.md            # what is true of the whole project
└── rules/
    ├── testing.md
    ├── api-conventions.md
    └── deployment.md
```

Rules without path scoping load at launch, with the same standing as
`.claude/CLAUDE.md`. Adding a `paths` field to a rule makes it conditional. That
is TS 3.3, below, and it is the only thing that actually shrinks what gets
loaded.

::: anti-pattern
**Reaching for `@import` to reduce context.** Imported files are expanded inline
at launch, right where you referenced them. Imports buy you *organization*, not
a smaller context: every byte still loads. A question that asks how to stop
irrelevant conventions from consuming the window is asking for path-scoped rules
(3.3), and `@import` is the distractor placed next to them.
:::

### Why the file stops working

CLAUDE.md is **guidance, not enforced configuration**. Every line competes with
every other line for attention, so the longer the file grows the less reliably
any single rule is followed. That is not a defect to work around; it is the
property that dictates how you write.

Three habits follow from it, and they are worth knowing because they are also
the shape of the wrong answers:

- **Specific and checkable.** "Put new API routes in `src/api/handlers`, one per
  file", not "follow best practices for API routes". If you cannot verify
  whether a rule was followed, neither can Claude.
- **Name the replacement.** "Use named exports, not default exports" closes the
  question; "don't use default exports" leaves it open.
- **Emphasis is a budget.** `IMPORTANT` and `YOU MUST` raise a rule's priority
  only relative to the quieter rules around them. If every line shouts, none does.

And the rule that does not belong in the file at all: anything that must *never*
happen. "Never push to `main`" written in CLAUDE.md is a hope. A hook is code
that runs at a fixed point and can refuse the action. The mechanism is D1's
TS 1.5; where a given rule belongs is 3.2, below.

::: key-concept
`/memory` is the diagnostic command of this task statement: it lists your memory
file locations across user and project scope and lets you open them, which is
how you check whether the instruction you are looking for is where you think it
is.

**The guide is the law here.** Its skill reads "using the `/memory` command to
verify which memory files are loaded and diagnose inconsistent behavior across
sessions", and the answer is `/memory`. Field nuance, so you are not surprised
at a terminal: the current documentation splits the job, with `/memory` listing
and opening the files and `/context` reporting which ones actually loaded into
the running session.
:::

**To test** — bank questions tagged `data-task="3.1"`.

## 3.2 — Create and configure custom slash commands and skills
<!-- ts:3.2 | src:exam guide TS 3.2 (project versus user scope for commands, SKILL.md frontmatter with context: fork, allowed-tools and argument-hint, personal variants under a different name, choosing skills against CLAUDE.md) ; 04agentskills L1 (a skill is a folder with SKILL.md, the description drives matching, personal versus project locations, load-on-demand against CLAUDE.md and slash commands), L2 (only names and descriptions load at startup, the Enterprise > Personal > Project > Plugins priority), L3 (required and optional frontmatter fields, allowed-tools, progressive disclosure, scripts run without being read), L4 (skills against CLAUDE.md, subagents, hooks and MCP), L5 (project skills shared through git, the subagent skills field, built-in agents cannot reach skills), L6 (a shadowed personal skill, rename as the usual fix) ; 01claudecodeinaction L3 (the verification skill, a skill folder carries reference files and scripts, which instruction surface owns which rule), L5 (exit 2 is the blocking code and stderr goes back to Claude as context; exit 1 feels like an error and does not block), L8 (a stop hook exiting 2 feeds the failure straight back to Claude) ; 06claudecode101 L9 (/agents and subagent definition files), L12 (a Claude Code hook is declared in settings and receives the tool name and input as JSON on stdin; exit 0 proceeds, exit 2 blocks and feeds stderr back, any other code blocks nothing) ; code.claude.com/docs/en/skills (context: fork, argument-hint, allowed-tools as pre-approval, .claude/commands/) -->
<!-- owns:skills -->

When you have typed the same multi-step instruction twice, it should stop being
something you type. The guide keeps two mechanisms for that, and treats them as
distinct.

| | Slash command | Skill |
|---|---|---|
| Lives in | `.claude/commands/review.md` | `.claude/skills/review/SKILL.md` |
| Invoked | Explicitly, `/review` | Explicitly, or automatically when Claude matches your request to its `description` |
| Carries | A prompt | A folder: instructions, reference files, scripts |
| Configurable | — | Frontmatter: `context`, `allowed-tools`, `argument-hint`, and more |

Both come in two scopes, and the split is the same one as 3.1:

| Scope | Commands | Skills | Shared with |
|---|---|---|---|
| Project | `.claude/commands/` | `.claude/skills/` | The team, through version control |
| Personal | `~/.claude/commands/` | `~/.claude/skills/` | Just you |

::: exam-tip
As soon as the scenario says a command must be available to everyone after a
clone, the guide's answer is `.claude/commands/`. Three wrong answers are
available to be offered: `~/.claude/commands/`, which produces a working command
that no colleague ever sees; CLAUDE.md, which carries standing instructions and
not invocable definitions; and a `commands` array declared in some
`.claude/config.json`, which sounds like tool configuration and names nothing
that exists.
:::

### The frontmatter the guide tests

A skill is a directory holding a `SKILL.md`: YAML frontmatter, then the
procedure.

```markdown
---
name: dependency-audit
description: Audits third-party dependencies for unused, outdated and duplicated
  packages. Use when reviewing dependencies or before a release.
context: fork
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[package-manager] — npm, pnpm or cargo"
---

1. Read the lockfile and list every direct dependency.
2. Grep the source for each one and flag those with no import.
3. Report unused, outdated and duplicated packages in three tables.
```

The `description` is the field everything hinges on: Claude loads only names and
descriptions at startup and matches your request against them semantically. A
skill that never fires almost always has a description that does not overlap the
way you actually phrase requests.

Three optional fields carry the task statement.

**`context: fork`** runs the skill in an isolated subagent context. The skill's
own content becomes the prompt driving that subagent; it does not inherit your
conversation, and what comes back to the main session is the result rather than
the whole trace. That is the answer whenever a skill's *output volume* is the
problem: codebase-wide analysis that prints every path it inspected,
brainstorming that explores five options you did not keep.

**`allowed-tools`** restricts tool access during skill execution, for example
limiting a skill to file-write operations so it cannot do anything destructive.
That is the guide's wording and the one to answer with. Field nuance, for your
own machine: the current documentation describes the field as *pre-approving*
the listed tools for the invoking turn, so Claude may use them without asking,
rather than removing the others; the field that actually removes a tool from the
pool is `disallowed-tools`.

**`argument-hint`** is the hint shown at autocomplete time, so a developer who
invokes the skill without arguments is told which parameter it expects.

::: exam-tip
A skill runs, produces a wall of output, and the session that follows has
visibly lost the thread. The answer is `context: fork`. Two neighbouring options
are plausible and neither moves the output. `allowed-tools` changes what the
skill may *do*, not where what it writes lands. And a "be concise" line added to
the skill body asks the model to write less rather than to write elsewhere.
Reduced or not, the output still arrives in the main session.
:::

### Personal variants, and why the name matters

Skills with the same name are resolved by source, and a personal skill wins over
a project skill. Clone a repository that ships `.claude/skills/review/`, keep
your own `~/.claude/skills/review/`, and `/review` runs yours, silently, on your
machine only.

::: key-concept
The guide's instruction is to give a personal variant **a different name**:
`~/.claude/skills/review-strict/` rather than a second `review`. Reusing the
team's name does not modify their configuration, but it does mean you and your
colleagues run different procedures under one command and nothing in either
setup says so. Renaming is also the usual fix when a skill of yours is being
shadowed and you cannot work out why it never fires.
:::

### Which surface owns which rule

The guide's last skill on this task statement is choosing between a skill and
CLAUDE.md. The full picture is worth holding, because the wrong answers on this
topic are always *another real mechanism*:

| Surface | Loads | Fires on | Use it for |
|---|---|---|---|
| CLAUDE.md | Every session, always | Nothing — it is simply present | Universal standards: naming, layout, "always do X" |
| Skill | On demand | Explicit `/name`, or a semantic match on its description | Task-specific procedures and reference material |
| Slash command | On invocation | Explicit `/name` | A repeatable prompt |
| Hook | — | A lifecycle event | A rule Claude must not be able to skip |
| Subagent | On delegation | An explicit hand-off | Work you want done in an isolated context |

The line between the first two is the guide's: **always-loaded universal
standards versus on-demand task-specific workflows**. Detailed procedures placed
in CLAUDE.md pay their token cost in every conversation, including the ones they
have nothing to do with.

The line to the hook is different in kind. CLAUDE.md and skills are instructions
Claude follows; a hook is code that runs. If skipping the rule is unacceptable,
it does not belong to instruction-following at all.

The events, and `PreToolUse` as the enforcement primitive, are D1's TS 1.5 and
are not re-taught here. What differs on this side of the line is *how a hook
says no*. A Claude Code hook is a command declared in settings, so it answers
with an **exit code**: `2` blocks, and what it wrote on standard error is fed
back to Claude as the reason. An Agent SDK hook is a callback in your process
and answers with a JSON `permissionDecision`. Same event, same intent, two
conventions. And `exit 1` is the trap on the Claude Code side: it looks like
failure and blocks nothing.

```bash
# .claude/hooks/protect-main.sh — refuse a push to main, every time.
# A PreToolUse hook receives the tool name and its input as JSON on stdin.
if grep -qE 'git +push.*\bmain\b'; then
  echo "Pushing to main is not allowed; open a pull request instead." >&2
  exit 2          # 2 blocks and explains. 0 allows. 1 does neither.
fi
```

Subagents are the other neighbour. They are defined as Markdown files with YAML
frontmatter under `.claude/agents/`, and `/agents` creates one interactively.
Two facts belong to this task statement rather than to D1: a subagent does not
inherit your skills, and a custom subagent loads only the skills its `skills`
frontmatter field names.

```markdown
---
name: accessibility-reviewer
description: Reviews frontend changes for accessibility regressions.
tools: Read, Grep, Glob
skills: accessibility-audit, contrast-check
---

Review the diff for WCAG violations. Report findings; never edit files.
```

The rest — why a subagent's isolated context is the point, and what must travel
in the prompt because of it — is D1's TS 1.2 and 1.3.

::: anti-pattern
**Putting a long procedure in CLAUDE.md so it is "always available".** It is
always *loaded*, which is not the same benefit and is a permanent cost. A PR
review checklist has no business in context while you are debugging.

**Reaching for a hook to package a workflow.** A hook reacts to a tool event; it
is not something a developer chooses to run. If the scenario says a person
invokes the thing, a hook is not the answer.
:::

**To test** — bank questions tagged `data-task="3.2"`.

## 3.3 — Apply path-specific rules for conditional convention loading
<!-- ts:3.3 | src:exam guide TS 3.3 (rules files with a YAML paths field of glob patterns, loading only when editing matching files to cut irrelevant context and tokens, the advantage of globs over directory-level CLAUDE.md for conventions spanning several directories, the paths: ["terraform/**/*"] and **/*.test.tsx examples) ; code.claude.com/docs/en/memory#path-specific-rules (the paths frontmatter, the glob table, rules without paths loading unconditionally, the read-time trigger, ~/.claude/rules/) -->

Splitting CLAUDE.md into `.claude/rules/` files makes the instructions
maintainable, and loads exactly as many tokens as before: that is the
problem 3.1 left open. Adding a `paths` field to a rule is what makes the
loading conditional.

```markdown
---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Test conventions

- One `describe` per exported symbol, `it` sentences in the present tense.
- Build fixtures with the factories in `test/factories`; never inline literals.
- Never mock the database — use the test database from `test/db.ts`.
```

`paths` takes a list of glob patterns. The rule's body enters context only when
Claude is working with a file that matches one of them; the rest of the time it
costs nothing. A rule file with no `paths` field loads unconditionally, like the
project CLAUDE.md.

The globs are ordinary:

| Pattern | Matches |
|---|---|
| `**/*.ts` | Every TypeScript file, any directory |
| `src/**/*` | Everything under `src/` |
| `*.md` | Markdown files at the project root only |
| `terraform/**/*` | Everything under `terraform/` |

### Why not a CLAUDE.md in the subdirectory

Both mechanisms scope instructions. They scope them by different things, and the
guide tests the difference.

A subdirectory CLAUDE.md is attached to a **place**. It is the right answer when
the convention really is local: everything under `terraform/` obeys these tagging
rules, and nothing outside does.

A path-scoped rule is attached to a **pattern**. It is the right answer when the
files sharing a convention do not share a directory. The canonical case is test
files, colocated with the code they cover and therefore scattered through the
whole tree. Writing a CLAUDE.md in each of forty directories to say the same
three things about tests is unmaintainable, and a single root CLAUDE.md saying
them costs every session that never opens a test.

::: exam-tip
Read the scenario for one word: **where do the files live?**

"Test files colocated throughout the codebase", "Terraform files under
`infra/<product>/` in a dozen folders", "migration scripts spread across
services" → path-scoped rule with a glob. "Everything in this one package" →
a directory CLAUDE.md is defensible.

Three wrong answers are available here. A CLAUDE.md per subdirectory, seductive
because it sounds more local, but bound to the folder and unable to follow a
file type. Consolidating into the root CLAUDE.md under section headings, which
replaces an
explicit match with the model's inference and loads everything anyway. And a
skill per file type, which fails on the word *automatically* in the scenario:
a skill is invoked or matched against a request, not against the file being
edited.
:::

::: key-concept
**The guide is the law here.** It writes that path-scoped rules load "when
editing matching files". If an option turns on the word *editing*, that is the
one. Field nuance, for your own machine: the current documentation says
path-scoped rules trigger when Claude *reads* a file matching the pattern, so in
practice the rule is already in context before your first edit. Same mechanism,
same `paths`, same globs; only the trigger differs.
:::

::: anti-pattern
**Using path scoping to enforce something.** A rule that loads is still a rule
Claude reads, with the adherence properties of any instruction. "Every Terraform
resource must carry a `cost_center` tag" as a path-scoped rule shapes the
writing; it does not guarantee the outcome. If the requirement is a gate, it is
a hook or a CI check. The two are complements, not alternatives: the rule gets
it right most of the time, the gate catches the rest.
:::

**To test** — bank questions tagged `data-task="3.3"`.

## 3.4 — Determine when to use plan mode vs direct execution
<!-- ts:3.4 | src:exam guide TS 3.4 (plan mode for large-scale changes, several valid approaches, architectural decisions and multi-file modifications; direct execution for simple well-scoped changes; plan mode as safe exploration before committing; the Explore subagent for verbose discovery; the microservice, 45-file migration and integration-choice examples against the single-file stack trace and the date validation; combining planning with direct execution) ; 06claudecode101 L4 (plan mode uses read-only tools, analyses the codebase, asks clarifying questions and returns a plan), L5 (explore → plan → code → commit, plan mode is where course-correction is cheap, the explore subagent can run outside plan mode), L6 (subagents run in a separate context window and return only a summary), L9 (subagent isolation and the returned summary) ; 01claudecodeinaction L1 (scope the work before Claude starts, read the plan rather than skim it, iterating on a plan beats cleaning up after a run), L4 (plan is a permission mode: reads only, proposes without editing) ; code.claude.com/docs/en/permission-modes (entering plan mode with Shift+Tab, prefixing a single prompt with /plan, or --permission-mode plan from the CLI) ; code.claude.com/docs/en/sub-agents (Explore is read-only, Write and Edit denied) -->
<!-- owns:plan-mode -->

**Plan mode** is a permission mode in which Claude reads, searches and runs
read-only commands, asks its clarifying questions, and returns a plan, without
editing anything. **Direct execution** is the ordinary mode: you describe the
change and Claude makes it.

```bash
# Enter it for a whole session…
claude --permission-mode plan "Restructure the billing monolith into services"

# …or press Shift+Tab to cycle into it mid-session, /plan for a single prompt.
```

The choice is not about caution, it is about **where the decisions are**.

| The scenario says | Mode | Because |
|---|---|---|
| "Dozens of files", "45+ files" | Plan | The blast radius has to be mapped before it is created |
| "Several valid approaches", "different infrastructure requirements" | Plan | Something must be chosen, and choosing after writing means rewriting |
| "Service boundaries", "restructuring" | Plan | Architectural decisions propagate |
| "A clear stack trace", "one function" | Direct | The scope is already established |
| "Add a date validation check" | Direct | Understood change, nothing to arbitrate |

Plan mode earns its keep for one reason: iterating on a plan is far cheaper than
letting a run happen and cleaning up after it. The place to course-correct is
before a line is written. And when the plan comes back, read it rather than skim
it: an unread plan is an approval you did not actually give.

### The Explore subagent

A subagent runs in its own context window and returns a summary; the reads, the
searches and the dead ends stay with it. That isolation is D1's subject (TS 1.2
and 1.3). What belongs here is what the guide asks of it in this task statement.

**Explore** is the built-in read-only subagent for discovery. Claude delegates
to it to search or understand a codebase without changing it, and only its
summary reaches the main conversation. That is the answer whenever a multi-phase
task is running out of window during its *discovery* phase: the exploration cost
is paid in a context you are going to throw away, and the main window stays
available for planning and then implementing.

It is not tied to plan mode. You can ask for exploration through the subagent
outside plan mode when all you want is a summary of how something works.

::: key-concept
**Plan mode arbitrates, the Explore subagent buys context.** They answer two
different shortages and neither implies the other. Reach for plan mode when
something has to be decided before any file changes; reach for Explore when a
discovery phase is filling the window with reads you will never need again. A
scenario running out of context mid-exploration is not asking you to plan, and
a scenario with two viable architectures is not asking you to delegate.
:::

### The combination the guide asks about

Plan mode and direct execution are not a permanent allegiance. The common shape
is both, in order: plan the library migration, approve the plan, then execute it
directly. The approved plan becomes the scope of the writing phase. The
arbitration happened before any file changed.

::: exam-tip
The complexity is **stated in the scenario**; it is never something you infer.
Count the signals: multiple files, competing approaches, boundaries to draw →
plan mode. A stack trace, one file, a change everybody already understands →
direct execution.

The subtlest distractor proposes starting in direct execution and switching to
plan mode if it turns out to be complicated. It sounds prudent and it ignores
that the scenario has already established the complexity: you would be
discovering, at cost, something you were told. Two blunter ones: plan mode
everywhere on principle, which spends deliberation on a one-line fix; and giving
exhaustive instructions up front in direct execution, which assumes you know the
right structure before anyone has read the code.
:::

::: anti-pattern
**Treating plan mode as a safety feature and direct execution as the risky one.**
They answer a question about the *task*, not about your appetite for risk. When
a scenario carries two tickets, answering plan mode for both costs you the
settled one: a failing test that states the expected value has already written
down the answer that planning would go looking for.
:::

**To test** — bank questions tagged `data-task="3.4"`.

## 3.5 — Apply iterative refinement techniques for progressive improvement
<!-- ts:3.5 | src:exam guide TS 3.5 (concrete input/output examples as the most effective way to communicate an expected transformation when prose is read inconsistently, test-driven iteration, the interview pattern, one message for interacting problems versus sequential fixes for independent ones, and the associated skills: 2-3 pairs, tests covering expected behaviour, edge cases and performance before implementation, interviewing on cache invalidation and failure modes, a specific test case for a null value in a migration script) ; 06claudecode101 L5 (define an explicit success criterion, give Claude a test suite it can continuously validate against, make sure the tests are a reliable source of truth first) ; 01claudecodeinaction L8 (tests as a gate rather than a promise) -->

The four techniques in this task statement come from the guide's own list. They
answer four different failures, and the exam question is always *which failure
is this*.

### Concrete input/output examples

The failure: the same prose instruction produces a different result each run.
The remedy the guide calls most effective is not more prose. It is two or three
concrete pairs showing the transformation.

```text
Normalise these customer records.

  "Dupont,  Marie-Claire"  →  { first: "Marie-Claire", last: "Dupont" }
  "jean pierre MARTIN"     →  { first: "Jean Pierre", last: "Martin" }
  "O'Brien, Sean (Jr.)"    →  { first: "Sean", last: "O'Brien", suffix: "Jr." }
```

Three pairs settle what a paragraph of definition left open: where the comma
goes, what happens to casing, that a suffix gets its own field. An example shows
the result instead of describing it, and the boundary cases you choose to
include are the ones you were worried about.

::: exam-tip
When the scenario says a written instruction was rewritten once or twice and the
output still varies, the answer is worked examples. The distractors are all
plausible next moves and all repeat the failure. Rewriting the prose more
precisely is the approach that has already failed twice; more words on an
ambiguity do not resolve it. Asking the model to explain its interpretation
before each run turns every invocation into a negotiation instead of fixing the
specification once. Splitting the transformation into one call per field
multiplies invocations without ever defining the ambiguous term. And a validator
that rejects bad output catches one shape of error and re-runs the same
unconstrained request.
:::

### Test-driven iteration

The failure: you cannot tell whether the code is right, so neither can Claude.
Write the test suite first — expected behaviour, edge cases, performance
requirements — then have the implementation written against it, then iterate by
handing back the failures.

```bash
$ pytest tests/test_migration.py
FAILED test_null_effective_date - AssertionError: expected None, got '1970-01-01'
FAILED test_duplicate_account_ids - KeyError: 'legacy_id'
```

Two conditions make this work rather than merely feel rigorous. The tests must
be a **reliable source of truth**: a suite that passes on broken code turns
iteration into false confidence. And "done" has to be the gates having run and
been observed, not a summary that says they passed.

The guide's sharpest version of this is for edge cases. Rather than describing
the problem, supply the specific case: this input, this expected output, for
instance the null value your migration script mishandles.

### The interview pattern

The failure: the specification is incomplete and nobody knows it yet. Ask Claude
to interview you before implementing.

```text
Before implementing the cache for the pricing API, ask me whatever you need to
settle the design. Don't write code until I've answered.

  1. Invalidation by TTL, or on write events?
  2. Is stale data acceptable while the cache is unreachable?
  3. Per-tenant or global?
  4. What read volume should this hold at?
```

Its value is question 2. You had not thought about the cache being unreachable,
and you would have found out in production. Reach for it in unfamiliar domains,
where the implications are not obvious — cache invalidation strategies, failure
modes — and where several approaches are valid and the right one depends on
context you have not stated.

### One message, or one at a time

The failure: several problems at once, and the fixes fight each other.

| The problems are | Give feedback | Because |
|---|---|---|
| Interacting — fixing one changes what the others need | **All in one detailed message** | The model has to see the interaction to reconcile it; fixing them one at a time means re-doing the first fix |
| Independent — each stands alone | **Sequentially** | You validate each step, and nothing you approve gets undone by the next round |

Error handling that is missing *and* input validation that is wrong are one
message: a unified answer has to place them together. Renaming a variable and
changing a return type are two conversations.

::: key-concept
**Four techniques, four different failures.** Output that varies between runs
is an under-specified transformation, and the answer is worked pairs. Code
nobody can judge is a missing gate, and the answer is tests written first. A
design you cannot state is an incomplete specification, and the answer is
letting Claude interview you. Fixes that undo each other are a feedback
question, and it turns on interdependence, never on how many problems there
are.
:::

::: anti-pattern
**Batching independent problems to save round-trips.** It is more
token-efficient and it gives up the per-step validation that made sequential
feedback worth choosing: you find out at the end which of the five changes was
wrong.

**Splitting interacting problems for control.** Each fix is made without sight
of the others, so the second one dismantles the first. The criterion is
interdependence, never the number of problems.
:::

**To test** — bank questions tagged `data-task="3.5"`.

## 3.6 — Integrate Claude Code into CI/CD pipelines
<!-- ts:3.6 | src:exam guide TS 3.6 (the -p / --print flag for non-interactive mode, --output-format json and --json-schema for structured CI output, CLAUDE.md as the mechanism carrying testing standards, fixture conventions and review criteria to a CI-invoked Claude Code, session context isolation for review, including prior findings when re-running a review, providing existing test files, documenting testing standards to reduce low-value test output) ; 01claudecodeinaction L6 (-p as the short form of --print, one-shot with no interactive UI, pairing --output-format json with --json-schema and reading the object from structured_output with jq, capturing session_id for a later --resume, --bare for deterministic CI runs), L8 (a fresh session or subagent with no memory of how the code was built catches what the original run talked itself past) ; 06claudecode101 L7 (a subagent reviewer with fresh eyes and read-only tools, checked into the repo) ; code.claude.com/docs/en/headless (--bare skips auto-discovery of hooks, skills, plugins, MCP servers and CLAUDE.md; without it claude -p loads the same context an interactive session would) -->

Claude Code is interactive by default. Invoked in a pipeline with no one to
answer a prompt, it waits, and the runner eventually kills it at the step
timeout. Everything in this task statement follows from that.

### `-p`, and the shape of the output

`-p`, spelled out `--print`, runs Claude Code as a one-shot command: it processes
the prompt, writes the result to standard output, and exits. It reads stdin and
writes stdout, so it pipes like any other shell tool.

That gets the job to finish. Getting something the *next step* can act on takes
two more flags: `--output-format json` makes the reply a JSON envelope, and
`--json-schema` constrains the payload to a schema you supply. The conforming
object lands in the envelope's `structured_output` field, at a fixed place, so
nothing downstream has to parse prose.

```yaml
- name: Review the diff
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    claude -p "Review $(git diff origin/main...HEAD) for security issues and bugs." \
      --output-format json \
      --json-schema '{
        "type": "object",
        "properties": {
          "issues": {"type": "array", "items": {
            "type": "object",
            "properties": {
              "severity": {"enum": ["critical", "major", "minor"]},
              "file": {"type": "string"},
              "line": {"type": "integer"},
              "message": {"type": "string"}
            },
            "required": ["severity", "file", "message"]
          }}
        }
      }' \
      | jq '.structured_output.issues' > findings.json
```

`findings.json` is now a list a later step can post as inline pull-request
comments through the GitHub API. The API key comes from the repository secrets,
never from the workflow file.

### What the CI instance knows

A CI-invoked Claude Code has no session history and nobody to ask. The guide's
answer to that is **CLAUDE.md**: the committed project file is the mechanism
that carries testing standards, fixture conventions and review criteria to the
instance running in the pipeline. Document which fixtures exist and what makes a
test worth writing, and test generation stops producing low-value tests that
re-cover ground the suite already holds, which is also why you put the existing
test files in context when you ask for new ones.

::: key-concept
`claude -p` loads the same project context an interactive session would,
CLAUDE.md included. Bare mode — the `--bare` flag — is the opt-out: it skips
auto-discovery of hooks, skills, plugins, MCP servers and CLAUDE.md to start
faster and run deterministically.

Be deliberate here, because a common misreading of this pair is wrong: it
attributes that skipping to `-p` itself. The documentation attributes it to
`--bare` and states that without it, `claude -p` loads the same context an
interactive session would. The guide's own TS 3.6 depends on CLAUDE.md reaching
the CI instance, which it could not do if `-p` dropped it. The pipeline gets
your CLAUDE.md unless you asked for bare mode; and if you did ask for it, you
also gave up the standards the guide is telling you to rely on.
:::

### Reviewing is a second instance's job

The session that wrote the code is the worst reviewer of it. It carries the
reasoning that produced the code and questions its own decisions least, the same
bias as an author proof-reading their own text. Review runs in an **independent
instance**: a separate session, or a subagent with no memory of how the code was
built. Fresh eyes catch what the original run talked itself past.

Two operational rules complete the picture, and both are guide skills:

- **Re-running a review after new commits, pass the previous findings in** and
  instruct Claude to report only what is new or still unaddressed. Otherwise
  every push re-raises the same issues, the pull request fills with duplicate
  comments, and developers stop reading them.
- **Pass the existing test files** when generating tests, so the new ones do not
  duplicate scenarios already covered.

::: exam-tip
Four associations settle most CI questions. A job hanging on input → `-p`. A
pipeline that has to parse findings → `--output-format json` with `--json-schema`.
A CI instance ignoring the project's testing conventions → the committed
CLAUDE.md carries them. Reviewing code Claude just wrote → an independent
instance.

The distractors come in two families. **Invented mechanisms**: a
`CLAUDE_HEADLESS` environment variable, a `--batch` flag, a `--no-tty` option.
They are plausible because *headless* and *batch* really are the vocabulary of
this domain, and none of the three exists. An unrecognised option does not
change the mode. **Workarounds**: redirecting stdin from `/dev/null`, which
treats the symptom without turning on the documented mode; wrapping the call in
`timeout`, which turns a long hang into a short one and still produces nothing;
and regex-parsing the prose, which moves the fragility into your own code
instead of removing it.
:::

::: anti-pattern
**Re-running the review from scratch on every push.** Claude has no memory
between runs, so it re-reports everything it found last time. The pull request
accumulates duplicates until nobody reads the bot. The fix is not to review less
often; it is to include the prior findings and ask for the delta.

**Letting the job that generated the code also review it, to save a run.** One
job costs less than two, and it buys the review the guide names as the least
effective one: the reasoning that wrote the code is still in the window. **Why
an independent instance catches what a self-review misses, and how to split a
large review into per-file and cross-file passes, is developed in D4.6.**
:::

**To test** — bank questions tagged `data-task="3.6"`.
