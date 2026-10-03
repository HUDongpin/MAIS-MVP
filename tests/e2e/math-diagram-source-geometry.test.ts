import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { lessonHrefForTopicId } from "../../lib/lessonLinks";
import { buildMathDiagramInventory } from "../../scripts/audit-math-diagram-inventory";

type Point = { x: number; y: number };
type Segment = { start: Point; end: Point };

type SimpleCircularArc = {
  source: string;
  start: Point;
  end: Point;
  radius: number;
  semanticAngleArc: boolean;
};

type ArcIssue = {
  file: string;
  arc: string;
  reason: string;
};

const root = process.cwd();
const sourceRoots = [
  "components/lesson",
  "components/practice",
  "components/visualizations",
  "app"
];
const tolerance = 0.01;
const sourceText = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

function tsxFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(root, relativeRoot);
  return readdirSync(absoluteRoot).flatMap((entry) => {
    const absolute = path.join(absoluteRoot, entry);
    const relative = path.relative(root, absolute);
    if (statSync(absolute).isDirectory()) return tsxFiles(relative);
    return /\.tsx$/u.test(entry) ? [relative] : [];
  });
}

function numericAttribute(tag: string, name: string): number | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:\\{\\s*)?["']?(-?\\d+(?:\\.\\d+)?)["']?(?:\\s*\\})?`, "u"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function pointKey(point: Point) {
  return `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
}

function pointDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function pointToRayDistance(point: Point, vertex: Point, rayEnd: Point) {
  const dx = rayEnd.x - vertex.x;
  const dy = rayEnd.y - vertex.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Number.POSITIVE_INFINITY;
  const ux = dx / length;
  const uy = dy / length;
  const px = point.x - vertex.x;
  const py = point.y - vertex.y;
  const projection = px * ux + py * uy;
  if (projection < -tolerance) return Number.POSITIVE_INFINITY;
  return Math.abs(px * uy - py * ux);
}

function staticSegments(svgSource: string): Segment[] {
  const segments: Segment[] = [];

  for (const match of svgSource.matchAll(/<line\b[^>]*>/gu)) {
    const tag = match[0];
    const x1 = numericAttribute(tag, "x1");
    const y1 = numericAttribute(tag, "y1");
    const x2 = numericAttribute(tag, "x2");
    const y2 = numericAttribute(tag, "y2");
    if ([x1, y1, x2, y2].some((value) => value === null)) continue;
    segments.push({ start: { x: x1!, y: y1! }, end: { x: x2!, y: y2! } });
  }

  for (const match of svgSource.matchAll(/<(?:polygon|polyline)\b[^>]*\bpoints\s*=\s*["']([^"']+)["'][^>]*>/gu)) {
    const points = Array.from(match[1].matchAll(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/gu), (point) => ({
      x: Number(point[1]),
      y: Number(point[2])
    }));
    const isPolygon = match[0].startsWith("<polygon");
    const segmentCount = Math.max(0, points.length - 1) + (isPolygon && points.length > 2 ? 1 : 0);
    for (let index = 0; index < segmentCount; index += 1) {
      segments.push({ start: points[index], end: points[(index + 1) % points.length] });
    }
  }

  return segments;
}

function simpleCircularArcs(svgSource: string): SimpleCircularArc[] {
  return Array.from(
    svgSource.matchAll(
      /<path\b[^>]*\bd\s*=\s*["']M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+A\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+[01]\s+[01]\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*Z?["'][^>]*>/gu
    ),
    (match) => ({
      source: match[0],
      start: { x: Number(match[1]), y: Number(match[2]) },
      end: { x: Number(match[6]), y: Number(match[7]) },
      radius: Number(match[3]) === Number(match[4]) ? Number(match[3]) : Number.NaN,
      semanticAngleArc: /\bdata-diagram-angle-arc\b/u.test(match[0])
    })
  ).filter((arc) => Number.isFinite(arc.radius) && arc.radius > 0);
}

function pointToSegmentDistance(point: Point, segment: Segment) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return pointDistance(point, segment.start);
  const projection = Math.max(0, Math.min(1,
    ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared
  ));
  return pointDistance(point, {
    x: segment.start.x + projection * dx,
    y: segment.start.y + projection * dy
  });
}

function vertexRays(segments: Segment[]) {
  const endpoints = new Map<string, Point>();
  for (const segment of segments) {
    endpoints.set(pointKey(segment.start), segment.start);
    endpoints.set(pointKey(segment.end), segment.end);
  }

  return Array.from(endpoints.values()).flatMap((vertex) => {
    const rayEnds: Point[] = [];
    for (const segment of segments) {
      if (pointToSegmentDistance(vertex, segment) > 0.001) continue;
      for (const candidate of [segment.start, segment.end]) {
        if (pointDistance(candidate, vertex) <= 0.001) continue;
        if (!rayEnds.some((existing) => pointKey(existing) === pointKey(candidate))) rayEnds.push(candidate);
      }
    }
    return rayEnds.length >= 2 ? [{ vertex, rayEnds }] : [];
  });
}

function inspectArc(arc: SimpleCircularArc, segments: Segment[]): string | null {
  const candidates = vertexRays(segments).flatMap(({ vertex, rayEnds }) => {
    const startRadiusError = Math.abs(pointDistance(vertex, arc.start) - arc.radius);
    const endRadiusError = Math.abs(pointDistance(vertex, arc.end) - arc.radius);
    if (Math.min(startRadiusError, endRadiusError) > Math.max(1, arc.radius * 0.25)) return [];

    const results: Array<{
      vertex: Point;
      rayError: number;
      radiusError: number;
    }> = [];
    for (let first = 0; first < rayEnds.length; first += 1) {
      for (let second = first + 1; second < rayEnds.length; second += 1) {
        const firstRay = rayEnds[first];
        const secondRay = rayEnds[second];
        const firstVector = { x: firstRay.x - vertex.x, y: firstRay.y - vertex.y };
        const secondVector = { x: secondRay.x - vertex.x, y: secondRay.y - vertex.y };
        const sine = Math.abs(firstVector.x * secondVector.y - firstVector.y * secondVector.x) /
          (Math.hypot(firstVector.x, firstVector.y) * Math.hypot(secondVector.x, secondVector.y));
        if (!Number.isFinite(sine) || sine < 0.05) continue;

        const direct = Math.max(
          pointToRayDistance(arc.start, vertex, firstRay),
          pointToRayDistance(arc.end, vertex, secondRay)
        );
        const swapped = Math.max(
          pointToRayDistance(arc.start, vertex, secondRay),
          pointToRayDistance(arc.end, vertex, firstRay)
        );
        results.push({
          vertex,
          rayError: Math.min(direct, swapped),
          radiusError: Math.max(startRadiusError, endRadiusError)
        });
      }
    }
    return results;
  });

  if (candidates.length === 0) {
    return arc.semanticAngleArc
      ? "semantic angle arc has no discoverable vertex with two defining rays"
      : null;
  }
  candidates.sort((first, second) =>
    (first.rayError + first.radiusError) - (second.rayError + second.radiusError)
  );
  const best = candidates[0];
  if (best.rayError <= tolerance && best.radiusError <= tolerance) return null;
  return [
    `arc endpoints must remain on the two rays from vertex (${best.vertex.x}, ${best.vertex.y})`,
    `maximum perpendicular miss ${best.rayError.toFixed(3)}`,
    `maximum radius error ${best.radiusError.toFixed(3)}`,
    `tolerance ${tolerance}`
  ].join("; ");
}

function auditSimpleStaticAngleArcs() {
  const issues: ArcIssue[] = [];
  const files = sourceRoots.flatMap(tsxFiles);
  let inspectedArcs = 0;

  for (const file of files) {
    const source = readFileSync(path.join(root, file), "utf8");
    for (const svgMatch of source.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/gu)) {
      const svgSource = svgMatch[0];
      const segments = staticSegments(svgSource);
      if (segments.length < 2) continue;
      for (const arc of simpleCircularArcs(svgSource)) {
        const reason = inspectArc(arc, segments);
        inspectedArcs += 1;
        if (reason) issues.push({ file, arc: arc.source, reason });
      }
    }
  }

  return { files: files.length, inspectedArcs, issues };
}

test("all static angle arcs end on their defining rays without crossing past them", () => {
  const audit = auditSimpleStaticAngleArcs();
  assert.ok(audit.files > 0, "the source audit must inspect TSX files");
  assert.ok(audit.inspectedArcs > 0, "the source audit must find at least one static angle arc");
  assert.deepEqual(audit.issues, []);
});

test("known static lesson angle arcs remain semantically marked for strict geometry validation", () => {
  assert.equal(sourceText("components/lesson/ccss/lessons/precise-definitions.tsx")
    .match(/data-diagram-angle-arc/gu)?.length, 1);
  assert.equal(sourceText("components/lesson/ccss/lessons/congruence-criteria.tsx")
    .match(/data-diagram-angle-arc/gu)?.length, 3);
});

test("the reported precise-definitions angle keeps its exact arc below butt-capped defining rays", () => {
  const preciseDefinitions = sourceText("components/lesson/ccss/lessons/precise-definitions.tsx");
  const arcTag = preciseDefinitions.match(/<path\b(?=[^>]*\bdata-diagram-angle-arc\b)[^>]*>/u)?.[0];
  const definingRayTags = Array.from(
    preciseDefinitions.matchAll(/<line\b(?=[^>]*\bdata-diagram-defining-ray\b)[^>]*>/gu),
    (match) => match[0]
  );
  assert.ok(arcTag);
  const arcIndex = preciseDefinitions.indexOf(arcTag);
  const firstRayIndex = Math.min(...definingRayTags.map((tag) => preciseDefinitions.indexOf(tag)));

  assert.ok(arcIndex >= 0 && firstRayIndex > arcIndex);
  assert.equal(definingRayTags.length, 2);
  assert.match(arcTag, /\bstrokeLinecap="butt"/u);
});

test("shared semantic angle arcs use butt caps so paint ends exactly on the defining rays", () => {
  const questionFigure = sourceText("components/practice/QuestionFigure.tsx");
  const semanticAngleTag = questionFigure.match(
    /<path\b(?=[^>]*\bdata-diagram-angle-arc=)[^>]*>/u
  )?.[0];

  assert.ok(semanticAngleTag, "QuestionFigure must keep its semantic angle contract marker");
  assert.match(semanticAngleTag, /\bstrokeLinecap="butt"/u);

  const configuredVisualization = sourceText("components/visualizations/ConfiguredVisualizationLab.tsx");
  const configuredAngleTags = Array.from(
    configuredVisualization.matchAll(/<path\b(?=[^>]*\bdata-diagram-angle-arc\b)[^>]*>/gu),
    (match) => match[0]
  );
  assert.equal(configuredAngleTags.length, 3);
  for (const tag of configuredAngleTags) assert.match(tag, /\bstrokeLinecap="butt"/u);
});

test("diagram inventory audits each topic through its canonical live lesson href", () => {
  const inventorySource = sourceText("scripts/audit-math-diagram-inventory.ts");
  assert.match(inventorySource, /import \{ lessonHrefForTopicId \} from "\.\.\/lib\/lessonLinks"/u);
  assert.match(inventorySource, /route: lessonHrefForTopicId\(lesson\.topicId\)/u);
  assert.equal(lessonHrefForTopicId("quadratic-patterns"), "/student/lessons/quadratic-functions");
});

test("diagram inventory counts product source surfaces without test or fixture markup", async () => {
  const { inventory, failures } = await buildMathDiagramInventory();

  assert.deepEqual(failures, []);
  const surfaceFiles = new Set(inventory.sourceSurfaces.map((surface) => surface.file));
  assert.equal(surfaceFiles.has("components/lesson/ccss/mathDiagramBoundaryRegressions.test.ts"), false);
  assert.equal(surfaceFiles.has("components/visualizations/three/threeDCanvasContract.test.ts"), false);
  assert.equal(surfaceFiles.has("components/lesson/ccss/lessons/precise-definitions.tsx"), true);
  const htmlOnlyFigure = inventory.sourceSurfaces.find((surface) =>
    surface.file === "components/lesson/ccss/lessons/compare-three-digit.tsx"
  );
  assert.ok(htmlOnlyFigure, "HTML-only mathematical Figure modules must remain inventoried");
  assert.equal(htmlOnlyFigure.inlineSvgCount, 0);
  assert.equal(htmlOnlyFigure.canvasCount, 0);
  assert.ok(htmlOnlyFigure.htmlFigureCount > 0);
});

test("diagram inventory classifies every CCSS control and its exceptional state policy", async () => {
  const { inventory, failures } = await buildMathDiagramInventory();
  assert.deepEqual(failures, []);
  assert.equal(inventory.schemaVersion, 6);
  assert.equal(inventory.provenance.contract, "math-diagram-source-graph-v1");
  assert.equal(inventory.provenance.generator, "scripts/audit-math-diagram-inventory.ts");
  assert.deepEqual(inventory.provenance.inputRoots, ["app", "components", "data", "public"]);
  assert.match(inventory.provenance.discoveredRowDigestSha256, /^[a-f0-9]{64}$/u);
  assert.equal(inventory.summary.ccssButtonModuleCount, 244);
  assert.equal(inventory.summary.ccssButtonJsxCount, 531);
  assert.equal(inventory.summary.ccssRangeModuleCount, 38);
  assert.equal(inventory.summary.ccssRangeJsxCount, 40);
  assert.equal(inventory.summary.ccssNumberInputCount, 1);
  assert.equal(inventory.summary.ccssSelectInputCount, 2);
  assert.equal(inventory.summary.ccssButtonAndInlineSvgModuleCount, 109);
  assert.equal(inventory.summary.ccssButtonAndInlineSvgJsxCount, 213);
  assert.equal(inventory.summary.ccssRandomControlModuleCount, 3);
  assert.equal(inventory.summary.ccssPointerControlModuleCount, 3);
  assert.equal(inventory.summary.ccssContextMenuControlNodeCount, 1);
  assert.equal(inventory.summary.ccssUnsafeButtonTypeCount, 0);
  assert.equal(inventory.summary.ccssControlSideEffectSignalCount, 0);

  const byId = new Map(inventory.ccssLessons.map((lesson) => [lesson.lessonId, lesson]));
  assert.equal(
    inventory.ccssLessons.every((lesson) => lesson.stateProtocol === "finite-visible-button-state-graph-v2"),
    true,
    "every ordinary CCSS lesson must declare the finite replayable button-state graph protocol"
  );
  for (const id of ["sampling", "sampling-inference", "probability-basics"] as const) {
    assert.ok(byId.get(id)?.exceptionalStatePolicies.includes("seeded-random-extremes"), id);
  }
  for (const id of ["coordinate-plane", "four-quadrant-plane", "slope-explorer"] as const) {
    assert.ok(byId.get(id)?.exceptionalStatePolicies.includes("svg-pointer-inset-grid"), id);
  }
  assert.ok(byId.get("matrices")?.exceptionalStatePolicies.includes("context-menu-and-shift-click"));
  const metricConversion = byId.get("metric-conversion");
  assert.equal(metricConversion?.numberControlJsxCount, 1);
  assert.equal(metricConversion?.selectControlJsxCount, 2);
  assert.deepEqual(
    metricConversion?.exceptionalStatePolicies,
    ["metric-conversion-finite-number-and-unit-cross-product-v1"]
  );
  assert.equal(
    inventory.ccssLessons.filter((lesson) => lesson.canonicalParentTopicId === null).length,
    0,
    "every CCSS control protocol must have a canonical live replay route"
  );
});

test("ordinary CCSS buttons use a bounded fail-closed replayable state graph", () => {
  const adapter = sourceText("components/lesson/ccss/CcssLessonAdapter.tsx");
  const boundarySpec = sourceText("tests/e2e/math-diagram-boundary.spec.ts");
  const inventorySource = sourceText("scripts/audit-math-diagram-inventory.ts");

  for (const source of [adapter, boundarySpec, inventorySource]) {
    assert.match(source, /finite-visible-button-state-graph-v2/u);
  }
  assert.match(boundarySpec, /const ccssStateGraphLimits = \{\s*states:\s*\d+,\s*transitions:\s*\d+\s*\} as const/u);
  assert.match(boundarySpec, /while \(stateQueue\.length > 0\)/u);
  assert.match(boundarySpec, /await replayCcssButtonPath\(/u);
  assert.match(boundarySpec, /const nextRoster = await ccssButtonRoster\(/u);
  assert.match(boundarySpec, /throw new Error\(`\$\{lessonId\} CCSS button state budget/u);
  assert.match(boundarySpec, /throw new Error\(`\$\{lessonId\} CCSS button transition budget/u);
  assert.match(boundarySpec, /seeded-random-extremes[\s\S]*svg-pointer-inset-grid[\s\S]*context-menu-and-shift-click[\s\S]*metric-conversion-finite-number-and-unit-cross-product-v1/u);
  assert.doesNotMatch(boundarySpec, /click=2/u);
  assert.doesNotMatch(boundarySpec, /for \(const control of defaultRoster\)/u);
});

test("requested diagram IDs fail closed only inside suites whose inventory owns them", () => {
  const boundarySpec = sourceText("tests/e2e/math-diagram-boundary.spec.ts");

  assert.match(
    boundarySpec,
    /function assertRequestedIdsSelected<T>\([\s\S]*?eligibleValues: T\[\][\s\S]*?const expectedInSuite = Array\.from\(requestedIds\)\.filter\(\(id\) => eligible\.has\(id\)\)/u
  );
  assert.match(
    boundarySpec,
    /"Practice figure audit", allPracticeCases/u,
    "a valid Practice-only ID must not be required to exist in unrelated lesson, lab, or standalone inventories"
  );
  assert.match(boundarySpec, /"effective WebGL audit", effectiveThreeD/u);
  assert.match(boundarySpec, /"standalone route audit", eligibleStandaloneRoutes/u);
  assert.doesNotMatch(
    boundarySpec,
    /const missing = Array\.from\(requestedIds\)\.filter\(\(id\) => !selected\.has\(id\)\)/u
  );
});

test("standalone diagram routes remain in the live audit graph and the California textbook route carries no bitmap references", async () => {
  const { inventory, failures } = await buildMathDiagramInventory();
  assert.deepEqual(failures, []);
  assert.deepEqual(
    inventory.standaloneDiagramRoutes.map((route) => route.id).sort(),
    [
      "california-middle-school-textbook",
      "mistake-book-question-figure",
      "practice-adventure-ui-preview",
      "stembench-euler-demo"
    ]
  );
  // The Codex replacement-textbook bitmaps left the live graph on 2026-09-02:
  // the route now renders interactive CCSS lesson bodies, so nothing may cite
  // the retired /lesson-illustrations/us-ca-middle-school/candidates/ assets.
  const replacementReferences = inventory.liveAssetReferences.filter((reference) =>
    reference.manifest === "components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx" ||
    reference.assetPath.startsWith("/lesson-illustrations/us-ca-middle-school/candidates/")
  );
  assert.deepEqual(replacementReferences, []);
  const textbookRoute = inventory.standaloneDiagramRoutes.find((route) => route.id === "california-middle-school-textbook");
  assert.equal(textbookRoute?.interaction, "interactive-ccss-lessons");
});

test("browser audit enforces exact root-document width while retaining element paint tolerance", () => {
  const auditSource = sourceText("tests/e2e/mathDiagramBoundaryAudit.ts");
  const boundarySpec = sourceText("tests/e2e/math-diagram-boundary.spec.ts");

  assert.match(auditSource, /if \(documentScrollWidth !== documentClientWidth\)/u);
  assert.doesNotMatch(auditSource, /documentScrollWidth > documentClientWidth \+ epsilon/u);
  assert.match(auditSource, /visible mathematical surface extends outside the viewport without a bounded local scroller/u);
  assert.match(boundarySpec, /boundary\.documentWidth\.scroll\)\.toBe\(boundary\.documentWidth\.client\)/u);
  assert.doesNotMatch(sourceText("app/layout.tsx"), /<body\b[^>]*\boverflow-x-(?:hidden|clip)\b/u);
});

test("layout stability freezes Manim canvases that mount after the progressive SVG fallback", () => {
  const auditSource = sourceText("tests/e2e/mathDiagramBoundaryAudit.ts");
  const boundarySpec = sourceText("tests/e2e/math-diagram-boundary.spec.ts");
  assert.match(auditSource, /while \(Date\.now\(\) - startedAt <= timeoutMs\) \{\s*\/\/ A progressive 3D surface[\s\S]*?await freezeMountedManimTimelines\(page\);\s*const sample/u);
  assert.match(auditSource, /export async function disableDiagramAuditMotion[\s\S]*?await freezeMountedManimTimelines\(page\);/u);
  assert.match(auditSource, /async function freezeMountedManimTimelines\(page: Page\)/u);
  assert.match(auditSource, /button\.textContent\?\.trim\(\) === "Pause"/u);
  assert.equal(
    boundarySpec.match(/waitForDiagramLayoutStable\(page, \{ timeoutMs: 30_000 \}\)/gu)?.length,
    2,
    "lesson viewport and range-restoration gates must allow three expensive post-mount stability samples"
  );
});

test("shared Practice figures keep graph paint clipped and narrow figures shrink or wrap", () => {
  const questionFigure = readFileSync(path.join(root, "components/practice/QuestionFigure.tsx"), "utf8");
  const countingCards = readFileSync(path.join(root, "components/practice/CountingDotCards.tsx"), "utf8");
  const questPager = readFileSync(path.join(root, "components/practice/PracticeQuestPager.tsx"), "utf8");

  assert.match(
    questionFigure,
    /<clipPath\b(?=[^>]*\bid=\{plotClipId\})(?=[^>]*\bclipPathUnits="userSpaceOnUse")[^>]*>/u
  );
  assert.match(questionFigure, /data-diagram-plot-series\s+clipPath=\{`url\(#\$\{plotClipId\}\)`\}/u);
  assert.doesNotMatch(questionFigure, /min-w-\[13rem\]/u);
  assert.match(countingCards, /className="[^"]*\bflex-wrap\b[^"]*\bjustify-center\b[^"]*"/u);
  assert.match(countingCards, /className="[^"]*\bmin-w-0\b[^"]*\bmax-w-full\b[^"]*"/u);
  assert.match(questPager, /className="[^"]*\babsolute\b[^"]*\bw-0\b[^"]*"/u);
  assert.match(questPager, /className="[^"]*\bw-max\b[^"]*\s-translate-x-1\/2\b[^"]*"/u);
});

test("Mistake Book preserves the mathematical figure needed to understand a stored graph mistake", () => {
  const mistakeBook = readFileSync(path.join(root, "app/mistake-book/page.tsx"), "utf8");
  assert.match(mistakeBook, /import \{ QuestionFigure \}/u);
  assert.match(mistakeBook, /currentRecord\.question\.diagram\s*\?/u);
  assert.match(mistakeBook, /<QuestionFigure\s+diagram=\{currentRecord\.question\.diagram\}/u);
});

test("interactive geometry rejects collapsed triangles, duplicate points, and invisible Euler centers", () => {
  const geometryExplorer = readFileSync(path.join(root, "components/visualizations/GeometryExplorer.tsx"), "utf8");
  const coordinatePlane = readFileSync(path.join(root, "components/visualizations/CoordinatePlaneDemo.tsx"), "utf8");
  const eulerDemo = readFileSync(path.join(root, "components/visualizations/StembenchEulerLineDemo.tsx"), "utf8");
  const eulerGeometry = readFileSync(path.join(root, "components/visualizations/eulerLineGeometry.ts"), "utf8");

  assert.match(geometryExplorer, /trianglePixelArea\(candidate\.A, candidate\.B, candidate\.C\) < triangleMinimumPixelArea/u);
  assert.match(geometryExplorer, /pixelArea < triangleMinimumPixelArea/u);
  assert.match(coordinatePlane, /points\.some\(\(point\) => Math\.abs\(point\.x - storedPoint\.x\) < 0\.0001/u);
  assert.match(coordinatePlane, /That point is already plotted/u);
  assert.match(eulerGeometry, /\[O, G, H, N\]\.every\(\(point\) =>\s*isPointInsideDiagramBounds/u);
  assert.match(eulerGeometry, /isCircleInsideDiagramBounds\(O,\s*circumRadius/u);
  assert.match(eulerGeometry, /isCircleInsideDiagramBounds\(N,\s*circumRadius \/ 2/u);
  assert.match(eulerGeometry, /groupCoincidentDiagramPoints\(marks, 24\)/u);
  assert.match(eulerDemo, /buildEulerFields\(triangle\)/u);
  assert.match(eulerDemo, /buildEulerCenterLayout\(fields, triangle\)/u);
  assert.match(eulerDemo, /canUseTriangle\(candidate\)/u);
  assert.match(eulerDemo, /data-viz-center-label=\{mark\.label\}/u);
});

test("CCSS figure cards expose intrinsically wide diagrams as bounded, keyboard-accessible scroll regions", () => {
  const figure = readFileSync(path.join(root, "components/lesson/ccss/Figure.tsx"), "utf8");
  const figureScroll = readFileSync(path.join(root, "components/lesson/ccss/FigureScroll.tsx"), "utf8");
  const browserAudit = readFileSync(path.join(root, "tests/e2e/mathDiagramBoundaryAudit.ts"), "utf8");

  assert.match(figure, /stage\.scrollWidth > stage\.clientWidth \+ 1/u);
  assert.match(figure, /new ResizeObserver\(measure\)/u);
  assert.match(figure, /overflow-x-auto overflow-y-hidden/u);
  assert.match(figure, /tabIndex=\{overflowState\.overflowing \? 0 : undefined\}/u);
  assert.match(figure, /data-figure-overflowing/u);
  assert.match(figureScroll, /data-figure-scroll-region/u);
  assert.doesNotMatch(figure, /card overflow-hidden/u);
  assert.match(browserAudit, /"unreachable-scroll-content"/u);
  assert.match(browserAudit, /"\[data-figure-stage\],\[data-figure-scroll-region\],\[data-question-figure\]/u);
  assert.match(browserAudit, /\[data-viz-surface\],\[data-viz-responsive-diagram-container\],\[data-viz-card-formula\]/u);
  assert.match(browserAudit, /\[data-viz-manim-formula-overlay\],\[data-viz-manim-projected-label\]/u);
  assert.match(browserAudit, /!element\.matches\("\[data-viz-manim-projected-label\]"\)/u);
  assert.match(browserAudit, /if \(!image\.complete && image\.loading === "lazy"\) image\.loading = "eager"/u);
  assert.match(
    readFileSync(path.join(root, "tests/e2e/math-diagram-boundary.spec.ts"), "utf8"),
    /const registrationPublisher = publisher === "US_FL_MATH" \? "US_CA_MATH" : publisher/u
  );
  assert.match(browserAudit, /an HTML mathematical surface crosses, or contains content beyond, a hidden clipping boundary/u);
  assert.match(browserAudit, /const hiddenOverflowX = clipsX/u);
  assert.match(browserAudit, /const hiddenOverflowY = clipsY/u);
  assert.match(browserAudit, /clippingBoundary === diagram\s*\? clippingBoundary\.scrollHeight - clippingBoundary\.clientHeight/u);
  assert.match(browserAudit, /clippingBoundary === semanticOwner/u);
  assert.match(browserAudit, /stage\.querySelectorAll<Element>/u);
  assert.match(browserAudit, /an SVG mathematical surface crosses a hidden clipping boundary/u);
  assert.match(browserAudit, /const hiddenOverflowY = clipsY \? verticalCrossing : 0/u);
  assert.match(browserAudit, /candidate\.box\.left \+ stage\.scrollLeft/u);
});
