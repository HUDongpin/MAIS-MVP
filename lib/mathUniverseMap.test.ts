import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import { ccssClusters, ccssStandards } from "@/data/ccssStandards";
import {
  buildClusterProgress,
  buildMathUniverseMap,
  universeMasteryLitThreshold,
  universeRoadForCluster
} from "./mathUniverseMap";
import type { UniverseSkillStateInput, UniverseTopicInput } from "./mathUniverseMap";

const NOW = new Date("2026-07-19T12:00:00.000Z");

const p4Topics: UniverseTopicInput[] = [
  { id: "us-ca-math-p4-4-nbt-place-value", grade: "P4" },
  { id: "us-ca-math-p4-4-oa-factors", grade: "P4" },
  { id: "us-ca-math-p4-4-nf-fractions", grade: "P4" }
];

function state(skillId: string, pMastery: number, overrides: Partial<UniverseSkillStateInput> = {}): UniverseSkillStateInput {
  return { skillId, pMastery, attemptCount: 4, nextReviewAt: null, ...overrides };
}

test("builds a deterministic universe with every CCSS cluster and star", () => {
  const map = buildMathUniverseMap({ topics: [], states: [], studentGrade: "P4", now: NOW });
  equal(map.clusters.length, ccssClusters.length);
  equal(map.stars.length, ccssStandards.length + ccssClusters.filter((c) => c.sealed).reduce((s, c) => s + c.standardCount, 0));
  equal(map.illumination.totalCount, ccssStandards.length);
  equal(map.illumination.litCount, 0);

  const again = buildMathUniverseMap({ topics: [], states: [], studentGrade: "P4", now: NOW });
  deepEqual(
    map.stars.map((star) => [star.id, star.x.toFixed(3), star.y.toFixed(3)]),
    again.stars.map((star) => [star.id, star.x.toFixed(3), star.y.toFixed(3)])
  );
});

test("fog starts one grade band past the student frontier; sealed HS stays sealed", () => {
  const map = buildMathUniverseMap({ topics: [], states: [], studentGrade: "P4", now: NOW });
  const byId = new Map(map.clusters.map((cluster) => [cluster.id, cluster]));
  equal(map.frontierGradeBand, "4");
  equal(byId.get("4.NF")?.fog, false);
  equal(byId.get("5.NF")?.fog, false);
  equal(byId.get("6.RP")?.fog, true);
  equal(byId.get("K.CC")?.fog, false);
  equal(byId.get("HS.G")?.sealed, true);
  ok(map.stars.filter((star) => star.clusterId === "6.RP").every((star) => star.status === "sealed"));
});

test("cluster progress aggregates skill states through the topic-to-cluster join", () => {
  const states = [
    state("us-ca-math-p4-4-nbt-place-value:foundation", 0.95),
    state("us-ca-math-p4-4-nbt-place-value:fluency", 0.9, { nextReviewAt: "2026-07-01T00:00:00.000Z" }),
    state("us-ca-math-p4-4-oa-factors:foundation", 0.3),
    state("us-ca-math-p4-4-oa-factors:fluency", 0.7),
    state("us-ca-math-p4-4-nf-fractions:foundation", 0.2, { attemptCount: 0 })
  ];
  const progress = buildClusterProgress({
    topics: p4Topics,
    states,
    currentSkillId: "us-ca-math-p4-4-oa-factors:fluency",
    now: NOW
  });

  deepEqual(progress.get("4.NBT"), {
    skillTotal: 3, skillLit: 2, skillIgniting: 0, skillFading: 1, skillUnstable: 0, hasCurrent: false
  });
  deepEqual(progress.get("4.OA"), {
    skillTotal: 3, skillLit: 0, skillIgniting: 1, skillFading: 0, skillUnstable: 1, hasCurrent: true
  });
  deepEqual(progress.get("4.NF"), {
    skillTotal: 3, skillLit: 0, skillIgniting: 0, skillFading: 0, skillUnstable: 0, hasCurrent: false
  });
});

test("runtime progress paints registry stars proportionally with status accents", () => {
  const states = [
    state("us-ca-math-p4-4-nbt-place-value:foundation", 0.95),
    state("us-ca-math-p4-4-nbt-place-value:fluency", 0.9, { nextReviewAt: "2026-07-01T00:00:00.000Z" }),
    state("us-ca-math-p4-4-oa-factors:foundation", 0.3)
  ];
  const map = buildMathUniverseMap({
    topics: p4Topics,
    states,
    studentGrade: "P4",
    currentSkillId: "us-ca-math-p4-4-oa-factors:foundation",
    now: NOW
  });

  // 4.NBT: 2 of 3 skills lit → floor(2/3 * 6) = 4 lit registry stars, one shown fading.
  const nbtStars = map.stars.filter((star) => star.clusterId === "4.NBT");
  equal(nbtStars.filter((star) => star.status === "lit").length, 3);
  equal(nbtStars.filter((star) => star.status === "fading").length, 1);

  // 4.OA carries the current mission and the unstable accent.
  const oaStars = map.stars.filter((star) => star.clusterId === "4.OA");
  equal(oaStars.filter((star) => star.status === "current").length, 1);
  equal(oaStars.filter((star) => star.status === "unstable").length, 1);
  equal(map.currentClusterId, "4.OA");

  // Illumination counts lit + fading (a current mission is not yet mastered).
  equal(map.illumination.litCount, 4);
  ok(map.illumination.percent >= 1);
});

test("a fully mastered cluster is complete and fully lit", () => {
  const topicId = "us-ca-math-p1-1-g-shape-reasoning";
  const states = ["foundation", "fluency", "transfer"].map((stage) =>
    state(`${topicId}:${stage}`, universeMasteryLitThreshold)
  );
  const map = buildMathUniverseMap({
    topics: [{ id: topicId, grade: "P1" }],
    states,
    studentGrade: "P1",
    now: NOW
  });
  const cluster = map.clusters.find((candidate) => candidate.id === "1.G");
  equal(cluster?.complete, true);
  equal(cluster?.litCount, 3);
  ok(map.stars.filter((star) => star.clusterId === "1.G").every((star) => star.status === "lit"));
});

test("roads trace existing cluster positions and resolve cluster membership", () => {
  const map = buildMathUniverseMap({ topics: [], states: [], studentGrade: "P4", now: NOW });
  equal(map.roads.length, 5);
  for (const road of map.roads) {
    equal(road.points.length, road.clusterIds.length, road.id);
  }
  equal(universeRoadForCluster("4.NF"), "fraction-road");
  equal(universeRoadForCluster("8.F"), "algebra-road");
  equal(universeRoadForCluster("4.MD"), null);
  equal(universeRoadForCluster(null), null);
});
