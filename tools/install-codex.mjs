#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, readlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_FILE, PSTACK, createWriter, lstat, manifestContent, readInstallManifest, removeEmptyDirs, removeRecorded, renderAdapter, sha256, skillLinks } from "./install-lib.mjs";

const SCRIPT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// Paths in the manifest and on disk, relative to the codex home.
const ADAPTER_FILE = "pstack/codex.md";
// Detection matches the marker prefix, so a marker whose trailing note changed
// is still replaced instead of duplicated.
const BLOCK_BEGIN = "<!-- pstack:begin";
const BLOCK_END = "<!-- pstack:end";
const BLOCK_BEGIN_LINE = "<!-- pstack:begin (managed by pstack-port tools/install-codex.mjs) -->";
const BLOCK_END_LINE = "<!-- pstack:end -->";
const USAGE = `Usage: node tools/install-codex.mjs [options]
Install pstack for Codex: link the entry skill into $CODEX_HOME/skills, wrap
every other skill in a directory that keeps it out of the automatic catalog,
render adapter/codex.md, and add a managed block to $CODEX_HOME/AGENTS.md.

Options:
  --root <dir>          package root (default: the repository holding this script)
  --codex-home <dir>    codex config directory (default: $CODEX_HOME or ~/.codex)
  --dry-run             print every change and write nothing
  --uninstall           remove the links, adapter, block and manifest this installer wrote
  -h, --help            show this help`;

function parseArgs(argv) {
  const options = {
    root: SCRIPT_ROOT,
    codexHome: resolve(process.env.CODEX_HOME || join(homedir(), ".codex")),
    dryRun: false,
    uninstall: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined) throw new Error(`${arg} needs a value`);
      index += 1;
      return next;
    };
    if (arg === "--root") options.root = resolve(value());
    else if (arg === "--codex-home") options.codexHome = resolve(value());
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--uninstall") options.uninstall = true;
    else if (arg === "-h" || arg === "--help") options.help = true;
    else throw new Error(`unknown option ${arg}`);
  }
  return options;
}

// The one block this installer owns in the user's global AGENTS.md. It stays
// short because every Codex session loads that file; the adapter holds the rest.
function blockText(root, adapterPath) {
  return `${BLOCK_BEGIN_LINE}
## pstack

pstack 技能已装成本机的 \`pstack-<名>\`，入口 \`pstack\`。用到 pstack 时先读 \`${adapterPath}\`（占位符已填成本机绝对路径），再读 \`${join(root, "adapter", "overrides.md")}\`；overrides 优先。
${BLOCK_END_LINE}`;
}

// A begin marker with no matching end means someone edited the block by hand.
// Guessing where it ends would rewrite text this installer does not own.
function findBlock(text, agentsPath) {
  const begin = text.indexOf(BLOCK_BEGIN);
  const end = text.indexOf(BLOCK_END, begin === -1 ? 0 : begin);
  if (begin === -1 && end === -1) return undefined;
  if (begin === -1 || end === -1) throw new Error(`${agentsPath} has unpaired pstack markers; fix or remove the half block and run again`);
  const endOfLine = text.indexOf("\n", end);
  return { begin, end: endOfLine === -1 ? text.length : endOfLine };
}

function agentsWithBlock(agentsPath, block) {
  const stat = lstat(agentsPath);
  if (stat && !stat.isFile()) throw new Error(`${agentsPath} exists and is not a file; move it away and run again`);
  const text = stat ? readFileSync(agentsPath, "utf8") : "";
  const region = findBlock(text, agentsPath);
  if (region) {
    const next = `${text.slice(0, region.begin)}${block}${text.slice(region.end)}`;
    return next.endsWith("\n") ? next : `${next}\n`;
  }
  if (text === "") return `${block}\n`;
  return `${text.endsWith("\n") ? text : `${text}\n`}\n${block}\n`;
}

// Removing the block also removes the blank line that separated it, so a file
// that held only the block ends up empty and is deleted by the caller.
function removeBlock(text, agentsPath) {
  const region = findBlock(text, agentsPath);
  if (!region) return text;
  const before = text.slice(0, region.begin).replace(/\n$/, "");
  const after = text.slice(region.end).replace(/^\n/, "");
  const joined = before + after;
  return joined === "" ? "" : joined.replace(/\n+$/, "\n");
}

// Codex reads a per-skill policy from agents/openai.yaml inside the skill's own
// directory. The package skill directories are upstream files, so a skill that
// must stay out of the automatic catalog gets a real directory: a copy of its
// SKILL.md (Codex 0.171.0 ignores a skill whose SKILL.md is a symlink), links
// to its other files, and the generated policy. The entry skill stays a plain
// link and in the catalog.
const POLICY = "policy:\n  allow_implicit_invocation: false\n";
const skip = (message) => console.log(`skip ${message}`);

