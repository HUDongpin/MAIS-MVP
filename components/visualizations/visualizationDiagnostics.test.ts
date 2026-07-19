import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  gradeLabGroups,
  visualizationLabCatalog,
  visualizationLabCount,
  visualizationTemplateIds,
  type FeaturedLabDefinition,
  type GradeLabGroupDefinition
} from "../../data/visualizationLabs";
import { unitedStatesMathGradeOverviewCards } from "../../data/rag/usMath";
import { toPrcSimplifiedText } from "../../lib/i18n";
import {
  auditVisualizationControlSurfaceContract,
  auditVisualizationDirectEntryContract,
  auditVisualizationPracticeHandoffContract,
  auditVisualizationCurriculumReview,
  auditVisualizationCatalogContract,
  auditVisualizationSourceCardAlignment,
  auditVisualizationTemplateConfigContract,
  buildPremiumThreeDTopicPagePath,
  buildVisualizationSessionModuleId,
  buildVisualizationLabHref,
  buildVisualizationPracticeHref,
  buildVisualizationSnapshotMarkSample,
  selectPremiumThreeDSceneVariantSmokeLabs,
  visualizationControlSurfaceSelectors,
  summarizeVisualizationCatalog,
  visualizationLabSectionId,
  visualizationLabSectionSelector
} from "./visualizationDiagnostics";

const directEntryTracks = ["all", "HK", "US", "MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH", "MAINLAND_HJB", "MAINLAND_BNU", "CAPSTONE"] as const;

test("builds stable direct-entry Visualization Lab URLs for browser sweeps", () => {
  const lab = visualizationLabCatalog.find((entry) => entry.labId === "pep-high-s4-trigonometry") ?? visualizationLabCatalog[0];

  assert.equal(
    buildVisualizationLabHref(lab),
    `${buildPremiumThreeDTopicPagePath(lab)}?grade=${lab.grade}&track=all`
  );
  assert.equal(visualizationLabSectionId(lab), `lab-example-${lab.labId}`);
  assert.equal(visualizationLabSectionSelector(lab), `[id="lab-example-${lab.labId}"]`);
});

test("premium Three.js launch labs expose canonical topic-specific page URLs", () => {
  const premiumLabs = visualizationLabCatalog.filter((lab) => lab.threeD?.premiumLaunch);

  assert.equal(premiumLabs.length, 80);

  for (const lab of premiumLabs) {
    const href = buildVisualizationLabHref(lab);
    const url = new URL(href, "https://mais.local");

    assert.equal(url.pathname, buildPremiumThreeDTopicPagePath(lab), `${lab.labId} should use a topic page path`);
    assert.equal(url.searchParams.get("grade"), lab.grade);
    assert.equal(url.searchParams.get("track"), "all");
    assert.equal(url.searchParams.get("lab"), null);
  }
});

test("premium Three.js scene variant smoke targets cover each live premium variant", () => {
  const targets = selectPremiumThreeDSceneVariantSmokeLabs(visualizationLabCatalog);
  const variants = targets.map((target) => target.sceneVariant).sort();

  assert.deepEqual(variants, [
    "conic-section-deep",
    "cross-section-slicer",
    "curriculum-crosswalk",
    "distribution-machine",
    "exam-strategy-capstone",
    "fraction-slices",
    "function-ribbon",
    "geometry-axes",
    "measurement-rail",
    "optimization-landscape",
    "projection-views",
    "solid-net-fold",
    "space-vector-plane",
    "statistical-inference",
    "vector-conic-strategy"
  ]);

  for (const target of targets) {
    const href = buildVisualizationLabHref(target.lab);
    const url = new URL(href, "https://mais.local");

    assert.equal(url.pathname, buildPremiumThreeDTopicPagePath(target.lab));
    assert.equal(target.href, href);
    assert.equal(target.lab.threeD?.premiumLaunch, true);
    assert.equal(target.familyId, target.lab.threeD?.familyId);
  }
});

test("current Visualization Lab catalog satisfies the structural health contract", () => {
  const report = auditVisualizationCatalogContract(visualizationLabCatalog, gradeLabGroups);
  const summary = summarizeVisualizationCatalog(visualizationLabCatalog, gradeLabGroups);

  assert.deepEqual(report.issues, []);
  assert.equal(summary.labCount, visualizationLabCount);
  assert.equal(summary.gradeGroups.length, gradeLabGroups.length);
  assert.ok(summary.byTemplate["function-graph"] >= 1);
  assert.ok(summary.byModule["configured-visualization-lab"] >= 1);
  assert.ok(summary.gradeGroups.every((group) => group.labCount > 0));
});

