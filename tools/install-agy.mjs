#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILL_DIRS = ["skills", "local-skills"];
const PSTACK = "pstack";
const DESCRIPTION = "pstack 工作流技能：理解、设计、实现、独立验证、交付与恢复。";
const MANIFEST_FILE = ".pstack-install.json";
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

// The registered id comes from SKILL.md, not the directory: poteto-mode is
// `pstack`, setup-pstack is `pstack-setup`, teach is `pstack-teach-me`.
function skillName(skillFile) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(skillFile, "utf8"));
  const line = frontmatter && /^name:\s*(.+?)\s*$/m.exec(frontmatter[1]);
  return line ? line[1].replace(/^["']|["']$/g, "") : undefined;
}

function skillLinks(root) {
  const links = new Map();
  for (const sub of SKILL_DIRS) {
    const base = join(root, sub);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base).sort()) {
      const target = join(base, name);
      const skillFile = join(target, "SKILL.md");
      if (!existsSync(skillFile)) continue;
      const id = skillName(skillFile);
      if (!id) continue; // agy drops a skill without a name
      if (id !== PSTACK && !id.startsWith("pstack-")) throw new Error(`${skillFile} is named ${id}; expected ${PSTACK} or pstack-<name>`);
      if (links.has(id)) throw new Error(`two skills map to the plugin id ${id}: ${links.get(id)} and ${target}`);
      links.set(id, target);
    }
  }
  return links;
}

