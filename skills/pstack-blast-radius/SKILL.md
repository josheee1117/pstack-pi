---
name: pstack-blast-radius
description: "Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact its safety depends on by running code instead of writing it up. Use for 'blast radius of X', 'what could this break', or reviewing a small diff you do not trust."
---

# Blast radius

Find what a change breaks somewhere else, before it ships. Use it for "blast radius of X", "what could this break", or a small diff you do not trust yet.

Companion to `pstack-how` and `pstack-why`. `pstack-how` tells you what the code does. `pstack-why` tells you why it is shaped that way. Blast radius tells you what it breaks somewhere else.

Listing the callers is not the job. A text search finds those in seconds. The job is the breakage a search will not show you.

## Do not trust your own writeup

A blast-radius writeup that sounds right is worthless, because it reads as convincing whether or not it is true. So do not hand back only the writeup. Find the one or two facts the whole thing depends on and prove them by running code.

### How sure are you

For each fact the change's safety depends on, get it as far down this list as is cheap, and say where it stopped.

1. You said so. Worthless on its own.
2. You pointed at the line, a real `file:line` or the dependency's own source.
3. You showed the bad case cannot happen. You walked the failure step by step and it does not reach.
4. You ran it. A script or test that calls the real code and fails loudly if you are wrong.
5. You reproduced it in the running app.

Any safety fact you cannot get to step 4, say so. Do not write it up as settled. Step 4 is usually one small script that imports the same library the app ships and calls the exact function you are worried about.

## Steps

1. **Read the change.** The diff, the symbols it adds, changes, and deletes, and what it does differently, including the part the diff does not spell out. Use `pstack-why` step 2 to pull the PR and commits.
2. **Find the one fact it is safe because of.** Most changes that look risky are safe because of a single fact, such as "this call only drops already-dead cache entries and does nothing else". If that fact holds, most risky cases clear at once. Spend your time here, not on a long list of maybes.
3. **Look where the text search stops.** Read the source of the library you call, and check its pinned version and any local patch. Work out when things run: microtasks, unmount and teardown, the framework's effect ordering. Follow what a symbol search misses: the JSON an API returns, a database column, a wire format, another language reading the same bytes, a feature flag, code three hops downstream.
4. **Be honest about each risk.** Give it a real chance of happening and a real cost if it does. Keep the risks you confirmed. List the ones you checked and cleared separately. Cite a real `file:line`, note that a search finding nothing is still an answer, and never invent a caller or an API.
5. **Prove the one fact.** Write a script or test that runs the real code, run it, and paste what happened. If you cannot prove it cheaply, mark it unproven. Do not overstate.
6. **For a big or wide change, run it as an arena.** Ask several models the same question and merge the answers, per `pstack-arena`. Different models catch different real bugs.

## What to hand back

- **What it does.** What changed, including the part that is not obvious.
- **The one fact it is safe because of.** State it, say which step you got it to, and show the proof. If you could not prove it, write unproven.
- **Risks.** Only the real ones. Each names how it breaks, the `file:line`, how likely and how bad, and how to check it. Paste the proof for the ones that matter.
- **Cleared.** What you checked and why it is fine.
- **Before you merge.** The cheapest test or repro that catches the real bug, including the script you wrote.

Write it through `pstack-unslop`, cite real code, and strip anything private before it goes anywhere public.

**Reply.** The writeup above, with the one safety fact either proven or marked unproven.