function wrappedSkill(id, target) {
  const dir = `skills/${id}`;
  return {
    dir,
    files: [
      { path: `${dir}/SKILL.md`, content: readFileSync(join(target, "SKILL.md"), "utf8") },
      { path: `${dir}/agents/openai.yaml`, content: POLICY },
    ],
    links: readdirSync(target)
      .filter((name) => name !== "SKILL.md")
      .sort()
      .map((name) => ({ path: `${dir}/${name}`, target: join(target, name) })),
  };
}

// Everything is checked before the first write: a skills directory that is not
// a directory, a skill entry this installer did not create, or a pstack
// directory with no manifest leaves the codex home untouched.
function assertInstallable(options, skillsDir, previous, links, wrapped) {
  const stat = lstat(skillsDir);
  if (stat?.isSymbolicLink()) throw new Error(`${skillsDir} is a symlink; this installer never creates one. Move it away, or install into another home with --codex-home`);
  if (stat && !stat.isDirectory()) throw new Error(`${skillsDir} exists and is not a directory; move it away, or install into another home with --codex-home`);

  const adapterDir = join(options.codexHome, "pstack");
  const adapterStat = lstat(adapterDir);
  if (adapterStat && !adapterStat.isDirectory()) throw new Error(`${adapterDir} exists and is not a directory; move it away, or install into another home with --codex-home`);
  if (adapterStat && !previous && readdirSync(adapterDir).length > 0) {
    throw new Error(`${adapterDir} already exists and was not created by this installer (no ${MANIFEST_FILE}); move it away, or install into another home with --codex-home`);
  }

  // Only a link the earlier manifest recorded, at this path and this target,
  // is this installer's. A link the user made at a pstack id is a conflict
  // even when it points into the package, so this installer never claims it.
  const recordedLinks = new Map((previous?.links ?? []).map((link) => [link.path, resolve(link.target)]));
  const recordedFiles = new Set((previous?.files ?? []).map((file) => file.path));
  const conflicts = [];
  const checkLink = (path, pathKey) => {
    const entry = lstat(path);
    if (!entry) return;
    if (!entry.isSymbolicLink()) {
      conflicts.push(`${path} exists and is not a symlink`);
      return;
    }
    const current = resolve(dirname(path), readlinkSync(path));
    if (recordedLinks.get(pathKey) !== current) conflicts.push(`${path} points to ${current}`);
  };

  for (const id of links.keys()) {
    const path = join(skillsDir, id);
    const wrapper = wrapped.get(id);
    if (!wrapper) {
      checkLink(path, `skills/${id}`);
      continue;
    }
    const entry = lstat(path);
    if (!entry) continue;
    if (!entry.isDirectory()) {
      conflicts.push(entry.isSymbolicLink() ? `${path} points to ${resolve(dirname(path), readlinkSync(path))}` : `${path} exists and is not a directory`);
      continue;
    }
    // A directory this installer did not write is the user's, even when it
    // holds the same name or links into the package.
    const owned = [...wrapper.links, ...wrapper.files].some((item) => recordedLinks.has(item.path) || recordedFiles.has(item.path));
    if (!owned) {
      conflicts.push(`${path} exists and was not created by this installer`);
      continue;
    }
    for (const link of wrapper.links) checkLink(join(options.codexHome, link.path), link.path);
    for (const file of wrapper.files) {
      const filePath = join(options.codexHome, file.path);
      const fileStat = lstat(filePath);
      if (fileStat && (!fileStat.isFile() || !recordedFiles.has(file.path))) conflicts.push(`${filePath} exists and was not created by this installer`);
    }
  }
  if (conflicts.length > 0) throw new Error(`${conflicts.join("\n")}\nmove these away, or install into another home with --codex-home`);
}

// Directories the recorded entries live in, deepest first. `skills` itself is
// not the installer's, so it is not in the list.
function entryDirectories(baseDir, entries) {
  const dirs = new Set();
  for (const entry of entries) {
    for (let dir = dirname(entry.path); dir !== "." && dir !== "skills"; dir = dirname(dir)) dirs.add(join(baseDir, dir));
  }
  return [...dirs].sort((left, right) => right.split(sep).length - left.split(sep).length);
}

