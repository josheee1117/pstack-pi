import assert from "node:assert/strict";
import { test } from "node:test";
import { dirname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { listFiles, skillsDir } from "./helpers.js";

function markdownFiles() {
  return listFiles(skillsDir, (f) => f.endsWith(".md"));
}

function relativeLinks(file) {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((target) => !/^(https?:|mailto:|#)/.test(target))
    .map((target) => ({ path: target.split("#")[0], anchor: target.split("#")[1] }))
    .filter((link) => link.path !== "");
}

/** GitHub-style heading slug, enough for the headings this package uses. */
function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function headingSlugs(file) {
  const slugs = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (heading) slugs.add(slugify(heading[1]));
  }
  return slugs;
}

test("every relative link in a skill file or nested prompt resolves to a file the package ships", () => {
  const broken = [];
  for (const file of markdownFiles()) {
    for (const link of relativeLinks(file)) {
      if (!existsSync(resolve(dirname(file), link.path))) {
        broken.push(`${file.replace(`${skillsDir}/`, "")} -> ${link.path}`);
      }
    }
  }
  assert.deepEqual(broken, [], "no skill or nested prompt links to a file that is not in the package");
});

test("every anchor in a relative link points at a heading that exists", () => {
  const broken = [];
  for (const file of markdownFiles()) {
    for (const link of relativeLinks(file)) {
      if (!link.anchor) continue;
      const target = resolve(dirname(file), link.path);
      if (!existsSync(target)) continue; // covered by the resolution test
      if (!headingSlugs(target).has(slugify(link.anchor))) {
        broken.push(`${file.replace(`${skillsDir}/`, "")} -> ${link.path}#${link.anchor}`);
      }
    }
  }
  assert.deepEqual(broken, [], "every anchor resolves to a real heading, including principle anchors");
});

test("the principle reference forms all resolve, from either base", () => {
  // A fresh-context reader has no hidden base, so the three relative forms the
  // package documents must each resolve from the file that uses them.
  const principles = resolve(skillsDir, "pstack", "references", "principles.md");
  assert.ok(existsSync(principles), "the shared principles reference ships");

  const entry = readFileSync(resolve(skillsDir, "pstack", "SKILL.md"), "utf8");
  assert.match(entry, /\]\(references\/principles\.md#/, "a file in the pstack skill root uses the skill-root form");

  const fromPlaybook = readFileSync(resolve(skillsDir, "pstack", "playbooks", "refactoring.md"), "utf8");
  assert.match(fromPlaybook, /\]\(\.\.\/references\/principles\.md#/, "a playbook uses the ../references form");

  const fromSibling = readFileSync(resolve(skillsDir, "pstack-arena", "SKILL.md"), "utf8");
  assert.match(
    fromSibling,
    /\]\(\.\.\/pstack\/references\/principles\.md#/,
    "a sibling skill uses the ../pstack/references form",
  );

  const fromNested = readFileSync(resolve(skillsDir, "pstack-architect", "references", "runner-prompt.md"), "utf8");
  assert.match(
    fromNested,
    /\]\(\.\.\/\.\.\/pstack\/references\/principles\.md#/,
    "a nested prompt uses the ../../pstack/references form",
  );
});

test("every reference file is loaded by at least one skill body", () => {
  const referenced = new Set();
  for (const file of markdownFiles()) {
    for (const link of relativeLinks(file)) referenced.add(resolve(dirname(file), link.path));
  }

  // A reference file nothing points at would never be read.
  const orphans = [];
  for (const file of markdownFiles()) {
    if (file.endsWith("SKILL.md")) continue;
    if (file.includes("/playbooks/")) continue;
    if (!referenced.has(file)) orphans.push(file.replace(`${skillsDir}/`, ""));
  }
  assert.deepEqual(orphans, [], "every non-playbook markdown file is referenced from a skill body");
});

test("no skill depends on a Cursor or Claude Code mechanism that does not exist here", () => {
  const forbidden = [
    [/subagent_type/, "Cursor subagent_type"],
    [/\bAskQuestion\b/, "Cursor AskQuestion"],
    [/~\/\.cursor\b/, "Cursor home paths"],
    [/cursor-team-kit/, "cursor-team-kit skills"],
    [/agent-transcripts/, "Cursor transcript directories"],
    [/\bcontrol-ui\b|\bcontrol-cli\b/, "cursor-team-kit control skills"],
    [/watch-pr/, "the GitHub-only PR watcher script"],
    [/pstack-models\.mdc/, "the Cursor model rule file"],
    [/run_in_background/, "Cursor task option"],
    [/environment: "cloud"|environment: cloud/, "Cursor cloud worker mode"],
    [/\/deslop\b/, "the Cursor deslop skill"],
    [/claude-fable|grok-4|gpt-5\.[0-9]|opus-5|fable-5|sol-max/, "hardcoded model ids"],
    [/\bbun scripts\/|orch\.ts/, "the removed orch store CLI"],
  ];

  const offenders = [];
  for (const file of markdownFiles()) {
    const text = readFileSync(file, "utf8");
    for (const [pattern, label] of forbidden) {
      const match = text.match(pattern);
      if (match) offenders.push(`${file.replace(`${skillsDir}/`, "")}: ${label} ("${match[0]}")`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("an optional tool is never stated as a required dependency", () => {
  // Naming an optional tool is fine. Asserting the package needs it is not.
  const required = [
    /requires? (the )?pi-subagents/i,
    /must install (the )?pi-subagents/i,
    /pi-subagents is required/i,
    /(the )?pi-subagents (extension|package) is required/i,
    /depend(s)? on pi-subagents/i,
  ];

  const offenders = [];
  for (const file of markdownFiles()) {
    const text = readFileSync(file, "utf8");
    for (const pattern of required) {
      const match = text.match(pattern);
      if (match) offenders.push(`${file.replace(`${skillsDir}/`, "")}: "${match[0]}"`);
    }
  }
  assert.deepEqual(offenders, [], "no skill states an optional extension as a requirement");
});

test("the package manifest declares no extension or subagent dependency", () => {
  const pkg = JSON.parse(readFileSync(resolve(skillsDir, "..", "package.json"), "utf8"));
  assert.equal(pkg.dependencies, undefined, "no runtime dependency is declared");
  assert.equal(pkg.pi.subagents, undefined, "no subagents schema is declared");
  assert.equal(pkg.pi.extensions, undefined, "no extension entry is declared");
});

test("the shared execution policy ships, and the skills that delegate point at it", () => {
  const policy = resolve(skillsDir, "pstack", "references", "execution.md");
  assert.ok(existsSync(policy), "the shared execution policy ships with the package");

  // This is the product default the package owes: the delegation and
  // replacement policy must be reachable from the entry and from every skill
  // that would delegate, substitute, or obtain an independent verdict. It
  // cannot live only in a project AGENTS.md, because a single /skill: call does
  // not load that file.
  const mustPoint = [
    "pstack",
    "pstack-swarm",
    "pstack-arena",
    "pstack-interrogate",
    "pstack-architect",
    "pstack-how",
    "pstack-why",
    "pstack-reflect",
    "pstack-no-comments",
    "pstack-recall",
  ];
  const playbooks = [
    "orchestrate",
    "autopilot-full",
    "autopilot-stack",
    "shipping",
    "eval",
    "bug-fix",
    "feature",
    "refactoring",
    "perf-issue",
    "hillclimb",
  ];

  const missing = [];
  for (const name of mustPoint) {
    const file = resolve(skillsDir, name, "SKILL.md");
    if (!readFileSync(file, "utf8").includes("references/execution.md")) missing.push(name);
  }
  for (const name of playbooks) {
    const file = resolve(skillsDir, "pstack", "playbooks", `${name}.md`);
    if (!readFileSync(file, "utf8").includes("references/execution.md")) missing.push(`playbooks/${name}.md`);
  }
  assert.deepEqual(missing, [], "every delegating skill points at the shared execution policy");

  const policyText = readFileSync(policy, "utf8");
  const required = [
    [/Herdr/, "the Herdr default is named"],
    [/pi-intercom/, "pi-intercom is named"],
    [/worktree/, "an exclusive worktree is required"],
    [/fresh-context subagent/, "the short-investigation path is named"],
    [/current request/, "the resolution order starts from the current request"],
    [/AGENTS\.md/, "the project mapping is read"],
    [/one model is not one context/i, "single model is not treated as single context"],
    [/Self-review is not independent review/, "self-review cannot stand in for independence"],
    [/pinned version|commit SHA/i, "the reviewer gets a pinned version"],
    [/missing|gap/i, "the missing-backend path is stated"],
    [/do not|do not switch/i, "backend switching is forbidden mid-task"],
  ];
  for (const [pattern, label] of required) {
    assert.match(policyText, pattern, label);
  }
});

test("the generated verification skill targets the using project, not this package", () => {
  const creator = readFileSync(resolve(skillsDir, "pstack-create-verification-skill", "SKILL.md"), "utf8");
  assert.match(
    creator,
    /`\.pi\/skills\/verify-<app>\/SKILL\.md`/,
    "the primary target is the project's .pi/skills directory",
  );
  assert.doesNotMatch(creator, /<skill root>/, "no undefined skill-root placeholder is used as a target");
  assert.doesNotMatch(creator, /node_modules/, "the generated skill is never written into an installed package");
  assert.match(creator, /explicitly asks/, "the personal location is opt-in only");

  const coverage = readFileSync(resolve(skillsDir, "..", "docs", "coverage.md"), "utf8");
  assert.match(coverage, /\.pi\/skills\/verify-<app>\//, "the coverage table states the same target");
  assert.doesNotMatch(coverage, /本包技能根目录下的/, "the coverage table no longer points at the package's own root");
});

test("a cadence is never promised without a mechanism that can fire it", () => {
  const offenders = [];
  for (const file of markdownFiles()) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/every (\d+) minutes/g)) {
      const window = text.slice(Math.max(0, match.index - 500), match.index + 500);
      const hasMechanism =
        /real timer|recurring wake|bounded poll|poll loop|bounded budget|no scheduler|nothing will fire|natural boundaries|wake mechanism/.test(
          window,
        );
      if (!hasMechanism) {
        offenders.push(`${file.replace(`${skillsDir}/`, "")}: "${match[0]}" with no mechanism in reach`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("no skill hardcodes a session directory", () => {
  const offenders = [];
  for (const file of markdownFiles()) {
    const text = readFileSync(file, "utf8");
    if (/\/\.pi\/agent\/sessions|sessions\/--/.test(text)) offenders.push(file.replace(`${skillsDir}/`, ""));
  }
  assert.deepEqual(offenders, []);
});
