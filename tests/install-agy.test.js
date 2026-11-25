import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { repoRoot } from "./helpers.js";

const script = join(repoRoot, "tools", "install-agy.mjs");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const lexists = (path) => {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
};
const run = (args) => execFileSync(process.execPath, [script, ...args], { encoding: "utf8" });

const skillCount = ["skills", "local-skills"]
  .flatMap((dir) => readdirSync(join(repoRoot, dir)).map((name) => join(repoRoot, dir, name)))
  .filter((dir) => existsSync(join(dir, "SKILL.md"))).length;

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), "pstack-agy-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const gemini = join(base, "gemini");
  const t3 = join(base, "t3");
  const instances = {
    antigravity_a: { driver: "antigravity", enabled: true },
    antigravity_b: { driver: "antigravity", enabled: true },
    antigravity_off: { driver: "antigravity", enabled: false },
    pi: { driver: "pi", enabled: true },
  };
  mkdirSync(join(t3, "userdata"), { recursive: true });
  writeFileSync(join(t3, "userdata", "settings.json"), JSON.stringify({ providerInstances: instances }));
  const account = (name) => join(t3, "userdata", "providers", "antigravity", sha256(name), "config");
  for (const name of ["antigravity_a", "antigravity_b", "antigravity_off"]) mkdirSync(account(name), { recursive: true });
  return { base, gemini, t3, account, args: ["--gemini-dir", gemini, "--t3-home", t3] };
}

