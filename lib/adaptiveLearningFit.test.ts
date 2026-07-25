import assert from "node:assert/strict";
import test from "node:test";
import {
  type BktParams,
  type ResponseSequence,
  datasetLogLikelihood,
  evaluateFitQuality,
  fitAllSkills,
  fitBktParams,
  globalDefaultBktParams,
  groupAttemptsBySkill,
  sequenceLogLikelihood
} from "./adaptiveLearningFit";

/** Deterministic PRNG so the recovery test is reproducible across machines. */
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

/** Simulate one learner under the TRUE BKT generative HMM (ground truth). */
function simulateLearner(p: BktParams, steps: number, rand: () => number): ResponseSequence {
  let known = rand() < p.prior;
  const sequence: ResponseSequence = [];
  for (let i = 0; i < steps; i += 1) {
    const pCorrect = known ? 1 - p.slip : p.guess;
    sequence.push(rand() < pCorrect);
    if (!known && rand() < p.learn) known = true; // transition after emitting
  }
  return sequence;
}

function makeDataset(p: BktParams, learners: number, steps: number, seed: number): ResponseSequence[] {
  const rand = mulberry32(seed);
  return Array.from({ length: learners }, () => simulateLearner(p, steps, rand));
}

test("BKT fitter recovers known ground-truth parameters from generated data", () => {
  // slip/guess/learn drive the update dynamics and are well-identified; the
  // prior only informs each sequence's first attempt, so it carries more
  // single-sample variance and gets a realistically looser tolerance.
  const tolerance: Record<keyof BktParams, number> = { prior: 0.1, learn: 0.05, slip: 0.05, guess: 0.05 };
  const groundTruths: BktParams[] = [
    { prior: 0.35, learn: 0.12, slip: 0.1, guess: 0.2 }, // current global defaults
    { prior: 0.15, learn: 0.08, slip: 0.08, guess: 0.15 }, // hard skill
    { prior: 0.55, learn: 0.25, slip: 0.05, guess: 0.25 }, // easy, fast-learned skill
    { prior: 0.25, learn: 0.15, slip: 0.12, guess: 0.28 } // guess-heavy MC skill
  ];

  for (const truth of groundTruths) {
    const data = makeDataset(truth, 400, 15, 12345);
    const { params } = fitBktParams(data);
    for (const key of Object.keys(tolerance) as (keyof BktParams)[]) {
      assert.ok(
        Math.abs(params[key] - truth[key]) <= tolerance[key],
        `recovered ${key}=${params[key].toFixed(3)} within ${tolerance[key]} of ${truth[key]} ` +
          `(truth ${JSON.stringify(truth)})`
      );
    }
  }
});

test("fit at least matches the global-default likelihood (MLE never loses to the fallback)", () => {
  const truth: BktParams = { prior: 0.25, learn: 0.15, slip: 0.12, guess: 0.28 };
  const data = makeDataset(truth, 300, 15, 777);
  const { logLikelihood } = fitBktParams(data);
  assert.ok(
    logLikelihood >= datasetLogLikelihood(globalDefaultBktParams, data) - 1e-6,
    "fitted LL should be >= global-default LL"
  );
});

test("fitting is deterministic — same data yields the same params", () => {
  const data = makeDataset({ prior: 0.3, learn: 0.1, slip: 0.1, guess: 0.2 }, 200, 12, 42);
  const a = fitBktParams(data);
  const b = fitBktParams(data);
  assert.deepEqual(a.params, b.params);
  assert.equal(a.logLikelihood, b.logLikelihood);
});

test("sequenceLogLikelihood is negative and finite for a mixed sequence", () => {
  const ll = sequenceLogLikelihood(globalDefaultBktParams, [true, false, true, true, false]);
  assert.ok(Number.isFinite(ll) && ll < 0);
});

test("groupAttemptsBySkill orders by created_at and splits by (user, skill)", () => {
  const rows = [
    { user_id: "u1", topic_id: "frac", is_correct: false, created_at: "2026-01-02T00:00:00Z" },
    { user_id: "u1", topic_id: "frac", is_correct: true, created_at: "2026-01-01T00:00:00Z" }, // earlier
    { user_id: "u2", topic_id: "frac", is_correct: true, created_at: "2026-01-01T00:00:00Z" },
    { user_id: "u1", topic_id: "geom", is_correct: false, created_at: "2026-01-01T00:00:00Z" }
  ];
  const grouped = groupAttemptsBySkill(rows);
  assert.deepEqual(grouped.get("frac"), [[true, false], [true]]); // u1 reordered oldest-first, then u2
  assert.deepEqual(grouped.get("geom"), [[false]]);
});

test("fitAllSkills keeps global defaults for skills below the data floor", () => {
  const thin = new Map<string, ResponseSequence[]>([["sparse-skill", [[true], [false], [true]]]]);
  const [fit] = fitAllSkills(thin);
  assert.equal(fit.usedFallback, true);
  assert.deepEqual(fit.params, globalDefaultBktParams);
});

test("evaluateFitQuality reports better calibration for the true params than a bad guess", () => {
  const truth: BktParams = { prior: 0.3, learn: 0.15, slip: 0.1, guess: 0.2 };
  const data = makeDataset(truth, 300, 15, 2024);
  const good = evaluateFitQuality(truth, data);
  const bad = evaluateFitQuality({ prior: 0.8, learn: 0.01, slip: 0.3, guess: 0.01 }, data);
  assert.ok(good.brier < bad.brier, "true params should have lower Brier than a bad guess");
  assert.ok(good.meanNegLogLikelihood < bad.meanNegLogLikelihood, "true params should have lower NLL");
  assert.equal(good.attemptCount, 300 * 15);
});
