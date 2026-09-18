# Code archaeology (git and in-repo)

The always-available source, in more depth than the summary in [sources.md](sources.md).

## What this source contains

- Commit history: messages, dates, authors, diffs.
- PR descriptions, review comments, and discussion threads, through the forge CLI.
- Inline code comments, TODOs, FIXMEs, deprecation notes.
- Architecture decision records, if the repo keeps them.
- Tests. Names and assertions often encode the edge case that motivated a change.
- Related files modified in the same commits, which is a co-change signal.
- Changelog and release notes in the repo.
- Ticket ids mentioned in commit messages and PR bodies.

This is the most trustworthy source because it is tied directly to the code, and the most complete: anything that went through the repo should be here.

## How to search it

```bash
# Full history of the file through renames
git log --follow --oneline -- <file>

# Pickaxe: commits that added or removed this exact text
git log -S '<exact_string_from_code>' -- <file>

# Or by pattern
git log -G '<regex>' -- <file>

# Who wrote each line and when
git blame -L <start>,<end> <file>

# The full diff of one commit
git show <hash>

# Commits between two points affecting this file
git log <old>..<new> -p -- <file>
```

For each substantive commit, pull the PR context:

```bash
git log -1 --format=%B <hash>
gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews,files
```

The `reviews` and `comments` fields are where the real signal usually is.

Look for out-of-band docs and anchors:

```bash
# ADRs often live in docs/adr or similar
rg -l -i 'architecture.decision' --glob '*.md'
rg -n -C2 '(TODO|FIXME|HACK|XXX|NOTE)' <target_file>
rg -l '<symbol>' --glob '*test*'
```

## What good evidence looks like here

- A PR description that explains the problem being solved, not just the change.
- A long review thread where alternatives were debated.
- An inline comment near the target line explaining a non-obvious constraint.
- A test named for the edge case that motivated the code.
- A commit message referencing a ticket or incident id.
- A changelog entry summarizing the user-visible rationale.

## Pitfalls

- **Squash-merge flatlands.** If the repo squashes PRs, individual branch commits are lost. Fall back to the PR body and comments.
- **Misleading commit messages.** "Small refactor" sometimes hides an intentional behavior change. Read the diff, not the message.
- **Cargo-culted patterns.** The author may have copied a pattern without understanding it. Check whether it originated earlier in the codebase and investigate that commit.
- **Bot commits and auto-merges.** Dependency bumps and automated backports carry no motivation. Skip them when looking for intent.
- **Treating code as evidence of intent.** Evidence comes from messages, PRs, comments, tests, and docs. "The function is named X" is not evidence of why it exists.

## What to return

Every commit, PR, or comment that bears on the question, with the exact text quoted, the hash, PR number, or `file:line`, the author and date, and whether it is direct (explicitly addresses the question) or circumstantial.
