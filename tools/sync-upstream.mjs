#!/usr/bin/env node
// Import committed upstream files on a separate branch. Never merge into the
// working branch automatically; review the delta first (docs/sync.md).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const BRANCH = "upstream";
const git = (cwd, ...args) => execFileSync("git", args, {
  cwd, encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024,
  stdio: ["ignore", "pipe", "pipe"],
}).trim();

export function renameSkill(text, dirName, config) {
  const name = config.rename[dirName] ?? `${config.namePrefix}${dirName}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) throw new Error(`Invalid skill name: ${name}`);
  const lines = text.split("\n");
  if (lines[0] !== "---") throw new Error(`${dirName}/SKILL.md has no frontmatter`);
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new Error(`${dirName}/SKILL.md frontmatter is not closed`);
  const at = lines.slice(1, end).findIndex((line) => /^name:/.test(line));
  if (at >= 0) lines[at + 1] = `name: ${name}`;
  else lines.splice(1, 0, `name: ${name}`);
  return lines.join("\n");
}

function relativePath(path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\\") || path.includes(":") ||
      path.split("/").some((part) => !part || part === "." || part === ".." || part === ".git")) {
    throw new Error(`Expected a safe relative path: ${path}`);
  }
}

function rejectLinks(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Snapshot contains a symlink: ${join(dir, entry.name)}`);
    if (entry.isDirectory()) rejectLinks(join(dir, entry.name));
  }
}

export function buildSnapshot(sourceRoot, config, outDir, lock) {
  for (const path of [config.path, ...Object.keys(config.copy), ...Object.values(config.copy), ...config.drop]) relativePath(path);
  if (existsSync(outDir) && readdirSync(outDir).length) throw new Error(`Output directory must be empty: ${outDir}`);
  const from = join(sourceRoot, config.path);
  rejectLinks(from);
  mkdirSync(outDir, { recursive: true });
  for (const [src, dest] of Object.entries(config.copy)) cpSync(join(from, src), join(outDir, dest), { recursive: true });
  for (const path of config.drop) rmSync(join(outDir, path), { recursive: true, force: true });
  for (const dir of readdirSync(join(outDir, "skills"))) {
    const file = join(outDir, "skills", dir, "SKILL.md");
    if (existsSync(file)) writeFileSync(file, renameSkill(readFileSync(file, "utf8"), dir, config));
  }
  writeFileSync(join(outDir, "upstream.lock"), `${JSON.stringify(lock, null, 2)}\n`);
}

export function commitSnapshot(repository, snapshotDir, message) {
  let previous = git(repository, "branch", "--list", BRANCH) ? git(repository, "rev-parse", BRANCH) : undefined;
  if (!previous && git(repository, "branch", "-r", "--list", `origin/${BRANCH}`)) {
    git(repository, "branch", "--track", BRANCH, `origin/${BRANCH}`);
    previous = git(repository, "rev-parse", BRANCH);
  }
  if (!previous && existsSync(join(repository, "upstream.lock"))) {
    throw new Error("Missing upstream branch. Fetch origin/upstream or restore the recorded snapshot ancestor first; refusing an unrelated history.");
  }
  if (previous) {
    let prior;
    try { prior = JSON.parse(git(repository, "show", `${previous}:upstream.lock`)); } catch {
      throw new Error("Existing upstream branch is not a pstack snapshot; refusing to replace its files.");
    }
    const next = JSON.parse(readFileSync(join(snapshotDir, "upstream.lock"), "utf8"));
    if (prior.repo !== next.repo || prior.path !== next.path) throw new Error("Upstream snapshot provenance changed; review the source before importing.");
  }
  const temp = mkdtempSync(join(tmpdir(), "pstack-import-"));
  const work = join(temp, "work");
  let attached = false;
  try {
    git(repository, "worktree", "add", "--quiet", ...(previous ? [] : ["--detach"]), work, previous ? BRANCH : "HEAD");
    attached = true;
    if (!previous) git(work, "checkout", "--quiet", "--orphan", BRANCH);
    git(work, "rm", "-r", "-q", "-f", "--ignore-unmatch", ".");
    cpSync(snapshotDir, work, { recursive: true });
    git(work, "add", "-A");
    if (!git(work, "status", "--porcelain")) return console.log(`${BRANCH} is already at this snapshot.`);
    git(work, "commit", "--quiet", "-m", message);
    console.log(`Imported ${git(work, "rev-parse", "--short", "HEAD")} on ${BRANCH}.`);
    if (previous) {
      console.log(git(work, "diff", "--stat", previous, "HEAD"));
      const added = git(work, "diff", previous, "HEAD").split("\n").filter((l) => /^\+[^+]/.test(l)).join("\n");
      const terms = [...new Set(added.match(/Task|subagent_type|readonly|cloud_base_branch|\/loop|\/goal|AskQuestion|cursor-team-kit|control-(?:ui|cli)|\.cursor\/|agent-transcripts|pstack-models\.mdc|create-skill|todolist|Cursor|\bbun\b|\bgt\b/g) ?? [])];
      console.log(`Known platform terms in additions: ${terms.join(", ") || "none"}. This is a hint, not a compatibility check.`);
    }
    console.log("Next: review git diff HEAD...upstream, then merge on a clean integration branch, or selectively port changes. Nothing was merged or pushed.");
  } finally {
    // Only this disposable worktree is removed. A failed worktree add must
    // never trigger cleanup of someone else's checkout of the branch.
    if (attached) git(repository, "worktree", "remove", "--force", work);
    rmSync(temp, { recursive: true, force: true });
  }
}

export function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { ref: { type: "string" }, source: { type: "string" }, "dry-run": { type: "string" } } });
  const config = JSON.parse(readFileSync(join(repoRoot, "upstream.json"), "utf8"));
  const temp = mkdtempSync(join(tmpdir(), "pstack-source-"));
  const source = values.source ? resolve(values.source) : join(temp, "repo");
  const checkout = join(temp, "checkout");
  let attached = false;
  try {
    if (!values.source) git(temp, "clone", "--quiet", "--filter=blob:none", "--no-checkout", "--", config.repo, source);
    const ref = values.ref ?? (values.source ? "HEAD" : config.ref);
    const commit = git(source, "rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`);
    git(source, "worktree", "add", "--detach", "--quiet", checkout, commit);
    attached = true;
    const version = JSON.parse(readFileSync(join(checkout, config.path, ".cursor-plugin", "plugin.json"), "utf8")).version;
    const out = values["dry-run"] ? resolve(values["dry-run"]) : join(temp, "snapshot");
    buildSnapshot(checkout, config, out, { repo: config.repo, path: config.path, commit, version });
    if (values["dry-run"]) console.log(`Snapshot of committed ${commit} written to ${out}`);
    else commitSnapshot(repoRoot, out, `upstream: pstack ${version} ${commit.slice(0, 12)}`);
  } finally {
    if (attached) git(source, "worktree", "remove", "--force", checkout);
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
