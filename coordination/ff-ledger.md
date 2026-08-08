# FF-Ledger — Functional-Feature verification ledger

Maintained by the scheduled FF-Loop. One row per slice. Each iteration picks the
highest-priority slice (routes changed since last-verified commit → untested →
stalest, rotating personas), drives every interactive element in it, and
verifies the EFFECT server-side (network 2xx + state re-read), with
console/network/log checks and Chromebook (1366x768) / iPad-portrait (768x1024)
/ phone (375x812) viewports.

Defect classes: **P0 silent-failure** (UI claims success, server state unchanged),
**broken-effect** (action errors or wrong state), **dead-control** (control does
nothing), **degraded** (works but wrong/ugly under some viewport/state),
**env-only** (only fails in dev/offline-fixture env).

Personas (seeded, pwd `12345`): `HK Student Peter` (student-peter),
`HK Teacher Chan` (teacher-ms-chan), `Teacher Phoebe` (mainland teacher),
`Peter's Parent` (parent-peter-family).

## Slice rows

| Slice | Routes | Persona | Verdict | Last verified | Commit | Notes |
|---|---|---|---|---|---|---|
| S01 auth-student-core | /login, /dashboard (incl. logout, bad-password path) | HK Student Peter | **1 P0 + 1 degraded (fixed) + 1 env-only** | 2026-08-03 | 52d1a1b53c | 31 controls on /login, ~50 on /dashboard driven; D-03 fixed in PR #95; D-01/D-02 open |
| S02 student-progress | /progress, /learning-path, /personalized-learning, /adaptive-learning | HK Student Peter | **clean** | 2026-08-03 | 8ade04f784 | no defects; 2 routes are legacy aliases |
| S03 lesson-surfaces | /lesson, /lesson/[slug], /student/lessons/* (incl. CA textbooks) | HK Student Peter | **clean** | 2026-08-08 | 6888427830 | section buttons verified by scroll interception |
| S04 practice-games | /practice, /mistake-book, /games/*, /student/practice/games/* | HK Student Peter | **clean** (re-driven 2026-08-04) | 2026-08-04 | 2263f6ebf6 | UI answer flow verified; only "Start Mission" still unverifiable |
| S05 roadmaps | /primary-roadmap, /secondary-roadmap, /student/roadmap/* | HK Student Peter | **clean** | 2026-08-04 | 9a1c0e4f | map controls verified by transform scale |
| S06 student-assess | /student/assignments*, /assessment/[id], /student/assessments/[id] | HK Student Peter | **clean** | 2026-08-04 | 9a1c0e4f | graded write + cross-role loop verified |
| S07 social-classroom | /classroom, /classroom/join, /forum, /messages | HK Student Peter | **clean** | 2026-08-04 | 9a1c0e4f | forum scoping + write verified; one observation |
| S08 visualization | /visualization-lab*, /student/tools/visualizations* | HK Student Peter | **clean** | 2026-08-08 | 65fbb58053 | lab controls driven; activity recorded |
| S09 teacher-core | /teacher, /teacher/dashboard, /teacher/analytics, /teacher/reports, /teacher/gradebook | HK Teacher Chan | **2 dead-control + 1 degraded** | 2026-08-03 | 9da2aa3ec8 | D-04a fixed in PR #96; D-04b/D-05 open |
| S10 teacher-content | /teacher/assessments*, /teacher/assignments*, /teacher/lesson-kits*, /teacher/prep*, /teacher/resources, /teacher/review-lessons/* | HK Teacher Chan | **clean** (as far as the fixture allows) | 2026-08-04 | 2263f6ebf6 | 2 documented exclusions: upload form, review-lessons (no data) |
| S11 teacher-ops-live | /teacher/operations*, /teacher/live*, /teacher/classroom-sessions*, /teacher/communications*, /teacher/inbox, /teacher/rewards, /teacher/safety, /teacher/classes*, /teacher/students/* | Teacher Phoebe | **partial — routing + authz clean** | 2026-08-03 | 9fbb04e0 | controls not driven; see S11 notes |
| S12 parent-console | /parent, /parent/children/[id], /parent/connect, /parent/messages, /parent/notices, /parent/reports | Peter's Parent | **1 broken-effect + 3 degraded; authz sound** | 2026-08-03 | 8ade04f784 | D-06 fixed in PR #97; D-07/D-08/D-09 open |
| S13 public-misc | /, /about, /register, /forgot-password, /reset-password, /change-password, /classroom/join (guest), /resource/[id] | guest  | **clean** | 2026-08-08 | 4de1802d22 | registration wizard driven end to end |

## Defects

### D-01 — env-only (demo seeding) — profile edits to seeded accounts silently revert

**Slice** S01 · **Route** /dashboard · **Persona** HK Student Peter · **Found** 2026-08-03 · **Status** filed for triage, needs a product decision

Editing the display name (or avatar) of a **seeded example account** reports success and is
then silently reverted. Real registered users are unaffected — see the control below.

Runtime evidence (server: `mais-dev-ff-loop`, port 3410):
- `PATCH /api/me/profile {"name":"Curl Probe Name"}` → **200 OK**, body echoes the new name.
- `GET /api/me` afterwards → `{"user":{"name":"HK Student Peter"}}`.
- UI: heading and profile card re-render with the new name, Save returns to disabled, no
  error; a hard reload reverts it.

Root cause — confirmed by experiment, **not** by reading alone. `syncAuthDemoAccounts`
([`lib/server/userStore/authSessionPersistence.ts:995`](../lib/server/userStore/authSessionPersistence.ts:995))
re-applies seed values to every seeded persona on each cold database load:
`existingProfile.name = seed.username;` and `existingProfile.avatar_id = seed.avatarId;`.
`mutateDatabase` clears the read cache and reloads at the start of every mutation, so the
next write of any kind reverts the edit.

Two experiments settled it — the first correction matters, because the obvious reading was wrong:
1. **The avatar is not a control, it is the same bug.** `PATCH {"avatarId":"pi"}` looked
   like it persisted (`avatar_id":"pi"` in the snapshot), which suggested `name` was
   uniquely broken. Forcing a cold load with an unrelated `PATCH /api/me/settings` reverted
   it to `delta`. The earlier read had simply landed before the next cold load.
2. **A real user is fine.** Registering `ff-real-user` and renaming it to `FF Renamed User`
   survives a forced cold load and a re-read. The storage engine is sound.

Three write sites force the name back, all verified by reading the source (a triage owner
needs all three — fixing only the first leaves the bug reachable):

| # | Site | Trigger | Notes |
|---|---|---|---|
| 1 | [`authSessionPersistence.ts:995`](../lib/server/userStore/authSessionPersistence.ts:995) `syncAuthDemoAccounts` | every cold load | also line 1000 for `avatar_id` |
| 2 | [`authSessionPersistence.ts:742`](../lib/server/userStore/authSessionPersistence.ts:742) `applyAuthFixedExampleAccountScope` | **a settings save**, via `updateUserSettings` | forces `name` but only *repairs* an invalid `avatar_id` |
| 3 | [`userStore.ts:8975`](../lib/server/userStore.ts:8975) `updateUserSettingsInPostgresHotTables` | settings save when `HK_MATH_POSTGRES_HOT_AUTH_TABLES` is on | the **production** path |

Site 2 matters most for scoping the trigger: the revert is not only a cold-load effect, it
also fires whenever the user changes a setting. Site 3 means the same reset reaches
production, not just dev.

Scope is bounded to example accounts by construction: sites 2 and 3 are gated on
`fixedExampleAccountScopes` ([`userStore.ts:2058`](../lib/server/userStore.ts:2058)), whose
keys are `demoUserId` / `demoTeacherId` / `mainlandDemoUserId` and friends — no real user id
can enter it. That is the static corroboration of the `ff-real-user` experiment above.

Demo seeding is **on by default** —
[`lib/server/userStore.ts:2157`](../lib/server/userStore.ts:2157) is
`process.env.HK_MATH_ENABLE_DEMO_USER !== "false"`, i.e. it is disabled only by an explicit
`"false"` (which `.env.local.example:109` does set).

Why this still matters: the seeded personas are the accounts used by every demo, every e2e
spec, and every stakeholder walkthrough, and the UI gives no hint the edit will not survive.

Not fixed this iteration: keeping demo personas pristine is plausibly the intent of
`syncAuthDemoAccounts`, so changing it is a product decision — either stop clobbering
user-editable fields (`name`, `avatar_id`) while still syncing structural ones (grade,
curriculum, publisher), or keep the reset and make the UI say so. Needs an owner's call.

Repro:
```bash
curl -s -X POST localhost:3410/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"HK Student Peter","password":"12345"}' -c /tmp/c.txt -o /dev/null
curl -s -X PATCH localhost:3410/api/me/profile -b /tmp/c.txt \
  -H 'Content-Type: application/json' -d '{"name":"Probe Name"}'          # echoes Probe Name
curl -s -X PATCH localhost:3410/api/me/settings -b /tmp/c.txt \
  -H 'Content-Type: application/json' -d '{"theme":"light"}' -o /dev/null # forces a cold load
curl -s -b /tmp/c.txt 'localhost:3410/api/me'                             # reverted
```

### D-02 — P0 silent-failure (security) — logout does not invalidate the session server-side

**Slice** S01 · **Route** /dashboard logout · **Persona** HK Student Peter · **Found** 2026-08-03 · **Status** filed, not fixed this iteration

`POST /api/auth/logout` only clears the cookie (`hk_math_session=; Max-Age=0`). The token
itself stays valid for its full 7-day `Max-Age=604800` lifetime.

Runtime evidence:
- Token valid before logout → `GET /api/me` **200**.
- `POST /api/auth/logout` → 200, `set-cookie: hk_math_session=; Max-Age=0`.
- **Replaying the pre-logout token → `GET /api/me` still 200.**
- The post-logout jar → 401 (so the browser-side story looks correct).

The session is a stateless signed token (`{"sub":"student-peter","exp":...}` + HMAC) with
no server-side record, so there is nothing to revoke. Fixing it needs a `token_version`
on the user record (or a revocation list) checked in `lib/server/auth.ts`. Bounded impact
— it requires the attacker to have captured the cookie value — but "Log out" on a shared
school Chromebook does not revoke a captured session for 7 days.

Not fixed this iteration: the fix touches every auth path and exceeds the one-cluster
budget. Next iteration should take it as its own cluster.

### D-04 — dead-control — the shell "Class focus" selector is inert on two of its four routes

**Slice** S09 · **Routes** /teacher/dashboard, /teacher/reports · **Persona** HK Teacher Chan · **Found** 2026-08-03
**Status** D-04a (reports) fixed in PR #96 · D-04b (dashboard) open

[`TeacherShell.tsx:379`](../components/teacher/TeacherShell.tsx:379) renders a **Class focus**
selector on *every* teacher route, publishing the choice as `?classId=`. Only two of the four
S09 routes consume it:

| route | honours Class focus? | evidence |
|---|---|---|
| /teacher/analytics | ✅ | shell + view selects both follow; content differs per class |
| /teacher/gradebook | ✅ | grid and CSV export both scope to the class |
| /teacher/dashboard | ❌ **D-04b** | see below |
| /teacher/reports | ❌ **D-04a** | see below |

**D-04b — /teacher/dashboard.** The control updates the URL and its own value and changes
nothing else. `GET /api/teacher/dashboard` never reads `classId`
([`app/api/teacher/dashboard/route.ts`](../app/api/teacher/dashboard/route.ts) calls
`getTeacherDashboardData(user.id)` with no class scope), and `TeacherDashboardView` uses
`classId` only as a React key and link href. Proof: fetching the API under
`classId=all` / `class-s3a-2026` / `class-s1-foundation-2026`, the **only** field that differs
is `generatedAt` — `kpis`, `actionQueue`, `classSummaries`, `masteryHeatmap` and
`rewardSummary` are byte-identical. Client-side, the rendered text is identical across all
three values. Not fixed: making the KPIs class-scoped is feature work, not a defect fix, and
needs an owner's call on what "focus" should mean for a cross-class queue.

**D-04a — /teacher/reports.** Worse than inert, because the page carries a *second* class
picker. The teacher sees "Class focus: S1 Foundation Group" above a report form still set to
"Class: S3A Mathematics"; the preview fetches and **Save report persists**
`classId=class-s3a-2026`. Confirmed server-side: `GET /api/teacher/saved-reports` returned the
new row as `class-s3a-2026` while the shell displayed S1 Foundation. Fixed in PR #96 by making
`TeacherReportsView` both seed from and follow `?classId`.

Passing on this slice, with server-side confirmation: role gating (student → 307
`reason=teacher-account-required` on all five routes; gradebook CSV export → **403**), gradebook
export content matching the on-screen grid, Save report persisting (controlled count 4 → 5 on a
single click, so no double-submit), analytics class scoping, and no horizontal overflow at
1366x768 / 768x1024 / 375x812 (the gradebook table is correctly inside a scrollable
`overflow-x-auto` wrapper, 301 → 609). The gradebook is read-only in the UI — no grade-entry
inputs — so this slice's only write surfaces are Save report and Create follow-up.

### D-06 — degraded — parent console failures are never announced to assistive tech

**Slice** S12 · **Routes** /parent/messages, /parent/connect · **Persona** Peter's Parent
**Found** 2026-08-03 · **Status** fixed in PR #97

All three failures the parent console can raise — "Could not send this parent message.",
"Could not send reply.", "Invite code could not be linked." — were rendered into a bare red
`<p>` with no ARIA role
([`ParentViews.tsx:917`](../components/parent/ParentViews.tsx:917) and
[`:968`](../components/parent/ParentViews.tsx:968)). Sighted users saw the text; screen reader
users got nothing, so a failed send or failed child link was indistinguishable from a button
that did nothing.

Runtime evidence — invalid invite code:
```
POST /api/parent/children/link      -> 404
document.querySelectorAll('[role=alert],[aria-live]')  -> []      (nothing announced)
the DOM itself: <p class="mt-4 … text-rose-700">Invite code could not be linked.</p>
```
`role="alert"` appeared **zero** times in all of `components/parent/`, while
[`app/login/page.tsx:692`](../app/login/page.tsx:692) already uses
`<p role="alert" className="…text-rose-700…">` for exactly this. The parent console was the
deviation, so the fix is to match the existing convention rather than invent one.

Everything else on this slice passed with server-side confirmation — recorded because a clean
result is worth knowing:

- **Authorization is sound.** A parent gets **404** for any student they are not linked to, on
  both `/api/parent/children/[id]/summary` and `/parent/children/[id]`; teacher and student
  sessions get **403** on every `/api/parent/*` route; students are redirected off `/parent*`
  to `/dashboard`; logged-out users get 307 to `/login`.
- Child selector genuinely re-scopes all four child-scoped routes (content differs per child) —
  it is **not** a repeat of D-04.
- Message compose persists: a sentinel subject and body were both found by re-reading
  `GET /api/parent/messages`.
- Notice filters (All / Pending / Acknowledged) all discriminate, with an honest empty state.
- The `/parent/reports` → "Ask teacher about this report" deep link prefills child, category,
  linked report **and** subject.
- No horizontal overflow at 1366x768 / 768x1024 / 375x812.

### S08 — PARTIAL, no defects found (2026-08-04)

- **Routing.** `/visualization-lab` → `/student/tools/visualizations` (308 — the **seventh** alias
  this session). The lab page is public (200 for guest and student).
- **API gating correct.** `/api/visualization-sessions`: **401** guest, 200 student.
- **No leakage.** Signed-in and guest HTML are identical (391 chars of text) with no
  `HK Student Peter`, `student-peter`, seeded email, or `S3A`.

**Not driven:** the lab's own controls. The pane reported `window.innerHeight === 0`, so
viewport/scroll/visibility measurements were all meaningless — a harder failure than the scroll
problem noted since iteration 6.

Two near-misses on this slice, both resolved by re-testing rather than by reasoning:
1. The page first returned **200 with a zero-byte body**, which reads as a broken route. On
   re-request it returned 44,480 bytes in 0.06s. It was the first-compile artifact already seen
   as curl `000`s in S10/S11. **Re-request before filing an empty or failed response.**
2. The grade rail showed "★ G1 **Your grade**" while the persona is S4 — apparently a wrong-grade
   defect. The browser session was still **Teacher Scott** (grade P1, `US_CA_MATH`) from the
   iteration-12 rate-limit probe; the S4 student's own server HTML carries no such marker.
   **Confirm which session the browser actually holds before reading per-user UI as a defect** —
   `GET /api/me` on the jar takes one command.

### S13 — CLEAN, re-driven 2026-08-08 (registration verified end to end)

The four-step registration wizard (Account type -> Curriculum -> Grade -> Account details) was
never driven before; it is the only public write path in the product.

```
users before: 10
wizard: Student -> California Math Practice Beta -> K -> details -> Create account
users after : 11
new row: student-4271b4ba… | s13-probe-user | s13probe@example.test
```

The account is created, the user is signed in automatically, and `/dashboard` renders
"Welcome back, S13 Probe User" with course **California Math Practice Beta · K** and a K–G12
grade rail — so every wizard selection is reflected in the resulting account, not just the name.

Near-miss (the eleventh): immediately after submit the page still read `/register` with no alert,
which looks like a silent success. It was a **pre-navigation read** — a second check a moment
later showed `/dashboard` and an authenticated session. Same shape as the create-assignment case
in S10. **After a submit that navigates, re-read before concluding anything.**

### S08 — CLEAN, re-driven 2026-08-08 (lab controls driven)

The lab's own controls had never been driven. At 1366x3200 all 32 fit on screen: Reset camera,
Guide, Explore, scene selector, quality selector, transparent-render checkbox, Shot, Video, Pause
and the value selectors. Explore, Guide and a scene change (`overview` -> `curve-detail`) all
registered.

**Activity is recorded server-side.** The lab posts to `/api/learning-events`, and the newest row
is the visit itself:

```json
{"user_id":"student-peter","type":"page-view","source":"visualization-lab",
 "grade":"S4","topic_id":"student-tools-visualizations-functions"}
```

Two near-misses, both resolved without filing:

1. `visualization_sessions` and `visualization_events` were **0 after driving the lab**, which
   reads as a P0 silent-failure. The network recorder settled it: the page issues
   `GET /api/visualization-sessions` (a **read**) and never posts one — sessions are a different
   concept from lab browsing. What it *does* post is `learning-events`, which lands correctly.
2. `learning_events` filtered by `student_id` returned **0** while the collection held 22 rows —
   it keys on **`user_id`**. That is the **fifth** collection in this app to key on `user_id`
   where `student_id` was the natural guess (after attempts, mistakes, reward ledger, and the
   assignment attempts). At this point it is the house convention, not an exception.

Also confirms iteration 17's call: the grade rail reads **"S4 Your grade"** for this student, so
the earlier "G1 Your grade" really was Teacher Scott's session and not a defect.

### S07 — CLEAN, no defects found (2026-08-04)

- **Routing.** `/classroom`, `/classroom/join`, `/messages`: 200 student / 307 guest. `/forum` is
  a public page, but `/api/forum` and `/api/messages` are **401 for guests**, 200 for the student.
- **Forum class scoping is correct.** `student-peter` is enrolled only in `class-s3a-2026`
  (confirmed in `class_enrollments`), and authenticated `GET /api/forum` returns exactly
  `[class-s3a-2026]` with `activeClassId: class-s3a-2026`. No cross-tenant class leakage.
- **Forum write verified end to end.** `POST /api/forum` → 200 with the thread, sentinel present
  in `app_state.payload`, and visible again via `GET /api/forum`.

**Near-miss — the sixth, and the one that would have been most damaging.** The guest `/forum`
page renders "Class space **S3A Mathematics** / **Mainland S4 Mathematics** / 3 threads / 1
teacher replies", and `Mainland S4 Mathematics` belongs to a *different* teacher
(`teacher-mainland-phoebe`). That reads as unauthenticated cross-tenant class enumeration — a
security finding. **It is not.** `ForumWorkspace` initialises its class list from a **statically
imported constant**, [`data/forum.ts:3`](../data/forum.ts:3) `forumClassSpaces`, which is
hardcoded demo copy checked into the repo; the authenticated fetch only runs
`if (settingsReady && currentUser)`. A guest is seeing placeholder text, not database rows.
**Reading the data source is what settled it — the page content alone was actively misleading.**

**Observation, not filed as a defect (not induced):**
[`ForumWorkspace.tsx:81`](../components/forum/ForumWorkspace.tsx:81) is
`setClasses(payload.classes.length ? payload.classes : forumClassSpaces)` — so if `/api/forum`
returns an empty class list (or the fetch throws), a signed-in student falls back to the demo
constant and would be shown **another teacher's class as if it were theirs**. Plausible from the
code, but I could not induce the failure, so it is recorded here rather than filed. Worth a
one-line fix if an owner touches this file: fall back to an empty state, not to demo data.

### S06 — CLEAN, no defects found (2026-08-04)

The graded, student-visible write surface — the slice most likely to hide a P0. It holds up.

**The full teacher→student→teacher loop is verified**, which no earlier slice had closed:
1. The assignment created during the S10 drive (`S10-DRIVE-PROBE-7731`) appears in this student's
   `/api/assignments` list — teacher-created work reaches the student.
2. `POST /api/assignments/assignment-quadratics-checkpoint/submissions` with a sentinel answer →
   the `submissions` row moves `in-progress` → `late` with `submitted_at` set, and the answer
   persists in `assignment_submission_attempts`:
   `{"attempt_number":1,"kind":"initial","input_type":"text","answer_text":"S06-DRIVE-PROBE-5512 …"}`
3. The teacher's assignment **detail** page then contains that sentinel — the student's answer is
   visible to the teacher who set the work.

**Authorization and answer-key handling are correct:**
- `/api/assignments` and `/api/assessments/[id]` → **401** for a guest, 200 for the student.
- `/student/assignments/[id]` returns 200 to a guest but is a **client-rendered shell** (466
  chars, byte-identical signed-in vs guest, "Checking your…") — the data is behind the gated API,
  so no server-side leak.
- The assessment payload withholds the key: no `correctAnswer` / `answerKey` / `solution`. The
  `answer`-ish fields present are `showAnswersImmediately: false`, `isAnswerVisible: false` per
  question, and the student's **own** submitted answers. Correct.
- `/assessment/[id]` → 307 alias to `/student/assessments/[id]`.

Near-miss (the **fifth** of this class): `submissions.answer_text` is `null` after a successful
submit, which reads exactly like a P0 silent-failure. It is not — `submissions` holds the
status/score envelope and **`assignment_submission_attempts` holds the answers**. Found by
searching the whole payload for the sentinel and then locating which collection contained it.
**Search the store for your sentinel before concluding a write was dropped**; guessing the
collection name has now produced five false alarms this session.

### S05 — CLEAN, no defects found (2026-08-04)

First slice this session verified end to end with **no** blocked controls.

- **Routing.** `/primary-roadmap` → `/student/roadmap/primary` and `/secondary-roadmap` →
  `/student/roadmap/secondary` (308 aliases — bringing the session's alias count to six). The
  `/student/roadmap/*` pages are public (200 for guest and student alike).
- **No leakage on the public pages**: signed-in and guest HTML are identical (1551 chars), and
  neither contains `HK Student Peter`, `student-peter`, the seeded email, `S3A`, or an invite
  code.
- **Map controls all work**, verified against the map's computed transform scale:
  `0.2399 → + → 0.3599 → + → 0.4799 → − → 0.3599 → Fit Map → 0.2412`. Monotonic, reversible, and
  Fit restores the fit scale.
- **Full screen** toggles its own state (label → "Exit full screen"). `document.fullscreenElement`
  stays false, which is expected in an embedded pane — recorded as UI-state-verified, not as
  proof the Fullscreen API fired.
- **Viewports.** No page overflow at 1366x768 / 768x1024 / 375x812. At 768 the zoomed map extends
  past the viewport inside a non-scrollable container, which looks like a layout defect but is a
  zoom state: **Fit Map recovers it** (map right edge 1354 → 676, inside a 753px viewport), and at
  375 it fits at 327 with all four controls present.

Method note — this slice produced the session's **fourth** near-miss of the same kind. The first
oracle (`document.querySelector('svg')`) returned an *icon* with `viewBox="0 0 128 128"`, so the
zoom buttons appeared to do nothing. The map is `viewBox="0 0 4680 1480"`. **Identify the element
the control actually targets before measuring it** — of the five "control does nothing"
observations this session, four were the wrong oracle and only one (D-04) was a real defect.

### S13 — PARTIAL, no defects found (2026-08-03)

**Guest gating is correct.** Public surfaces `/`, `/about`, `/register`, `/forgot-password`,
`/reset-password`, `/login` all 200 for an anonymous visitor; the two that require a session —
`/change-password` and `/classroom/join` — 307 to `/login?next=…`.

**Login error mapping is correct and worth recording**, because it disproves a claim this ledger
previously carried (see the correction under D-11):

| condition | API | `reason` | message shown |
|---|---|---|---|
| wrong password | 401 | `invalid` | "Check your email/username and password." |
| rate limited | 429 | `error` | "Could not log in yet. Try again in a moment." |
| storage unavailable | 503 | (from body) | setup-specific copy |

**Not driven:** the register / forgot-password / reset-password form submissions themselves, and
the viewports. Attempting to observe the 429 message live also failed for an environmental
reason worth knowing: the rate-limit counter lives in a **module-level in-memory Map**
(`consumeInMemoryRateLimit`), and Next dev's HMR re-instantiates it, so an exhausted limit
silently resets mid-session. **Rate-limit behaviour cannot be reliably driven against `next dev`
— use a production build.**


#### S03 section buttons RESOLVED 2026-08-08 — not dead controls

Previously undeterminable because the pane cannot scroll. Settled by **intercepting the scroll
call** instead of watching the viewport: patch `Element.prototype.scrollIntoView` and
`window.scrollTo`, click, and read what the handler asked for. Each button targets its own
correctly-named anchor:

| button | scrollIntoView target |
|---|---|
| 1.1 Concept explanation | `lesson-section-functions-concept` |
| 1.2 Worked example | `lesson-section-functions-worked-example` |
| 1.3 Interactive lab | `visualization` |
| 1.4 Practice check | `lesson-practice` |

**This technique retires the "scroll controls are unverifiable" limitation recorded since
iteration 18** — and applying it to S04's "Start Mission" immediately exposed **D-12**, a real
dead control that had looked merely unverifiable for four iterations. A control that *attempts*
the right scroll and one that attempts nothing are indistinguishable on a frozen pane; the
interceptor tells them apart.

### S03 — PARTIAL, no defects found (2026-08-03)

**Routing clean.** `/lesson` → `/student/lessons` (308 alias) → `/student/lessons/functions` for an
authenticated student; logged-out gets `/login?next=…`. Lesson slugs (`functions`,
`coordinate-geometry`) are 200 for the student and 307 logged out.

**The answer chain is verified end to end — the most valuable result on this slice**, and it also
covers the mutation S04 could not reach. Submitting a deliberately wrong answer to `q7`:

```
POST /api/attempts {"questionId":"q7","selectedAnswer":"FF-LOOP-WRONG-ANSWER","durationSeconds":7}
  -> {"correct":false,"correctAnswer":"7","explanation":{…}}
attempts   -> {"user_id":"student-peter","question_id":"q7",
               "selected_answer":"FF-LOOP-WRONG-ANSWER","is_correct":false,"duration_seconds":7}
mistakes   -> {"question_id":"q7","correct_answer":"7","wrong_attempts":1,"mastered":false}
GET /api/mistakes -> 1 entry, questionId q7
```

Graded, persisted, mistake recorded, and surfaced by the API. Also worth recording: **the
questions API withholds the answer** — `GET /api/questions` returns `prompt`/`options` with no
`answer`/`correctAnswer` field, so the client cannot read the key before submitting.

**Not verified:** the lesson's 1.1–1.4 section navigation. All four sections render
**simultaneously** on one 3266px page with real anchors (`lesson-section-functions-concept` at
234, `lesson-practice` at 2317), so those buttons are **scroll-to-anchor controls, not tabs** —
byte-identical `innerText` across clicks is the expected result, not a defect. With the pane
unable to scroll, their effect is undeterminable. This is the **second** instance of the S04
"Start Mission" trap; the S04 note is what prevented filing a false dead-control here.

Near-miss worth keeping: attempts first appeared unpersisted (count 0) because I queried
`$.student_id` — the attempts and mistakes records key on **`user_id`**. Always dump one raw
record before trusting a count query.

### S11 — PARTIAL, no defects found (2026-08-03) — first drive of Teacher Phoebe

**Routing** (phoebe / logged-out / student) on `/teacher/operations/notices`,
`/teacher/classroom-sessions`, `/teacher/communications/inbox`, `/teacher/rewards`,
`/teacher/safety`, `/teacher/classes`: **200 / 307 / 307** across the board. Two more legacy
aliases found: `/teacher/live` → `/teacher/classroom-sessions`, `/teacher/inbox` →
`/teacher/communications/inbox`. (That is now four alias routes across the teacher surfaces —
`/teacher/prep`, `/teacher/live`, `/teacher/inbox`, plus `/teacher` → `/teacher/dashboard`.)

**Cross-teacher isolation is enforced** — the highest-value check on this slice, and it holds:

| request | as Teacher Phoebe | as HK Teacher Chan (owner) |
|---|---|---|
| `/teacher/classes/class-s3a-2026` | **404** | 200 |
| `/teacher/students/student-peter` | **404** | 307 → canonical class-scoped URL, then 200 |

Phoebe's own `GET /api/teacher/dashboard` returns only `class-mainland-s4-2026` — she cannot see
Chan's S3A class in her own payload either, so the scoping is in the data, not just the route.

`/teacher/students/[id]` 307ing to `/teacher/classes/[classId]/students/[id]` is correct
canonicalisation, not a broken route — it resolves 200 for the owning teacher.

#### `/teacher/rewards` re-driven 2026-08-04 (iteration 23) — no defects

All 20 controls reachable at 1366x3200. **The award-points write is verified end to end**, with
the persisted row matching every field selected in the form:

```
before: 7 ledger entries, total 145
clicked "Award points" (student "HK Student Peter", reason "Great effort", points 20)
after : 8 ledger entries, total 165

new row: {"amount":20,"reason":"teacher-award",
          "label_en":"Teacher bonus: Great effort",   <- matches the selected reason
          "awarded_by":"teacher-ms-chan","student_id":"student-peter"}
```

Also present and reachable on this page: the Create campaign form, the redemption queue with
Approve/Reject on a pending gift request, student balances, and the reward catalog.

Note on method: the correct ledger field is **`amount`**, not `points` — summing `$.points` gave
a false zero. Same class as the `user_id` / `student_id` slip in S03. It is now four separate
collections in this app whose field names had to be read from a raw row rather than guessed.

#### `/teacher/safety` RE-DRIVEN 2026-08-08 (post-seed) — CLEAN, triage verified end to end

Once PR #103's seed exists the surface is fully drivable, and the whole triage chain holds:

```
baseline           counts {new:1, acknowledged:1, resolved:0, open:2}   tabs discriminate
click Acknowledge  -> {new:0, acknowledged:2, ...}  flag records ackBy "HK Teacher Chan"
type a note + Mark resolved
                   -> {new:0, acknowledged:1, resolved:1, open:1}
                      resolution_note == "S11-RESOLVE-PROBE reviewed with student"
```

Both state transitions persist, the acting teacher is attributed, the free-text resolution note
round-trips exactly, and the filter tabs track the counts. **This is the surface that was
previously recorded as "not drivable" — seeding turned an untestable row into a verified one**,
which is the argument for seeding the remaining thin fixtures.

#### `/teacher/safety` checked 2026-08-04 (iteration 24) — not drivable, no defect (superseded above)

The triage filters read **All (0) / New (0) / Acknowledged (0) / Resolved (0)**, and
`content_safety_flags` is **empty** in the store. So there is nothing to triage — an honest empty
state with the counts shown explicitly, not a broken surface. Recorded as **not drivable**.

That is the fourth S10/S11 surface in a row whose "no behaviour" is an empty-data state
(file-type filter, lesson-kits, review-lessons, safety). Worth stating plainly for whoever reads
this ledger later: **this fixture is thinly seeded outside the student/teacher core, and a
meaningful re-drive of these surfaces needs seeded data first.** Driving them again against the
current fixture will keep producing "not drivable", not new information.

**Still not covered on S11:** live classroom session start, notice composition, and roster
actions. Notices are the one with real data behind them — `teacher_notices` and
`teacher_notice_recipients` both hold 3 rows — so **notice composition is the only remaining S11
surface that can actually be exercised** against this fixture, and it is the natural next target
(it also feeds the parent acknowledgement path fixed in D-07).

### S04 — PARTIAL, no defects found (2026-08-03)

**Routing verified** (student / logged-out): `/practice` 200/200 (public, like
`/personalized-learning`), `/mistake-book` 200/307, and all four
`/games/{math-master-blaster,math-match-quest,math-virus-blaster,mighty-tank-battle}` 200/200,
plus `/student/practice/games/{adventure-island,fishing-master}` 200/200.

Two of my own mis-tests, corrected rather than filed:
1. `/games` and `/student/practice/games` return 404 — **correctly**. Both are container
   directories with no `page.tsx`; the ledger's `/games/*` notation was right and I had hit the
   bare parents.
2. `/student/practice/games/math-match-quest` 404s **correctly** — that slug belongs to `/games/*`.
   The valid slugs are `adventure-island` and `fishing-master`
   ([`lib/gameBasedLearning.ts:11`](../lib/gameBasedLearning.ts:11)).

**Effects NOT verified — blocked, not passed.** The Practice Arena's "Start Mission" and the
whole answer-submission flow sit below the fold, and **the browser pane could not scroll at all**:
`window.scrollTo`, `document.body.scrollTop` and even `element.scrollIntoView()` were all no-ops
while `documentElement.scrollHeight` exceeded the viewport.

That matters for how "Start Mission" is recorded. Clicking it registered on the element
(`clicks: 1`) yet nothing changed, which looks exactly like a dead control — but
[`app/practice/page.tsx:1989`](../app/practice/page.tsx:1989) shows `handleAdventureStartMission`
only calls `scrollToPracticeSection(...)`. It is a **scroll** control, so "no navigation, no
content change" is the wrong oracle for it, and with scrolling broken in the pane its real
behaviour is **undeterminable**. Filed as nothing. Baseline was `attempts=0, mistakes=0` for
student-peter and no answer was submitted, so there is no effect claim either way.

Re-drive S04 when the pane scrolls, and verify Start Mission by the position of the
`free-selection` / `adaptive-practice-round` section, not by URL.

#### RE-DRIVEN 2026-08-04 (iteration 19) — now CLEAN

Using the tall-viewport workaround (1366x3200), the previously unreachable practice UI was driven
end to end. **The answer flow works through the UI, not just the API:**

```
typed "999" into "Answer from the diagram" for "The graph shows y=f(x). What is f(2)?"
clicked Check Answer
attempts  1 -> 2   new: graph-functions-read-output | "999" | is_correct=0
mistakes  1 -> 2   new: graph-functions-read-output | wrong_attempts=1 | last="999"
```

Question navigation (1–5, Previous/Next, Jump), input-mode switches (Keyboard input, Handwriting
board, Math keyboard), Reset and Read aloud are all present and reachable at this viewport.

**Two more near-misses on this single control** — both were my own mis-clicks reading "no attempt
created" as a silent failure. `clicksSeen: 0` from a counter attached to the button settled it
both times:
1. A `ref`-based click resolved to y=2065, outside the 1895-tall screenshot space.
2. A coordinate read off the screenshot image (y=1330) instead of computed (y=1209).
**At a tall viewport the screenshot and the CSS viewport scale differently — always compute the
click point as `rect * (screenshotWidth / window.innerWidth)`, never read it off the image.**

Still unverifiable: **"Start Mission"**, because it only calls `scrollToPracticeSection` and a
tall viewport leaves nothing to scroll. Not a defect, not verified — unchanged.

### S10 — PARTIAL, no defects found (2026-08-03)

**Marked partial deliberately — do not read this row as full coverage.**

Verified with server-side confirmation:
- **Gating** on all of `/teacher/assessments`, `/assessments/new`, `/assignments`,
  `/assignments/new`, `/lesson-kits`, `/lesson-kits/new`, `/resources`: 200 teacher, 307 logged
  out, 307 student. `/teacher/prep` is a **legacy alias** → `/teacher/lesson-kits`.
- **Create assignment** — the slice's main write — persists exactly what was entered. The probe
  used a deliberately non-default checkbox pattern so stored values are distinguishable from
  defaults, and the row came back
  `class_id=class-s3a-2026, allow_retake=1, show_answers=0, count_towards_grade=1` — matching
  the form, including the unchecked `show_answers`.

**Extended in iteration 7** once the pane recovered: `/teacher/assessments/new` is a four-step
wizard ("1. Setup / 2. Select / 3. Custom / 4. Preview") and **all four step buttons are live** —
each renders distinct content (1024 / 2222 / 919 / 885 chars) and returning to step 1 restores
its original content exactly. Viewports clean on that page at 1366x768 / 768x1024 / 375x812. Its
save path already has CI cover ("assessment wizard saves a draft and reopens it for editing",
green in `teacher-parent-e2e`).

#### PARTIALLY RE-DRIVEN 2026-08-04 (iteration 20) — `/teacher/resources` now covered

With the tall-viewport workaround (1366x3200) every control on `/teacher/resources` was reachable
(19 controls, `allInVp: true`). **The filters do filter** — verified by list-content diff:

| filter | picked | resource list |
|---|---|---|
| grade | `K` | changed (400 → 315 chars) |
| topic | `p1-counting-number-bonds` | changed (400 → 315) |
| file type | `PPTX` | **unchanged** |

The file-type result looks like a dead control and is not: the select's only options are
`["all", "PPTX"]` — PPTX is the sole file type among this teacher's resources, so selecting it
legitimately shows the same list. The options are derived from the data, so the control cannot
be exercised further without a second file type. (The `PDF`/`DOCX` strings elsewhere on the page
belong to the **upload** form's accepted-types copy, not the resource list — checking that
distinction is what settled it.)

Not driven: the resource **upload** form. It needs a real file in an `<input type=file>`, and
file upload/download is outside what this loop should do unattended.

#### `/teacher/lesson-kits` covered 2026-08-04 (iteration 21) — no defects

All 9 controls reachable at 1366x3200. `classId` produces **byte-identical** pages across
`all` / `class-s3a-2026` / `class-s1-foundation-2026` — the D-04 dead-control shape exactly.

**It is not a dead control.** There are **zero** lesson kits: `teacher_lesson_kits` is empty in
the store, and the page itself reports "Lesson kits 0 · Needs review 0 · Published 0". An empty
list filters to an empty list. The empty state is also honest about *why* — "Lesson kit authoring
currently covers Mainland (PEP / BNU) textbook chapters. Kits for your course's textbooks are on
the roadmap." — so for an HK teacher there is nothing to author yet.

This is the second consecutive filter that looked dead and was not (after the file-type filter in
iteration 20). **Both were caught by the same check: confirm the underlying collection is
non-empty before reading "identical output" as a broken filter.** A filter over an empty set is
indistinguishable from a filter that does nothing, and only the data tells them apart.

#### `/teacher/review-lessons` checked 2026-08-04 (iteration 22) — not drivable, no defect

`/teacher/review-lessons` is a container directory holding only `[reviewLessonId]`, so its own
404 is correct (same shape as `/games` in S04). Guest requests to both it and a child id are
**307** to login, so gating is right.

It cannot be exercised: `review_lessons`, `teacher_review_lessons` and
`parent_safe_review_lessons` are **all empty** in the fixture, so there is no valid
`reviewLessonId` to open. Recorded as **not drivable**, not as pass or fail.

**S10 is now closed as clean, with two explicit exclusions** — neither is an unknown:
1. the resource **upload** form (needs a real file; unattended upload is out of remit), and
2. `/teacher/review-lessons/[id]` (no seeded data).
Everything else in the slice was driven: assignment creation persisted with exact field values
(iteration 6), the assessment wizard's four steps (iteration 7), the resources filters
(iteration 20), and the lesson-kits empty state (iteration 21).

The browser pane
froze mid-slice (`computer` scroll timed out with "The Browser pane is currently hidden", after
which `window`, `body` and every candidate container reported unscrollable while the document
was taller than the viewport). Rather than drive blind, the create-assignment submit was
completed via the form's own `requestSubmit()` — which exercises the real submit handler and
validation — and that is recorded here rather than presented as a click.

One near-miss: after that submit the UI showed no confirmation and did not navigate, which looks
like a silent success. It is not — the handler does
`router.push('/teacher/assignments/${id}')` on success
([`TeacherManagementViews.tsx:2084`](../components/teacher/TeacherManagementViews.tsx:2084)); the
frozen pane simply never rendered the navigation. **Re-drive S10 before trusting it**, and treat
a frozen pane as a stop condition for UI verdicts, not a reason to infer them.

### S02 — clean, no defects filed (2026-08-03)

Recorded because a clean slice is a result, not an absence of work.

- **Routing.** `/progress` 307→login when logged out, 200 for the student. `/learning-path` is a
  **308 permanent alias** to `/student/roadmap`; `/adaptive-learning` is a **307** to
  `/personalized-learning`. Both resolve 200 when followed — legacy aliases, not broken routes.
- **`/personalized-learning` is public (200 logged out).** Checked for leakage: server HTML is a
  473-char client-rendered shell, byte-identical logged-out vs signed-in, and probing it for
  `HK Student Peter`, `student-peter`, the seeded email, `S3A` and `Quadratic` found nothing in
  either. No server-side leak.
- **`/progress` is read-only** (14 controls, all shell chrome) and renders server state
  faithfully — `GET /api/progress?grade=S4&window=7d` returns `progressMetrics` whose
  `value`/`trend` pairs match the rendered tiles exactly.
- **"Night mode"** on `/personalized-learning` persists: label flips to "Day mode", `html.dark`
  applies, and `settings.theme` re-reads as `dark` from `/api/me`.
- No horizontal overflow; no console errors.

Two self-corrections on this slice, both caught before they became filed defects:
1. `/api/progress` looked empty (`progressMetrics: null`, `masteryAreas: []`) — I had parsed the
   top level while the payload nests under `"progress"`. The data was there and matched the UI.
2. "Night mode" looked like a dead control — my click had missed by ~113px. A DOM-derived
   coordinate and a click-counter probe on the element showed the handler firing normally.
   **Always attach a click counter to the element before calling a control dead.**

### D-13 — test-coverage — a practice-page regression suite runs nowhere, and is already RED

**Found** 2026-08-08 (while fixing D-12) · **Status** filed, not fixed

[`app/practice/practiceArenaPageRegressions.test.ts`](../app/practice/practiceArenaPageRegressions.test.ts)
is referenced by **no runner and no CI job**, and unlike D-10's dormant file this one is
**already failing**: *"Practice Arena renders the mission trail with tappable stepping stones"*
asserts `data-testid="mission-trail"`, which the page no longer renders. Reproduced on plain
`origin/main` (19/20) — nothing to do with D-12's change.

So a regression guard for the Practice Arena has been broken for some time and `validate` stays
green, because nothing executes it.

**This also means D-12's own regression tests currently gate nothing.** They were added to this
file — the natural home, since it already asserts on this page's source — before I checked whether
anything runs it. That was the D-10 mistake repeated: *check the file is executed before trusting
a test added to it.* The D-12 fix itself is landed and correct; only its guard is inert.

Fix shape: `test:source-regressions` is the semantically right gate (it already runs a
source-regression suite). Adding this file to it changes an npm script body, so it needs the same
reviewed governance re-freeze as D-10 — now a known procedure. Then fix or delete the stale
`mission-trail` assertion.

**The wider pattern is now three-for-three:** every `*.test.ts` outside `components/**` that this
loop has touched — `userStoreParentNoticePersistence`, `authRouteGuards`/`contentSafetySeed`, and
now `practiceArenaPageRegressions` — was run by nothing. Only `components/**` has a
discovery-based gate. **The durable fix is discovery for `lib/**` and `app/**`, not another
hand-added entry.**

#### D-13 QUANTIFIED 2026-08-08 — it is 105 files and 952 tests, not one file

Measured rather than estimated, by listing every `*.test.ts` under `lib/` and `app/` and checking
whether any runner, tsconfig or CI job references it:

| | count |
|---|---|
| test files under `lib/` + `app/` | **156** |
| referenced by a runner / CI | 51 |
| **orphaned — executed by nothing** | **105** |
| tests inside those orphans | **952** |
| **currently FAILING** | **7** |

The seven red tests, all invisible to CI today:

- `California practice and onboarding surfaces do not render Primary/Secondary grade labels`
- `California lesson entry does not expose candidate-only lesson seeds as live lessons`
- `questions route uses the lightweight public question store`
- `Practice Arena renders the mission trail with tappable stepping stones` (the one found via D-12)
- `student activity persistence records question attempts and updates mistake rows through fake storage`
- `teacher ops operations persistence builds teacher dashboard data through extracted storage selection`
- `questionStore stays decoupled from authenticated app_state storage`

**This is why discovery cannot simply be switched on.** Doing so turns `validate` red immediately —
which is exactly what `scripts/run-component-tests.mjs` warns about in its own header ("when this
gate was first assembled four of the `components/lesson` suites were red"). The component gate's
authors hit this and fixed the suites first.

**Recommended sequencing for an owner:**
1. triage the 7 — each is a real assertion about California grade labels, question-store
   decoupling, persistence or the practice page; fix or delete, do not skip silently;
2. then add a discovery-based gate for `lib/**` and `app/**` modelled on the component gate,
   which needs one reviewed governance re-freeze (procedure now established by #100);
3. after that, 952 tests defend the codebase instead of decorating it.

The prize is large and cheap: **952 existing tests, already written and 99.3% green, currently
protecting nothing.**

### D-12 — dead-control — Practice Arena "Start Mission" scrolls to an id that never renders

**Slice** S04 · **Route** /practice · **Persona** HK Student Peter · **Found** 2026-08-08
**Status** filed, not fixed

"Start Mission" is the Practice Arena's primary call to action. It registers a click and then
does nothing.

[`app/practice/page.tsx:1978`](../app/practice/page.tsx:1978) `scrollToPracticeSection` looks its
target up with `document.getElementById(targetId)` and silently `continue`s when the element is
absent. Both branches of `handleAdventureStartMission`
([`:1989`](../app/practice/page.tsx:1989)) can pass `"free-selection"` — and **no element with
that id is ever rendered**.

Verified by intercepting the scroll rather than watching the viewport (the pane cannot scroll):

```
click "Start Mission"      -> clicks=1, scrolls=[]        (handler ran, no scroll attempted)
click lesson 1.1/1.2/1.3/1.4 -> each fires scrollIntoView on its own anchor   (control comparison)

document.getElementById("free-selection")        -> null
document.getElementById("adaptive-practice-round") -> present
ids on the page: practice-adventure-hero, practice-adventure-title,
                 adaptive-practice-round, practice-question-jump
```

The destination is not missing — the practice question UI (including **Check Answer**) sits
*inside* `#adaptive-practice-round`. Only the id being asked for is wrong.

**Fix shape (small).** `scrollToPracticeSection` already takes varargs `...targetIds` precisely so
callers can supply a fallback chain, but every call site passes a single id. Passing both, e.g.
`scrollToPracticeSection("free-selection", "adaptive-practice-round")`, makes it land on the
section that exists.

An effect-asserting test should assert the **scroll target**, not that the button is clickable —
clickability is exactly what made this look healthy for four iterations.

#### D-11 UPDATE 2026-08-08 — the fix helped but did NOT eliminate the failure

The rate-limit override is on main and correctly wired
(`HK_MATH_E2E_LOGIN_IDENTIFIER_MAX=400` in `playwright.config.ts`,
`loginIdentifier: { max: loginIdentifierMaxFromEnv() }`), and yet
`parent-console.spec.ts:360` failed again with the identical signature —
`helpers.ts:173`, stuck at `/login`, 18–19 polls.

**It is a flake, proven on one commit:** branch `docs/ff-ledger-d12` produced a **success at
05:47** and a **failure at 05:48** from the same tree (the `push` and `pull_request` runs). A
docs-only markdown change cannot cause or fix this.

So the earlier conclusion needs correcting: **the login rate limit was an amplifier, not the root
cause.** Exhausting it turned an occasional flake into a hard, confusing failure, and removing
that amplifier made failures rarer — recent history is overwhelmingly green — but something
underneath still intermittently prevents the login redirect.

**Do not treat D-11 as closed.** Remaining suspects, in the order worth checking:
1. the hydration gate — `handleSubmit` returns early while `!isHydrated`, so a click landing
   before hydration is swallowed with no feedback (the spec clicks as soon as the button exists);
2. first-request compilation/cold-start latency on the e2e server, which has produced
   `000` statuses and a 0-byte response elsewhere in this ledger;
3. residual per-IP limiting (`loginIp` max 300) if runs overlap.

The cheapest next probe is (1): assert the submit button is enabled *and* no longer reads
"Preparing secure login" before clicking, then see whether the flake disappears.

#### D-12 CLOSED 2026-08-08 (PR #109) — with an evidence correction

Fixed by following the file's own convention: `handleAdventureStartMission` now passes
`adaptive-practice-round` and `mission-setup-filters` as fallbacks, exactly as its sibling
`scrollToPracticeSection` call sites already did.

**The runtime evidence originally filed for D-12 was invalid.** "Click produced no
`scrollIntoView`" proved nothing, because `scrollToPracticeSection` wraps its work in
`requestAnimationFrame` and the verification pane reports `document.visibilityState === "hidden"`,
where **rAF never fires**. Under that condition every scroll control looks dead — including the
fixed one, which is how the error surfaced.

That also **partially retracts iteration 25's claim** that scroll interception "retires the
scroll-controls-are-unverifiable limitation". It retires it only for handlers that call
`scrollIntoView` synchronously. Anything deferred through rAF (or `setTimeout` in a throttled
hidden tab) remains unverifiable in this pane, and a negative result there means nothing.

D-12 stands on static evidence instead, which is independent of the pane: `"free-selection"` is a
`PracticeSummaryMode` and is never rendered as an element id, and this was the only
`scrollToPracticeSection` call site without a fallback.

**Generalised lesson, now twice in one day** (after the D-11 rate-limit conclusion): when a probe
reports failure for something that should work, suspect the probe. Both bad conclusions shared a
tell — a result that stayed the same when it should have changed.

### D-11 — degraded (test reliability) — the parent auth-boundary e2e fails on a cold database
**Status: FIX OPEN in PR #101** (2026-08-04, at the owner's direction — option (c), the env-gated
override). `HK_MATH_E2E_LOGIN_IDENTIFIER_MAX` is read only by `loginIdentifierMaxFromEnv()` and
set only in `playwright.config.ts`'s webServer env. It **cannot lower** the ceiling: unset, empty,
non-numeric, zero and negative all fall back to the production default, and any value below it is
clamped up. Verified at runtime both ways on the same server — without the variable attempt 13
still 429s; with it, attempts 13–16 pass.

**Follow-up still required:** `lib/server/authRouteGuards.test.ts` sits in `lib/server/**`, which
nothing runs — so its six safety tests are dormant until #100's `test:parent-console` gate lands
and the file is added to `tsconfig.parent-console.json` and the runner. A dormant safety test on a
security control is worse than none; do not consider D-11 closed until that is done.

**Residual risk, recorded deliberately:** this is still an env-gated loosening of a brute-force
control. Option (a) — giving the heavy specs their own registered accounts via the existing
`registerStudentViaApi` — touches no security surface and remains the stronger long-term fix.


**Found** 2026-08-03 (while clearing PR #98) · **Status** filed, not fixed

[`tests/e2e/parent-console.spec.ts:360`](../tests/e2e/parent-console.spec.ts:360) — *"auth
routing and parent API boundaries are enforced"* — fails against a **freshly seeded** database
and passes against a warm one. It is the gate for parent authorization boundaries, so a gate
that flips on DB warmth cannot be trusted in either direction.

Established by a local A/B under identical conditions (fresh DB, server restarted between runs,
same spec, same command):

| variant | code under test | result |
|---|---|---|
| A | PR #98 branch (with the acknowledgement fix) | ❌ failed |
| B | `origin/main`'s `parentNoticePersistence.ts`, nothing else changed | ❌ **failed identically** |

Variant B is the important one: **the failure reproduces without the change under test**, which
is what exonerated PR #98. A second run against the now-warm DB passed.

The failure point is not stable either — observed as both
`expect(GET /api/parent/foundation).status()).toBe(403)` at spec line 386 and
`toHaveURL` at [`helpers.ts:173`](../tests/e2e/helpers.ts:173) — which is itself characteristic
of a race rather than a fixed logic error.

#### Root cause found 2026-08-03 (iteration 10): the per-identifier login rate limit

`authRateLimitRules.loginIdentifier` is **`{ max: 12, windowMs: 15 min }`**
([`lib/server/authRouteGuards.ts:24`](../lib/server/authRouteGuards.ts:24)) and is keyed on the
login identifier. Verified directly against a running server — the 13th consecutive login for one
identifier flips to 429 and stays there:

```
attempt 12 -> 200
attempt 13 -> 429
attempt 14 -> 429
```

A 429 leaves the browser sitting on `/login` (the submit handler renders an error and does not
navigate), which is **exactly** CI's `18 × unexpected value "http://127.0.0.1:3020/login"` at
`helpers.ts:173`.

The `teacher-parent-e2e` job drives ~20 logins against just **four shared demo identifiers**:

| identifier | login call sites in that job |
|---|---|
| `Peter's Parent` | 6 |
| `HK Teacher Chan` | 7 (4 in parent-console + 3 in teacher-workspace) |
| `HK Student Peter` | 1 |

`parent-console.spec.ts` is `describe.serial` **and Playwright retries failed tests**, so one
flake re-runs whole tests and burns more logins on the same identifiers. That is the amplifier:
a single initial flake pushes `Peter's Parent` past 12, every subsequent login 429s, and the
symptom presents as "auth routing is broken" — which is why it looked like a product defect and
why it moves around between assertions.

**Correction to the earlier entry:** the local A/B in iteration 9 reproduced a *different*
manifestation — dev-server route compilation blowing the 60s test budget (only 4 poll attempts in
30s, and `Test timeout of 60000ms exceeded`). Its conclusion still holds (both variants failed
identically, so PR #98 was not the cause), but it was **not** the same failure CI hit. The
rate-limit mechanism above is the CI one.

**Deliberately not fixed here, and why.** The obvious fix is an env knob to raise the limit for
e2e — but that means adding an override to a **brute-force protection control**, which is not a
change an automated loop should make unilaterally (the same reasoning that stopped D-10's
governance edit). Options for an owner, cheapest first:
- **(a)** spread the load: give the heavy specs their own registered accounts (the suite already
  has `registerStudentViaApi`) instead of reusing `Peter's Parent` / `HK Teacher Chan`. Pure test
  change, no security surface.
- **(b)** reuse an authenticated `storageState` instead of re-logging in per test — biggest
  reduction, but changes what the auth-routing test actually exercises, so not for that spec.
- **(c)** an env-gated limit override defaulting to the production value, set only in the
  Playwright `webServer` env alongside the existing `AI_TUTOR_MAX_REQUESTS_PER_MINUTE=2`.
  Smallest diff, but it is a security control — needs a human decision.

Worth noting for triage: the limit is doing its job. The defect is that the **test suite looks
like an attacker** to it.

> **Correction (iteration 12).** This entry originally added "and a 429 is indistinguishable in
> the UI from a wrong password (D-09)", and iteration 10's log repeated it as the reason D-11 took
> three iterations to diagnose. **That claim is wrong for the login page.**
> [`AppProviders.tsx:895-897`](../components/providers/AppProviders.tsx:895) maps only 400/401 to
> `reason: "invalid"`; a 429 falls through to `reason: "error"`, which
> [`app/login/page.tsx:446`](../app/login/page.tsx:446) renders as
> **"Could not log in yet. Try again in a moment."** — distinct from
> "Check your email/username and password.", and it even hints at retrying.
>
> So the app did surface the right signal. D-11 took three iterations because **I never opened the
> Playwright failure screenshot**, which would have shown that message. That is a process failure
> on my side, not an app defect. D-09 remains valid **as originally filed** — it is about the
> *parent* forms (`/parent/connect`, `/parent/messages`) collapsing every non-OK status into one
> message — and its priority is correspondingly lower than iteration 11 claimed.
>
> Process rule from this: **read the failure artifact (screenshot / error-context.md) before
> theorising about a UI-visible failure.** Playwright writes both on every failure.

Why it was invisible until now: `validate` and the e2e jobs only run on `pull_request`, so `main`
carries no standing signal, and the one `workflow_dispatch` control run on `main` happened to win
the race and go green. **Do not read a green main run as proof this test is sound.**

Fix shape: find what the first cold-DB request races with (lazy seeding in
`createInitialDatabase()` is the obvious suspect, given `mutateDatabase` clears the read cache and
re-reads on every mutation) and make the spec await a deterministic ready state instead of
tolerating it. A test that passes only on the second run is worse than no test.

### D-10 — test-coverage — an entire persistence test file is run by nothing
**Status: MERGED — PR #100 landed 2026-08-08 03:09Z.** The `test:parent-console` gate now runs in
`validate`. Three `lib/server/**` test files feed it, each verified by negative control rather
than assumed:

| test file | guards | negative control |
|---|---|---|
| `userStoreParentNoticePersistence.test.ts` | D-07 receipt idempotency | revert the fix → 7/8 red |
| `authRouteGuards.test.ts` (#101) | the D-11 override cannot weaken the limit | drop the `Math.max` floor → 11/14 red |
| `contentSafetySeed.test.ts` (#103) | demo-off never seeds safety alerts | drop the `shouldSeedDemoUser()` guard → 10/11 red |

**Status: RESOLVED for this file in PR #100** (2026-08-04, at the owner's direction). The
governance allowlist was re-frozen as a reviewed change: `test:parent-console` added to
`allowedScriptChanges`, hash `ca0774f1…` → `84168d8d…` recomputed with the gate's own algorithm,
runner and tsconfig restored verbatim from #98, and a `validate` step added. Verified the gate is
real: reverting D-07's fix turns it red (7/8), restoring turns it green (8/8) — so **D-07's
regression tests now gate merges**.

Implementation note for anyone repeating this: the gate reads `package.json` **from a git
object**, not the working tree, so the new script must be committed before the gate will pass.

**Still open — the durable half:** there is no discovery-based gate for `lib/server/**`, so the
next orphaned test file rots identically. `scripts/run-component-tests.mjs` already solved this
for `components/**` by discovering rather than listing.


**Found** 2026-08-03 (while fixing D-07) · **Status** partially addressed in PR #98

[`lib/server/userStoreParentNoticePersistence.test.ts`](../lib/server/userStoreParentNoticePersistence.test.ts)
contains six tests that **no runner and no CI job executes**. The `scripts/run-*.mjs` gates use
hand-kept explicit file lists (e.g. `run-accommodations-tests.mjs` names five files), CI
`validate` runs an explicit list of npm scripts, and nothing globs `lib/server/**`. So the file
has been dead weight — and any regression test added to it would have been decorative.

**PR #98 tried to wire that one file into a new `test:parent-console` gate, and the attempt was
rejected by another control — which is itself the finding.**
[`scripts/release-governance.test.mjs:2284`](../scripts/release-governance.test.mjs:2284) pins
the set of package scripts against a frozen baseline commit *and* sha256-pins the bodies of the
allowed changes:

```
AssertionError: Only the reviewed A10/A22 release and runtime commands may differ
from the frozen baseline
```

So adding **any** npm script — including a test-only one — requires editing a hash-pinned
allowlist and re-freezing the hash. That is exactly the reviewed change the gate exists to
force, so the wiring was withdrawn from PR #98 rather than edited around. **An automated loop
must not quietly edit a governance allowlist to make its own change pass.**

The consequence is recorded rather than hidden: D-07's regression tests ship in PR #98 but
**gate nothing**, because their file is still run by nothing.

**Decision needed from an owner** — pick one:
- **(a)** add `test:parent-console` to `allowedScriptChanges` and re-freeze the sha256, restoring
  the runner and tsconfig from PR #98's history;
- **(b)** add the test file to an existing gate's file list — no `package.json` change, so no
  governance collision, at the cost of a misleadingly-named gate;
- **(c)** give `lib/server/**` a discovery-based gate the way `scripts/run-component-tests.mjs`
  already does for `components/**`. This is the only option that fixes the class rather than the
  instance.

`scripts/run-component-tests.mjs` solved exactly this for `components/**` by discovering rather
than listing, and its header comment says why:

> Tests nobody runs rot silently — when this gate was first assembled four of the
> `components/lesson` suites were red…

**Next step for an owner:** audit `lib/**` and `app/**` for `*.test.ts` files that no runner
references, then convert the hand-kept lists to discovery the way the component gate does.

### D-07 — broken-effect — re-acknowledging a notice silently rewrites the receipt timestamp

**Slice** S12 · **Route** /parent/notices · **Persona** Peter's Parent · **Found** 2026-08-03
**Status** **FIXED — PR #98 merged 2026-08-03 13:18Z** (runtime-verified: repeat POST returns 200,
`acknowledged_at` unchanged). Its regression tests still gate nothing until **D-10** is resolved.

`POST /api/parent/notices/[recipientId]/ack` on an **already acknowledged** notice returns 200
and moves `acknowledged_at` instead of being a no-op
([`parentNoticePersistence.ts:387-412`](../lib/server/userStore/parentNoticePersistence.ts:387)).

Verified directly:
```
recipient notice-recipient-f65cd8e6-…
before       : 2026-08-03T10:15:09.443Z
POST …/ack   : 200
after        : 2026-08-03T10:28:13.439Z     <- receipt of record moved
```

`acknowledged_at` is the evidence of *when* a guardian confirmed a school notice. A double
click, a retry, a refresh or a back-button re-submit rewrites it, and the original confirmation
time is unrecoverable. In a school-compliance context ("did the parent acknowledge before the
deadline?") that timestamp is the whole point of the record.

Fix shape: make the ack idempotent — if `status` is already `acknowledged`, return the existing
row unchanged rather than re-stamping. A regression test should assert the timestamp is
**unchanged** after a second POST, not merely that the second POST returns 200 (asserting the
status code is exactly the appearance-level check that let this through).

### D-08 — degraded — the "All children" reports pill resolves to the first child

**Slice** S12 · **Route** /parent/reports · **Persona** Peter's Parent · **Found** 2026-08-03
**Status** **fixed in PR #99** (2026-08-04) — `selectedChild` is now `null` for an unscoped
request, matching `parentNoticePersistence`. Both UI copy branches, previously unreachable, now
render. An existing test asserted the defect and was corrected, not deleted. Its tests still
gate nothing until **D-10** is resolved.

The "All children" pill links to `/parent/reports` with no params
([`ParentViews.tsx:603`](../components/parent/ParentViews.tsx:603)), and with no `studentId` the
server falls back to `children[0]`
([`parentReportPersistence.ts:125-129`](../lib/server/userStore/parentReportPersistence.ts:125)):

```
GET /api/parent/reports                              -> selectedChild: student-peter
GET /api/parent/reports?studentId=student-does-not-exist -> selectedChild: null
```

So the control labelled "All children" silently selects child #1, and only an **invalid** id
reaches the unscoped view. The `"All linked children are shown"` string at
[`ParentViews.tsx:594`](../components/parent/ParentViews.tsx:594) is unreachable.

**Scoped honestly:** in this fixture both views return the same single report, because the
second linked child has zero parent-summary reports (the pills read "HK Student Peter 1" /
"Student Shirleen 0"). So I confirmed the wrong *selected child*, but could **not** demonstrate
missing reports — that needs a fixture where child #2 has reports, which would mean creating
teacher-side data outside this slice. Downgraded from the P0 the recon proposed to **degraded**
for that reason. `/parent/notices` implements the same pill correctly
([`parentNoticePersistence.ts:332-339`](../lib/server/userStore/parentNoticePersistence.ts:332)),
so there is an in-repo reference for the fix.

### D-09 — degraded — every non-OK response on parent forms shows one misleading message

**Slice** S12 · **Routes** /parent/connect, /parent/messages · **Found** 2026-08-03
**Status** filed, not fixed this iteration (source-confirmed; no runtime probe run)

[`ParentViews.tsx:930-944`](../components/parent/ParentViews.tsx:930) discards the response body
and maps **any** `!response.ok` to "Invite code could not be linked."; compose/reply do the same
with "Could not send this parent message." The link route is rate limited
([`app/api/parent/children/link/route.ts`](../app/api/parent/children/link/route.ts)), so a 429
tells the parent their code is invalid — they will retype a correct code and fail again. 413 and
500 collapse the same way. Confirmed by reading the handler, not by burning the rate limit.

### Unverified this iteration (recon-proposed, NOT confirmed — do not treat as filed)

The S12 recon proposed two further P0s that I did **not** reproduce, listed so the next
iteration can settle them rather than inherit them as fact:

- **Compose/reply bricking on a fetch rejection** — `ParentViews.tsx:731`/`:755` do
  `setIsSending(true)` then an unguarded `await fetch` with no try/catch, so a network rejection
  would leave the button disabled reading "Sending…" forever. Source shape is real; the runtime
  behaviour was not induced. Settle by failing the request in-page and watching the button.
- **`router.push` not committing on /parent/messages** — recon reported the URL keeping the
  previous thread id. Recon itself flagged this as observed only under dev Fast Refresh. Settle
  against a production build before filing; two client-read races in iteration 3 produced
  exactly this kind of false reading.

### D-05 — degraded — a rejected mutation still rewrites the entire state blob

**Slice** S09 · **Found** 2026-08-03 · **Status** filed, not fixed this iteration

[`mutateDatabase`](../lib/server/userStore.ts:4766) calls `writeSqliteDatabase(database, …)`
unconditionally, regardless of what the mutator returned. A mutation the store *rejected*
therefore still rewrites the whole ~29MB `app_state.payload`.

Reproduced with idle drift controlled for:
```
idle baseline            : 52
after 9s idle            : 52     <- stable, so the deltas below are real
PATCH /api/me/profile {"name":"x"}  -> HTTP 400
after rejected PATCH     : 53
PATCH /api/me/profile {"name":"y"}  -> HTTP 400
after 2nd rejected PATCH : 54
```

Consequences: a full-blob write per rejected request; `app_state.revision` is unusable as a
"something actually changed" oracle (it advances on failures); and each write re-triggers the
D-01 demo re-seed. The postgres branch of the same function has the identical shape.

### D-03 — degraded — grade radiogroup announced "Select grade" while every option is disabled

**Slice** S01 · **Route** /dashboard · **Persona** HK Student Peter · **Found** 2026-08-03 · **Status** fixing this iteration (bundled with D-01)

[`components/dashboard/DashboardGradeSelectorGrid.tsx:123`](../components/dashboard/DashboardGradeSelectorGrid.tsx:123)
hardcodes `aria-label={t({ en: "Select grade", ... })}` while passing
`locked={Boolean(fixedStudentGrade)}` to all 12 tiles, so for every student the group is
announced as selectable but nothing in it can be selected.

The sibling component already gets this right —
[`components/ui/GradeSelector.tsx:371`](../components/ui/GradeSelector.tsx:371) switches
to `{ en: "Fixed grade", zh: "固定年級" }` when `gradeLocked`. The lock itself is correct
behaviour (a student's grade is fixed by enrolment), so this is a labelling defect, not a
dead control — verified by reading `GradeSelector.tsx:276-277`, not by clicking.

## Legacy e2e anchor audits

### A-01 — `tests/e2e/app-shell-auth.spec.ts:131-134` (fixed-grade dashboard tiles)

**Audited** 2026-08-03 · **Verdict** partially effect-asserting → upgraded in PR #95.

The anchor asserted the real effect (`toBeDisabled()` on the fixed tile plus S1 and S4,
`aria-checked="true"` on the fixed grade) but never asserted what the group *announced*,
which is how D-03 shipped: the tiles were correctly locked while the radiogroup told
assistive tech "Select grade". Behaviour was covered, affordance was not.

Upgraded by adding, at both poles so it cannot pass vacuously:
- `getByRole("radiogroup", { name: "Fixed grade" })` in the fixed-grade case (line ~135)
- `getByRole("radiogroup", { name: "Select grade" })` in the Student Jon selectable case
  (line ~162), where the tiles genuinely are enabled

Both were validated at runtime against a worktree dev server before landing, so the
selectors are known to resolve rather than merely to type-check.

### A-02 — `tests/e2e/console-readonly-audit.spec.ts:42` (`/teacher/reports` route matrix)

**Audited** 2026-08-03 · **Verdict** APPEARANCE-ONLY → guard added elsewhere in PR #96.

`expectUsableRoute` is the purest example of the class this loop hunts. For every teacher
route it asserts only: status < 400, a heading is visible, no not-found heading, exactly one
`<main>`, and `main` text longer than 40 characters. It never re-reads state, never checks a
response body, never touches a control. D-04a lived comfortably underneath it — `/teacher/reports`
renders its heading and plenty of text while the Class focus control silently targets the wrong
class.

It is worth keeping as-is: it is a broad smoke matrix over ~14 routes and turning it into an
effect suite would be the wrong shape. The fix instead went where behaviour is already asserted —
[`tests/e2e/teacher-workspace.spec.ts:173`](../tests/e2e/teacher-workspace.spec.ts:173), which
already drives the reports form and waits on real responses:

```ts
await page.goto("/teacher/reports?classId=class-s1-foundation-2026");
await expect(page.getByRole("combobox", { name: /^Class focus$/i })).toHaveValue("class-s1-foundation-2026");
await expect(page.getByRole("combobox", { name: /^Class$/i })).toHaveValue("class-s1-foundation-2026");
```

Both accessible names were confirmed against the running app before the assertion was written,
and `^Class$` is anchored so it cannot also match "Class focus".

### A-03 — `tests/e2e/parent-console.spec.ts:500` (invalid invite code)

**Audited** 2026-08-03 · **Verdict** APPEARANCE-ONLY → upgraded in PR #97.

The spec as a whole is one of the better ones in the repo — it re-reads `guardianLinksFor()`,
checks the foundation payload, and proves link idempotency. But its failure-path assertion was:

```ts
await expect(page.getByText(/Invite code could not be linked/i)).toBeVisible();
```

`getByText` matches the text regardless of how it is exposed, so it passed happily while the
message was announced to nobody — it is the assertion D-06 shipped underneath. Upgraded to
`await expect(page.getByRole("alert")).toHaveText(/Invite code could not be linked/i)`, which
resolves only if the role is really present; confirmed at runtime against the fixed build
before landing.

General lesson for this ledger: **`getByText` is an appearance assertion; `getByRole` is closer
to an effect one.** Worth sweeping other specs for failure-path assertions that use `getByText`.

Noted for a future iteration — `tests/e2e/helpers.ts:99` `logoutIfVisible()` is the weakest
remaining anchor in this slice: its whole logout claim rests on
`await expect(page).toHaveURL(/\/login/)`, which D-02 shows a live session satisfies, and
when no logout control is found it returns with **zero** assertions, making "logged out"
and "the control was never found" indistinguishable. It is the account-switch mechanism in
~20 specs.

## Iteration log

- 2026-08-02 — iteration 1 (bootstrap): ledger created at commit 52d1a1b53c. Slice picked: S01 (all rows untested; auth+dashboard is the highest-criticality untested row). Persona rotation pointer: student → next iteration starts teacher.
- 2026-08-03 — iteration 2: **S01 auth-student-core** driven (persona HK Student Peter, server
  `mais-dev-ff-loop` port 3410). Iteration 1 only bootstrapped the ledger and never verified
  S01, so S01 was still the correct target despite the rotation pointer; auth gates every
  other slice.

  Drove all 31 interactive controls on `/login` and ~50 on `/dashboard`. Passing with
  server-side confirmation: bad-password (401 + surfaced `role=alert` + button re-enabled),
  login (200 + `hk_math_session` + `/api/me` 200), 5-step onboarding tour, theme toggle
  (`settings.theme="dark"` re-read), language switch (`settings.language="zh"` re-read and
  restored), UI logout (redirect + browser session 401), unauthenticated `/dashboard` → 307
  to `/login`. No console errors. No horizontal overflow at 1366x768 / 768x1024 / 375x812.

  Filed D-01 (env-only), D-02 (P0), D-03 (degraded, fixed in PR #95). Audited legacy anchor
  A-01 and upgraded it.

  Two corrections worth carrying forward, both from checking rather than assuming:
  1. All 12 grade tiles being disabled looked like a dead-control cluster; reading
     `GradeSelector.tsx:276-277` showed the lock is intentional. The real defect was the
     label, not the lock.
  2. D-01 first looked like a general P0 (name dropped, avatar persisted). The avatar had
     only been read before the next cold load, and a real registered user is unaffected —
     it is demo-seed re-sync, not a broken store.

  Harness caveat: `computer{action:"key"}` cannot trigger implicit form submission here —
  `Return` arrives with `key:""` and `Enter` arrives trusted with `defaultPrevented:false`
  but fires no `submit`. Enter-to-submit on `/login` is therefore **unverified**, not
  failing. Use clicks. Also, ref-based clicks went stale after re-render; derive coordinates
  from `getBoundingClientRect() * (800 / window.innerWidth)`.

  **Carry-over — do this first next iteration:** PR #95 was opened with all local gates green
  (`type-check`, `check:imports`, `test:components` 267/267) but CI was still pending at
  hand-off. `main` requires the `validate` check and **0** approving reviews, so once
  `validate` is green the PR lands with no human gate:
  ```bash
  gh pr checks 95 && gh pr merge 95 --squash --delete-branch
  git worktree remove /Volumes/Starship/MAIS-profile-name-wt && git worktree prune
  ```
  The worktree `/Volumes/Starship/MAIS-profile-name-wt` is deliberately still present —
  per `CLAUDE.md` it is removed the day the branch lands, and a stale worktree fails the
  A25 release lifecycle gate, so it must not be left beyond that.

  Persona rotation pointer: student → **next iteration starts teacher** (S09 teacher-core,
  persona HK Teacher Chan).
- 2026-08-03 — iteration 3: carry-over landed (PR #95 merged at 09:25Z once `validate` went green
  after 21m20s; worktree `MAIS-profile-name-wt` removed and pruned). Then **S09 teacher-core**
  driven (persona HK Teacher Chan, server `mais-dev-ff-loop` port 3410).

  57 controls enumerated on /teacher/dashboard and every control across the other four routes
  driven. Filed D-04 (dead-control, two routes) and D-05 (degraded). D-04a fixed in PR #96;
  audited legacy anchor A-02.

  Three near-misses worth carrying forward — each one a wrong conclusion caught by re-checking:
  1. On /teacher/analytics the shell select *looked* broken (URL lost the param, select snapped
     back to "all"). It was a stale snapshot taken mid-navigation; the a11y tree a moment later
     showed both selects correctly on S3A. Client-side reads during a Next.js navigation are not
     trustworthy — settle with a second read or an accessibility-tree read.
  2. Two uuid saved-reports existed after one click, which looked like a double-submit. A
     controlled count (4 → 5 on a single click) refuted it; the extra row came from a recon
     subagent driving the same fixture. **Recon agents with shell access mutate the live dev DB —
     never assert on absolute counts in this fixture, only on deltas measured around your own
     action.**
  3. D-05 was reported by recon as also involving idle drift of `revision`. Idle drift did **not**
     reproduce here (stable at 52 across 9s), so the rejected-write finding was re-derived from a
     controlled before/after instead of taking the agent's account.

  Persona rotation pointer: teacher → **next iteration starts parent** (S12 parent-console,
  persona Peter's Parent).

  Carry-over discharged in iteration 4: PR #96 merged 10:01Z, worktree removed and pruned.
- 2026-08-03 — iteration 4: carry-over landed (PR #96 merged; `teacher-parent-e2e` passed, which
  is the job that exercises the `teacher-workspace.spec.ts` assertion added in #96). Then
  **S12 parent-console** driven (persona Peter's Parent, server `mais-dev-ff-loop` port 3410).

  All six routes driven. Filed D-06 (fixed in PR #97) and audited legacy anchor A-03. **This
  slice is otherwise clean, and its authorization is genuinely sound** — see D-06 for the
  passing list; that result is worth trusting because it was probed with real cross-tenant ids,
  not inferred.

  Two fixture hazards hit again, both already predicted by iteration 3's notes:
  1. `guardian_links` gained a second row (`relationship: "father"`, uuid id) **mid-drive** —
     created by a recon subagent driving /parent/connect. My first cross-tenant probe used
     `student-shirleen-us` as an "unlinked" control and got 404; minutes later it was legitimately
     200 because the link now existed. Authorization was therefore re-verified against
     `student-li-mainland` and `student-jon-us-ca-super`, which remain unlinked. **Pick
     cross-tenant control ids that no connect flow can plausibly link, and re-read
     `guardian_links` immediately before asserting.**
  2. `/api/parent/reports` and `/api/parent/foundation` returned curl status `000` on first hit —
     that is a dev-server first-compile exceeding the client timeout, **not** an HTTP status and
     not a defect. Both returned 200 on retry (5.0s and 5.4s). Warm every route before treating a
     failure as real.

  Also worth carrying: the fastest way to reach a verdict on a filter/scope control turned out to
  be a **server-side HTML diff** across parameter values (fetch each variant, strip tags and
  timestamps, compare). It is immune to the mid-navigation client-read races that produced two
  false readings in iteration 3.

  Persona rotation pointer: parent → **next iteration returns to student** (S02
  student-progress, persona HK Student Peter — the stalest untested student row).

  **Carry-over — do this first next iteration:** PR #97 was opened with local gates green
  (`type-check`, `test:components` 279/279).

  **CI needs a re-run, and the reason matters.** On run `30805148108` both `validate` and
  `teacher-parent-e2e` failed — but both failed at the **"Install dependencies"** step, before
  reaching any code or test, while `snapshot` passed on the same commit. That is npm/runner
  flake, not a real failure, and specifically it is **not** the modified
  `parent-console.spec.ts` failing — that spec never ran. `gh run rerun --failed` was rejected
  because `visualization-browser` was still in progress at hand-off.

  **Resolved in iteration 5.** The re-run confirmed the install failures were flake — `validate`
  passed. But `teacher-parent-e2e` then failed at the *test* step, and it was **my assertion's
  fault**, not flake:

  ```
  strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <p role="alert" …>Invite code could not be linked.</p>          <- the fix, working
    2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div>
  ```

  Fixed by filtering on the message text, which keeps the role assertion meaningful (it still
  fails if the fix is reverted) while ignoring the framework's empty announcer.

  **Lesson worth keeping — dev-server verification cannot see production-only DOM.** The
  original assertion *was* validated at runtime before landing, and it showed exactly one alert,
  because `__next-route-announcer__` is rendered by the production build the e2e suite runs
  against (`npm run start`) and not by `next dev`. Runtime verification on a dev server is
  necessary but not sufficient for a Playwright locator — prefer locators that are specific by
  construction (filter by text/testid) rather than ones that depend on a element being unique on
  the page.

  Also note `mergeStateStatus` was **UNSTABLE**, not BLOCKED: only `validate` is required, so
  this PR *could* have been merged with the e2e job red. Do not merge on UNSTABLE without
  reading which job failed.
- 2026-08-03 — iteration 5: diagnosed and fixed PR #97's e2e failure (see the note above — it was
  my assertion, not flake, and the dev-vs-prod DOM difference is the lesson). Pushed
  `55065a2f59`; CI re-running at hand-off.

  Then drove **S02 student-progress** (persona HK Student Peter): **clean, no defects** — see the
  S02 section under Defects for what was checked and the two self-corrections.

  No fix cluster this iteration: S02 produced no defects, and the iteration's fix budget had
  already gone on correcting #97. The open defects with the clearest fix shapes are **D-07**
  (idempotent notice ack — smallest, and a real data-integrity win) and **D-08** (All-children
  reports pill, with `parentNoticePersistence.ts:332-339` as the in-repo reference).

  Persona rotation pointer: student → **next iteration starts teacher** (S10 teacher-content or
  S11 teacher-ops-live, both untested).

  Carry-over discharged in iteration 6: PR #97 merged 11:29Z (all five checks green, including
  `teacher-parent-e2e` at 10m55s — the scoped assertion passes), worktree removed and pruned.
- 2026-08-03 — iteration 6: landed PR #97. Drove **S10 teacher-content** (HK Teacher Chan) —
  **partial, see the S10 section**; the browser pane froze mid-slice and the row is marked
  partial rather than clean.

  Fix cluster: **D-07** (idempotent notice acknowledgement) in PR #98 — chosen over anything
  marginal in S10 because it is a confirmed data-integrity defect with a small, unambiguous fix.
  Runtime-verified both before and after on the same recipient.

  Filed **D-10** on the way: the regression test would not have run. Its whole file is
  referenced by no runner and no CI job, so PR #98 also adds a `test:parent-console` gate. Six
  dormant tests come into CI with it.

  Standing rules added to this ledger from earlier iterations, restated because they keep paying:
  attach a click counter before calling a control dead; check `inViewport` before clicking
  (S10's submit was below the fold at y=848 in a 768px viewport, which is why the first submit
  never fired); and prefer a server-side HTML diff over client reads for filter/scope verdicts.

  Persona rotation pointer: teacher → **next iteration starts student** (S03 lesson-surfaces or
  S04 practice-games, both untested), and **S10 should be re-driven** to finish its uncovered
  routes.

  Carry-over resolved in iteration 7 — but not as expected, see below.
- 2026-08-03 — iteration 7: PR #98's first CI run failed **two** jobs, both real, neither flake.

  1. **`validate` → release-governance gate.** The new `test:parent-console` npm script tripped
     the frozen package-script baseline. The gate sha256-pins the bodies of allowed script
     changes, so adding any script means editing a hash-pinned allowlist — the reviewed change
     the control exists to force. **The wiring was withdrawn rather than edited around**; see
     D-10 for the three options an owner can choose from. The behaviour fix and its tests stayed.
     Consequence recorded honestly: D-07's regression tests now gate nothing until D-10 is
     resolved.
  2. **`teacher-parent-e2e`** — exactly one test failed, `parent-console.spec.ts:360 › auth
     routing and parent API boundaries are enforced`, stuck at `/login` across ~19 retries.
     Notably `teacher-operations.spec.ts:147 › teacher sends notice and parent confirms MAIS
     receipt` — which exercises the acknowledgement path this PR changes — **passed**, which is
     the evidence that the fix itself is sound. Whether the auth-routing failure is flake or real
     is settled by the re-run triggered by the revert push; if it fails again on a commit that no
     longer touches CI or package.json, it is a genuine defect and should be filed rather than
     retried.

  Also extended **S10** (see its section) once the browser pane recovered: the assessment wizard's
  four step buttons are live, and that page is clean at all three viewports.

  A rule worth keeping: `git add -A` is denied by `.claude/settings.json` and it correctly
  blocked a staging shortcut here. Stage deletions by explicit path instead.

  Persona rotation pointer: teacher → **next iteration starts student** (S03 lesson-surfaces or
  S04 practice-games, both untested).

  Carry-over continued into iteration 8 — PR #98 still open, see below.
- 2026-08-03 — iteration 8: **`validate` now passes on PR #98** (19m49s), confirming the
  governance revert was the right diagnosis. But `teacher-parent-e2e` **failed a second time**,
  same single test (`parent-console.spec.ts:360 › auth routing and parent API boundaries`, stuck
  at `/login`), on a commit that now touches only `parentNoticePersistence.ts` and its test. So
  it is **not** flake and **not** the CI/package.json edits.

  Causation is still unproven, and PR #98 is deliberately **not merged** on `UNSTABLE` while it
  is. `validate` and the e2e only run on `pull_request`, so `main` has no standing signal —
  a **`workflow_dispatch` control run on `main` with `full_validation=true`** was triggered
  (run `30814653499`) and was still going at hand-off. That run settles it:
  - if the same test fails on plain `main`, the defect is pre-existing, PR #98 is innocent and
    can merge, and the failure gets filed as its own defect;
  - if `main` is green, my change is implicated and PR #98 must not merge until it is understood.

  Evidence so far favours innocence: `teacher-operations.spec.ts:147`, which exercises the very
  acknowledgement path this PR changes, passes — and login cannot plausibly be affected by an
  ack-idempotency guard.

  Drove **S04 practice-games** — **partial**; routing clean, effects blocked by a pane that could
  not scroll (see the S04 section, including a control that looks dead but is a scroll button).

  Persona rotation pointer: student → **next iteration starts teacher** (S11 teacher-ops-live,
  persona Teacher Phoebe — the only untested persona left).

  Carry-over discharged in iteration 9.
- 2026-08-03 — iteration 9: **PR #98 merged 13:18Z**, worktree removed and pruned. No open
  carry-over.

  The control run on `main` came back **fully green**, which pointed *at* my change — the opposite
  of what I expected. Rather than accept either conclusion, I reproduced the spec locally
  (`PLAYWRIGHT_SKIP_WEBSERVER=1` + `PLAYWRIGHT_BASE_URL` lets a spec run against an existing dev
  server, no production build needed — a useful trick for future iterations) and ran a
  **controlled A/B**: same fresh DB, server restarted between runs, only
  `parentNoticePersistence.ts` swapped. **Both variants failed identically**, which exonerated the
  change and produced **D-11**.

  The lesson to carry: a green run on `main` is not proof of innocence when the failure is a race.
  Only the A/B settled it. Merged on that evidence, with the reasoning recorded as a PR comment
  rather than left implicit.

  Filed **D-11** (parent auth-boundary e2e fails on a cold DB, passes warm).

  Open defects now: D-01, D-02, D-04b, D-05, D-08, D-09, D-10, D-11. **D-11 and D-10 are the two
  worth taking next** — both are gate-integrity problems, and a fleet of untrusted gates makes
  every later verdict in this ledger weaker.

  Also drove **S11 teacher-ops-live** (Teacher Phoebe — the last never-driven persona):
  **partial**, routing and cross-teacher authorization clean, controls not driven. **All four
  personas have now been exercised at least once.**

  Persona rotation pointer: all four covered → **next iteration should prioritise the two
  gate-integrity defects (D-11, then D-10) over a new slice**, because every "clean" verdict in
  this ledger is only as trustworthy as the gates behind it. After those, the stalest untested
  rows are S03 lesson-surfaces, S05 roadmaps, S06 student-assess, S07 social-classroom,
  S08 visualization, S13 public-misc.

- 2026-08-03 — iteration 10: no carry-over. Took **D-11** as the cluster and **root-caused it**:
  the per-identifier login rate limit (12 / 15 min) exhausted by ~20 logins across four shared
  demo accounts, amplified by `describe.serial` + Playwright retries. Verified the 429 boundary
  directly against a running server. See D-11 for the evidence and the three fix options.

  **No PR this iteration, on purpose.** Every fix path either (a) refactors ~20 test call sites,
  (b) changes what the auth-routing spec exercises, or (c) adds an env override to a brute-force
  control. (c) is the smallest diff and the reason to stop: an automated loop should not weaken a
  security control unilaterally — the same call made for D-10's governance allowlist. Diagnosis
  handed over instead of a rushed fix. Investigation worktree removed, branch deleted, nothing
  left dirty.

  Also corrected iteration 9's D-11 entry: that local A/B reproduced a **different** failure
  (dev-server compilation exceeding the 60s test budget), not CI's. Its exoneration of PR #98
  still stands, but the two manifestations are now distinguished rather than conflated.

  Persona rotation pointer: unchanged — **D-10 remains the other gate-integrity item**, and the
  stalest untested rows are S03, S05, S06, S07, S08, S13.
- 2026-08-03 — iteration 11: drove **S03 lesson-surfaces** — **partial, no defects**. Routing
  clean and the **answer → attempt → mistake → mistake-book chain verified end to end** via API,
  which is the substantive win (it also covers the mutation S04 could not reach past the pane).

  No fix cluster: S03 produced no defects, and the two open gate-integrity items both now await
  an owner decision rather than more automated work — **D-11** (weakening a brute-force limit vs.
  a 20-site test refactor) and **D-10** (re-freezing a governance hash). Starting a rushed PR on
  either would have been worse than handing over the diagnosis.

  **Highest-leverage open item is now D-09.** It is small and unambiguous, and iteration 10 proved
  its cost: because a 429 renders identically to a wrong password, the D-11 rate-limit root cause
  took three iterations to find. Fixing D-09 first would make the next auth flake diagnosable in
  minutes. Recommended as the next fix cluster.

  Third instance this session of a near-miss caused by a wrong selector/field rather than a real
  defect (see S03's note on `user_id` vs `student_id`). The pattern is consistent enough to state
  plainly: **before filing any "not persisted" or "dead control" verdict, dump one raw record and
  instrument the control.** Two of the three would have been false P0s.
- 2026-08-03 — iteration 12: drove **S13 public-misc** (guest) — **partial, no defects**; gating
  clean, forms not driven.

  **Retracted a wrong claim of my own.** Iteration 10 asserted that a 429 renders identically to
  a wrong password and that this is why D-11 took three iterations. Reading
  `AppProviders.tsx:895` and `app/login/page.tsx:446` shows the opposite: 400/401 → "Check your
  email/username and password.", 429 → "Could not log in yet. Try again in a moment." The app was
  signalling correctly the whole time; I had simply never opened the Playwright failure
  screenshot. The correction is recorded inline under D-11 rather than quietly edited away,
  because the wrong version had already been used to set D-09's priority.

  Consequences: **D-09's priority drops** — it is a real but narrow parent-forms defect, not the
  thing that cost three iterations. And a process rule worth more than either: **read the failure
  artifact before theorising.** Playwright writes `test-failed-1.png` and `error-context.md` on
  every failure; `error-context.md` in particular carries a full accessibility snapshot of the
  page at the moment of failure.

  No fix cluster: S13 produced no defects, and the D-09 fix I had queued turned out to be lower
  value than advertised. Better to hand over an accurate ledger than to spend the budget on a
  fix justified by a claim I had just disproved.

  Next fix cluster recommendation: **D-08** (the "All children" reports pill resolving to
  `children[0]`) — it is unambiguous, has an in-repo reference implementation in
  `parentNoticePersistence.ts:332-339`, and needs no security or governance decision. D-10 and
  D-11 both still await an owner.
- 2026-08-04 — iteration 13: **D-08 fixed in PR #99.** Re-verified the defect before fixing
  (`/api/parent/reports` no-params → `student-peter` vs `/api/parent/notices` → `null`, same
  parent, same request shape), then matched reports to the notices rule.

  Two things worth carrying forward:
  1. **An existing test asserted the defect** — it expected `selectedChild === "student-1"` and
     only that child's reports for an unscoped request, and its name ("returns the default
     child's reports") described the bug. Corrected rather than deleted, with the reasoning in
     the diff. Before overriding a test, check whether it encodes intent or a bug: here three
     independent signals said `null` was intended — the unreachable "All linked children are
     shown" copy, the All-children pill's own active state, and the notices sibling.
  2. **The new tests assert the SPAN of the result, not the selection.** `selectedChild === null`
     alone would still pass with a narrowed report list, which is the same appearance-vs-effect
     trap this loop exists to catch.

  Ledger accuracy note: D-08 was originally filed as possibly-P0 and downgraded to degraded
  because the second child had zero reports in the fixture, so missing reports could not be
  demonstrated. That downgrade was right — the fix confirms the *selection* was wrong, and the
  span consequence is now covered by unit tests rather than by an unprovable field claim.

  Persona rotation pointer: unchanged. Remaining untested rows: **S05 roadmaps, S06
  student-assess, S07 social-classroom, S08 visualization**. Open defects: D-01, D-02, D-04b,
  D-05, D-09, D-10, D-11.
- 2026-08-04 — iteration 14: **PR #99 merged** (16:42Z, all five checks green — `teacher-parent-e2e`
  passed this run, consistent with D-11 being a race rather than deterministic). Worktree removed.

  Drove **S05 roadmaps** — **clean**, and the first slice this session with no blocked controls
  (see the S05 section). Map zoom verified by transform scale rather than by page text.

  No new fix cluster: S05 produced no defects, and D-08 was already this cycle's fix.

  **Slice coverage now: 8 of 13 rows driven** (S01 S02 S03 S04 S05 S09 S10 S11 S12 S13 — five of
  them partial and flagged for re-drive). Remaining untested: **S06 student-assess, S07
  social-classroom, S08 visualization**. S06 is the highest value of the three: assessments are a
  graded, student-visible write surface, which is where the session's only confirmed
  broken-effect (D-07) and P0-shaped defects have come from.
- 2026-08-04 — iteration 15: drove **S06 student-assess** — **clean**, and it closed the
  **teacher→student→teacher loop** for the first time this session: the assignment created during
  the S10 drive reached this student, their submitted answer persisted, and the teacher's detail
  page shows it. Answer keys are correctly withheld and the APIs are 401 for guests.

  Fifth near-miss of the same class — `submissions.answer_text` is `null` after a successful
  submit because answers live in `assignment_submission_attempts`. Rule added: **search the whole
  payload for your sentinel before concluding a write was dropped.**

  No fix cluster: S06 produced no defects.

  **Coverage: 11 of 13 rows driven.** Remaining untested: **S07 social-classroom, S08
  visualization**. S07 is the better next target — `/classroom`, `/forum` and `/messages` are
  multi-user write surfaces, and every confirmed defect this session has come from a write path.

  Standing state at hand-off: no open PR, no worktrees of mine, nothing dirty. Open defects:
  D-01, D-02, D-04b, D-05, D-09, D-10, D-11 — of which **D-10 and D-11 are gate-integrity items
  awaiting an owner decision**, and the rest are product defects with fix shapes recorded.
- 2026-08-04 — iteration 16: drove **S07 social-classroom** — **clean**. Forum class scoping is
  correct (student sees only their enrolled class) and the forum write persists and reads back.

  **Sixth near-miss, and the one that would have been most damaging:** the guest `/forum` page
  displays another teacher's class space, which reads as unauthenticated cross-tenant
  enumeration. It is static demo copy from `data/forum.ts`, not a database read. Filing it would
  have meant reporting a false security defect. **Page content alone was actively misleading —
  only reading the data source settled it.**

  No fix cluster: S07 produced no defects. One un-inducible observation recorded in the S07
  section (demo-data fallback on an empty/failed forum fetch).

  **Coverage: 12 of 13 rows driven.** Only **S08 visualization** is untested. After that the
  backlog is the five partial rows — S04, S10, S11, S13 and S03 — all partial because the browser
  pane could not scroll, not because anything was found wrong. **A re-drive pass on those is worth
  more than a first pass on S08**, since each currently hides its below-the-fold controls.

  Session tally for calibration: **7 defects filed and confirmed** (D-01…D-11 less the retracted),
  **4 fixed and merged** (D-03, D-06, D-07, D-08), and **6 near-misses caught before filing** —
  five wrong-oracle, one static-data-mistaken-for-live. The near-miss rate is the number to watch:
  more candidate defects dissolved under checking than survived it.
- 2026-08-04 — iteration 17: drove **S08 visualization** — **partial**; routing, API gating and
  leakage clean, lab controls not driven because the pane reported `innerHeight === 0`.

  **Every one of the 13 slice rows has now been driven at least once.** Six are partial, and all
  six are partial for the same reason — the browser pane, not the product.

  Two more near-misses (bringing the session to **eight**): a 200-with-empty-body that was a
  first-compile artifact, and a "wrong grade" marker that was the browser holding a *different
  persona's* session than the cookie jar under test. Both rules are in the S08 section.

  **The single highest-value next action is no longer a slice — it is restoring the browser pane.**
  Six rows are partial, D-04b/D-09 remain unverified in-UI, and the pane has degraded twice
  (scroll no-ops since iteration 6, `innerHeight === 0` now). Until it works, this loop can verify
  routing, APIs and persistence — which it has done thoroughly — but not below-the-fold or
  scroll-dependent controls. A fresh session (or a restarted pane) should re-drive S03, S04, S08,
  S10, S11, S13 before any new investigation.

  Open defects at hand-off: **D-01, D-02, D-04b, D-05, D-09, D-10, D-11**. Owner decisions needed
  on **D-10** (governance allowlist re-freeze) and **D-11** (weaken a brute-force limit vs.
  refactor ~20 test call sites); the rest have fix shapes recorded and need no decision.

  Nothing dirty at hand-off: no open PR, no worktrees of mine, no uncommitted source changes.
- 2026-08-04 — iteration 19: spent the iteration on the **binding constraint rather than a slice**,
  and it paid off — see "PANE WORKAROUND FOUND" above. The pane still cannot scroll by any means,
  but `resize_window` restores zeroed dimensions and a **taller-than-document viewport** puts
  every below-the-fold control on screen. Confirmed on `/practice`: the answer UI that had been
  unreachable since S04 — including **Check Answer** — is now clickable.

  No slice re-driven and no fix cluster this iteration; the technique was the deliverable, and
  proving it took the budget. **Next iteration should re-drive the six partial rows using it**, in
  value order: **S04** (practice answer flow), **S10** (lesson-kits / resources / review-lessons),
  **S11** (live classroom, notices, rewards, safety), then S03, S08, S13.

  Honest limit of the workaround: it cannot verify *scroll* controls — S04's "Start Mission" and
  S03's 1.1–1.4 section buttons scroll to anchors, and with everything on screen there is nothing
  to scroll. Those two stay unverifiable until pane scrolling is restored, and must not be
  recorded as verified either way.
- 2026-08-04 — iteration 19: **re-drove S04 with the workaround — it is now CLEAN.** The practice
  answer flow is verified through the UI end to end (typed answer → Check Answer → attempt and
  mistake both persisted with the right question id). The workaround is proven on a real slice,
  not just in principle.

  **Two further near-misses (session total: eight), both on this one control**, and both were my
  own mis-clicks presenting as a silent failure — caught by the click-counter rule, which has now
  paid for itself repeatedly. The new lesson is specific and worth obeying: **at a tall viewport
  the screenshot space and the CSS viewport scale differently; compute the click point from
  `getBoundingClientRect() * (screenshotWidth / window.innerWidth)` and never read it off the
  image.** Both failures came from ignoring that.

  Remaining partial rows to re-drive with the same technique: **S10** (lesson-kits, resources,
  review-lessons), **S11** (live classroom, notices, rewards, safety), then S03, S08, S13.
- 2026-08-04 — iteration 20: re-drove the **`/teacher/resources`** half of S10 with the workaround
  — **no defects**; grade and topic filters both genuinely filter, and the file-type filter's
  apparent no-op is correct (only one file type exists in the data). S10 stays **partial** because
  lesson-kits and review-lessons are still undriven, and the resource **upload** form was
  deliberately skipped — it needs a real file, and unattended file upload is outside this loop's
  remit.

  Ninth near-miss avoided: the file-type filter. The tell was that `PDF`/`DOCX` appear on the page
  only in the *upload form's* accepted-types copy, not in the resource list — **check where a
  string actually comes from before treating it as evidence the filter dropped rows.**

  Next: finish S10 (lesson-kits, review-lessons), then S11, S03, S08, S13.
- 2026-08-04 — iteration 21: covered **`/teacher/lesson-kits`** — **no defects**. Its `classId`
  filter yields byte-identical pages, which is the D-04 dead-control signature, but the store
  holds **zero** lesson kits so an empty list is filtering to an empty list.

  **Tenth near-miss, and the second in a row of the same kind.** Two consecutive filters looked
  dead and were not, both settled by one check: *confirm the underlying collection is non-empty
  before reading identical output as a broken filter.* A filter over an empty set is
  indistinguishable from a no-op filter — only the data separates them. This is now the single
  most productive check in this ledger.

  S10 remains **partial**: `/teacher/review-lessons/*` and the resource upload form are still
  undriven (upload deliberately, as it needs a real file).

  Coverage of the six partial rows: **S04 done (clean)**, **S10 mostly done**, remaining S11, S03,
  S08, S13.
- 2026-08-04 — iteration 22: checked `/teacher/review-lessons` — **not drivable** (all three
  review-lesson collections are empty, so no valid `[reviewLessonId]` exists); gating is correct.
  **S10 now closes as clean** with two explicit, non-mystery exclusions: the resource upload form
  and review-lessons.

  A distinction worth keeping as this loop winds down: three S10 surfaces produced *no observable
  behaviour* — the file-type filter, the lesson-kits filter, and review-lessons — and none is a
  defect. All three are **empty-data states**, not broken controls. Recording them as "not
  drivable" rather than "pass" keeps the row honest: a future iteration with seeded lesson kits or
  review lessons should drive them properly rather than trusting this row.

  Partial rows remaining: **S11, S03, S08, S13**.
- 2026-08-04 — iteration 23: re-drove **`/teacher/rewards`** (S11) with the workaround — **no
  defects**. The award-points write persists with every form field faithfully recorded
  (`amount`, `reason`, `label_en` matching the selected reason, `awarded_by`). See the S11 section.

  Method note worth repeating because it keeps recurring: the ledger field is **`amount`**, not
  `points`, and summing the guessed name returned a convincing **0** — which would have read as
  "awards do not persist". That is the fourth collection in this app whose field names had to be
  read from a raw row rather than guessed. **Dump one row before writing any aggregate query.**

  S11 stays partial: live classroom, notice composition, safety triage and roster actions remain.
  Partial rows remaining: **S11 (partly done), S03, S08, S13**.
- 2026-08-04 — iteration 24: checked **`/teacher/safety`** — **not drivable, no defect**. Triage
  filters read All/New/Acknowledged/Resolved all **(0)** and `content_safety_flags` is empty.

  **This is the fourth consecutive S10/S11 surface whose "no behaviour" is an empty-data state**
  (file-type filter, lesson-kits, review-lessons, safety). That is now a finding about the
  *fixture*, not the product, and it changes what further iterations are worth:

  > **The ff-loop fixture is thinly seeded outside the student/teacher core. Re-driving these
  > surfaces without seeding data first will keep returning "not drivable" rather than new
  > information.**

  **Acted on 2026-08-04 (owner request): `/teacher/safety` is seeded in PR #103** — one `new`
  flag so triage is drivable and one `acknowledged` so the filter tabs discriminate, gated on
  `shouldSeedDemoUser()` so no non-demo deployment ever shows fabricated child-safety alerts
  (asserted first in the test file). Once it lands, **S11's safety triage becomes drivable and
  should be re-driven**.

  Deliberately **not** seeded: lesson-kits (the product documents authoring as
  Mainland-textbook-only, so HK kits would fabricate unsupported state — needs a product decision,
  not a fixture change) and review-lessons.

  The one remaining S11 surface with real data behind it is **notice composition**
  (`teacher_notices` = 3, `teacher_notice_recipients` = 3), which is also the teacher end of the
  parent acknowledgement path fixed in D-07 — the natural next target.

  **Recommendation for whoever picks this up:** the highest-value work is no longer breadth. It is
  (a) the two owner decisions on **D-10** and **D-11**, (b) seeding the fixture so the thin
  surfaces become verifiable, and (c) finding this ledger a tracked home — it is still untracked
  on a branch that belongs to another session.

  **PANE WORKAROUND FOUND (iteration 18) — this unblocks the six partial rows.**

  The pane cannot scroll by any means: `window.scrollTo`, `documentElement.scrollTop`,
  `document.scrollingElement.scrollTop`, `scrollBy` and `element.scrollIntoView()` are all
  no-ops, and `computer{action:"scroll"}` times out with "The Browser pane is currently hidden"
  even while screenshots and coordinate clicks work. `html` *is* the scrolling element with real
  overflow (`scrollHeight` 2228 vs `clientHeight` 768), so this is harness input delivery, not a
  page bug.

  Two things fix it:
  1. If `window.innerWidth/innerHeight` report **0**, call `resize_window` — that alone restores
     sane dimensions.
  2. **Then resize the viewport TALLER than the document** (e.g. `1366x3000`) so nothing is below
     the fold. Verified on `/practice`: viewport 3000 vs document 3065, and the
     `free-selection` section that had been unreachable since S04 moved to `top: 1136`,
     `inViewport: true`. The whole practice UI — question nav 1–5, Previous/Next, Keyboard input,
     Handwriting board, Math keyboard, **Check Answer**, Reset — became clickable.

  Caveat: a tall viewport cannot verify a *scroll* control (S04's "Start Mission",
  S03's 1.1–1.4 section buttons) — with everything on screen there is legitimately nothing to
  scroll. Those stay unverifiable until pane scrolling works. Everything else in the six partial
  rows is now drivable.

  Standing environment note: the browser pane's scroll has been unreliable since iteration 6
  (`window.scrollTo`, `body.scrollTop` and `element.scrollIntoView()` all no-ops while the
  document exceeds the viewport). It blocks any below-the-fold or scroll-based control. When it
  bites, mark the row **partial** — do not infer a verdict.

  If the re-run fails at "Install dependencies" **again**, stop treating it as flake and
  investigate the runner/lockfile — this PR adds no dependencies, so a repeat would point at
  something environmental that the next iteration should file rather than retry around.
