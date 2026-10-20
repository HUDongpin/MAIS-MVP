import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, linkSync, chmodSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";
import * as production from "./promotion-reviewed-code-pr287.mjs";
import { hash, inventory } from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";

const { BASE, PULL_REQUEST, assertEventComposition, SOURCE_PATHS, CODE_PATHS, EVIDENCE_PATHS, ADMISSION, DIRECTORY, BINDING, PERMISSIONS, REVIEWERS, SCOPE, REVIEW_RESULT, renderBinding, parseBinding, verifyDecision, COMMANDS, verifyTestRecords } = production;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const digest = value => hash(Buffer.from(stable(value)));
const git = (cwd, ...args) => execFileSync("/usr/bin/git", args, {
  cwd, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" },
  maxBuffer: 16 * 1024 * 1024
}).toString("utf8").trim();
function write(root, file, bytes) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), bytes);
}
const pending = { schemaVersion: "pr287-final-binding.v1", toolingCommit: null, toolingTree: null, toolingDigest: null, evidenceCommit: null, a11DecisionSha256: null, a11ReportSha256: null, a23DecisionSha256: null, a23ReportSha256: null };

const final = "a".repeat(40);
const evidence = "b".repeat(40);
const finalTree = "c".repeat(40);
const merge = "d".repeat(40);
const event = { number: PULL_REQUEST, pull_request: { base: { sha: BASE }, head: { sha: final } } };
const actual = { head: final, headTree: finalTree, finalCommit: final, finalTree, evidenceCommit: evidence, parents: [evidence] };

test("PR287 event accepts only the exact finalized PR source", () => {
  assert.doesNotThrow(() => assertEventComposition("pull_request", event, actual));
  for (const number of [283, 286, 288]) {
    assert.throws(() => assertEventComposition("pull_request", { ...event, number }, actual), /PR287_EVENT_SCOPE/);
  }
  const wrongBase = structuredClone(event);
  wrongBase.pull_request.base.sha = "e".repeat(40);
  assert.throws(() => assertEventComposition("pull_request", wrongBase, actual), /PR287_EVENT_SCOPE/);
  assert.throws(() => assertEventComposition("pull_request", event, { ...actual, finalCommit: merge }), /PR287_COMPOSITION/);
  assert.throws(() => assertEventComposition("pull_request", event, { ...actual, headTree: "e".repeat(40) }), /PR287_COMPOSITION/);
});

test("PR287 future main composition requires exact merge parents and finalized tree", () => {
  const push = { before: BASE, after: merge, ref: "refs/heads/main" };
  const merged = { ...actual, head: merge, parents: [BASE, final] };
  assert.doesNotThrow(() => assertEventComposition("push", push, merged));
  assert.throws(() => assertEventComposition("push", push, { ...merged, parents: [final, BASE] }), /PR287_COMPOSITION/);
  assert.throws(() => assertEventComposition("push", { ...push, ref: "refs/heads/other" }, merged), /PR287_EVENT_SCOPE/);
  assert.throws(() => assertEventComposition("workflow_dispatch", event, actual), /PR287_EVENT_SCOPE/);
});

test("binding data is canonical strict JSON, never executable module code", () => {
  assert.doesNotThrow(() => parseBinding(Buffer.from(renderBinding(pending)), true));
  assert.throws(() => parseBinding(Buffer.from(renderBinding(pending))), /PR287_BINDING_NOT_FROZEN/);
  assert.throws(() => parseBinding(Buffer.from('export default Object.freeze({"schemaVersion":"a","schemaVersion":"b"});\n')), /JSON|DUPLICATE/);
  assert.throws(() => parseBinding(Buffer.from('export default Object.freeze(process.exit(0));\n')));
  assert.throws(() => parseBinding(Buffer.from(renderBinding(pending) + "process.exit(0);\n")));
  assert.throws(() => parseBinding(Buffer.from([0xff])));
});

