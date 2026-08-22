import { createHash } from "node:crypto";

export type ChinaVisualizationDedicatedGroupId =
  | "G01"
  | "G02"
  | "G03"
  | "G04"
  | "G05"
  | "G06"
  | "G07";

export type ChinaVisualizationDedicatedGroupManifest = Readonly<{
  groupId: ChinaVisualizationDedicatedGroupId;
  labIds: readonly string[];
}>;

export const CHINA_VISUALIZATION_RELEASE_PARTITION_CONTRACT = Object.freeze({
  catalogLabCount: 335,
  dedicatedGroupCounts: Object.freeze({
    G01: 9,
    G02: 4,
    G03: 6,
    G04: 5,
    G05: 2,
    G06: 1,
    G07: 7,
  }),
  dedicatedLabCount: 34,
  genericLabCount: 301,
  genericPackageCountPerAxis: 66,
});

export const CHINA_VISUALIZATION_DEDICATED_GROUP_MANIFESTS = deepFreeze([
  {
    groupId: "G01",
    labIds: [
      "bnu-primary-p3-lower-two-digit-multiplication",
      "bnu-primary-p3-upper-multi-digit-multiplication",
      "bnu-primary-p3-upper-multiplication-division-fluency",
      "bnu-primary-p4-upper-division",
      "bnu-primary-p4-upper-multiplication",
      "hjb-primary-p3-lower-two-digit-multiplication-division",
      "hjb-primary-p3-upper-multiplication-division-extension",
      "hjb-primary-p3-upper-one-digit-multiplication",
      "hjb-primary-p4-upper-four-operations-problem-solving",
    ],
  },
  {
    groupId: "G02",
    labIds: [
      "bnu-primary-p4-lower-decimal-meaning-add-sub",
      "bnu-primary-p5-upper-decimal-division",
      "hjb-primary-p4-lower-decimals-meaning-add-sub",
      "hjb-primary-p5-upper-decimal-operations",
    ],
  },
  {
    groupId: "G03",
    labIds: [
      "bnu-junior-s1-upper-rational-numbers",
      "bnu-junior-s2-upper-real-numbers",
      "hjb-junior-s2-upper-quadratic-radicals",
      "hjb-junior-s2-upper-real-numbers",
      "hjb-primary-p6-lower-rational-numbers",
      "pep-junior-s1-upper-rational-numbers",
    ],
  },
  {
    groupId: "G04",
    labIds: [
      "bnu-primary-p5-lower-fraction-add-sub",
      "bnu-primary-p5-lower-fraction-division",
      "bnu-primary-p5-lower-fraction-multiplication",
      "hjb-primary-p5-lower-fractions-equivalence-operations",
      "pep-primary-p5-lower-factors-fractions",
    ],
  },
  {
    groupId: "G05",
    labIds: [
      "bnu-primary-p6-upper-percentage-applications",
      "pep-primary-p6-upper-percent-fractions",
    ],
  },
  {
    groupId: "G06",
    labIds: ["pep-primary-p6-lower-ratio-proportion-scale"],
  },
  {
    groupId: "G07",
    labIds: [
      "bnu-junior-s1-upper-algebraic-expressions",
      "bnu-junior-s2-lower-algebraic-fractions-equations",
      "hjb-junior-s1-upper-algebraic-fractions",
      "hjb-junior-s1-upper-polynomial-add-subtract",
      "hjb-primary-p6-lower-simple-algebraic-expressions",
      "pep-junior-s1-upper-expressions-linear-equations",
      "pep-junior-s2-upper-polynomials-fractions",
    ],
  },
] as const satisfies readonly ChinaVisualizationDedicatedGroupManifest[]);

type BuildChinaVisualizationReleasePartitionOptions = Readonly<{
  catalogLabIds: readonly string[];
  dedicatedGroupManifests?: readonly ChinaVisualizationDedicatedGroupManifest[];
}>;

