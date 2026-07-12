# S19/S12/S11 Redacted Production DB Smoke

Generated: 2026-06-22 23:30 HKT  
Target: `https://www.mais.hk`  
Responsible sessions: S19 API configuration lead, consuming S12 backend/storage contracts and S11 QA smoke expectations.

## Conclusion

**YELLOW: production DB-backed write/session smoke passed, but direct admin storage health remains blocked by missing admin smoke credentials.**

This run does **not** justify a Neon-to-Supabase migration. It proves the production app can create durable student/teacher records, authenticate sessions, write a student practice attempt, and write teacher class/enrollment/assignment data. The operational concern found here is latency: several production DB-backed writes took 24-51 seconds.

## Summary

| Check | Status | Evidence |
| --- | --- | --- |
| Anonymous admin storage health protection | PASS | `GET /api/admin/storage/health` returned 401 in 0.956807s. |
| Direct admin storage health body | SKIPPED | No local `PRODUCTION_DB_SMOKE_ADMIN_*`, `PRODUCTION_ADMIN_*`, or bootstrap admin credential was present; local redacted account docs did not contain an admin account. |
| Indirect `provider: postgres` / `durableReady: true` gate | PASS | Student and teacher production registrations both returned 200. The deployed registration route blocks Vercel registration with 503 unless `storage.provider === "postgres"` and `storage.durableReady === true`. |
| Student login/session | PASS | Student register 200, login 200, `/api/me` 200, role `student`, same smoke user true. |
| Student practice write | PASS | Authenticated US_CA P1 question lookup returned 200 with 2 questions; `/api/attempts` returned 200 and response keys `correct`, `correctAnswer`, `explanation`. |
| Teacher login/session | PASS | Teacher register 200, login 200, `/api/me` 200, role `teacher`, same smoke user true. |
| Teacher write | PASS | Class create 201, add smoke student 201, assignment create 201. |
| California public API p95 | PASS | Globalping CA public `/api/questions?grade=S3` samples: 8; p50 493ms; p95 551ms; max 551ms. Vercel path observed as `sfo1::iad1`. |

## Timings

| Operation | HTTP | Total |
| --- | --- | --- |
| Anonymous admin storage health | 401 | 0.956807s |
| Student register | 200 | 49.805555s |
| Student login | 200 | 5.045432s |
| Student US_CA P1 question lookup | 200 | 0.646030s |
| Student `/api/me` | 200 | 2.517127s |
| Student practice attempt write | 200 | 7.537240s |
| Teacher register | 200 | 28.880644s |
| Teacher login | 200 | 4.253946s |
| Teacher `/api/me` | 200 | 1.938687s |
| Teacher class create | 201 | 24.192168s |
| Teacher add smoke student | 201 | 26.004796s |
| Teacher assignment create | 201 | 51.161590s |

Local DB-backed smoke p50: 5.045432s.  
Local DB-backed smoke p95: 51.161590s.

## California Latency

Globalping public CA probe:

- Path: `/api/questions?grade=S3`
- Samples: 8
- p50 total: 493ms
- p95 total: 551ms
- max total: 551ms
- Observed Vercel route prefix: `sfo1::iad1`

Interpretation: California public traffic reaches a San Francisco Vercel edge, but the function leg is still observed in `iad1`. That is acceptable for static/CDN entry but likely not ideal for DB-backed classroom workflows. A trusted California runner is still needed for authenticated DB-write p95 because no login cookie or temporary password should be sent to a third-party probe network.

## Provider/Durability Evidence

Direct admin health body remains unavailable without an admin smoke account. However, the production registration success is strong indirect evidence:

- `app/api/auth/register/route.ts` calls `getStorageReadinessSnapshot()` on Vercel.
- The route returns 503 `durable-storage-required` unless `storage.provider === "postgres"` and `storage.durableReady === true`.
- Both a new student and a new teacher registration returned 200 in production during this run.

This supports `provider=postgres` and `durableReady=true` for the production registration path, but S19 should still run direct admin storage health when an owner-approved admin smoke credential is available.

## Secret Safety

- No usernames, passwords, cookies, session tokens, Postgres URLs, Vercel secret values, org IDs, project IDs, or credential values are recorded in this report.
- Temporary smoke credential, payload, response, and cookie files were created under `.tmp/s19-db-smoke-shell/` and deleted after redacted evidence extraction.
- The Globalping CA probe used only a public unauthenticated GET request.

## Notes

- Earlier Node-based harness attempts failed at the transport layer because Node child processes could not resolve public hosts inside this sandbox. Those failures are superseded by the direct top-level `curl -4` evidence above and are not classified as application or database failures.
- Production smoke created disposable student, teacher, class, enrollment, assignment, and practice-attempt records. No cleanup endpoint was available or used.
- The latency profile is the main follow-up: S12 should inspect storage-write hot paths, and S22 should evaluate Vercel function-region alignment for California users before any provider migration decision.
