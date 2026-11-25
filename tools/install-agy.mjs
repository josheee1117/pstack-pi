#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILL_DIRS = ["skills", "local-skills"];
const PSTACK = "pstack";
const DESCRIPTION = "pstack 工作流技能：理解、设计、实现、独立验证、交付与恢复。";
const USAGE = `Usage: node tools/install-agy.mjs [options]

Install pstack as an agy (Antigravity) plugin and link it into the T3
antigravity accounts that are enabled.

Options:
  --root <dir>         package root (default: the repository holding this script)
  --gemini-dir <dir>   agy config directory (default: ~/.gemini/config)
  --t3-home <dir>      T3 data directory (default: ~/.t3)
  --dry-run            print every change and write nothing
  --uninstall          remove the plugin directory and the account links
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

function main(options) {
  const pluginDir = join(options.geminiDir, "plugins", PSTACK);
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
    let stat;
    try {
      stat = lstatSync(linkPath);
    } catch {
      stat = undefined;
    }
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
  const removePath = (path) => {
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      return;
    }
    note(`remove ${path}`);
    if (options.dryRun) return;
    if (stat.isSymbolicLink()) unlinkSync(path);
    else rmSync(path, { recursive: true, force: true });
  };

  if (options.uninstall) {
    for (const link of antigravityPluginLinks(options.t3Home)) removePath(link);
    removePath(pluginDir);
    if (changes === 0) console.log(`nothing to remove for ${PSTACK}`);
    else if (!options.dryRun) console.log(`removed the ${PSTACK} plugin and its account links`);
    return;
  }

  // Read and validate everything before the first write, so a bad settings
  // file or adapter leaves the installed plugin untouched.
  const accountDirs = antigravityAccountDirs(options.t3Home);
  const links = skillLinks(options.root);
  const rules = renderRules(options.root);
  const { version } = JSON.parse(readFileSync(join(options.root, "package.json"), "utf8"));
  const manifest = `${JSON.stringify({ name: PSTACK, version, description: DESCRIPTION }, null, 2)}\n`;

  if (!options.dryRun) {
    mkdirSync(join(pluginDir, "rules"), { recursive: true });
    mkdirSync(skillsDir, { recursive: true });
  }
  writeIfChanged(join(pluginDir, "plugin.json"), manifest);
  writeIfChanged(join(pluginDir, "rules", "AGENTS.md"), rules);
  for (const [id, target] of links) ensureLink(join(skillsDir, id), resolve(target));

  // A skill removed from the package leaves a broken link behind. Foreign
  // entries in the plugin's skills directory are not ours to delete.
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isSymbolicLink() || links.has(entry.name)) continue;
      if (entry.name === PSTACK || entry.name.startsWith("pstack-")) removePath(join(skillsDir, entry.name));
    }
  }

  for (const dir of accountDirs) {
    if (!options.dryRun) mkdirSync(dir, { recursive: true });
    ensureLink(join(dir, PSTACK), pluginDir);
  }

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
