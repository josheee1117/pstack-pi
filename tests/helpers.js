import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

export const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const skillsDir = join(repoRoot, "skills");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Locate the installed Pi package so the tests exercise the real loader instead
 * of a reimplementation. Returns the package root, or undefined when Pi is not
 * installed on this machine.
 */
export function findPiPackageRoot() {
  if (process.env.PSTACK_TEST_PI_ROOT) {
    const root = realpathSync(process.env.PSTACK_TEST_PI_ROOT);
    if (!existsSync(join(root, "dist", "index.js"))) throw new Error("PSTACK_TEST_PI_ROOT is not a Pi package");
    return root;
  }
  const candidates = [];
  const pushIfPackage = (dir) => {
    if (existsSync(join(dir, "dist", "index.js")) && existsSync(join(dir, "package.json"))) {
      candidates.push(dir);
    }
  };

  try {
    const piBin = execFileSync("which", ["pi"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (piBin) {
      let dir = dirname(realpathSync(piBin));
      for (let i = 0; i < 6; i += 1) {
        pushIfPackage(dir);
        dir = dirname(dir);
      }
    }
  } catch {
    // pi is not on PATH; fall through to the global npm root.
  }

  try {
    const root = execFileSync("npm", ["root", "-g"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 20000,
    }).trim();
    pushIfPackage(join(root, "@earendil-works", "pi-coding-agent"));
  } catch {
    // npm is unavailable; no further candidates.
  }

  return candidates[0];
}

export async function loadPi() {
  const root = findPiPackageRoot();
  if (!root) return undefined;
  return import(pathToFileURL(join(root, "dist", "index.js")).href);
}

/** Skill directories shipped by this package. */
export function skillDirsOnDisk() {
  return readdirSync(skillsDir)
    .filter((entry) => existsSync(join(skillsDir, entry, "SKILL.md")))
    .sort();
}

/** The name the package gives each upstream skill directory, per upstream.json. */
export function expectedName(dir) {
  const config = readJson(join(repoRoot, "upstream.json"));
  return config.rename[dir] ?? `${config.namePrefix}${dir}`;
}

// Original Pi warns about directory/name mismatch but still registers these
// namespaced commands. Do not suppress collisions or any other diagnostic.
// A full resource loader also scans global skill roots (~/.agents/skills,
// ~/.codex/skills). A diagnostic about a skill outside this package is not ours.
export function unexpectedSkillDiagnostics(diagnostics) {
  const allowed = new Set(upstreamSkillDirs.map((dir) => `name "${expectedName(dir)}" does not match parent directory "${dir}"`));
  return diagnostics.filter((d) => String(d.path ?? "").startsWith(skillsDir) && !allowed.has(d.message));
}

// Upstream pstack 0.15.20's skills, minus make-bot-ui (Cursor's Grok Bot runtime).
export const upstreamSkillDirs = [
  "architect", "arena", "automate-me", "benchmark-checklist", "blast-radius", "bro", "correct",
  "create-verification-skill", "figure-it-out", "how", "interrogate", "maintain-verification-skill",
  "ketchup", "no-comments", "poteto-help", "poteto-mode",
  "recall", "reflect", "setup-pstack", "show-me-your-work", "swarm", "tdd", "teach",
  "technical-writing", "typescript-best-practices", "unslop", "why",
  ...[
    "attack-the-premise", "boundary-discipline", "build-the-lever", "encode-lessons-in-structure",
    "exhaust-the-design-space", "experience-first", "explain-the-number", "fix-root-causes", "foundational-thinking",
    "guard-the-context-window", "laziness-protocol", "make-operations-idempotent",
    "migrate-callers-then-delete-legacy-apis", "minimize-reader-load", "model-the-domain",
    "never-block-on-the-human", "outcome-oriented-execution", "prove-it-works",
    "redesign-from-first-principles", "separate-before-serializing-shared-state",
    "sequence-verifiable-units", "subtract-before-you-add", "test-behavior-not-implementation",
    "type-system-discipline",
  ].map((p) => `principle-${p}`),
].sort();
