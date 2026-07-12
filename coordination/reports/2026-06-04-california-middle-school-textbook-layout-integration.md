# California Middle School Textbook Layout Integration

- Date: 2026-06-04
- Coordinator: S10
- Owner request: assign and execute S05/S06/S09/S11/S18 follow-up for California middle-school math textbook layout.
- Delivery route: `/lesson/california-middle-school-textbook/review`

## Role Assignments

| Session | Assignment | Scope | Status |
| --- | --- | --- | --- |
| S05 | Compose a G6-G8 textbook review page from `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json`. | `app/lesson/`, `components/lesson/` | Implemented as review layout, not final lesson launch. |
| S06 | Attach concept visuals and deterministic exact-layer renders to each chapter. | `public/lesson-illustrations/us-ca-middle-school/` and lesson layout media slots | Implemented using S18-reviewed concept PNGs and exact-layer PNG renders. |
| S09 | Review bilingual copy and alt/caption readiness. | Copy/accessibility review only | Applied trilingual headings/body display and bilingual alt/caption strings; final terminology still needs post-render review. |
| S11 | Run browser and mobile regression after integration. | Type-check plus desktop/mobile browser route checks | Pending at this checkpoint. |
| S18 | Re-review final composed page. | `coordination/content-qa/` final decision artifact | Pending; current S18 scout flags content alignment hold. |

## Integration Boundary

This is a `California Math Practice Beta` review layout. It is not a full California lesson/course/curriculum launch.

S18 inspection found the generated G6-G8 textbook package is structurally valid but not eligible as a final textbook/lesson page because several worked example and practice prompts reuse a unit-rate/tile template across unrelated chapters. The implemented page therefore:

- Shows G6-G8 chapter structure, standards IDs, concept explanations, learning goals, glossary, and exit ticket.
- Shows chapter-level concept art only as non-answer-critical openers.
- Shows deterministic exact-layer PNG renders for precise math visuals.
- Holds worked examples and practice prompts from student release until S18 repair and answer validation.
- Sets the route metadata to `noindex`.

## Files Changed

- `app/lesson/california-middle-school-textbook/review/page.tsx`
- `components/lesson/CaliforniaMiddleSchoolTextbookPage.tsx`
- `public/lesson-illustrations/us-ca-middle-school/candidates/`
- `public/lesson-illustrations/us-ca-middle-school/exact-layer-renders/`
- `coordination/reports/2026-06-04-california-middle-school-textbook-layout-integration.md`

## Follow-Up Gates

- S11: inspect `/lesson/california-middle-school-textbook/review` on desktop and mobile.
- S18: record final page review. Expected decision is conditional/blocked until chapter-specific examples and practice are repaired.
- S05/S21/S18: produce an app-ready, chapter-aligned lesson module before promoting this beyond review layout.
