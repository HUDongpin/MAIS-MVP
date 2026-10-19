import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  A23_COMMIT, A11_DECISION_SHA, A11_REPORT_SHA, A23_DECISION_SHA, A23_REPORT_SHA,
  REVIEWED_TOOLING, DECISION_RESULT, DECISION_SCOPE, preflight, verifyDecision
} from "./promotion-reviewed-code-pr283-e2.mjs";
import { BASE, PERMISSIONS, hash } from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (cwd, ...args) => execFileSync("/usr/bin/git", args, {
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

test("independent review bytes replace the pending reports and E2 is the head", () => {
  const head = git(root, "rev-parse", "HEAD");
  const eventPath = path.join(os.tmpdir(), `pr283-e2-event-${process.pid}.json`);
  writeFileSync(eventPath, JSON.stringify({ number: 283, pull_request: { base: { sha: BASE }, head: { sha: head } } }));
  const result = preflight({ repoRoot: root, eventName: "pull_request", eventPath });
  assert.equal(result.admissionCommit, head);
  assert.equal(result.admission.reviewedTooling, REVIEWED_TOOLING);
  assert.equal(hash(readFileSync(path.join(root, "coordination/integration/reviewed-code/pr283-e2/a11-review.md"))), A11_REPORT_SHA);
  assert.equal(hash(readFileSync(path.join(root, "coordination/integration/reviewed-code/pr283-e2/a11-review.json"))), A11_DECISION_SHA);
  assert.equal(hash(readFileSync(path.join(root, "coordination/integration/reviewed-code/pr283-e2/a23-review.md"))), A23_REPORT_SHA);
  assert.equal(hash(readFileSync(path.join(root, "coordination/integration/reviewed-code/pr283-e2/a23-review.json"))), A23_DECISION_SHA);
  const a23 = JSON.parse(readFileSync(path.join(root, "coordination/integration/reviewed-code/pr283-e2/a23-review.json"), "utf8"));
  assert.equal(a23.result, "approved-for-later-ordinary-code-admission");
  assert.equal(result.admission.permissions.ordinaryCodeEligible, false);
});

test("decision verification rejects eligibility, a live permission, and a changed scope", () => {
  const expected = { result: DECISION_RESULT, scope: DECISION_SCOPE, permissions: PERMISSIONS, decisionDigest: "fixed" };
  assert.doesNotThrow(() => verifyDecision(structuredClone(expected), expected));
  assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, ordinaryCodeEligible: true } }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, liveAllowed: true }, decisionDigest: "rehashed" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  assert.throws(() => verifyDecision({ ...expected, scope: "exact-pr270-pr271-ordinary-code-only" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
});
