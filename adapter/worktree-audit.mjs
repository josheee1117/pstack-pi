#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { lstat, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const DAY = 86_400_000;
const run = (command, args, cwd) => execFileSync(command, args, {
  cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15000,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
});
const git = (cwd, ...args) => run("git", args, cwd).trim();
const attempt = (fn) => { try { return fn(); } catch { return undefined; } };
const canonical = async (path) => realpath(path).catch(() => resolve(path));
const within = (root, path) => { const r = relative(root, path); return r === "" || (!r.startsWith(`..${sep}`) && r !== ".." && !isAbsolute(r)); };
export const sessionKey = (cwd) => `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;

async function filesIn(dir) {
  const files = [];
  let incomplete = false;
  try {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      if (e.isSymbolicLink()) { incomplete = true; continue; }
      if (e.isDirectory()) {
        const nested = await filesIn(path);
        files.push(...nested.files);
        incomplete ||= nested.incomplete;
      } else if (e.isFile() && e.name.endsWith(".jsonl")) files.push(path);
    }
  } catch { incomplete = true; }
  return { files, incomplete };
}

function mentions(value, path) {
  if (typeof value === "string") {
    let start = -1;
    while ((start = value.indexOf(path, start + 1)) !== -1) {
      const before = value[start - 1];
      const after = value[start + path.length];
      if ((!before || /[\s'"=:(]/.test(before)) && (!after || /[\s/\\'";)]/.test(after))) return true;
    }
    return false;
  }
  if (Array.isArray(value)) return value.some((v) => mentions(v, path));
  return value && typeof value === "object" && Object.values(value).some((v) => mentions(v, path));
}

async function sessionActivity(trees, sessionDir, agentDir) {
  const times = new Map();
  const roots = sessionDir ? [resolve(sessionDir)] : trees.map((t) => join(agentDir, "sessions", sessionKey(t.path)));
  let incomplete = false;
  const files = new Set();
  for (const root of new Set(roots)) {
    const found = await filesIn(root);
    incomplete ||= found.incomplete;
    for (const file of found.files) files.add(file);
  }
  // A custom --session-dir need not use Pi's default layout. Only the current
  // file is implicit; scanning any other custom corpus needs --session-dir.
  if (process.env.PI_SESSION_FILE) files.add(process.env.PI_SESSION_FILE);
  for (const file of files) {
    let stream;
    let lines;
    try {
      stream = createReadStream(file, { encoding: "utf8" });
      lines = createInterface({ input: stream, crlfDelay: Infinity });
      let header = true;
      const touched = new Set();
      for await (const line of lines) {
        const entry = JSON.parse(line);
        if (header) {
          header = false;
          if (entry.type !== "session" || typeof entry.cwd !== "string" || !isAbsolute(entry.cwd)) throw new Error("invalid session header");
          const cwd = await canonical(entry.cwd);
          // Directory names are lossy encodings. Never read the remaining
          // conversation merely because its directory name matches.
          const own = trees.filter((t) => within(t.path, cwd));
          if (!own.length) break;
          for (const tree of own) touched.add(tree.path);
        } else {
          for (const tree of trees) if (mentions(entry, tree.path)) touched.add(tree.path);
        }
      }
      if (header) throw new Error("empty session");
      const { mtimeMs } = await stat(file);
      for (const path of touched) times.set(path, Math.max(times.get(path) ?? 0, mtimeMs));
    } catch { incomplete = true; }
    finally { lines?.close(); stream?.destroy(); }
  }
  return { times, incomplete };
}

async function sizeOf(path) {
  const s = await lstat(path);
  if (!s.isDirectory()) return s.size;
  let bytes = 0;
  for (const e of await readdir(path)) bytes += await sizeOf(join(path, e));
  return bytes;
}

export async function auditWorktrees(repo, { sessionDir, base, prs = false, now = Date.now(), agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent") } = {}) {
  repo = resolve(repo);
  const raw = run("git", ["worktree", "list", "--porcelain", "-z"], repo);
  const trees = [];
  let tree;
  for (const field of raw.split("\0")) {
    if (field.startsWith("worktree ")) { tree = { path: field.slice(9) }; trees.push(tree); }
    else if (field && tree) { const [key, ...rest] = field.split(" "); tree[key] = rest.join(" ") || true; }
  }
  for (const tree of trees) tree.path = await canonical(tree.path);
  const ref = base ?? attempt(() => git(repo, "symbolic-ref", "refs/remotes/origin/HEAD")) ?? "refs/remotes/origin/main";
  const activity = await sessionActivity(trees, sessionDir, resolve(agentDir));
  const prData = prs ? attempt(() => JSON.parse(run("gh", ["pr", "list", "--state", "all", "--limit", "1000", "--json", "number,state,headRefName"], repo))) : undefined;
  const rows = [];
  for (const tree of trees.slice(1)) {
    const path = tree.path;
    const status = attempt(() => run("git", ["status", "--porcelain=v1", "-z"], path));
    const dirty = status === undefined ? "unknown" : status ? (status.split("\0").some((s) => s && !s.startsWith("??")) ? "wip" : "untracked") : "clean";
    const branch = typeof tree.branch === "string" ? tree.branch.replace(/^refs\/heads\//, "") : "";
    const head = typeof tree.HEAD === "string" ? tree.HEAD : undefined;
    const mergeBase = head && attempt(() => git(repo, "merge-base", head, ref));
    const merged = mergeBase === undefined ? "unknown" : mergeBase === head ? "YES" : "no";
    const remoteHead = branch && attempt(() => git(repo, "rev-parse", "--verify", `refs/remotes/origin/${branch}`));
    const remote = !branch ? "detached" : !remoteHead ? "unknown" : remoteHead === head ? "pushed" : "differs";
    const matching = Array.isArray(prData) ? prData.filter((p) => p.headRefName === branch) : [];
    const pr = !Array.isArray(prData) ? "unknown" : matching.map((p) => `#${p.number}/${p.state}`).join(",") || "-";
    const last = activity.times.get(path);
    const recent = last !== undefined && now - last <= 4 * DAY;
    const lastChat = last === undefined ? "unknown" : new Date(last).toISOString().slice(0, 10) + (activity.incomplete ? " (partial)" : "");
    const headSeconds = Number(attempt(() => git(path, "log", "-1", "--format=%ct", "HEAD")));
    let bytes;
    try { bytes = await sizeOf(path); } catch { /* unreadable size stays unknown */ }
    const bucket = tree.locked ? "hold-locked" : tree.prunable ? "hold-prunable" : dirty === "wip" ? "hold-wip" : dirty === "untracked" ? "hold-untracked" : matching.some((p) => p.state === "OPEN") ? "hold-open-pr" : recent ? "verify-recent-chat" : "review";
    rows.push({ size: bytes === undefined ? "unknown" : `${Math.ceil(bytes / 1024)}K`, age: Number.isFinite(headSeconds) ? `${Math.max(0, Math.floor((now - headSeconds * 1000) / DAY))}d` : "unknown", merged, dirty, remote, pr, lastChat, bucket, path, bytes });
  }
  // Absence of a recorded chat never proves inactivity. Even clean merged
  // worktrees need a human usage check, so this audit never emits "safe".
  return rows.sort((a, b) => (b.bytes ?? -1) - (a.bytes ?? -1));
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {};
  let repo;
  while (args.length) {
    const arg = args.shift();
    if (arg === "--prs") opts.prs = true;
    else if (arg === "--session-dir" || arg === "--base") {
      if (!args.length || args[0].startsWith("--")) throw new Error(`${arg} needs a value`);
      opts[arg === "--base" ? "base" : "sessionDir"] = args.shift();
    } else if (arg.startsWith("-") || repo !== undefined) throw new Error(`Unknown argument: ${arg}`);
    else repo = arg;
  }
  const rows = await auditWorktrees(repo ?? process.cwd(), opts);
  const cell = (s) => /[\t\r\n]/.test(s) ? JSON.stringify(s) : s;
  console.log("SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE");
  for (const r of rows) console.log([r.size, r.age, r.merged, r.dirty, r.remote, r.pr, r.lastChat, r.bucket, r.path].map(cell).join("\t"));
  console.error("Read-only audit. Merge/remote state uses local refs (no fetch). All rows require a usage check; none authorizes deletion.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
