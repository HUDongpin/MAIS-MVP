# Child-data compliance baseline

Status: **partial** — this document covers what landed on
`compliance/child-data-legal-baseline`. It closes prompt 8 of Phase 1 in
`20260818_Claude Suggestions_MAIS.md`. Prompts 9 (email verification), 11
(backup/restore) and 12 (error monitoring) are **not** covered here and are
still open; the platform should not onboard learners outside a controlled pilot
until they are.

## What a data subject can do

| Capability | Endpoint | Notes |
| --- | --- | --- |
| Read the privacy policy | `GET /privacy` | Public, no session. EN / 繁體 / 简体. |
| Read the terms | `GET /terms` | Public, no session. EN / 繁體 / 简体. |
| Export their own data | `GET /api/me/export` | JSON download, credentials redacted. |
| Delete their own account | `DELETE /api/me/account` | Requires body `{"confirm":"DELETE"}`. |
| Export a learner's data (guardian request) | `GET /api/admin/learner-data/<userId>` | Admin role only; learner accounts only. |
| Delete a learner's account (guardian request) | `DELETE /api/admin/learner-data/<userId>` | Admin role only; learner accounts only; requires `{"confirm":"DELETE","userId":"<userId>"}`. |

Admin-assisted endpoints exist so a guardian's request can be serviced without
asking a child for their password. The API verifies the operator's admin role,
not the requester's guardianship; the operator must verify that authority through
the support process before using these endpoints.

## Student account permission

A student account requires either an individual guardian consent record or a
school permission record captured before administrator batch creation. The three
account creation paths enforce this separately:

1. `app/api/auth/register/route.ts` — rejects student registration with HTTP 400
   and `code: "parental-consent-required"` when consent is absent or malformed.
   Validation lives in `lib/legal/parentalConsent.ts`.
2. `authenticateGoogleIdentityForLogin` in `lib/server/userStore.ts` — returns
   `parental-consent-required` rather than provisioning a new child account from
   a bare Google sign-in.
3. School batch provisioning — requires a matching `schoolAuthorization` with an
   explicit administrator confirmation, school code, academic year, school
   approver name, UTC approval time, and an evidence reference. Validation and
   creation both fail without it. The batch and each created student store the
   school permission, its recording admin/time, batch id and policy version.
   The operator must keep and verify the actual school permission associated
   with the evidence reference; this API records the attestation, not the
   permission document itself. Multipart CSV callers supply the authorization
   as a JSON `schoolAuthorization` form field.

The stored record (`users[].parental_consent`) captures who consented, their
relationship to the learner, an optional contact email, and **the version of the
privacy policy in force at that moment** (`lib/legal/policyVersion.ts`). The
version stamp is what makes a later policy change auditable: bump
`privacyPolicyVersion` when the substance changes, and existing consents become
identifiable as pre-dating it.

Public registration does not accept a self-declared `school` relationship.
School permission is recorded only through the authenticated administrator
batch workflow.

### Known limitation: Google sign-up for new learners

A brand-new student account cannot currently be created through Google sign-in,
because the OAuth redirect has nowhere to carry consent that is not a URL, and
putting a guardian's name and email in a query string would leak them through
referrers and logs. Such users are redirected to `/login` with
`googleError=parental_consent_required` and localized copy pointing them at
`/register`, which does collect consent. Existing accounts signing in or linking
a Google identity are unaffected.

The clean fix is to capture consent before the redirect and seal it into the
existing HMAC-signed OAuth state cookie (`lib/server/googleOAuth.ts` already
signs that payload), which keeps it out of the URL entirely. That is a
follow-up, not a hack to bolt on here.

## How deletion works

`lib/server/userStore/accountDeletionPersistence.ts` holds `accountDeletionPlan`
— an entry for **every** table in the `Database` type, each with a rationale
note. Four treatments:

- **subject rows** — the user is who the row is about → removed.
- **cascade rows** — the row hangs off a removed row by id → removed with it,
  resolved to a fixed point so chains (class → assignment → submission → grading
  run) fully unwind.
- **actor fields** — the user only *acted on* someone else's row (a teacher who
  acknowledged another child's safety flag) → the row survives, and only the
  departing user's identifiers and names are cleared. Deleting it would destroy
  the other person's record.
- **list membership** — the id is pulled out of a roster array on a row owned by
  someone else.

Nested and singleton shapes the table rules cannot express (forum threads with
nested replies and me-too rosters, the Nova Lens policy singleton, live-session
attendance and random-call state) have named handlers in the same file.

Deletion runs through `mutateDatabase`, which writes a **full state snapshot**.
That is deliberate: the snapshot write is what re-syncs the Postgres hot-auth and
projection tables with delete-not-in semantics, so the account also disappears
from the read fast paths. A hot-row fast-path write would leave deleted rows
live in those tables.

### Teacher deletion is deliberately blocked

`assessAccountDeletion` refuses to delete a teacher who still owns classes with
enrolled learners or co-teachers, returning HTTP 409 with
`code: "deletion-blocked"`. Cascading through their classes would take other
children's enrollments, submissions and reports with it. Those classes must be
reassigned or archived first. Students and parents are never blocked.

## The completeness guard

`lib/server/userStoreAccountDeletion.test.ts` parses the `Database` type out of
`lib/server/userStore.ts` and asserts that every table appears in
`accountDeletionPlan`, and that no plan entry names a table that no longer
exists. **Adding a new state table without deciding how deletion treats it fails
the test.** That is the point: a deletion claim is only as good as its least
maintained table.

A companion test serializes the whole state after deleting a learner and asserts
their id appears zero times anywhere in it.

## Running the checks

```bash
npm run test:compliance
```

Also wired into `npm run check`. The end-to-end spec covering the public pages,
the consent gate and the export/delete lifecycle:

```bash
npx playwright test tests/e2e/child-data-compliance.spec.ts --project=desktop-chrome
```

## Still outstanding before a real child is onboarded

- **Legal document status.** The owner confirmed legal-professional review of
  the final integrated privacy policy and terms. Both pages show a reviewed
  notice driven by `legalDocumentsReviewedByCounsel`. This document remains
  partial because the operational items below are still open.
- **A published contact address** for data-subject requests — the privacy policy
  currently says one must be published and does not name one.
- **Email verification** (prompt 9) — addresses are still unverified, so a
  guardian's contact email on a consent record is unverified too.
- **Backups and a rehearsed restore** (prompt 11).
- **Error monitoring** (prompt 12).
- **Retention policy for safety records.** Deletion currently removes
  content-safety flags about the departing learner. Whether a school or
  jurisdiction requires those to be retained after erasure is a question for
  counsel; if so, `content_safety_flags` needs a documented carve-out in
  `accountDeletionPlan` rather than silent behaviour.
