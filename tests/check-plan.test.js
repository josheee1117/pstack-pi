import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { skillsDir } from "./helpers.js";

const SCRIPT = join(skillsDir, "pstack", "scripts", "check-plan.mjs");
const PLAYBOOK = join(skillsDir, "pstack", "playbooks", "multi-phase-plan.md");
const ENTRY = join(skillsDir, "pstack", "SKILL.md");

/** The plan skeleton the playbook actually ships, lifted from its markdown fence. */
function skeleton() {
	const lines = readFileSync(PLAYBOOK, "utf8").split("\n");
	const open = lines.indexOf("```markdown");
	const close = lines.indexOf("```", open + 1);
	assert.ok(open !== -1 && close !== -1, "the playbook embeds the plan skeleton in a markdown fence");
	return lines.slice(open + 1, close).join("\n");
}

/**
 * A plan built from the real skeleton with only the necessary placeholders
 * resolved: the H1, the declared lane count, and a lane list that matches it.
 * Everything else stays as the template wrote it.
 */
function buildPlan(laneCount, edits = []) {
	let text = skeleton()
		.split("\n")
		.filter((line) => {
			const lane = line.match(/^- \[ \] Lane (\d+)\./);
			if (lane) return Number(lane[1]) <= laneCount;
			return line !== "- [ ] <As many lanes as the change needs.>";
		})
		.join("\n");
	const declared = laneCount === 1 ? "1 lane at the PR head" : `${laneCount} lanes at the PR head`;
	text = text.replace("N lanes at the PR head", declared);
	text = text.replace("# <Program> plan", "# Demo program plan");
	for (const [from, to] of edits) {
		assert.ok(text.includes(from), `fixture edit target not found: ${from}`);
		text = text.replace(from, to);
	}
	return text;
}

