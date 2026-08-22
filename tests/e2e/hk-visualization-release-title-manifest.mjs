const grades = [
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
];
const machineViewports = ["desktop", "tablet", "mobile"];
const lessonViewports = ["desktop", "mobile"];
const languages = ["en", "zh", "zh-Hans"];
const themes = ["light", "dark"];

export const HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS = 300_000;
export const HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS = 500_000;
export const HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE =
  "projects every triangle endpoint request in exact fresh-page v2 chunks with six-owner metadata";
// The exact triangle plan depends on live, preflighted range descriptors. The
// browser test binds its computed v2 plan budget below this frozen cap before
// any chunk executes; the release supervisor reserves the same cap up front.
export const HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS =
  12_000_000;

const machineTitles = [
  "matrix manifest is complete for the requested scope",
  "false-pass guard helpers reject broad, untranslated, and non-transition evidence",
  ...machineViewports.flatMap((viewport) =>
    languages.flatMap((language) =>
      themes.flatMap((theme) =>
        grades.map(
          (grade) =>
            `hk-viz-${grade}-${viewport}-${language}-${theme} exercises every selected HK lab`,
        ),
      ),
    ),
  ),
];

const lessonTitles = [
  "source manifest hard-gates one exact embedded lesson for all 51 registry ids",
  "lesson browser option resolver defaults to full and rejects partial false-passes",
  "visibility-chain helper rejects hidden, inert, aria-hidden, and transparent ancestors",
  "source guard keeps local visibility paths ancestor-aware and reuses the hardened machine scanners",
  ...lessonViewports.flatMap((viewport) =>
    grades.map(
      (grade) => `${viewport}/${grade} verifies every planned lesson embed`,
    ),
  ),
];

const stateTitles = [
  "51-topic reset/state contract supplies exact moduleId and topicId selectors",
  "helper rejects a user+module overwrite with explicit missing-topic diagnostics",
  "pure exact-new-topic evidence accepts coexistence and two idempotent completed repeats",
  "pure two-topic evidence rejects a malformed extra row in a raw GET response",
  "pure two-topic evidence rejects a GET row missing required timestamp semantics",
  "pure exact-new-topic evidence requires completed topic A and sibling topic B to stay stable",
  "pure duplicate evidence rejects recreation of the same triple completion",
  "pure 51-topic evidence rejects malformed extras instead of filtering them away",
  "pure 51-topic evidence requires completedAt and updatedAt on every raw record",
  "pure auth evidence binds the active session to the newly registered student identity",
  "pure source-readiness and 51-topic persistence gates remain independent test cases",
  "pure render-only probes reject visualization writes without misclassifying ordinary lifecycle telemetry",
  "pure 51-topic assertion preserves every legacy and new topic as a distinct triple",
  "one disposable student retains two exact topic records under the shared configured module",
  "rendering an embedded lesson lab without interaction creates no session, visualization event, or reward",
  "exact new topic identities-square-patterns separates lesson start from first lab interaction",
  "exact new topic arc-length-sector-area separates lesson start from first lab interaction",
  "51-topic lesson source readiness is exact before lesson release",
  "51-topic API persistence retains exactly 51 distinct triples",
];