function uninstall(options, paths, previous, writer) {
  const { note } = writer;
  if (!previous) console.log(`no ${MANIFEST_FILE} in ${options.codexHome}: only the managed block can be removed`);

  // The manifest lists everything this installer wrote. Uninstall never scans
  // the skills directory, so a link it did not record survives even when it
  // points into the package.
  const entries = [...(previous?.files ?? []), ...(previous?.links ?? [])];
  removeRecorded({ baseDir: options.codexHome, entries, note, skip, dryRun: options.dryRun });

  if (lstat(paths.agentsPath)?.isFile()) {
    const text = readFileSync(paths.agentsPath, "utf8");
    const next = removeBlock(text, paths.agentsPath);
    if (next !== text) {
      if (next === "") {
        note(`remove ${paths.agentsPath}`);
        if (!options.dryRun) unlinkSync(paths.agentsPath);
      } else {
        note(`write ${paths.agentsPath}`);
        if (!options.dryRun) writeFileSync(paths.agentsPath, next);
      }
    }
  }

  if (lstat(paths.manifestPath)?.isFile()) {
    note(`remove ${paths.manifestPath}`);
    if (!options.dryRun) unlinkSync(paths.manifestPath);
  }
  removeEmptyDirs({ dirs: [...new Set([join(options.codexHome, "pstack"), ...entryDirectories(options.codexHome, entries)])], note, dryRun: options.dryRun });
}

function main(options) {
  const skillsDir = join(options.codexHome, "skills");
  const paths = {
    skillsDir,
    agentsPath: join(options.codexHome, "AGENTS.md"),
    adapterPath: join(options.codexHome, ADAPTER_FILE),
    manifestPath: join(options.codexHome, MANIFEST_FILE),
  };
  const writer = createWriter(options.dryRun);
  const { note, writeIfChanged, ensureLink } = writer;
  const previous = readInstallManifest(options.codexHome);
  if (options.uninstall) {
    uninstall(options, paths, previous, writer);
    if (writer.changes === 0) console.log(`nothing to remove for ${PSTACK}`);
    else if (!options.dryRun) console.log(`removed what this installer wrote for ${PSTACK}`);
    return;
  }

  // Read and validate everything before the first write, so a conflicting entry
  // or an edited AGENTS.md leaves the codex home untouched.
  const links = skillLinks(options.root);
  const wrapped = new Map([...links].filter(([id]) => id !== PSTACK).map(([id, target]) => [id, wrappedSkill(id, target)]));
  const adapter = renderAdapter(options.root, "codex.md");
  const block = blockText(options.root, paths.adapterPath);
  const agents = agentsWithBlock(paths.agentsPath, block);
  assertInstallable(options, skillsDir, previous, links, wrapped);

  if (!options.dryRun) {
    mkdirSync(skillsDir, { recursive: true });
    mkdirSync(dirname(paths.adapterPath), { recursive: true });
  }
  writeIfChanged(paths.adapterPath, adapter);
  writeIfChanged(paths.agentsPath, agents);
  for (const [id, target] of links) {
    const wrapper = wrapped.get(id);
    if (!wrapper) {
      ensureLink(join(skillsDir, id), target);
      continue;
    }
    if (!options.dryRun) mkdirSync(join(options.codexHome, wrapper.dir, "agents"), { recursive: true });
    for (const link of wrapper.links) ensureLink(join(options.codexHome, link.path), link.target);
    for (const file of wrapper.files) writeIfChanged(join(options.codexHome, file.path), file.content);
  }

  // A skill removed from the package leaves its recorded entries behind. Only
  // that record decides what is ours; a link this installer never wrote is
  // left alone, even when it points into the package.
  const linkEntries = [...links].flatMap(([id, target]) => wrapped.get(id)?.links ?? [{ path: `skills/${id}`, target }]);
  const fileEntries = [
    { path: ADAPTER_FILE, sha256: sha256(adapter) },
    ...[...wrapped.values()].flatMap((wrapper) => wrapper.files.map((file) => ({ path: file.path, sha256: sha256(file.content) }))),
  ];
  const keptLinks = new Set(linkEntries.map((entry) => entry.path));
  const keptFiles = new Set(fileEntries.map((entry) => entry.path));
  const removed = [
    ...(previous?.files ?? []).filter((entry) => !keptFiles.has(entry.path)),
    ...(previous?.links ?? []).filter((entry) => !keptLinks.has(entry.path)),
  ];
  removeRecorded({ baseDir: options.codexHome, entries: removed, note, skip, dryRun: options.dryRun });
  removeEmptyDirs({ dirs: entryDirectories(options.codexHome, removed), note, dryRun: options.dryRun });

  // Written last: it is the record of what this run wrote, for the next run and
  // for uninstall.
  writeIfChanged(paths.manifestPath, manifestContent({ root: options.root, files: fileEntries, links: linkEntries }));

  if (options.dryRun) console.log("[dry-run] nothing written");
  else if (writer.changes === 0) console.log(`${PSTACK} codex install is up to date: ${options.codexHome}`);
  else console.log(`installed ${PSTACK} for codex: ${options.codexHome}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(USAGE);
  else main(options);
} catch (error) {
  console.error(`install-codex: ${error.message}`);
  process.exit(1);
}
