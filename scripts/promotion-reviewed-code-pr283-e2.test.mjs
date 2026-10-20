import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  ADMISSION, DIRECTORY, V1, A23_COMMIT, A11_DECISION_SHA, A11_REPORT_SHA, A23_DECISION_SHA, A23_REPORT_SHA,
  REVIEWED_TOOLING, DECISION_RESULT, DECISION_SCOPE, preflight, verifyDecision
} from "./promotion-reviewed-code-pr283-e2.mjs";
import { BASE, SOURCE, PERMISSIONS, hash, assertMaterializedTree } from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], {
  cwd, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" }, maxBuffer: 64 * 1024 * 1024
}).toString("utf8").trim();

test("selector runs E2 before the pending package and preserves every older step", () => {
  const current = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const before = YAML.parse(git(root, "show", `${A23_COMMIT}:.github/workflows/promotion-shadow.yml`));
  const job = current.jobs["promotion-shadow-gate"], previous = before.jobs["promotion-shadow-gate"];
  assert.equal(job.name, previous.name); assert.equal(job.if, undefined); assert.deepEqual(current.on, before.on);
  assert.deepEqual(job.permissions, previous.permissions); assert.deepEqual(job.env, previous.env);
  for (const step of previous.steps.filter(item => item.id !== "contract")) assert.deepEqual(job.steps.find(item => item.name === step.name), step);
  const select = job.steps.find(item => item.id === "contract").run;
  assert.ok(select.indexOf("pr283-e2/admission.json") < select.indexOf("pr282-pr281-pr280-v1/admission.json"));
  assert.match(select, /set -euo pipefail/);
  assert.doesNotMatch(select, /\|\|\s*(true|mode=)/);
  assert.match(select, /reviewed-code-pr283-e2/);
  const named = name => job.steps.find(item => item.name === name);
  assert.equal(named("Enforce PR283 E2 reviewed-code required check").if, "${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr283-e2' }}");
  assert.match(named("Enforce PR283 E2 reviewed-code required check").run, /promotion-reviewed-code-pr283-e2\.mjs verify/);
  assert.match(named("Enforce PR282/PR281/PR280 reviewed-code required check").run, /promotion-reviewed-code-pr282-pr281-pr280\.mjs verify/);
  for (const step of job.steps) assert.equal(step["continue-on-error"], undefined);
});

// These pinned commits reproduce both sides of PR #283 without assuming that
// the checkout running the tests is itself the historical evidence commit.
const EVIDENCE = "9d789219a59625d5f7ff43a69205aec954f9518a";
const MERGE = "f573ac62c97cb0716054bc516f7d5136491ca002";
const write = (repo, file, bytes) => {
  mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  writeFileSync(path.join(repo, file), bytes);
};
const prEvent = head => ({ number: 283, pull_request: { base: { sha: BASE }, head: { sha: head } } });
const pushEvent = head => ({ ref: "refs/heads/main", before: BASE, after: head });

