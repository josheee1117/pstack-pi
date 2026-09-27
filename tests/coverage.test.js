import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expectedName, repoRoot, skillDirsOnDisk } from "./helpers.js";

const coverage = readFileSync(join(repoRoot, "docs", "coverage.md"), "utf8");

test("the coverage table has a row for every shipped skill, under the name users type", () => {
  for (const dir of skillDirsOnDisk()) {
    if (dir.startsWith("principle-")) continue;
    assert.ok(coverage.includes(`\`/skill:${expectedName(dir)}\``), `${dir} has a row naming /skill:${expectedName(dir)}`);
  }
  assert.match(coverage, /principle-/, "the principles are covered");
});

test("the coverage table says what was removed and why", () => {
  assert.match(coverage, /make-bot-ui/);
});

test("the coverage table is reachable from the README", () => {
  assert.match(readFileSync(join(repoRoot, "README.md"), "utf8"), /docs\/coverage\.md/);
});
