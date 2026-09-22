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
    assert.match(skill.description, /^\p{Script=Han}/u, `${skill.name} has a Chinese command description`);
    assert.ok(skill.description.length <= 1024, `${skill.name} description is within 1024 characters`);
    assert.equal(skill.baseDir, join(skillsDir, skill.name), `${skill.name} resolves to its own directory`);
    assert.equal(skill.filePath, join(skillsDir, skill.name, "SKILL.md"));
    assert.ok(existsSync(skill.filePath), `${skill.name} SKILL.md exists`);
  }
});

test("the trigger model matches upstream: setup in the default prompt listing, the other 22 hidden from it", async (t) => {
  const pi = await loadPi();
  if (!pi) {
    t.skip("the Pi package is not installed on this machine");
    return;
  }

  const result = pi.loadSkillsFromDir({ dir: skillsDir, source: "pstack-pi" });

  // Upstream keeps every public skill except setup-pstack out of the system
  // prompt listing. disable-model-invocation hides a skill from that listing;
  // it is not a permission lock: the skill stays registered and its body can
  // still be read by the model and by /skill:<name>. The human explicitly
  // loads the entry with /skill:pstack, and from there the model reads the
  // other skills as the entry's body directs. The one listed skill is setup.
  const visible = result.skills.filter((s) => !s.disableModelInvocation).map((s) => s.name);
  assert.deepEqual(visible, ["pstack-setup"], "only the setup guide is listed in the default prompt");

  const hidden = result.skills.filter((s) => s.disableModelInvocation).map((s) => s.name).sort();
  const expectedHidden = expectedPublicSkills.filter((name) => name !== "pstack-setup");
  assert.deepEqual(hidden, expectedHidden, "every other public skill is hidden from the default prompt listing");

  // Hidden from the prompt listing is not hidden from the model: every hidden
  // skill is still registered, and its body is reachable both through
  // /skill:<name> and through the model reading the file as skill text directs.
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

test("/skill:<name> expands through Pi's real AgentSession.prototype._expandSkillCommand for all 22 hidden skills", async (t) => {
  const pi = await loadPi();
  if (!pi) {
    t.skip("the Pi package is not installed on this machine");
    return;
  }

  const result = pi.loadSkillsFromDir({ dir: skillsDir, source: "pstack-pi" });

  // The method only reads this.resourceLoader.getSkills() and, when a SKILL.md
  // read fails, calls this._extensionRunner.emitError(). A plain context is
  // enough; the throwing emitError makes any read failure fail the test loudly
  // instead of silently passing the original text through.
  const context = {
    resourceLoader: { getSkills: () => result },
    _extensionRunner: {
      emitError: (e) => {
        throw new Error(`skill expansion failed (${e.event}): ${e.error}`);
      },
    },
  };
  const expandSkillCommand = pi.AgentSession.prototype._expandSkillCommand;

  const hidden = expectedPublicSkills.filter((name) => name !== "pstack-setup");
  assert.equal(hidden.length, 22, "22 hidden skills get expansion coverage");

  for (const name of hidden) {
    const skill = result.skills.find((s) => s.name === name);
    assert.ok(skill, `${name} is discovered by the real loader`);

    const expanded = expandSkillCommand.call(context, `/skill:${name} some task args`);
    const expectedBody = pi.stripFrontmatter(readFileSync(skill.filePath, "utf8")).trim();

    assert.ok(
      expanded.startsWith(`<skill name="${name}" location="${skill.filePath}">`),
      `${name} expands into a skill block naming its own SKILL.md path`,
    );
    assert.ok(
      expanded.includes(`References are relative to ${skill.baseDir}`),
      `${name} expansion points readers at its base directory`,
    );
    assert.ok(expanded.includes(expectedBody), `${name} expansion carries the full skill body`);
    assert.ok(
      expanded.endsWith("</skill>\n\nsome task args"),
      `${name} appends the user's args after the skill block`,
    );

    const withoutArgs = expandSkillCommand.call(context, `/skill:${name}`);
    assert.ok(
      withoutArgs.startsWith(`<skill name="${name}"`) && withoutArgs.endsWith("</skill>"),
      `${name} without args expands to exactly the skill block`,
    );
  }

  // Plain text and unknown skills pass through untouched.
  assert.equal(expandSkillCommand.call(context, "plain prompt"), "plain prompt");
  assert.equal(
    expandSkillCommand.call(context, "/skill:no-such-skill args"),
    "/skill:no-such-skill args",
  );
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
