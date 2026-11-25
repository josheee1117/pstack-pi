// Shared by tools/install-agy.mjs and tools/install-codex.mjs: which skills the
// package ships, the ownership manifest, the adapter rendering, and the writes
// each installer performs.
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const SKILL_DIRS = ["skills", "local-skills"];
export const PSTACK = "pstack";
export const MANIFEST_FILE = ".pstack-install.json";

// The registered id comes from SKILL.md, not the directory: poteto-mode is
// `pstack`, setup-pstack is `pstack-setup`, teach is `pstack-teach-me`.
function skillName(skillFile) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(skillFile, "utf8"));
  const line = frontmatter && /^name:\s*(.+?)\s*$/m.exec(frontmatter[1]);
  return line ? line[1].replace(/^["']|["']$/g, "") : undefined;
}

export function skillLinks(root) {
  const links = new Map();
  for (const sub of SKILL_DIRS) {
    const base = join(root, sub);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base).sort()) {
      const target = join(base, name);
      const skillFile = join(target, "SKILL.md");
      if (!existsSync(skillFile)) continue;
      const id = skillName(skillFile);
      if (!id) continue; // both installers drop a skill without a name
      if (id !== PSTACK && !id.startsWith("pstack-")) throw new Error(`${skillFile} is named ${id}; expected ${PSTACK} or pstack-<name>`);
      if (links.has(id)) throw new Error(`two skills map to the plugin id ${id}: ${links.get(id)} and ${target}`);
      links.set(id, target);
    }
  }
  return links;
}

export const lstat = (path) => lstatSync(path, { throwIfNoEntry: false });
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

// A hand-edited or truncated file carries no record of what an installer wrote,
// so a parse failure means "not ours", not a crash.
export function readJson(path) {
  const content = readFileSync(path, "utf8");
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

export function readInstallManifest(dir) {
  const path = join(dir, MANIFEST_FILE);
  if (!lstat(path)?.isFile()) return undefined;
  const manifest = readJson(path);
  if (manifest?.name !== PSTACK || !Array.isArray(manifest.files) || !Array.isArray(manifest.links)) return undefined;
  return manifest;
}

export function pointsIntoPackageSkills(target, root) {
  return SKILL_DIRS.some((sub) => target.startsWith(join(resolve(root, sub), sep)));
}

// An adapter file is written for Cursor with path placeholders; this fills in
// this machine's absolute paths and refuses to leave one unresolved.
export function renderAdapter(root, fileName) {
  const values = {
    root,
    skills: join(root, "skills"),
    adapter: join(root, "adapter"),
    agentDir: resolve(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent")),
  };
  const template = readFileSync(join(root, "adapter", fileName), "utf8");
  const rendered = template.replace(/\{\{([A-Za-z]+)\}\}/g, (placeholder, name) => {
    if (!(name in values)) throw new Error(`adapter/${fileName} uses an unknown placeholder ${placeholder}`);
    return values[name];
  });
  if (rendered.includes("{{")) throw new Error(`adapter/${fileName} has an unresolved placeholder`);
  return rendered;
}

export function manifestContent({ root, files, links }) {
  const entries = [...links]
    .map(([id, target]) => ({ path: `skills/${id}`, target }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return `${JSON.stringify({ name: PSTACK, root, files, links: entries }, null, 2)}\n`;
}

// Counts what a run changed and performs its writes. In a dry run every write
// prints its plan and writes nothing.
export function createWriter(dryRun) {
  let changes = 0;
  const note = (message) => {
    changes += 1;
    console.log(`${dryRun ? "[dry-run] " : ""}${message}`);
  };
  return {
    note,
    get changes() {
      return changes;
    },
    writeIfChanged(path, content) {
      if (existsSync(path) && readFileSync(path, "utf8") === content) return;
      note(`write ${path}`);
      if (!dryRun) writeFileSync(path, content);
    },
    ensureLink(linkPath, target) {
      const stat = lstat(linkPath);
      if (!stat) {
        note(`link ${linkPath} -> ${target}`);
        if (!dryRun) symlinkSync(target, linkPath, "dir");
        return;
      }
      if (!stat.isSymbolicLink()) throw new Error(`${linkPath} exists and is not a symlink; remove it yourself and run again`);
      if (resolve(dirname(linkPath), readlinkSync(linkPath)) === resolve(target)) return;
      note(`relink ${linkPath} -> ${target}`);
      if (!dryRun) {
        unlinkSync(linkPath);
        symlinkSync(target, linkPath, "dir");
      }
    },
  };
}

// A skill removed from the package leaves its link behind. A link is ours when
// the manifest recorded it, or when it points into the package's own skill
// directories; anything else belongs to the user.
export function removeLinksForRemovedSkills({ linksDir, current, recorded, root, note, dryRun }) {
  if (!lstat(linksDir)?.isDirectory()) return;
  for (const entry of readdirSync(linksDir)) {
    if (current.has(entry)) continue;
    const path = join(linksDir, entry);
    const stat = lstat(path);
    if (!stat?.isSymbolicLink()) continue;
    const target = resolve(dirname(path), readlinkSync(path));
    if (target === recorded.get(`skills/${entry}`) || pointsIntoPackageSkills(target, root)) {
      note(`remove ${path}`);
      if (!dryRun) unlinkSync(path);
    }
  }
}

// A recorded file or link is ours only while its content or target still
// matches what the installer wrote.
export function removeRecorded({ baseDir, entries, note, skip, dryRun }) {
  for (const entry of entries) {
    const path = join(baseDir, entry.path);
    const stat = lstat(path);
    if (!stat) continue;
    if (entry.sha256) {
      if (!stat.isFile() || sha256(readFileSync(path)) !== entry.sha256) {
        skip(`${path}: changed since this installer wrote it`);
        continue;
      }
    } else if (!stat.isSymbolicLink() || resolve(dirname(path), readlinkSync(path)) !== resolve(entry.target)) {
      skip(`${path}: no longer points to ${entry.target}`);
      continue;
    }
    note(`remove ${path}`);
    if (!dryRun) unlinkSync(path);
  }
}

// Directories go last and only when empty, so a file the user added keeps its
// directory.
export function removeEmptyDirs({ dirs, note, dryRun }) {
  for (const dir of dirs) {
    if (!lstat(dir)?.isDirectory() || readdirSync(dir).length > 0) continue;
    note(`remove ${dir}`);
    if (!dryRun) rmdirSync(dir);
  }
}