test("installs a plugin whose links cover every packaged skill and whose rules have no placeholders left", (t) => {
  const f = fixture(t);
  run(f.args);
  const plugin = join(f.gemini, "plugins", "pstack");

  const manifest = JSON.parse(readFileSync(join(plugin, "plugin.json"), "utf8"));
  assert.equal(manifest.name, "pstack");
  assert.equal(manifest.version, pkg.version);
  assert.match(manifest.description, /\p{Script=Han}/u, "the description is a Chinese sentence");

  const rules = readFileSync(join(plugin, "rules", "AGENTS.md"), "utf8");
  assert.ok(rules.includes(resolve(repoRoot)), "the rules name the package root");
  assert.doesNotMatch(rules, /\{\{/, "the installer resolved every placeholder");

  const links = readdirSync(join(plugin, "skills"), { withFileTypes: true });
  assert.equal(links.length, skillCount, "one link per packaged skill");
  assert.ok(links.every((entry) => entry.isSymbolicLink()), "every skill entry is a symlink");
  assert.equal(resolve(readlinkSync(join(plugin, "skills", "pstack"))), join(repoRoot, "skills", "poteto-mode"));
  assert.equal(resolve(readlinkSync(join(plugin, "skills", "pstack-setup"))), join(repoRoot, "skills", "setup-pstack"));
  assert.equal(resolve(readlinkSync(join(plugin, "skills", "pstack-teach-me"))), join(repoRoot, "skills", "teach"));
  assert.equal(resolve(readlinkSync(join(plugin, "skills", "pstack-help"))), join(repoRoot, "skills", "poteto-help"));
  assert.equal(resolve(readlinkSync(join(plugin, "skills", "pstack-report"))), join(repoRoot, "local-skills", "pstack-report"));
  assert.ok(existsSync(join(plugin, "skills", "pstack-how", "SKILL.md")));
});

test("links the plugin into every enabled antigravity account and no other instance", (t) => {
  const f = fixture(t);
  run(f.args);
  const plugin = join(f.gemini, "plugins", "pstack");
  for (const name of ["antigravity_a", "antigravity_b"]) {
    const link = join(f.account(name), "plugins", "pstack");
    assert.ok(lstatSync(link).isSymbolicLink(), `${name} has the plugin link`);
    assert.equal(resolve(readlinkSync(link)), plugin);
  }
  assert.equal(lexists(join(f.account("antigravity_off"), "plugins", "pstack")), false, "a disabled account stays untouched");
  const piAccount = join(f.t3, "userdata", "providers", "antigravity", sha256("pi"), "config", "plugins", "pstack");
  assert.equal(lexists(piAccount), false, "a non-antigravity instance gets no link");
});

test("a second run changes nothing", (t) => {
  const f = fixture(t);
  run(f.args);
  const plugin = join(f.gemini, "plugins", "pstack");
  const paths = [
    join(plugin, "plugin.json"),
    join(plugin, "rules", "AGENTS.md"),
    ...readdirSync(join(plugin, "skills")).map((name) => join(plugin, "skills", name)),
    join(f.account("antigravity_a"), "plugins", "pstack"),
    join(f.account("antigravity_b"), "plugins", "pstack"),
  ];
  const snapshot = () => paths.map((path) => {
    const stat = lstatSync(path);
    return [path, stat.mtimeMs, stat.isSymbolicLink() ? readlinkSync(path) : readFileSync(path, "utf8")];
  });
  const before = snapshot();
  run(f.args);
  assert.deepEqual(snapshot(), before);
});

test("a rerun removes links for skills that left the package and leaves other entries alone", (t) => {
  const f = fixture(t);
  run(f.args);
  const skills = join(f.gemini, "plugins", "pstack", "skills");
  symlinkSync(join(repoRoot, "skills", "gone"), join(skills, "pstack-gone"));
  symlinkSync(join(f.base, "other-skill"), join(skills, "someone-else"));

  run(f.args);
  assert.equal(lexists(join(skills, "pstack-gone")), false, "the stale pstack link is gone");
  assert.ok(lstatSync(join(skills, "someone-else")).isSymbolicLink(), "a foreign link is not this installer's to remove");
});

test("uninstall removes the plugin and every account link, even for a since-disabled account", (t) => {
  const f = fixture(t);
  mkdirSync(join(f.gemini, "plugins", "other"), { recursive: true });
  run(f.args);
  writeFileSync(join(f.t3, "userdata", "settings.json"), JSON.stringify({
    providerInstances: {
      antigravity_a: { driver: "antigravity", enabled: true },
      antigravity_b: { driver: "antigravity", enabled: false },
    },
  }));
  run([...f.args, "--uninstall"]);

  assert.equal(lexists(join(f.gemini, "plugins", "pstack")), false);
  assert.ok(existsSync(join(f.gemini, "plugins", "other")));
  for (const name of ["antigravity_a", "antigravity_b"]) {
    assert.equal(lexists(join(f.account(name), "plugins", "pstack")), false, `${name} link is gone`);
  }
});

test("refuses to install over a plugin directory this installer did not create", (t) => {
  const f = fixture(t);
  const plugin = join(f.gemini, "plugins", "pstack");
  mkdirSync(join(plugin, "rules"), { recursive: true });
  writeFileSync(join(plugin, "plugin.json"), JSON.stringify({ name: "team-plugin" }));
  writeFileSync(join(plugin, "rules", "team.md"), "keep me\n");

  assert.throws(() => run(f.args), (error) => {
    assert.notEqual(error.status, 0);
    assert.match(error.stderr, /plugins\/pstack/);
    return true;
  });

  assert.equal(readFileSync(join(plugin, "plugin.json"), "utf8"), JSON.stringify({ name: "team-plugin" }), "the other plugin is untouched");
  assert.equal(readFileSync(join(plugin, "rules", "team.md"), "utf8"), "keep me\n");
  assert.equal(lexists(join(plugin, "rules", "AGENTS.md")), false, "nothing was written before the check");
  assert.equal(lexists(join(f.account("antigravity_a"), "plugins", "pstack")), false, "no account link was written");
});

test("refuses to install over a plugin symlink that is not this installer's", (t) => {
  const f = fixture(t);
  const elsewhere = join(f.base, "shared-plugin");
  mkdirSync(join(elsewhere, "rules"), { recursive: true });
  writeFileSync(join(elsewhere, "rules", "team.md"), "keep me\n");
  mkdirSync(join(f.gemini, "plugins"), { recursive: true });
  symlinkSync(elsewhere, join(f.gemini, "plugins", "pstack"));

  assert.throws(() => run(f.args), (error) => {
    assert.notEqual(error.status, 0);
    assert.match(error.stderr, /symlink/);
    return true;
  });

  assert.deepEqual(readdirSync(elsewhere), ["rules"], "nothing was written through the link");
  assert.equal(lexists(join(f.account("antigravity_a"), "plugins", "pstack")), false);
});

test("adopts a plugin that an earlier version installed without a manifest", (t) => {
  const f = fixture(t);
  const plugin = join(f.gemini, "plugins", "pstack");
  mkdirSync(join(plugin, "rules"), { recursive: true });
  mkdirSync(join(plugin, "skills"), { recursive: true });
  writeFileSync(join(plugin, "plugin.json"), `${JSON.stringify({ name: "pstack", version: "0.1.0", description: "pstack 工作流技能" }, null, 2)}\n`);
  writeFileSync(join(plugin, "rules", "AGENTS.md"), "# pstack on agy (Antigravity)\n\nwritten before the manifest existed\n");
  symlinkSync(join(repoRoot, "skills", "poteto-mode"), join(plugin, "skills", "pstack"));
  symlinkSync(join(repoRoot, "skills", "gone"), join(plugin, "skills", "pstack-gone"));

  run(f.args);

  const manifest = JSON.parse(readFileSync(join(plugin, ".pstack-install.json"), "utf8"));
  assert.equal(manifest.root, repoRoot);
  assert.equal(manifest.files.length, 2);
  assert.equal(resolve(manifest.links.find((link) => link.path === "skills/pstack").target), join(repoRoot, "skills", "poteto-mode"));
  assert.equal(lexists(join(plugin, "skills", "pstack-gone")), false, "a stale link from the old install is cleaned");
  assert.equal(resolve(readlinkSync(join(plugin, "skills", "pstack"))), join(repoRoot, "skills", "poteto-mode"));
  assert.doesNotMatch(readFileSync(join(plugin, "rules", "AGENTS.md"), "utf8"), /\{\{/);
  assert.ok(lstatSync(join(f.account("antigravity_a"), "plugins", "pstack")).isSymbolicLink());
  assert.match(run(f.args), /up to date/);
});

test("uninstall removes only what the installer wrote", (t) => {
  const f = fixture(t);
  run(f.args);
  const plugin = join(f.gemini, "plugins", "pstack");
  const teamRules = join(plugin, "rules", "team.md");
  writeFileSync(teamRules, "team rules\n");
  const accountA = join(f.account("antigravity_a"), "plugins", "pstack");
  rmSync(accountA);
  mkdirSync(join(accountA, "mine"), { recursive: true });
  writeFileSync(join(accountA, "mine", "note.md"), "ours\n");

  const output = run([...f.args, "--uninstall"]);

  assert.equal(readFileSync(teamRules, "utf8"), "team rules\n", "a file the user added stays");
  assert.equal(lexists(join(plugin, "plugin.json")), false);
  assert.equal(lexists(join(plugin, "rules", "AGENTS.md")), false);
  assert.equal(lexists(join(plugin, "skills", "pstack")), false);
  assert.equal(readFileSync(join(accountA, "mine", "note.md"), "utf8"), "ours\n", "a plain account directory stays");
  assert.equal(lexists(join(f.account("antigravity_b"), "plugins", "pstack")), false, "the other account's link is gone");
  assert.match(output, /skip .*not a symlink/);
});

test("dry run prints the plan and writes nothing", (t) => {
  const f = fixture(t);
  const output = run([...f.args, "--dry-run"]);

  assert.match(output, /\[dry-run\]/);
  assert.match(output, /link/);
  assert.equal(lexists(join(f.gemini, "plugins")), false, "no plugin directory");
  assert.equal(lexists(join(f.account("antigravity_a"), "plugins")), false, "no account plugin directory");
});
