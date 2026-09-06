import assert from "node:assert/strict";
import test from "node:test";
import { CoordinatePlaneDemo } from "@/components/visualizations/CoordinatePlaneDemo";
import { FunctionModelComparer } from "@/components/visualizations/FunctionModelComparer";
import { GeometryExplorer } from "@/components/visualizations/GeometryExplorer";
import { getPrimaryVisualizationLabForTopic } from "@/data/visualizationLabs";
import { renderLessonVisualization, visibleText } from "./testing/renderLessonVisualization";

/**
 * Check real components' initial SSR markup with the automatic JSX runtime.
 * Next keeps jsx: "preserve" in the main config; this test-only config lets tsx
 * render JSX without changing that application build contract.
 *
 *   npx tsx --test --tsconfig tsconfig.lesson-visualization-render.json \
 *     components/visualizations/lessonVisualizationRender.test.tsx
 *
 * These checks complement the browser visualization gate. Static markup does
 * not establish visibility, hydration, effect completion or interactive behavior.
 */

const MODULES = {
  "coordinate-plane-demo": CoordinatePlaneDemo,
  "geometry-explorer": GeometryExplorer,
  "function-model-comparer": FunctionModelComparer
} as const;

/**
 * Initial markup labels for the capabilities each topic was re-routed to obtain.
 * Registry and label assertions catch routing or initial-content regressions;
 * the browser tests remain responsible for visibility and interaction.
 */
const CAPABILITY_MARKERS: Record<string, { module: keyof typeof MODULES; mustShow: string[]; because: string }> = {
  "p2-place-value": {
    module: "coordinate-plane-demo",
    mustShow: ["Hundreds", "Tens", "Ones"],
    because: "the base-ten template computes tens * 10 + ones, a ceiling of 99, in a lesson that teaches place value to 1000"
  },
  "p4-decimals": {
    module: "coordinate-plane-demo",
    mustShow: ["Tenths", "Hundredths"],
    because: "the number-line template is integer-only with a step of 1, so no tenth is reachable"
  },
  "p1-counting-number-bonds": {
    module: "coordinate-plane-demo",
    mustShow: ["Number bond"],
    because: "no part-whole model exists in the template at all"
  },
  "p6-speed": {
    module: "coordinate-plane-demo",
    mustShow: ["time", "distance"],
    because: "the array-area template has only rows and columns and cannot plot distance against time"
  },
  "p5-volume": {
    module: "geometry-explorer",
    mustShow: ["cubes", "Layers"],
    because: "the array-area template is a flat rows-by-columns grid with threeD disabled"
  },
  "p5-fractions-operations": {
    module: "geometry-explorer",
    mustShow: ["partition"],
    because: "the fraction-bar template carries one fraction and its doubling, so a + b is unrenderable"
  },
  "p6-percentages": {
    module: "function-model-comparer",
    mustShow: ["Percent"],
    because: "the fraction-bar template shows a single fraction, not a percent/ratio comparison"
  }
};

/** Every topic routed to a purpose-built module, and the module it resolves to. */
const ROUTED_TOPICS: Array<[string, keyof typeof MODULES]> = [
  ["p1-counting-number-bonds", "coordinate-plane-demo"],
  ["p1-addition-subtraction", "coordinate-plane-demo"],
  ["p2-place-value", "coordinate-plane-demo"],
  ["p4-decimals", "coordinate-plane-demo"],
  ["p6-speed", "coordinate-plane-demo"],
  ["p1-shapes-patterns", "geometry-explorer"],
  ["p2-multiplication-foundations", "geometry-explorer"],
  ["p2-length-data", "geometry-explorer"],
  ["p3-fractions-intro", "geometry-explorer"],
  ["p3-geometry-patterns", "geometry-explorer"],
  ["p4-angles", "geometry-explorer"],
  ["p4-perimeter-area", "geometry-explorer"],
  ["p5-fractions-operations", "geometry-explorer"],
  ["p5-volume", "geometry-explorer"],
  ["p6-percentages", "function-model-comparer"]
];

test("every routed lesson visualization renders non-empty static markup", () => {
  const empty: string[] = [];
  for (const [topicId, moduleId] of ROUTED_TOPICS) {
    // Throwing here is the point: a render failure must fail the test, not be
    // swallowed. This is the class of defect nothing previously detected.
    const { html } = renderLessonVisualization(MODULES[moduleId], topicId);
    const text = visibleText(html);
    if (html.length < 500 || text.length < 20) empty.push(`${topicId}: html=${html.length} text=${text.length}`);
  }
  assert.deepEqual(empty, [], "a routed visualization rendered blank or near-blank");
});

test("the lab registry routes each topic to the module the render test mounts", () => {
  // Guards against the test drifting from production routing: if a topic is
  // re-pointed in data/visualizationLabs.ts, this fails rather than silently
  // testing a component the learner no longer sees.
  const mismatched: string[] = [];
  for (const [topicId, moduleId] of ROUTED_TOPICS) {
    const lab = getPrimaryVisualizationLabForTopic(topicId);
    if (lab?.moduleId !== moduleId) mismatched.push(`${topicId}: registry=${lab?.moduleId} test=${moduleId}`);
  }
  assert.deepEqual(mismatched, []);
});

test("each re-routed topic shows the capability its template could not express", () => {
  const missing: string[] = [];
  for (const [topicId, spec] of Object.entries(CAPABILITY_MARKERS)) {
    const { html } = renderLessonVisualization(MODULES[spec.module], topicId);
    const text = visibleText(html);
    for (const marker of spec.mustShow) {
      if (!text.includes(marker)) missing.push(`${topicId} is missing "${marker}" — ${spec.because}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("place value and decimals render hundreds and hundredths text", () => {
  // The two sharpest cases, asserted on rendered values rather than labels.
  const placeValue = visibleText(renderLessonVisualization(CoordinatePlaneDemo, "p2-place-value").html);
  assert.match(
    placeValue,
    /\b[1-9]\d\d\b/,
    "place value must render a three-digit total; the base-ten template cannot exceed 99"
  );
  assert.match(placeValue, /=\s*\d00\s*\+/, "place value must decompose a hundreds term");

  const decimals = visibleText(renderLessonVisualization(CoordinatePlaneDemo, "p4-decimals").html);
  assert.match(
    decimals,
    /0\.\d\d/,
    "decimals must render a two-place decimal; the integer number line cannot place a tenth"
  );
});

test("a visualization renders in Chinese as well as English", () => {
  // The Hong Kong track is bilingual, so a lab that only resolves English text
  // is a defect a monolingual render would not catch.
  const zh = visibleText(renderLessonVisualization(CoordinatePlaneDemo, "p2-place-value", { language: "zh" }).html);
  assert.ok(/[一-鿿]/.test(zh), "expected Han characters when the language is zh");
});
