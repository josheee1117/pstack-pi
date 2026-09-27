import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSnapshot, renameSkill } from "../tools/sync-upstream.mjs";
import { readJson, repoRoot } from "./helpers.js";

const config = readJson(join(repoRoot, "upstream.json"));

test("renameSkill rewrites only the name line of the frontmatter", () => {
  const src = '---\nname: Poteto Mode\ndescription: "x"\nmode: true\n---\n\nname: body text stays\n';
  const out = renameSkill(src, "poteto-mode", config);
  assert.equal(out, '---\nname: pstack\ndescription: "x"\nmode: true\n---\n\nname: body text stays\n');
  assert.match(renameSkill(src, "how", config), /^---\nname: pstack-how\n/);
  assert.match(renameSkill(src, "teach", config), /^---\nname: pstack-teach-me\n/);
  assert.throws(() => renameSkill("no frontmatter", "how", config), /no frontmatter/);
});

test("buildSnapshot copies, drops, renames, and pins the commit", () => {
  const source = mkdtempSync(join(tmpdir(), "pstack-src-"));
  const root = join(source, config.path);
  for (const dir of ["how", "make-bot-ui", "poteto-mode"]) {
    mkdirSync(join(root, "skills", dir), { recursive: true });
    writeFileSync(join(root, "skills", dir, "SKILL.md"), `---\nname: ${dir}\ndescription: "d"\n---\nbody\n`);
  }
  mkdirSync(join(root, "agents"), { recursive: true });
  writeFileSync(join(root, "agents", "a.md"), "agent");
  writeFileSync(join(root, "LICENSE"), "MIT");

  const out = mkdtempSync(join(tmpdir(), "pstack-out-"));
  buildSnapshot(source, config, out, { commit: "abc" });

  assert.match(readFileSync(join(out, "skills", "how", "SKILL.md"), "utf8"), /name: pstack-how/);
  assert.match(readFileSync(join(out, "skills", "poteto-mode", "SKILL.md"), "utf8"), /name: pstack\n/);
  assert.throws(() => readFileSync(join(out, "skills", "make-bot-ui", "SKILL.md")), "make-bot-ui is dropped");
  assert.equal(readFileSync(join(out, "LICENSE.upstream"), "utf8"), "MIT");
  assert.equal(readFileSync(join(out, "agents", "a.md"), "utf8"), "agent");
  assert.deepEqual(readJson(join(out, "upstream.lock")), { commit: "abc" });
});
