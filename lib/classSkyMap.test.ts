import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import { ccssClusters } from "@/data/ccssStandards";
import { buildClassSkyMap } from "./classSkyMap";
import type { ClassSkyStudentInput } from "./classSkyMap";
import type { UniverseSkillStateInput, UniverseTopicInput } from "./mathUniverseMap";

const NOW = new Date("2026-07-19T12:00:00.000Z");

const topics: UniverseTopicInput[] = [
  { id: "us-ca-math-p1-1-nbt-place-value", grade: "P1" },
  { id: "us-ca-math-p1-1-g-shape-reasoning", grade: "P1" }
];

function state(skillId: string, pMastery: number, overrides: Partial<UniverseSkillStateInput> = {}): UniverseSkillStateInput {
  return { skillId, pMastery, attemptCount: 4, nextReviewAt: null, ...overrides };
}

function studentWithMastery(topicId: string, masteries: number[]): ClassSkyStudentInput {
  const stages = ["foundation", "fluency", "transfer"];
  return {
    grade: "P1",
    states: masteries.map((pMastery, index) => state(`${topicId}:${stages[index]}`, pMastery))
  };
}

test("covers every CCSS cluster with zero heat for an empty class", () => {
  const map = buildClassSkyMap({ topics, students: [], now: NOW });
  equal(map.clusters.length, ccssClusters.length);
  equal(map.studentCount, 0);
  equal(map.illumination.averagePercent, 0);
  deepEqual(map.hotspots, []);
  ok(map.clusters.every((cluster) => cluster.heat === 0 && cluster.attemptedCount === 0));
});

test("aggregates heat, mastered, attempted, and struggling counts per cluster", () => {
  const students: ClassSkyStudentInput[] = [
    studentWithMastery("us-ca-math-p1-1-nbt-place-value", [0.95, 0.9, 0.9]), // fully lit
    studentWithMastery("us-ca-math-p1-1-nbt-place-value", [0.9, 0.3, 0.1]),  // 1/3 lit + unstable
    { grade: "P1", states: [] }                                              // untouched
  ];
  const map = buildClassSkyMap({ topics, students, now: NOW });
  const nbt = map.clusters.find((cluster) => cluster.id === "1.NBT");

  ok(nbt);
  equal(nbt?.masteredCount, 1);
  equal(nbt?.attemptedCount, 2);
  equal(nbt?.strugglingCount, 1);
  ok(Math.abs((nbt?.heat ?? 0) - (1 + 1 / 3) / 3) < 1e-9);

  const geometry = map.clusters.find((cluster) => cluster.id === "1.G");
  equal(geometry?.attemptedCount, 0);
  equal(geometry?.heat, 0);
});

test("hotspots surface the clusters with the most struggling students", () => {
  const struggling = (topicId: string): ClassSkyStudentInput => ({
    grade: "P1",
    states: [state(`${topicId}:foundation`, 0.2)]
  });
  const students = [
    struggling("us-ca-math-p1-1-nbt-place-value"),
    struggling("us-ca-math-p1-1-nbt-place-value"),
    struggling("us-ca-math-p1-1-g-shape-reasoning")
  ];
  const map = buildClassSkyMap({ topics, students, now: NOW });
  deepEqual(map.hotspots, ["1.NBT", "1.G"]);
});

test("output carries aggregates only — no student identifiers or raw states", () => {
  const map = buildClassSkyMap({
    topics,
    students: [studentWithMastery("us-ca-math-p1-1-nbt-place-value", [0.95, 0.9, 0.9])],
    now: NOW
  });
  const serialized = JSON.stringify(map);
  ok(!serialized.includes("skillId"));
  ok(!serialized.includes("pMastery"));
  ok(!serialized.includes("states"));
});
