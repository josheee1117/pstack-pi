#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, readlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_FILE, PSTACK, createWriter, lstat, manifestContent, pointsIntoPackageSkills, readInstallManifest, removeEmptyDirs, removeLinksForRemovedSkills, removeRecorded, renderAdapter, sha256, skillLinks } from "./install-lib.mjs";

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

Install pstack for Codex: link every skill into $CODEX_HOME/skills as
pstack-<name>, render adapter/codex.md, and add a managed block to
$CODEX_HOME/AGENTS.md.

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

// Everything is checked before the first write: a skills directory that is not
// a directory, a skill entry this installer did not create, or a pstack
// directory with no manifest leaves the codex home untouched.
function assertInstallable(options, skillsDir, previous, links) {
  const stat = lstat(skillsDir);
  if (stat?.isSymbolicLink()) throw new Error(`${skillsDir} is a symlink; this installer never creates one. Move it away, or install into another home with --codex-home`);
  if (stat && !stat.isDirectory()) throw new Error(`${skillsDir} exists and is not a directory; move it away, or install into another home with --codex-home`);

  const adapterDir = join(options.codexHome, "pstack");
  const adapterStat = lstat(adapterDir);
  if (adapterStat && !adapterStat.isDirectory()) throw new Error(`${adapterDir} exists and is not a directory; move it away, or install into another home with --codex-home`);
  if (adapterStat && !previous && readdirSync(adapterDir).length > 0) {
    throw new Error(`${adapterDir} already exists and was not created by this installer (no ${MANIFEST_FILE}); move it away, or install into another home with --codex-home`);
  }

  const recorded = new Map((previous?.links ?? []).map((link) => [link.path, link.target]));
  const conflicts = [];
  for (const [id, target] of links) {
    const path = join(skillsDir, id);
    const entry = lstat(path);
    if (!entry) continue;
    if (!entry.isSymbolicLink()) {
      conflicts.push(`${path} exists and is not a symlink`);
      continue;
    }
    const current = resolve(dirname(path), readlinkSync(path));
    if (current !== resolve(target) && current !== recorded.get(`skills/${id}`) && !pointsIntoPackageSkills(current, options.root)) {
      conflicts.push(`${path} points to ${current}`);
    }
  }
  if (conflicts.length > 0) throw new Error(`${conflicts.join("\n")}\nmove these away, or install into another home with --codex-home`);
}

function uninstall(options, paths, previous, writer) {
  const { note } = writer;
  const skip = (message) => console.log(`skip ${message}`);
  if (!previous) console.log(`no ${MANIFEST_FILE} in ${options.codexHome}: only the managed block and links that point into the package can be removed`);

  removeRecorded({ baseDir: options.codexHome, entries: [...(previous?.files ?? []), ...(previous?.links ?? [])], note, skip, dryRun: options.dryRun });

  // Uninstall removes every link that points into the package: the ones the
  // manifest recorded above, and a skill that left the package after the last
  // run.
  removeLinksForRemovedSkills({ linksDir: paths.skillsDir, current: new Set(), recorded: new Map(), root: options.root, note, dryRun: options.dryRun });

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
  removeEmptyDirs({ dirs: [join(options.codexHome, "pstack")], note, dryRun: options.dryRun });
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
  const adapter = renderAdapter(options.root, "codex.md");
  const block = blockText(options.root, paths.adapterPath);
  const agents = agentsWithBlock(paths.agentsPath, block);
  assertInstallable(options, skillsDir, previous, links);

  if (!options.dryRun) {
    mkdirSync(skillsDir, { recursive: true });
    mkdirSync(dirname(paths.adapterPath), { recursive: true });
  }
  writeIfChanged(paths.adapterPath, adapter);
  writeIfChanged(paths.agentsPath, agents);
  for (const [id, target] of links) ensureLink(join(skillsDir, id), target);

  const recorded = new Map((previous?.links ?? []).map((link) => [link.path, link.target]));
  removeLinksForRemovedSkills({ linksDir: skillsDir, current: links, recorded, root: options.root, note, dryRun: options.dryRun });

  // Written last: it is the record of what this run wrote, for the next run and
  // for uninstall.
  writeIfChanged(paths.manifestPath, manifestContent({
    root: options.root,
    files: [{ path: ADAPTER_FILE, sha256: sha256(adapter) }],
    links,
  }));

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
