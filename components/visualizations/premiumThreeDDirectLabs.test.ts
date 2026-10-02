import assert from "node:assert/strict";
import test from "node:test";

import { getPremiumThreeDDirectLab } from "./premiumThreeDDirectLabs";
import { topics } from "@/data/topics";

test("Hong Kong direct labs report the topic grade and mathematical axes", () => {
  for (const id of ["differentiation-intro", "mixed-problem-solving", "quadratic-patterns", "trigonometry-basics"]) {
    const topic = topics.find((item) => item.id === id);
    const lab = getPremiumThreeDDirectLab(id);
    assert.ok(topic && lab, `current topic and direct lab must exist for ${id}`);
    assert.equal(lab.grade, topic.grade, `${id} grade badge must match the topic`);
    assert.equal(lab.templateConfig.xLabel, "x");
    assert.equal(lab.templateConfig.yLabel, "y");
  }
});

test("S3 trigonometry direct route identifies its sine wave as an advanced preview", () => {
  const lab = getPremiumThreeDDirectLab("trigonometry-basics");
  assert.ok(lab);
  assert.equal(lab.templateId, "trig-unit-wave");
  assert.match(lab.description.en, /advanced preview/i);
  assert.match(lab.templateConfig.focus?.en ?? "", /beyond the S3/i);
});

test("Hong Kong direct labs expose localized student-visible titles without changing their grades", () => {
  const ids = [
    "advanced-functions",
    "calculus",
    "differentiation-intro",
    "functions",
    "mixed-problem-solving",
    "probability-s5",
    "quadratic-patterns",
    "trigonometry-basics",
    "trigonometry-s5"
  ];

  for (const id of ids) {
    const topic = topics.find((item) => item.id === id);
    const lab = getPremiumThreeDDirectLab(id);
    assert.ok(topic && lab, `current topic and direct lab must exist for ${id}`);
    assert.equal(lab.grade, topic.grade);
    assert.match(lab.title.zh, /[\u3400-\u9fff]/u, `${id} must have a Traditional Chinese title`);
    assert.match(lab.title.zhHans ?? "", /[\u3400-\u9fff]/u, `${id} must have a Simplified Chinese title`);
    assert.doesNotMatch(lab.title.zh, /[A-Za-z]{2}/u, `${id} must not keep an English fallback in the Traditional Chinese heading`);
    assert.doesNotMatch(lab.title.zhHans ?? "", /[A-Za-z]{2}/u, `${id} must not keep an English fallback in the Simplified Chinese heading`);
    assert.notEqual(lab.title.zh, lab.title.en);
    assert.notEqual(lab.title.zhHans, lab.title.en);
  }

  const trigPreview = getPremiumThreeDDirectLab("trigonometry-basics");
  assert.ok(trigPreview);
  assert.match(trigPreview.title.en, /Advanced Preview/u);
  assert.match(trigPreview.title.zh, /進階預覽/u);
  assert.match(trigPreview.title.zhHans ?? "", /进阶预览/u);
});
