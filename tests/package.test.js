import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readJson, repoRoot } from "./helpers.js";

const pkg = readJson(join(repoRoot, "package.json"));

test("the manifest declares the skills and the one extension, and nothing that would need installing", () => {
  assert.equal(pkg.name, "pstack-pi");
  assert.equal(pkg.type, "module");
  assert.ok(pkg.keywords.includes("pi-package"), "the pi-package keyword makes the package discoverable");
  assert.deepEqual(pkg.pi.skills, ["./skills"]);
  assert.deepEqual(pkg.pi.extensions, ["./extensions/pstack.js"]);
  assert.deepEqual(readdirSync(join(repoRoot, "extensions")), ["pstack.js"]);
  for (const key of ["prompts", "themes", "subagents", "mcp"]) {
    assert.equal(pkg.pi[key], undefined, `no ${key}: optional components stay the user's choice`);
  }
  assert.equal(pkg.dependencies, undefined, "no runtime dependencies");
  assert.equal(pkg.peerDependencies, undefined, "no required peer packages");
});

test("everything the package publishes exists, and the pieces the extension reads are published", () => {
  for (const entry of pkg.files) assert.ok(existsSync(join(repoRoot, entry)), `files entry ${entry} exists`);
  for (const entry of ["skills", "agents", "adapter", "extensions", "LICENSE", "LICENSE.upstream", "NOTICE.md", "upstream.lock"]) {
    assert.ok(pkg.files.includes(entry), `${entry} is published`);
  }
});

test("the license and provenance files state the upstream origin and pinned snapshot", () => {
  assert.match(readFileSync(join(repoRoot, "LICENSE"), "utf8"), /Lauren Tan/);
  assert.match(readFileSync(join(repoRoot, "LICENSE.upstream"), "utf8"), /Lauren Tan/, "upstream's own license travels with its text");

  const lock = readJson(join(repoRoot, "upstream.lock"));
  assert.match(lock.commit, /^[0-9a-f]{40}$/, "upstream.lock pins a full commit");
  assert.equal(lock.repo, "https://github.com/cursor/plugins");

  const notice = readFileSync(join(repoRoot, "NOTICE.md"), "utf8");
  assert.ok(notice.includes(lock.commit), "NOTICE names the same upstream commit as upstream.lock");
  assert.match(notice, /make-bot-ui/, "the dropped skill is disclosed");
});

test("the test suite runs on Node's built-in runner", () => {
  assert.match(pkg.scripts.test, /^node --test /);
  assert.equal(pkg.devDependencies, undefined, "no test framework dependency");
});
