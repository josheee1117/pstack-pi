import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expectedName, loadPi, skillDirsOnDisk, skillsDir, upstreamSkillDirs, unexpectedSkillDiagnostics } from "./helpers.js";

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const expectedNames = upstreamSkillDirs.map(expectedName).sort();

test("the package ships every upstream skill except make-bot-ui", () => {
  assert.deepEqual(skillDirsOnDisk(), upstreamSkillDirs);
});

test("every skill is registered under a pstack- name, and teach as pstack-teach-me", () => {
  for (const name of expectedNames) {
    assert.ok(name === "pstack" || name.startsWith("pstack-"), `${name} carries the package prefix`);
  }
  assert.equal(expectedName("poteto-mode"), "pstack", "the entry is /skill:pstack");
  assert.equal(expectedName("teach"), "pstack-teach-me", "teach cannot be shadowed by a project's own teach skill");
  assert.equal(expectedName("setup-pstack"), "pstack-setup");
});

test("the real Pi loader discovers every skill with no diagnostics", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");

  const result = pi.loadSkillsFromDir({ dir: skillsDir, source: "pstack-pi" });
  assert.deepEqual(
    unexpectedSkillDiagnostics(result.diagnostics).map((d) => `${d.type ?? "diagnostic"}: ${d.message}`),
    [],
    "no unexpected diagnostics; original Pi's documented directory-name warnings are tolerated",
  );
  assert.deepEqual(result.skills.map((s) => s.name).sort(), expectedNames);

  for (const skill of result.skills) {
    assert.match(skill.name, NAME_PATTERN, `${skill.name} is a valid skill name`);
    assert.match(skill.description, /^\p{Script=Han}/u, `${skill.name} has a Chinese command description`);
    assert.ok(skill.description.length <= 1024, `${skill.name} description is within 1024 characters`);
  }
});

test("the trigger model matches upstream: setup in the prompt listing, every other skill hidden", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");

  const result = pi.loadSkillsFromDir({ dir: skillsDir, source: "pstack-pi" });
  const visible = result.skills.filter((s) => !s.disableModelInvocation).map((s) => s.name);
  assert.deepEqual(visible, ["pstack-setup"], "only the setup guide is listed in the default prompt");

  const prompt = pi.formatSkillsForPrompt(result.skills, "read");
  assert.match(prompt, /<name>pstack-setup<\/name>/);
  assert.doesNotMatch(prompt, /<name>pstack-how<\/name>/, "hidden skills stay out of the system prompt");
});

test("/skill:<name> expands through Pi's real command expansion for every skill", async (t) => {
  const pi = await loadPi();
  if (!pi) return t.skip("the Pi package is not installed on this machine");

  const result = pi.loadSkillsFromDir({ dir: skillsDir, source: "pstack-pi" });
  // The method only reads this.resourceLoader.getSkills() and reports read
  // failures through this._extensionRunner.emitError(). Throwing there makes a
  // failed read fail the test instead of passing the text through.
  const context = {
    resourceLoader: { getSkills: () => result },
    _extensionRunner: {
      emitError: (e) => {
        throw new Error(`skill expansion failed (${e.event}): ${e.error}`);
      },
    },
  };
  const expand = (text) => pi.AgentSession.prototype._expandSkillCommand.call(context, text);

  for (const skill of result.skills) {
    const expanded = expand(`/skill:${skill.name} some task`);
    const body = pi.stripFrontmatter(readFileSync(skill.filePath, "utf8")).trim();
    assert.ok(expanded.startsWith(`<skill name="${skill.name}" location="${skill.filePath}">`), `${skill.name} expands`);
    assert.ok(expanded.includes(body), `${skill.name} expansion carries the full body`);
    assert.ok(expanded.endsWith("</skill>\n\nsome task"), `${skill.name} keeps the user's args`);
  }
  assert.equal(expand("plain prompt"), "plain prompt");
});

test("the entry skill's playbook list and the playbooks directory agree", () => {
  const entry = readFileSync(join(skillsDir, "poteto-mode", "SKILL.md"), "utf8");
  const listed = [...entry.matchAll(/`playbooks\/([a-z0-9-]+\.md)`/g)].map((m) => m[1]);
  const onDisk = readdirSync(join(skillsDir, "poteto-mode", "playbooks")).filter((f) => f.endsWith(".md"));
  assert.deepEqual([...new Set(listed)].sort(), onDisk.sort(), "every playbook the entry routes to ships, and no other");
});

