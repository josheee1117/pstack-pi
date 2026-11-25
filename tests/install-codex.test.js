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

// A package small enough to change between runs: the installer only reads
// SKILL.md files and the adapter template.
function packageWith(base, skills) {
  const root = join(base, "package");
  mkdirSync(join(root, "adapter"), { recursive: true });
  writeFileSync(join(root, "adapter", "codex.md"), "codex adapter for {{root}}\n");
  for (const [dir, name] of skills) {
    mkdirSync(join(root, "skills", dir), { recursive: true });
    writeFileSync(join(root, "skills", dir, "SKILL.md"), `---\nname: ${name}\n---\n\n${name} body\n`);
  }
  return root;
}

test("installs every packaged skill, keeping only the entry in Codex's automatic catalog", (t) => {
  const f = fixture(t);
  run(f.args);

  const ids = readdirSync(f.skills).sort();
  assert.equal(ids.length, skillCount, "one entry per packaged skill");

  // The entry stays a plain link, so Codex keeps listing it in the catalog.
  assert.ok(lstatSync(join(f.skills, "pstack")).isSymbolicLink());
  assert.equal(resolve(f.skills, readlinkSync(join(f.skills, "pstack"))), join(repoRoot, "skills", "poteto-mode"));

  // Every other skill is a real directory: Codex reads agents/openai.yaml from
  // the skill's own directory, and the package directories are upstream files.
  for (const id of ids.filter((id) => id !== "pstack")) {
    const dir = join(f.skills, id);
    assert.ok(lstatSync(dir).isDirectory(), `${id} is a real directory`);
    assert.ok(lstatSync(join(dir, "SKILL.md")).isFile(), `${id}/SKILL.md is a real file`);
    assert.equal(readFileSync(join(dir, "agents", "openai.yaml"), "utf8"), "policy:\n  allow_implicit_invocation: false\n", `${id} keeps itself out of the catalog`);
  }
  assert.equal(readFileSync(join(f.skills, "pstack-how", "SKILL.md"), "utf8"), readFileSync(join(repoRoot, "skills", "how", "SKILL.md"), "utf8"), "the copied body is the package's");

  const link = (id, name) => resolve(f.skills, readlinkSync(join(f.skills, id, name)));
  assert.ok(lstatSync(join(f.skills, "pstack-setup", "SKILL.md")).isFile(), "a wrapper body is copied, not linked");
  assert.equal(link("pstack-show-me-your-work", "scripts"), join(repoRoot, "skills", "show-me-your-work", "scripts"));
  assert.ok(existsSync(join(f.skills, "pstack-show-me-your-work", "scripts")), "a skill's other files are reachable through the wrapper");
  assert.ok(existsSync(join(f.skills, "pstack", "playbooks", "bug-fix.md")), "the entry skill's playbooks stay reachable");

  const adapter = readFileSync(f.adapter, "utf8");
  assert.ok(adapter.includes(resolve(repoRoot)), "the adapter names the package root");
  assert.doesNotMatch(adapter, /\{\{/, "the installer resolved every placeholder");

  const manifest = JSON.parse(readFileSync(join(f.codex, ".pstack-install.json"), "utf8"));
  assert.equal(manifest.name, "pstack");
  assert.equal(manifest.root, repoRoot);
  assert.equal(resolve(manifest.links.find((entry) => entry.path === "skills/pstack").target), join(repoRoot, "skills", "poteto-mode"));
  assert.ok(manifest.files.some((entry) => entry.path === "skills/pstack-how/SKILL.md"), "the copied SKILL.md is recorded");
  assert.ok(manifest.files.some((entry) => entry.path === "skills/pstack-how/agents/openai.yaml"), "the generated policy file is recorded");
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
  const snapshot = () => {
    const entries = [];
    const walk = (path) => {
      const stat = lstatSync(path);
      entries.push([path, stat.mtimeMs, stat.isSymbolicLink() ? `link ${readlinkSync(path)}` : stat.isDirectory() ? "dir" : readFileSync(path, "utf8")]);
      if (stat.isDirectory()) for (const name of readdirSync(path).sort()) walk(join(path, name));
    };
    walk(f.codex);
    return entries;
  };
  const before = snapshot();
  const output = run(f.args);
  assert.deepEqual(snapshot(), before);
  assert.match(output, /up to date/);
});

test("a rerun removes a recorded skill once it leaves the package and claims nothing else", (t) => {
  const f = fixture(t);
  const root = packageWith(f.base, [["poteto-mode", "pstack"], ["how", "pstack-how"]]);
  const args = [...f.args, "--root", root];
  run(args);
  symlinkSync(join(root, "skills", "how"), join(f.skills, "pstack-gone"));
  symlinkSync(join(f.base, "other-skill"), join(f.skills, "someone-else"));
  mkdirSync(join(f.skills, "hand-written"));

  rmSync(join(root, "skills", "how"), { recursive: true });
  const output = run(args);

  assert.equal(lexists(join(f.skills, "pstack-how")), false, "the whole wrapper directory is gone");
  assert.match(output, /remove .*pstack-how/);
  assert.ok(lexists(join(f.skills, "pstack-gone")), "a link the manifest never recorded is not this installer's");
  assert.ok(lstatSync(join(f.skills, "someone-else")).isSymbolicLink(), "a foreign link is not this installer's to remove");
  assert.ok(lstatSync(join(f.skills, "hand-written")).isDirectory(), "a foreign directory stays");
});

test("refuses a first-install symlink to a packaged skill instead of claiming it", (t) => {
  const f = fixture(t);
  mkdirSync(f.skills, { recursive: true });
  symlinkSync(join(repoRoot, "skills", "how"), join(f.skills, "pstack-how"));

  assert.throws(() => run(f.args), (error) => {
    assert.notEqual(error.status, 0);
    assert.match(error.stderr, /skills\/pstack-how/);
    return true;
  });

  assert.equal(resolve(readlinkSync(join(f.skills, "pstack-how"))), join(repoRoot, "skills", "how"), "the user's link is untouched");
  assert.equal(lexists(join(f.codex, ".pstack-install.json")), false);
  assert.equal(lexists(f.agents), false, "nothing was written before the check");
});

test("leaves a differently named link to a packaged skill alone", (t) => {
  const f = fixture(t);
  mkdirSync(f.skills, { recursive: true });
  const alias = join(f.skills, "my-how");
  symlinkSync(join(repoRoot, "skills", "how"), alias);

  run(f.args);
  run(f.args);
  run([...f.args, "--uninstall"]);

  assert.equal(resolve(readlinkSync(alias)), join(repoRoot, "skills", "how"), "the alias survives install, rerun and uninstall");
});

test("uninstall in a home that was never installed deletes nothing", (t) => {
  const f = fixture(t);
  mkdirSync(f.skills, { recursive: true });
  const alias = join(f.skills, "my-how");
  symlinkSync(join(repoRoot, "skills", "how"), alias);
  const stale = join(f.skills, "pstack-gone");
  symlinkSync(join(repoRoot, "skills", "gone"), stale);

  const output = run([...f.args, "--uninstall"]);

  assert.match(output, /nothing to remove/);
  assert.ok(lstatSync(alias).isSymbolicLink());
  assert.ok(lstatSync(stale).isSymbolicLink(), "no manifest means no link is this installer's");
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

  run([...f.args, "--uninstall"]);

  assert.equal(lexists(join(f.skills, "pstack-how")), false);
  assert.equal(lexists(join(f.skills, "pstack")), false);
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
  const link = join(f.skills, "pstack");
  rmSync(link);
  const elsewhere = join(f.base, "replacement");
  mkdirSync(elsewhere);
  symlinkSync(elsewhere, link);

  const output = run([...f.args, "--uninstall"]);
  assert.match(output, /skip .*pstack.*no longer points to/);
  assert.equal(resolve(readlinkSync(link)), elsewhere);
});

test("dry run prints the plan and writes nothing", (t) => {
  const f = fixture(t);
  const output = run([...f.args, "--dry-run"]);

  assert.match(output, /\[dry-run\]/);
  assert.match(output, /link .*skills\/pstack -> /);
  assert.match(output, /write .*skills\/pstack-how\/SKILL\.md/);
  assert.match(output, /write .*skills\/pstack-how\/agents\/openai\.yaml/);
  assert.equal(lexists(f.codex), false, "no codex home content");
});

test("defaults the codex home to $CODEX_HOME", (t) => {
  const f = fixture(t);
  run([], { CODEX_HOME: f.codex });
  assert.ok(existsSync(join(f.skills, "pstack-how", "SKILL.md")));
  assert.ok(existsSync(f.agents));
});
