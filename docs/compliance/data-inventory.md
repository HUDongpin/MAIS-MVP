# MAIS — Personal Data Inventory & Subprocessor Map

**Status:** v1, evidence-derived from source. Not legal advice; this is the engineering
input a privacy policy, a district DPA, and a security questionnaire are all written from.
**Generated:** 2026-07-31 against `origin/main` @ `27343c8d7c`.
**Owner:** unassigned — see [Open questions](#open-questions).

Every claim below cites the file it was read from. When code changes, re-derive rather
than edit from memory: the audit commands are in [Re-deriving this document](#re-deriving-this-document).

---

## 1. Scope

MAIS serves K–G12 learners across three curriculum regions (`HK`, `MAINLAND`, `US`)
— `types/index.ts:9`. The US tracks target California, North Carolina, Arkansas and
Florida (`types/index.ts:8`).

This means the platform is in scope for, at minimum:

| Regime | Trigger |
|---|---|
| **COPPA** (US) | Learners under 13 (grades K–P6 by definition) |
| **FERPA** | Records created under a school/district contract ("school official" exception) |
| **CA SOPIPA + AB 1584** | California K–12 tracks |
| **CA CCPA/CPRA** | Consumer-direct (non-district) accounts |
| **PIPL** (China) | Mainland tracks + Mainland-hosted subprocessors |
| **HK PDPO** | Hong Kong track |
| **Section 508 / WCAG 2.1 AA** | US public-district procurement |

> Districts will ask for a signed DPA naming *every* subprocessor in §3, with data
> residency for each. Section 3 is the single most likely item to stall a DPA cycle.

---

## 2. Personal data collected and stored

### 2.1 Primary datastore

Dual-backend: SQLite (`node:sqlite`) in dev, PostgreSQL in production —
`lib/server/userStore.ts:1-6`. Schema is created inline via `CREATE TABLE IF NOT EXISTS`;
there is no Prisma schema or `.sql` migration file to hand an auditor.

### 2.2 Directly identifying fields

| Table | Field | Classification | Source |
|---|---|---|---|
| `auth_users` | `username`, `normalized_username` | Identifier | `lib/server/userStore.ts:3006` |
| `auth_users` | `email`, `normalized_email` | Identifier / contact | `lib/server/userStore.ts:3008` |
| `auth_users` | `password_hash`, `password_salt` | Credential | `lib/server/userStore.ts:3010` |
| `auth_users` | `school_id` | Institutional affiliation | `lib/server/userStore.ts:3012` |
| `auth_users` | `role` | Role (student/teacher/parent/admin) | `lib/server/userStore.ts:3014` |
| `auth_student_profiles` | `name` | **Child's real name** | `lib/server/userStore.ts:3021` |
| `auth_student_profiles` | `grade` | **Age proxy** (K–S6) | `lib/server/userStore.ts:3022` |
| `auth_student_profiles` | `curriculum_region`, `textbook_publisher` | Locale / jurisdiction proxy | `lib/server/userStore.ts:3024` |
| `auth_student_profiles` | `parent_invite_code` | Links child ↔ guardian | `lib/server/userStore.ts:3026` |
| `auth_student_profiles` | `avatar_image_data_url` | **Image, possibly of a child** | `lib/server/userStore.ts:3028` |
| `auth_password_reset_tokens` | `user_id`, token | Credential-reset secret | `lib/server/userStore.ts:3042` |

`grade` is an age proxy precise to roughly ±1 year. Combined with `name` and
`school_id`, these three columns alone make the dataset directly re-identifying for a
minor — treat any export containing them as a student record, not analytics.

### 2.3 Behavioural and generated data (36 tables total)

Full table list is reproducible via the audit command in
[Re-deriving this document](#re-deriving-this-document). The privacy-material ones:

| Table | What it holds | Source |
|---|---|---|
| `projection_ai_tutor_messages` | **Free-text tutor conversation transcripts**, keyed by `user_id`, stored as `JSONB` | `lib/server/userStore.ts:3257` |
| `learning_events`, `projection_learning_events` | Per-question interaction stream | schema scan |
| `practice_attempts`, `projection_attempts` | Answer-by-answer performance history | schema scan |
| `mistake_book_items` | Errors a learner made, retained for review | schema scan |
| `adaptive_skill_states` | Inferred per-skill mastery (BKT posterior) | schema scan |
| `projection_submissions` | Submitted student work | schema scan |
| `projection_teacher_messages` | Teacher↔student/parent messages | schema scan |
| `projection_student_profiles`, `projection_class_enrollments`, `projection_school_memberships` | Roster and enrolment graph | schema scan |
| `auth_funnel_daily_counters` | Auth funnel metrics (aggregate) | schema scan |

**Tutor transcripts are the highest-sensitivity store in the system.** They are
free-text written by children, they are retained indefinitely (§5), and a content-safety
classifier already runs over them precisely because they can contain disclosures of
self-harm, abuse, or crisis. Any DPA must name this store explicitly.

`adaptive_skill_states` holds *inferred* data (a model's estimate of a child's ability),
which several regimes treat as more sensitive than the observations it derives from,
and which is subject to access/correction rights.

### 2.4 Media objects

Uploaded/captured media is stored outside the primary DB, in an object store rooted at
`AI_MEDIA_OBJECT_STORE_DIR`, encrypted at rest with **AES-256-GCM** using
`AI_MEDIA_ENCRYPTION_KEY` — `lib/server/mediaObjectStore.ts:17,124,293`.

Records are rejected unless `encrypted === true` **and** `scanStatus === "passed"`
(`lib/server/mediaObjectStore.ts:280`), and enterprise mode refuses direct data-URL
persistence in favour of the scanned/encrypted object store
(`lib/server/aiGovernance.ts:440`).

*This is the strongest privacy control in the codebase and should be stated prominently
in any security questionnaire.*

Caveat: `auth_student_profiles.avatar_image_data_url` still exists alongside
`avatar_media_object_key` (`lib/server/userStore.ts:3028-3029`), i.e. there is a legacy
path that stores an image inline in the database, outside the encrypted store. Confirm
whether any production rows still populate it before certifying "all media encrypted at rest".

---

## 3. Subprocessor map — data leaving MAIS infrastructure

This is the section districts will scrutinise.

| # | Subprocessor | Endpoint | Data sent | Residency | Source |
|---|---|---|---|---|---|
| 1 | **Alibaba Cloud DashScope (Qwen)** | `dashscope.aliyuncs.com` (HTTPS + `wss://…/realtime`) | Tutor prompts; **raw PCM audio of the learner's voice**; synthesized speech | **PRC** (default host; `-intl`/`-us` hosts exist in code but are not the default) | `lib/server/llmProvider.ts:72,75,131-137`; `app/api/ai-tutor/speech/route.ts:144-181`; `app/api/ai-tutor/voice/route.ts:190-223` |
| 2 | **DeepSeek** | `api.deepseek.com` | Tutor prompts + student free-text questions | **PRC** | `lib/server/llmProvider.ts:70,123-127` |
| 3 | **SimpleTex** | `server.simpletex.cn` | **Images of student handwriting** (math work) | **PRC** | `lib/server/simpletexAuth.ts`; `lib/server/handwritingOcrRouting.ts:74` |
| 4 | **DeepInfra** | `api.deepinfra.com` | Tutor prompts; vision-model inputs (`DEEPINFRA_VISION_MODEL`) | US | `lib/server/llmProvider.ts:81,142-146` |
| 5 | **Mathpix** | `api.mathpix.com` | **Images of student handwriting** (second OCR opinion) | US | `lib/server/handwritingOcrRouting.ts:75` |
| 6 | **Google OAuth** | `accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com` | Scopes `openid email profile`; receives verified email | US | `lib/server/googleOAuth.ts:172,283-286` |
| 7 | **Resend** | `api.resend.com` | Recipient email address + password-reset message | US | `lib/server/passwordResetDelivery.ts:172-185` |
| 8 | **xAPI LRS** | `LRS_ENDPOINT` (customer-configured) | Learning statements — **pseudonymous actor** | Customer-controlled | `lib/server/lrsClient.ts:182-191,282-284` |

### 3.1 The four findings that matter

1. **Children's voice recordings are sent to a PRC-hosted service.** The ASR path
   streams raw PCM audio to DashScope realtime (`app/api/ai-tutor/speech/route.ts:166-172`).
   Voice is biometric-adjacent under several regimes and is a named category in most
   district questionnaires. This is the single hardest item to get through a US district DPA.

2. **Images of student handwriting are sent to a PRC-hosted service.** SimpleTex is the
   *primary* OCR provider, with Mathpix used only as a second opinion
   (`lib/server/handwritingOcrRouting.ts:86-129`). Handwriting samples are student work
   product and can incidentally contain names, doodles, or whatever else is on the page.

3. **There is no region-gated provider routing.** `resolveLLMProviderName()` picks a
   provider from a URL, not from the learner's `curriculum_region`
   (`lib/server/llmProvider.ts:150-153`). A California student's tutor prompt and voice
   go to the same configured provider as a Mainland student's.

   > **This contradicts the "calendar-bound, not effort-bound" framing of the legal
   > track.** Region-gated routing is real engineering work, and a US district DPA
   > will almost certainly require it. It should be scoped now, in parallel with the
   > paperwork, not discovered mid-DPA-cycle.

4. **The LRS integration is done correctly and is worth citing as a positive.** The
   xAPI actor is a derived pseudonymous account name, not an `mbox`/email
   (`lib/server/lrsClient.ts:74-80,282-284`), so learning statements leave the system
   without a direct identifier. Use this as the reference pattern for the other integrations.

---

## 4. Data subjects

| Subject | Minor? | Consent basis needed |
|---|---|---|
| Student (K–P6) | **Yes, under 13** | COPPA verifiable parental consent, or school-authorised consent under a DPA |
| Student (S1–S6) | Mostly 13–18 | School authorisation; CA minor-specific rights |
| Parent/guardian | No | Contract / legitimate interest |
| Teacher | No | Employment / contract |

There is currently **no age gate and no consent capture at registration** — the register
route collects no date of birth and presents no consent control (`app/register/page.tsx`).
`grade` is collected instead, which is an age proxy but is not consent.

---

## 5. Retention and deletion — **the hard gap**

| Data | Retention | Source |
|---|---|---|
| Media objects | **90 days** default, bounded 1–365 via `AI_MEDIA_RETENTION_DAYS`; expiry enforced by a required `retentionExpiresAt` | `lib/server/aiGovernance.ts:404,475-479` |
| Tutor transcripts | **None found — indefinite** | — |
| Learning events / practice attempts / mistake book | **None found — indefinite** | — |
| Auth records + student profiles | **None found — indefinite** | — |

**No account-deletion or data-erasure endpoint exists.** A search across
`app/api/auth`, `app/api/me` and `app/api/student` returns no `DELETE` handler, and
there is no route directory matching `*delete*` or `*account*`.

This is a hard blocker, not a paperwork gap. Essentially every applicable regime
requires it:

- COPPA §312.6 — parent's right to direct deletion of a child's data
- CA SOPIPA — deletion at the district's request
- CPRA — consumer right to deletion
- GDPR Art. 17 / PIPL Art. 47 — erasure
- Standard district DPAs — data return **and** destruction at contract termination

A district will not sign a DPA that the product cannot technically honour.

---

## 6. Gap register

| # | Gap | Severity | Bound by |
|---|---|---|---|
| G1 | No account-deletion / erasure capability (§5) | **Blocker** | Engineering |
| G2 | No region-gated provider routing; PRC providers serve US learners (§3.1) | **Blocker** for US districts | Engineering |
| G3 | No privacy policy, terms, or accessibility statement; no routes, no footer links | **Blocker** | Legal + small eng |
| G4 | No age gate or consent capture at registration (§4) | **Blocker** for COPPA | Engineering |
| G5 | No retention policy for transcripts / learning events (§5) | High | Engineering |
| G6 | No signed DPA template or subprocessor disclosure page | High | Legal (1–3 mo/district) |
| G7 | No VPAT / WCAG 2.1 AA statement; zero a11y tooling or tests in the repo | High | Engineering + audit |
| G8 | `<html lang="en">` hardcoded (`app/layout.tsx:26`) despite a working `LanguageToggle` — a live WCAG 3.1.1 failure | Medium (but ~30 min) | Engineering |
| G9 | Legacy inline `avatar_image_data_url` may bypass the encrypted media store (§2.4) | Medium | Engineering |
| G10 | No machine-readable schema (no Prisma/SQL file) to hand an auditor | Low | Engineering |

**Sequencing note.** G1, G2 and G4 are engineering work that gates the paperwork —
a DPA cycle started before they land will stall on them. Start those in parallel with
G3/G6 rather than after.

---

## 7. Open questions

1. **Who owns this?** No DPO, privacy lead, or compliance owner is named anywhere in
   the repo. District DPAs require a named contact.
2. **Is MAIS a "school official" (FERPA) or a direct-to-consumer service?** The answer
   changes the consent model entirely, and the codebase currently supports both
   (self-registration *and* teacher-created rosters).
3. **Can the PRC-hosted providers be dropped or region-gated for US tracks?**
   DashScope publishes `-intl` and `-us` hosts (`lib/server/llmProvider.ts:134-136`);
   SimpleTex has no non-PRC host in code. If SimpleTex cannot be gated, US handwriting
   OCR must fall back to Mathpix only.
4. **Do production rows still populate `avatar_image_data_url`?** Needs a query against
   production, not a code read.
5. **Is there an existing legal counsel relationship?** Nothing in the repo suggests one.

---

## Re-deriving this document

```bash
grep -rhoE "CREATE TABLE IF NOT EXISTS [a-z_]+" lib/server/ | sed 's/.*EXISTS //' | sort -u
```

```bash
grep -rhoE "https://[a-zA-Z0-9.-]+\.(com|cn|ai|io|net)" lib/ app/api/ | sort | uniq -c | sort -rn
```

```bash
grep -rlnE "retention|purge|deleteAccount|erasure|anonymize" lib/server/ app/api/ | grep -v test
```
