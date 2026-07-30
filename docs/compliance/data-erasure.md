# Account deletion and data erasure

**Status:** implemented — closes gap **G1** in [`data-inventory.md`](./data-inventory.md).
**Endpoint:** `DELETE /api/account` ([`app/api/account/route.ts`](../../app/api/account/route.ts))
**Policy source of truth:** [`lib/server/userStore/accountErasurePersistence.ts`](../../lib/server/userStore/accountErasurePersistence.ts)
**Gate:** `npm run test:account-erasure` (wired into CI `validate`)

Satisfies COPPA §312.6, CA SOPIPA, CPRA, GDPR Art. 17, PIPL Art. 47, and the data
destruction clause in standard district DPAs.

---

## 1. What erasure has to reach

MAIS does not keep user data in one place. Erasure spans four stores, and only
the first is reconciled automatically.

| Store | Where | Reached by |
|---|---|---|
| **App-state snapshot** — 80 collections serialized into `app_state.payload` | SQLite (dev) and Postgres (prod) | `eraseUserFromDatabase()` inside `mutateDatabase` |
| **Hot auth tables** — `auth_users`, `auth_student_profiles`, `auth_user_settings`, `auth_password_reset_tokens` | Postgres only | **Automatic.** `syncPostgresHotAuthTablesWith` reconciles them against the snapshot on every write (`deleteMissingPostgresHotAuthRows` deletes rows whose key vanished) |
| **Projection tables** — the 22 `projection_*` tables | Postgres only | **Automatic**, same mechanism (`deleteMissingPostgresProjectionRows`) |
| **Fast-path rows** — `practice_attempts`, `mistake_book_items`, `adaptive_skill_states`, `learning_events`, `learning_event_clears`, `reward_point_ledger` | Postgres only, separate client in `practiceAttemptStore.ts` | **Explicit.** `eraseUserRowsFast()` — these are *not* reconciled from the snapshot |
| **Encrypted media objects** — `AI_MEDIA_OBJECT_STORE_DIR` | Filesystem | **Explicit.** `deleteMediaObjectsForOwner()` |

> The reconciling shadow-sync is the single most important fact about this
> design. Because `syncPostgresHotAuthTablesWith` and
> `syncPostgresProjectionTablesWith` **delete** rows that are no longer in the
> snapshot, correctly mutating the snapshot erases 26 Postgres tables for free.
> The two stores that sit outside that mechanism are the ones that needed
> hand-written deletes, and they are the ones most likely to be forgotten.

### Ordering

`eraseUserAccount()` runs: **media objects → snapshot (transactional) → fast-path rows.**

Media goes first because the snapshot rows naming the object keys are about to
disappear; a crash between the steps must not strand ciphertext that nothing
references any more. If media deletion fails, the account is left wholly intact
and a `503` is returned rather than a partial erasure reported as success.

---

## 2. Hard-delete vs anonymise

Three dispositions. Every one of the 80 snapshot collections carries exactly one,
and `accountErasurePersistence.test.ts` fails the build if a collection is added
without a classification.

### 2.1 Hard delete — the subject's own record and their own work

Removed outright. Covers identity and credentials (`users`, `auth_identities`,
`student_profiles`, `user_settings`, `learner_profiles`,
`password_reset_tokens`, `school_memberships`, `guardian_links`,
`provisioning_row_results`), all learner-generated work and telemetry
(`attempts`, `mistakes`, `lesson_progress`, `adaptive_skill_state`,
`learning_events`, `visualization_*`, `submissions`, `assessment_submissions`,
`classroom_work_samples`, `teacher_live_responses`, the gamification
collections), the AI transcripts (`ai_tutor_messages`, `ai_tutor_usage`,
`nova_lens_runs`), and communications about the subject (`teacher_messages`,
`teacher_message_entries`, `teacher_notice_recipients`, `teacher_reports`).

Two of these deserve their own note:

- **`student_accommodations`** holds IEP/504 data — special-category data under
  GDPR Art. 9. It is deleted, never anonymised.
- **`provisioning_row_results`** carries `temporary_password` in cleartext.
  Leaving roster-import rows behind would leave a usable credential.

### 2.2 Anonymise — records that belong to someone else

The subject's id is replaced with the constant `deleted-user`, paired
`*_name` columns with `Deleted user`, and free text the subject authored is
replaced with a removal marker.

This is **anonymisation, not pseudonymisation**: the id is destroyed rather than
replaced with a reversible token, and every erased subject collapses to the same
marker, so surviving records cannot be re-linked to each other or back to a
person. The result falls outside GDPR Art. 4(1) personal data.

