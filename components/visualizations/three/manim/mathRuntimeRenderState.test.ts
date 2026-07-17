import assert from "node:assert/strict";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import {
  buildRuntimeRenderStateEvidence,
  runtimeRenderStateEvidenceDataAttributes
} from "./mathRuntimeRenderState";

const functionGraphScene = buildMathSceneSpecForThreeDFamily({
  accent: "#22d3ee",
  state: {
    comparison: 5,
    depthValue: 1.4,
    familyId: "three-function-graph",
    mode: 0,
    primaryValue: 6,
    secondaryValue: 5,
    stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
    templateId: "function-graph",
    value: 6
  }
});

test("summarizes RuntimeRenderState kind and point extraction for browser QA evidence", () => {
  assert.ok(functionGraphScene);
  const runtimeState = buildMathSceneRuntimeState(functionGraphScene, 0);
  const evidence = buildRuntimeRenderStateEvidence(runtimeState.objectGraph);
  const attributes = runtimeRenderStateEvidenceDataAttributes(evidence);

  assert.equal(evidence.objectCount, 4);
  assert.equal(evidence.kindSummary, "axes=1;empty=0;point=1;polyline=2;surface=0;vector=0");
  assert.equal(evidence.pointCount, 79);
  assert.equal(evidence.finitePointCount, 79);
  assert.equal(evidence.zeroPointObjectCount, 1);
  assert.equal(evidence.styledObjectCount, 2);
  assert.equal(evidence.wireframeCurveCount, 0);
  assert.equal(evidence.objectIds, "axes,function-curve,moving-probe,probe-trace");
  assert.match(evidence.sourceContract, /pointsForRuntimeRenderState/);
  assert.match(evidence.sourceContract, /mapRuntimeRenderState/);
  assert.equal(
    evidence.summary,
    "runtime-render-state:objects=4:kinds=axes=1;empty=0;point=1;polyline=2;surface=0;vector=0:points=79:finite=79:zeroPoint=1:styled=2:wireframes=0:ids=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-runtime-render-state-object-count"], "4");
  assert.equal(attributes["data-viz-runtime-render-state-kind-summary"], "axes=1;empty=0;point=1;polyline=2;surface=0;vector=0");
  assert.equal(attributes["data-viz-runtime-render-state-point-count"], "79");
  assert.equal(attributes["data-viz-runtime-render-state-finite-point-count"], "79");
  assert.equal(attributes["data-viz-runtime-render-state-zero-point-object-count"], "1");
  assert.equal(attributes["data-viz-runtime-render-state-styled-object-count"], "2");
  assert.equal(attributes["data-viz-runtime-render-state-wireframe-curve-count"], "0");
  assert.equal(attributes["data-viz-runtime-render-state-object-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-runtime-render-state-source-contract"], evidence.sourceContract);
  assert.equal(attributes["data-viz-runtime-render-state-summary"], evidence.summary);
});
