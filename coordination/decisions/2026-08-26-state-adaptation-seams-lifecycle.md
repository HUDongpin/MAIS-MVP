# Branch lifecycle — claude/state-adaptation-seams

| Field | Value |
| --- | --- |
| Branch | `claude/state-adaptation-seams` |
| Worktree | `/Volumes/Starship/MAIS-state-seams-wt` |
| Base | `origin/main` @ `c8009edf70` |
| Owner | Claude (Opus 5) session, on behalf of Dongpin HU (Peter) |
| Target PR | pending — branch pushed 2026-08-26, PR not yet opened |
| Creation date | 2026-08-26 |
| Expected closeout | 2026-09-02 |

## Scope

The three blocking defects the state-adaptation red team found, each verified
against `origin/main` before any code was written.

1. **No verified K-5 item machinery** — one of sixteen question packs carried a
   `generationTemplate`, grades 6-12 only. 37 K-5 template families added, each
   generating deterministically and re-solving its own items from the prompt
   text. Shared asset: every state inherits it.
2. **No course seam** — `courseId` did not exist and `Topic.grade` is a required
   single value, so Texas TEKS, Virginia SOL and NC Math 1/2/3 could not be
   represented. Arkansas already ships wrong (its profile declares Algebra I /
   Geometry organization; its topics render "Grade 10"). Seam added before any
   state is onboarded, because `Topic.grade` is persisted in three record types.
3. **Displayed standard codes were unverified claims** — `StandardRef` resolver
   added; a bare code now requires the crosswalk to say `exact` AND the asset to
   actually carry a mapped CCSS id.

## Gates added (all CI-reachable without touching frozen `package.json`)

- `lib/mvpReadiness.test.ts` (`test:mvp`, ci.yml) — course seam + K-5 families.
- `components/standards/standardRef.test.ts` (`test:components`, auto-discovered)
  — resolver behaviour + raw-code-in-prose ratchet.
- `scripts/audit-k5-item-coverage.ts` — `npx tsx`, with `--self-test`.

Every gate was mutation-checked: each was made to fail on a seeded defect and
then restored.

## Declared debt recorded as ratchets (may fall, may never rise)

| Ratchet | Baseline | Where |
| --- | ---: | --- |
| AR secondary topics with no course id | 20 | `secondaryCourseLabellingCeilings` |
| CCSS lesson bodies with a raw standard code in prose | 266 of 270 | `ccssLessonProseCeilings` |
| Raw standard-code occurrences in lesson prose | 369 | `ccssLessonProseCeilings` |

## Known environment issue (pre-existing, not caused here)

`npm run test:components` cannot run locally: `svix` is a declared
`package.json` dependency but is absent from `node_modules`. Component tests
were compiled and run directly to verify. Worth fixing separately.

## Closeout

Remove `/Volumes/Starship/MAIS-state-seams-wt` once the PR lands or is closed,
after proving the worktree is clean.
