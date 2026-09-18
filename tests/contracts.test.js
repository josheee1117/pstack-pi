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
    .map((target) => target.split("#")[0])
    .filter((target) => target !== "");
}

test("every relative link in a skill file resolves to a file the package ships", () => {
  const broken = [];
  for (const file of markdownFiles()) {
    for (const target of relativeLinks(file)) {
      if (!existsSync(resolve(dirname(file), target))) {
        broken.push(`${file.replace(`${skillsDir}/`, "")} -> ${target}`);
      }
    }
  }
  assert.deepEqual(broken, [], "no skill links to a file that is not in the package");
});

test("every reference file is loaded by at least one skill body", () => {
  const referenced = new Set();
  for (const file of markdownFiles()) {
    for (const target of relativeLinks(file)) referenced.add(resolve(dirname(file), target));
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
    [/\bpi-subagents\b|\bpi\.subagents\b/, "a hard dependency on a subagent extension"],
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
