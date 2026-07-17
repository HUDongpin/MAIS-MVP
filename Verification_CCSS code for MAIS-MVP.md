# Verification Report — CCSS Code Compliance of the MAIS-MVP California Math Curriculum

**Date:** 2026-07-18
**Scope:** Whether the knowledge points in the MAIS-MVP California math track (`US_CA_MATH`) follow the Common Core State Standards (CCSS) coding scheme.
**Method:** Static analysis of the California curriculum data, generated question banks, lesson layers, and visualization-lab alignment metadata, plus programmatic validation of the standard identifiers against the official CCSS enumeration.

---

## 1. Executive Summary — Verdict

**Partially compliant, by design.** The California curriculum uses *two different code systems for two different purposes*, and they must not be conflated:

| Layer | What the code looks like | Is it a CCSS code? |
|---|---|---|
| **Knowledge-point code** (user-facing "title" prefix) | `K-A.1`, `1-H.1`, `3-C.1`, `5-E.1` | **No.** This is an IXL-style, MAIS-authored `<grade>-<letter>.<n>` scheme, *not* CCSS. |
| **`standardIds` alignment metadata** (per question / per lesson) | `K.CC.1`, `3.NF.2`, `CA.CCSS.Math.G6.RP`, `CA.CCSS.Math.HS.A-APR`, `A-APR.1` | **Yes** — genuine CCSS identifiers, at varying granularity. |

So the literal answer to "do the knowledge points follow the CCSS code?" is:

- The **displayed knowledge-point codes do *not* follow CCSS** — they follow an IXL/skill-tree naming convention. This is intentional: the code and lesson copy repeatedly describe them as *"MAIS-authored / MAIS-owned knowledge points… aligned to [CCSS] as metadata only."*
- The **CCSS linkage is carried separately** in a `standardIds` field, and where present it is **structurally valid CCSS**. Three defects were found in the original audit (§5); **all three have since been fixed and verified** — see §4a.

The design is defensible (a MAIS knowledge point maps to one or more CCSS standards, which is normal for curriculum products), but it is **not** the case that "the knowledge points *are* CCSS codes." They are a distinct proprietary index that references CCSS.

---

## 2. What Was Examined

Primary sources in the repository:

- [`data/usCaliforniaKnowledgePoints.ts`](data/usCaliforniaKnowledgePoints.ts) — the knowledge-point code generator.
- [`data/usCaliforniaMicroLessons.ts`](data/usCaliforniaMicroLessons.ts) — micro-lesson knowledge-point codes.
- [`data/usCaliforniaTopics.ts`](data/usCaliforniaTopics.ts), [`data/usCaliforniaLessons.ts`](data/usCaliforniaLessons.ts) — how codes and standards are surfaced in lessons.
- [`data/visualizationLabs.ts`](data/visualizationLabs.ts) — high-school CCSS domain enumeration.
- Generated question banks under `data/generated-content/`:
  - `us-ca-k5-knowledge-point-practice-v1` (492 questions)
  - `us-ca-math-k-g5-generated-bank-v3-deepseek-1500` (1,500)
  - `us-ca-math-g6-g12-generated-bank-v2-1500` (1,500)
  - `us-ca-math-k-g5-textbooks-v1` (29 lessons)

---

## 3. Finding A — The Knowledge-Point Codes Are IXL-Style, Not CCSS

The `code` field that prefixes every California knowledge-point title is generated in [`data/usCaliforniaKnowledgePoints.ts`](data/usCaliforniaKnowledgePoints.ts) as `<gradeNumber>-<letter>.<n>`:

```
K-A.1  Kindergarten Counting and Cardinality: Count Sequence
K-B.1  Kindergarten Counting and Cardinality: Cardinality Compare
1-A.1  Grade 1 Operations and Algebraic Thinking: Add Subtract
3-C.1  Grade 3 Number and Operations - Fractions: Fraction Meaning
5-E.1  Grade 5 Geometry: Coordinate Shapes
```

The letter is assigned by chapter index (`letterForIndex`), and micro-lessons extend the same scheme (`1-H.1`, `1-L.2`, …).

