# Orchestrate

**You own the program, never the code. Author briefs, drain the queue, keep the frontier green, decide.** For a whole project handed to one standing coordinator: multi-day, many PRs, many workers, the human checking in twice a day instead of every five minutes.

One task driven to a predicate is Autonomous run. One ambitious run needing a bespoke workflow is `pstack-figure-it-out`. Route here when the work outlives any single agent. **Work one agent could finish inside this session's budget is not a program.** Do that work directly instead: plain workers where they help, verification inline, landing as you go, none of the register and ledger machinery below.

Ceremony scales with the program. On cheap near-identical units, collapse it as each section directs.

Three rules carry the rest.

- Completions are queue events, not interrupts.
- Every spawn and every resume carries the standing orders verbatim.
- The brief is the product. A vague brief fails quietly, because a worker cannot ask you a question.

## Execution environment

Independent sessions are the unit of work here. Under this environment they are long-lived agent sessions in their own panes, each with its own working directory and its own git worktree when it writes, coordinating through cross-session messages when that channel exists and through files when it does not. See the entry skill's Execution environment section and the project's `AGENTS.md` for the mapping. When the environment cannot host independent sessions, say so and route the program to a plainer equivalent: you doing the work, or the `autopilot-stack.md` playbook for a queue one operator can land. Do not pretend a single session is a fleet.

## Roles and placement

