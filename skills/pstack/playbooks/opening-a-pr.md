# Opening a PR

Invoked at the end of every other playbook, and only when the user authorized a PR. Without that authorization, stop at a verified change on your own branch and report.

**Worktree.** Work from a git worktree off the trunk branch. Subagents inherit it. Multiple writers on the same branch each get their own worktree, or fetch and reset between them. A dirty branch with unrelated work: patch the unrelated change out, start a fresh worktree, apply the change. A snarled worktree: reset from the trunk branch and redo minimally.

**Commits.** Commit liberally while working. Rebase into small, ordered commits before opening PRs. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit. Add a new commit when it is separable.

**Prose.** Write every PR title, PR description, and commit body with `pstack-technical-writing`, then apply `pstack-unslop`. Apply every technical-writing layer except Diátaxis. One word per action, keep the articles, avoid `-ing` when a plain verb works. `pstack-unslop` cleans writing only. For code, run the repo's own lint, format, and type checks, and keep the diff to the smallest change that solves the problem.

**Titles.** Conventional Commits form `type(scope): subject`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`. Scope is the changed area. The subject is short and imperative. Name a real symbol when one carries the change. No trailing period.

**Descriptions.** The PR body is a briefing, not the lab notebook. A reviewer who has the diff learns why the change exists, what is out of scope, and how you proved it works. The squash commit body is the PR body. If the body would push the squash commit past roughly 40 lines, cut the body.

Use these sections in order. Drop a section with nothing to say.

- `## Why`. The intent and approach in one or two short paragraphs. No SHA lists, no rebase genealogy, no "based on trunk" preamble.
- `## Scope`. Bullets naming real symbols and paths. Name both sides of a rename or retarget. State what is in and out only when the boundary matters. No file-by-file essay.
- `## Tradeoffs`. Only rejected alternatives a reviewer would otherwise ask about. Skip when there was no real choice.
- `## Blast Radius`. One to three sentences. Who or what the change touches and why it is safe or risky. State the continuing cost if trunk stays red without the fix.
- `## Verification`. Each real run path and its outcome. For a performance change, one primary number in `before -> after` form. Link the arena or swarm directory for the rest. No sample-size methodology, no lane recitals, no metric tables.

After those sections, attach videos or screenshots when they prove a claim. Do not paste full SHAs, lane recitals, file-by-file checklists, or `CLEAN` verdicts. Put those in a linked artifact. No `## Summary` or `## Test plan` boilerplate. A commit body does not restate its subject.

**Forge.** Resolve the forge before the first PR operation and keep that choice for create, edit, view, watch, and merge. Use what the project's `AGENTS.md` declares, defaulting to the GitHub CLI (`gh`). Record the fallback when it is unavailable. Do not require a stacking tool.

**Size and stacks.** Prefer five narrow PRs to one large PR. A stack is a base-branch chain: the root PR targets trunk, each child branch rebases onto its parent's exact tip and its PR targets the parent branch. Branch from trunk only for independent work. Rebase on trunk before substantial stack work.

**Readiness.** Open every PR ready, never as a draft. If a tool defaults to draft, set it ready immediately. Run `gh pr view <number>` before you refer to any PR's status.

**Babysit.** Opening a PR does not start a babysit. Post the URL and keep building. Finish the phase or stack first. Run a separate babysit pass only when the user asks for one after the whole stack exists. A babysit for each new PR stalls the build and spends checks on commits that later waves restart.

A subagent that opens a PR runs `pstack-interrogate`, `pstack-unslop`, and `pstack-no-comments` first. It returns the URL and does not babysit. Then it returns to the parent.
