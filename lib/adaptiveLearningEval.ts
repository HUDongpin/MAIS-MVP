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
  adaptiveMasteryConfirmationStreak,
  adaptiveMasteryThreshold,
  createInitialAdaptiveSkillState,
  isMasteryConfirmed,
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
      `Raw pMastery is aggressive: ${streakToMastery} consecutive correct answers from the prior cross the ` +
        `${adaptiveMasteryThreshold} threshold (params prior=0.35, learn=0.12, slip=0.1, guess=0.2 — a lucky ` +
        `streak alone reaches it). This is why mastery DECLARATION is gated on a confirmation streak, not the ` +
        `bare crossing: see isMasteryConfirmed and the mastery-confirmation table below. Owner review: A15/A16.`
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

// ---------------------------------------------------------------------------
// Mastery-confirmation gate: CI guard on the shipped `isMasteryConfirmed` rule.
//
// The rubric above shows a bare pMastery >= 0.85 crossing declares mastery
// aggressively (2 correct from the prior cross it), and re-tuning the BKT params
// barely helps — the leak is structural to first-passage on a noisy signal. The
// engine therefore also requires a confirming correct streak
// (`adaptiveMasteryConfirmationStreak`). This section measures that exact shipped
// predicate across streak sizes so the calibration tradeoff is guarded, not
// assumed. Everything is exact (enumeration over 2^N response sequences weighted
// by Bernoulli(trueP)) and deterministic, so the paired test asserts it.
// ---------------------------------------------------------------------------

const MASTERY_HORIZON = 12;

/** pMastery reading after each attempt in `sequence`, through the real engine. */
export function simulateEnginePMastery(sequence: boolean[]): number[] {
  let state = createInitialAdaptiveSkillState("mastery-probe", "2026-01-01T00:00:00.000Z");
  const readings: number[] = [];
  for (const correct of sequence) {
    state = updateAdaptiveState({ state, correct, now: "2026-01-01T00:00:00.000Z" });
    readings.push(state.pMastery);
  }
  return readings;
}

/**
 * First attempt (1-based) at which the engine's `isMasteryConfirmed` rule fires
 * for `responses` at a given `minStreak`, or null. minStreak=1 reproduces the
 * bare-threshold (current) rule, since first-passage always occurs on a streak
 * of at least 2. Runs the real engine so this is exactly the shipped predicate.
 */
export function masteryDeclaredAt(responses: boolean[], minStreak: number): number | null {
  let state = createInitialAdaptiveSkillState("mastery-probe", "2026-01-01T00:00:00.000Z");
  for (let i = 0; i < responses.length; i += 1) {
    state = updateAdaptiveState({ state, correct: responses[i], now: "2026-01-01T00:00:00.000Z" });
    if (isMasteryConfirmed(state, minStreak)) return i + 1;
  }
  return null;
}

export type MasteryPolicyRow = {
  trueP: number;
  /** P(declared mastered within the horizon) keyed by confirmation-streak size. */
  probByStreak: Record<number, number>;
};

export type SustainedMasteryReport = {
  threshold: number;
  confirmationStreak: number;
  horizon: number;
  streaks: number[];
  rows: MasteryPolicyRow[];
  /** Expected attempt at which a diligent (p=0.95) learner is declared, per streak. */
  diligentExpectedStep: Record<number, number | null>;
  checks: Array<{ id: string; description: string; passed: boolean; detail: string }>;
  recommendation: string;
};

// streak 1 == the bare-threshold current rule; 2 is a no-op (see the invariant
// check); 3 is what ships; 4 is shown to justify not going further.
const MASTERY_STREAKS = [1, 2, 3, 4];
const MASTERY_ABILITIES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 0.95];

/**
 * Measure the shipped `isMasteryConfirmed` gate across confirmation-streak sizes.
 * Precomputes each of the 2^horizon sequences once (declared-at per streak +
 * correct count), then weights by Bernoulli(trueP) per ability.
 */
