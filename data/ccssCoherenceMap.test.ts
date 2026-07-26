import assert from "node:assert/strict";
import test from "node:test";
import {
  ccssCoherenceClustersAreKnown,
  ccssCoherenceEdges,
  ccssCoherenceTopologicalOrder,
  ccssDependentClusters,
  ccssPrerequisiteClusters,
  prerequisiteGradesForGrade,
  resolveCrossTopicPrerequisiteSkillIds
} from "./ccssCoherenceMap";
import type { GradeId } from "@/types";

const bandOrder = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "HS"];
function bandRank(clusterId: string) {
  return bandOrder.indexOf(clusterId.startsWith("HS.") ? "HS" : clusterId.split(".")[0]);
}

test("coherence DAG is acyclic", () => {
  const order = ccssCoherenceTopologicalOrder();
  assert.ok(order, "topological order exists (no cycle)");
});

test("every referenced cluster exists in the CCSS registry", () => {
  assert.equal(ccssCoherenceClustersAreKnown(), true);
});

test("every prerequisite edge points from an equal-or-earlier grade band", () => {
  for (const [child, parents] of Object.entries(ccssCoherenceEdges)) {
    for (const parent of parents) {
      assert.ok(
        bandRank(parent) <= bandRank(child),
        `${parent} should not be a later grade than its dependent ${child}`
      );
    }
  }
});

test("fraction progression chains 3.NF -> 4.NF -> 5.NF -> 6.RP", () => {
  assert.ok(ccssPrerequisiteClusters("4.NF").includes("3.NF"));
  assert.ok(ccssPrerequisiteClusters("5.NF").includes("4.NF"));
  assert.ok(ccssPrerequisiteClusters("6.RP").includes("5.NF"));
  assert.ok(ccssDependentClusters("3.NF").includes("4.NF"));
});

test("multiplication gates fractions and multi-digit algorithms", () => {
  assert.ok(ccssPrerequisiteClusters("3.NF").includes("3.OA"));
  assert.ok(ccssPrerequisiteClusters("4.NF").includes("4.OA"));
  assert.ok(ccssPrerequisiteClusters("4.NBT").includes("3.OA"));
});

test("resolves cross-topic prerequisites to prerequisite-cluster fluency skills present in the set", () => {
  const topics: Array<{ id: string; grade: GradeId }> = [
    { id: "us-ca-math-p3-3-oa-mult-div", grade: "P3" },
    { id: "us-ca-math-p3-3-nf-fraction-meaning", grade: "P3" },
    { id: "us-ca-math-p4-4-oa-factors-patterns", grade: "P4" },
    { id: "us-ca-math-p4-4-nbt-multi-digit", grade: "P4" },
    { id: "us-ca-math-p4-4-nf-fraction-decimal", grade: "P4" }
  ];
  const resolved = resolveCrossTopicPrerequisiteSkillIds(topics);
  const nfPrerequisites = resolved.get("us-ca-math-p4-4-nf-fraction-decimal") ?? [];

  assert.ok(nfPrerequisites.includes("us-ca-math-p3-3-nf-fraction-meaning:fluency"));
  assert.ok(nfPrerequisites.includes("us-ca-math-p4-4-oa-factors-patterns:fluency"));
  assert.ok(nfPrerequisites.includes("us-ca-math-p4-4-nbt-multi-digit:fluency"));
  // Never self-links and only links prerequisite clusters that are present.
  assert.ok(!nfPrerequisites.some((id) => id.startsWith("us-ca-math-p4-4-nf-fraction-decimal")));
});

test("topics without a CCSS cluster mapping resolve to no cross-topic prerequisites", () => {
  const resolved = resolveCrossTopicPrerequisiteSkillIds([{ id: "fractions", grade: "S1" }]);
  assert.deepEqual(resolved.get("fractions"), []);
});

test("prerequisiteGradesForGrade returns the nearest earlier grades", () => {
  assert.deepEqual(prerequisiteGradesForGrade("P4"), ["P3"]);
  assert.deepEqual(prerequisiteGradesForGrade("P4", 2), ["P3", "P2"]);
  assert.deepEqual(prerequisiteGradesForGrade("K"), []);
});
