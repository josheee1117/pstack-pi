---
name: pstack-create-verification-skill
disable-model-invocation: true
description: "Generate a project-local verification skill that drives the app the way a user does, for any language, framework, or platform. Use for /skill:pstack-create-verification-skill, 'make a verification skill for this repo', or when a project has no scripted way to prove UI, CLI, or service behavior. Records Launch, Doctor, Drive, Evidence, Cleanup, and a feature map."
---

# Create a verification skill

Every serious project needs a scripted way to drive the real app and prove behavior: launch it, exercise a feature the way a user would, capture evidence. This skill generates that as a project-local skill (`verify-<app>`) tailored to the repo. Write the generator's output for the next agent, not for a human: it will be read cold, mid-task, by an agent that has never seen the app.

## 1. Interview the repo, not the user

Answer these from the codebase, and ask only what you cannot observe:

- **Surface.** What does a user actually touch: a web UI, a CLI or TUI, a desktop app, an HTTP service, a mobile app, a library? A repo can have several. Pick the primary one and note the rest.
- **Run.** How does the app start locally? Prefer the repo's own documented dev command (package scripts, Makefile, README quickstart). Note ports, environment variables, seed data, and auth.
- **Drive.** How can an agent interact with it programmatically? Existing harnesses first: end-to-end specs, expect scripts, PTY helpers, curl-able endpoints, a debug port. Only then pick a generic recipe: a browser automation or debug protocol for web and desktop UIs, a terminal-multiplexer or PTY harness for a CLI or TUI, plain HTTP for a service.
- **Observe.** What evidence can be captured: screenshots, terminal transcripts, response bodies, logs, exit codes, database state.
- **Isolate.** Can two instances run side by side (ports, data directories, profiles)? If not, say so in the generated skill. Refusing to double-drive a shared instance beats corrupting the user's session.

If the checkout does not build or start as-is, fix that first, or report it precisely, before generating. A skill written against a broken base teaches wrong steps. When an irrelevant missing asset blocks startup (a static directory the API never serves, a sample config), the generated skill may create it, clearly marked as verification scaffolding, and remove it in cleanup.

## 2. Generate the skill

Write the generated skill into the **target project**, not into this package: `.pi/skills/verify-<app>/SKILL.md` at the project root. That is Pi's project skill directory, it travels with the project, and a package install never overwrites it.

- Default target: `<project>/.pi/skills/verify-<app>/`.
- A personal location (`~/.pi/agent/skills/verify-<app>/`) only when the user explicitly asks for one that applies to every project.
- Never write into an installed package's own `skills/` directory. A package install is replaced on update, and a generated skill there does not belong to the project it verifies.

Give `SKILL.md` frontmatter (`name: verify-<app>`, and a description naming the app, the surface, and when to reach for it) and these sections, each grounded in what the interview found, with no placeholders left:

- **Launch.** The exact command that starts the app for verification, and how to tell it is ready: a log line, a port answering, a prompt. Include teardown. For a short-lived CLI or TUI there is no server to keep alive, so launch means build the binary or install dependencies once, then start each drive in its own isolated session.
- **Doctor.** One read-only check answering "is this instance worth driving": process up, right build, port owned by us, auth valid. An agent runs it first whenever anything looks off.
- **Drive.** The harness recipe with real selectors and commands from this repo, not examples. Prefer stable handles (accessibility roles and names, data attributes, prompt strings, route paths) over coordinates and tab order.
- **Evidence.** What to capture for a proof and where it goes. State the proof standards: exercise the real user path, not internal setters or test-only endpoints; capture the action and the resulting state, not only the final screen; verify side effects (files written, rows inserted, messages sent) alongside what is visible; mock only where a production boundary already isolates the external system. When the safe path is a dry run or a test mode, verify what it actually skips by observing files, network, and refs, rather than trusting its name.
- **Cleanup.** How to tear down instances the run created. Never kill by process name; kill what you started. Cleanup removes instances and scratch state, never the evidence: proof artifacts survive teardown, in a location the skill names.
- **Helpers.** Any script the skill ships is executable, and its invocation appears in the skill body. A helper the reader has to reverse-engineer is not a helper.

## 3. Seed the feature map

Create `<project>/.pi/skills/verify-<app>/features/README.md`, beside the generated `SKILL.md`, plus one file per user-facing feature, starting with the top three to five from routes, commands, menus, or docs. Follow the shape in the example map, which ships a README index plus one file per feature.

Each feature file answers, from the user's point of view: what the feature is, how to reach it, how to drive it with the harness, and what observable end state proves it works. Start from [`references/feature-map-example/README.md`](references/feature-map-example/README.md) for the index shape. The four H2 sections are `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, and `Gotchas`. The map is the repo's maintained verification source. A proof that drives one convenient entry point is incomplete when the map lists others.

## 4. Prove the generated skill before handing it over

Run its own instructions end to end once: launch, doctor, drive one mapped feature (one is enough; the map exists so later runs cover the rest), capture evidence, clean up. After cleanup, confirm the evidence still exists at the named location. A cleanup that eats the proof fails this step. Fix what fails, and run the generated cleanup after every failed iteration too, so broken attempts do not strand processes and ports. **A generated skill that was never executed is a draft, not a deliverable.** If the surface cannot be driven at all in this environment, say so and mark the skill blocked rather than shipping an untested draft as working.

## 5. Offer the maintenance loop

Point the user at `pstack-maintain-verification-skill` for keeping the map honest as the app changes. Suggest a cadence only if they ask.
