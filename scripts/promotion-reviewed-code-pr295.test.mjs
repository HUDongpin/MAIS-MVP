import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts/promotion-reviewed-code-pr295.mjs");
const gate = existsSync(modulePath) ? await import("./promotion-reviewed-code-pr295.mjs") : {};
function implementation() {
  assert.equal(typeof gate.preflight, "function", "PR295 must have an exact reviewed-code admission implementation");
  return gate;
}
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };

// Disposable sparse repositories exercise metadata rejection only. Their review
// records are synthetic test inputs, never independent acceptance evidence.
function fixture(run, options = {}) {
  const g = implementation();
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr295-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR295 Fixture");
    git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false");
    git(repo, "config", "core.hooksPath", "/dev/null");
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...g.CODE_PATHS, g.DIRECTORY + "/"].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", g.SOURCE);
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    const extraTooling = options.extraTooling ?? [];
    for (const file of extraTooling) write(repo, file, "Unreviewed fixture change.\n");
    const commit = (...files) => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR295 fixture; not approval"); };
    commit(...g.CODE_PATHS, ...extraTooling);
    const tooling = git(repo, "rev-parse", "HEAD");
    const toolingDigest = g.digest(g.inventory(repo, g.SOURCE, tooling));
    const checks = {
      schemaVersion: "pr295-source-checks.v1", sourceCommit: g.SOURCE, reviewedCommit: g.PR295,
      toolingCommit: tooling, toolingInventoryDigest: toolingDigest, result: "pass",
      contractTests: { tests: g.TEST_COUNT, pass: g.TEST_COUNT, fail: 0 },
      monitorTests: { tests: g.MONITOR_COUNT, pass: g.MONITOR_COUNT, fail: 0 },
      probeUnchanged: true, schedule: g.SCHEDULE
    };
    options.checks?.(checks);
    const checksBytes = JSON.stringify(checks) + "\n";
    write(repo, g.DIRECTORY + "/source-checks.json", checksBytes);
    write(repo, g.DIRECTORY + "/source-inventory.json", g.stable(g.inventory(repo, g.BASE, g.SOURCE)) + "\n");
    const reviews = {};
    for (const role of ["A11", "A23"]) {
      const reportPath = g.DIRECTORY + "/" + role.toLowerCase() + "-review.md";
      const report = "Synthetic " + role + " fixture; pending, not an independent review.\n";
      write(repo, reportPath, report);
      const review = {
        schemaVersion: "pr295-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        reviewedAt: "2026-10-26T00:00:00.000Z", reviewedSource: g.SOURCE,
        reviewedTooling: tooling, toolingInventoryDigest: toolingDigest,
        sourceInventoryDigest: g.SOURCE_INVENTORY, checksRawSha256: g.hash(Buffer.from(checksBytes)),
        result: g.REVIEW_RESULT,
        report: { path: reportPath, rawSha256: g.hash(Buffer.from(report)) },
        liveAllowed: false
      };
      options.review?.(review, role);
      const bytes = JSON.stringify(review) + "\n";
      write(repo, g.DIRECTORY + "/" + role.toLowerCase() + "-review.json", bytes);
      reviews[role] = { decisionRawSha256: g.hash(Buffer.from(bytes)), reportRawSha256: g.hash(Buffer.from(report)) };
    }
    const admission = {
      schemaVersion: "promotion-reviewed-code-pr295.v1", pullRequest: g.PULL_REQUEST,
      sourcePullRequest: g.SOURCE_PULL_REQUEST, baseCommit: g.BASE, reviewedCommit: g.PR295,
      reviewedParent: g.PR295_PARENT, sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE,
      sourceInventoryDigest: g.SOURCE_INVENTORY, toolingCommit: tooling,
      toolingTree: git(repo, "rev-parse", tooling + "^{tree}"), toolingInventoryDigest: toolingDigest,
      checksRawSha256: g.hash(Buffer.from(checksBytes)), reviews, permissions: g.PERMISSIONS
    };
    options.admission?.(admission);
    let admissionBytes = JSON.stringify(admission) + "\n";
    if (options.duplicate) admissionBytes = admissionBytes.replace('{"schemaVersion":', '{"pullRequest":296,"schemaVersion":');
    write(repo, g.ADMISSION, admissionBytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra evidence is not admitted.\n");
    commit(...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? []));
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({
      repository: { full_name: "HUDongpin/MAIS-MVP" }, number: g.PULL_REQUEST,
      pull_request: {
        number: g.PULL_REQUEST,
        base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } }
      }
    });
    const check = (name = "pull_request", value = event()) => {
      writeFileSync(eventPath, JSON.stringify(value));
      return g.preflight({ repoRoot: repo, eventName: name, eventPath });
    };
    run({ repo, temporary, tooling, evidence, eventPath, event, check, commit, admission });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test("the pinned source keeps both PR #295 commits and matches that reviewed tree", () => {
  const g = implementation();
  assert.equal(git(root, "show", "-s", "--format=%P", g.SOURCE), g.BASE + " " + g.PR295);
  assert.equal(git(root, "show", "-s", "--format=%P", g.PR295), g.PR295_PARENT);
  assert.equal(git(root, "show", "-s", "--format=%P", g.PR295_PARENT), g.BASE);
  assert.equal(git(root, "rev-parse", g.SOURCE + "^{tree}"), g.SOURCE_TREE);
  assert.equal(git(root, "rev-parse", g.PR295 + "^{tree}"), g.SOURCE_TREE);
  assert.equal(g.digest(g.inventory(root, g.BASE, g.SOURCE)), g.SOURCE_INVENTORY);
  assert.equal(g.SOURCE_PATHS.length, 2);
  assert.equal(g.CODE_PATHS.length, 4);
  assert.equal(g.EVIDENCE_PATHS.length, 7);
  assert.equal(git(root, "rev-parse", g.BASE + ":" + g.PROBE), g.PROBE_BLOB);
  assert.equal(git(root, "rev-parse", g.SOURCE + ":" + g.PROBE), g.PROBE_BLOB);
  const schedule = git(root, "show", g.SOURCE + ":" + g.SCHEDULE_WORKFLOW);
  assert.deepEqual(schedule.split("\n").filter(row => row.startsWith("    - cron:")), ['    - cron: "7 * * * *"']);
  assert.ok(Object.values(g.PERMISSIONS).every(value => value === false));
  assert.equal(g.DECISION_RESULT, "pending");
  assert.equal(g.REVIEW_RESULT, "pending-independent-review");
});

