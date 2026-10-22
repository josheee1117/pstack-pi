import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, skillsDir } from "./helpers.js";

const adapterDir = join(repoRoot, "adapter");
const read = (...parts) => readFileSync(join(repoRoot, ...parts), "utf8");

test("every file the platform map and overrides send the model to exists", () => {
  const map = read("adapter", "platform.md");
  const refs = [...[map, read("adapter", "overrides.md")].join("\n").matchAll(/\{\{(root|skills|adapter)\}\}(\/[\w./-]+\.md)/g)].map(([, base, rest]) => {
    const dir = { root: repoRoot, skills: skillsDir, adapter: adapterDir }[base];
    return join(dir, rest);
  });
  assert.ok(refs.length >= 5, `the map names concrete files (${refs.length})`);
  for (const path of refs) assert.ok(existsSync(path), `${path} exists`);

  for (const note of readdirSync(join(adapterDir, "notes"))) {
    assert.ok(map.includes(`notes/${note}`), `notes/${note} is reachable from the map`);
  }
});

test("every skill a note or the map names by directory ships", () => {
  const text = [read("adapter", "platform.md"), ...readdirSync(join(adapterDir, "notes")).map((n) => read("adapter", "notes", n))].join("\n");
  const named = new Set([...text.matchAll(/\{\{skills\}\}\/([a-z0-9-]+)\//g)].map((m) => m[1]));
  for (const dir of named) assert.ok(existsSync(join(skillsDir, dir, "SKILL.md")), `${dir} ships`);
});

test("the map covers the Cursor-only vocabulary upstream uses", () => {
  const map = read("adapter", "platform.md");
  for (const term of ["Task", "subagent_type", "readonly", "run_in_background", "pstack-models.mdc", "AskQuestion", "/goal", "/loop", "cursor-team-kit", "create-skill", "mcps/", ".cursor/skills/", "agent-transcripts"]) {
    assert.ok(map.includes(term), `the map says what "${term}" means on Pi`);
  }
});

test("project skills go to .agents/skills with a .claude symlink, in every adapter", () => {
  for (const file of ["platform.md", "opencode.md"]) {
    const text = read("adapter", file);
    assert.match(text, /\.agents\/skills\//, `${file} writes project skills to .agents/skills`);
    assert.match(text, /\.claude\/skills\//, `${file} links .claude/skills`);
    assert.match(text, /\.\.\/\.\.\/\.agents\/skills\//, `${file} names the relative link target`);
    assert.match(text, /\.pi\/skills\//, `${file} names the old location it replaced`);
  }
  assert.doesNotMatch(read("adapter", "platform.md"), /`\.cursor\/skills\/` is `\.pi\/skills\/`/);
});

test("the map has setup offer to install the formal verifier before the first run", () => {
  assert.match(read("adapter", "platform.md"), /Formal verification \(setup-pstack step 8.*ask once whether to install it.*tla2tools\.jar.*Install only after a yes/);
});

test("the overrides keep the behaviors the eval showed upstream text lacks", () => {
  const overrides = read("adapter", "overrides.md");
  assert.match(overrides, /Size the task before routing it/);
  assert.match(overrides, /Restate before you start\..*\{\{skills\}\}\/in-your-own-words\/SKILL\.md/);
  assert.match(overrides, /Fix only what the request needs/);
  assert.match(overrides, /Spawn a subagent only when/);
  assert.match(overrides, /names no principles, playbook steps/);
  assert.match(overrides, /language the user writes in/);
  assert.match(overrides, /only when the user asked/);
  assert.match(overrides, /already accepted/);
});

test("worktree-audit reads Pi session records, not Cursor transcripts", () => {
  const script = read("skills", "poteto-mode", "scripts", "worktree-audit.sh");
  assert.doesNotMatch(script, /\.cursor\//);
  assert.match(script, /PI_CODING_AGENT_DIR/);
  assert.match(script, /sessions/);
});

test("the sessions note encodes a project directory the way Pi does", async (t) => {
  // Pi's own encoder lives in its session manager; check the documented shell
  // form against it when Pi is installed.
  const note = read("adapter", "notes", "sessions.md");
  assert.match(note, /--Users-you-proj--/);
  const { findPiPackageRoot } = await import("./helpers.js");
  const root = findPiPackageRoot();
  if (!root) return t.skip("the Pi package is not installed on this machine");
  const { pathToFileURL } = await import("node:url");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { getDefaultSessionDir } = await import(pathToFileURL(join(root, "dist/core/session-manager.js")).href);
  const temp = mkdtempSync(join(tmpdir(), "pstack-path-check-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const cwd = process.platform === "win32" ? "C:\\Users\\you\\project" : "/Users/you/proj";
  const key = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
  assert.equal(getDefaultSessionDir(cwd, temp), join(temp, "sessions", key));
});
