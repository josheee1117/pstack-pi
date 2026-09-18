import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

export const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const skillsDir = join(repoRoot, "skills");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function listFiles(dir, filter) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, filter));
    else if (!filter || filter(full)) out.push(full);
  }
  return out.sort();
}

/**
 * Locate the installed Pi package so the tests exercise the real loader instead
 * of a reimplementation. Returns the package root, or undefined when Pi is not
 * installed on this machine.
 */
export function findPiPackageRoot() {
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

/** Every skill directory shipped by this package, by skill name. */
export function skillNamesOnDisk() {
  return readdirSync(skillsDir)
    .filter((entry) => existsSync(join(skillsDir, entry, "SKILL.md")))
    .sort();
}

export const expectedPublicSkills = [
  "pstack",
  "pstack-architect",
  "pstack-arena",
  "pstack-automate-me",
  "pstack-blast-radius",
  "pstack-bro",
  "pstack-create-verification-skill",
  "pstack-figure-it-out",
  "pstack-how",
  "pstack-interrogate",
  "pstack-maintain-verification-skill",
  "pstack-no-comments",
  "pstack-recall",
  "pstack-reflect",
  "pstack-setup",
  "pstack-show-me-your-work",
  "pstack-swarm",
  "pstack-tdd",
  "pstack-teach",
  "pstack-technical-writing",
  "pstack-typescript-best-practices",
  "pstack-unslop",
  "pstack-why",
];

export const upstreamPlaybooks = [
  "investigation",
  "bug-fix",
  "perf-issue",
  "hillclimb",
  "runtime-forensics",
  "trace-forensics",
  "feature",
  "refactoring",
  "prototype",
  "visual-parity",
  "authoring-a-skill",
  "eval",
  "babysit",
  "shipping",
  "autonomous-run",
  "orchestrate",
  "autopilot-full",
  "autopilot-stack",
  "session-pickup",
  "pause-safely",
  "multi-phase-plan",
  "worktree-cleanup",
  "opening-a-pr",
];

export const upstreamPublicSkills = [
  "poteto-mode",
  "how",
  "why",
  "recall",
  "blast-radius",
  "architect",
  "arena",
  "swarm",
  "interrogate",
  "tdd",
  "bro",
  "unslop",
  "technical-writing",
  "no-comments",
  "typescript-best-practices",
  "figure-it-out",
  "show-me-your-work",
  "create-verification-skill",
  "maintain-verification-skill",
  "setup-pstack",
  "reflect",
  "automate-me",
  "teach",
  "make-bot-ui",
];

export const upstreamPrinciples = [
  "laziness-protocol",
  "foundational-thinking",
  "redesign-from-first-principles",
  "attack-the-premise",
  "subtract-before-you-add",
  "minimize-reader-load",
  "outcome-oriented-execution",
  "experience-first",
  "exhaust-the-design-space",
  "build-the-lever",
  "model-the-domain",
  "boundary-discipline",
  "type-system-discipline",
  "make-operations-idempotent",
  "migrate-callers-then-delete-legacy-apis",
  "separate-before-serializing-shared-state",
  "prove-it-works",
  "fix-root-causes",
  "sequence-verifiable-units",
  "test-behavior-not-implementation",
  "guard-the-context-window",
  "never-block-on-the-human",
  "encode-lessons-in-structure",
];