test("the workflow only adds the bounded PR295 selector and verification steps", () => {
  const g = implementation(), before = git(root, "show", g.BASE + ":.github/workflows/promotion-shadow.yml") + "\n";
  const workflow = readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8");
  assert.equal(workflow, g.expectedWorkflow(before));
  assert.ok(workflow.indexOf("reviewed-code-pr295") < workflow.indexOf("reviewed-docs-pr293"));
  assert.throws(() => g.expectedWorkflow("unrecognized workflow\n"), /PR295_WORKFLOW/);
});

test("a complete synthetic metadata chain accepts exact PR296 and exposes no live authority", () => fixture(({ check, evidence }) => {
  const value = check();
  assert.equal(value.evidenceCommit, evidence);
  assert.equal(value.admission.pullRequest, 296);
  assert.equal(value.admission.sourcePullRequest, 295);
  assert.equal(value.admission.reviews.A11.decisionRawSha256.length, 64);
  assert.ok(Object.values(value.admission.permissions).every(item => item === false));
}));

test("the source PR number and a changed base fail closed", () => fixture(({ check, event }) => {
  for (const number of [295, 293, 297]) {
    const e = event(); e.number = number; e.pull_request.number = number;
    assert.throws(() => check("pull_request", e), /PR295_EVENT/);
  }
  const e = event(); e.pull_request.base.sha = gate.SOURCE;
  assert.throws(() => check("pull_request", e), /PR295_EVENT/);
}));

test("wrong repository fork base ref and event head fail closed", () => fixture(({ check, event }) => {
  for (const mutate of [
    e => { e.repository.full_name = "other/MAIS-MVP"; },
    e => { e.pull_request.head.repo.full_name = "other/MAIS-MVP"; },
    e => { e.pull_request.base.ref = "development"; },
    e => { e.pull_request.head.sha = gate.SOURCE; }
  ]) { const e = event(); mutate(e); assert.throws(() => check("pull_request", e), /PR295_EVENT/); }
}));

