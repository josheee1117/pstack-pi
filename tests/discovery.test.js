import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { expectedPublicSkills, loadPi, skillNamesOnDisk, skillsDir } from "./helpers.js";

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PLAYBOOKS_DIR = join(skillsDir, "pstack", "playbooks");

test("the package ships exactly the 23 public skills the routing table names", () => {
  const onDisk = skillNamesOnDisk();
  assert.deepEqual(onDisk, expectedPublicSkills);
  assert.equal(onDisk.length, 23, "23 public skills: the pstack entry plus 22 pstack-* skills");
});

test("the real Pi loader discovers every skill with no diagnostics", async (t) => {
  const pi = await loadPi();
  if (!pi) {
    t.skip("the Pi package is not installed on this machine");
    return;
  }

  const result = pi.loadSkillsFromDir({ dir: skillsDir, source: "pstack-pi" });

  assert.deepEqual(
    result.diagnostics.map((d) => `${d.type ?? "diagnostic"}: ${d.message}`),
    [],
    "the real loader reports no skill diagnostics",
  );
  assert.deepEqual(result.skills.map((s) => s.name).sort(), expectedPublicSkills);

  for (const skill of result.skills) {
    assert.match(skill.name, NAME_PATTERN, `${skill.name} is a valid skill name`);
    assert.ok(skill.name.length <= 64, `${skill.name} is within the 64 character limit`);
    assert.ok(skill.description.length > 0, `${skill.name} has a description`);
    assert.ok(skill.description.length <= 1024, `${skill.name} description is within 1024 characters`);
    assert.equal(skill.baseDir, join(skillsDir, skill.name), `${skill.name} resolves to its own directory`);
    assert.equal(skill.filePath, join(skillsDir, skill.name, "SKILL.md"));
    assert.ok(existsSync(skill.filePath), `${skill.name} SKILL.md exists`);
  }
});

test("the trigger model matches upstream: one visible skill, the rest explicit-only", async (t) => {
  const pi = await loadPi();
  if (!pi) {
    t.skip("the Pi package is not installed on this machine");
    return;
  }

  const result = pi.loadSkillsFromDir({ dir: skillsDir, source: "pstack-pi" });

  // Upstream hides every public skill except setup-pstack, so the human picks
  // the workflow with /skill:<name> instead of the model routing itself in.
  // This port keeps that model; the one visible skill is the setup guide.
  const visible = result.skills.filter((s) => !s.disableModelInvocation).map((s) => s.name);
  assert.deepEqual(visible, ["pstack-setup"], "only the setup guide is offered to the model");

  const hidden = result.skills.filter((s) => s.disableModelInvocation).map((s) => s.name).sort();
  const expectedHidden = expectedPublicSkills.filter((name) => name !== "pstack-setup");
  assert.deepEqual(hidden, expectedHidden, "every other public skill is explicit-invocation only");

  // Hidden from the prompt is not hidden from the user: /skill:<name> still
  // resolves, which is the whole point of the setting.
  const prompt = pi.formatSkillsForPrompt(result.skills, "read");
  assert.match(prompt, /<name>pstack-setup<\/name>/, "the setup guide stays in the system prompt");
  for (const name of expectedHidden) {
    assert.doesNotMatch(prompt, new RegExp(`<name>${name}</name>`), `${name} is kept out of the system prompt`);
  }
});

test("every SKILL.md parses through Pi's own frontmatter reader and carries a body", async (t) => {
  const pi = await loadPi();
  if (!pi) {
    t.skip("the Pi package is not installed on this machine");
    return;
  }
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  for (const name of expectedPublicSkills) {
    const source = readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
    const { frontmatter, body } = pi.parseFrontmatter(source);

    assert.equal(frontmatter?.name, name, `${name} declares its own name`);
    assert.equal(typeof frontmatter?.description, "string", `${name} declares a description`);
    assert.ok(frontmatter.description.trim().length > 20, `${name} description says when to use it`);
    assert.ok(body.trim().length > 200, `${name} carries a body, not just frontmatter`);
    const allowed = new Set([
      "name",
      "description",
      "license",
      "compatibility",
      "metadata",
      "allowed-tools",
      "disable-model-invocation",
    ]);
    const unknown = Object.keys(frontmatter).filter((key) => !allowed.has(key));
    assert.deepEqual(unknown, [], `${name} declares only documented frontmatter fields`);
  }
});

test("the pstack routing table and the playbooks directory agree", () => {
  const entry = readFileSync(join(skillsDir, "pstack", "SKILL.md"), "utf8");
  const onDisk = readdirSync(PLAYBOOKS_DIR).filter((f) => f.endsWith(".md")).sort();

  assert.equal(onDisk.length, 23, "23 playbooks");

  // Only table rows count as the routing table. Other prose in the skill may
  // name a playbook inline without claiming it in the table.
  const tableRows = entry.split("\n").filter((line) => /^\| \[[a-z0-9-]+\]\(playbooks\/[a-z0-9-]+\.md\)/.test(line));
  const listed = tableRows.map((line) => line.match(/\(playbooks\/([a-z0-9-]+\.md)\)/)[1]);

  assert.deepEqual(listed.slice().sort(), onDisk, "the table lists every playbook exactly once");

  for (const file of listed) {
    assert.ok(existsSync(join(PLAYBOOKS_DIR, file)), `playbooks/${file} referenced by the table exists`);
  }
});

test("every pstack-* name used in skill prose resolves to a shipped skill", () => {
  const known = new Set(expectedPublicSkills);
  const allowed = new Set(["pstack-roles"]);
  const offenders = [];

  for (const name of expectedPublicSkills) {
    const dir = join(skillsDir, name);
    for (const file of walkMarkdown(dir)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bpstack-[a-z0-9][a-z0-9-]*/g)) {
        const token = match[0];
        if (known.has(token) || allowed.has(token)) continue;
        offenders.push(`${file.replace(`${skillsDir}/`, "")}: ${token}`);
      }
    }
  }

  assert.deepEqual(offenders, [], "no skill references a skill name that does not exist");
});

function walkMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}