- **Coordinator (this session).** Frames, authors briefs, drains the inbox, owns the human report, makes judgment calls. It never authors or edits code. Conflicted merges, restacks, and code changes are always separate work units. Mechanically landing a verified unit (fast-forward or clean cherry-pick of a worker's commit, then push) is bookkeeping the coordinator may do itself once the operator authorized landing. Queueing finished work behind an idle stacker is how a deadline harvests nothing.
- **Sub-coordinator.** Durable, one per track, only when the program exceeds what one coordinator's drains can manage. A track the coordinator can drain itself needs no middle layer. Each nested layer re-pays a full orientation preamble. Owns its track's units and board, authors its workers' briefs, runs its own workers and verifiers, rolls up aggregates at wave boundaries. Never forwards raw child reports. Cap in-flight children at roughly what one drain can process, around ten, as a rolling window, never as blocking batches that pay the slowest child of every batch.
- **Worker / verifier.** Independent sessions. A worker that needs this machine keeps its worktree local; a worker whose verification is a cheap command reports the command output rather than getting a dedicated verifier. Prefer fewer, broader workers. One writer per worktree or branch (`references/principles.md#separate-before-serializing-shared-state`). Run a unit's verifier on a different model family from its worker when the environment offers the choice.

Depth stays at coordinator, track, worker. Author the track decomposition per project. Build, landing, and verification are common cuts, not a required shape.

## State on disk

Create `orchestrate/<project-slug>/` in the project working directory, or beside the run's scratch dir. Plain readable files. Every file has exactly one writer. Owners publish facts, readers aggregate at read time. No service, no scheduler, no CLI beyond your normal file tools.

- `preferences.md`. The standing-orders register: numbered lines, one constraint each (model policy if the environment has one, stack shape and count, verification bar, forbidden paths, escalation policy). Paste it verbatim into every spawn and every resume. Directives decay across resumes and each dropped one costs a human turn. When you catch yourself restating an instruction, append the line before you act (`references/principles.md#encode-lessons-in-structure`).
- `overview.md`. The durable PR and issue list. Append. Never rewrite wholesale per event.
- `units.tsv`. One row per unit: id, track, state, branch, PR, head SHA, brief path. Update rows in place.
- `frontier.tsv`. The computed merge frontier: ordered PR list, branch names, head SHAs, lowest unmerged PR, and a generation number incremented on every merge or stack mutation.
- `ledger.tsv`. The verification ledger. One row per verdict, keyed by PR number plus head SHA.
- `gates.md`. Human gates: question, options, default on no answer.
- `decisions.tsv`. The trail per `pstack-show-me-your-work`.
- `status.md`. Derived from `units.tsv` and `ledger.tsv` at each drain, never hand-maintained.

## The brief

Your prompts to workers are your only product, and a sloppy brief compounds across the whole tree. Every spawn carries all of it. A field you cannot fill is a unit you have not scoped yet.

```
GOAL         one sentence, the outcome, executable by a stranger with no chat access
SCOPE        paths this unit may write; paths it may not; its exclusive worktree or branch
CONTEXT      pointers to files and PRs; upstream reports pasted in full when this unit
             depends on them, because workers cannot see siblings
ACCEPTANCE   checkable criteria, one per line
VERIFY       exact commands or the surface-driving path, plus known gotchas
TIMEBOX      rough cap on runtime; on expiry, return partial findings and stop
FORBIDDEN    no rebase of someone else's branch, no force-push, no fixes outside scope
REPORT       status, branch, head SHA, PRs, verdict, what you actually ran, deviations
STANDING     <preferences.md pasted verbatim>
```

Size the brief to the unit. A one-command unit collapses to a paragraph that still names goal, scope, the verify command, and the report shape. A long scaffold around a two-line edit costs more to write and obey than the edit. A dependency is a context relay, not just ordering: undeclared upstream context makes the worker guess. Missing fields are a refuse-to-spawn condition. Audit one sampled worker brief per sub-coordinator per wave, alongside the wave it samples, never as a gate in front of it. A failing brief stops that track and fixes the sub-coordinator's instructions, not just the worker, because brief quality decays late in a run. Never resume-chain a brief. Respawn fresh with consolidated scope.

## Steps

1. **Frame.** State the done predicate as something countable ("all 126 units merged, each verified by a unit test or better"). Quantify scope: units, rough effort, expected stacks, wall-clock budget. If one agent could finish inside that budget, stop here and do the work instead. Name the tracks. A contested decomposition or a one-way door goes through `pstack-arena` before the pilot. Schedule landing against the budget: by roughly 70% of it, stop spawning and land what is verified. Present the framing once. Reversible prep proceeds without waiting.
2. **Install the runtime.** Create the state directory, open the trail via `pstack-show-me-your-work`, write the standing orders before any spawn, and seed `frontier.tsv` from existing PRs.
3. **Pilot.** Push one unit through the whole path: brief, worker, verification, stack entry, ledger row, merge. The pilot exists to falsify the brief template, the verify recipe, and the unit size while that costs one worker instead of fifty. Fix the contract from pilot evidence before any fan-out. On programs of near-identical cheap units, the first unit is the pilot, run as a normal unit with its verify command inline, and fan-out starts the moment it lands. A separate verifier or a dedicated audit gate is for expensive or novel unit shapes.
4. **Scale.** Run a rolling window of workers up to the in-flight cap, refilling as children finish. Blocking batches pay the slowest child of every batch. Spawn track sub-coordinators only past the one-drain threshold. Recompute ready work after each drain. Relay upstream reports into downstream briefs. Keep sibling communication upward only. The sampled brief audit runs alongside the wave it samples and stops the next refill on failure, not the current one.
5. **Drain.** Run the queue discipline below at every drain point.
6. **Land.** Landing is continuous, never a terminal phase. Integration starts with the first verified unit and runs alongside the remaining waves. Where local git is cheap, the coordinator lands verified units itself once the operator authorized it. Keep the frontier green before upper-stack work. Stack safety governs. Advance `frontier.tsv` only on a merge or a reported new head SHA.
7. **Close.** Drain the final inbox, reconcile every spawned worker to a terminal row (done, abandoned, zombie-reconciled), confirm the predicate on the real artifact, confirm every landed PR has a verdict for its current head SHA, encode recurring corrections into `preferences.md` or the brief template. Leave the state directory in place. It is the postmortem.

## Queue and drain

- On a completion notification, append a row to the inbox (`inbox.tsv`: worker, unit, status, report path) and return to what you were doing. Never deep-review inline. A completion that needs review becomes a verifier unit. Never review a diff inside a drain.
- Drain in batches at four points: the end of a critical section, a track rollup, a frontier watcher wake (armed only when a real event or scheduler exists, with a long heartbeat fallback; otherwise poll on a stated budget), and before a human report. Arrivals during a drain wait for the next one.
- Critical sections you finish first: authoring a brief, a stack operation, a conflict decision, writing a gate, updating the ledger or the frontier.
- Each drain classifies every pointer (landed, needs-verify, failed, zombie, noise), writes the resulting rows, regenerates `status.md`, then spawns the next wave in one message.
- Account for every spawned child at its track's rollup: arrived, respawned, or its scope explicitly absorbed. Silently redoing a missing child's work hides both the wasted spend and the coverage gap its result existed to close.
- A drain turn ends with three lines: counts against the states, what changed, gates open. Detail lives in `status.md`. The full reply contract applies at checkpoints and close.

## Stack safety

- The frontier is a computed object, never narrative. Recompute `frontier.tsv` after every merge and stack mutation, because base refs drift mid-restack. Resolve it from the forge's own tracking where the forge knows the stack; a checkout whose metadata never saw the stack reports no PRs, and that is an error to report, not a guess to make.
- Exactly one writer may touch stack topology, serialized within a stack. Record the holder in the standing orders. Restacks that rewrite many SHAs run where they are cheap and reversible.
- Workers never rebase another unit's branch and never run a stacking tool. Babysitters follow `babysit.md`, one per stack, scoped to one immutable frontier generation. They report conflicts to the topology writer rather than restacking.
- Closing a base PR orphans every chain above it. Merges and stack surgery are units with briefs like any other.
- One watcher follows merged PRs for reverts, post-merge CI breaks, and orphaned follow-ups.

## Verification

Scale verification to the unit. When VERIFY is a single cheap command, the worker runs it, reports the output, and the coordinator spot-checks the receipts. A dedicated verifier, on a different model family from the worker, is for units whose verification is expensive, judgment-laden, or high blast radius. A verifier whose entire product would be rerunning one command is ceremony, not verification.

Ledger rows are keyed by PR number plus head SHA, with one of: `live-surface-verified`, `unit-test-verified`, `type-check-only`, `verifier-blocked`, `verifier-failed`. A green CI run is an input to a verdict, not a verdict. Behavioral work needs better than `type-check-only`. `verifier-blocked` is not a pass; respawn when the environment heals. `verifier-failed` gets a fix unit, not a re-verify. A worker may self-report. A verifier overrides it on the same key. A new head SHA voids the row, so re-verify after a restack. The ledger answers "was this verified", not memory and not the transcript.

A unit is not done until its output is externalized the moment it lands, never batched to the end of the run. The worker pushes its branch, the verifier writes its ledger row, receipts land on disk. Work that exists only inside a session that has since exited was never done.

## Liveness and failure

- **Never resume a worker merely to check on it.** A resume restarts an idle session. Probe read-only: the ledger, `units.tsv`, the forge, pushed branches, the pane's visible state.
- A silent death gets a synthetic postmortem row in the inbox: unit, failure mode, last evidence, options. Replan on evidence as it arrives. Never wait for full quiescence.
- Retry by mode: resource exhaustion, respawn with smaller scope. Network drop, retry as-is. Tool error, retry on a different model. Unknown, retry once. Two retries, then abandon the unit and replan around it.
- A worker that returns hours late reconciles against the current frontier and ledger before anything it produced is accepted. Salvage unique findings through a fresh unit, never a blind merge.
- When continued spawning would produce garbage tree-wide (bad upstream output, broken acceptance, dead infrastructure), write a stop line at the top of the standing orders, let in-flight work finish, fix the cause, clear it.
- Bound your own infrastructure retries the same way. After a few consecutive tool aborts, stop. Write a terminal handoff to durable state: what is done, where it lives, the exact command to resume.

## Escalation

Reaches the human, batched into the status page rather than per item: irreversible actions, a genuine product or preference call no experiment settles, a standing order that contradicts observed reality, a program-level dead end that survived a replan. Park each as a `gates.md` entry before asking, and route work around it.

Never reaches the human: frontier nudges, restack mechanics, retries, CI flake triage, review-thread triage, format fixes, scope the brief already forbids (refuse and continue), and "should I keep going". When in doubt, act and log.

Mid-run discoveries fix only what blocks the frontier. Everything else parks in follow-ups. At this fan-out a small scope leak multiplies into changes nobody asked for.

**Reply.** At checkpoints and close: the predicate and the count against it from `units.tsv` and `ledger.tsv`, tracks and what each landed, the frontier with SHAs, the verdicts summary, what was abandoned and why, gates awaiting the human (the only asks), and the state directory path. Numbers from the tables, not narrative.
