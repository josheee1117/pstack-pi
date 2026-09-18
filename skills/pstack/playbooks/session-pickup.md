# Session pickup

**You own the resume point. Read the prior trail, do not redo it.**

1. **Locate the prior trail.** A prior session's record (under Pi, a `PI_SESSION_FILE`, or the project's session directory derived from it), a branch, a pushed commit, a decision log, or a handoff note. Read the metadata overview and the last messages first, then scan back for the decision points. Parse a long record in a subagent or a script and keep the reduced timeline in the main thread ([guard-the-context-window](../references/principles.md#guard-the-context-window)). Read only records belonging to this project. Do not open unrelated projects' private sessions.
2. **Reconstruct the operational state.** The branch and worktree, what already landed (`git log`, `git diff` against the base), the open checklist items, the decisions made. The prior trail is authoritative input. Resist the bias to re-derive it.
3. **Diff done versus pending.** Compare what shipped against what was planned. Name the resume point. Do not rerun the prior repro or redo completed work. A "let me verify from scratch" pass treats the trail as untrustworthy when it is authoritative.
4. **Route the remaining work to the matching playbook** and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run. The pickup ends here. The routed playbook owns the rest.
5. **Verify the inherited claims against the original goal on the real artifact** ([prove-it-works](../references/principles.md#prove-it-works)). A passing prior self-report is not the proof. Keep it to the claims the resume depends on, not everything the prior run did.

**Reply.** Where the prior work stopped, what you inherited versus redid (ideally nothing redid), the resume point, and the outcome.
