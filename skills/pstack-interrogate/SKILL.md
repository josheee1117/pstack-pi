---
name: pstack-interrogate
description: "Adversarial multi-model review of a change: find bugs, design flaws, security issues, and maintainability problems from independent angles, then synthesize a verdict with act-on, consider, and dismissed findings. Use for /skill:pstack-interrogate, 'interrogate this', 'adversarial review', 'multi-model review', 'stress test this diff', 'find blind spots', 'tear this apart', or before shipping a contested design."
---

# Interrogate

One reviewer per configured model, each reviewing the same change and the same rubric. The adversarial signal comes from model diversity, not assigned personas.

Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before spawning. It owns the backend choice and the independence rules: a formal review runs on an independent session, one model is not one context, and the reviewer gets the requirement plus a pinned code version, never the implementer's self-report or another reviewer's conclusions.

**The deliverable is a synthesized verdict. Do not auto-apply changes.**

## Step 1. Determine scope

Identify what to review:

- The user pointed at specific files or a diff: use that.
- On a feature branch: `git diff <base>...HEAD` for the full changeset.
- The message references recent work: gather the relevant files.

Package the diff, or the file contents, plus any surrounding context a reviewer needs to understand it.

## Step 2. State the intent

Before spawning reviewers, state the intent in one clear paragraph, derived from the user's message, commit messages, any PR description, and the code itself. If the intent is unclear, ask the user before proceeding. Reviewers review whether the code achieves the intent, not whether the intent is right.

## Step 3. Spawn reviewers

Launch every reviewer in one message so they run concurrently. One reviewer per entry in the operator's configured reviewer list. When no list is configured, choose independent models the environment actually offers, preferring different model families, and say which models you used. If the environment offers only one model or no subagent mechanism, say so and run the review with the angles you have rather than pretending to multi-model coverage.

Each reviewer is a read-only subagent prompted from [`references/reviewer-prompt.md`](references/reviewer-prompt.md), filled in with:

1. The stated intent
2. The diff or file contents
3. The rubric from [`references/rubric.md`](references/rubric.md)
4. The code-quality lens from [`references/code-quality-review.md`](references/code-quality-review.md)

The same filled prompt goes to every reviewer, so every model applies the code-quality lens.

## Step 4. Synthesize

As results arrive:

1. **Parse all findings.**
2. **Identify consensus.** A finding raised by two or more reviewers independently is the highest signal.
3. **Identify lone-model findings.** Worth reading, weighted accordingly.
4. **Deduplicate.** Different models describe the same issue differently. Merge those and note which models raised it.
5. **Note disagreements.** One model flagging something another explicitly denies is useful context.

## Step 5. Lead judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator. Read [`references/lead-judgment.md`](references/lead-judgment.md).

Categorize every finding:

- **Act on.** Real issues affecting correctness, security, or maintainability given the actual goals. These would block a real PR.
- **Consider.** Legitimate points whose cost may not be worth paying right now. Worth the user's attention.
- **Noted.** Technically valid but not actionable at this stage.
- **Dismissed.** Wrong, nitpicky, or missing context. Give a brief reason.

For each finding: which models raised it, its category, and a one-line rationale for the categorization. An Act On list longer than about five items means the filtering is not finished.

## Output format

### Intent
> The stated intent paragraph.

### Reviewers
One bullet per reviewer: label, model, number of findings.

### Act On
Each finding: description, which models raised it, why it matters.

### Consider
Each finding: description, which models raised it, the tradeoff.

### Noted
A brief list.

### Dismissed
Rejected findings with the reason.

### Agreement Map
Where the models agreed, where they diverged, and what that pattern tells you.
