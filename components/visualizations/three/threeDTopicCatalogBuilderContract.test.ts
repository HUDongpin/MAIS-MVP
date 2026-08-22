import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("topic visualization labs choose a curated signature bench or the configured renderer", () => {
  const source = fs.readFileSync("data/visualizationLabs.ts", "utf8");

  assert.doesNotMatch(source, /legacyModuleByTopicId\[topic\.id\]/);
  assert.match(source, /const configuredModuleId: VisualizationLabModuleId = "configured-visualization-lab";/);
  assert.match(source, /const signatureModuleId: VisualizationLabModuleId = "signature-lab";/);
  assert.match(source, /const moduleId = hasSignatureLab\(topic\.id\) \? signatureModuleId : configuredModuleId;/);
  assert.match(source, /moduleId,\s*\n\s*templateId,/);
  assert.match(source, /threeD,\s*\n\s*qaProfile:/);
});

test("active visualization module types and page registry keep only configured and curated signature runtimes", () => {
  const catalogSource = fs.readFileSync("data/visualizationLabs.ts", "utf8");
  const pageSource = fs.readFileSync("components/visualizations/VisualizationLabPage.tsx", "utf8");
  const retiredLegacyModuleIds = [
    "coordinate-plane-demo",
    "function-graph-explorer",
    "geometry-explorer",
    "probability-simulator",
    "function-model-comparer",
    "trig-wave-explorer",
    "calculus-stats-lab"
  ];
  const retiredLegacyImports = [
    "CalculusStatsLab",
    "CoordinatePlaneDemo",
    "FunctionGraphExplorer",
    "FunctionModelComparer",
    "GeometryExplorer",
    "ProbabilitySimulator",
    "TrigWaveExplorer"
  ];

  assert.match(catalogSource, /export type VisualizationLabModuleId = "configured-visualization-lab" \| "signature-lab";/);
  assert.match(catalogSource, /moduleId: VisualizationLabModuleId;/);
  assert.match(catalogSource, /const configuredModuleId: VisualizationLabModuleId = "configured-visualization-lab";/);
  assert.match(catalogSource, /const signatureModuleId: VisualizationLabModuleId = "signature-lab";/);

  for (const moduleId of retiredLegacyModuleIds) {
    assert.doesNotMatch(catalogSource, new RegExp(`moduleId:\\s*"${moduleId}"`));
    assert.doesNotMatch(pageSource, new RegExp(`"${moduleId}"`));
  }

  for (const componentName of retiredLegacyImports) {
    assert.doesNotMatch(pageSource, new RegExp(`\\b${componentName}\\b`));
  }

  assert.match(pageSource, /type VisualizationLabModuleId = FeaturedLabDefinition\["moduleId"\];/);
  assert.match(pageSource, /const ConfiguredVisualizationLab = dynamic<LabComponentProps>\(/);
  assert.match(pageSource, /import\("@\/components\/visualizations\/ConfiguredVisualizationLab"\)/);
  assert.doesNotMatch(pageSource, /import \{ ConfiguredVisualizationLab \} from "@\/components\/visualizations\/ConfiguredVisualizationLab"/);
  assert.match(pageSource, /const SignatureLabRoutes = \{/);
  assert.match(pageSource, /satisfies Record<SignatureLabId, ComponentType<LabComponentProps>>/);
  assert.match(pageSource, /const labComponentRegistry: Record<VisualizationLabModuleId, ComponentType<LabComponentProps>> = \{/);
  assert.match(pageSource, /"configured-visualization-lab": ConfiguredVisualizationLab/);
  assert.match(pageSource, /"signature-lab": ConfiguredVisualizationLab/);
  assert.match(pageSource, /if \(lab\.moduleId === "signature-lab"\)/);
  assert.match(pageSource, /getSignatureLabAssignment\(lab\.topicId\)/);
  assert.match(pageSource, /SignatureLabRoutes\[assignment\.primary\]/);
});
