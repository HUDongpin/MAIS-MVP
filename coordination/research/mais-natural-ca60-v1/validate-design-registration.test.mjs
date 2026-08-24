import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { determineDecision, validateArtifacts, wilsonInterval, zeroMissRequiredN } from "./validate-design-registration.mjs";

test("thresholds and decision precedence are frozen before provider execution", async () => {
  const registration = JSON.parse(await readFile(new URL("./design-registration.json", import.meta.url), "utf8"));
  const power = JSON.parse(await readFile(new URL("./statistical-power.json", import.meta.url), "utf8"));
  const result = await validateArtifacts({ registration, power, schemas: [], providerEvents: [] });

  assert.equal(registration.analysis.thresholds.sensitivityLowerBoundAtLeast, 0.9);
  assert.equal(registration.analysis.thresholds.specificityLowerBoundAtLeast, 0.95);
  assert.equal(registration.providerControls.firstProviderExecutionAllowed, false);
  assert.equal(result.providerEventCount, 0);
  assert.equal(determineDecision({ registrationValid: false, authorized: false, unresolvedN: 1, positiveN: 0, negativeN: 0 }), "INVALID_REGISTRATION");
  assert.equal(determineDecision({ registrationValid: true, authorized: false, unresolvedN: 1, positiveN: 0, negativeN: 0 }), "BLOCKED_AUTHORIZATION");
  assert.equal(determineDecision({ registrationValid: true, authorized: true, unresolvedN: 1, positiveN: 20, negativeN: 39 }), "INCONCLUSIVE_UNRESOLVED");
  assert.equal(determineDecision({ registrationValid: true, authorized: true, unresolvedN: 0, positiveN: 24, negativeN: 36 }), "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(determineDecision({ registrationValid: true, authorized: true, unresolvedN: 0, positiveN: 25, negativeN: 52 }), "INVALID_REGISTRATION");
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