Applied where deleting the row would destroy *other people's* data:

| Collection | Why it survives |
|---|---|
| `teacher_classes` | Deleting the class deletes every enrolled learner's assignments and submissions |
| `assignments`, `assessments` | Other learners' submissions hang off them |
| `assignment_teacher_reviews`, `reward_point_ledger.awarded_by`, `reward_redemptions.decided_by`, `student_accommodations.updated_by` | Decisions recorded on *another* learner's record |
| `teaching_resources`, `teacher_lesson_kits`, `teacher_review_lessons`, `prep_teams`, `prep_team_shares`, `term_archives`, `schools` | School assets, not personal data |
| `teacher_student_groups`, `teacher_learning_paths`, `teacher_live_sessions`, `reward_campaigns`, `teacher_notices` | Contain or serve learners who are not being erased |
| `provisioning_batches` | Roster-import audit trail for the school |

And where an audit trail has to outlive the person, under GDPR Art. 17(3)(b)
(compliance with a legal obligation):

| Collection | What survives | What is destroyed |
|---|---|---|
| `ai_governance_events` | That guardrails ran, and the outcome | The user id |
| `ai_tutor_transcript_access_events` | That an adult opened a child's transcript | Both parties' ids and names |
| `content_safety_flags` | That a safeguarding escalation happened, its category and severity | The child's id and name, **the quoted excerpt of their words**, and the responder's notes |
| `nova_lens_policy_events`, `forum_audit_events`, `forum_reports` | The moderation/policy trail | Actor and reporter identity, and report notes |

**`content_safety_flags` is the contested one.** A self-harm or abuse flag is
both the child's most sensitive personal data and the school's evidence that it
met a duty of care. The chosen split keeps the institutional record — a school
can still show a regulator that a disclosure was detected, triaged, and
resolved — while destroying everything that identifies the child or reproduces
their words. If a district's own policy requires full deletion of safeguarding
records on request, move `content_safety_flags` from
`ACTOR_REFERENCE_COLLECTIONS` to `SUBJECT_OWNED_COLLECTIONS`; the completeness
test will keep passing and the policy table above must be updated to match.

### 2.3 Retain — no user link at all

`topics`, `lessons`, `lesson_blocks`, `questions`, `reward_catalog`,
`deleted_assignment_ids`, `teacher_live_prompts` (teacher-authored text with no
learner reference), and the child rows removed by cascade rather than by direct
match (`assignment_grading_runs`, `class_roster_profiles`,
`teacher_notice_delivery_attempts`).

**`auth_funnel_daily_counters` is retained and needs no anonymisation.** Its
primary key is `(day, event, detail)` with an integer `count` — it has no user
column at any point, so it is already aggregate data and holds nothing to erase.

---

## 3. Structures needing more than a row delete

- **Cascades.** Rows keyed by a parent id rather than by the subject become
  unreachable once the parent goes: `assignment_grading_runs` and
  `assignment_teacher_reviews` (by `submission_id`), `class_roster_profiles` (by
  `enrollment_id`), `teacher_message_entries` (by `thread_id`), and
  `teacher_notice_delivery_attempts` (dropped only when *no* other family
  received the notice).
- **Membership arrays.** `prep_teams.teacher_ids` and
  `teacher_student_groups.member_student_ids` hold bare id arrays; the subject
  is spliced out and the group survives.
- **Live-session tool state.** `teacher_live_tool_states` nests learner ids four
  levels deep — `attendance[]`, `random_call.currentStudentId` /
  `.selectedStudentIds[]`, `buzzer.entries[]`, and `teams.teams[].studentIds[]`.
  Each is stripped; the room and the other learners survive.
- **Forum threads.** A shared class conversation. A thread the subject started
  that nobody joined is deleted outright. A thread others replied to is kept but
  tombstoned — author anonymised, title and body replaced with a removal marker
  in every locale of the `LocalizedText` shape, attachments dropped — so the
  other participants' replies keep their context. The subject's own replies and
  live pulses are removed, and they are spliced out of `meTooUserIds` with
  `meTooCount` decremented.

---

## 4. Media

Both the object store and the legacy inline column are covered:

- **Encrypted objects.** `deleteMediaObjectsForOwner()` deletes by two
  independent routes, because neither alone is sufficient:

  1. **Owner sweep.** It walks `AI_MEDIA_OBJECT_STORE_DIR` and deletes every
     object whose metadata sidecar has `ownerHash === sha256(subjectId)`, with
     its sidecar. Sweeping rather than reading the database catches an object
     whose referencing row had already been removed, which would otherwise
     survive erasure forever. The path prefix is deliberately *not* used as the
     test — it carries only the first 16 hex characters of the owner hash.
  2. **Explicit keys.** Media is owned by whoever **uploaded** it
     (`app/api/media-objects/route.ts` stores `ownerId: authenticated.user.id`).
     A classroom work sample photographed by a teacher is therefore owned by the
     teacher, even though it depicts an erased learner's work, and no sweep for
     the learner would ever find it. `collectErasableMediaObjectKeys()` reads
     the keys off the learner's own rows — `student_profiles.avatar_media_object_key`,
     `assignment_submission_attempts.image_object_key`,
     `classroom_work_samples.image_object_key` — *before* those rows are
     deleted, and they are erased by key.
- **Legacy inline `auth_student_profiles.avatar_image_data_url`** (gap G9) is
  destroyed with its row: the column lives on `student_profiles`, which is a
  hard-delete collection, and the Postgres hot table is reconciled from it.
  The same applies to the inline `image_data_url` on
  `assignment_submission_attempts` and `classroom_work_samples`.

---

## 5. Authorisation

`resolveErasureAuthorization()` returns the basis recorded on the receipt.

| Basis | Who | Rule |
|---|---|---|
| `self` | The account holder | `requester.id === subject.id` |
| `guardian` | A linked parent | A `guardian_links` row with `status === "active"`. Pending or revoked links confer nothing |
| `school-admin` | An admin at the learner's school | Requester and subject share a school, via `users.school_id` or `school_memberships` |
| `platform-admin` | An admin with no school scope | Operator-level access |

Under COPPA the deletion right belongs to the **parent**, not only to the child
holding the login, which is why guardian and school-admin paths exist rather
than a self-service-only endpoint. A **teacher cannot erase a learner** — that
is deliberate; it is a school-administrative act, not a classroom one.

### Seeded accounts are refused

`syncDemoAccountsFromAuthSessionPersistence` and
`syncBootstrapAdminFromAuthSessionPersistence` recreate the demo/example
accounts and the bootstrap admin on **every snapshot read**. Erasing one would
appear to succeed and then silently reappear. The endpoint returns `409
seeded-account-protected` instead of issuing a receipt it cannot honour.

---

## 6. The endpoint

```
DELETE /api/account
Content-Type: application/json

{ "confirmation": "DELETE MY DATA", "subjectId": "<optional; defaults to the caller>" }
```

Erasure is **immediate and irreversible** — there is no soft-delete window,
because a DPA destruction clause has to be technically honourable on request.

- The confirmation phrase guards against a mis-fired client and against a
  cross-site form post (a simple cross-origin request cannot set
  `content-type: application/json`).
- Rate limited to 20 per user per 15 minutes — enough for a school admin
  offboarding a cohort at contract termination, not enough to be useful for abuse.
- The caller's session cookie is cleared when they erased themselves.

Responses: `200` with a receipt; `400` missing confirmation or bad JSON;
`401` unauthenticated; `403` not authorised; `404` no such account;
`409` seeded account; `503` media deletion failed (nothing was erased).

The receipt records the subject, their role, the authorisation basis, the
timestamp, per-collection counts of rows deleted and anonymised, the number of
media objects destroyed, and the fast-path row counts (`null` on SQLite, where
those tables do not exist).

---

## 7. Keeping this honest

The failure mode for erasure is drift: a new collection is added to `Database`
in `userStore.ts`, nobody classifies it, and personal data quietly survives
deletion. Two tests in `accountErasurePersistence.test.ts` prevent that by
reading the live `type Database` declaration and comparing it against the
policy — one fails on an unclassified collection, the other on a policy entry
whose collection no longer exists.

Two further tests assert the outcome directly rather than the mechanism: after
erasing a learner, neither their user id nor any of their free text appears
anywhere in the serialized snapshot.

```bash
npm run test:account-erasure
```

### Not covered here

- **Backups and Postgres PITR.** Erasure operates on live stores. Point-in-time
  recovery windows and any database backup snapshots retain the data until they
  age out; a DPA must state that window. Not addressed by this change.
- **Retention limits** (gap G5) are a separate control: erasure is
  request-driven, retention is time-driven.
- **The LRS forwarding path** (`lib/server/lrsClient.ts`) emits learning events
  to an external Learning Record Store when configured. Erasure does not reach
  a third-party LRS; if one is enabled for a district, its own deletion path has
  to be exercised alongside this endpoint.
