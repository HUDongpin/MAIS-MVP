import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REVIEW_RESULT } from "./promotion-reviewed-code-pr295.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts/promotion-reviewed-code-pr295-e2.mjs");
const gate = existsSync(modulePath) ? await import("./promotion-reviewed-code-pr295-e2.mjs") : {};
function implementation() {
  assert.equal(typeof gate.preflight, "function", "PR295 E2 must bind the independent reviews without replacing the pending checker");
  return gate;
}
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };
const sha = bytes => gate.hash(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));

function fixture(run, options = {}) {
  const g = implementation();
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr295-e2-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR295 E2 Fixture");
    git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false");
    git(repo, "config", "core.hooksPath", "/dev/null");
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...g.CODE_PATHS, g.DIRECTORY + "/", "coordination/integration/reviewed-code/pr295-v1/"].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", g.PENDING_EVIDENCE);
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    const extraTooling = options.extraTooling ?? [];
    for (const file of extraTooling) write(repo, file, "Unreviewed fixture change.\n");
    const commit = (...files) => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR295 E2 fixture; not a new approval"); };
    commit(...g.CODE_PATHS, ...extraTooling);
    const tooling = git(repo, "rev-parse", "HEAD");
    const reviews = {
      A11: { decisionRawSha256: g.A11_DECISION_SHA, reportRawSha256: g.A11_REPORT_SHA },
      A23: { decisionRawSha256: g.A23_DECISION_SHA, reportRawSha256: g.A23_REPORT_SHA }
    };
    for (const file of ["a11-review.json", "a11-review.md", "a23-review.json", "a23-review.md"]) {
      const bytes = readFileSync(path.join(root, g.DIRECTORY, file));
      write(repo, g.DIRECTORY + "/" + file, options.mutateReview?.(file, bytes) ?? bytes);
      write(repo, "coordination/integration/reviewed-code/pr295-v1/" + file, readFileSync(path.join(repo, g.DIRECTORY, file)));
    }
    write(repo, "coordination/integration/reviewed-code/pr295-v1/admission.json", readFileSync(path.join(root, "coordination/integration/reviewed-code/pr295-v1/admission.json")));
    write(repo, g.DIRECTORY + "/source-checks.json", readFileSync(path.join(root, "coordination/integration/reviewed-code/pr295-v1/source-checks.json")));
    write(repo, g.DIRECTORY + "/source-inventory.json", readFileSync(path.join(root, "coordination/integration/reviewed-code/pr295-v1/source-inventory.json")));
    const admission = {
      schemaVersion: "promotion-reviewed-code-pr295-e2.v1", pullRequest: g.PULL_REQUEST ?? 296,
      sourcePullRequest: 295, baseCommit: "63b02c4ec6a4415af0056313e8ad384bf4b61ee1",
      reviewedCommit: "50f323b0ee86437490ffbe2267fdd2f9709ab5de", reviewedParent: "fbc0f7e53bf95d534d7665d2d7c4dc621556315d",
      sourceCommit: "a7b7d104f2dfc93e8ab5282b5e90586e123f452c", sourceTree: "a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9",
      sourceInventoryDigest: "c17f40a337ae7c18511bc1445616a1b3c50471ed9caeae9fcb7e801aa98711e5",
      reviewedTooling: g.REVIEWED_TOOLING, reviewedToolingTree: g.REVIEWED_TOOLING_TREE, reviewedToolingDigest: g.REVIEWED_TOOLING_DIGEST,
      pendingEvidence: g.PENDING_EVIDENCE, pendingTree: g.PENDING_TREE, toolingRelease: tooling,
      toolingTree: git(repo, "rev-parse", tooling + "^{tree}"), toolingDigest: g.digest(g.inventory(repo, g.PENDING_EVIDENCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, v1AdmissionRawSha256: g.V1_ADMISSION_SHA, reviews, permissions: g.PERMISSIONS
    };
    options.admission?.(admission);
    let admissionBytes = JSON.stringify(admission) + "\n";
    if (options.duplicate) admissionBytes = admissionBytes.replace('{"schemaVersion":', '{"pullRequest":296,"schemaVersion":');
    write(repo, g.ADMISSION, admissionBytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra evidence is not admitted.\n");
    commit(...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? []));
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({
      repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 296,
      pull_request: {
        number: 296, base: { ref: "main", sha: "63b02c4ec6a4415af0056313e8ad384bf4b61ee1", repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } }
      }
    });
    const check = (name = "pull_request", value = event()) => {
      writeFileSync(eventPath, JSON.stringify(value));
      return g.preflight({ repoRoot: repo, eventName: name, eventPath });
    };
    run({ repo, temporary, tooling, evidence, eventPath, event, check, commit });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test("source S and the pending checker stay intact under E", () => {
  const g = implementation();
  assert.equal(git(root, "show", "-s", "--format=%P", g.PENDING_EVIDENCE), g.REVIEWED_TOOLING);
  assert.equal(git(root, "show", "-s", "--format=%P", g.REVIEWED_TOOLING), "a7b7d104f2dfc93e8ab5282b5e90586e123f452c");
  assert.equal(git(root, "rev-parse", "a7b7d104f2dfc93e8ab5282b5e90586e123f452c^{tree}"), "a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9");
  assert.equal(git(root, "rev-parse", "50f323b0ee86437490ffbe2267fdd2f9709ab5de^{tree}"), "a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9");
  assert.equal(REVIEW_RESULT, "pending-independent-review");
  for (const file of ["scripts/promotion-reviewed-code-pr295.mjs", "scripts/promotion-reviewed-code-pr295.test.mjs", "docs/pr295-reviewed-code-gate.md"]) {
    assert.equal(git(root, "rev-parse", g.PENDING_EVIDENCE + ":" + file), git(root, "rev-parse", g.REVIEWED_TOOLING + ":" + file));
  }
  assert.equal(git(root, "rev-parse", "63b02c4ec6a4415af0056313e8ad384bf4b61ee1:scripts/monitor-teacher-notice-health.mjs"), "34d8b50957af26e9bfdef6f343117b6bea4db0b4");
  assert.equal(git(root, "rev-parse", "a7b7d104f2dfc93e8ab5282b5e90586e123f452c:scripts/monitor-teacher-notice-health.mjs"), "34d8b50957af26e9bfdef6f343117b6bea4db0b4");
  assert.ok(Object.values(g.PERMISSIONS).every(value => value === false));
});

test("the in-tree placeholders are replaced by the exact independent bytes", () => {
  const g = implementation();
  assert.equal(sha(execFileSync("git", ["show", g.PENDING_EVIDENCE + ":coordination/integration/reviewed-code/pr295-v1/a11-review.json"])), g.PENDING_A11_DECISION_SHA);
  assert.equal(sha(execFileSync("git", ["show", g.PENDING_EVIDENCE + ":coordination/integration/reviewed-code/pr295-v1/a11-review.md"])), g.PENDING_A11_REPORT_SHA);
  assert.equal(sha(execFileSync("git", ["show", g.PENDING_EVIDENCE + ":coordination/integration/reviewed-code/pr295-v1/a23-review.json"])), g.PENDING_A23_DECISION_SHA);
  assert.equal(sha(execFileSync("git", ["show", g.PENDING_EVIDENCE + ":coordination/integration/reviewed-code/pr295-v1/a23-review.md"])), g.PENDING_A23_REPORT_SHA);
  for (const [file, digest] of [["a11-review.json", g.A11_DECISION_SHA], ["a11-review.md", g.A11_REPORT_SHA], ["a23-review.json", g.A23_DECISION_SHA], ["a23-review.md", g.A23_REPORT_SHA]]) {
    const v1 = readFileSync(path.join(root, "coordination/integration/reviewed-code/pr295-v1", file));
    const e2 = readFileSync(path.join(root, g.DIRECTORY, file));
    assert.deepEqual(v1, e2);
    assert.equal(sha(v1), digest);
    assert.notEqual(sha(v1), sha(execFileSync("git", ["show", g.PENDING_EVIDENCE + ":coordination/integration/reviewed-code/pr295-v1/" + file])));
  }
});

test("the workflow only prepends the E2 selector", () => {
  const g = implementation();
  const before = git(root, "show", g.PENDING_EVIDENCE + ":.github/workflows/promotion-shadow.yml") + "\n";
  const workflow = readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8");
  assert.equal(workflow, g.expectedWorkflow(before));
  assert.ok(workflow.indexOf("reviewed-code-pr295-e2") < workflow.indexOf("promotion-reviewed-code-pr295.mjs select"));
  assert.throws(() => g.expectedWorkflow("unrecognized workflow\n"), /PR295_E2_WORKFLOW/);
});

test("a complete synthetic chain binds both independent reviews and withholds eligibility", () => fixture(({ check, evidence }) => {
  const value = check();
  assert.equal(value.evidenceCommit, evidence);
  assert.equal(value.admission.reviews.A11.decisionRawSha256, gate.A11_DECISION_SHA);
  assert.equal(value.admission.reviews.A23.reportRawSha256, gate.A23_REPORT_SHA);
  assert.equal(value.admission.permissions.ordinaryCodeEligible, false);
}));

test("the source pull request number and a changed base fail closed", () => fixture(({ check, event }) => {
  for (const number of [295, 293, 297]) {
    const e = event(); e.number = number; e.pull_request.number = number;
    assert.throws(() => check("pull_request", e), /PR295_E2_EVENT/);
  }
  const e = event(); e.pull_request.base.sha = gate.SOURCE ?? "a7b7d104f2dfc93e8ab5282b5e90586e123f452c";
  assert.throws(() => check("pull_request", e), /PR295_E2_EVENT/);
}));

test("wrong repository fork base ref and event head fail closed", () => fixture(({ check, event }) => {
  for (const mutate of [
    e => { e.repository.full_name = "other/MAIS-MVP"; },
    e => { e.pull_request.head.repo.full_name = "other/MAIS-MVP"; },
    e => { e.pull_request.base.ref = "development"; },
    e => { e.pull_request.head.sha = gate.PENDING_EVIDENCE; }
  ]) { const e = event(); mutate(e); assert.throws(() => check("pull_request", e), /PR295_E2_EVENT/); }
}));

test("only the exact two-parent main merge can use the post-merge check", () => fixture(({ repo, check, evidence }) => {
  const base = "63b02c4ec6a4415af0056313e8ad384bf4b61ee1";
  const merge = git(repo, "commit-tree", evidence + "^{tree}", "-p", base, "-p", evidence, "-m", "Synthetic preserving main merge");
  git(repo, "checkout", "--detach", "-q", merge);
  const e = { repository: { full_name: "HUDongpin/MAIS-MVP" }, ref: "refs/heads/main", before: base, after: merge };
  assert.equal(check("push", e).head, merge);
  const squash = git(repo, "commit-tree", evidence + "^{tree}", "-p", evidence, "-m", "Squash is not admitted");
  git(repo, "checkout", "--detach", "-q", squash);
  assert.throws(() => check("push", { ...e, after: squash }), /PR295_E2_EVENT/);
}));

test("an extra runtime file is rejected even with recomputed tooling hashes", () => fixture(
  ({ check }) => assert.throws(check, /PR295_E2_TOOLING_PATHS/), { extraTooling: ["lib/unreviewed-pr295-e2.ts"] }
));

test("an old workflow step cannot be weakened inside the allowed workflow path", () => fixture(
  ({ check }) => assert.throws(check, /PR295_E2_WORKFLOW/),
  { tooling: repo => {
    const file = ".github/workflows/promotion-shadow.yml";
    write(repo, file, readFileSync(path.join(repo, file), "utf8").replace("      - name: Install current dependencies from lockfile", "      - name: Install current dependencies from lockfile\n        continue-on-error: true"));
  } }
));

test("unreviewed evidence paths cannot be appended to the evidence commit", () => fixture(
  ({ check }) => assert.throws(check, /PR295_E2_EVIDENCE_PATHS/),
  { extraEvidence: ["coordination/release-intake/unreviewed-pr295-e2.md"] }
));

test("altered independent report bytes are rejected", () => fixture(
  ({ check }) => assert.throws(check, /PR295_E2_REVIEW_BYTES/),
  { mutateReview: (file, bytes) => file.endsWith(".md") ? Buffer.concat([bytes, Buffer.from(" ")]) : bytes }
));

test("live permission and ordinary-code eligibility cannot be widened", () => fixture(
  ({ check }) => assert.throws(check, /PR295_E2_PERMISSION/),
  { admission: a => { a.permissions = { ...a.permissions, liveAllowed: true, ordinaryCodeEligible: true }; } }
));

test("duplicate JSON keys and unknown admission fields are rejected", () => {
  fixture(({ check }) => assert.throws(check, { code: "PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY" }), { duplicate: true });
  fixture(({ check }) => assert.throws(check, /PR295_E2_SCHEMA/), { admission: a => { a.skipGate = true; } });
});

test("a later amendment cannot inherit the E2 tree", () => fixture(({ repo, check, commit }) => {
  write(repo, gate.DIRECTORY + "/a11-review.md", readFileSync(path.join(repo, gate.DIRECTORY, "a11-review.md")).toString("utf8") + "\n");
  commit(gate.DIRECTORY + "/a11-review.md");
  assert.throws(check, /PR295_E2_EVIDENCE|PR295_E2_EVENT/);
}));

test("tracked drift and hidden git state are rejected", () => fixture(({ repo, temporary, evidence, check, eventPath }) => {
  write(repo, "untracked.txt", "Unexpected file\n");
  assert.throws(check, /PR295_E2_DIRTY/);
  rmSync(path.join(repo, "untracked.txt"));
  git(repo, "replace", evidence, gate.PENDING_EVIDENCE);
  assert.throws(check, /PR295_E2_REPLACE/);
  git(repo, "replace", "-d", evidence);
  write(repo, ".git/info/grafts", evidence + " " + gate.PENDING_EVIDENCE + "\n");
  assert.throws(check, /PR295_E2_GRAFT/);
  rmSync(path.join(repo, ".git/info/grafts"));
  symlinkSync(repo, path.join(temporary, "alias"));
  assert.throws(() => gate.preflight({ repoRoot: path.join(temporary, "alias"), eventName: "pull_request", eventPath }), /PR295_E2_ROOT/);
}));

test("forged test reports and injected command environments are rejected", () => {
  const g = implementation();
  const valid = "TAP version 13\n# Subtest: one\nok 1 - one\n  ---\n  duration_ms: 1\n  type: 'test'\n  ...\n1..1\n# tests 1\n# suites 0\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1\n";
  assert.deepEqual(g.verifyTestReport(Buffer.from(valid), 1), { tests: 1, pass: 1, fail: 0 });
  assert.throws(() => g.verifyTestReport(Buffer.from(valid.replace("ok 1", "not ok 1")), 1), /PR295_E2_TEST_REPORT/);
  const old = process.env.NODE_OPTIONS; process.env.NODE_OPTIONS = "--require=/unreviewed.js";
  try { assert.equal(g.commandEnvironment().NODE_OPTIONS, undefined); }
  finally { if (old === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = old; }
});
