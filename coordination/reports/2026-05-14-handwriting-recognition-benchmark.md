# Handwriting Recognition Benchmark Plan

- Date: 2026-05-14
- Workstream: Practice handwriting conversion
- Recommendation: Use math-aware OCR as the primary recognizer, with LLM vision only as an optional fallback.

## Candidate Comparison

| Path | Best use | Strengths | Risks | v1 role |
| --- | --- | --- | --- | --- |
| Local heuristic | Offline numeric demo | No cost, no network, private | Narrow digit-only coverage; brittle on natural handwriting | Fallback only |
| Mathpix strokes | Live handwritten math/STEM answers | Stroke endpoint fits current board data; supports math/text output | Requires server keys and cost controls | Preferred cloud pilot |
| MyScript iink | Enterprise interactive ink | Mature ink model and deployment options | SDK integration and licensing work | Enterprise evaluation |
| Azure OCR | General handwritten text/photos | Strong document OCR ecosystem | Not optimized for live math-stroke answers | Secondary for text/photo OCR |
| LLM vision | Fallback interpretation/explanation | Can normalize ambiguous OCR candidates | Possible hallucination; higher cost/latency | Never source of truth |

## Internal Evaluation Set

| Category | Samples |
| --- | --- |
| Digits | `0` through `9`, `25`, `100`, unclear `25` |
| Symbols | `-2`, `3.5`, `30°`, `HK$5` |
| Fractions | `3/5`, `1/2`, `7/10` |
| Algebra | `5x`, `x^2`, `3x+2x`, `7x^2` |
| Failure states | blank canvas, heavy scribble, overlapping digits |

## Acceptance Target

- Clear digits and simple algebra: at least 95% accuracy on internal samples.
- Median conversion latency: below 1.5 seconds.
- Privacy: no raw handwriting storage unless QA capture is explicitly enabled.
- UX: recognized text fills the answer field only above the configured confidence threshold; otherwise students choose a suggestion or edit manually.
