import assert from "node:assert/strict";
import test from "node:test";
import { runAdaptiveEval, simulateTrajectory } from "./adaptiveLearningEval";

test("adaptive eval rubric: every calibration check passes", () => {
  const report = runAdaptiveEval();
  const failed = report.checks.filter((check) => !check.passed);
  assert.deepEqual(
    failed.map((check) => `${check.id}: ${check.detail}`),
    [],
    "all adaptive calibration checks should pass"
  );
});

test("adaptive eval is deterministic across runs", () => {
  const a = runAdaptiveEval();
  const b = runAdaptiveEval();
  assert.equal(a.diligent.reachedMasteryAtStep, b.diligent.reachedMasteryAtStep);
  assert.equal(a.persistentWrong.finalPMastery, b.persistentWrong.finalPMastery);
  assert.equal(a.streakToMastery, b.streakToMastery);
});

test("simulateTrajectory keeps pMastery in [0,1] and counts accuracy", () => {
  const result = simulateTrajectory({ trueMastery: 0.5, steps: 20, seed: 7 });
  assert.equal(result.history.length, 20);
  for (const step of result.history) {
    assert.ok(step.pMastery >= 0 && step.pMastery <= 1, `pMastery in range at step ${step.step}`);
  }
  assert.ok(result.observedAccuracy >= 0 && result.observedAccuracy <= 1);
});
