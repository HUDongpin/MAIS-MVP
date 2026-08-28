# RSI-Lite v2 Case Study

Status: **dated, descriptive, and non-normative**. This record preserves one synthetic calibration's observed metrics and deviations. It is not current policy, a natural-sample estimate, a content acceptance, or a release receipt. Reverify exact source artifacts before using any identity or currentness claim.

## Recorded Scope

- Protocol label: `MAIS-RSI-LITE-CAL-V2`
- Recorded protocol version: `2.0.0-candidate`
- Recorded source baseline prefix: `b6c7c347`
- The calibration implementation was recorded as untracked relative to that baseline; therefore the source commit alone did not identify executed code. A separate code manifest was required.
- Evidence class: `synthetic-calibration`
- 24 independent clusters
- 72 packages
- 7,200 synthetic questions
- 144 lessons
- 108 injected synthetic latent-defect surfaces
- 324 matched defect instances

The `108` count is synthetic defect surfaces, not “bad questions” in the natural MAIS bank. Detection counts across arms must not be summed into unique natural defects.

## Recorded Call Accounting

- 168 core successful calls
- 21 repeat successful calls
- 189 successful calls total
- 192 attempts total
- 3 failed or lost attempts

Successful calls, enforcement-ledger attempts, and provider invoice/balance are distinct quantities.

## Recorded Calibration Metrics

| Arm | Surface/family detection | Exact-code detection | Specificity |
| --- | ---: | ---: | ---: |
| A-prime | 72/108 | 72/108 | 2339/2340 |
| B-prime | 106/108 | 106/108 | 2339/2340 |
| C0-prime | 108/108 | 107/108 | 2340/2340 |

For 21 repeat pairs, the recorded mean exact finding-key Jaccard was `0.897959...`.

These are bounded measurements on the registered synthetic design. They do not estimate defect prevalence, sensitivity, specificity, repeatability, or quality on natural questions, lessons, curricula, languages, providers, models, or prompts beyond that design.

## Recorded Deviations and Limitations

1. The registration recorded `stream: false`; execution used `stream: true` together with thinking/high-reasoning behavior. This was a disclosed protocol deviation, not exact adherence.
2. In the repeatability path, the repeated B-prime critique was not fed into the repeated revision. Therefore the repeat run did not establish end-to-end B-prime repeatability or determinism.
3. The source baseline did not itself capture the untracked implementation; a code manifest was necessary to bind executed code.
4. Failed or lost attempts were not evidence of successful inspection.
5. The calibration did not establish automatic repair quality, natural-sample generalization, A18 content acceptance, A23 promotion readiness, integration, A11 regression, A22 release readiness, deployment, or live behavior.

## Permitted Use

Use this case only to:

- reproduce the historic synthetic-calibration ledger with its exact receipt identities;
- test whether a new packet preserves the disclosed deviations and claim ceiling;
- compare a deliberately registered successor calibration without rewriting old results.

Do not use it to set current provider/model policy, prices, authorization scope, resource caps, routing, or production gates. Those require current normative references and fresh evidence.
