import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, chmodSync } from "node:fs";
import YAML from "yaml";
import * as production from "./promotion-pr201-candidate.mjs";
import { inventory } from "./promotion-reviewed-code-pr264.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { DIRECTORY, PLAN, ADMISSION, DATA, BANK, CODE_PATHS, EVIDENCE_PATHS, PERMISSIONS, hash, digest } = production;
const git = (cwd, ...args) => execFileSync("/usr/bin/git", args, { cwd, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" }, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (dir, file, bytes) => { mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); writeFileSync(path.join(dir, file), bytes); };
const json = value => JSON.stringify(value, null, 2) + "\n";

test("fresh observation accepts exactly one unreachable candidate and preserves runtime policy", () => {
  const observed = JSON.parse(readFileSync(path.join(root, DIRECTORY, "source-observation.json")));
  const baseline = JSON.parse(git(root, "show", `${production.BASE}:coordination/integration/reviewed-code/pr264-v1/source-observation.json`));
  assert.equal(typeof production.assertObservation, "function", "dedicated current observation guard is required");
  assert.doesNotThrow(() => production.assertObservation(observed, observed, baseline));
  assert.throws(() => production.assertObservation(observed, baseline, baseline), /PR201_CURRENT_OBSERVATION/);
  const extra = structuredClone(observed); extra.expectedRuntimePolicy.coveredFileCount++;
  assert.throws(() => production.assertObservation(extra, extra, baseline), /PR201_COVERAGE_DELTA/);
  const altered = structuredClone(observed); altered.expectedRuntimePolicy.injectedReachableChange = true;
  assert.throws(() => production.assertObservation(altered, altered, baseline), /PR201_RUNTIME_BOUNDARY/);
  const conflict = structuredClone(observed); conflict.canonicalAuditDigest = "0".repeat(64);
  assert.throws(() => production.assertObservation(conflict, conflict, baseline), /PR201_CANONICAL_AUDIT/);
});

// Synthetic S/E commits are confined to an independent disposable repository;
// they never stage, commit or update any ref in the task's actual repository.
async function fixture(run, mutate = () => {}) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr201-contract-"))), repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=synthetic"); git(repo, "config", "user.name", "Synthetic PR201 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
    const baseFiles = [BANK, ".github/workflows/promotion-shadow.yml", "scripts/promotion-reviewed-code-pr264.mjs", "scripts/promotion-required-check-legacy-successor-v1.mjs", "scripts/promotion-workflow-json-guard.mjs", "data/usArkansasQuestions.ts", "data/usArkansasTopics.ts"];
    for (const file of baseFiles) write(repo, file, execFileSync("/usr/bin/git", ["show", `${production.BASE}:${file}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 }));
    git(repo, "add", "--", ...baseFiles); git(repo, "commit", "-qm", "Synthetic baseline"); const base = git(repo, "rev-parse", "HEAD");
    const plan = JSON.parse(readFileSync(path.join(root, PLAN))); plan.baseCommit = base;
    const sourcePaths = [...Object.keys(plan.artifacts), PLAN, ...CODE_PATHS].sort();
    for (const file of sourcePaths) write(repo, file, readFileSync(path.join(root, file)));
    write(repo, PLAN, json(plan));
    const script = "scripts/promotion-pr201-candidate.mjs";
    write(repo, script, readFileSync(path.join(repo, script), "utf8").replace(`export const BASE = "${production.BASE}";`, `export const BASE = "${base}";`).replace(`export const PLAN_HASH = "${production.PLAN_HASH}";`, `export const PLAN_HASH = "${hash(Buffer.from(json(plan)))}";`));
    mutate({ kind: "source", repo, plan });
    git(repo, "add", "--", ...sourcePaths); git(repo, "commit", "-qm", "Synthetic source and tooling"); const source = git(repo, "rev-parse", "HEAD"), sourceInventoryDigest = digest(inventory(repo, base, source));
    const reviews = {};
    for (const role of ["A11", "A23"]) {
      const report = `${role}: synthetic test fixture, not an actual approval.\n`;
      const review = { schemaVersion: "pr201-candidate-review.v1", role, reviewer: role === "A11" ? "/root/pr201_minimal_consumer_review" : "/root/pr201_minimal_gate_review", reviewedAt: "2026-10-18T00:00:00.000Z", sourceCommit: source, sourceInventoryDigest, result: "approved-for-nonlive-candidate-admission", permissions: PERMISSIONS };
      mutate({ kind: "review", role, value: review });
      write(repo, `${DIRECTORY}/${role.toLowerCase()}-review.md`, report); write(repo, `${DIRECTORY}/${role.toLowerCase()}-review.json`, json(review));
      reviews[role] = { decisionSha256: hash(Buffer.from(json(review))), reportSha256: hash(Buffer.from(report)) };
    }
    const admission = { schemaVersion: "pr201-candidate-admission.v1", baseCommit: base, sourceCommit: source, sourceTree: git(repo, "rev-parse", `${source}^{tree}`), sourceInventoryDigest, pullRequest: 999201, reviews, permissions: PERMISSIONS };
    mutate({ kind: "admission", value: admission }); write(repo, ADMISSION, json(admission));
    git(repo, "add", "--", ...EVIDENCE_PATHS); git(repo, "commit", "-qm", "Synthetic evidence"); const evidence = git(repo, "rev-parse", "HEAD");
    const api = await import(pathToFileURL(path.join(repo, script))), eventPath = path.join(temporary, "event.json");
    const event = { number: 999201, pull_request: { base: { sha: base }, head: { sha: evidence } } }; writeFileSync(eventPath, json(event));
    const options = { repoRoot: repo, eventName: "pull_request", eventPath };
    await run({ repo, temporary, base, source, evidence, api, event, options, check: () => api.preflight(options) });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
test("local uncommitted 228-row slice validates without claiming CI or live authority", () => {
  const run = spawnSync(process.execPath, ["scripts/promotion-pr201-candidate.mjs", "inspect", "--repo", root], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.result, "pass");
  assert.equal(result.revisedRows, 228);
  assert.equal(result.unchangedRows, 1272);
  assert.equal(result.ciAdmission, "not-frozen");
  assert.equal(result.liveAllowed, false);
  assert.equal(result.mergeAllowed, false);
  assert.equal(result.wholePackAccepted, false);
});

test("production selectors never accept local evidence or injected SHA/PR variables", () => fixture(({ repo }) => {
  rmSync(path.join(repo, ADMISSION));
  for (const operation of ["select", "preflight", "check", "finalize", "verify"]) {
    const run = spawnSync(process.execPath, ["scripts/promotion-pr201-candidate.mjs", operation, "--repo", repo, "--event-name", "pull_request", "--event-path", "/not-an-event"], { cwd: repo, encoding: "utf8", env: { ...process.env, SOURCE: production.BASE, PR201_ALLOW_LOCAL: "true" } });
    assert.equal(run.status, 2); assert.match(run.stderr, /PR201_ADMISSION_NOT_FROZEN/); assert.equal(run.stdout, "");
  }
}));
test("real synthetic S/E ancestry passes metadata preflight", () => fixture(({ check, evidence }) => assert.equal(check().evidenceCommit, evidence)));
test("frozen candidate, A18 reports and permission plan reject one-byte mutation", async () => {
  for (const file of [DATA, `${DIRECTORY}/a18/qa-decision.json`, `${DIRECTORY}/a18/reviews/a18-pr201-algebra-v2-review.json`, PLAN]) {
    await fixture(({ repo, api }) => { write(repo, file, readFileSync(path.join(repo, file), "utf8") + " "); assert.throws(() => api.inspect(repo), /PR201_(ARTIFACT_HASH|PLAN_HASH)/); });
  }
});
test("original package including q014 and the 1272 rows is immutable", () => fixture(({ repo, api }) => {
  const pack = JSON.parse(readFileSync(path.join(repo, BANK))); pack.questions.find(q => q.id.endsWith("g12-c04-q014")).answer = "38";
  write(repo, BANK, json(pack)); assert.throws(() => api.inspect(repo), /PR201_ORIGINAL_BANK/);
}));
test("loader changes and unexpected files cannot ride this slice", async () => {
  for (const file of ["data/usArkansasQuestions.ts", "data/usArkansasTopics.ts", "public/extra-candidate.json"]) {
    await fixture(({ repo, api }) => { write(repo, file, "unexpected source\n"); assert.throws(() => api.inspect(repo), /PR201_OUT_OF_SCOPE/); });
  }
});
test("hidden tracked changes via assume-unchanged are rejected", () => fixture(({ repo, api }) => {
  git(repo, "update-index", "--assume-unchanged", "data/usArkansasQuestions.ts"); write(repo, "data/usArkansasQuestions.ts", "hidden drift\n");
  assert.throws(() => api.inspect(repo), /PR201_INDEX_FLAGS/);
}));
test("candidate symlink is rejected before reading an alternate payload", () => fixture(({ repo, api, temporary }) => {
  const copy = path.join(temporary, "copy.json"); writeFileSync(copy, readFileSync(path.join(repo, DATA))); rmSync(path.join(repo, DATA)); symlinkSync(copy, path.join(repo, DATA));
  assert.throws(() => api.inspect(repo), /PR201_FILE_ALIAS/);
}));
test("duplicate JSON keys cannot form a formal admission", () => fixture(({ repo, check }) => {
  const raw = readFileSync(path.join(repo, ADMISSION), "utf8").replace('"schemaVersion":', '"schemaVersion":"x","schemaVersion":'); write(repo, ADMISSION, raw);
  git(repo, "add", "--", ADMISSION); git(repo, "commit", "-qm", "Synthetic malformed JSON"); assert.throws(check);
}));
test("review identity, reviewed source and elevated permissions are rejected", async () => {
  for (const alteration of [r => r.reviewer = "author", r => r.sourceCommit = production.BASE, r => r.permissions = { ...PERMISSIONS, liveAllowed: true }]) {
    await fixture(({ check }) => assert.throws(check, /PR201_REVIEW_(BINDING|PERMISSION)/), x => { if (x.kind === "review" && x.role === "A11") alteration(x.value); });
  }
});
test("wrong PR, changed base and wrong head fail against real Git ancestry", () => fixture(({ check, event, options, base }) => {
  for (const bad of [{ ...event, number: 274 }, { ...event, pull_request: { ...event.pull_request, base: { sha: event.pull_request.head.sha } } }, { ...event, pull_request: { ...event.pull_request, head: { sha: base } } }]) {
    writeFileSync(options.eventPath, json(bad)); assert.throws(check, /PR201_EVENT_(PR|HEAD)/);
  }
}));
test("future runtime or evidence tree changes cannot inherit review", () => fixture(({ repo, check, event, options }) => {
  write(repo, "data/usArkansasQuestions.ts", "future loader drift\n"); git(repo, "add", "--", "data/usArkansasQuestions.ts"); git(repo, "commit", "-qm", "Synthetic later drift");
  event.pull_request.head.sha = git(repo, "rev-parse", "HEAD"); writeFileSync(options.eventPath, json(event)); assert.throws(check, /PR201_TREE_DRIFT/);
}));
test("preserving main merge with identical evidence tree is accepted only for main", () => fixture(({ repo, api, base, evidence, options }) => {
  const merge = git(repo, "commit-tree", git(repo, "rev-parse", `${evidence}^{tree}`), "-p", base, "-p", evidence, "-m", "Synthetic merge"); git(repo, "update-ref", "HEAD", merge);
  writeFileSync(options.eventPath, json({ before: base, after: merge, ref: "refs/heads/main" }));
  assert.equal(api.preflight({ ...options, eventName: "push" }).head, merge);
  writeFileSync(options.eventPath, json({ before: base, after: merge, ref: "refs/heads/other" })); assert.throws(() => api.preflight({ ...options, eventName: "push" }), /PR201_EVENT_PUSH/);
}));
test("test evidence requires exact commands, zero exits and matching raw logs", () => {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr201-records-")));
  try {
    const records = production.COMMANDS.map(([name, args]) => { write(dir, `${name}.stdout`, "test passed\n"); write(dir, `${name}.stderr`, ""); return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from("test passed\n")), stderrSha256: hash(Buffer.from("")) }; });
    production.verifyTestRecords(dir, records);
    assert.throws(() => production.verifyTestRecords(dir, records.slice(1)), /PR201_TEST_SET/);
    assert.throws(() => production.verifyTestRecords(dir, records.map((x, i) => i ? x : { ...x, exitCode: 1 })), /PR201_TEST_EXIT/);
    assert.throws(() => production.verifyTestRecords(dir, records.map((x, i) => i ? x : { ...x, args: ["--version"] })), /PR201_TEST_COMMAND/);
    write(dir, "grading.stdout", "altered\n"); assert.throws(() => production.verifyTestRecords(dir, records), /PR201_TEST_BYTES/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("formal finalizer refuses local inspection as current CI proof", () => fixture(async ({ api, repo, temporary, options }) => {
  const output = path.join(temporary, "artifacts"); mkdirSync(output, { mode: 0o700 }); chmodSync(output, 0o700);
  write(output, "current.json", json(api.inspect(repo)));
  const before = process.env.RUNNER_TEMP; process.env.RUNNER_TEMP = temporary;
  try { await assert.rejects(api.main(["finalize", "--repo", repo, "--event-name", "pull_request", "--event-path", options.eventPath, "--artifact-root", output]), /PR201_SCHEMA/); }
  finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("workflow selects new marker fail-closed and keeps all old execution steps intact", () => fixture(({ repo }) => {
  const current = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const before = YAML.parse(git(root, "show", `${production.BASE}:.github/workflows/promotion-shadow.yml`));
  const job = current.jobs["promotion-shadow-gate"], old = before.jobs["promotion-shadow-gate"];
  assert.deepEqual(current.on, before.on); assert.deepEqual(job.env, old.env); assert.deepEqual(job.permissions, old.permissions); assert.equal(job.if, undefined);
  for (const step of old.steps.filter(s => s.id !== "contract")) assert.deepEqual(job.steps.find(s => s.name === step.name), step);
  const selector = job.steps.find(s => s.id === "contract").run;
  assert.ok(selector.indexOf("pr201-diversity-228-v1/plan.json") >= 0);
  assert.ok(selector.indexOf("pr201-diversity-228-v1/plan.json") < selector.indexOf("pr264-v1/admission.json"));
  assert.match(selector, /-L coordination\/integration\/pr201-diversity-228-v1\/plan\.json/);
  assert.doesNotMatch(selector, /\|\|\s*(true|mode=)/);
  const step = job.steps.find(s => s.name === "Enforce PR201 candidate required check"); assert.equal(step.if, "${{ always() && steps.contract.outputs.mode == 'candidate-pr201' }}");
  for (const item of job.steps) assert.equal(item["continue-on-error"], undefined);
  // Execute the real shell selector, not a string-only approximation. The new
  // marker exists in this uncommitted worktree but no formal admission exists.
  rmSync(path.join(repo, ADMISSION));
  const run = spawnSync("bash", ["-c", selector], { cwd: repo, encoding: "utf8", env: { ...process.env, GITHUB_WORKSPACE: repo, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: "/no-event", GITHUB_OUTPUT: path.join(os.tmpdir(), "unused-pr201-output") } });
  assert.notEqual(run.status, 0); assert.match(run.stderr, /PR201_ADMISSION_NOT_FROZEN/);
}));