function runScript(text, { withoutFile = false } = {}) {
	const dir = mkdtempSync(join(tmpdir(), "pstack-check-plan-"));
	try {
		const file = join(dir, "plan.md");
		if (!withoutFile) writeFileSync(file, text);
		const run = spawnSync(process.execPath, withoutFile ? [SCRIPT] : [SCRIPT, file], { encoding: "utf8" });
		return { status: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

test("a plan built from the playbook skeleton passes for any declared lane count", () => {
	// The expected lane numbers come from the plan's own declaration; the old
	// fixed ten is gone.
	for (const laneCount of [1, 2, 3]) {
		const run = runScript(buildPlan(laneCount));
		assert.equal(run.status, 0, `N=${laneCount} passes: ${run.stderr}`);
		assert.match(run.stdout, /1 PR sections, 0 problems/);
	}
});

test("frontmatter before the plan is skipped", () => {
	const run = runScript(`---\nplan: demo\n---\n${buildPlan(1)}`);
	assert.equal(run.status, 0, run.stderr);
});

test("no argument prints usage and exits 2", () => {
	const run = runScript("", { withoutFile: true });
	assert.equal(run.status, 2);
	assert.match(run.stderr, /Usage: node check-plan\.mjs <plan\.md>/);
});

const invalidPlans = [
	["the live block declares no lane count", ["3 lanes at the PR head", "lanes at the PR head"], "does not declare"],
	["the live block declares zero lanes", ["3 lanes at the PR head", "0 lanes at the PR head"], "declares 0 lanes"],
	["a negative lane count is not a declaration", ["3 lanes at the PR head", "-3 lanes at the PR head"], "declares -3 lanes"],
	["a decimal lane count is not a declaration", ["3 lanes at the PR head", "1.3 lanes at the PR head"], "declares 1.3 lanes"],
	["two lanes share a number", ["- [ ] Lane 3. <Scenario.>", "- [ ] Lane 2. <Scenario.>"], "lanes are [1,2,2]"],
	["a lane number is missing", ["- [ ] Lane 2. <Scenario.> Save `<artifact>`. Pass when <predicate>.\n", ""], "expected 1 to 3"],
	["the declared count disagrees with the lane list", ["3 lanes at the PR head", "4 lanes at the PR head"], "expected 1 to 4"],
	["a lane names no artifact to save", ["Lane 2. <Scenario.> Save `<artifact>`. Pass when <predicate>.", "Lane 2. <Scenario.> Capture `<artifact>`. Pass when <predicate>."], "names no artifact"],
	["a lane has no pass predicate", ["Lane 2. <Scenario.> Save `<artifact>`. Pass when <predicate>.", "Lane 2. <Scenario.> Save `<artifact>`. Judge <predicate>."], "no pass predicate"],
	["a live box is not a lane", ["- [ ] Lane 3. <Scenario.>", "- [ ] Extra box. <Scenario.>"], "live box is not a lane"],
	["Files loses its boxes", ["- [ ] Edit `<path>`.\n- [ ] Create `<path>`.\n- [ ] Delete `<path>`.\n", ""], "has no box"],
	["a verification block drops the rule", ["**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.", "**Verify, unit.** Run the unit suite."], "does not open with the rule"],
	["perf loses an item", ["- [ ] Baseline. Record the trunk <value> first.\n", ""], "perf boxes are [Metric., Probe., Rule.]"],
	["the review gate says None but keeps boxes", ["**Review gate.** The operator reviews before merge.", "**Review gate.** None. PR 1 is not review-gated."], "says None but has boxes"],
	["a sub-block is renamed", ["**Merge.**", "**Merge, eventually.**"], "sub-blocks are"],
	["a Program checklist marker is missing", ["post a status message to the operator", "post a report to the operator"], 'lacks "status message"'],
	["a Program checklist heading is out of order", ["### Boot recipe, for every live lane", "### Booting recipe, for every live lane"], 'lacks "### Boot recipe" in order'],
	["a section after the close is not an appendix", ["## Appendix C. Risks", "## Operational notes"], "not an appendix"],
	["the prototype evidence appendix is missing", ["## Appendix A. Prototype evidence", "## Appendix A. Prototype shots"], "Prototype evidence"],
	["a mid-sentence colon fails the prose check", ["Lane 2. <Scenario.> Save `<artifact>`. Pass when <predicate>.", "Lane 2. <Scenario.> Save `<artifact>`. Pass when ready: any run."], "mid-sentence colon"],
];

for (const [name, edit, expected] of invalidPlans) {
	test(`an invalid plan fails: ${name}`, () => {
		const run = runScript(buildPlan(3, [edit]));
		assert.equal(run.status, 1, `expected exit 1, got ${run.status}: ${run.stdout}`);
		assert.match(run.stderr, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
	});
}

test("a heading inside a code fence is not a section", () => {
	// A forged "## Extra" after Close the program would fail as a non-appendix.
	// Inside a tilde fence it does not exist, so the plan still passes.
	const forged = "~~~\n## Extra\n~~~\n\n## Close the program";
	const run = runScript(buildPlan(1, [["## Close the program", forged]]));
	assert.equal(run.status, 0, run.stderr);
});

test("a box inside a code fence is not a live box", () => {
	// A forged Lane 9 in a four-backtick fence must not join the lane count.
	const lane = "- [ ] Lane 1. Regression lane against trunk. Run <the same load-bearing scenario> at trunk and head. If trunk lacks the feature, record that and gate <the behavior the diff adds plus the end state the user waits for>. Save `<artifact>`. Pass when <predicate>.";
	const forged = lane + "\n\n" + "````" + "\n- [ ] Lane 9. Forged. Save `forged.png`. Pass when forged.\n" + "````";
	const run = runScript(buildPlan(1, [[lane, forged]]));
	assert.equal(run.status, 0, run.stderr);
});

test("the playbook hands plans to this script and keeps the simple-task skip", () => {
	const playbook = readFileSync(PLAYBOOK, "utf8");
	assert.match(playbook, /check-plan\.mjs/, "step 6 names the script");
	assert.match(playbook, /\.\.\/scripts\/check-plan\.mjs/, "the link is the real relative path");
	assert.match(playbook, /skip the plan\. Say so and stop\./, "step 1 keeps the simple-task skip");
});

test("the entry routing keeps the small-task path ahead of the full playbook", () => {
	const entry = readFileSync(ENTRY, "utf8");
	assert.match(entry, /completes the requested work directly with a minimal real check/, "small tasks complete the requested work directly");
	assert.match(entry, /answered directly without touching files/, "read-only questions are answered, not edited");
	assert.match(entry, /stays a plan, not implemented/, "plan-only requests are not implemented on the side");
	assert.match(entry, /no mandatory delegation/, "delegation is optional, not forbidden");
	assert.match(entry, /never silently skipped/, "a user-named process is not silently skipped");
	assert.match(entry, /only when that risk is really present/, "the heavier path is risk-gated, not word-gated");
});