function renderRules(root) {
  const values = {
    root,
    skills: join(root, "skills"),
    adapter: join(root, "adapter"),
    agentDir: resolve(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent")),
  };
  const template = readFileSync(join(root, "adapter", "agy.md"), "utf8");
  const rendered = template.replace(/\{\{([A-Za-z]+)\}\}/g, (placeholder, name) => {
    if (!(name in values)) throw new Error(`adapter/agy.md uses an unknown placeholder ${placeholder}`);
    return values[name];
  });
  if (rendered.includes("{{")) throw new Error("adapter/agy.md has an unresolved placeholder");
  return rendered;
}

// Each enabled antigravity instance keeps its own config directory under a
// sha256 of the instance key. Returns the plugins directory to link into.
function antigravityAccountDirs(t3Home) {
  const settingsPath = join(t3Home, "userdata", "settings.json");
  if (!existsSync(settingsPath)) return [];
  const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  return Object.entries(settings?.providerInstances ?? {})
    .filter(([, instance]) => instance?.driver === "antigravity" && instance.enabled === true)
    .map(([name]) => join(t3Home, "userdata", "providers", "antigravity", createHash("sha256").update(name).digest("hex"), "config", "plugins"));
}

// Uninstall does not consult settings: a link written for an account that was
// disabled afterwards is still ours to remove.
function antigravityPluginLinks(t3Home) {
  const base = join(t3Home, "userdata", "providers", "antigravity");
  if (!existsSync(base)) return [];
  return readdirSync(base).map((id) => join(base, id, "config", "plugins", PSTACK));
}

const lstat = (path) => lstatSync(path, { throwIfNoEntry: false });
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

// A hand-edited or truncated file carries no record of what this installer
// wrote, so a parse failure means "not ours", not a crash.
function readJson(path) {
  const content = readFileSync(path, "utf8");
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function readInstallManifest(pluginDir) {
  const path = join(pluginDir, MANIFEST_FILE);
  if (!lstat(path)?.isFile()) return undefined;
  const manifest = readJson(path);
  if (manifest?.name !== PSTACK || !Array.isArray(manifest.files) || !Array.isArray(manifest.links)) return undefined;
  return manifest;
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

function installManifest(root, files, links) {
  const entries = [...links]
    .map(([id, target]) => ({ path: `skills/${id}`, target }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return `${JSON.stringify({ name: PSTACK, root, files, links: entries }, null, 2)}\n`;
}

function pointsIntoPackageSkills(target, root) {
  return SKILL_DIRS.some((sub) => target.startsWith(join(resolve(root, sub), sep)));
}

function uninstall(options, pluginDir, manifest, note) {
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
  for (const entry of entries) {
    const path = join(pluginDir, entry.path);
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
    if (!options.dryRun) unlinkSync(path);
  }
  note(`remove ${join(pluginDir, MANIFEST_FILE)}`);
  if (!options.dryRun) unlinkSync(join(pluginDir, MANIFEST_FILE));

  // Directories go last and only when empty, so a file the user added keeps its
  // directory, and the plugin directory with it.
  const directories = [...new Set(entries.map((entry) => dirname(entry.path)))]
    .filter((directory) => directory !== ".")
    .sort((left, right) => right.split(sep).length - left.split(sep).length);
  for (const directory of [...directories.map((directory) => join(pluginDir, directory)), pluginDir]) {
    if (!lstat(directory)?.isDirectory() || readdirSync(directory).length > 0) continue;
    note(`remove ${directory}`);
    if (!options.dryRun) rmdirSync(directory);
  }
}

function main(options) {
  const pluginDir = join(options.geminiDir, "plugins", PSTACK);
  const rulesDir = join(pluginDir, "rules");
  const skillsDir = join(pluginDir, "skills");
  let changes = 0;
  const note = (message) => {
    changes += 1;
    console.log(`${options.dryRun ? "[dry-run] " : ""}${message}`);
  };
  const writeIfChanged = (path, content) => {
    if (existsSync(path) && readFileSync(path, "utf8") === content) return;
    note(`write ${path}`);
    if (!options.dryRun) writeFileSync(path, content);
  };
  const ensureLink = (linkPath, target) => {
    const stat = lstat(linkPath);
    if (!stat) {
      note(`link ${linkPath} -> ${target}`);
      if (!options.dryRun) symlinkSync(target, linkPath, "dir");
      return;
    }
    if (!stat.isSymbolicLink()) throw new Error(`${linkPath} exists and is not a symlink; remove it yourself and run again`);
    if (resolve(dirname(linkPath), readlinkSync(linkPath)) === resolve(target)) return;
    note(`relink ${linkPath} -> ${target}`);
    if (!options.dryRun) {
      unlinkSync(linkPath);
      symlinkSync(target, linkPath, "dir");
    }
  };
  const previous = readInstallManifest(pluginDir);
  if (options.uninstall) {
    uninstall(options, pluginDir, previous, note);
    if (changes === 0) console.log(`nothing to remove for ${PSTACK}`);
    else if (!options.dryRun) console.log(`removed what this installer wrote for ${PSTACK}`);
    return;
  }

  // Read and validate everything before the first write, so a bad settings
  // file, adapter, or an occupied plugin directory leaves it untouched.
  const accountDirs = antigravityAccountDirs(options.t3Home);
  const links = skillLinks(options.root);
  const rules = renderRules(options.root);
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

  // A skill removed from the package leaves its link behind. A link is ours
  // when the manifest recorded it, or when it points into the package's own
  // skill directories; anything else belongs to the user.
  const recorded = new Map((previous?.links ?? []).map((link) => [link.path, link.target]));
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir)) {
      if (links.has(entry)) continue;
      const path = join(skillsDir, entry);
      const stat = lstat(path);
      if (!stat?.isSymbolicLink()) continue;
      const target = resolve(dirname(path), readlinkSync(path));
      if (target === recorded.get(`skills/${entry}`) || pointsIntoPackageSkills(target, options.root)) {
        note(`remove ${path}`);
        if (!options.dryRun) unlinkSync(path);
      }
    }
  }

  for (const dir of accountDirs) {
    if (!options.dryRun) mkdirSync(dir, { recursive: true });
    ensureLink(join(dir, PSTACK), pluginDir);
  }

  // Written last: it is the record of what this run wrote, for the next run and
  // for uninstall.
  writeIfChanged(join(pluginDir, MANIFEST_FILE), installManifest(options.root, [
    { path: "plugin.json", sha256: sha256(pluginJson) },
    { path: "rules/AGENTS.md", sha256: sha256(rules) },
  ], links));

  if (options.dryRun) console.log("[dry-run] nothing written");
  else if (changes === 0) console.log(`${PSTACK} agy plugin is up to date: ${pluginDir}`);
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
