import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPi, repoRoot } from "./helpers.js";

const localSkillsDir = join(repoRoot, "local-skills");

test("Pi loads every local skill under its directory name and keeps it out of the default prompt", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");
  const result = pi.loadSkillsFromDir({ dir: localSkillsDir, source: "pstack-pi" });
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.skills.map((skill) => skill.name).sort(), readdirSync(localSkillsDir).filter((dir) => existsSync(join(localSkillsDir, dir, "SKILL.md"))).sort());
  for (const skill of result.skills) assert.equal(skill.disableModelInvocation, true, `${skill.name} stays hidden`);
  assert.equal(pi.formatSkillsForPrompt(result.skills, "read"), "");
});

test("/skill:pstack-report expands through Pi's real command expansion", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");
  const result = pi.loadSkillsFromDir({ dir: localSkillsDir, source: "pstack-pi" });
  const context = {
    resourceLoader: { getSkills: () => result },
    _extensionRunner: { emitError: (event) => { throw new Error(event.error); } },
  };
  const report = result.skills.find((skill) => skill.name === "pstack-report");
  assert.ok(report);
  const body = pi.stripFrontmatter(readFileSync(report.filePath, "utf8")).trim();
  for (const args of ["", " summarize this run"]) {
    const expanded = pi.AgentSession.prototype._expandSkillCommand.call(context, `/skill:pstack-report${args}`);
    assert.ok(expanded.startsWith(`<skill name="pstack-report" location="${report.filePath}">`));
    assert.ok(expanded.includes(body));
    assert.ok(expanded.endsWith(args ? `</skill>\n\n${args.trim()}` : "</skill>"));
  }
});
