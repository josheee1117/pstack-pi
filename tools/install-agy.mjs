#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, readlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_FILE, PSTACK, createWriter, lstat, manifestContent, readInstallManifest, readJson, removeEmptyDirs, removeLinksForRemovedSkills, removeRecorded, renderAdapter, sha256, skillLinks } from "./install-lib.mjs";

const SCRIPT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DESCRIPTION = "pstack 工作流技能：理解、设计、实现、独立验证、交付与恢复。";
// adapter/agy.md's heading. A plugin installed before the manifest existed
// still has it in rules/AGENTS.md, and that is how such a directory stays
// recognizable as this script's rather than someone else's.
const RULES_HEADING = "# pstack on agy (Antigravity)";
const USAGE = `Usage: node tools/install-agy.mjs [options]

Install pstack as an agy (Antigravity) plugin and link it into the T3
antigravity accounts that are enabled.

Options:
  --root <dir>         package root (default: the repository holding this script)
  --gemini-dir <dir>   agy config directory (default: ~/.gemini/config)
  --t3-home <dir>      T3 data directory (default: ~/.t3)
  --dry-run            print every change and write nothing
  --uninstall          remove the files, links and manifest this installer wrote
  -h, --help           show this help`;

function parseArgs(argv) {
  const options = {
    root: SCRIPT_ROOT,
    geminiDir: join(homedir(), ".gemini", "config"),
    t3Home: join(homedir(), ".t3"),
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
    else if (arg === "--gemini-dir") options.geminiDir = resolve(value());
    else if (arg === "--t3-home") options.t3Home = resolve(value());
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--uninstall") options.uninstall = true;
    else if (arg === "-h" || arg === "--help") options.help = true;
    else throw new Error(`unknown option ${arg}`);
  }
  return options;
}

// Each enabled antigravity instance keeps its own config directory under a
// sha256 of the instance key. Returns the plugins directory to link into.
function antigravityAccountDirs(t3Home) {
  const settingsPath = join(t3Home, "userdata", "settings.json");
  if (!existsSync(settingsPath)) return [];
  const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  return Object.entries(settings?.providerInstances ?? {})
    .filter(([, instance]) => instance?.driver === "antigravity" && instance.enabled === true)
    .map(([name]) => join(t3Home, "userdata", "providers", "antigravity", sha256(name), "config", "plugins"));
}

// Uninstall does not consult settings: a link written for an account that was
// disabled afterwards is still ours to remove.
function antigravityPluginLinks(t3Home) {
  const base = join(t3Home, "userdata", "providers", "antigravity");
  if (!existsSync(base)) return [];
  return readdirSync(base).map((id) => join(base, id, "config", "plugins", PSTACK));
}

// An install from before the manifest existed: plugin.json is this script's and
// the rules it rendered have no placeholder left.
function isEarlierInstall(pluginDir) {
  const rulesPath = join(pluginDir, "rules", "AGENTS.md");
  const pluginJson = join(pluginDir, "plugin.json");
  if (!lstat(rulesPath)?.isFile() || !lstat(pluginJson)?.isFile()) return false;
  const rules = readFileSync(rulesPath, "utf8");
  if (rules.includes("{{") || !rules.includes(RULES_HEADING)) return false;
  return readJson(pluginJson)?.name === PSTACK;
}

// The plugin directory is this installer's only when it wrote it: a manifest,
// nothing yet, or an earlier install. Anything else is stopped before the first
// write, with the path in the message.
function assertInstallable(pluginDir, manifest) {
  const stat = lstat(pluginDir);
  if (!stat) return;
  if (stat.isSymbolicLink()) {
    throw new Error(`${pluginDir} is a symlink to ${readlinkSync(pluginDir)}; this installer never creates one. Remove it, or install into another directory with --gemini-dir`);
  }
  if (!stat.isDirectory()) throw new Error(`${pluginDir} exists and is not a directory; move it away, or install into another directory with --gemini-dir`);
  if (manifest || readdirSync(pluginDir).length === 0 || isEarlierInstall(pluginDir)) return;
  throw new Error(`${pluginDir} already exists and was not created by this installer (no ${MANIFEST_FILE}); move it away, or install into another directory with --gemini-dir`);
}

