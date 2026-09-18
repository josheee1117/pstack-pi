# Epistemics

How to reason about confidence when the evidence is historical, fragmentary, and sometimes contradictory, and how to communicate that without flattening it into false certainty.

Code does not carry its own motivation. You can read what code does. You cannot read *why it exists*. That lives in commits, PRs, tickets, docs, and conversations, all incomplete, biased, and sometimes missing entirely. Pretending otherwise produces confident-sounding guesses that mislead the user.

## Confidence tiers

Every claim in the final output sits in one tier. The tier decides which section it goes in and how it is phrased.

### 1. Direct

An explicit textual citation that answers the question. Not "the code does X so the author must have wanted X", but something an author actually wrote that says why.

Examples: a PR description saying "this fixes the bug where users with more than 1000 items could not paginate". A ticket saying "adding this because customer Acme asked in their security review". A comment saying `// clamp to 100 because the upstream API rejects larger values`. A design doc saying "we chose option A because we need persistence across restarts". A message from the author saying "switching to this approach since the old one was flaky".

Phrasing: confident, present tense. "This exists because X." Cite the source.

### 2. Supported

Multiple pieces of indirect evidence converge. No single source states it, but the pattern across sources makes it likely.

Examples: the PR title says "improve performance", the ticket is labeled `perf`, and the surrounding commits touch the same hot path. Several tests were added alongside the change, all exercising very large inputs. The author's other PRs that week all mention the same incident.

Phrasing: confident but clearly derived. "The evidence points strongly to X, from [the specific pieces]." Cite multiple sources.

### 3. Inferred

A reasonable reading of the context with nothing explicit behind it. The reader must understand this is your interpretation, not a fact from the record.

Phrasing: hedged. "It appears", "likely", "suggests", "is consistent with", "one reading is". Make the chain explicit: "Given A and B, C seems likely because D."

### 4. Speculative

A plausible hypothesis with thin evidence, where other explanations fit equally well. Valuable to present, but marked as a guess: "one possibility is X, but we have no direct evidence". Usually lives in Competing Hypotheses.

### 5. Unknown

You looked and could not find out. A valid and important outcome, and it gets documented.

Phrasing: "We searched X, Y, and Z and found no evidence of why." Be specific about what you searched. "We searched the ticket tracker with keywords A and B, scanned the six PRs that touched this file since 2023, and grepped the repo for the threshold literal. None surfaced a rationale" beats "we could not find out".

## Phrasing guide

**Words that carry confidence.** They imply Direct or Supported. Do not use them for an inference: "because", "the reason is", "was designed to", "fixes", "addresses", "solves", "the team decided". If you use one, a citation sits immediately adjacent.

**Words that hedge.** Use them for inferences: "appears to", "seems to", "likely", "suggests", "is consistent with", "one reading is", "plausibly", "may have been", "the evidence points toward".

**Words to avoid.** "Obviously" and "clearly", because if it were clear the user would not be asking. "Of course", for the same reason. "Just", which is dismissive and usually hides uncertainty. "I think" and "I believe", because you are synthesizing evidence, not giving a personal opinion. Say "the evidence suggests" instead.

## Avoid rationalization

Code that makes sense today may have been written for reasons that no longer apply, or that were wrong then. Do not retrofit a clean rationale onto messy history.

Resist the urge to assume the author did the right thing and work backward to justify it, to assume a consistent pattern in the codebase was intentional when it might be copy-paste, or to turn an absence of evidence into evidence of absence ("no one mentioned security concerns, so it must not have been one").

## The sycophancy trap

Users often embed a hypothesis in the question: "why do we do it this way, I assume it is for performance?" Do not confirm it. Treat it as one candidate and check the evidence independently. If the evidence supports it, say so with citations. If not, say so and present what the evidence does support. The user's guess is a prompt for investigation, not a conclusion to validate.

## When evidence contradicts

If two sources disagree, surface both. Do not pick the one that fits a tidier narrative. A ticket saying "we need this for customer X's compliance requirement" and a PR saying "cleaning up tech debt in this area" may both be true, or one may be wrong. Present both with their citations and let the user decide.

## When evidence is missing

An honest "we do not know" is one of the most valuable outputs this skill produces. The user learns that the answer is not in the obvious places, that they need to ask a human, or that the question is not worth pursuing.

Failing to mark a gap and filling it with a confident guess actively harms the user, because they will act on the guess. When you hit a gap, name it concretely: what you were trying to answer, what sources you searched, what you searched for in each, and what you found.

## Calibration check before finalizing

Review every claim in "What We Found" and "What We Can Reasonably Infer" and ask:

1. Does this claim have a citation? If not, add one or move it to Inferred or Hypotheses.
2. Is the phrasing calibrated to the tier? A Direct claim can use "because". An Inferred one cannot.
3. Am I treating the code itself as evidence for its own intent? That is not evidence. Remove or reclassify it.
4. Does the output include a "What We Don't Know" section? No gaps mentioned is suspicious: either the evidence was unusually complete, or something is being swept under the rug.