// Every commit, identity and acceptance-shaped record below is synthetic and
// lives in an independent tiny repository. Literal anchors are rewritten in the
// fixture's checker copy only; production has no fixture CLI/env override.
async function fixture(run, options = {}) {
  const temp = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr287-fixture-")));
  const repo = path.join(temp, "repo"); mkdirSync(repo);
  const g = (...args) => git(repo, ...args);
  const commit = (files, label) => { g("add", "--", ...files); g("commit", "-q", "-m", `Synthetic ${label}; not acceptance`); return g("rev-parse", "HEAD"); };
  try {
    g("init", "-q", "--initial-branch=fixture");
    g("config", "user.name", "Synthetic PR287 Fixture");
    g("config", "user.email", "fixture@example.invalid");
    write(repo, ".gitignore", "node_modules\n");
    const originals = SOURCE_PATHS.filter(p => !p.startsWith("coordination/"));
    for (const p of originals) write(repo, p, "synthetic baseline\n");
    const base = commit([".gitignore", ...originals], "baseline");
    if (options.wrongSourceParent) g("commit", "--allow-empty", "-q", "-m", "Synthetic unreviewed intermediate");
    for (const p of SOURCE_PATHS) write(repo, p, "synthetic source delta\n");
    for (const p of options.extraSource ?? []) write(repo, p, "unreviewed source\n");
    if (options.sourceMode) chmodSync(path.join(repo, SOURCE_PATHS[0]), 0o755);
    const source = commit([...SOURCE_PATHS, ...(options.extraSource ?? [])], "source");
    const sourceTree = g("rev-parse", "HEAD^{tree}");
    const sourceInventory = inventory(repo, base, source), sourceDigest = digest(sourceInventory);
    const checks = { schemaVersion: "pr287-source-ci.v1", repository: "HUDongpin/MAIS-MVP", sourceCommit: source, sourceTree,
      runId: 999287, attempt: 1, event: "pull_request", conclusion: "success",
      jobs: ["postgres-integration", "resend-webhook-postgres-integration", "snapshot", "teacher-notice-outbox-postgres16", "teacher-parent-e2e", "validate", "visualization-browser"].map(name => ({ name, conclusion: "success" })) };
    options.checks?.(checks);
    const checkBytes = stable(checks) + "\n", checksSha = hash(Buffer.from(checkBytes));
    const observation = stable({ schemaVersion: "pr287-source-observation.v1", sourceCommit: source, sourceTree, observation: { syntheticFixture: true }, liveAllowed: false, historicalAuthorityTransferred: false }) + "\n";
    const observationSha = hash(Buffer.from(observation));
    for (const p of CODE_PATHS) write(repo, p, "synthetic tooling\n");
    write(repo, BINDING, renderBinding(pending));
    const checkerPath = path.join(repo, "scripts/promotion-reviewed-code-pr287.mjs");
    let checker = readFileSync(path.join(root, "scripts/promotion-reviewed-code-pr287.mjs"), "utf8");
    for (const [key, value] of Object.entries({ BASE: base, SOURCE: source, SOURCE_TREE: sourceTree, SOURCE_INVENTORY: options.wrongSourceDigest ? "f".repeat(64) : sourceDigest, SOURCE_CHECKS_SHA: checksSha, SOURCE_OBSERVATION_SHA: observationSha, PULL_REQUEST: 999287, HISTORICAL_E2: base })) {
      const pattern = new RegExp(`^export const ${key} = (?:null|"[a-f0-9]{40,64}"|[0-9]+);$`, "gm");
      assert.equal([...checker.matchAll(pattern)].length, 1, `one literal ${key} production anchor`);
      checker = checker.replace(pattern, `export const ${key} = ${JSON.stringify(value)};`);
    }
    checker = checker.replace(/from "(\.\/[^"]+)";/gu, (_, name) => `from "${pathToFileURL(path.join(root, "scripts", name)).href}";`);
    writeFileSync(checkerPath, checker);
    for (const p of options.extraTooling ?? []) write(repo, p, "extra tooling\n");
    const tooling = commit([...CODE_PATHS, ...(options.extraTooling ?? [])], "tooling");
    const binding = { ...pending, toolingCommit: tooling, toolingTree: g("rev-parse", `${tooling}^{tree}`), toolingDigest: digest(inventory(repo, source, tooling)) };
    for (const role of ["A11", "A23"]) {
      const prefix = role.toLowerCase(), reportPath = `${DIRECTORY}/${prefix}-review.md`;
      const report = `Synthetic ${role} test fixture, NOT an actual review or approval.\n`;
      write(repo, reportPath, report);
      const reportSha = hash(Buffer.from(report));
      const review = { schemaVersion: "pr287-independent-review.v1", role, reviewerIdentity: REVIEWERS[role], reviewedAt: "1970-01-01T00:00:00.000Z",
        baseCommit: base, reviewedSource: source, sourceTree, sourceInventoryDigest: sourceDigest, reviewedTooling: tooling,
        toolingTree: binding.toolingTree, toolingDigest: binding.toolingDigest, checksRawSha256: checksSha, observationRawSha256: observationSha,
        scope: SCOPE, bindingProcedure: "T-E-F-literal-binding-v1", result: REVIEW_RESULT, report: { path: reportPath, rawSha256: reportSha }, permissions: PERMISSIONS };
      options.review?.(review, role);
      const bytes = stable(review) + "\n";
      write(repo, `${DIRECTORY}/${prefix}-review.json`, bytes);
      binding[`${prefix}DecisionSha256`] = hash(Buffer.from(bytes));
      binding[`${prefix}ReportSha256`] = reportSha;
    }
    const admission = { schemaVersion: "pr287-admission.v1", baseCommit: base, sourceCommit: source, sourceTree, sourceInventoryDigest: sourceDigest,
      toolingCommit: tooling, toolingTree: binding.toolingTree, toolingDigest: binding.toolingDigest, checksRawSha256: checksSha, observationRawSha256: observationSha, scope: SCOPE, permissions: PERMISSIONS };
    options.admission?.(admission);
    write(repo, ADMISSION, stable(admission) + "\n");
    write(repo, `${DIRECTORY}/source-checks.json`, checkBytes);
    write(repo, `${DIRECTORY}/source-observation.json`, observation);
    write(repo, `${DIRECTORY}/source-inventory.json`, stable(sourceInventory) + "\n");
    write(repo, `${DIRECTORY}/source-intake.json`, stable({ schemaVersion: "pr287-source-intake.v1", owner: "A25", sourceCommit: source, worktreeClean: true, statusSignature: hash(Buffer.alloc(0)), reviewablePaths: SOURCE_PATHS }) + "\n");
    if (options.evidenceMode) chmodSync(path.join(repo, ADMISSION), 0o755);
    for (const p of options.extraEvidence ?? []) write(repo, p, "extra evidence\n");
    const evidence = commit([...EVIDENCE_PATHS, ...(options.extraEvidence ?? [])], "evidence");
    binding.evidenceCommit = evidence;
    options.binding?.(binding);
    write(repo, BINDING, renderBinding(binding));
    if (options.finalMode) chmodSync(path.join(repo, BINDING), 0o755);
    for (const p of options.extraFinal ?? []) write(repo, p, "extra finalization\n");
    const finalCommit = commit([BINDING, ...(options.extraFinal ?? [])], "literal final binding");
    const api = await import(pathToFileURL(checkerPath));
    const eventPath = path.join(temp, "event.json");
    const check = (eventOverride, eventName = "pull_request") => {
      const head = g("rev-parse", "HEAD");
      writeFileSync(eventPath, stable(eventOverride ?? { number: 999287, pull_request: { base: { sha: base }, head: { sha: head } } }));
      return api.preflight({ repoRoot: repo, eventName, eventPath });
    };
    await run({ repo, temp, g, api, base, source, tooling, evidence, finalCommit, binding, eventPath, check, commit });
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

test("synthetic real-Git S/T/E/F chain accepts exact finalized metadata and materialization", async () => {
  await fixture(({ check, finalCommit, evidence, tooling }) => {
    const result = check();
    assert.equal(result.finalCommit, finalCommit);
    assert.equal(result.binding.evidenceCommit, evidence);
    assert.equal(result.binding.toolingCommit, tooling);
  });
});

for (const [name, options, error] of [
  ["source parent", { wrongSourceParent: true }, /PR287_SOURCE_PARENT/],
  ["source path", { extraSource: ["public/unreviewed.txt"] }, /PR287_SOURCE_PATHS/],
  ["source digest", { wrongSourceDigest: true }, /PR287_SOURCE_INVENTORY/],
  ["tooling path", { extraTooling: ["runtime-unreviewed.txt"] }, /PR287_TOOLING_PATHS/],
  ["evidence path", { extraEvidence: ["extra-evidence.txt"] }, /PR287_EVIDENCE_PATHS/],
  ["final binding scope", { extraFinal: ["extra-final.txt"] }, /PR287_FINAL_PATHS/]
]) {
  test(`real Git rejects an unreviewed ${name}`, async () => {
    await fixture(({ check }) => assert.throws(check, error), options);
  });
}

test("rehashed review records cannot change identity, source, tool, result, or permissions", async () => {
  for (const mutate of [
    r => { r.reviewerIdentity = REVIEWERS.A23; },
    r => { r.reviewedSource = BASE; },
    r => { r.reviewedTooling = BASE; },
    r => { r.result = "pending"; },
    r => { r.permissions = { ...PERMISSIONS, liveAllowed: true }; },
    r => { r.report.rawSha256 = "f".repeat(64); }
  ]) await fixture(({ check }) => assert.throws(check, /PR287_REVIEW_/), { review: (r, role) => { if (role === "A11") mutate(r); } });
});

test("rehashed source CI cannot use a skipped job, wrong source, or reduced check set", async () => {
  for (const mutate of [
    x => { x.jobs[0].conclusion = "skipped"; },
    x => { x.sourceCommit = BASE; },
    x => { x.jobs.pop(); }
  ]) await fixture(({ check }) => assert.throws(check, /PR287_SOURCE_CHECKS/), { checks: mutate });
});

test("final binding and evidence modes must remain non-executable", async () => {
  await fixture(({ check }) => assert.throws(check, /PR287_BINDING_MODE/), { finalMode: true });
  await fixture(({ check }) => assert.throws(check, /PR287_EVIDENCE_MODE/), { evidenceMode: true });
});

test("review timestamps reject impossible and future instants", async () => {
  for (const reviewedAt of ["9999-99-99T99:99:99.999Z", new Date(Date.now() + 86400000).toISOString()]) {
    await fixture(({ check }) => assert.throws(check, /PR287_REVIEW_IDENTITY/), { review: r => { r.reviewedAt = reviewedAt; } });
  }
});

test("wrong PR/base, empty descendants, and changed-then-restored trees cannot inherit admission", async () => {
  await fixture(({ check, g, base, finalCommit, commit, repo }) => {
    assert.throws(() => check({ number: 283, pull_request: { base: { sha: base }, head: { sha: finalCommit } } }), /PR287_EVENT_SCOPE/);
    assert.throws(() => check({ number: 999287, pull_request: { base: { sha: finalCommit }, head: { sha: finalCommit } } }), /PR287_EVENT_SCOPE/);
    const original = readFileSync(path.join(repo, "AGENTS.md"));
    write(repo, "AGENTS.md", "changed after review\n"); commit(["AGENTS.md"], "unauthorized change");
    write(repo, "AGENTS.md", original); commit(["AGENTS.md"], "restored bytes with unreviewed history");
    assert.throws(check, /PR287_COMPOSITION/);
    g("commit", "--allow-empty", "-q", "-m", "Synthetic empty descendant");
    assert.throws(check, /PR287_COMPOSITION/);
  });
});

test("only the exact future main merge parent order and tree is accepted", async () => {
  await fixture(({ check, g, base, finalCommit }) => {
    const finalTree = g("rev-parse", `${finalCommit}^{tree}`);
    const merge = g("commit-tree", finalTree, "-p", base, "-p", finalCommit, "-m", "Synthetic merge");
    g("update-ref", "HEAD", merge);
    assert.doesNotThrow(() => check({ before: base, after: merge, ref: "refs/heads/main" }, "push"));
    const wrong = g("commit-tree", finalTree, "-p", finalCommit, "-p", base, "-m", "Synthetic reversed merge");
    g("update-ref", "HEAD", wrong);
    assert.throws(() => check({ before: base, after: wrong, ref: "refs/heads/main" }, "push"), /PR287_COMPOSITION/);
  });
});

test("dirty, symlinked, hardlinked and hidden evidence or source fails closed", async () => {
  for (const kind of ["dirty", "symlink", "hardlink", "skip-worktree"]) {
    await fixture(({ check, repo, temp, g }) => {
      const p = path.join(repo, `${DIRECTORY}/a11-review.md`), original = readFileSync(p);
      if (kind === "dirty") writeFileSync(p, "changed");
      if (kind === "skip-worktree") {
        g("update-index", "--skip-worktree", "AGENTS.md"); write(repo, "AGENTS.md", "hidden change");
      }
      if (kind === "symlink" || kind === "hardlink") {
        const outside = path.join(temp, "report-copy"); writeFileSync(outside, original); rmSync(p);
        if (kind === "symlink") symlinkSync(outside, p); else linkSync(outside, p);
      }
      assert.throws(check, /PR287_DIRTY|PR287_FILE|REVIEWED_CODE_INDEX_FLAGS/);
    });
  }
});

test("new binding changes cannot launder re-added or rewritten historical evidence", async () => {
  await fixture(({ check, g, repo, commit, binding }) => {
    const bytes = readFileSync(path.join(repo, ADMISSION));
    g("rm", "--", ADMISSION); g("commit", "-q", "-m", "Synthetic forbidden marker deletion");
    write(repo, ADMISSION, bytes); commit([ADMISSION], "forbidden re-add");
    write(repo, BINDING, renderBinding({ ...binding, evidenceCommit: g("rev-parse", "HEAD") }));
    commit([BINDING], "counterfeit binding update");
    assert.throws(check, /PR287_EVIDENCE_PARENT|PR287_ADMISSION_HISTORY|PR287_BINDING_HISTORY/);
  });
});

test("literal Git proof ignores a core.worktree redirect and replacement refs", async () => {
  await fixture(({ check, g, temp, base }) => {
    const outside = path.join(temp, "other"); mkdirSync(outside);
    g("config", "core.worktree", outside);
    assert.doesNotThrow(check);
    g("config", "--unset", "core.worktree");
    const replacement = g("commit-tree", g("rev-parse", `${base}^{tree}`), "-m", "Synthetic replacement");
    g("replace", base, replacement);
    assert.doesNotThrow(check);
  });
});

test("decision permissions and exact test commands/output bytes cannot be weakened", () => {
  const expected = { result: "pass", scope: SCOPE, permissions: PERMISSIONS, decisionDigest: "fixture" };
  assert.doesNotThrow(() => verifyDecision(structuredClone(expected), expected));
  assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, deployAllowed: true } }, expected), /PR287_DECISION_MISMATCH/);
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr287-test-records-")));
  try {
    const records = COMMANDS.map(([name, args]) => {
      write(dir, `${name}.stdout`, "synthetic pass\n"); write(dir, `${name}.stderr`, "");
      return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from("synthetic pass\n")), stderrSha256: hash(Buffer.alloc(0)) };
    });
    assert.doesNotThrow(() => verifyTestRecords(dir, records));
    assert.throws(() => verifyTestRecords(dir, records.slice(1)), /PR287_TEST_SET/);
    const changed = structuredClone(records); changed[0].args = ["--version"];
    assert.throws(() => verifyTestRecords(dir, changed), /PR287_TEST_COMMAND/);
    write(dir, `${records[0].name}.stdout`, "tampered");
    assert.throws(() => verifyTestRecords(dir, records), /PR287_TEST_BYTES/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("new workflow preserves every historical step and executes fixed historical verification", () => {
  const current = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const before = YAML.parse(git(root, "show", `${production.SOURCE}:.github/workflows/promotion-shadow.yml`));
  const job = current.jobs["promotion-shadow-gate"], old = before.jobs["promotion-shadow-gate"];
  assert.deepEqual(current.on, before.on); assert.deepEqual(current.permissions, before.permissions);
  for (const key of ["name", "runs-on", "permissions", "env", "if"]) assert.deepEqual(job[key], old[key]);
  const oldSteps = old.steps.filter(s => s.id !== "contract"), names = oldSteps.map(s => s.name);
  assert.deepEqual(job.steps.filter(s => names.includes(s.name)), oldSteps);
  for (const step of job.steps) assert.equal(step["continue-on-error"], undefined);
  const selector = job.steps.find(s => s.id === "contract").run;
  assert.ok(selector.indexOf("pr287-v1/admission.json") < selector.indexOf("pr283-e2/admission.json"));
  const prepare = job.steps.find(s => s.name === "Prepare unchanged historical contexts for PR287").run;
  for (const sha of [production.HISTORICAL_E2, production.HISTORICAL_BASE, production.HISTORICAL_EXECUTION]) assert.ok(prepare.includes(sha));
  assert.match(prepare, /cd "\$e2"[\s\S]+node --test [^\n]+promotion-reviewed-code-pr283-e2\.test\.mjs/u);
  assert.match(prepare, /npm run test:promotion-gate/u);
  const historical = job.steps.find(s => s.name === "Verify original historical native chain for PR287").run;
  assert.match(historical, /promotion-required-check-legacy-successor-v1\.mjs" evaluate/u);
  assert.match(historical, /promotion-reviewed-code-pr283-e2\.mjs" finalize/u);
  assert.match(historical, /promotion-reviewed-code-pr283-e2\.mjs" verify/u);
  const enforce = job.steps.find(s => s.name === "Enforce PR287 required check");
  assert.equal(enforce.if, "${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr287-v1' }}");
  assert.match(enforce.run, /promotion-reviewed-code-pr287\.mjs verify/u);
});

test("actual selector shell fails closed for invalid, symlinked or unknown new admission", () => {
  const workflow = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const script = workflow.jobs["promotion-shadow-gate"].steps.find(s => s.id === "contract").run;
  for (const kind of ["failed", "unknown", "symlink"]) {
    const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr287-selector-")));
    try {
      write(dir, "coordination/integration/reviewed-code/pr283-e2/admission.json", "{}");
      if (kind === "symlink") { mkdirSync(path.dirname(path.join(dir, ADMISSION)), { recursive: true }); symlinkSync("missing.json", path.join(dir, ADMISSION)); }
      else write(dir, ADMISSION, "{}");
      write(dir, "bin/node", `#!/bin/sh\nprintf '%s\\n' "$1" >> "$CALL_LOG"\ncase "$1" in\n*pr287.mjs) ${kind === "unknown" ? "echo unknown-mode; exit 0" : "exit 7"};;\n*) echo reviewed-code-pr283-e2;;\nesac\n`);
      chmodSync(path.join(dir, "bin/node"), 0o755);
      const result = spawnSync("/bin/bash", ["-c", script], { cwd: dir, encoding: "utf8", env: { PATH: `${dir}/bin:/usr/bin:/bin`, GITHUB_WORKSPACE: dir, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: `${dir}/event.json`, GITHUB_OUTPUT: `${dir}/output`, CALL_LOG: `${dir}/calls` } });
      assert.notEqual(result.status, 0);
      assert.equal(readFileSync(path.join(dir, "calls"), "utf8").trim(), "scripts/promotion-reviewed-code-pr287.mjs");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});
