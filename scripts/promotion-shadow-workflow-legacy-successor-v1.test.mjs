import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import YAML from "yaml";
import { ACTIVATION_PATH, EXECUTION, STORAGE } from "./promotion-required-check-legacy-successor-v1.mjs";
import { assertRequiredWorkflowShape } from "./promotion-required-check-semantic-rescope.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = ".github/workflows/promotion-shadow.yml";
const current = YAML.parse(readFileSync(path.join(root, file), "utf8"));
const prior = YAML.parse(execFileSync("/usr/bin/git", ["show", `${STORAGE}:${file}`], { cwd: root, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } }).toString("utf8"));
const job = current.jobs["promotion-shadow-gate"];
const oldSteps = prior.jobs["promotion-shadow-gate"].steps;
const steps = job.steps;
const named = name => steps.find(s => s.name === name);

test("required job and old v2.6 workflow remain non-skippable and semantically unchanged", () => {
  assert.doesNotThrow(() => assertRequiredWorkflowShape(current));
  assert.equal(job.name, "promotion-shadow-gate");
  assert.equal(job["runs-on"], "ubuntu-latest");
  assert.equal(job["timeout-minutes"], prior.jobs["promotion-shadow-gate"]["timeout-minutes"]);
  assert.equal(steps.filter(s => s.name === "Select exact Promotion contract").length, 1);
  for (const old of oldSteps) {
    const successor = named(old.name);
    assert.ok(successor, `missing old step: ${old.name}`);
    for (const property of ["run", "uses", "with", "env", "id"]) {
      assert.deepEqual(successor[property], old[property], `old ${old.name} changed ${property}`);
    }
    if (["Check out repository", "Set up Node", "Install current dependencies from lockfile"].includes(old.name)) {
      assert.equal(successor.if, undefined);
    } else {
      assert.match(successor.if, /steps\.contract\.outputs\.mode == 'v2'/u);
      if (old.if?.includes("always()")) assert.match(successor.if, /always\(\)/u);
    }
  }
  assert.deepEqual(job.env, prior.jobs["promotion-shadow-gate"].env);
});

test("exact selector and new branch enforce the frozen storage ancestry and fresh native evidence", () => {
  const selector = named("Select exact Promotion contract");
  assert.ok(selector.run.includes("promotion-required-check-legacy-successor-v1.mjs select"));
  assert.ok(selector.run.includes("$GITHUB_EVENT_PATH"));
  assert.ok(selector.run.includes("$GITHUB_OUTPUT"));
  for (const name of ["Preflight legacy successor current head", "Test legacy successor and preserved Promotion contracts", "Prepare frozen legacy successor execution", "Evaluate legacy successor required check"]) {
    assert.equal(named(name).if, "${{ steps.contract.outputs.mode == 'successor' }}");
  }
  assert.match(named("Prepare frozen legacy successor execution").run, new RegExp(EXECUTION, "u"));
  assert.match(named("Test legacy successor and preserved Promotion contracts").run, /npm run test:promotion-gate/u);
  assert.match(named("Test legacy successor and preserved Promotion contracts").run, /promotion-required-check-legacy-successor-v1\.test\.mjs/u);
  assert.match(named("Test legacy successor and preserved Promotion contracts").run, /correction-audit-alias\.test\.mjs/u);
  assert.match(named("Prepare frozen legacy successor execution").run, /npm ci --ignore-scripts/u);
  assert.match(named("Evaluate legacy successor required check").run, /--run-id "ci-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}"/u);
  assert.equal(named("Enforce legacy successor required check").if, "${{ always() && steps.contract.outputs.mode == 'successor' }}");
  assert.match(named("Enforce legacy successor required check").run, /promote|successor/u);
  assert.match(readFileSync(path.join(root, "scripts/promotion-required-check-legacy-successor-v1.mjs"), "utf8"), new RegExp(ACTIVATION_PATH, "u"));
  assert.equal(job.if, undefined);
  assert.equal(current.on.workflow_dispatch, undefined);
  assert.equal(current.on.pull_request?.paths, undefined);
});
