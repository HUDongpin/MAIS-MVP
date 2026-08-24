import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { determineDecision, determineLifecycleStatus, validateArtifacts, wilsonInterval, zeroMissRequiredN } from "./validate-design-registration.mjs";

test("thresholds and decision precedence are frozen before provider execution", async () => {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  const power = JSON.parse(await readFile(new URL("./statistical-power.json", import.meta.url), "utf8"));
  const result = await validateArtifacts({ registration, power, schemas: [], providerEvents: [] });

  assert.equal(registration.analysis.thresholds.surfaceSensitivityOneSidedWilsonLcb95AtLeast, 0.9);
  assert.equal(registration.analysis.thresholds.specificityOneSidedWilsonLcb95AtLeast, 0.95);
  assert.equal(registration.providerControls.firstProviderExecutionAllowed, false);
  assert.equal(result.providerEventCount, 0);
  assert.equal(determineLifecycleStatus({ authorized: false }), "AUTHORIZATION_BLOCKED");
  assert.equal(determineLifecycleStatus({ authorized: true }), "READY_FOR_REGISTERED_EXECUTION");
  const base = { invalidForGeneralization: false, executionIntegrityFailed: false, p0FalseNegatives: 0, minimumEndpoints: [], maximumErrorEndpoints: [] };
  assert.equal(determineDecision({ ...base, invalidForGeneralization: true }), "INVALID_FOR_GENERALIZATION");
  assert.equal(determineDecision({ ...base, executionIntegrityFailed: true }), "EXECUTION_INTEGRITY_FAILED");
  assert.equal(determineDecision({ ...base, p0FalseNegatives: 1 }), "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
  assert.equal(determineDecision({ ...base, minimumEndpoints: [{ threshold: 0.9, oneSidedUcb95: 0.89 }] }), "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
  assert.equal(determineDecision({ ...base, maximumErrorEndpoints: [{ threshold: 0.1, oneSidedLcb95: 0.11 }] }), "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
  assert.equal(determineDecision(base), "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.notEqual(determineDecision(base), "LIMITED_GENERALIZATION_EVIDENCE");
});

test("Wilson and P0 calculations reproduce the machine-readable evidence", () => {
  const interval = wilsonInterval(60, 30, 1.959963984540054);
  assert.ok(Math.abs(interval.lower - 0.3773502424155577) < 1e-12);
  assert.ok(Math.abs(interval.upper - 0.6226497575844423) < 1e-12);
  assert.equal(zeroMissRequiredN(0.05), 59);
  assert.equal(zeroMissRequiredN(0.02), 149);
  assert.equal(zeroMissRequiredN(0.01), 299);
});

test("hash drift is a hard validation failure", async () => {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  const power = JSON.parse(await readFile(new URL("./statistical-power.json", import.meta.url), "utf8"));
  registration.scope.targetClusterCount = 61;
  const result = await validateArtifacts({ registration, power, schemas: [], providerEvents: [] });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.includes("registrationHash")), true);
});

test("every frozen statistical-power field is drift protected", async (context) => {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  const original = JSON.parse(await readFile(new URL("./statistical-power.json", import.meta.url), "utf8"));
  const mutations = {
    "registration binding": (power) => { power.designRegistrationHash = "0".repeat(64); },
    "CA60 n": (power) => { power.ca60WorstCasePrecision.n = 59; },
    "CA60 assumed proportion": (power) => { power.ca60WorstCasePrecision.assumedProportion = 0.4; },
    "CA60 method": (power) => { power.ca60WorstCasePrecision.method = "OTHER"; },
    "CA60 lower": (power) => { power.ca60WorstCasePrecision.lower += 0.001; },
    "CA60 upper": (power) => { power.ca60WorstCasePrecision.upper -= 0.001; },
    "CA60 half-width": (power) => { power.ca60WorstCasePrecision.halfWidth += 0.001; },
    "normal planning calculation": (power) => { power.planningScale.worstCaseNormalApproximationNForFivePercentagePointHalfWidth += 1; },
    "planning recommendation": (power) => { power.planningScale.recommendedIndependentClusters = 399; },
    "planning note": (power) => { power.planningScale.note = "drift"; },
    "P0 first target": (power) => { power.zeroMissOpportunity[0].targetMissRate = 0.06; },
    "P0 second required n": (power) => { power.zeroMissOpportunity[1].requiredN = 150; },
    "P0 third tail": (power) => { power.zeroMissOpportunity[2].zeroMissTailProbabilityAtRequiredN = 0.1; },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    await context.test(name, async () => {
      const power = structuredClone(original);
      mutate(power);
      const result = await validateArtifacts({ registration, power, schemas: [], providerEvents: [] });
      assert.equal(result.ok, false);
      assert.equal(result.errors.some((error) => error.includes("power")), true);
    });
  }
});

test("zero-network CLI validates in memory and emits JSON without output files", () => {
  const script = new URL("./validate-design-registration.mjs", import.meta.url);
  const source = spawnSync(process.execPath, [script.pathname, "--json"], { encoding: "utf8" });
  assert.equal(source.status, 0, source.stderr);
  const report = JSON.parse(source.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.schemaCount, 9);
  assert.equal(report.providerEventCount, 0);
  const implementation = spawnSync(process.execPath, ["-e", `process.stdout.write(require('fs').readFileSync(${JSON.stringify(script.pathname)}, 'utf8'))`], { encoding: "utf8" }).stdout;
  assert.doesNotMatch(implementation, /\bfetch\s*\(|node:https|node:http|undici|axios/u);
});
