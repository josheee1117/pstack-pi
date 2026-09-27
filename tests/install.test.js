import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expectedName, loadPi, repoRoot, upstreamSkillDirs } from "./helpers.js";

/**
 * Install the package the way a user does, through a settings file pointing at
 * the local path, into an empty agent directory, and let Pi's real resource
 * loader resolve it. No provider is contacted.
 */
async function freshInstall(pi) {
  const project = mkdtempSync(join(tmpdir(), "pstack-install-"));
  mkdirSync(join(project, ".pi"), { recursive: true });
  writeFileSync(join(project, ".pi", "settings.json"), JSON.stringify({ packages: [repoRoot] }));
  const loader = new pi.DefaultResourceLoader({ cwd: project, agentDir: join(project, "agent"), noContextFiles: true });
  await loader.reload();
  const fromPackage = (items) => items.filter((item) => item.sourceInfo?.source === repoRoot);
  return { loader, fromPackage };
}

test("into an empty Pi, the package contributes exactly its skills with no diagnostics", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");

  const { loader, fromPackage } = await freshInstall(pi);
  const { skills, diagnostics } = loader.getSkills();
  assert.deepEqual(fromPackage(skills).map((s) => s.name).sort(), upstreamSkillDirs.map(expectedName).sort());
  assert.deepEqual(diagnostics.map((d) => d.message), [], "no diagnostics, including no name collisions");
});

test("the package contributes one extension that loads without optional packages, and no prompts or themes", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");

  // The agent dir is empty: no pi-subagents, pi-mcp-adapter, pi-intercom, or
  // herdr. The extension must still load; the optional pieces only change
  // what the adapter tells the model to do.
  const { loader, fromPackage } = await freshInstall(pi);
  assert.deepEqual(
    fromPackage(loader.getExtensions().extensions).map((ext) => ext.path),
    [join(repoRoot, "extensions", "pstack.js")],
  );
  assert.deepEqual(loader.getExtensions().errors, [], "the extension loads without error");
  assert.deepEqual(fromPackage(loader.getPrompts().prompts), [], "no prompt templates");
  assert.deepEqual(fromPackage(loader.getThemes().themes), [], "no themes");
});
