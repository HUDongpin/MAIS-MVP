import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  explicitThreeDTemplateSliderBounds,
  sliderBoundsForThreeDTemplate
} from "./configuredThreeDControls";
import { visualizationTemplateIdValues } from "../visualizationTemplateIds";

test("every converted Three.js template has explicit slider bounds", () => {
  assert.deepEqual(
    Object.keys(explicitThreeDTemplateSliderBounds).sort(),
    [...visualizationTemplateIdValues].sort()
  );

  for (const templateId of visualizationTemplateIdValues) {
    const bounds = sliderBoundsForThreeDTemplate(templateId);

    assert.deepEqual(bounds, explicitThreeDTemplateSliderBounds[templateId]);
    assert.ok(Number.isFinite(bounds.valueMin), `${templateId} valueMin should be finite`);
    assert.ok(Number.isFinite(bounds.valueMax), `${templateId} valueMax should be finite`);
    assert.ok(Number.isFinite(bounds.comparisonMin), `${templateId} comparisonMin should be finite`);
    assert.ok(Number.isFinite(bounds.comparisonMax), `${templateId} comparisonMax should be finite`);
    assert.ok(bounds.valueMin <= bounds.valueMax, `${templateId} value bounds should be ordered`);
    assert.ok(bounds.comparisonMin <= bounds.comparisonMax, `${templateId} comparison bounds should be ordered`);
  }
});

test("configured visualization renderer consumes the shared Three.js slider bounds helper", () => {
  const source = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");

  assert.match(source, /import \{ sliderBoundsForThreeDTemplate \} from "@\/components\/visualizations\/three\/configuredThreeDControls"/);
  assert.match(source, /sliderBoundsForThreeDTemplate\(templateId\)/);
});