// Metadata preflight uses real, complete Git trees/history and unchanged review
// bytes. Only files read from disk are materialized. This is not a runtime check
// or Shadow acceptance; the full-tree execution guard must reject this fixture.
// Alternates are read-only: synthetic objects, refs and index stay in this repo.
function fixture(ref, run) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr283-e2-gate-test-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic Gate Fixture");
    git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false");
    git(repo, "config", "core.hooksPath", "/dev/null");
    const common = git(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
    write(repo, ".git/objects/info/alternates", path.join(common, "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", `/${DIRECTORY}/\n`);
    git(repo, "checkout", "--detach", "-q", ref);
    const eventPath = path.join(temporary, "event.json");
    const check = (eventName = "push", event = pushEvent(git(repo, "rev-parse", "HEAD"))) => {
      writeFileSync(eventPath, JSON.stringify(event));
      return preflight({ repoRoot: repo, eventName, eventPath });
    };
    const commit = (...files) => {
      git(repo, "add", "--sparse", "--", ...files);
      git(repo, "commit", "-q", "-m", "Synthetic negative regression fixture; not acceptance");
    };
    run({ repo, check, commit });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

function assertBoundReviews(repo, result) {
  assert.equal(result.admissionCommit, EVIDENCE);
  assert.equal(result.admission.reviewedTooling, REVIEWED_TOOLING);
  for (const [file, expected] of [
    ["a11-review.md", A11_REPORT_SHA], ["a11-review.json", A11_DECISION_SHA],
    ["a23-review.md", A23_REPORT_SHA], ["a23-review.json", A23_DECISION_SHA]
  ]) assert.equal(hash(readFileSync(path.join(repo, DIRECTORY, file))), expected);
  const a23 = JSON.parse(readFileSync(path.join(repo, DIRECTORY, "a23-review.json"), "utf8"));
  assert.equal(a23.result, "approved-for-later-ordinary-code-admission");
  assert.deepEqual(result.admission.permissions, PERMISSIONS);
  for (const value of Object.values(result.admission.permissions)) assert.equal(value, false);
}

test("real PR283 head binds independent review bytes to E2", () => fixture(EVIDENCE, ({ repo, check }) => {
  const result = check("pull_request", prEvent(EVIDENCE));
  assert.equal(result.head, EVIDENCE);
  assert.deepEqual(result.event, { eventName: "pull_request", pullRequestNumber: 283, baseCommit: BASE, headCommit: EVIDENCE });
  assertBoundReviews(repo, result);
}));

test("real main merge retains E2 ancestry and tree without requiring equal commit IDs", () => fixture(MERGE, ({ repo, check }) => {
  assert.notEqual(MERGE, EVIDENCE);
  assert.deepEqual(git(repo, "show", "-s", "--format=%P", MERGE).split(" "), [BASE, EVIDENCE]);
  git(repo, "merge-base", "--is-ancestor", EVIDENCE, MERGE);
  assert.equal(git(repo, "rev-parse", `${MERGE}^{tree}`), git(repo, "rev-parse", `${EVIDENCE}^{tree}`));
  const result = check();
  assert.equal(result.head, MERGE);
  assert.deepEqual(result.event, { eventName: "push", pullRequestNumber: null, baseCommit: BASE, headCommit: MERGE });
  assertBoundReviews(repo, result);
}));

for (const [label, eventName, event, code] of [
  ["wrong PR number", "pull_request", { ...prEvent(MERGE), number: 282 }, "REVIEWED_CODE_PR_BASE"],
  ["wrong PR base", "pull_request", { ...prEvent(MERGE), pull_request: { base: { sha: EVIDENCE }, head: { sha: MERGE } } }, "REVIEWED_CODE_PR_BASE"],
  ["stale PR event head", "pull_request", prEvent(EVIDENCE), "REVIEWED_CODE_EVENT_HEAD"],
  ["stale push event head", "push", pushEvent(EVIDENCE), "REVIEWED_CODE_EVENT_HEAD"],
  ["push to another ref", "push", { ...pushEvent(MERGE), ref: "refs/heads/fixture" }, "REVIEWED_CODE_PUSH_BASE"],
  ["push from a changed tree", "push", { ...pushEvent(MERGE), before: REVIEWED_TOOLING }, "REVIEWED_CODE_PUSH_BASE"]
]) test(`real Git preflight rejects ${label}`, () => fixture(MERGE, ({ check }) => {
  assert.throws(() => check(eventName, event), { code });
}));

test("same-tree orphan cannot substitute for the real evidence ancestry", () => fixture(MERGE, ({ repo, check }) => {
  const orphan = git(repo, "commit-tree", `${EVIDENCE}^{tree}`, "-m", "Synthetic same-tree orphan; not acceptance");
  git(repo, "checkout", "--detach", "-q", orphan);
  assert.equal(git(repo, "rev-parse", "HEAD^{tree}"), git(repo, "rev-parse", `${EVIDENCE}^{tree}`));
  assert.throws(() => git(repo, "merge-base", "--is-ancestor", EVIDENCE, orphan), { status: 1 });
  assert.throws(check, error => error.status === 1 && error.message.includes(`merge-base --is-ancestor ${SOURCE} ${orphan}`));
}));

for (const file of ["lib/server/demoSeedBackfill.ts", "public/pr283-unreviewed-candidate.json"]) {
  test(`a committed successor change to ${file} fails full-tree binding`, () => fixture(MERGE, ({ repo, check, commit }) => {
    const original = file.endsWith(".ts") ? git(repo, "show", `${MERGE}:${file}`) : "{}";
    write(repo, file, original + "\n "); commit(file);
    git(repo, "merge-base", "--is-ancestor", EVIDENCE, "HEAD");
    assert.throws(check, { code: "REVIEWED_CODE_COMPOSITION" });
  }));
}

for (const [file, code] of [
  [`${DIRECTORY}/a11-review.md`, "REVIEWED_CODE_A11_BYTES"],
  [`${DIRECTORY}/a11-review.json`, "REVIEWED_CODE_A11_BYTES"],
  [`${DIRECTORY}/a23-review.md`, "REVIEWED_CODE_A23_BYTES"],
  [`${DIRECTORY}/a23-review.json`, "REVIEWED_CODE_A23_BYTES"],
  [`${V1}/a11-review.md`, "REVIEWED_CODE_V1_REPLACEMENT"],
  [`${DIRECTORY}/source-observation.json`, "REVIEWED_CODE_OBSERVATION_BINDING"],
  [`${DIRECTORY}/source-checks.json`, "REVIEWED_CODE_CHECKS_BINDING"]
]) test(`committed tampering of ${file} fails evidence binding`, () => fixture(MERGE, ({ repo, check, commit }) => {
  write(repo, file, git(repo, "show", `${MERGE}:${file}`) + "\n\n"); commit(file);
  assert.throws(check, { code });
}));

for (const permission of ["ordinaryCodeEligible", "liveAllowed"]) {
  test(`committed admission cannot grant ${permission}`, () => fixture(MERGE, ({ repo, check, commit }) => {
    const admission = JSON.parse(readFileSync(path.join(repo, ADMISSION), "utf8"));
    admission.permissions[permission] = true;
    write(repo, ADMISSION, JSON.stringify(admission) + "\n"); commit(ADMISSION);
    assert.throws(check, { code: "REVIEWED_CODE_PERMISSION" });
  }));
}

test("removing and readding identical admission bytes cannot reset evidence history", () => fixture(MERGE, ({ repo, check, commit }) => {
  const bytes = readFileSync(path.join(repo, ADMISSION));
  rmSync(path.join(repo, ADMISSION)); commit(ADMISSION);
  write(repo, ADMISSION, bytes); commit(ADMISSION);
  assert.equal(git(repo, "rev-parse", "HEAD^{tree}"), git(repo, "rev-parse", `${EVIDENCE}^{tree}`));
  assert.throws(check, { code: "REVIEWED_CODE_ADMISSION_HISTORY" });
}));

test("uncommitted evidence drift cannot use clean historical bytes", () => fixture(MERGE, ({ repo, check }) => {
  write(repo, `${DIRECTORY}/a11-review.md`, "Synthetic uncommitted change\n");
  assert.throws(check, { code: "REVIEWED_CODE_DIRTY" });
}));

test("passing metadata fixture remains ineligible for full runtime execution", () => fixture(MERGE, ({ repo, check }) => {
  assert.equal(check().admissionCommit, EVIDENCE);
  assert.throws(() => assertMaterializedTree(repo, MERGE), { code: "REVIEWED_CODE_INDEX_FLAGS" });
}));

test("decision verification rejects eligibility, a live permission, and a changed scope", () => {
  const expected = { result: DECISION_RESULT, scope: DECISION_SCOPE, permissions: PERMISSIONS, decisionDigest: "fixed" };
  assert.doesNotThrow(() => verifyDecision(structuredClone(expected), expected));
  assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, ordinaryCodeEligible: true } }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, liveAllowed: true }, decisionDigest: "rehashed" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  assert.throws(() => verifyDecision({ ...expected, scope: "exact-pr270-pr271-ordinary-code-only" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
});
