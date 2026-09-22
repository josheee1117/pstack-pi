---
name: pstack-how
disable-model-invocation: true
description: "解释系统如何工作、代码该放在哪一层。适用于改动前梳理代码、了解运行机制、确认模块归属或分层边界，产出面向工程师的架构说明。追问设计动机请用 pstack-why。"
---

# How

Explore the codebase to answer "how does X work?" at the level a senior engineer needs to build a working mental model, not so much that it reads like annotated source.

Steps 2a, 2b, and 3 delegate to readers. Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before that: a short bounded investigation can use any fresh-context mechanism the environment provides, and when none exists you do the exploration yourself and say so.

## Step 1. Assess complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple**: a single module, a small utility, a narrow question such as "how does function X work". One pass explores and explains. Go to step 2b.
- **Complex**: a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview. Parallel explorers first, then one explainer. Go to step 2a.

When in doubt, take the simple path.

## Step 2a. Explore (complex questions only)

Decompose the question into two to four exploration angles, each a distinct slice. Spawn all explorers in one message as fresh-context, read-only subagents. Each gets the prompt in [`references/explorer-prompt.md`](references/explorer-prompt.md) with its angle filled in.

If the environment cannot spawn subagents, do the exploration yourself, one angle at a time, holding the findings in a scratch file rather than in context.

## Step 2b. Direct explain (simple questions)

One read-only subagent explores and explains in a single pass, prompted from [`references/explainer-prompt.md`](references/explainer-prompt.md) without the explorer findings section. Without a subagent mechanism, do it directly and follow the same output format.

## Step 3. Synthesize (complex questions only)

Once all explorers return, one read-only subagent merges their findings into a single explanation, prompted from [`references/explainer-prompt.md`](references/explainer-prompt.md) with every explorer's findings filled in. Reconcile overlaps and check contradictions against the code yourself.

## Step 4. Present

Present the explanation. Light edits for clarity or context are fine. Do not substantially rewrite it. Say which parts are yours versus traced.

## Output format

Drop any section that does not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas. Diagrams help when components talk to each other; a diagram that only decorates the prose is noise.