export function buildChinaVisualizationReleasePartition({
  catalogLabIds,
  dedicatedGroupManifests = CHINA_VISUALIZATION_DEDICATED_GROUP_MANIFESTS,
}: BuildChinaVisualizationReleasePartitionOptions) {
  const errors: string[] = [];
  const expectedGroupCounts =
    CHINA_VISUALIZATION_RELEASE_PARTITION_CONTRACT.dedicatedGroupCounts;
  const expectedGroupIds = Object.keys(
    expectedGroupCounts,
  ) as ChinaVisualizationDedicatedGroupId[];
  const catalogDuplicates = duplicateValues(catalogLabIds);
  const manifestGroupIds = dedicatedGroupManifests.map(({ groupId }) => groupId);
  const duplicateGroupIds = duplicateValues(manifestGroupIds);

  if (catalogLabIds.length !== 335) {
    errors.push(
      `catalog count must be 335; actual=${catalogLabIds.length}`,
    );
  }
  if (catalogDuplicates.length > 0) {
    errors.push(`catalog contains duplicate Lab IDs: ${catalogDuplicates.join(", ")}`);
  }
  if (
    manifestGroupIds.length !== expectedGroupIds.length ||
    duplicateGroupIds.length > 0 ||
    JSON.stringify(manifestGroupIds) !== JSON.stringify(expectedGroupIds)
  ) {
    errors.push(
      `dedicated group IDs must be exactly ${expectedGroupIds.join(", ")}; actual=${manifestGroupIds.join(",")}`,
    );
  }

  const dedicatedOwners = new Map<string, ChinaVisualizationDedicatedGroupId[]>();
  for (const manifest of dedicatedGroupManifests) {
    const expectedCount = expectedGroupCounts[manifest.groupId];
    const duplicates = duplicateValues(manifest.labIds);
    if (expectedCount === undefined) {
      errors.push(`unknown dedicated group ${manifest.groupId}`);
    } else if (manifest.labIds.length !== expectedCount) {
      errors.push(
        `${manifest.groupId} must own exactly ${expectedCount} Lab IDs; actual=${manifest.labIds.length}`,
      );
    }
    if (duplicates.length > 0) {
      errors.push(`${manifest.groupId} contains duplicate Lab IDs: ${duplicates.join(", ")}`);
    }
    for (const labId of manifest.labIds) {
      dedicatedOwners.set(labId, [
        ...(dedicatedOwners.get(labId) ?? []),
        manifest.groupId,
      ]);
    }
  }

  const crossGroupLabIds = [...dedicatedOwners]
    .filter(([, owners]) => owners.length > 1)
    .map(([labId, owners]) => `${labId}(${owners.join("+")})`);
  if (crossGroupLabIds.length > 0) {
    errors.push(
      `dedicated groups overlap on Lab IDs: ${crossGroupLabIds.join(", ")}`,
    );
  }

  const catalogLabIdSet = new Set(catalogLabIds);
  const dedicatedLabIds = dedicatedGroupManifests.flatMap(({ labIds }) => [
    ...labIds,
  ]);
  const missingDedicatedLabIds = dedicatedLabIds.filter(
    (labId) => !catalogLabIdSet.has(labId),
  );
  if (missingDedicatedLabIds.length > 0) {
    errors.push(
      `dedicated Lab IDs are missing from the catalog: ${missingDedicatedLabIds.join(", ")}`,
    );
  }
  if (
    dedicatedLabIds.length !==
    CHINA_VISUALIZATION_RELEASE_PARTITION_CONTRACT.dedicatedLabCount
  ) {
    errors.push(
      `dedicated union must contain 34 Lab IDs; actual=${dedicatedLabIds.length}`,
    );
  }

  const dedicatedLabIdSet = new Set(dedicatedLabIds);
  const genericLabIds = catalogLabIds.filter(
    (labId) => !dedicatedLabIdSet.has(labId),
  );
  const genericDedicatedOverlap = genericLabIds.filter((labId) =>
    dedicatedLabIdSet.has(labId),
  );
  if (
    genericLabIds.length !==
    CHINA_VISUALIZATION_RELEASE_PARTITION_CONTRACT.genericLabCount
  ) {
    errors.push(`generic partition must contain 301 Lab IDs; actual=${genericLabIds.length}`);
  }
  if (genericDedicatedOverlap.length > 0) {
    errors.push(
      `generic and dedicated partitions overlap: ${genericDedicatedOverlap.join(", ")}`,
    );
  }

  const partitionUnion = [...genericLabIds, ...dedicatedLabIds];
  const missingFromPartition = catalogLabIds.filter(
    (labId) => !partitionUnion.includes(labId),
  );
  const surplusInPartition = partitionUnion.filter(
    (labId) => !catalogLabIdSet.has(labId),
  );
  if (
    partitionUnion.length !== catalogLabIds.length ||
    new Set(partitionUnion).size !== catalogLabIdSet.size ||
    missingFromPartition.length > 0 ||
    surplusInPartition.length > 0
  ) {
    errors.push(
      `generic/dedicated union is not the exact catalog; missing=${missingFromPartition.join(",")} surplus=${surplusInPartition.join(",")}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `China Visualization release partition rejected:\n${errors
        .map((error) => `- ${error}`)
        .join("\n")}`,
    );
  }

  return deepFreeze({
    catalogLabIds: [...catalogLabIds],
    dedicatedGroupManifests: dedicatedGroupManifests.map((manifest) => ({
      groupId: manifest.groupId,
      labIds: [...manifest.labIds],
    })),
    dedicatedLabIds,
    dedicatedLabIdsSha256: sha256(dedicatedLabIds),
    genericLabIds,
    genericLabIdsSha256: sha256(genericLabIds),
    partitionSha256: sha256([
      ...genericLabIds.map((labId) => `generic:${labId}`),
      ...dedicatedGroupManifests.flatMap(({ groupId, labIds }) =>
        labIds.map((labId) => `${groupId}:${labId}`),
      ),
    ]),
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function sha256(values: readonly string[]) {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}
