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
