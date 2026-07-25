/**
 * Per-skill BKT parameter fitting from real response data (plan item P2-2,
 * follow-on to the eval harness in `adaptiveLearningEval.ts`).
 *
 * The engine (`updateAdaptiveState`) ships GLOBAL constants — prior=0.35,
 * learn=0.12, slip=0.1, guess=0.2 — the same for every skill and student. That
 * is a reasonable production default, but it is not calibrated to MAIS's own
 * data, and the eval harness shows it declares mastery aggressively (2 correct
 * answers from the prior cross 0.85). This module fits {prior, learn, slip,
 * guess} PER SKILL by maximum likelihood over recorded attempts, so the engine
 * can be calibrated once the pilot generates responses.
 *
 * The forward likelihood mirrors the engine's own update semantics exactly
 * (Bayesian posterior on the observation, then the learn transition), so any
 * fitted params plug straight back into `updateAdaptiveState` with no
 * translation. This module is pure and deterministic — no randomness, no I/O —
 * so its paired `.test.ts` can assert parameter recovery in CI.
 */
import {
  adaptiveGuessProbability,
  adaptiveLearnProbability,
  adaptiveMasteryPrior,
  adaptiveSlipProbability
} from "./adaptiveLearning";

export type BktParams = {
  /** P(skill already known) before the first attempt. */
  prior: number;
  /** P(unknown -> known) transition applied after each attempt. */
  learn: number;
  /** P(wrong | known). */
  slip: number;
  /** P(correct | unknown). */
  guess: number;
};

/** One learner's ordered correct/wrong attempts on a single skill (oldest first). */
export type ResponseSequence = boolean[];

/** The engine's current global constants, used as the calibration fallback. */
export const globalDefaultBktParams: BktParams = {
  prior: adaptiveMasteryPrior,
  learn: adaptiveLearnProbability,
  slip: adaptiveSlipProbability,
  guess: adaptiveGuessProbability
};

/**
 * Standard BKT identifiability bounds. Capping slip and guess at 0.3 is the
 * classic Baker/Corbett constraint that stops the optimizer from inverting the
 * model's semantics (a "known" learner answering mostly wrong).
 */
export const bktParamBounds: Record<keyof BktParams, readonly [number, number]> = {
  prior: [0.01, 0.85],
  learn: [0.01, 0.5],
  slip: [0.01, 0.3],
  guess: [0.01, 0.3]
};

function clamp(value: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, value));
}

// --- Likelihood --------------------------------------------------------------

/**
 * P(observe correct) for a learner currently known with probability `pKnown`.
 * Exposed so callers can score calibration against real outcomes.
 */
export function predictCorrectProbability(pKnown: number, params: BktParams) {
  return pKnown * (1 - params.slip) + (1 - pKnown) * params.guess;
}

/** One BKT step: posterior on the observation, then the learn transition. */
function advance(pKnown: number, correct: boolean, params: BktParams) {
  const pCorrect = predictCorrectProbability(pKnown, params);
  const posterior = correct
    ? (pKnown * (1 - params.slip)) / Math.max(pCorrect, 1e-12)
    : (pKnown * params.slip) / Math.max(1 - pCorrect, 1e-12);
  return posterior + (1 - posterior) * params.learn;
}

/** Log-likelihood of one ordered attempt sequence under `params`. */
export function sequenceLogLikelihood(params: BktParams, sequence: ResponseSequence): number {
  let pKnown = params.prior;
  let logLik = 0;
  for (const correct of sequence) {
    const pCorrect = predictCorrectProbability(pKnown, params);
    const pObs = correct ? pCorrect : 1 - pCorrect;
    logLik += Math.log(Math.max(pObs, 1e-12));
    pKnown = advance(pKnown, correct, params);
  }
  return logLik;
}

export function datasetLogLikelihood(params: BktParams, sequences: ResponseSequence[]): number {
  let total = 0;
  for (const sequence of sequences) total += sequenceLogLikelihood(params, sequence);
  return total;
}

// --- Fitting -----------------------------------------------------------------

export type FitResult = {
  params: BktParams;
  logLikelihood: number;
  converged: boolean;
  sequenceCount: number;
  attemptCount: number;
};

/**
 * Fit BKT params by maximum likelihood: a coarse grid to find a good basin,
 * then coordinate ascent with a shrinking step. Deterministic — no PRNG — so
 * the same data always yields the same fit.
 */
export function fitBktParams(
  sequences: ResponseSequence[],
  options: { gridSteps?: number; maxRefineRounds?: number } = {}
): FitResult {
  const gridSteps = options.gridSteps ?? 6;
  const maxRefineRounds = options.maxRefineRounds ?? 60;
  const attemptCount = sequences.reduce((sum, seq) => sum + seq.length, 0);

  const axis = (lo: number, hi: number) =>
    Array.from({ length: gridSteps }, (_, i) => lo + ((hi - lo) * i) / (gridSteps - 1));

  let best: BktParams = { ...globalDefaultBktParams };
  let bestLL = datasetLogLikelihood(best, sequences);

  for (const prior of axis(...bktParamBounds.prior))
    for (const learn of axis(...bktParamBounds.learn))
      for (const slip of axis(...bktParamBounds.slip))
        for (const guess of axis(...bktParamBounds.guess)) {
          const candidate = { prior, learn, slip, guess };
          const ll = datasetLogLikelihood(candidate, sequences);
          if (ll > bestLL) {
            bestLL = ll;
            best = candidate;
          }
        }

  const keys: (keyof BktParams)[] = ["prior", "learn", "slip", "guess"];
  let step = 0.1;
  let converged = false;
  for (let round = 0; round < maxRefineRounds; round += 1) {
    let improved = false;
    for (const key of keys) {
      const [lo, hi] = bktParamBounds[key];
      for (const delta of [step, -step]) {
        const candidate = { ...best, [key]: clamp(best[key] + delta, lo, hi) };
        const ll = datasetLogLikelihood(candidate, sequences);
        if (ll > bestLL + 1e-9) {
          bestLL = ll;
          best = candidate;
          improved = true;
        }
      }
    }
    if (!improved) {
      step /= 2;
      if (step < 1e-4) {
        converged = true;
        break;
      }
    }
  }

  return { params: best, logLikelihood: bestLL, converged, sequenceCount: sequences.length, attemptCount };
}

