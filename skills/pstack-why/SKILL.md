---
name: pstack-why
disable-model-invocation: true
description: "Explain why code is shaped the way it is: design rationale, regressions, postmortems, data-backed thresholds. Use for 'why does X work this way', 'why did we pick Y', 'where did this number come from'. Discovers the evidence sources actually available in this session, queries each category in parallel, and returns a cited read with explicit confidence tiers. Use pstack-how for runtime behavior."
---

# Why

Investigate the motivation and intent behind code. `pstack-how` answers what the code does. `pstack-why` answers what forces led to its shape.

Step 4 delegates to investigators and a synthesizer. Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before that: a short bounded investigation can use any fresh-context mechanism the environment provides, and when none exists you run the categories yourself and say so, rather than presenting a self-check as independent.

## Operating posture

Be a careful, precise investigator. Be explicit about what you know versus what you infer. Read [`references/epistemics.md`](references/epistemics.md) before writing anything, and follow its confidence tiers and phrasing. The synthesizer must follow it too.

## Step 1. Understand the target and the question

The **target** is usually a chunk of code, a pattern, a feature, or a named decision. The **question** is usually a rationale, a tradeoff, a motivating edge case, an external constraint, dead code, or a history sweep.

If the target is vague, make your best guess from the conversation and open files, state the interpretation in one line so the user can redirect, then proceed.

## Step 2. Establish the code anchor

Anchor the investigation in concrete code before spawning anything.

- The relevant file paths and line ranges.
- The key symbols: function names, class names, constants.
- An initial commit list: the last few commits touching the target.
- PR numbers from merge-commit subjects.

```bash
git blame -L <start>,<end> <file>
git log --follow -p -- <file>
git log --oneline -20 -- <file>
git log -1 --format=%B <commit>
```

Pull PR bodies and discussion through the forge CLI (for example `gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews`) for any substantive commit. Capture paths, symbols, commits, PR numbers, and ticket ids as the seed context.

## Step 3. Map the available evidence sources

**Enumerate the tools this session actually has** before choosing investigators. Under Pi that is the MCP gateway's connected servers plus the shell (git, the forge CLI). Inspect what is really connected; do not assume.

Map each available source to exactly one category:

1. Source control history
2. Issue or ticket tracker
3. Long-form documents
4. Real-time team chat
5. Infrastructure observability
6. Error or exception tracking
7. Product analytics warehouse

Source control is always available through git and the forge CLI. Classify the rest by the server's name, instructions, tool names, and described resources. When a source could fit two categories, pick its primary evidence and record the ambiguity.

Aim for a complete **coverage map**, not a minimal one. Document the null rather than skipping the search.

[`references/source-playbook.md`](references/source-playbook.md) names one playbook per category, each written against an example tool: `code-archaeology.md` for source control (git, the forge CLI), then `linear.md`, `notion.md`, `slack.md`, `datadog.md`, `sentry.md`, and `databricks.md`. They are concrete recipes, not abstractions: they name the tool calls to make and the pitfalls that produce false confidence. Adapt the one matching the tool actually connected, and skip the rest with a written reason.

## Step 4. Run the investigators (default posture)

Default to the full parallel investigation. One investigator per available category. Never one investigator covering several sources.

Each investigator is a fresh-context subagent, is allowed to read and query but must not write, and gets:

1. The base prompt from [`references/investigator-prompt.md`](references/investigator-prompt.md)
2. The single matching category playbook under [`references/sources/`](references/sources), adapted to the tool actually connected
3. [`references/sources/incident-postmortem.md`](references/sources/incident-postmortem.md) **if the target code looks defensive** (null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, out-of-memory handlers)
4. The code anchor from step 2
5. The user's original question

The roster, and what each category uniquely surfaces:

1. **Source control.** Git history, PRs, code comments, tests. Always spawned. Best at implementation-time rationale captured during review.
2. **Issue or ticket tracker.** Best at the product or business forcing function.
3. **Long-form documents.** Best at design rationale written before it became code.
4. **Real-time team chat.** Best at deliberation that never reached a doc. Most valuable when the paper trail is thin.
5. **Infrastructure observability.** Best at the runtime reality that motivated the code. Strongest when the target reacts to an infra signal.
6. **Error or exception tracking.** Best at the specific exceptions that motivated defensive or corrective code.
7. **Product analytics warehouse.** Best at the product and data reality that shaped flag-gated code, experiments, and migrations.

**When to skip a category.** Only with an explicit written justification that appears in the final Sources Consulted section. Two valid reasons:

- No tool for that category is available in this session. This is a gap, not a choice. Say so.
- The source is provably irrelevant, not just probably irrelevant. A high bar. Example: "error tracking skipped, the target is a build-time script with no runtime path".

If a scope assessment suggests a trivial single-commit target whose PR description already holds the entire answer, you may answer inline **only after** confirming that every available category search would be redundant. This should be rare.

When the environment cannot spawn subagents, run the categories sequentially yourself, keeping only the distilled findings in context.

## Step 5. Synthesize

One synthesizer subagent, or you directly, gets:

1. The investigator findings, including null results and skipped categories with reasons
2. The code anchor
3. The user's original question
4. The epistemics framework
5. The prompt from [`references/synthesizer-prompt.md`](references/synthesizer-prompt.md), which also defines the output structure

Spot-check citations against the source before publishing one. Do not modify anything.

## Step 6. Present

Present the synthesizer's output. Light edits for clarity are fine, but do not rewrite the confidence language.

After the Sources Consulted block, when the question is a precursor to changing this code, convert the lineage findings into a Preserve / Change / Avoid / Risk constraint set for planning the change.

## Common failure mode

**Recency bias.** The most recent commit is rarely the whole story. The current shape is usually the accretion of several earlier decisions. Trace back.

## References

- [`references/epistemics.md`](references/epistemics.md). Confidence tiers and phrasing. Mandatory for the synthesizer.
- [`references/investigator-prompt.md`](references/investigator-prompt.md). Base prompt for an investigator.
- [`references/source-playbook.md`](references/source-playbook.md). Category index, plus the cross-cutting incident angle.
- [`references/sources/`](references/sources). One recipe per evidence category, with the concrete tool calls.
- [`references/synthesizer-prompt.md`](references/synthesizer-prompt.md). Synthesizer prompt and output format.