const collisionTitles = [
  "returns exact zero coverage without inventing a scanner issue",
  "counts an eligible non-colliding control pair independently of issues",
  "keeps eligible pair accounting beyond the bounded issue evidence",
  "rejects HTML text that overlaps SVG text across rendering layers",
  "rejects an SVG label crossing a thick horizontal line mark",
  "distinguishes painted line and polyline strokes from empty bounding-box regions",
  "distinguishes rect strokes and circle fills from their empty bounding-box regions",
  "uses transformed multi-segment path paint instead of its screen bounding box",
  "keeps geometry checks compatible with clipping, root-self surfaces, and unsupported marks",
  "rejects overlapping leaf tspans inside one SVG text element",
  "rejects absolutely positioned descendant text over ancestor text",
  "rejects overlapping sibling labels inside one button",
  "rejects a label whose associated input covers its text",
  "does not compare a control with its own text",
  "expands a semantic SVG group mark to its painted leaf geometry",
  "rejects a tiny overflow-visible overlap owner spoof",
  "allows an explicitly owned label inside its own narrow mark",
  "audits the workspace root when it is the horizontal scroll container",
  "rejects ordinary DOM text clipped by an overflow-hidden ancestor",
  "rejects ordinary DOM text clipped by a CSS clip-path",
  "allows content that remains inside a CSS clip-path",
  "rejects text clipped by a circular ancestor clip-path",
  "allows text wholly contained by a circular ancestor clip-path",
  "rejects text clipped by a polygon on its own element",
  "allows text inside a full-box polygon clip-path",
  "rejects learner text clipped by a clip-path on its own element",
  "rejects learner text positioned wholly outside every reachable viewport",
  "rejects off-viewport text even when its oversized parent box intersects the viewport",
  "clips off-scrollport SVG collision candidates before and after horizontal scroll",
  "ignores deliberately inert off-viewport DOM",
  "ignores overlapping labels inside deliberately inert DOM",
  "rejects text covered by an opaque later-painted sibling",
  "allows text painted after its opaque background sibling",
  "allows a transparent later-painted sibling over text",
  "rejects text occluded by an opaque ::before pseudo-element",
  "rejects text occluded by an opaque ::after pseudo-element",
  "allows an opaque pseudo-element painted behind learner text",
  "rejects an opaque canvas painted over learner text but allows a transparent canvas",
  "fails closed for a positioned CSS background image over text and allows one behind text",
  "rejects a positioned video poster over text and allows it behind text",
  "rejects a narrow opaque occluder covering only the first glyph edge",
  "allows a narrow opaque sibling that stops before the first glyph",
  "does not report normally wrapped multiline DOM text as a collision",
  "rejects canvas-only HK surfaces and accepts an actual SVG surface",
];

const contrastTitles = [
  "fails closed for ancestor opacity instead of independently alpha-blending group text",
  "fails closed for CSS background images and positioned overlapping backgrounds",
  "normalizes modern CSS colors before calculating contrast",
  "checks the actual tspan paint instead of inheriting the parent text paint",
  "never treats SVG paint servers or stroke-only backgrounds as transparent",
  "fails closed for filter mask and mix-blend compositing",
  "uses the small-text threshold when an SVG transform shrinks large declared text",
  "rejects a label whose glyph region crosses different SVG backgrounds",
  "detects positioned paint even when pointer hit-testing is disabled",
  "scans direct SVG text nodes alongside their child tspans",
  "uses the small-text threshold when an ancestor SVG group shrinks text",
  "fails closed when a narrow SVG painter intersects between sample points",
  "fails closed when a later SVG painter occludes text",
  "still scans low-contrast visually rendered aria-hidden and inert text",
  "keeps simple solid-color RGB and fill-opacity cases executable",
  "uses the rendered webkit text fill instead of falsely certifying the color property",
  "fails closed for pseudo-element paint beneath ordinary text",
  "fails closed when a CSS transform moves text outside its declared ancestor background",
  "uses effective screen size when an SVG viewBox scales declared large text down",
  "does not treat the fill of a thick stroked SVG shape as the background under text",
  "fails closed for an inset box shadow painted beneath text",
  "fails closed instead of omitting generated pseudo-element text",
  "uses the small-text threshold when CSS zoom shrinks declared large text",
  "fails closed for individual CSS translate that moves text outside its ancestor backdrop",
  "fails closed for relative positioning that moves text outside its ancestor backdrop",
  "fails closed for backdrop filters that change the sampled background",
  "does not reject a transformed text owner whose own opaque solid background moves with it",
  "fails closed for backdrop-filter paint on an otherwise empty pseudo-element",
  "fails closed when margin layout moves text outside its nearest painted backdrop",
  "fails closed when first-line paint overrides the candidate text color",
  "fails closed for overlapping static grid paint beneath learner text",
  "fails closed for rendered SVG use clones that contain otherwise unscanned text",
];

