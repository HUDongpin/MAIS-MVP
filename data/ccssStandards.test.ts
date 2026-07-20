import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  ccssArmForDomain,
  ccssClusterById,
  ccssClusterIdForTopic,
  ccssClusters,
  ccssGradeBandForGradeId,
  ccssHighSchoolAggregates,
  ccssProgressionRoads,
  ccssStandards,
  ccssStandardsByClusterId
} from "./ccssStandards";

test("registers the canonical CCSS K-8 standard counts per grade band", () => {
  const counts = new Map<string, number>();
  for (const standard of ccssStandards) {
    counts.set(standard.gradeBand, (counts.get(standard.gradeBand) ?? 0) + 1);
  }
  deepEqual(Object.fromEntries(counts), {
    K: 22, "1": 21, "2": 26, "3": 25, "4": 28, "5": 26, "6": 29, "7": 24, "8": 28
  });
  equal(ccssStandards.length, 229);
});

test("standard codes are unique and match their grade band and domain", () => {
  const codes = new Set<string>();
  for (const standard of ccssStandards) {
    ok(!codes.has(standard.code), `duplicate code ${standard.code}`);
    codes.add(standard.code);
    ok(standard.code.startsWith(`${standard.gradeBand}.${standard.domain}.`), standard.code);
    ok(standard.title.length > 0, `${standard.code} needs a title`);
  }
});

test("clusters cover every standard plus the five sealed HS aggregates", () => {
  const k8Clusters = ccssClusters.filter((cluster) => !cluster.sealed);
  const hsClusters = ccssClusters.filter((cluster) => cluster.sealed);
  equal(hsClusters.length, 5);
  equal(
    k8Clusters.reduce((sum, cluster) => sum + cluster.standardCount, 0),
    ccssStandards.length
  );
  equal(
    hsClusters.reduce((sum, cluster) => sum + cluster.standardCount, 0),
    ccssHighSchoolAggregates.reduce((sum, aggregate) => sum + aggregate.standardCount, 0)
  );
  for (const cluster of ccssClusters) {
    equal(cluster.arm, ccssArmForDomain[cluster.domain], cluster.id);
  }
  for (const [clusterId, standards] of ccssStandardsByClusterId) {
    equal(ccssClusterById.get(clusterId)?.standardCount, standards.length, clusterId);
  }
});

test("every progression road references existing clusters on its own arm", () => {
  equal(ccssProgressionRoads.length, 5);
  for (const road of ccssProgressionRoads) {
    ok(road.clusterIds.length >= 4, road.id);
    for (const clusterId of road.clusterIds) {
      const cluster = ccssClusterById.get(clusterId);
      ok(cluster, `${road.id} references unknown cluster ${clusterId}`);
      equal(cluster?.arm, road.arm, `${road.id} → ${clusterId} arm mismatch`);
    }
    ok(road.name.en && road.name.zh && road.name.zhHans, `${road.id} needs localized names`);
  }
});

test("every non-sealed cluster is reachable from some road", () => {
  const roadClusterIds = new Set(ccssProgressionRoads.flatMap((road) => road.clusterIds));
  const unreachable = ccssClusters
    .filter((cluster) => !cluster.sealed && !roadClusterIds.has(cluster.id))
    .map((cluster) => cluster.id);
  // MD (K-5 measurement) and K-2/3-5 fraction-precursor clusters ride beside the
  // geometry and ratio arms without being road stops themselves.
  deepEqual(unreachable.sort(), ["1.MD", "2.MD", "3.MD", "4.MD", "5.MD", "K.MD"]);
});

test("maps California topic ids to clusters via embedded domain tokens", () => {
  equal(ccssClusterIdForTopic("us-ca-math-p1-1-nbt-place-value", "P1"), "1.NBT");
  equal(ccssClusterIdForTopic("us-ca-math-k-k-cc-count-sequence", "K"), "K.CC");
  equal(ccssClusterIdForTopic("us-ca-math-p4-4-nf-fractions", "P4"), "4.NF");
  equal(ccssClusterIdForTopic("us-ca-math-p1-1-g-shape-reasoning", "P1"), "1.G");
  equal(ccssClusterIdForTopic("us-ca-math-s1-7-sp-sampling", "S1"), "7.SP");
  equal(ccssClusterIdForTopic("us-ca-math-s3-a-something", "S3"), "HS.A");
  equal(ccssClusterIdForTopic("us-ca-math-s4-10-g-circles", "S4"), "HS.G");
  equal(ccssClusterIdForTopic("no-domain-token", "P4"), null);
});

test("grade id mapping covers every MAIS grade", () => {
  const gradeIds = ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"] as const;
  for (const gradeId of gradeIds) {
    ok(ccssGradeBandForGradeId[gradeId], `missing grade band for ${gradeId}`);
  }
});
