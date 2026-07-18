# Adaptive engine evaluation — BKT core (2026-07-18)

- **Owner review:** A15 (adaptive engine), A16 (learning science)
- **Harness:** `lib/adaptiveLearningEval.ts` (+ `.test.ts` rubric gate), run via `npm run eval:adaptive`
- **Scope:** the Bayesian Knowledge Tracing core (`updateAdaptiveState`, `createInitialAdaptiveSkillState`). Deterministic, offline, no LLM.

## Why

Plan item P2-2: adaptive quality had no offline eval — it was assumed, not measured. This harness makes mastery calibration a **reproducible, CI-gateable** signal so the next content expansion doesn't rely on an unverified engine.

## Rubric (all passing)

| Check | Result |
|---|---|
| Diligent learner (p=0.95) reaches mastery within 12 attempts | ✓ (step 2, final pMastery 0.990) |
| Learner answering incorrectly throughout never reaches mastery (24 attempts) | ✓ (never; converges to pMastery ≈ 0.137) |
| One correct answer from the prior does not by itself declare mastery (streak ≥ 2) | ✓ (streak = 2) |
| From an identical state, a correct answer outranks a wrong answer | ✓ (0.990 > 0.830) |
| pMastery stays within [0, 1] and finite | ✓ |

## Finding (calibration — not a pass/fail, for A15/A16)

**Mastery is declared aggressively: 2 consecutive correct answers from the initial prior cross the 0.85 threshold.** A low-ability learner who gets a short lucky streak (e.g. two guesses right) can be marked "mastered" and advanced. Current parameters: `prior=0.35, learn=0.12, slip=0.1, guess=0.2, masteryThreshold=0.85`.

Levers to consider (A15 owns the decision):
- raise `adaptiveMasteryThreshold` (e.g. 0.9–0.95),
- require a longer correct streak before advancing (gate on `correctStreak`),
- lower `adaptiveLearnProbability`, or raise `adaptiveGuessProbability` to discount lucky guesses.

The harness will re-measure `streakToMastery` on any parameter change, so a tuning pass can be validated immediately (`npm run eval:adaptive`).

## Next (out of scope here)

- Extend to `selectDeterministicAdaptiveDecision` / `generateAdaptiveCandidates`: assert repair/prerequisite recommendations fire when mastery is low and advancement when high.
- Add an AI-tutor pedagogy eval (A07/A16) against the offline-fixture provider profile.
