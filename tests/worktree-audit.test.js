import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import { auditWorktrees, sessionKey } from "../adapter/worktree-audit.mjs";
import { repoRoot } from "./helpers.js";

const script = join(repoRoot, "adapter", "worktree-audit.mjs");
const git = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], {
  encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_OPTIONAL_LOCKS: "0" },
}).trim();

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "pstack-worktrees-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, "项目 with spaces");
  const work = join(root, process.platform === "win32" ? "工作 tree" : "工作 tree : back\\slash");
  const agentDir = join(root, "Pi config");
  mkdirSync(repo);
  git(repo, "init", "--quiet", "-b", "main");
  git(repo, "config", "user.name", "Fixture");
  git(repo, "config", "user.email", "fixture@example.invalid");
  writeFileSync(join(repo, "file.txt"), "base\n");
  git(repo, "add", "file.txt");
  git(repo, "commit", "--quiet", "-m", "base");
  git(repo, "worktree", "add", "--quiet", "-b", "work", work);
  for (const path of [repo, work]) mkdirSync(join(agentDir, "sessions", sessionKey(path)), { recursive: true });
  return { root, repo, work, agentDir };
}

function session(dir, name, cwd, entries = []) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, name);
  writeFileSync(file, [JSON.stringify({ type: "session", version: 3, cwd }), ...entries.map(JSON.stringify)].join("\n") + "\n");
  return file;
}

function envFor(f, extra = {}) {
  const env = { ...process.env, PI_CODING_AGENT_DIR: f.agentDir, ...extra };
  delete env.PI_SESSION_FILE;
  return env;
}

function runAudit(f, ...args) {
  const result = spawnSync(process.execPath, [script, f.repo, ...args], { encoding: "utf8", env: envFor(f) });
  assert.equal(result.status, 0, result.stderr);
  const [header, ...lines] = result.stdout.trim().split("\n");
  const keys = header.split("\t");
  return lines.map((line) => Object.fromEntries(line.split("\t").map((v, i) => [keys[i], v])));
}

test("session keys preserve underscores and encode Windows separators without treating paths as regex", () => {
  assert.equal(sessionKey("/Users/you/my_repo"), "--Users-you-my_repo--");
  assert.equal(sessionKey("C:\\Users\\名字\\my_repo"), "--C--Users-名字-my_repo--");
  assert.equal(sessionKey("/a/b-c"), sessionKey("/a-b/c"), "header checks are necessary because encoding is lossy");
});

test("CLI accepts a single-dash session directory and -b sets the base", (t) => {
  const f = fixture(t);
  session(join(f.repo, "-sessions"), "own.jsonl", f.work);
  const result = spawnSync(process.execPath, [script, f.repo, "--session-dir", "-sessions", "-b", "main"], {
    cwd: f.repo, encoding: "utf8", env: envFor(f),
  });
  assert.equal(result.status, 0, result.stderr);
  const [header, line] = result.stdout.trim().split("\n");
  const row = Object.fromEntries(line.split("\t").map((value, i) => [header.split("\t")[i], value]));
  assert.equal(row.MERGED, "YES", "-b main overrides the missing default remote ref");
  assert.equal(row.BUCKET, "verify-recent-chat", "-sessions is consumed as the session directory value");
});

