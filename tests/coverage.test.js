import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  expectedPublicSkills,
  repoRoot,
  skillNamesOnDisk,
  skillsDir,
  upstreamPlaybooks,
  upstreamPrinciples,
  upstreamPublicSkills,
} from "./helpers.js";

const coveragePath = join(repoRoot, "docs", "coverage.md");

function coverageRows() {
  const rows = [];
  for (const line of readFileSync(coveragePath, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    if (cells[1] === "类型") continue; // header row
    if (cells.every((c) => /^[-:\s]*$/.test(c))) continue; // separator row
    rows.push({ upstream: cells[0].replaceAll("`", ""), disposition: cells[2], note: cells[3] });
  }
  return rows;
}

const backticked = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

test("the coverage table accounts for every upstream public skill, playbook, and principle", () => {
  const rows = coverageRows();
  assert.ok(rows.length > 60, `coverage table has rows (found ${rows.length})`);

  const names = new Set(rows.map((r) => r.upstream));
  const missing = [];
  for (const name of upstreamPublicSkills) if (!names.has(name)) missing.push(name);
  for (const name of upstreamPlaybooks) if (!names.has(name)) missing.push(name);
  for (const name of upstreamPrinciples) if (!names.has(`principle-${name}`)) missing.push(`principle-${name}`);
  assert.deepEqual(missing, [], "every upstream artifact has a coverage row");
});

test("every path the coverage table delivers exists", () => {
  const missing = [];
  for (const row of coverageRows()) {
    if (/未移植|未打包/.test(row.disposition)) continue;
    for (const token of backticked(row.disposition)) {
      if (token.includes("*") || token.startsWith("~") || token.startsWith("/")) continue;
      const path = token.split("#")[0];
      if (!path || path.includes(" ")) continue;
      if (!existsSync(join(repoRoot, path))) missing.push(`${row.upstream} -> ${token}`);
    }
  }
  assert.deepEqual(missing, [], "coverage rows point at files that exist");
});

test("the coverage table's delivered skills match the skills on disk", () => {
  const claimed = new Set();
  for (const row of coverageRows()) {
    if (/未移植|未打包|参考文件|原则|playbook/.test(row.disposition)) continue;
    for (const token of backticked(row.disposition)) {
      if (token.startsWith("skills/")) claimed.add(token.split("/")[1]);
    }
  }
  assert.deepEqual([...claimed].sort(), expectedPublicSkills);
  assert.deepEqual(skillNamesOnDisk(), expectedPublicSkills);
});

test("every upstream disposition is either a delivered path or an explicit exclusion", () => {
  const bad = [];
  for (const row of coverageRows()) {
    if (/未移植|未打包/.test(row.disposition)) continue;
    const paths = backticked(row.disposition).filter((t) => t.includes("/") || /\.(md|json|tsv)$/.test(t));
    if (paths.length === 0) bad.push(`${row.upstream}: disposition has no path`);
  }
  assert.deepEqual(bad, []);
});

test("the coverage table is reachable from the README", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  assert.match(readme, /docs\/coverage\.md/, "the README points at the coverage table");
  assert.ok(existsSync(join(skillsDir, "pstack", "references", "principles.md")));
});
