# Signature labs — provenance

The `.jsx` files in this directory and the `audit-*.mjs` proofs are ported
**byte-for-byte** from the Claude Math Visual library (`~/Desktop/Claude Math
Visual/`). They are not edited on the way in — every host concern (the
runtime-ready probe, analytics, reset, theming frame) is supplied from the
outside by [`../SignatureLabAdapter.tsx`](../SignatureLabAdapter.tsx). Keeping
the source untouched is a deliberate decision (D2/D3): a re-sync from upstream is
a plain copy, never a merge.

## What is here

The **entire** Claude Math Visual bench library is ported: **184 `<Name>Lab.jsx`
benches** and their **173 `audit-*.mjs`** proofs (11 upstream benches ship with
no audit; see below). Because the port is the whole library, this file no longer
lists benches one row at a time — the directory listing *is* the manifest, and
each bench's California topic home (if any) is recorded, with a rationale, in
[`../../../data/signatureLabAssignments.ts`](../../../data/signatureLabAssignments.ts).

Phase 0 (2026-07-17) hand-ported the first three benches — `TeenNumbersLab`
(K.NBT.1), `SubtractionLab` (1.OA), `BoxPlotLab` (S-ID.1–3) — to prove the three
join shapes (clean 1:1, reuse, fan-out). The remaining 181 were bulk-ported
2026-07-18.

Audits sit **beside** their labs (not in a subfolder) because some read their
sibling `<Name>Lab.jsx` to check lesson structure — the same layout as upstream.
Not every audit reads its lab: many re-implement the math inline. The
audit↔lab link is by naming convention (`audit-boxplot` ↔ `BoxPlotLab`).

## The audits are a CI gate

Each `audit-*.mjs` re-implements its lab's mathematics independently of React and
canvas and checks it numerically (millions of checks across the 173 audits). They
exit non-zero on any failure, so `npm run test:signature-labs` treats a bench
with a failing audit as a hard failure.

The gate runs each audit **with the audits directory as its CWD**
(`scripts/run-signature-lab-tests.mjs`) so audits that read their sibling via a
bare relative path (e.g. `audit-associative`, `const SRC =
'AssociativeMultiplicationLab.jsx'`) resolve it regardless of where the gate is
invoked from — audits that use `import.meta.url` are unaffected.

**Benches with no upstream audit (11), so unproven by the math gate:** `AddLab`,
`AngleLab`, `AreaLab`, `CircleLab`, `MeasurementLab`, `NumberLab`,
`ParallelogramLab`, `QuadrilateralLab`, `RectangleLab`, `TrapezoidLab`,
`TriangleLab` (and any other bench whose `audit-*.mjs` is absent from this dir).
They render fine but ship without an independent math proof — write one before
relying on them in production.

## How benches reach students (fan-out)

A bench renders for a California topic when that topic has an entry in
`signatureLabAssignments.ts`. Per the owner's **fan-out** strategy, one topic
hosts many benches: the `primary` renders by default and every `related` bench is
reachable through the switcher chips rendered by `SignatureBenchSwitcher` in
[`../VisualizationLabPage.tsx`](../VisualizationLabPage.tsx). See
`COVERAGE.md` in this directory for the current embed numbers.

## Adding / re-syncing a bench

1. Copy `<Name>Lab.jsx` and (if it exists) `audit-<name>.mjs` here, unedited.
2. Add the id to `signatureLabIds` — or just re-run the generator; the id list is
   the sorted directory contents.
3. Add a `dynamic()` route in `SignatureLabRoutes` in `../VisualizationLabPage.tsx`
   (the `satisfies Record<SignatureLabId, …>` makes this a compile-time
   requirement — a missing route fails `tsc`).
4. Give it a topic home: add a CCSS tag in
   [`../../../data/signatureLabCcssOverrides.ts`](../../../data/signatureLabCcssOverrides.ts)
   if upstream left it untagged, then re-run
   `scripts/build-signature-lab-candidates.ts` and regenerate the assignments.
5. `npm run test:signature-labs` must stay green.