test("recent own and main-session activity are found with spaces, Unicode, and custom Pi home", (t) => {
  const f = fixture(t);
  const own = join(f.agentDir, "sessions", sessionKey(f.work));
  session(own, "own session.jsonl", f.work);
  let row = runAudit(f, "--base", "main")[0];
  assert.equal(row.WORKTREE, f.work);
  assert.equal(row.BUCKET, "verify-recent-chat");
  assert.match(row.LAST_CHAT, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(row.MERGED, "YES");

  rmSync(join(own, "own session.jsonl"));
  const corpus = join(f.root, "explicit corpus");
  session(corpus, "main.jsonl", f.repo, [{ type: "message", message: { role: "assistant", content: [{ type: "toolCall", name: "bash", arguments: { command: `cd "${f.work}/src"` } }] } }]);
  row = runAudit(f, "--session-dir", corpus, "--base", "main")[0];
  assert.equal(row.BUCKET, "verify-recent-chat");
});

test("foreign header collisions and sibling path prefixes do not count as activity", (t) => {
  const f = fixture(t);
  const corpus = join(f.root, "collision corpus");
  session(corpus, "foreign.jsonl", join(f.root, "unrelated"), [{ text: f.work }]);
  // The tail must not be parsed after rejecting the foreign header.
  writeFileSync(join(corpus, "foreign.jsonl"), JSON.stringify({ type: "session", cwd: join(f.root, "unrelated") }) + "\nnot JSON\n");
  session(corpus, "main.jsonl", f.repo, [{ text: `${f.work}-other/file` }]);
  const row = runAudit(f, "--session-dir", corpus, "--base", "main")[0];
  assert.equal(row.LAST_CHAT, "unknown");
  assert.equal(row.BUCKET, "review");
});

test("a default encoded directory cannot make a foreign project's session count", (t) => {
  const f = fixture(t);
  const nested = join(f.root, "collision", "child");
  const foreign = join(f.root, "collision-child");
  mkdirSync(join(f.root, "collision"));
  git(f.repo, "worktree", "add", "--quiet", "-b", "collision", nested);
  assert.equal(sessionKey(nested), sessionKey(foreign));
  session(join(f.agentDir, "sessions", sessionKey(nested)), "foreign.jsonl", foreign, [{ text: `${nested}/file` }]);
  const row = runAudit(f, "--base", "main").find((r) => r.WORKTREE === nested);
  assert.equal(row.LAST_CHAT, "unknown");
  assert.equal(row.BUCKET, "review");
});

test("missing or malformed session evidence stays unknown; merged does not mean safe", (t) => {
  const f = fixture(t);
  let row = runAudit(f, "--session-dir", join(f.root, "missing"), "--base", "main")[0];
  assert.equal(row.MERGED, "YES");
  assert.equal(row.LAST_CHAT, "unknown");
  assert.equal(row.BUCKET, "review");
  const malformed = join(f.root, "malformed");
  mkdirSync(malformed);
  writeFileSync(join(malformed, "bad.jsonl"), "not a session\n");
  row = runAudit(f, "--session-dir", malformed)[0];
  assert.equal(row.MERGED, "unknown", "no default remote ref must not look merged");
  assert.equal(row.BUCKET, "review");
});

test("untracked work and locked or prunable worktrees are held", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.work, "keep me.txt"), "not disposable");
  assert.equal(runAudit(f, "--base", "main")[0].BUCKET, "hold-untracked");
  git(f.repo, "worktree", "lock", "--reason", "in use", f.work);
  assert.equal(runAudit(f)[0].BUCKET, "hold-locked");
  git(f.repo, "worktree", "unlock", f.work);
  rmSync(f.work, { recursive: true });
  assert.equal(runAudit(f)[0].BUCKET, "hold-prunable");
});

test("a closed PR is never deletion evidence and audit leaves git and worktree state untouched", (t) => {
  if (process.platform === "win32") return t.skip("the hermetic gh executable fixture uses a POSIX shebang");
  const f = fixture(t);
  const bin = join(f.root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "gh"), '#!/usr/bin/env node\nconsole.log(JSON.stringify([{number:1,state:"CLOSED",headRefName:"work"}]))\n');
  chmodSync(join(bin, "gh"), 0o755);
  const oldFile = session(join(f.agentDir, "sessions", sessionKey(f.work)), "old.jsonl", f.work);
  const old = new Date(Date.now() - 20 * 86_400_000);
  utimesSync(oldFile, old, old);
  const before = { refs: git(f.repo, "show-ref"), trees: git(f.repo, "worktree", "list", "--porcelain"), index: readFileSync(join(f.repo, ".git", "index")), file: readFileSync(join(f.work, "file.txt")) };
  const result = spawnSync("bash", [join(repoRoot, "skills", "poteto-mode", "scripts", "worktree-audit.sh"), "-b", "main", f.repo, "--prs"], {
    encoding: "utf8", env: envFor(f, { PATH: `${bin}${delimiter}${process.env.PATH}` }),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /#1\/CLOSED/);
  assert.match(result.stdout, /\treview\t/);
  assert.doesNotMatch(result.stdout, /\tsafe\t/);
  assert.equal(git(f.repo, "show-ref"), before.refs);
  assert.equal(git(f.repo, "worktree", "list", "--porcelain"), before.trees);
  assert.deepEqual(readFileSync(join(f.repo, ".git", "index")), before.index);
  assert.deepEqual(readFileSync(join(f.work, "file.txt")), before.file);
  assert.equal(existsSync(join(f.repo, ".git", "FETCH_HEAD")), false, "no implicit fetch");
});

test("an invalid repository fails rather than reporting a clean empty audit", async () => {
  await assert.rejects(auditWorktrees(join(tmpdir(), "pstack-no-such-repository")), /ENOENT|not a git repository/);
});
