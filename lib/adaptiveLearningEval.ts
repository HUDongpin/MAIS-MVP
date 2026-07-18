/**
 * Offline, deterministic evaluation harness for the adaptive engine's BKT core
 * (`updateAdaptiveState`). Plan item P2-2: stand up an eval rubric so adaptive
 * quality is measured, not assumed, before content expansion leans on it.
 *
 * No randomness leaks into results: trajectories use a seeded PRNG (mulberry32),
 * so every metric is reproducible. This is a *measurement* harness — the paired
 * `.test.ts` asserts the rubric thresholds so regressions in the engine's
 * calibration fail CI.
 */
import {
  adaptiveMasteryThreshold,
  createInitialAdaptiveSkillState,
  updateAdaptiveState
} from "./adaptiveLearning";

type AdaptiveSkillState = ReturnType<typeof createInitialAdaptiveSkillState>;

/** Deterministic PRNG so trajectories are reproducible across runs/machines. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TrajectoryStep = { step: number; correct: boolean; pMastery: number };

export type TrajectoryResult = {
  finalState: AdaptiveSkillState;
  history: TrajectoryStep[];
  reachedMasteryAtStep: number | null;
  observedAccuracy: number;
};

/**
 * Simulate a learner whose latent ability produces a correct answer with
 * probability `trueMastery`, feeding each response through the real BKT update.
 */
export function simulateTrajectory({
  trueMastery,
  steps,
  seed
}: {
  trueMastery: number;
  steps: number;
  seed: number;
}): TrajectoryResult {
  const rand = mulberry32(seed);
  let state = createInitialAdaptiveSkillState("eval-skill", "2026-01-01T00:00:00.000Z");
  const history: TrajectoryStep[] = [];
  let reachedMasteryAtStep: number | null = null;
  let correctCount = 0;

  for (let i = 0; i < steps; i += 1) {
    const correct = rand() < trueMastery;
    if (correct) correctCount += 1;
    state = updateAdaptiveState({ state, correct, now: "2026-01-01T00:00:00.000Z" });
    history.push({ step: i + 1, correct, pMastery: state.pMastery });
    if (reachedMasteryAtStep === null && state.pMastery >= adaptiveMasteryThreshold) {
      reachedMasteryAtStep = i + 1;
    }
  }

  return {
    finalState: state,
    history,
    reachedMasteryAtStep,
    observedAccuracy: steps === 0 ? 0 : correctCount / steps
  };
}

export type AdaptiveEvalReport = {
  masteryThreshold: number;
  diligent: { trueMastery: number; steps: number; reachedMasteryAtStep: number | null; finalPMastery: number };
  persistentWrong: { steps: number; reachedMasteryAtStep: number | null; finalPMastery: number };
  monotonicity: { fromPMastery: number; correctPMastery: number; wrongPMastery: number; correctRaisesAboveWrong: boolean };
  streakToMastery: number | null;
  boundsRespected: boolean;
  checks: Array<{ id: string; description: string; passed: boolean; detail: string }>;
  findings: string[];
};

const DILIGENT_TRUE_MASTERY = 0.95;
const DILIGENT_MAX_STEPS_TO_MASTERY = 12;
const TRAJECTORY_STEPS = 24;

/** Smallest number of consecutive correct answers, from the initial prior, to cross mastery. */
function consecutiveCorrectStreakToMastery(maxSteps = 20): number | null {
  let state = createInitialAdaptiveSkillState("streak-probe", "2026-01-01T00:00:00.000Z");
  for (let i = 1; i <= maxSteps; i += 1) {
    state = updateAdaptiveState({ state, correct: true, now: "2026-01-01T00:00:00.000Z" });
    if (state.pMastery >= adaptiveMasteryThreshold) return i;
  }
  return null;
}

/**
 * Run the full rubric and return a structured report. Pure and deterministic.
 *
 * The checks assert invariants that MUST hold; `findings` records calibration
 * observations for A15/A16 that are not pass/fail (e.g. how aggressive the
 * mastery declaration is).
 */
