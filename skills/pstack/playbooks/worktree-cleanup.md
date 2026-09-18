# Worktree and simulator cleanup

**You own the disk and the safety gate.** Prune merged or abandoned git worktrees and stale platform simulators to reclaim space. Deletion is irreversible, so every step guards against deleting something in use or holding uncommitted work.

This is the one playbook that deletes user state with no code review to catch a slip. The gates below are the review.

1. **Snapshot, then audit.** Record `df -h` for the volume that holds the worktrees. Enumerate from git, never from a hand-typed path:

   ```bash
   git worktree list --porcelain
   du -sh <each worktree path>
   git -C <path> status --porcelain | head -50
   git -C <path> log -1 --format='%cI %s'
   ```

   Classify each worktree: path, size, age, whether its branch is merged into trunk (`git merge-base --is-ancestor <branch> <trunk>` or an equivalent check), uncommitted tracked edits, untracked scratch files, and whether its branch has an open PR. A hand-typed `myrepo-worktrees/x` misses one that lives at `.worktrees/myrepo/x`, which is why the list comes from git ([encode-lessons-in-structure](../references/principles.md#encode-lessons-in-structure)).
2. **The classification is advice, not permission.** The pinned and active work is the real artifact ([prove-it-works](../references/principles.md#prove-it-works)). Get the set of worktrees the user is actively using, and cross-check every candidate against it. When the classification says `safe` and the user says in use, the user wins.
3. **Verify usage before deleting.** For anything doubtful, read the recent session records or ask. A session that spawns parallel work into sibling worktrees is using them even when their names never appear in a listing.
4. **Pause on irreversible loss.** Uncommitted tracked edits: show the diff and get a decision first, because removing a clean worktree is recoverable from its branch but uncommitted work is gone. Untracked scratch: safe to drop, but name the files. Per the entry skill's authorization rules, a clean, merged, unused worktree proceeds; uncommitted work and anything in use pause.
5. **Prune the confirmed set.** Per path, `git worktree remove --force <path>`. If the directory survives on ignored build artifacts, remove the leftover directory, then run `git worktree prune`. Branch refs survive, so no commits are lost. Confirm with `df -h` and re-list.
6. **Simulators and other reclaimers**, only on platforms that have them. Stale device clones, unavailable runtimes, derived data, device support directories, and package caches are usually the next-biggest wins. Clear only caches the user has not said to keep. Name each command and its effect before running it.

**Reply.** `df -h` before and after with the space reclaimed, the worktrees pruned, and a one-line reason for each held back: in use by what, or uncommitted work.
