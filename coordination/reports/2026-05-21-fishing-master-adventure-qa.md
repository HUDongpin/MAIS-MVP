# Fishing Master Adventure QA Report

- Report date: 2026-05-21
- Generated at: 2026-05-21T04:49:06.467Z
- Session: S11 QA and release quality
- Scope: /practice/fishing-game, Fishing Master gameplay, reward API, runtime diagnostics
- Aggregate runs: 100/100
- Result: Failed - review findings below

## Summary

This adventure run executed 100 local isolated Fishing Master checks across desktop/mobile project slices. It uses temporary students and the isolated database only; no production users or live provider calls are touched.

## Category Results

| Category | Runs | Passed | Failed |
| --- | ---: | ---: | ---: |
| happy-path | 20 | 20 | 0 |
| locked-boundary | 15 | 15 | 0 |
| operation-exploration | 20 | 20 | 0 |
| api-adversarial | 15 | 15 | 0 |
| desktop-visual | 10 | 10 | 0 |
| network-resource | 5 | 3 | 2 |
| long-boundary | 5 | 5 | 0 |
| mobile | 10 | 10 | 0 |

## API Status Evidence

| Run | Category | Check | HTTP | Response status |
| --- | --- | --- | ---: | --- |
| happy-01 | happy-path | legal-completion | 201 | awarded |
| happy-02 | happy-path | legal-completion | 201 | awarded |
| happy-03 | happy-path | legal-completion | 201 | awarded |
| happy-04 | happy-path | legal-completion | 201 | awarded |
| happy-05 | happy-path | legal-completion | 201 | awarded |
| happy-06 | happy-path | legal-completion-fast | 201 | awarded |
| happy-07 | happy-path | legal-completion-fast | 201 | awarded |
| happy-08 | happy-path | legal-completion-fast | 201 | awarded |
| happy-09 | happy-path | legal-completion-fast | 201 | awarded |
| happy-10 | happy-path | legal-completion-fast | 201 | awarded |
| happy-11 | happy-path | legal-completion-fast | 201 | awarded |
| happy-12 | happy-path | legal-completion-fast | 201 | awarded |
| happy-13 | happy-path | legal-completion-fast | 201 | awarded |
| happy-14 | happy-path | legal-completion-fast | 201 | awarded |
| happy-15 | happy-path | legal-completion-fast | 201 | awarded |
| happy-16 | happy-path | legal-completion-fast | 201 | awarded |
| happy-17 | happy-path | legal-completion-fast | 201 | awarded |
| happy-18 | happy-path | legal-completion-fast | 201 | awarded |
| happy-19 | happy-path | legal-completion-fast | 201 | awarded |
| happy-20 | happy-path | legal-completion-fast | 201 | awarded |
| ops-06 | operation-exploration | operation-fast-rapid-click-fire | 201 | awarded |
| ops-07 | operation-exploration | operation-fast-keyboard-extreme-miss | 201 | awarded |
| ops-08 | operation-exploration | operation-fast-space-spam | 201 | awarded |
| ops-09 | operation-exploration | operation-fast-challenge-wait | 201 | awarded |
| ops-10 | operation-exploration | operation-fast-wrong-answer | 201 | awarded |
| ops-11 | operation-exploration | operation-fast-rapid-click-fire | 201 | awarded |
| ops-12 | operation-exploration | operation-fast-keyboard-extreme-miss | 201 | awarded |
| ops-13 | operation-exploration | operation-fast-space-spam | 201 | awarded |
| ops-14 | operation-exploration | operation-fast-challenge-wait | 201 | awarded |
| ops-15 | operation-exploration | operation-fast-wrong-answer | 201 | awarded |
| ops-16 | operation-exploration | operation-fast-rapid-click-fire | 201 | awarded |
| ops-17 | operation-exploration | operation-fast-keyboard-extreme-miss | 201 | awarded |
| ops-18 | operation-exploration | operation-fast-space-spam | 201 | awarded |
| ops-19 | operation-exploration | operation-fast-challenge-wait | 201 | awarded |
| ops-20 | operation-exploration | operation-fast-wrong-answer | 201 | awarded |
| api-01 | api-adversarial | first-legal | 201 | awarded |
| api-01 | api-adversarial | duplicate | 409 | duplicate |
| api-02 | api-adversarial | unauthenticated-post | 401 | Not authenticated. |
| api-03 | api-adversarial | coins-mismatch | 422 | invalid-run |
| api-04 | api-adversarial | correct-not-caught | 422 | invalid-run |
| api-05 | api-adversarial | caught-cross-topic | 422 | invalid-run |
| api-06 | api-adversarial | nets-overflow | 422 | invalid-run |
| api-07 | api-adversarial | coins-overflow | 422 | invalid-run |
| api-08 | api-adversarial | duration-overflow | 422 | invalid-run |
| api-09 | api-adversarial | duration-negative | 422 | invalid-run |
| api-10 | api-adversarial | missing-topic | 422 | invalid-run |
| api-11 | api-adversarial | four-round-ids | 422 | invalid-run |
| api-12 | api-adversarial | correct-round-not-in-round | 422 | invalid-run |
| api-13 | api-adversarial | unverified-round-correct | 422 | invalid-run |
| api-14 | api-adversarial | empty-round-key | 422 | invalid-run |
| api-15 | api-adversarial | caught-more-than-nets | 422 | invalid-run |
| boundary-02 | long-boundary | api-zero-coin-legal | 201 | awarded |
| boundary-03 | long-boundary | api-max-coin-legal | 201 | awarded |
| boundary-04 | long-boundary | api-duration-120-legal | 201 | awarded |

## Failures

| Run | Project | Category | Variant | Error |
| --- | --- | --- | --- | --- |
| network-04 | desktop-chrome | network-resource | completion-500 | Submit result button did not recover after forced 500 from `/api/gamification/fishing-game/complete`. Runtime evidence: `badresponse 500 POST /api/gamification/fishing-game/complete`; `pageerror: Cannot read properties of undefined (reading 'xp')`. |
| network-05 | desktop-chrome | network-resource | completion-retry | Retry path did not appear after first forced 500 from `/api/gamification/fishing-game/complete`. Runtime evidence: `badresponse 500 POST /api/gamification/fishing-game/complete`; `pageerror: Cannot read properties of undefined (reading 'xp')`. |

## Acceptance Criteria

- 100-run target: met.
- Fatal runtime errors: none found.
- Illegal API payloads: returned expected guarded statuses in covered runs.
- Canvas checks: nonblank in covered playable runs.
- Network completion recovery: failed in completion API failure/retry scenarios.

## Follow-up

S20 should review gameplay failures after S11 confirms they reproduce outside the stress harness. S12 should review reward/API failures. S01/S20 should review mobile immersive layout failures.
