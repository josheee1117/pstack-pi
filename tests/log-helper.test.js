import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { skillsDir } from "./helpers.js";

const LOG_SH = join(skillsDir, "pstack-show-me-your-work", "scripts", "log.sh");
const HEADER = "ts\tphase\tdecision\twhy\tevidence\tresult\n";

/** Run the shipped helper against a temp file and return the log content. */
function runLog(tmp, args, name = "decisions.tsv") {
  execFileSync("bash", [LOG_SH, join(tmp, name), ...args], { stdio: ["ignore", "ignore", "pipe"] });
  return readFileSync(join(tmp, name), "utf8");
}

test("log.sh appends a well-formed row and writes the header on first use", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pstack-log-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));

  const content = runLog(tmp, ["frame", "counted the work first", "size before a long run", "commit 3a9f1c2", "found 5 things to sort out"]);
  const lines = content.split("\n");
  assert.equal(lines[0] + "\n", HEADER, "first line is the documented column header");
  assert.equal(lines.length, 3, "header plus one row plus the trailing newline");
  const cells = lines[1].split("\t");
  assert.equal(cells.length, 6, "the row has the six documented columns");
  assert.match(cells[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, "ts is an ISO8601 UTC timestamp");
  assert.deepEqual(cells.slice(1), [
    "frame",
    "counted the work first",
    "size before a long run",
    "commit 3a9f1c2",
    "found 5 things to sort out",
  ]);
});

test("log.sh keeps the header unique across appends", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pstack-log-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));

  runLog(tmp, ["first", "a", "b", "c", "d"]);
  const content = runLog(tmp, ["second", "e", "f", "g", "h"]);
  const lines = content.split("\n").filter((line) => line.length > 0);
  assert.equal(lines.length, 3, "two rows plus one header");
  assert.equal(lines.filter((line) => line === HEADER.trimEnd()).length, 1, "exactly one header row");
});

test("log.sh strips tabs, newlines, and CR so a dirty cell stays on one row", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pstack-log-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));

  const content = runLog(tmp, ["phase", "multi\tline\r\ncell", "why", "evi\tdence", "re\rsult"]);
  const rows = content.split("\n").filter((line) => line.length > 0);
  assert.equal(rows.length, 2, "the dirty cell does not split the row");
  const cells = rows[1].split("\t");
  // Each stripped byte (\t, \n, \r) becomes one space, so \r\n collapses to two.
  assert.deepEqual(cells.slice(1), ["phase", "multi line  cell", "why", "evi dence", "re sult"]);
});

test("log.sh prefixes a leading formula character with a single quote", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pstack-log-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));

  const content = runLog(tmp, ["=cmd|' !A1", "+add", "-rm", "@sum", "plain"]);
  const cells = content.split("\n")[1].split("\t");
  assert.deepEqual(
    cells.slice(1),
    ["'=cmd|' !A1", "'+add", "'-rm", "'@sum", "plain"],
    "every spreadsheet-formula prefix is escaped, plain cells are untouched",
  );
});

test("log.sh creates missing parent directories", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pstack-log-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));

  const content = runLog(tmp, ["a", "b", "c", "d", "e"], ".audit/task.tsv");
  assert.match(content, /^ts\t/, "the header lands in the freshly created directory");
});
