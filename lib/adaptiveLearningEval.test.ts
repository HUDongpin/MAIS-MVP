import assert from "node:assert/strict";
import test from "node:test";
import { adaptiveMasteryConfirmationStreak } from "./adaptiveLearning";
import {
  masteryDeclaredAt,
  runAdaptiveEval,
  runSustainedMasteryComparison,
  simulateTrajectory
} from "./adaptiveLearningEval";

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

test("masteryDeclaredAt fires only once the confirmation streak is met", () => {
  // All-correct: pMastery crosses 0.85 at attempt 2, so the bare rule (streak 1)
  // declares at 2; the shipped streak-3 gate waits for the 3rd consecutive correct.
  const allCorrect = [true, true, true, true];
  assert.equal(masteryDeclaredAt(allCorrect, 1), 2, "bare-threshold rule declares at attempt 2");
  assert.equal(masteryDeclaredAt(allCorrect, 3), 3, "streak-3 gate declares at the 3rd consecutive correct");

  // A wrong answer resets the streak (and drops pMastery), deferring mastery.
  const broken = [true, true, false, true, true, true];
  assert.equal(masteryDeclaredAt(broken, 1), 2, "bare rule still fires at the first crossing");
  assert.equal(masteryDeclaredAt(broken, 3), 6, "streak-3 must rebuild the streak after the wrong answer");
});

test("sustained-mastery comparison: every tradeoff check passes", () => {
  const report = runSustainedMasteryComparison();
  assert.equal(report.confirmationStreak, adaptiveMasteryConfirmationStreak);
  const failed = report.checks.filter((check) => !check.passed);
  assert.deepEqual(
    failed.map((check) => `${check.id}: ${check.detail}`),
    [],
    "sustained-mastery tradeoff checks should all hold"
  );
});

test("a longer confirmation streak never raises declared-mastery probability", () => {
  const report = runSustainedMasteryComparison();
  for (const row of report.rows) {
    for (let i = 1; i < report.streaks.length; i += 1) {
      const longer = report.streaks[i];
      const shorter = report.streaks[i - 1];
      assert.ok(
        row.probByStreak[longer] <= row.probByStreak[shorter] + 1e-9,
        `p=${row.trueP}: streak ${longer} should not exceed streak ${shorter}`
      );
    }
  }
});
