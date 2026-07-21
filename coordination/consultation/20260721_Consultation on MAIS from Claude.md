# Consultation on MAIS from Claude

**Date:** 2026-07-21
**Platform:** MAIS-MVP — [www.mais.ac](https://www.mais.ac)
**Target users:** US K-12 math students and teachers (California, Colorado, Texas)
**Advisor:** Claude (Claude Code, Opus 4.8)

> This document captures a multi-part consultation covering database/hosting choices, LLM & OCR selection for the Nova Tutor, pilot-readiness gaps (compliance, Teacher Console, Nova Tutor), performance diagnostics (lesson-page and login load times), several UI/UX and information-architecture decisions (lesson-menu hide button, dashboard layout, lesson-page scroll), a development plan for practice-question illustrations, a CCSS visualization-lab coverage-gap analysis, a Student Console onboarding-tour plan, two more UI polish reviews (Visualization Lab hero, Practice Arena question area), a diagnosed front-end bug (filter flash), and assessments of the adaptive-learning engine (Bayesian Knowledge Tracing) and the personalized knowledge-path / Knowledge Galaxy system. Findings are grounded in the actual codebase and live measurements where noted.

---

## Table of Contents

1. [Q1 — Database: Supabase vs Neon](#q1)
2. [Q2 — Hosting: Vercel vs AWS vs other (pilot sizing)](#q2)
3. [Q3 — 10 LLM models for Nova Tutor (OpenRouter + DeepInfra)](#q3)
4. [Q4 — OCR: Mathpix vs LLM-vision; using Mathpix in Nova Tutor](#q4)
5. [Q5 — Un-noticed pilot-readiness gaps (US K-12)](#q5)
6. [Q6 — Lesson-page load time (~10s?) + fixes](#q6)
7. [Q7 — Teacher Console: missing typically-demanded functions](#q7)
8. [Q8 — Login → dashboard load time (~10s?) + fixes](#q8)
9. [Q9 — Nova Tutor: un-noticed function gaps](#q9)
10. [Q10 — Lesson page UI: horizontal switch vs vertical scroll](#q10)
11. [Q11 — Practice Arena illustrations: feasibility + dev plan](#q11)
12. [Q12 — Lesson menu: hide button + auto-hide timing](#q12)
13. [Q13 — IA: move "Teacher-assigned work" to the dashboard](#q13)
14. [Q14 — Visualization-lab CCSS coverage gaps](#q14)
15. [Q15 — Student Console guided tour (onboarding)](#q15)
16. [Q16 — Visualization Lab page: empty middle](#q16)
17. [Q17 — Practice Arena filter flash (bug detection)](#q17)
18. [Q18 — Adaptive-learning algorithm (does it exist?)](#q18)
19. [Q19 — Personalized knowledge path + Knowledge Galaxy improvements](#q19)
20. [Q20 — Practice question area redesign](#q20)

---

<a name="q1"></a>
## Q1 — For the current www.mais.ac, which database service provider is better, Supabase or Neon? Target users are students and teachers from the USA.

**Bottom line: Neon — it fits your actual architecture better.**

The decisive fact from the codebase: **you don't use the Supabase platform at all.** You talk to Postgres through the raw `postgres` (postgres.js) driver via a plain `POSTGRES_URL`, with your own `HK_MATH_STORAGE_PROVIDER` = `sqlite | postgres` abstraction and your own auth (`AUTH_SESSION_SECRET`, Google OAuth, `userStore.ts`). There are **zero `@supabase/*` imports** in the repo. So Supabase's whole value proposition — bundled Auth, Storage, Realtime, RLS, auto-generated REST/GraphQL — is dead weight. This is a pure **serverless-Postgres-behind-a-connection-string** decision, which is exactly what Neon is built for.

### Why Neon wins for MAIS specifically

| Dimension | Why it matters | Winner |
|---|---|---|
| **Vercel serverless** | Short-lived functions → connection storms. Neon's pooler + serverless driver are designed for this; it powers Vercel's own Postgres. | Neon |
| **DB branching** | Your staging↔prod-sync/release-hygiene workflow benefits from a copy-on-write DB branch per preview/PR in seconds. | Neon |
| **Scale-to-zero cost** | Bursty pilot traffic idles a lot. Neon scales compute to zero; Supabase keeps an always-on instance (free tier pauses after 7 days idle). | Neon |
| **No lock-in** | You already use a bare `POSTGRES_URL`; Neon keeps you provider-agnostic. | Neon |

### When Supabase would be right (it isn't, for you)
Only if you plan to *replace* your hand-rolled auth/storage with its batteries-included stack (Auth, RLS, Realtime, integrated object Storage for `AI_MEDIA_OBJECT_STORAGE_REQUIRED`). Neon has **no object storage** — pair it with Vercel Blob, Cloudflare R2, or S3 for media.

### Lock down regardless — US student data
FERPA + likely COPPA. Both providers are **SOC 2 Type II** and offer a **signed DPA** — request it. Pin the project to a **US region**. Neon offers a HIPAA-eligible tier; Supabase offers HIPAA on paid plans (you likely don't need HIPAA for edtech).

**Recommendation:** Go **Neon** via the Vercel–Neon integration (auto-injects pooled + direct URLs), keep `HK_MATH_STORAGE_PROVIDER=postgres` pointed at it, use a Neon branch for staging. Handle media separately with Vercel Blob or R2.

---

<a name="q2"></a>
## Q2 — Which server provider: Vercel, AWS, or other? Pilot: ~200 students + 10 teachers (10 elementary classes), a 90-minute math lesson (2 lessons) morning or afternoon.

**Bottom line: Stay on Vercel. Do not move to AWS for this pilot.**

### The load is trivially small — capacity is not your problem
Worst case (all 10 classes at once): **210 concurrent users**. A read-heavy elementary lesson → ~**20–70 RPS steady**, bursting to a few hundred RPS at synchronized moments. Vercel serverless absorbs this easily. Moving to AWS (ALB + ECS/Lambda + RDS + autoscaling + new CI/CD) would burn weeks and add risk for **zero capacity benefit**.

`vercel.json` already pins `regions: ["pdx1"]` (Portland, US-West) — ideal for California latency.

**When AWS would be right (not now):** VPC-level isolation for a district security review, a contract naming AWS, always-on stateful services (websockets, GPU inference), or thousands of concurrent users. None apply here.

### Pilot-readiness checklist (where effort should go)
1. **Be on Vercel Pro, not Hobby.** Hobby forbids commercial use, caps functions ~10s, no SLA. Pro (~$20/mo).
2. **Co-locate DB with `pdx1`.** Put Neon (Q1) in US-West (AWS us-west-2). Mismatched regions = silent latency tax.
3. **Connection pooling = #1 technical risk.** The 9:00 login storm → serverless fan-out → Postgres connection storm. Use Neon's **pooled** connection string for the runtime `POSTGRES_URL`.
4. **Set explicit `maxDuration` on OCR/AI routes.** No `maxDuration` exports found → default timeout. Add `maxDuration = 60` on `handwriting-recognition`, `ai-tutor/resolve`, OCR routes.
5. **Your real ceiling is your AI/OCR provider's rate limits**, not Vercel. Pre-confirm quotas for a 210-user burst. You already have rate-limit fallbacks.
6. **Rehearse the burst** before pilot day (you have an `app/api/pilot` route). Simulate ~210 concurrent logins + a lesson flow.
7. **Watch it live** — enable Vercel logs/observability during the two 90-min windows.

**De-risk further:** stagger class start times by 5–10 minutes where possible — cheapest reliability win, flattens the login thundering-herd.

---

<a name="q3"></a>
## Q3 — Find 10 suitable multimodal models for Nova Tutor from OpenRouter + DeepInfra. List price, speed, advantage/disadvantage for MAIS. Needs: text + image math, and text→audio replies.

Two framing facts (grounded in repo):
1. **No single model does all three jobs.** Nova already splits this: a multimodal LLM (`resolve` route) + separate speech/voice routes. Text→audio is a **TTS step**, not LLM output.
2. **Current stack routes student data to Alibaba** (`QWEN_*` = Qwen omni/ASR + DeepSeek) — China-hosted. For US K-12 that must move off. Hot-path budget: **7.5s deadline, ~900-token replies, first token <1s** → **speed is a hard filter; avoid "thinking" variants in the live path.**

*Prices = USD per 1M tokens, input→output, fetched live 2026-07-21.*

### OpenRouter (proprietary + routed)

| # | Model | Price in→out /1M | Speed | Advantage | Disadvantage |
|---|---|---|---|---|---|
| 1 | Google Gemini 2.5 Flash | $0.30 → $2.50 | Very fast | Best all-round math accuracy + vision (printed & handwritten); 1M ctx; fits 7.5s | Routes via Google through OpenRouter — enforce ZDR/no-train yourself; output cost adds up |
| 2 | OpenAI GPT-5 mini | $0.25 → $2.00 | Moderate | Excellent step-by-step math reasoning; strong vision; 400k ctx | Reasoning tokens can blow the 7.5s deadline — cap effort; routing/privacy caveat |
| 3 | Anthropic Claude Sonnet 5 | $2.00 → $10.00 | Moderate | Premium accuracy + best safety/age-appropriate tone; diagram/word problems | Most expensive; slower — better as escalation than default |
| 4 | Anthropic Claude Haiku 4.5 | $1.00 → $5.00 | Fast | Fast + strong safety guardrails; low hallucination | Pricier than open models; vision a notch below Gemini/Qwen-VL on messy handwriting |
| 5 | Amazon Nova Lite | $0.06 → $0.24 | Very fast | Cheapest frontier-vendor; US-origin (AWS) — clean compliance; 300k ctx | Weaker multi-step math; better for K-5 than hard middle-school |

### DeepInfra (open-weight, US-hosted, no-train by default)

| # | Model | Price in→out /1M | Speed | Advantage | Disadvantage |
|---|---|---|---|---|---|
| 6 | Qwen3-VL-235B-A22B-Instruct | $0.20 → $0.88 | Moderate | Best open-weight math-vision; ~60% cheaper output than same model on OpenRouter | MoE image prefill adds latency; China-origin weights but US-hosted |
| 7 | Qwen3-VL-30B-A3B-Instruct | $0.15 → $0.60 | Fast | **Best default workhorse**: fast, cheap, strong math-image; same family you already tuned | Slightly less accurate than 235B on hardest problems |
| 8 | Llama-4-Maverick-17B-128E | $0.20 → $0.80 | Fast | US-origin (Meta) — strongest compliance narrative; 1M ctx; fast MoE | Math reasoning trails Qwen-VL/Gemini |
| 9 | Llama-4-Scout-17B-16E | $0.10 → $0.30 | Very fast | Cheapest US-origin multimodal; very low latency | Weakest math; easy/short items only |
| 10 | Mistral-Small-3.2-24B | $0.075 → $0.20 | Fast | Cheapest vision here; EU-origin, US-hosted; fast | Modest reasoning/handwriting; budget/fallback tier |

*(Qwen3-VL & Llama-4 are on both providers — DeepInfra is cheaper on output + cleaner no-training policy.)*

### The audio piece (TTS) — separate model; OpenRouter can't do it
| TTS model (DeepInfra) | ~Price /1M chars | Fit |
|---|---|---|
| hexgrad/Kokoro-82M | $0.62 | Near-free (~$0.0003 per reply). Best default for cost. |
| Inworld realtime-tts-2 | $35 | Expressive, kid-friendly, low-latency — best voice quality. |
| Qwen3-TTS | $20 | Natural multilingual (useful for Spanish, CA/TX). |

### Compliance filter (CA + CO + TX, K-12)
COPPA, FERPA, CA SOPIPA/CPRA, Colorado Privacy Act, Texas TDPSA + SCOPE Act. **DeepInfra open models** = cleanest (single US vendor, no training by default → one DPA). **OpenRouter** is a router — lock its data policy to zero-retention; for Gemini/GPT/Claude a *direct* provider contract is cleaner. **Move off the Alibaba/DeepSeek path before real student data.**

### Recommendation
- **Default live path:** Qwen3-VL-30B-A3B on DeepInfra (#7).
- **Escalation (hard/handwritten):** Qwen3-VL-235B (#6) or Gemini 2.5 Flash (#1).
- **Highest accuracy/safety (assessments, younger kids):** Claude Sonnet 5 (#3) or Haiku 4.5 (#4).
- **Audio:** Kokoro-82M for the pilot; bench Inworld/ElevenLabs for a warmer voice.
- Keep the router pattern for easy A/B.

Speed ratings are by model class; for hard numbers, run a **latency + math-accuracy probe** against the top 3 with real K-12 items.

*Sources: OpenRouter `/api/v1/models`, DeepInfra `/models/list` (live 2026-07-21).*

---

<a name="q4"></a>
## Q4 — For OCR I use Mathpix. Does Claude have OCR APIs that outperform Mathpix? OCR seems pricier than LLMs with OCR ability. Can I use Mathpix in Nova Tutor for the OCR work?

Grounding: your repo already has a **multi-provider OCR routing layer** — `AssignmentOcrProvider = "simpletex" | "mathpix" | "llm-vision" | "local" | "none"` ([types/index.ts:2855](types/index.ts)) — with **SimpleTex as production primary** and **Mathpix wired as a fallback** using the **strokes API** (`MATHPIX_STROKES_API_URL=.../v3/strokes`), plus an LLM-vision fallback.

### Part 1 — Does Claude's OCR outperform Mathpix?
**Anthropic has no dedicated OCR product.** "Claude OCR" = Claude vision (general multimodal), not a purpose-built math-OCR service.
- **Pure math transcription → Mathpix still edges frontier LLMs** (clean LaTeX/MathML, confidence scores, and a strokes API that beats rasterizing-to-PNG for handwriting).
- **Holistic tutoring comprehension → the LLM wins** (understands a diagram + equation + messy scratch work).
- **Catch for a tutor:** LLMs silently "normalize" notation — they'll quietly fix a student's wrong exponent — dangerous when diagnosing a mistake.

**The real reframe:** the competitor to Mathpix isn't "Claude's OCR API" — it's **deleting the OCR step** and letting your multimodal tutor LLM read the image directly (`llm-vision`).

| OCR path | Live price | Extra latency | Notes |
|---|---|---|---|
| Mathpix v3/strokes (current fallback) | $0.01 / session | +1 hop | Best for handwriting w/ strokes; expensive endpoint |
| Mathpix v3/text (photo → LaTeX) | $0.002 / image | +1 hop | Clean LaTeX, discards diagrams |
| LLM-vision direct (Qwen3-VL-30B) | ~$0.0003–0.0005 / image | none | Folds into reasoning call; keeps diagram context |
| Mistral OCR (dedicated alternative) | ~$0.001 / page | +1 hop | Cheaper than Mathpix, weaker stroke handling |

LLM-direct is **~5–10× cheaper than Mathpix v3/text** and **~20–40× cheaper than v3/strokes**, with no serial hop (matters for the 7.5s deadline; your OCR route allows up to 12000ms per provider).

### Part 2 — Can I use Mathpix in Nova Tutor?
**Yes — it's already wired** (credentials + routing change, not new engineering). But you have **two OCR surfaces**, and the right answer differs:

- **① Answer-board handwriting** (student writes on a canvas → vector strokes): **Keep a dedicated stroke recognizer, and promote Mathpix over SimpleTex for the US pilot.** Mathpix v3/strokes beats LLM-on-PNG, and your current primary **SimpleTex is China-hosted** (`server.simpletex.cn`) — same compliance concern as Q3. **Mathpix is US-based** → better accuracy *and* compliance. Keep `llm-vision` as fallback.
- **② "Ask by photo"** (photo of a problem, no strokes): **Skip Mathpix; use the multimodal LLM directly.** Cheaper, one vendor, no latency hop, preserves diagrams. Only route to Mathpix v3/text when you need deterministic LaTeX to *persist* (digitizing worksheets into the question bank).

**Recommendation:**
- Photo questions → `llm-vision` direct.
- Handwriting answer-board → switch primary SimpleTex → Mathpix v3/strokes (US-hosted, stroke-accurate), LLM-vision fallback.
- Content ingestion → Mathpix v3/text for stored LaTeX.
- Note Mathpix's one-time non-refundable API setup fee ($29 test credit).

Settle "who reads handwriting best" with the latency + accuracy probe on ~20 real answer-board samples.

*Sources: [Mathpix Convert API pricing](https://mathpix.com/pricing/api), [billing docs](https://mathpix.com/docs/convert/billing).*

---

<a name="q5"></a>
## Q5 — What gaps have I not noticed/implemented that urgently need solving before the pilot in January 2027?

The biggest gaps aren't features — they're the **compliance, data-residency, standards, and accessibility** items that fail a US school-district review. Ranked against a ~5.5-month runway (district legal/DPA cycles alone can eat 1–3 months each):

### 🔴 Tier 1 — Pilot blockers (legal; start this month)
1. **No published legal/consent foundation.** `find app` for privacy/terms/consent returns nothing. You need: Privacy Policy + ToS; a **COPPA** basis (verifiable parental consent *or* school-authorized consent + DPA); signed **district DPAs** (SDPC National DPA; CA via CSPA); data retention/deletion/breach policy. ⚠️ "Student agreements already" ≠ COPPA-compliant school-authorized consent + district DPA + FERPA "school official" designation. Get an edtech-privacy attorney.
2. **Student data flows to China-hosted vendors** (Qwen/Alibaba, DeepSeek, SimpleTex). For FERPA + CA SOPIPA + Colorado + Texas TDPSA/SCOPE, this fails any district security review. Migrate to US-hosted (Q3/Q4 moves).

### 🟠 Tier 2 — Usable & defensible
3. **Texas is not Common Core — and your content is.** CCSS appears 37,184×; TEKS 24× (RAG metadata only); Colorado Academic Standards 0×. TX teachers can't map to TEKS/STAAR, and "Common Core" is a political negative in TX. Surface a TEKS crosswalk + light CAS mapping.
4. **Accessibility has no conformance evidence.** 1,416 aria usages, 69 accessible-math refs, but no VPAT/WCAG 2.1 AA statement. DOJ ADA Title II (2024) requires WCAG 2.1 AA for public schools (deadlines 2026–2027). Run an audit on the core student flow, validate MathML with a screen reader, produce a VPAT.
5. **AI-tutor safety & transparency needs hardening + docs.** Classroom-policy + governance events exist; missing/unverified: input/output moderation, PII handling, teacher/parent review of AI conversations, jailbreak resistance, written AI-use disclosure.

### 🟡 Tier 3 — Matters, not a hard blocker
6. **COPPA-safe provisioning.** Auth = email/password + Google OAuth only (no Clever/ClassLink/OneRoster/LTI). Manual provisioning is fine for 210 users; rostering is post-pilot for scale.
7. **Spanish / EL support.** No i18n library, no Spanish content. At minimum, Spanish parent-facing consent docs + tutor replies for EL students.
8. **School-device reality.** Validate low-end Chromebooks (games/visualizations, stylus/touch, headphone audio, filtered/flaky wifi).
9. **Teacher readiness.** Onboarding/PD, live monitoring, pilot-day support channel.

**Already in good shape:** hosting/load (Q2), tutor latency/fallback engineering, Teacher Console, aria groundwork, governance logging, TEKS crosswalk *design*.

**One-line priority:** Tier 1 (legal foundation + de-China the data path) starts this week; Tiers 2–3 run in parallel through the fall.

---

<a name="q6"></a>
## Q6 — Lesson page load is ~10s (Student Jon / 12345). Does Claude agree? How to decrease it?

*(Verified via the public-site waterfall + code trace. I did not log into production as Student Jon — I don't enter passwords into live sites.)*

### Part 1 — Do I agree it's ~10s? Yes — plausible, but it's a cold-load number.
Measured live on `www.mais.ac` (home page, warm server): **TTFB 333ms**, `load` ≈ **5.0s**, but the tail is worse — one RSC prefetch (`/about`) returned **1.7MB over ~15s**, and the **4K hero image** optimization took **~11s**. The lesson page adds cold-start-sensitive work on top, so ~10s is credible for a **cold/first load** — exactly your pilot's situation (functions idle between the two 90-min windows → frequent cold starts). Warm loads are faster.

### Part 2 — Root causes (ranked) + fixes
1. **Cold-start tax from giant module init.** `StudentLessonPage` does `await import("@/lib/server/userStore")` (10,098-line module) which transitively statically imports **~11MB of question-bank JSON** via `data/usCaliforniaTopics.ts` (4.48MB g6-g12 + 4.4MB k5 + 2.21MB k5-practice + 152KB). On a cold invocation Node must load + JSON.parse all of that. → **Lazy-load banks per grade/topic** (dynamic import only the needed pack, or read just the needed questions), and/or move banks out of the JS module graph (DB/object storage/edge cache). Biggest win. *(Confirmed server-only, not shipped to the client.)*
2. **Serverless cold starts** (nodejs runtime, low pilot traffic). → Fluid Compute / keep-warm ping during class windows; bundle reduction from #1.
3. **Sequential server awaits** (auth → getLessonBySlug → getRoadmapData). → Parallelize where independent.
4. **3,438-line client `LessonView`.** Visualizations are already code-split (good). → Render static concept/worked-example blocks as server components; keep only interactive islands client-side.
5. **Over-aggressive prefetch + heavy hero image** (home prefetches 6 routes' RSC+JS; optimizes a 4K background at 11s). → `prefetch={false}` on non-critical links; right-size images (1280–1920px, not 3840px); `priority` only on LCP image.
6. **RSC payload size.** → Send only first-paint data; lazy-load the roadmap/menu.

**Quick wins (days):** lazy-import banks, parallelize awaits, `prefetch=false` + image right-sizing, keep-warm ping. **Deeper (1–2 wks):** RSC-ify LessonView static blocks, move banks to DB/edge cache.

---

<a name="q7"></a>
## Q7 — Teacher Console: what typically-demanded functions are missing?

**Verdict: it's genuinely deep** (roster CSV import w/ validate→commit, co-teachers, assessment builder *with item/distractor analysis already built* — [lib/teacherAssessmentAnalysis.ts:197](lib/teacherAssessmentAnalysis.ts), AI grading runs, remediation/review-lessons, parent drafts, AI-governance policy, reports + PDF, live present/poll mode). The gaps are specific holes in **live monitoring, AI visibility, and equity/compliance**.

### 🔴 Tier A — Pilot-critical (inside the 90-min lesson)
1. **Live per-student monitoring — "who needs me right now."** `TeacherLiveView.tsx` (1,176 lines) polls every 5s but is a broadcast tool (push poll/exit-ticket, screen-sync). No per-student live status grid (current item, stuck/idle/done). #1 demanded live function for a self-paced lesson. Fix: a live roster grid from your `learning-events` stream.
2. **AI-tutor conversation visibility.** Teachers see only counts (`aiTutorMessages7d`, "Last AI message" — [TeacherManagementViews.tsx:926,1148](components/teacher/TeacherManagementViews.tsx)); can't read transcripts. Fix: per-student transcript panel + governance log.

### 🟠 Tier B — Duty-of-care & equity
3. **Content-safety flags & alerts.** Only *academic* at-risk exists. No detection/alert when a student writes something concerning to the AI. Fix: safety classifier → teacher/admin alert + logged event.
4. **Accommodations / IEP-504 per student.** Zero. No extended time, read-aloud, reduced choices, calculator policy. Fix: per-enrollment accommodations profile.

### 🟡 Tier C — Data workflows (survivable on exports for the pilot)
5. **Standards-mastery *report* + TEKS.** CCSS mastery exists only as the Class Sky star map ([ClassSkyPanel.tsx:87](components/teacher/ClassSkyPanel.tsx)); Reports/Analytics have zero per-standard breakdown; no TEKS/CO. Fix: a plain standards-mastery table + CSV, TEKS labels.
6. **True gradebook grid + SIS passback.** No students-×-assignments score grid; no OneRoster/LTI passback. Fix: gradebook grid for the pilot; passback post-pilot.
7. **Small-group differentiation.** No ability-grouping/tiered assignment. Fix: create groups → assign differentiated work.

**Already strong:** roster CSV import, co-teachers, assessment builder + item/distractor analysis, AI-assisted grading, remediation + parent drafts, per-class AI policy, saved reports + PDF, live present/poll mode.

**Priority:** #1 + #2 a teacher notices day one; #3–4 a district asks about before signing; #5–7 ride on exports for the pilot.

---

<a name="q8"></a>
## Q8 — Login → dashboard takes ~10s (student or teacher). Does Claude agree? How to decrease it?

*(I analyzed the auth path but did **not** POST credentials to your production auth endpoint — that can trip rate-limits/lockout. I measured the login page directly.)*

### Part 1 — Do I agree it's ~10s? Yes — measured directly.
Live on `www.mais.ac/login`: **TTFB 327ms**, but **DOMContentLoaded ≈ 11.7s, load ≈ 11.8s** — the login page *exceeds* 10s before you even submit. Dominant blocker: an RSC prefetch of **`/about` = 1,705 KB over ~13.9s**, plus eager prefetches of other marketing routes. Worst on cold/first load (your 9am storm); warm reloads are much faster.

### Part 2 — Root causes (ranked by measured impact) + fixes
1. **Over-aggressive RSC prefetch of a bloated `/about` route — the measured killer** (1.7MB / ~14s). Same offender as Q6, so one fix helps both. → `prefetch={false}` on marketing links; find & trim why `/about`'s RSC is 1.7MB.
2. **Cold-start JSON tax on the auth path.** The login POST does `await import("@/lib/server/userStore/studentActivity")` ([login/route.ts:124](app/api/auth/login/route.ts)) → `studentActivityPersistence` imports `@/data/topics` → `usCaliforniaTopics` → **~11MB parsed on cold start**. Login needs auth + settings, not banks. → Decouple login from the lesson/bank module graph; lazy-load banks (Q6 fix).
3. **Serverless cold starts × two serial hops** (login POST → redirect → dashboard GET). → Fluid Compute / keep-warm ping; smaller bundles.
4. **Synchronous password hashing** — `pbkdf2Sync(password, salt, 120000, 64, "sha512")` ([authSessionPersistence.ts:1137](lib/server/userStore/authSessionPersistence.ts)) blocks the event loop ~100–300ms/login; 25 kids at 9:00 on one instance **serialize**. → Switch to async `crypto.pbkdf2` (keep iterations); stagger logins.
5. **Dashboard render + hydration.** Teacher dashboard caches aggregations (`unstable_cache`, revalidate 120 — good); confirm the **student** dashboard is cached too; stream the shell.
6. **DB connection setup under the login storm.** → Neon pooled connection string.

**Priority for January (quick wins, days):** `prefetch=false` + fix the 1.7MB `/about`; decouple login from the 11MB graph; async pbkdf2; keep-warm ping. These should take a cold login from ~10s toward ~2–3s.

> **Two systemic offenders behind both slow lessons and slow logins:** the **1.7MB `/about` prefetch** and the **11MB question-bank static import**. Fixing them is the highest-leverage perf work before the pilot.

---

<a name="q9"></a>
## Q9 — Nova Tutor: what function gaps have I not noticed/implemented for US K-12?

### Core insight: Nova is a China/HK-grade tutor running on US accounts with an *empty* US brain
Built China/HK-first (deep RAG for Mainland PEP/BNU/HJB + HK EdB/DSE, Chinese-script detection, `student-li-mainland` demos). The US "support" is a **veneer**. I traced `buildSafeEvidenceContext` ([resolve/route.ts:1360-1388](app/api/ai-tutor/resolve/route.ts)):
- `MAINLAND_PEP_HIGH` → rich BNU/HJB/PEP evidence packs
- `HK` → Hong Kong evidence pack
- **every US track (`US_CA_MATH`, `US_NC_MATH`, `US_AR_MATH`, `US_FL_MATH`) → `return ""`** (empty).

A California student is tutored from base-LLM general knowledge plus one vague nudge ([resolve:1214](app/api/ai-tutor/resolve/route.ts)) — **zero retrieved CCSS/TEKS/California content.** No `buildUsMathEvidencePack` exists.

### Ranked gaps (verified)
**🔴 Tier 1 — veneer + duty-of-care**
1. **No US-curriculum RAG grounding (headline).** Tutor doesn't know the standard/lesson; can contradict it. Fix: write `buildUsMathEvidencePack` off `lib/rag/usMath.ts` and wire into `buildSafeEvidenceContext` for US tracks.
2. **No crisis/self-harm detection & escalation.** Zero matches. No detection, alert, or log. Fix: safety classifier on student input → teacher/admin alert + logged event.
3. **No content-moderation layer on tutor I/O.** Excellent prompt-injection resistance ([resolve:324-325](app/api/ai-tutor/resolve/route.ts)) but no moderation pass on input/output. Fix: moderation gate around the tutor call.

**🟠 Tier 2 — classroom fit**
4. **No academic-integrity answer-gating.** Nothing detects "graded assessment — don't help." Fix: assessment context flag → hints-only/disabled during graded work.
5. **Teachers can't read tutor conversations** (history stored, `maxHistoryMessages=10`, but no teacher view). Fix: per-student transcript + governance log.
6. **No Spanish / EL support** (`resolveTutorReplyLanguage` detects only English + Chinese scripts). Fix: add Spanish.

**🟡 Tier 3 — depth (partial)**
7. **Misconception diagnosis is freeform**, not structured/tagged for teacher analytics.
8. **Tutor-reply accessibility unverified** (MathML/aria on `LiveMathText`).

**Genuinely strong (don't rebuild):** Socratic method with no-answer-reveal ([resolve:322](app/api/ai-tutor/resolve/route.ts)); answer-check mode; best-in-class prompt-injection & answer-extraction resistance; 10-message memory with session-context-over-history priority; multimodal + voice; graceful local-hint fallback; per-class policy + governance; 7.5s latency engineering.

**Priority:** #1 (wire a US math evidence pack) + #2 (crisis escalation) matter most.

---

<a name="q10"></a>
## Q10 — Lesson page right side scrolls up/down. Should we switch to a left/right block-switch instead? Devices: Google Chromebooks (11.6"–15.6", Celeron, 4–8GB) and iPads (10.2").

*(Attached: two lesson-page screenshots — a G1 "Addition & Subtraction Stories" concept with an AI audio guide, "Put together / Take away / Add three" tabs, a fish word problem, `6 + 5 = 11` and steppers; below it a "Math check" callout with CCSS tags 1.OA.A.1/1.OA.A.2 and the next concept "Subtraction as a Missing Part" with a part-whole bar model.)*

**Short answer: keep vertical as the primary axis — don't convert to a left/right swipe/switch.** Your instinct (young kids benefit from "one idea at a time") is right; a horizontal switch is the wrong mechanism for these devices + content.

### Why a horizontal switch backfires on Chromebooks + iPads
1. **On your smallest/most common device it can't even remove vertical scrolling.** 11.6" Chromebook ≈ 1366×768; usable height ~600px. A single G1 block is already taller than that → a card model adds a **second axis** (swipe between cards *and* scroll within each), which is confusing for 6-year-olds and defeats the premise.
2. **Horizontal swipe collides with the OS back/forward gesture.** Chrome OS two-finger horizontal swipe = browser Back/Forward → navigates the student *out* of the lesson and loses state; iPad Safari edge-swipe does the same. Fragile to suppress.
3. **It fights the WCAG 2.1 AA conformance you need** — carousels are a top a11y failure pattern (focus, "X of Y", keyboard traps). Vertical document flow is the safe default.
4. **Low-end hardware punishes slide UIs** (transitions + off-screen mounted panels = jank/memory on Celeron/4GB). Native vertical scroll is GPU-cheap.
5. **Reading direction + reference loss** — text-heavy content fights horizontal paging; a hard switch hides the concept while the child is on the practice.

### Capture the benefit a better way — a vertical "stepper"
- One concept-block per step, advanced by a big friendly **"Next →"** button (great for touch *and* trackpad).
- Keep vertical scroll within a step for overflow.
- Slim progress indicator ("Step 2 of 5"); optional section chips/tabs to jump (tabs, not swipe).
- Bonus: **gate advancement** (must try the widget before Next) — stops scroll-skipping.

### Cautions
- This is a real refactor of the ~3,400-line `LessonView`, right before the pilot, expensive to reverse.
- **Validate the problem first** — is there evidence kids struggle with the current scroll? If not, it's a solution seeking a problem, and it sits below the Q5–Q9 gaps.

**Recommendation:** keep vertical; if you want more focus, do the **vertical concept-stepper**, not a horizontal switch — and only after testing with a few kids on the actual Chromebook and 10.2" iPad.

---

<a name="q11"></a>
## Q11 — Practice Arena questions usually lack illustrations (unlike lesson pages). Can Claude create the same/higher-quality, conceptually-right math illustrations for practice questions? Propose a development plan.

*(Attached: two ten-frames — one with 8 orange counters, one with 5 blue — a classic G1 manipulative.)*

### Feasibility: Yes — and you already started the right architecture
You have [`components/practice/QuestionFigure.tsx`](components/practice/QuestionFigure.tsx) — a renderer that draws **4 diagram archetypes from structured JSON, with built-in localized alt text** (`questionDiagramAltText`): `CoordinateGrid`, `PlaneFigure`, `NumberLine`, `SolidFigure` ([types/index.ts:1709+](types/index.ts)). Plus count-exact lesson components (`counting-ten-frame.tsx`, `arrays-repeated-addition.tsx`, `fractions-number-line.tsx`), an illustration gate, and standard-matching validation (`lib/rag/illustrationTextMatchStandard.ts`).

**But 0% of practice questions carry a figure** — US-CA K-5 = 492 questions, 0 figures; G6-G12 = 1,500, 0. The engine exists; the specs were never authored, and the K-5 manipulatives (ten-frame, base-ten, bar model, arrays, fraction bars) aren't yet `QuestionDiagram` variants on the practice side.

**Critical method choice:** deterministic SVG driven by structured specs — **never generative/raster image models** (DALL·E / Gemini-image / SD miscount dots and garble digits → fail "conceptually right"). Vision LLMs are for **authoring the spec**, never for **rendering pixels**. (Bonus: moving from emoji arrays to clean SVG is *higher* quality and more screen-reader-friendly.)

### Development plan
- **Phase 0 — Audit & archetype taxonomy (~1 wk).** Decide which questions *need* a figure (extend the illustration gate); classify by archetype. Target set: existing 4 + K-5 (ten-frame, base-ten blocks, part-whole bar model, array/area model, fraction bar & circle, grouped counters; money/clock if needed). Output: coverage matrix.
- **Phase 1 — Extend the deterministic renderer (~2–3 wks).** Add K-5 archetypes as `QuestionDiagram` variants + renderers, promoting proven lesson components into shared primitives. Each: strict schema, deterministic SVG, required localized alt text, theme-aware, responsive/light for Chromebook + 10.2" iPad.
- **Phase 2 — Claude-assisted spec authoring (~2 wks).** Per needs-figure question, Claude reads stem + answer + standard → emits `{archetype, params}`. Run as a **build-time batch** (versioned per pack), not runtime.
- **Phase 3 — Automated conceptual-correctness validation (~1–2 wks; load-bearing).** Every spec must reconcile with the question's answer (extend `isExpectedAnswerRepresented` / `questionBankSolvability`), match the standard, counts in range, labels + non-empty alt text. Reject/flag failures. This makes "conceptually right at 2,000-question scale" real.
- **Phase 4 — Human/teacher QA gate (ongoing).** Route through `coordination/content-qa`; full-review the K-1 set; golden tests.
- **Phase 5 — Render in Practice Arena + measure (~1 wk).** Wire `QuestionFigure` into the practice card; accessibility pass (text alternative, not color-only); responsive on target devices; measure load impact.

### Guardrails & sequencing
- **The one big DON'T:** no generative raster models for manipulatives — deterministic specs + validation only.
- **Reuse ≈ 80% of existing infra** — "populate + extend," not "build an engine."
- **Start with K-1** (ten-frame / bar-model / counters — the attached example): highest pilot value, hardest to fake.
- **Sequencing honesty:** valuable, but below the Tier-1 pilot blockers (Q5/Q9). Slot the K-1 slice in parallel; defer G6-G12 figures until after the pilot.

---

<a name="q12"></a>
## Q12 — Add a "hide" button for the left lesson menu (works for both map & list views); auto-hide after inactivity. Propose placement + a good industry-standard duration. Devices: Chromebooks (11.6"–15.6", Celeron, 4–8GB, some touch) + iPads (10.2").

Grounded: the left menu is `WorldMenu.tsx` — it wraps *both* the themed map (Sprout Meadow, K-2) and the "List view" fallback, and the "List view" toggle already lives inside it. You also already have a collapse pattern: `lessonGalaxyCollapseDurationMs = 520`, `aria-expanded={isRevealed}`, sessionStorage-backed collapse. So this is "extend what you have," and map/list parity is free if placement is right.

**1. Placement — one control, both views.** Put the toggle in **WorldMenu's shared header row**, next to the existing "List view" toggle. Because WorldMenu renders both views, the control is automatically view-agnostic. Icon **+ short label** ("‹ Hide") — G1 readers need the word; **≥48px** tap target; real `<button>` with `aria-expanded`/`aria-controls`/label.

**2. Never a dead end (responsive reveal).**
- **Wider screens (≥~1024px):** collapse to a **slim rail** (icon + "›"), not nothing — keeps context, reads as "tap to open."
- **Narrow screens (11.6" Chromebook, 10.2" iPad):** menu is an **overlay drawer**; hide = close; reveal = a **persistent floating pill** "☰ Lessons" pinned top-left.

**3. Auto-hide — my honest recommendation.** Auto-hiding nav is double-edged (focus vs. disorientation for young kids; brushes WCAG timing/motion). So:
- **Collapse to the rail/peek, not a full disappearance** — the child *sees* it tuck away.
- **Trigger on engagement, not idle-on-arrival** — start the timer only after the student first interacts with lesson content.
- **Reset on any menu touch; pause while pointer/focus is inside** or the menu holds keyboard focus.
- **Respect explicit intent** — manual hide stays hidden; manual re-open suppresses auto-collapse for the session (persist per-user in sessionStorage).
- **Gentle pre-collapse cue** + one-time coach-mark.

**Proposed house standard: ~12–15s (default ~12s).** Rationale: ~3s (media controls) is too twitchy for a nav a child reads from; 10s (your suggestion) is acceptable but can fire mid-read; 12–15s balances reclaiming space vs. surprising the reader; ≥30s rarely helps. **Age caveat: for K-1 (your pilot's core), lean 15–20s or manual-only** — youngest learners need more time and are most disoriented by self-changing UI (key off `worldThemes`/grade band).

**A11y & perf must-dos:** `prefers-reduced-motion` → no slide; animate with `transform: translateX()` not `width` (janky on Celeron); drop the *manual* toggle to ~220–260ms (520ms feels slow); keyboard-collapse moves focus to the reveal control; reveal affordance always visible.

**Recommendation:** keep vertical menu, ship the hide button in the shared header, reveal-to-rail (wide) / floating pill (narrow), auto-peek at ~12s (K-1 longer/off), and validate with kids before committing.

---

<a name="q13"></a>
## Q13 — I'm considering moving "Teacher-assigned work" from the Personalized page to the Student Dashboard, just below "Growth track." Suggestions based on e-learning IA standards?

Grounded catch: "Growth track" = the collapsed title of `StudentMotivationHub` (XP/level/badges — motivational, not a task list). "Teacher-assigned work" currently lives in `AdaptiveLearningContent.tsx:664` (Personalized page). **But your dashboard already fetches assignments** (`app/dashboard/page.tsx` calls `fetch("/api/assignments")`), and there's **also a dedicated `/student/assignments` page** — so assigned work has up to **three homes already.**

**1. Moving it onto the dashboard is correct and industry-standard. ✅** In Google Classroom, Canvas, Khan, Schoology, IXL, teacher-assigned work is the #1 item on the student landing surface. Burying homework inside "Personalized Learning" is a discoverability problem.

**2. But place it *above* "Growth track," not below. ⚠️** Dashboard order should follow urgency/actionability. Assigned work (due, graded) outranks gamification (ambient). "Below Growth track" risks below-the-fold burial on the 11.6" Chromebook (~600px). Recommended order: greeting/grade → **Teacher-assigned work** → Growth track → personalized/adaptive → rewards/analytics. (If Growth track is collapsed-by-default and compact, "just below" is tolerable — the non-negotiable is assigned work **above the fold** on the smallest device.)

**3. Consolidate, don't create a fourth copy.** Standard IA = one authoritative summary + one detail list:
- **Dashboard** → a *summary* card (top N + due dates + "See all →").
- **`/student/assignments`** → the full list (keep as "See all" target).
- **Personalized page** → **remove** the assigned-work section; leave a pointer. This sharpens the Personalized page as adaptive/self-directed practice.

**4. Empty-state bridge.** No assigned work → "You're all caught up! Here's recommended practice →" (links to Personalized). Naming "Teacher-assigned work" is good (explicit).

**5. Measure the real goal:** assignment **completion rate**. Track "assigned work started/completed within the lesson window" before/after — that's the validation, not opinion.

**Net:** move it to the dashboard, but **above** Growth track, as a **summary that consolidates** the three homes (removing the Personalized copy), and measure completion.

---

<a name="q14"></a>
## Q14 — The distribution of US math visualization labs seems uneven; there must be CCSS concepts not covered. Produce a table of the gaps. → Saved separately as `20260721_Gaps of Visualization Labs for US Math Knowledge.md`.

Computed from the canonical CCSS registry (`data/ccss/*` — 229 K-8 + 148 HS standards) vs every lab's `standardIds` (`data/visualizationLabs.ts` + ~180 signature labs).

**Your observation is correct, but the shape is a middle-school trough — not an even scatter:**

| Band | Coverage |
|---|---|
| K-5 | **100%** (0 gaps) |
| G6 | 83% (5 gaps) |
| **G7** | **75%** (6 gaps — weakest) |
| G8 | 93% (2 gaps) |
| HS | ~100% (association) |

**13 hard gaps, all in Grades 6-8**, clustered in **Expressions & Equations (5)**, **The Number System (3)**, and **Grade-7 Statistics/Probability + Ratios (3)** — the pre-algebra bridge. Examples: 6.NS.B.3 (decimal ops fluency), 7.RP.A.1 (unit rates with fractions), 6.EE.B.8 (inequalities → number-line), 8.F.A.3 (y=mx+b is linear). Full 13-row table (standard, concept, nearest existing lab, suggested action) is in the separate file.

**Three caveats/notes:**
1. **The elementary pilot isn't affected** — K-5 (Grade 1) is 100% covered; these are scaling-to-middle-school gaps.
2. **Most are "extend," not "build"** — every gap has an adjacent lab; several (`LongDivisionLab`, `DecimalArithmeticLab`, `ScientificNotationLab`) are likely just **tagging gaps** (concept visualized, standard not in `standardIds`).
3. **"Coverage" = association, not depth.** 94% counts a standard as covered if any lab lists it; a **depth audit** (dedicated vs incidental lab) would surface additional soft gaps, likely also in G6-8. (Texas TEKS / Colorado CAS are separate frameworks — a distinct coverage pass.)

---

<a name="q15"></a>
## Q15 — The Student Console is hard for new users. Do you agree? Add a first-run guided sequence (like the Teacher Console already has). → Saved separately as `20260721_Student Console Sequence Feature_Claude.md`.

**Do I agree it's hard for new users? Yes** — grounded: a first-time student lands among many surfaces (dashboard + Growth track + rewards + galaxy, Personalized Learning, Lessons with map *and* list views, Practice Arena, Assignments, Roadmap, Assessments, Tools, three games, Nova Tutor), layered with game metaphors (galaxy/meadow/islands) that aren't self-evident to a 6-year-old. Today there's only a `LearnerStartSetupGate` (intent selection) — **not a navigation walkthrough.**

**The engine already exists — reuse it.** `TeacherGuidedTour.tsx` (304 lines) is a generic anchor-driven spotlight tour (`[data-tour="…"]` anchors, per-user localStorage, `role="dialog"` a11y, webdriver-suppressed). The Student version = extract the engine + new steps + add anchors. **~3–4 days, low risk:**
1. Extract a shared `GuidedTour` engine (½d)
2. `StudentGuidedTour` — `mais-student-tour:v1:<userId>`, auto-launch on first visit, replay button (½d)
3. Add `data-tour` anchors to student surfaces (~1d — main new wiring)
4. Age-appropriate + a11y pass (~1d)
5. Clone the tour regression tests (½d)

**Draft 5-step sequence:** home base → assigned work → start a lesson → practice & games → ask Nova. **K-12-specific design (differs from teacher tour):** age-band it (simpler K-2 variant with read-aloud via existing TTS), ≥48px targets, once-only-but-replayable, `prefers-reduced-motion`. **Caution:** a tour complements — doesn't replace — good IA (pair with Q10/Q12/Q13 clarity work); validate the step count with real first-graders (a 3-step tour often beats 6 for the youngest).

---

<a name="q16"></a>
## Q16 — On the Visualization Lab page, the middle of the area below the nav bar is empty. Bad design? Propose a fix.

Grounded diagnosis: the hero is a flex row with `lg:justify-between` ([VisualizationLabPage.tsx:2894](components/visualizations/VisualizationLabPage.tsx)) inside a `max-w-[1500px]` container — left block capped at `max-w-2xl` (~672px), right "Next up" card fixed at `lg:w-[24rem]` (384px). `justify-between` dumps the leftover ~370px as a **dead zone in the middle** on wide screens.

**Yes, it's a weakness** — two blocks shoved to the edges with a void reads as unbalanced/unfinished and wastes above-the-fold space. Caveats: it's **viewport-dependent** (milder on the pilot's 10.2" iPad / 11.6" Chromebook; stacks with no gap `<lg`), and it's **polish, not a pilot blocker**.

**Solutions:**
- **A — Quick rebalance:** swap `lg:justify-between` for `lg:justify-start` + fixed gap, or narrow/center the hero band. Removes the void.
- **B — Fill the center with purpose:** (1) a **live animated visualization teaser** (on-brand — the hero *shows* a visualization), or (2) the **5-lab mission preview strip** (the card component at [line 2122](components/visualizations/VisualizationLabPage.tsx) already exists) so labs are above the fold.
- **C (recommended) — 3-zone hero:** title+Start Quest left, animated viz teaser center, "Next up" right, with the 5-lab strip pulled up beneath. Turns the dead zone into the centerpiece.

**Guardrails:** collapse gracefully on narrow screens, keep animations light for Celeron GPUs (`prefers-reduced-motion`), stay on-brand.

---

<a name="q17"></a>
## Q17 — On the Practice Arena page the Grade/Difficulty/Topic/Question-type filters appear then disappear. Is this a bug? Can Claude detect it?

**Yes — confirmed a real bug (a render race), detected in code.**

The filter bar ([practice/page.tsx:2286-2341](app/practice/page.tsx)) is gated by `shouldShowFreeSelection` ([line 2274](app/practice/page.tsx)), derived from **two independently-resolving async states** ([lines 1222-1225](app/practice/page.tsx)):

```js
canFallbackToFreeSelection = questionCatalogLoaded && !questionCatalogError && !adaptivePlan;
shouldShowFreeSelection    = isFreeSelectionUnlocked || canFallbackToFreeSelection || hasManualTopicSelection;
```

Both are set async after mount. Sequence: (1) mount → hidden; (2) **catalog resolves first** while the adaptive-plan POST is still in flight (`adaptivePlan` still null) → `canFallbackToFreeSelection = true` → **filters appear**; (3) **adaptive plan resolves** (`setAdaptivePlan`) → filters vanish as the page switches to adaptive-mission mode ([line 2193](app/practice/page.tsx)). That's the flash — it hits anyone whose catalog loads before the adaptive decision (the common case).

**Fix:** add an `adaptivePlanSettled` flag (set true on every resolve path), gate the fallback on it (`… && adaptivePlanSettled && !adaptivePlan`), and render a stable skeleton until *both* the catalog and the adaptive decision have settled — then render exactly one mode, no toggle.

---

<a name="q18"></a>
## Q18 — Does MAIS have an effective, working adaptive-learning algorithm? What is it?

**Yes — it's Bayesian Knowledge Tracing (BKT).** Not a stub; fully wired.

Core in [`lib/adaptiveLearning.ts`](lib/adaptiveLearning.ts) (1,039 lines). Per-skill mastery (`pMastery`) updated after each response with the four canonical BKT parameters ([lines 19-23](lib/adaptiveLearning.ts)): prior 0.35, learn 0.12, slip 0.10, guess 0.20 — and the **exact BKT posterior update** at [lines 191-197](lib/adaptiveLearning.ts) (Corbett & Anderson, 1995). Layered on top:
- **Mastery-learning stages** (foundation → fluency → challenge)
- **Leitner spaced repetition** ([1, 3, 7, 14] days, `scheduleReview`)
- **Mastery / repair / prerequisite thresholds** (0.85 / 0.55 / 0.65)
- **Misconception tagging**, evidence-**confidence tiers** (thin/developing/strong), 5-question rounds
- **Hybrid LLM layer** — the LLM can advise, but is validated against the deterministic BKT engine (`validateLLMAdaptiveRecommendation`), which is the source of truth/fallback.
- Served by `/api/adaptive-learning/{next,refresh,universe}`, applied in [`app/practice/page.tsx`](app/practice/page.tsx); dedicated eval harness ([`lib/adaptiveLearningEval.ts`](lib/adaptiveLearningEval.ts)).

**Caveats:** parameters are **global/untuned** (same for every skill/student — fit per-skill from pilot data via the eval harness); and pedagogical **effectiveness is an empirical claim** the pilot should measure. The upgrade path is *calibrate*, not *build*.

---

<a name="q19"></a>
## Q19 — Does MAIS have an effective personalized knowledge path? What improvements does the Knowledge Universe/Galaxy need?

**Working v1 on a shallow backbone.** The **Galaxy** ([`lib/knowledgeGalaxyMap.ts`](lib/knowledgeGalaxyMap.ts)) renders one star per skill, colored by BKT mastery (`lit / unstable / fading / …`), with route/review/prerequisite edges and domain constellations on a golden-angle spiral. The estimate→select→visualize loop is closed and personalized.

**The limitation — thin path intelligence:**
- Prerequisites are **intra-topic stage chains only** ([adaptiveLearning.ts:148](lib/adaptiveLearning.ts): previous stage of the *same* topic) — no cross-topic/cross-standard graph.
- The galaxy "route" is just the **next 4 skills in list order** ([knowledgeGalaxyMap.ts:230-237](lib/knowledgeGalaxyMap.ts)).
- Cross-topic sequencing is grade-band linear → a mastery-*colored* map, not a true prerequisite-aware *path*.

**Improvements (prioritized):**
- **A (top) — Cross-topic prerequisite DAG** from the CCSS coherence/progressions map → enables **diagnostic backtracking** (route a failing G4 student to the exact missing G3 skill) + meaningful edges + real gating.
- **B — Per-skill BKT calibration** (Q18).
- **C — Diagnostic placement** to seed priors (day-one galaxy is currently all "undiscovered/unstable").
- **D — Computed route trajectory** (shortest mastery-gap path to a goal, with "why this next").
- **E — Finer-grained skills** (map to individual standards).
- **F — TEKS/CAS** multi-framework (CCSS-only today; Q5/Q14).
- **G — Surface confidence + due reviews** as star clarity/prominence.
- **H — HS standard-level stars** (currently sealed aggregates).

---

<a name="q20"></a>
## Q20 — The Practice Arena question area is unbalanced (nav pinned top-left) and too traditional for K-12. Suggestions?

**Agree on both, grounded:**
- **Imbalance:** the progress stepper + Prev/Next sit in a left-aligned flex block (`mt-3 flex flex-wrap gap-2`, [practice/page.tsx:870](app/practice/page.tsx)) that only takes intrinsic width → the card's right half is dead space.
- **Traditional look:** it reads as a plain form, off-brand vs. the island/galaxy world. *Credit:* the stepper already has star-pop/retry juice ([lines 846-864](app/practice/page.tsx)); and the question is **text-only** — no `QuestionFigure` illustration (the Q11 gap).

**Fixes — layout:** distribute the top card full-width (`justify-between`); better, **move primary "Next" to the bottom-right by "Check Answer"** (natural *answer → check → next* flow); **fill the emptied right with a live reward tracker** (stars/XP/streak); consider **merging** the two cards.

**Fixes — delight (K-12):** ① **add the `QuestionFigure` illustration** (biggest uplift + Q11 tie-in); ② evolve the stepper into a **quest trail**; ③ **warm colors + a vibrant CTA** (the "Check Answer" button is gray); ④ **answer-submit juice** (confetti/sound on correct; gentle "try again" + Nova hint on wrong); ⑤ a **mascot** (Nova) in the reclaimed space; ⑥ **age-band** the density.

**Guardrails:** fit 11.6" Chromebook / 10.2" iPad (Q10), keep Read aloud + a11y (Q5), light animations for Celeron (Q6/Q8), on-brand. **Quick wins:** rebalance the top + wire `QuestionFigure` for the fish question.

---

## Cross-cutting themes

- **De-China the student-data path** (Q3, Q4, Q5, Q9): Qwen/Alibaba, DeepSeek, SimpleTex → US-hosted. This is both a performance/quality and a compliance imperative.
- **Two systemic performance offenders** (Q6, Q8): the **1.7MB `/about` RSC prefetch** and the **~11MB question-bank static import** — fixing both is the highest-leverage perf work before the pilot.
- **Compliance & accessibility are the true blockers** (Q5, Q7, Q9, Q10): privacy/consent foundation, WCAG 2.1 AA / VPAT, AI safety escalation, TEKS/CAS standards.
- **The product engine is strong; the US layer is thin** (Q7, Q9): deep Teacher Console and tutoring mechanics exist; what's missing is US-curriculum grounding, safety nets, live monitoring, and equity surfaces.
- **Navigation clarity for young learners is a recurring UX thread** (Q10, Q12, Q13, Q15): keep the primary axis vertical, hide/reveal the menu without dead ends, put assigned work above the fold, and add a first-run tour — all pointing at "reduce first-session cognitive load for elementary users," with accessibility (Chromebook/iPad, WCAG, reduced-motion) as a constant constraint.
- **Reuse-over-rebuild keeps recurring** (Q11, Q12, Q14, Q15): the illustration renderer, menu-collapse pattern, CCSS lab coverage, and guided-tour engine already largely exist — most requested work is "extend/populate/consolidate," not "build from scratch."
- **Coverage is strong where the pilot needs it** (Q14): K-5 CCSS visualization-lab coverage is 100%; the gaps are a middle-school (G6-8) trough — a scaling concern, not a pilot blocker.
- **The adaptive intelligence is real but v1** (Q18, Q19): a genuine Bayesian Knowledge Tracing engine drives a live, personalized Knowledge Galaxy — but its parameters are untuned and its prerequisite model is intra-topic only. The highest-leverage upgrades are *calibration + a cross-topic prerequisite DAG + a diagnostic placement*, not a rebuild.
- **Async-state races surface as UI bugs** (Q6, Q8, Q17): the filter flash, the slow lesson/login loads, and the practice-mode flicker all trace to state/data resolving at unmanaged times — settle-then-render (skeletons, gates) is the recurring fix.
- **Engagement & polish for elementary learners** (Q16, Q20, plus Q11): fill empty space with purpose, carry the juice you already have into the layout and the question card, and add deterministic illustrations — small changes that move the product from "worksheet" to "game" for K-12.

---

*Prepared by Claude (Claude Code, Opus 4.8) on 2026-07-21. Findings grounded in the MAIS-MVP codebase and live measurements of www.mais.ac where noted. Compliance items are engineering-level observations, not legal advice — confirm with qualified edtech-privacy counsel.*
