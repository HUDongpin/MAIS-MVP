# PR242 baseline preparation contract

Scope: A10/A23 preparation for PR242, not runtime SCORM feature changes,
content promotion, deployment, or a change to the immutable v2.6 checker.

The source runtime baseline is `7f692278989b4bf45496d239bccb9263326b5453`.
The reviewed SCORM runtime target is `5227a9a951aadeff14d8c5320d5e0844e72c525e`.
The old baseline has five filesystem reads in four source files. The target
retains all five; only `lib/server/userStore.ts` has changed source bytes and
read position. The original topology mode correctly refuses this difference.

## Explicit modifier

`--review-runtime-topology --rebind-fs-read-metadata` generates a v2 topology
preparation proof. Omitting the modifier keeps the v1 rejection behavior.
It cannot be used with another runtime policy mode or candidate-byte revision.
The actual source and target policy digests remain different and are preserved;
no observation, old Manifest, Receipt, registry, or frozen checker is rewritten.

The modifier requires complete native read inventories and real regular Git
blob identities, modes, fatal UTF-8 decoding, raw hashes and bounded inputs.
Every call is paired in native inventory order, with unchanged expression,
capability and path. Changed read-source files must bind the exact reader
declaration and its unique local dependencies. Imported filesystem/path functions
and the reader cannot escape through aliases or reflective mutation. Their
symbol-based reference contexts and dependency order must remain identical.

The first read argument must resolve to an immutable captured string. A closed
primitive-expression grammar verifies its const initializers and the complete
ordered module initialization prefix through the final path definition. Only
explicit Node path/tmpdir, ambient scalar operations, and recursively verified
zero-argument local functions are supported. Unknown calls, getters, mutable
objects, cycles, assignments and suspension are refused. Type-only exports do
not execute; runtime exports are not silently omitted. Called local function
declarations are bound even when hoisted from after the prefix.

Environment-object use outside this verified initialization execution closure
is not a purity violation by itself: it cannot change an already captured
primitive path. Exact environment-reference contexts remain supplemental proof.
Imported-module initialization, ambient built-in behavior, later filesystem
contents and broader runtime behavior remain outside this local structural
proof and require independent review of the complete runtime delta.

Both evidence preparation and binding reconstruct the metadata proof from
actual source/target Git blobs and compare its complete content and native
inventory digests. A version string or recomputed self digest cannot confer
authority. The final native validator still recomputes the target policy,
candidate isolation, legacy resolutions and currentness. Preparation evidence
is never a native validation, Shadow Receipt, replay or finalization result.

## Verification and boundaries

The preparation suites are explicitly wired into normal CI, with exact fetches
of the two immutable historical fixture commits required by the existing CLI
tests. The frozen `promotion:*` and package test commands are unchanged.
Tests include the independent A11 counterexamples for reflected/aliased writes,
reader reassignment, reordered initialization, pre-existing aliases, forged
objects/inventories and unsupported initialization expressions.

All nine role records, when produced, must retain original historical content
evidence and dates. Fresh baseline and execution claims need their own actual
committed facts. Nine records do not mean nine independent people. Any later
native validation, canonical/fresh/replay comparison and CI readback must be
reported separately. Nothing in this preparation authorizes merge, deployment,
production changes, cleanup, or live content promotion; `liveAllowed=false`.
