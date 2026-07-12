# S11 Student Lesson/Practice LaTeX Render Audit - 2026-06-04

## Scope

- Session: S11 QA and release quality.
- Objective: Exhaustively audit the local MAIS-MVP student-facing Lesson and Practice Arena display strings for LaTeX that remains visible instead of rendering as readable math.
- Local state audited: current worktree on 2026-06-04, against the current `components/math/mathTextFormatting.ts` and `MathText` behavior.
- Data sources: integrated student questions exported by `data/questions.ts`, integrated production Lesson seeds exported by `data/lessons.ts`, and visible student render paths in `PracticeQuestionCard` / Lesson block `MathText`.
- Excluded: generated candidate US packs under `data/generated-content/` because they are not currently exported through `data/questions.ts` or available through student `/api/questions`.

## Exhaustive Data Audit Result

- Integrated Practice Arena questions scanned: 18,686.
- Integrated Lesson seeds scanned: 325.
- Practice question display fields scanned: 136,626.
- Practice feedback fields scanned: 112,116.
- Lesson title/content/item fields scanned: 17,304.
- US integrated student questions: 0.
- US integrated student lessons: 0.
- Current visible render-risk rows found: 11.
- Unique affected Practice Arena question IDs: 5.
- Unique affected Lesson-only IDs: 0.

## Coverage By Region

| Region | Integrated questions | Integrated Lesson seeds | Current render-risk rows |
| --- | ---: | ---: | ---: |
| Hong Kong | 986 | 49 | 5 |
| Mainland China | 17,700 | 276 | 6 |
| United States | 0 | 0 | 0 |

US note: `/api/questions?curriculumTrack=US_CA_MATH` and `/api/questions?curriculumTrack=US_NC_MATH` both returned `200` with `0` questions on the local dev server. The US demo login succeeds, but student content is currently unavailable rather than displaying question LaTeX.

## All Current Findings

| ID | Region | Publisher | Grade | Surface | Field | Languages | Issue | Visible/current display sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hk-ease-10639` | HK | HK | P3 | Practice Arena | prompt | en | stray delimiter outside rendered segment | `Mr. Chan has HK$500 . He bought\)3 movie tickets atHK$85 each...` |
| `hk-ease-10404` | HK | HK | P4 | Practice Arena | prompt | en | stray delimiter outside rendered segment | `Tickets ... sold\)15 adult tickets and 12 student tickets...` |
| `hk-ease-3671` | HK | HK | S1 | Practice Arena | prompt | en, zh, zh-Hans | LaTeX command outside delimiter | `(a) \left[20+(32-21)\right]×5 (b) 56÷\left[(25+7)÷4\right]` |
| `hjb-primary-ds-v1-p5-171` | Mainland | MAINLAND_HJB | P5 | Practice Arena feedback | explanation | en, zh, zh-Hans | stray delimiter / malformed currency normalization | `...小妹妹分得剩下的：HK$1 - 15/11 = 15/4 \)。` |
| `hjb-high-ds-v2-s4-149` | Mainland | MAINLAND_HJB | S4 | Practice Arena | prompt | en, zh, zh-Hans | invalid delimited TeX after normalization | `\log_{2} \frac{1}{25} ⋅ \log_{3} \frac{1}{8} ⋅ \log_{5} \frac{1}{9}` remains visible rather than fully typeset. |

## Browser Verification

- Local dev server: `npm run dev -- -p 3099`.
- Playwright probe used the real Practice Arena page and `PracticeQuestionCard`/`MathText` render path.
- To bypass the current Practice Arena first-5-question display limit, the probe fulfilled local `/api/questions` with each exact integrated target question, then selected the target topic in the UI.
- Confirmed visible DOM samples:
  - `hk-ease-10639`: visible `bought\)3` and `atHK$85`.
  - `hk-ease-3671`: visible `\left` and `\right` in the question title.
  - `hjb-high-ds-v2-s4-149`: visible `\log_{2} \frac{1}{25}` style text instead of a fully rendered formula.
  - `hjb-primary-ds-v1-p5-171`: after answer feedback, visible `HK$1 ... \)` in the explanation.

## Interpretation

- The current local math normalizer appears to have already fixed the earlier broad class of bare `\frac`, `\times`, and `log_` prompt issues; the prior S18 artifact from earlier on 2026-06-04 recorded a much larger pre-current-code risk set.
- Remaining prompt issues are narrower:
  - malformed currency/math delimiters in HK EASE rows,
  - bare structural commands such as `\left` / `\right`,
  - log-plus-fraction strings where normalization wraps only part of the expression.
- Lesson-only text currently has no residual LaTeX render-risk rows under this audit. Lesson practice questions reuse the same question render path, so affected linked practice questions would still be risky when surfaced there.

## Checks

- `git status --short`: ran before audit; many pre-existing owner/session changes present.
- `npx tsx` data audit: passed and scanned current integrated question/Lesson exports.
- Local `/api/questions` US availability check: `US_CA_MATH` and `US_NC_MATH` returned 0 questions.
- Playwright page probes: passed for representative current findings.
- Not run: `npm run type-check`; report-only QA change, no app source edits.
- Not run: `npm run build`; report-only QA change and current worktree has many unrelated active edits.

## Recommended Owners

- S04/S18: inspect and repair the exact question text rows where the issue is data-specific.
- S08/S09 or owning UI session by assignment: consider extending `normalizeMathTextForDisplay` for `\left...\right` and log/fraction whole-expression wrapping once the data-specific rows are reviewed.
- S21/S18: if US generated content is later integrated into `data/questions.ts`, rerun this audit before exposing US Practice Arena questions to students.