test("only the exact two-parent main merge can use the post-merge check", () => fixture(({ repo, check, evidence }) => {
  const merge = git(repo, "commit-tree", evidence + "^{tree}", "-p", gate.BASE, "-p", evidence, "-m", "Synthetic preserving main merge");
  git(repo, "checkout", "--detach", "-q", merge);
  const e = { repository: { full_name: "HUDongpin/MAIS-MVP" }, ref: "refs/heads/main", before: gate.BASE, after: merge };
  assert.equal(check("push", e).head, merge);
  assert.throws(() => check("push", { ...e, ref: "refs/heads/other" }), /PR295_EVENT/);
  const reversed = git(repo, "commit-tree", evidence + "^{tree}", "-p", evidence, "-p", gate.BASE, "-m", "Reversed parents");
  git(repo, "checkout", "--detach", "-q", reversed);
  assert.throws(() => check("push", { ...e, after: reversed }), /PR295_EVENT/);
  const squash = git(repo, "commit-tree", evidence + "^{tree}", "-p", evidence, "-m", "Squash is not admitted");
  git(repo, "checkout", "--detach", "-q", squash);
  assert.throws(() => check("push", { ...e, after: squash }), /PR295_EVENT/);
}));

test("an extra runtime file is rejected even with recomputed tooling hashes", () => fixture(
  ({ check }) => assert.throws(check, /PR295_TOOLING_PATHS/), { extraTooling: ["lib/unreviewed-pr295.ts"] }
));

test("a changed health probe is rejected even with recomputed tooling hashes", () => fixture(
  ({ check }) => assert.throws(check, /PR295_TOOLING_PATHS/),
  { extraTooling: ["scripts/monitor-teacher-notice-health.mjs"] }
));

test("an old workflow step cannot be weakened inside the allowed workflow path", () => fixture(
  ({ check }) => assert.throws(check, /PR295_WORKFLOW/),
  { tooling: repo => {
    const file = ".github/workflows/promotion-shadow.yml";
    write(repo, file, readFileSync(path.join(repo, file), "utf8").replace("      - name: Install current dependencies from lockfile", "      - name: Install current dependencies from lockfile\n        continue-on-error: true"));
  } }
));

test("unreviewed evidence paths cannot be appended to the evidence commit", () => fixture(
  ({ check }) => assert.throws(check, /PR295_EVIDENCE_PATHS/),
  { extraEvidence: ["coordination/release-intake/unreviewed-pr295.md"] }
));

test("reviewer identities remain separate and must match their assigned roles", () => fixture(
  ({ check }) => assert.throws(check, /PR295_REVIEW/),
  { review: (r, role) => { if (role === "A23") r.reviewerIdentity = gate.IDENTITIES.A11; } }
));

test("a review for another tooling commit is rejected", () => fixture(
  ({ check }) => assert.throws(check, /PR295_REVIEW/),
  { review: r => { r.reviewedTooling = gate.SOURCE; } }
));

test("approval verdicts and live permissions cannot be widened", () => {
  fixture(({ check }) => assert.throws(check, /PR295_REVIEW/), {
    review: r => { r.result = "approved-for-ordinary-code-required-check"; }
  });
  fixture(({ check }) => assert.throws(check, /PR295_REVIEW/), {
    review: r => { r.liveAllowed = true; }
  });
  fixture(({ check }) => assert.throws(check, /PR295_PERMISSION/), {
    admission: a => { a.permissions = { ...a.permissions, liveAllowed: true, ordinaryCodeEligible: true }; }
  });
});

test("duplicate JSON keys and unknown admission fields are rejected", () => {
  fixture(({ check }) => assert.throws(check, { code: "PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY" }), { duplicate: true });
  fixture(({ check }) => assert.throws(check, /PR295_SCHEMA/), { admission: a => { a.skipGate = true; } });
});

test("failed recorded tests are not accepted when review hashes are regenerated", () => {
  fixture(({ check }) => assert.throws(check, /PR295_CHECKS/), { checks: c => { c.contractTests.fail = 1; } });
  fixture(({ check }) => assert.throws(check, /PR295_CHECKS/), { checks: c => { c.probeUnchanged = false; } });
});

