# MAIS Natural CA60 V5 — A22 clean frame-readiness evidence

## Outcome

The exact A21 commit
`bd44971158979b5e31acf5bf0b1fabc360c9a53a` was executed in a separate clean
A22 worktree after an isolated `npm ci`. The local readiness receipt and its
protected custody chain verify. No credential was read, no provider was
contacted, no natural question left the machine, and no natural-question result
was produced.

This is readiness evidence, not a frozen frame, sample manifest, provider
authorization, reference-label seal, execution registration, or evaluation
result.

## Aggregate evidence

| Field | Value |
| --- | ---: |
| Runtime-visible California items | 2,802 |
| Whole-inventory homology clusters | 694 |
| Singleton clusters | 147 |
| Frame failures | 0 |
| Conservative text-only potential items | 482 |
| Potential independent clusters | 106 |
| Nonempty response-form × difficulty strata | 7 |
| Visual/asset-restricted K–5 items | 10 |
| Local PII scanner findings | 0 |
| Local secret scanner findings | 0 |
| Provider requests / credential reads / question egress | 0 / 0 / 0 |

Key roots:

- runtime inventory:
  `4c6b82e4b2f45ec2b8c9b7d1a1cde64c379c46c49e72a025152e3a5301df7528`
- full-frame homology:
  `a4016d0680935b8a5eb2abbf66c2fffcd8ffb47cee689ffd98a4740a04131b31`
- conservative potential content:
  `58de40eb4db30ec717aa0758fb3aba8b88e63a2e66f24941fcbc47c9193e9ea3`
- protected custody manifest:
  `98203b93bbf5bfcce1db79233a9ea928df73f0c9a9abad42972e1721deb27256`
- final readiness receipt:
  `079055365655fa51f2d9d60b98d6c405cac323382869b487f1a6540af9edcd7d`
- owner decision request:
  `2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78`

## Owner decision requested next

The request hash above asks the owner to decide both of the following exact
pre-frame gates:

1. Permit external model egress only for future frozen CA60 sample items chosen
   from the potential-content root above and whose source-ID set is confined to:
   `california-math-common-core-skill`, `cde-ca-ccss-math-resources`, and
   `common-core-state-standards-public-license`.
2. Approve fine-grained lineage rule hash
   `8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449`
   for homology/source clustering.

This requested decision excludes all visuals/assets and all eight source IDs
recorded as denied in the machine-readable request. It does not authorize an
OpenAI or DeepSeek call, tokens, attempts, USD spend, credential access, or
model routing. Those remain two later, separately expiring, hash-bound live
authorizations after frame and sample freeze.

## Clean-environment verification

- clean one-session/one-branch/one-worktree execution;
- isolated lockfile install completed with `npm ci`;
- `npm ls --all` exited zero; its stdout hash is
  `c0cbffd6c5b2fb1bc58af4f3e483e3c41b385913d296997f23aaeea69cd81c8c`;
- protected directories are `0700`; all seven protected files are `0600`;
- native byte-hash verification concurred for every custody entry and every
  receipt link;
- three observed reruns produced identical aggregate stdout hash
  `2bb270580241e4fd267e5f82824042a6b0a3c7e758f304c2886a5ec2d902b406`;
- 18 relevant frame/runtime tests passed and TypeScript type-check passed.

The installed lockfile currently reports four high-severity npm advisories and
zero critical advisories. No automatic or breaking remediation was performed.
That advisory does not rewrite this local research receipt, and this work makes
no production-readiness claim.

## Remaining claim boundary

The clean-environment blocker is resolved. Rights approval, lineage-rule
approval, A11 independent extractor recomputation, formal frame freeze, and
formal 60-cluster sample freeze remain open. Therefore:

> `OWNER_RIGHTS_AND_LINEAGE_CONFIRMATION_REQUIRED`

The formal decision ceiling remains `INCONCLUSIVE_MACHINE_REFERENCE`; no
`PASS`, `APPROVED`, `PRODUCTION_READY`, or
`LIMITED_GENERALIZATION_EVIDENCE` is available.
