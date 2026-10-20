# Suggestions on MAIS-MVP — Issues and Bugs

**Repository:** https://github.com/HUDongpin/MAIS-MVP
**Commit reviewed:** `f573ac62` (Merge PR #283)
**Date:** 2026-10-19
**Scope:** Static review of application code, auth/authorization model, data layer, dependencies, CI and test wiring. Type check and several test suites were executed. No deployed environment or production database was accessed.

---

## 0. Summary

This is a serious, carefully-built codebase, and the review should start by saying so. The authorization model is correct where it counts, session tokens are competently hand-rolled, SQL is parameterized throughout, and `tsc --noEmit` passes clean across ~614,000 lines and 1,813 TypeScript files. Many of the things a reviewer expects to find broken in an MVP are already right here.

The findings below are therefore mostly not "the code is wrong" — they are **one exploitable bug, one urgent dependency bump, one architectural decision that will decide whether this scales, and a testing/CI gap that is currently hiding real failures.**

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 1 | Next.js pinned at a version with a **critical** advisory | **Critical** | 10 min |
| 2 | Open redirect — backslash bypass in 4 redirect guards | **High** | 30 min |
| 3 | Entire app state is one JSONB row; every write serializes on it | **High (architectural)** | Weeks |
| 4 | Two sources of truth for attempts / progress | **High** | Days |
| 5 | 335 test files are never executed by CI; 2 of 10 sampled fail today | **High** | 1–2 days |
| 6 | Tests assert on source text rather than behaviour | Medium | 1 day |
| 7 | Rate limiting is per-instance in-memory | Medium | Half day |
| 8 | Only one security header is set | Medium | 1 hour |
| 9 | Demo accounts (`12345`) are fail-open outside Vercel | Medium | 1 hour |
| 10 | PBKDF2 at 120k iterations | Low | 15 min |
| 11 | Repo is 1.3 GB; `coordination/` alone is 665 MB | Low | 1 day |

Findings 3, 7 and 8 overlap with items already in `Technical-Review/ENGINEERING-BACKLOG.md` (BK-07/BK-11, BK-06, BK-21). Where that is the case I say so and argue about **priority** rather than re-reporting the issue. Findings 1, 2, 4, 5, 6 and 9 do not appear in the existing backlog.

**Status of this branch (2026-10-21).** This branch combines three reviewable slices.

**Finding 2 is fixed** — one parser-based `sameOriginPath()` helper in
`lib/safeRedirectPath.ts`, wired into all four guards, with per-guard tests covering the
backslash and percent-encoded variants. **Finding 5 is implemented end to end** — a
discovery-based runner, a drift guard that fails when a test file is unreachable, both wired into
CI, and the orphaned failures triaged: **251 files / 2,590 tests / 0 failures**. **Finding 6's
recommendation is applied** to the login redirect logic. **Finding 3's instrumentation is
implemented**, and writing it turned up a separable, much cheaper problem — the write path moves
roughly 4× the bytes it needs to — specified with SQL in
`docs/app-state-write-amplification.md` but deliberately **not** applied, because validating a
change to the primary datastore's verification logic needs a live PostgreSQL that was not
available.

Findings 1, 4, 7, 8, 9, 10 and 11 are **not** addressed here. One item flagged under finding 5 —
that Mainland BNU primary grades serve no questions — was investigated and found **not** to be a
defect but an enforced content gate; see `docs/mainland-bnu-primary-candidate-gate.md`. Each
finding below ends with its own "Status (this branch)" note.

---

## 1. Next.js is pinned to a version with a critical advisory — **Critical**

`package.json` pins `"next": "15.5.23"` exactly (no caret). `npm audit --omit=dev` reports:

```
CRITICAL  next  15.5.23
  - Unauthenticated Remote Code Execution in Image Optimization API (AVIF)
  - Unauthenticated Remote Code Execution on Windows-hosted servers
  - Cache poisoning of SSG and ISR pages (self-hosted)
  - Cache poisoning in SSG/ISR rendering leading to cross-user content
    substitution and persistent denial of service
  - Depends on vulnerable versions of sharp
fixAvailable: next@15.5.28  (isSemVerMajor: false)
```

Two things make this more urgent than a routine audit warning:

- **The fix is a patch bump.** 15.5.23 → 15.5.28 is non-breaking. There is no migration cost.
- **The exact pin defeats `npm audit fix`.** Because the version is pinned without a range, `npm audit fix` will not move it; it reports "will install next@15.5.28, which is outside the stated dependency range" and requires `--force`. So this will not get picked up by routine maintenance — it has to be done deliberately.

Of the four advisories, the one that matters most for this application is **cross-user content substitution via SSG/ISR cache poisoning**. MAIS serves per-student dashboards, per-teacher consoles and per-parent reports. An advisory whose stated impact is one user being served another user's rendered page is materially worse here than it would be on a marketing site — and this is a platform handling children's data.

```bash
npm install next@15.5.28
```

That single bump also clears the transitive `sharp` advisories. Separately, `source-map-js` has a high-severity DoS advisory fixable with a plain `npm audit fix`, and `katex@0.16.45` has a low-severity prototype-pollution advisory (the code already passes `trust: false` at `components/math/MathText.tsx:114`, which is the correct mitigation; the clean fix is katex 0.19, a major bump, so this one can wait).

---

## 2. Open redirect — backslash bypass in all four redirect guards — **High**

This is the one finding I was able to confirm as directly exploitable.

Four functions sanitize a user-supplied `next` path before redirecting to it. All four use the same check — require a leading `/`, reject `//`:

| File | Line | Function |
|---|---|---|
| `app/login/page.tsx` | 290 | `safeWorkspaceTarget` |
| `app/api/auth/google/callback/handler.ts` | 118 | `safeWorkspaceTarget` |
| `lib/server/googleOAuth.ts` | 95 | `safeNextPath` |
| `app/change-password/page.tsx` | 38 | `safeNextPath` |

```js
if (!value?.startsWith("/") || value.startsWith("//")) return workspaceForRole(role);
```

Rejecting `//evil.com` is correct and clearly deliberate. But the WHATWG URL spec treats a **backslash** as equivalent to a forward slash in the authority position for special schemes (http/https). In the "relative slash state", a `\` transitions the parser into the authority state exactly as `/` does. So `/\evil.com` passes a check that `//evil.com` fails, and then resolves to a different origin.

Verified in Node (same URL parser the browsers and `NextResponse.redirect` use):

```
input            -> guard output    -> resolved against https://mais.example.com/
"//evil.com"     -> "/dashboard"    -> https://mais.example.com/dashboard   (blocked, correct)
"/\evil.com"     -> "/\evil.com"    -> https://evil.com/                    (BYPASS)
"/\evil.com/path"-> "/\evil.com/..."-> https://evil.com/path                (BYPASS)
```

The sink is reached in both the credential and the Google flows:

- `app/login/page.tsx:452` — `window.location.replace(routeTarget)`
- `app/api/auth/google/callback/handler.ts:191` — `NextResponse.redirect(new URL(targetPath, request.url))`

**Exploit path.** `https://<app>/login?next=/\attacker.example` → victim logs in with real credentials → lands on the attacker's site. The destination is reached *after* a genuine successful login, which is the dangerous part: the natural follow-up is a cloned "your session expired, please sign in again" page, and the victim has just demonstrated they will type their password into a page that looks like this one. For a platform whose users are schoolchildren and their parents, that is a phishing primitive worth closing.

Note that the role filter accidentally protects teachers and parents — `nextPathStartsWith(value, "/teacher")` fails for `/\evil.com`, so those roles fall back to their workspace. **Students are not protected**, because the student branch returns `value` unchanged. The Google callback and `change-password` guards are exposed for all roles.

**Fix.** Stop pattern-matching the string and let the URL parser decide, which closes this class of bypass rather than this one instance:

```ts
function safeNextPath(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  // Resolve against a throwaway origin; keep it only if it stayed on that origin.
  try {
    const base = "https://mais.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
```

This rejects `/\evil.com`, `//evil.com`, `https://evil.com`, `\\evil.com` and percent-encoded variants in one check. Apply it in all four places, and keep the existing role filter layered on top.

Worth adding a regression test with the backslash case — there is currently no test anywhere in the repo covering it (see finding 5 for why the one test file that touches this code never runs).

**Status (this branch).** **Fixed.** This landed in two deliberate steps. First the login
page's copy of the logic moved to `lib/loginRedirect.ts` (see finding 6), extracted
behaviour-preserving, with the bypass left in place and *pinned by a test case* so that closing
it would have to be a deliberate flip rather than an accident of refactoring. Then
`lib/safeRedirectPath.ts` took over the single off-origin decision: `sameOriginPath()` requires
a leading `/`, resolves the value against a throwaway probe origin, keeps it only if the origin
held, and returns `null` otherwise — the parser-based approach recommended above, in one place
instead of four. All four guards now call it, with the per-role prefix filter still layered on
top rather than replaced. Tests cover each guard by calling it, across `//evil.com`,
`/\evil.com`, `/\evil.com/path`, `https://evil.com`, `\\evil.com` and percent-encoded
variants, closing the gap this finding noted — that no test anywhere in the repo covered the
backslash case.

---

## 3. The entire application state is a single JSONB row — **High (architectural)**

This is the decision that will determine whether the platform survives real classroom load, so it deserves the most space.

All persistent application data lives in one row of a table called `app_state`, in a single `jsonb` column (`lib/server/userStore.ts:3024-3030`):

```
app_state(id, tenant_id, state_kind, schema_version, revision, payload jsonb, updated_at)
```

That `payload` holds **81 distinct entity collections**. Counted from `database.*` references in `userStore.ts`:

```
users  student_profiles  user_settings  auth_identities  attempts  mistakes
learning_events  learning_event_clears  lesson_progress  lessons  lesson_blocks
topics  questions  assessments  assessment_submissions  submissions  assignments
assignment_submission_attempts  assignment_grading_runs  assignment_teacher_reviews
ai_tutor_messages  ai_tutor_usage  ai_tutor_transcript_access_events
ai_governance_events  gamification_events  visualization_events  visualization_sessions
content_safety_flags  forum_threads  forum_reports  forum_audit_events
forum_notifications  teacher_classes  class_enrollments  class_roster_profiles
teacher_live_sessions  teacher_live_prompts  teacher_live_responses
teacher_notices  teacher_notice_recipients  teacher_notice_delivery_attempts
reward_point_ledger  reward_redemptions  guardian_links  guardian_invitations
password_reset_tokens  schools  school_memberships  term_archives   ... and 32 more
```

### Why this is the top architectural risk

**Every write in the system serializes on one row lock.** The mutation path takes an exclusive row lock before reading (`FOR UPDATE OF app_state` at `userStore.ts:5083, 5500, 8085, 9564, 9691`), inside a transaction configured with:

```sql
set_config('lock_timeout',      '1000ms', true)
set_config('statement_timeout', '5000ms', true)
```

To be clear and fair: **this is correct for consistency.** The locking and the `revision` counter mean there are no lost updates, which is more than many MVPs manage. The problem is throughput, not correctness. A student submitting an answer, a teacher saving a report, and a parent acknowledging a notice all contend for the *same* row lock. With `lock_timeout` at 1 second, the second and subsequent concurrent writers fail rather than queue once a write takes longer than that. A single class of 30 students answering questions simultaneously is exactly the workload this shape handles worst — and it is the product's core use case.

**Every write rewrites the whole blob.** The cycle is: lock → read entire payload → `JSON.parse` → mutate in JS → serialize → write entire payload. Cost scales with *total accumulated history*, not with the size of the change. Appending one `learning_event` rewrites every byte of every one of the 81 collections.

**Several of those collections are unbounded and append-only, with no pruning.** `learning_events`, `attempts`, `ai_tutor_messages`, `gamification_events`, `visualization_events`, `ai_governance_events`, `teacher_live_responses`, `assignment_submission_attempts`, `content_safety_flags` and the `forum_*` tables all grow forever. I searched for retention or pruning logic over the blob collections and found none (the retention code at `userStore.ts:10892` applies to a separate Postgres table). So write latency grows monotonically with usage, with no ceiling and no cleanup path.

**Postgres amplifies this.** A JSONB value this large is TOASTed out-of-line. Rewriting it writes a fresh TOAST chain every time, producing WAL amplification and table/index bloat far beyond the logical size of the change.

### There is already production evidence of this

I did not have to speculate about the consequences. The codebase treats Neon's **data-transfer quota exhaustion as a first-class, named failure mode in the authentication hot path**:

- `lib/server/authRouteGuards.ts:136` — `if (message.includes("data transfer quota")) return "postgres-quota";`
- `lib/server/healthCheck.ts:31` — `postgres-quota` is in the health check's failure set
- `lib/server/healthCheck.ts:52` — the same classifier again

Code does not acquire a dedicated error class for "the database provider cut us off for moving too much data" unless that has actually happened. Rewriting a multi-megabyte JSONB blob on every request is precisely how a project burns a data-transfer quota. Two further corroborations in the repo: `app/api/warm/route.ts` exists specifically because cold start plus connection handshake was "a large part of the ~10s slow login reports", and `scripts/classroom-load-smoke.mjs` plus BK-19 show load under a class-sized cohort is already a known worry.

### Recommendation

The existing backlog has this as BK-07 (ADR) and BK-11/BK-12 (strangler waves). **I would argue the priority is wrong** — BK-19 "Classroom load test" is marked P3, and this is the constraint most likely to produce a visible outage during a real lesson. Run the load test early, because it is cheap and it will tell you how much time you actually have.

The strangler approach in BK-11/BK-12 is the right one. I would sequence it by write volume rather than by domain, extracting the highest-frequency append-only collections to real tables first:

1. `learning_events`, `attempts` — highest write rate, and `practice_attempts` / `learning_events` **already exist as proper tables** in `lib/server/practiceAttemptStore.ts:34-113`. Much of the destination schema is already built (see finding 4).
2. `ai_tutor_messages`, `gamification_events`, `visualization_events` — next highest, append-only, no cross-entity invariants.
3. Leave low-churn configuration collections (`topics`, `lessons`, `schools`) in the blob indefinitely. They are read-mostly and cost little.

Two things worth doing **this week**, regardless of the larger refactor, because they are cheap and buy information:

- **Instrument the blob.** Log `pg_column_size(payload)` and the mutation transaction duration on every write. You cannot prioritize this properly without knowing whether the payload is 2 MB or 200 MB and how fast it is growing.
- **Add a retention job** for the unbounded collections. Even a crude 90-day trim on `visualization_events` and `gamification_events` will slow the growth curve while the real fix is built.

**Status (this branch).** The first of those two — instrument the blob — is implemented in
`lib/server/appStateGrowthObservation.ts`, called from the success path of
`writePostgresDatabaseWith`. Collection row counts and write duration are always on and
effectively free; payload bytes are the expensive measurement, so they are opt-in and sampled
via `MAIS_APP_STATE_SIZE_SAMPLE` (unset means nothing is ever serialized, so the default
deployment pays nothing). `warn`/`critical` escalate through `captureServerError` with scope
`datastore`, using observability keys that were already on the error monitor's allowlist.
Taking the measurement in production is now a config change rather than a code change.

Writing it surfaced a separable and much cheaper problem: the write path binds the serialized
payload **three times per mutation and reads it back once** — roughly 4× the necessary bytes —
for a verification guarantee that a server-side digest comparison would provide at 1×. That is
roughly a 75% cut on the dominant write path, available independently of the strangler work.
The analysis, the proposed SQL, the correctness traps (chiefly: never compare a server-side
digest against a client-side `JSON.stringify` digest, because `jsonb` normalizes key order and
whitespace) and the reason it is written up rather than applied — the write path's only
automated coverage is source-text regex assertions, and validating the change needs a live
PostgreSQL that was not available here — are in `docs/app-state-write-amplification.md`.

The retention job is deliberately **not** implemented. Deleting student learning history is a
policy decision with child-data-compliance implications, not an implementation detail, and it
needs an owner's retention period per collection rather than a default chosen by whoever
touched the code. The instrumentation now identifies which collections to start with.

---

## 4. Two sources of truth for attempts and progress — **High**

This one is concrete and currently live, and it is not in the backlog.

`learning_events` and `lesson_progress` exist in **both** storage systems simultaneously:

- As normalized Postgres tables — `lib/server/practiceAttemptStore.ts:34-113` creates `practice_attempts`, `learning_events`, `mistake_book_items`, `adaptive_skill_states`, `reward_point_ledger`.
- As arrays inside the `app_state` JSONB payload — written via `database.lesson_progress.push(...)` (`userStore.ts:13563, 14229`) and read back with `jsonb_array_elements` over the blob (`userStore.ts:13304, 13352, 17981`):

```sql
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(user_match.payload->'learning_events', '[]'::jsonb))
FROM jsonb_array_elements(COALESCE(state.payload->'lesson_progress', '[]'::jsonb))
```

So the same logical entity has two homes, two write paths and two read paths, with nothing reconciling them.

**This has already caused a user-visible bug.** Commit `487fdc5a` in the history reads:

> `fix(progress): share the dashboard attempt source for accuracy`

That is the signature of exactly this problem — two code paths computing a student's accuracy from two different stores and disagreeing. The commit fixed one consumer. The underlying duality is still there, so the next feature that reads attempts from the "wrong" side reintroduces it.

For an education platform this is worse than a generic data bug: the numbers in question are student mastery and accuracy figures that teachers use to make decisions about children, and parents see in reports. Silent disagreement between two stores is the kind of bug that erodes trust in the product permanently once a teacher notices it.

**Recommendation.** Pick one store per entity and make the other a derived read, enforced rather than agreed by convention.

1. Grep every read of `payload->'learning_events'` and `payload->'lesson_progress'` and inventory the consumers. There are at least three.
2. Make the normalized tables authoritative — they already exist, which makes this the cheap direction.
3. Add a **single accessor module** for attempts/progress and make it the only way to read them. This is backlog item BK-09 ("shared API handler") applied to the data layer, and it is what prevents the next recurrence.
4. Add a reconciliation check that fails loudly in CI/staging if the two stores disagree, until the blob copy is removed. A test that compares the two for a seeded user would have caught `487fdc5a` before release.

---

## 5. 335 test files are never executed by CI — and some are failing — **High**

The repo contains 668 test files. By cross-referencing every test file against `package.json` scripts, the `scripts/run-*.mjs` runners (including the four that discover tests dynamically) and `.github/workflows/*.yml`, **335 are not reachable by any CI entry point.** Breakdown:

| Location | Unreferenced test files |
|---|---|
| `components/visualizations/` | 203 |
| **`lib/server/`** | **80** |
| `app/api/` | 15 |
| `tests/e2e/` | 3 |
| `lib/` (various) | ~30 |
| `app/` (dashboard, teacher, parent, practice) | 4 |

The 80 in `lib/server/` are the concerning ones — that directory holds the authentication, session, rate-limiting, content-safety and governance logic. `lib/session.test.ts`, which covers the session token implementation, is among them.

**These are not merely idle — some are red right now.** I ran 10 of the unreferenced `lib/` tests. Eight pass. Two fail:

- **`lib/loginRedirect.test.ts` — fails.** It asserts `useRouter(` and `router.replace(` appear in `app/login/page.tsx`. Neither appears; the file has exactly one navigation call, `window.location.replace` at line 452.
- **`lib/californiaGradeAware.test.ts` — fails.** It asserts on a constant `defaultUnitedStatesLoginGrade` that was renamed to `defaultLoginGrade`. It also fails a second, more substantive assertion: *"California should still retain candidate lesson seeds for QA"* (`expected: true, actual: false`) — which may be a real content regression rather than a stale string match, and is worth looking at on its own.

Extrapolating a 20% failure rate across 335 unrun files is not rigorous, but it is reasonable to expect **dozens of failing tests** hidden here. Each is a small piece of lost information about the system.

This is backlog item BK-02 ("Make CI a real gate"), currently **P0 · Critical** — correctly rated. The actionable detail the backlog does not capture is the scale and the location: it is not that CI is thin, it is that **half the test suite is dark, including most of the security-relevant tests.**

**Recommendation.**

1. Replace the 30+ hand-maintained `test:*` scripts with **one discovery-based runner**. The hand-enumerated file lists in `package.json` are the root cause: a new test file is invisible until someone remembers to add it to a 40-line shell string. `scripts/run-component-tests.mjs` already does recursive discovery and its own header comment diagnoses this exact failure mode — "`components/**/*.test.ts` had accumulated for a long time with no runner". Generalize that script rather than writing a new one.
2. Run the 335 orphans once and triage: fix, delete, or explicitly quarantine with a comment saying why.
3. Add a CI check that fails when a `*.test.ts` file exists that no runner would pick up. This is the guard that keeps the problem from returning, and it is maybe 20 lines.

**Status (this branch).** All three recommendations are implemented.
`scripts/run-discovered-tests.mjs` generalizes `run-component-tests.mjs` from one hard-coded
root to any root, as recommendation 1 suggested, and runs TypeScript sources directly under
`tsx` rather than pre-compiling to CommonJS — `lib/aiTutorCapacity.test.ts` passes under `tsx`
and fails under the CommonJS emit, and a gate that reports a passing test as broken is worse
than no gate. `scripts/check-test-coverage.mjs` fails when a test file exists that no gate
would run, which is recommendation 3. Both are wired into `.github/workflows/ci.yml`. The gate
currently runs **249 files / 2,571 tests / 0 failures**.

The orphans were triaged rather than bulk-enabled. The seven failures the survey found are
fixed or quarantined, and quarantine lives in `scripts/test-quarantine.json` as data — each
entry carrying a reason, an owning lane and exit criteria, and read by the coverage check so a
quarantined test is still accounted for rather than silently gone. Two remain quarantined: the
Resend Postgres integration suite (needs a live database, and is covered by its own dedicated
script) and `tests/e2e/math-diagram-source-geometry.test.ts`, which asserts content-inventory
baselines that current content no longer meets — six of its eight mismatches are
visualization-family, matching the in-flight visualization stream that the component runner
already excludes, so re-baselining it would rubber-stamp a possible regression and it needs a
content judgement rather than a test edit.

Both failures named above are resolved. `californiaGradeAware.test.ts`: the renamed constant,
and the candidate-seed assertion — which tripped because all 64 California seeds are now
`productionReady`, the condition that makes the leak assertion vacuous, so the guard now checks
that condition directly instead. `loginRedirect.test.ts`: as described in finding 6.

**Found while triaging, and correctly left alone:** `mainlandBnuQuestions` in
`lib/server/questionStore.ts` builds loaders for the junior and high grade bands only, with no
primary branch, although `data/mainlandBnuPrimaryQuestions.ts` exists, holds 3,000 questions and
is covered by `test:question-bank`. Compare `mainlandPepQuestions`, which has all three.
Measured: BNU/P1 → 0 questions, BNU/S1 → 500, PEP/P1 → 200.

**This turned out not to be a defect, and the first instinct about it was wrong.** It was
investigated on this branch and the verdict is recorded in
`docs/mainland-bnu-primary-candidate-gate.md`: BNU primary is **deliberately gated candidate
content**. `coordination/integration/v2/legacy-resolution-registry.v2.json` carries digest-bound
resolutions `de-reach-bnu-primary-v1`/`-v2` with `candidateMustBeUnreachable: true` and
`liveAllowed: false`, and their `rawSha256`/`idSetDigest` still match the packs byte-for-byte, so
that enforcement record governs exactly today's content. Adding a primary branch to the loader
would **breach an active enforcement record**. The gate is three-layered — question loader, topic
aggregate (`data/topics.ts`), lesson registry (`data/lessons.ts`) — all three de-reached together
on 2026-08-26 by the fail-closed Promotion Gate audit, which is also why `mainlandHjbQuestions`
is junior-only and `unitedStatesQuestions` returns `[]` for `US_FL_MATH`. A single forgotten
loader would have been a one-point omission; three coordinated layers are a decision.

The lesson for this finding generalizes: an absence that looks like a forgotten branch may be an
enforced policy, and the passing tests asserting the content is unreachable were the evidence
saying so. Zero behaviour was changed; the record exists so the next reader does not "fix" it.

---

## 6. Tests assert on source text rather than behaviour — Medium

This is the reason finding 5's failures are not simply stale tests, and it is worth separating out because it affects how much the *passing* tests are worth.

`lib/loginRedirect.test.ts` does not import the login page. It reads the file as a string and runs regexes over it:

```ts
function loginPageSource() {
  return readFileSync(path.join(process.cwd(), "app/login/page.tsx"), "utf8");
}

test("successful login uses client-side dashboard routing instead of a full document reload", () => {
  const source = loginPageSource();
  assert.match(source, /useRouter\(/);
  assert.match(source, /router\.replace\(/);
  assert.doesNotMatch(source, /window\.location\.assign\(/);
});
```

Two distinct problems, both visible in that one test:

**It fails on harmless refactors.** `californiaGradeAware.test.ts` broke purely because a constant was renamed. The behaviour was unchanged. This trains the team to treat test failures as noise, which is how a real failure gets waved through.

**It can pass while the stated property is false.** That test's name is *"uses client-side dashboard routing instead of a full document reload."* The code does the opposite — `window.location.replace` at line 452 **is** a full document reload. The assertion would not have caught it, because it only forbids `window.location.assign(`, a different method. Had `router.replace(` appeared anywhere else in the 3,000-line file, this test would pass green while asserting the opposite of the truth. The regex happens to fail today for an unrelated reason (`useRouter` is absent), which is luck, not coverage.

The same pattern appears in `lib/californiaGradeAware.test.ts` and, from the shape of the `functionBody()` helper, likely in others.

**Recommendation.** Extract the pure logic from the page components and test it by calling it. `safeWorkspaceTarget`, `workspaceForRole` and `nextPathStartsWith` have no React dependencies — they are string functions. Moving them into `lib/loginRedirect.ts` (a file that is currently imported by the test but **does not exist**) and testing them with real inputs would be strictly better than regex-matching the page, and would have caught the backslash bypass in finding 2:

```ts
import { safeWorkspaceTarget } from "@/lib/loginRedirect";

test("rejects off-origin next targets", () => {
  for (const hostile of ["//evil.com", "/\\evil.com", "https://evil.com", "\\\\evil.com"]) {
    assert.equal(safeWorkspaceTarget(hostile, "student"), "/dashboard");
  }
});
```

Source-text assertions are defensible for a narrow class of checks — "this file must not import that module", lint-like architectural constraints. They are not a substitute for executing the function, and they should never be used for a security property.

**Status (this branch).** Done as recommended — and the recommendation turned out to be
literal: `lib/loginRedirect.ts`, the file this test already imported but which did not exist,
now exists. `safeWorkspaceTarget`, `workspaceForRole` and `nextPathStartsWith` moved there
unchanged, and the test calls them with real inputs instead of running regexes over the page.
The extraction is behaviour-preserving on purpose, including the backslash bypass from finding
2, which is now pinned by a test case so that closing it is a deliberate flip. The one
source-text assertion kept is the one guarding the navigation primitive — `2ae49925` chose
`window.location.replace` over a client-side router deliberately, so that a login cannot
inherit the previous account's cached documents — which is exactly the narrow
architectural-constraint case this finding allows.

---

## 7. Rate limiting is per-instance and in-memory — Medium

`lib/server/rateLimit.ts` is a module-level `Map`:

```ts
const buckets = new Map<string, RateLimitBucket>();
```

Every auth rate limit builds on it (`lib/server/authRouteGuards.ts`), including the one the code identifies as the brute-force control:

```ts
/**
 * Production ceiling for per-identifier login attempts. This is the brute-force control: 12
 * attempts per identifier per 15 minutes. Do not change it to accommodate a test suite.
 */
export const defaultLoginIdentifierMax = 12;
```

On Vercel's serverless runtime this ceiling is not 12. Each lambda instance holds its own `Map`, so the effective limit is `12 × (number of warm instances)`, and it resets on every cold start. An attacker spreading attempts across connections gets a multiple of the intended budget, and has no need to do anything clever to achieve it. The comment's intent is sound; the mechanism cannot deliver it in this deployment model.

This is BK-06, already **P0 · High** and correctly diagnosed — I am confirming it, not adding to it. Two implementation notes worth recording:

**The IP key may be attacker-controlled.** `clientIpForRequest` (`authRouteGuards.ts`) takes the **leftmost** `x-forwarded-for` entry:

```ts
function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}
```

Leftmost-wins is the right convention behind a proxy that *appends*, but it is the wrong one behind a proxy that *prepends* — in that case the leftmost hop is whatever the client sent, and every IP-keyed limit becomes trivially evadable by varying a header. Worth confirming against Vercel's actual forwarding behaviour; `x-real-ip` (already the fallback) or Vercel's own request IP is the safer primary. Note that per-identifier limits are unaffected, so this is secondary to the shared-store fix.

**Keep the `HK_MATH_E2E_LOGIN_IDENTIFIER_MAX` test knob as it is.** It can only raise the ceiling, never lower it, it is documented, and `authRouteGuards.test.ts` covers the absent/empty/zero/negative cases. That is how an environment override should be written, and it should survive the migration to a shared store.

For the fix itself: Vercel KV / Upstash Redis with a sliding window is the conventional choice and keeps the current function signatures. Since `postgres` is already a dependency, a Postgres-backed counter is also viable and avoids a new service — though given finding 3, adding more write traffic to that database deserves thought.

---

## 8. Only one security header is set — Medium

`vercel.json` sets exactly one:

```json
{ "source": "/(.*)", "headers": [{ "key": "X-Content-Type-Options", "value": "nosniff" }] }
```

Missing, in rough order of value for this application:

- **`Referrer-Policy: strict-origin-when-cross-origin`.** The highest-value one here, and the cheapest. URLs in this app carry student identifiers — `/teacher/classes/{classId}/students/{studentId}`, `/parent/children/{studentId}`. Without this header, those full paths are sent in the `Referer` to every third-party origin the page touches. For a platform covered by children's-privacy obligations (the repo has `docs/child-data-compliance.md`), leaking student IDs to analytics and font CDNs is a compliance problem, not just a hygiene one.
- **`X-Frame-Options: DENY`** / CSP `frame-ancestors 'none'`. Every authenticated page — the teacher console, the parent reports — is currently framable, which permits clickjacking.
- **`Content-Security-Policy`.** The real work, and worth doing in `Report-Only` mode first given KaTeX, Three.js and Phaser are all in play. Start with `frame-ancestors`, `base-uri 'self'` and `form-action 'self'`, which are low-risk and immediately useful.
- **`Strict-Transport-Security`.** Vercel supplies this on its own domains; verify it is present on the production custom domain rather than assuming.

This is BK-21, currently **P3 · Medium**. I would promote at least `Referrer-Policy` and `X-Frame-Options` — they are two lines of JSON, carry essentially no regression risk, and the privacy exposure is concrete:

```json
{
  "source": "/(.*)",
  "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "X-Frame-Options", "value": "DENY" }
  ]
}
```

---

## 9. Demo accounts are fail-open outside Vercel — Medium

There are seven hardcoded demo accounts, all with the password `12345`, and they include **teacher and parent roles** (`components/providers/AppProviders.tsx:54-86`):

```
HK Student Peter / Student Peter / Student Shirleen     (student)
HK Teacher Chan / Teacher Phoebe / Teacher Scott        (teacher)
Peter's Parent                                          (parent)
```

Plus two more inline at `app/login/page.tsx:212-213` (`Student Jon`, `Teacher Rhi`).

**Credit where due: the Vercel path is correctly fail-closed.** `lib/server/demoSeedBackfill.ts` refuses the backfill on any non-empty `VERCEL_ENV` unless explicitly opted in, the docstring explains precisely why preview deployments are included (they share the production database), and the persistence path ANDs the two gates together at `userStore.ts:7343`:

```ts
const persistedShouldSeedDemoUser = () => allowDemoSeedBackfill && shouldSeedDemoUser();
```

`omitUnstoredDemoSeedRecords` (`userStore.ts:7272`) then filters demo users out of a fresh store. I went looking for a hole here and did not find one on Vercel. This is well done, and commits `4f6cc821` / `dbc1d25d` show it was hardened deliberately.

The residual risks are narrower:

**The protection is keyed on `VERCEL_ENV`, not on "is this production".** The other gate, `shouldSeedDemoUser()` at `userStore.ts:2302`, is fail-open:

```ts
return process.env.HK_MATH_ENABLE_DEMO_USER !== "false";
```

That returns `true` for unset, `""`, `"0"`, `"no"`, `"FALSE"` — anything but the exact lowercase string `"false"`. On Vercel the conjunction saves you. **Anywhere else it does not:** a Docker deployment, a school's on-premise host, a migration to another platform, or a staging box — none of which set `VERCEL_ENV` — seeds seven accounts including a teacher and a parent with password `12345`, unless the operator happens to know to set `HK_MATH_ENABLE_DEMO_USER=false`. A teacher-role account grants access to other students' data. Given this product is plausibly deployed into school infrastructure, that is a realistic configuration, and the safe default is cheap:

```ts
// Demo users are opt-in, matching shouldBackfillDemoSeed's explicit-opt-in shape.
function shouldSeedDemoUser() {
  const flag = process.env.HK_MATH_ENABLE_DEMO_USER?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}
```

`demoSeedBackfill.ts` already implements exactly this normalization (`demoSeedBackfillFlagExplicitlyEnabled`) — reuse it, and the two gates become consistent.

**The credentials ship to every browser.** `AppProviders.tsx` is a client component, so all seven username/password pairs are in the public JavaScript bundle regardless of `NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS`. That flag gates *display*, not *inclusion*. Anyone can read them from the bundle on production today and try them. Move the constants behind the build-time flag so they are tree-shaken out, or serve them from a dev-only endpoint.

---

## 10. PBKDF2 at 120,000 iterations — Low

`lib/server/userStore/authSessionPersistence.ts:1222`:

```ts
hash: pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex"),
```

PBKDF2-HMAC-SHA512 with a random salt and 64-byte output is a sound construction, and the async variant at line 1239 keeps the login path off the event loop — a detail that is frequently missed. Current OWASP guidance for PBKDF2-HMAC-SHA512 is 210,000 iterations, so 120k is below the recommendation but the same order of magnitude. This is a hardening note, not a vulnerability.

Raising it is a one-line change, but it must be paired with a rehash-on-login path (verify with the stored cost, then re-hash at the new cost) or every existing password breaks. If the iteration count is not already stored per-hash, add that first.

Worth noting the demo password `12345` would fall to any cracking attempt regardless of iteration count — see finding 9.

---

## 11. Repository weight — Low

The working tree is **1.3 GB** with **307 MB** of git history. A fresh `git clone` took roughly eight minutes on a good connection.

| Directory | Size |
|---|---|
| `coordination/` | **665 MB** |
| `public/` | 194 MB |
| `data/` | 94 MB |
| `components/` | 34 MB |
| `lib/` | 8.8 MB |

`coordination/` is the largest thing in the repository by a wide margin, and 553 MB of it is `coordination/content-qa/` — process and QA artifacts, not application code. It is fully committed (not gitignored). `data/` holds individual JSON files of 16 MB (`data/ease/ease_questions_by_level.json`, `ease_questions_all.json`).

The application source is only ~43 MB of this. Every clone, every CI checkout and every new contributor pays for the other 1.25 GB. This is part of BK-18 ("Repo hygiene", P1 · Medium) and the ordering I would suggest is:

1. Move `coordination/content-qa/` out of the repo — object storage or a separate repo. Largest win, lowest risk, no application code touches it.
2. Move the large generated question banks in `data/` to Git LFS or fetch them at build time.
3. Leave history rewriting alone unless the clone cost becomes genuinely blocking. It is disruptive for every contributor and the 307 MB of history is the smaller half of the problem.

---

## 12. What is working well

Worth stating plainly, both for fairness and because these are the parts not to disturb while fixing the above.

**The authorization model is correct, and I tried hard to break it.** Middleware (`middleware.ts`) is only a session gate; the real boundary is in the page data loaders, which is the right place in the App Router. `getTeacherAuthenticationForPage` (`app/teacher/getTeacherFoundation.ts:38`) and `getParentFoundationForPage` (`app/parent/getParentFoundation.ts`) both check role and redirect. Pages that look unguarded turn out to be redirect stubs or presentational.

**No IDOR.** Every ID-parameterized page scopes its query by the authenticated owner rather than trusting the URL — `getTeacherLiveSessionById(foundation.teacher.id, sessionId)`, and `app/teacher/classes/[classId]/students/[studentId]/page.tsx` additionally verifies the student belongs to that class before rendering. This is the bug class I expected to find in a codebase this size, and it is absent.

**API routes delegate to handler factories that enforce auth.** My first scan flagged 39 routes with no visible auth check; all 39 turned out to be thin re-exports of factories in `app/api/*/handlers.ts` that check authentication and role (401/403) centrally. That is a better structure than per-route checks and it is why the audit came back clean.

**Session tokens are competently implemented.** `lib/session.ts` uses HMAC-SHA256, constant-time comparison, validated `exp`/`iat` with clock skew, a maximum lifetime cap, a UUIDv4 `jti` pattern check, and a token length limit. It refuses to operate without a configured secret in production rather than falling back.

**Session revocation works.** I went to verify BK-14 ("Session revocation", P2) and found it already functional — `session_revision` is checked against the database on every authenticated request (`authSessionPersistence.ts:2153`, and in SQL at `userStore.ts:14651`). Middleware does not check it, so a revoked session reaches the page before being bounced to login, but the effect is correct. **That backlog item looks stale and may be closable.**

**SQL is parameterized throughout.** All `sql.unsafe` calls are DDL, migrations or `SET LOCAL` with static strings. The two that interpolate a table name (`userStore.ts:6467, 6481`) are typed to a fixed tuple (`typeof postgresProjectionTableNames[number]`), so user input cannot reach them. Keys are passed as bound parameters.

**Other things done right:** the Resend webhook verifies signatures via `svix` and enforces a body-size cap before parsing; cron authorization is fail-closed with a 32-character minimum and constant-time comparison (`lib/server/cronAuthorization.ts`); KaTeX runs with `trust: false`; `expectedUserIdsMatch` uses a hashed constant-time comparison to avoid leaking identifier length; auth responses carry `private, no-store` across all three CDN header variants; no `.env` files or credentials are committed; and `tsc --noEmit` passes clean across 1,813 files, which is genuinely uncommon at this scale.

The code is also unusually well commented, and the comments explain *why* rather than *what* — `authRouteGuards.ts` on the e2e rate-limit knob, `demoSeedBackfill.ts` on why preview deployments must refuse the backfill, `next.config.ts` on the disposable tsconfig. That made this review substantially faster and is worth preserving.

---

## 13. Suggested order of work

> **Done in this branch.** Item 2 (the backslash open redirect, closed in all four guards via
> `lib/safeRedirectPath.ts`), item 5 (instrument the `app_state` write path — the analysis went
> further than logging; see `docs/app-state-write-amplification.md`) and item 6 (one
> discovery-based runner, orphan triage, CI check for unreachable test files). Item 12 is done
> for the login redirect logic specifically. Items 1, 3, 4, 7–11, 13 and 14 remain open. Item 11
> of the *findings* table — the BNU primary question gap noted under finding 5 — was closed as
> "working as enforced", not fixed.

**This week — small, high-value, low-risk:**

1. `npm install next@15.5.28`, then `npm audit fix` for `source-map-js` (finding 1)
2. Fix the backslash open redirect in all four guards; add the regression test (finding 2)
3. Add `Referrer-Policy` and `X-Frame-Options` to `vercel.json` (finding 8)
4. Make `shouldSeedDemoUser()` explicit opt-in; move demo credentials out of the client bundle (finding 9)
5. Add `pg_column_size(payload)` and mutation-duration logging to the `app_state` write path (finding 3) — do this first, because it informs everything below

**Next two weeks:**

6. One discovery-based test runner; triage the 335 orphans; CI check for unreachable test files (finding 5)
7. Run `scripts/classroom-load-smoke.mjs` against a realistic cohort — promote BK-19 out of P3 (finding 3)
8. Shared store for rate limiting — BK-06 (finding 7)
9. Inventory the dual-read sites for attempts/progress; add the reconciliation test (finding 4)

**Next quarter:**

10. Strangler wave 1: extract `learning_events` and `attempts` to the tables that already exist in `practiceAttemptStore.ts` (findings 3, 4)
11. Retention jobs for the unbounded blob collections (finding 3)
12. Extract pure logic from page components so it can be tested by execution (finding 6)
13. Move `coordination/content-qa/` out of the repository (finding 11)
14. Review and close stale backlog items — BK-14 appears already done (finding 12)

---

## Appendix — method and limitations

**What was done.** Full clone at `f573ac62`. `npm install` and `npx tsc --noEmit --incremental false` (passes, exit 0). `npm audit --omit=dev`. `npm run test:components` and `npm run test:analytics` (both pass). Ten unreferenced `lib/` tests run individually (8 pass, 2 fail). The backslash redirect bypass verified by executing the guard logic against Node's URL parser. Manual read of the auth, session, middleware, data-layer and handler-factory code. Scripted audits: API routes versus auth-check presence; protected pages versus guard calls; test files versus CI reachability.

**Limitations.** No deployed environment, production database or Vercel configuration was accessed, so claims about runtime behaviour — the `app_state` payload size, whether `HK_MATH_ENABLE_DEMO_USER` is set in production, actual lock contention, whether `x-forwarded-for` is prepended or appended — are inferences from the code and should be confirmed against the live system. I did not run the Playwright e2e suite, the RAG suites or the Postgres integration tests, as those need a database and credentials. The 335 orphaned-test figure accounts for the four dynamic runners but may still be slightly off in either direction where a runner resolves paths in a way my script did not model; the directory breakdown is the more reliable part. `components/visualizations/` (203 of the orphans, and 34 MB of source) was reviewed only shallowly — the visualization labs are a large body of code that would merit a review of their own.

**On the existing review.** `Technical-Review/TECHNICAL-REVIEW.md` and `ENGINEERING-BACKLOG.md` are good, and the backlog's P0 items are the right P0 items. This review deliberately tried to find things it did not cover (findings 1, 2, 4, 5, 6, 9), argue about priority where it did (3, 7, 8, 11), and flag one item that looks already complete (BK-14).