test("trig unit-wave labs route to the configured visualization renderer", () => {
  const trigLabs = visualizationLabCatalog.filter((lab) => lab.templateId === "trig-unit-wave");

  assert.ok(trigLabs.length > 0);
  assert.deepEqual(
    trigLabs
      .filter((lab) => lab.moduleId !== "configured-visualization-lab")
      .map((lab) => ({ labId: lab.labId, moduleId: lab.moduleId })),
    []
  );
});

test("calculus rate-area labs route to the configured visualization renderer", () => {
  const calculusLabs = visualizationLabCatalog.filter((lab) => lab.templateId === "calculus-rate-area");

  assert.ok(calculusLabs.length > 0);
  assert.deepEqual(
    calculusLabs
      .filter((lab) => lab.moduleId !== "configured-visualization-lab")
      .map((lab) => ({ labId: lab.labId, moduleId: lab.moduleId })),
    []
  );
});

test("current Visualization Lab direct-entry URLs round-trip every catalog lab and track", () => {
  const report = auditVisualizationDirectEntryContract(visualizationLabCatalog, directEntryTracks);

  assert.deepEqual(report.issues, []);
  assert.equal(report.checkedLabCount, visualizationLabCount);
  assert.equal(report.checkedTrackCount, directEntryTracks.length);
  assert.equal(report.checkedHrefCount, visualizationLabCount * directEntryTracks.length);
  assert.ok(report.nonAsciiLabCount > 0);
});

test("direct-entry URL contract preserves non-ASCII lab IDs through URL encoding", () => {
  const chineseLab = visualizationLabCatalog.find((entry) => entry.labId === "bnu-high-s4-概率");

  assert.ok(chineseLab);

  const href = buildVisualizationLabHref(chineseLab);
  const parsed = new URL(href, "https://mais.local");

  assert.match(href, /%E6/);
  assert.doesNotMatch(href, /概率/);
  assert.equal(parsed.searchParams.get("lab"), chineseLab.labId);
  assert.equal(parsed.searchParams.get("grade"), chineseLab.grade);
  assert.equal(parsed.searchParams.get("track"), "all");
});

test("current Visualization Lab Practice handoff URLs round-trip every topic ID", () => {
  const report = auditVisualizationPracticeHandoffContract(visualizationLabCatalog);

  assert.deepEqual(report.issues, []);
  assert.equal(report.checkedLabCount, visualizationLabCount);
  assert.equal(report.checkedHrefCount, visualizationLabCount);
  assert.ok(report.nonAsciiTopicCount > 0);
});

test("current Visualization Lab enterprise controls expose stable machine-readable contracts", () => {
  const report = auditVisualizationControlSurfaceContract(visualizationLabCatalog);

  assert.deepEqual(report.issues, []);
  assert.equal(report.checkedLabCount, visualizationLabCount);
  assert.equal(report.requiredSelectorCount, visualizationControlSurfaceSelectors.length);
  assert.ok(visualizationControlSurfaceSelectors.includes("data-viz-copy-lab-link-state"));
  assert.ok(visualizationControlSurfaceSelectors.includes("data-viz-mode-button"));
  assert.ok(visualizationControlSurfaceSelectors.includes("data-viz-reset-model"));
  assert.ok(report.nonAsciiModuleIdCount > 0);
});

test("current Visualization Lab template configs satisfy renderer math-state contracts", () => {
  const report = auditVisualizationTemplateConfigContract(visualizationLabCatalog);

  assert.deepEqual(report.issues, []);
  assert.equal(report.checkedLabCount, visualizationLabCount);
  assert.equal(report.checkedTemplateCount, visualizationTemplateIds.length);
  assert.deepEqual(report.coveredTemplateIds, visualizationTemplateIds);
  assert.ok(report.axisLabelLabCount > 0);
});

