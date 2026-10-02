import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSnapshot, commitSnapshot, renameSkill } from "../tools/sync-upstream.mjs";
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
  assert.throws(() => buildSnapshot(source, config, out, {}), /must be empty/);
  const escape = { ...config, drop: ["../outside"] };
  assert.throws(() => buildSnapshot(source, escape, join(source, "out"), {}), /safe relative path/);
});

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "pstack-sync-check-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, "init", "-q");
  git(dir, "config", "user.name", "Fixture");
  git(dir, "config", "user.email", "fixture@example.invalid");
  writeFileSync(join(dir, "local.txt"), "keep");
  git(dir, "add", ".");
  git(dir, "commit", "-qm", "local baseline");
  return dir;
}

test("--source --ref reads committed bytes, ignores dirty checkout, and refuses nonempty output", (t) => {
  const source = fixture(t);
  const root = join(source, "pstack");
  for (const d of ["skills/how", "agents", ".cursor-plugin"]) mkdirSync(join(root, d), { recursive: true });
  const skill = join(root, "skills/how/SKILL.md");
  writeFileSync(skill, '---\nname: how\ndescription: d\n---\nold body\n');
  writeFileSync(join(root, "agents/a.md"), "agent");
  writeFileSync(join(root, "LICENSE"), "MIT");
  writeFileSync(join(root, ".cursor-plugin/plugin.json"), '{"version":"1"}');
  git(source, "add", "."); git(source, "commit", "-qm", "old");
  const old = git(source, "rev-parse", "HEAD");
  writeFileSync(skill, readFileSync(skill, "utf8").replace("old body", "new body"));
  git(source, "commit", "-qam", "new");
  writeFileSync(skill, "uncommitted content");
  const output = join(source, "output");
  const cmd = [join(repoRoot, "tools/sync-upstream.mjs"), "--source", source, "--ref", old, "--dry-run", output];
  const before = git(source, "worktree", "list", "--porcelain");
  assert.equal(spawnSync(process.execPath, cmd, { encoding: "utf8" }).status, 0);
  assert.match(readFileSync(join(output, "skills/how/SKILL.md"), "utf8"), /old body/);
  assert.equal(readJson(join(output, "upstream.lock")).commit, old);
  assert.equal(readFileSync(skill, "utf8"), "uncommitted content");
  assert.equal(git(source, "worktree", "list", "--porcelain"), before);
  const retry = spawnSync(process.execPath, cmd, { encoding: "utf8" });
  assert.notEqual(retry.status, 0);
  assert.match(retry.stderr, /must be empty/);
  assert.equal(git(source, "worktree", "list", "--porcelain"), before);
});

test("imports keep branch ancestry and repeat imports are no-ops", (t) => {
  const repository = fixture(t);
  const snapshot = join(repository, "snapshot"); mkdirSync(snapshot);
  writeFileSync(join(snapshot, "upstream.lock"), '{"repo":"fixture","path":"pstack","commit":"1"}');
  writeFileSync(join(snapshot, "skill.md"), "first");
  const base = git(repository, "rev-parse", "HEAD");
  commitSnapshot(repository, snapshot, "first snapshot");
  const first = git(repository, "rev-parse", "upstream");
  commitSnapshot(repository, snapshot, "same snapshot");
  assert.equal(git(repository, "rev-parse", "upstream"), first);
  writeFileSync(join(snapshot, "skill.md"), "second");
  commitSnapshot(repository, snapshot, "second snapshot");
  assert.equal(git(repository, "rev-parse", "upstream^"), first);
  assert.equal(git(repository, "rev-parse", "HEAD"), base, "never changes caller's branch");
  assert.equal(readFileSync(join(repository, "local.txt"), "utf8"), "keep");
});

test("three-way integration preserves local text and leaves conflicts for review", (t) => {
  const repository = fixture(t);
  const snapshot = join(repository, "snapshot"); mkdirSync(snapshot);
  writeFileSync(join(snapshot, "upstream.lock"), '{"repo":"fixture","path":"pstack","commit":"1"}');
  const first = 'description: original\n\n# Skill\n\nOne\nTwo\nThree\nFour\nFive\n\nOld behavior\n';
  writeFileSync(join(snapshot, "skill.md"), first);
  commitSnapshot(repository, snapshot, "baseline");
  git(repository, "merge", "--allow-unrelated-histories", "--no-edit", "upstream");
  writeFileSync(join(repository, "skill.md"), first.replace("description: original", "description: 中文"));
  git(repository, "add", "skill.md"); git(repository, "commit", "-qm", "local translation");
  writeFileSync(join(snapshot, "skill.md"), first.replace("Old behavior", "New behavior"));
  commitSnapshot(repository, snapshot, "body update");
  git(repository, "merge", "--no-edit", "upstream");
  assert.match(readFileSync(join(repository, "skill.md"), "utf8"), /description: 中文[\s\S]*New behavior/);
  writeFileSync(join(snapshot, "skill.md"), first.replace("description: original", "description: changed upstream").replace("Old behavior", "New behavior"));
  commitSnapshot(repository, snapshot, "conflicting description");
  assert.throws(() => git(repository, "merge", "--no-edit", "upstream"));
  assert.match(git(repository, "diff", "--name-only", "--diff-filter=U"), /skill.md/);
  git(repository, "merge", "--abort");
  assert.match(readFileSync(join(repository, "skill.md"), "utf8"), /description: 中文/);
});

test("an unrelated upstream branch is preserved rather than overwritten", (t) => {
  const repository = fixture(t);
  git(repository, "branch", "upstream");
  const before = git(repository, "rev-parse", "upstream");
  assert.throws(() => commitSnapshot(repository, repository, "bad import"), /not a pstack snapshot/);
  assert.equal(git(repository, "rev-parse", "upstream"), before);
});
