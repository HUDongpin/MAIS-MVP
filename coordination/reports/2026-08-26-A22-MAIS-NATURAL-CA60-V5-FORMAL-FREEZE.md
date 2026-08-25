# MAIS-NATURAL-CA60-V5 formal frame/sample freeze — A22 execution report

## Outcome

The California runtime frame and deterministic 60-cluster sample were formally
frozen from clean exact commit
`57d78fb0be194e3eaf035a4ea6e6448d60e64b67`. The protected artifacts are
custody-bound and locally verified. A11 independent recomputation is still
pending, so the current status is:

> `FORMAL_FRAME_AND_SAMPLE_FROZEN_PENDING_INDEPENDENT_REVIEW`

This is not provider authorization and is not a natural-question QA result.

## Frozen aggregate evidence

| Evidence | Frozen value |
| --- | ---: |
| Complete runtime frame | 2,802 rows |
| Egress-eligible text-only rows | 482 |
| Excluded rows | 2,320 |
| Eligible homology clusters | 106 |
| Sample | 60 items from 60 distinct clusters |
| C0 random audit | 12 registered sample items |
| Protected payloads | 23 content-bearing files |
| Total protected files | 25 |
| Protected payload bytes | 116,505,831 |
| Provider requests | 0 |
| Credential reads | 0 |
| Natural-question egress events | 0 |
| Natural-question results | 0 |

All eligible rows satisfy the owner-approved source-ID scope. Denied sources,
copyright-restricted content, and visual/assets remain excluded. The formal
sample contains no repeated homology cluster. The public receipt contains no
original runtime question ID and no prompt, answer, or explanation text.

## Principal roots

- frame registration:
  `b8a4752e05fb8bf39a34afa6c63beb363731d08530069d9c454ad1b3e3fe975f`;
- sampling frame:
  `c5446c0cd2f29f00e865b949095045e439d1b946a46b132f811af398415046c7`;
- sample manifest:
  `d8856f0fb60f38eeecce5249e2018ba90417d68e0f84ef6e2ad9522016d9e159`;
- C0 random audit:
  `f1f20cd071e7e95b0f344c123796aeb68a62a4d31dd23dbfaee2991fcdb2be4e`;
- protected custody manifest:
  `e85c09455caf7b41bcc592e46afd7fe6ea154f2d3985565634ddabb347ab566a`;
- final formal-freeze receipt:
  `1da428bb5455ba1af33d263d213b7b7bb83f35e57c01f3a9fb17b8668931eb93`;
- run completion:
  `181354f152af21d2652c37394b5f0bedc6a82cd56db39b31992266f59bc46357`.

The content-bearing evidence remains untracked under the protected `.local`
custody root with directory mode `0700` and file mode `0600`.

## Execution integrity

- clean exact-SHA runner identity and the 17-path runtime source closure passed;
- source bytes matched approved readiness commit
  `bd44971158979b5e31acf5bf0b1fabc360c9a53a`;
- owner decision request, rights policy, lineage rule, and append-only dual-root
  erratum matched their registered hashes;
- each of 23 content payloads was rehashed from disk against the custody
  manifest;
- 60 sample rows were rechecked against eligible frame rows and unique
  clusters; all 12 C0 rows were rechecked as members of the frozen sample;
- provider/network, credential, question-egress, label, result, token, attempt,
  and USD counters remained zero.

The first sandboxed `npm ci` attempt encountered an npm exit-handler error.
No formal execution had started. A second `npm ci` completed successfully in
the same clean exact-SHA worktree before the registered run; package-lock bytes
did not change and install scripts were disabled. This is environment setup
evidence, not a protocol deviation.

## Claim boundary and next gate

The maximum current claim is:

> `FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED_PENDING_INDEPENDENT_REVIEW`

It is prohibited to report `PASS`, `APPROVED`, `PRODUCTION_READY`,
`LIMITED_GENERALIZATION_EVIDENCE`, or general machine-QA validity. No OpenAI or
DeepSeek authorization exists, no reference labels exist, and no natural item
has been sent to a provider. The next required gate is A11 independent
recomputation from the sealed protected artifacts.
