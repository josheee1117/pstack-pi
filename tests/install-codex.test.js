import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { repoRoot } from "./helpers.js";

const script = join(repoRoot, "tools", "install-codex.mjs");
const BLOCK_BEGIN = "<!-- pstack:begin";
const BLOCK_END = "<!-- pstack:end -->";

const lexists = (path) => {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
};
const run = (args, env = {}) => execFileSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, ...env } });

const skillCount = ["skills", "local-skills"]
  .flatMap((dir) => readdirSync(join(repoRoot, dir)).map((name) => join(repoRoot, dir, name)))
  .filter((dir) => existsSync(join(dir, "SKILL.md"))).length;

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), "pstack-codex-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const codex = join(base, "codex");
  return {
    base,
    codex,
    skills: join(codex, "skills"),
    agents: join(codex, "AGENTS.md"),
    adapter: join(codex, "pstack", "codex.md"),
    args: ["--codex-home", codex],
  };
}

test("links every packaged skill by its registered id and renders the adapter", (t) => {
  const f = fixture(t);
  run(f.args);

  const entries = readdirSync(f.skills, { withFileTypes: true });
  assert.equal(entries.length, skillCount, "one link per packaged skill");
  assert.ok(entries.every((entry) => entry.isSymbolicLink()), "every skill entry is a symlink");
  const link = (id) => resolve(f.skills, readlinkSync(join(f.skills, id)));
  assert.equal(link("pstack"), join(repoRoot, "skills", "poteto-mode"));
  assert.equal(link("pstack-setup"), join(repoRoot, "skills", "setup-pstack"));
  assert.equal(link("pstack-teach-me"), join(repoRoot, "skills", "teach"));
  assert.equal(link("pstack-report"), join(repoRoot, "local-skills", "pstack-report"));
  assert.ok(existsSync(join(f.skills, "pstack-how", "SKILL.md")));

  const adapter = readFileSync(f.adapter, "utf8");
  assert.ok(adapter.includes(resolve(repoRoot)), "the adapter names the package root");
  assert.doesNotMatch(adapter, /\{\{/, "the installer resolved every placeholder");

  const manifest = JSON.parse(readFileSync(join(f.codex, ".pstack-install.json"), "utf8"));
  assert.equal(manifest.name, "pstack");
  assert.equal(manifest.root, repoRoot);
  assert.equal(resolve(manifest.links.find((entry) => entry.path === "skills/pstack").target), join(repoRoot, "skills", "poteto-mode"));
});

test("writes a marked block into AGENTS.md, creating the file with no leftover placeholders", (t) => {
  const f = fixture(t);
  run(f.args);

  const text = readFileSync(f.agents, "utf8");
  assert.equal(text.split(BLOCK_BEGIN).length, 2, "exactly one managed block");
  assert.equal(text.split(BLOCK_END).length, 2);
  assert.ok(text.includes(f.adapter), "the block names the rendered adapter");
  assert.ok(text.includes(join(resolve(repoRoot), "adapter", "overrides.md")), "the block names the overrides");
  assert.ok(text.includes("pstack-<名>"), "the block names the skill ids");
  assert.doesNotMatch(text, /\{\{/, "the block has machine paths, not placeholders");
});

test("a second run changes nothing", (t) => {
  const f = fixture(t);
  run(f.args);
  const paths = [f.agents, f.adapter, join(f.codex, ".pstack-install.json"), ...readdirSync(f.skills).map((name) => join(f.skills, name))];
  const snapshot = () => paths.map((path) => {
    const stat = lstatSync(path);
    return [path, stat.mtimeMs, stat.isSymbolicLink() ? readlinkSync(path) : readFileSync(path, "utf8")];
  });
  const before = snapshot();
  const output = run(f.args);
  assert.deepEqual(snapshot(), before);
  assert.match(output, /up to date/);
});

test("a rerun removes links for skills that left the package and leaves other entries alone", (t) => {
  const f = fixture(t);
  run(f.args);
  symlinkSync(join(repoRoot, "skills", "gone"), join(f.skills, "pstack-gone"));
  symlinkSync(join(f.base, "other-skill"), join(f.skills, "someone-else"));
  mkdirSync(join(f.skills, "hand-written"));

  run(f.args);
  assert.equal(lexists(join(f.skills, "pstack-gone")), false, "the stale pstack link is gone");
  assert.ok(lstatSync(join(f.skills, "someone-else")).isSymbolicLink(), "a foreign link is not this installer's to remove");
  assert.ok(lstatSync(join(f.skills, "hand-written")).isDirectory(), "a foreign directory stays");
});

test("refuses to install over a skill entry this installer did not create", (t) => {
  const f = fixture(t);
  mkdirSync(join(f.skills, "pstack-how"), { recursive: true });
  writeFileSync(join(f.skills, "pstack-how", "SKILL.md"), "mine\n");

  assert.throws(() => run(f.args), (error) => {
    assert.notEqual(error.status, 0);
    assert.match(error.stderr, /skills\/pstack-how/);
    return true;
  });

  assert.equal(readFileSync(join(f.skills, "pstack-how", "SKILL.md"), "utf8"), "mine\n");
  assert.equal(lexists(f.agents), false, "nothing was written before the check");
  assert.equal(lexists(f.adapter), false);
  assert.equal(lexists(join(f.codex, ".pstack-install.json")), false);
});

test("refuses to install over a skill symlink that is not this installer's", (t) => {
  const f = fixture(t);
  const elsewhere = join(f.base, "other-skill");
  mkdirSync(elsewhere);
  mkdirSync(f.skills, { recursive: true });
  symlinkSync(elsewhere, join(f.skills, "pstack-how"));

  assert.throws(() => run(f.args), (error) => {
    assert.notEqual(error.status, 0);
    assert.match(error.stderr, /skills\/pstack-how/);
    return true;
  });
  assert.equal(resolve(readlinkSync(join(f.skills, "pstack-how"))), elsewhere);
  assert.equal(lexists(f.agents), false);
});

test("refuses a file whose managed block markers do not pair up", (t) => {
  const f = fixture(t);
  mkdirSync(f.codex, { recursive: true });
  writeFileSync(f.agents, `keep me\n\n${BLOCK_BEGIN} (managed) -->\nhalf a block\n`);

  assert.throws(() => run(f.args), (error) => {
    assert.notEqual(error.status, 0);
    assert.match(error.stderr, /AGENTS\.md/);
    return true;
  });
  assert.equal(readFileSync(f.agents, "utf8"), `keep me\n\n${BLOCK_BEGIN} (managed) -->\nhalf a block\n`);
  assert.equal(lexists(join(f.codex, ".pstack-install.json")), false);
});

test("keeps every byte outside the managed block, and restores the file on uninstall", (t) => {
  const f = fixture(t);
  mkdirSync(f.codex, { recursive: true });
  const original = "# 我的规则\n\n- 先看懂再动手。\n";
  writeFileSync(f.agents, original);

  run(f.args);
  const installed = readFileSync(f.agents, "utf8");
  assert.ok(installed.startsWith(original), "the user's text is still the file's first bytes");
  assert.ok(installed.includes(BLOCK_BEGIN), "the block was appended");

  const userTail = "\n## 追加的规则\n\n- 保留这一行。\n";
  writeFileSync(f.agents, installed + userTail);
  run(f.args);
  const rewritten = readFileSync(f.agents, "utf8");
  assert.ok(rewritten.startsWith(original), "a rerun does not move the user's text");
  assert.ok(rewritten.endsWith(userTail), "a rerun replaces the block in place and leaves the tail");

  run([...f.args, "--uninstall"]);
  assert.equal(readFileSync(f.agents, "utf8"), original + userTail, "uninstall removes only the block");
});

test("uninstall removes what the installer wrote and keeps everything else", (t) => {
  const f = fixture(t);
  run(f.args);
  const foreignSkill = join(f.base, "someone-else");
  mkdirSync(foreignSkill);
  symlinkSync(foreignSkill, join(f.skills, "someone-else"));
  const note = join(f.codex, "pstack", "note.md");
  writeFileSync(note, "mine\n");
  const stale = join(f.skills, "pstack-gone");
  symlinkSync(join(repoRoot, "skills", "gone"), stale);

  run([...f.args, "--uninstall"]);

  assert.equal(lexists(join(f.skills, "pstack-how")), false);
  assert.equal(lexists(join(f.skills, "pstack")), false);
  assert.equal(lexists(stale), false, "a leftover package link is still this installer's");
  assert.ok(lstatSync(join(f.skills, "someone-else")).isSymbolicLink(), "a foreign link stays");
  assert.equal(lexists(f.agents), false, "the file was created for the block, so it goes too");
  assert.equal(lexists(f.adapter), false);
  assert.equal(readFileSync(note, "utf8"), "mine\n", "a file the user added stays");
  assert.ok(lstatSync(join(f.codex, "pstack")).isDirectory(), "the directory stays while it holds a user file");
  assert.equal(lexists(join(f.codex, ".pstack-install.json")), false);
});

test("uninstall leaves a recorded link alone once it points somewhere else", (t) => {
  const f = fixture(t);
  run(f.args);
  const link = join(f.skills, "pstack-how");
  rmSync(link);
  const elsewhere = join(f.base, "replacement");
  mkdirSync(elsewhere);
  symlinkSync(elsewhere, link);

  const output = run([...f.args, "--uninstall"]);
  assert.match(output, /skip .*pstack-how.*no longer points to/);
  assert.equal(resolve(readlinkSync(link)), elsewhere);
});

test("dry run prints the plan and writes nothing", (t) => {
  const f = fixture(t);
  const output = run([...f.args, "--dry-run"]);

  assert.match(output, /\[dry-run\]/);
  assert.match(output, /link .*skills\/pstack/);
  assert.equal(lexists(f.codex), false, "no codex home content");
});

test("defaults the codex home to $CODEX_HOME", (t) => {
  const f = fixture(t);
  run([], { CODEX_HOME: f.codex });
  assert.ok(existsSync(join(f.skills, "pstack-how", "SKILL.md")));
  assert.ok(existsSync(f.agents));
});
