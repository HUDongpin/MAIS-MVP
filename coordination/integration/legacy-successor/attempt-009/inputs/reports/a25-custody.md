# A25 bounded custody verification

Coordinator execution: /root. Old checker bundle/ledger/Manifest/Receipt/Closure/Registry remain byte-for-byte preserved. No lifecycle authority was transferred.

Historical refs:

```json
{
  "commit": "779cf5b7d70798e93a4f0e5a4fcc7e5921b70a86",
  "manifest": {
    "path": "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/reaffirmations/g08/reaffirmations/p242/promotion-manifest.v2.json",
    "rawSha256": "13a3533e74894603788dfa865f7f06047914efd8e26f35a00ede4c67321c17a0"
  },
  "receipt": {
    "path": "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/reaffirmations/g08/reaffirmations/p242/promotion-shadow-receipt.v2.json",
    "rawSha256": "32399bf241f6e85a41fbc786555ae70fda000a3806c63aad563a71b4eb6b7a21"
  },
  "registry": {
    "path": "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/reaffirmations/g08/reaffirmations/p242/inputs/legacy-resolution-registry.v2.6.json",
    "rawSha256": "eae293ed951baba4103ccf89b0cf619dab314e78953359923932d838fe6475f0"
  },
  "closure": {
    "path": "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/shadow-closure.v2.json",
    "rawSha256": "576739195d22ba0133a31da292c1e08d602202a9725e04107e50779c47d3c4af"
  },
  "lifecycle": {
    "path": "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/lifecycle-registry.v2.json",
    "rawSha256": "7be73b854a9eb408dfdad671c262e4640fb93136df188b1fd3ecd9e369b77159"
  }
}
```

Imported exact #262 source refs:

```json
[
  {
    "path": "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json",
    "rawSha256": "b1038a0ff8fe9b3ff8077a15dafccf18197565388fb5b6904a41e87bdeae3459",
    "mode": "100644",
    "objectId": "ce9456d65adbe708ef2c5d50dd49e5597773ae22"
  },
  {
    "path": "lib/fullQuestionBankSolvability.test.ts",
    "rawSha256": "d34489d21cb4f835f3ea56b53fb1ce62ae70b5ca482f9233a063cc59ba3cafef",
    "mode": "100644",
    "objectId": "5a8cc72d3198a94828868940172db6738813822d"
  },
  {
    "path": "scripts/arkansas-correctness-solvers.mjs",
    "rawSha256": "8b6c3daf843b347f2e21a5e3998fcfac3291c94d6c5224cf63b70b9b71872859",
    "mode": "100644",
    "objectId": "4548cf51297d64181afb37997917d53ab9201cb3"
  },
  {
    "path": "scripts/audit-us-math-item-quality.mjs",
    "rawSha256": "8ce651dee106622caf42b2212de7ee4d78fb05d0c1f41943e977bba9a03212be",
    "mode": "100644",
    "objectId": "e348805c7aa76838b1c9a1ad23eb0b41cd399fb0"
  }
]
```

New candidate changes exactly22 of1500 rows versus common base;1478 unchanged. Actual three independent sessions A18/A11/A23 are distinguished from A22/A25 coordinator records.

## v1.1 custody clarification

The original v2.6 ledger and historical five-reference layer remain exact bytes. The v1 ledger container is appended under the new contract; its original entry is unchanged and the new release preserves the exact cc8 anchor ledger blob. The original15 attempt008 files retain mode/objectId/bytes; three failed-native disposition artifacts are append-only in the newfreeze. No failed attempt is rewritten asPASS, no prior canonical Receipt exists, and no Shadow approval is inherited. Expected runtime policy is the genuinely observed ce2557 policy reused only after proving all runtime paths unchanged; new native validation must observe it freshly.
