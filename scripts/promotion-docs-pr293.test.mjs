import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts/promotion-docs-pr293.mjs");
const gate = existsSync(modulePath) ? await import("./promotion-docs-pr293.mjs") : {};
function implementation() {
  assert.equal(typeof gate.preflight, "function", "PR293 must have an exact documentation admission implementation");
  return gate;
}
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };

// Disposable sparse repositories exercise metadata rejection only. Their review
// records are synthetic test inputs, never independent acceptance evidence.
function fixture(run, options = {}) {
  const g = implementation();
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr293-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR293 Fixture");
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
    const commit = (...files) => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR293 fixture; not approval"); };
    commit(...g.CODE_PATHS, ...extraTooling);
    const tooling = git(repo, "rev-parse", "HEAD");
    const toolingDigest = g.digest(g.inventory(repo, g.SOURCE, tooling));
    const checks = {
      schemaVersion: "pr293-source-checks.v1", sourceCommit: g.SOURCE,
      toolingCommit: tooling, toolingInventoryDigest: toolingDigest,
      result: "pass", contractTests: { tests: g.TEST_COUNT, pass: g.TEST_COUNT, fail: 0 },
      ownerPackageGate: { valid: true, resolutionChecks: 42 }
    };
    options.checks?.(checks);
    const checksBytes = JSON.stringify(checks) + "\n";
    write(repo, g.DIRECTORY + "/source-checks.json", checksBytes);
    write(repo, g.DIRECTORY + "/source-inventory.json", g.stable(g.inventory(repo, g.BASE, g.SOURCE)) + "\n");
    const reviews = {};
    for (const role of ["A11", "A23"]) {
      const reportPath = g.DIRECTORY + "/" + role.toLowerCase() + "-review.md";
      const report = "Synthetic " + role + " fixture; not an independent review.\n";
      write(repo, reportPath, report);
      const review = {
        schemaVersion: "pr293-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        reviewedAt: "2026-10-24T00:00:00.000Z", reviewedSource: g.SOURCE,
        reviewedTooling: tooling, toolingInventoryDigest: toolingDigest,
        sourceInventoryDigest: g.SOURCE_INVENTORY, checksRawSha256: g.hash(Buffer.from(checksBytes)),
        result: "approved-for-exact-documentation-required-check",
        report: { path: reportPath, rawSha256: g.hash(Buffer.from(report)) },
        liveAllowed: false
      };
      options.review?.(review, role);
      const bytes = JSON.stringify(review) + "\n";
      write(repo, g.DIRECTORY + "/" + role.toLowerCase() + "-review.json", bytes);
      reviews[role] = { decisionRawSha256: g.hash(Buffer.from(bytes)), reportRawSha256: g.hash(Buffer.from(report)) };
    }
    const admission = {
      schemaVersion: "pr293-documentation-admission.v1", pullRequest: 293,
      baseCommit: g.BASE, sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE,
      sourceInventoryDigest: g.SOURCE_INVENTORY, toolingCommit: tooling,
      toolingTree: git(repo, "rev-parse", tooling + "^{tree}"), toolingInventoryDigest: toolingDigest,
      checksRawSha256: g.hash(Buffer.from(checksBytes)), reviews, permissions: g.PERMISSIONS
    };
    options.admission?.(admission);
    let admissionBytes = JSON.stringify(admission) + "\n";
    if (options.duplicate) admissionBytes = admissionBytes.replace('{"schemaVersion":', '{"pullRequest":293,"schemaVersion":');
    write(repo, g.ADMISSION, admissionBytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra evidence is not admitted.\n");
    commit(...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? []));
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({
      repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 293,
      pull_request: {
        number: 293,
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

test("the pinned source retains both original commits and changes only the reviewed 24 files", () => {
  const g = implementation();
  assert.equal(git(root, "show", "-s", "--format=%P", g.SOURCE), g.DOCS_HEAD + " " + g.BASE);
  assert.equal(git(root, "rev-parse", g.SOURCE + "^{tree}"), g.SOURCE_TREE);
  assert.equal(g.digest(g.inventory(root, g.BASE, g.SOURCE)), g.SOURCE_INVENTORY);
  assert.equal(g.SOURCE_PATHS.length, 24);
  assert.equal(g.CODE_PATHS.length, 4);
  assert.equal(g.EVIDENCE_PATHS.length, 7);
  for (const commit of ["7e3a503643bf0d9b86edc503166f01126c95b122", g.DOCS_HEAD]) git(root, "merge-base", "--is-ancestor", commit, g.SOURCE);
  assert.ok(Object.values(g.PERMISSIONS).every(value => value === false));
});

test("the workflow only adds the bounded PR293 selector and verification steps", () => {
  const g = implementation(), before = git(root, "show", g.BASE + ":.github/workflows/promotion-shadow.yml") + "\n";
  assert.equal(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"), g.expectedWorkflow(before));
  assert.throws(() => g.expectedWorkflow("unrecognized workflow\n"), /PR293_WORKFLOW/);
});

test("a complete synthetic metadata chain accepts exact PR293 and exposes no live authority", () => fixture(({ check, evidence }) => {
  const value = check();
  assert.equal(value.evidenceCommit, evidence);
  assert.equal(value.admission.pullRequest, 293);
  assert.ok(Object.values(value.admission.permissions).every(value => value === false));
}));

test("wrong PR number and changed base fail closed", () => fixture(({ check, event }) => {
  for (const number of [287, 292, 294]) {
    const e = event(); e.number = number; e.pull_request.number = number;
    assert.throws(() => check("pull_request", e), /PR293_EVENT/);
  }
  const e = event(); e.pull_request.base.sha = gate.SOURCE;
  assert.throws(() => check("pull_request", e), /PR293_EVENT/);
}));

test("wrong repository fork base ref and event head fail closed", () => fixture(({ check, event }) => {
  for (const mutate of [
    e => { e.repository.full_name = "other/MAIS-MVP"; },
    e => { e.pull_request.head.repo.full_name = "other/MAIS-MVP"; },
    e => { e.pull_request.base.ref = "development"; },
    e => { e.pull_request.head.sha = gate.SOURCE; }
  ]) { const e = event(); mutate(e); assert.throws(() => check("pull_request", e), /PR293_EVENT/); }
}));

test("only the exact two-parent main merge can use the post-merge check", () => fixture(({ repo, check, evidence }) => {
  const merge = git(repo, "commit-tree", evidence + "^{tree}", "-p", gate.BASE, "-p", evidence, "-m", "Synthetic preserving main merge");
  git(repo, "checkout", "--detach", "-q", merge);
  const e = { repository: { full_name: "HUDongpin/MAIS-MVP" }, ref: "refs/heads/main", before: gate.BASE, after: merge };
  assert.equal(check("push", e).head, merge);
  assert.throws(() => check("push", { ...e, ref: "refs/heads/other" }), /PR293_EVENT/);
  const child = git(repo, "commit-tree", merge + "^{tree}", "-p", merge, "-m", "Extra unchanged descendant");
  git(repo, "checkout", "--detach", "-q", child);
  assert.throws(() => check("push", { ...e, after: child }), /PR293_EVENT/);
}));

test("an extra runtime file is rejected even with recomputed tooling hashes", () => fixture(
  ({ check }) => assert.throws(check, /PR293_TOOLING_PATHS/), { extraTooling: ["lib/unreviewed-pr293.ts"] }
));

test("a changed reviewed document is rejected even with recomputed tooling hashes", () => fixture(
  ({ check }) => assert.throws(check, /PR293_TOOLING_PATHS/),
  { extraTooling: ["coordination/content-qa/2026-09-27-A18-successor-22-fresh-review.md"] }
));

test("an old workflow step cannot be weakened inside the allowed workflow path", () => fixture(
  ({ check }) => assert.throws(check, /PR293_WORKFLOW/),
  { tooling: repo => {
    const file = ".github/workflows/promotion-shadow.yml";
    write(repo, file, readFileSync(path.join(repo, file), "utf8").replace("      - name: Install current dependencies from lockfile", "      - name: Install current dependencies from lockfile\n        continue-on-error: true"));
  } }
));

test("unreviewed evidence paths cannot be appended to the evidence commit", () => fixture(
  ({ check }) => assert.throws(check, /PR293_EVIDENCE_PATHS/),
  { extraEvidence: ["coordination/release-intake/unreviewed-pr293.md"] }
));

test("reviewer identities remain separate and must match their assigned roles", () => fixture(
  ({ check }) => assert.throws(check, /PR293_REVIEW/),
  { review: (r, role) => { if (role === "A23") r.reviewerIdentity = gate.IDENTITIES.A11; } }
));

test("a review for another tooling commit is rejected", () => fixture(
  ({ check }) => assert.throws(check, /PR293_REVIEW/),
  { review: r => { r.reviewedTooling = gate.SOURCE; } }
));

test("approval verdicts and live permissions cannot be widened", () => fixture(
  ({ check }) => assert.throws(check, /PR293_PERMISSION/),
  { admission: a => { a.permissions = { ...a.permissions, liveAllowed: true }; } }
));

test("duplicate JSON keys and unknown admission fields are rejected", () => {
  fixture(({ check }) => assert.throws(check, { code: "PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY" }), { duplicate: true });
  fixture(({ check }) => assert.throws(check, /PR293_SCHEMA/), { admission: a => { a.skipGate = true; } });
});

test("failed recorded tests are not accepted when review hashes are regenerated", () => fixture(
  ({ check }) => assert.throws(check, /PR293_CHECKS/),
  { checks: c => { c.contractTests.fail = 1; } }
));

test("a later amendment cannot inherit the reviewed evidence identity", () => fixture(({ repo, check, commit }) => {
  write(repo, gate.DIRECTORY + "/a11-review.md", "Amended after independent review.\n");
  commit(gate.DIRECTORY + "/a11-review.md");
  assert.throws(check, /PR293_EVIDENCE|PR293_EVENT/);
}));

test("tracked drift and untracked additions are rejected before execution", () => fixture(({ repo, check }) => {
  write(repo, "untracked.txt", "Unexpected file\n");
  assert.throws(check, /PR293_DIRTY/);
  rmSync(path.join(repo, "untracked.txt"));
  write(repo, gate.ADMISSION, readFileSync(path.join(repo, gate.ADMISSION), "utf8") + " ");
  assert.throws(check, /PR293_DIRTY/);
}));

test("sparse or hidden worktree state cannot pass materialization", () => fixture(({ repo, evidence }) => {
  assert.throws(() => gate.assertMaterializedTree(repo, evidence), /INDEX_FLAGS|ENOENT/);
  git(repo, "update-index", "--assume-unchanged", "--", gate.ADMISSION);
  assert.throws(() => gate.assertMaterializedTree(repo, evidence), /INDEX_FLAGS/);
}));

test("replacement refs grafts and an aliased repository root are rejected", () => fixture(({ repo, temporary, evidence, check, eventPath }) => {
  git(repo, "replace", evidence, gate.SOURCE);
  assert.throws(check, /PR293_REPLACE/);
  git(repo, "replace", "-d", evidence);
  write(repo, ".git/info/grafts", evidence + " " + gate.SOURCE + "\n");
  assert.throws(check, /PR293_GRAFT/);
  rmSync(path.join(repo, ".git/info/grafts"));
  symlinkSync(repo, path.join(temporary, "alias"));
  assert.throws(() => gate.preflight({ repoRoot: path.join(temporary, "alias"), eventName: "pull_request", eventPath }), /PR293_ROOT/);
}));

test("a symbolic admission file cannot masquerade as the regular reviewed blob", () => fixture(({ repo, check }) => {
  const absolute = path.join(repo, gate.ADMISSION), copy = path.join(repo, ".git/admission-copy");
  writeFileSync(copy, readFileSync(absolute)); rmSync(absolute); symlinkSync(copy, absolute);
  assert.ok(lstatSync(absolute).isSymbolicLink());
  assert.throws(check, /PR293_DIRTY|PR293_FILE/);
}));

test("empty failed skipped truncated or forged test reports cannot be counted as passing", () => {
  const g = implementation();
  const valid = "TAP version 13\n# Subtest: one\nok 1 - one\n  ---\n  duration_ms: 1\n  type: 'test'\n  ...\n1..1\n# tests 1\n# suites 0\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1\n";
  assert.deepEqual(g.verifyTestReport(Buffer.from(valid), 1), { tests: 1, pass: 1, fail: 0 });
  assert.deepEqual(g.verifyTestReport(Buffer.from(valid.replace("# Subtest: one", "# harmless Git warning\n# Subtest: one")), 1), { tests: 1, pass: 1, fail: 0 });
  for (const value of ["", valid.replace("ok 1", "not ok 1"), valid.replace("ok 1 - one", "ok 1 - one # SKIP"), valid.replace("1..1\n", ""), valid + "# tests 1\n", valid + "not ok 2 - hidden\n"]) {
    assert.throws(() => g.verifyTestReport(Buffer.from(value), 1), /PR293_TEST_REPORT/);
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