test("a later amendment cannot inherit the reviewed evidence identity", () => fixture(({ repo, check, commit }) => {
  write(repo, gate.DIRECTORY + "/a11-review.md", "Amended after the pending placeholder.\n");
  commit(gate.DIRECTORY + "/a11-review.md");
  assert.throws(check, /PR295_EVIDENCE|PR295_EVENT/);
}));

test("tracked drift and untracked additions are rejected before execution", () => fixture(({ repo, check }) => {
  write(repo, "untracked.txt", "Unexpected file\n");
  assert.throws(check, /PR295_DIRTY/);
  rmSync(path.join(repo, "untracked.txt"));
  write(repo, gate.ADMISSION, readFileSync(path.join(repo, gate.ADMISSION), "utf8") + " ");
  assert.throws(check, /PR295_DIRTY/);
}));

test("sparse or hidden worktree state cannot pass materialization", () => fixture(({ repo, evidence }) => {
  assert.throws(() => gate.assertMaterializedTree(repo, evidence), /INDEX_FLAGS|ENOENT/);
  git(repo, "update-index", "--assume-unchanged", "--", gate.ADMISSION);
  assert.throws(() => gate.assertMaterializedTree(repo, evidence), /INDEX_FLAGS/);
}));

test("replacement refs grafts and an aliased repository root are rejected", () => fixture(({ repo, temporary, evidence, check, eventPath }) => {
  git(repo, "replace", evidence, gate.SOURCE);
  assert.throws(check, /PR295_REPLACE/);
  git(repo, "replace", "-d", evidence);
  write(repo, ".git/info/grafts", evidence + " " + gate.SOURCE + "\n");
  assert.throws(check, /PR295_GRAFT/);
  rmSync(path.join(repo, ".git/info/grafts"));
  symlinkSync(repo, path.join(temporary, "alias"));
  assert.throws(() => gate.preflight({ repoRoot: path.join(temporary, "alias"), eventName: "pull_request", eventPath }), /PR295_ROOT/);
}));

test("a symbolic admission file cannot masquerade as the regular reviewed blob", () => fixture(({ repo, check }) => {
  const absolute = path.join(repo, gate.ADMISSION), copy = path.join(repo, ".git/admission-copy");
  writeFileSync(copy, readFileSync(absolute)); rmSync(absolute); symlinkSync(copy, absolute);
  assert.ok(lstatSync(absolute).isSymbolicLink());
  assert.throws(check, /PR295_DIRTY|PR295_FILE/);
}));

test("empty failed skipped truncated or forged test reports cannot be counted as passing", () => {
  const g = implementation();
  const valid = "TAP version 13\n# Subtest: one\nok 1 - one\n  ---\n  duration_ms: 1\n  type: 'test'\n  ...\n1..1\n# tests 1\n# suites 0\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1\n";
  assert.deepEqual(g.verifyTestReport(Buffer.from(valid), 1), { tests: 1, pass: 1, fail: 0 });
  assert.deepEqual(g.verifyTestReport(Buffer.from(valid.replace("# Subtest: one", "# harmless Git warning\n# Subtest: one")), 1), { tests: 1, pass: 1, fail: 0 });
  for (const value of ["", valid.replace("ok 1", "not ok 1"), valid.replace("ok 1 - one", "ok 1 - one # SKIP"), valid.replace("1..1\n", ""), valid + "# tests 1\n", valid + "not ok 2 - hidden\n"]) {
    assert.throws(() => g.verifyTestReport(Buffer.from(value), 1), /PR295_TEST_REPORT/);
  }
});

test("verification commands do not inherit Node or Git injection variables", () => {
  const g = implementation();
  const old = process.env.NODE_OPTIONS; process.env.NODE_OPTIONS = "--require=/unreviewed.js";
  try {
    const clean = g.commandEnvironment();
    assert.equal(clean.NODE_OPTIONS, undefined);
    assert.equal(clean.GIT_CONFIG_COUNT, undefined);
    assert.equal(clean.GIT_CONFIG_GLOBAL, "/dev/null");
  } finally { if (old === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = old; }
});
