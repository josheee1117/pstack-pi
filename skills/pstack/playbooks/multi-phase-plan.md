# Multi-phase or multi-PR plan

**You own the plan, not the code. The plan is a checklist an owner runs box by box and the operator audits from the evidence.** The plan is the deliverable. Do not implement.

1. When the change is one or two files with an obvious approach, skip the plan. Say so and stop.
2. **Settle open questions by prototype before you write.** Run [prototype](prototype.md) for each. Keep the branch, the SHA, and the screenshots for Appendix A. Ask the operator only about a product or preference call no run can settle. Give options ([never-block-on-the-human](../references/principles.md#never-block-on-the-human)).
3. **Explore with fresh-context subagents** when the exploration is bulk or covers several areas ([guard-the-context-window](../references/principles.md#guard-the-context-window)). Each returns file pointers, conventions, test commands, and entry points. No inlined dumps. When no subagent mechanism exists, explore directly and keep the notes compact.
4. **Copy the skeleton below into the plan file and fill every placeholder.** Unless the operator names a path, write the file under `docs/` in the project. Keep every heading and sub-block in order. One section per PR. One PR is one change with its own evidence ([sequence-verifiable-units](../references/principles.md#sequence-verifiable-units)). Name the execution playbook in **How to read this**. A queue of independent PRs takes [autopilot-full](autopilot-full.md). A queue delivered as one reviewed stack takes [autopilot-stack](autopilot-stack.md). A standing program takes [orchestrate](orchestrate.md).
5. Write under `pstack-technical-writing` in full, then apply `pstack-unslop`. The body is one Diátaxis mode, how-to. Appendices hold explanation and reference. Each heading states the task or the finding. No em dashes. No mid-sentence colons.
6. **Verify the plan mechanically.** Walk every box and confirm it names its evidence, its command or driving path, and a pass predicate. A box without evidence is not a box. That check is the plan's own test, and it replaces a bespoke validator script.
7. **Hand back.** Post the plan path and the check result, then stop. Execution starts on the operator's explicit go, under the execution playbook the plan names.

## Verification rule

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked ([prove-it-works](../references/principles.md#prove-it-works)). That sentence is the rule and every verification block opens with it.

The live block is mandatory. It runs N independent lanes at the PR head, each driving the real surface through the project's verification harness (see `pstack-create-verification-skill`). Each lane is one box with a concrete scenario, the artifact it saves (screenshot, transcript, response body), and its pass predicate. One lane is the **Regression lane against trunk**: the same load-bearing scenario on trunk and head. If trunk does not have the feature, the lane records that fact and gates the behavior the diff adds plus the end state the user waits for, instead of inventing a trunk result.

The perf gate is dual-sided. Trunk and head must both produce the named metric. If trunk lacks the feature, also isolate the work the diff adds and set an absolute budget for that work plus the end-to-end state the user waits for. Do not claim a ratio between unlike scenarios.

A PR that changes an interaction is review-gated: the operator reviews it in chat with screenshots and a short video before merge. A PR that changes no interaction writes `**Review gate.** None. <PR id> is not review-gated.` and has no boxes under it.

**Surface selection.** Pick the harness by surface: a browser or desktop UI, a CLI or TUI, an HTTP service, a mobile app. A PR that touches two surfaces gets lanes on both. A surface with no harness is a risk in Appendix C, and its live block still names how each lane drives it, or says `blocked: no harness` with the reason.

```markdown
# <Program> plan

<Under ten lines. What changes, for whom, the rule the program enforces, and the PR ids in order.>

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists: a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs the <execution playbook> playbook. <Who merges, and which PR ids are the operator's items that stop at merge-ready.>

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] On the operator's go, register the program goal with this exact text. "<The plan path, the PR ids in order, the verification rule, who merges, and the done condition.>"
- [ ] Re-read these at every tick.
  - [ ] The execution playbook.
  - [ ] The `pstack-swarm` skill.
  - [ ] The project verification skill.
  - [ ] The `opening-a-pr` playbook.
  - [ ] <Each other skill the program uses.>
- [ ] Establish the audit cadence. Name the mechanism: a recurring wake the environment fires, or a bounded poll loop the root holds. If neither exists, write `audit cadence: natural boundaries only, no scheduler available` and audit at wave boundaries instead of claiming a tick.
- [ ] Use this audit prompt, verbatim. "Re-read the execution playbook and the registered goal. Check the operation against both and fix drift in this audit. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a status message to the operator, whether or not anything changed: the queue table of PR, owner, state, and head SHA, the verdicts since the last audit, what merged, open operator gates, and blockers."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] <PR id> and <PR id> are independent and first. Both branch from trunk.
  - [ ] <PR id> after <PR id>.
- [ ] Hold the file boundaries. <PR id or class> touches only `<glob>`.
- [ ] Hold the review gate. <PR ids> change an interaction. They wait for the operator's review before merge.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Use what the project's `AGENTS.md` declares, defaulting to `gh`. Record any fallback.
- [ ] Open the PR ready, never draft. A stack child targets its parent branch.
- [ ] Run the repo's lint and typecheck once before the PR-facing push.
- [ ] Run `pstack-unslop` over the diff before each commit and `pstack-no-comments` before review.
- [ ] Triage every review-bot and security-reviewer comment per the review-bot triage reference.
- [ ] Rebase onto current trunk before babysit and again before the merge-ready report.

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm. One gates lane. The live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh verification and a fresh verdict.
- [ ] <The merge or append rule from the execution playbook, with the patch-id rule from the `shipping` playbook.>

### Boot recipe, for every live lane

Each live lane runs on its own instance of the app at the PR head, driven through the project verification skill.

- [ ] `git fetch <remote> <head-branch> && git checkout <head SHA>`.
- [ ] <Start the backend and the surface. Wait for ready.>
- [ ] <Deliver input only through the harness. Name the read-only diagnostics.>
- [ ] Save every artifact to a run-scoped directory and return the paths with the report.

## <Task as a verb phrase> (<PR id>)

**Depends on.** <PR id, or None.>

**Files.**

- [ ] Edit `<path>`.
- [ ] Create `<path>`.
- [ ] Delete `<path>`.

**Build.**

- [ ] <One change. Name the symbol and the file.>

**You see.**

- [ ] <One observable result, with the exact log line or screen state.>

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] <Test file and the case it gains.> Run `<command>`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. N lanes at the PR head through the project verification harness, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run <the same load-bearing scenario> at trunk and head. If trunk lacks the feature, record that and gate <the behavior the diff adds plus the end state the user waits for>. Save `<artifact>`. Pass when <predicate>.
- [ ] Lane 2. <Scenario.> Save `<artifact>`. Pass when <predicate>.
- [ ] Lane 3. <Scenario.> Save `<artifact>`. Pass when <predicate>.
- [ ] <As many lanes as the change needs.>

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. <What is measured at both trunk and head. If trunk lacks the feature, also name the diff-added work and the end-to-end state the user waits for.>
- [ ] Probe. <The command or procedure, run at trunk and at the head, interleaved. Both sides must produce the metric.>
- [ ] Baseline. Record the trunk <value> first.
- [ ] Rule. <Head against trunk, with the number that fails. If the scenarios differ, add absolute budgets instead of an invalid ratio.>

**Review gate.** The operator reviews before merge.

- [ ] Copy the lane screenshots into `<media path>/<pr-id>-review-<slug>.png`.
- [ ] Record a 30 to 60 second video of the change. Save it as `<media path>/<pr-id>-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready and wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Review-bot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] <The owner squash-merges its own PR, or the root appends it to the base-branch stack and the operator lands it bottom-up.>

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

<Each open question a prototype answered, with the branch, the SHA, and the artifact links. Each question that stays unproven.>

## Appendix B. Alternatives rejected

<Each approach weighed and why it lost.>

## Appendix C. Risks

<Each risk with the PR it lands in and what the owner watches. Include any surface with no driving harness.>

## Appendix D. Links and reading list

<Docs to read before editing. Which PRs get `pstack-how` and `pstack-interrogate`. The trail per `pstack-show-me-your-work`.>
```

**Reply.** The plan path, the PR ids with their dependencies and the review-gated set, what the prototypes proved and what stays unproven, and the box check's output.
