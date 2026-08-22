import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { resolveConfiguredVisualizationProductionRenderer } from "./ConfiguredVisualizationLab";
import {
  MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
  isMainlandDecimalArithmeticLabId
} from "./mainland/DecimalArithmeticLab";
import {
  MAINLAND_FRACTION_OPERATIONS_LAB_IDS,
  isMainlandFractionOperationsLabId
} from "./mainland/FractionOperationsLab";
import {
  MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
  isMainlandMultiDigitOperationsLabId
} from "./mainland/MultiDigitOperationsLab";
import {
  isMainlandPercentApplicationsLabId,
  MAINLAND_PERCENT_APPLICATIONS_LAB_IDS
} from "./mainland/PercentApplicationsLab";
import {
  isMainlandSignedRealNumberLineLabId,
  MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS
} from "./mainland/SignedRealNumberLineLab";
import {
  isMainlandSymbolicExpressionsLabId,
  MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS
} from "./mainland/SymbolicExpressionsLab";
import {
  isMainlandRatioProportionScaleLabId,
  MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS
} from "./mainland/RatioProportionScaleLab";
import { visualizationLabCatalog } from "@/data/visualizationLabs";

const byLabId = new Map(visualizationLabCatalog.map((lab) => [lab.labId, lab]));

test("Configured production routing reaches the exact G01-G07 Mainland renderers", () => {
  assert.equal(MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS.length, 9);
  for (const labId of MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(isMainlandMultiDigitOperationsLabId(labId), true);
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "mainland-multi-digit-operations",
      `${labId} must reach the exact G01 renderer.`
    );
  }

  assert.equal(MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS.length, 4);
  for (const labId of MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(isMainlandDecimalArithmeticLabId(labId), true);
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "mainland-decimal-arithmetic",
      `${labId} must reach the exact G02 renderer.`
    );
  }

  assert.equal(MAINLAND_FRACTION_OPERATIONS_LAB_IDS.length, 5);
  for (const labId of MAINLAND_FRACTION_OPERATIONS_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(isMainlandFractionOperationsLabId(labId), true);
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "mainland-fraction-operations",
      `${labId} must reach the exact G04 renderer.`
    );
  }

  assert.equal(MAINLAND_PERCENT_APPLICATIONS_LAB_IDS.length, 2);
  for (const labId of MAINLAND_PERCENT_APPLICATIONS_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(isMainlandPercentApplicationsLabId(labId), true);
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "mainland-percent-applications",
      `${labId} must reach the exact G05 renderer.`
    );
  }

  assert.equal(MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS.length, 6);
  for (const labId of MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(isMainlandSignedRealNumberLineLabId(labId), true);
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "mainland-signed-real-number-line",
      `${labId} must reach the exact G03 renderer.`
    );
  }

  assert.equal(MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS.length, 1);
  for (const labId of MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(isMainlandRatioProportionScaleLabId(labId), true);
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "mainland-ratio-proportion-scale",
      `${labId} must reach the exact G06 renderer.`
    );
  }

  assert.equal(MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS.length, 7);
  for (const labId of MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(isMainlandSymbolicExpressionsLabId(labId), true);
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "mainland-symbolic-expressions",
      `${labId} must reach the exact G07 renderer.`
    );
  }

  assert.equal(
    resolveConfiguredVisualizationProductionRenderer(
      visualizationLabCatalog.find((lab) => !(
        lab.curriculumTrack === "HK" ||
        isMainlandMultiDigitOperationsLabId(lab.labId) ||
        isMainlandDecimalArithmeticLabId(lab.labId) ||
        isMainlandFractionOperationsLabId(lab.labId) ||
        isMainlandPercentApplicationsLabId(lab.labId) ||
        isMainlandSignedRealNumberLineLabId(lab.labId) ||
        isMainlandRatioProportionScaleLabId(lab.labId) ||
        isMainlandSymbolicExpressionsLabId(lab.labId)
      ))
    ),
    "configured",
    "An unrelated non-HK lab must keep the configured fallback."
  );
});

test("all Mainland dedicated branches remain inside the shared exact-identity and first-interaction host", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components/visualizations/ConfiguredVisualizationLab.tsx"),
    "utf8"
  );

  assert.match(source, /const ownsActiveLabIdentity = !labId/);
  assert.match(
    source,
    /data-viz-active-lab-id=\{ownsActiveLabIdentity \? configuredTopicId : undefined\}/
  );
  assert.match(source, /onKeyUpCapture=\{recordLessonSessionFromInteraction\}/);
  assert.match(source, /onPointerUpCapture=\{recordLessonSessionFromInteraction\}/);
  assert.match(source, /onClickCapture=\{recordLessonSessionFromInteraction\}/);
  assert.match(source, /onInputCapture=\{recordLessonSessionFromInteraction\}/);
  assert.match(source, /onChangeCapture=\{recordLessonSessionFromInteraction\}/);
  assert.match(source, /data-viz-production-renderer=\{productionRenderer\}/);
  assert.match(
    source,
    /productionRenderer === "mainland-multi-digit-operations"[\s\S]*?<MultiDigitOperationsLab[\s\S]*?labId=\{lab\.labId\}/
  );
  assert.match(
    source,
    /productionRenderer === "mainland-decimal-arithmetic"[\s\S]*?<DecimalArithmeticLab[\s\S]*?lab=\{lab\}/
  );
  assert.match(
    source,
    /productionRenderer === "mainland-fraction-operations"[\s\S]*?<FractionOperationsLab[\s\S]*?labId=\{lab\.labId\}/
  );
  assert.match(
    source,
    /productionRenderer === "mainland-percent-applications"[\s\S]*?<PercentApplicationsLab[\s\S]*?labId=\{lab\.labId\}/
  );
  assert.match(
    source,
    /productionRenderer === "mainland-signed-real-number-line"[\s\S]*?<SignedRealNumberLineLab[\s\S]*?lab=\{lab\}/
  );
  assert.match(
    source,
    /productionRenderer === "mainland-ratio-proportion-scale"[\s\S]*?<RatioProportionScaleLab[\s\S]*?labId=\{lab\.labId\}/
  );
  assert.match(
    source,
    /productionRenderer === "mainland-symbolic-expressions"[\s\S]*?<SymbolicExpressionsLab[\s\S]*?labId=\{lab\.labId\}/
  );
});