**This is the IXL "skill code" pattern (`grade-letter.number`), not the CCSS pattern.** A genuine CCSS code for the same content would look like `K.CC.A.1`, `3.NF.A.1`, or `5.G.A.1` — i.e. `<grade>.<domain>.<cluster>.<standard>`.

A repository-wide search for genuine CCSS-format identifiers (`K.CC.A.1`, `3.OA.A.1`, etc.) in the knowledge-point definitions returned **zero matches**. The knowledge-point *codes* themselves contain no CCSS structure.

The code and lesson copy are explicit and consistent about this (from [`data/usCaliforniaLessons.ts`](data/usCaliforniaLessons.ts)):

> "…is a **MAIS-authored knowledge point** for [domain], **aligned to** [standardIds]."
> "…is a **MAIS-owned California knowledge point aligned to** [standards] **as metadata only**."

**Conclusion:** the knowledge points deliberately do not follow CCSS codes; CCSS is attached as separate alignment metadata.

---

## 4. Finding B — Where CCSS Codes *Do* Appear (and Their Granularity)

CCSS identifiers live only in the `standardIds` metadata field. Three distinct granularity levels are in use:

### 4.1 K-5 knowledge-point practice bank — *standard-level* (best fidelity)
`data/generated-content/us-ca-k5-knowledge-point-practice-v1` uses fully numbered standards:

```
K : K.CC.1..7, K.OA.1..5, K.NBT.1, K.MD.1..3, K.G.1..6
1 : 1.OA.1..8, 1.NBT.1..6, 1.MD.1..4, 1.G.1..3
…
5 : 5.OA.1..3, 5.NBT.1..7, 5.NF.1..7, 5.MD.1..5, 5.G.1..4
```

**Validation result (28 domains, K-5):** every domain's standard **count and 1..n contiguity exactly match the official CCSS enumeration** — 0 mismatches. Each question's `standardIds` domain also matches its `topicId` domain slug (e.g. `us-ca-math-p3-3-nf-*` → `3.NF.*`), so the mapping is internally coherent.
*Caveat:* the **cluster letter is omitted** — the repo writes `K.CC.1`, official CCSS writes `K.CC.A.1` (see §5.1).

### 4.2 K-5 DeepSeek bank & G6-G12 bank — *domain-level* (coarse)
`us-ca-math-k-g5-generated-bank-v3-deepseek-1500` and `us-ca-math-g6-g12-generated-bank-v2-1500` tag only the domain, namespaced as `CA.CCSS.Math.*`:

```
K.CC / K.OA …            → CA.CCSS.Math.K.CC, CA.CCSS.Math.K.OA, …
G6 ratios/number/…       → CA.CCSS.Math.G6.RP, .G6.NS, .G6.EE, .G6.G, .G6.SP
G8 adds functions        → CA.CCSS.Math.G8.F  (correct — F domain begins at G8)
High school (S3-S6)      → CA.CCSS.Math.HS.A-APR, .HS.F-IF, .HS.G-CO, .HS.S-ID, …
```

Grade→domain assignment is CCSS-faithful: G6 has no `F` domain (functions start Grade 8), G8 correctly introduces `.F`, and the HS conceptual categories (Number & Quantity `N-`, Algebra `A-`, Functions `F-`, Geometry `G-`, Statistics `S-`) are used instead of grade numbers — exactly as CCSS structures high school. These IDs stop at the domain and carry **no individual standard number**.

### 4.3 Visualization labs — *standard-level HS* (enumerated)
[`data/visualizationLabs.ts`](data/visualizationLabs.ts) enumerates each HS domain to the individual standard (`A-APR.1`…`A-APR.7`, `G-CO.1`…`G-CO.13`, etc.). Validated against official CCSS (see §5.3): 21 of 22 domains are exact.

---

## 4a. Remediation Status (2026-07-18)

All three actionable defects from §5 have been fixed and verified in this branch. Details of each fix are inlined in §5; summary:

