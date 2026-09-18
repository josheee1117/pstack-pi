import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expectedPublicSkills, loadPi, repoRoot } from "./helpers.js";

/**
 * Install the package the way a user does, through a project settings file
 * pointing at the local path, and let Pi's real resource loader resolve it.
 * No provider is contacted: only package resolution and skill discovery run.
 */
test("the package installs from a local path and its skills are discovered", async (t) => {
  const pi = await loadPi();
  if (!pi) {
    t.skip("the Pi package is not installed on this machine");
    return;
  }

  const project = mkdtempSync(join(tmpdir(), "pstack-install-"));
  mkdirSync(join(project, ".pi"), { recursive: true });
  writeFileSync(
    join(project, ".pi", "settings.json"),
    JSON.stringify({ packages: [repoRoot] }, null, 2),
  );

  const loader = new pi.DefaultResourceLoader({
    cwd: project,
    agentDir: join(project, "agent"),
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await loader.reload();

  const { skills, diagnostics } = loader.getSkills();
  const ours = skills.filter((s) => s.sourceInfo?.source === repoRoot);

  assert.deepEqual(
    ours.map((s) => s.name).sort(),
    expectedPublicSkills,
    "the installed package contributes exactly its 23 skills",
  );
  assert.deepEqual(
    diagnostics.map((d) => d.message),
    [],
    "the real loader reports no diagnostics for the installed package",
  );
  assert.equal(ours.length, expectedPublicSkills.length);
});

test("the package contributes no extensions, prompts, or themes", async (t) => {
  const pi = await loadPi();
  if (!pi) {
    t.skip("the Pi package is not installed on this machine");
    return;
  }

  const project = mkdtempSync(join(tmpdir(), "pstack-install-"));
  mkdirSync(join(project, ".pi"), { recursive: true });
  writeFileSync(join(project, ".pi", "settings.json"), JSON.stringify({ packages: [repoRoot] }));

  const loader = new pi.DefaultResourceLoader({
    cwd: project,
    agentDir: join(project, "agent"),
    noContextFiles: true,
  });
  await loader.reload();

  const fromPackage = (items) => items.filter((item) => item.sourceInfo?.source === repoRoot);
  assert.deepEqual(fromPackage(loader.getExtensions().extensions), [], "no extensions");
  assert.deepEqual(fromPackage(loader.getPrompts().prompts), [], "no prompt templates");
  assert.deepEqual(fromPackage(loader.getThemes().themes), [], "no themes");
  assert.deepEqual(loader.getExtensions().errors, [], "no extension load errors");
});
