# A22 MAIS Natural CA60 V5 formal-freeze execution

## Session identity

- Lane: `A22` clean exact-SHA execution integrity and protected custody.
- Worktree:
  `/Volumes/Starship/MAIS-MVP/.worktrees/a22-natural-ca60-formal-freeze-exec-v5-20260826`.
- Branch: `codex/a22-natural-ca60-formal-freeze-exec-v5-20260826`.
- Execution source commit:
  `57d78fb0be194e3eaf035a4ea6e6448d60e64b67`.
- Target PR: `pending`.
- Creation date: `2026-08-26`.
- Expected closeout date: `2026-08-27`.

## Authority boundary

The owner authorization permits only freezing the bound California runtime
frame and deterministic 60-cluster sample. This session did not read any
credential, make any OpenAI or DeepSeek call, egress any natural-question
content, create any token/attempt/USD authorization, or modify live content.

## Environment and preflight

- `CLAUDE.md` and the A22/A21/A11 role boundaries were observed.
- HEAD was clean and equal to
  `57d78fb0be194e3eaf035a4ea6e6448d60e64b67` before execution.
- Node: `v24.15.0`; npm: `11.12.1`.
- package-lock SHA-256:
  `51e9e1c428df6ed4d3a4812a651b5048246fcc611dd7436c36fdaf6156051a66`.
- Dependencies were installed with
  `npm ci --ignore-scripts --no-audit --no-fund`.
- The first sandboxed install attempt ended in npm's `Exit handler never
  called` error before formal execution. The approved retry succeeded; no
  tracked package file changed and install scripts stayed disabled.
- Clean-SHA identity/contract/erratum tests passed `7/7` immediately before
  execution.

## Formal execution

- Registered start: `2026-08-25T20:21:31.000Z`.
- Frame freeze: `2026-08-25T20:21:41.000Z`.
- Sample freeze: `2026-08-25T20:21:42.000Z`.
- C0 freeze: `2026-08-25T20:21:43.000Z`.
- Aggregate disk verification: `2026-08-25T20:25:04.000Z`.
- Protected root:
  `.local/mais-natural-ca60-v1/formal-freeze-v5/57d78fb0be194e3eaf035a4ea6e6448d60e64b67`.

Formal aggregate counts: 2,802 frame rows, 482 eligible rows, 2,320 excluded
rows, 106 eligible homology clusters, 60 sampled clusters, and 12 frozen C0
audit items.

## Verification

- All 23 protected content payloads matched their recorded byte length and
  SHA-256; custody plus final receipt yielded 25 protected files total.
- Protected root mode was `0700`; every protected file mode was `0600`.
- All 60 sample entries matched an eligible full-frame row and had distinct
  cluster IDs; all 12 C0 entries belonged to the frozen sample.
- Every eligible row used only an owner-allowed source ID; eligible visual or
  asset rows: `0`.
- Public receipt original-item-ID leak count: `0`; it contained no prompt,
  answer, or explanation field.
- Provider requests, credential reads, natural-question egress events, and
  natural-question results: all `0`.

## Handoff

The formal frame/sample/custody roots are recorded in the accompanying A22
aggregate report. Current status is
`FORMAL_FRAME_AND_SAMPLE_FROZEN_PENDING_INDEPENDENT_REVIEW`. A11 must now
recompute the roots, sample, C0 selection, custody, and authority boundary
without importing the A21 formal builder or scorer. Provider authorization and
all natural-question execution stages remain blocked.