// --- practice_attempts adapter ----------------------------------------------

/** The subset of a `practice_attempts` row this module needs. */
export type PracticeAttemptRow = {
  user_id: string;
  topic_id: string;
  is_correct: boolean;
  created_at: string;
};

/**
 * Group raw `practice_attempts` rows into per-skill response sequences: one
 * ordered correct/wrong list per (user, skill), oldest attempt first. The skill
 * key defaults to `topic_id` (the knowledge-component granularity the engine
 * tracks); pass `skillKeyOf` to fit a finer grain (e.g. `topic:stage`).
 */
export function groupAttemptsBySkill(
  rows: PracticeAttemptRow[],
  skillKeyOf: (row: PracticeAttemptRow) => string = (row) => row.topic_id
): Map<string, ResponseSequence[]> {
  // (skill -> user -> ordered attempts)
  const perSkillUser = new Map<string, Map<string, { at: number; correct: boolean }[]>>();
  for (const row of rows) {
    const skill = skillKeyOf(row);
    const at = new Date(row.created_at).getTime();
    if (!perSkillUser.has(skill)) perSkillUser.set(skill, new Map());
    const byUser = perSkillUser.get(skill)!;
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
    byUser.get(row.user_id)!.push({ at, correct: row.is_correct });
  }

  const result = new Map<string, ResponseSequence[]>();
  for (const [skill, byUser] of perSkillUser) {
    const sequences: ResponseSequence[] = [];
    for (const attempts of byUser.values()) {
      attempts.sort((a, b) => a.at - b.at);
      sequences.push(attempts.map((a) => a.correct));
    }
    result.set(skill, sequences);
  }
  return result;
}

export type SkillFit = FitResult & { skillId: string; usedFallback: boolean };

/**
 * Fit every skill that clears the data floor; skills below it keep the global
 * defaults (a thin sample can't out-estimate a sensible prior). The floor is
 * deliberately conservative — thin BKT fits are notoriously unstable.
 */
export function fitAllSkills(
  sequencesBySkill: Map<string, ResponseSequence[]>,
  options: { minSequences?: number; minAttempts?: number } = {}
): SkillFit[] {
  const minSequences = options.minSequences ?? 30;
  const minAttempts = options.minAttempts ?? 150;

  const fits: SkillFit[] = [];
  for (const [skillId, sequences] of sequencesBySkill) {
    const attemptCount = sequences.reduce((sum, seq) => sum + seq.length, 0);
    if (sequences.length < minSequences || attemptCount < minAttempts) {
      fits.push({
        skillId,
        params: { ...globalDefaultBktParams },
        logLikelihood: datasetLogLikelihood(globalDefaultBktParams, sequences),
        converged: true,
        sequenceCount: sequences.length,
        attemptCount,
        usedFallback: true
      });
      continue;
    }
    fits.push({ skillId, ...fitBktParams(sequences), usedFallback: false });
  }
  return fits.sort((a, b) => a.skillId.localeCompare(b.skillId));
}

// --- Fit quality -------------------------------------------------------------

export type FitQuality = {
  /** Mean per-attempt negative log-likelihood (lower is better). */
  meanNegLogLikelihood: number;
  /** Brier score of the predicted P(correct) against outcomes (lower is better). */
  brier: number;
  /** Accuracy of predicting "correct" when P(correct) > 0.5. */
  accuracy: number;
  attemptCount: number;
};

/**
 * Score how well `params` predict the next-attempt outcome across sequences —
 * the honest measure of a fit's usefulness. Run on held-out sequences for an
 * out-of-sample read.
 */
export function evaluateFitQuality(params: BktParams, sequences: ResponseSequence[]): FitQuality {
  let nll = 0;
  let brier = 0;
  let hits = 0;
  let n = 0;
  for (const sequence of sequences) {
    let pKnown = params.prior;
    for (const correct of sequence) {
      const pCorrect = predictCorrectProbability(pKnown, params);
      const pObs = correct ? pCorrect : 1 - pCorrect;
      nll += -Math.log(Math.max(pObs, 1e-12));
      brier += (pCorrect - (correct ? 1 : 0)) ** 2;
      if (pCorrect > 0.5 === correct) hits += 1;
      n += 1;
      pKnown = advance(pKnown, correct, params);
    }
  }
  return {
    meanNegLogLikelihood: n ? nll / n : 0,
    brier: n ? brier / n : 0,
    accuracy: n ? hits / n : 0,
    attemptCount: n
  };
}