export function runSustainedMasteryComparison(): SustainedMasteryReport {
  const horizon = MASTERY_HORIZON;
  const precomputed: { declaredAt: Record<number, number | null>; correctCount: number }[] = [];
  for (let mask = 0; mask < 1 << horizon; mask += 1) {
    const sequence: boolean[] = [];
    let correctCount = 0;
    for (let i = 0; i < horizon; i += 1) {
      const correct = ((mask >> i) & 1) === 1;
      sequence.push(correct);
      if (correct) correctCount += 1;
    }
    const declaredAt: Record<number, number | null> = {};
    for (const s of MASTERY_STREAKS) declaredAt[s] = masteryDeclaredAt(sequence, s);
    precomputed.push({ declaredAt, correctCount });
  }

  const weightOf = (trueP: number, correctCount: number) =>
    trueP ** correctCount * (1 - trueP) ** (horizon - correctCount);

  const rows: MasteryPolicyRow[] = MASTERY_ABILITIES.map((trueP) => {
    const probByStreak: Record<number, number> = {};
    for (const s of MASTERY_STREAKS) {
      let prob = 0;
      for (const seq of precomputed) if (seq.declaredAt[s] !== null) prob += weightOf(trueP, seq.correctCount);
      probByStreak[s] = prob;
    }
    return { trueP, probByStreak };
  });

  const diligentExpectedStep: Record<number, number | null> = {};
  for (const s of MASTERY_STREAKS) {
    let prob = 0;
    let weightedStep = 0;
    for (const seq of precomputed) {
      const at = seq.declaredAt[s];
      if (at !== null) {
        const weight = weightOf(0.95, seq.correctCount);
        prob += weight;
        weightedStep += weight * at;
      }
    }
    diligentExpectedStep[s] = prob > 0 ? weightedStep / prob : null;
  }

  const rowFor = (p: number) => rows.find((r) => r.trueP === p)!;
  const streak = adaptiveMasteryConfirmationStreak; // 3
  const current05 = rowFor(0.5).probByStreak[1];
  const gated05 = rowFor(0.5).probByStreak[streak];
  const gated085 = rowFor(0.85).probByStreak[streak];
  const gated095 = rowFor(0.95).probByStreak[streak];
  const noOpMaxDelta = Math.max(...rows.map((r) => Math.abs(r.probByStreak[2] - r.probByStreak[1])));

  const checks = [
    {
      id: "streak2-is-a-noop",
      description: "A streak-2 gate equals the current rule (proves the gate must be >= 3)",
      passed: noOpMaxDelta < 1e-9,
      detail: `max |streak2 - current| across abilities = ${noOpMaxDelta.toExponential(1)}`
    },
    {
      id: "confirmation-streak-cuts-false-mastery",
      description: `Confirmation streak ${streak} sharply lowers false mastery for a coin-flip non-master (p=0.5)`,
      passed: gated05 <= current05 - 0.2 && gated05 < 0.65,
      detail: `p=0.5: current=${(current05 * 100).toFixed(1)}% -> streak-${streak}=${(gated05 * 100).toFixed(1)}%`
    },
    {
      id: "confirmation-streak-keeps-true-mastery",
      description: `Confirmation streak ${streak} still recognizes genuine masters (p>=0.85) within the horizon`,
      passed: gated085 >= 0.99 && gated095 >= 0.999,
      detail: `p=0.85=${(gated085 * 100).toFixed(1)}%, p=0.95=${(gated095 * 100).toFixed(1)}%`
    },
    {
      id: "confirmation-streak-modest-time-cost",
      description: `Confirmation streak ${streak} adds only a modest delay for a diligent learner (p=0.95)`,
      passed: (diligentExpectedStep[streak] ?? Infinity) <= 6,
      detail: `E[step|mastered] current=${diligentExpectedStep[1]?.toFixed(1)} -> streak-${streak}=${diligentExpectedStep[streak]?.toFixed(1)}`
    }
  ];

  const recommendation =
    `Shipped gate: isMasteryConfirmed = pMastery >= ${adaptiveMasteryThreshold} AND correctStreak >= ${streak}. ` +
    `In this i.i.d. rubric it lowers coin-flip false mastery from ${(current05 * 100).toFixed(0)}% to ` +
    `${(gated05 * 100).toFixed(0)}% within ${horizon} attempts while keeping true masters (p>=0.85) at ` +
    `>=${(gated085 * 100).toFixed(0)}% and adding only ~${((diligentExpectedStep[streak] ?? 0) - (diligentExpectedStep[1] ?? 0)).toFixed(1)} ` +
    `attempts of delay for a diligent learner. The generative-BKT validation (~3x fewer premature declarations, ` +
    `genuine-master detection intact) is in the session notes.`;

  return {
    threshold: adaptiveMasteryThreshold,
    confirmationStreak: streak,
    horizon,
    streaks: MASTERY_STREAKS,
    rows,
    diligentExpectedStep,
    checks,
    recommendation
  };
}