| # | Defect | Status | Change |
|---|---|---|---|
| 1 | `G-GMD.5`/`G-GMD.6` don't exist in CCSS | **Fixed** | Removed from [`data/visualizationLabs.ts`](data/visualizationLabs.ts); all 22 HS domains now match official CCSS counts exactly. |
| 2 | K-5 IDs drop the cluster letter (`K.CC.1`) | **Fixed** | 5,138 K-5 codes across 5 files rewritten to canonical CCSS (`K.CC.A.1`); domain-resolution helpers made cluster-aware; 28/28 domains still count-exact. |
| 3 | Mathematical Practice standards (MP1–MP8) absent | **Fixed** | Added [`data/usCaliforniaMathematicalPractices.ts`](data/usCaliforniaMathematicalPractices.ts) (canonical `CCSS.MATH.PRACTICE.MP1..8`, trilingual), re-exported from the CA knowledge-points surface, with a test. |

**Verification performed:** `tsc --noEmit` → 0 errors; targeted test run (`usCaliforniaMathematicalPractices.test`, `usCaliforniaLessons.test`, `lib/rag/usMath.test`) → **30/30 pass**; programmatic re-check that all 28 K-5 domains preserve official CCSS standard counts and contiguity after canonicalization; confirmed no remaining cluster-less K-5 codes and no e2e/snapshot test asserts the legacy form.

---

## 5. Defects and Deviations Found

### 5.1 Cluster letter dropped in K-5 standard IDs (systematic, low severity) — ✅ FIXED
The K-5 practice bank wrote `K.CC.1` / `3.NF.2` where canonical CCSS is `K.CC.A.1` / `3.NF.A.2`. Because CCSS numbers standards contiguously within a domain, the mapping was *lossless and recoverable* (e.g. `K.CC.4` unambiguously = `K.CC.B.4`), but it was **not the exact canonical string**, so any downstream system doing exact-string CCSS matching would fail to join these.

**Fix applied:** all 5,138 K-5 standard tokens across five files — the K-5 knowledge-point practice bank (`question-pack.json`), the K-5 textbook lessons (`lessons.json`), [`data/usCaliforniaMicroLessons.ts`](data/usCaliforniaMicroLessons.ts), [`data/usCaliforniaLessonIllustrations.ts`](data/usCaliforniaLessonIllustrations.ts), and the domain/cluster maps in [`data/visualizationLabs.ts`](data/visualizationLabs.ts) — were rewritten to canonical CCSS using the official CCSS-M cluster-letter structure (e.g. `2.MD.7` → `2.MD.C.7`, `2.MD.9` → `2.MD.D.9`). The two format-sensitive helpers in `visualizationLabs.ts` (`domainCodeFromStandardId`, `extractCaliforniaStandardIds`) were made cluster-aware so domain resolution still returns `<grade>.<DOMAIN>`. Post-fix validation confirmed **28/28 K-5 domains still match official CCSS counts and 1..n contiguity**, and RAG substring matching (`kcca1` still contains `kcc`) and the `startsWith("1.OA.")` coverage test are both unaffected.

### 5.2 `G-GMD` over-enumerated in visualization labs (concrete error) — ✅ FIXED
[`data/visualizationLabs.ts`](data/visualizationLabs.ts) previously listed:

```
"G-GMD": standardIds: ["G-GMD.1","G-GMD.2","G-GMD.3","G-GMD.4","G-GMD.5","G-GMD.6"]
```

Official CCSS **G-GMD contains only 4 standards (G-GMD.1–4)**. `G-GMD.5` and `G-GMD.6` **do not exist** in CCSS.

**Fix applied:** the array is now `["G-GMD.1","G-GMD.2","G-GMD.3","G-GMD.4"]`. All 22 HS domains now enumerate the exact official CCSS standard count.

### 5.3 HS domain enumeration otherwise exact
Validation of all 22 HS domain arrays in `visualizationLabs.ts` against official CCSS standard counts: **21/22 exact** (`A-APR`=7, `A-REI`=12, `F-IF`=9, `G-CO`=13, `N-VM`=12, `S-CP`=9, …). Only `G-GMD` (§5.2) deviates.

### 5.4 Standards for Mathematical Practice (MP1–MP8) absent — ✅ FIXED
No `MP1`…`MP8` / "Mathematical Practice" references existed anywhere in the California data. CCSS-M has two halves — content standards (covered) and the eight Practice standards (not represented). For a claim of full CCSS coverage this was a gap.

