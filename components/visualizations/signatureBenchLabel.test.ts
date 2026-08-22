import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { signatureLabIds } from "@/data/signatureLabAssignments";
import { signatureBenchLabel } from "./signatureBenchLabel";

const visualizationLabPageSource = readFileSync(
  new URL("./VisualizationLabPage.tsx", import.meta.url),
  "utf8"
);

test("signature bench tabs keep semantic English names and use deterministic Chinese ordinals", () => {
  assert.equal(signatureBenchLabel("ExponentialFunctionLab", "en", 1), "Exponential Function");
  assert.equal(signatureBenchLabel("LCMLab", "en", 2), "LCM");

  for (const [benchIndex, benchId] of signatureLabIds.entries()) {
    const ordinal = benchIndex + 1;
    const traditionalLabel = signatureBenchLabel(benchId, "zh", ordinal);
    const simplifiedLabel = signatureBenchLabel(benchId, "zh-Hans", ordinal);

    assert.equal(traditionalLabel, `實驗 ${ordinal}`);
    assert.equal(simplifiedLabel, `实验 ${ordinal}`);
    assert.doesNotMatch(traditionalLabel, /[A-Za-z]|Lab/);
    assert.doesNotMatch(simplifiedLabel, /[A-Za-z]|Lab/);
  }
});

test("the signature switcher shares the locale-safe label across visible and accessible tab text", () => {
  assert.match(
    visualizationLabPageSource,
    /import \{ signatureBenchLabel \} from "@\/components\/visualizations\/signatureBenchLabel";/
  );
  assert.match(
    visualizationLabPageSource,
    /labelForBench=\{\(benchId, benchIndex\) =>\s*signatureBenchLabel\(benchId, language, benchIndex \+ 1\)\s*\}/
  );
  assert.match(visualizationLabPageSource, /const benchLabel = labelForBench\(benchId, benchIndex\);/);
  assert.match(visualizationLabPageSource, /aria-label=\{accessibleBenchLabel\}/);
  assert.match(visualizationLabPageSource, /\{benchLabel\}\s*\{benchId === assignment\.primary/);
  assert.doesNotMatch(visualizationLabPageSource, /function signatureBenchLabel\(/);
});