test("template config diagnostics catch unsafe math and renderer setup", () => {
  const source = visualizationLabCatalog[0];
  const badLab: FeaturedLabDefinition = {
    ...source,
    labId: "diagnostic-template-config-lab",
    templateId: "function-graph",
    templateConfig: {
      variant: "bad variant?",
      focus: { en: "", zh: "" },
      formula: { en: "", zh: "" },
      accent: "cyan"
    }
  };

  const issueCodes = auditVisualizationTemplateConfigContract([badLab]).issues.map((issue) => issue.code);

  assert.ok(issueCodes.includes("template-config-unsafe-variant"));
  assert.ok(issueCodes.includes("template-config-missing-focus-text"));
  assert.ok(issueCodes.includes("template-config-missing-formula-text"));
  assert.ok(issueCodes.includes("template-config-invalid-accent"));
  assert.ok(issueCodes.includes("template-config-missing-axis-label"));
});

test("configured visualization renderer keeps source branches for every template family", () => {
  const source = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");
  const missingTemplateBranches = visualizationTemplateIds.filter(
    (templateId) => !source.includes(`templateId === "${templateId}"`)
  );

  assert.deepEqual(missingTemplateBranches, []);
});

test("Visualization Lab workflow controls emit lab-scoped learning analytics probes", () => {
  const pageSource = fs.readFileSync("components/visualizations/VisualizationLabPage.tsx", "utf8");

  assert.match(pageSource, /\brecordLearningEvent\b/);
  assert.match(pageSource, /function recordVisualizationWorkflowEvent/);
  assert.match(pageSource, /type:\s*"visualization-probe"/);
  assert.match(pageSource, /source:\s*lab\?\.analyticsSource\s*\?\?\s*"visualization-lab"/);
  assert.match(pageSource, /topicId:\s*lab\?\.topicId\s*\?\?\s*topicFallback/);
  assert.match(pageSource, /recordVisualizationWorkflowEvent\(lab\);/);
  assert.ok((pageSource.match(/recordVisualizationWorkflowEvent\(activeDirectoryLab\)/g) ?? []).length >= 3);
});

