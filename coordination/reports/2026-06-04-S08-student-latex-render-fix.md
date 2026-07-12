# S08 Student LaTeX Render Fix - 2026-06-04

## Scope

- Surface checked: local student Practice Arena and Lesson seeds.
- Data scanned after fix: 18,878 integrated Practice Arena questions and 325 Lesson seeds.
- Integrated curriculum counts in the scanned student question data: HK 986, Mainland 17,700, US CA 96, US NC 96.
- Code changed: `components/math/mathTextFormatting.ts`.
- Data changed: none.

## Fixes Applied

- Recovered malformed HK currency fragments such as `\(\\)500`, `\)3\(`, `\)\\(128\)`, `\12.6`, and `\\$120` into readable `HK$...` text.
- Protected valid double-escaped math delimiters before currency cleanup so `\\(1 - \frac{11}{15}\\)` no longer becomes `HK$1 ... \)`.
- Wrapped bare `\left...\right` arithmetic expressions as one KaTeX segment.
- Wrapped bare `\log_b \frac{...}{...}` products as one KaTeX segment.
- Wrapped bare `\sqrt{...}`, `\frac{...}{...}`, `\lg`, signed fractions, and simple powered terms when safe.
- Normalized `\timesm` to `\times m` inside delimited math.
- Recovered form-feed `\frac` artifacts from generated accepted-answer text.
- Normalized `a^(1/2)` style powers inside delimited math to `a^{1/2}`.
- Cleared the stricter bare exponent pass for `cm^2`, `cm³`, `x^2`, `ab^2`, `radius ^2`, indexed roots such as `^3√50`, and blank-template powers such as `(x - ______)^2`.
- Kept bare algebraic `m^2`/`9m^2-16n^2` as variables instead of formatting them as square-meter units; numeric area units like `9 cm^2`, `24cm^3`, and `42 cm²` still render as unit math.

## Verification

- `npm run type-check`: passed.
- Exhaustive render audit after fix:
  - `invalid-delimited-tex`: 0
  - `latex-command-outside-mathtext-delimiter`: 0
  - `bare-log-outside-mathtext-delimiter`: 0
  - `bare-exponent-outside-mathtext-delimiter`: 0
  - `stray-math-delimiter-outside-rendered-segment`: 0
  - `control-character-tex-artifact`: 0
  - `malformed-currency-backslash`: 0
  - Lesson rows with those failures: 0
- Strict bare-exponent follow-up audit:
  - Practice issue rows: 0
  - Lesson issue rows: 0
  - Unique affected Practice IDs remaining: 0
  - Unique affected Lesson seeds remaining: 0
- Playwright browser check passed for representative fixed questions:
  - HK currency/delimiter: `hk-ease-10639`, `hk-ease-10404`, `hk-ease-10478`, `hk-ease-746`
  - HK `\left/\right`: `hk-ease-3671`
  - Mainland HJB log/fraction and sqrt/lg: `hjb-high-ds-v2-s4-149`, `hjb-high-ds-v2-s4-147`
  - Mainland HJB double-escaped fractions: `hjb-primary-ds-v1-p5-171`
  - Mainland BNU simple powered terms: `bnu-junior-ds-v1-s1-108`
- Browser verification on fresh dev server `http://localhost:3099`:
  - `/practice` rendered a filtered Foundation question card with 8 KaTeX nodes and 0 raw delimiter/caret exponent artifacts in the question section.
  - `/student/lessons/quadratic-functions` rendered with 25 KaTeX nodes and 0 raw delimiter/caret exponent artifacts in the lesson main content.

## Remaining Risk

- The broad generated English content still contains awkward machine-token prose such as `term-...`; this pass only fixed math rendering artifacts and did not rewrite source question text.
- The Lesson browser route logs an expected guest-mode `401` for `/api/me?includeLessonEntry=false`; the lesson page itself served `200` and rendered correctly.
