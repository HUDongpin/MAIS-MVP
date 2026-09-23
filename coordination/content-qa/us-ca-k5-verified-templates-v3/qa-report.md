# A18 review: K–5 template candidate v3

- Package: `us-ca-k5-verified-templates-v3`; 111 English `US_CA_MATH` K–P5 candidate questions, 37 template families, 33 distinct CCSS IDs, no live topic mapping.
- Exact pack SHA-256: `fa71a8a6b18e31d452f3b051a772c34741ea2002259952a85aedab3d2f762f5d`.
- Independent A18 read-only verdict on 2026-09-24 Hong Kong time: **`approved-for-integration-review`** for this digest only.

A18 verified that the five exact-standard failures in v2 were repaired. The former predecessor items are Grade 1 unknown-addend equations under `1.OA.D.8`; skip-count items use 5 or 10 under `2.NBT.A.2`; both comparison operands are two digits under `1.NBT.B.3`. The pattern family now practices generation under Grade 4 `4.OA.C.5`, and the solver checks every visible term. A18 independently recomputed the answers from 111 visible prompts, found 111 correct, checked 111 distinct reasoning explanations, found no duplicate prompts, and confirmed the local CCSS registry has all 33 codes. The package-local audit reports 111/111 solved, 37/37 families, zero issues.

The top-level `generatedAt` in v3 was fixed to a timestamp later than the actual review time; its `generator` label also retained a stale `v1` suffix. Those metadata fields are not accepted as provenance. The same 111 question content fields were retained in v4, which received a separate exact-digest A18 re-review. The v3 content decision does not by itself grant A23 Promotion, live integration, release, or deployment.
