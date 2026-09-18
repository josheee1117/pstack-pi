# Source recipes

One recipe per evidence category. Give an investigator the single recipe matching its category, adapted to the tool actually connected in this session. The recipes name example tools; the shape transfers to any equivalent.

A recipe always answers four things: what this source contains, how to search it, what good evidence looks like, and the pitfalls that produce false confidence.

## Source control history (git, forge CLI)

The most trustworthy source and the most complete. Commit messages, diffs, PR descriptions, review threads, inline comments, tests, changelogs, and any ticket ids referenced. Everything that went through the repo should be here.

Search: expand the seed commit list with `git log --follow`, `git log -S '<string>'` or `git log -G '<regex>'` to find the commit that added a specific value, `git blame -L`, `git show`. Pull PR context through the forge CLI. Look for out-of-band docs (ADR directories, `CHANGELOG`), and grep for `TODO|FIXME|HACK|NOTE` near the target.

Good evidence: a PR description explaining the problem solved, a long review thread where alternatives were debated, an inline comment at the target line explaining a non-obvious constraint, a test named for the edge case that motivated the code, a commit message referencing a ticket or incident.

Pitfalls: squash-merge repositories lose branch history, so fall back to the PR body. A commit message saying "small refactor" can hide an intentional behavior change, so read the diff. A pattern may be cargo-culted, so check whether it originated earlier and investigate that commit. Bot and auto-merge commits carry no motivation. Above all, **code itself is not evidence of its own intent**.

Deeper treatment: `code-archaeology.md`.

## Issue or ticket tracker (Linear, Jira, GitHub Issues, Plane, Shortcut)

Product and business context. Issue descriptions, comments recording decisions, parent and child relationships, project docs, labels, milestones, linked PRs.

Search: start from ticket ids in commits and PRs and fetch those fully, including comments. Then search by keyword, trying several phrasings. Walk child to parent, because parents carry the why. Read attached project docs. Check labels and milestones for the category of motivation.

Good evidence: an issue stating the business problem ("customer Acme needs X for their audit"), a comment recording a decision ("we went with B because A touches the billing service"), a parent issue titled like an initiative, an attached spec, labels like `customer:acme`, `incident-followup`, `compliance`.

Pitfalls: a ticket that was closed and reopened with a different scope, so read the whole history. Boilerplate "why" sections that say "improve user experience". Stale tickets reflecting a plan that changed, so cross-reference dates with the code's ship date. Duplicate chains, which you follow back to the canonical ticket. Private content you cannot access is a gap to record, not a guess.

## Long-form documents (Notion, Confluence, Google Docs, Coda)

Design rationale written before it became code. Design docs, RFCs, specs, meeting notes, postmortems.

Search: keyword plus symbol name plus feature name, across both titles and bodies. Check revision history for the decision point. Follow doc links.

Good evidence: a design doc with an explicit options table and a chosen option, an RFC with a "rejected alternatives" section, a meeting note recording the decision and who made it.

Pitfalls: docs that describe an intention that was never built, so check the date against the code. Docs that were superseded without being marked. Long documents where the rationale is in one paragraph, so read past the summary.

## Real-time team chat (Slack, Discord, Teams, Mattermost)

Deliberation that never reached a doc. Most valuable exactly when the other sources are thin.

Search: the symbol, feature, file name, incident id, or error string, restricted to a date range around the target's commits. Try the channel where the relevant team works. Read the whole thread, not the first message.

Good evidence: the author explaining a constraint in their own words, an incident discussion that names the code, a decision reached in a thread.

Pitfalls: partial threads that read as a decision when the decision came later, so check for replies. Jokes and hypotheticals quoted as rationale. Private channels you cannot read are a gap.

## Infrastructure observability (Datadog, New Relic, Honeycomb, Grafana, Splunk)

The runtime reality that motivated the code. Metrics, dashboards, monitors, traces, incidents.

Search: align a time window with the target's ship date. Look for monitors created around the same time (postmortem action items often become monitors). Query the metric or trace the code touches.

Good evidence: a monitor or dashboard created in the commit's aftermath, an incident whose timeline contains the change, a trace showing the pathology the code guards against.

Pitfalls: correlation mistaken for cause. A metric that moved in the same week for an unrelated reason. Dashboards that were created later to describe behavior rather than to motivate it.

## Error or exception tracking (Sentry, Rollbar, Bugsnag, Airbrake)

The specific exceptions that motivated defensive or corrective code. Strongest for catch blocks, null guards, retries, and type checks.

Search: the error string or symbol from the target. Compare first-seen and last-seen windows against the ship date. Read the stack trace to confirm it passes through the target.

Good evidence: an issue whose stack trace goes through the target line, first seen before the fix and last seen after it, with a resolution note.

Pitfalls: an error that resembles the target but whose stack does not reach it. Volume changes from traffic rather than from the code.

## Product analytics warehouse (Databricks, Snowflake, BigQuery, ClickHouse, dbt, Redshift)

The product and data reality that shaped flag-gated code, experiments, and migrations. Strongest for "where did this number come from" questions.

Search: the event names the code emits, the flag name, and the table the migration touches. Bound the query by a time window around the ship date. Report counts, percentiles, and first and last timestamps rather than a narrative.

Good evidence: an experiment table with the variant and its result, an event count that steps at the ship date, a migration record that explains a schema choice.

Pitfalls: table names that changed, so confirm the table existed at the time. Aggregates that hide a confound. Never report a number you did not run.

## Cross-cutting: incident and postmortem angle

Not a separate source. Add it when the target code looks defensive: null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, out-of-memory handlers. Defensive code is often the residue of an incident, and incident history is spread across every source above.

Hunt for: documents mentioning the target file, feature, or error string in a postmortem. Tickets labeled `incident`, `sev-*`, `postmortem-action-item`, `reliability`. Chat channels for incident coordination around the dates the code was added. Commits reading "fix for incident", "add defensive check", "revert" followed by "re-apply with". Incident records with timelines. Error-tracker issues whose window aligns with the PR's ship date and whose stack passes through the target. Analytics events classifying an error condition that spike in the incident window and drop after the fix.

When several sources corroborate the same incident, the evidence is especially strong. Skip this angle for code that does not look defensive.
