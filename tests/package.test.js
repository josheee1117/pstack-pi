import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expectedPublicSkills, readJson, repoRoot, skillsDir } from "./helpers.js";

const pkg = readJson(join(repoRoot, "package.json"));

test("the package manifest declares the skills it ships, by manifest and by convention", () => {
  assert.equal(pkg.name, "pstack-pi");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.license, "MIT");
  assert.ok(pkg.keywords.includes("pi-package"), "the pi-package keyword makes the package discoverable");

  assert.deepEqual(pkg.pi.skills, ["./skills"], "the manifest lists the skills directory explicitly");
  assert.ok(existsSync(join(repoRoot, "skills")), "the skills directory exists");
});

test("the package ships skills only: no extensions, prompts, themes, or agents", () => {
  assert.equal(pkg.pi.extensions, undefined, "no extension entry");
  assert.equal(pkg.pi.prompts, undefined, "no prompt templates");
  assert.equal(pkg.pi.themes, undefined, "no themes");
  assert.equal(pkg.pi.subagents, undefined, "no subagents schema");
  assert.equal(pkg.pi.tools, undefined, "no custom tools");

  for (const dir of ["extensions", "prompts", "themes", "agents"]) {
    assert.equal(existsSync(join(repoRoot, dir)), false, `no ${dir}/ directory`);
  }
  assert.equal(pkg.bin, undefined, "no binaries");
  assert.equal(pkg.dependencies, undefined, "no runtime dependencies");
});

test("every directory under skills/ is a declared skill with a SKILL.md", () => {
  const dirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  assert.deepEqual(dirs, expectedPublicSkills, "no stray directory in skills/");
  for (const name of dirs) {
    assert.ok(existsSync(join(skillsDir, name, "SKILL.md")), `${name} has a SKILL.md`);
  }
});

test("everything the package claims to publish is inside the package", () => {
  for (const entry of pkg.files) {
    assert.ok(existsSync(join(repoRoot, entry)), `files entry ${entry} exists`);
  }
  for (const entry of ["skills", "README.md", "AGENTS.md", "LICENSE", "NOTICE.md", "docs"]) {
    assert.ok(pkg.files.includes(entry), `${entry} is published`);
  }
  assert.ok(pkg.files.includes("skills"), "the skill bodies travel with the package");
});

test("the license and provenance files state the upstream origin", () => {
  const license = readFileSync(join(repoRoot, "LICENSE"), "utf8");
  assert.match(license, /MIT License/);
  assert.match(license, /Lauren Tan/, "the upstream copyright holder is credited");

  const notice = readFileSync(join(repoRoot, "NOTICE.md"), "utf8");
  assert.match(notice, /e31650eea443aaea1e84cc15d88c13f40080b275/, "the upstream snapshot is pinned");
  assert.match(notice, /michael-denyer\/pstack-claude/, "the port reference is credited");
  assert.match(notice, /make-bot-ui/, "the unported skill is disclosed");
});

test("the test suite runs on Node's built-in runner", () => {
  assert.equal(pkg.scripts.test, "node --test", "Node's own test runner, no framework");
  assert.equal(pkg.devDependencies, undefined, "no test framework dependency");
  assert.ok(pkg.files.includes("tests"), "the test suite ships with the package");
});
