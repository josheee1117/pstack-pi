---
name: pstack-no-comments
description: "Strip comments that do not earn their place before review, and turn claimed constraints into structure. Use before a review or a PR, or when comments have accumulated in a diff. Comments survive only for a non-obvious why the code cannot show."
---

# No comments

Review the comments in the change. Act on the accepted findings.

The reviewer's fresh perspective is the point. Read [`../pstack/references/execution.md`](../pstack/references/execution.md) before running the review. When the environment has a separate review-session mechanism, give it [`references/comment-reviewer-prompt.md`](references/comment-reviewer-prompt.md) so the comment review does not come from the same context that wrote the comments. This step exists to get a view the author did not have, so a missing backend stops the review rather than shrinking it into one: see [When a backend is missing](../pstack/references/execution.md#when-a-backend-is-missing). Say the review is missing, and stop there rather than self-reviewing and calling it done.

## Scope

Use the files or diff the caller names. Otherwise use the current diff against the base branch, defaulting to `main`, including the working tree.

## Steps

1. **Enumerate the comments in scope.** Production code, test code, and scripts. For each, classify:
   - **Delete.** Phase narration, restating the code, a numbered-step commentary, a changelog in a comment, a commented-out block.
   - **Keep.** A non-obvious why the code cannot show: an external constraint, a workaround for a bug in a dependency, a legal or protocol requirement.
   - **Convert.** A constraint claim such as `do not remove`, `do not change the wording`, or `talk to X before changing`. That is structure wearing a comment's clothes.
   - **Suspicious.** A comment that justifies a workaround. A paragraph-long justification means the code is wrong ([fix-root-causes](../pstack/references/principles.md#fix-root-causes)).
2. **Verify before deleting.** A keep survives only with proof that it is about something we cannot change. A thin `IMPORTANT` or `do not remove` gives no such proof, so run `pstack-how` or `pstack-why` on the symbol before accepting it. Audit suppression comments, lint disables, and type-ignores in scope: a suppression that hides a correctness or safety problem is a real finding, not a keep. If a kill is ambiguous, do not delete it. If a keep is refuted or stays ambiguous, delete it.
3. **Fix the trivial accepted findings directly.** Delete the dead path, drop the parameter, call the real API. If a fix needs a shape, run `pstack-architect` once for the accepted set and stop at the sketch. Architect shapes; the next step implements.
4. **Implement the smallest root-cause fix in scope.** Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest as open work. [fix-root-causes](../pstack/references/principles.md#fix-root-causes) and [redesign-from-first-principles](../pstack/references/principles.md#redesign-from-first-principles) guide intent only: neither authorizes widening the scope. Never bolt on a symptom guard.
5. **Handle constraint comments.** For each one, offer the cheapest in-scope way to enforce it structurally: a type, a runtime check, a test, or a lint rule. Get approval before encoding, or delete the comment and report the constraint as open. Once encoded, delete the comment ([encode-lessons-in-structure](../pstack/references/principles.md#encode-lessons-in-structure)).
6. **Report.** The deletion count, any comment restored and why, the architect sketch, the fixes applied, the encoding offers and their outcomes, and any constraint still unenforced.

Scope discipline: reject edits outside the reviewed files, except a deletion that is protected by an exact exception with scoped proof. Revert a review pass that escaped scope and rerun it with the failure named. Reject a second escape and report it as open instead of iterating.
