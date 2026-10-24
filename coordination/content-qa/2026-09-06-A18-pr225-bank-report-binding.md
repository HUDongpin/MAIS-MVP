# A18 / A11 PR225 dated bank-report preservation — 2026-09-06

Owner: A18/A11 review within the owner-approved A25 convergence task. This record preserves six existing 2026-09-04 reports with exact source/version bindings; it does not broaden their acceptance scope.

The reports were reproduced from source commit `f0137c61284e35fd685bf0647b31558b3ba21ef8`, tree `ceaf1f76a248793c5d14323c312f0754010f9d91`, using their original audit scripts with the date argument `2026-09-04`. Four Markdown/CSV outputs were byte-identical; the two JSON outputs matched after excluding only the generatedAt timestamp. The original report bytes and dates below are retained.

| Report | Preserved SHA-256 |
| --- | --- |
| [2026-09-04-S18-full-question-bank-solvability-audit.csv](2026-09-04-S18-full-question-bank-solvability-audit.csv) | `c0c398d20a95c60b8e31505ceddd7db893dccb1fef1249b48697c53562679128` |
| [2026-09-04-S18-full-question-bank-solvability-audit.json](2026-09-04-S18-full-question-bank-solvability-audit.json) | `2ff0b561f66b3ac91df0f155944b6fe95eef0c276f6857e9edad023a05993ea3` |
| [2026-09-04-S18-full-question-bank-solvability-audit.md](2026-09-04-S18-full-question-bank-solvability-audit.md) | `09c1e8f76348c282d788492efb8579c6a9aabbb48886d3238b9d8d281ac60db8` |
| [2026-09-04-S18-mainland-pep-full-question-bank-qa.csv](2026-09-04-S18-mainland-pep-full-question-bank-qa.csv) | `3646a534f95bdb05655857fcda0a090035975fdb47af410b61a135338c46f7e9` |
| [2026-09-04-S18-mainland-pep-full-question-bank-qa.json](2026-09-04-S18-mainland-pep-full-question-bank-qa.json) | `0e321fd5911ad24b28c8df9749120dd39fb2372e3c09bc3f61da4191d9610609` |
| [2026-09-04-S18-mainland-pep-full-question-bank-qa.md](2026-09-04-S18-mainland-pep-full-question-bank-qa.md) | `4fd78d3aa8cd64e5fb78e4888240a48530aed50c515cf44fdc6df6e32f4f1cef` |

The full bank audit reports 16,499 passing question rows; the Mainland PEP audit reports 7,200 passing rows. The 189-entry manual-pass sample queue is a follow-up queue, not proof of a new human review. These scripts audit the question bank and existing answer/solvability metadata. They do not independently certify the 35 new interactive TSX lessons, their 105 chapter checks, complete curriculum coverage or natural model quality. Historical prose that implies broader coverage must be read within this counted scope.

PR225 lesson repair is recorded separately in commit `29dc1ece5998f19f9672862d00c4dd02beeb6e02`: the area estimate 40 cm² is distinguished from the 40.25 cm² midpoint of its uncertainty bounds, the rounded perimeter asks for an upper bound, and browser tests follow current authentication and retired entry-route contracts. Thirty-seven focused model/assignment tests, fourteen textbook browser cases and four ordinary topic cases passed; the global diagram inventory preflight remains failed. Eight inventory shortfalls are already present on main; removing 15 legacy bitmap references accounts for two further native-inventory differences. No threshold was lowered.

The ordinary student topic routes include 20 new high-school PRIMARY openers. Redirecting the two old high-school aggregate book entry routes to the roadmap does not quarantine all new content. The explicit review page remains a separate noindex surface. The promotion gate still requires versioned disposition of the superseded middle-school live projection; these bank reports do not satisfy that gate.

All six original reports, their replay logs and hashes remain recoverable in the external convergence run `RUN-20260906T163352HKT` (PR225-QA-binding and PR225-fix receipts). No live provider, secret access, deployment or content-promotion receipt is claimed. Source closeout waits for the PR/main decision and separate ignored-content custody.
