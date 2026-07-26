import assert from "node:assert/strict";
import test from "node:test";
import { adaptiveMasteryPrior, buildKnowledgeComponents } from "./adaptiveLearning";
import {
  buildGradePlacementStates,
  buildPlacementBlueprint,
  gradeLevelMasteryPrior,
  seedStatesFromPlacement
} from "./diagnosticPlacement";
import type { GradeId } from "@/types";

const now = "2026-07-01T00:00:00.000Z";

const caTopics: Array<{ id: string; grade: GradeId; title: { en: string; zh: string }; description: { en: string; zh: string }; difficulty: "Low" | "Medium" | "High" }> = [
  { id: "us-ca-math-p3-3-oa-mult-div", grade: "P3", title: { en: "Mult/Div", zh: "乘除" }, description: { en: "", zh: "" }, difficulty: "Medium" },
  { id: "us-ca-math-p3-3-nf-fraction-meaning", grade: "P3", title: { en: "Fraction meaning", zh: "分數意義" }, description: { en: "", zh: "" }, difficulty: "Medium" },
  { id: "us-ca-math-p4-4-oa-factors-patterns", grade: "P4", title: { en: "Factors", zh: "因數" }, description: { en: "", zh: "" }, difficulty: "Medium" },
  { id: "us-ca-math-p4-4-nbt-multi-digit", grade: "P4", title: { en: "Multi-digit", zh: "多位數" }, description: { en: "", zh: "" }, difficulty: "Medium" },
  { id: "us-ca-math-p4-4-nf-fraction-decimal", grade: "P4", title: { en: "Fraction/decimal", zh: "分數小數" }, description: { en: "", zh: "" }, difficulty: "High" }
];

const components = buildKnowledgeComponents({ topics: caTopics, questions: [] });

test("at-grade foundation prior matches the global BKT prior; grade distance shifts it", () => {
  assert.equal(gradeLevelMasteryPrior({ skillGrade: "P4", learnerGrade: "P4", stage: "foundation" }), adaptiveMasteryPrior);
  assert.ok(gradeLevelMasteryPrior({ skillGrade: "P2", learnerGrade: "P4", stage: "foundation" }) > adaptiveMasteryPrior);
  assert.ok(gradeLevelMasteryPrior({ skillGrade: "P5", learnerGrade: "P4", stage: "foundation" }) < adaptiveMasteryPrior);
  // Later stages start lower than the foundation of the same skill.
  assert.ok(
    gradeLevelMasteryPrior({ skillGrade: "P4", learnerGrade: "P4", stage: "transfer" }) <
      gradeLevelMasteryPrior({ skillGrade: "P4", learnerGrade: "P4", stage: "foundation" })
  );
});

test("grade placement states carry informed priors but no attempt evidence", () => {
  const states = buildGradePlacementStates({ components, learnerGrade: "P4", now });
  assert.equal(states.length, components.length);
  assert.ok(states.every((state) => state.attemptCount === 0));

  const p3Foundation = states.find((state) => state.skillId === "us-ca-math-p3-3-oa-mult-div:foundation");
  const p4Foundation = states.find((state) => state.skillId === "us-ca-math-p4-4-oa-factors-patterns:foundation");
  assert.ok(p3Foundation && p4Foundation);
  assert.ok(p3Foundation.pMastery > p4Foundation.pMastery, "below-grade prerequisites start warmer");
});

test("placement blueprint probes grade and one-below fluency skills, easiest first", () => {
  const blueprint = buildPlacementBlueprint({ components, learnerGrade: "P4" });
  assert.ok(blueprint.length > 0);
  assert.ok(blueprint.every((probe) => probe.stage === "fluency"));
  assert.ok(blueprint.some((probe) => probe.grade === "P3"));
  assert.ok(blueprint.some((probe) => probe.grade === "P4"));
  // Easiest (earliest grade) probe comes first.
  assert.equal(blueprint[0].grade, "P3");
  assert.ok(blueprint.every((probe) => typeof probe.ccssClusterId === "string"));
  assert.ok(blueprint.every((probe) => probe.title.en.length > 0), "probes carry a display title for the UI");
});

test("a failed probe lowers its dependents while a passed probe lifts its prerequisites", () => {
  const passed = seedStatesFromPlacement({
    components,
    learnerGrade: "P4",
    now,
    responses: [{ skillId: "us-ca-math-p3-3-oa-mult-div:fluency", correct: true }]
  });
  const oaFoundation = passed.states.find((state) => state.skillId === "us-ca-math-p3-3-oa-mult-div:foundation");
  assert.ok(oaFoundation && oaFoundation.pMastery >= 0.55, "passing a probe implies its prerequisites are known");

  const failed = seedStatesFromPlacement({
    components,
    learnerGrade: "P4",
    now,
    responses: [{ skillId: "us-ca-math-p4-4-nf-fraction-decimal:fluency", correct: false }]
  });
  const nfFluency = failed.states.find((state) => state.skillId === "us-ca-math-p4-4-nf-fraction-decimal:fluency");
  const nfTransfer = failed.states.find((state) => state.skillId === "us-ca-math-p4-4-nf-fraction-decimal:transfer");
  assert.ok(nfFluency && nfFluency.attemptCount === 1, "answered probe records real evidence");
  assert.ok(nfTransfer && nfTransfer.pMastery <= 0.2, "a failed probe cools its dependents");
});

test("seeding recommends an unlocked, not-yet-mastered starting skill", () => {
  const result = seedStatesFromPlacement({ components, learnerGrade: "P4", now, responses: [] });
  assert.ok(result.recommendedStartSkillId);
  assert.ok(components.some((component) => component.id === result.recommendedStartSkillId));
});