function uninstall(options, pluginDir, manifest, writer) {
  const { note } = writer;
  const skip = (message) => console.log(`skip ${message}`);

  // An account link is ours only while it points at this plugin directory.
  for (const link of antigravityPluginLinks(options.t3Home)) {
    const stat = lstat(link);
    if (!stat) continue;
    if (!stat.isSymbolicLink()) {
      skip(`${link}: not a symlink, left in place`);
      continue;
    }
    const target = resolve(dirname(link), readlinkSync(link));
    if (target !== resolve(pluginDir)) {
      skip(`${link}: points to ${target}, not ${pluginDir}`);
      continue;
    }
    note(`remove ${link}`);
    if (!options.dryRun) unlinkSync(link);
  }

  if (!lstat(pluginDir)?.isDirectory()) return;
  if (!manifest) {
    console.log(`left ${pluginDir} in place: it has no ${MANIFEST_FILE}, so this installer cannot tell its own files from yours`);
    return;
  }

  // A recorded file or link is ours only while its content or target still
  // matches what the installer wrote.
  const entries = [...manifest.files, ...manifest.links];
  removeRecorded({ baseDir: pluginDir, entries, note, skip, dryRun: options.dryRun });
  note(`remove ${join(pluginDir, MANIFEST_FILE)}`);
  if (!options.dryRun) unlinkSync(join(pluginDir, MANIFEST_FILE));

  // Directories go last and only when empty, so a file the user added keeps its
  // directory, and the plugin directory with it.
  const directories = [...new Set(entries.map((entry) => dirname(entry.path)))]
    .filter((directory) => directory !== ".")
    .sort((left, right) => right.split(sep).length - left.split(sep).length)
    .map((directory) => join(pluginDir, directory));
  removeEmptyDirs({ dirs: [...directories, pluginDir], note, dryRun: options.dryRun });
}

function main(options) {
  const pluginDir = join(options.geminiDir, "plugins", PSTACK);
  const rulesDir = join(pluginDir, "rules");
  const skillsDir = join(pluginDir, "skills");
  const writer = createWriter(options.dryRun);
  const { note, writeIfChanged, ensureLink } = writer;
  const previous = readInstallManifest(pluginDir);
  if (options.uninstall) {
    uninstall(options, pluginDir, previous, writer);
    if (writer.changes === 0) console.log(`nothing to remove for ${PSTACK}`);
    else if (!options.dryRun) console.log(`removed what this installer wrote for ${PSTACK}`);
    return;
  }

  // Read and validate everything before the first write, so a bad settings
  // file, adapter, or an occupied plugin directory leaves it untouched.
  const accountDirs = antigravityAccountDirs(options.t3Home);
  const links = skillLinks(options.root);
  const rules = renderAdapter(options.root, "agy.md");
  const { version } = JSON.parse(readFileSync(join(options.root, "package.json"), "utf8"));
  const pluginJson = `${JSON.stringify({ name: PSTACK, version, description: DESCRIPTION }, null, 2)}\n`;
  assertInstallable(pluginDir, previous);

  if (!options.dryRun) {
    mkdirSync(rulesDir, { recursive: true });
    mkdirSync(skillsDir, { recursive: true });
  }
  writeIfChanged(join(pluginDir, "plugin.json"), pluginJson);
  writeIfChanged(join(rulesDir, "AGENTS.md"), rules);
  for (const [id, target] of links) ensureLink(join(skillsDir, id), target);

  // A skill removed from the package leaves its link behind.
  const recorded = new Map((previous?.links ?? []).map((link) => [link.path, link.target]));
  removeLinksForRemovedSkills({ linksDir: skillsDir, current: links, recorded, root: options.root, note, dryRun: options.dryRun });

  for (const dir of accountDirs) {
    if (!options.dryRun) mkdirSync(dir, { recursive: true });
    ensureLink(join(dir, PSTACK), pluginDir);
  }

  // Written last: it is the record of what this run wrote, for the next run and
  // for uninstall.
  writeIfChanged(join(pluginDir, MANIFEST_FILE), manifestContent({
    root: options.root,
    files: [
      { path: "plugin.json", sha256: sha256(pluginJson) },
      { path: "rules/AGENTS.md", sha256: sha256(rules) },
    ],
    links,
  }));

  if (options.dryRun) console.log("[dry-run] nothing written");
  else if (writer.changes === 0) console.log(`${PSTACK} agy plugin is up to date: ${pluginDir}`);
  else console.log(`installed ${PSTACK} as an agy plugin: ${pluginDir}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(USAGE);
  else main(options);
} catch (error) {
  console.error(`install-agy: ${error.message}`);
  process.exit(1);
}