test("Visualization Lab client history stays on the canonical tools route after legacy redirects", () => {
  const pageSource = fs.readFileSync("components/visualizations/VisualizationLabPage.tsx", "utf8");

  assert.match(pageSource, /function buildVisualizationHistoryHref/);
  assert.match(pageSource, /studentVisualizationToolsPath/);
  assert.doesNotMatch(pageSource, /visualizationLabPath/);
  assert.doesNotMatch(pageSource, /`\/visualization-lab/);
});

test("secondary geometry explorer exposes button nudge controls as a drag alternative", () => {
  const source = fs.readFileSync("components/visualizations/GeometryExplorer.tsx", "utf8");

  assert.match(source, /data-viz-vertex-nudge-panel/);
  assert.match(source, /data-viz-vertex-select-button/);
  assert.match(source, /data-viz-vertex-nudge-button/);
  assert.match(source, /data-viz-vertex-nudge-direction/);
  assert.match(source, /data-viz-selected-point/);
  assert.match(source, /function movePointBy/);
});

test("secondary geometry explorer prevents vertex movement from collapsing the triangle", () => {
  const source = fs.readFileSync("components/visualizations/GeometryExplorer.tsx", "utf8");

  assert.match(source, /const vertexMinimumSeparation\s*=/);
  assert.match(source, /function constrainTrianglePoint/);
  assert.match(source, /distance\(bounded,\s*current\[otherKey\]\)\s*<\s*vertexMinimumSeparation/);
  assert.match(source, /\[dragging\]: constrainTrianglePoint\(current,\s*dragging,\s*nextPoint\)/);
  assert.match(source, /\[key\]: constrainTrianglePoint\(current,\s*key,\s*nextPoint\)/);
  assert.match(source, /data-viz-min-side-px/);
  assert.match(source, /data-viz-is-degenerate/);
});

test("configured right-triangle similar model keeps its visible scale factor honest", () => {
  const source = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");

  assert.match(source, /const similarScale\s*=\s*clamp\(\(legA \+ legB\) \/ 10,\s*0\.45,\s*1\.8\)/);
  assert.match(source, /similarPointB\s*=\s*\{\s*x:\s*similarOrigin\.x \+ legA \* scale \* similarScale,\s*y:\s*similarOrigin\.y\s*\}/);
  assert.match(source, /similarPointC\s*=\s*\{\s*x:\s*similarOrigin\.x,\s*y:\s*similarOrigin\.y - legB \* scale \* similarScale\s*\}/);
  assert.match(source, /data-viz-scale-factor=\{formatNumber\(state\.similarScale,\s*2\)\}/);
  assert.doesNotMatch(source, /similarScale\s*\*\s*0\.72/);
});

test("quadratic graph explorer keeps the quadratic coefficient nonzero", () => {
  const source = fs.readFileSync("components/visualizations/FunctionGraphExplorer.tsx", "utf8");

  assert.match(source, /const minimumQuadraticCoefficientMagnitude\s*=\s*0\.1/);
  assert.match(source, /function normalizeQuadraticCoefficient/);
  assert.match(source, /const initialA\s*=\s*normalizeQuadraticCoefficient\(initialCoefficients\?\.a \?\? 1\)/);
  assert.match(source, /setA\(\(current\) => normalizeQuadraticCoefficient\(next,\s*current\)\)/);
  assert.doesNotMatch(source, /onChange=\{setA\}/);
});

test("Mark explored session module IDs are stable across the page and card", () => {
  const lab = visualizationLabCatalog.find((entry) => entry.labId === "bnu-high-s4-概率");

  assert.ok(lab);
  assert.equal(buildVisualizationSessionModuleId(lab), `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`);
  assert.match(buildVisualizationSessionModuleId(lab), /bnu-high-s4-概率/);
});

test("snapshot mark samples keep bounded safe data-viz math attributes", () => {
  const sample = buildVisualizationSnapshotMarkSample(
    [
      { name: "data-viz-name", value: "function curve" },
      { name: "data-viz-x", value: "3.14159" },
      { name: "data-viz-y", value: "2.71828" },
      { name: "aria-label", value: "not a diagnostic attribute" },
      { name: "data-user-id", value: "student-123" },
      { name: "data-viz-equation", value: "y=".concat("x".repeat(220)) }
    ],
    { attributeLimit: 4, valueLimit: 20 }
  );

  assert.deepEqual(sample, {
    "data-viz-name": "function curve",
    "data-viz-x": "3.14159",
    "data-viz-y": "2.71828",
    "data-viz-equation": "y=xxxxxxxxxxxxxxxxxx..."
  });
});

test("Practice handoff URL contract preserves non-ASCII topic IDs through URL encoding", () => {
  const chineseTopicLab = visualizationLabCatalog.find((entry) => entry.topicId === "bnu-high-s4-概率");

  assert.ok(chineseTopicLab);

  const href = buildVisualizationPracticeHref(chineseTopicLab);
  const parsed = new URL(href, "https://mais.local");

  assert.match(href, /%E6/);
  assert.doesNotMatch(href, /概率/);
  assert.equal(parsed.pathname, "/practice");
  assert.equal(parsed.hash, "");
  assert.equal(parsed.searchParams.get("topicId"), chineseTopicLab.topicId);
});

test("catalog health contract flags unsafe IDs, duplicates, missing copy, and group mismatches", () => {
  const source = visualizationLabCatalog[0];
  const duplicatePrimaryTopic = "diagnostic-topic";
  const badLab: FeaturedLabDefinition = {
    ...source,
    labId: "bad lab?id",
    topicId: duplicatePrimaryTopic,
    primaryForTopic: true,
    title: { en: "", zh: source.title.zh, zhHans: source.title.zhHans }
  };
  const duplicateLab: FeaturedLabDefinition = {
    ...source,
    labId: "bad lab?id",
    topicId: duplicatePrimaryTopic,
    primaryForTopic: true
  };
  const mismatchedGrade = source.grade === "S6" ? "P1" : "S6";
  const badGroups: GradeLabGroupDefinition[] = [
    {
      ...gradeLabGroups[0],
      grade: source.grade,
      labs: [{ ...badLab, grade: mismatchedGrade }, duplicateLab]
    }
  ];

  const issueCodes = auditVisualizationCatalogContract([badLab, duplicateLab], badGroups).issues.map((issue) => issue.code);

  assert.ok(issueCodes.includes("duplicate-lab-id"));
  assert.ok(issueCodes.includes("unsafe-lab-id"));
  assert.ok(issueCodes.includes("missing-localized-text"));
  assert.ok(issueCodes.includes("duplicate-primary-topic"));
  assert.ok(issueCodes.includes("group-grade-mismatch"));
});

test("curriculum review diagnostics detect focus text that names a mismatched topic", () => {
  const source = visualizationLabCatalog[0];
  const mismatch: FeaturedLabDefinition = {
    ...source,
    labId: "diagnostic-fraction-lab",
    topicId: "diagnostic-fraction-topic",
    title: { en: "Fraction Addition Visual Lab", zh: "分數加法視覺化實驗", zhHans: "分数加法可视化实验" },
    category: { en: "Fractions and ratio", zh: "分數與比例", zhHans: "分数与比例" },
    templateId: "fraction-bar",
    templateConfig: {
      ...source.templateConfig,
      focus: {
        en: "California Math Practice Beta Unit 3 strand for Volume, with MAIS-authored standards-aligned practice questions.",
        zh: "用分數與比例模型，觀察分數加法中的關鍵關係。",
        zhHans: "用分数与比例模型，观察分数加法中的关键关系。"
      }
    }
  };
  const matching: FeaturedLabDefinition = {
    ...mismatch,
    labId: "diagnostic-volume-lab",
    topicId: "diagnostic-volume-topic",
    title: { en: "Volume Visual Lab", zh: "體積視覺化實驗", zhHans: "体积可视化实验" },
    templateId: "array-area"
  };

  const issues = auditVisualizationCurriculumReview([mismatch, matching]);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "focus-topic-keyword-mismatch");
  assert.equal(issues[0].labId, mismatch.labId);
  assert.equal(issues[0].severity, "medium");
});

test("curriculum review diagnostics detect topic text routed to a mismatched template family", () => {
  const source = visualizationLabCatalog[0];
  const mismatch: FeaturedLabDefinition = {
    ...source,
    labId: "diagnostic-unknown-angle-lab",
    topicId: "diagnostic-unknown-angle-topic",
    title: { en: "Unknown Angle Measures Visual Lab", zh: "未知角度視覺化實驗", zhHans: "未知角度可视化实验" },
    category: { en: "Algebra balance", zh: "代數天平", zhHans: "代数天平" },
    templateId: "equation-balance",
    templateConfig: {
      ...source.templateConfig,
      focus: {
        en: "Use a model to compare quantities.",
        zh: "比較數量關係。",
        zhHans: "比较数量关系。"
      }
    }
  };

  const issues = auditVisualizationCurriculumReview([mismatch]);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "topic-template-keyword-mismatch");
  assert.equal(issues[0].labId, mismatch.labId);
  assert.equal(issues[0].details?.topicRule, "angle-measure");
});

test("current high-confidence US display-layer fixes are not flagged as static focus/template mismatches", () => {
  const fixedLabs = visualizationLabCatalog.filter((lab) =>
    [
      "us-ar-math-g4-gm-3",
      "us-ar-math-g10-chapter-03-circle-geometry",
      "us-ar-math-g11-chapter-02-exponential-and-logarithmic-models",
      "us-ar-math-g12-chapter-03-decision-statistics",
      "us-ca-math-p3-3-oa-mult-div",
      "us-ca-math-p3-3-md-time-data-area-perimeter",
      "us-ca-math-p4-4-nbt-multi-digit",
      "us-ca-math-p4-4-nf-fraction-decimal",
      "us-ca-math-p5-5-nbt-decimals",
      "us-ca-math-p5-5-nf-operations",
      "us-ca-math-p5-5-md-volume-data",
      "us-ca-math-p5-5-g-coordinate-shapes",
      "us-ca-math-s4-chapter-03",
      "us-ca-math-s5-chapter-02",
      "us-ca-math-s6-chapter-03"
    ].includes(lab.labId)
  );

  assert.equal(fixedLabs.length, 15);
  assert.deepEqual(auditVisualizationCurriculumReview(fixedLabs), []);
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "us-ar-math-g4-gm-3")?.templateId,
    "angle-geometry"
  );
  assert.match(
    visualizationLabCatalog.find((lab) => lab.labId === "us-ca-math-p4-4-nf-fraction-decimal")?.templateConfig.focus.en ?? "",
    /fraction/i
  );
  assert.match(
    visualizationLabCatalog.find((lab) => lab.labId === "us-ca-math-p5-5-g-coordinate-shapes")?.title.en ?? "",
    /Coordinate/
  );
});

test("California Visualization Lab catalog keeps priority lab themes grade appropriate", () => {
  const expectedThemeByLabId = new Map(
    [
      ["us-ca-math-k-k-cc-count-sequence", ["K", "number-line", /count|next number|1, 2, 3/i]],
      ["us-ca-math-k-k-cc-cardinality-compare", ["K", "number-line", /count|compare|group/i]],
      ["us-ca-math-k-k-oa-compose-decompose", ["K", "number-line", /part|whole|within 10/i]],
      ["us-ca-math-k-k-nbt-teen-numbers", ["K", "base-ten", /10 \+|ten/i]],
      ["us-ca-math-k-k-md-attributes-data", ["K", "measurement-scale", /attribute|sort|count/i]],
      ["us-ca-math-k-k-g-shapes-position", ["K", "angle-geometry", /shape|position/i]],
      ["us-ca-math-p1-1-oa-add-subtract", ["P1", "number-line", /start|part|change/i]],
      ["us-ca-math-p1-1-md-measure-data", ["P1", "measurement-scale", /measure|sort|data/i]],
      ["us-ca-math-p1-1-g-shape-reasoning", ["P1", "angle-geometry", /shape|attribute|compose/i]],
      ["us-ca-math-p1-1-h1-picture-join-stories-to-10", ["P1", "number-line", /part \+ part|whole/i]],
      ["us-ca-math-p1-1-h2-picture-story-addition-equations", ["P1", "equation-balance", /part \+ part|whole/i]],
      ["us-ca-math-p1-1-h3-cube-train-join-models-to-10", ["P1", "number-line", /cube|train|total/i]],
      ["us-ca-math-p1-1-h4-join-stories-within-10", ["P1", "number-line", /start|more|total/i]],
      ["us-ca-math-p1-1-h5-model-equation-join-stories-to-10", ["P1", "equation-balance", /model|equation|total/i]],
      ["us-ca-math-p1-1-h6-equation-match-join-stories-to-10", ["P1", "equation-balance", /story|equation/i]],
      ["us-ca-math-p1-1-l1-picture-take-away-stories-to-10", ["P1", "number-line", /whole|-|left/i]],
      ["us-ca-math-p1-1-l2-picture-story-subtraction-equations", ["P1", "equation-balance", /whole|-|left/i]],
      ["us-ca-math-p1-1-l3-cube-train-take-away-models-to-10", ["P1", "number-line", /cube|train|left/i]],
      ["us-ca-math-p1-1-l4-take-away-stories-within-10", ["P1", "number-line", /start|-|left/i]],
      ["us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10", ["P1", "equation-balance", /model|equation|left/i]],
      ["us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10", ["P1", "equation-balance", /whole|part/i]],
      ["us-ca-math-p3-3-oa-mult-div", ["P3", "array-area", /rows|groups|array|division/i]],
      ["us-ca-math-p4-4-oa-factors-patterns", ["P4", "array-area", /factor|multiple|array/i]],
      ["us-ca-math-p4-4-md-conversion-angles", ["P4", "measurement-scale", /unit|angle|measure/i]],
      ["us-ca-math-p5-5-oa-expressions-patterns", ["P5", "equation-balance", /expression|pattern/i]],
      ["us-ca-math-p5-5-md-volume-data", ["P5", "array-area", /volume|unit cube|data/i]],
      ["us-ca-math-s2-chapter-02", ["S2", "function-family", /input|output|rate/i]],
      ["us-ca-math-s5-chapter-05", ["S5", "statistics-distribution", /sample|inference|claim/i]],
      ["us-ca-math-s6-chapter-01", ["S6", "statistics-distribution", /precision|uncertainty|mean/i]]
    ] as const
  );
  const forbiddenFormulaPattern = /\bmean \+\/- spread\b|\bdy\/dx\b|\(x, y\) -> \(x', y'\)|\b10 x tens\b/i;

  expectedThemeByLabId.forEach(([expectedGrade, expectedTemplateId, formulaPattern], labId) => {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.ok(lab, `${labId} should be visible in the California Visualization Lab catalog`);
    assert.equal(lab.grade, expectedGrade, `${labId} should stay on its California grade`);
    assert.equal(lab.publisher, "US_CA_MATH", `${labId} should remain a California lab`);
    assert.equal(lab.templateId, expectedTemplateId, `${labId} should use a grade-appropriate template`);
    assert.match(lab.templateConfig.formula?.en ?? "", formulaPattern, `${labId} should expose a grade-fit lab formula`);
    assert.doesNotMatch(lab.templateConfig.formula?.en ?? "", forbiddenFormulaPattern, `${labId} should not expose advanced or mismatched notation`);
  });
});

test("current Visualization Lab catalog has no focus/topic keyword mismatches", () => {
  assert.deepEqual(auditVisualizationCurriculumReview(visualizationLabCatalog), []);
});

test("candidate-only North Carolina safe cards do not leak into the live Visualization Lab catalog", () => {
  const northCarolinaCards = unitedStatesMathGradeOverviewCards.filter(
    (card) => card.curriculumTrack === "US_NC_MATH" && card.grade !== "K"
  );
  const northCarolinaLabIds = northCarolinaCards.flatMap((card) => card.topicIds.map((topicId) => `us-nc-${topicId}`));
  const liveNorthCarolinaLabs = visualizationLabCatalog.filter(
    (lab) => lab.publisher === "US_NC_MATH" || northCarolinaLabIds.includes(lab.labId)
  );

  assert.ok(northCarolinaCards.length > 0);
  assert.deepEqual(liveNorthCarolinaLabs, []);
});

test("source-card alignment diagnostics expose parallel array cardinality mismatches", () => {
  const issues = auditVisualizationSourceCardAlignment(
    [
      {
        curriculumTrack: "US_NC_MATH",
        grade: "P5",
        idSuffix: "diagnostic-card",
        topicIds: ["p5-fractions-operations", "p5-volume"],
        domainTags: ["fraction operations", "decimal operations", "volume"],
        conceptIds: ["fraction-operations", "decimal-computation", "volume"]
      },
      {
        curriculumTrack: "US_CA_MATH",
        grade: "P5",
        idSuffix: "healthy-card",
        topicIds: ["g5-fractions", "g5-volume"],
        domainTags: ["fractions", "volume"],
        conceptIds: ["fraction-operations", "volume"]
      }
    ],
    {
      labIdPrefix: (card) => (card.curriculumTrack === "US_NC_MATH" ? "us-nc-" : "")
    }
  );

  assert.equal(issues.length, 2);
  assert.ok(issues.every((issue) => issue.code === "source-card-array-cardinality-mismatch"));
  assert.ok(issues.every((issue) => issue.severity === "systemic-high"));
  assert.deepEqual(
    issues.map((issue) => issue.labId),
    ["us-nc-p5-fractions-operations", "us-nc-p5-volume"]
  );
});

test("current North Carolina source-card alignment diagnostics match current data cardinality", () => {
  const northCarolinaCards = unitedStatesMathGradeOverviewCards.filter(
    (card) => card.curriculumTrack === "US_NC_MATH" && card.grade !== "K"
  );
  const expectedIssueCount = northCarolinaCards
    .filter(
      (card) =>
        (card.topicIds?.length ?? 0) !== (card.domainTags?.length ?? 0) ||
        (card.topicIds?.length ?? 0) !== (card.conceptIds?.length ?? 0)
    )
    .reduce((count, card) => count + (card.topicIds?.length ?? 0), 0);

  const issues = auditVisualizationSourceCardAlignment(northCarolinaCards, { labIdPrefix: "us-nc-" });

  assert.equal(issues.length, expectedIssueCount);
  assert.ok(issues.every((issue) => issue.code === "source-card-array-cardinality-mismatch"));
  assert.ok(issues.every((issue) => issue.labId?.startsWith("us-nc-")));
});

test("current Visualization Lab catalog keeps zhHans copy free of Traditional Chinese leakage", () => {
  const leaks = visualizationLabCatalog.flatMap((lab) => {
    const fields = [
      ["title", lab.title.zhHans],
      ["description", lab.description.zhHans],
      ["gradeLabel", lab.gradeLabel.zhHans]
    ] as const;

    return fields
      .filter(([, value]) => typeof value === "string" && value !== toPrcSimplifiedText(value))
      .map(([field]) => `${lab.labId}:${field}`);
  });

  assert.deepEqual(leaks, []);
});