**Fix applied:** added [`data/usCaliforniaMathematicalPractices.ts`](data/usCaliforniaMathematicalPractices.ts) — the eight Standards for Mathematical Practice as first-class canonical reference data, each with its official CCSS identifier (`CCSS.MATH.PRACTICE.MP1` … `MP8`), short code, and trilingual (en/zh/zhHans) title and description. They are re-exported from the California knowledge-points surface ([`data/usCaliforniaKnowledgePoints.ts`](data/usCaliforniaKnowledgePoints.ts)) so they are part of the curriculum's standards coverage rather than dead code, and are locked in by [`data/usCaliforniaMathematicalPractices.test.ts`](data/usCaliforniaMathematicalPractices.test.ts) (completeness, ordering, canonical ids, trilingual content, re-export).

### 5.5 Namespacing note (not a defect)
The `CA.CCSS.Math.*` prefix is a deliberate namespace, not a malformed code. California adopted CCSS-M with California-specific additions, so branding the domain IDs as `CA.CCSS.Math` is reasonable. It does, however, mean these are **not** bare CCSS strings and would need normalization to match a national CCSS dictionary.

---

## 6. How the Codes Surface to Users

- **Knowledge-point code** (`K-A.1`, IXL-style) is the visible title prefix via `californiaKnowledgePointDisplayTitle` in [`data/usCaliforniaTopics.ts`](data/usCaliforniaTopics.ts) and [`data/usCaliforniaLessons.ts`](data/usCaliforniaLessons.ts). **This is what students/teachers see first.**
- **CCSS `standardIds`** are rendered as chips in the middle-school textbook pages ([`components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx:107`](components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx), [`CaliforniaMiddleSchoolTextbookPage.tsx:220`](components/lesson/CaliforniaMiddleSchoolTextbookPage.tsx)) and appear in the "Progress and standards coverage" teacher-guide block, explicitly framed as *alignment metadata*, not as the knowledge-point identity.
- The RAG layer ([`lib/rag/usMath.ts`](lib/rag/usMath.ts)) matches on `standardIds`, so the CCSS metadata is functional, not decorative.

---

## 7. Recommendations

1. ✅ **Done — Fix `G-GMD` (§5.2):** `G-GMD.5`/`G-GMD.6` removed from [`data/visualizationLabs.ts`](data/visualizationLabs.ts).
2. ✅ **Done — Add cluster letters (§5.1):** all K-5 `standardIds` normalized to canonical CCSS (`K.CC.1` → `K.CC.A.1`) across the data and helpers.
3. ✅ **Done — MP standards (§5.4):** `MP1–MP8` added as canonical, tested reference data.
4. **Keep the two-tier model but document it (open):** the split of "IXL-style knowledge-point code + CCSS `standardIds` metadata" is sound, but any external claim should say *"aligned to CCSS"*, never *"knowledge points are CCSS-coded."* The codebase copy already does this correctly.
5. **Normalize namespacing (open):** if these IDs must join a national CCSS registry, strip the `CA.CCSS.Math.` prefix (`CA.CCSS.Math.G6.RP` → `6.RP`). Left as-is deliberately, since the prefix documents California's adoption-with-additions.

---

## 8. Evidence Appendix

- Knowledge-point code generator: [`data/usCaliforniaKnowledgePoints.ts:11-33, 50-224, 253-261`](data/usCaliforniaKnowledgePoints.ts)
- "MAIS-authored… aligned to… as metadata only" framing: [`data/usCaliforniaLessons.ts:518, 602`](data/usCaliforniaLessons.ts)
- K-5 standard-level pack validated 28/28 domains against official CCSS counts (0 mismatches; cluster letters absent).
- G6-G12 grade→domain map validated CCSS-faithful (G8 introduces `.F`; HS uses conceptual categories).
- HS domain enumeration validated 21/22 exact; `G-GMD` over-enumerated by 2.
- MP1–MP8: 0 occurrences repo-wide.

*Prepared by static verification of the MAIS-MVP repository at branch `fix/teacher-console-qa-bug-report`.*