export function runAdaptiveEval(): AdaptiveEvalReport {
  const diligent = simulateTrajectory({ trueMastery: DILIGENT_TRUE_MASTERY, steps: TRAJECTORY_STEPS, seed: 1 });
  // A learner who answers incorrectly throughout (trueMastery 0) — deterministic.
  const persistentWrong = simulateTrajectory({ trueMastery: 0, steps: TRAJECTORY_STEPS, seed: 2 });

  // Single-step monotonicity: from an identical mid state, a correct answer must
  // leave mastery strictly higher than a wrong answer would.
  const midState = simulateTrajectory({ trueMastery: 0.6, steps: 4, seed: 3 }).finalState;
  const afterCorrect = updateAdaptiveState({ state: midState, correct: true, now: "2026-01-01T00:00:00.000Z" });
  const afterWrong = updateAdaptiveState({ state: midState, correct: false, now: "2026-01-01T00:00:00.000Z" });

  const streakToMastery = consecutiveCorrectStreakToMastery();

  const allPMastery = [...diligent.history, ...persistentWrong.history].map((s) => s.pMastery);
  const boundsRespected = allPMastery.every((p) => p >= 0 && p <= 1 && Number.isFinite(p));

  const checks = [
    {
      id: "diligent-reaches-mastery",
      description: `A diligent learner (p=${DILIGENT_TRUE_MASTERY}) reaches mastery within ${DILIGENT_MAX_STEPS_TO_MASTERY} attempts`,
      passed: diligent.reachedMasteryAtStep !== null && diligent.reachedMasteryAtStep <= DILIGENT_MAX_STEPS_TO_MASTERY,
      detail: `reachedMasteryAtStep=${diligent.reachedMasteryAtStep}, finalPMastery=${diligent.finalState.pMastery.toFixed(3)}`
    },
    {
      id: "persistent-wrong-never-masters",
      description: `A learner who answers incorrectly throughout never reaches mastery (${TRAJECTORY_STEPS} attempts)`,
      passed: persistentWrong.reachedMasteryAtStep === null && persistentWrong.finalState.pMastery < adaptiveMasteryThreshold,
      detail: `reachedMasteryAtStep=${persistentWrong.reachedMasteryAtStep}, finalPMastery=${persistentWrong.finalState.pMastery.toFixed(3)}`
    },
    {
      id: "single-correct-not-instant-mastery",
      description: "One correct answer from the prior does not by itself declare mastery (streak >= 2)",
      passed: streakToMastery !== null && streakToMastery >= 2,
      detail: `consecutive correct answers to mastery = ${streakToMastery}`
    },
    {
      id: "correct-outranks-wrong",
      description: "From an identical state, a correct answer leaves mastery strictly above a wrong answer",
      passed: afterCorrect.pMastery > afterWrong.pMastery,
      detail: `correct=${afterCorrect.pMastery.toFixed(3)} vs wrong=${afterWrong.pMastery.toFixed(3)}`
    },
    {
      id: "probability-bounds",
      description: "pMastery stays within [0, 1] and finite across all trajectories",
      passed: boundsRespected,
      detail: `min=${Math.min(...allPMastery).toFixed(3)}, max=${Math.max(...allPMastery).toFixed(3)}`
    }
  ];

  const findings: string[] = [];
  if (streakToMastery !== null && streakToMastery <= 2) {
    findings.push(
      `Aggressive mastery: ${streakToMastery} consecutive correct answers from the prior cross the ` +
        `${adaptiveMasteryThreshold} threshold. A low-ability learner who gets a short lucky streak can be ` +
        `marked mastered. Consider a higher mastery threshold, a longer required streak, or a lower learn rate ` +
        `(current: prior=0.35, learn=0.12, slip=0.1, guess=0.2). Owner review: A15/A16.`
    );
  }

  return {
    masteryThreshold: adaptiveMasteryThreshold,
    diligent: {
      trueMastery: DILIGENT_TRUE_MASTERY,
      steps: TRAJECTORY_STEPS,
      reachedMasteryAtStep: diligent.reachedMasteryAtStep,
      finalPMastery: diligent.finalState.pMastery
    },
    persistentWrong: {
      steps: TRAJECTORY_STEPS,
      reachedMasteryAtStep: persistentWrong.reachedMasteryAtStep,
      finalPMastery: persistentWrong.finalState.pMastery
    },
    monotonicity: {
      fromPMastery: midState.pMastery,
      correctPMastery: afterCorrect.pMastery,
      wrongPMastery: afterWrong.pMastery,
      correctRaisesAboveWrong: afterCorrect.pMastery > afterWrong.pMastery
    },
    streakToMastery,
    boundsRespected,
    checks,
    findings
  };
}
