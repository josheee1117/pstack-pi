#!/usr/bin/env node
/**
 * Import a snapshot of upstream pstack onto the `upstream` branch.
 *
 * The branch holds upstream as this package lays it out, nothing else: the
 * copy map, the dropped paths, and the skill names from `upstream.json` are
 * applied here, so they never show up as conflicts. Everything Pi-specific
 * lives on the working branch as ordinary commits, and `git merge upstream`
 * carries upstream changes across them. See docs/sync.md.
 *
 * Usage:
 *   node tools/sync-upstream.mjs [--ref <branch|tag|sha>] [--source <checkout>] [--dry-run <dir>]
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const BRANCH = "upstream";

// Cursor-only vocabulary the adapter map has to cover. A new hit in an upstream
// diff means the map may need a line; the sync reports it instead of guessing.
const CURSOR_TERMS = [
  /\bTask\b(?: tool| call)/g, /subagent_type/g, /\breadonly\b/g, /environment: ?"cloud"/g, /cloud_base_branch/g,
  /\/loop\b/g, /\/goal\b/g, /\bAskQuestion\b/g, /cursor-team-kit/g, /control-(?:ui|cli)/g, /\.cursor\//g,
  /agent-transcripts/g, /pstack-models\.mdc/g, /\bcreate-skill\b/g, /\btodolist\b/g, /Cursor cloud/g,
  /\bmcps\//g, /\bbun\b/g, /\bgt\b /g, /\bOrigin\b/g, /grok-[\w.-]+|claude-[\w.-]+|gpt-[\w.-]+/g,
];

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

export function renameSkill(text, dirName, config) {
  const name = config.rename[dirName] ?? `${config.namePrefix}${dirName}`;
  const lines = text.split("\n");
  if (lines[0] !== "---") throw new Error(`${dirName}/SKILL.md has no frontmatter`);
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new Error(`${dirName}/SKILL.md frontmatter is not closed`);
  const at = lines.slice(1, end).findIndex((line) => /^name:/.test(line));
  if (at >= 0) lines[at + 1] = `name: ${name}`;
  else lines.splice(1, 0, `name: ${name}`);
  return lines.join("\n");
}

export function buildSnapshot(sourceRoot, config, outDir, lock) {
  const from = join(sourceRoot, config.path);
  for (const [src, dest] of Object.entries(config.copy)) {
    cpSync(join(from, src), join(outDir, dest), { recursive: true });
  }
  for (const path of config.drop) rmSync(join(outDir, path), { recursive: true, force: true });
  const skills = join(outDir, "skills");
  for (const dir of readdirSync(skills)) {
    const file = join(skills, dir, "SKILL.md");
    if (existsSync(file)) writeFileSync(file, renameSkill(readFileSync(file, "utf8"), dir, config));
  }
  writeFileSync(join(outDir, "upstream.lock"), `${JSON.stringify(lock, null, 2)}\n`);
}

function fetchUpstream(config, ref) {
  const dir = mkdtempSync(join(tmpdir(), "pstack-upstream-"));
  git(dir, "clone", "--quiet", "--filter=blob:none", "--sparse", "--no-checkout", config.repo, ".");
  git(dir, "sparse-checkout", "set", config.path);
  git(dir, "checkout", "--quiet", ref);
  return dir;
}

function upstreamVersion(sourceRoot, config) {
  try {
    return JSON.parse(readFileSync(join(sourceRoot, config.path, ".cursor-plugin", "plugin.json"), "utf8")).version;
  } catch {
    return undefined;
  }
}

function reportCursorTerms(diffText) {
  const added = diffText.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
  const hits = new Map();
  for (const re of CURSOR_TERMS) {
    for (const m of added.matchAll(re)) hits.set(m[0], (hits.get(m[0]) ?? 0) + 1);
  }
  if (!hits.size) return console.log("No Cursor-only terms in the added lines.");
  console.log("Cursor-only terms in added lines. Check adapter/platform.md covers each:");
  for (const [term, n] of [...hits].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${term}`);
}

function commitSnapshot(snapshotDir, message) {
  const exists = git(repoRoot, "branch", "--list", BRANCH) !== "";
  const previous = exists ? git(repoRoot, "rev-parse", BRANCH) : undefined;
  const work = mkdtempSync(join(tmpdir(), "pstack-upstream-branch-"));
  try {
    if (exists) {
      git(repoRoot, "worktree", "add", "--quiet", work, BRANCH);
    } else {
      git(repoRoot, "worktree", "add", "--quiet", "--detach", work);
      git(work, "checkout", "--quiet", "--orphan", BRANCH);
    }
    git(work, "rm", "-r", "-q", "-f", "--ignore-unmatch", ".");
    cpSync(snapshotDir, work, { recursive: true });
    git(work, "add", "-A");
    if (git(work, "status", "--porcelain") === "") {
      console.log(`${BRANCH} is already at this snapshot.`);
      return;
    }
    git(work, "commit", "--quiet", "-m", message);
    const head = git(work, "rev-parse", "--short", "HEAD");
    console.log(`Committed ${head} on ${BRANCH}: ${message}`);
    if (previous) {
      console.log(git(work, "diff", "--stat", previous, "HEAD"));
      reportCursorTerms(git(work, "diff", previous, "HEAD"));
    }
    console.log(`\nNext: git merge ${BRANCH}   (resolve conflicts, then npm test)`);
  } finally {
    git(repoRoot, "worktree", "remove", "--force", work);
  }
}

function main() {
  const args = process.argv.slice(2);
  const opt = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const config = JSON.parse(readFileSync(join(repoRoot, "upstream.json"), "utf8"));
  const ref = opt("--ref") ?? config.ref;
  const given = opt("--source");
  const source = given ?? fetchUpstream(config, ref);
  try {
    const commit = git(source, "rev-parse", "HEAD");
    const version = upstreamVersion(source, config);
    const lock = { repo: config.repo, path: config.path, commit, version };
    const dryRun = opt("--dry-run");
    const out = dryRun ?? mkdtempSync(join(tmpdir(), "pstack-snapshot-"));
    buildSnapshot(source, config, out, lock);
    if (dryRun) return console.log(`Snapshot of ${commit} written to ${out}`);
    commitSnapshot(out, `upstream: ${config.repo}/${config.path} ${version ?? ""} ${commit.slice(0, 12)}`.replace(/\s+/g, " "));
    rmSync(out, { recursive: true, force: true });
  } finally {
    if (!given) rmSync(source, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