const interactionTitles = [
  "traverses two independent visible groups without requiring cross-group deactivation",
  "reveals and traverses a conditional subgroup through its owning model group",
  "allows an explicitly declared visible dependent group to update with its owner",
  "rejects an undeclared visible cross-group mutation",
  "reruns contrast after a mode transition instead of checking only the initial state",
  "executes a duplicate-free min midpoint max and endpoint ledger in every declared mode state",
  "scans a real no-mode slider through every range state and reset",
  "executes every two-slider endpoint combination once per mode without plan or execution drift",
  "fails closed instead of truncating thirteen visible sliders",
  "runs contrast inside a range-ledger endpoint state",
  "proves reset is Tab-reachable and activates it with both Enter and Space",
  "rejects a mode that changes serialized state but no formula summary or visual mark",
  "rejects a mode that changes visual evidence but not serialized contract state",
  "rejects a pointer-clickable mode that cannot be reached with Tab",
  "rejects a visible group with two active modes",
  "retains the 44px target and localized accessible-name gates",
];

const dynamicRangeTitles = [
  "runs the exact payment minimum/maximum dynamic domain in its money mode",
  "uses an exact noninteractive fixed known-part node when the whole is zero",
  "excludes zero for both positive and negative quadratic leading-coefficient replay starts",
  "preserves strict positive a-greater-than-b order for every identity transition",
  HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE,
  "fails closed when only a sibling/descendant decoy owns the declared range-domain id",
  "fails closed for projection-edge mismatch and blank projection reason",
  "fails closed for stale descriptors, stale serialized normal ranges, unrelated changes, and wrong projection",
  "fails closed for missing or wrongly serialized fixed visibility and a no-op reset/replay",
  "keeps undeclared clamps RED and executes 27 chained fraction-bar numerator transitions",
  "rejects invalid dynamic state-count bounds and a valid-but-wrong planner count",
];

const p3FractionEndpointTitles = [
  "p3-fractions-intro exposes 0..d inclusive numerator endpoints and atomically clamps without stale resurrection",
];

const nonHkOrderTitles = [
  "US Visualization Lab Next Item goes directly to practice without HK extension or checklist routing",
];

export const HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES = Object.freeze({
  "tests/e2e/hk-visualization-machine-acceptance.spec.ts":
    Object.freeze(machineTitles),
  "tests/e2e/hk-visualization-lesson-embeddability.spec.ts":
    Object.freeze(lessonTitles),
  "tests/e2e/hk-visualization-state-isolation.spec.ts":
    Object.freeze(stateTitles),
  "tests/e2e/hk-visualization-collision-microfixtures.spec.ts":
    Object.freeze(collisionTitles),
  "tests/e2e/hk-visualization-contrast-microfixtures.spec.ts":
    Object.freeze(contrastTitles),
  "tests/e2e/hk-visualization-interaction-microfixtures.spec.ts":
    Object.freeze(interactionTitles),
  "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts":
    Object.freeze(dynamicRangeTitles),
  "tests/e2e/hk-visualization-p3-fraction-endpoints.spec.ts": Object.freeze(
    p3FractionEndpointTitles,
  ),
  "tests/e2e/hk-visualization-non-hk-order.spec.ts":
    Object.freeze(nonHkOrderTitles),
});

function timeoutRows(titles, timeoutMs) {
  return Object.freeze(
    titles.map((title) => Object.freeze({ title, timeoutMs })),
  );
}

const dynamicRangeTimeoutRows = Object.freeze(
  dynamicRangeTitles.map((title) =>
    Object.freeze({
      title,
      timeoutMs:
        title === HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE
          ? HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS
          : HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
    }),
  ),
);

// Machine and lesson packages own exact formula-based ledgers in the release
// runner. Every other title has one explicit, source-owned supervisor cap here.
export const HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE =
  Object.freeze({
    "tests/e2e/hk-visualization-state-isolation.spec.ts": timeoutRows(
      stateTitles,
      HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
    ),
    "tests/e2e/hk-visualization-collision-microfixtures.spec.ts": timeoutRows(
      collisionTitles,
      HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
    ),
    "tests/e2e/hk-visualization-contrast-microfixtures.spec.ts": timeoutRows(
      contrastTitles,
      HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
    ),
    "tests/e2e/hk-visualization-interaction-microfixtures.spec.ts": timeoutRows(
      interactionTitles,
      HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
    ),
    "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts":
      dynamicRangeTimeoutRows,
    "tests/e2e/hk-visualization-p3-fraction-endpoints.spec.ts": timeoutRows(
      p3FractionEndpointTitles,
      HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
    ),
    "tests/e2e/hk-visualization-non-hk-order.spec.ts": timeoutRows(
      nonHkOrderTitles,
      HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
    ),
  });
